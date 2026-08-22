# GESTTO — PWA, Atualização e Monitoramento

## PWA

O projeto possui:

```text
manifest.json
service-worker.js
```

Isso permite comportamento de Progressive Web App, incluindo instalação e cache.

## Service Worker

O service worker possui seu próprio controle de versão/cache.

Essa versão não deve ser confundida automaticamente com a versão funcional armazenada no Firestore.

São mecanismos diferentes:

```text
Service Worker
    ↓
cache técnico

Firestore / configuração
    ↓
versão da aplicação
```

## Atualização

O sistema observa configuração remota para detectar alterações de versão, manutenção e novidades.

Atualmente existem múltiplos listeners relacionados ao mesmo documento.

### Dívida técnica

Consolidar o gerenciamento de versão em um único módulo.

## Monitoramento

O projeto possui registro de erros e integração com Telegram.

Fluxo conceitual:

```text
Erro
 ├── Firestore
 └── Telegram
```

## Segurança crítica

Credenciais de integração externa não devem ficar no JavaScript entregue ao navegador.

O token do Telegram encontrado no projeto deve ser rotacionado se ainda estiver ativo.

O desenho futuro deve ser:

```text
GESTTO
  ↓
Backend / Cloud Function
  ↓
Telegram
```

e não:

```text
GESTTO
  ↓
Telegram diretamente com segredo embutido
```
