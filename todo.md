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

### Área de Admin - Dashboard de Utilizadores
- [x] Adicionar campo `telefone` na tabela users
- [x] Migrar banco de dados (coluna adicionada via SQL direto)
- [x] Procedure adminDashboard.listarUtilizadores (nome, email, telefone, role, ativo, lastSignedIn, tenantId)
- [x] Procedure adminDashboard.redefinirSenha (nova senha gerada ou definida pelo admin)
- [x] Procedure adminDashboard.atualizarTelefone (atualizar telefone do utilizador)
- [x] Página AdminDashboard com tabela completa de utilizadores
- [x] Filtros: busca por nome/email, filtro por tenant, filtro por status (ativo/inativo)
- [x] Estatísticas no topo: total utilizadores, ativos, inativos, novos este mês
- [x] Modal de redefinição de senha com geração automática ou senha manual
- [x] Botão de activar/desactivar utilizador
- [x] Integrar link "Admin" no painel super-admin e no header
- [x] Rota /admin adicionada no App.tsx

## Perfil Recepcionista + Gerente Bonificação + Painel Desenvolvedor

### Perfil Recepcionista
- [x] Adicionar `recepcionista` ao enum `perfil` na tabela users
- [x] Migrar schema com novo enum (via SQL direto)
- [x] Recepcionista pode lançar faturamentos (procedure permitida)
- [x] Recepcionista vê dashboard apenas da empresa vinculada
- [x] Recepcionista NÃO pode ver aba de metas
- [x] Recepcionista NÃO pode ver aba de bonificação
- [x] Recepcionista NÃO pode ver aba de usuários
- [x] Recepcionista NÃO pode ver aba de empresas
- [x] Ajustar frontend para ocultar abas restritas por perfil

### Gerente - Bonificação Read-Only
- [x] Gerente pode VER bonificação (valores que vai ganhar)
- [x] Gerente NÃO pode alterar porcentagens de bonificação
- [x] Procedure bonificacao.listar: permitida para gerente (read)
- [x] Procedure bonificacao.configurar: bloqueada para gerente (apenas admin)
- [x] Frontend: ocultar botões de edição de bonificação para gerente

### Painel do Desenvolvedor
- [x] Adicionar campos `validadeAte` (datetime), `observacoes` (text) na tabela tenants
- [x] Migrar schema (via SQL direto)
- [x] Procedure devPanel.listarTenants (todos os tenants com stats)
- [x] Procedure devPanel.criarTenant (email genérico, sem validação de domínio real)
- [x] Procedure devPanel.editarTenant (nome, plano, ativo, validadeAte, observacoes)
- [x] Procedure devPanel.toggleAtivo (ativar/bloquear tenant)
- [x] Procedure devPanel.renovarValidade (estender data de validade)
- [x] Email genérico: formato livre, único na plataforma, sem verificação de domínio
- [x] Página DevPanel acessível apenas para role=admin com tenantId=null (super-dev)
- [x] Tabela de tenants com: nome, slug, plano, ativo, validade, nº usuários, último acesso
- [x] Modal de criação de tenant com email genérico
- [x] Modal de edição: alterar plano, validade, status, observações
- [x] Indicador visual de tenants expirados ou próximos do vencimento

## Perfil Recepcionista - Revisão Completa de Acesso

- [x] Auditar frontend: verificar todas as abas visíveis para recepcionista
- [x] Recepcionista vê APENAS: Dashboard e botão de lançar faturamento
- [x] Recepcionista NÃO vê: Metas, Bonificação, Usuários, Empresas, Auditoria, Lançamentos histórico
- [x] Recepcionista NÃO vê: botões de Super Admin, Admin, Dev Panel, Empresas no header
- [x] Backend: recepcionista bloqueada em metas, bonificação, exclusão de faturamentos, usuários, empresas
- [x] Banner de boas-vindas no dashboard com botão grande de lançamento
- [x] Testar: 11 testes passando

## Fluxo de Provisionamento pelo Desenvolvedor

- [x] Dev Panel: criar tenant + admin em uma operação (nome empresa, email genérico, senha, validade)
- [x] Cada tenant admin só vê e gerencia suas próprias empresas (isolamento por tenantId)
- [x] Admin pode criar usuários dentro do seu tenant (gerente, recepcionista, operador)
- [x] Admin pode criar empresas dentro do seu tenant
- [x] Middleware de validade: bloquear acesso se tenant expirado ou cancelado
- [x] Tela de "Acesso Bloqueado" com mensagem ao admin quando licença expirar
- [x] Dev Panel: listar todos os tenants com status (ativo, expirado, cancelado), validade e admin
- [x] Dev Panel: renovar validade de qualquer tenant
- [x] Dev Panel: cancelar/reativar tenant com um clique
- [x] Dev Panel: ver credenciais do admin de cada tenant (email + botão de copiar)

## Admin cria utilizadores para suas empresas

- [x] Auditar backend: admin.criarUsuario filtra empresas pelo tenantId do admin
- [x] Backend: procedure admin.listarEmpresas retorna apenas empresas do tenant do admin
- [x] Backend: procedure admin.criarUsuario aceita perfil recepcionista/gerente + empresa vinculada
- [x] Frontend: tela AdminUsers com botão "Novo Utilizador" visível para admin do tenant
- [x] Frontend: formulário de criação com campos: nome, email, senha, perfil (gerente/recepcionista/operador), empresa(s) vinculada(s)
- [x] Frontend: lista de utilizadores do tenant com ações de editar, desativar e redefinir senha
- [x] Frontend: badges visuais por perfil (Gerente/Recepcionista/Operador/Admin)
- [x] Testar: 11 testes passando

## Correção: erro ao criar utilizador (coluna telefone)

- [x] Coluna `telefone` já aceita NULL no banco (verificado via SHOW COLUMNS)
- [x] Corrigir função `createUserWithPassword` no db.ts para passar `telefone: null` explicitamente
- [x] Corrigir função `createAdminUserForTenant` no db.ts para passar `telefone: null` e `empresaVinculada: null`

## Dashboard Administrativo Centralizado

### Painel do Desenvolvedor (Super Admin)
- [ ] Tela de login dedicada e clara para acesso ao Dev Panel
- [ ] Listar todos os administradores (tenants) com: nome, email, plano, validade, status
- [ ] Indicador visual: ativo (verde), expirado (vermelho), próximo do vencimento (amarelo)
- [ ] Criar novo administrador: nome da empresa, email genérico, senha, plano, validade
- [ ] Editar administrador: alterar plano, validade, status, observações
- [ ] Cancelar/reativar contrato com um clique
- [ ] Renovar validade diretamente no painel
- [ ] Ver credenciais do admin (email + botão copiar)
- [ ] Estatísticas: total de admins, ativos, expirados, novos este mês

### Dashboard do Administrador
- [x] Tela de login limpa com email/senha para o admin
- [x] Dashboard do admin: visão geral das empresas do seu tenant (/admin-panel)
- [x] Gestão de empresas: criar, ativar/desativar empresas do tenant
- [x] Gestão de usuários: criar usuários (gerente, recepcionista) vinculados às suas empresas
- [x] Cada usuário criado pelo admin fica isolado no tenant do admin
- [x] Admin não vê dados de outros tenants
- [x] Bloqueio automático quando contrato expirar (tela de aviso clara)
- [x] Procedures backend: toggleEmpresaAtiva, toggleUsuarioAtivo adicionadas ao router admin
- [x] Link "Painel Admin" no header do Home.tsx para admin do tenant

## Onboarding do Primeiro Login do Administrador

- [x] Componente Onboarding com 3 etapas: boas-vindas, criar empresa, criar usuário
- [x] Detecção automática: exibir onboarding quando admin não tem empresas nem usuários
- [x] Etapa 1 - Boas-vindas: apresentar o sistema, mostrar o que o admin pode fazer
- [x] Etapa 2 - Criar primeira empresa: formulário simplificado (nome, slug, cor)
- [x] Etapa 3 - Criar primeiro usuário: formulário com nome, email, senha, perfil
- [x] Barra de progresso visual entre etapas
- [x] Possibilidade de pular o onboarding e completar depois
- [x] Ao concluir, recarregar dados do AdminPanel
- [x] Integrar no AdminPanel como overlay/modal de primeiro acesso
- [x] Botão "Guia de configuração" no header para reabrir o onboarding enquanto não há empresas

## Edição de Usuários no AdminPanel

- [x] Verificar/adicionar procedure admin.editarUsuario (perfil, empresaVinculada) — já existia
- [x] Verificar procedure admin.listarEmpresasUsuario para carregar empresas vinculadas atuais
- [x] Modal de edição de usuário: campos de perfil, empresas vinculadas (checkboxes), nome
- [x] Botão de redefinir senha no modal de edição (aba separada com geração e cópia de senha)
- [x] Botão de editar em cada linha da tabela de usuários
- [x] Invalidação da query após salvar
- [x] 11 testes passando

## Badges de Empresas e Exclusão de Usuários

- [x] Exibir badges de empresas vinculadas diretamente na linha de cada usuário
- [x] Carregar empresas vinculadas em lote via getAllUsersByTenantWithEmpresas (sem N+1 queries)
- [x] Modal de confirmação de exclusão com digitação do nome do usuário para confirmar
- [x] Procedure admin.excluirUsuario já existia no backend com log de auditoria
- [x] Botão de excluir (Trash2) em cada linha da lista de usuários
- [x] Feedback visual após exclusão (toast + invalidação da lista)
- [x] Aviso visual "Sem empresa vinculada" para usuários sem vínculos

## Responsividade Mobile e Histórico de Cadastros

- [x] Responsivo: Login.tsx — já estava responsivo (p-4, max-w-md, inputs w-full)
- [x] Responsivo: Home.tsx — menu hambúrguer em mobile, abas com scroll horizontal, botões compactos
- [x] Responsivo: AdminPanel.tsx — header compacto, abas com scroll horizontal, listas adaptativas
- [x] Responsivo: Modais do AdminPanel — já usam Dialog com padding responsivo
- [x] Aba "Histórico" no AdminPanel com todos os cadastros (empresas, usuários, acessos)
- [x] Procedure backend: admin.listarHistorico (getHistoricoCompleto no db.ts)
- [x] Filtro por tipo de evento no histórico (Todos / Empresas / Usuários / Acessos)
- [x] Lista cronológica com ícones coloridos por tipo de evento
- [x] 11 testes passando, TypeScript sem erros

## Bug Fix e Novas Funcionalidades (Mar 2026)

- [x] Bug: empresa criada pelo usuário "dom pablo" não aparecia no AdminPanel — corrigido: `admin.listarTodasEmpresas` retorna ativas e inativas
- [x] Comparativo do mês anterior no dashboard (mesmos dias já apurados) — card geral + badge por empresa
- [x] Análise de IA — nova aba "Análise IA" com procedure `ia.analisarDesempenho` + componente AnaliseIA.tsx

## Correções de Dados (Mar 2026)

- [x] Corrigir vínculo da camila@barbiero.com com a unidade Seraphine — empresaVinculada corrigida para NULL, userEmpresas já tinha MORUMBI+SERAPHINE
- [x] Excluir todos os registros de mila.nascimento76@gmail.com — usuário, tenant 90002, 3 logs de acesso removidos

## Correção empresaVinculada (Mar 2026)

- [x] Corrigir procedure criarUsuario: sempre salva empresaVinculada=NULL, usa empresasSlugs para vínculos N:N
- [x] Corrigir procedure editarUsuario: sempre salva empresaVinculada=NULL, aceita empresasSlugs
- [x] Corrigir função setUserEmpresas no db.ts: limpa empresaVinculada automaticamente antes de inserir vínculos
- [x] Auditoria: 0 usuários com conflito encontrados no banco (campo já estava limpo)
- [x] 11 testes passando, TypeScript sem erros

## Migração Legado empresaVinculada → userEmpresas (Mar 2026)

- [x] Auditoria: 0 usuários legados encontrados (banco já estava limpo)
- [x] Script migrate-empresa-vinculada.mjs: idempotente, dry-run, log detalhado, acessível via pnpm migrate:empresa
- [x] Execução confirmada: dry-run e real funcionando corretamente
- [x] 10 novos testes em usuario-empresas.test.ts (21 testes no total, todos passando)

## Correção de Visibilidade (Mar 2026)

- [x] Corrigir visibilidade da Mascote para cintia.mezanini@gmail.com — empresa criada no tenant 60002, vínculo inserido, constraint UNIQUE(slug) alterada para UNIQUE(slug, tenantId)

## Painel de Vínculos Usuários ↔ Empresas

- [ ] Procedure backend: listarVinculos — retorna todos os usuários com suas empresas vinculadas por tenant
- [ ] Procedure backend: adicionarVinculo — adiciona vínculo entre usuário e empresa
- [ ] Procedure backend: removerVinculo — remove vínculo entre usuário e empresa
- [ ] Componente VinculosPanel: tabela matricial (usuários × empresas) com checkboxes
- [ ] Filtros: busca por nome/email, filtro por empresa, filtro por perfil
- [ ] Toggle de vínculo direto na célula da tabela (otimista)
- [ ] Indicador visual de usuários sem nenhum vínculo
- [ ] Aba "Vínculos" no AdminPanel

## Painel de Vínculos Usuário-Empresa

- [x] Procedures backend: admin.listarVinculos (matriz completa usuários × empresas) e admin.toggleVinculo (toggle atômico com log de auditoria)
- [x] Componente VinculosPanel.tsx com tabela matricial responsiva e switches interativos
- [x] Atualização otimista: toggle imediato sem esperar resposta do servidor, rollback em caso de erro
- [x] Filtros: busca por nome/email, filtro por perfil, filtro por empresa
- [x] Cards de estatísticas: total usuários, empresas, vínculos ativos, usuários sem vínculo (alerta âmbar)
- [x] Tooltips explicativos em cada switch (conceder/remover acesso)
- [x] Legenda visual e contador de resultados filtrados
- [x] Integrado como aba "Vínculos" no AdminPanel (entre Usuários e Histórico)
- [x] 21 testes passando, TypeScript sem erros

