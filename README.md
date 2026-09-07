# Meta Dashboard

Painel de gestão de metas mensais e performance para redes de barbearias. O sistema consolida faturamento diário, metas quinzenais e mensais, Super Meta, bonificações, recorrência Dpote, ranking de profissionais, comparativos históricos e sincronizações com plataformas externas.

## Visão geral

O Meta Dashboard foi desenvolvido para acompanhar múltiplas unidades com isolamento por tenant, permissões por perfil e indicadores financeiros em tempo real. A aplicação possui experiências específicas para administradores, gerentes, recepcionistas e profissionais.

| Área | Principais recursos |
|---|---|
| Dashboard executivo | Faturamento, projeção, metas, Super Meta, comparativos e dias restantes |
| Bonificações | Fechamento quinzenal, mensal e regra substitutiva da Super Meta |
| Profissionais | Ranking, metas individuais, PIN de acesso e gestão de colaboradores |
| Operação | Lançamentos diários, feriados, fechamentos e calendários por unidade |
| Integrações | CashBarber, Avec, Dpote, notificações push e relatórios |
| Administração | Usuários, empresas, vínculos, auditoria, tenants e permissões |

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI e Recharts |
| Backend | Node.js, Express 4 e tRPC 11 |
| Banco de dados | MySQL/TiDB, Drizzle ORM e Drizzle Kit |
| Autenticação | Sessões JWT e controle multi-tenant |
| Testes | Vitest |
| Armazenamento | S3 compatível por meio dos helpers do servidor |

## Pré-requisitos

Use **Node.js 22** e **pnpm 10**. Também é necessário acesso a um banco MySQL/TiDB e às credenciais das integrações que serão habilitadas no ambiente.

## Instalação

```bash
pnpm install
pnpm db:push
pnpm dev
```

O servidor usa a variável `PORT` quando definida. Em desenvolvimento, acesse a URL exibida pelo Vite/Express no terminal.

## Variáveis de ambiente

Configure as variáveis pelo gerenciador seguro da hospedagem ou por um arquivo `.env` local que não seja versionado. As variáveis principais são `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e `OWNER_OPEN_ID`. Notificações usam as chaves `VAPID_*`; envio de e-mail usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.

Variáveis `BUILT_IN_*` e `VITE_FRONTEND_FORGE_*` são fornecidas automaticamente no ambiente Manus; fora dele, precisam ser substituídas por serviços equivalentes. Nunca envie arquivos `.env`, tokens, senhas ou chaves privadas para o repositório.

## Comandos

| Comando | Finalidade |
|---|---|
| `pnpm dev` | Inicia a aplicação em desenvolvimento |
| `pnpm build` | Compila frontend e backend para produção |
| `pnpm start` | Executa a versão compilada |
| `pnpm check` | Valida o TypeScript |
| `pnpm test` | Executa a suíte de testes |
| `pnpm db:push` | Gera e aplica migrações Drizzle |
| `pnpm format` | Formata o código com Prettier |

## Estrutura do projeto

```text
client/        Interface React, páginas, componentes e estilos
drizzle/       Schema e migrações do banco de dados
server/        API tRPC, serviços, jobs, integrações e testes
shared/        Tipos, constantes e regras compartilhadas
storage/       Helpers de armazenamento de arquivos
```

## Regras financeiras importantes

O fechamento quinzenal usa os valores efetivamente distribuídos nos dias 1 a 15. Quando a Super Meta é atingida, ela substitui a bonificação mensal; portanto, o total é a soma da bonificação quinzenal com a bonificação da Super Meta. Calendários de funcionamento, feriados e fechamentos excepcionais afetam automaticamente os dias restantes, a necessidade diária e a projeção.

## Segurança

O projeto é multi-tenant e todas as procedures devem preservar o isolamento por `tenantId`. Não versione arquivos `.env`, tokens, senhas, chaves privadas, dumps de banco ou dados pessoais exportados. Antes de publicar alterações, execute `pnpm check`, `pnpm test` e `pnpm build`.

## Implantação

A aplicação está preparada para execução como um serviço Node.js. O comando de build gera os arquivos em `dist/`, e `pnpm start` inicia o backend de produção. Em uma hospedagem externa, configure todas as variáveis de ambiente, o banco de dados, o armazenamento e as integrações antes de iniciar o serviço.

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
