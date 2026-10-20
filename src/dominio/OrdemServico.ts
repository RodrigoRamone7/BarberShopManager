import { Barbeiro } from "./Barbeiro";
import { Dinheiro } from "./Dinheiro";
import { ItemOrdemServico } from "./ItemOrdemServico";
import { MetodoPagamento } from "./MetodoPagamento";
import { Servico } from "./Servico";

export interface ServicoRealizadoInput {
  servico: Servico;
  valorPersonalizado?: Dinheiro;
}

export interface OrdemServicoProps {
  id: string;
  barbeiro: Barbeiro;
  servicos: ServicoRealizadoInput[];
  metodoPagamento: MetodoPagamento;
  realizadoEm?: Date;
  observacoes?: string;
}

export class OrdemServico {
  public readonly id: string;
  public readonly barbeiroId: string;
  public readonly itens: ReadonlyArray<ItemOrdemServico>;
  public readonly metodoPagamento: MetodoPagamento;
  public readonly realizadoEm: Date;
  public readonly observacoes?: string;

  constructor(props: OrdemServicoProps) {
    if (!props.id.trim()) {
      throw new Error("O identificador da ordem de serviço é obrigatório.");
    }
    if (!props.barbeiro.ativo) {
      throw new Error("Não é possível lançar uma ordem para um barbeiro inativo.");
    }
    if (props.servicos.length === 0) {
      throw new Error("A ordem de serviço deve conter pelo menos um serviço.");
    }

    this.id = props.id.trim();
    this.barbeiroId = props.barbeiro.id;
    this.itens = props.servicos.map(
      (item) =>
        new ItemOrdemServico({
          servico: item.servico,
          barbeiro: props.barbeiro,
          valorPersonalizado: item.valorPersonalizado,
        })
    );
    this.metodoPagamento = props.metodoPagamento;
    this.realizadoEm = props.realizadoEm ?? new Date();
    this.observacoes = props.observacoes?.trim();
  }

  /** Soma total cobrada do cliente nesta Ordem de Serviço */
  get valorTotal(): Dinheiro {
    return this.itens.reduce(
      (total, item) => total.somar(item.valorCobrado),
      Dinheiro.zero()
    );
  }

  /** Soma total da comissão do barbeiro nesta Ordem de Serviço */
  get valorTotalComissaoBarbeiro(): Dinheiro {
    return this.itens.reduce(
      (total, item) => total.somar(item.valorComissaoBarbeiro),
      Dinheiro.zero()
    );
  }

  /** Soma total que fica para a barbearia nesta Ordem de Serviço */
  get valorTotalBarbearia(): Dinheiro {
    return this.itens.reduce(
      (total, item) => total.somar(item.valorBarbearia),
      Dinheiro.zero()
    );
  }
}
