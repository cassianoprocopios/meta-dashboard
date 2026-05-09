import 'dotenv/config';
import { sincronizarFaturamentoCashbarber } from '../server/cashbarberSincronizador.ts';

const TENANT_ID = 1;
const MES = 5;
const ANO = 2026;

async function main() {
  for (const slug of ['barbiero-mascote', 'barbiero-morumbi']) {
    console.log(`\n=== Sincronizando ${slug} (${MES}/${ANO}) ===`);
    try {
      const resultado = await sincronizarFaturamentoCashbarber(TENANT_ID, slug, MES, ANO, 'manual');
      console.log(`✅ ${slug}: ${resultado.diasSincronizados} dias sincronizados, ${resultado.diasIgnorados} ignorados`);
      if (resultado.detalhes) {
        for (const d of resultado.detalhes) {
          if (d.status === 'sincronizado') {
            console.log(`  ${d.data}: cat1=${d.cat1?.toFixed(2)} cat2=${d.cat2?.toFixed(2)} cat3=${d.cat3?.toFixed(2)} cat4=${d.cat4?.toFixed(2)} cat7=${d.cat7?.toFixed(2)} cat8=${d.cat8?.toFixed(2)}`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Erro em ${slug}:`, err.message);
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
