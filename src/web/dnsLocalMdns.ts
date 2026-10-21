import createMdns from "multicast-dns";
import { obterEnderecosRedeLocal } from "./redeLocal";

export interface ServicoMdnsLocal {
  dominio: string;
  anunciarAgora: () => void;
  parar: () => void;
}

export function iniciarDnsLocalMdns(
  porta: number,
  dominio = "barbearia.local"
): ServicoMdnsLocal {
  const dominioNormalizado = dominio.trim().toLowerCase();

  try {
    const mdns = createMdns({ reuseAddr: true });

    const montarRegistrosA = () => {
      const enderecos = obterEnderecosRedeLocal(porta);
      return enderecos.map((item) => ({
        name: dominioNormalizado,
        type: "A" as const,
        ttl: 120,
        data: item.ip,
      }));
    };

    mdns.on("query", (query) => {
      const perguntaAlvo = query.questions.some(
        (q) =>
          q.name.toLowerCase() === dominioNormalizado &&
          (q.type === "A" || q.type === "ANY")
      );

      if (!perguntaAlvo) return;

      const registros = montarRegistrosA();
      if (registros.length > 0) {
        mdns.respond({ answers: registros });
      }
    });

    const anunciarAgora = () => {
      try {
        const registros = montarRegistrosA();
        if (registros.length > 0) {
          mdns.respond({ answers: registros });
        }
      } catch {
        // Ignora falhas de broadcast em redes desconectadas
      }
    };

    anunciarAgora();

    return {
      dominio: dominioNormalizado,
      anunciarAgora,
      parar: () => {
        try {
          mdns.destroy();
        } catch {
          // Ignora erro ao encerrar socket UDP
        }
      },
    };
  } catch {
    return {
      dominio: dominioNormalizado,
      anunciarAgora: () => {},
      parar: () => {},
    };
  }
}
