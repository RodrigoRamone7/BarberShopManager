import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

export class BancoSqlite {
  public readonly db: DatabaseSync;
  public readonly caminhoArquivo: string;

  constructor(caminhoArquivo?: string) {
    const caminhoFinal =
      caminhoArquivo ??
      process.env.SQLITE_PATH ??
      path.resolve(process.cwd(), "dados", "barbearia.sqlite");

    if (caminhoFinal !== ":memory:") {
      const pasta = path.dirname(caminhoFinal);
      if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
      }
    }

    this.caminhoArquivo = caminhoFinal;
    this.db = new DatabaseSync(caminhoFinal);
    this.inicializarEstrutura();
  }

  private inicializarEstrutura(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS pessoas (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL DEFAULT 'BARBEIRO',
        nome TEXT NOT NULL,
        email TEXT,
        telefone TEXT,
        nivel_acesso TEXT NOT NULL,
        taxa_comissao_padrao REAL NOT NULL DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS credenciais (
        id TEXT PRIMARY KEY,
        pessoa_id TEXT NOT NULL UNIQUE,
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1,
        ultimo_acesso_em TEXT,
        criado_em TEXT NOT NULL,
        FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS servicos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        taxa_comissao_especifica REAL,
        ativo INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS ordens_servico (
        id TEXT PRIMARY KEY,
        barbeiro_id TEXT NOT NULL,
        metodo_pagamento TEXT NOT NULL,
        realizado_em TEXT NOT NULL,
        observacoes TEXT,
        excluida INTEGER NOT NULL DEFAULT 0,
        excluida_em TEXT,
        excluida_por_id TEXT,
        excluida_por_nome TEXT,
        motivo_exclusao TEXT,
        FOREIGN KEY (barbeiro_id) REFERENCES pessoas(id)
      );

      CREATE TABLE IF NOT EXISTS itens_ordem_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id TEXT NOT NULL,
        servico_id TEXT NOT NULL,
        nome_servico_historico TEXT NOT NULL,
        valor_cobrado REAL NOT NULL,
        taxa_comissao_aplicada REAL NOT NULL,
        FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS auditoria_ordens_servico (
        id TEXT PRIMARY KEY,
        ordem_id TEXT NOT NULL,
        acao TEXT NOT NULL,
        realizado_por_id TEXT NOT NULL,
        realizado_por_nome TEXT NOT NULL,
        realizado_por_nivel TEXT NOT NULL,
        realizado_em TEXT NOT NULL,
        motivo TEXT NOT NULL,
        resumo_anterior TEXT NOT NULL,
        resumo_novo TEXT,
        FOREIGN KEY (ordem_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ordens_barbeiro_data
        ON ordens_servico (barbeiro_id, realizado_em);

      CREATE TABLE IF NOT EXISTS licenca_sistema (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        instalado_em TEXT NOT NULL,
        expira_demo_em TEXT NOT NULL,
        ultimo_relogio_visto TEXT NOT NULL,
        tipo_licenca TEXT NOT NULL DEFAULT 'DEMO',
        licenciado_para TEXT,
        chave_ativacao TEXT,
        ativado_em TEXT,
        assinatura_integridade TEXT NOT NULL
      );
    `);

    // Migração segura caso o arquivo SQLite já existisse antes das colunas de exclusão lógica
    const colunasNovas = [
      "excluida INTEGER NOT NULL DEFAULT 0",
      "excluida_em TEXT",
      "excluida_por_id TEXT",
      "excluida_por_nome TEXT",
      "motivo_exclusao TEXT",
    ];
    for (const defColuna of colunasNovas) {
      try {
        this.db.exec(`ALTER TABLE ordens_servico ADD COLUMN ${defColuna};`);
      } catch {
        // Coluna já existe
      }
    }
  }

  public fechar(): void {
    this.db.close();
  }
}
