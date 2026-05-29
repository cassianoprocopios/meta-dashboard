import puppeteer from 'puppeteer';

const CASHBARBER_LOGIN = 'https://painel.cashbarber.com.br/login';
const CASHBARBER_RELATORIO = 'https://painel.cashbarber.com.br/relatorio/relatorio09';
const EMAIL = 'seraphinebeauty24@gmail.com';
const PASSWORD = '2@Seraphine';

async function extrairClientesPorMes(page, mes, ano) {
  console.log(`\n📊 Extraindo dados de clientes para ${mes}/${ano}...`);
  
  try {
    // Navegar para o relatório
    await page.goto(CASHBARBER_RELATORIO, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✓ Página de relatório carregada');
    
    // Aguardar o carregamento dos elementos
    await page.waitForTimeout(2000);
    
    // Procurar por filtros de período
    // Tentar encontrar inputs ou selects de data
    const filtroMes = await page.$('input[name="mes"]') || 
                      await page.$('select[name="mes"]') ||
                      await page.$('input[placeholder*="mês"]') ||
                      await page.$('input[placeholder*="Mês"]');
    
    const filtroAno = await page.$('input[name="ano"]') || 
                      await page.$('select[name="ano"]') ||
                      await page.$('input[placeholder*="ano"]') ||
                      await page.$('input[placeholder*="Ano"]');
    
    // Preencher filtros
    if (filtroMes) {
      await filtroMes.click();
      await filtroMes.type(String(mes).padStart(2, '0'));
      console.log(`✓ Mês ${mes} preenchido`);
    }
    
    if (filtroAno) {
      await filtroAno.click();
      await filtroAno.type(String(ano));
      console.log(`✓ Ano ${ano} preenchido`);
    }
    
    // Clicar em botão de filtrar/buscar
    const botoes = await page.$$('button');
    let botaoBuscar = null;
    
    for (const botao of botoes) {
      const texto = await page.evaluate(el => el.textContent, botao);
      if (texto.toLowerCase().includes('buscar') || 
          texto.toLowerCase().includes('filtrar') ||
          texto.toLowerCase().includes('pesquisar')) {
        botaoBuscar = botao;
        break;
      }
    }
    
    if (botaoBuscar) {
      await botaoBuscar.click();
      await page.waitForTimeout(3000);
      console.log('✓ Filtro aplicado');
    }
    
    // Extrair dados da tabela
    const dados = await page.evaluate(() => {
      const resultado = {};
      
      // Procurar por linhas de tabela
      const rows = document.querySelectorAll('table tbody tr, tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const unidade = cells[0]?.textContent?.trim() || '';
          const quantidade = parseInt(cells[1]?.textContent?.trim() || '0');
          
          // Verificar se é uma linha válida
          if (unidade && quantidade > 0 && !unidade.toLowerCase().includes('total')) {
            const unidadeNormalizada = unidade.toUpperCase();
            
            // Acumular se a unidade já existe
            if (resultado[unidadeNormalizada]) {
              resultado[unidadeNormalizada] += quantidade;
            } else {
              resultado[unidadeNormalizada] = quantidade;
            }
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
    await page.goto(CASHBARBER_LOGIN, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Procurar por campos de email e senha
    const emailInput = await page.$('input[type="email"]') || 
                       await page.$('input[name="email"]') ||
                       await page.$('input[placeholder*="email"]');
    
    const senhaInput = await page.$('input[type="password"]') || 
                       await page.$('input[name="password"]') ||
                       await page.$('input[placeholder*="senha"]');
    
    if (!emailInput || !senhaInput) {
      throw new Error('Não foi possível encontrar os campos de login');
    }
    
    await emailInput.type(EMAIL);
    await senhaInput.type(PASSWORD);
    
    console.log('✓ Credenciais preenchidas');
    
    // Clicar em login
    const botaoLogin = await page.$('button[type="submit"]') || 
                       await page.$('button:has-text("Login")') ||
                       await page.$('button:has-text("Entrar")');
    
    if (botaoLogin) {
      await botaoLogin.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      console.log('✓ Login realizado com sucesso\n');
    }
    
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
    
    // Salvar resultados em arquivo
    const fs = await import('fs').then(m => m.promises);
    await fs.writeFile(
      'dados-cashbarber-extraidos.json',
      JSON.stringify(resultados, null, 2)
    );
    console.log('\n✓ Dados salvos em dados-cashbarber-extraidos.json');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

sincronizarClientesHistorico();
