import os
import re

pages_dir = "client/src/pages"
files_to_update = [
    "AcessoProfissionais.tsx",
    "AdminDashboard.tsx",
    "AdminPanel.tsx",
    "AdminUsers.tsx",
    "AnaliseIA.tsx",
    "Auditoria.tsx",
    "Bonificacao.tsx",
    "DpoteDistribuicao.tsx",
    "Empresas.tsx",
    "GestaoColaboradores.tsx",
    "HistoricoAcuracia.tsx",
    "HistoricoAnual.tsx",
    "HistoricoBonificacoes.tsx",
    "Profissionais.tsx",
    "RankingProfissional.tsx",
    "RankingPublico.tsx",
    "SyncStatus.tsx",
]

for file in files_to_update:
    filepath = os.path.join(pages_dir, file)
    if not os.path.exists(filepath):
        print(f"❌ {file} não encontrado")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Procurar por padrões de container principal com bg-background ou sem bg específico
    # Padrão 1: min-h-screen bg-background
    if 'min-h-screen bg-background' in content:
        content = content.replace('min-h-screen bg-background', 'min-h-screen bg-slate-950')
        print(f"✅ {file} - Aplicado bg-slate-950 (padrão 1)")
    # Padrão 2: min-h-screen sem bg
    elif 'min-h-screen flex' in content or 'min-h-screen' in content:
        content = re.sub(r'min-h-screen(?!\s+bg-)', 'min-h-screen bg-slate-950', content)
        print(f"✅ {file} - Aplicado bg-slate-950 (padrão 2)")
    else:
        print(f"⚠️  {file} - Nenhum padrão encontrado")
        continue
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("\n✨ Tema escuro aplicado em todas as páginas!")
