import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatarDataHora,
  formatarMoeda,
  obterDatasMesAtual,
  requisitarApi,
} from "./api";
import {
  BarbeiroDTO,
  ExtratoBarbeiroDTO,
  FechamentoGeralDTO,
  InfoRedeLocalDTO,
  MetodoPagamento,
  NivelAcesso,
  OrdemServicoDTO,
  ServicoDTO,
  StatusLicencaDTO,
  UsuarioAutenticado,
} from "./types";

type AbaAtiva = "lancar" | "extrato" | "fechamento" | "gestao" | "auditoria";

const METODOS_PAGAMENTO: Array<{
  valor: MetodoPagamento;
  rotulo: string;
  icone: string;
}> = [
  { valor: "PIX", rotulo: "PIX", icone: "💠" },
  { valor: "CARTAO_CREDITO", rotulo: "Crédito", icone: "💳" },
  { valor: "CARTAO_DEBITO", rotulo: "Débito", icone: "🏧" },
  { valor: "DINHEIRO", rotulo: "Dinheiro", icone: "💵" },
];

export default function App() {
  const datasPadrao = useMemo(() => obterDatasMesAtual(), []);

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("barbershop_token")
  );
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState<boolean>(true);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("lancar");

  // Toast de feedback
  const [toast, setToast] = useState<{
    mensagem: string;
    tipo: "sucesso" | "erro";
  } | null>(null);

  const exibirToast = useCallback(
    (mensagem: string, tipo: "sucesso" | "erro" = "sucesso") => {
      setToast({ mensagem, tipo });
      setTimeout(() => {
        setToast((atual) => (atual?.mensagem === mensagem ? null : atual));
      }, 3500);
    },
    []
  );

  // Estado de Login
  const [loginInput, setLoginInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [enviandoLogin, setEnviandoLogin] = useState(false);

  // Dados do sistema
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [barbeiros, setBarbeiros] = useState<BarbeiroDTO[]>([]);
  const [infoRede, setInfoRede] = useState<InfoRedeLocalDTO | null>(null);
  const [modalRedeAberto, setModalRedeAberto] = useState(false);
  const [statusLicenca, setStatusLicenca] = useState<StatusLicencaDTO | null>(
    null
  );
  const [modalLicencaAberto, setModalLicencaAberto] = useState(false);
  const [chaveAtivacaoInput, setChaveAtivacaoInput] = useState("");

  // Estado de Nova Ordem de Serviço
  const [barbeiroOrdemId, setBarbeiroOrdemId] = useState<string>("");
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>(
    []
  );
  const [metodoPagamento, setMetodoPagamento] =
    useState<MetodoPagamento>("PIX");
  const [observacoesOrdem, setObservacoesOrdem] = useState("");
  const [lancandoOrdem, setLancandoOrdem] = useState(false);

  // Estado de Extrato Individual
  const [meuInicio, setMeuInicio] = useState(datasPadrao.inicio);
  const [meuFim, setMeuFim] = useState(datasPadrao.fim);
  const [meuExtrato, setMeuExtrato] = useState<ExtratoBarbeiroDTO | null>(null);

  // Estado de Fechamento Geral
  const [geralInicio, setGeralInicio] = useState(datasPadrao.inicio);
  const [geralFim, setGeralFim] = useState(datasPadrao.fim);
  const [fechamentoGeral, setFechamentoGeral] =
    useState<FechamentoGeralDTO | null>(null);

  // Estado de Cadastro de Novo Barbeiro
  const [novoBarbNome, setNovoBarbNome] = useState("");
  const [novoBarbComissao, setNovoBarbComissao] = useState("50");
  const [novoBarbLogin, setNovoBarbLogin] = useState("");
  const [novoBarbSenha, setNovoBarbSenha] = useState("");
  const [novoBarbNivel, setNovoBarbNivel] = useState<NivelAcesso>("OPERADOR");
  const [novoBarbTelefone, setNovoBarbTelefone] = useState("");

  // Estado de Cadastro de Novo Serviço
  const [novoServNome, setNovoServNome] = useState("");
  const [novoServPreco, setNovoServPreco] = useState("");
  const [novoServComissao, setNovoServComissao] = useState("");

  // Modal de Edição de Barbeiro
  const [barbeiroEditando, setBarbeiroEditando] = useState<BarbeiroDTO | null>(
    null
  );
  const [editBarbNome, setEditBarbNome] = useState("");
  const [editBarbComissao, setEditBarbComissao] = useState("");
  const [editBarbEmail, setEditBarbEmail] = useState("");
  const [editBarbTelefone, setEditBarbTelefone] = useState("");
  const [editBarbNivel, setEditBarbNivel] = useState<NivelAcesso>("OPERADOR");
  const [editBarbAtivo, setEditBarbAtivo] = useState(true);
  const [editBarbSenha, setEditBarbSenha] = useState("");

  // Modal de Edição de Serviço
  const [servicoEditando, setServicoEditando] = useState<ServicoDTO | null>(
    null
  );
  const [editServNome, setEditServNome] = useState("");
  const [editServPreco, setEditServPreco] = useState("");
  const [editServComissao, setEditServComissao] = useState("");
  const [editServAtivo, setEditServAtivo] = useState(true);

  // Estados de Edição / Exclusão Lógica de Ordem de Serviço e Auditoria (Admin)
  const [ordemEditando, setOrdemEditando] = useState<OrdemServicoDTO | null>(
    null
  );
  const [editOrdemServicos, setEditOrdemServicos] = useState<string[]>([]);
  const [editOrdemPagamento, setEditOrdemPagamento] =
    useState<MetodoPagamento>("PIX");
  const [editOrdemObservacoes, setEditOrdemObservacoes] = useState("");
  const [editOrdemMotivo, setEditOrdemMotivo] = useState("");

  const [ordemExcluindo, setOrdemExcluindo] = useState<OrdemServicoDTO | null>(
    null
  );
  const [excluirOrdemMotivo, setExcluirOrdemMotivo] = useState("");

  const [ordensAuditadas, setOrdensAuditadas] = useState<OrdemServicoDTO[]>([]);
  const [auditoriaInicio, setAuditoriaInicio] = useState(datasPadrao.inicio);
  const [auditoriaFim, setAuditoriaFim] = useState(datasPadrao.fim);

  const ehAdministrador = useMemo(() => {
    return usuario?.nivelAcesso === "ADMINISTRADOR";
  }, [usuario]);

  const ehGestorOuAdmin = useMemo(() => {
    return (
      usuario?.nivelAcesso === "ADMINISTRADOR" ||
      usuario?.nivelAcesso === "GESTOR"
    );
  }, [usuario]);

  const barbeiroSelecionadoObj = useMemo(() => {
    if (ehGestorOuAdmin && barbeiroOrdemId) {
      const encontrado = barbeiros.find((b) => b.id === barbeiroOrdemId);
      if (encontrado) return encontrado;
    }
    return {
      id: usuario?.pessoaId || "",
      nome: usuario?.nome || "",
      taxaComissaoPadrao: usuario?.taxaComissaoPadrao ?? 50,
    };
  }, [ehGestorOuAdmin, barbeiroOrdemId, barbeiros, usuario]);

  // Cálculo em tempo real da prévia da Ordem de Serviço
  const previaOrdem = useMemo(() => {
    let totalCobrar = 0;
    let totalComissao = 0;

    for (const id of servicosSelecionados) {
      const serv = servicos.find((s) => s.id === id);
      if (!serv) continue;
      const taxa =
        serv.taxaComissaoEspecifica !== null &&
        serv.taxaComissaoEspecifica !== undefined
          ? serv.taxaComissaoEspecifica
          : barbeiroSelecionadoObj.taxaComissaoPadrao;

      totalCobrar += serv.preco;
      totalComissao += (serv.preco * taxa) / 100;
    }

    return {
      totalCobrar,
      totalComissao,
      quantidade: servicosSelecionados.length,
    };
  }, [servicosSelecionados, servicos, barbeiroSelecionadoObj]);

  const carregarExtratoIndividual = useCallback(
    async (
      tokenAtual: string,
      alvoId: string,
      inicio: string,
      fim: string
    ) => {
      if (!alvoId) return;
      const params = new URLSearchParams({
        inicio,
        fim,
        barbeiroId: alvoId,
      });
      const extrato = await requisitarApi<ExtratoBarbeiroDTO>(
        `/api/fechamento/extrato?${params}`,
        tokenAtual
      );
      setMeuExtrato(extrato);
    },
    []
  );

  const carregarFechamentoGeral = useCallback(
    async (tokenAtual: string, inicio: string, fim: string) => {
      const params = new URLSearchParams({ inicio, fim });
      const fechamento = await requisitarApi<FechamentoGeralDTO>(
        `/api/fechamento/geral?${params}`,
        tokenAtual
      );
      setFechamentoGeral(fechamento);
    },
    []
  );

  const carregarAuditoriaAdmin = useCallback(
    async (tokenAtual: string, inicio: string, fim: string) => {
      const params = new URLSearchParams({ inicio, fim });
      const lista = await requisitarApi<OrdemServicoDTO[]>(
        `/api/ordens/auditoria?${params}`,
        tokenAtual
      );
      setOrdensAuditadas(lista);
    },
    []
  );

  const carregarDadosGerais = useCallback(
    async (tokenAtual: string, usuarioAtual: UsuarioAutenticado) => {
      const gestao =
        usuarioAtual.nivelAcesso === "ADMINISTRADOR" ||
        usuarioAtual.nivelAcesso === "GESTOR";

      const [listaServicos, listaBarbeiros, dadosRede, dadosLicenca] =
        await Promise.all([
          requisitarApi<ServicoDTO[]>(
            `/api/servicos${gestao ? "?todos=true" : ""}`,
            tokenAtual
          ),
          requisitarApi<BarbeiroDTO[]>(
            `/api/barbeiros${gestao ? "?todos=true" : ""}`,
            tokenAtual
          ),
          requisitarApi<InfoRedeLocalDTO>("/api/sistema/rede", tokenAtual).catch(
            () => null
          ),
          requisitarApi<StatusLicencaDTO>(
            "/api/sistema/licenca",
            tokenAtual
          ).catch(() => null),
        ]);

      setServicos(listaServicos);
      setBarbeiros(listaBarbeiros);
      if (dadosRede) setInfoRede(dadosRede);
      if (dadosLicenca) setStatusLicenca(dadosLicenca);

      const idAlvo = barbeiroOrdemId || usuarioAtual.pessoaId;
      if (!barbeiroOrdemId) {
        setBarbeiroOrdemId(usuarioAtual.pessoaId);
      }

      await carregarExtratoIndividual(tokenAtual, idAlvo, meuInicio, meuFim);

      if (gestao) {
        await carregarFechamentoGeral(tokenAtual, geralInicio, geralFim);
      }

      if (usuarioAtual.nivelAcesso === "ADMINISTRADOR") {
        await carregarAuditoriaAdmin(tokenAtual, auditoriaInicio, auditoriaFim);
      }
    },
    [
      auditoriaFim,
      auditoriaInicio,
      barbeiroOrdemId,
      carregarAuditoriaAdmin,
      carregarExtratoIndividual,
      carregarFechamentoGeral,
      geralFim,
      geralInicio,
      meuFim,
      meuInicio,
    ]
  );

  // Validação de sessão ao abrir o app
  useEffect(() => {
    async function validarSessaoInicial() {
      requisitarApi<InfoRedeLocalDTO>("/api/sistema/rede", null)
        .then((dados) => setInfoRede(dados))
        .catch(() => null);
      requisitarApi<StatusLicencaDTO>("/api/sistema/licenca", null)
        .then((dados) => setStatusLicenca(dados))
        .catch(() => null);

      if (!token) {
        setCarregandoSessao(false);
        return;
      }
      try {
        const eu = await requisitarApi<UsuarioAutenticado>(
          "/api/auth/eu",
          token
        );
        setUsuario(eu);
        setBarbeiroOrdemId(eu.pessoaId);
        await carregarDadosGerais(token, eu);
      } catch {
        localStorage.removeItem("barbershop_token");
        setToken(null);
        setUsuario(null);
      } finally {
        setCarregandoSessao(false);
      }
    }
    validarSessaoInicial();
  }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setEnviandoLogin(true);
    try {
      const resposta = await requisitarApi<{
        token: string;
        usuario: UsuarioAutenticado;
      }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ login: loginInput, senha: senhaInput }),
      });

      localStorage.setItem("barbershop_token", resposta.token);
      setUsuario(resposta.usuario);
      setBarbeiroOrdemId(resposta.usuario.pessoaId);
      setToken(resposta.token);
      setAbaAtiva("lancar");
      exibirToast(`Bem-vindo, ${resposta.usuario.nome}!`);
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao entrar.",
        "erro"
      );
    } finally {
      setEnviandoLogin(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("barbershop_token");
    setToken(null);
    setUsuario(null);
    setServicosSelecionados([]);
    setAbaAtiva("lancar");
  }

  function alternarServicoSelecionado(id: string) {
    setServicosSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  }

  async function handleLancarOrdem(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario) return;

    if (servicosSelecionados.length === 0) {
      exibirToast("Toque em pelo menos um serviço realizado.", "erro");
      return;
    }

    setLancandoOrdem(true);
    try {
      const ordemCriada = await requisitarApi<OrdemServicoDTO>(
        "/api/ordens",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            barbeiroId: barbeiroSelecionadoObj.id,
            itens: servicosSelecionados.map((servicoId) => ({ servicoId })),
            metodoPagamento,
            observacoes: observacoesOrdem.trim() || undefined,
          }),
        }
      );

      setServicosSelecionados([]);
      setObservacoesOrdem("");

      await carregarExtratoIndividual(
        token,
        barbeiroSelecionadoObj.id,
        meuInicio,
        meuFim
      );

      if (ehGestorOuAdmin) {
        await carregarFechamentoGeral(token, geralInicio, geralFim);
      }

      exibirToast(
        `OS lançada! Comissão: ${ordemCriada.valorTotalComissaoBarbeiroFormatado}`
      );
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao lançar ordem.",
        "erro"
      );
    } finally {
      setLancandoOrdem(false);
    }
  }

  async function handleCadastrarBarbeiro(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario) return;

    try {
      await requisitarApi("/api/barbeiros", token, {
        method: "POST",
        body: JSON.stringify({
          nome: novoBarbNome,
          taxaComissaoPadrao: Number(novoBarbComissao),
          login: novoBarbLogin,
          senhaInicial: novoBarbSenha,
          nivelAcesso: novoBarbNivel,
          telefone: novoBarbTelefone || undefined,
        }),
      });

      setNovoBarbNome("");
      setNovoBarbComissao("50");
      setNovoBarbLogin("");
      setNovoBarbSenha("");
      setNovoBarbTelefone("");
      setNovoBarbNivel("OPERADOR");

      await carregarDadosGerais(token, usuario);
      exibirToast("Barbeiro cadastrado com sucesso!");
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao cadastrar barbeiro.",
        "erro"
      );
    }
  }

  function abrirModalEdicaoBarbeiro(b: BarbeiroDTO) {
    setBarbeiroEditando(b);
    setEditBarbNome(b.nome);
    setEditBarbComissao(String(b.taxaComissaoPadrao));
    setEditBarbEmail(b.email || "");
    setEditBarbTelefone(b.telefone || "");
    setEditBarbNivel(b.nivelAcesso);
    setEditBarbAtivo(b.ativo);
    setEditBarbSenha("");
  }

  async function handleSalvarEdicaoBarbeiro(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario || !barbeiroEditando) return;

    try {
      await requisitarApi(`/api/barbeiros/${barbeiroEditando.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          nome: editBarbNome,
          taxaComissaoPadrao: Number(editBarbComissao),
          email: editBarbEmail,
          telefone: editBarbTelefone,
          nivelAcesso: editBarbNivel,
          ativo: editBarbAtivo,
          novaSenha: editBarbSenha.trim() !== "" ? editBarbSenha : undefined,
        }),
      });

      setBarbeiroEditando(null);
      const euAtualizado = await requisitarApi<UsuarioAutenticado>(
        "/api/auth/eu",
        token
      );
      setUsuario(euAtualizado);
      await carregarDadosGerais(token, euAtualizado);
      exibirToast("Dados do barbeiro atualizados!");
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao atualizar barbeiro.",
        "erro"
      );
    }
  }

  async function handleCadastrarServico(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario) return;

    try {
      await requisitarApi("/api/servicos", token, {
        method: "POST",
        body: JSON.stringify({
          nome: novoServNome,
          preco: Number(novoServPreco),
          taxaComissaoEspecifica:
            novoServComissao.trim() !== ""
              ? Number(novoServComissao)
              : undefined,
        }),
      });

      setNovoServNome("");
      setNovoServPreco("");
      setNovoServComissao("");

      await carregarDadosGerais(token, usuario);
      exibirToast("Serviço adicionado ao catálogo!");
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao cadastrar serviço.",
        "erro"
      );
    }
  }

  function abrirModalEdicaoServico(s: ServicoDTO) {
    setServicoEditando(s);
    setEditServNome(s.nome);
    setEditServPreco(String(s.preco));
    setEditServComissao(
      s.taxaComissaoEspecifica !== null ? String(s.taxaComissaoEspecifica) : ""
    );
    setEditServAtivo(s.ativo);
  }

  async function handleSalvarEdicaoServico(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario || !servicoEditando) return;

    try {
      await requisitarApi(`/api/servicos/${servicoEditando.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          nome: editServNome,
          preco: Number(editServPreco),
          taxaComissaoEspecifica:
            editServComissao.trim() !== "" ? Number(editServComissao) : null,
          ativo: editServAtivo,
        }),
      });

      setServicoEditando(null);
      await carregarDadosGerais(token, usuario);
      exibirToast("Serviço atualizado com sucesso!");
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao atualizar serviço.",
        "erro"
      );
    }
  }

  async function handleAtivarLicencaDefinitiva(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario) return;

    try {
      const novoStatus = await requisitarApi<StatusLicencaDTO>(
        "/api/sistema/licenca/ativar",
        token,
        {
          method: "POST",
          body: JSON.stringify({ chaveAtivacao: chaveAtivacaoInput }),
        }
      );

      setStatusLicenca(novoStatus);
      setChaveAtivacaoInput("");
      setModalLicencaAberto(false);
      exibirToast(
        `Licença Definitiva ativada com sucesso para ${novoStatus.licenciadoPara}!`
      );
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Chave de ativação inválida.",
        "erro"
      );
    }
  }

  function abrirModalEdicaoOrdem(ordem: OrdemServicoDTO) {
    setOrdemEditando(ordem);
    setEditOrdemServicos(ordem.itens.map((i) => i.servicoId));
    setEditOrdemPagamento(ordem.metodoPagamento);
    setEditOrdemObservacoes(ordem.observacoes || "");
    setEditOrdemMotivo("");
  }

  function alternarServicoEdicaoOrdem(servicoId: string) {
    setEditOrdemServicos((atual) =>
      atual.includes(servicoId)
        ? atual.filter((id) => id !== servicoId)
        : [...atual, servicoId]
    );
  }

  async function handleSalvarEdicaoOrdem(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario || !ordemEditando) return;

    if (editOrdemServicos.length === 0) {
      exibirToast("A ordem deve ter pelo menos um serviço.", "erro");
      return;
    }

    try {
      await requisitarApi(`/api/ordens/${ordemEditando.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          itens: editOrdemServicos.map((servicoId) => ({ servicoId })),
          metodoPagamento: editOrdemPagamento,
          observacoes: editOrdemObservacoes,
          motivo: editOrdemMotivo,
        }),
      });

      setOrdemEditando(null);
      await carregarDadosGerais(token, usuario);
      exibirToast("Ordem de serviço editada e registrada na auditoria!");
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao editar ordem.",
        "erro"
      );
    }
  }

  async function handleConfirmarExclusaoOrdem(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !usuario || !ordemExcluindo) return;

    try {
      await requisitarApi(`/api/ordens/${ordemExcluindo.id}`, token, {
        method: "DELETE",
        body: JSON.stringify({ motivo: excluirOrdemMotivo }),
      });

      setOrdemExcluindo(null);
      setExcluirOrdemMotivo("");
      await carregarDadosGerais(token, usuario);
      exibirToast("Ordem excluída logicamente (registrada na auditoria).");
    } catch (erro) {
      exibirToast(
        erro instanceof Error ? erro.message : "Erro ao excluir ordem.",
        "erro"
      );
    }
  }

  if (carregandoSessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">💈</div>
          <p className="text-sm font-medium">Carregando BarberShop Manager...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // TELA DE LOGIN (MOBILE-FIRST & DESKTOP)
  // =========================================================
  if (!token || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {toast && (
          <div
            className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
              toast.tipo === "erro"
                ? "bg-red-950/95 border-red-500/60 text-red-200"
                : "bg-emerald-950/95 border-emerald-500/60 text-emerald-200"
            }`}
          >
            {toast.mensagem}
          </div>
        )}

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
              💈
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-400 tracking-tight">
                BarberShop Manager
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Lançamento Rápido de OS e Comissões via Wi-Fi
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Usuário ou E-mail
              </label>
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Ex: carlos@barbearia.com"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={enviandoLogin}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-bold py-3.5 text-base shadow-lg shadow-amber-500/10 transition cursor-pointer"
            >
              {enviandoLogin ? "Autenticando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="block text-xs text-slate-400 mb-2.5 font-medium">
              Toque para preencher acesso rápido de demonstração:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginInput("admin@barbearia.com");
                  setSenhaInput("admin123");
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-amber-300 transition cursor-pointer"
              >
                👑 Rodrigo (Admin)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginInput("carlos@barbearia.com");
                  setSenhaInput("carlos123");
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                ✂️ Carlos (50%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginInput("mateus@barbearia.com");
                  setSenhaInput("mateus123");
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                ✂️ Mateus (45%)
              </button>
            </div>
          </div>

          {infoRede && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Vai acessar pelo celular no Wi-Fi?
              </div>
              <button
                type="button"
                onClick={() => setModalRedeAberto(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer shrink-0"
              >
                📷 QR Code / Wi-Fi
              </button>
            </div>
          )}
        </div>

        {/* Modal de QR Code também acessível na tela de Login */}
        {modalRedeAberto && infoRede && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl text-center">
              <div className="flex items-center justify-between text-left">
                <div>
                  <h3 className="text-base font-bold text-amber-400">
                    📷 Conectar Celular no Wi-Fi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Aponte a câmera do celular para o QR Code abaixo:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalRedeAberto(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-white p-3 rounded-2xl inline-block mx-auto shadow-lg">
                <img
                  src={infoRede.qrCodePrincipalDataUrl}
                  alt="QR Code de Acesso Wi-Fi"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="space-y-2 text-left">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Endereço Amigável (DNS Local)
                  </span>
                  <strong className="text-sm sm:text-base text-amber-400 font-extrabold">
                    {infoRede.urlDominioLocal}
                  </strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Ou nome do PC: {infoRede.urlHostnameWindows}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const servicosAtivos = servicos.filter((s) => s.ativo);

  // =========================================================
  // LAYOUT AUTENTICADO (DESKTOP + APP MOBILE BARBEIROS)
  // =========================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-10">
      {/* Notificação Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition ${
            toast.tipo === "erro"
              ? "bg-red-950/95 border-red-500/60 text-red-200"
              : "bg-emerald-950/95 border-emerald-500/60 text-emerald-200"
          }`}
        >
          {toast.mensagem}
        </div>
      )}

      {/* BARRA DE STATUS DE DEMONSTRAÇÃO (30 DIAS) OU BLOQUEIO SOMENTE LEITURA */}
      {statusLicenca && statusLicenca.tipo === "DEMO" && (
        <div
          className={`border-b px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 ${
            statusLicenca.modoSomenteLeitura
              ? "bg-red-950/90 border-red-500/50 text-red-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <span>{statusLicenca.modoSomenteLeitura ? "🔒" : "⏳"}</span>
            <span>{statusLicenca.mensagemStatus}</span>
          </div>

          {ehGestorOuAdmin && (
            <button
              type="button"
              onClick={() => setModalLicencaAberto(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
            >
              🔑 Ativar Versão Definitiva
            </button>
          )}
        </div>
      )}

      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">💈</span>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <strong className="text-sm sm:text-base text-amber-400 font-bold truncate">
                  {usuario.nome}
                </strong>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {usuario.nivelAcesso}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Comissão padrão: {usuario.taxaComissaoPadrao}%
              </p>
            </div>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setAbaAtiva("lancar")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                abaAtiva === "lancar"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ✂️ Lançar OS
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("extrato")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                abaAtiva === "extrato"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              💰 Extrato
            </button>
            {ehGestorOuAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setAbaAtiva("fechamento")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    abaAtiva === "fechamento"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  📊 Fechamento Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setAbaAtiva("gestao")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    abaAtiva === "gestao"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ⚙️ Equipe & Catálogo
                </button>
              </>
            )}
            {ehAdministrador && (
              <button
                type="button"
                onClick={() => setAbaAtiva("auditoria")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  abaAtiva === "auditoria"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🛡️ Auditoria
              </button>
            )}
          </nav>

          {/* Ações Rápidas (Rede Wi-Fi e Sair) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModalRedeAberto(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
              title="Ver endereço de acesso no Wi-Fi para os celulares"
            >
              <span>📶</span>
              <span className="hidden sm:inline">Acesso Wi-Fi</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-semibold text-red-300 cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* =====================================================
            ABA 1: LANÇAR ORDEM DE SERVIÇO (MOBILE-FIRST)
           ===================================================== */}
        {abaAtiva === "lancar" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                  Nova Ordem de Serviço
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Toque nos serviços realizados para registrar o atendimento
                </p>
              </div>

              <form onSubmit={handleLancarOrdem} className="space-y-5">
                {/* Seletor de Barbeiro (apenas para Gestor/Admin) */}
                {ehGestorOuAdmin && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Profissional que realizou o serviço
                    </label>
                    <select
                      value={barbeiroOrdemId}
                      onChange={async (e) => {
                        const novoId = e.target.value;
                        setBarbeiroOrdemId(novoId);
                        if (token) {
                          await carregarExtratoIndividual(
                            token,
                            novoId,
                            meuInicio,
                            meuFim
                          );
                        }
                      }}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-3 text-sm sm:text-base text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      {barbeiros
                        .filter((b) => b.ativo)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nome} (Comissão padrão: {b.taxaComissaoPadrao}%)
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Grade de Botões Grandes de Serviços (Touch-Friendly) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Serviços Realizados ({servicosSelecionados.length}{" "}
                      selecionado{servicosSelecionados.length === 1 ? "" : "s"})
                    </label>
                    {servicosSelecionados.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setServicosSelecionados([])}
                        className="text-xs text-amber-400 hover:underline cursor-pointer"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {servicosAtivos.map((servico) => {
                      const marcado = servicosSelecionados.includes(servico.id);
                      const taxaAplicada =
                        servico.taxaComissaoEspecifica !== null
                          ? servico.taxaComissaoEspecifica
                          : barbeiroSelecionadoObj.taxaComissaoPadrao;
                      const valorComissaoItem =
                        (servico.preco * taxaAplicada) / 100;

                      return (
                        <button
                          key={servico.id}
                          type="button"
                          onClick={() => alternarServicoSelecionado(servico.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition flex items-start justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                            marcado
                              ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/5"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-sm sm:text-base text-slate-100">
                              {servico.nome}
                            </div>
                            <div className="text-amber-400 font-extrabold text-base sm:text-lg">
                              {servico.precoFormatado}
                            </div>
                            <div className="text-xs text-emerald-400 font-medium">
                              Comissão ({taxaAplicada}%):{" "}
                              {formatarMoeda(valorComissaoItem)}
                            </div>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              marcado
                                ? "bg-amber-400 text-slate-950"
                                : "border border-slate-700 text-transparent"
                            }`}
                          >
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botões Grandes para Método de Pagamento */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {METODOS_PAGAMENTO.map((mp) => {
                      const ativo = metodoPagamento === mp.valor;
                      return (
                        <button
                          key={mp.valor}
                          type="button"
                          onClick={() => setMetodoPagamento(mp.valor)}
                          className={`py-3 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            ativo
                              ? "bg-amber-500/20 border-amber-400 text-amber-300"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span>{mp.icone}</span>
                          <span>{mp.rotulo}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observação Opcional */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Observação do Atendimento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observacoesOrdem}
                    onChange={(e) => setObservacoesOrdem(e.target.value)}
                    placeholder="Ex: Nome do cliente ou detalhe do serviço"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Resumo da Ordem + Botão de Confirmação */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                    <div>
                      <span className="block text-xs text-slate-400">
                        Total a Cobrar
                      </span>
                      <strong className="text-xl font-extrabold text-slate-100">
                        {formatarMoeda(previaOrdem.totalCobrar)}
                      </strong>
                    </div>
                    <div className="text-right sm:text-left">
                      <span className="block text-xs text-slate-400">
                        Comissão do Barbeiro
                      </span>
                      <strong className="text-xl font-extrabold text-emerald-400">
                        + {formatarMoeda(previaOrdem.totalComissao)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      lancandoOrdem || Boolean(statusLicenca?.modoSomenteLeitura)
                    }
                    className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-extrabold text-sm sm:text-base shadow-lg transition ${
                      statusLicenca?.modoSomenteLeitura
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 shadow-amber-500/15 cursor-pointer"
                    }`}
                  >
                    {statusLicenca?.modoSomenteLeitura
                      ? "🔒 Demonstração Encerrada (Somente Leitura)"
                      : lancandoOrdem
                      ? "Registrando..."
                      : "✅ Confirmar Ordem de Serviço"}
                  </button>
                </div>
              </form>
            </div>

            {/* Resumo Rápido Lateral no Desktop */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">
                      Resumo no Mês ({meuExtrato?.nomeBarbeiro || usuario.nome})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Acumulado atualizado em tempo real
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva("extrato")}
                    className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                  >
                    Ver extrato completo →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-xs text-slate-400 block">
                      Atendimentos no Mês
                    </span>
                    <strong className="text-xl font-extrabold text-slate-100">
                      {meuExtrato?.totalOrdens ?? 0}
                    </strong>
                    <span className="block text-[11px] text-slate-500">
                      {meuExtrato?.totalServicosExecutados ?? 0} serviços
                    </span>
                  </div>

                  <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3.5">
                    <span className="text-xs text-emerald-300/80 block">
                      Comissão a Receber
                    </span>
                    <strong className="text-xl font-extrabold text-emerald-400">
                      {meuExtrato?.totalComissaoBarbeiroFormatado ?? "R$ 0,00"}
                    </strong>
                    <span className="block text-[11px] text-emerald-300/60">
                      Bruto: {meuExtrato?.faturamentoBrutoFormatado ?? "R$ 0,00"}
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  Últimos Atendimentos Lançados
                </h4>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {(!meuExtrato || meuExtrato.ordens.length === 0) && (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      Nenhuma ordem lançada neste período.
                    </p>
                  )}
                  {meuExtrato?.ordens
                    .slice()
                    .reverse()
                    .slice(0, 6)
                    .map((ordem) => (
                      <div
                        key={ordem.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                            {ordem.itens
                              .map((i) => i.nomeServicoHistorico)
                              .join(" + ")}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatarDataHora(ordem.realizadoEm)} •{" "}
                            {ordem.metodoPagamento}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs sm:text-sm font-extrabold text-emerald-400">
                            + {ordem.valorTotalComissaoBarbeiroFormatado}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Total: {ordem.valorTotalFormatado}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            ABA 2: EXTRATO DETALHADO (COM SELETOR DE BARBEIRO PARA GESTÃO)
           ===================================================== */}
        {abaAtiva === "extrato" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                  Extrato de Comissões —{" "}
                  <span className="text-amber-400">
                    {meuExtrato?.nomeBarbeiro || usuario.nome}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {ehGestorOuAdmin
                    ? "Selecione o barbeiro para consultar o extrato individual ou gerenciar as ordens lançadas"
                    : "Consulte todos os seus serviços executados e valores a receber no período"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {ehGestorOuAdmin && (
                  <select
                    value={barbeiroSelecionadoObj.id}
                    onChange={async (e) => {
                      const novoId = e.target.value;
                      setBarbeiroOrdemId(novoId);
                      if (token) {
                        await carregarExtratoIndividual(
                          token,
                          novoId,
                          meuInicio,
                          meuFim
                        );
                      }
                    }}
                    className="rounded-xl bg-slate-950 border border-amber-500/40 px-3 py-2 text-xs sm:text-sm font-semibold text-amber-300 focus:outline-none focus:border-amber-400"
                  >
                    {barbeiros.map((b) => (
                      <option key={b.id} value={b.id}>
                        👤 {b.nome} ({b.taxaComissaoPadrao}%)
                        {!b.ativo ? " [Inativo]" : ""}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="date"
                  value={meuInicio}
                  onChange={(e) => setMeuInicio(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs sm:text-sm"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={meuFim}
                  onChange={(e) => setMeuFim(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    token &&
                    carregarExtratoIndividual(
                      token,
                      barbeiroSelecionadoObj.id,
                      meuInicio,
                      meuFim
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Filtrar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400">
                  Ordens de Serviço no Período
                </span>
                <strong className="block text-2xl font-extrabold mt-1">
                  {meuExtrato?.totalOrdens ?? 0}
                </strong>
                <span className="text-xs text-slate-500">
                  {meuExtrato?.totalServicosExecutados ?? 0} serviços realizados
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400">
                  Faturamento Bruto Produzido
                </span>
                <strong className="block text-2xl font-extrabold mt-1">
                  {meuExtrato?.faturamentoBrutoFormatado ?? "R$ 0,00"}
                </strong>
                <span className="text-xs text-slate-500">
                  Valor total pago pelos clientes
                </span>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
                <span className="text-xs text-emerald-300">
                  Total de Comissão a Receber
                </span>
                <strong className="block text-2xl font-extrabold text-emerald-400 mt-1">
                  {meuExtrato?.totalComissaoBarbeiroFormatado ?? "R$ 0,00"}
                </strong>
                <span className="text-xs text-emerald-300/70">
                  Valor líquido devido ao profissional
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Detalhamento das Ordens Lançadas
              </h3>

              {(!meuExtrato || meuExtrato.ordens.length === 0) && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-sm text-slate-400">
                  Nenhum lançamento encontrado neste intervalo de datas.
                </div>
              )}

              {meuExtrato?.ordens
                .slice()
                .reverse()
                .map((ordem) => (
                  <div
                    key={ordem.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-100 text-sm sm:text-base">
                        {ordem.itens
                          .map((i) => i.nomeServicoHistorico)
                          .join(" + ")}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatarDataHora(ordem.realizadoEm)} • Pagamento:{" "}
                        <span className="text-slate-300 font-medium">
                          {ordem.metodoPagamento}
                        </span>
                        {ordem.observacoes && ` • Obs: ${ordem.observacoes}`}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 gap-2">
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-extrabold text-emerald-400 block">
                          Comissão: + {ordem.valorTotalComissaoBarbeiroFormatado}
                        </span>
                        <span className="text-xs text-slate-400 block">
                          Cobrado do cliente: {ordem.valorTotalFormatado}
                        </span>
                      </div>

                      {ehGestorOuAdmin && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicaoOrdem(ordem)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                          >
                            ✏️ Editar OS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOrdemExcluindo(ordem);
                              setExcluirOrdemMotivo("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-semibold text-red-300 cursor-pointer"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* =====================================================
            ABA 3: FECHAMENTO MENSAL GERAL (GESTOR / ADMIN)
           ===================================================== */}
        {abaAtiva === "fechamento" && ehGestorOuAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                  Fechamento Mensal Geral da Barbearia
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Resumo financeiro consolidado e folha de repasse por barbeiro
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={geralInicio}
                  onChange={(e) => setGeralInicio(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs sm:text-sm"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={geralFim}
                  onChange={(e) => setGeralFim(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    token &&
                    carregarFechamentoGeral(token, geralInicio, geralFim)
                  }
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Atualizar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400">
                  Atendimentos no Período
                </span>
                <strong className="block text-2xl font-extrabold mt-1">
                  {fechamentoGeral?.totalOrdens ?? 0}
                </strong>
                <span className="text-xs text-slate-500">
                  {fechamentoGeral?.totalServicosExecutados ?? 0} serviços
                  executados
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400">
                  Faturamento Bruto Total
                </span>
                <strong className="block text-2xl font-extrabold mt-1">
                  {fechamentoGeral?.faturamentoBrutoTotalFormatado ?? "R$ 0,00"}
                </strong>
                <span className="text-xs text-slate-500">
                  100% das entradas no caixa
                </span>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
                <span className="text-xs text-emerald-300">
                  Total de Comissões a Pagar
                </span>
                <strong className="block text-2xl font-extrabold text-emerald-400 mt-1">
                  {fechamentoGeral?.totalComissoesPagarFormatado ?? "R$ 0,00"}
                </strong>
                <span className="text-xs text-emerald-300/70">
                  Soma devida aos barbeiros
                </span>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4">
                <span className="text-xs text-amber-300">
                  Resultado Líquido Barbearia
                </span>
                <strong className="block text-2xl font-extrabold text-amber-400 mt-1">
                  {fechamentoGeral?.totalLiquidoBarbeariaFormatado ?? "R$ 0,00"}
                </strong>
                <span className="text-xs text-amber-300/70">
                  Saldo líquido da barbearia
                </span>
              </div>
            </div>

            {/* Visão Mobile em Cards / Visão Desktop em Tabela */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                Repasse Individual por Barbeiro
              </h3>

              {/* Cards no Mobile */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {fechamentoGeral?.extratosPorBarbeiro.map((ext) => (
                  <div
                    key={ext.barbeiroId}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-base text-slate-100">
                        {ext.nomeBarbeiro}
                      </strong>
                      <span className="text-xs text-slate-400">
                        {ext.totalOrdens} OS ({ext.totalServicosExecutados}{" "}
                        serviços)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block">Bruto</span>
                        <strong className="text-slate-200">
                          {ext.faturamentoBrutoFormatado}
                        </strong>
                      </div>
                      <div>
                        <span className="text-emerald-300 block">
                          Pagar Barbeiro
                        </span>
                        <strong className="text-emerald-400 text-sm">
                          {ext.totalComissaoBarbeiroFormatado}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-300 block">Barbearia</span>
                        <strong className="text-amber-400">
                          {ext.totalBarbeariaFormatado}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela no Desktop */}
              <div className="hidden md:block overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <th className="py-3.5 px-4">Barbeiro</th>
                      <th className="py-3.5 px-4">Atendimentos (OS)</th>
                      <th className="py-3.5 px-4">Serviços Executados</th>
                      <th className="py-3.5 px-4">Bruto Produzido</th>
                      <th className="py-3.5 px-4">Valor a Pagar (Comissão)</th>
                      <th className="py-3.5 px-4">Líquido da Barbearia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {fechamentoGeral?.extratosPorBarbeiro.map((ext) => (
                      <tr key={ext.barbeiroId} className="hover:bg-slate-900/50">
                        <td className="py-3.5 px-4 font-bold text-slate-100">
                          {ext.nomeBarbeiro}
                        </td>
                        <td className="py-3.5 px-4">{ext.totalOrdens}</td>
                        <td className="py-3.5 px-4">
                          {ext.totalServicosExecutados}
                        </td>
                        <td className="py-3.5 px-4">
                          {ext.faturamentoBrutoFormatado}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-400">
                          {ext.totalComissaoBarbeiroFormatado}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-400">
                          {ext.totalBarbeariaFormatado}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            ABA 4: EQUIPE & CATÁLOGO DE SERVIÇOS (GESTOR / ADMIN)
           ===================================================== */}
        {abaAtiva === "gestao" && ehGestorOuAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GESTÃO DE BARBEIROS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  Equipe de Barbeiros
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Cadastre profissionais e edite nomes, comissões e acessos
                </p>
              </div>

              <form
                onSubmit={handleCadastrarBarbeiro}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  + Novo Barbeiro
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={novoBarbNome}
                      onChange={(e) => setNovoBarbNome(e.target.value)}
                      placeholder="Ex: Lucas Almeida"
                      required
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Comissão (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={novoBarbComissao}
                      onChange={(e) => setNovoBarbComissao(e.target.value)}
                      required
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Login / E-mail
                    </label>
                    <input
                      type="text"
                      value={novoBarbLogin}
                      onChange={(e) => setNovoBarbLogin(e.target.value)}
                      placeholder="lucas@barbearia.com"
                      required
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Senha Inicial
                    </label>
                    <input
                      type="password"
                      value={novoBarbSenha}
                      onChange={(e) => setNovoBarbSenha(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      required
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nível de Acesso
                    </label>
                    <select
                      value={novoBarbNivel}
                      onChange={(e) =>
                        setNovoBarbNivel(e.target.value as NivelAcesso)
                      }
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    >
                      <option value="OPERADOR">Operador</option>
                      <option value="GESTOR">Gestor</option>
                      <option value="ADMINISTRADOR">Administrador</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Cadastrar Barbeiro
                </button>
              </form>

              <div className="space-y-2.5">
                {barbeiros.map((b) => (
                  <div
                    key={b.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-bold text-slate-100">
                          {b.nome}
                        </strong>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {b.nivelAcesso}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            b.ativo ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {b.ativo ? "● Ativo" : "● Inativo"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Comissão padrão:{" "}
                        <strong className="text-slate-200">
                          {b.taxaComissaoPadrao}%
                        </strong>
                        {b.telefone ? ` • ${b.telefone}` : ""}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalEdicaoBarbeiro(b)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* GESTÃO DE CATÁLOGO DE SERVIÇOS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  Catálogo de Serviços
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Adicione ou edite preços e comissões específicas por serviço
                </p>
              </div>

              <form
                onSubmit={handleCadastrarServico}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  + Novo Serviço
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      value={novoServNome}
                      onChange={(e) => setNovoServNome(e.target.value)}
                      placeholder="Ex: Platinado"
                      required
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={novoServPreco}
                      onChange={(e) => setNovoServPreco(e.target.value)}
                      placeholder="50.00"
                      required
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Comissão Específica %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={novoServComissao}
                      onChange={(e) => setNovoServComissao(e.target.value)}
                      placeholder="Opcional"
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Adicionar Serviço
                </button>
              </form>

              <div className="space-y-2.5">
                {servicos.map((s) => (
                  <div
                    key={s.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-bold text-slate-100">
                          {s.nome}
                        </strong>
                        <span className="text-sm font-extrabold text-amber-400">
                          {s.precoFormatado}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            s.ativo ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {s.ativo ? "● Ativo" : "● Inativo"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Comissão:{" "}
                        {s.taxaComissaoEspecifica !== null
                          ? `${s.taxaComissaoEspecifica}% (Específica deste serviço)`
                          : "Segue a taxa padrão do barbeiro"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalEdicaoServico(s)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            ABA 5: AUDITORIA DE ORDENS EDITADAS E EXCLUÍDAS (EXCLUSIVO ADMIN)
           ===================================================== */}
        {abaAtiva === "auditoria" && ehAdministrador && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-amber-400">
                    🛡️ Painel de Auditoria e Ordens Excluídas
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                    Visível apenas para Administrador
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Rastreamento completo de todas as edições e exclusões lógicas
                  realizadas por gestores ou administradores
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={auditoriaInicio}
                  onChange={(e) => setAuditoriaInicio(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs sm:text-sm"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={auditoriaFim}
                  onChange={(e) => setAuditoriaFim(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    token &&
                    carregarAuditoriaAdmin(token, auditoriaInicio, auditoriaFim)
                  }
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Consultar Auditoria
                </button>
              </div>
            </div>

            {ordensAuditadas.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-sm text-slate-400">
                Nenhuma ordem de serviço foi editada ou excluída neste período.
              </div>
            ) : (
              <div className="space-y-4">
                {ordensAuditadas.map((ordem) => (
                  <div
                    key={ordem.id}
                    className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
                      ordem.excluida
                        ? "bg-red-950/20 border-red-500/40"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                            ordem.excluida
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {ordem.excluida
                            ? "🗑️ ORDEM EXCLUÍDA LOGICAMENTE"
                            : "✏️ ORDEM EDITADA"}
                        </span>
                        <strong className="text-sm sm:text-base text-slate-100">
                          Barbeiro: {ordem.nomeBarbeiro || ordem.barbeiroId}
                        </strong>
                        <span className="text-xs text-slate-400">
                          • Lançada em {formatarDataHora(ordem.realizadoEm)}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm font-bold text-slate-200">
                        Valor: {ordem.valorTotalFormatado} (Comissão:{" "}
                        {ordem.valorTotalComissaoBarbeiroFormatado})
                      </div>
                    </div>

                    {ordem.excluida && (
                      <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-xs space-y-1">
                        <div className="text-red-200 font-semibold">
                          Excluída por:{" "}
                          <strong className="text-white">
                            {ordem.excluidaPorNome}
                          </strong>{" "}
                          em{" "}
                          {ordem.excluidaEm
                            ? formatarDataHora(ordem.excluidaEm)
                            : "-"}
                        </div>
                        <div className="text-red-300">
                          Motivo informado: <em>"{ordem.motivoExclusao}"</em>
                        </div>
                      </div>
                    )}

                    {ordem.historicoAuditoria &&
                      ordem.historicoAuditoria.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Histórico de Alterações Registradas:
                          </span>
                          {ordem.historicoAuditoria.map((reg) => (
                            <div
                              key={reg.id}
                              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-amber-300">
                                    {reg.acao === "EXCLUSAO_LOGICA"
                                      ? "🗑️ Exclusão Lógica"
                                      : "✏️ Edição de Ordem"}
                                  </span>{" "}
                                  por{" "}
                                  <strong className="text-slate-100">
                                    {reg.realizadoPorNome}
                                  </strong>{" "}
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300">
                                    {reg.realizadoPorNivel}
                                  </span>
                                </div>
                                <span className="text-slate-400">
                                  {formatarDataHora(reg.realizadoEm)}
                                </span>
                              </div>

                              <div className="text-slate-200">
                                <strong>Motivo:</strong> "{reg.motivo}"
                              </div>

                              <div className="text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80 space-y-1">
                                <div>
                                  <strong className="text-red-300">
                                    Antes:
                                  </strong>{" "}
                                  {reg.resumoAnterior}
                                </div>
                                {reg.resumoNovo && (
                                  <div>
                                    <strong className="text-emerald-300">
                                      Depois:
                                    </strong>{" "}
                                    {reg.resumoNovo}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR FIXA PARA CELULARES (BOTTOM TAB BAR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-1.5">
        <div
          className={`grid ${
            ehAdministrador
              ? "grid-cols-5"
              : ehGestorOuAdmin
              ? "grid-cols-4"
              : "grid-cols-2"
          } gap-1`}
        >
          <button
            type="button"
            onClick={() => setAbaAtiva("lancar")}
            className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
              abaAtiva === "lancar"
                ? "bg-amber-500/15 text-amber-400"
                : "text-slate-400"
            }`}
          >
            <span className="text-base">✂️</span>
            <span>Lançar</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("extrato")}
            className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
              abaAtiva === "extrato"
                ? "bg-amber-500/15 text-amber-400"
                : "text-slate-400"
            }`}
          >
            <span className="text-base">💰</span>
            <span>Extrato</span>
          </button>

          {ehGestorOuAdmin && (
            <>
              <button
                type="button"
                onClick={() => setAbaAtiva("fechamento")}
                className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  abaAtiva === "fechamento"
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-slate-400"
                }`}
              >
                <span className="text-base">📊</span>
                <span>Fechamento</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva("gestao")}
                className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  abaAtiva === "gestao"
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-slate-400"
                }`}
              >
                <span className="text-base">⚙️</span>
                <span>Gestão</span>
              </button>
            </>
          )}

          {ehAdministrador && (
            <button
              type="button"
              onClick={() => setAbaAtiva("auditoria")}
              className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                abaAtiva === "auditoria"
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-slate-400"
              }`}
            >
              <span className="text-base">🛡️</span>
              <span>Auditoria</span>
            </button>
          )}
        </div>
      </nav>

      {/* =========================================================
          MODAL: ACESSO DOS CELULARES NA REDE LOCAL (QR CODE + DNS LOCAL)
         ========================================================= */}
      {modalRedeAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-amber-400">
                  📷 Acesso Fácil pelos Celulares (Wi-Fi)
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Aponte a câmera do celular para o QR Code ou digite o endereço
                  amigável no navegador:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRedeAberto(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {infoRede?.qrCodePrincipalDataUrl && (
              <div className="flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-4 gap-2">
                <div className="bg-white p-2.5 rounded-xl shadow">
                  <img
                    src={infoRede.qrCodePrincipalDataUrl}
                    alt="QR Code Wi-Fi Barbearia"
                    className="w-44 h-44"
                  />
                </div>
                <span className="text-xs text-slate-400">
                  Escaneie com a câmera do celular para abrir direto
                </span>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Endereço DNS Local Amigável */}
              {infoRede && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                      🌐 Endereço Amigável (DNS Local / mDNS)
                    </span>
                    <div className="text-sm sm:text-base font-extrabold text-amber-400">
                      {infoRede.urlDominioLocal}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Alternativa do Windows: {infoRede.urlHostnameWindows}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(infoRede.urlDominioLocal);
                      exibirToast("Endereço amigável copiado!");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-amber-300 border border-amber-500/30 cursor-pointer shrink-0"
                  >
                    Copiar
                  </button>
                </div>
              )}

              {/* Endereços IP caso necessário */}
              {infoRede?.enderecosRedeLocal &&
                infoRede.enderecosRedeLocal.map((item) => (
                  <div
                    key={item.url}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                        📶 Link Direto da Rede ({item.interfaceRede})
                      </span>
                      <div className="text-sm font-bold text-emerald-400">
                        {item.url}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(item.url);
                        exibirToast("Endereço copiado!");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                ))}
            </div>

            <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
              💡 <strong>Dica:</strong> Após abrir no celular pela primeira vez,
              toque em <em>"Adicionar à Tela de Início"</em> no menu do
              navegador. Assim, um ícone da barbearia ficará salvo na tela do
              celular do barbeiro!
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ATIVAR VERSÃO DEFINITIVA PAGA (CHAVE DE LICENÇA)
         ========================================================= */}
      {modalLicencaAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-amber-400">
                  🔑 Ativar Versão Definitiva
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ao ativar a chave definitiva, o bloqueio de 30 dias é removido
                  imediatamente e{" "}
                  <strong className="text-slate-200">
                    todos os dados já lançados são preservados
                  </strong>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalLicencaAberto(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAtivarLicencaDefinitiva}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Chave de Ativação (BSM-...)
                </label>
                <input
                  type="text"
                  value={chaveAtivacaoInput}
                  onChange={(e) => setChaveAtivacaoInput(e.target.value)}
                  placeholder="Cole aqui a chave BSM-..."
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalLicencaAberto(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  ✅ Desbloquear Versão Definitiva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDITAR DADOS DO BARBEIRO
         ========================================================= */}
      {barbeiroEditando && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Editar Barbeiro
                </h3>
                <p className="text-xs text-slate-400">
                  Altere o nome, comissão padrão, nível de acesso ou status
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBarbeiroEditando(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoBarbeiro} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={editBarbNome}
                    onChange={(e) => setEditBarbNome(e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Comissão Padrão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editBarbComissao}
                    onChange={(e) => setEditBarbComissao(e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editBarbEmail}
                    onChange={(e) => setEditBarbEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={editBarbTelefone}
                    onChange={(e) => setEditBarbTelefone(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Nível de Acesso
                  </label>
                  <select
                    value={editBarbNivel}
                    onChange={(e) =>
                      setEditBarbNivel(e.target.value as NivelAcesso)
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  >
                    <option value="OPERADOR">Operador</option>
                    <option value="GESTOR">Gestor</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={String(editBarbAtivo)}
                    onChange={(e) =>
                      setEditBarbAtivo(e.target.value === "true")
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  >
                    <option value="true">✅ Ativo</option>
                    <option value="false">⛔ Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Nova Senha (Opcional)
                  </label>
                  <input
                    type="password"
                    value={editBarbSenha}
                    onChange={(e) => setEditBarbSenha(e.target.value)}
                    placeholder="Manter atual"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setBarbeiroEditando(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  💾 Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDITAR SERVIÇO DO CATÁLOGO
         ========================================================= */}
      {servicoEditando && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Editar Serviço
                </h3>
                <p className="text-xs text-slate-400">
                  Atualize o nome, preço ou comissão específica
                </p>
              </div>
              <button
                type="button"
                onClick={() => setServicoEditando(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoServico} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  value={editServNome}
                  onChange={(e) => setEditServNome(e.target.value)}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={editServPreco}
                    onChange={(e) => setEditServPreco(e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Comissão Específica (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editServComissao}
                    onChange={(e) => setEditServComissao(e.target.value)}
                    placeholder="Padrão barbeiro"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Status do Serviço
                </label>
                <select
                  value={String(editServAtivo)}
                  onChange={(e) => setEditServAtivo(e.target.value === "true")}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                >
                  <option value="true">✅ Ativo</option>
                  <option value="false">⛔ Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setServicoEditando(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  💾 Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDITAR ORDEM DE SERVIÇO (COM AUDITORIA)
         ========================================================= */}
      {ordemEditando && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  ✏️ Editar Ordem de Serviço
                </h3>
                <p className="text-xs text-slate-400">
                  Esta alteração ficará registrada no histórico de auditoria do
                  Administrador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrdemEditando(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoOrdem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Serviços da Ordem
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {servicosAtivos.map((s) => {
                    const marcado = editOrdemServicos.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => alternarServicoEdicaoOrdem(s.id)}
                        className={`p-3 rounded-xl border text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${
                          marcado
                            ? "bg-amber-500/15 border-amber-400 text-slate-100"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div>
                          <div className="font-bold">{s.nome}</div>
                          <div className="text-amber-400">
                            {s.precoFormatado}
                          </div>
                        </div>
                        <span>{marcado ? "✓" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={editOrdemPagamento}
                    onChange={(e) =>
                      setEditOrdemPagamento(e.target.value as MetodoPagamento)
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  >
                    <option value="PIX">PIX</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Observação
                  </label>
                  <input
                    type="text"
                    value={editOrdemObservacoes}
                    onChange={(e) => setEditOrdemObservacoes(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Motivo da Edição (Obrigatório para Auditoria)
                </label>
                <input
                  type="text"
                  value={editOrdemMotivo}
                  onChange={(e) => setEditOrdemMotivo(e.target.value)}
                  placeholder="Ex: Barbeiro selecionou o serviço errado sem querer"
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrdemEditando(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  💾 Salvar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EXCLUIR ORDEM DE SERVIÇO LOGICAMENTE (COM AUDITORIA)
         ========================================================= */}
      {ordemExcluindo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-red-400">
                  🗑️ Excluir Ordem de Serviço
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  A ordem sairá do fechamento e da visão do barbeiro, mas{" "}
                  <strong className="text-slate-200">
                    ficará gravada na Auditoria do Administrador
                  </strong>{" "}
                  com o seu nome e o motivo abaixo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrdemExcluindo(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmarExclusaoOrdem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-red-300 mb-1.5">
                  Motivo da Exclusão (Obrigatório)
                </label>
                <input
                  type="text"
                  value={excluirOrdemMotivo}
                  onChange={(e) => setExcluirOrdemMotivo(e.target.value)}
                  placeholder="Ex: Ordem lançada em duplicidade"
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOrdemExcluindo(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  🗑️ Confirmar Exclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
