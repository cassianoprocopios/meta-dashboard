import puppeteer from 'puppeteer';

const CASHBARBER_URL = 'https://app.cashbarber.com.br/login';
const EMAIL = 'seraphinebeauty24@gmail.com';
const PASSWORD = '2@Seraphine';

async function extrairClientesPorMes(page, mes, ano) {
  console.log(`\n📊 Extraindo dados de clientes para ${mes}/${ano}...`);
  
  try {
    // Navegar para a página de relatórios
    await page.goto('https://app.cashbarber.com.br/relatorios/clientes-por-periodo', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✓ Página de relatórios carregada');
    
    // Aguardar o carregamento dos filtros
    await page.waitForTimeout(2000);
    
    // Preencher filtros de período
    // Procurar por inputs de data ou selects de mês/ano
    const mesSelect = await page.$('select[name="mes"]') || await page.$('input[placeholder*="mês"]');
    const anoSelect = await page.$('select[name="ano"]') || await page.$('input[placeholder*="ano"]');
    
    if (mesSelect) {
      await mesSelect.select(String(mes));
      console.log(`✓ Mês ${mes} selecionado`);
    }
    
    if (anoSelect) {
      await anoSelect.select(String(ano));
      console.log(`✓ Ano ${ano} selecionado`);
    }
    
    // Clicar em botão de filtrar/buscar
    const botaoBuscar = await page.$('button:has-text("Buscar")') || 
                        await page.$('button:has-text("Filtrar")') ||
                        await page.$('button[type="submit"]');
    
    if (botaoBuscar) {
      await botaoBuscar.click();
      await page.waitForTimeout(3000);
      console.log('✓ Filtro aplicado');
    }
    
    // Extrair dados da tabela
    const dados = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const resultado = {};
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          const unidade = cells[0]?.textContent?.trim() || '';
          const quantidade = parseInt(cells[1]?.textContent?.trim() || '0');
          
          if (unidade && quantidade > 0) {
            resultado[unidade.toUpperCase()] = quantidade;
          }
        }
      });
      
      return resultado;
    });
    
    console.log(`✓ Dados extraídos:`, dados);
    return dados;
    
  } catch (error) {
    console.error(`❌ Erro ao extrair dados de ${mes}/${ano}:`, error.message);
    return null;
  }
}

async function sincronizarClientesHistorico() {
  let browser;
  
  try {
    console.log('🚀 Iniciando sincronização de clientes histórico...\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Fazer login
    console.log('🔐 Fazendo login no CashBarber...');
    await page.goto(CASHBARBER_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Preencher email
    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    
    // Clicar em login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('✓ Login realizado com sucesso\n');
    
    // Extrair dados de março, abril e maio
    const meses = [
      { mes: 3, ano: 2026, nome: 'Março' },
      { mes: 4, ano: 2026, nome: 'Abril' },
      { mes: 5, ano: 2026, nome: 'Maio' }
    ];
    
    const resultados = {};
    
    for (const { mes, ano, nome } of meses) {
      const dados = await extrairClientesPorMes(page, mes, ano);
      if (dados) {
        resultados[`${nome}/${ano}`] = dados;
      }
    }
    
    console.log('\n📋 Resumo dos dados extraídos:');
    console.log(JSON.stringify(resultados, null, 2));
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

sincronizarClientesHistorico();
