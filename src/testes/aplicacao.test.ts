import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  CasoDeUsoAutenticacao,
  GerenciadorBarbeiros,
  GerenciadorFechamento,
  GerenciadorOrdensServico,
  GerenciadorServicos,
} from "../aplicacao";
import {
  GerenciadorToken,
  PayloadToken,
  ServicoAutenticacao,
} from "../autenticacao";
import { Barbeiro, MetodoPagamento, NivelAcesso } from "../dominio";
import {
  RepositorioCredencialMemoria,
  RepositorioOrdemServicoMemoria,
  RepositorioPessoaMemoria,
  RepositorioServicoMemoria,
} from "../repositorios";

describe("Camada de Aplicação - Casos de Uso e Permissões", () => {
  let repoPessoa: RepositorioPessoaMemoria;
  let repoCredencial: RepositorioCredencialMemoria;
  let repoServico: RepositorioServicoMemoria;
  let repoOrdem: RepositorioOrdemServicoMemoria;

  let casoDeUsoAuth: CasoDeUsoAutenticacao;
  let gerenciadorBarbeiros: GerenciadorBarbeiros;
  let gerenciadorServicos: GerenciadorServicos;
  let gerenciadorOrdens: GerenciadorOrdensServico;
  let gerenciadorFechamento: GerenciadorFechamento;

  let tokenAdmin: PayloadToken;
  let tokenOperador1: PayloadToken;
  let tokenOperador2: PayloadToken;
  let barbeiro1Id: string;
  let barbeiro2Id: string;

  beforeEach(async () => {
    repoPessoa = new RepositorioPessoaMemoria();
    repoCredencial = new RepositorioCredencialMemoria();
    repoServico = new RepositorioServicoMemoria();
    repoOrdem = new RepositorioOrdemServicoMemoria();

    const gerenciadorToken = new GerenciadorToken(
      "segredo-super-seguro-testes-2026"
    );
    const servicoAutenticacao = new ServicoAutenticacao(gerenciadorToken);

    casoDeUsoAuth = new CasoDeUsoAutenticacao(
      repoPessoa,
      repoCredencial,
      servicoAutenticacao
    );
    gerenciadorBarbeiros = new GerenciadorBarbeiros(
      repoPessoa,
      repoCredencial,
      servicoAutenticacao
    );
    gerenciadorServicos = new GerenciadorServicos(repoServico);
    gerenciadorOrdens = new GerenciadorOrdensServico(
      repoPessoa,
      repoServico,
      repoOrdem
    );
    gerenciadorFechamento = new GerenciadorFechamento(repoPessoa, repoOrdem);

    // Criação do Administrador inicial
    const admin = new Barbeiro({
      id: "admin-1",
      nome: "Admin",
      taxaComissaoPadrao: 60,
      nivelAcesso: NivelAcesso.ADMINISTRADOR,
    });
    const credAdmin = servicoAutenticacao.criarCredencial({
      id: "cred-admin",
      pessoa: admin,
      login: "admin",
      senhaPura: "admin123",
    });
    await repoPessoa.salvar(admin);
    await repoCredencial.salvar(credAdmin);

    const loginAdmin = await casoDeUsoAuth.login("admin", "admin123");
    tokenAdmin = casoDeUsoAuth.validarToken(loginAdmin.token);

    // Cadastro de 2 barbeiros operadores
    const b1 = await gerenciadorBarbeiros.cadastrarBarbeiro(tokenAdmin, {
      nome: "Barbeiro 1",
      taxaComissaoPadrao: 50,
      login: "b1",
      senhaInicial: "senha123",
    });
    barbeiro1Id = b1.id;

    const b2 = await gerenciadorBarbeiros.cadastrarBarbeiro(tokenAdmin, {
      nome: "Barbeiro 2",
      taxaComissaoPadrao: 40,
      login: "b2",
      senhaInicial: "senha123",
    });
    barbeiro2Id = b2.id;

    const sessaoB1 = await casoDeUsoAuth.login("b1", "senha123");
    tokenOperador1 = casoDeUsoAuth.validarToken(sessaoB1.token);

    const sessaoB2 = await casoDeUsoAuth.login("b2", "senha123");
    tokenOperador2 = casoDeUsoAuth.validarToken(sessaoB2.token);
  });

  it("deve impedir que um OPERADOR cadastre serviços ou outros barbeiros", async () => {
    await assert.rejects(
      () =>
        gerenciadorServicos.cadastrarServico(tokenOperador1, {
          nome: "Corte",
          preco: 45,
        }),
      /Acesso negado/
    );

    await assert.rejects(
      () =>
        gerenciadorBarbeiros.cadastrarBarbeiro(tokenOperador1, {
          nome: "Novo Barbeiro",
          taxaComissaoPadrao: 50,
          login: "novo",
          senhaInicial: "123456",
        }),
      /Acesso negado/
    );
  });

  it("deve permitir que OPERADOR lance ordem para si mesmo, mas bloquear lançamento para outro barbeiro", async () => {
    const corte = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
      nome: "Corte",
      preco: 50,
    });

    // Lança para si mesmo com sucesso
    const ordemPropria = await gerenciadorOrdens.lancarOrdem(tokenOperador1, {
      itens: [{ servicoId: corte.id }],
      metodoPagamento: MetodoPagamento.PIX,
    });
    assert.equal(ordemPropria.barbeiroId, barbeiro1Id);

    // Tenta lançar para o Barbeiro 2 e recebe erro de permissão
    await assert.rejects(
      () =>
        gerenciadorOrdens.lancarOrdem(tokenOperador1, {
          barbeiroId: barbeiro2Id,
          itens: [{ servicoId: corte.id }],
          metodoPagamento: MetodoPagamento.PIX,
        }),
      /Acesso negado/
    );
  });

  it("deve bloquear login quando o barbeiro for inativado pelo gestor", async () => {
    await gerenciadorBarbeiros.alterarStatusAtivo(
      tokenAdmin,
      barbeiro1Id,
      false
    );

    await assert.rejects(
      () => casoDeUsoAuth.login("b1", "senha123"),
      /Usuário inativo no sistema/
    );
  });

  it("deve gerar o fechamento mensal geral corretamente e proteger acesso apenas para gestão", async () => {
    const corte = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
      nome: "Corte",
      preco: 50,
    });
    const barba = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
      nome: "Barba",
      preco: 30,
    });

    // Barbeiro 1 (50%): Corte (50) + Barba (30) = 80 bruto | 40 comissão
    await gerenciadorOrdens.lancarOrdem(tokenOperador1, {
      itens: [{ servicoId: corte.id }, { servicoId: barba.id }],
      metodoPagamento: MetodoPagamento.PIX,
      realizadoEm: new Date("2026-10-10T10:00:00Z"),
    });

    // Barbeiro 2 (40%): Corte (50) = 50 bruto | 20 comissão
    await gerenciadorOrdens.lancarOrdem(tokenOperador2, {
      itens: [{ servicoId: corte.id }],
      metodoPagamento: MetodoPagamento.CARTAO_DEBITO,
      realizadoEm: new Date("2026-10-15T14:00:00Z"),
    });

    const inicio = new Date("2026-10-01T00:00:00Z");
    const fim = new Date("2026-10-31T23:59:59Z");

    // Operador 1 pode consultar seu próprio extrato
    const extratoIndividual =
      await gerenciadorFechamento.consultarExtratoBarbeiro(tokenOperador1, {
        inicioPeriodo: inicio,
        fimPeriodo: fim,
      });
    assert.equal(extratoIndividual.faturamentoBruto.valor, 80.0);
    assert.equal(extratoIndividual.totalComissaoBarbeiro.valor, 40.0);

    // Operador 1 NÃO pode consultar fechamento geral
    await assert.rejects(
      () =>
        gerenciadorFechamento.gerarFechamentoGeral(tokenOperador1, inicio, fim),
      /Acesso negado/
    );

    // Administrador consulta fechamento geral
    const fechamentoGeral = await gerenciadorFechamento.gerarFechamentoGeral(
      tokenAdmin,
      inicio,
      fim
    );

    assert.equal(fechamentoGeral.totalOrdens, 2);
    assert.equal(fechamentoGeral.totalServicosExecutados, 3);
    assert.equal(fechamentoGeral.faturamentoBrutoTotal.valor, 130.0);
    assert.equal(fechamentoGeral.totalComissoesPagar.valor, 60.0);
    assert.equal(fechamentoGeral.totalLiquidoBarbearia.valor, 70.0);
  });
});