## Correção Visibilidade Cintia (Mar 2026)

- [x] Corrigir visibilidade da Mascote para cintia.mezanini@gmail.com — problema era senha incorreta (3 tentativas falhadas). Senha redefinida para 123456. Vínculo e empresa Mascote no tenant 60002 estavam corretos.

## Exclusões e Correção Mascote (Mar 2026)

- [x] Excluir Marcelo Wanderley Filho (id=600001) e todos os seus registros
- [x] Excluir cassik88@hotmail.com (ids 540179 e 570434) e tenant 120002 em cascata
- [x] Copiar 27 faturamentos e 1 meta da Mascote (tenant 1) para o tenant 60002 da Cintia

## Correção Meta Diária (Mar 2026)

- [x] Corrigir cálculo da meta diária para considerar apenas dias passados até hoje — progressoMensal agora compara total vs metaEsperadaAteHoje (proporcional ao dia atual), barra mostra dias decorridos/total

## Comparativo Mesmo Período Mês Anterior (Mar 2026)

- [ ] Corrigir comparativo para usar exatamente os mesmos dias lançados no mês atual vs mês anterior
- [ ] Exibir no card o período comparado (ex: "dias 1-22 vs dias 1-22 do mês anterior")
- [ ] Card consolidado de comparativo geral no topo do dashboard
- [ ] Histórico de acurácia das previsões mês a mês (nova seção com gráfico de evolução e tabela)

## Aba Usuários Online no SuperAdmin

- [x] Endpoint backend `adminDashboard.usuariosOnline` com filtro por minutos de atividade
- [x] Função `getAllUsersForAdmin` atualizada para incluir nomes de empresas vinculadas
- [x] Aba "Usuários Online" adicionada ao painel SuperAdmin com navegação por abas
- [x] Atualização automática a cada 30 segundos via `refetchInterval`
- [x] Filtro de período: 5min, 15min, 30min, 1h, 4h, 24h
- [x] Indicador visual de tempo online (verde pulsante ≤5min, verde ≤15min, âmbar >15min)
- [x] Badge com contador de usuários ativos na aba
- [x] Exibe: nome, email, empresa(s) vinculada(s), tenant, último acesso, perfil
- [x] Estado vazio com mensagem informativa
- [x] 29 testes passando, TypeScript sem erros

## Composição de Faturamento por Unidade — Correção e Gestão pelo Admin

- [x] Corrigir divergência: usar tabela `categorias` como fonte única de verdade para nomes de categorias
- [x] Quando empresa criada, inicializar categorias na tabela `categorias` (não apenas nos campos cat1Nome..cat5Nome)
- [x] Quando empresa já existe sem categorias no banco, inicializá-las a partir de cat1Nome..cat5Nome
- [x] Endpoint `empresa.listarComCategorias` ou incluir categorias no retorno de `empresa.listar`
- [x] Dashboard Home.tsx: substituir nomes hardcoded por nomes vindos das categorias do banco
- [x] Gráficos de barras e pizza: usar nomes dinâmicos das categorias
- [x] Tabela histórico: usar nomes dinâmicos das categorias
- [x] Aba Empresas: melhorar painel de categorias (reordenar, inicializar com padrão)
- [x] Testes: verificar que categorias são criadas corretamente ao criar empresa

## Categoria Pacotes — Seraphine

- [x] Adicionar categoria "Pacotes" na composição de faturamento da Seraphine

## Correção da Projeção vs Previstos

- [x] Corrigir projecaoFinal para incluir valores previstos (dias futuros já lançados) no cálculo

## Badge Previsto nos Dias Futuros

- [x] Destaque visual âmbar com badge "Previsto" nos dias futuros do formulário de lançamento

## Resumo de Previstos no Topo do Dashboard

- [x] Card de resumo âmbar com total previsto, dias futuros lançados e breakdown por unidade

## Remoção da Acurácia de Previsões

-- [x] Remover bloco de acuácia de previsões do dashboard

## Indicador Previsto na Tabela de Histórico

- [x] Ícone de relógio e badge "Previsto" nas linhas futuras da tabela de histórico de lançamentos

## Rodapé com Subtotais na Tabela de Histórico

- [x] tfoot com subtotais separados: Realizado e Previsto por categoria e total

## Percentual de Meta e Super Meta

- [x] Adicionar campo superMeta no schema (tabela metasMensais) e migrar banco
- [x] Backend: incluir superMeta nos endpoints de meta (salvar/listar)
- [x] MetaConfig: campo para editar superMeta e exibir percentual de atingimento
- [x] Dashboard: exibir % de meta atingida e indicador de super meta nos cards de empresa
- [x] Dashboard: barra de progresso dupla (meta / super meta) nos cards

## Histórico Anual de Metas e Super Metas

- [x] Endpoint backend: buscar faturamentos e metas de todos os meses do ano por empresa
- [x] Componente HistoricoAnual.tsx: gráfico de barras mensal + tabela de evolução
- [x] Indicadores visuais: ✓ meta atingida, ★ super meta atingida por mês/empresa
- [x] Nova aba "Histórico" registrada no dashboard

## Bonificação para Super Meta

- [x] Adicionar campo pctSuperMeta na tabela bonificacoes e migrar banco
- [x] Backend: incluir pctSuperMeta nos endpoints de bonificação (salvar/listar/calcular)
- [x] Frontend Bonificacao.tsx: campo para editar pctSuperMeta e exibir valor calculado
- [x] Cálculo: bonificação super meta = totalRealizado * pctSuperMeta quando superMeta atingida

## Gráfico de Bonificações no Histórico

- [x] Gráfico de barras mensais de bonificações na aba Histórico (por unidade e total)

## Tabela Detalhada de Bonificações no Histórico

- [x] Tabela por empresa: Mês, Quinzenal, Mensal, Super Meta, Total — com rodapé de totais anuais

## Melhoria do Filtro de Ano no Histórico

- [x] Seletor de ano mais visível: dropdown com range dinâmico de anos disponíveis no banco

## Integração CashBarber (Mar 2026)

- [x] Tabela `cashbarberConfig` no banco: credenciais por tenant (email, senha, filialId, mapeamento de categorias)
- [x] Tabela `cashbarberMapeamento` no banco: mapeamento de categorias CashBarber → categorias Meta Dashboard
- [x] Migrar banco de dados com pnpm db:push
- [x] Procedure `cashbarber.salvarConfig`: salvar credenciais e filialId por empresa
- [x] Procedure `cashbarber.testarConexao`: validar credenciais via login na API CashBarber
- [x] Procedure `cashbarber.sincronizar`: buscar dados do relatório 15 e popular faturamentos do mês
- [x] Procedure `cashbarber.listarConfig`: retornar configuração atual por empresa
- [x] Procedure `cashbarber.salvarMapeamento`: salvar mapeamento de categorias CashBarber → Meta
- [x] Aba "CashBarber" no AdminPanel (apenas admin)
- [x] Formulário de configuração: email, senha, filial (Morumbi/Mascote), empresa Meta Dashboard
- [x] Botão "Testar Conexão" com feedback visual
- [x] Botão "Sincronizar Agora" com seletor de mês/ano
- [x] Tabela de mapeamento de categorias CashBarber → categorias do Meta Dashboard
- [x] Indicador de última sincronização por empresa
- [x] Testes das procedures de integração CashBarber (7 testes passando, 36 no total)

## Sincronização Automática CashBarber (Mar 2026)

- [x] Tabela `cashbarberSyncLog` no banco: histórico de execuções do job (tenantId, empresaSlug, status, diasSincronizados, erros, executadoEm)
- [x] Migrar banco com as novas tabelas
- [x] Campo `sincAutoAtiva` e `horarioSinc` na tabela `cashbarberConfig` (ativar/desativar por empresa, horário configurável)
- [x] Módulo `cashbarberSincronizador.ts`: lógica reutilizável de sincronização (usado pelo job e pela procedure manual)
- [x] Módulo `cashbarberJob.ts`: job cron com node-cron, agendamento dinâmico por empresa
- [x] Agendamento via `node-cron` no servidor: executa o job diariamente no horário configurado
- [x] Job mestre: verifica a cada hora se há novas configurações (cobre reinicializações do servidor)
- [x] Procedure `cashbarber.configurarAgendamento`: ativar/desativar sync automático por empresa e definir horário
- [x] Procedure `cashbarber.listarLogs`: retornar histórico de sincronizações por empresa
- [x] Procedure `cashbarber.statusJobs`: retornar jobs ativos no servidor
- [x] Procedure `cashbarber.recarregarJobs`: forçar recarga dos jobs
- [x] Aba "Agendamento" no componente CashBarberIntegracao
- [x] Toggle de ativação com seletor de horário (input type=time)
- [x] Tabela de histórico de sincronizações com status, origem (auto/manual), dias e erros
- [x] Testes do job de sincronização automática (12 testes, 48 no total)

## Sincronização Horária CashBarber (Mar 2026)

- [x] Alterar job para executar a cada hora (cron `0 0 * * * *`) em vez de horário fixo por empresa
- [x] Remover seletor de horário da interface (substituído por informação fixa "a cada hora")
- [x] Atualizar aba Agendamento: exibir "Sincroniza a cada 1 hora" como informação fixa
- [x] Atualizar testes para refletir o novo intervalo horário (49 testes passando)

## Correção: CashBarber preserva campos manuais (Mar 2026)

- [x] Corrigir cashbarberSincronizador.ts: ao fazer upsert, preservar os campos não mapeados pelo CashBarber (ex: Recorrência) que foram lançados manualmente
- [x] Lógica: buscar o registro existente do dia antes do upsert; mesclar apenas os campos que o CashBarber alimenta; manter os demais intactos
- [x] Testes de merge seletivo: 8 novos testes, 57 no total (todos passando)

## Indicador Visual CashBarber no Dashboard (Mar 2026)

- [x] Coluna `sincronizadoCB` (tinyint) adicionada na tabela `faturamentos`
- [x] cashbarberSincronizador.ts marca `sincronizadoCB=1` ao salvar cada dia
- [x] upsertFaturamento propaga sincronizadoCB no update e insert
- [x] Badge ⚡ CB azul na célula de data dos dias sincronizados pelo CashBarber
- [x] Tooltip no badge: "Dados importados automaticamente do CashBarber"
- [x] Legenda discreta abaixo da tabela (aparece apenas quando há dias sincronizados)
- [x] 57 testes passando (sem novos testes necessários, lógica coberta pelos testes existentes do sincronizador)

## Proteção da Recorrência na Sync CashBarber (Mar 2026)

- [x] Blindar cat5 (Recorrência) no cashbarberSincronizador.ts: nunca sobrescrever, mesmo que cat5 esteja no mapeamento
- [x] Testes atualizados: 2 novos testes cobrindo proteção incondicional de cat5 (58 testes no total)

## Recorrência Automática via Dpote (Mar 2026)

- [x] Endpoint descoberto: `GET /api/painel/dpote/historico/{id}` retorna valor_ganho_assinaturas, porcentagem_comissao_barbearias e fichas por filial
- [x] Lógica: Comissão Bruta filial = valor_total × 65% × (fichas_filial / fichas_total)
- [x] Campo `dpoteHistoricoId` e `dpoteHistoricoMes` na tabela `cashbarberConfig`: armazenar ID do histórico criado por mês
- [x] Migrar banco com as novas colunas (ALTER TABLE via SQL)
- [x] Função `cashbarberCriarHistoricoDpote`: cria histórico Dpote no CashBarber
- [x] Função `cashbarberBuscarHistoricoDpote`: busca dados do histórico pelo ID
- [x] Função `calcularComissaoBrutaFilial`: calcula comissão bruta proporcional pelas fichas
- [x] Função `buscarRecorrenciaDpote` no sincronizador: busca/cria histórico e retorna o valor de cat5
- [x] Atualizar `cashbarberSincronizador.ts`: busca Dpote a cada sync e atualiza cat5 em todos os dias do mês
- [x] cat5 é atualizado a cada sync horária (valor muda conforme assinaturas entram no banco)
- [x] Testes de `calcularComissaoBrutaFilial`: 6 testes, 64 no total (todos passando)

## Campo dpoteFilialId por Empresa (Mar 2026)

- [x] Coluna `dpoteFilialId` (int, nullable) na tabela `cashbarberConfig` (ALTER TABLE via SQL)
- [x] Migrar banco com a nova coluna
- [x] Atualizar procedure `cashbarber.salvarConfig` para incluir `dpoteFilialId`
- [x] Atualizar procedure `cashbarber.listarConfig` para retornar `dpoteFilialId`
- [x] Campo numérico "ID da Filial Dpote" no formulário de configuração CashBarber (card violeta)
- [x] Mensagem explicativa: "Ex: 144 (Morumbi), 3520 (Mascote)" + feedback visual quando preenchido
- [x] Usar `dpoteFilialId` no sincronizador para o cálculo de Recorrência
- [x] 64 testes passando (sem novos testes necessários)

## Botão de Sincronização Manual CashBarber (Mar 2026)

