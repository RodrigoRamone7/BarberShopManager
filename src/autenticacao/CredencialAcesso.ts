export interface CredencialAcessoProps {
  id: string;
  pessoaId: string;
  login: string;
  senhaHash: string;
  ativo?: boolean;
  ultimoAcessoEm?: Date;
  criadoEm?: Date;
}

export class CredencialAcesso {
  public readonly id: string;
  public readonly pessoaId: string;
  public login: string;
  private _senhaHash: string;
  public ativo: boolean;
  public ultimoAcessoEm?: Date;
  public readonly criadoEm: Date;

  constructor(props: CredencialAcessoProps) {
    if (!props.id.trim()) {
      throw new Error("O identificador da credencial é obrigatório.");
    }
    if (!props.pessoaId.trim()) {
      throw new Error("O identificador da pessoa é obrigatório.");
    }
    if (!props.login.trim()) {
      throw new Error("O login é obrigatório.");
    }
    if (!props.senhaHash.trim()) {
      throw new Error("O hash da senha é obrigatório.");
    }

    this.id = props.id.trim();
    this.pessoaId = props.pessoaId.trim();
    this.login = props.login.trim().toLowerCase();
    this._senhaHash = props.senhaHash;
    this.ativo = props.ativo ?? true;
    this.ultimoAcessoEm = props.ultimoAcessoEm;
    this.criadoEm = props.criadoEm ?? new Date();
  }

  get senhaHash(): string {
    return this._senhaHash;
  }

  public atualizarSenhaHash(novoHash: string): void {
    if (!novoHash.trim()) {
      throw new Error("O novo hash de senha não pode ser vazio.");
    }
    this._senhaHash = novoHash;
  }

  public registrarAcesso(data: Date = new Date()): void {
    this.ultimoAcessoEm = data;
  }
}
