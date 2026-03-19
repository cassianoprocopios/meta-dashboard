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

## Evolução v2 - Metas, Acesso e Categorias
- [x] Adicionar campo `metaQuinzenal` na tabela metas
- [x] Alterar colunas de faturamento para categorias por empresa (Morumbi/Mascote: avulso, produtos, servExtra, lavatorio, recorrencia; Seraphine: cabelo, unha, outros, produtos)
- [x] Adicionar campo `empresa` e `perfil` (gerente/operador) na tabela users
- [x] Migrar banco de dados com pnpm db:push
- [x] Tela de administração de usuários (apenas owner/admin pode criar e atribuir empresa+perfil)
- [x] Proteger routers de lançamento: apenas gerentes podem salvar
- [x] Filtrar dados por empresa do usuário logado (operador só vê sua unidade)
- [x] Formulário de lançamento com campos específicos por empresa
- [x] Dashboard com card de meta quinzenal
- [x] Cálculo de dias úteis restantes (até dia 15 e até fim do mês)
- [x] Alertas atualizados com base em dias úteis restantes
- [x] Testes das novas procedures

## Evolução v3 - Empresas Dinâmicas, Dias Úteis Manuais e Dashboard Melhorado
- [x] Criar tabela `empresas` no banco (nome, cor, categorias) gerenciada pelo admin
- [x] Adicionar campo `diasUteis` e `diasUteisQuinzenal` na tabela `metas` (manual por empresa)
- [x] Migrar banco de dados
- [x] Router tRPC: listar, criar e remover empresas (apenas admin)
- [x] Aba "Empresas" na navegação (apenas admin vê)
- [x] Formulário de adicionar empresa (nome, cor, tipo de categorias)
- [x] Botão de remover empresa com confirmação
- [x] Dias úteis editáveis no formulário de Metas (campo por empresa)
- [x] Remover card "Dias úteis passados" do dashboard
- [x] Card de média diária real por empresa no dashboard
- [x] Cards individuais de meta mensal e quinzenal por empresa
- [x] Cálculo de meta/dia baseado nos dias úteis manuais da empresa
- [x] Testes das novas procedures de empresas