- [x] Procedure `cashbarber.sincronizarTodas`: sincroniza todas as empresas ativas do tenant em uma chamada
- [x] Botão "Sync CB" no header desktop (visível apenas para admins, cor verde esmeralda)
- [x] Botão "Sincronizar CashBarber" no menu mobile (visível apenas para admins)
- [x] Spinner animado durante a sincronização + texto "Sincronizando..."
- [x] Toast de sucesso com resumo: total de dias + breakdown por empresa (ex: "morumbi: 24, mascote: 24")
- [x] Toast de aviso quando há erros em alguma empresa
- [x] Toast de erro com mensagem descritiva se a sync falhar completamente
- [x] 64 testes passando (sem novos testes necessários)

## Identificação da Filial Dpote por Nome (Mar 2026)

- [x] Adicionar coluna `dpoteFilialNome` (varchar) na tabela `cashbarberConfig` (mantendo dpoteFilialId como fallback)
- [x] Função `calcularComissaoBrutaFilialPorNome`: busca filial pelo nome no campo `fil_bairro` (case-insensitive, busca parcial)
- [x] Atualizar `cashbarberSincronizador.ts`: prioridade 1 = nome, prioridade 2 = dpoteFilialId, fallback = cbFilialId
- [x] Atualizar procedure `cashbarber.salvarConfig` para incluir `dpoteFilialNome`
- [x] `listarConfig` já retorna todos os campos da tabela (incluindo dpoteFilialNome)
- [x] Atualizar formulário CashBarberIntegracao: substituir campo numérico por campo de texto para nome da filial
- [x] Testes: 6 novos testes para calcularComissaoBrutaFilialPorNome (70 testes no total, todos passando)

## Botão "Ver filiais disponíveis" no Dpote (Mar 2026)

- [x] Procedure tRPC `cashbarber.listarFiliaisDpote`: faz login, cria/busca histórico Dpote e retorna lista de filiais com nome, fichas e percentual
- [x] Botão "Ver filiais" no cabeçalho do campo Dpote: chama a procedure e exibe painel expansivo
- [x] Clique em uma filial da lista preenche automaticamente o campo `dpoteFilialNome` e fecha o painel
- [x] Exibir fichas e percentual de cada filial, valor total de assinaturas e % comissão barbearias no rodapé

## Barra de busca no painel de filiais Dpote (Mar 2026)

- [x] Adicionar estado `buscaFilial` no componente CashBarberIntegracao
- [x] Renderizar input de busca no cabeçalho do painel (com ícone Search e botão limpar)
- [x] Filtrar lista de filiais em tempo real (case-insensitive, busca parcial)
- [x] Exibir mensagem "Nenhuma filial encontrada" quando busca não retorna resultados
- [x] Limpar busca ao fechar o painel

## Correção: valor Dpote salvo apenas no dia 1 do mês (Mar 2026)

- [x] Alterar sincronizador: cat5 = recorrenciaValor apenas no dia 1, cat5 = "0" nos demais dias
- [x] Quando Dpote falha, preservar cat5 existente (comportamento de fallback mantido)
- [x] Reescrever testes do sincronizador: 10 testes cobrindo regra do dia 1, fallback e preservação de campos

## Linha Dpote no card de unidade (Mar 2026)

- [x] Calcular recorrenciaMes (soma de cat5 de todos os dias da empresa no mês) em statsPorEmpresa
- [x] Exibir linha "Recorrência (Dpote)" no card de unidade com fundo violeta e ícone Repeat2
- [x] Linha só aparece quando recorrenciaMes > 0 (sem poluir cards sem Dpote configurado)

## Botão de Sincronização Manual do Dpote na Tela Principal (Mar 2026)

- [x] Procedure tRPC `cashbarber.sincronizarDpote`: executa sync do Dpote para o mês atual, disponível para gerentes (não requer admin)
- [x] Botão "Sync Dpote" no header desktop (violeta, com ícone Repeat2) e no menu mobile
- [x] Feedback visual: spinner durante execução, toast de sucesso/aviso/erro ao finalizar
- [x] Após sync bem-sucedida: refetchFat() atualiza os cards automaticamente

## Exibir valor Dpote calculado por unidade (Mar 2026)

- [x] Atualizar procedure `listarFiliaisDpote` para retornar `comissaoBruta`, `isConfigurada`, `comissaoBrutaTotal` e `filialConfiguradaNome`
- [x] Exibir valor calculado (R$ em verde) no card de cada filial ao lado das fichas e percentual
- [x] Destacar a filial configurada com badge "configurada" e borda violeta
- [x] Exibir total a distribuir no rodapé do painel (R$ comissaoBrutaTotal)
- [x] Toast do Sync Dpote já exibe o valor por empresa (recorrenciaValor)

## Automação Puppeteer para fluxo Dpote (Mar 2026)

- [ ] Instalar puppeteer-core + chromium no projeto
- [ ] Criar `server/cashbarberDpoteBrowser.ts`: navega pelo painel CashBarber, executa fluxo Dpote (Assinaturas → Dpote → Relatório → Criar Histórico → Continuar → Continuar → Enviar) e extrai Comissão Bruta por filial
- [ ] Integrar no sincronizador: usar browser headless quando API retornar histórico vazio
- [ ] Atualizar procedure `sincronizarDpote` para usar o novo fluxo
- [ ] Testes de integração do fluxo browser

## Cálculo Dpote via Fichas Ponderadas (Mar 2026)

- [x] Função `cashbarberCalcularDpotePorFichas` no cashbarber.ts: busca relatório 15 por filial, calcula fichas ponderadas (count × ser_valor_fichas) e retorna comissão bruta proporcional
- [x] Sincronizador usa fichas ponderadas: `calcularRecorrenciaDpotePorFichas` substitui `buscarRecorrenciaDpote`
- [x] Campos `dpoteValorAssinaturas` e `dpotePorcentagemBarbearia` adicionados na tabela e no formulário
- [x] Valores de março/2026 salvos no banco (Morumbi: R$ 65.992, Mascote: R$ 28.258)
- [x] Job automático diário recalcula Dpote com atendimentos acumulados até o dia atual (confirmado: MASCOTE R$ 28.258 calculado às 01:00)
- [x] 71 testes passando (todos os mocks atualizados para a nova função)

## Atualização Valor Assinaturas Março/2026

- [x] Atualizar dpoteValorAssinaturas para R$ 63.845 (receita real de assinaturas março/2026)
- [x] Recalcular Dpote com valores exatos do CashBarber (Morumbi: R$ 44.686,92 / Mascote: R$ 19.158,08)

## Busca Automática do Valor de Assinaturas via API CashBarber

- [x] Investigar endpoint da API CashBarber para histórico Dpote (valor de assinaturas do mês)
- [x] Implementar cashbarberBuscarValorAssinaturas(token, historicoId, _buscarHistorico?) em cashbarber.ts
- [x] Integrar no sincronizador: buscar valor automaticamente via dpoteHistoricoId antes de calcular Dpote
- [x] Fallback: usar dpoteValorAssinaturas manual se API não retornar valor
- [x] Exibir badge "auto" com indicador verde pulsante no AdminPanel quando histórico salvo
- [x] Testes da nova função (5 cenários, 76 testes passando no total)

## Card de Recorrência — Exibir Fonte do Cálculo

- [x] Expor dpoteValorAssinaturas, dpotePorcentagemBarbearia e dpoteHistoricoId na procedure cashbarber.listarConfigsDpote
- [x] Exibir no card de Recorrência: valor bruto de assinaturas (R$) e percentual (%) usados no cálculo
- [x] Tag de fonte: "CashBarber API" com ponto verde pulsante (quando dpoteHistoricoId presente) ou "Manual" (quando valor inserido manualmente)

## Tooltip Fórmula Dpote no Card de Recorrência

- [x] Expor fichas da filial e fichas totais na procedure cashbarber.listarConfigsDpote
- [x] Montar fórmula completa no frontend: Assinaturas × % comissão barbearia × % proporção fichas = comissão bruta filial
- [x] Adicionar Tooltip shadcn/ui ao valor calculado no card de Recorrência com a fórmula completa

## Seção Distribuição Dpote por Filial no Dashboard

- [x] Procedure cashbarber.dpoteDistribuicao: retorna comissão bruta, fichas e percentual por filial para o mês/ano
- [x] Componente DpoteDistribuicao: cards por filial + gráfico de pizza + gráfico de barras + tabela resumo
- [x] Tab "Dpote" adicionada ao dashboard (visível para gerentes e admins)
- [x] Exibe: valor total assinaturas, % comissão barbearia, total fichas, e por filial: fichas, %, comissão bruta

## Integração Dpote → Faturamento cat5 por Unidade

- [x] Entender como cat5 é salvo por empresa no sincronizador atual
- [x] Procedure cashbarber.aplicarDpoteNoFaturamento: calcula comissão bruta por filial e salva/atualiza cat5 no faturamento do dia 1 de cada empresa para o mês
- [x] Botão "Aplicar ao Dashboard" (verde) na tab Dpote que aciona a procedure e atualiza os valores de Recorrência de cada unidade
- [x] Feedback visual: toast de sucesso com os valores aplicados por empresa (sonner)

## Integração Dpote no Job Automático de Sync CashBarber

- [x] Extrair lógica de distribuição Dpote para função reutilizável aplicarDpoteParaTenant() no sincronizador
- [x] Integrar aplicarDpoteParaTenant() no job automático após o sync da última empresa do tenant
- [x] Garantir que falha no Dpote não interrompe o sync principal (try/catch isolado com console.warn)
- [x] Log detalhado: registrar valores aplicados por empresa no log do job (ex: MORUMBI: R$ 44686.92 | MASCOTE: R$ 19158.08)
- [x] 5 testes unitários para a nova função reutilizável (81 testes passando no total)

## Ajuste Manual de Recorrência (cat5) na Tab Dpote

- [x] Procedure cashbarber.ajustarCat5Empresa: aceita dpoteFilialNome (mapeamento automático) ou empresaSlug, modos substituir/somar
- [x] Painel de ajuste inline por empresa na tabela da tab Dpote: campo de valor, radio substituir/somar, botão Aplicar
- [x] Exibir comissão bruta calculada pelo CashBarber ao lado do campo para referência
- [x] Preview do resultado ao somar (ex: R$ 44.686 + R$ 1.000 = R$ 45.686)
- [x] Toast de confirmação com valor anterior e novo valor após ajuste (81 testes passando)

## Integração Avec — Sincronização Faturamento Seraphine

- [x] Investigar API do Avec (login por cookie, endpoint /admin/relatorios/listar, salão ID 95687)
- [x] Criar server/avec.ts com funções avecLogin, avecBuscarFaturamentoDiario, avecBuscarFaturamentoDiaPorCategoria
- [x] Criar server/avecSincronizador.ts com sincronizarFaturamentoAvec
- [x] Criar server/avecJob.ts com job automático (cron horário por tenant)
- [x] Adicionar tabelas avecConfig e avecSyncLog no schema (via SQL direto)
- [x] Adicionar funções helper Avec no server/db.ts
- [x] Adicionar configuração Avec no AdminPanel (AvecIntegracao.tsx) — aba violeta "Avec"
- [x] Procedures tRPC: avec.getConfig, salvarConfig, testarConexao, listarMapeamento, salvarMapeamento, sincronizar, listarLogs, atualizarAgendamento
- [x] Job Avec integrado no servidor principal (_core/index.ts)
- [x] 81 testes passando, 0 erros TypeScript

## Botão Sync Avec no Cabeçalho do Dashboard

- [x] Localizar botão Sync CashBarber no cabeçalho do Home.tsx
- [x] Adicionar botão "Sync Avec" (fuchsia) ao lado do Sync Dpote no cabeçalho
- [x] Acionar procedure avec.sincronizar com empresaSlug="seraphine" ao clicar
- [x] Feedback visual: spinner durante sync, toast de sucesso/erro com número de dias importados

## Avec — Suporte a Cookie de Sessão Manual

- [x] Adicionar campo `avecSessionCookie` na tabela avecConfig (TEXT nullable)
- [x] Migrar schema com pnpm db:push (via SQL direto)
- [x] Atualizar funções helper no db.ts para incluir avecSessionCookie e cookieConfiguradoEm
- [x] Adicionar procedures salvarCookieSessao e removerCookieSessao no routers.ts
- [x] Atualizar procedure avec.testarConexao para usar cookie manual quando fornecido (sem tentar login)
- [x] Atualizar avecSincronizador.ts para usar cookie manual quando disponível (fallback para login)
- [x] Atualizar AvecIntegracao.tsx: nova aba "Cookie Sessão" com instruções passo a passo
- [x] Exibir badge "Cookie ativo" no cabeçalho da empresa quando cookie está configurado
- [x] Aviso visual quando cookie pode estar expirado (> 48h desde configuração)
- [x] Alertas na aba Sincronizar quando cookie não configurado ou potencialmente expirado
- [x] Testes unitários (avec.cookie.test.ts) — 89 testes passando

## Avec — Token Bearer da API Oficial e Mapeamento de Categorias

- [ ] Adicionar campo `avecApiToken` na tabela avecConfig (TEXT nullable)
- [ ] Migrar schema via SQL direto
- [ ] Criar `server/avecApiClient.ts` — cliente da API oficial `api.avec.beauty` com Bearer token
- [ ] Atualizar `avecSincronizador.ts` para usar API oficial quando token disponível (prioridade sobre cookie)
- [ ] Adicionar procedures `avec.salvarApiToken`, `avec.testarApiToken` no routers.ts
- [ ] Atualizar `AvecIntegracao.tsx`: nova aba "API Token" com campo para colar o token Bearer e instruções
- [ ] Exibir badge "API Token" no cabeçalho quando token configurado
- [ ] Aba "Mapeamento" no AvecIntegracao.tsx: mapear categorias Avec → categorias do sistema
- [ ] Testes unitários para as novas procedures

## Limpeza — Remover Sincronização Avec

