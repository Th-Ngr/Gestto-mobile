# GESTTO — Autenticação e Perfil

## Autenticação

O sistema utiliza Firebase Authentication.

O fluxo principal é:

```text
Firebase Auth
    ↓
onAuthStateChanged
    ↓
usuário autenticado?
 ├── não → tela de autenticação
 └── sim → carregamento da aplicação
```

## Cadastro

O projeto possui mais de um fluxo histórico de cadastro. Isso deve ser consolidado antes de uma refatoração.

O fluxo esperado deve ser único:

```text
Cadastro
 ↓
Firebase Auth
 ↓
verificação de e-mail
 ↓
documento de usuário
 ↓
entrada na aplicação
```

## Perfil

O perfil contém dados adicionais do usuário e é separado da identidade fornecida pelo Firebase Auth.

A identidade principal é o `uid`.

```text
Auth UID
   ↓
usuarios/{uid}
```

## Risco

Existem implementações duplicadas de funções relacionadas ao perfil. Antes de remover uma delas, verificar qual implementação está efetivamente sendo utilizada.
