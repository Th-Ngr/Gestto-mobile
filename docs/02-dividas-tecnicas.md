# GESTTO Finance — Dívidas Técnicas e Plano de Correção

## Prioridade P0 — Segurança

### Token Telegram no frontend

**Situação:** existe token de bot dentro de `script.js`.

**Risco:** qualquer usuário com acesso ao JavaScript pode recuperar a credencial.

**Ação:**

1. revogar/rotacionar o token atual;
2. criar nova credencial;
3. mover o envio para backend/Cloud Function;
4. deixar no frontend apenas uma chamada ao endpoint seguro;
5. revisar logs para garantir que o segredo não seja impresso.

---

## Prioridade P1 — Confiabilidade

### Status financeiros

Centralizar:

```js
const STATUS = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  RECEBIDO: "Recebido"
};
```

Substituir strings espalhadas pelo código.

### Segurança Firestore

Auditar as Security Rules para confirmar que:

- `lancamentos.userId` pertence ao usuário autenticado;
- `servicos.uid` pertence ao usuário autenticado;
- `modelos_fixos.uid` pertence ao usuário autenticado;
- `regras_categorias` só pode ser acessada pelo proprietário;
- configurações globais não podem ser alteradas livremente por clientes.

---

## Prioridade P2 — Manutenibilidade

### Consolidar funções duplicadas

Já foram encontradas múltiplas definições de:

- `gerenciarAcaoBotao`
- `mostrarTutorialAjuste`
- `carregarDadosPerfil`
- `salvarDadosPerfil`

A implementação efetivamente usada deve ser identificada antes de remover qualquer versão.

### Reduzir `window.*`

A aplicação expõe grande parte da lógica como propriedades globais. A meta é reduzir esse acoplamento e usar módulos ES.

### Consolidar listeners

O documento `configuracoes/sistema` possui múltiplos `onSnapshot()` relacionados a atualização/manutenção/novidades. Deve existir um único gerenciador de estado do sistema.

---

## Prioridade P3 — Qualidade

### Normalizar datas

Avaliar migração gradual de `mes` como texto para uma representação temporal estruturada.

Não alterar a estrutura sem plano de migração dos dados existentes.

### Service Worker

Definir uma estratégia única para versionamento:

```text
versão do aplicativo
        ↓
service worker
        ↓
cache
        ↓
Firestore/configuração de versão
```

### Manifest

Corrigir o valor de `background_color` para um hexadecimal válido.

---

# Ordem recomendada

```text
P0 Segurança
   ↓
P1 Firestore + status
   ↓
P2 duplicações/listeners
   ↓
P2 modularização
   ↓
P3 datas/cache/manifest
   ↓
testes
```

**Não refatorar tudo de uma vez.** Cada etapa deve preservar uma versão funcional do GESTTO.