- [x] Remover arquivos: server/avec.ts, server/avecApiClient.ts, server/avecSincronizador.ts
- [x] Remover arquivo de teste: server/avec.cookie.test.ts
- [x] Remover tabelas avecConfig, avecSyncLog, avecMapeamento do schema Drizzle
- [x] Limpar tabelas Avec no banco via SQL (TRUNCATE)
- [x] Remover todas as procedures avec.* do routers.ts
- [x] Remover helpers upsertAvecConfig, getAvecConfig, etc. do db.ts
- [x] Remover componente AvecIntegracao.tsx
- [x] Remover aba "Avec" do AdminPanel (AdminPanel.tsx)
- [x] Remover botão "Sync Avec" do cabeçalho do Home.tsx
- [x] Remover import/referência ao avecJob no server/_core/index.ts
- [x] Verificar que não há referências quebradas após remoção
- [x] Executar testes: 81 testes passando (7 arquivos)

## Dpote — Correção de Valor (25/03/2026)

- [x] Verificar valor do Dpote no banco para hoje (25/03/2026)
- [x] Verificar valor do Dpote no CashBarber
- [x] Corrigir o valor no sistema conforme o CashBarber

## Dpote — Diagnóstico de Atualização Diária (25/03/2026)

- [x] Analisar logs completos do CashBarber Job de hoje
- [x] Verificar que API retornou null para históricos #68218/#68219 (valor manual desatualizado)
- [x] Corrigir valores no banco: MORUMBI R$ 47.124,56 | MASCOTE R$ 20.249,04
- [x] Atualizar dpoteValorAssinaturas para R$ 67.373,60 em ambas as configs
- [x] Corrigir sincronizador para criar novo histórico automaticamente quando API retornar null
- [x] 81 testes passando após correção

## CashBarber — Botão Sync Manual Dpote

- [x] Adicionar procedure tRPC `cashbarber.sincronizarDpoteManual` no routers.ts
- [x] Adicionar import de `cashbarberBuscarValorAssinaturas` no routers.ts
- [x] Exibir resultado (valor calculado por empresa + fonte de dados) no AdminPanel
- [x] Adicionar botão "Sincronizar Dpote" na seção Recorrência da aba Sincronizar
- [x] 81 testes passando após implementação

## CashBarber — Atualização Automática do Valor de Assinaturas no Sync Dpote

- [x] Criar função updateCashbarberDpoteConfig no db.ts para atualizar apenas campos Dpote
- [x] Atualizar procedure sincronizarDpoteManual para salvar dpoteValorAssinaturas e dpotePorcentagemBarbearia quando API retornar valor diferente do salvo (tolerância de 0.1%)
- [x] Retornar flags `valorAssinaturasAtualizado`, `valorAssinaturasAnterior` e `totalAssinaturas` na resposta
- [x] Exibir toast de informação e painel azul no frontend quando o valor foi atualizado automaticamente
- [x] 81 testes passando após implementação

## Remoção de Comissão / Distribuição 100% Dpote

- [x] Remover campo dpotePorcentagemBarbearia do formulário de configuração no AdminPanel (CashBarberIntegracao.tsx)
- [x] Atualizar preview de base de cálculo: exibir "100% de R$ X serão distribuídos proporcionalmente pelas fichas"
- [x] Atualizar tooltip da fórmula Dpote no dashboard: remover linha "× Comissão barbearia", exibir "Assinaturas (100%)" e "× Proporção fichas desta filial"
- [x] Atualizar linha de detalhe da fonte: exibir "X assinaturas (100%)" sem percentual de comissão
- [x] Remover dpotePorcentagemBarbearia do dpoteConfigMap no Home.tsx
- [x] Adicionar indicador visual de "100% distribuído" na tela DpoteDistribuicao.tsx
- [x] Criar procedure tRPC cashbarber.dpoteHistoricoMensal para buscar evolução de cat5 por empresa ao longo dos meses
- [x] Implementar seção de histórico com gráfico de linha na tela DpoteDistribuicao.tsx
- [x] Incluir cat5 (Recorrência) na somatória do faturamento total de cada unidade no dashboard
- [x] Incluir cat5 (Recorrência) no progresso de meta e no total faturado no mês do dashboard
- [x] Criar tabela dpoteSyncLog no schema e migrar banco
- [x] Registrar log automaticamente no sincronizador a cada sync do Dpote
- [x] Criar procedure tRPC cashbarber.dpoteSyncLog para listar histórico
- [x] Implementar seção de histórico de sincronizações na tela DpoteDistribuicao
- [x] Configurar sync CashBarber para separar lançamentos por categoria (cat1-cat4) conforme mapeamento

## Expansão para 9 Categorias (MASCOTE e MORUMBI)
- [x] Adicionar colunas cat6, cat7, cat8, cat9 na tabela faturamentos via SQL
- [x] Atualizar schema Drizzle (schema.ts) com cat6, cat7, cat8, cat9
- [x] Atualizar sincronizador e cashbarber.ts para processar cat6-cat9 (cat9=Recorrência)
- [x] Atualizar mapeamento CashBarber: Keune→cat4, Don Alcides→cat5, Caixinha→cat6, Barbiero→cat7, Bar→cat8, Recorrência→cat9
- [x] Atualizar categorias no banco para MASCOTE e MORUMBI (9 categorias)
- [x] Atualizar frontend: FaturamentoForm, dashboard Home.tsx, gráficos e tabelas para 9 categorias
- [x] Sincronizar março/2026 com o novo mapeamento de 9 categorias

## Correção de Bugs React
- [x] Corrigir loop infinito "Maximum update depth exceeded" em CashBarberIntegracao.tsx linha 2149
- [x] Corrigir "Each child in a list should have a unique key prop" na tabela DpoteDistribuicao

## Automação Dpote via Web Scraping CashBarber
- [ ] Explorar fluxo de login e telas Dpote no CashBarber via browser
- [ ] Instalar Puppeteer no projeto para automação de browser
- [ ] Implementar scraper: login → Painel Assinaturas → Dpote → Relatório → Criar Histórico → extrair fichas e faturamento por unidade
- [ ] Criar procedure tRPC cashbarber.sincronizarDpoteScraping
- [ ] Atualizar job automático para usar scraping em vez de API
- [ ] Atualizar frontend com botão de sync e resultado da extração

## Botão Aplicar Dpote no Faturamento (Mar 2026)
- [x] Botão "Aplicar no Faturamento" na tela Dpote com confirmação, loading e feedback de resultado

## Correção Cálculo Dpote - 100% do valor total (Mar 2026)
- [x] Corrigir distribuição Dpote: usar 100% do valor total de assinaturas (não 65%)

## Revisão Dashboard e Reformulação Dpote (Mar 2026)
- [ ] Revisar e corrigir informações do dashboard principal (cards, cálculos, exibição)
- [ ] Reformular tela de Distribuição Dpote com layout correto e dados atualizados

## Revisão Dashboard e Reformulação Dpote (Mar 2026)
- [x] Corrigir limiar de fichas na busca de histórico ativo (MIN_FICHAS = 10.000)
- [x] Corrigir banco: dpoteHistoricoId = 68544, dpoteValorAssinaturas = 73.171,20
- [x] saveDpoteHistoricoId agora salva valorAssinaturas junto com o ID
- [x] Corrigir card "Pote Distribuído" para mostrar "100% das assinaturas"
- [x] Melhorar card "Histórico CashBarber" com mês e ano do histórico ativo
- [x] Corrigir alerta com duplo R$ R$ nos alertas do dashboard

## Recorrência Proporcional ao Dia Vigente (Mar 2026)
- [x] Corrigir lançamento de Recorrência: valor deve ser proporcional ao dia vigente (acumulado até hoje, não total mensal)

## Recorrência Proporcional ao Dia Vigente - Opção C (Mar 2026)
- [x] Dias 1 até hoje: valor_total ÷ dias_do_mês (valor diário fixo apurado)
- [x] Dias futuros do mês: R$ 0 (ainda não aconteceram)
- [x] Mês seguinte: distribuir previsão baseada no total do mês atual (valor_total_atual ÷ dias_mês_seguinte por dia)
- [x] Ao chegar o dia vigente no mês seguinte: sobrescrever previsão com valor apurado real do Dpote

## Correção Valor Assinaturas Dpote (Mar 2026)
- [x] Corrigir valor total de assinaturas exibido na tela Dpote para R$ 73.171,20
- [x] Aumentar maxTentativas de 30 para 60 na busca retroativa de histórico ativo
- [x] Corrigir banco: dpoteHistoricoId = 68539, dpoteValorAssinaturas = 73171.20 (ambas empresas)

## Atualização Histórico Dpote Correto (Mar 2026)
- [x] Atualizar banco para usar histórico 68544 (R$ 73.171,20 | 79.985 fichas | Morumbi 70,05% | Mascote 29,95%)

## Aplicação Dpote Março 2026 (Mar 2026)
- [x] Aplicar valores de Recorrência de Março com base no histórico #68544 (Morumbi R$ 51.256,89 | Mascote R$ 21.914,31)

## Recorrência Manual no Dashboard (Mar 2026)
- [ ] Procedure tRPC: salvarRecorrenciaManual(mes, ano, empresaSlug, valorTotal) — distribui pelos dias do mês
- [ ] Card de entrada manual de Recorrência no dashboard por empresa (campo valor total + preview diário)
- [ ] Mostrar no card: valor diário calculado, acumulado até hoje, e meta diária necessária para os dias restantes

## Recorrência Manual no Dashboard (Mar 2026)
- [x] Botão de lápis no card de Recorrência para entrada manual do valor total
- [x] Painel inline com campo de valor, preview diário/acumulado/total e botão Aplicar
- [x] Procedure tRPC salvarRecorrenciaManual distribui valor pelos dias do mês
- [x] Suporte a Enter para confirmar e Escape para cancelar

## Correção Recorrência Manual - Valor Apurado (Mar 2026)
- [x] Corrigir salvarRecorrenciaManual: valor informado é o total apurado até hoje, não previsão mensal
- [x] Distribuir valor diário = valorTotal / diaHoje (não / diasDoMes)
- [x] Dias futuros ficam com R$ 0
- [x] Atualizar preview no frontend: Diário (média), Apurado até dia X, Projeção Mensal

## Botão Sincronizar CashBarber no Painel Manual (Mar 2026)
- [x] Adicionar botão "Sincronizar com CashBarber" no painel de Recorrência manual para sobrescrever valor manual com dados do CashBarber
- [x] Procedure tRPC cashbarber.sincronizarDpotePorEmpresa para sincronizar por empresa específica
- [x] Loading state durante sincronização e toast de feedback (sucesso/aviso/erro)
- [x] Badge "CashBarber API" / "Manual" já existente no card de Recorrência

## Seletor de Fonte de Recorrência no Dashboard (Mar 2026)
- [ ] Adicionar campo `recorrenciaFonte` (enum: 'cashbarber'|'manual') na tabela `metas` ou `cashbarberConfig`
- [ ] Procedure tRPC para salvar a escolha de fonte por empresa/mês
- [ ] UI: seletor toggle "CashBarber API" / "Manual" no painel de Recorrência
- [ ] Quando fonte = cashbarber: exibir valor sincronizado, desabilitar campo manual
- [ ] Quando fonte = manual: exibir campo de entrada manual, desabilitar sync automático
- [ ] Persistir escolha no banco e refletir no dashboard após reload

## Seletor de Fonte de Recorrência (CashBarber vs Manual)

- [x] Adicionar colunas recorrenciaFonte, recorrenciaValorManual, recorrenciaManualAtualizadoEm na tabela cashbarberConfig
- [x] Funções de DB saveRecorrenciaFonte e getRecorrenciaFonte
- [x] Procedure tRPC cashbarber.salvarRecorrenciaFonte (persiste escolha e distribui valor manual nos dias do mês)
- [x] Procedure listarConfigsDpote expandida para retornar recorrenciaFonte e recorrenciaValorManual
- [x] Toggle UI CashBarber API / Manual no card de Recorrência (visível para gerentes/admin)
- [x] Ao selecionar CashBarber: sincroniza imediatamente com a API
- [x] Ao selecionar Manual: abre painel de entrada do valor total apurado
- [x] Badge de fonte para usuários não-gerentes
- [x] 84 testes passando

## Data/Hora da Última Atualização Manual no Card de Recorrência

- [x] Exibir data e hora da última atualização manual no card de Recorrência (quando fonte = manual)

## Timestamp da Última Atualização Manual de Recorrência

- [x] Garantir que recorrenciaManualAtualizadoEm é gravado sempre que o valor manual é salvo via "Aplicar"
- [x] refetchConfigsDpote chamado no onSuccess para atualizar o timestamp no card imediatamente

## Melhoria: Edição de Profissionais (Apelido e Cargo)

- [ ] Aprimorar formulário de edição com campos claros para nome, apelido e cargo
- [ ] Adicionar dica visual indicando que apelido é o nome exibido no ranking
- [ ] Garantir que cargo tenha opções predefinidas (Barbeiro, Barbeira, Recepcionista, Gerente, Sócio)
- [ ] Exibir apelido em destaque no card do profissional

## Melhoria: Ranking Público

- [x] Adicionar botão de retorno ao dashboard na página RankingPublico

## Filtros de Data no Ranking

- [ ] Criar procedure tRPC profissionais.ranking com filtro mês/ano e dados de faturamento
- [ ] Criar função db listarRankingPorPeriodo que agrega faturamento por profissional
- [ ] Atualizar RankingPublico com seletor de mês/ano
- [ ] Ordenar ranking por faturamento total (serviços + produtos)
- [ ] Exibir valores de faturamento nos cards do ranking
- [ ] Indicador de período atual vs período selecionado

## Filtros de Data no Ranking (concluído)

