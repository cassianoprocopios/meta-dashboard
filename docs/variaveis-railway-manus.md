# Variáveis de ambiente: Manus → Railway

Esta matriz reflete o código atual da branch `migration/independencia-manus`. Não publique valores neste arquivo, no GitHub ou no chat.

## Remover agora do Railway independente

| Variável | Motivo |
|---|---|
| `OAUTH_SERVER_URL` | O OAuth Manus foi removido do entrypoint e do contexto de autenticação. |
| `VITE_OAUTH_PORTAL_URL` | O frontend agora aponta para `/login`. |
| `VITE_APP_ID` | Não há mais fluxo OAuth Manus no frontend/backend. |
| `VITE_ANALYTICS_ENDPOINT` | O script de analytics Manus foi removido do `client/index.html`. |
| `VITE_ANALYTICS_WEBSITE_ID` | O script de analytics Manus foi removido do `client/index.html`. |

## Adicionar ao Railway

Configure no serviço da aplicação:

```env
NODE_ENV=production
PORT=3000
TZ=America/Sao_Paulo
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<segredo aleatório longo e exclusivo>
OWNER_OPEN_ID=local_owner

STORAGE_PROVIDER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<bucket>
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_PUBLIC_BASE_URL=
S3_FORCE_PATH_STYLE=false
STORAGE_SIGNED_URL_TTL_SECONDS=900

RESEND_API_KEY=<chave Resend>
EMAIL_FROM=Meta Dashboard <noreply@dominio-verificado>
NOTIFICATION_EMAIL_TO=<destinatario>

CRON_SECRET_TOKEN=<token aleatório exclusivo>
VAPID_PUBLIC_KEY=<chave pública, se Web Push for usado>
VAPID_PRIVATE_KEY=<chave privada, se Web Push for usado>
```

No frontend compilado, se Web Push continuar sendo usado, também será necessário expor durante o build:

```env
VITE_VAPID_PUBLIC_KEY=<mesma chave pública>
```

## Não remover ainda: dependências Forge/Manus remanescentes

A autenticação Manus foi removida, mas estes arquivos ainda usam `ENV.forgeApiUrl`/`ENV.forgeApiKey`:

- `server/_core/dataApi.ts`
- `server/_core/imageGeneration.ts`
- `server/_core/voiceTranscription.ts`
- `server/_core/llm.ts`
- `server/storage.ts`, somente se `STORAGE_PROVIDER=manus`
- `client/src/components/Map.tsx`, que usa `VITE_FRONTEND_FORGE_API_URL` e `VITE_FRONTEND_FORGE_API_KEY`

Portanto, até migrar ou desativar essas funcionalidades, mantenha temporariamente, somente se elas forem realmente usadas:

```env
BUILT_IN_FORGE_API_URL=<valor obtido no painel/ambiente Manus>
BUILT_IN_FORGE_API_KEY=<valor obtido no painel/ambiente Manus>
VITE_FRONTEND_FORGE_API_URL=<valor obtido no painel/ambiente Manus>
VITE_FRONTEND_FORGE_API_KEY=<valor obtido no painel/ambiente Manus>
```

Não confunda `BUILT_IN_FORGE_API_KEY` com uma chave OpenAI, Resend, R2 ou Railway. Ela é um segredo do adapter legado Manus.

## SMTP: escolha um único canal

O código também contém `server/email.ts`, que lê:

```env
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

Se a recuperação de senha continuar usando SMTP, configure essas variáveis. Se for migrada para Resend, remova as variáveis SMTP depois de validar que nenhum fluxo ainda chama `sendEmail`.

## Storage

No Railway independente, configure obrigatoriamente:

```env
STORAGE_PROVIDER=s3
```

Isso evita o fallback Manus. Antes de apagar definitivamente `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`, confirme que geração de imagem, transcrição, LLM, Data API e mapas já não dependem deles.

## Onde obter os valores com segurança

- `DATABASE_URL`: referência Railway `${{Postgres.DATABASE_URL}}`; para uso local, `DATABASE_PUBLIC_URL` temporária.
- `JWT_SECRET` e `CRON_SECRET_TOKEN`: gerar localmente com `openssl rand -hex 32` e inserir diretamente no Railway.
- R2: Cloudflare Dashboard → R2 → API Tokens.
- Resend: Resend Dashboard → API Keys; o domínio remetente precisa estar verificado.
- VAPID: gerar uma vez com `web-push generate-vapid-keys` e guardar as duas chaves em um cofre seguro.
- Variáveis Manus: somente no ambiente/painel Manus autorizado; não reutilizar depois que os adapters forem removidos.
