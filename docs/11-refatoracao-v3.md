# GESTTO — Refatoração v3

## Objetivo

A primeira etapa de refatoração priorizou segurança e redução de duplicação sem alterar deliberadamente as regras financeiras.

## Alterações realizadas

### 1. Telegram

Removido o token do Telegram do frontend.

Antes:

```text
Browser → Telegram API
         ↑
       token
```

Agora:

```text
Browser → Firestore (histórico de erros)
```

A integração externa deverá ser reintroduzida por backend/Cloud Function.

**Ação recomendada:** se o token antigo ainda estiver ativo, revogá-lo e gerar outro.

### 2. Versionamento

Os três listeners duplicados de `configuracoes/sistema` foram substituídos por um módulo dedicado:

```text
js/sistema/versionamento.js
```

O módulo concentra:

- detecção de versão;
- sincronização inicial;
- contador de atualização;
- reload;
- novidades;
- manutenção.

### 3. Monitoramento

O logger foi movido para:

```text
js/sistema/monitoramento.js
```

As chamadas existentes a `window.logErroTelegram()` continuam funcionando para evitar uma alteração em massa no restante do código.

### 4. Funções duplicadas

Foram removidas implementações antigas duplicadas de:

- `gerenciarAcaoBotao`;
- `mostrarTutorialAjuste`;
- `carregarDadosPerfil`;
- `salvarDadosPerfil`.

Foi preservada a implementação mais recente/compatível com o HTML atual.

### 5. Código morto

Foi removido um bloco de notificação que referenciava a variável `p` fora de qualquer escopo conhecido. Esse bloco poderia causar `ReferenceError` durante a inicialização.

## Rollback

A versão imediatamente anterior está preservada em:

```text
legacy/script-pre-refatoracao-2026-08-22.js
```

## Próximas prioridades

1. padronizar constantes de status;
2. separar Firebase/configuração;
3. separar acesso ao Firestore por domínio;
4. reduzir dependência de `window.*`;
5. extrair financeiro;
6. extrair recorrência;
7. extrair serviços/categorias;
8. extrair dashboard;
9. revisar Security Rules;
10. testes manuais e automatizados.
