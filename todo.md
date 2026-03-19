# Meta Dashboard - TODO

## Schema & Backend
- [x] Criar tabela `metas` (meta mensal por empresa por mês/ano)
- [x] Criar tabela `faturamentos` (registros diários por empresa com serviços, produtos, assinaturas, recorrência)
- [x] Criar procedures tRPC: listar, criar, atualizar, deletar faturamentos
- [x] Criar procedures tRPC: configurar e buscar metas mensais
- [x] Migrar banco de dados com pnpm db:push

## Frontend - Painel Principal
- [x] Layout com header e navegação por tabs
- [x] Página principal com seletor de mês/ano
- [x] Configuração de meta mensal por empresa
- [x] Indicador de progresso diário e mensal
- [x] Gráfico de barras por categoria (Serviços, Produtos, Assinaturas, Recorrência)
- [x] Gráfico de pizza composição do faturamento por empresa
- [x] Lista de alertas inteligentes

## Frontend - Entrada de Dados Diários
- [x] Formulário de lançamento diário por empresa
- [x] Campos: Serviços, Venda de Produtos, Novas Assinaturas, Recorrência
- [x] Edição de lançamentos existentes
- [x] Tabela de histórico diário com totais

## Testes
- [x] Testes das procedures de faturamento
- [x] Testes das procedures de metas
