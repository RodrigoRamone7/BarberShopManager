import { randomUUID } from "crypto";
import { PayloadToken, ServicoAutenticacao } from "../autenticacao";
import { Barbeiro, NivelAcesso } from "../dominio";
import { RepositorioCredencial, RepositorioPessoa } from "../repositorios";
import { exigirPermissaoGestao } from "./permissoes";

export interface CadastrarBarbeiroInput {
  nome: string;
  taxaComissaoPadrao: number;
  login: string;
  senhaInicial: string;
  nivelAcesso?: NivelAcesso;
  email?: string;
  telefone?: string;
}

export class GerenciadorBarbeiros {
  constructor(
    private readonly repoPessoa: RepositorioPessoa,
    private readonly repoCredencial: RepositorioCredencial,
    private readonly servicoAutenticacao: ServicoAutenticacao
  ) {}

  public async cadastrarBarbeiro(
    solicitante: PayloadToken,
    dados: CadastrarBarbeiroInput
  ): Promise<Barbeiro> {
    exigirPermissaoGestao(solicitante);

    if (
      dados.nivelAcesso === NivelAcesso.ADMINISTRADOR &&
      solicitante.nivelAcesso !== NivelAcesso.ADMINISTRADOR
    ) {
      throw new Error(
        "Apenas administradores podem cadastrar outro administrador."
      );
    }

    const credencialExistente = await this.repoCredencial.buscarPorLogin(
      dados.login
    );
    if (credencialExistente) {
      throw new Error("Já existe um usuário cadastrado com este login.");
    }

    const barbeiro = new Barbeiro({
      id: randomUUID(),
      nome: dados.nome,
      taxaComissaoPadrao: dados.taxaComissaoPadrao,
      nivelAcesso: dados.nivelAcesso ?? NivelAcesso.OPERADOR,
      email: dados.email,
      telefone: dados.telefone,
    });

    const credencial = this.servicoAutenticacao.criarCredencial({
      id: randomUUID(),
      pessoa: barbeiro,
      login: dados.login,
      senhaPura: dados.senhaInicial,
    });

    await this.repoPessoa.salvar(barbeiro);
    await this.repoCredencial.salvar(credencial);

    return barbeiro;
  }

  public async atualizarTaxaComissao(
    solicitante: PayloadToken,
    barbeiroId: string,
    novaTaxaComissao: number
  ): Promise<Barbeiro> {
    exigirPermissaoGestao(solicitante);

    if (novaTaxaComissao < 0 || novaTaxaComissao > 100) {
      throw new Error("A taxa de comissão deve estar entre 0 e 100.");
    }

    const barbeiro = await this.repoPessoa.buscarBarbeiroPorId(barbeiroId);
    if (!barbeiro) {
      throw new Error("Barbeiro não encontrado.");
    }

    barbeiro.taxaComissaoPadrao = novaTaxaComissao;
    await this.repoPessoa.salvar(barbeiro);

    return barbeiro;
  }

  public async alterarStatusAtivo(
    solicitante: PayloadToken,
    barbeiroId: string,
    ativo: boolean
  ): Promise<Barbeiro> {
    exigirPermissaoGestao(solicitante);

    const barbeiro = await this.repoPessoa.buscarBarbeiroPorId(barbeiroId);
    if (!barbeiro) {
      throw new Error("Barbeiro não encontrado.");
    }

    barbeiro.ativo = ativo;
    await this.repoPessoa.salvar(barbeiro);

    const credencial = await this.repoCredencial.buscarPorPessoaId(barbeiroId);
    if (credencial) {
      credencial.ativo = ativo;
      await this.repoCredencial.salvar(credencial);
    }

    return barbeiro;
  }

  public async listarBarbeiros(apenasAtivos = true): Promise<Barbeiro[]> {
    return this.repoPessoa.listarBarbeiros(apenasAtivos);
  }
}
