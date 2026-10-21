import express, { Express, Request, Response } from "express";
import path from "path";
import {
  CasoDeUsoAutenticacao,
  GerenciadorBarbeiros,
  GerenciadorFechamento,
  GerenciadorOrdensServico,
  GerenciadorServicos,
} from "../aplicacao";
import { GerenciadorToken, ServicoAutenticacao } from "../autenticacao";
import { MetodoPagamento, NivelAcesso } from "../dominio";
import { GerenciadorLicenca } from "../licenca";
import {
  BancoSqlite,
  RepositorioCredencial,
  RepositorioCredencialMemoria,
  RepositorioCredencialSqlite,
  RepositorioOrdemServico,
  RepositorioOrdemServicoMemoria,
  RepositorioOrdemServicoSqlite,
  RepositorioPessoa,
  RepositorioPessoaMemoria,
  RepositorioPessoaSqlite,
  RepositorioServico,
  RepositorioServicoMemoria,
  RepositorioServicoSqlite,
} from "../repositorios";
import { criarMiddlewareAutenticacao } from "./middlewareAutenticacao";
import { obterInfoCompletaRedeLocal } from "./redeLocal";
import { popularDadosIniciais } from "./seedInicial";
import {
  serializarBarbeiro,
  serializarExtratoBarbeiro,
  serializarFechamentoGeral,
  serializarOrdemServico,
  serializarServico,
} from "./serializadores";

export interface ContextoAplicacaoWeb {
  app: Express;
  bancoSqlite?: BancoSqlite;
  gerenciadorLicenca: GerenciadorLicenca;
  repoPessoa: RepositorioPessoa;
  repoCredencial: RepositorioCredencial;
  repoServico: RepositorioServico;
  repoOrdem: RepositorioOrdemServico;
  casoDeUsoAuth: CasoDeUsoAutenticacao;
  gerenciadorBarbeiros: GerenciadorBarbeiros;
  gerenciadorServicos: GerenciadorServicos;
  gerenciadorOrdens: GerenciadorOrdensServico;
  gerenciadorFechamento: GerenciadorFechamento;
}

