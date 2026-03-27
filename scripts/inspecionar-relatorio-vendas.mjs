/**
 * Script para descobrir o endpoint do relatório financeiro/vendas por profissional no CashBarber
 * Usa api.cashbarber.com.br com Bearer token (igual ao cashbarber.ts)
 */

const BASE_API = 'https://api.cashbarber.com.br/api';
const EMAIL = 'barbierobarbearia@gmail.com';
const SENHA = '2@Barbiero';
const FILIAL_ID = 144; // Morumbi

async function login() {
  const resp = await fetch(`${BASE_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: SENHA, ctx: 'painel' }),
  });

  if (resp.status === 409) {
    const setCookie = resp.headers.get('set-cookie') || '';
    const m = setCookie.match(/access_token_painel=([^;]+)/);
    if (m) return m[1];
    // Forçar logout e re-login
    await fetch(`${BASE_API}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, ctx: 'painel' }) });
    await new Promise(r => setTimeout(r, 1000));
    const resp2 = await fetch(`${BASE_API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: SENHA, ctx: 'painel' }) });
    const setCookie2 = resp2.headers.get('set-cookie') || '';
    const m2 = setCookie2.match(/access_token_painel=([^;]+)/);
    if (!m2) throw new Error('Re-login falhou');
    return m2[1];
  }

  if (!resp.ok) throw new Error(`Login falhou: ${resp.status}`);
  const setCookie = resp.headers.get('set-cookie') || '';
  const m = setCookie.match(/access_token_painel=([^;]+)/);
  if (!m) throw new Error('Token não encontrado');
  return m[1];
}

async function get(path, token) {
  const resp = await fetch(`${BASE_API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  const body = await resp.text();
  return { status: resp.status, body };
}

async function main() {
  console.log('Fazendo login...');
  const token = await login();
  console.log('Login OK.\n');

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataInicio = `${ano}-${mes}-01`;
  const dataFim = `${ano}-${mes}-${dia}`;

  console.log(`Período: ${dataInicio} a ${dataFim} | Filial: ${FILIAL_ID}\n`);

  // Testar endpoints candidatos
  const endpoints = [
    // Relatórios numerados com parâmetros de data
    `/painel/relatorio/15?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/15?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}&profissional_id=0`,
    `/painel/relatorio/13?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/13?filial_id=${FILIAL_ID}&mes=${mes}&ano=${ano}`,
    `/painel/relatorio/14?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/16?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/17?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/18?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/19?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/20?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/21?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/22?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    // Endpoints com nome
    `/painel/relatorio/vendas?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/financeiro?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/profissional?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/barbeiro?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/comissao?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/relatorio/atendimento?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    // Listagem de profissionais
    `/painel/profissionais?filial_id=${FILIAL_ID}`,
    `/painel/profissional?filial_id=${FILIAL_ID}`,
    `/painel/barbeiros?filial_id=${FILIAL_ID}`,
    `/painel/colaboradores?filial_id=${FILIAL_ID}`,
    `/painel/profissionais/simpleList?filial_id=${FILIAL_ID}`,
    `/painel/profissionais/list?filial_id=${FILIAL_ID}`,
    // Faturamento por profissional
    `/painel/faturamento/profissional?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
    `/painel/vendas/profissional?filial_id=${FILIAL_ID}&data_inicio=${dataInicio}&data_fim=${dataFim}`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await get(ep, token);
      if (res.status === 200) {
        const body = res.body.trim();
        if (body.startsWith('{') || body.startsWith('[')) {
          const parsed = JSON.parse(body);
          const str = JSON.stringify(parsed).toLowerCase();
          const hasProfissional = str.includes('profissional') || str.includes('barbeiro') || str.includes('colaborador') || str.includes('prof_nome') || str.includes('bar_nome');
          console.log(`✅ ${ep}`);
          if (hasProfissional) {
            console.log(`   🎯 CONTÉM DADOS DE PROFISSIONAL!`);
            console.log(`   Amostra: ${JSON.stringify(parsed).slice(0, 600)}\n`);
          } else {
            const keys = Array.isArray(parsed) ? (parsed[0] ? Object.keys(parsed[0]) : []) : Object.keys(parsed);
            console.log(`   Keys: ${keys.join(', ')}`);
          }
        } else {
          console.log(`⚠️  ${ep} → 200 mas HTML`);
        }
      } else if (res.status !== 404) {
        console.log(`⚠️  ${ep} → ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ ${ep} → ${e.message}`);
    }
  }
}

main().catch(console.error);
