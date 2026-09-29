# CLAUDE.md — Meta Dashboard

Guia para o Claude Code trabalhar neste repositório. Leia antes de alterar código.

## O que é

Painel multi-tenant de metas mensais e performance para redes de barbearias
(faturamento diário, metas quinzenais/mensais, Super Meta, bonificações,
recorrência Dpote, ranking de profissionais, integrações CashBarber e Avec).
Detalhes de negócio no `README.md`; histórico de evolução em `todo.md`.

## Stack

- **Frontend:** React 19 + TypeScript, Vite 7, Tailwind CSS 4, Radix UI (shadcn), Recharts, wouter (rotas), TanStack Query + tRPC client.
- **Backend:** Node 22, Express 4, tRPC 11 (superjson), socket.io, node-cron, puppeteer (scrapers).
- **Banco:** MySQL/TiDB via Drizzle ORM. Schema em `drizzle/schema.ts`, migrações em `drizzle/*.sql`.
- **Testes:** Vitest (`server/**/*.test.ts`).
- **Gerenciador de pacotes:** pnpm 10 (`node-linker=hoisted`). Não use npm/yarn.

## Comandos

| Comando | Uso |
|---|---|
| `pnpm install --frozen-lockfile` | Instalar dependências (o hook de sessão já faz isso na web) |
| `pnpm check` | Typecheck (`tsc --noEmit`) — obrigatório antes de commitar |
| `pnpm test` | Suíte completa de testes |
| `npx vitest run server/arquivo.test.ts` | Um arquivo de teste |
| `pnpm build` | Build de produção (Vite + esbuild → `dist/`) |
| `pnpm dev` | Servidor de desenvolvimento (precisa de `DATABASE_URL`) |
| `pnpm db:push` | Gera e aplica migrações Drizzle (precisa de `DATABASE_URL`) |
| `pnpm format` | Prettier em todo o repo (não rode sem necessidade; muitos arquivos não estão formatados) |

O CI (`.github/workflows/validate.yml`) roda `pnpm check`, `pnpm test` e `pnpm build` em PRs para `main`.

### Estado conhecido dos testes

Sem `DATABASE_URL`, 3 testes em `server/evolucaoV4.test.ts` falham com
"Database not available" (dependem de banco real). Todo o resto (213 testes)
passa sem banco. Não trate essas 3 falhas como regressão sua, mas não
adicione novos testes que exijam banco.

## Estrutura

```
client/src/
  App.tsx            Rotas (wouter) + AuthGate
  pages/             Uma página por rota (Home, DashboardGerencial, Profissionais, ...)
  components/        Componentes de domínio; components/ui = shadcn/Radix
  lib/trpc.ts        Cliente tRPC tipado pelo AppRouter
  hooks/, contexts/  Hooks e ThemeContext
server/
  _core/index.ts     Entrypoint Express: rotas REST internas, tRPC em /api/trpc, WebSocket, jobs cron
  _core/trpc.ts      publicProcedure / protectedProcedure / adminProcedure
  _core/context.ts   Autenticação: cookie JWT `meta_session` (login por senha) ou OAuth Manus
  routers.ts         appRouter principal (~6k linhas; sub-routers auth, empresa, faturamento, meta, bonificacao, admin, cashbarber, ...)
  *Router.ts / *Procedures.ts   Sub-routers extraídos (avec, performance, relatorios, clientesAtendidos)
  db.ts              Toda a camada de acesso ao banco (Drizzle). getDb() retorna null sem DATABASE_URL
  *Sync*.ts, *Job.ts, *Scraper*.ts   Integrações CashBarber/Avec/Dpote e jobs agendados
  *.test.ts          Testes Vitest (usam appRouter.createCaller com contexto fake)
shared/              Regras de negócio puras, sem I/O (metaCalculos, bonificacao, quinzenal, recorrencia, calendarioFuncionamento, comparativoMelhorMes)
drizzle/             schema.ts, relations.ts, migrações SQL
scripts/ e *.mjs na raiz   Scripts operacionais/one-off (debug, resync, scrapers). Não são parte do app; não os importe.
docs/                Planos e auditorias de UX
```

