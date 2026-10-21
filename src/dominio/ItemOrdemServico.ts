import { Barbeiro } from "./Barbeiro";
import { Dinheiro } from "./Dinheiro";
import { Servico } from "./Servico";

export interface ItemOrdemServicoProps {
  servico: Servico;
  barbeiro: Barbeiro;
  valorPersonalizado?: Dinheiro;
}

export interface ItemOrdemServicoPersistidoProps {
  servicoId: string;
  nomeServicoHistorico: string;
  valorCobrado: Dinheiro;
  taxaComissaoAplicada: number;
}

export class ItemOrdemServico {
  public readonly servicoId: string;
  public readonly nomeServicoHistorico: string;
  public readonly valorCobrado: Dinheiro;
  public readonly taxaComissaoAplicada: number;

  constructor(props: ItemOrdemServicoProps | ItemOrdemServicoPersistidoProps) {
    if ("servico" in props) {
      if (!props.servico.ativo) {
        throw new Error(`O serviço "${props.servico.nome}" está inativo.`);
      }

      this.servicoId = props.servico.id;
      this.nomeServicoHistorico = props.servico.nome;
      this.valorCobrado = props.valorPersonalizado ?? props.servico.preco;
      this.taxaComissaoAplicada =
        props.servico.taxaComissaoEspecifica ??
        props.barbeiro.taxaComissaoPadrao;
    } else {
      this.servicoId = props.servicoId;
      this.nomeServicoHistorico = props.nomeServicoHistorico;
      this.valorCobrado = props.valorCobrado;
      this.taxaComissaoAplicada = props.taxaComissaoAplicada;
    }
  }

  public static reconstituir(
    props: ItemOrdemServicoPersistidoProps
  ): ItemOrdemServico {
    return new ItemOrdemServico(props);
  }

  get valorComissaoBarbeiro(): Dinheiro {
    return this.valorCobrado.calcularPorcentagem(this.taxaComissaoAplicada);
  }

  get valorBarbearia(): Dinheiro {
    return this.valorCobrado.subtrair(this.valorComissaoBarbeiro);
  }
}
