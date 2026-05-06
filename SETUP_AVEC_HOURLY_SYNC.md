# Setup - Sincronização Horária do Avec

## Pré-requisitos

- Node.js 18+
- pnpm 8+
- Acesso ao banco de dados do projeto
- Configurações de Avec cadastradas no banco
- Credenciais válidas do Avec (email e senha)

## Instalação

### 1. Instalar Dependências

```bash
cd /home/ubuntu/meta-dashboard
pnpm install
```

### 2. Verificar Arquivos Criados

Os seguintes arquivos foram criados/modificados:

```
server/
├── avecHourlySync.ts                # Novo - Módulo de sincronização horária
├── avecHourlySync.test.ts           # Novo - Testes unitários
└── _core/
    └── index.ts                      # Modificado - Adiciona inicialização do job

AVEC_HOURLY_SYNC.md                  # Novo - Documentação
SETUP_AVEC_HOURLY_SYNC.md            # Novo - Este arquivo
```

### 3. Configurar Avec no Banco de Dados

Verifique se a configuração do Avec está cadastrada:

```sql
SELECT * FROM avecConfig WHERE empresaSlug = 'seraphine';
```

Se não existir, crie:

```sql
INSERT INTO avecConfig (
  tenantId,
  empresaSlug,
  avecEmail,
  avecSenha,
  avecSalaoNome,
  sincAutoAtiva,
  ativo
) VALUES (
  1,
  'seraphine',
  'seraphinebeauty24@gmail.com',
  'Dxj4oue@',
  'Seraphine',
  1,
  1
);
```

### 4. Executar Testes

```bash
pnpm test avecHourlySync.test.ts
```

Saída esperada:
```
✓ Avec Hourly Sync (7 testes)
  ✓ deve iniciar o job de sincronização horária
  ✓ deve parar o job de sincronização horária
  ✓ deve retornar status correto do job
  ✓ não deve iniciar job duplicado
  ✓ deve permitir sincronização manual
  ✓ deve manter histórico de erros
  ✓ deve parar corretamente um job parado
```

## Execução

### Iniciar o Servidor

```bash
pnpm dev
```

Você deverá ver nos logs:

```
[Avec Hourly Sync] Job de sincronização horária iniciado com sucesso
```

### Verificar Sincronização

Os logs de sincronização aparecerão a cada hora:

```
[Avec Hourly Sync] Iniciando sincronização às 14:00:00
[Avec Hourly Sync] Sincronizando seraphine (tenant: 1, mês: 5/2026)
[Avec Hourly Sync] ✓ seraphine: 5 dias sincronizados, 0 fechados, 0 ignorados
[Avec Hourly Sync] Sincronização concluída às 14:00:45
```

## Troubleshooting

### Problema: "Nenhuma configuração de Avec encontrada"

**Solução:**
1. Verifique se as configurações estão cadastradas no banco:
```sql
SELECT * FROM avecConfig WHERE tenantId = 1;
```

2. Se vazio, cadastre as configurações via SQL ou interface web

3. Verifique se `sincAutoAtiva = 1`:
```sql
UPDATE avecConfig SET sincAutoAtiva = 1 WHERE empresaSlug = 'seraphine';
```

### Problema: "Nenhuma unidade Seraphine encontrada"

**Solução:**
1. Verifique os nomes das unidades no banco:
```sql
SELECT DISTINCT empresaSlug FROM avecConfig;
```

2. Ajuste os nomes em `avecHourlySync.ts` se necessário:
```typescript
// Linha 77-79
const unidadesParaSincronizar = configsDoTenant.filter(
  (c) => c.empresaSlug && c.empresaSlug.toLowerCase().includes("seraphine")  // Ajuste aqui
);
```

### Problema: Erro de conexão com Avec

**Verificar:**
1. Credenciais de Avec estão corretas:
```sql
SELECT avecEmail, avecSenha FROM avecConfig WHERE empresaSlug = 'seraphine';
```

2. Conectividade com www.avec.app:
```bash
curl -I https://www.avec.app
```

3. Verifique os logs para mensagens de erro específicas

### Problema: Sincronização não está acontecendo

**Verificar:**
1. Job está ativo? Procure nos logs por:
```
[Avec Hourly Sync] Job de sincronização horária iniciado com sucesso
```

2. Verifique se há erros nos logs:
```bash
grep "Avec Hourly Sync" server.log | grep "✗"
```

3. Verifique o status do job:
```typescript
import { obterStatusSincronizacaoAvec } from "./avecHourlySync";
console.log(obterStatusSincronizacaoAvec());
```

## Configuração Avançada

### Alterar Frequência de Sincronização

Para sincronizar a cada 30 minutos, edite `avecHourlySync.ts`:

```typescript
// Linha 20
const CRON_HOURLY = "*/30 * * * *";  // A cada 30 minutos
```

Expressões cron comuns:
- `0 * * * *` - A cada hora
- `*/30 * * * *` - A cada 30 minutos
- `*/15 * * * *` - A cada 15 minutos
- `0 0 * * *` - Uma vez por dia à meia-noite

### Adicionar Mais Unidades

Para sincronizar outras unidades além de Seraphine, edite `avecHourlySync.ts`:

```typescript
// Linha 77-79
const unidadesParaSincronizar = configsDoTenant.filter(
  (c) =>
    c.empresaSlug &&
    (c.empresaSlug.toLowerCase().includes("seraphine") ||
      c.empresaSlug.toLowerCase().includes("outra-unidade"))  // Adicione aqui
);
```

### Sincronização Manual via API

Adicione um endpoint para sincronização manual:

```typescript
// Em server/routers.ts
avecSyncManual: publicProcedure.mutation(async () => {
  const { executarSincronizacaoManualAvec } = await import("../avecHourlySync");
  await executarSincronizacaoManualAvec();
  return { ok: true };
}),
```

## Monitoramento em Produção

### Verificar Status do Job

```bash
# Nos logs do servidor, procure por:
grep "Avec Hourly Sync" server.log
```

### Alertas Recomendados

Configure alertas para:
1. Sincronização não completada em 1 hora
2. Mais de 3 erros consecutivos
3. Falha de conexão com Avec

### Dashboard de Monitoramento

Crie um endpoint para monitorar o status:

```typescript
// Em server/routers.ts
avecSyncStatus: publicProcedure.query(async () => {
  const { obterStatusSincronizacaoAvec } = await import("../avecHourlySync");
  return obterStatusSincronizacaoAvec();
}),
```

## Próximas Etapas

1. ✅ Implementação concluída
2. ⏳ Aguardando execução no seu computador local
3. 📊 Monitorar sincronizações nos primeiros dias
4. 🔧 Ajustar configurações conforme necessário

## Suporte

Para questões ou problemas:
1. Consulte `AVEC_HOURLY_SYNC.md`
2. Verifique os logs do servidor
3. Execute os testes: `pnpm test avecHourlySync.test.ts`
4. Verifique a configuração de Avec no banco de dados

## Comparação com Outras Sincronizações

| Sistema | Frequência | Unidades | Arquivo |
|---------|-----------|----------|---------|
| CashBarber Horária | A cada 1 hora | Mascote, Morumbi | `cashbarberHourlySync.ts` |
| Avec Horária | A cada 1 hora | Seraphine | `avecHourlySync.ts` |
| Avec Diária | Uma vez por dia (23h) | Todas ativas | `avecJob.ts` |
| CashBarber Diária | 2x por dia (7h, 18h) | Todas ativas | `cashbarberJob.ts` |
