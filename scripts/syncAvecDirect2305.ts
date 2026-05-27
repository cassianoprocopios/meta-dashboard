/**
 * Script alternativo com timeout maior para sincronizar o dia 23/05/2026 da Seraphine.
 */
import { avecBrowserBuscarRelatorio0184Mes } from "../server/avecBrowser";
import { getDb } from "../server/db";
import { faturamentos } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const TENANT_ID = 1;
const EMPRESA_SLUG = "barbiero-seraphine";

async function main() {
  console.log(`\n[Sync Avec Direto] Iniciando sync de ${EMPRESA_SLUG} para maio/2026...`);
  
  try {
    // 1. Buscar credenciais do Avec
    const db = await getDb();
    if (!db) throw new Error("DB não disponível");
    
    const { avecConfig } = await import("../drizzle/schema");
    const configs = await db
      .select()
      .from(avecConfig)
      .where(and(eq(avecConfig.tenantId, TENANT_ID), eq(avecConfig.empresaSlug, EMPRESA_SLUG)));
    
    if (configs.length === 0) throw new Error("Configuração do Avec não encontrada");
    
    const config = configs[0];
    console.log(`[Sync Avec Direto] Usando credenciais de ${config.empresaSlug}...`);
    
    // 2. Buscar dados do mês via Avec (com timeout maior)
    console.log(`[Sync Avec Direto] Buscando relatório 0184 para maio/2026...`);
    const dadosMes = await avecBrowserBuscarRelatorio0184Mes(
      config.avecEmail,
      config.avecSenha,
      5, // maio
      2026
    );
    
    // 3. Processar dia 23/05
    const dia23 = dadosMes.get("2026-05-23");
    if (!dia23) {
      console.log("❌ Dia 23/05 não encontrado no Avec");
      process.exit(0);
    }
    
    console.log(`✅ Dia 23/05 encontrado: R$ ${dia23.total?.toFixed(2) ?? "0.00"}`);
    console.log(`   Serviços: R$ ${dia23.servicos?.toFixed(2) ?? "0.00"}`);
    console.log(`   Produtos: R$ ${dia23.produtos?.toFixed(2) ?? "0.00"}`);
    console.log(`   Pacotes: R$ ${dia23.pacotes?.toFixed(2) ?? "0.00"}`);
    
    // 4. Lançar no banco
    await db
      .insert(faturamentos)
      .values({
        empresaSlug: EMPRESA_SLUG,
        data: "2026-05-23",
        cat1: dia23.servicos ?? 0,
        cat2: dia23.produtos ?? 0,
        cat3: dia23.pacotes ?? 0,
        cat4: 0,
        cat5: 0,
        cat6: 0,
        cat7: 0,
        cat8: 0,
        cat9: 0,
      })
      .onDuplicateKeyUpdate({
        cat1: dia23.servicos ?? 0,
        cat2: dia23.produtos ?? 0,
        cat3: dia23.pacotes ?? 0,
        updatedAt: new Date(),
      });
    
    console.log(`\n✅ Dia 23/05 lançado com sucesso no dashboard!`);
    
  } catch (err) {
    console.error("[Sync Avec Direto] Erro:", err);
    process.exit(1);
  }
  process.exit(0);
}

main();
