ALTER TABLE `empresas`
  ADD COLUMN `cat11Nome` varchar(64) NOT NULL DEFAULT 'Estética',
  ADD COLUMN `cat12Nome` varchar(64) NOT NULL DEFAULT 'Óleo Essencial';

ALTER TABLE `faturamentos`
  ADD COLUMN `cat11` decimal(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `cat12` decimal(12,2) NOT NULL DEFAULT 0;
