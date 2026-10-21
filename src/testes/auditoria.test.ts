import assert from "node:assert/strict";
import { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { criarAplicacaoWeb } from "../web";

describe("Auditoria Anti-Fraude - Edição e Exclusão Lógica de Ordens de Serviço", () => {
  let servidor: Server;
  let fecharBanco: (() => void) | undefined;
  let urlBase: string;
  let tokenAdmin: string;
  let tokenGestor: string;
  let tokenCarlos: string;

  before(async () => {
    const { app, bancoSqlite } = await criarAplicacaoWeb({
      popularSeed: true,
      caminhoSqlite: ":memory:",
    });
    fecharBanco = () => bancoSqlite?.fechar();

    await new Promise<void>((resolve) => {
      servidor = app.listen(0, () => {
        const addr = servidor.address();
        const porta = typeof addr === "object" && addr ? addr.port : 0;
        urlBase = `http://127.0.0.1:${porta}`;
        resolve();
      });
    });

    // Login Admin
    const resAdmin = await fetch(`${urlBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "admin@barbearia.com",
        senha: "admin123",
      }),
    });
    tokenAdmin = ((await resAdmin.json()) as { token: string }).token;

    // Admin cadastra um Gestor ("Marcos Gestor")
    await fetch(`${urlBase}/api/barbeiros`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        nome: "Marcos Gestor",
        taxaComissaoPadrao: 50,
        login: "gestor@barbearia.com",
        senhaInicial: "gestor123",
        nivelAcesso: "GESTOR",
      }),
    });

    // Login Gestor
    const resGestor = await fetch(`${urlBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "gestor@barbearia.com",
        senha: "gestor123",
      }),
    });
    tokenGestor = ((await resGestor.json()) as { token: string }).token;

    // Login Barbeiro Operador (Carlos)
    const resCarlos = await fetch(`${urlBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "carlos@barbearia.com",
        senha: "carlos123",
      }),
    });
    tokenCarlos = ((await resCarlos.json()) as { token: string }).token;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      servidor.close((err) => (err ? reject(err) : resolve()));
    });
    fecharBanco?.();
  });

  it("deve bloquear OPERADOR de editar ou excluir ordens, permitir GESTOR editar/excluir logicamente e restringir a visualização da auditoria exclusivamente ao ADMINISTRADOR", async () => {
    // 1. Busca catálogo de serviços
    const resServicos = await fetch(`${urlBase}/api/servicos`, {
      headers: { Authorization: `Bearer ${tokenCarlos}` },
    });
    const servicos = (await resServicos.json()) as Array<{
      id: string;
      nome: string;
      preco: number;
    }>;
    const corte = servicos[0]; // R$ 45
    const barba = servicos[1]; // R$ 35

    // 2. Barbeiro Carlos lança 2 ordens de serviço (uma para ser editada e outra para ser excluída)
    const resOrdemParaEditar = await fetch(`${urlBase}/api/ordens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCarlos}`,
      },
      body: JSON.stringify({
        itens: [{ servicoId: corte.id }, { servicoId: barba.id }],
        metodoPagamento: "CARTAO_CREDITO",
        observacoes: "Lançamento com barba errada",
      }),
    });
    const ordemParaEditar = (await resOrdemParaEditar.json()) as { id: string };

    const resOrdemParaExcluir = await fetch(`${urlBase}/api/ordens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCarlos}`,
      },
      body: JSON.stringify({
        itens: [{ servicoId: corte.id }],
        metodoPagamento: "PIX",
        observacoes: "Ordem duplicada",
      }),
    });
    const ordemParaExcluir = (await resOrdemParaExcluir.json()) as {
      id: string;
    };

    // 3. OPERADOR tenta excluir a própria ordem -> bloqueado (403)
    const resTentativaOperador = await fetch(
      `${urlBase}/api/ordens/${ordemParaExcluir.id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCarlos}`,
        },
        body: JSON.stringify({ motivo: "Quero apagar" }),
      }
    );
    assert.equal(resTentativaOperador.status, 403);

    // 4. GESTOR edita a primeira ordem (removendo a barba) e informando o motivo
    const resEdicaoGestor = await fetch(
      `${urlBase}/api/ordens/${ordemParaEditar.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenGestor}`,
        },
        body: JSON.stringify({
          itens: [{ servicoId: corte.id }],
          metodoPagamento: "PIX",
          observacoes: "Corrigido apenas para corte",
          motivo: "Cliente fez apenas corte, barba foi desmarcada",
        }),
      }
    );
    assert.equal(resEdicaoGestor.status, 200);

    // 5. GESTOR exclui logicamente a segunda ordem
    const resExclusaoGestor = await fetch(
      `${urlBase}/api/ordens/${ordemParaExcluir.id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenGestor}`,
        },
        body: JSON.stringify({
          motivo: "Barbeiro lançou duas vezes o mesmo atendimento",
        }),
      }
    );
    assert.equal(resExclusaoGestor.status, 200);

    // 6. Verifica que o barbeiro Carlos NÃO vê mais a ordem excluída no seu extrato
    const resExtratoCarlos = await fetch(`${urlBase}/api/fechamento/extrato`, {
      headers: { Authorization: `Bearer ${tokenCarlos}` },
    });
    const extratoCarlos = (await resExtratoCarlos.json()) as {
      ordens: Array<{ id: string }>;
    };
    assert.equal(
      extratoCarlos.ordens.some((o) => o.id === ordemParaExcluir.id),
      false
    );

    // 7. GESTOR tenta acessar a rota de auditoria (/api/ordens/auditoria) -> BLOQUEADO (403)!
    const resAuditoriaGestor = await fetch(`${urlBase}/api/ordens/auditoria`, {
      headers: { Authorization: `Bearer ${tokenGestor}` },
    });
    assert.equal(resAuditoriaGestor.status, 403);

    // 8. ADMINISTRADOR acessa /api/ordens/auditoria e vê quem apagou, quem editou, motivos e valores antes/depois!
    const resAuditoriaAdmin = await fetch(`${urlBase}/api/ordens/auditoria`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(resAuditoriaAdmin.status, 200);

    const auditadas = (await resAuditoriaAdmin.json()) as Array<{
      id: string;
      excluida: boolean;
      excluidaPorNome: string | null;
      motivoExclusao: string | null;
      historicoAuditoria: Array<{
        acao: string;
        realizadoPorNome: string;
        realizadoPorNivel: string;
        motivo: string;
        resumoAnterior: string;
        resumoNovo: string | null;
      }>;
    }>;

    const regExcluida = auditadas.find((o) => o.id === ordemParaExcluir.id);
    assert.ok(regExcluida);
    assert.equal(regExcluida.excluida, true);
    assert.equal(regExcluida.excluidaPorNome, "Marcos Gestor");
    assert.equal(
      regExcluida.motivoExclusao,
      "Barbeiro lançou duas vezes o mesmo atendimento"
    );

    const regEditada = auditadas.find((o) => o.id === ordemParaEditar.id);
    assert.ok(regEditada);
    assert.equal(regEditada.excluida, false);
    assert.equal(regEditada.historicoAuditoria.length, 1);
    assert.equal(regEditada.historicoAuditoria[0].acao, "EDICAO");
    assert.equal(
      regEditada.historicoAuditoria[0].realizadoPorNome,
      "Marcos Gestor"
    );
    assert.equal(regEditada.historicoAuditoria[0].realizadoPorNivel, "GESTOR");
    assert.ok(
      regEditada.historicoAuditoria[0].resumoAnterior.includes(
        "Barba Completa"
      )
    );
    assert.ok(regEditada.historicoAuditoria[0].resumoNovo);
  });
});
