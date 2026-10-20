import { PayloadToken } from "../autenticacao";
import { Dinheiro, ExtratoBarbeiro } from "../dominio";
import { RepositorioOrdemServico, RepositorioPessoa } from "../repositorios";
import {
  exigirPermissaoGestao,
  exigirPermissaoProprioOuGestao,
} from "./permissoes";

export interface FechamentoGeralBarbearia {
  inicioPeriodo: Date;
  fimPeriodo: Date;
  extratosPorBarbeiro: ExtratoBarbeiro[];
  totalOrdens: number;
  totalServicosExecutados: number;
  faturamentoBrutoTotal: Dinheiro;
  totalComissoesPagar: Dinheiro;
  totalLiquidoBarbearia: Dinheiro;
}

export class GerenciadorFechamento {
  constructor(
    private readonly repoPessoa: RepositorioPessoa,
    private readonly repoOrdem: RepositorioOrdemServico
  ) {}

  public async consultarExtratoBarbeiro(
    solicitante: PayloadToken,
    dados: {
      barbeiroId?: string;
      inicioPeriodo: Date;
      fimPeriodo: Date;
    }
  ): Promise<ExtratoBarbeiro> {
    const barbeiroAlvoId = dados.barbeiroId ?? solicitante.pessoaId;
    exigirPermissaoProprioOuGestao(solicitante, barbeiroAlvoId);

    const barbeiro = await this.repoPessoa.buscarBarbeiroPorId(barbeiroAlvoId);
    if (!barbeiro) {
      throw new Error("Barbeiro não encontrado.");
    }

    const ordens = await this.repoOrdem.listar({
      barbeiroId: barbeiro.id,
      inicioPeriodo: dados.inicioPeriodo,
      fimPeriodo: dados.fimPeriodo,
    });

    return new ExtratoBarbeiro({
      barbeiro,
      inicioPeriodo: dados.inicioPeriodo,
      fimPeriodo: dados.fimPeriodo,
      ordens,
    });
  }

  public async gerarFechamentoGeral(
    solicitante: PayloadToken,
    inicioPeriodo: Date,
    fimPeriodo: Date
  ): Promise<FechamentoGeralBarbearia> {
    exigirPermissaoGestao(solicitante);

    const barbeiros = await this.repoPessoa.listarBarbeiros(false);
    const ordensPeriodo = await this.repoOrdem.listar({
      inicioPeriodo,
      fimPeriodo,
    });

    const extratosPorBarbeiro = barbeiros.map(
      (barbeiro) =>
        new ExtratoBarbeiro({
          barbeiro,
          inicioPeriodo,
          fimPeriodo,
          ordens: ordensPeriodo.filter((o) => o.barbeiroId === barbeiro.id),
        })
    );

    const totalOrdens = extratosPorBarbeiro.reduce(
      (soma, extrato) => soma + extrato.totalOrdens,
      0
    );

    const totalServicosExecutados = extratosPorBarbeiro.reduce(
      (soma, extrato) => soma + extrato.totalServicosExecutados,
      0
    );

    const faturamentoBrutoTotal = extratosPorBarbeiro.reduce(
      (soma, extrato) => soma.somar(extrato.faturamentoBruto),
      Dinheiro.zero()
    );

    const totalComissoesPagar = extratosPorBarbeiro.reduce(
      (soma, extrato) => soma.somar(extrato.totalComissaoBarbeiro),
      Dinheiro.zero()
    );

    const totalLiquidoBarbearia = extratosPorBarbeiro.reduce(
      (soma, extrato) => soma.somar(extrato.totalBarbearia),
      Dinheiro.zero()
    );

    return {
      inicioPeriodo,
      fimPeriodo,
      extratosPorBarbeiro,
      totalOrdens,
      totalServicosExecutados,
      faturamentoBrutoTotal,
      totalComissoesPagar,
      totalLiquidoBarbearia,
    };
  }
}
