# Sincronização Horária do Avec - Horário Comercial (10:00 a 20:30)

## Visão Geral

A sincronização horária do Avec é um job automático que executa **a cada 1 hora APENAS entre 10:00 e 20:30** para sincronizar dados de faturamento da unidade **Seraphine** com o sistema Avec via Relatório 0184.

## Horários de Execução

O job executa nos seguintes horários:
- **10:00** ✓
- **11:00** ✓
- **12:00** ✓
- **13:00** ✓
- **14:00** ✓
- **15:00** ✓
- **16:00** ✓
- **17:00** ✓
- **18:00** ✓
- **19:00** ✓
- **20:00** ✓
- **21:00** ✗ (fora do horário)
- **22:00** ✗ (fora do horário)
- ... e assim por diante

## Arquivos Implementados

### 1. `server/avecHourlySync.ts`
Módulo principal de sincronização horária com as seguintes funções:

- **`iniciarSincronizacaoHorariaAvec()`** - Inicia o job de sincronização
- **`pararSincronizacaoHorariaAvec()`** - Para o job
- **`obterStatusSincronizacaoAvec()`** - Retorna o status atual
- **`executarSincronizacaoManualAvec()`** - Executa sincronização sob demanda (fora do horário)
- **`obterInfoHorarioComercial()`** - Retorna informações sobre o horário comercial

### 2. `server/avecHourlySync.test.ts`
Testes unitários para validar:
- Inicialização do job
- Parada do job
- Status do job
- Horário comercial
- Prevenção de jobs duplicados
- Sincronização manual
- Histórico de erros

### 3. Integração em `server/_core/index.ts`
O job é inicializado automaticamente quando o servidor inicia.

## Como Funciona

### Fluxo de Execução

1. **Verificar horário** - Valida se está entre 10:00 e 20:30
2. **Se fora do horário** - Pula a execução e registra no log
3. **Se dentro do horário**:
   - Busca configurações de Avec do banco de dados
   - Filtra apenas Seraphine
   - Conecta ao Avec via browser headless
   - Busca o Relatório 0184 (Faturamento por tipos de venda)
   - Extrai valores de:
     - **cat1**: Serviços
     - **cat2**: Pacotes
     - **cat3**: Produtos
     - **cat4**: Caixinha
   - Atualiza banco de dados
   - Registra logs

## Uso

### Iniciar o Job
O job é iniciado automaticamente quando o servidor inicia. Nenhuma ação manual é necessária.

```bash
pnpm dev
```

Você deverá ver nos logs:
```
[Avec Hourly Sync] Iniciando job de sincronização horária (10:00 - 20:30)...
[Avec Hourly Sync] ✓ Job iniciado com sucesso (executará entre 10:00 e 20:30)
```

### Sincronização Manual
Para sincronizar manualmente (fora do horário agendado):

```typescript
import { executarSincronizacaoManualAvec } from "./avecHourlySync";

await executarSincronizacaoManualAvec();
```

### Verificar Status
```typescript
import { obterStatusSincronizacaoAvec, obterInfoHorarioComercial } from "./avecHourlySync";

const status = obterStatusSincronizacaoAvec();
console.log(status);
// Saída:
// {
//   ativo: true,
//   ultimaExecucao: Date,
//   proximaExecucao: Date,
//   horarioInicio: "10:00",
//   horarioFim: "20:30",
//   erros: [...]
// }

const info = obterInfoHorarioComercial();
console.log(info);
// Saída:
// {
//   horarioInicio: "10:00",
//   horarioFim: "20:30",
//   estaNoHorario: true,
//   horaAtual: "14:30:45"
// }
```

### Parar o Job
```typescript
import { pararSincronizacaoHorariaAvec } from "./avecHourlySync";

pararSincronizacaoHorariaAvec();
```

## Logs

Os logs da sincronização aparecem no console do servidor com prefixo `[Avec Hourly Sync]`:

### Dentro do Horário Comercial
```
[Avec Hourly Sync] Iniciando sincronização às 14:00:00
[Avec Hourly Sync] Sincronizando seraphine (tenant: 1, mês: 5/2026)
[Avec Hourly Sync] ✓ seraphine: 5 dias sincronizados, 0 fechados, 0 ignorados
[Avec Hourly Sync] Sincronização concluída às 14:00:45
```

### Fora do Horário Comercial
```
[Avec Hourly Sync] Fora do horário comercial (21:00). Sincronização não será executada.
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

Saída esperada:
```
✓ Avec Hourly Sync com Restrição de Horário (9 testes)
  ✓ deve iniciar o job de sincronização horária
  ✓ deve parar o job de sincronização horária
  ✓ deve retornar status correto do job
  ✓ deve retornar horário comercial correto
  ✓ não deve iniciar job duplicado
  ✓ deve permitir sincronização manual
  ✓ deve manter histórico de erros (máximo 10)
  ✓ deve parar corretamente um job parado
  ✓ deve ter horário comercial definido
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

## Alterações Futuras

### Modificar Horário Comercial

Para alterar o horário de execução, edite `avecHourlySync.ts`:

```typescript
// Linha 26 - Expressão cron
const CRON_HORARIO_COMERCIAL = "0 9-21 * * *";  // 09:00 a 21:00

// Linhas 76-85 - Função de verificação
function estaNoHorarioComercial(): boolean {
  const horaInicio = 9;      // Início às 9:00
  const horaFim = 21;        // Fim às 21:00
  const minutoFim = 0;
  // ... resto do código
}
```

### Adicionar Mais Unidades

Para sincronizar outras unidades além de Seraphine, edite `avecHourlySync.ts`:

```typescript
// Linha 130
const unidadesParaSincronizar = configsDoTenant.filter(
  (c) =>
    c.empresaSlug &&
    (c.empresaSlug.toLowerCase().includes("seraphine") ||
      c.empresaSlug.toLowerCase().includes("outra-unidade"))  // Adicione aqui
);
```

## Próximas Etapas

1. ✅ Implementação concluída
2. ⏳ Aguardando execução no seu computador local
3. 📊 Monitorar sincronizações nos primeiros dias
4. 🔧 Ajustar configurações conforme necessário

## Suporte

Para questões ou problemas:
1. Consulte este documento
2. Verifique os logs do servidor
3. Execute os testes: `pnpm test avecHourlySync.test.ts`
4. Verifique a configuração de Avec no banco de dados
