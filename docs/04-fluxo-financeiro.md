# GESTTO — Fluxo Financeiro

## Objetivo

Este documento descreve o ciclo de vida de um lançamento financeiro no GESTTO.

## Fluxo geral

```text
Interface
  ↓
Entrada do usuário
  ↓
Validação
  ↓
Classificação
  ├── tipo
  ├── status
  ├── categoria
  └── serviço
  ↓
Persistência
  ↓
Firestore / lancamentos
  ↓
Atualização da interface
  ↓
Dashboard / gráficos / pendências
```

## Conceitos

### Lançamento

É o fato financeiro registrado no sistema. Ele possui proprietário (`userId`) e informações como descrição, valor, data, tipo, status, pagamento e categoria.

### Entrada

Representa dinheiro recebido. Pode estar associada a cliente/serviço.

### Saída

Representa dinheiro gasto. A forma de classificação depende das regras da aplicação.

### Status

O código utiliza estados como `Pago`, `Pendente`, `Atrasado` e `Recebido`. A capitalização deve ser padronizada antes de qualquer refatoração.

## Persistência

A coleção principal é:

```text
lancamentos/{id}
```

Cada documento deve estar associado ao usuário autenticado por meio de `userId`.

> O filtro do frontend não substitui regras de segurança do Firestore.

## Regra de segurança

A regra fundamental é:

```text
usuário autenticado
    ↓
somente seus próprios lançamentos
```

Essa regra precisa ser garantida também pelas Security Rules do Firestore.

## Manutenção

Antes de alterar o fluxo financeiro, verificar:

1. criação;
2. edição;
3. exclusão;
4. geração por modelo fixo;
5. categorização automática;
6. atualização do dashboard;
7. filtros por mês;
8. pendências;
9. gráficos.

Uma alteração aparentemente pequena em `lancamentos` pode afetar vários desses pontos.
