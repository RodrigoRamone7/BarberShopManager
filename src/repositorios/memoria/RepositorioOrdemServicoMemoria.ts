import { OrdemServico } from "../../dominio";
import { FiltroOrdemServico, RepositorioOrdemServico } from "../contratos";

export class RepositorioOrdemServicoMemoria implements RepositorioOrdemServico {
  private readonly ordens = new Map<string, OrdemServico>();

  public async salvar(ordem: OrdemServico): Promise<void> {
    this.ordens.set(ordem.id, ordem);
  }

  public async buscarPorId(id: string): Promise<OrdemServico | null> {
    return this.ordens.get(id) ?? null;
  }

  public async listar(filtro?: FiltroOrdemServico): Promise<OrdemServico[]> {
    let resultado = Array.from(this.ordens.values());

    if (!filtro?.incluirExcluidas) {
      resultado = resultado.filter((ordem) => !ordem.excluida);
    }

    if (filtro?.barbeiroId) {
      resultado = resultado.filter(
        (ordem) => ordem.barbeiroId === filtro.barbeiroId
      );
    }

    if (filtro?.inicioPeriodo) {
      resultado = resultado.filter(
        (ordem) => ordem.realizadoEm >= filtro.inicioPeriodo!
      );
    }

    if (filtro?.fimPeriodo) {
      resultado = resultado.filter(
        (ordem) => ordem.realizadoEm <= filtro.fimPeriodo!
      );
    }

    return resultado.sort(
      (a, b) => a.realizadoEm.getTime() - b.realizadoEm.getTime()
    );
  }
}