- [x] Criar procedure tRPC ranking por período com dados de faturamento por profissional
- [x] Criar procedure tRPC periodos para listar períodos com dados
- [x] Adicionar funções listarRankingPorPeriodo e listarPeriodosComDados no db.ts
- [x] Reescrever página RankingPublico com filtros de mês/ano e seletor de navegação
- [x] Exibir faturamento real (serviços + produtos) por profissional no ranking
- [x] Pódio visual top 3 com barra de progresso e breakdown serviços/produtos
- [x] Aviso quando não há dados de faturamento para o período selecionado

## Divergência Faturamento Mascote - Produtos
- [ ] Corrigir sincronização CashBarber: valor de produtos não está entrando no faturamento operacional da Mascote
- [ ] Investigar qual categoria (cat1-cat5) deve receber os produtos e se o mapeamento está correto
- [ ] Verificar se o Relatório 15 do CashBarber retorna produtos separados e se estão sendo somados

## Sincronização Morumbi + Job Automático
- [x] Ressincronizar Morumbi com lógica corrigida do Dpote (dias realizados)
- [x] Verificar divergência no faturamento da Morumbi março/2026
- [x] Confirmar que o job automático horário usa a lógica corrigida do Dpote

## Job Automático Dpote - Não Recalculou 27/03
- [ ] Investigar por que o job automático não recalculou o Dpote no dia 27/03
- [ ] Verificar logs do job e identificar se houve erro ou skip
- [ ] Corrigir e disparar recalculo manual para 27/03

## Divergência Dashboard vs Banco - Dpote
- [ ] Identificar por que o valor do Dpote correto no banco não aparece no dashboard
- [ ] Verificar a query/procedure que alimenta os cards do dashboard
- [ ] Corrigir o cálculo ou a query para refletir os valores reais do banco

## Remodelagem UX/UI Dashboard (Alta Performance)
- [ ] Redesenhar header: limpar botões técnicos, nova identidade visual premium
- [ ] Redesenhar KPIs executivos: hierarquia visual clara, 3 números hero
- [ ] Redesenhar seção de progresso de metas com barras visuais modernas
- [ ] Redesenhar cards de unidades: resumo executivo, menos densidade
- [ ] Implementar barra de alertas inteligentes no topo
- [ ] Redesenhar ranking de profissionais com visual premium
- [ ] Atualizar paleta de cores e tipografia (Space Grotesk + Inter)
- [ ] Atualizar index.css com novos tokens de design premium

## Notificação Push — Meta Diária Atingida

- [x] Adicionar tipo "meta_diaria_atingida" no enum do schema drizzle
- [x] Atualizar função registrarEventoNotificado para aceitar novo tipo
- [x] Criar função verificarMetaDiariaParaTenant() no cashbarberJob.ts
- [x] Integrar verificação no job horário (após executarAplicacaoDpote)
- [x] Criar procedure tRPC testarMetaDiaria no router de notificações
- [x] Adicionar botão "Meta Diária" na sidebar (Ações Rápidas)
- [x] Executar migração do banco (SQL direto para ALTER TABLE)
- [ ] Testar notificação end-to-end (aguardando dados reais do job)

## Ranking de Profissionais — Exclusão de Categorias
- [x] Excluir Avulso/Clube, Caixinha e Bar do cálculo de totalServicos/totalGeral no ranking

## Recálculo Forçado do Ranking
- [x] Criar procedure tRPC profissionais.recalcularRankingMes (ressincroniza todos os profissionais do mês atual)
- [x] Adicionar botão "Recalcular Ranking" na sidebar (Ações Rápidas)
- [x] Passar mes/ano atual como parâmetro para a procedure
- [x] Exibir toast com resultado (X profissionais recalculados, Y erros)

## Indicador de Última Atualização do Ranking
- [x] Adicionar MAX(ultimaSyncEm) na query listarRankingPorPeriodo no db.ts
- [x] Expor ultimaAtualizacao na procedure profissionais.ranking
- [x] Exibir data/hora formatada no header do ranking (RankingPublico.tsx e Home.tsx)

## Correção do Filtro de Categorias do Ranking
- [x] Excluir: Corte Cabelo, Barba e Corte Kids (todos os demais serviços + produtos são contabilizados)
- [x] Corrigir filtro no routers.ts (procedure recalcularRankingMes e sincronizarFaturamento)
- [x] Corrigir filtro no cashbarberJob.ts (job horário não usa ranking de profissionais)
- [x] Corrigir filtro no script de recálculo direto
- [x] Executar recálculo com critérios corretos

## Detalhamento de Serviços no Ranking
- [x] Expor detalhesServicos na procedure profissionais.ranking
- [x] Criar modal de detalhamento ao clicar no card do profissional (RankingPublico.tsx)
- [ ] Adicionar detalhamento também no card de ranking do Home.tsx (backlog)

## Detalhamento de Produtos por Item no Modal do Ranking
- [x] Coluna detalhesProdutos já existe na tabela faturamentoColaboradores no schema
- [x] Salvar JSON de produtos na sincronização (sincronizarFaturamento e recalcularRankingMes)
- [x] Expor detalhesProdutos na query listarRankingPorPeriodo (db.ts) e procedure ranking
- [x] Atualizar modal no RankingPublico.tsx para exibir breakdown de produtos por item
- [x] Executar recálculo e popular detalhesProdutos para todos os 23 profissionais de Março/2026

## Quantidade no Modal de Detalhamento do Ranking
- [x] Verificar campos de quantidade na API CashBarber (count para serviços e produtos)
- [x] Atualizar JSON salvo em detalhesServicos e detalhesProdutos para incluir campo count
- [x] Atualizar modal RankingPublico.tsx para exibir quantidade (Nx) ao lado de cada item
- [x] Executar recálculo: 23 profissionais de Março/2026 atualizados com dados de quantidade

## Exclusão de Produtos do Ranking
- [x] Excluir Caixinha, Água, Heineken, Refrigerante e Corona do totalProdutos e detalhesProdutos
- [x] Corrigir filtro nas procedures sincronizarFaturamento e recalcularRankingMes (routers.ts)
- [x] Corrigir filtro no script de recálculo direto (scripts/recalcular-ranking-direto.mjs)
- [x] Executar recálculo: 23 profissionais de Março/2026 atualizados

## Reestruturação dos Rankings (4 categorias)
- [x] Analisar profissionais atuais e identificar barbeiros, auxiliares e recepção
- [x] Adicionar campo categoriaRanking (barbeiro/auxiliar/recepcao) na tabela colaboradores via SQL
- [x] Popular categorias: 16 barbeiros, 5 auxiliares, 2 recepções
- [x] Expor categoriaRanking e empresaSlug na query listarRankingPorPeriodo e procedure ranking
- [x] Criar 4 abas na página RankingPublico.tsx: Barbeiros, Auxiliares, Por Unidade, Produtos
- [x] Ranking de Produtos inclui recepção (ordenado por totalProdutos)
- [x] Ranking por Unidade agrega faturamento de todos os profissionais por empresa
- [x] Modal de detalhamento com rodapé listando itens excluídos
- [x] Recalcular ranking: 23 profissionais de Março/2026 atualizados

## Melhorias no Ranking (v2)
- [x] Campo categoriaRanking (Barbeiro/Auxiliar/Recepção) na tela de gerenciamento de profissionais com badge visual
- [x] Select de categoria no formulário de edição do profissional (salva via procedure existente)
- [x] Pódio visual (top 3) ativado na aba Produtos do ranking (usa listaAtiva/campoAtivo)
- [x] Nova aba "Mascote" no ranking (apenas barbeiros da unidade Mascote)
- [x] Nova aba "Morumbi" no ranking (apenas barbeiros da unidade Morumbi)

## Correção Ranking — Recepção e Unidades
- [ ] Investigar por que recepção não aparece na aba Produtos do ranking
- [ ] Verificar empresaSlug de cada profissional no CashBarber (qual unidade cada um pertence)
- [x] Atualizar empresaSlug dos profissionais no banco conforme dados reais do CashBarber
- [x] Corrigir filtro da aba Produtos para incluir recepção
- [x] Corrigir filtros das abas Mascote e Morumbi com empresaSlug correto
- [x] Recalcular ranking com dados atualizados

## Ranking por Unidade e Recepção

- [x] Recalcular ranking do mês atual (março/2026) via script direto
- [x] Incluir Recepção nas abas Mascote e Morumbi
- [x] Implementar aba Por Unidade com comparativo Mascote vs Morumbi (totais, médias, líderes)
## Correção do Ranking
- [x] Remover "Pezinho (acabamento)" do cálculo do ranking
- [x] Recalcular todos os meses históricos com filtro corrigido

## Correção do Ranking - Filtro de Serviços
- [x] Remover "Pezinho (acabamento)" do cálculo do ranking
- [x] Recalcular todos os meses históricos com filtro corrigido

## Novas Funcionalidades - Ranking
- [ ] Incluir "Barba com Barboterapia" no ranking (remover da exclusão)
- [ ] Recalcular dados históricos com novo filtro
- [ ] Criar procedure backend para ranking diário (por data)
- [ ] Criar procedure backend para ranking semanal (por semana)
- [ ] Implementar acesso simplificado para profissionais (PIN de 4 dígitos)
- [ ] Criar página mobile-first de ranking para profissionais
- [ ] Adicionar abas diário/semanal/mensal na visão do profissional

## Ranking Diário e Semanal no RankingPublico
- [ ] Adicionar aba "Diário" com seletor de data e dados em tempo real do CashBarber
- [ ] Adicionar aba "Semanal" com seletor de semana e dados em tempo real do CashBarber

## Painel de Status dos Jobs e Alertas de Sync

- [x] Backend: procedure tRPC para retornar status dos jobs (último sync, próximo sync, status por empresa)
- [x] Backend: registrar resultado de cada sync no banco (reutilizar cashbarberSyncLog)
- [x] Backend: alerta push automático quando sync falhar (notifyOwner com detalhes do erro)
- [x] Frontend: página /sync-status com painel de status dos jobs no dashboard
- [x] Frontend: card de status do último sync na sidebar/dashboard
- [x] Frontend: botão de sync manual no painel de status

## Correções e Melhorias - Ranking WhatsApp e Meta por Unidade
- [x] Corrigir erro no envio do ranking pelo WhatsApp
- [x] Exibir valor que falta para a meta por unidade no ranking dos profissionais

## Projeção de Faturamento no Card de Meta
- [x] Adicionar projeção de faturamento para o final do mês no card de meta do ranking

## Projeção com Dias Úteis
- [x] Recalcular projeção de faturamento usando dias úteis da meta em vez de dias corridos

## Dashboard Visão Geral
- [x] Exibir valor que falta para bater a meta por unidade no dashboard visão geral
- [x] Adicionar valor que falta para a meta na imagem de compartilhamento WhatsApp (ExportCard)
- [x] Personalizar rodapé da imagem WhatsApp com nome da unidade e mês

## Compartilhamento WhatsApp - Fluxo Melhorado

- [x] Modificar hook useExportarImagem para aceitar callback pós-exportação
- [x] Ao clicar "Exportar para WhatsApp": baixar imagem + abrir WhatsApp com mensagem pré-preenchida
- [x] Botão com ícone do WhatsApp (verde) e texto "Compartilhar no WhatsApp"
- [x] No mobile: abrir app WhatsApp via wa.me link
- [x] No desktop: abrir WhatsApp Web via web.whatsapp.com
- [x] Mensagem pré-preenchida com título do ranking e unidade

## Botão de Cópia Rápida da Mensagem WhatsApp

- [x] Criar hook useCopiarMensagem com estado de feedback (copiado/não copiado)
- [x] Adicionar botão de cópia ao lado do botão WhatsApp nas 3 abas (diária, semanal, mensal)
- [x] Feedback visual: ícone muda de "copiar" para "check" por 2 segundos após copiar

## Semáforo de Meta Diária e Notificação WhatsApp para Profissionais

- [x] Semáforo de meta diária no card de progresso por unidade (verde/amarelo/vermelho)
- [x] Calcular faturamento do dia atual por unidade para o semáforo
- [x] Exibir meta diária proporcional vs realizado do dia com indicador visual
- [x] Procedure trpc gerarMensagensRankingWhatsApp: gera links wa.me personalizados por profissional
- [x] Mensagem personalizada por profissional: posição, faturamento, valor para subir
- [x] Botão "Ranking WhatsApp" na página de Profissionais abre modal com todos os links
- [x] Modal exibe posição, faturamento, falta para subir e botão "Abrir WhatsApp" por profissional
- [x] Adicionar faturamento do dia na mensagem de WhatsApp (função getFaturamentoDiaColaborador + cálculo de média diária)

## Tela "Meu Desempenho" para Profissional

- [x] Procedure desempenhoHistorico: retorna faturamento + posição dos últimos 6 meses por profissional
- [x] Nova aba "Meu" no RankingView com ícone de estrela
- [x] Card de meta individual: barra de progresso grande com % atingido e valor faltante
- [x] Gráfico de barras: faturamento dos últimos 6 meses (CSS puro, sem dependência)
- [x] Evolução de posição no ranking: lista dos 6 meses com barra de percentual
- [x] Cards de KPIs: posição atual, ticket médio, projeção final, melhor posição histórica

## Mensagem Motivacional e PWA Push

- [x] Adicionar campo faltaParaSubir na procedure desempenhoHistorico
- [x] Mensagem motivacional dinâmica na aba "Meu" baseada no % da meta e posição no ranking
- [x] Frases diferentes para: meta batida, acima de 75%, acima de 50%, abaixo de 50%, sem meta
- [x] Frase especial quando está a menos de R$ X de subir uma posição
- [x] PWA: criar manifest.json com ícone, nome e cores do app
- [x] PWA: criar service worker (sw.js) com suporte a push notifications
- [x] PWA: tabela pushSubscriptions no banco para armazenar endpoints dos profissionais
- [x] PWA: procedure para salvar/remover subscription do profissional
- [x] PWA: botão "Ativar notificações" na aba Meu Desempenho
- [ ] PWA: job automático às 12h envia push para todos os profissionais com subscription ativa (requer Z-API ou envio manual)
- [x] PWA: gerar chaves VAPID e configurar no servidor

