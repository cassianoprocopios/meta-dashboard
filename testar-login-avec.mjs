import puppeteer from 'puppeteer';

async function testarLoginAvec() {
  const email = 'seraphinebeauty24@gmail.com';
  const senha = 'Dxj4oue@';
  
  console.log(`\n📊 Testando login no Avec`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${senha.substring(0, 3)}***`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Acessar página de login do Avec
    console.log(`\n1️⃣ Acessando https://www.avecsoft.com.br/...`);
    await page.goto('https://www.avecsoft.com.br/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Procurar pelo campo de email
    console.log(`\n2️⃣ Procurando campo de email...`);
    const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
    const emailInput = await page.$(emailSelector);
    
    if (!emailInput) {
      console.log(`❌ Campo de email não encontrado`);
      console.log(`   Seletores testados: ${emailSelector}`);
      
      // Listar todos os inputs da página
      const inputs = await page.$$('input');
      console.log(`   Inputs encontrados: ${inputs.length}`);
      
      for (let i = 0; i < Math.min(inputs.length, 5); i++) {
        const type = await inputs[i].evaluate(el => el.type);
        const name = await inputs[i].evaluate(el => el.name);
        const placeholder = await inputs[i].evaluate(el => el.placeholder);
        console.log(`   Input ${i}: type="${type}", name="${name}", placeholder="${placeholder}"`);
      }
      
      return;
    }
    
    console.log(`✅ Campo de email encontrado`);
    
    // Preencher email
    console.log(`\n3️⃣ Preenchendo email...`);
    await emailInput.type(email);
    console.log(`✅ Email preenchido`);
    
    // Procurar pelo campo de senha
    console.log(`\n4️⃣ Procurando campo de senha...`);
    const senhaSelector = 'input[type="password"]';
    const senhaInput = await page.$(senhaSelector);
    
    if (!senhaInput) {
      console.log(`❌ Campo de senha não encontrado`);
      console.log(`   Seletor testado: ${senhaSelector}`);
      return;
    }
    
    console.log(`✅ Campo de senha encontrado`);
    
    // Preencher senha
    console.log(`\n5️⃣ Preenchendo senha...`);
    await senhaInput.type(senha);
    console.log(`✅ Senha preenchida`);
    
    // Procurar e clicar no botão de login
    console.log(`\n6️⃣ Procurando botão de login...`);
    const loginButton = await page.$('button[type="submit"], button:contains("Entrar"), button:contains("Login")');
    
    if (!loginButton) {
      console.log(`❌ Botão de login não encontrado`);
      return;
    }
    
    console.log(`✅ Botão de login encontrado`);
    
    // Clicar no botão
    console.log(`\n7️⃣ Clicando no botão de login...`);
    await loginButton.click();
    
    // Aguardar resposta
    console.log(`\n8️⃣ Aguardando resposta do servidor...`);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
      console.log(`⚠️ Timeout na navegação (pode ser normal)`);
    });
    
    // Verificar se login foi bem-sucedido
    const url = page.url();
    console.log(`\n✅ URL após login: ${url}`);
    
    if (url.includes('login') || url.includes('signin')) {
      console.log(`❌ Login falhou - ainda na página de login`);
    } else {
      console.log(`✅ Login aparentemente bem-sucedido!`);
    }
    
  } catch (err) {
    console.error(`\n❌ Erro:`, err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testarLoginAvec().catch(console.error);
