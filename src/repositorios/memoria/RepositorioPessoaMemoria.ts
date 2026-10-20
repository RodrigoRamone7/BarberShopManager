import { Barbeiro, Pessoa } from "../../dominio";
import { RepositorioPessoa } from "../contratos";

export class RepositorioPessoaMemoria implements RepositorioPessoa {
  private readonly pessoas = new Map<string, Pessoa>();

  public async salvar(pessoa: Pessoa): Promise<void> {
    this.pessoas.set(pessoa.id, pessoa);
  }

  public async buscarPorId(id: string): Promise<Pessoa | null> {
    return this.pessoas.get(id) ?? null;
  }

  public async buscarBarbeiroPorId(id: string): Promise<Barbeiro | null> {
    const pessoa = this.pessoas.get(id);
    if (pessoa instanceof Barbeiro) {
      return pessoa;
    }
    return null;
  }

  public async listarBarbeiros(apenasAtivos = true): Promise<Barbeiro[]> {
    const barbeiros: Barbeiro[] = [];
    for (const pessoa of this.pessoas.values()) {
      if (pessoa instanceof Barbeiro) {
        if (!apenasAtivos || pessoa.ativo) {
          barbeiros.push(pessoa);
        }
      }
    }
    return barbeiros;
  }
}
