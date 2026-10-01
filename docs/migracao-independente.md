# Migração independente do Manus

Branch: `migration/independencia-manus`

Esta branch prepara a execução independente em Railway, com MySQL, Cloudflare R2 e Resend. Ela não altera a `main` nem o ambiente de produção.

## Preparado nesta etapa

- Modelo `.env.example` sem valores secretos.
- Dockerfile com Node 22, pnpm 10.4.1 e Chromium para os scrapers.
- Exclusão de artefatos locais de consultas do Manus da branch de migração.
- Bloqueio de novos dumps e exports no `.gitignore`.

## Bloqueadores de produção

Antes de restaurar dados ou trocar o domínio, é necessário obter acesso autorizado a:

1. Projeto Manus publicado, para identificar o commit efetivamente publicado, variáveis e schedules.
2. Banco de produção, para exportar estrutura, dados, índices, triggers, events e rotinas.
3. Storage Manus/Forge, para inventariar e exportar os objetos.
4. Registrador/DNS do domínio `performancemeta.sbs`.
5. Contas CashBarber, Avec, SMTP, Web Push e mapas.

Os valores dos segredos não devem ser enviados por chat ou commitados.

## Variáveis do ambiente independente

O ambiente independente deve usar `STORAGE_PROVIDER=s3` e as variáveis `S3_*` para Cloudflare R2. As variáveis `BUILT_IN_*`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e `VITE_APP_ID` são legado Manus e não devem ser configuradas no Railway depois da remoção do OAuth Manus.

## Estado atual dos jobs

O entrypoint atual inicia jobs `node-cron` no processo web. Railway deverá manter o serviço persistente ou os jobs deverão ser separados em worker/scheduler antes de ativar rotinas com efeitos reais. O ambiente de teste deve iniciar com jobs e envios externos desativados.

## Política de migração

- Não executar `pnpm db:push` contra um banco importado sem comparar o schema e fazer backup.
- Não ativar simultaneamente jobs de origem e destino.
- Não trocar o DNS antes de validar o ambiente temporário.
- Manter rollback considerando dados gravados depois da troca.
