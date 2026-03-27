# Auditoria UX/UI — Meta Dashboard (Estado Atual)

## Problemas Identificados

### 1. Header sobrecarregado
- 11+ botões no header (Sync CB, Profissionais, Sync Dpote, Novo Lançamento, tema, sair, Painel Admin)
- Botões técnicos (Sync CB, Sync Dpote) expostos para todos os usuários
- Filtros de período e mês no mesmo nível que ações críticas

### 2. KPIs sem hierarquia visual
- 4 cards de KPI com mesmo peso visual
- "Faturado no Mês" e "Meta Mensal Total" têm o mesmo tamanho que "Progresso Geral"
- Falta de destaque para o número mais importante

### 3. Cards de unidade muito densos
- Cada card tem 10+ métricas empilhadas verticalmente
- Dpote com toggles CashBarber/Manual visíveis para todos
- "Precisa/Dia" aparece 2x (mensal e quinzenal) sem contexto claro

### 4. Gráficos sem contexto
- Gráfico de linha sem valores no eixo Y visíveis
- Gráficos de pizza sem legenda clara
- Seção de "Categorias por empresa" muito técnica

### 5. Alertas enterrados no final
- Alertas aparecem depois de todos os dados — deveriam estar no topo
- Formato de texto puro, sem destaque visual

### 6. Ranking de profissionais desconectado
- Card pequeno no meio do dashboard
- Sem foto/avatar dos profissionais
- Sem contexto de meta individual

## Arquitetura de Informação Proposta

### Hierarquia visual (de cima para baixo):
1. **Barra de status rápido** (alertas críticos — topo, sempre visível)
2. **Hero KPIs** (faturamento total, % meta, projeção) — 3 números grandes
3. **Progresso por unidade** (barras horizontais simples)
4. **Cards de unidade** (resumo executivo, não técnico)
5. **Ranking de profissionais** (top 5 com barras)
6. **Gráficos** (linha de evolução + pizza de composição)
7. **Alertas detalhados** (expandíveis)

## Paleta de Cores Proposta (Premium Dark)
- Background: #0A0A0F (quase preto, azul-escuro)
- Surface: #12121A (cards)
- Surface elevated: #1A1A26 (hover, modais)
- Primary: #6366F1 (indigo — ações principais)
- Success: #10B981 (verde esmeralda — metas atingidas)
- Warning: #F59E0B (âmbar — atenção)
- Danger: #EF4444 (vermelho — abaixo da meta)
- Text primary: #F8FAFC
- Text secondary: #94A3B8
- Accent gold: #F59E0B (rankings, destaques)

## Tipografia
- Títulos: Space Grotesk (bold, moderno)
- Números: Inter (tabular, legível)
- Labels: Inter (regular, 12-14px)
