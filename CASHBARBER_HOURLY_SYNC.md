# Sincronização Horária do CashBarber

## Visão Geral

A sincronização horária do CashBarber é um job automático que executa a cada 1 hora para sincronizar dados de faturamento das unidades **Mascote** e **Morumbi** com o sistema CashBarber.

## Arquivos Implementados

### 1. `server/cashbarberHourlySync.ts`
Módulo principal de sincronização horária com as seguintes funções:

- **`iniciarSincronizacaoHoraria()`** - Inicia o job de sincronização
- **`pararSincronizacaoHoraria()`** - Para o job
- **`obterStatusSincronizacao()`** - Retorna o status atual
- **`executarSincronizacaoManual()`** - Executa sincronização sob demanda

### 2. `server/cashbarberHourlySync.test.ts`
Testes unitários para validar:
- Inicialização do job
- Parada do job
- Status do job
- Prevenção de jobs duplicados
- Sincronização manual
- Histórico de erros

### 3. Integração em `server/_core/index.ts`
O job é inicializado automaticamente quando o servidor inicia.

## Como Funciona

### Cronograma
- **Frequência**: A cada 1 hora (minuto 0 de cada hora)
- **Expressão Cron**: `0 * * * *`
- **Unidades sincronizadas**: Mascote e Morumbi

### Fluxo de Execução

1. **Buscar configurações** - Obtém todas as configurações de CashBarber do banco de dados
2. **Filtrar unidades** - Identifica apenas Mascote e Morumbi
3. **Sincronizar dados** - Para cada unidade:
   - Busca dados do CashBarber
   - Processa faturamento por categoria
   - Atualiza banco de dados
4. **Registrar logs** - Documenta cada sincronização
5. **Tratar erros** - Captura e registra erros sem interromper o fluxo

## Uso

### Iniciar o Job
O job é iniciado automaticamente quando o servidor inicia. Nenhuma ação manual é necessária.

### Sincronização Manual
Para sincronizar manualmente (fora do horário agendado):

```typescript
import { executarSincronizacaoManual } from "./cashbarberHourlySync";

await executarSincronizacaoManual();
```

### Verificar Status
```typescript
import { obterStatusSincronizacao } from "./cashbarberHourlySync";

const status = obterStatusSincronizacao();
console.log(status);
// Saída:
// {
//   ativo: true,
//   ultimaExecucao: Date,
//   proximaExecucao: Date,
//   erros: [...]
// }
```

### Parar o Job
```typescript
import { pararSincronizacaoHoraria } from "./cashbarberHourlySync";

pararSincronizacaoHoraria();
```

## Logs

Os logs da sincronização aparecem no console do servidor com prefixo `[CashBarber Hourly Sync]`:

```
[CashBarber Hourly Sync] Iniciando sincronização às 14:00:00
[CashBarber Hourly Sync] Sincronizando mascote (tenant: 1, mês: 5/2026)
[CashBarber Hourly Sync] ✓ mascote: 5 dias sincronizados, 0 ignorados
[CashBarber Hourly Sync] Sincronizando morumbi (tenant: 1, mês: 5/2026)
[CashBarber Hourly Sync] ✓ morumbi: 5 dias sincronizados, 0 ignorados
[CashBarber Hourly Sync] Sincronização concluída às 14:00:30
```

## Tratamento de Erros

- Erros em uma unidade não interrompem a sincronização das outras
- Erros são registrados e armazenados (últimos 10)
- Notificações podem ser enviadas em caso de falhas críticas

## Testes

Para executar os testes:

```bash
pnpm test cashbarberHourlySync.test.ts
```

## Configuração

### Variáveis de Ambiente
Nenhuma variável de ambiente específica é necessária. O job usa as configurações existentes do CashBarber.

### Banco de Dados
O job requer acesso às seguintes tabelas:
- `cashbarberConfig` - Configurações de CashBarber
- `faturamento` - Registros de faturamento
- `cashbarberSyncLog` - Logs de sincronização

## Monitoramento

### Verificar se o Job está Ativo
```bash
# Nos logs do servidor, procure por:
[CashBarber Hourly Sync] Job iniciado com sucesso
```

### Verificar Última Sincronização
```bash
# Nos logs do servidor, procure por:
[CashBarber Hourly Sync] Sincronização concluída às HH:MM:SS
```

### Erros Comuns

1. **"Nenhuma configuração de CashBarber encontrada"**
   - Verifique se as configurações de CashBarber estão cadastradas no banco

2. **"Nenhuma unidade Mascote/Morumbi encontrada"**
   - Verifique se as unidades estão cadastradas com os nomes corretos

3. **Erro de conexão com CashBarber**
   - Verifique credenciais de CashBarber
   - Verifique conectividade com a API do CashBarber

## Próximas Melhorias

- [ ] Dashboard de monitoramento em tempo real
- [ ] Alertas automáticos por email em caso de falha
- [ ] Histórico detalhado de sincronizações
- [ ] Retry automático em caso de falha
- [ ] Sincronização de outras unidades além de Mascote e Morumbi

## Suporte

Para questões ou problemas, verifique:
1. Os logs do servidor
2. O status do job com `obterStatusSincronizacao()`
3. A configuração de CashBarber no banco de dados
