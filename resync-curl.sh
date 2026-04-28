#!/bin/bash

echo "🔄 Resincronizando dados de 27/4 em diante"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Aguardar servidor estar pronto
echo -e "\n⏳ Aguardando servidor estar pronto..."
sleep 3

# URL do servidor
SERVER_URL="http://localhost:5173"

# Sincronizar MASCOTE
echo -e "\n📡 Sincronizando MASCOTE (abril 2026)..."
curl -X POST "$SERVER_URL/api/trpc/cashbarber.sincronizar" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "empresaSlug": "MASCOTE",
      "mes": 4,
      "ano": 2026
    }
  }' \
  -v

# Sincronizar MORUMBI
echo -e "\n\n📡 Sincronizando MORUMBI (abril 2026)..."
curl -X POST "$SERVER_URL/api/trpc/cashbarber.sincronizar" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "empresaSlug": "MORUMBI",
      "mes": 4,
      "ano": 2026
    }
  }' \
  -v

echo -e "\n\n✅ Resincronização disparada!"
echo "Verifique os logs do servidor para acompanhar o progresso."
