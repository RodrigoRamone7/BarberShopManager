import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export class CriptografiaSenha {
  private static readonly TAMANHO_CHAVE = 64;

  public static gerarHash(senhaPura: string): string {
    if (senhaPura.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(senhaPura, salt, this.TAMANHO_CHAVE).toString("hex");
    return `${salt}:${hash}`;
  }

  public static verificar(senhaPura: string, senhaHashArmazenada: string): boolean {
    const [salt, hashOriginal] = senhaHashArmazenada.split(":");
    if (!salt || !hashOriginal) {
      return false;
    }

    const bufferOriginal = Buffer.from(hashOriginal, "hex");
    const bufferTentativa = scryptSync(senhaPura, salt, this.TAMANHO_CHAVE);

    if (bufferOriginal.length !== bufferTentativa.length) {
      return false;
    }

    return timingSafeEqual(bufferOriginal, bufferTentativa);
  }
}
