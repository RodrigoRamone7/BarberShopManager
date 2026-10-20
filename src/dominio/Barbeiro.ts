import { NivelAcesso } from "./NivelAcesso";
import { Pessoa } from "./Pessoa";

export interface BarbeiroProps {
  id: string;
  nome: string;
  taxaComissaoPadrao: number;
  nivelAcesso?: NivelAcesso;
  email?: string;
  telefone?: string;
  ativo?: boolean;
  criadoEm?: Date;
}

export class Barbeiro extends Pessoa {
  public taxaComissaoPadrao: number;

  constructor(props: BarbeiroProps) {
    super({
      id: props.id,
      nome: props.nome,
      nivelAcesso: props.nivelAcesso ?? NivelAcesso.OPERADOR,
      email: props.email,
      telefone: props.telefone,
      ativo: props.ativo,
      criadoEm: props.criadoEm,
    });

    if (props.taxaComissaoPadrao < 0 || props.taxaComissaoPadrao > 100) {
      throw new Error("A taxa de comissão deve estar entre 0 e 100.");
    }

    this.taxaComissaoPadrao = props.taxaComissaoPadrao;
  }
}
