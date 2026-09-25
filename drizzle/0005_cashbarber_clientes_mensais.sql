CREATE TABLE IF NOT EXISTS `cashbarberClientesMensais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` int NOT NULL,
  `empresaSlug` varchar(64) NOT NULL,
  `mes` int NOT NULL,
  `ano` int NOT NULL,
  `totalClientes` int NOT NULL DEFAULT 0,
  `clientesComClube` int NOT NULL DEFAULT 0,
  `clientesSemClube` int NOT NULL DEFAULT 0,
  `fonte` varchar(32) NOT NULL DEFAULT 'cashbarber_relatorio09',
  `sincronizadoEm` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `cashbarberClientesMensais_id` PRIMARY KEY(`id`),
  CONSTRAINT `cashbarberClientesMensais_periodo_unique` UNIQUE(`tenantId`,`empresaSlug`,`mes`,`ano`)
);
