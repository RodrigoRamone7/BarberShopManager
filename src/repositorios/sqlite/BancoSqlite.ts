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

      CREATE INDEX IF NOT EXISTS idx_ordens_barbeiro_data
        ON ordens_servico (barbeiro_id, realizado_em);
    `);
  }

  public fechar(): void {
    this.db.close();
  }
}
