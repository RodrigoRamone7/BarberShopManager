import { Dinheiro, Servico } from "../../dominio";
import { RepositorioServico } from "../contratos";
import { BancoSqlite } from "./BancoSqlite";

interface LinhaServico {
  id: string;
  nome: string;
  preco: number;
  taxa_comissao_especifica: number | null;
  ativo: number;
}

export class RepositorioServicoSqlite implements RepositorioServico {
  constructor(private readonly banco: BancoSqlite) {}

  private mapearParaServico(linha: LinhaServico): Servico {
    return new Servico({
      id: linha.id,
      nome: linha.nome,
      preco: new Dinheiro(Number(linha.preco)),
      taxaComissaoEspecifica:
        linha.taxa_comissao_especifica !== null
          ? Number(linha.taxa_comissao_especifica)
          : undefined,
      ativo: Boolean(linha.ativo),
    });
  }

  public async salvar(servico: Servico): Promise<void> {
    const stmt = this.banco.db.prepare(`
      INSERT INTO servicos (
        id, nome, preco, taxa_comissao_especifica, ativo
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nome = excluded.nome,
        preco = excluded.preco,
        taxa_comissao_especifica = excluded.taxa_comissao_especifica,
        ativo = excluded.ativo
    `);

    stmt.run(
      servico.id,
      servico.nome,
      servico.preco.valor,
      servico.taxaComissaoEspecifica ?? null,
      servico.ativo ? 1 : 0
    );
  }

  public async buscarPorId(id: string): Promise<Servico | null> {
    const stmt = this.banco.db.prepare(
      `SELECT * FROM servicos WHERE id = ? LIMIT 1`
    );
    const linha = stmt.get(id) as LinhaServico | undefined;
    if (!linha) return null;
    return this.mapearParaServico(linha);
  }

  public async buscarPorIds(ids: string[]): Promise<Servico[]> {
    const encontrados: Servico[] = [];
    for (const id of ids) {
      const servico = await this.buscarPorId(id);
      if (servico) encontrados.push(servico);
    }
    return encontrados;
  }

  public async listar(apenasAtivos = true): Promise<Servico[]> {
    const sql = apenasAtivos
      ? `SELECT * FROM servicos WHERE ativo = 1 ORDER BY rowid ASC`
      : `SELECT * FROM servicos ORDER BY rowid ASC`;

    const stmt = this.banco.db.prepare(sql);
    const linhas = stmt.all() as unknown as LinhaServico[];
    return linhas.map((l) => this.mapearParaServico(l));
  }
}
