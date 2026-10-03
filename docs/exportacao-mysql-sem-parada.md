# Exportação MySQL de produção sem parada

O script `scripts/export-mysql-production.sh` é somente-leitura e usa `mysqldump --single-transaction --skip-lock-tables`. Para tabelas InnoDB, isso cria um snapshot consistente sem interromper inserts, updates ou selects.

## Pré-condições

- Usuário MySQL com `SELECT`, `SHOW VIEW`, `TRIGGER`, `EVENT` e, se necessário, `SHOW ROUTINE`/permissões para rotinas.
- Todas as tabelas de negócio em InnoDB.
- Espaço local suficiente para o dump.
- Janela de menor tráfego, embora não seja necessária parada.
- Backup armazenado fora do repositório.

## Execução

```bash
chmod +x scripts/export-mysql-production.sh
mkdir -p backups

MYSQL_HOST='host-real' \
MYSQL_PORT='3306' \
MYSQL_USER='usuario-somente-leitura' \
MYSQL_PASSWORD='nao-coloque-no-chat' \
MYSQL_DATABASE='nome_real' \
  ./scripts/export-mysql-production.sh "backups/meta-dashboard-$(date -u +%Y%m%dT%H%M%SZ)"
```

Evite colocar a senha diretamente em comandos registrados no histórico do shell. Em produção, prefira ler a senha de um cofre/secret manager e exportá-la apenas para o processo, ou use um arquivo temporário com `chmod 600`.

## O que o script faz

1. Cria um arquivo temporário de credenciais com permissão 600.
2. Verifica os engines das tabelas.
3. Interrompe se encontrar tabelas que não sejam InnoDB.
4. Executa dump com `--single-transaction`.
5. Inclui rotinas, triggers, events e blobs.
6. Cria SHA-256, tamanho e manifesto sem segredos.
7. Cria estimativas de linhas para comparação posterior.
8. Remove o arquivo temporário de credenciais ao sair.

## O que ele não garante

- Não cria consistência transacional para MyISAM.
- Não congela dados que mudarem depois do snapshot.
- Não exporta objetos específicos do provedor fora do MySQL.
- Não converte automaticamente a sintaxe para PostgreSQL.
- Não deve ser executado com privilégios de escrita necessários apenas para exportação.

## Validação após a exportação

```bash
sha256sum backups/meta-dashboard-*.mysql.sql
sed -n '1,30p' backups/meta-dashboard-*.meta/manifest.tsv
cat backups/meta-dashboard-*.meta/table-engines.tsv
```

Guarde o `.sql` e o diretório `.meta` em armazenamento privado e criptografado. Não faça commit, upload público ou envio por chat.
