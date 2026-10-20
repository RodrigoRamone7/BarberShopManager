import { Barbeiro } from "./Barbeiro";
import { Dinheiro } from "./Dinheiro";
import { OrdemServico } from "./OrdemServico";

export interface ExtratoBarbeiroProps {
  barbeiro: Barbeiro;
  inicioPeriodo: Date;
  fimPeriodo: Date;
  ordens: OrdemServico[];
}

export class ExtratoBarbeiro {
  public readonly barbeiroId: string;
  public readonly nomeBarbeiro: string;
  public readonly inicioPeriodo: Date;
  public readonly fimPeriodo: Date;
  public readonly ordens: ReadonlyArray<OrdemServico>;

  constructor(props: ExtratoBarbeiroProps) {
    if (props.fimPeriodo < props.inicioPeriodo) {
      throw new Error("A data final do período não pode ser anterior à data inicial.");
    }

    this.barbeiroId = props.barbeiro.id;
    this.nomeBarbeiro = props.barbeiro.nome;
    this.inicioPeriodo = props.inicioPeriodo;
    this.fimPeriodo = props.fimPeriodo;
    this.ordens = props.ordens.filter(
      (ordem) =>
        ordem.barbeiroId === props.barbeiro.id &&
        ordem.realizadoEm >= props.inicioPeriodo &&
        ordem.realizadoEm <= props.fimPeriodo
    );
  }

  /** Total de atendimentos (Ordens de Serviço) no período */
  get totalOrdens(): number {
    return this.ordens.length;
  }

  /** Total de serviços individuais executados (soma dos itens de cada ordem) */
  get totalServicosExecutados(): number {
    return this.ordens.reduce((total, ordem) => total + ordem.itens.length, 0);
  }

  /** Faturamento bruto produzido pelo barbeiro no período */
  get faturamentoBruto(): Dinheiro {
    return this.ordens.reduce(
      (total, ordem) => total.somar(ordem.valorTotal),
      Dinheiro.zero()
    );
  }

  /** Total devido ao barbeiro no fechamento */
  get totalComissaoBarbeiro(): Dinheiro {
    return this.ordens.reduce(
      (total, ordem) => total.somar(ordem.valorTotalComissaoBarbeiro),
      Dinheiro.zero()
    );
  }

  /** Total líquido que fica para a barbearia */
  get totalBarbearia(): Dinheiro {
    return this.ordens.reduce(
      (total, ordem) => total.somar(ordem.valorTotalBarbearia),
      Dinheiro.zero()
    );
  }
}
