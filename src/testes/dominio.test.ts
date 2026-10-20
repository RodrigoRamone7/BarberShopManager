import assert from "node:assert/strict";
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

describe("Domínio - Dinheiro (Value Object)", () => {
  it("deve criar valor monetário arredondado para 2 casas decimais", () => {
    const valor = new Dinheiro(45.556);
    assert.equal(valor.valor, 45.56);
  });

  it("deve somar, subtrair e calcular porcentagem corretamente", () => {
    const v1 = new Dinheiro(45.0);
    const v2 = new Dinheiro(35.0);

    const soma = v1.somar(v2);
    assert.equal(soma.valor, 80.0);

    const comissao = soma.calcularPorcentagem(50);
    assert.equal(comissao.valor, 40.0);

    const liquido = soma.subtrair(comissao);
    assert.equal(liquido.valor, 40.0);
  });

  it("deve impedir valores negativos ou subtrações que resultem em negativo", () => {
    assert.throws(
      () => new Dinheiro(-10),
      /O valor monetário não pode ser negativo/
    );

    const v1 = new Dinheiro(20);
    const v2 = new Dinheiro(30);
    assert.throws(
      () => v1.subtrair(v2),
      /O resultado da subtração monetária não pode ser negativo/
    );
  });
});

describe("Domínio - Pessoa e Barbeiro", () => {
  it("deve criar um barbeiro com nível OPERADOR por padrão", () => {
    const barbeiro = new Barbeiro({
      id: "b-1",
      nome: "Carlos Silva",
      taxaComissaoPadrao: 50,
    });

    assert.equal(barbeiro.nivelAcesso, NivelAcesso.OPERADOR);
    assert.equal(barbeiro.ehAdministrador(), false);
    assert.equal(barbeiro.podeGerenciarBarbearia(), false);
  });

  it("deve identificar permissões de GESTOR e ADMINISTRADOR", () => {
    const gestor = new Barbeiro({
      id: "b-2",
      nome: "Marcos Gestor",
      taxaComissaoPadrao: 50,
      nivelAcesso: NivelAcesso.GESTOR,
    });

    const admin = new Barbeiro({
      id: "b-3",
      nome: "Rodrigo Admin",
      taxaComissaoPadrao: 60,
      nivelAcesso: NivelAcesso.ADMINISTRADOR,
    });

    assert.equal(gestor.ehAdministrador(), false);
    assert.equal(gestor.podeGerenciarBarbearia(), true);
    assert.equal(admin.ehAdministrador(), true);
    assert.equal(admin.podeGerenciarBarbearia(), true);
  });

  it("deve validar taxa de comissão fora do intervalo 0 a 100", () => {
    assert.throws(
      () =>
        new Barbeiro({
          id: "b-erro",
          nome: "Teste",
          taxaComissaoPadrao: 120,
        }),
      /A taxa de comissão deve estar entre 0 e 100/
    );
  });
});