Aliases TypeScript/Vite: `@/*` → `client/src/*`, `@shared/*` → `shared/*`.

## Regras obrigatórias

1. **Isolamento por tenant.** Toda procedure e toda query em `server/db.ts` deve filtrar por `tenantId` do usuário (`ctx.user.tenantId`). `tenantId === null` é só o super-admin/super-dev. Nunca exponha dados de outro tenant.
2. **Permissões.** `users.role` ∈ {`user`, `admin`}; `users.perfil` ∈ {`gerente`, `operador`, `recepcionista`}. Operador só lê sua unidade; gerente lança e edita; admin gerencia usuários/empresas. Use `protectedProcedure` (verifica tenant ativo/validade) por padrão, `adminProcedure` para admin, `publicProcedure` só para login/registro/ranking público.
3. **Regras financeiras ficam em `shared/`** como funções puras com testes. Fechamento quinzenal usa valores distribuídos dos dias 1 a 15; Super Meta atingida substitui a bonificação mensal (total = quinzenal + Super Meta). Calendários/feriados/fechamentos afetam dias restantes, necessidade diária e projeção.
4. **Banco.** Alteração de schema = editar `drizzle/schema.ts` e gerar migração com `pnpm db:push` (precisa de banco). Nunca edite migrações já aplicadas. Nunca versione dumps, `.env`, tokens ou dados pessoais.
5. **Segredos.** Nunca commite credenciais. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `VAPID_*`, `SMTP_*`, `CRON_SECRET_TOKEN`. `BUILT_IN_*` e `VITE_FRONTEND_FORGE_*` vêm do ambiente Manus.
6. **Antes de commitar:** `pnpm check` e `pnpm test` (aceitando apenas as 3 falhas conhecidas acima). Rode `pnpm build` se tocou em config de build, Vite ou no entrypoint do servidor.

## Convenções de código

- Idioma do código, comentários, commits e UI: **português** (nomes como `faturamento`, `empresaSlug`, `sincronizarFaturamentoCashbarber`). Commits seguem `feat:`, `fix:`, `chore:` em português (veja `git log`).
- Prettier: 2 espaços, aspas duplas, ponto e vírgula, `printWidth` 80, `arrowParens: avoid`. Formate só os arquivos que você alterou.
- Validação de input com `zod` em cada procedure tRPC.
- Erros de API: `TRPCError` com `code` apropriado; mensagens de tenant bloqueado: `TENANT_NOT_FOUND`, `TENANT_BLOCKED`, `TENANT_EXPIRED`.
- Funções de banco em `server/db.ts` retornam `[]`/`undefined` quando `getDb()` é null (sem banco); mutações lançam "Database not available".
- Testes: crie um `TrpcContext` fake (veja `server/evolucaoV4.test.ts`) e chame `appRouter.createCaller(ctx)`. Prefira testar regras em `shared/` diretamente.
- Frontend: páginas usam `DashboardLayout`; dados via `trpc.<router>.<proc>.useQuery/useMutation`; toasts com `sonner`; ícones `lucide-react`. Mobile-first — muitas telas têm variantes compactas.
- Não adicione dependências novas sem necessidade clara; o projeto já é pesado (puppeteer, exceljs, pdf-lib).

## Ambiente Claude Code na web

`.claude/hooks/session-start.sh` roda `pnpm install --frozen-lockfile` automaticamente em sessões remotas, então `pnpm check`, `pnpm test` e `pnpm build` funcionam sem passos manuais. Não há banco de dados nem credenciais de integrações na sessão: não tente rodar `pnpm dev`, `pnpm db:push` ou os scripts de sync/scraper.
