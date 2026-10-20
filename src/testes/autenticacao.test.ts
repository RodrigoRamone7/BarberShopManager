import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CriptografiaSenha,
  GerenciadorToken,
  ServicoAutenticacao,
} from "../autenticacao";
import { Barbeiro, NivelAcesso } from "../dominio";

describe("Autenticação - CriptografiaSenha", () => {
  it("deve gerar hashes distintos (com salt aleatório) e verificar a senha corretamente", () => {
    const hash1 = CriptografiaSenha.gerarHash("minhaSenha123");
    const hash2 = CriptografiaSenha.gerarHash("minhaSenha123");

    assert.notEqual(hash1, hash2);
    assert.equal(CriptografiaSenha.verificar("minhaSenha123", hash1), true);
    assert.equal(CriptografiaSenha.verificar("senhaErrada", hash1), false);
  });

  it("deve rejeitar senhas com menos de 6 caracteres", () => {
    assert.throws(
      () => CriptografiaSenha.gerarHash("12345"),
      /pelo menos 6 caracteres/
    );
  });
});

describe("Autenticação - GerenciadorToken", () => {
  const gerenciador = new GerenciadorToken("segredo-teste-com-mais-de-16-chars");

  it("deve emitir e validar um token JWT válido", () => {
    const token = gerenciador.gerarToken({
      pessoaId: "p-1",
      nome: "Carlos",
      nivelAcesso: NivelAcesso.OPERADOR,
    });

    const payload = gerenciador.validarToken(token);
    assert.equal(payload.pessoaId, "p-1");
    assert.equal(payload.nome, "Carlos");
    assert.equal(payload.nivelAcesso, NivelAcesso.OPERADOR);
  });

  it("deve rejeitar token com assinatura adulterada", () => {
    const token = gerenciador.gerarToken({
      pessoaId: "p-1",
      nome: "Carlos",
      nivelAcesso: NivelAcesso.OPERADOR,
    });

    const tokenAdulterado = `${token}x`;
    assert.throws(
      () => gerenciador.validarToken(tokenAdulterado),
      /Assinatura do token inválida/
    );
  });

  it("deve rejeitar token expirado", () => {
    const gerenciadorExpirado = new GerenciadorToken(
      "segredo-teste-com-mais-de-16-chars",
      -10 // Já nasce expirado
    );

    const token = gerenciadorExpirado.gerarToken({
      pessoaId: "p-1",
      nome: "Carlos",
      nivelAcesso: NivelAcesso.OPERADOR,
    });

    assert.throws(
      () => gerenciadorExpirado.validarToken(token),
      /Token expirado/
    );
  });
});

describe("Autenticação - ServicoAutenticacao", () => {
  const gerenciador = new GerenciadorToken("segredo-teste-com-mais-de-16-chars");
  const servicoAuth = new ServicoAutenticacao(gerenciador);

  it("deve autenticar usuário ativo, atualizar ultimoAcessoEm e verificar nível de permissão", () => {
    const barbeiro = new Barbeiro({
      id: "b-1",
      nome: "Carlos",
      taxaComissaoPadrao: 50,
      nivelAcesso: NivelAcesso.OPERADOR,
    });

    const credencial = servicoAuth.criarCredencial({
      id: "c-1",
      pessoa: barbeiro,
      login: "Carlos@Barbearia.com",
      senhaPura: "senha123",
    });

    const resultado = servicoAuth.autenticar({
      login: "carlos@barbearia.com",
      senhaPura: "senha123",
      credencial,
      pessoa: barbeiro,
    });

    assert.ok(resultado.token);
    assert.ok(credencial.ultimoAcessoEm instanceof Date);

    // Deve permitir acesso para OPERADOR
    const payload = servicoAuth.verificarAcesso(resultado.token, [
      NivelAcesso.OPERADOR,
    ]);
    assert.equal(payload.pessoaId, "b-1");

    // Deve negar acesso quando exigir ADMINISTRADOR
    assert.throws(
      () =>
        servicoAuth.verificarAcesso(resultado.token, [
          NivelAcesso.ADMINISTRADOR,
        ]),
      /Acesso negado/
    );
  });

  it("deve permitir alterar a senha mediante confirmação da senha atual", () => {
    const barbeiro = new Barbeiro({
      id: "b-1",
      nome: "Carlos",
      taxaComissaoPadrao: 50,
    });

    const credencial = servicoAuth.criarCredencial({
      id: "c-1",
      pessoa: barbeiro,
      login: "carlos",
      senhaPura: "senhaAntiga",
    });

    servicoAuth.alterarSenha({
      credencial,
      senhaAtual: "senhaAntiga",
      novaSenha: "senhaNova123",
    });

    assert.throws(
      () =>
        servicoAuth.autenticar({
          login: "carlos",
          senhaPura: "senhaAntiga",
          credencial,
          pessoa: barbeiro,
        }),
      /Credenciais inválidas/
    );

    const sessao = servicoAuth.autenticar({
      login: "carlos",
      senhaPura: "senhaNova123",
      credencial,
      pessoa: barbeiro,
    });
    assert.equal(sessao.usuario.pessoaId, "b-1");
  });
});
