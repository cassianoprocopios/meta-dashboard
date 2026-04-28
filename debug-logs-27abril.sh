#!/bin/bash

echo "🔍 Procurando logs de sincronização de 27/4 no servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Procurar por logs de 27/4 (pode estar em diferentes formatos)
echo -e "\n1️⃣ Logs de 27/4 (formato 2026-04-27):"
grep -i "2026-04-27\|27.*04.*2026" /home/ubuntu/meta-dashboard/.manus-logs/devserver.log 2>/dev/null | head -20

echo -e "\n2️⃣ Logs de sincronização de MASCOTE em 27/4:"
grep -i "MASCOTE.*27\|27.*MASCOTE" /home/ubuntu/meta-dashboard/.manus-logs/devserver.log 2>/dev/null | head -20

echo -e "\n3️⃣ Logs de erro de sincronização:"
grep -i "erro\|error\|fail" /home/ubuntu/meta-dashboard/.manus-logs/devserver.log 2>/dev/null | grep -i "cashbarber\|mascote\|morumbi" | tail -20

echo -e "\n4️⃣ Últimos 50 logs de CashBarber:"
grep -i "CashBarber" /home/ubuntu/meta-dashboard/.manus-logs/devserver.log 2>/dev/null | tail -50
