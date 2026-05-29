import { sincronizarClientesMensalManual } from "./server/syncClientesMensalJob.ts";

async function sincronizarMeses() {
  const meses = [
    { mes: 3, ano: 2026, nome: "Março" },
    { mes: 4, ano: 2026, nome: "Abril" },
    { mes: 5, ano: 2026, nome: "Maio" }
  ];

  console.log("🔄 Iniciando sincronização de meses anteriores...\n");

  for (const { mes, ano, nome } of meses) {
    console.log(`📅 Sincronizando ${nome}/${ano}...`);
    try {
      const resultado = await sincronizarClientesMensalManual(mes, ano);
      if (resultado.sucesso) {
        console.log(`✅ ${nome}: ${resultado.totalClientes} clientes sincronizados`);
      } else {
        console.log(`❌ ${nome}: ${resultado.mensagem}`);
      }
    } catch (erro) {
      console.log(`❌ ${nome}: Erro - ${erro.message}`);
    }
    console.log("");
  }

  console.log("✨ Sincronização concluída!");
}

sincronizarMeses().catch(console.error);
