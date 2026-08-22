# GESTTO — Manual de Manutenção

## Antes de alterar

1. Faça backup.
2. Identifique o módulo afetado.
3. Procure todas as referências da função.
4. Verifique dependências no `script.js`.
5. Verifique efeitos no Firestore.
6. Teste criação, edição e exclusão quando aplicável.
7. Atualize a documentação.

## Antes de refatorar

Não mover funções apenas pela aparência.

Primeiro determine:

- quem chama a função;
- quais variáveis globais ela utiliza;
- quais elementos DOM ela modifica;
- quais coleções Firestore acessa;
- quais funções chama;
- se existe outra implementação com o mesmo nome.

## Depois de alterar

Testar no mínimo:

```text
[ ] login
[ ] cadastro
[ ] criação de lançamento
[ ] edição
[ ] exclusão
[ ] lançamento fixo
[ ] serviço
[ ] categoria
[ ] dashboard
[ ] logout
[ ] PWA
[ ] atualização
[ ] tratamento de erro
```

## Regra de documentação

Toda alteração relevante deve registrar:

```text
Data:
Módulo:
Problema:
Alteração:
Motivo:
Impacto:
```

## Regra de ouro

Não confiar na memória para decisões arquiteturais.

Se uma solução parecer estranha, mas tiver um motivo, documente o motivo.