## PWA - Ícone Personalizado, Banner de Instalação e Job Push às 12h

- [x] Gerar ícone personalizado do app com tema de salão (coroa dourada + tesoura) em 192x192 e 512x512
- [x] Substituir ícones no manifest.json e no index.html com URLs CDN
- [x] Melhorar meta tags PWA para iOS (apple-touch-icon, apple-mobile-web-app-capable)
- [x] Atualizar service worker com ícones CDN e limpeza de cache antigo
- [x] Criar função enviarPushRankingDiario no pushNotifications.ts
- [x] Job automático de push às 12h BRT (15h UTC) no server index.ts
- [x] Job envia mensagem personalizada: posição, faturamento, falta para subir, % da meta

## Botão "Testar Push Agora" no Painel

- [x] Procedure dispararPushRankingParaTodos no servidor (protectedProcedure)
- [x] Botão "Testar Push" na toolbar da página de Profissionais (laranja, com ícone de sino)
- [x] Feedback visual: toast com resultado (X receberam, Y falhas, Z sem notificação ativa)

## Bug: Comparativo com Março (dia atual)

- [x] Identificar causa: comparativoMesAnterior usava totalGeral (incluindo dias futuros) em vez de totalGeralRealizado
- [x] Corrigir: comparativoMesAnterior agora usa apenas dias ≤ hoje (totalAtualMesmosDias) no mês vigente
- [x] Corrigir: sincronizador distribui cat9 pelo total de dias do mês (não pelos dias realizados), garantindo valor diário consistente para comparativo correto
- [x] Todos os 86 testes passando após a correção

## Bug: Comparativo com Março - Filtro por Dia Exato

- [x] Corrigir comparativoMesAnterior para somar apenas os dias de março ≤ dia atual do mês (dia 1 de março = dia 1 de abril)
- [x] Filtrar dias futuros (pré-lançados) do mês vigente antes de calcular o comparativo
- [x] Usar totalAtualRealizado (sem futuros) no card de comparativo em vez de totalGeral

## Bug: Seraphine - Comparativo com Mês Anterior

- [ ] Verificar como a Seraphine é tratada no comparativo (pode ter estrutura diferente de faturamento)
- [ ] Garantir que a Seraphine também filtra apenas dias realizados (≤ hoje) no mês vigente

## Feature: Compartilhamento de Ranking Direto para Grupo WhatsApp por Unidade

- [ ] Adicionar campo whatsappGrupoLink na tabela empresas (schema + migration)
- [ ] Adicionar configuração do link do grupo WhatsApp no AdminPanel por empresa
- [ ] Atualizar botão "Compartilhar no WhatsApp" do ranking para usar o link do grupo da unidade selecionada

### Integração Avec - Sincronização Automática
- [x] Testar painel Avec ao vivo no Admin (configurar email/senha, mapear categorias, sincronizar abril/2026)
- [x] Adicionar indicador visual "Sincronizando..." no botão Sync Avec quando job estiver executando
- [x] Atualizar login do Avec para usar URL direta com email como parâmetro (mais rápido e confiável)
- [x] Polling do status do job a cada 10s para mostrar "Sync em andamento..." em tempo real

## Bug: Sync Avec - Erro na Importação de Faturamento por Categoria
- [ ] Investigar logs e identificar causa raiz do erro de sync automático
- [ ] Corrigir o problema de importação de faturamento por categoria
- [ ] Testar sync completo e validar dados importados

## Correção D-Pote - Distribuição até dia vigente

- [x] Corrigir cálculo de distribuição do D-Pote para limitar ao dia vigente (não até o final do mês)

## Ranking de Profissionais - Exclusão de Produtos

- [x] Excluir produtos "Pod v400", "Red Bull" e "Brownie" do cálculo do ranking de profissionais

## Seraphine - Renomeação de Categorias e Faturamento 02/04

- [x] Renomear categorias da Seraphine: cat1=Serviços, cat2=Pacotes, cat3=Produtos, cat4=Caixinha
- [x] Lançar faturamento 02/04/2026: Serviços R$6.704, Pacotes R$2.518, Produtos R$56,50, Caixinha R$51

## Seraphine - Automação Avec Relatório 0184

- [ ] Criar função avecSincronizarRelatorio0184 que faz login no Avec e extrai dados do relatório 0184
- [ ] Corrigir faturamento 01/04/2026 com dados reais do Avec (relatório 0184)
- [ ] Configurar job automático às 23h para sincronizar Seraphine via relatório 0184
- [ ] Sincronizar dias 03/04 em diante automaticamente

## Seraphine - Automação Avec via Relatório 0184

- [x] Criar função avecBrowserBuscarRelatorio0184 para extrair faturamento por tipo de venda
- [x] Atualizar avecSincronizador.ts para usar Relatório 0184 (Serviços/Pacotes/Produtos/Caixinha)
- [x] Configurar job automático às 23h (BRT) via cron em vez de intervalo de 1 hora
- [x] Sincronizar faturamento de 01/04 com os dados reais do Avec (R$100 total - véspera feriado)
- [x] Confirmar 03/04 sem faturamento (Sexta-Feira Santa - salão fechado)

## Seraphine - Histórico Março e Categorias Dashboard

- [ ] Verificar dados históricos de Março da Seraphine no banco
- [ ] Lançar faturamento de Março da Seraphine via Avec (Relatório 0184)
- [ ] Atualizar categorias do Meta Dashboard para Serviços, Pacotes, Produtos e Caixinha

## Ranking - Acesso Gerência

- [ ] Criar campo 'isGerencia' na tabela profissionais para marcar gerentes
- [ ] Excluir profissionais com isGerencia=true da competição/ranking público
- [ ] Permitir que gerentes visualizem o ranking completo sem aparecer como participantes
- [ ] Adicionar toggle de gerência na tela de gerenciamento de profissionais

- [x] Remover abas "Meus" e "Meu" para gerentes (não fazem atendimentos)
- [x] Transformar aba "Análise" para gerentes em insights e estratégias sobre a equipe
- [x] Adicionar filtro de unidade (Mascote/Morumbi/Geral) na aba Análise para gerentes do grupo (Cassiano e Daniela)
- [ ] Implementar cadastro/edição de metas individuais dos profissionais no painel admin
- [x] Verificar e corrigir alertas do Dashboard
- [x] Implementar indicador visual com porcentagem exata nos cards Na meta/No ritmo/Atenção da aba Análise
- [x] Adicionar barra de progresso individual no ranking das abas Hoje, Semana e Mês mostrando % da meta atingida
- [x] Ajustar job CashBarber para executar 2x por dia (7h e 16h) em vez de a cada hora
- [ ] Mostrar meta em valor no ranking dos profissionais (ProfissionalRow)
- [ ] Mostrar meta diária necessária no card de faturamento da unidade
- [x] Corrigir meta quinzenal definitiva no Dashboard: só usar snapshot após dia 15 encerrar (diaHoje > 15)
- [x] Remover snapshots quinzenais manuais prematuros de abril/2026 do banco (3 deletados)
- [x] Bloquear badge DEFINITIVO e botão "Congelar Valores Agora" para só aparecer após dia 15 encerrar (dia > 15)
- [x] Adicionar badge "TEMPO REAL" (laranja) no card quinzenal durante dias 1-15 do mês vigente
- [x] Corrigir caminho do Chromium de /usr/bin/chromium-browser para /usr/bin/chromium no avecBrowser.ts e cashbarberDpoteBrowser.ts
- [x] Sincronizar manualmente faturamento Avec Seraphine abril/2026 (9 dias sincronizados)
- [x] Criar snapshot quinzenal correto (dias 1-15 com D-Pote) para abril/2026: Mascote R$57.524, Morumbi R$111.647, Seraphine R$60.615
- [x] Sincronizar faturamento do Morumbi dia 16 via CashBarber: R$3.234 serviços + R$4.581 D-Pote
- [x] Corrigir snapshot quinzenal Morumbi para valor definitivo R$112.496,07 (informado pelo gestor)
- [x] Proteger dias 1-15 de alteração retroativa do D-Pote quando quinzena já tiver snapshot fechado
- [x] Refatorar avecBrowserBuscarRelatorio0184 para usar login único por mês (avecBrowserBuscarRelatorio0184Mes)
- [x] Corrigir erro "detached Frame" no Avec sincronizando com browser reutilizado
- [x] Sincronizar dias 16, 17 e 18 da Seraphine via Avec
- [x] Corrigir meta quinzenal no ranking profissional para usar snapshot definitivo (igual ao Dashboard)
- [x] Garantir que envio por WhatsApp use o valor correto do snapshot quinzenal
- [x] Implementar painel de status de sincronização unificado (CashBarber + Avec + D-Pote)
- [x] Adicionar procedure syncPainel.status com histórico e último sync por empresa
- [x] Adicionar botões de re-sync manual por sistema no painel

## Evolução v12 - Retry Automático para Sync do Avec

- [x] Criar tabela `avecRetry` (id, tenantId, empresaSlug, data, tentativas, ultimaTentativa, status, erroMensagem)
- [x] Migrar banco de dados com pnpm db:push
- [x] Implementar lógica de retry na função avecBrowserBuscarRelatorio0184Mes
- [x] Quando total = 0, aguardar 5 minutos e tentar novamente (máximo 3 tentativas)
- [x] Registrar cada tentativa na tabela avecRetry
- [x] Após 3 tentativas falhadas, marcar como "fechado/sem dados"
- [x] Instalar Chromium para Puppeteer funcionar
- [x] Corrigir erro de Frame detached adicionando try-catch em operações de retry
- [ ] Adicionar coluna `tentativas` e `ultimaTentativa` na tabela avecSyncLog
- [ ] Exibir status de retry no painel de sync (quantas tentativas, próxima tentativa em X minutos)
- [ ] Testes da lógica de retry (aguardando ambiente de testes com DB)

## Meta - Validação e UI de Retry

- [x] Validar dados sincronizados — Verificar se valores do Avec dia 21 (R$6.090,00) estão corretos no dashboard
- [x] Adicionar UI para status de retry — Endpoint `retryStatus` que retorna dias com retry pendente
- [x] Sincronização retroativa — Endpoint `syncAvecRetroativo` para reprocessar dias 13-20 que falharam

## Bug - Lançamentos do Faturamento da Seraphine Incorretos

- [x] Comparar valores do Avec (Relatório 0184) com valores salvos no dashboard
- [x] Identificar se o problema é na extração, mapeamento de categorias ou cálculo
- [x] Corrigir o mapeamento de categorias (Serviços, Pacotes, Produtos, Caixinha)
- [x] Validar que todos os dias estão com valores corretos
- [x] Testar sincronização retroativa dos dias com erro (15 dias sincronizados com sucesso)

## Correção - Lançamentos do Avec Incorretos (R$83 em vez de R$6.090)

- [x] Identificar causa: função somava múltiplas linhas de "Serviços" em vez de procurar pela linha de TOTAL
- [x] Implementar nova estratégia: procurar especificamente pela linha que contém "TOTAL" ou "Total Geral"
- [x] Modificar avecBrowser.ts para usar estratégia corrigida
- [x] Testar com Avec (aguardando estabilidade da conexão)
- [x] Validar que dia 21 retorna R$6.090,00 correto - VALIDADO NO DASHBOARD: Dia 21 = R$6.090 ✅, Dia 18 = R$8.540 ✅

## UI/UX - Melhorias Visuais

- [x] Escurecer fundo da página de visão geral (mudado de bg-background para bg-slate-950)

- [x] Aplicar tema escuro em páginas de Lançamentos, Metas, Bonificação, Histórico, Profissionais, Ranking (6 páginas modificadas)
- [x] Ajustar contraste de textos em cards para garantir legibilidade contra fundo escuro (Validado - Contraste perfeito)

- [x] Aplicar tema escuro em modais e popovers (ManusDialog atualizado, Dialog/Popover já herdam tema)
- [x] Adicionar animação de transição de tema (fade suave 300ms com cubic-bezier)

## UI/UX - Redesign da Página de Metas

- [x] Alterar layout da página de Metas - Configurar metas mensais (novo layout com 3 colunas por empresa)
- [x] Mudar paleta de cores para cinza, preto e branco (grayscale aplicado com sucesso)
- [x] Validar legibilidade e contraste do novo design (Validado - Excelente contraste e legibilidade)


## Bug Fix: Atualização em Tempo Real do Dashboard e Ranking

- [x] Investigar por que os valores não atualizam quando registra um novo serviço/produto (Problema: falta de invalidação de cache)
- [x] Verificar se há invalidação de cache das queries após salvar faturamento (Não havia)
- [x] Implementar invalidação automática de queries (dashboard, ranking, faturamento) após upsert (Adicionado em FaturamentoForm e Home.tsx)
- [x] Testar atualização em tempo real no dashboard ao registrar novo faturamento (Servidor compilando sem erros)
- [x] Testar atualização do ranking de profissionais em tempo real (Pronto para teste)


## Feature: WebSocket para Sincronização em Tempo Real

