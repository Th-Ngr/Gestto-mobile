# GESTTO — Recorrência e Modelos Fixos

## Conceito

O GESTTO separa uma regra recorrente de um lançamento financeiro efetivamente registrado.

```text
Modelo fixo
    ↓
regra
    ↓
geração mensal
    ↓
Lançamento
    ↓
fato financeiro
```

## Modelo fixo

Fica armazenado em:

```text
modelos_fixos/{id}
```

O modelo contém informações utilizadas para gerar lançamentos.

## Lançamento gerado

O resultado da geração é persistido em:

```text
lancamentos/{id}
```

Isso permite que o lançamento de um mês tenha estado próprio, como `Pendente` ou `Pago`, sem alterar necessariamente o modelo.

## Exclusão

O sistema possui comportamento específico para lançamentos fixos, incluindo a possibilidade de remover apenas o lançamento atual ou lançamentos futuros relacionados.

Esse comportamento deve ser preservado durante refatorações.

## Risco atual

A identificação de recorrências utiliza partes textuais como nome, dia, mês e ano em determinados fluxos.

Isso funciona, mas é menos robusto do que possuir identificadores estruturados para:

```text
modeloId
ano
mes
```

Uma futura migração deve ser planejada antes de alterar esse comportamento.
