import os from "os";
import QRCode from "qrcode";

export interface EnderecoRedeLocal {
  interfaceRede: string;
  ip: string;
  url: string;
  qrCodeDataUrl?: string;
}

export interface InfoAcessoRedeLocal {
  porta: number;
  dominioLocal: string;
  urlDominioLocal: string;
  hostnameWindows: string;
  urlHostnameWindows: string;
  urlLocalhost: string;
  urlRecomendadaCelular: string;
  qrCodePrincipalDataUrl: string;
  enderecosRedeLocal: EnderecoRedeLocal[];
}

const INTERFACES_VIRTUAIS_IGNORADAS = [
  "vethernet",
  "default switch",
  "wsl",
  "docker",
  "vboxnet",
  "vmware",
  "loopback",
];

export function obterEnderecosRedeLocal(porta: number): EnderecoRedeLocal[] {
  const interfaces = os.networkInterfaces();
  const enderecos: EnderecoRedeLocal[] = [];

  for (const [nomeInterface, lista] of Object.entries(interfaces)) {
    if (!lista) continue;

    const nomeMin = nomeInterface.toLowerCase();
    const ehVirtual = INTERFACES_VIRTUAIS_IGNORADAS.some((termo) =>
      nomeMin.includes(termo)
    );
    if (ehVirtual) continue;

    for (const info of lista) {
      const ehIPv4 = info.family === "IPv4" || (info.family as unknown) === 4;
      if (ehIPv4 && !info.internal) {
        enderecos.push({
          interfaceRede: nomeInterface,
          ip: info.address,
          url: `http://${info.address}:${porta}`,
        });
      }
    }
  }

  return enderecos;
}

export async function obterInfoCompletaRedeLocal(
  porta: number,
  dominioLocal = "barbearia.local"
): Promise<InfoAcessoRedeLocal> {
  const enderecosBasicos = obterEnderecosRedeLocal(porta);
  const urlDominioLocal = `http://${dominioLocal}:${porta}`;

  const rawHost = os.hostname().toLowerCase().replace(/\s+/g, "-");
  const hostnameWindows = rawHost.endsWith(".local")
    ? rawHost
    : `${rawHost}.local`;
  const urlHostnameWindows = `http://${hostnameWindows}:${porta}`;
  const urlLocalhost = `http://localhost:${porta}`;

  const enderecosRedeLocal: EnderecoRedeLocal[] = await Promise.all(
    enderecosBasicos.map(async (item) => {
      const qrCodeDataUrl = await QRCode.toDataURL(item.url, {
        width: 240,
        margin: 1,
        color: {
          dark: "#0f141c",
          light: "#ffffff",
        },
      });
      return {
        ...item,
        qrCodeDataUrl,
      };
    })
  );

  // O QR Code aponta para o IP da rede Wi-Fi (funciona em 100% dos celulares Android/iOS sem depender de DNS)
  // enquanto o nome amigável barbearia.local fica disponível para quem preferir digitar!
  const urlRecomendadaCelular =
    enderecosRedeLocal[0]?.url ?? urlDominioLocal;

  const qrCodePrincipalDataUrl = await QRCode.toDataURL(urlRecomendadaCelular, {
    width: 260,
    margin: 1,
    color: {
      dark: "#0f141c",
      light: "#ffffff",
    },
  });

  return {
    porta,
    dominioLocal,
    urlDominioLocal,
    hostnameWindows,
    urlHostnameWindows,
    urlLocalhost,
    urlRecomendadaCelular,
    qrCodePrincipalDataUrl,
    enderecosRedeLocal,
  };
}
