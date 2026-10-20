import { CredencialAcesso } from "../../autenticacao";
import { RepositorioCredencial } from "../contratos";

export class RepositorioCredencialMemoria implements RepositorioCredencial {
  private readonly credenciais = new Map<string, CredencialAcesso>();

  public async salvar(credencial: CredencialAcesso): Promise<void> {
    this.credenciais.set(credencial.id, credencial);
  }

  public async buscarPorLogin(login: string): Promise<CredencialAcesso | null> {
    const loginNormalizado = login.trim().toLowerCase();
    for (const credencial of this.credenciais.values()) {
      if (credencial.login === loginNormalizado) {
        return credencial;
      }
    }
    return null;
  }

  public async buscarPorPessoaId(pessoaId: string): Promise<CredencialAcesso | null> {
    for (const credencial of this.credenciais.values()) {
      if (credencial.pessoaId === pessoaId) {
        return credencial;
      }
    }
    return null;
  }
}
