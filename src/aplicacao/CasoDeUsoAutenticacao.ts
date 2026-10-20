import {
  PayloadToken,
  ResultadoAutenticacao,
  ServicoAutenticacao,
} from "../autenticacao";
import { NivelAcesso } from "../dominio";
import { RepositorioCredencial, RepositorioPessoa } from "../repositorios";

export class CasoDeUsoAutenticacao {
  constructor(
    private readonly repoPessoa: RepositorioPessoa,
    private readonly repoCredencial: RepositorioCredencial,
    private readonly servicoAutenticacao: ServicoAutenticacao
  ) {}

  public async login(
    login: string,
    senhaPura: string
  ): Promise<ResultadoAutenticacao> {
    const credencial = await this.repoCredencial.buscarPorLogin(login);
    const pessoa = credencial
      ? await this.repoPessoa.buscarPorId(credencial.pessoaId)
      : undefined;

    const resultado = this.servicoAutenticacao.autenticar({
      login,
      senhaPura,
      credencial: credencial ?? undefined,
      pessoa: pessoa ?? undefined,
    });

    if (credencial) {
      await this.repoCredencial.salvar(credencial);
    }

    return resultado;
  }

  public async alterarPropriaSenha(
    solicitante: PayloadToken,
    senhaAtual: string,
    novaSenha: string
  ): Promise<void> {
    const credencial = await this.repoCredencial.buscarPorPessoaId(
      solicitante.pessoaId
    );
    if (!credencial) {
      throw new Error("Credencial de acesso não encontrada.");
    }

    this.servicoAutenticacao.alterarSenha({
      credencial,
      senhaAtual,
      novaSenha,
    });

    await this.repoCredencial.salvar(credencial);
  }

  public validarToken(
    token: string,
    niveisPermitidos?: NivelAcesso[]
  ): PayloadToken {
    return this.servicoAutenticacao.verificarAcesso(token, niveisPermitidos);
  }
}
