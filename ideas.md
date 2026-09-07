# Redesign Visual Light Premium — Meta Dashboard

## Objetivo

Transformar o sistema em um produto SaaS de gestão premium, claro e orientado a dados, sem alterar regras de negócio, permissões, rotas, integrações, consultas, mutations ou formatos de dados.

## Direção visual

O fundo principal será off-white frio, com superfícies brancas, bordas discretas e sombras suaves. A navegação usará azul-marinho profundo, enquanto verde sofisticado destacará ações, crescimento e metas atingidas. Âmbar sinalizará atenção e vermelho ficará restrito a erros ou situações críticas.

### Paleta-base

| Token | Uso | Valor de referência |
|---|---|---|
| Canvas | Fundo principal | `#F5F7FA` |
| Surface | Cards e painéis | `#FFFFFF` |
| Navy 950 | Sidebar | `#0B1830` |
| Navy 900 | Títulos institucionais | `#12233F` |
| Slate 700 | Texto secundário forte | `#334155` |
| Slate 500 | Texto secundário | `#64748B` |
| Border | Divisórias | `#E6EAF0` |
| Blue 600 | Ações e seleção | `#2563EB` |
| Emerald 600 | Sucesso e meta atingida | `#059669` |
| Amber 500 | Atenção e progresso intermediário | `#F59E0B` |
| Red 600 | Erros e risco crítico | `#DC2626` |

## Tipografia e densidade

Inter será a fonte principal para leitura e controles. Space Grotesk continuará reservada a números de indicadores e títulos de alto impacto. Cards terão raio entre 12 e 14 pixels, borda sutil, sombra curta e padding generoso. A interface evitará caixas aninhadas em excesso e usará divisores e espaçamento para criar agrupamento.

## Inventário funcional

Foram identificadas 28 páginas React, 43 componentes de domínio e uma biblioteca completa de componentes-base. As telas foram agrupadas para o redesign:

| Família | Páginas principais | Risco funcional |
|---|---|---|
| Autenticação | Login, Registro, Recuperação de senha, Tenant bloqueado | Médio: preservar sessão, redirects e validações |
| Dashboard executivo | Home, Análise IA, Histórico anual, Acurácia | Muito alto: preservar cálculos financeiros, filtros e queries |
| Metas e bonificações | Metas, Bonificação, Histórico de bonificações, Dpote | Muito alto: preservar regras de meta, Dpote e substituição pela Super Meta |
| Pessoas e performance | Profissionais, Ranking público, Ranking profissional, Performance, Relatórios | Muito alto: preservar rankings, PIN, filtros e sincronização |
| Operação | Lançamentos, Status de sync, Acesso de profissionais | Alto: preservar mutations, jobs, estados e feedbacks |
| Administração | AdminPanel, AdminDashboard, AdminUsers, Empresas, Auditoria, Vínculos | Muito alto: preservar isolamento multi-tenant e permissões |
| Plataforma | DevPanel, SuperAdmin, NotFound | Alto: preservar ações privilegiadas e gestão de contratos |

## Arquitetura visual

### Navegação

A sidebar existente será mantida como base técnica, porém receberá fundo navy, marca no topo, grupos com rótulos discretos, item ativo em azul/verde e modo recolhido. O menu móvel continuará funcional e será ajustado para priorizar Dashboard, Ranking, Lançamentos e Menu conforme o perfil.

### Header

O header global terá título contextual, seletor de unidade quando disponível, período, busca, notificações e perfil. A primeira fase preservará os controles existentes em seus locais e os reorganizará visualmente sem introduzir funções fictícias.

### Dashboard

KPIs serão apresentados como superfícies brancas com números grandes, contexto temporal, variação e ícone discreto. Os cards de unidade terão hierarquia clara: faturamento, progresso da meta, falta, média necessária, projeção e metas adicionais. Comparativos e gráficos terão mais espaço e menos cores simultâneas.

### Tabelas e formulários

Tabelas receberão cabeçalho claro, linhas com maior altura, hover suave, filtros alinhados, badges semânticos e ações compactas. Formulários usarão labels persistentes, campos claros, mensagens de erro próximas e feedback de salvamento.

## Regras de preservação

1. Nenhuma procedure, query, mutation, regra financeira, cálculo, permissão ou integração poderá ser removida.
2. Nenhum dado de demonstração será criado para preencher telas.
3. Não serão adicionadas páginas de Agenda ou Clientes que não existam no produto atual.
4. Cada mudança visual deve manter os mesmos eventos e parâmetros dos controles existentes.
5. Mudanças estruturais serão feitas por componentes reutilizáveis e tokens globais, reduzindo overrides específicos.
6. O redesign será validado em 1280×900, 1024×768, 768×1024 e 390×844.

## Estratégia de execução

O trabalho será realizado em camadas: Design System global; shell de navegação; dashboard principal; módulos financeiros; módulos de pessoas; administração; estados e responsividade. Cada camada será testada antes do checkpoint correspondente para limitar risco e facilitar rollback.

## Revisão visual da primeira implementação

A primeira validação visual confirmou o contraste correto entre navy institucional e superfícies claras, boa hierarquia e legibilidade. Foram incorporados três refinamentos: motivo analítico sutil no painel institucional, superfície branca mais definida para o formulário e linguagem de acesso mais executiva. O sistema evitará chamadas promocionais genéricas e reforçará metas, unidades, equipe, faturamento e decisão em sua comunicação.

A validação da área pública do profissional mostrou que o acesso por PIN precisava compartilhar a mesma assinatura institucional. A tela passou a usar superfície branca definida, marca Meta Dashboard explícita, linguagem de metas e desempenho e Space Grotesk nos números do teclado. Assim, o acesso profissional e o login administrativo pertencem ao mesmo produto sem perder suas funções distintas.

## Validação responsiva

As superfícies públicas foram verificadas em 1280×900, 768×1024 e 390×844. Login e acesso profissional preservaram hierarquia, área de toque, legibilidade e ausência de rolagem horizontal. A tela de PIN passou a usar um card institucional compacto no celular, enquanto o login mantém o painel executivo em desktop e prioriza o formulário em telas menores. Estados globais de erro foram revisados em código, pois a proteção de autenticação redireciona visitantes sem sessão antes de exibir rotas internas inválidas.