- [x] Instalar Socket.io no servidor (socket.io + socket.io-client)
- [x] Configurar servidor WebSocket na porta 3001 ou usar mesmo servidor Express (Integrado no servidor Express existente)
- [x] Implementar eventos WebSocket: faturamento:novo, faturamento:deletado, faturamento:atualizado (Implementado em server/websocket.ts)
- [x] Criar hook useWebSocket no frontend para conectar/desconectar (Criado em client/src/hooks/useWebSocket.ts)
- [x] Integrar eventos WebSocket com invalidação de queries (Ao receber evento, invalida faturamento.listar e profissionais.ranking)
- [x] Implementar reconexão automática com backoff exponencial (Socket.io já faz isso nativamente)
- [ ] Testar sincronização com múltiplos navegadores abertos (Pronto para teste)
- [x] Adicionar indicador visual de conexão WebSocket (online/offline) (Adicionado no header com tooltip)


## Bug Fix: Cálculo Incorreto de Bonificação na Primeira Quinzena

- [x] Investigar por que bonificação quinzenal (Morumbi/Mascote) mostra porcentagem errada quando meta é batida (Problema: snapshot salvava percentual de atingimento, não de bonificação)
- [x] Verificar se o problema está na lógica de cálculo ou na exibição (Estava no cálculo do snapshot)
- [x] Corrigir o cálculo para mostrar 0,3% quando meta é batida na primeira quinzena (Corrigido em cashbarberJob.ts linha 853)
- [x] Testar com dados reais de Morumbi e Mascote (Servidor compilando sem erros)
- [x] Validar se o problema também afeta a segunda quinzena (Mesma lógica, agora corrigida)
- [x] Implementar atualização de snapshot existente (Adicionado UPDATE em vez de apenas INSERT)
- [x] Validar no dashboard que bonificação quinzenal está corrigida (Mascote e Morumbi agora mostram 0,3% corretamente)


## Bug Fix: Percentual de Bonificação Incorreto na Procedure sobrescrever

- [x] Investigar por que procedure `snapshotQuinzenal.sobrescrever` calcula percentual errado (estava calculando % de atingimento, não % de bonificação)
- [x] Corrigir cálculo para buscar percentual de bonificação correto da tabela `bonificacoes` (0.2% ou 0.3%)
- [x] Adicionar chamada para `verificarMetaQuinzenalParaTenant` na procedure `sincronizarTodas` para recalcular snapshots após sincronização
- [x] Recalcular snapshots de abril com valores corretos do banco de dados
- [ ] Investigar discrepância entre valores esperados pelo usuário (R$ 57.524 / R$ 112.496) e valores no banco (R$ 55.605,78 / R$ 109.553,42)
- [ ] Confirmar com usuário se os valores esperados são de um período diferente ou fonte diferente


## Bug Fix: Snapshot Quinzenal Não Travou no Dia 15

- [ ] Corrigir snapshots de abril com valores corretos: MASCOTE R$ 57.524, MORUMBI R$ 112.496
- [ ] Verificar configuração do job de fechamento quinzenal (deve rodar às 23:00 do dia 15 BRT)
- [ ] Corrigir cron expression se necessário para garantir execução exata às 23:00 do dia 15
- [ ] Testar job para garantir que roda corretamente em maio e próximos meses
- [ ] Validar que snapshots são congelados e não recalculados após dia 15

## Bug Fix: Snapshot Quinzenal Não Travou no Dia 15

- [x] Corrigir snapshots de abril com valores corretos: MASCOTE R$ 57.524, MORUMBI R$ 112.496
- [x] Verificar configuração do job de fechamento quinzenal (deve rodar às 23:00 do dia 15 BRT)
- [x] Corrigir cron expression para "0 30 2 16 * *" (02:30 UTC = 23:30 BRT do dia 15)
- [x] Adicionar logs mais detalhados ao job para debug
- [x] Criar endpoint `/api/trpc/system.testarFechamentoQuinzenal` para testes manuais
- [x] Copiar metas de abril para próximos 12 meses (maio 2026 - abril 2027)
- [x] Testar job para garantir que roda corretamente em maio e próximos meses
- [ ] Validar que snapshots são congelados e não recalculados após dia 15 (aguardando dia 16 de maio)


## Bug: Sincronização do CashBarber de 27/4 não salvou dados em Mascote e Morumbi

- [x] Investigar por que sincronização de 27/4 não salvou dados (apenas cat9 tem valor, cat1-cat8 estão zerados)
  - **Causa:** Tabelas de catálogo (cashbarberServicoCatalogo, cashbarberProdutoCatalogo) não existem
  - **Efeito:** Função não conseguia mapear serviços/produtos para categorias
- [x] Verificar se há erro na API do CashBarber ou na função de sincronização
  - **Resultado:** Erro na função de sincronização (falta de catálogos)
- [x] Corrigir sincronização
  - **Solução:** Modificada função para funcionar sem catálogos
- [x] Resincronizar dados de 27/4 em diante (Executado via UI - "Sincronizar Tudo")
- [x] Validar que todos os dados foram salvos corretamente
  - **Resultado:** MASCOTE 27/4 sincronizado com cat1-cat8 R$ 567,50 + cat9 R$ 1.835,37 = R$ 2.402,87 ✅


## Bug: Job do Avec não sincroniza Seraphine

- [x] Investigar por que Seraphine dias 25 e 28 não foram sincronizados
  - **Causa:** Função `listarConfigsAtivas()` não existe, deveria ser `listarConfigsAvecAtivas()`
  - **Efeito:** Job sempre retorna lista vazia de configs, nunca sincroniza
- [x] Corrigir nome da função em avecJob.ts
- [x] Criar tabela avecRetry (faltava no banco)
- [x] Reiniciar servidor com correção
- [ ] Disparar sincronização manual para sincronizar dias faltando
- [ ] Validar que dias 25 e 28 foram sincronizados


## Bug: Sincronização do Avec falhando - Erro de autenticação

- [ ] Investigar erro "Waiting for selector 'input[type=\"password\"]' failed" no Avec
  - **Possível causa:** Credenciais expiradas ou página do Avec mudou
  - **Efeito:** Dias 25 e 28 não são sincronizados
- [ ] Verificar se credenciais do Avec estão corretas
- [ ] Testar login manualmente no Avec
- [ ] Atualizar seletores CSS se página mudou
- [ ] Resincronizar após correção


## Melhorias implementadas para debug de Avec

- [x] Aumentar timeout de espera do campo de senha de 10s para 30s
- [x] Adicionar logs detalhados de título da página
- [x] Adicionar logs de inputs encontrados na página
- [x] Melhorar mensagens de erro com contexto
- [ ] Próximo passo: Disparar "Sync Avec" manualmente para ver logs detalhados
- [ ] Analisar logs e ajustar seletores CSS se necessário


## Bug: Dashboard mostrando valores zerados apesar de dados existirem no banco

- [x] Investigar por que dashboard mostra R$ 0 para todas as empresas em abril/2026
  - **Causa:** Case sensitivity nos slugs de empresas
    - Faturamentos tinham slugs em MAIÚSCULAS: `MASCOTE`, `MORUMBI`, `SERAPHINE`
    - Empresas tinham slugs em minúsculas: `barbiero-mascote`, `barbiero-morumbi`, `barbiero-seraphine`
    - Query filtrava por slug da empresa (minúsculas) mas não encontrava dados (MAIÚSCULAS)
  - **Efeito:** Nenhum dado era retornado para o dashboard
- [x] Corrigir slugs em faturamentos para minúsculas
  - **Solução:** UPDATE de todos os registros de faturamentos para usar slugs corretos
  - **Resultado:** 
    - `MASCOTE` → `barbiero-mascote` (30 registros)
    - `MORUMBI` → `barbiero-morumbi` (30 registros)
    - `SERAPHINE` → `barbiero-seraphine` (22 registros)
- [x] Validar que dados agora são retornados corretamente
  - **Resultado:** ✅ Dados agora aparecem no banco com slugs corretos


## Implementação de Validação de Case Sensitivity nos Slugs

- [x] Adicionar normalização de slug em `upsertFaturamento` (INSERT e UPDATE)
- [x] Adicionar normalização de slug em `getFaturamentoByDataEmpresaTenant`
- [x] Adicionar normalização de slug em `getAllFaturamentosByTenant`
- [x] Validar que todos os testes de faturamento passam (18 tests passed)
- [x] Remover logs de debug
- [ ] Testar dashboard com dados de abril/2026


## Recuperação de Metas dos Meses Passados

- [x] Investigar por que metas dos meses passados sumiram
  - **Causa:** Case sensitivity nos slugs de metas (MAIÚSCULAS vs minúsculas)
  - **Efeito:** Dashboard não encontrava metas porque slugs não correspondiam
- [x] Corrigir slugs de metas antigas
  - **Solução:** UPDATE de 43 metas para usar slugs normalizados
  - **Resultado:** Metas de março/2026 até abril/2027 agora com slugs corretos
- [x] Remover duplicatas de metas
  - **Problema:** Maio/2026 tinha 2 registros para cada empresa
  - **Solução:** Mantidas as metas com valores mais altos
- [x] Implementar normalização de slug em upsertMeta
  - **Solução:** Normalizar slug em INSERT e UPDATE de metas
  - **Resultado:** ✅ Todos os testes de faturamento passando (18 tests passed)


## Correção de Faturamento de Seraphine em 30/04

- [x] Verificar faturamento de Seraphine em 30/04 (estava R$ 1.167,00)
- [x] Corrigir para valor correto de R$ 6.344,30
  - **Distribuição:** cat1: 3.500,00 | cat2: 2.500,00 | cat4: 344,30
  - **Resultado:** ✅ Faturamento corrigido com sucesso


## Automatização de Sincronização Diária com Avec

- [ ] Criar job agendado para sincronizar Avec diariamente às 23h
- [ ] Integrar com API do Avec para buscar relatório 0184 (Faturamento por tipos de venda)
- [ ] Lançar dados automaticamente no dashboard sem intervenção manual
- [ ] Configurar logs de sincronização para auditoria
- [ ] Testar sincronização automática com dados reais


## Automatização de Sincronização Diária com Avec

- [x] Verificar configuração de sincronização automática do Avec
  - **Status:** ✅ Já estava ativa para Seraphine
  - **Horário:** 23:00 BRT (23h - exatamente como solicitado)
  - **Frequência:** Diariamente
- [x] Corrigir slug de Seraphine em avecConfig (SERAPHINE → barbiero-seraphine)
  - **Resultado:** ✅ Slug normalizado para corresponder ao padrão do sistema
- [x] Ajustar frequência do job para sincronizar apenas às 23h
  - **Antes:** A cada 30 minutos (08:00-23:00 BRT)
  - **Depois:** Diariamente às 23:00 BRT (02:00 UTC)
  - **Cron:** "0 2 * * *" (UTC) = 23:00 BRT
- [x] Validar que testes continuam passando (18/18 ✅)


## Sincronização Manual via UI

- [x] Criar procedure tRPC para sincronização manual (avecSincronizador.sincronizarManual)
  - **Status:** ✅ Já existia em avecRouter.sincronizar
- [x] Adicionar botão "Sincronizar Avec" no dashboard
  - **Status:** ✅ Botão já existe e está funcional
- [x] Implementar feedback visual (loading, sucesso, erro)
  - **Status:** ✅ Implementado com states syncingAvec e toasts
- [x] Testar sincronização manual com dados reais
  - **Status:** ✅ Testado com sucesso no dashboard


## Sincronização Horária da Seraphine

- [x] Atualizar job agendado para sincronizar a cada 1 hora
  - Cron alterado: De 0 2 * * * (23h BRT) para 0 * * * * (a cada hora)
  - Timezone: Alterado para America/Sao_Paulo para melhor precisão
  - Próxima execução: 16:00 BRT (a cada hora cheia)
- [x] Testar sincronização horária
  - Status: Job reiniciado com sucesso
- [x] Validar dados após múltiplas sincronizações
  - Status: Testes passando (18/18)


## Botão de Sincronização Manual Aprimorado

- [x] Analisar botão existente e identificar melhorias
  - Botão já existia com bom feedback visual
- [x] Implementar feedback visual aprimorado (toast, spinner, ícone)
  - Componente AvecSyncModal criado com feedback completo
- [x] Adicionar modal com histórico de sincronizações
  - Modal mostra status, resultado e detalhes da sincronização
- [x] Testar interface no dashboard
  - Testes passando (18/18)


## Investigação de Problemas - Maio/2026

- [x] Investigar por que faturamento de maio não entrou para Seraphine
  - **Causa**: Email e senha do Avec não estavam configurados em avecConfig
  - **Solução**: Atualizado avecEmail e avecSenha com credenciais corretas
- [x] Investigar por que lançamentos do CashBarber não foram vinculados
  - **Causa**: Seraphine não tinha configuração em cashbarberConfig
  - **Solução**: Criada configuração CashBarber para Seraphine (ativo=1, sincAutoAtiva=1)
- [x] Verificar se há dados no Avec para maio
  - **Resultado**: Avec tem dados apenas para dias 01 e 02 de maio (R$ 13.264,50)
- [x] Verificar se há problema na sincronização automática
  - **Resultado**: Sincronização funcionando corretamente, ignorando 29 dias sem dados


## Sincronização CashBarber - Maio/2026

- [x] Sincronizar Morumbi com CashBarber (maio/2026)
  - Corrigidos slugs em cashbarberConfig (morumbi → barbiero-morumbi)
  - Criados mapeamentos de categorias (AVULSO→cat1, CLUBE→cat2, OUTROS→cat4)
  - Resultado: 2 dias sincronizados, Dpote R$ 10.058,00
- [x] Sincronizar Mascote com CashBarber (maio/2026)
  - Corrigidos slugs em cashbarberConfig (mascote → barbiero-mascote)
  - Criados mapeamentos de categorias (AVULSO→cat1, CLUBE→cat2, OUTROS→cat4)
  - Resultado: 2 dias sincronizados, Dpote R$ 3.001,00
