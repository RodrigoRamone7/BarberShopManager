export class Dinheiro {
  public readonly valor: number;

  constructor(valor: number) {
    if (!Number.isFinite(valor)) {
      throw new Error("O valor monetário deve ser um número válido.");
    }
    if (valor < 0) {
      throw new Error("O valor monetário não pode ser negativo.");
    }
    this.valor = Number(valor.toFixed(2));
  }

  public static zero(): Dinheiro {
    return new Dinheiro(0);
  }

  public somar(outro: Dinheiro): Dinheiro {
    return new Dinheiro(this.valor + outro.valor);
  }

  public subtrair(outro: Dinheiro): Dinheiro {
    const resultado = Number((this.valor - outro.valor).toFixed(2));
    if (resultado < 0) {
      throw new Error("O resultado da subtração monetária não pode ser negativo.");
    }
    return new Dinheiro(resultado);
  }

  public calcularPorcentagem(porcentagem: number): Dinheiro {
    if (porcentagem < 0 || porcentagem > 100) {
      throw new Error("A porcentagem deve estar entre 0 e 100.");
    }
    return new Dinheiro((this.valor * porcentagem) / 100);
  }

  public igual(outro: Dinheiro): boolean {
    return this.valor === outro.valor;
  }

  public formatar(): string {
    return this.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
}
