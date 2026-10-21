import { criarAplicacaoWeb, obterEnderecosRedeLocal } from "./web";

const PORTA = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function iniciarServidor() {
  const { app, bancoSqlite } = await criarAplicacaoWeb({ popularSeed: true });

  app.listen(PORTA, HOST, () => {
    const enderecosLan = obterEnderecosRedeLocal(PORTA);

    console.log("==========================================================");
    console.log("💈 BarberShop Manager - Servidor Web em Rede Local Ativo!");
    console.log("==========================================================");
    if (bancoSqlite) {
      console.log(`🗄️  Banco SQLite Local:     ${bancoSqlite.caminhoArquivo}`);
    }
    console.log(`💻 Acesso nesta máquina:   http://localhost:${PORTA}`);

    if (enderecosLan.length > 0) {
      console.log("📱 Acesso pelos celulares no Wi-Fi (Rede Local):");
      for (const item of enderecosLan) {
        console.log(`   👉 ${item.url} (${item.interfaceRede})`);
      }
    } else {
      console.log(
        "📱 Conecte a máquina ao Wi-Fi/Rede Local para gerar o IP de acesso."
      );
    }

    console.log("----------------------------------------------------------");
    console.log("Contas de demonstração pré-cadastradas:");
    console.log("  • Admin:    admin@barbearia.com  / admin123");
    console.log("  • Barbeiro: carlos@barbearia.com / carlos123");
    console.log("  • Barbeiro: mateus@barbearia.com / mateus123");
    console.log("==========================================================");
  });
}

iniciarServidor().catch((erro) => {
  console.error("Falha ao iniciar o servidor:", erro);
  process.exit(1);
});
