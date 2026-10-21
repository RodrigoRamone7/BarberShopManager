import { GerenciadorLicenca } from "./licenca";

const nomeCliente = process.argv.slice(2).join(" ").trim() || "Barbearia Cliente";
const chave = GerenciadorLicenca.gerarChaveAtivacaoDefinitiva(nomeCliente);

console.log("==========================================================");
console.log("🔑 GERADOR DE CHAVE DE ATIVAÇÃO DEFINITIVA - BARBERSHOP");
console.log("==========================================================");
console.log(`Estabelecimento: ${nomeCliente}`);
console.log("\nChave de Ativação (copie e envie para o cliente):");
console.log(`\n   ${chave}\n`);
console.log("==========================================================");
