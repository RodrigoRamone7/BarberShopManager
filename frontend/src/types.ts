export type NivelAcesso = "ADMINISTRADOR" | "GESTOR" | "OPERADOR";

export type MetodoPagamento =
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "DINHEIRO";

export interface UsuarioAutenticado {
  pessoaId: string;
  nome: string;
  login?: string;
  nivelAcesso: NivelAcesso;
  taxaComissaoPadrao: number;
}

export interface ServicoDTO {
  id: string;
  nome: string;
  preco: number;
  precoFormatado: string;
  taxaComissaoEspecifica: number | null;
  ativo: boolean;
}

export interface BarbeiroDTO {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  nivelAcesso: NivelAcesso;
  taxaComissaoPadrao: number;
  ativo: boolean;
  criadoEm: string;
}

export interface ItemOrdemDTO {
  servicoId: string;
  nomeServicoHistorico: string;
  valorCobrado: number;
  valorCobradoFormatado: string;
  taxaComissaoAplicada: number;
  valorComissaoBarbeiro: number;
  valorComissaoBarbeiroFormatado: string;
  valorBarbearia: number;
  valorBarbeariaFormatado: string;
}

export interface RegistroAuditoriaOrdemDTO {
  id: string;
  acao: "EDICAO" | "EXCLUSAO_LOGICA";
  realizadoPorId: string;
  realizadoPorNome: string;
  realizadoPorNivel: NivelAcesso;
  realizadoEm: string;
  motivo: string;
  resumoAnterior: string;
  resumoNovo: string | null;
}

export interface OrdemServicoDTO {
  id: string;
  barbeiroId: string;
  nomeBarbeiro: string | null;
  metodoPagamento: MetodoPagamento;
  realizadoEm: string;
  observacoes: string | null;
  excluida?: boolean;
  excluidaEm?: string | null;
  excluidaPorId?: string | null;
  excluidaPorNome?: string | null;
  motivoExclusao?: string | null;
  historicoAuditoria?: RegistroAuditoriaOrdemDTO[];
  itens: ItemOrdemDTO[];
  valorTotal: number;
  valorTotalFormatado: string;
  valorTotalComissaoBarbeiro: number;
  valorTotalComissaoBarbeiroFormatado: string;
  valorTotalBarbearia: number;
  valorTotalBarbeariaFormatado: string;
}

export interface ExtratoBarbeiroDTO {
  barbeiroId: string;
  nomeBarbeiro: string;
  inicioPeriodo: string;
  fimPeriodo: string;
  totalOrdens: number;
  totalServicosExecutados: number;
  faturamentoBruto: number;
  faturamentoBrutoFormatado: string;
  totalComissaoBarbeiro: number;
  totalComissaoBarbeiroFormatado: string;
  totalBarbearia: number;
  totalBarbeariaFormatado: string;
  ordens: OrdemServicoDTO[];
}

export interface FechamentoGeralDTO {
  inicioPeriodo: string;
  fimPeriodo: string;
  totalOrdens: number;
  totalServicosExecutados: number;
  faturamentoBrutoTotal: number;
  faturamentoBrutoTotalFormatado: string;
  totalComissoesPagar: number;
  totalComissoesPagarFormatado: string;
  totalLiquidoBarbearia: number;
  totalLiquidoBarbeariaFormatado: string;
  extratosPorBarbeiro: ExtratoBarbeiroDTO[];
}

export interface InfoRedeLocalDTO {
  porta: number;
  dominioLocal: string;
  urlDominioLocal: string;
  hostnameWindows: string;
  urlHostnameWindows: string;
  urlLocalhost: string;
  urlRecomendadaCelular: string;
  qrCodePrincipalDataUrl: string;
  enderecosRedeLocal: Array<{
    interfaceRede: string;
    ip: string;
    url: string;
    qrCodeDataUrl?: string;
  }>;
}

export interface StatusLicencaDTO {
  tipo: "DEMO" | "DEFINITIVA";
  ativaParaEscrita: boolean;
  modoSomenteLeitura: boolean;
  expirada: boolean;
  relogioAdulterado: boolean;
  diasTotaisDemo: number;
  diasRestantesDemo: number;
  instaladoEm: string;
  expiraDemoEm: string;
  licenciadoPara: string | null;
  ativadoEm: string | null;
  mensagemStatus: string;
}
