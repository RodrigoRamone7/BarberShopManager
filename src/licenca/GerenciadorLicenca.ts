import { createHmac, timingSafeEqual } from "crypto";
import { BancoSqlite } from "../repositorios/sqlite/BancoSqlite";

export type TipoLicenca = "DEMO" | "DEFINITIVA";

export interface StatusLicencaSistema {
  tipo: TipoLicenca;
  ativaParaEscrita: boolean;
  modoSomenteLeitura: boolean;
  expirada: boolean;
  relogioAdulterado: boolean;
  diasTotaisDemo: number;
  diasRestantesDemo: number;
  instaladoEm: string;
  expiraDemoEm: string;
  licenciadoPara: string | null;
  ativadoEm: string | null;
  mensagemStatus: string;
}

interface LinhaLicenca {
  id: number;
  instalado_em: string;
  expira_demo_em: string;
  ultimo_relogio_visto: string;
  tipo_licenca: TipoLicenca;
  licenciado_para: string | null;
  chave_ativacao: string | null;
  ativado_em: string | null;
  assinatura_integridade: string;
}

export class GerenciadorLicenca {
  public static readonly DIAS_DEMO_PADRAO = 30;
  private static readonly SEGREDO_LICENCA =
    process.env.LICENSE_SECRET ??
    "barbershop-manager-assinatura-licenca-comercial-2026-chave-mestra";

  constructor(
    private readonly banco?: BancoSqlite,
    private readonly diasDemo: number = GerenciadorLicenca.DIAS_DEMO_PADRAO
  ) {}

  /**
   * Gera uma Chave de Ativação Definitiva assinada digitalmente para entregar ao cliente
   * quando ele adquirir a versão final paga.
   */
  public static gerarChaveAtivacaoDefinitiva(nomeCliente: string): string {
    const clienteLimpo = nomeCliente.trim();
    if (!clienteLimpo) {
      throw new Error(
        "Informe o nome do cliente/barbearia para gerar a chave."
      );
    }

    const payload = {
      tipo: "DEFINITIVA" as const,
      cliente: clienteLimpo,
      emitidaEm: new Date().toISOString().slice(0, 10),
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf-8").toString(
      "base64url"
    );
    const assinatura = createHmac("sha256", this.SEGREDO_LICENCA)
      .update(`CHAVE:${payloadBase64}`)
      .digest("base64url")
      .slice(0, 24);

    return `BSM-${payloadBase64}.${assinatura}`;
  }

  /**
   * Valida uma Chave de Ativação Definitiva e retorna os dados do cliente.
   */
  public static validarChaveAtivacaoDefinitiva(chave: string): {
    cliente: string;
    emitidaEm: string;
  } {
    const chaveLimpa = chave.trim();
    if (!chaveLimpa.startsWith("BSM-") || !chaveLimpa.includes(".")) {
      throw new Error("Formato de Chave de Ativação inválido.");
    }

    const semPrefixo = chaveLimpa.slice(4);
    const [payloadBase64, assinaturaRecebida] = semPrefixo.split(".");
    if (!payloadBase64 || !assinaturaRecebida) {
      throw new Error("Chave de Ativação incompleta ou inválida.");
    }

    const assinaturaEsperada = createHmac("sha256", this.SEGREDO_LICENCA)
      .update(`CHAVE:${payloadBase64}`)
      .digest("base64url")
      .slice(0, 24);

    const bufRecebida = Buffer.from(assinaturaRecebida);
    const bufEsperada = Buffer.from(assinaturaEsperada);

    if (
      bufRecebida.length !== bufEsperada.length ||
      !timingSafeEqual(bufRecebida, bufEsperada)
    ) {
      throw new Error("Chave de Ativação inválida: assinatura não reconhecida.");
    }

    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    ) as { tipo: string; cliente: string; emitidaEm: string };

    if (payload.tipo !== "DEFINITIVA" || !payload.cliente) {
      throw new Error("Conteúdo da Chave de Ativação inválido.");
    }

