import { NivelAcesso } from "./NivelAcesso";

export interface PessoaProps {
  id: string;
  nome: string;
  nivelAcesso: NivelAcesso;
  email?: string;
  telefone?: string;
  ativo?: boolean;
  criadoEm?: Date;
}

export abstract class Pessoa {
  public readonly id: string;
  public nome: string;
  public email?: string;
  public telefone?: string;
  public nivelAcesso: NivelAcesso;
  public ativo: boolean;
  public readonly criadoEm: Date;

  constructor(props: PessoaProps) {
    if (!props.id.trim()) {
      throw new Error("O identificador da pessoa é obrigatório.");
    }
    if (!props.nome.trim()) {
      throw new Error("O nome da pessoa é obrigatório.");
    }

    this.id = props.id.trim();
    this.nome = props.nome.trim();
    this.email = props.email?.trim();
    this.telefone = props.telefone?.trim();
    this.nivelAcesso = props.nivelAcesso;
    this.ativo = props.ativo ?? true;
    this.criadoEm = props.criadoEm ?? new Date();
  }

  public ehAdministrador(): boolean {
    return this.nivelAcesso === NivelAcesso.ADMINISTRADOR;
  }

  public podeGerenciarBarbearia(): boolean {
    return (
      this.nivelAcesso === NivelAcesso.ADMINISTRADOR ||
      this.nivelAcesso === NivelAcesso.GESTOR
    );
  }
}
