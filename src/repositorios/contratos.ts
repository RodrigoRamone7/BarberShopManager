import { CredencialAcesso } from "../autenticacao";
import { Barbeiro, OrdemServico, Pessoa, Servico } from "../dominio";

export interface RepositorioPessoa {
  salvar(pessoa: Pessoa): Promise<void>;
  buscarPorId(id: string): Promise<Pessoa | null>;
  buscarBarbeiroPorId(id: string): Promise<Barbeiro | null>;
  listarBarbeiros(apenasAtivos?: boolean): Promise<Barbeiro[]>;
}

export interface RepositorioCredencial {
  salvar(credencial: CredencialAcesso): Promise<void>;
  buscarPorLogin(login: string): Promise<CredencialAcesso | null>;
  buscarPorPessoaId(pessoaId: string): Promise<CredencialAcesso | null>;
}

export interface RepositorioServico {
  salvar(servico: Servico): Promise<void>;
  buscarPorId(id: string): Promise<Servico | null>;
  buscarPorIds(ids: string[]): Promise<Servico[]>;
  listar(apenasAtivos?: boolean): Promise<Servico[]>;
}

export interface FiltroOrdemServico {
  barbeiroId?: string;
  inicioPeriodo?: Date;
  fimPeriodo?: Date;
}

export interface RepositorioOrdemServico {
  salvar(ordem: OrdemServico): Promise<void>;
  buscarPorId(id: string): Promise<OrdemServico | null>;
  listar(filtro?: FiltroOrdemServico): Promise<OrdemServico[]>;
}
