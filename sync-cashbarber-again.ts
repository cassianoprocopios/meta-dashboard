import { getDb } from "./server/db";

async function sync() {
  const db = await getDb();
  if (!db) {
    console.log("Erro ao conectar ao banco");
    return;
  }

  const { sincronizarCashbarber } = await import("./server/cashbarberSincronizador");

  console.log(`\n=== SINCRONIZANDO CASHBARBER NOVAMENTE ===\n`);

  try {
    // Sincronizar Mascote
    const mascoteResult = await sincronizarCashbarber("barbiero-mascote", 1);
    console.log(`✅ Mascote: ${mascoteResult.diasSincronizados} dias sincronizados`);

    // Sincronizar Morumbi
    const morumbiResult = await sincronizarCashbarber("barbiero-morumbi", 1);
    console.log(`✅ Morumbi: ${morumbiResult.diasSincronizados} dias sincronizados`);

    console.log(`\n✅ Sincronização concluída com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro na sincronização:`, error);
  }

  process.exit(0);
}

sync().catch(console.error);
