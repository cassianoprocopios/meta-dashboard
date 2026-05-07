-- Script para inserir faturamento do dia 5 da Seraphine
-- Data: 2026-05-05
-- Serviços: R$ 2.409,00
-- Pacotes: R$ 554,00
-- Produtos: R$ 6,00
-- Total: R$ 2.969,00

-- Inserir para Tenant 1
INSERT INTO faturamentos (
  tenantId, empresaSlug, data, 
  cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
  lancadoPor, createdAt, updatedAt
) VALUES (
  1, 'SERAPHINE', '2026-05-05',
  '2409.00', '554.00', '6.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
  'manual-dia5', NOW(), NOW()
)
ON DUPLICATE KEY UPDATE 
  cat1='2409.00', cat2='554.00', cat3='6.00', cat4='0.00',
  lancadoPor='manual-dia5', updatedAt=NOW();

-- Inserir para Tenant 2
INSERT INTO faturamentos (
  tenantId, empresaSlug, data, 
  cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
  lancadoPor, createdAt, updatedAt
) VALUES (
  2, 'SERAPHINE', '2026-05-05',
  '2409.00', '554.00', '6.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
  'manual-dia5', NOW(), NOW()
)
ON DUPLICATE KEY UPDATE 
  cat1='2409.00', cat2='554.00', cat3='6.00', cat4='0.00',
  lancadoPor='manual-dia5', updatedAt=NOW();

-- Inserir para Tenant 3
INSERT INTO faturamentos (
  tenantId, empresaSlug, data, 
  cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
  lancadoPor, createdAt, updatedAt
) VALUES (
  3, 'SERAPHINE', '2026-05-05',
  '2409.00', '554.00', '6.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
  'manual-dia5', NOW(), NOW()
)
ON DUPLICATE KEY UPDATE 
  cat1='2409.00', cat2='554.00', cat3='6.00', cat4='0.00',
  lancadoPor='manual-dia5', updatedAt=NOW();

-- Verificar os registros inseridos
SELECT * FROM faturamentos 
WHERE empresaSlug = 'SERAPHINE' 
AND data >= '2026-05-01' 
AND data <= '2026-05-05'
ORDER BY data DESC;
