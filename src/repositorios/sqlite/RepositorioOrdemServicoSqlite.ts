import {
  Dinheiro,
  ItemOrdemServico,
  MetodoPagamento,
  OrdemServico,
} from "../../dominio";
import { FiltroOrdemServico, RepositorioOrdemServico } from "../contratos";
import { BancoSqlite } from "./BancoSqlite";

interface LinhaOrdem {
  id: string;
  barbeiro_id: string;
  metodo_pagamento: string;
  realizado_em: string;
  observacoes: string | null;
}

interface LinhaItemOrdem {
  id: number;
  ordem_id: string;
  servico_id: string;
  nome_servico_historico: string;
  valor_cobrado: number;
  taxa_comissao_aplicada: number;
}

export class RepositorioOrdemServicoSqlite implements RepositorioOrdemServico {
  constructor(private readonly banco: BancoSqlite) {}

  private carregarItensDaOrdem(ordemId: string): ItemOrdemServico[] {
    const stmt = this.banco.db.prepare(
      `SELECT * FROM itens_ordem_servico WHERE ordem_id = ? ORDER BY id ASC`
    );
    const linhas = stmt.all(ordemId) as unknown as LinhaItemOrdem[];
    return linhas.map((item) =>
      ItemOrdemServico.reconstituir({
        servicoId: item.servico_id,
        nomeServicoHistorico: item.nome_servico_historico,
        valorCobrado: new Dinheiro(Number(item.valor_cobrado)),
        taxaComissaoAplicada: Number(item.taxa_comissao_aplicada),
      })
    );
  }

  private mapearParaOrdem(linha: LinhaOrdem): OrdemServico {
    const itens = this.carregarItensDaOrdem(linha.id);
    return OrdemServico.reconstituir({
      id: linha.id,
      barbeiroId: linha.barbeiro_id,
      itens,
      metodoPagamento: linha.metodo_pagamento as MetodoPagamento,
      realizadoEm: new Date(linha.realizado_em),
      observacoes: linha.observacoes ?? undefined,
    });
  }

  public async salvar(ordem: OrdemServico): Promise<void> {
    this.banco.db.exec("BEGIN TRANSACTION;");
    try {
      const stmtOrdem = this.banco.db.prepare(`
        INSERT INTO ordens_servico (
          id, barbeiro_id, metodo_pagamento, realizado_em, observacoes
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          barbeiro_id = excluded.barbeiro_id,
          metodo_pagamento = excluded.metodo_pagamento,
          realizado_em = excluded.realizado_em,
          observacoes = excluded.observacoes
      `);

      stmtOrdem.run(
        ordem.id,
        ordem.barbeiroId,
        ordem.metodoPagamento,
        ordem.realizadoEm.toISOString(),
        ordem.observacoes ?? null
      );

      const stmtLimparItens = this.banco.db.prepare(
        `DELETE FROM itens_ordem_servico WHERE ordem_id = ?`
      );
      stmtLimparItens.run(ordem.id);

      const stmtItem = this.banco.db.prepare(`
        INSERT INTO itens_ordem_servico (
          ordem_id, servico_id, nome_servico_historico, valor_cobrado, taxa_comissao_aplicada
        ) VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of ordem.itens) {
        stmtItem.run(
          ordem.id,
          item.servicoId,
          item.nomeServicoHistorico,
          item.valorCobrado.valor,
          item.taxaComissaoAplicada
        );
      }

      this.banco.db.exec("COMMIT;");
    } catch (erro) {
      this.banco.db.exec("ROLLBACK;");
      throw erro;
    }
  }

  public async buscarPorId(id: string): Promise<OrdemServico | null> {
    const stmt = this.banco.db.prepare(
      `SELECT * FROM ordens_servico WHERE id = ? LIMIT 1`
    );
    const linha = stmt.get(id) as LinhaOrdem | undefined;
    if (!linha) return null;
    return this.mapearParaOrdem(linha);
  }

  public async listar(filtro?: FiltroOrdemServico): Promise<OrdemServico[]> {
    const condicoes: string[] = [];
    const parametros: Array<string | number> = [];

    if (filtro?.barbeiroId) {
      condicoes.push("barbeiro_id = ?");
      parametros.push(filtro.barbeiroId);
    }

    if (filtro?.inicioPeriodo) {
      condicoes.push("realizado_em >= ?");
      parametros.push(filtro.inicioPeriodo.toISOString());
    }

    if (filtro?.fimPeriodo) {
      condicoes.push("realizado_em <= ?");
      parametros.push(filtro.fimPeriodo.toISOString());
    }

    const clausulaWhere =
      condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";

    const sql = `SELECT * FROM ordens_servico ${clausulaWhere} ORDER BY realizado_em ASC`;
    const stmt = this.banco.db.prepare(sql);
    const linhas = stmt.all(...parametros) as unknown as LinhaOrdem[];

    return linhas.map((l) => this.mapearParaOrdem(l));
  }
}
