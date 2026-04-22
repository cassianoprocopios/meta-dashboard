#!/bin/bash

# Sincronizar dias 13-20 de abril via endpoint tRPC
echo "[Sync Retroativo] Iniciando sincronização dos dias 13-20..."

curl -X POST http://localhost:3000/api/trpc/syncPainel.syncAvecRetroativo \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "dataInicio": "2026-04-13",
      "dataFim": "2026-04-20"
    }
  }' \
  -v

echo ""
echo "[Sync Retroativo] Sincronização enviada!"
