CREATE TABLE IF NOT EXISTS `avecRetry` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenantId` int NOT NULL,
  `empresaSlug` varchar(64) NOT NULL,
  `data` varchar(10) NOT NULL,
  `tentativas` int NOT NULL DEFAULT 0,
  `ultimaTentativa` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(16) NOT NULL DEFAULT 'pendente',
  `erroMensagem` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_tenant_empresa` (`tenantId`, `empresaSlug`),
  KEY `idx_status` (`status`)
);
