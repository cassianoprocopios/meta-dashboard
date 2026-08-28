CREATE TABLE IF NOT EXISTS `fechamentosUnidade` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`data` varchar(10) NOT NULL,
	`motivo` varchar(255) NOT NULL,
	`criadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fechamentosUnidade_id` PRIMARY KEY(`id`),
	CONSTRAINT `fechamentosUnidade_tenant_empresa_data_unique` UNIQUE(`tenantId`,`empresaSlug`,`data`)
);
