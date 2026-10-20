import { Barbeiro } from "./Barbeiro";
import { Dinheiro } from "./Dinheiro";
import { Servico } from "./Servico";

export interface ItemOrdemServicoProps {
  servico: Servico;
  barbeiro: Barbeiro;
  valorPersonalizado?: Dinheiro;
}

export class ItemOrdemServico {
  public readonly servicoId: string;
  public readonly nomeServicoHistorico: string;
  public readonly valorCobrado: Dinheiro;
  public readonly taxaComissaoAplicada: number;

  constructor(props: ItemOrdemServicoProps) {
    if (!props.servico.ativo) {
      throw new Error(`O serviço "${props.servico.nome}" está inativo.`);
    }

    this.servicoId = props.servico.id;
    this.nomeServicoHistorico = props.servico.nome;
    this.valorCobrado = props.valorPersonalizado ?? props.servico.preco;
    this.taxaComissaoAplicada =
      props.servico.taxaComissaoEspecifica ?? props.barbeiro.taxaComissaoPadrao;
  }

  get valorComissaoBarbeiro(): Dinheiro {
    return this.valorCobrado.calcularPorcentagem(this.taxaComissaoAplicada);
  }

  get valorBarbearia(): Dinheiro {
    return this.valorCobrado.subtrair(this.valorComissaoBarbeiro);
  }
}