    return {
      cliente: payload.cliente,
      emitidaEm: payload.emitidaEm,
    };
  }

  private assinarIntegridadeBanco(dados: {
    instaladoEm: string;
    expiraDemoEm: string;
    tipoLicenca: TipoLicenca;
    licenciadoPara: string | null;
    chaveAtivacao: string | null;
  }): string {
    const texto = `${dados.instaladoEm}|${dados.expiraDemoEm}|${
      dados.tipoLicenca
    }|${dados.licenciadoPara ?? ""}|${dados.chaveAtivacao ?? ""}`;

    return createHmac("sha256", GerenciadorLicenca.SEGREDO_LICENCA)
      .update(texto)
      .digest("hex");
  }

  private garantirRegistroInicial(agora: Date): LinhaLicenca {
    if (!this.banco) {
      const instaladoEm = agora.toISOString();
      const expira = new Date(
        agora.getTime() + this.diasDemo * 24 * 60 * 60 * 1000
      ).toISOString();
      return {
        id: 1,
        instalado_em: instaladoEm,
        expira_demo_em: expira,
        ultimo_relogio_visto: instaladoEm,
        tipo_licenca: "DEMO",
        licenciado_para: null,
        chave_ativacao: null,
        ativado_em: null,
        assinatura_integridade: this.assinarIntegridadeBanco({
          instaladoEm,
          expiraDemoEm: expira,
          tipoLicenca: "DEMO",
          licenciadoPara: null,
          chaveAtivacao: null,
        }),
      };
    }

    const stmtBusca = this.banco.db.prepare(
      `SELECT * FROM licenca_sistema WHERE id = 1 LIMIT 1`
    );
    const existente = stmtBusca.get() as unknown as LinhaLicenca | undefined;

    if (existente) {
      return existente;
    }

    const instaladoEm = agora.toISOString();
    const expiraDemoEm = new Date(
      agora.getTime() + this.diasDemo * 24 * 60 * 60 * 1000
    ).toISOString();

    const assinatura = this.assinarIntegridadeBanco({
      instaladoEm,
      expiraDemoEm,
      tipoLicenca: "DEMO",
      licenciadoPara: null,
      chaveAtivacao: null,
    });

    const stmtInsert = this.banco.db.prepare(`
      INSERT INTO licenca_sistema (
        id, instalado_em, expira_demo_em, ultimo_relogio_visto,
        tipo_licenca, licenciado_para, chave_ativacao, ativado_em, assinatura_integridade
      ) VALUES (1, ?, ?, ?, 'DEMO', NULL, NULL, NULL, ?)
    `);

    stmtInsert.run(instaladoEm, expiraDemoEm, instaladoEm, assinatura);

    return stmtBusca.get() as unknown as LinhaLicenca;
  }

  public obterStatus(agora: Date = new Date()): StatusLicencaSistema {
    const registro = this.garantirRegistroInicial(agora);

    const assinaturaEsperada = this.assinarIntegridadeBanco({
      instaladoEm: registro.instalado_em,
      expiraDemoEm: registro.expira_demo_em,
      tipoLicenca: registro.tipo_licenca,
      licenciadoPara: registro.licenciado_para,
      chaveAtivacao: registro.chave_ativacao,
    });

    const integridadeValida =
      assinaturaEsperada === registro.assinatura_integridade;

    const dataInstalacao = new Date(registro.instalado_em);
    const dataExpiracao = new Date(registro.expira_demo_em);
    const dataUltimoRelogio = new Date(registro.ultimo_relogio_visto);

    // Tolerância de 5 minutos para pequenas sincronizações de horário do sistema operacional
    const toleranciaMs = 5 * 60 * 1000;
    const relogioAdulterado =
      agora.getTime() + toleranciaMs < dataUltimoRelogio.getTime() ||
      agora.getTime() + toleranciaMs < dataInstalacao.getTime();

    // Atualiza o último horário visto se o relógio avançou normalmente
    if (!relogioAdulterado && this.banco && agora > dataUltimoRelogio) {
      const stmtUpdateRelogio = this.banco.db.prepare(
        `UPDATE licenca_sistema SET ultimo_relogio_visto = ? WHERE id = 1`
      );
      stmtUpdateRelogio.run(agora.toISOString());
    }

    if (registro.tipo_licenca === "DEFINITIVA" && integridadeValida) {
      return {
        tipo: "DEFINITIVA",
        ativaParaEscrita: true,
        modoSomenteLeitura: false,
        expirada: false,
        relogioAdulterado: false,
        diasTotaisDemo: this.diasDemo,
        diasRestantesDemo: this.diasDemo,
        instaladoEm: registro.instalado_em,
        expiraDemoEm: registro.expira_demo_em,
        licenciadoPara: registro.licenciado_para,
        ativadoEm: registro.ativado_em,
        mensagemStatus: `Versão Definitiva licenciada para ${
          registro.licenciado_para ?? "Estabelecimento"
        }.`,
      };
    }

    const msRestantes = dataExpiracao.getTime() - agora.getTime();
    const diasRestantesDemo = Math.max(
      0,
      Math.ceil(msRestantes / (1000 * 60 * 60 * 24))
    );

    const expirada = !integridadeValida || msRestantes <= 0;
    const ativaParaEscrita = !expirada && !relogioAdulterado;

    let mensagemStatus = `Versão de Demonstração (${diasRestantesDemo} dia(s) restante(s) de ${this.diasDemo}).`;
    if (!integridadeValida) {
      mensagemStatus =
        "Assinatura de licença inválida. Insira uma Chave de Ativação Definitiva.";
    } else if (relogioAdulterado) {
      mensagemStatus =
        "Alteração retroativa no relógio do sistema detectada. Ajuste a data/hora do computador ou ative a licença definitiva.";
    } else if (expirada) {
      mensagemStatus =
        "Período de demonstração de 30 dias encerrado (Modo Somente Leitura). Seus dados estão salvos! Insira a Chave de Ativação para liberar novos lançamentos.";
    }

    return {
      tipo: "DEMO",
      ativaParaEscrita,
      modoSomenteLeitura: !ativaParaEscrita,
      expirada,
      relogioAdulterado,
      diasTotaisDemo: this.diasDemo,
      diasRestantesDemo,
      instaladoEm: registro.instalado_em,
      expiraDemoEm: registro.expira_demo_em,
      licenciadoPara: null,
      ativadoEm: null,
      mensagemStatus,
    };
  }

  public exigirPermissaoEscrita(agora: Date = new Date()): void {
    const status = this.obterStatus(agora);
    if (!status.ativaParaEscrita) {
      throw new Error(`Licença bloqueada: ${status.mensagemStatus}`);
    }
  }

  public ativarLicencaDefinitiva(
    chaveAtivacao: string,
    agora: Date = new Date()
  ): StatusLicencaSistema {
    const dadosChave =
      GerenciadorLicenca.validarChaveAtivacaoDefinitiva(chaveAtivacao);
    const registro = this.garantirRegistroInicial(agora);

    const novaAssinatura = this.assinarIntegridadeBanco({
      instaladoEm: registro.instalado_em,
      expiraDemoEm: registro.expira_demo_em,
      tipoLicenca: "DEFINITIVA",
      licenciadoPara: dadosChave.cliente,
      chaveAtivacao: chaveAtivacao.trim(),
    });

    if (this.banco) {
      const stmt = this.banco.db.prepare(`
        UPDATE licenca_sistema SET
          tipo_licenca = 'DEFINITIVA',
          licenciado_para = ?,
          chave_ativacao = ?,
          ativado_em = ?,
          ultimo_relogio_visto = ?,
          assinatura_integridade = ?
        WHERE id = 1
      `);

      stmt.run(
        dadosChave.cliente,
        chaveAtivacao.trim(),
        agora.toISOString(),
        agora.toISOString(),
        novaAssinatura
      );
    }

    return this.obterStatus(agora);
  }
}
