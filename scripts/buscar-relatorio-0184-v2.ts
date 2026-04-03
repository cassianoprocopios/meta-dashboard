/**
 * Script para buscar o relatório 0184 (Faturamento por tipos de venda)
 * da Seraphine no Avec para o dia 02/04/2026
 * Usa avecBrowserLogin para obter cookies e depois acessa o relatório via HTTP
 */
import { avecBrowserLogin } from '../server/avecBrowser';
import { writeFileSync } from 'fs';

const email = 'seraphinebeauty24@gmail.com';
const senha = 'Seraphine@2024';
const dataIni = '02/04/2026';
const dataFim = '02/04/2026';

async function main() {
  console.log('Fazendo login no Avec...');
  const { cookies, salaoSlug } = await avecBrowserLogin(email, senha);
  console.log('Login OK. Cookies:', cookies.substring(0, 80) + '...');

  const baseUrl = `https://admin.avec.beauty/${salaoSlug}/admin`;

  // Tentar acessar o relatório 0184 via HTTP com os cookies
  const relUrl = `${baseUrl}/relatorio/0184?dataIni=${encodeURIComponent(dataIni)}&dataFim=${encodeURIComponent(dataFim)}`;
  console.log('Acessando relatório 0184:', relUrl);

  const resp = await fetch(relUrl, {
    headers: {
      'Cookie': cookies,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `${baseUrl}/`,
    },
    redirect: 'follow',
  });

  console.log('Status:', resp.status, resp.url);
  const html = await resp.text();
  writeFileSync('/tmp/avec-rel-0184-v2.html', html);
  console.log('HTML salvo. Tamanho:', html.length, 'chars');
  console.log('Primeiros 3000 chars:\n', html.substring(0, 3000));

  // Tentar também a API JSON do relatório
  const apiUrl = `${baseUrl}/relatorio/0184/dados?dataIni=${encodeURIComponent(dataIni)}&dataFim=${encodeURIComponent(dataFim)}`;
  console.log('\nTentando API JSON:', apiUrl);
  const apiResp = await fetch(apiUrl, {
    headers: {
      'Cookie': cookies,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Referer': relUrl,
    },
  });
  console.log('API Status:', apiResp.status, apiResp.url);
  const apiBody = await apiResp.text();
  writeFileSync('/tmp/avec-rel-0184-api.txt', apiBody);
  console.log('API body (primeiros 2000):\n', apiBody.substring(0, 2000));
}

main().catch(console.error);
