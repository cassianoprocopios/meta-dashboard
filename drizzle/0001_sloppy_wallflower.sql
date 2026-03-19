CREATE TABLE `faturamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` enum('MORUMBI','MASCOTE','SERAPHINE') NOT NULL,
	`data` date NOT NULL,
	`servicos` decimal(12,2) NOT NULL DEFAULT '0',
	`vendaProdutos` decimal(12,2) NOT NULL DEFAULT '0',
	`novasAssinaturas` decimal(12,2) NOT NULL DEFAULT '0',
	`recorrencia` decimal(12,2) NOT NULL DEFAULT '0',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faturamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` enum('MORUMBI','MASCOTE','SERAPHINE') NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`metaMensal` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_id` PRIMARY KEY(`id`)
);
