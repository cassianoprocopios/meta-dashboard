-- Limpar dados antigos de maio/2026
DELETE FROM cashbarber_atendimentos 
WHERE DATE(data_atendimento) >= '2026-05-01' 
AND DATE(data_atendimento) <= '2026-05-31';

-- Inserir dados MORUMBI (914 clientes)
INSERT INTO cashbarber_atendimentos (
  id, data_atendimento, empresa_slug, profissional_id, profissional_nome, 
  cliente_id, cliente_nome, servico, valor, duracao
)
SELECT 
  CONCAT('morumbi_', ROW_NUMBER() OVER ()) as id,
  DATE_ADD('2026-05-01', INTERVAL FLOOR(RAND() * 28) DAY) as data_atendimento,
  'MORUMBI' as empresa_slug,
  CONCAT('prof_', FLOOR(RAND() * 4)) as profissional_id,
  ELT(FLOOR(RAND() * 4) + 1, 'João Silva', 'Carlos Santos', 'Pedro Oliveira', 'Lucas Costa') as profissional_nome,
  CONCAT('cli_morumbi_', @row:=@row+1) as cliente_id,
  CONCAT('Cliente Morumbi ', @row) as cliente_nome,
  ELT(FLOOR(RAND() * 4) + 1, 'Corte', 'Barba', 'Corte + Barba', 'Pigmentação') as servico,
  ELT(FLOOR(RAND() * 4) + 1, 30, 25, 50, 40) as valor,
  30 as duracao
FROM (SELECT @row:=0) init
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t1
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t2
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t3
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t4
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t5
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t6
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t7
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t8
LIMIT 914;

-- Inserir dados MASCOTE (405 clientes)
INSERT INTO cashbarber_atendimentos (
  id, data_atendimento, empresa_slug, profissional_id, profissional_nome, 
  cliente_id, cliente_nome, servico, valor, duracao
)
SELECT 
  CONCAT('mascote_', ROW_NUMBER() OVER ()) as id,
  DATE_ADD('2026-05-01', INTERVAL FLOOR(RAND() * 28) DAY) as data_atendimento,
  'MASCOTE' as empresa_slug,
  CONCAT('prof_', FLOOR(RAND() * 3)) as profissional_id,
  ELT(FLOOR(RAND() * 3) + 1, 'André Ferreira', 'Bruno Mendes', 'Felipe Rocha') as profissional_nome,
  CONCAT('cli_mascote_', @row2:=@row2+1) as cliente_id,
  CONCAT('Cliente Mascote ', @row2) as cliente_nome,
  ELT(FLOOR(RAND() * 3) + 1, 'Corte', 'Barba', 'Corte + Barba') as servico,
  ELT(FLOOR(RAND() * 3) + 1, 30, 25, 50) as valor,
  30 as duracao
FROM (SELECT @row2:=0) init
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t1
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t2
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t3
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t4
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t5
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t6
CROSS JOIN (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) t7
LIMIT 405;
