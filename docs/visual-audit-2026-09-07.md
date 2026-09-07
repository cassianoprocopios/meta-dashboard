# Auditoria visual do tema claro — 07/09/2026

A revisão cobriu 124 arquivos TSX, componentes renderizados em portal e os módulos administrativos e financeiros com maior concentração de classes herdadas do tema escuro.

## Correções verificadas

- O modal **Editar Colaborador** apresenta rótulos, campos, seletores, switches e ações com contraste alto em fundo branco.
- Em desktop, os campos ficam em duas colunas e as permissões em três cartões legíveis; os botões primário e secundário possuem hierarquia clara.
- Em celular, campos e permissões são empilhados sem cortes horizontais, mantendo rótulos e valores legíveis.
- Os cartões de **Feriados e fechamentos** e **Evolução mensal de clientes** usam superfícies brancas, bordas sutis e textos navy/slate adequados.
- Modais, dropdowns e popovers de produção não mantêm fundos escuros explícitos, exceto superfícies intencionais de navegação, tooltips e recuperação de senha.

## Evidências técnicas

- TypeScript: aprovado.
- Build de produção: aprovado.
- Testes de regressão visual: 8 aprovados.
- Suíte completa: 159 testes aprovados; 2 testes antigos de sincronização manual externa excederam o limite de 5 segundos, sem relação com a camada visual.

As rotas públicas de login, acesso profissional e estado não encontrado foram validadas em 1440 × 900 e 390 × 844. O login mantém sua composição institucional em desktop e se adapta para um único cartão em celular; o teclado de PIN permanece centralizado, legível e sem cortes. Não foram encontrados erros no console do navegador durante a revisão.
