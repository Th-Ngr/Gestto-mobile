# GESTTO — Dashboard e Estado da Interface

## Responsabilidade

O dashboard apresenta informações derivadas dos lançamentos armazenados.

Conceitualmente:

```text
Firestore
   ↓
carregamento
   ↓
filtros
   ↓
cálculos
   ↓
estado da interface
   ↓
cards / tabelas / gráficos
```

## Regra importante

O dashboard não deve ser tratado como fonte de verdade.

A fonte de verdade financeira é o Firestore.

Os valores exibidos são derivados dos lançamentos carregados.

## Dependências

Alterações em:

- status;
- tipo;
- valor;
- data;
- mês;
- categoria;

podem afetar:

- saldo;
- receitas;
- despesas;
- pendências;
- gráficos;
- projeções.

Por isso, alterações no modelo de lançamento devem ser acompanhadas de testes do dashboard.

## Futuro

Em uma refatoração, o cálculo financeiro deve ser separado da manipulação do DOM. Isso permitirá testar as regras sem precisar executar a interface inteira.
