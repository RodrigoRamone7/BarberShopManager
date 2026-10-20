import {
  CasoDeUsoAutenticacao,
  GerenciadorBarbeiros,
  GerenciadorOrdensServico,
  GerenciadorServicos,
} from "../aplicacao";
import { ServicoAutenticacao } from "../autenticacao";
import { Barbeiro, MetodoPagamento, NivelAcesso } from "../dominio";
import { RepositorioCredencial, RepositorioPessoa } from "../repositorios";

export async function popularDadosIniciais(deps: {
  repoPessoa: RepositorioPessoa;
  repoCredencial: RepositorioCredencial;
  servicoAutenticacao: ServicoAutenticacao;
  casoDeUsoAuth: CasoDeUsoAutenticacao;
  gerenciadorBarbeiros: GerenciadorBarbeiros;
  gerenciadorServicos: GerenciadorServicos;
  gerenciadorOrdens: GerenciadorOrdensServico;
}): Promise<void> {
  const {
    repoPessoa,
    repoCredencial,
    servicoAutenticacao,
    casoDeUsoAuth,
    gerenciadorBarbeiros,
    gerenciadorServicos,
    gerenciadorOrdens,
  } = deps;

  const existente = await repoCredencial.buscarPorLogin("admin@barbearia.com");
  if (existente) {
    return;
  }

  // 1. Administrador / Dono da Barbearia
  const admin = new Barbeiro({
    id: "admin-1",
    nome: "Rodrigo (Administrador)",
    email: "admin@barbearia.com",
    telefone: "(11) 99999-0001",
    taxaComissaoPadrao: 60,
    nivelAcesso: NivelAcesso.ADMINISTRADOR,
  });

  const credAdmin = servicoAutenticacao.criarCredencial({
    id: "cred-admin",
    pessoa: admin,
    login: "admin@barbearia.com",
    senhaPura: "admin123",
  });

  await repoPessoa.salvar(admin);
  await repoCredencial.salvar(credAdmin);

  const sessaoAdmin = await casoDeUsoAuth.login(
    "admin@barbearia.com",
    "admin123"
  );
  const tokenAdmin = casoDeUsoAuth.validarToken(sessaoAdmin.token);

  // 2. Barbeiros da equipe
  const carlos = await gerenciadorBarbeiros.cadastrarBarbeiro(tokenAdmin, {
    nome: "Carlos Silva",
    email: "carlos@barbearia.com",
    telefone: "(11) 98888-1111",
    taxaComissaoPadrao: 50,
    login: "carlos@barbearia.com",
    senhaInicial: "carlos123",
    nivelAcesso: NivelAcesso.OPERADOR,
  });

  const mateus = await gerenciadorBarbeiros.cadastrarBarbeiro(tokenAdmin, {
    nome: "Mateus Santos",
    email: "mateus@barbearia.com",
    telefone: "(11) 97777-2222",
    taxaComissaoPadrao: 45,
    login: "mateus@barbearia.com",
    senhaInicial: "mateus123",
    nivelAcesso: NivelAcesso.OPERADOR,
  });

  // 3. Catálogo de Serviços
  const corte = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Corte Degradê / Social",
    preco: 45.0,
  });

  const barba = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Barba Completa com Toalha Quente",
    preco: 35.0,
  });

  const sobrancelha = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Alinhamento de Sobrancelha",
    preco: 15.0,
    taxaComissaoEspecifica: 60,
  });

  const pigmentacao = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Pigmentação de Barba/Cabelo",
    preco: 30.0,
    taxaComissaoEspecifica: 55,
  });

  // 4. Ordens de Serviço de exemplo no mês atual
  const agora = new Date();
  const inicioMes = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    Math.min(agora.getDate(), 5),
    10,
    30
  );
  const meioMes = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    Math.min(agora.getDate(), 12),
    15,
    15
  );

  await gerenciadorOrdens.lancarOrdem(tokenAdmin, {
    barbeiroId: carlos.id,
    itens: [{ servicoId: corte.id }],
    metodoPagamento: MetodoPagamento.PIX,
    realizadoEm: inicioMes,
    observacoes: "Cliente mensalista",
  });

  await gerenciadorOrdens.lancarOrdem(tokenAdmin, {
    barbeiroId: carlos.id,
    itens: [
      { servicoId: corte.id },
      { servicoId: barba.id },
      { servicoId: sobrancelha.id },
    ],
    metodoPagamento: MetodoPagamento.CARTAO_CREDITO,
    realizadoEm: meioMes,
    observacoes: "Combo completo de sábado",
  });

  await gerenciadorOrdens.lancarOrdem(tokenAdmin, {
    barbeiroId: mateus.id,
    itens: [{ servicoId: corte.id }, { servicoId: pigmentacao.id }],
    metodoPagamento: MetodoPagamento.DINHEIRO,
    realizadoEm: meioMes,
  });
}
