ALTER TABLE `cashbarberClientesMensais`
  ADD COLUMN `clientesNovos` int NOT NULL DEFAULT 0;

ALTER TABLE `cashbarberClientesMensais`
  ADD COLUMN `clientesRecorrentes` int NOT NULL DEFAULT 0;
