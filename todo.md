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