function extrairIntervaloDatas(query: Request["query"]): {
  inicioPeriodo: Date;
  fimPeriodo: Date;
} {
  const agora = new Date();
  let inicioPeriodo = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  let fimPeriodo = new Date(
    agora.getFullYear(),
    agora.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  if (typeof query.inicio === "string" && query.inicio.trim()) {
    const dataInicio = new Date(`${query.inicio.trim()}T00:00:00`);
    if (!Number.isNaN(dataInicio.getTime())) {
      inicioPeriodo = dataInicio;
    }
  }

  if (typeof query.fim === "string" && query.fim.trim()) {
    const dataFim = new Date(`${query.fim.trim()}T23:59:59.999`);
    if (!Number.isNaN(dataFim.getTime())) {
      fimPeriodo = dataFim;
    }
  }

  return { inicioPeriodo, fimPeriodo };
}

function tratarErroHttp(res: Response, erro: unknown): void {
  const mensagem =
    erro instanceof Error ? erro.message : "Erro interno no servidor.";

  if (mensagem.includes("Credenciais inválidas")) {
    res.status(401).json({ erro: mensagem });
    return;
  }
  if (
    mensagem.includes("Acesso negado") ||
    mensagem.includes("Operadores só podem") ||
    mensagem.includes("Apenas administradores") ||
    mensagem.includes("Licença bloqueada")
  ) {
    res.status(403).json({ erro: mensagem });
    return;
  }
  if (mensagem.includes("não encontrado")) {
    res.status(404).json({ erro: mensagem });
    return;
  }

  res.status(400).json({ erro: mensagem });
}

export async function criarAplicacaoWeb(opcoes?: {
  popularSeed?: boolean;
  usarMemoria?: boolean;
  caminhoSqlite?: string;
  diasDemo?: number;
}): Promise<ContextoAplicacaoWeb> {
  let bancoSqlite: BancoSqlite | undefined;
  let repoPessoa: RepositorioPessoa;
  let repoCredencial: RepositorioCredencial;
  let repoServico: RepositorioServico;
  let repoOrdem: RepositorioOrdemServico;

  if (opcoes?.usarMemoria) {
    repoPessoa = new RepositorioPessoaMemoria();
    repoCredencial = new RepositorioCredencialMemoria();
    repoServico = new RepositorioServicoMemoria();
    repoOrdem = new RepositorioOrdemServicoMemoria();
  } else {
    bancoSqlite = new BancoSqlite(opcoes?.caminhoSqlite);
    repoPessoa = new RepositorioPessoaSqlite(bancoSqlite);
    repoCredencial = new RepositorioCredencialSqlite(bancoSqlite);
    repoServico = new RepositorioServicoSqlite(bancoSqlite);
    repoOrdem = new RepositorioOrdemServicoSqlite(bancoSqlite);
  }

  const gerenciadorLicenca = new GerenciadorLicenca(
    bancoSqlite,
    opcoes?.diasDemo
  );
  gerenciadorLicenca.obterStatus();

  const segredoJwt =
    process.env.JWT_SECRET ?? "segredo-super-seguro-barbearia-2026-web";
  const gerenciadorToken = new GerenciadorToken(segredoJwt);
  const servicoAutenticacao = new ServicoAutenticacao(gerenciadorToken);

  const casoDeUsoAuth = new CasoDeUsoAutenticacao(
    repoPessoa,
    repoCredencial,
    servicoAutenticacao
  );
  const gerenciadorBarbeiros = new GerenciadorBarbeiros(
    repoPessoa,
    repoCredencial,
    servicoAutenticacao
  );
  const gerenciadorServicos = new GerenciadorServicos(repoServico);
  const gerenciadorOrdens = new GerenciadorOrdensServico(
    repoPessoa,
    repoServico,
    repoOrdem
  );
  const gerenciadorFechamento = new GerenciadorFechamento(
    repoPessoa,
    repoOrdem
  );

  if (opcoes?.popularSeed !== false) {
    await popularDadosIniciais({
      repoPessoa,
      repoCredencial,
      servicoAutenticacao,
      casoDeUsoAuth,
      gerenciadorBarbeiros,
      gerenciadorServicos,
      gerenciadorOrdens,
    });
  }

  const app = express();
  app.use(express.json());

  const pastaPublic = path.resolve(process.cwd(), "public");
  app.use(express.static(pastaPublic));

  const autenticado = criarMiddlewareAutenticacao(casoDeUsoAuth);
  const apenasGestao = criarMiddlewareAutenticacao(casoDeUsoAuth, [
    NivelAcesso.ADMINISTRADOR,
    NivelAcesso.GESTOR,
  ]);
  const apenasAdmin = criarMiddlewareAutenticacao(casoDeUsoAuth, [
    NivelAcesso.ADMINISTRADOR,
  ]);

  const exigirLicencaEscrita = (
    _req: Request,
    res: Response,
    next: () => void
  ) => {
    try {
      gerenciadorLicenca.exigirPermissaoEscrita();
      next();
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  };

  // ==========================================
  // ROTAS DE LICENÇA E DEMONSTRAÇÃO DE 30 DIAS (/api/sistema/licenca)
  // ==========================================
  app.get("/api/sistema/licenca", (_req: Request, res: Response) => {
    try {
      res.json(gerenciadorLicenca.obterStatus());
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  });

  app.post(
    "/api/sistema/licenca/ativar",
    apenasGestao,
    (req: Request, res: Response) => {
      try {
        const { chaveAtivacao } = req.body ?? {};
        if (!chaveAtivacao || !String(chaveAtivacao).trim()) {
          res.status(400).json({ erro: "Informe a Chave de Ativação." });
          return;
        }
        const novoStatus = gerenciadorLicenca.ativarLicencaDefinitiva(
          String(chaveAtivacao)
        );
        res.json(novoStatus);
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  // ==========================================
  // ROTA DE INFORMAÇÕES DA REDE LOCAL (DNS LOCAL + QR CODE WI-FI)
  // ==========================================
  app.get(
    "/api/sistema/rede",
    async (req: Request, res: Response) => {
      try {
        const portaAtual = Number(
          req.socket.localPort || process.env.PORT || 3000
        );
        const info = await obterInfoCompletaRedeLocal(portaAtual);
        res.json(info);
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  // ==========================================
  // ROTAS DE AUTENTICAÇÃO (/api/auth)
  // ==========================================
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { login, senha } = req.body ?? {};
      if (!login || !senha) {
        res.status(400).json({ erro: "Informe login e senha." });
        return;
      }

      const resultado = await casoDeUsoAuth.login(String(login), String(senha));
      const barbeiro = await repoPessoa.buscarBarbeiroPorId(
        resultado.usuario.pessoaId
      );

      res.json({
        token: resultado.token,
        usuario: {
          ...resultado.usuario,
          taxaComissaoPadrao: barbeiro?.taxaComissaoPadrao ?? 0,
        },
      });
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  });

  app.get("/api/auth/eu", autenticado, async (req: Request, res: Response) => {
    try {
      const usuarioToken = req.usuario!;
      const barbeiro = await repoPessoa.buscarBarbeiroPorId(
        usuarioToken.pessoaId
      );

      res.json({
        pessoaId: usuarioToken.pessoaId,
        nome: barbeiro?.nome ?? usuarioToken.nome,
        nivelAcesso: usuarioToken.nivelAcesso,
        taxaComissaoPadrao: barbeiro?.taxaComissaoPadrao ?? 0,
      });
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  });

  app.put(
    "/api/auth/senha",
    autenticado,
    async (req: Request, res: Response) => {
      try {
        const { senhaAtual, novaSenha } = req.body ?? {};
        await casoDeUsoAuth.alterarPropriaSenha(
          req.usuario!,
          String(senhaAtual ?? ""),
          String(novaSenha ?? "")
        );
        res.json({ mensagem: "Senha atualizada com sucesso." });
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  // ==========================================
  // ROTAS DE SERVIÇOS (/api/servicos)
  // ==========================================
  app.get("/api/servicos", autenticado, async (req: Request, res: Response) => {
    try {
      const incluirInativos =
        req.query.todos === "true" &&
        (req.usuario!.nivelAcesso === NivelAcesso.ADMINISTRADOR ||
          req.usuario!.nivelAcesso === NivelAcesso.GESTOR);

      const servicos = await gerenciadorServicos.listarServicos(
        !incluirInativos
      );
      res.json(servicos.map(serializarServico));
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  });

  app.post(
    "/api/servicos",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const { nome, preco, taxaComissaoEspecifica } = req.body ?? {};
        const servico = await gerenciadorServicos.cadastrarServico(
          req.usuario!,
          {
            nome: String(nome ?? ""),
            preco: Number(preco),
            taxaComissaoEspecifica:
              taxaComissaoEspecifica !== undefined &&
              taxaComissaoEspecifica !== null &&
              taxaComissaoEspecifica !== ""
                ? Number(taxaComissaoEspecifica)
                : undefined,
          }
        );
        res.status(201).json(serializarServico(servico));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.patch(
    "/api/servicos/:id",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const { nome, preco, taxaComissaoEspecifica, ativo } = req.body ?? {};
        const servico = await gerenciadorServicos.atualizarServico(
          req.usuario!,
          String(req.params.id),
          {
            nome: nome !== undefined ? String(nome) : undefined,
            preco: preco !== undefined ? Number(preco) : undefined,
            taxaComissaoEspecifica:
              taxaComissaoEspecifica === null || taxaComissaoEspecifica === ""
                ? null
                : taxaComissaoEspecifica !== undefined
                ? Number(taxaComissaoEspecifica)
                : undefined,
            ativo: ativo !== undefined ? Boolean(ativo) : undefined,
          }
        );
        res.json(serializarServico(servico));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  // ==========================================
  // ROTAS DE BARBEIROS (/api/barbeiros)
  // ==========================================
  app.get(
    "/api/barbeiros",
    autenticado,
    async (req: Request, res: Response) => {
      try {
        const incluirInativos =
          req.query.todos === "true" &&
          (req.usuario!.nivelAcesso === NivelAcesso.ADMINISTRADOR ||
            req.usuario!.nivelAcesso === NivelAcesso.GESTOR);

        const barbeiros = await gerenciadorBarbeiros.listarBarbeiros(
          !incluirInativos
        );
        res.json(barbeiros.map(serializarBarbeiro));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.post(
    "/api/barbeiros",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const {
          nome,
          taxaComissaoPadrao,
          login,
          senhaInicial,
          nivelAcesso,
          email,
          telefone,
        } = req.body ?? {};

        const barbeiro = await gerenciadorBarbeiros.cadastrarBarbeiro(
          req.usuario!,
          {
            nome: String(nome ?? ""),
            taxaComissaoPadrao: Number(taxaComissaoPadrao),
            login: String(login ?? ""),
            senhaInicial: String(senhaInicial ?? ""),
            nivelAcesso: (nivelAcesso as NivelAcesso) ?? NivelAcesso.OPERADOR,
            email: email ? String(email) : undefined,
            telefone: telefone ? String(telefone) : undefined,
          }
        );

        res.status(201).json(serializarBarbeiro(barbeiro));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.patch(
    "/api/barbeiros/:id",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const {
          nome,
          taxaComissaoPadrao,
          nivelAcesso,
          email,
          telefone,
          ativo,
          novaSenha,
        } = req.body ?? {};

        const barbeiro = await gerenciadorBarbeiros.atualizarBarbeiro(
          req.usuario!,
          String(req.params.id),
          {
            nome: nome !== undefined ? String(nome) : undefined,
            taxaComissaoPadrao:
              taxaComissaoPadrao !== undefined
                ? Number(taxaComissaoPadrao)
                : undefined,
            nivelAcesso:
              nivelAcesso !== undefined
                ? (nivelAcesso as NivelAcesso)
                : undefined,
            email: email !== undefined ? String(email) : undefined,
            telefone: telefone !== undefined ? String(telefone) : undefined,
            ativo: ativo !== undefined ? Boolean(ativo) : undefined,
            novaSenha: novaSenha !== undefined ? String(novaSenha) : undefined,
          }
        );

        res.json(serializarBarbeiro(barbeiro));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.patch(
    "/api/barbeiros/:id/comissao",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const { taxaComissaoPadrao } = req.body ?? {};
        const barbeiro = await gerenciadorBarbeiros.atualizarTaxaComissao(
          req.usuario!,
          String(req.params.id),
          Number(taxaComissaoPadrao)
        );
        res.json(serializarBarbeiro(barbeiro));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.patch(
    "/api/barbeiros/:id/status",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const { ativo } = req.body ?? {};
        const barbeiro = await gerenciadorBarbeiros.alterarStatusAtivo(
          req.usuario!,
          String(req.params.id),
          Boolean(ativo)
        );
        res.json(serializarBarbeiro(barbeiro));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  // ==========================================
  // ROTAS DE ORDENS DE SERVIÇO (/api/ordens)
  // ==========================================
  app.post(
    "/api/ordens",
    autenticado,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
    try {
      const { barbeiroId, itens, metodoPagamento, observacoes } =
        req.body ?? {};

      if (!Array.isArray(itens) || itens.length === 0) {
        res.status(400).json({
          erro: "Selecione pelo menos um serviço para lançar a ordem.",
        });
        return;
      }

      const ordem = await gerenciadorOrdens.lancarOrdem(req.usuario!, {
        barbeiroId: barbeiroId ? String(barbeiroId) : undefined,
        itens: itens.map((item: Record<string, unknown>) => ({
          servicoId: String(item.servicoId ?? ""),
          valorPersonalizado:
            item.valorPersonalizado !== undefined &&
            item.valorPersonalizado !== null &&
            item.valorPersonalizado !== ""
              ? Number(item.valorPersonalizado)
              : undefined,
        })),
        metodoPagamento:
          (metodoPagamento as MetodoPagamento) ?? MetodoPagamento.PIX,
        observacoes: observacoes ? String(observacoes) : undefined,
      });

      const barbeiro = await repoPessoa.buscarBarbeiroPorId(ordem.barbeiroId);
      res
        .status(201)
        .json(serializarOrdemServico(ordem, barbeiro?.nome ?? undefined));
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  });

  app.get("/api/ordens", autenticado, async (req: Request, res: Response) => {
    try {
      const { inicioPeriodo, fimPeriodo } = extrairIntervaloDatas(req.query);
      const barbeiroId =
        typeof req.query.barbeiroId === "string" && req.query.barbeiroId.trim()
          ? req.query.barbeiroId.trim()
          : undefined;

      const ordens = await gerenciadorOrdens.listarOrdensDoBarbeiro(
        req.usuario!,
        barbeiroId,
        inicioPeriodo,
        fimPeriodo
      );

      const barbeiros = await repoPessoa.listarBarbeiros(false);
      const mapaNomes = new Map(barbeiros.map((b) => [b.id, b.nome]));

      res.json(
        ordens
          .slice()
          .reverse()
          .map((ordem) =>
            serializarOrdemServico(ordem, mapaNomes.get(ordem.barbeiroId))
          )
      );
    } catch (erro) {
      tratarErroHttp(res, erro);
    }
  });

  app.get(
    "/api/ordens/auditoria",
    apenasAdmin,
    async (req: Request, res: Response) => {
      try {
        const { inicioPeriodo, fimPeriodo } = extrairIntervaloDatas(req.query);
        const ordensAuditadas =
          await gerenciadorOrdens.listarOrdensAuditadasParaAdmin(
            req.usuario!,
            inicioPeriodo,
            fimPeriodo
          );

        const barbeiros = await repoPessoa.listarBarbeiros(false);
        const mapaNomes = new Map(barbeiros.map((b) => [b.id, b.nome]));

        res.json(
          ordensAuditadas
            .slice()
            .reverse()
            .map((ordem) =>
              serializarOrdemServico(
                ordem,
                mapaNomes.get(ordem.barbeiroId),
                true
              )
            )
        );
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.patch(
    "/api/ordens/:id",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const { itens, metodoPagamento, observacoes, motivo } = req.body ?? {};
        if (!Array.isArray(itens) || itens.length === 0) {
          res.status(400).json({
            erro: "A ordem de serviço deve conter pelo menos um serviço.",
          });
          return;
        }

        const ordemAtualizada = await gerenciadorOrdens.editarOrdem(
          req.usuario!,
          String(req.params.id),
          {
            itens: itens.map((item: Record<string, unknown>) => ({
              servicoId: String(item.servicoId ?? ""),
              valorPersonalizado:
                item.valorPersonalizado !== undefined &&
                item.valorPersonalizado !== null &&
                item.valorPersonalizado !== ""
                  ? Number(item.valorPersonalizado)
                  : undefined,
            })),
            metodoPagamento:
              (metodoPagamento as MetodoPagamento) ?? MetodoPagamento.PIX,
            observacoes:
              observacoes !== undefined ? String(observacoes) : undefined,
            motivo: String(motivo ?? ""),
          }
        );

        const barbeiro = await repoPessoa.buscarBarbeiroPorId(
          ordemAtualizada.barbeiroId
        );
        res.json(
          serializarOrdemServico(ordemAtualizada, barbeiro?.nome ?? undefined)
        );
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.delete(
    "/api/ordens/:id",
    apenasGestao,
    exigirLicencaEscrita,
    async (req: Request, res: Response) => {
      try {
        const { motivo } = req.body ?? {};
        const ordemExcluida = await gerenciadorOrdens.excluirOrdemLogicamente(
          req.usuario!,
          String(req.params.id),
          String(motivo ?? "")
        );

        const barbeiro = await repoPessoa.buscarBarbeiroPorId(
          ordemExcluida.barbeiroId
        );
        res.json(
          serializarOrdemServico(
            ordemExcluida,
            barbeiro?.nome ?? undefined,
            req.usuario!.nivelAcesso === NivelAcesso.ADMINISTRADOR
          )
        );
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  // ==========================================
  // ROTAS DE FECHAMENTO MENSAL (/api/fechamento)
  // ==========================================
  app.get(
    "/api/fechamento/extrato",
    autenticado,
    async (req: Request, res: Response) => {
      try {
        const { inicioPeriodo, fimPeriodo } = extrairIntervaloDatas(req.query);
        const barbeiroId =
          typeof req.query.barbeiroId === "string" &&
          req.query.barbeiroId.trim()
            ? req.query.barbeiroId.trim()
            : undefined;

        const extrato = await gerenciadorFechamento.consultarExtratoBarbeiro(
          req.usuario!,
          {
            barbeiroId,
            inicioPeriodo,
            fimPeriodo,
          }
        );

        res.json(serializarExtratoBarbeiro(extrato));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  app.get(
    "/api/fechamento/geral",
    apenasGestao,
    async (req: Request, res: Response) => {
      try {
        const { inicioPeriodo, fimPeriodo } = extrairIntervaloDatas(req.query);
        const fechamento = await gerenciadorFechamento.gerarFechamentoGeral(
          req.usuario!,
          inicioPeriodo,
          fimPeriodo
        );
        res.json(serializarFechamentoGeral(fechamento));
      } catch (erro) {
        tratarErroHttp(res, erro);
      }
    }
  );

  return {
    app,
    bancoSqlite,
    gerenciadorLicenca,
    repoPessoa,
    repoCredencial,
    repoServico,
    repoOrdem,
    casoDeUsoAuth,
    gerenciadorBarbeiros,
    gerenciadorServicos,
    gerenciadorOrdens,
    gerenciadorFechamento,
  };
}
