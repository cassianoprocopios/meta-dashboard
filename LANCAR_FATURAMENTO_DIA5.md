# Lançamento de Faturamento do Dia 5 - Seraphine

## Dados do Dia 5

| Tipo de Venda | Quantidade | Valor |
|---|---|---|
| Serviços | 2.409,00 | R$ 2.409,00 |
| Pacotes | 554,00 | R$ 554,00 |
| Produtos | 6,00 | R$ 6,00 |
| Caixinha | - | R$ 0,00 |
| **TOTAL** | - | **R$ 2.969,00** |

## Como Lançar

### Opção 1: Script Node (Recomendado)

```bash
cd /home/ubuntu/meta-dashboard
pnpm install
pnpm dev  # Em outro terminal

# Em outro terminal, execute:
node scripts/lancar-faturamento-dia5.mjs
```

**Resultado esperado:**
```
🚀 Iniciando lançamento de faturamento do dia 5 da Seraphine

📊 Dados a lançar:
   Data: 2026-05-05
   Serviços (cat1): R$ 2409.00
   Pacotes (cat2): R$ 554.00
   Produtos (cat3): R$ 6.00
   Caixinha (cat4): R$ 0.00
   Total: R$ 2969.00

📝 Lançando para Tenant 1...
   Inserindo novo registro...
✅ Tenant 1 lançado com sucesso!

📝 Lançando para Tenant 2...
   Inserindo novo registro...
✅ Tenant 2 lançado com sucesso!

📝 Lançando para Tenant 3...
   Inserindo novo registro...
✅ Tenant 3 lançado com sucesso!

✨ Lançamento concluído!
```

### Opção 2: Lançamento Manual via SQL

Se preferir lançar manualmente, execute este SQL no seu banco de dados:

```sql
-- Tenant 1
INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor, createdAt, updatedAt)
VALUES (1, 'SERAPHINE', '2026-05-05', '2409.00', '554.00', '6.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 'manual-dia5', NOW(), NOW())
ON DUPLICATE KEY UPDATE cat1='2409.00', cat2='554.00', cat3='6.00', cat4='0.00', lancadoPor='manual-dia5', updatedAt=NOW();

-- Tenant 2
INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor, createdAt, updatedAt)
VALUES (2, 'SERAPHINE', '2026-05-05', '2409.00', '554.00', '6.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 'manual-dia5', NOW(), NOW())
ON DUPLICATE KEY UPDATE cat1='2409.00', cat2='554.00', cat3='6.00', cat4='0.00', lancadoPor='manual-dia5', updatedAt=NOW();

-- Tenant 3
INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor, createdAt, updatedAt)
VALUES (3, 'SERAPHINE', '2026-05-05', '2409.00', '554.00', '6.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 'manual-dia5', NOW(), NOW())
ON DUPLICATE KEY UPDATE cat1='2409.00', cat2='554.00', cat3='6.00', cat4='0.00', lancadoPor='manual-dia5', updatedAt=NOW();
```

### Opção 3: Via Dashboard (Frontend)

Se implementado, você pode acessar o dashboard e usar um formulário para lançar os valores manualmente.

## Verificação

Após lançar, verifique se os dados foram inseridos:

```sql
SELECT * FROM faturamentos 
WHERE empresaSlug = 'SERAPHINE' 
AND data = '2026-05-05';
```

## Próximas Etapas

1. ✅ Lançar faturamento do dia 5
2. ⏳ Ativar sincronização automática horária (10:00-20:30)
3. ⏳ Monitorar sincronizações futuras

## Sincronização Automática Horária

Após lançar o dia 5, a sincronização automática horária (entre 10:00 e 20:30) será ativada para os próximos períodos.

Veja: `AVEC_HOURLY_SYNC_COMERCIAL.md`
