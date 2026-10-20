import { createHmac, timingSafeEqual } from "crypto";
import { NivelAcesso } from "../dominio/NivelAcesso";

export interface PayloadToken {
  pessoaId: string;
  nome: string;
  nivelAcesso: NivelAcesso;
  emitidoEm: number;
  expiraEm: number;
}

export class GerenciadorToken {
  private readonly segredo: string;
  private readonly duracaoPadraoSegundos: number;

  constructor(segredo: string, duracaoPadraoSegundos: number = 8 * 60 * 60) {
    if (!segredo || segredo.trim().length < 16) {
      throw new Error("O segredo do token deve ter pelo menos 16 caracteres.");
    }
    this.segredo = segredo;
    this.duracaoPadraoSegundos = duracaoPadraoSegundos;
  }

  public gerarToken(dados: {
    pessoaId: string;
    nome: string;
    nivelAcesso: NivelAcesso;
  }): string {
    const agora = Math.floor(Date.now() / 1000);
    const payload: PayloadToken = {
      pessoaId: dados.pessoaId,
      nome: dados.nome,
      nivelAcesso: dados.nivelAcesso,
      emitidoEm: agora,
      expiraEm: agora + this.duracaoPadraoSegundos,
    };

    const headerBase64 = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" })
    ).toString("base64url");

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const assinatura = this.assinar(`${headerBase64}.${payloadBase64}`);

    return `${headerBase64}.${payloadBase64}.${assinatura}`;
  }

  public validarToken(token: string): PayloadToken {
    const partes = token.split(".");
    if (partes.length !== 3) {
      throw new Error("Formato de token inválido.");
    }

    const [headerBase64, payloadBase64, assinaturaRecebida] = partes;
    const assinaturaEsperada = this.assinar(`${headerBase64}.${payloadBase64}`);

    const bufferRecebida = Buffer.from(assinaturaRecebida);
    const bufferEsperada = Buffer.from(assinaturaEsperada);

    if (
      bufferRecebida.length !== bufferEsperada.length ||
      !timingSafeEqual(bufferRecebida, bufferEsperada)
    ) {
      throw new Error("Assinatura do token inválida.");
    }

    const payload: PayloadToken = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    );

    const agora = Math.floor(Date.now() / 1000);
    if (agora >= payload.expiraEm) {
      throw new Error("Token expirado.");
    }

    return payload;
  }

  private assinar(conteudo: string): string {
    return createHmac("sha256", this.segredo)
      .update(conteudo)
      .digest("base64url");
  }
}
