import { criarAplicacaoWeb } from "./web";

const PORTA = Number(process.env.PORT ?? 3000);

async function iniciarServidor() {
  const { app } = await criarAplicacaoWeb({ popularSeed: true });

  app.listen(PORTA, () => {
    console.log("====================================================");
    console.log("💈 BarberShop Manager - Servidor Web Iniciado!");
    console.log(`🌐 Acesse no navegador: http://localhost:${PORTA}`);
    console.log("----------------------------------------------------");
    console.log("Contas de demonstração pré-cadastradas:");
    console.log("  • Admin:    admin@barbearia.com  / admin123");
    console.log("  • Barbeiro: carlos@barbearia.com / carlos123");
    console.log("  • Barbeiro: mateus@barbearia.com / mateus123");
    console.log("====================================================");
  });
}

iniciarServidor().catch((erro) => {
  console.error("Falha ao iniciar o servidor:", erro);
  process.exit(1);
});
