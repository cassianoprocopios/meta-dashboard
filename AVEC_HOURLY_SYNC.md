# Sincronização Horária do Avec

## Visão Geral

A sincronização horária do Avec é um job automático que executa a cada 1 hora para sincronizar dados de faturamento da unidade **Seraphine** com o sistema Avec via Relatório 0184.

## Arquivos Implementados

### 1. `server/avecHourlySync.ts`
Módulo principal de sincronização horária com as seguintes funções:

- **`iniciarSincronizacaoHorariaAvec()`** - Inicia o job de sincronização
- **`pararSincronizacaoHorariaAvec()`** - Para o job
- **`obterStatusSincronizacaoAvec()`** - Retorna o status atual
- **`executarSincronizacaoManualAvec()`** - Executa sincronização sob demanda

### 2. `server/avecHourlySync.test.ts`
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
- **Unidade sincronizada**: Seraphine

### Fluxo de Execução

1. **Buscar configurações** - Obtém todas as configurações de Avec do banco de dados
2. **Filtrar unidades** - Identifica apenas Seraphine
3. **Sincronizar dados** - Para cada unidade:
   - Conecta ao Avec via browser headless
   - Busca o Relatório 0184 (Faturamento por tipos de venda)
   - Extrai valores de:
     - **cat1**: Serviços
     - **cat2**: Pacotes
     - **cat3**: Produtos
     - **cat4**: Caixinha
   - Atualiza banco de dados
4. **Registrar logs** - Documenta cada sincronização
5. **Tratar erros** - Captura e registra erros sem interromper o fluxo

## Uso

### Iniciar o Job
O job é iniciado automaticamente quando o servidor inicia. Nenhuma ação manual é necessária.

### Sincronização Manual
Para sincronizar manualmente (fora do horário agendado):

```typescript
import { executarSincronizacaoManualAvec } from "./avecHourlySync";

await executarSincronizacaoManualAvec();
```

### Verificar Status
```typescript
import { obterStatusSincronizacaoAvec } from "./avecHourlySync";

const status = obterStatusSincronizacaoAvec();
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
import { pararSincronizacaoHorariaAvec } from "./avecHourlySync";

pararSincronizacaoHorariaAvec();
```

## Logs

Os logs da sincronização aparecem no console do servidor com prefixo `[Avec Hourly Sync]`:

```
[Avec Hourly Sync] Iniciando sincronização às 14:00:00
[Avec Hourly Sync] Sincronizando seraphine (tenant: 1, mês: 5/2026)
[Avec Hourly Sync] ✓ seraphine: 5 dias sincronizados, 0 fechados, 0 ignorados
[Avec Hourly Sync] Sincronização concluída às 14:00:45
```

## Tratamento de Erros

- Erros em uma unidade não interrompem a sincronização das outras
- Erros são registrados e armazenados (últimos 10)
- Notificações podem ser enviadas em caso de falhas críticas

## Testes

Para executar os testes:

```bash
pnpm test avecHourlySync.test.ts
```

## Configuração

### Variáveis de Ambiente
Nenhuma variável de ambiente específica é necessária. O job usa as configurações existentes do Avec.

### Banco de Dados
O job requer acesso às seguintes tabelas:
- `avecConfig` - Configurações de Avec
- `faturamentos` - Registros de faturamento

### Credenciais do Avec
As credenciais devem estar configuradas na tabela `avecConfig`:
- Email: `seraphinebeauty24@gmail.com`
- Senha: Configurada no banco de dados
- URL: `www.avec.app`

## Monitoramento

### Verificar se o Job está Ativo
```bash
# Nos logs do servidor, procure por:
[Avec Hourly Sync] Job de sincronização horária iniciado com sucesso
```

### Verificar Última Sincronização
```bash
# Nos logs do servidor, procure por:
[Avec Hourly Sync] Sincronização concluída às HH:MM:SS
```

### Erros Comuns

1. **"Nenhuma configuração de Avec encontrada"**
   - Verifique se as configurações estão cadastradas no banco
   - Verifique se `sincAutoAtiva = 1`

2. **"Nenhuma unidade Seraphine encontrada"**
   - Verifique se a unidade está cadastrada com o nome correto
   - Verifique se o slug da empresa contém "seraphine"

3. **Erro de conexão com Avec**
   - Verifique credenciais de Avec
   - Verifique conectividade com www.avec.app
   - Verifique se o navegador headless está funcionando

4. **Timeout na extração do Relatório 0184**
   - O servidor Avec pode estar lento
   - Tente sincronizar manualmente para diagnosticar

## Comparação com Job Diário

| Aspecto | Job Diário (avecJob.ts) | Job Horário (avecHourlySync.ts) |
|---------|------------------------|--------------------------------|
| Frequência | Uma vez por dia às 23h | A cada 1 hora |
| Unidades | Todas com sincAutoAtiva=1 | Apenas Seraphine |
| Uso | Sincronização completa diária | Sincronização frequente |
| Dados | Relatório 0184 completo | Relatório 0184 do período |

## Próximas Melhorias

- [ ] Dashboard de monitoramento em tempo real
- [ ] Alertas automáticos por email em caso de falha
- [ ] Histórico detalhado de sincronizações
- [ ] Retry automático em caso de falha
- [ ] Sincronização de outras unidades além de Seraphine
- [ ] Integração com webhook para notificações

## Suporte

Para questões ou problemas, verifique:
1. Os logs do servidor
2. O status do job com `obterStatusSincronizacaoAvec()`
3. A configuração de Avec no banco de dados
4. A conectividade com www.avec.app
