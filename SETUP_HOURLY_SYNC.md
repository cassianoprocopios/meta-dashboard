# Setup - Sincronização Horária do CashBarber

## Pré-requisitos

- Node.js 18+
- pnpm 8+
- Acesso ao banco de dados do projeto
- Configurações de CashBarber cadastradas no banco

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
├── cashbarberHourlySync.ts          # Novo - Módulo de sincronização horária
├── cashbarberHourlySync.test.ts     # Novo - Testes unitários
└── _core/
    └── index.ts                      # Modificado - Adiciona inicialização do job

CASHBARBER_HOURLY_SYNC.md            # Novo - Documentação
SETUP_HOURLY_SYNC.md                 # Novo - Este arquivo
```

### 3. Executar Testes

```bash
pnpm test cashbarberHourlySync.test.ts
```

Saída esperada:
```
✓ CashBarber Hourly Sync (6 testes)
  ✓ deve iniciar o job de sincronização horária
  ✓ deve parar o job de sincronização horária
  ✓ deve retornar status correto do job
  ✓ não deve iniciar job duplicado
  ✓ deve permitir sincronização manual
  ✓ deve manter histórico de erros
```

## Execução

### Iniciar o Servidor

```bash
pnpm dev
```

Você deverá ver nos logs:

```
[CashBarber Hourly Sync] Job de sincronização horária iniciado com sucesso
```

### Verificar Sincronização

Os logs de sincronização aparecerão a cada hora:

```
[CashBarber Hourly Sync] Iniciando sincronização às 14:00:00
[CashBarber Hourly Sync] Sincronizando mascote (tenant: 1, mês: 5/2026)
[CashBarber Hourly Sync] ✓ mascote: 5 dias sincronizados, 0 ignorados
[CashBarber Hourly Sync] Sincronizando morumbi (tenant: 1, mês: 5/2026)
[CashBarber Hourly Sync] ✓ morumbi: 5 dias sincronizados, 0 ignorados
[CashBarber Hourly Sync] Sincronização concluída às 14:00:30
```

## Troubleshooting

### Problema: "Nenhuma configuração de CashBarber encontrada"

**Solução:**
1. Verifique se as configurações estão cadastradas no banco:
```sql
SELECT * FROM cashbarberConfig WHERE tenantId = 1;
```

2. Se vazio, cadastre as configurações via interface web ou SQL

### Problema: "Nenhuma unidade Mascote/Morumbi encontrada"

**Solução:**
1. Verifique os nomes das unidades no banco:
```sql
SELECT DISTINCT empresaSlug FROM cashbarberConfig;
```

2. Ajuste os nomes em `cashbarberHourlySync.ts` se necessário:
```typescript
// Linha 66-70
const unidadesParaSincronizar = configsDoTenant.filter(
  (c) =>
    c.empresaSlug &&
    (c.empresaSlug.toLowerCase().includes("mascote") ||  // Ajuste aqui
      c.empresaSlug.toLowerCase().includes("morumbi"))   // E aqui
);
```

### Problema: Erros de sincronização

**Verificar logs:**
1. Procure por `[CashBarber Hourly Sync] ✗` nos logs
2. Verifique a mensagem de erro completa
3. Consulte `CASHBARBER_HOURLY_SYNC.md` para soluções comuns

## Configuração Avançada

### Alterar Frequência de Sincronização

Para sincronizar a cada 30 minutos, edite `cashbarberHourlySync.ts`:

```typescript
// Linha 19
const CRON_HOURLY = "*/30 * * * *";  // A cada 30 minutos
```

Expressões cron comuns:
- `0 * * * *` - A cada hora
- `*/30 * * * *` - A cada 30 minutos
- `*/15 * * * *` - A cada 15 minutos
- `0 0 * * *` - Uma vez por dia à meia-noite

### Adicionar Mais Unidades

Para sincronizar outras unidades além de Mascote e Morumbi, edite `cashbarberHourlySync.ts`:

```typescript
// Linha 66-70
const unidadesParaSincronizar = configsDoTenant.filter(
  (c) =>
    c.empresaSlug &&
    (c.empresaSlug.toLowerCase().includes("mascote") ||
      c.empresaSlug.toLowerCase().includes("morumbi") ||
      c.empresaSlug.toLowerCase().includes("seraphine"))  // Adicione aqui
);
```

### Sincronização Manual via API

Adicione um endpoint para sincronização manual:

```typescript
// Em server/routers.ts
cashbarberSyncManual: publicProcedure.mutation(async () => {
  const { executarSincronizacaoManual } = await import("../cashbarberHourlySync");
  await executarSincronizacaoManual();
  return { ok: true };
}),
```

## Monitoramento em Produção

### Verificar Status do Job

```bash
# Nos logs do servidor, procure por:
grep "CashBarber Hourly Sync" server.log
```

### Alertas Recomendados

Configure alertas para:
1. Sincronização não completada em 1 hora
2. Mais de 3 erros consecutivos
3. Falha de conexão com CashBarber

## Próximas Etapas

1. ✅ Implementação concluída
2. ⏳ Aguardando execução no seu computador local
3. 📊 Monitorar sincronizações nos primeiros dias
4. 🔧 Ajustar configurações conforme necessário

## Suporte

Para questões ou problemas:
1. Consulte `CASHBARBER_HOURLY_SYNC.md`
2. Verifique os logs do servidor
3. Execute os testes: `pnpm test cashbarberHourlySync.test.ts`
