import puppeteer from 'puppeteer';

const CASHBARBER_URL = 'https://painel.cashbarber.com.br/relatorio/relatorio09';
const EMAIL = 'seraphinebeauty24@gmail.com';
const PASSWORD = '2@Seraphine';

async function extrairDadosHistorico() {
  let browser;
  try {
    console.log('🚀 Iniciando scraper do CashBarber...\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Aumentar timeout
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    console.log('📍 Acessando CashBarber...');
    await page.goto(CASHBARBER_URL, { waitUntil: 'networkidle2' });

    // Verificar se está na página de login
    const isLoginPage = await page.$('[type="email"]') !== null;
    
    if (isLoginPage) {
      console.log('🔐 Fazendo login...');
      
      // Preencher email
      await page.type('[type="email"]', EMAIL);
      await new Promise(r => setTimeout(r, 500));
      
      // Preencher senha
      await page.type('[type="password"]', PASSWORD);
      await new Promise(r => setTimeout(r, 500));
      
      // Clicar em login
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('✅ Login realizado');
    }

    // Aguardar carregamento da página
    await new Promise(r => setTimeout(r, 3000));

    // Procurar por dados de março, abril e maio
    const meses = ['março', 'abril', 'maio'];
    const dados = {};

    for (const mes of meses) {
      console.log(`\n📊 Procurando dados de ${mes}...`);
      
      // Tentar encontrar dados na página
      const conteudo = await page.content();
      
      if (conteudo.includes(mes) || conteudo.includes(mes.toUpperCase())) {
        console.log(`✅ Encontrado ${mes} na página`);
        
        // Tentar extrair números
        const regex = new RegExp(`${mes}[^0-9]*(\\d+)[^0-9]*(\\d+)`, 'gi');
        const matches = conteudo.match(regex);
        
        if (matches) {
          console.log(`📈 Dados encontrados:`, matches);
        }
      } else {
        console.log(`❌ ${mes} não encontrado na página`);
      }
    }

    // Tirar screenshot para debug
    console.log('\n📸 Salvando screenshot...');
    await page.screenshot({ path: '/tmp/cashbarber-relatorio09.png', fullPage: true });
    console.log('✅ Screenshot salvo em /tmp/cashbarber-relatorio09.png');

    // Extrair HTML para análise
    const html = await page.content();
    console.log('\n📄 Primeiros 2000 caracteres do HTML:');
    console.log(html.substring(0, 2000));

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

extrairDadosHistorico();
