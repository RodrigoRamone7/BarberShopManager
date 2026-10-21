import os from "os";

export interface EnderecoRedeLocal {
  interfaceRede: string;
  ip: string;
  url: string;
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
