#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Uso:
#   MYSQL_HOST=... MYSQL_PORT=3306 MYSQL_USER=... MYSQL_PASSWORD=... \
#   MYSQL_DATABASE=... ./scripts/export-mysql-production.sh ./backups/meta-dashboard-$(date +%F)
#
# O script é somente-leitura. Ele não executa ALTER, LOCK TABLES explícito,
# FLUSH TABLES WITH READ LOCK, DROP, DELETE ou qualquer alteração no servidor.
# A consistência sem parada depende de todas as tabelas estarem em InnoDB.

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 <prefixo-do-backup>" >&2
  exit 64
fi

: "${MYSQL_HOST:?Defina MYSQL_HOST}"
: "${MYSQL_PORT:=3306}"
: "${MYSQL_USER:?Defina MYSQL_USER}"
if [[ -n "${MYSQL_PASSWORD_FILE:-}" ]]; then
  [[ -r "$MYSQL_PASSWORD_FILE" ]] || { echo "MYSQL_PASSWORD_FILE não pode ser lido" >&2; exit 64; }
  MYSQL_PASSWORD="$(<"$MYSQL_PASSWORD_FILE")"
fi
: "${MYSQL_PASSWORD:?Defina MYSQL_PASSWORD ou MYSQL_PASSWORD_FILE}"
: "${MYSQL_DATABASE:?Defina MYSQL_DATABASE}"

prefix="$1"
out_dir="$(dirname -- "$prefix")"
mkdir -p -- "$out_dir"
mkdir -p -- "${prefix}.meta"
chmod 700 -- "${prefix}.meta"

cnf="$(mktemp "${prefix}.meta/mysql-client.XXXXXX.cnf")"
cleanup() {
  rm -f -- "$cnf"
}
trap cleanup EXIT
chmod 600 -- "$cnf"
cat >"$cnf" <<EOF
[client]
host=${MYSQL_HOST}
port=${MYSQL_PORT}
user=${MYSQL_USER}
password=${MYSQL_PASSWORD}
EOF

command -v mysqldump >/dev/null || { echo "mysqldump não encontrado" >&2; exit 127; }
command -v mysql >/dev/null || { echo "mysql não encontrado" >&2; exit 127; }

# Verifica engine antes do dump. MyISAM não participa do snapshot transacional.
mysql --defaults-extra-file="$cnf" --batch --skip-column-names "$MYSQL_DATABASE" \
  -e "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME" \
  >"${prefix}.meta/table-engines.tsv"
if awk -F '\t' '$2 != "InnoDB" { bad=1; print } END { exit bad }' "${prefix}.meta/table-engines.tsv"; then
  :
else
  echo "ERRO: existem tabelas que não são InnoDB; não trate o dump como snapshot consistente." >&2
  exit 2
fi

# single-transaction evita bloquear escritas em tabelas InnoDB.
# skip-lock-tables evita LOCK TABLES; routines/triggers/events preservam objetos auxiliares.
mysqldump --defaults-extra-file="$cnf" \
  --single-transaction \
  --skip-lock-tables \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  --default-character-set=utf8mb4 \
  --databases "$MYSQL_DATABASE" \
  >"${prefix}.mysql.sql"

# Metadados de auditoria sem segredos.
{
  printf 'created_at_utc\t%s\n' "$(date -u +%FT%TZ)"
  printf 'database\t%s\n' "$MYSQL_DATABASE"
  printf 'host\t%s\n' "$MYSQL_HOST"
  printf 'port\t%s\n' "$MYSQL_PORT"
  printf 'dump_file_sha256\t%s\n' "$(sha256sum "${prefix}.mysql.sql" | awk '{print $1}')"
  printf 'dump_file_bytes\t%s\n' "$(stat -c '%s' "${prefix}.mysql.sql")"
} >"${prefix}.meta/manifest.tsv"

# Contagens de linhas para validação posterior; não expõe valores de credenciais.
mysql --defaults-extra-file="$cnf" --batch --skip-column-names "$MYSQL_DATABASE" \
  -e "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME" \
  >"${prefix}.meta/table-row-estimates.tsv"

chmod 600 -- "${prefix}.mysql.sql" "${prefix}.meta"/*
echo "Backup criado: ${prefix}.mysql.sql"
echo "Manifesto criado: ${prefix}.meta/manifest.tsv"
echo "Nenhuma escrita ou parada foi solicitada ao banco."
