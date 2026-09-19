# Plano de evolução — Dashboard Gerencial

Branch de trabalho: `evolucao-dashboard-gerencial`

## Objetivo
Evoluir o Meta Dashboard sem reconstruir a aplicação e sem alterar a branch `main`, aproveitando faturamentos, metas, profissionais, clientes, integrações e histórico já existentes.

## Arquitetura funcional

### 1. Visão Geral
- filtro de ano/período;
- Todas as unidades ou uma unidade;
- faturamento acumulado;
- faturamento do mês;
- meta x realizado;
- clientes;
- ticket médio;
- vendas/serviços adicionais;
- evolução mensal;
- comparativo entre unidades.

### 2. Unidade
- indicadores acumulados no ano;
- evolução janeiro → mês atual;
- faturamento, clientes e ticket médio;
- meta x realizado;
- adicionais;
- ranking interno de profissionais;
- acesso ao detalhe de cada profissional.

### 3. Profissional
- faturamento acumulado;
- clientes atendidos;
- ticket médio;
- adicionais;
- evolução mensal;
- metas;
- histórico anual;
- comparação do profissional com sua própria evolução.

## Diretrizes técnicas
1. Preservar isolamento por `tenantId`.
2. Respeitar as unidades permitidas para cada usuário.
3. Não duplicar dados que já existem no schema.
4. Reaproveitar `meta.historicoAnual`, performance, clientes atendidos e faturamento por colaborador quando possível.
5. Extrair gradualmente responsabilidades do `Home.tsx` para componentes menores.
6. Manter integrações CashBarber/Avec/Dpote desacopladas da camada visual.
7. Nenhuma alteração desta branch deve ir para `main` sem validação.

## Achados da auditoria inicial
- `Home.tsx` concentra muitas responsabilidades e deve ser refatorado incrementalmente.
- `HistoricoAnual.tsx` já calcula faturamento mensal, meta, Super Meta e consolidado por unidade.
- `PerformanceProfissionais.tsx` já possui filtros por unidade e período e exportações.
- O backend já expõe rotas de performance, clientes atendidos e histórico.
- O schema já contém multi-tenant, empresas, metas, faturamentos, bonificações e integrações.
- A nomenclatura `SERAPHINE` ainda aparece na interface e deve ser tratada para exibição como Lephyne sem quebrar dados históricos.

## Primeira entrega técnica
Criar uma nova área de dashboard gerencial por componentes, inicialmente consumindo APIs existentes. Somente criar novos endpoints quando os indicadores não puderem ser derivados com segurança das rotas atuais.

## Critérios de validação
- Admin enxerga consolidado e unidades permitidas.
- Gerente não acessa unidade não autorizada.
- Totais do consolidado equivalem à soma das unidades filtradas.
- Filtro anual considera janeiro até o período selecionado.
- Indicadores do profissional batem com os dados de origem.
- Build, TypeScript e testes devem passar antes de merge.
