import { Barbeiro, NivelAcesso, Pessoa } from "../../dominio";
import { RepositorioPessoa } from "../contratos";
import { BancoSqlite } from "./BancoSqlite";

interface LinhaPessoa {
  id: string;
  tipo: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  nivel_acesso: string;
  taxa_comissao_padrao: number;
  ativo: number;
  criado_em: string;
}

export class RepositorioPessoaSqlite implements RepositorioPessoa {
  constructor(private readonly banco: BancoSqlite) {}

  private mapearParaBarbeiro(linha: LinhaPessoa): Barbeiro {
    return new Barbeiro({
      id: linha.id,
      nome: linha.nome,
      email: linha.email ?? undefined,
      telefone: linha.telefone ?? undefined,
      nivelAcesso: linha.nivel_acesso as NivelAcesso,
      taxaComissaoPadrao: Number(linha.taxa_comissao_padrao),
      ativo: Boolean(linha.ativo),
      criadoEm: new Date(linha.criado_em),
    });
  }

  public async salvar(pessoa: Pessoa): Promise<void> {
    const taxaComissao =
      pessoa instanceof Barbeiro ? pessoa.taxaComissaoPadrao : 0;

    const stmt = this.banco.db.prepare(`
      INSERT INTO pessoas (
        id, tipo, nome, email, telefone, nivel_acesso, taxa_comissao_padrao, ativo, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nome = excluded.nome,
        email = excluded.email,
        telefone = excluded.telefone,
        nivel_acesso = excluded.nivel_acesso,
        taxa_comissao_padrao = excluded.taxa_comissao_padrao,
        ativo = excluded.ativo
    `);

    stmt.run(
      pessoa.id,
      "BARBEIRO",
      pessoa.nome,
      pessoa.email ?? null,
      pessoa.telefone ?? null,
      pessoa.nivelAcesso,
      taxaComissao,
      pessoa.ativo ? 1 : 0,
      pessoa.criadoEm.toISOString()
    );
  }

  public async buscarPorId(id: string): Promise<Pessoa | null> {
    return this.buscarBarbeiroPorId(id);
  }

  public async buscarBarbeiroPorId(id: string): Promise<Barbeiro | null> {
    const stmt = this.banco.db.prepare(
      `SELECT * FROM pessoas WHERE id = ? LIMIT 1`
    );
    const linha = stmt.get(id) as LinhaPessoa | undefined;
    if (!linha) return null;
    return this.mapearParaBarbeiro(linha);
  }

  public async listarBarbeiros(apenasAtivos = true): Promise<Barbeiro[]> {
    const sql = apenasAtivos
      ? `SELECT * FROM pessoas WHERE tipo = 'BARBEIRO' AND ativo = 1 ORDER BY criado_em ASC`
      : `SELECT * FROM pessoas WHERE tipo = 'BARBEIRO' ORDER BY criado_em ASC`;

    const stmt = this.banco.db.prepare(sql);
    const linhas = stmt.all() as unknown as LinhaPessoa[];
    return linhas.map((l) => this.mapearParaBarbeiro(l));
  }
}
