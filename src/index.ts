import {
  CasoDeUsoAutenticacao,
  GerenciadorBarbeiros,
  GerenciadorFechamento,
  GerenciadorOrdensServico,
  GerenciadorServicos,
} from "./aplicacao";
import { GerenciadorToken, ServicoAutenticacao } from "./autenticacao";
import { Barbeiro, MetodoPagamento, NivelAcesso } from "./dominio";
import {
  RepositorioCredencialMemoria,
  RepositorioOrdemServicoMemoria,
  RepositorioPessoaMemoria,
  RepositorioServicoMemoria,
} from "./repositorios";

async function executarDemonstracao() {
  // 1. Inicialização dos Repositórios em Memória
  const repoPessoa = new RepositorioPessoaMemoria();
  const repoCredencial = new RepositorioCredencialMemoria();
  const repoServico = new RepositorioServicoMemoria();
  const repoOrdem = new RepositorioOrdemServicoMemoria();

  // 2. Inicialização dos Serviços de Autenticação e Casos de Uso
  const gerenciadorToken = new GerenciadorToken(
    "segredo-super-seguro-barbearia-2026"
  );
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

  // 3. Seed do Administrador Inicial (Dono da Barbearia)
  const adminInicial = new Barbeiro({
    id: "admin-1",
    nome: "Rodrigo (Administrador)",
    taxaComissaoPadrao: 60,
    nivelAcesso: NivelAcesso.ADMINISTRADOR,
  });
  const credencialAdmin = servicoAutenticacao.criarCredencial({
    id: "cred-admin",
    pessoa: adminInicial,
    login: "admin@barbearia.com",
    senhaPura: "admin123",
  });
  await repoPessoa.salvar(adminInicial);
  await repoCredencial.salvar(credencialAdmin);

  // 4. Login como Administrador
  const sessaoAdmin = await casoDeUsoAuth.login("admin@barbearia.com", "admin123");
  const tokenAdmin = casoDeUsoAuth.validarToken(sessaoAdmin.token);

  // 5. Administrador cadastra barbeiros (Operadores) e o catálogo de serviços
  const carlos = await gerenciadorBarbeiros.cadastrarBarbeiro(tokenAdmin, {
    nome: "Carlos Silva",
    taxaComissaoPadrao: 50,
    login: "carlos@barbearia.com",
    senhaInicial: "carlos123",
  });

  const mateus = await gerenciadorBarbeiros.cadastrarBarbeiro(tokenAdmin, {
    nome: "Mateus Santos",
    taxaComissaoPadrao: 45,
    login: "mateus@barbearia.com",
    senhaInicial: "mateus123",
  });

  const corte = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Corte Degradê",
    preco: 45.0,
  });

  const barba = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Barba Completa",
    preco: 35.0,
  });

  const sobrancelha = await gerenciadorServicos.cadastrarServico(tokenAdmin, {
    nome: "Sobrancelha",
    preco: 15.0,
    taxaComissaoEspecifica: 60,
  });

  // 6. Barbeiros fazem login e lançam suas Ordens de Serviço
  const sessaoCarlos = await casoDeUsoAuth.login("carlos@barbearia.com", "carlos123");
  const tokenCarlos = casoDeUsoAuth.validarToken(sessaoCarlos.token);

  await gerenciadorOrdens.lancarOrdem(tokenCarlos, {
    itens: [{ servicoId: corte.id }],
    metodoPagamento: MetodoPagamento.PIX,
    realizadoEm: new Date("2026-10-05T10:30:00"),
  });

  await gerenciadorOrdens.lancarOrdem(tokenCarlos, {
    itens: [
      { servicoId: corte.id },
      { servicoId: barba.id },
      { servicoId: sobrancelha.id },
    ],
    metodoPagamento: MetodoPagamento.CARTAO_CREDITO,
    realizadoEm: new Date("2026-10-12T15:00:00"),
  });

  const sessaoMateus = await casoDeUsoAuth.login("mateus@barbearia.com", "mateus123");
  const tokenMateus = casoDeUsoAuth.validarToken(sessaoMateus.token);

  await gerenciadorOrdens.lancarOrdem(tokenMateus, {
    itens: [{ servicoId: corte.id }, { servicoId: barba.id }],
    metodoPagamento: MetodoPagamento.DINHEIRO,
    realizadoEm: new Date("2026-10-14T11:00:00"),
  });

  // 7. Consulta de fechamento geral pelo Administrador
  const inicioOutubro = new Date("2026-10-01T00:00:00");
  const fimOutubro = new Date("2026-10-31T23:59:59");

  const fechamentoGeral = await gerenciadorFechamento.gerarFechamentoGeral(
    tokenAdmin,
    inicioOutubro,
    fimOutubro
  );

  console.log("=== FECHAMENTO MENSAL DA BARBEARIA (OUTUBRO/2026) ===");
  console.log(`Total de Atendimentos:   ${fechamentoGeral.totalOrdens}`);
  console.log(`Total de Serviços:       ${fechamentoGeral.totalServicosExecutados}`);
  console.log(`Faturamento Bruto Total: ${fechamentoGeral.faturamentoBrutoTotal.formatar()}`);
  console.log(`Total Comissões a Pagar: ${fechamentoGeral.totalComissoesPagar.formatar()}`);
  console.log(`Total Líquido Barbearia: ${fechamentoGeral.totalLiquidoBarbearia.formatar()}\n`);

  console.log("--- Detalhamento por Barbeiro ---");
  for (const extrato of fechamentoGeral.extratosPorBarbeiro) {
    console.log(
      `• ${extrato.nomeBarbeiro}: ${extrato.totalOrdens} ordens (${extrato.totalServicosExecutados} serviços) | Bruto: ${extrato.faturamentoBruto.formatar()} | Receber: ${extrato.totalComissaoBarbeiro.formatar()}`
    );
  }

  console.log(`\nBarbeiros ativos cadastrados: ${carlos.nome}, ${mateus.nome}`);
}

executarDemonstracao().catch(console.error);
