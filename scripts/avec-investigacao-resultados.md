# Investigação do Avec - Resultados

## Conclusões

### O que o Avec mostra no Histórico de Caixas
- URL: `/admin/financeiro/caixa` → aba "Histórico de Caixas"
- Mostra caixas por responsável (Sabrina, Bruna, etc.)
- Cada caixa tem: TOTAL FATURADO por forma de pagamento (Dinheiro, Cartão Crédito, Débito, Pix, etc.)
- NÃO mostra categorias de serviço (Cabelo, Manicure, etc.)

### Dia 01/04/2026 - Caixas encontrados
- Sabrina: TOTAL FATURADO = R$ 3.092,00
- Bruna: TOTAL FATURADO = R$ 1.217,00
- Total do dia: R$ 4.309,00 (mas o sistema tem R$ 3.839 lançado manualmente)

### Comandas Finalizadas
- URL: `/admin/financeiro/comanda/finalizadas` → redireciona para o site público do Avec (terminal.avec.beauty)
- Mostra "Nenhum estabelecimento encontrado" - não é a tela correta

### Relatório de Serviços
- URL: `/admin/relatorio/servico` → carrega mas fica em "Buscando..."
- Parece ser um relatório que lista serviços realizados por profissional
- Pode ter dados por categoria de serviço

### Endpoints de API identificados
- `/admin/financeiro/contas-bancarias/getContasBancarias` → retorna contas bancárias
- `/admin/agenda/listarTodosProfissionaisComAgendaAndServicos` → lista profissionais com agenda
- `/admin/agenda/carregarAgenda` → carrega agenda
- `/admin/busca_intro` → busca introdutória

## Estratégia Alternativa

Como o Avec não tem um endpoint direto de faturamento por categoria, precisamos usar
uma abordagem diferente:

### Opção 1: Usar Comandas Finalizadas (via admin)
- Acessar `/admin/financeiro/comanda/finalizadas` no admin (não no terminal)
- Cada comanda tem serviços listados com categoria
- Somar por categoria

### Opção 2: Usar Relatório de Serviços
- `/admin/relatorio/servico` com filtro de data
- Interceptar a chamada de API que carrega os dados

### Opção 3: Usar o Histórico de Caixas + proporções manuais
- O histórico de caixas dá o total do dia
- Usar proporções históricas para distribuir por categoria
- Menos preciso mas mais simples

### Opção 4: Usar a AvecIA para extrair dados
- O Avec tem uma seção "AvecIA" que pode ter relatórios

## Próximos Passos

1. Investigar `/admin/financeiro/comanda/finalizadas` no admin (não no terminal)
2. Interceptar chamadas de API do relatório de serviços
3. Verificar se há endpoint de consultoria com dados por categoria
