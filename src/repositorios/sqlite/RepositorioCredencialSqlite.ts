import { CredencialAcesso } from "../../autenticacao";
import { RepositorioCredencial } from "../contratos";
import { BancoSqlite } from "./BancoSqlite";

interface LinhaCredencial {
  id: string;
  pessoa_id: string;
  login: string;
  senha_hash: string;
  ativo: number;
  ultimo_acesso_em: string | null;
  criado_em: string;
}

export class RepositorioCredencialSqlite implements RepositorioCredencial {
  constructor(private readonly banco: BancoSqlite) {}

  private mapearParaCredencial(linha: LinhaCredencial): CredencialAcesso {
    return new CredencialAcesso({
      id: linha.id,
      pessoaId: linha.pessoa_id,
      login: linha.login,
      senhaHash: linha.senha_hash,
      ativo: Boolean(linha.ativo),
      ultimoAcessoEm: linha.ultimo_acesso_em
        ? new Date(linha.ultimo_acesso_em)
        : undefined,
      criadoEm: new Date(linha.criado_em),
    });
  }

  public async salvar(credencial: CredencialAcesso): Promise<void> {
    const stmt = this.banco.db.prepare(`
      INSERT INTO credenciais (
        id, pessoa_id, login, senha_hash, ativo, ultimo_acesso_em, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        login = excluded.login,
        senha_hash = excluded.senha_hash,
        ativo = excluded.ativo,
        ultimo_acesso_em = excluded.ultimo_acesso_em
    `);

    stmt.run(
      credencial.id,
      credencial.pessoaId,
      credencial.login,
      credencial.senhaHash,
      credencial.ativo ? 1 : 0,
      credencial.ultimoAcessoEm ? credencial.ultimoAcessoEm.toISOString() : null,
      credencial.criadoEm.toISOString()
    );
  }

  public async buscarPorLogin(login: string): Promise<CredencialAcesso | null> {
    const loginNormalizado = login.trim().toLowerCase();
    const stmt = this.banco.db.prepare(
      `SELECT * FROM credenciais WHERE login = ? LIMIT 1`
    );
    const linha = stmt.get(loginNormalizado) as LinhaCredencial | undefined;
    if (!linha) return null;
    return this.mapearParaCredencial(linha);
  }

  public async buscarPorPessoaId(
    pessoaId: string
  ): Promise<CredencialAcesso | null> {
    const stmt = this.banco.db.prepare(
      `SELECT * FROM credenciais WHERE pessoa_id = ? LIMIT 1`
    );
    const linha = stmt.get(pessoaId) as LinhaCredencial | undefined;
    if (!linha) return null;
    return this.mapearParaCredencial(linha);
  }
}
