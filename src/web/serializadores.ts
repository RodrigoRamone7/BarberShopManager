import { FechamentoGeralBarbearia } from "../aplicacao";
import {
  Barbeiro,
  ExtratoBarbeiro,
  ItemOrdemServico,
  OrdemServico,
  Servico,
} from "../dominio";

export function serializarBarbeiro(barbeiro: Barbeiro) {
  return {
    id: barbeiro.id,
    nome: barbeiro.nome,
    email: barbeiro.email ?? null,
    telefone: barbeiro.telefone ?? null,
    nivelAcesso: barbeiro.nivelAcesso,
    taxaComissaoPadrao: barbeiro.taxaComissaoPadrao,
    ativo: barbeiro.ativo,
    criadoEm: barbeiro.criadoEm.toISOString(),
  };
}

export function serializarServico(servico: Servico) {
  return {
    id: servico.id,
    nome: servico.nome,
    preco: servico.preco.valor,
    precoFormatado: servico.preco.formatar(),
    taxaComissaoEspecifica: servico.taxaComissaoEspecifica ?? null,
    ativo: servico.ativo,
  };
}

export function serializarItemOrdem(item: ItemOrdemServico) {
  return {
    servicoId: item.servicoId,
    nomeServicoHistorico: item.nomeServicoHistorico,
    valorCobrado: item.valorCobrado.valor,
    valorCobradoFormatado: item.valorCobrado.formatar(),
    taxaComissaoAplicada: item.taxaComissaoAplicada,
    valorComissaoBarbeiro: item.valorComissaoBarbeiro.valor,
    valorComissaoBarbeiroFormatado: item.valorComissaoBarbeiro.formatar(),
    valorBarbearia: item.valorBarbearia.valor,
    valorBarbeariaFormatado: item.valorBarbearia.formatar(),
  };
}

export function serializarOrdemServico(
  ordem: OrdemServico,
  nomeBarbeiro?: string
) {
  return {
    id: ordem.id,
    barbeiroId: ordem.barbeiroId,
    nomeBarbeiro: nomeBarbeiro ?? null,
    metodoPagamento: ordem.metodoPagamento,
    realizadoEm: ordem.realizadoEm.toISOString(),
    observacoes: ordem.observacoes ?? null,
    itens: ordem.itens.map(serializarItemOrdem),
    valorTotal: ordem.valorTotal.valor,
    valorTotalFormatado: ordem.valorTotal.formatar(),
    valorTotalComissaoBarbeiro: ordem.valorTotalComissaoBarbeiro.valor,
    valorTotalComissaoBarbeiroFormatado:
      ordem.valorTotalComissaoBarbeiro.formatar(),
    valorTotalBarbearia: ordem.valorTotalBarbearia.valor,
    valorTotalBarbeariaFormatado: ordem.valorTotalBarbearia.formatar(),
  };
}

export function serializarExtratoBarbeiro(extrato: ExtratoBarbeiro) {
  return {
    barbeiroId: extrato.barbeiroId,
    nomeBarbeiro: extrato.nomeBarbeiro,
    inicioPeriodo: extrato.inicioPeriodo.toISOString(),
    fimPeriodo: extrato.fimPeriodo.toISOString(),
    totalOrdens: extrato.totalOrdens,
    totalServicosExecutados: extrato.totalServicosExecutados,
    faturamentoBruto: extrato.faturamentoBruto.valor,
    faturamentoBrutoFormatado: extrato.faturamentoBruto.formatar(),
    totalComissaoBarbeiro: extrato.totalComissaoBarbeiro.valor,
    totalComissaoBarbeiroFormatado: extrato.totalComissaoBarbeiro.formatar(),
    totalBarbearia: extrato.totalBarbearia.valor,
    totalBarbeariaFormatado: extrato.totalBarbearia.formatar(),
    ordens: extrato.ordens.map((o) =>
      serializarOrdemServico(o, extrato.nomeBarbeiro)
    ),
  };
}

export function serializarFechamentoGeral(
  fechamento: FechamentoGeralBarbearia
) {
  return {
    inicioPeriodo: fechamento.inicioPeriodo.toISOString(),
    fimPeriodo: fechamento.fimPeriodo.toISOString(),
    totalOrdens: fechamento.totalOrdens,
    totalServicosExecutados: fechamento.totalServicosExecutados,
    faturamentoBrutoTotal: fechamento.faturamentoBrutoTotal.valor,
    faturamentoBrutoTotalFormatado:
      fechamento.faturamentoBrutoTotal.formatar(),
    totalComissoesPagar: fechamento.totalComissoesPagar.valor,
    totalComissoesPagarFormatado: fechamento.totalComissoesPagar.formatar(),
    totalLiquidoBarbearia: fechamento.totalLiquidoBarbearia.valor,
    totalLiquidoBarbeariaFormatado:
      fechamento.totalLiquidoBarbearia.formatar(),
    extratosPorBarbeiro: fechamento.extratosPorBarbeiro.map(
      serializarExtratoBarbeiro
    ),
  };
}
