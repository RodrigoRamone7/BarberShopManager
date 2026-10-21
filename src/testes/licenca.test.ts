import assert from "node:assert/strict";
import { Server } from "node:http";
import { describe, it } from "node:test";
import { GerenciadorLicenca } from "../licenca";
import { BancoSqlite } from "../repositorios";
import { criarAplicacaoWeb } from "../web";

describe("Licenciamento Comercial - Demonstração de 30 Dias e Ativação Definitiva", () => {
  it("deve iniciar como DEMO de 30 dias, bloquear escritas após 30 dias e destravar ao ativar Chave Definitiva mantendo o banco", () => {
    const banco = new BancoSqlite(":memory:");
    const licenca = new GerenciadorLicenca(banco, 30);

    const diaInstalacao = new Date("2026-10-01T10:00:00Z");
    const statusInicial = licenca.obterStatus(diaInstalacao);

    assert.equal(statusInicial.tipo, "DEMO");
    assert.equal(statusInicial.ativaParaEscrita, true);
    assert.equal(statusInicial.diasRestantesDemo, 30);

    // No dia 15 ainda está ativa
    const dia15 = new Date("2026-10-16T10:00:00Z");
    const statusDia15 = licenca.obterStatus(dia15);
    assert.equal(statusDia15.ativaParaEscrita, true);
    assert.equal(statusDia15.diasRestantesDemo, 15);

    // Se tentarem voltar o relógio do computador para 2026-10-05, detecta adulteração
    const relogioVoltou = new Date("2026-10-05T10:00:00Z");
    const statusRelogioAdulterado = licenca.obterStatus(relogioVoltou);
    assert.equal(statusRelogioAdulterado.relogioAdulterado, true);
    assert.equal(statusRelogioAdulterado.ativaParaEscrita, false);

    // Após 31 dias (2026-11-01), entra em Modo Somente Leitura (DEMO Expirada)
    const dia31 = new Date("2026-11-01T12:00:00Z");
    const statusExpirado = licenca.obterStatus(dia31);
    assert.equal(statusExpirado.expirada, true);
    assert.equal(statusExpirado.modoSomenteLeitura, true);
    assert.equal(statusExpirado.ativaParaEscrita, false);
    assert.equal(statusExpirado.diasRestantesDemo, 0);

    assert.throws(
      () => licenca.exigirPermissaoEscrita(dia31),
      /Período de demonstração de 30 dias encerrado/
    );

    // Cliente compra a versão paga e recebe a Chave de Ativação Definitiva
    const chave =
      GerenciadorLicenca.gerarChaveAtivacaoDefinitiva("Barbearia Navalha de Ouro");

    const statusDefinitivo = licenca.ativarLicencaDefinitiva(chave, dia31);
    assert.equal(statusDefinitivo.tipo, "DEFINITIVA");
    assert.equal(statusDefinitivo.ativaParaEscrita, true);
    assert.equal(statusDefinitivo.modoSomenteLeitura, false);
    assert.equal(statusDefinitivo.licenciadoPara, "Barbearia Navalha de Ouro");

    // Não lança mais erro ao escrever
    licenca.exigirPermissaoEscrita(dia31);

    banco.fechar();
  });

  it("deve permitir consulta do fechamento em Modo Somente Leitura quando a DEMO vencer, bloqueando novos lançamentos até ativar via API", async () => {
    // Criamos a aplicação com diasDemo = -1 (já expirada) mas com os dados iniciais já no SQLite
    const { app, bancoSqlite } = await criarAplicacaoWeb({
      popularSeed: true,
      caminhoSqlite: ":memory:",
      diasDemo: -1,
    });

    let servidor!: Server;
    const urlBase = await new Promise<string>((resolve) => {
      servidor = app.listen(0, () => {
        const addr = servidor.address();
        const porta = typeof addr === "object" && addr ? addr.port : 0;
        resolve(`http://127.0.0.1:${porta}`);
      });
    });

    try {
      // 1. Login funciona normalmente mesmo com a DEMO vencida
      const resLogin = await fetch(`${urlBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: "admin@barbearia.com",
          senha: "admin123",
        }),
      });
      assert.equal(resLogin.status, 200);
      const { token } = (await resLogin.json()) as { token: string };

      // 2. Consulta do Fechamento Mensal (GET) continua funcionando (dados de 30 dias preservados!)
      const resFechamento = await fetch(`${urlBase}/api/fechamento/geral`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(resFechamento.status, 200);
      const fechamento = (await resFechamento.json()) as {
        totalOrdens: number;
      };
      assert.equal(fechamento.totalOrdens, 3);

      // 3. Tentativa de lançar nova Ordem de Serviço (POST) é bloqueada com 403 (Modo Somente Leitura)
      const resServicos = await fetch(`${urlBase}/api/servicos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const servicos = (await resServicos.json()) as Array<{ id: string }>;

      const resOrdemBloqueada = await fetch(`${urlBase}/api/ordens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itens: [{ servicoId: servicos[0].id }],
          metodoPagamento: "PIX",
        }),
      });
      assert.equal(resOrdemBloqueada.status, 403);

      // 4. Ativa a Chave Definitiva via POST /api/sistema/licenca/ativar
      const chaveValida =
        GerenciadorLicenca.gerarChaveAtivacaoDefinitiva("Barbearia do Cliente");

      const resAtivacao = await fetch(`${urlBase}/api/sistema/licenca/ativar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chaveAtivacao: chaveValida }),
      });
      assert.equal(resAtivacao.status, 200);

      // 5. Agora o lançamento de nova Ordem de Serviço funciona normalmente somando aos dados antigos!
      const resOrdemLiberada = await fetch(`${urlBase}/api/ordens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itens: [{ servicoId: servicos[0].id }],
          metodoPagamento: "PIX",
        }),
      });
      assert.equal(resOrdemLiberada.status, 201);
    } finally {
      await new Promise<void>((resolve) => servidor.close(() => resolve()));
      bancoSqlite?.fechar();
    }
  });
});
