import assert from "node:assert/strict";
import { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { criarAplicacaoWeb } from "../web";

describe("Camada Web - API REST e Controle de Acesso HTTP", () => {
  let servidor: Server;
  let fecharBanco: (() => void) | undefined;
  let urlBase: string;
  let tokenAdmin: string;
  let tokenCarlos: string;

  before(async () => {
    const { app, bancoSqlite } = await criarAplicacaoWeb({
      popularSeed: true,
      caminhoSqlite: ":memory:",
    });
    fecharBanco = () => bancoSqlite?.fechar();
    await new Promise<void>((resolve) => {
      servidor = app.listen(0, () => {
        const endereco = servidor.address();
        const porta =
          typeof endereco === "object" && endereco ? endereco.port : 0;
        urlBase = `http://127.0.0.1:${porta}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      servidor.close((err) => (err ? reject(err) : resolve()));
    });
    fecharBanco?.();
  });

  it("deve realizar login via POST /api/auth/login para Admin e Operador", async () => {
    const resAdmin = await fetch(`${urlBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "admin@barbearia.com",
        senha: "admin123",
      }),
    });

    assert.equal(resAdmin.status, 200);
    const dadosAdmin = (await resAdmin.json()) as {
      token: string;
      usuario: { nivelAcesso: string };
    };
    assert.ok(dadosAdmin.token);
    assert.equal(dadosAdmin.usuario.nivelAcesso, "ADMINISTRADOR");
    tokenAdmin = dadosAdmin.token;

    const resCarlos = await fetch(`${urlBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "carlos@barbearia.com",
        senha: "carlos123",
      }),
    });

    assert.equal(resCarlos.status, 200);
    const dadosCarlos = (await resCarlos.json()) as {
      token: string;
      usuario: { nivelAcesso: string };
    };
    assert.equal(dadosCarlos.usuario.nivelAcesso, "OPERADOR");
    tokenCarlos = dadosCarlos.token;
  });

  it("deve listar catálogo de serviços e lançar nova ordem de serviço pelo barbeiro", async () => {
    const resServicos = await fetch(`${urlBase}/api/servicos`, {
      headers: { Authorization: `Bearer ${tokenCarlos}` },
    });
    assert.equal(resServicos.status, 200);
    const servicos = (await resServicos.json()) as Array<{ id: string }>;
    assert.ok(servicos.length >= 2);

    const resNovaOrdem = await fetch(`${urlBase}/api/ordens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCarlos}`,
      },
      body: JSON.stringify({
        itens: [{ servicoId: servicos[0].id }, { servicoId: servicos[1].id }],
        metodoPagamento: "PIX",
        observacoes: "Teste automatizado via API",
      }),
    });

    assert.equal(resNovaOrdem.status, 201);
    const ordemCriada = (await resNovaOrdem.json()) as {
      valorTotal: number;
      valorTotalComissaoBarbeiro: number;
    };
    assert.equal(ordemCriada.valorTotal, 80);
    assert.equal(ordemCriada.valorTotalComissaoBarbeiro, 40);
  });

  it("deve retornar 403 quando um OPERADOR tenta acessar o fechamento geral da barbearia", async () => {
    const resProibido = await fetch(`${urlBase}/api/fechamento/geral`, {
      headers: { Authorization: `Bearer ${tokenCarlos}` },
    });
    assert.equal(resProibido.status, 403);
  });

  it("deve retornar o fechamento mensal geral para o ADMINISTRADOR", async () => {
    const resGeral = await fetch(`${urlBase}/api/fechamento/geral`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(resGeral.status, 200);
    const fechamento = (await resGeral.json()) as {
      totalOrdens: number;
      faturamentoBrutoTotal: number;
      totalComissoesPagar: number;
      extratosPorBarbeiro: Array<{ nomeBarbeiro: string }>;
    };
    assert.ok(fechamento.totalOrdens >= 4);
    assert.ok(fechamento.faturamentoBrutoTotal > 0);
    assert.ok(fechamento.totalComissoesPagar > 0);
    assert.ok(fechamento.extratosPorBarbeiro.length >= 3);
  });

  it("deve permitir ao ADMINISTRADOR editar nome, comissão e dados do barbeiro via PATCH /api/barbeiros/:id", async () => {
    const resLista = await fetch(`${urlBase}/api/barbeiros?todos=true`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(resLista.status, 200);
    const barbeiros = (await resLista.json()) as Array<{
      id: string;
      nome: string;
      taxaComissaoPadrao: number;
    }>;

    const carlos = barbeiros.find((b) => b.nome.includes("Carlos"));
    assert.ok(carlos);

    // Operador não pode editar barbeiro
    const resBloqueado = await fetch(`${urlBase}/api/barbeiros/${carlos.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCarlos}`,
      },
      body: JSON.stringify({
        nome: "Tentativa Indevida",
        taxaComissaoPadrao: 90,
      }),
    });
    assert.equal(resBloqueado.status, 403);

    // Administrador edita nome, comissão e telefone com sucesso
    const resEdicao = await fetch(`${urlBase}/api/barbeiros/${carlos.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        nome: "Carlos Silva Jr.",
        taxaComissaoPadrao: 55,
        telefone: "(11) 98888-9999",
      }),
    });

    assert.equal(resEdicao.status, 200);
    const atualizado = (await resEdicao.json()) as {
      nome: string;
      taxaComissaoPadrao: number;
      telefone: string;
    };
    assert.equal(atualizado.nome, "Carlos Silva Jr.");
    assert.equal(atualizado.taxaComissaoPadrao, 55);
    assert.equal(atualizado.telefone, "(11) 98888-9999");
  });
});
