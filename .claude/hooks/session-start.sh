#!/bin/bash
# SessionStart hook: prepara o ambiente para o Claude Code na web.
# Instala as dependências com pnpm para que `pnpm check`, `pnpm test` e
# `pnpm build` funcionem em sessões remotas. Idempotente e não interativo.
set -euo pipefail

# Só executa em ambiente remoto (Claude Code na web).
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Garante pnpm 10 (versão fixada em package.json via packageManager).
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || npm install -g pnpm@10
fi

# Evita download do Chromium do puppeteer (o ambiente já tem Chromium).
export PUPPETEER_SKIP_DOWNLOAD=1

echo "[session-start] Instalando dependências com pnpm..."
pnpm install --frozen-lockfile --prefer-offline

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PUPPETEER_SKIP_DOWNLOAD=1' >> "$CLAUDE_ENV_FILE"
fi

echo "[session-start] Ambiente pronto."