describe("Domínio - OrdemServico e Congelamento Histórico (Snapshot)", () => {
  it("deve calcular múltiplos serviços e respeitar comissão específica do serviço", () => {
    const barbeiro = new Barbeiro({
      id: "b-1",
      nome: "Carlos",
      taxaComissaoPadrao: 50, // 50% padrão
    });

    const corte = new Servico({
      id: "s-1",
      nome: "Corte",
      preco: new Dinheiro(40), // 50% de 40 = 20
    });

    const sobrancelha = new Servico({
      id: "s-2",
      nome: "Sobrancelha",
      preco: new Dinheiro(20),
      taxaComissaoEspecifica: 60, // 60% de 20 = 12
    });

    const ordem = new OrdemServico({
      id: "os-1",
      barbeiro,
      servicos: [{ servico: corte }, { servico: sobrancelha }],
      metodoPagamento: MetodoPagamento.PIX,
    });

    assert.equal(ordem.valorTotal.valor, 60.0);
    assert.equal(ordem.valorTotalComissaoBarbeiro.valor, 32.0);
    assert.equal(ordem.valorTotalBarbearia.valor, 28.0);
  });

  it("deve manter valores históricos congelados mesmo se o preço do serviço ou comissão mudarem depois", () => {
    const barbeiro = new Barbeiro({
      id: "b-1",
      nome: "Carlos",
      taxaComissaoPadrao: 50,
    });

    const corte = new Servico({
      id: "s-1",
      nome: "Corte Degradê",
      preco: new Dinheiro(40),
    });

    const ordemAntiga = new OrdemServico({
      id: "os-antiga",
      barbeiro,
      servicos: [{ servico: corte }],
      metodoPagamento: MetodoPagamento.DINHEIRO,
    });

    // Reajuste posterior no catálogo e na comissão do barbeiro
    corte.preco = new Dinheiro(60);
    corte.nome = "Corte Premium";
    barbeiro.taxaComissaoPadrao = 70;

    assert.equal(ordemAntiga.valorTotal.valor, 40.0);
    assert.equal(ordemAntiga.valorTotalComissaoBarbeiro.valor, 20.0);
    assert.equal(ordemAntiga.itens[0].nomeServicoHistorico, "Corte Degradê");
  });

  it("deve impedir lançamento para barbeiro inativo ou serviço inativo", () => {
    const barbeiroInativo = new Barbeiro({
      id: "b-1",
      nome: "Carlos",
      taxaComissaoPadrao: 50,
      ativo: false,
    });

    const servicoAtivo = new Servico({
      id: "s-1",
      nome: "Corte",
      preco: new Dinheiro(40),
    });

    assert.throws(
      () =>
        new OrdemServico({
          id: "os-1",
          barbeiro: barbeiroInativo,
          servicos: [{ servico: servicoAtivo }],
          metodoPagamento: MetodoPagamento.PIX,
        }),
      /barbeiro inativo/
    );
  });
});

describe("Domínio - ExtratoBarbeiro", () => {
  it("deve consolidar apenas as ordens do barbeiro dentro do período informado", () => {
    const carlos = new Barbeiro({
      id: "b-1",
      nome: "Carlos",
      taxaComissaoPadrao: 50,
    });
    const outroBarbeiro = new Barbeiro({
      id: "b-2",
      nome: "Mateus",
      taxaComissaoPadrao: 50,
    });
    const corte = new Servico({
      id: "s-1",
      nome: "Corte",
      preco: new Dinheiro(50),
    });

    const ordemDentroPeriodo = new OrdemServico({
      id: "os-1",
      barbeiro: carlos,
      servicos: [{ servico: corte }],
      metodoPagamento: MetodoPagamento.PIX,
      realizadoEm: new Date("2026-10-10T12:00:00Z"),
    });

    const ordemForaPeriodo = new OrdemServico({
      id: "os-2",
      barbeiro: carlos,
      servicos: [{ servico: corte }],
      metodoPagamento: MetodoPagamento.PIX,
      realizadoEm: new Date("2026-09-25T12:00:00Z"),
    });

    const ordemOutroBarbeiro = new OrdemServico({
      id: "os-3",
      barbeiro: outroBarbeiro,
      servicos: [{ servico: corte }],
      metodoPagamento: MetodoPagamento.PIX,
      realizadoEm: new Date("2026-10-10T14:00:00Z"),
    });

    const extrato = new ExtratoBarbeiro({
      barbeiro: carlos,
      inicioPeriodo: new Date("2026-10-01T00:00:00Z"),
      fimPeriodo: new Date("2026-10-31T23:59:59Z"),
      ordens: [ordemDentroPeriodo, ordemForaPeriodo, ordemOutroBarbeiro],
    });

    assert.equal(extrato.totalOrdens, 1);
    assert.equal(extrato.faturamentoBruto.valor, 50.0);
    assert.equal(extrato.totalComissaoBarbeiro.valor, 25.0);
    assert.equal(extrato.totalBarbearia.valor, 25.0);
  });
});
