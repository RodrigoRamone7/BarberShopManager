import { Dinheiro } from "./Dinheiro";

export interface ServicoProps {
  id: string;
  nome: string;
  preco: Dinheiro;
  taxaComissaoEspecifica?: number;
  ativo?: boolean;
}

export class Servico {
  public readonly id: string;
  public nome: string;
  public preco: Dinheiro;
  public taxaComissaoEspecifica?: number;
  public ativo: boolean;

  constructor(props: ServicoProps) {
    if (!props.id.trim()) {
      throw new Error("O identificador do serviço é obrigatório.");
    }
    if (!props.nome.trim()) {
      throw new Error("O nome do serviço é obrigatório.");
    }
    if (
      props.taxaComissaoEspecifica !== undefined &&
      (props.taxaComissaoEspecifica < 0 || props.taxaComissaoEspecifica > 100)
    ) {
      throw new Error("A comissão específica deve estar entre 0 e 100.");
    }

    this.id = props.id.trim();
    this.nome = props.nome.trim();
    this.preco = props.preco;
    this.taxaComissaoEspecifica = props.taxaComissaoEspecifica;
    this.ativo = props.ativo ?? true;
  }
}
