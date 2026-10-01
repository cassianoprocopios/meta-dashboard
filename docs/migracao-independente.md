# Migração independente do Manus

Branch: `migration/independencia-manus`

Esta branch prepara a execução independente em Railway, com MySQL, Cloudflare R2 e Resend. Ela não altera a `main` nem o ambiente de produção.

## Preparado nesta etapa

- Modelo `.env.example` sem valores secretos.
- Dockerfile com Node 22, pnpm 10.4.1 e Chromium para os scrapers.
- Exclusão de artefatos locais de consultas do Manus da branch de migração.
- Bloqueio de novos dumps e exports no `.gitignore`.
- Remoção do OAuth Manus; o contexto usa apenas `meta_session` e login por senha.
- Remoção do runtime/debug collector Manus do Vite.
- Storage com adapter S3/R2 e fallback Manus somente quando `STORAGE_PROVIDER=manus` for explicitamente definido.
- Notificações de jobs com adapter Resend.

## Bloqueadores de produção

Antes de restaurar dados ou trocar o domínio, é necessário obter acesso autorizado a:

1. Projeto Manus publicado, para identificar o commit efetivamente publicado, variáveis e schedules.
2. Banco de produção, para exportar estrutura, dados, índices, triggers, events e rotinas.
3. Storage Manus/Forge, para inventariar e exportar os objetos.
4. Registrador/DNS do domínio `performancemeta.sbs`.
5. Contas CashBarber, Avec, SMTP, Web Push e mapas.

## Dependências externas ainda encontradas no código

As seguintes funcionalidades ainda têm adapters ou chamadas legadas que precisam de credenciais e/ou implementação independente antes de declarar a saída completa do Manus:

- `server/_core/dataApi.ts`: proxy Manus para APIs de dados.
- `server/_core/imageGeneration.ts`: proxy Manus para geração de imagens.
- `server/_core/voiceTranscription.ts`: proxy Manus para transcrição.
- `server/_core/llm.ts`: proxy Manus para LLM quando configurado.
- `server/storage.ts`: fallback legado de storage, que deve ser mantido desligado no Railway.

O adapter de mapas legado foi removido porque não possui consumidores no checkout atual. A geração de imagens, transcrição e LLM devem ser migradas para provedores diretos (por exemplo, OpenAI/Google conforme o requisito de cada funcionalidade) somente após inventariar uso, limites e custos.

## Alerta de histórico Git

Os dumps `.manus/db/*.json` foram removidos da ponta da branch de migração, mas continuam acessíveis em commits ancestrais da `main` e da branch original. A purga do histórico remoto com `git filter-repo`/force-push é uma operação separada e destrutiva para clones existentes; deve ser autorizada explicitamente depois de preservar um backup privado do repositório. Como os arquivos podem conter resultados de produção, revisar exposição e rotacionar qualquer credencial que tenha aparecido nesses resultados antes de considerar o repositório seguro.

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
