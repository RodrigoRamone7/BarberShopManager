import { NivelAcesso } from "../dominio/NivelAcesso";
import { Pessoa } from "../dominio/Pessoa";
import { CredencialAcesso } from "./CredencialAcesso";
import { CriptografiaSenha } from "./CriptografiaSenha";
import { GerenciadorToken, PayloadToken } from "./GerenciadorToken";

export interface ResultadoAutenticacao {
  token: string;
  usuario: {
    pessoaId: string;
    nome: string;
    login: string;
    nivelAcesso: NivelAcesso;
  };
}

export class ServicoAutenticacao {
  private readonly gerenciadorToken: GerenciadorToken;

  constructor(gerenciadorToken: GerenciadorToken) {
    this.gerenciadorToken = gerenciadorToken;
  }

  public criarCredencial(props: {
    id: string;
    pessoa: Pessoa;
    login: string;
    senhaPura: string;
  }): CredencialAcesso {
    if (!props.pessoa.ativo) {
      throw new Error("Não é possível criar credencial para uma pessoa inativa.");
    }

    const senhaHash = CriptografiaSenha.gerarHash(props.senhaPura);
    return new CredencialAcesso({
      id: props.id,
      pessoaId: props.pessoa.id,
      login: props.login,
      senhaHash,
    });
  }

  public alterarSenha(props: {
    credencial: CredencialAcesso;
    senhaAtual: string;
    novaSenha: string;
  }): void {
    const senhaValida = CriptografiaSenha.verificar(
      props.senhaAtual,
      props.credencial.senhaHash
    );

    if (!senhaValida) {
      throw new Error("A senha atual informada está incorreta.");
    }

    const novoHash = CriptografiaSenha.gerarHash(props.novaSenha);
    props.credencial.atualizarSenhaHash(novoHash);
  }

  public autenticar(props: {
    login: string;
    senhaPura: string;
    credencial?: CredencialAcesso;
    pessoa?: Pessoa;
  }): ResultadoAutenticacao {
    const { credencial, pessoa } = props;

    if (
      !credencial ||
      !pessoa ||
      credencial.login !== props.login.trim().toLowerCase()
    ) {
      throw new Error("Credenciais inválidas.");
    }

    if (!credencial.ativo || !pessoa.ativo) {
      throw new Error("Usuário inativo no sistema.");
    }

    const senhaValida = CriptografiaSenha.verificar(
      props.senhaPura,
      credencial.senhaHash
    );

    if (!senhaValida) {
      throw new Error("Credenciais inválidas.");
    }

    credencial.registrarAcesso();

    const token = this.gerenciadorToken.gerarToken({
      pessoaId: pessoa.id,
      nome: pessoa.nome,
      nivelAcesso: pessoa.nivelAcesso,
    });

    return {
      token,
      usuario: {
        pessoaId: pessoa.id,
        nome: pessoa.nome,
        login: credencial.login,
        nivelAcesso: pessoa.nivelAcesso,
      },
    };
  }

  public verificarAcesso(
    token: string,
    niveisPermitidos?: NivelAcesso[]
  ): PayloadToken {
    const payload = this.gerenciadorToken.validarToken(token);

    if (
      niveisPermitidos &&
      niveisPermitidos.length > 0 &&
      !niveisPermitidos.includes(payload.nivelAcesso)
    ) {
      throw new Error("Acesso negado: nível de permissão insuficiente.");
    }

    return payload;
  }
}
