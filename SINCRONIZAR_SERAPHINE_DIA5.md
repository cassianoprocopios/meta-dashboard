# Sincronização de Faturamento da Seraphine - Dia 5

## Objetivo
Sincronizar o faturamento do dia 5 da Seraphine do sistema Avec para os três tenants (1, 2 e 3).

## Pré-requisitos
- Servidor em execução (`pnpm dev`)
- Banco de dados conectado
- Credenciais do Avec configuradas (email e senha)

## Como Executar

### Opção 1: Via Script Node (Recomendado)

```bash
cd /home/ubuntu/meta-dashboard
pnpm install
pnpm dev  # Em outro terminal
node scripts/sincronizar-seraphine-dia5.mjs
```

### Opção 2: Via tRPC Mutation (Frontend)

```typescript
// No seu componente React
import { trpc } from "@/lib/trpc";

const sincronizar = trpc.avec.sincronizar.useMutation();

// Executar sincronização
await sincronizar.mutateAsync({
  empresaSlug: "SERAPHINE",
  mes: 5,
  ano: 2026
});
```

### Opção 3: Via API REST

```bash
curl -X POST http://localhost:3000/api/trpc/avec.sincronizar \
  -H "Content-Type: application/json" \
  -d '{
    "empresaSlug": "SERAPHINE",
    "mes": 5,
    "ano": 2026
  }'
```

## O que Acontece

1. **Busca Configuração**: Recupera email e senha do Avec da tabela `avecConfig`
2. **Acesso ao Avec**: Faz login via browser headless
3. **Extrai Relatório 0184**: Busca dados de faturamento do dia 5
4. **Processa Dados**: Separa por categoria:
   - cat1: Serviços
   - cat2: Pacotes
   - cat3: Produtos
   - cat4: Caixinha
5. **Atualiza Banco**: Faz upsert na tabela `faturamentos`
6. **Registra Log**: Salva resultado em `avecSyncLog`

## Resultado Esperado

```json
{
  "diasSincronizados": 1,
  "diasIgnorados": 0,
  "diasFechados": 0,
  "detalhes": [
    {
      "data": "2026-05-05",
      "status": "sincronizado",
      "total": 5000.50,
      "mensagem": "Sincronizado com sucesso"
    }
  ]
}
```

## Troubleshooting

### Erro: "Configuração do Avec não encontrada"
- Verifique se as credenciais estão salvas em `avecConfig`
- Confirme que o `empresaSlug` está correto (deve ser "SERAPHINE")

### Erro: "Nenhum dado encontrado no Relatório 0184"
- Verifique se há faturamento registrado no dia 5 no Avec
- Confirme que o login está funcionando corretamente

### Erro: "Failed to fetch"
- O servidor Avec pode estar em manutenção
- Tente novamente em alguns minutos

## Monitoramento

Para acompanhar as sincronizações, consulte:
- Tabela `avecSyncLog` - Histórico de sincronizações
- Tabela `faturamentos` - Dados sincronizados
- Logs do servidor - Detalhes de execução

## Próximas Etapas

Após sincronizar o dia 5:
1. Verifique os valores no dashboard
2. Confirme se estão corretos
3. Ative a sincronização automática horária (10:00-20:30)
