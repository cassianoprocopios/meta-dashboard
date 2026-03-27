CREATE TABLE `accessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`userId` int,
	`userName` varchar(256),
	`userEmail` varchar(320),
	`acao` varchar(64) NOT NULL,
	`ip` varchar(64),
	`userAgent` text,
	`detalhes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bonificacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`pctQuinzenalSemMeta` decimal(6,2) NOT NULL DEFAULT '0',
	`pctQuinzenalComMeta` decimal(6,2) NOT NULL DEFAULT '0',
	`pctMensalSemMeta` decimal(6,2) NOT NULL DEFAULT '0',
	`pctMensalComMeta` decimal(6,2) NOT NULL DEFAULT '0',
	`pctSuperMeta` decimal(6,2) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bonificacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashbarberConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`cbEmail` varchar(320) NOT NULL,
	`cbSenha` varchar(256) NOT NULL,
	`cbFilialId` int NOT NULL,
	`cbFilialNome` varchar(128),
	`ultimaSincronizacao` timestamp,
	`statusUltimaSinc` varchar(32),
	`ativo` int NOT NULL DEFAULT 1,
	`sincAutoAtiva` int NOT NULL DEFAULT 0,
	`horarioSinc` varchar(5) DEFAULT '23:00',
	`dpoteFilialId` int,
	`dpoteFilialNome` varchar(128),
	`dpoteHistoricoId` int,
	`dpoteHistoricoMes` varchar(7),
	`dpoteValorAssinaturas` decimal(12,2),
	`dpotePorcentagemBarbearia` decimal(5,2),
	`recorrenciaFonte` varchar(16) DEFAULT 'cashbarber',
	`recorrenciaValorManual` decimal(12,2),
	`recorrenciaManualAtualizadoEm` timestamp,
	`recorrenciaValorCashbarber` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cashbarberConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashbarberMapeamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`tipo` enum('servico_categoria','produto_categoria','servico_id','produto_id') NOT NULL,
	`cbId` varchar(64) NOT NULL,
	`cbNome` varchar(128) NOT NULL,
	`metaCategoria` varchar(16) NOT NULL DEFAULT 'cat1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cashbarberMapeamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashbarberSyncLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`origem` varchar(16) NOT NULL DEFAULT 'manual',
	`status` varchar(16) NOT NULL DEFAULT 'ok',
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`diasSincronizados` int NOT NULL DEFAULT 0,
	`diasIgnorados` int NOT NULL DEFAULT 0,
	`erros` text,
	`executadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cashbarberSyncLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`nome` varchar(64) NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`apelido` varchar(64),
	`fotoUrl` text,
	`cargo` varchar(64) DEFAULT 'barbeiro',
	`cashbarberProfissionalId` int,
	`exibirNoRanking` int NOT NULL DEFAULT 1,
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colaboradores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpoteSyncLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`valorAnterior` decimal(12,2) NOT NULL DEFAULT '0',
	`valorNovo` decimal(12,2) NOT NULL DEFAULT '0',
	`variacao` decimal(12,2) NOT NULL DEFAULT '0',
	`diasAtualizados` int NOT NULL DEFAULT 0,
	`fonte` varchar(16) NOT NULL DEFAULT 'api',
	`tipoExecucao` varchar(16) NOT NULL DEFAULT 'automatico',
	`erro` text,
	`executadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dpoteSyncLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `empresas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`slug` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`cor` varchar(16) NOT NULL DEFAULT '#3b82f6',
	`tipoCategorias` enum('padrao','seraphine') NOT NULL DEFAULT 'padrao',
	`cat1Nome` varchar(64) NOT NULL DEFAULT 'Avulso',
	`cat2Nome` varchar(64) NOT NULL DEFAULT 'Produtos',
	`cat3Nome` varchar(64) NOT NULL DEFAULT 'Serv. Extra',
	`cat4Nome` varchar(64) NOT NULL DEFAULT 'Lavatório',
	`cat5Nome` varchar(64) NOT NULL DEFAULT 'Don Alcides',
	`cat6Nome` varchar(64) NOT NULL DEFAULT 'Caixinha',
	`cat7Nome` varchar(64) NOT NULL DEFAULT 'Barbiero',
	`cat8Nome` varchar(64) NOT NULL DEFAULT 'Bar',
	`cat9Nome` varchar(64) NOT NULL DEFAULT 'Recorrência',
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `empresas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faturamentoColaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`colaboradorId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`totalServicos` decimal(12,2) NOT NULL DEFAULT '0',
	`totalProdutos` decimal(12,2) NOT NULL DEFAULT '0',
	`totalGeral` decimal(12,2) NOT NULL DEFAULT '0',
	`detalhesServicos` text,
	`detalhesProdutos` text,
	`ultimaSyncEm` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faturamentoColaboradores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metasColaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`colaboradorId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`metaProdutos` decimal(12,2) NOT NULL DEFAULT '0',
	`metaAtendimentos` int DEFAULT 0,
	`bonificacaoMeta` decimal(10,2) DEFAULT '0',
	`bonificacaoSuperMeta` decimal(10,2) DEFAULT '0',
	`superMetaPct` decimal(5,2) DEFAULT '120',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metasColaboradores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificacaoEventos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`chave` varchar(256) NOT NULL,
	`tipo` enum('meta_atingida','mudanca_ranking') NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`mensagem` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacaoEventos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(128) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`adminEmail` varchar(320) NOT NULL,
	`plano` enum('trial','basico','pro') NOT NULL DEFAULT 'trial',
	`ativo` int NOT NULL DEFAULT 1,
	`validadeAte` timestamp,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `userEmpresas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`empresaSlug` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userEmpresas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `faturamentos` MODIFY COLUMN `totalPrevisto` decimal(12,2);--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `empresaSlug` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat1` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat2` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat3` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat4` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat5` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat6` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat7` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat8` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `cat9` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `lancadoPor` varchar(128);--> statement-breakpoint
ALTER TABLE `faturamentos` ADD `sincronizadoCB` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `empresaSlug` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `metaQuinzenal` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `superMeta` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `diasUteis` int DEFAULT 26 NOT NULL;--> statement-breakpoint
ALTER TABLE `metas` ADD `diasUteisQuinzenal` int DEFAULT 13 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `perfil` enum('gerente','operador','recepcionista') DEFAULT 'operador' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `empresaVinculada` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `telefone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `ativo` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `faturamentos` DROP COLUMN `empresa`;--> statement-breakpoint
ALTER TABLE `faturamentos` DROP COLUMN `servicos`;--> statement-breakpoint
ALTER TABLE `faturamentos` DROP COLUMN `vendaProdutos`;--> statement-breakpoint
ALTER TABLE `faturamentos` DROP COLUMN `novasAssinaturas`;--> statement-breakpoint
ALTER TABLE `faturamentos` DROP COLUMN `recorrencia`;--> statement-breakpoint
ALTER TABLE `metas` DROP COLUMN `empresa`;