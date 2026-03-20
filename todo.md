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

## Evolução v4 - Meta/Dia Dinâmica e Categorias Editáveis

- [ ] Adicionar colunas cat1Nome..cat5Nome na tabela `empresas`
- [ ] Router empresa.atualizar para editar nome, cor, categorias e nomes das categorias
- [ ] Aba Empresas: formulário de edição de nomes das categorias (cat1..cat5)
- [ ] Dashboard por empresa: meta/dia necessária para quinzenal (baseada em faturado + dias úteis restantes até dia 15)
- [ ] Dashboard por empresa: meta/dia necessária para mensal (baseada em faturado + dias úteis restantes no mês)
- [ ] Indicador visual: meta/dia subiu ou desceu em relação à meta original
- [ ] FaturamentoForm: usar nomes de categorias dinâmicos da empresa
- [ ] Testes das novas procedures

## Evolução v5 - Login Próprio, Gestão de Utilizadores e Auditoria

- [ ] Adicionar campo `passwordHash` e `ativo` na tabela users
- [ ] Criar tabela `accessLogs` (id, userId, acao, ip, userAgent, createdAt)
- [ ] Migrar banco de dados
- [ ] Procedure `auth.loginComSenha` (email + senha, retorna JWT)
- [ ] Procedure `auth.logoutApp` limpa sessão e regista log
- [ ] Página de login com formulário email+senha
- [ ] Redirecionar para login quando não autenticado
- [ ] Procedure `admin.criarUsuario` (nome, email, senha, perfil, empresa)
- [ ] Procedure `admin.editarUsuario` (perfil, empresa, ativo)
- [ ] Procedure `admin.redefinirSenha` (nova senha)
- [ ] Procedure `admin.listarUsuarios` com último acesso
- [ ] Página AdminUsers atualizada com criação/edição inline e redefinição de senha
- [ ] Painel de auditoria (apenas owner): lista de acessos com IP, data, ação
- [ ] Testes das procedures de auth e admin

## Evolução v6 - Múltiplas Unidades por Utilizador e Bonificações

- [ ] Tabela `userEmpresas` (relação N:N entre users e empresas)
- [ ] Tabela `bonificacoes` (percentuais por empresa: pctQuinzenalSemMeta, pctQuinzenalComMeta, pctMensalSemMeta, pctMensalComMeta)
- [ ] Migrar banco de dados
- [ ] Router tRPC: listar/salvar bonificações por empresa (apenas admin)
- [ ] Router tRPC: calcular bonificação por empresa e mês (apenas gerente)
- [ ] Router tRPC: listar empresas do utilizador logado (via userEmpresas)
- [ ] AdminUsers: seleção de múltiplas unidades por utilizador (checkboxes)
- [ ] Dashboard: filtrar empresas exibidas pelas unidades do utilizador logado
- [ ] Aba Bonificação: visível apenas para gerentes, mostra valor calculado por unidade
- [ ] Config de bonificação na aba Empresas (apenas admin)
- [ ] Testes das novas procedures

## Evolução v7 - Categorias Dinâmicas e Unidade Obrigatória

- [ ] Tabela `categorias` no banco (id, empresaSlug, nome, ordem)
- [ ] Migrar dados existentes de cat1Nome..cat5Nome para tabela categorias
- [ ] Procedures tRPC: listar, adicionar, remover categorias por empresa
- [ ] Aba Empresas: interface para adicionar/remover categorias inline (gerente e admin)
- [ ] Formulário de lançamento usa categorias dinâmicas da empresa selecionada
- [ ] AdminUsers: campo "Unidade que trabalha" obrigatório no cadastro
- [ ] Testes das novas procedures de categorias

## Evolução v8 - SaaS Multi-Tenant

- [x] Tabela `tenants` (id, nome, slug, plano, ativo, adminEmail, createdAt)
- [x] Adicionar coluna `tenantId` em: users, empresas, categorias, metas, faturamentos, bonificacoes, userEmpresas, accessLogs
- [x] Migrar dados existentes do Barbiero Grupo para tenantId=1
- [x] Todas as procedures filtram automaticamente por tenantId do utilizador logado
- [x] Corrigir testes - controle de acesso por empresa vinculada (11 testes passando)
- [x] Tela de registo de novo tenant (nome da empresa, email admin, senha)
- [ ] Onboarding guiado após registo (criar primeira unidade + categorias)
- [x] Painel super-admin: listar tenants, activar/bloquear, ver estatísticas de uso
- [ ] Landing page de apresentação e venda do produto
- [x] Isolamento total: tenant A nunca acede dados do tenant B (verificado e corrigido)
- [x] Testes de isolamento multi-tenant (11 testes passando)
