# GESTTO — Serviços e Categorização

## Serviços

A coleção:

```text
servicos/{id}
```

representa serviços cadastrados para um usuário.

O serviço pode fornecer um valor padrão ou auxiliar no preenchimento de novos lançamentos.

## Fluxo de serviço

```text
Descrição digitada
      ↓
Busca por serviço
      ↓
Encontrado?
   ├── sim → usa informações do serviço
   └── não → continua fluxo normal
```

Há também lógica relacionada à atualização automática do valor cadastrado.

## Categorização

A categorização possui duas camadas:

```text
Descrição
   ↓
Regras existentes
   ↓
categoria encontrada?
   ├── sim → aplica
   └── não → análise/sugestão
```

## Regras

As regras são armazenadas em:

```text
regras_categorias/{uid}_{palavra}
```

Conceitualmente:

```text
palavra → categoria
```

## Análise histórica

O sistema pode analisar descrições existentes para encontrar palavras recorrentes e sugerir regras.

Depois que uma regra é criada, ela pode ser aplicada também aos lançamentos históricos correspondentes.

Isso torna o recurso mais do que um simples cadastro de categorias: ele funciona como um pequeno motor de regras.

## Cuidado

Alterações nessa lógica podem modificar lançamentos antigos. Qualquer mudança deve ser testada com uma cópia dos dados ou ambiente separado.
