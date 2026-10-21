import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  Barbeiro,
  Dinheiro,
  ExtratoBarbeiro,
  MetodoPagamento,
  NivelAcesso,
  OrdemServico,
  Servico,
} from "../dominio";
import {
  BancoSqlite,
  RepositorioCredencialSqlite,
  RepositorioOrdemServicoSqlite,
  RepositorioPessoaSqlite,
  RepositorioServicoSqlite,
} from "../repositorios";
import { GerenciadorToken, ServicoAutenticacao } from "../autenticacao";

describe("Persistência SQLite Local", () => {
  it("deve persistir barbeiros, credenciais, serviços e ordens em disco e manter os dados após fechar e reabrir o banco", async () => {
    const pastaTemp = fs.mkdtempSync(
      path.join(os.tmpdir(), "barbershop-sqlite-test-")
    );
    const arquivoSqlite = path.join(pastaTemp, "teste-barbearia.sqlite");

    try {
      // 1ª Conexão: Salva dados no arquivo SQLite
      const banco1 = new BancoSqlite(arquivoSqlite);
      const repoPessoa1 = new RepositorioPessoaSqlite(banco1);
      const repoCred1 = new RepositorioCredencialSqlite(banco1);
      const repoServ1 = new RepositorioServicoSqlite(banco1);
      const repoOrdem1 = new RepositorioOrdemServicoSqlite(banco1);

      const servicoAuth = new ServicoAutenticacao(
        new GerenciadorToken("segredo-sqlite-teste-123456")
      );

      const barbeiro = new Barbeiro({
        id: "barb-sql-1",
        nome: "Carlos SQLite",
        taxaComissaoPadrao: 50,
        nivelAcesso: NivelAcesso.OPERADOR,
      });

      const credencial = servicoAuth.criarCredencial({
        id: "cred-sql-1",
        pessoa: barbeiro,
        login: "carlos@sqlite.com",
        senhaPura: "senha123",
      });

      const corte = new Servico({
        id: "serv-sql-1",
        nome: "Corte Degradê",
        preco: new Dinheiro(50),
      });

      const barba = new Servico({
        id: "serv-sql-2",
        nome: "Barba",
        preco: new Dinheiro(30),
        taxaComissaoEspecifica: 60,
      });

      await repoPessoa1.salvar(barbeiro);
      await repoCred1.salvar(credencial);
      await repoServ1.salvar(corte);
      await repoServ1.salvar(barba);

      const ordem = new OrdemServico({
        id: "os-sql-1",
        barbeiro,
        servicos: [{ servico: corte }, { servico: barba }],
        metodoPagamento: MetodoPagamento.PIX,
        realizadoEm: new Date("2026-10-20T14:00:00Z"),
        observacoes: "Persistido no SQLite",
      });

      await repoOrdem1.salvar(ordem);

      // Altera o preço do serviço e inativa o serviço DEPOIS da ordem lançada
      corte.preco = new Dinheiro(90);
      corte.ativo = false;
      await repoServ1.salvar(corte);

      // Fecha a 1ª conexão (simulando desligamento da máquina da barbearia)
      banco1.fechar();

      // 2ª Conexão: Reabre o mesmo arquivo SQLite do disco
      const banco2 = new BancoSqlite(arquivoSqlite);
      const repoPessoa2 = new RepositorioPessoaSqlite(banco2);
      const repoCred2 = new RepositorioCredencialSqlite(banco2);
      const repoOrdem2 = new RepositorioOrdemServicoSqlite(banco2);

      const barbeiroRecuperado =
        await repoPessoa2.buscarBarbeiroPorId("barb-sql-1");
      assert.ok(barbeiroRecuperado);
      assert.equal(barbeiroRecuperado.nome, "Carlos SQLite");
      assert.equal(barbeiroRecuperado.taxaComissaoPadrao, 50);

      const credRecuperada =
        await repoCred2.buscarPorLogin("carlos@sqlite.com");
      assert.ok(credRecuperada);
      assert.equal(credRecuperada.pessoaId, "barb-sql-1");

      // Recupera ordens mesmo com o serviço original tendo sido inativado e reajustado
      const ordensRecuperadas = await repoOrdem2.listar({
        barbeiroId: "barb-sql-1",
      });
      assert.equal(ordensRecuperadas.length, 1);

      const extrato = new ExtratoBarbeiro({
        barbeiro: barbeiroRecuperado,
        inicioPeriodo: new Date("2026-10-01T00:00:00Z"),
        fimPeriodo: new Date("2026-10-31T23:59:59Z"),
        ordens: ordensRecuperadas,
      });

      // Bruto: 50 (Corte) + 30 (Barba) = 80
      // Comissão: 25 (50% de 50) + 18 (60% de 30) = 43
      assert.equal(extrato.faturamentoBruto.valor, 80.0);
      assert.equal(extrato.totalComissaoBarbeiro.valor, 43.0);
      assert.equal(extrato.totalBarbearia.valor, 37.0);

      banco2.fechar();
    } finally {
      fs.rmSync(pastaTemp, { recursive: true, force: true });
    }
  });
});