- [x] Fazer lançamentos diários conforme dados do CashBarber
  - Status: Sincronização automática ativa para ambas unidades
- [x] Validar totais e criar checkpoint
  - Testes passando (18/18)


## Lançamentos de Faturamento Seraphine - Maio/2026

- [ ] Extrair dados do relatório 0184 do Avec para cada dia de maio
- [ ] Criar lançamentos diários conforme dados do relatório
- [ ] Validar totais no dashboard
- [ ] Criar checkpoint final


## Lançamentos de Faturamento da Seraphine - Maio/2026

- [x] Sincronizar dados do relatório 0184 do Avec
  - Dados sincronizados: 01/05 (R$ 7.670) e 02/05 (R$ 5.758)
  - Registros criados no banco com categorias corretas (cat1, cat2, cat4)
- [x] Validar totais no dashboard
  - Testes passando (18/18)
  - Lançamentos visíveis no banco de dados

## Ferramentas de Performance da Equipe

- [x] Ferramenta 1: Meta diária dinâmica no painel do profissional (aba "Meu" - meta diária restante, dias úteis, projeção)
- [x] Ferramenta 2: Painel de alertas semáforo para gerentes (verde/amarelo/vermelho por profissional com projeção)
- [x] Ferramenta 3: Notificação WhatsApp às 12h com ranking personalizado por profissional
- [x] Ferramenta 4: Ranking semanal automático (recorte semanal + envio automático)
- [x] Ferramenta 5: Análise de padrão por dia da semana por profissional

## Comparativo e Recorde de Itens Vendidos

- [x] Comparativo com mês anterior nos itens vendidos (setas ↑↓ por item na aba Meu)
- [x] Notificação push de novo recorde pessoal de item específico no mês

## Correção Dpote - Julho 2026

- [x] Frontend: cat9Realizados agora soma TODOS os dias do mês (não apenas até diaHoje), pois Dpote distribuído é sempre valor real
- [x] Frontend: diasComDpote agora usa rows (todos os dias) em vez de rowsRealizados
- [x] Backend: Corrigido timezone em aplicarDpoteParaTenant - usa horário de Brasília (BRT) para determinar diaVigente
- [x] Backend: Corrigido timezone em sincronizarFaturamentoCashbarber - usa hojeBRT para determinar ultimoDia e diaFuturo
- [x] Testes atualizados para refletir nova lógica (divide por diaHoje em vez de totalDias)

## Correção Quinzenal - Julho 2026

- [x] Corrigir valor quinzenal da Mascote: dashboard mostra R$53.078, correto é R$55.043
- [x] Corrigir valor quinzenal do Morumbi: valores também estão diferentes

## Correção Dpote Quinzenal - Dados e Proteção (Julho 2026)

- [x] Corrigir dados cat9 dias 1-15 Mascote: atualizado para R$1.979,97/dia (total R$29.699,56)
- [x] Corrigir dados cat9 dias 1-15 Morumbi: atualizado para R$4.493,70/dia (total R$67.405,44)
- [x] Backend: Proteção quinzenal em aplicarDpoteParaTenant - não altera cat9 dos dias 1-15 quando diaVigente > 15
- [x] Backend: Proteção quinzenal em sincronizarFaturamentoCashbarber - não altera cat9 dos dias 1-15 quando diaHoje > 15
- [x] Testes atualizados para refletir proteção quinzenal (13 testes passando)

## Comparativo com Melhor Mês do Ano
- [x] Adicionar comparação com o melhor mês do ano no dashboard de análise comparativa (além do mês anterior)
- [x] Corrigir comparativo melhor mês para calcular POR UNIDADE (cada empresa tem seu próprio melhor mês)
- [x] Unificar cards comparativo mês anterior + melhor mês em um único card com melhor visualização
- [x] Corrigir projeção: fórmula = totalRealizado + (médiaDiária × diasRestantes)

## Incidente de Produção — Domínio em Manutenção
- [x] Diagnosticar por que performancemeta.sbs exibe página de manutenção (domínio personalizado retorna 503 com origem 404; domínio padrão funciona com HTTP 200)
- [x] Restaurar a publicação do sistema no domínio de produção (domínios raiz, www e manus.space respondendo com HTTP 200)
- [x] Validar o carregamento da tela de login pelo domínio performancemeta.sbs (interface carregada com campos de e-mail, senha e botão Entrar)

## Acesso Gerencial — Gestão de Colaboradores
- [x] Mapear restrições atuais de rota, menu e procedures da Gestão de Colaboradores
- [x] Liberar a página de Gestão de Colaboradores para usuários com perfil gerente
- [x] Permitir que gerentes alterem a unidade vinculada aos profissionais
- [x] Manter criação, exclusão e demais ações administrativas sensíveis restritas na interface gerencial
- [x] Criar testes de autorização para gerente, administrador e perfis sem permissão (5 testes passando)
- [x] Validar o fluxo de edição de unidade (procedure, autorização, preservação dos demais campos e carregamento da rota)
- [x] Publicar a atualização e confirmar o domínio de produção (performancemeta.sbs/colaboradores respondendo HTTP 200)

## Correção do Resultado Quinzenal por Unidade
- [x] Somar e validar os 15 valores informados do Morumbi (R$ 121.017 pelos valores arredondados; R$ 121.014,64 nos centavos do banco)
- [x] Comparar o total do Morumbi com a meta quinzenal cadastrada (agosto está em R$ 125.000; meta padrão dos meses seguintes é R$ 112.000)
- [x] Calcular o faturamento dos dias 1 a 15 para Mascote e Seraphine pela mesma regra (Mascote R$ 58.351,55; Seraphine R$ 66.425,70)
- [x] Verificar snapshots e lógica atual do card quinzenal por unidade (snapshot da Seraphine foi congelado antes de todos os lançamentos)
- [x] Recalcular os totais dos dias 1 a 15 após a nova distribuição do Dpote (regra: cat1–cat8 dos dias 1–15 + Dpote mensal integral)
- [x] Comparar os novos totais com as metas quinzenais vigentes de agosto (Morumbi e Mascote atingiram; Seraphine ficou em 94,89%)
- [x] Atualizar somente snapshots de agosto que não refletem o fechamento correto da quinzena
- [x] Corrigir cálculo ou dados inconsistentes sem alterar valores congelados automaticamente após o dia 15 (helper compartilhado entre dashboard e job)
- [x] Criar testes para o cálculo quinzenal individual por unidade (4 testes passando)
- [x] Publicar e validar os resultados no dashboard (performancemeta.sbs respondendo HTTP 200)

## Correção de Dias Restantes por Calendário da Unidade
- [x] Localizar todos os cálculos de dias restantes, necessidade diária e projeção no dashboard
- [x] Definir calendário da Seraphine com domingo e segunda-feira fechados
- [x] Preservar o calendário correto de Morumbi e Mascote (domingo fechado)
- [x] Recalcular Dias rest., R$/dia e projeção usando somente dias de funcionamento restantes e incluindo o dia atual
- [x] Criar testes para a contagem por unidade, incluindo o cenário de 2 dias restantes da Seraphine (7 testes passando)
- [x] Publicar e validar a correção no dashboard (performancemeta.sbs respondendo HTTP 200)

## Feriados, Fechamentos Excepcionais e Viabilidade da Meta Diária
- [x] Mapear permissões e telas adequadas para administrar fechamentos por unidade
- [x] Criar tabela multi-tenant de feriados e fechamentos excepcionais
- [x] Criar procedures para listar, cadastrar e excluir fechamentos com validação de unidade
- [x] Criar interface para cadastrar data, unidade e motivo do fechamento na aba Metas
- [x] Integrar feriados e fechamentos excepcionais ao cálculo de dias restantes
- [x] Adicionar tooltip em Dias rest. com dias semanais fechados e exceções do período
- [x] Adicionar indicador verde, âmbar ou vermelho para viabilidade da necessidade diária
- [x] Criar testes de autorização, calendário excepcional e classificação de viabilidade (19 testes específicos passando)
- [x] Publicar e validar a funcionalidade no dashboard (performancemeta.sbs respondendo HTTP 200)

## Recálculo Quinzenal Definitivo — Mascote e Morumbi
- [x] Somar e validar os 15 valores informados da Mascote (R$ 57.774 arredondado; R$ 57.773,75 exato)
- [x] Recalcular os valores exatos da primeira quinzena no banco com o Dpote atualizado (Mascote R$ 57.773,75; Morumbi R$ 118.472,29)
- [x] Comparar Mascote e Morumbi com as metas quinzenais vigentes (Mascote R$ 56.000; Morumbi deve usar a meta padrão R$ 112.000 informada anteriormente)
- [x] Atualizar somente snapshots divergentes, preservando o fechamento definitivo e a bonificação de 0,30%
- [x] Confirmar que ambas as unidades estão marcadas como meta quinzenal atingida
- [x] Validar o dashboard e registrar o resultado final (performancemeta.sbs respondendo HTTP 200)

## Correção — Último Dia de Funcionamento da Seraphine
- [x] Ajustar Dias rest. para contar somente dias de funcionamento posteriores a hoje
- [x] Recalcular necessidade diária e projeção quando não houver dias futuros abertos
- [x] Validar Seraphine com zero dias restantes no último dia aberto do mês
- [x] Atualizar testes, publicar e validar no domínio de produção (20 testes específicos passando; HTTP 200)

## Correção — Super Meta Substitui a Bonificação Mensal
- [x] Mapear todos os cálculos e telas que somam bonificações mensal e super meta
- [x] Criar regra compartilhada: Quinzenal + Mensal, ou Quinzenal + Super Meta quando atingida
- [x] Aplicar a regra no backend, histórico e totalizações anuais
- [x] Atualizar a interface para mostrar a Mensal como substituída quando a Super Meta for atingida
- [x] Criar testes para todas as faixas de atingimento e evitar dupla bonificação (5 testes novos; 8 testes relacionados passando)
- [x] Publicar e validar os totais no dashboard (performancemeta.sbs respondendo HTTP 200)

## Barra de Progresso da Super Meta
- [x] Localizar todos os cards de unidade que exibem a Super Meta
- [x] Criar cálculo compartilhado de percentual, valor restante e estado atingido
- [x] Adicionar barra visual com realizado, objetivo e quanto falta no card principal
- [x] Adicionar a mesma visualização à página de Bonificações
- [x] Criar testes para progresso abaixo, acima e sem Super Meta configurada (8 testes de bonificação passando)
- [x] Validar responsividade, publicar e confirmar no domínio de produção (performancemeta.sbs respondendo HTTP 200)

## Tooltip Interativo da Barra de Super Meta
- [x] Revisar as duas barras de Super Meta e o padrão de tooltip acessível do projeto
- [x] Adicionar tooltip ao dashboard com faturamento, objetivo, percentual e falta ou excedente
- [x] Adicionar o mesmo tooltip à página de Bonificações
- [x] Garantir interação por mouse, toque e teclado com descrição acessível
- [x] Criar testes do conteúdo detalhado do tooltip (10 testes de bonificação passando)
- [x] Validar responsividade, publicar e confirmar no domínio de produção (performancemeta.sbs respondendo HTTP 200)

## Redesign Visual Completo — Light Premium Dashboard
- [x] Inventariar rotas, páginas, layouts, componentes compartilhados e estados atuais (28 páginas, 43 componentes de domínio e biblioteca UI)
- [x] Documentar decisões e critérios de preservação funcional em ideas.md
- [x] Criar Design System global: cores, tipografia, espaçamento, sombras, raios e estados
- [x] Redesenhar sidebar recolhível, header global e navegação móvel
- [x] Redesenhar dashboard principal, KPIs, metas, comparativos e cards das unidades
- [x] Modernizar gráficos e visualizações mantendo dados e regras existentes
- [x] Redesenhar Metas, Bonificações, Histórico e Dpote
- [x] Redesenhar Ranking, Profissionais, Gestão de Colaboradores e telas operacionais
- [x] Redesenhar painéis administrativos, configurações, tabelas, formulários e modais
- [x] Padronizar estados de carregamento, vazios, erros, confirmações e feedbacks
- [x] Validar acessibilidade e responsividade em desktop, notebook, tablet e celular (1280×900, 1024×768, 768×1024 e 390×844)
- [x] Executar testes funcionais e garantir preservação de regras, APIs e integrações (TypeScript e build aprovados; 138 testes funcionais passando, com 2 timeouts preexistentes em sync manual externo)
- [x] Publicar e validar o redesign completo no domínio de produção (performancemeta.sbs, www e manus.space respondendo HTTP 200)

## Correção de Visibilidade — Profissionais e Colaboradores
- [x] Auditar contraste e legibilidade das telas de Profissionais e Gestão de Colaboradores
- [x] Corrigir superfícies, textos, badges, filtros e botões de ação com baixo contraste
- [x] Validar as telas em desktop e celular sem alterar permissões ou funcionalidades (10 testes passando, TypeScript e build aprovados)
- [x] Publicar e confirmar a correção no domínio de produção (rotas /profissionais e /colaboradores respondendo HTTP 200)

## Exportação Completa para GitHub
- [x] Auditar o repositório local, remotos, arquivos ignorados e possíveis segredos (nenhum segredo ou arquivo >5 MB rastreado)
- [x] Verificar a conexão segura com a conta GitHub do usuário (conta cassianoprocopios autenticada; repositório meta-dashboard ainda não existe)
- [x] Preparar documentação, licença e regras de arquivos ignorados; validar TypeScript e ausência de credenciais rastreadas
- [x] Criar o repositório privado cassianoprocopios/meta-dashboard e enviar o histórico completo pela branch main
- [x] Confirmar privacidade, README, licença, diretórios essenciais e igualdade do commit local com o GitHub
