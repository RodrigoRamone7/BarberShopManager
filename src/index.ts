import {
  criarAplicacaoWeb,
  iniciarDnsLocalMdns,
  obterInfoCompletaRedeLocal,
} from "./web";

const PORTA = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const DOMINIO_LOCAL = process.env.DOMINIO_LOCAL ?? "barbearia.local";

async function iniciarServidor() {
  const { app, bancoSqlite } = await criarAplicacaoWeb({ popularSeed: true });

  app.listen(PORTA, HOST, async () => {
    const servicoMdns = iniciarDnsLocalMdns(PORTA, DOMINIO_LOCAL);
    const infoRede = await obterInfoCompletaRedeLocal(PORTA, DOMINIO_LOCAL);

    console.log("==========================================================");
    console.log("💈 BarberShop Manager - Servidor Web em Rede Local Ativo!");
    console.log("==========================================================");
    if (bancoSqlite) {
      console.log(`🗄️  Banco SQLite Local:     ${bancoSqlite.caminhoArquivo}`);
    }
    console.log(`💻 Acesso nesta máquina:   ${infoRede.urlLocalhost}`);
    console.log("----------------------------------------------------------");
    console.log("📱 ACESSO AMIGÁVEL PELOS CELULARES NO WI-FI:");
    console.log(`   🌐 Endereço DNS Local:  ${infoRede.urlDominioLocal}`);
    console.log(`   🖥️  Nome do Windows:     ${infoRede.urlHostnameWindows}`);

    if (infoRede.enderecosRedeLocal.length > 0) {
      for (const item of infoRede.enderecosRedeLocal) {
        console.log(`   📶 IP Direto (${item.interfaceRede}): ${item.url}`);
      }
    }
    console.log(
      "   📷 Ou clique em 'Conectar Celular (QR Code)' na tela do sistema!"
    );
    console.log("----------------------------------------------------------");
    console.log("Contas de demonstração pré-cadastradas:");
    console.log("  • Admin:    admin@barbearia.com  / admin123");
    console.log("  • Barbeiro: carlos@barbearia.com / carlos123");
    console.log("  • Barbeiro: mateus@barbearia.com / mateus123");
    console.log("==========================================================");

    process.on("SIGINT", () => {
      servicoMdns.parar();
      process.exit(0);
    });
  });
}

iniciarServidor().catch((erro) => {
  console.error("Falha ao iniciar o servidor:", erro);
  process.exit(1);
});
