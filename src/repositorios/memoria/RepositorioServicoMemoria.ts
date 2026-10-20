import { Servico } from "../../dominio";
import { RepositorioServico } from "../contratos";

export class RepositorioServicoMemoria implements RepositorioServico {
  private readonly servicos = new Map<string, Servico>();

  public async salvar(servico: Servico): Promise<void> {
    this.servicos.set(servico.id, servico);
  }

  public async buscarPorId(id: string): Promise<Servico | null> {
    return this.servicos.get(id) ?? null;
  }

  public async buscarPorIds(ids: string[]): Promise<Servico[]> {
    const encontrados: Servico[] = [];
    for (const id of ids) {
      const servico = this.servicos.get(id);
      if (servico) {
        encontrados.push(servico);
      }
    }
    return encontrados;
  }

  public async listar(apenasAtivos = true): Promise<Servico[]> {
    const lista = Array.from(this.servicos.values());
    if (apenasAtivos) {
      return lista.filter((servico) => servico.ativo);
    }
    return lista;
  }
}
