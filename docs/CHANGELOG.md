# GESTTO — Changelog


## 2026-08-22 — Documentação v2

### Documentado
- Fluxo financeiro.
- Recorrência e modelos fixos.
- Serviços e categorização.
- Dashboard e estado da interface.
- Autenticação e perfil.
- PWA, atualização e monitoramento.
- Manual de manutenção.

### Riscos registrados
- Credencial do Telegram no frontend.
- Funções duplicadas.
- Listeners duplicados de configuração.
- Status com capitalização inconsistente.
- Dependência de identificadores textuais em recorrências.


## 2026-08-22 — Refatoração v3

### Segurança
- Removido token do Telegram do frontend.
- Logger mantém histórico de erros no Firestore.
- Integração Telegram fica preparada para migração para backend seguro.

### Estrutura
- Extraído `versionamento.js`.
- Extraído `monitoramento.js`.
- Consolidado o monitoramento de versão.
- Removidas duplicações conhecidas.
- Removido código morto que referenciava `p` fora de escopo.
- Criado backup do `script.js` anterior em `legacy/`.

