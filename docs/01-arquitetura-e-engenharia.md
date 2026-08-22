# GESTTO Finance — Arquitetura e Engenharia

> Documento de engenharia reversa — primeira versão baseada no código entregue em `Gestto-mobile-main.zip`.
>
> **Fonte da verdade:** código atual. A documentação antiga em `markdonw/` deve ser considerada material histórico até ser revisada.

## 1. Visão geral

O GESTTO é uma aplicação web progressiva (PWA) de gestão financeira, executada no navegador e integrada ao Firebase.

### Tecnologias identificadas

- HTML5
- CSS3
- JavaScript ES Modules
- Firebase 10.12.2
  - Firebase Authentication
  - Cloud Firestore
  - persistência local/offline do Firestore
- Chart.js
- SweetAlert2
- Service Worker
- Web Notifications API
- Telegram para suporte/monitoramento

## 2. Estrutura atual

```text
Gestto-mobile-main/
├── index.html
├── script.js                 # lógica principal; ~3.136 linhas
├── styles.css
├── service-worker.js
├── manifest.json
├── favicon.png
├── financeiro.png
├── icons/
│   ├── 192.png
│   └── 512.png
├── markdonw/                 # documentação histórica
└── docs/                     # documentação de engenharia
```

## 3. Arquitetura atual

Hoje a maior parte da aplicação está concentrada em `script.js`. O arquivo mistura apresentação, estado, regras de negócio, acesso ao Firestore, autenticação, PWA, versionamento e monitoramento.

```text
index.html
    │
    ▼
 script.js
    │
    ├── Firebase Auth
    ├── Firestore
    ├── regras financeiras
    ├── UI/DOM
    ├── dashboard/gráficos
    ├── categorias
    ├── serviços
    ├── modelos fixos
    ├── atualização do app
    ├── PWA
    └── monitoramento/Telegram
```

Essa concentração é a principal dívida arquitetural do projeto, mas **não deve ser refatorada antes do término do mapeamento funcional**.

## 4. Domínios identificados

### 4.1 Autenticação

Responsável por:

- criação de conta;
- login;
- logout;
- recuperação de senha;
- verificação de e-mail;
- observação do estado de autenticação.

O Firebase Auth fornece o `uid`, usado para associar dados ao usuário.

### 4.2 Lançamentos

Coleção principal: `lancamentos`.

O fluxo principal consulta por:

- `userId`;
- `mes`;
- ordenação por `data` decrescente.

O lançamento representa um fato financeiro já ocorrido ou projetado.

### 4.3 Modelos fixos

Coleção: `modelos_fixos`.

Um modelo fixo representa uma regra/recorrência. Ele pode gerar lançamentos reais para determinado mês.

**Modelo fixo != lançamento.**

### 4.4 Serviços

Coleção: `servicos`.

Um serviço representa um item conhecido, normalmente associado a valor e usado para sugestão/preenchimento durante o lançamento.

### 4.5 Categorização

Coleção: `regras_categorias`.

As regras usam um identificador composto conceitualmente por usuário + palavra-chave. Uma regra pode:

1. categorizar lançamentos futuros;
2. atualizar lançamentos históricos compatíveis.

### 4.6 Sistema/atualização

O documento `configuracoes/sistema` é usado para estado global da aplicação, incluindo versão, manutenção, novidades e histórico recente de erros.

Também existe `configuracoes/logs`, utilizado pelo histórico de atualizações.

## 5. Modelo de persistência

```text
Firestore
│
├── usuarios/{uid}
│
├── lancamentos/{id}
│     └── userId → proprietário
│
├── modelos_fixos/{id}
│     └── uid → proprietário
│
├── servicos/{id}
│     └── uid → proprietário
│
├── regras_categorias/{uid}_{palavra}
│
└── configuracoes/
      ├── sistema
      └── logs
```

### Observação de segurança

Filtros como `where("userId", "==", uid)` no frontend **não constituem controle de acesso**. As Firestore Security Rules precisam garantir que o usuário só leia/escreva os documentos que lhe pertencem.

## 6. Fluxo de autenticação

```text
Firebase Auth
    │
    ▼
onAuthStateChanged()
    │
    ├── não autenticado → tela de login/cadastro
    │
    └── autenticado
          │
          └── carregar aplicação/dados do usuário
```

O cadastro profissional cria o usuário no Auth, envia verificação de e-mail e cria `usuarios/{uid}` com estado inicial de conta.

Há mais de um caminho de cadastro no código atual; isso deve ser consolidado em futura limpeza.

## 7. Fluxo de lançamento

```text
Usuário
  ↓
formulário
  ↓
validação
  ↓
identificação de serviço/categoria
  ↓
montagem do objeto
  ↓
Firestore: lancamentos
  ↓
recarregamento dos dados
  ↓
dashboard + listas + gráficos
```

O código atual diferencia `entrada` e `saída` e usa o campo `status` para distinguir valores realizados de pendentes.

## 8. Status financeiros

O código utiliza valores textuais, incluindo:

- `Pago`
- `Recebido`
- `Pendente`
- `Atrasado`

Foi encontrada inconsistência de capitalização em pontos diferentes do código. Isso deve ser normalizado por constantes/enums em uma futura refatoração.

## 9. Fluxo de recorrência

```text
Modelo fixo
   ↓
verificação do mês
   ↓
verificação de duplicidade
   ↓
geração do lançamento
   ↓
lancamentos/{id}
```

Há também lógica para tratar exclusão de lançamentos fixos e lançamentos futuros.

## 10. Categorização inteligente

```text
Descrição do lançamento
        ↓
regra existente?
   ┌────┴────┐
  sim       não
   │          │
   ▼          ▼
categoria   análise de descrições
              ↓
       palavras frequentes
              ↓
       sugestão de regra
```

A análise usa as descrições existentes para identificar palavras frequentes e permitir a criação de regras.

## 11. Atualização da aplicação

O sistema observa `configuracoes/sistema` em tempo real usando `onSnapshot()`.

Há lógica para:

- manutenção;
- versão publicada;
- comparação com versão em cache/localStorage;
- aviso ao usuário;
- contagem regressiva;
- recarregamento;
- novidades.

Foram encontrados múltiplos listeners relacionados à mesma configuração. Isso deve ser consolidado em uma única responsabilidade futura.

## 12. PWA e cache

`service-worker.js` implementa:

- cache de arquivos essenciais;
- `skipWaiting()`;
- limpeza de caches antigos;
- estratégia Network First para recursos da aplicação;
- fallback para `index.html` em navegação offline.

O cache atual é identificado por `1.4.7`.

O manifest define `/Gestto-mobile/` como escopo/start URL.

## 13. Monitoramento e Telegram

O sistema mantém um histórico limitado dos últimos cinco erros em `configuracoes/sistema.historicoErros` e possui integração com Telegram para alerta de suporte.

### Risco crítico

Existe credencial de bot Telegram diretamente no JavaScript enviado ao navegador.

**Ação recomendada imediatamente:** revogar/rotacionar a credencial exposta e migrar o envio para backend/Cloud Function. A nova credencial não deve voltar para o frontend.

## 14. Configuração pública do Firebase

A configuração web do Firebase aparece no frontend. A `apiKey` de aplicações Firebase Web não deve ser tratada como senha secreta por si só; a proteção real deve estar nas Authentication/Firestore Rules e demais controles do projeto.

## 15. Dívidas técnicas já identificadas

1. Credencial Telegram exposta no frontend — **crítico**.
2. `script.js` concentra responsabilidades demais — **alto**.
3. Funções globais são expostas diretamente em `window` — **alto**.
4. Existem implementações duplicadas de funções, incluindo `gerenciarAcaoBotao`, `mostrarTutorialAjuste`, `carregarDadosPerfil` e `salvarDadosPerfil` — **alto**.
5. Existem múltiplos listeners de atualização para `configuracoes/sistema` — **médio/alto**.
6. Status financeiros não são centralizados e possuem inconsistências de capitalização — **médio**.
7. Mês é tratado principalmente como texto — **médio**, requerendo cuidado em eventual migração.
8. Documentação histórica diverge do código atual — **alto para manutenção**.
9. O service worker possui versão própria, independente da versão lógica do aplicativo — **médio**.
10. `manifest.json` contém `background_color` com valor `#f8fafcF`, que aparenta ser inválido — **baixo/médio**.

## 16. Arquitetura-alvo proposta

A separação deve ocorrer somente após o mapeamento funcional completo.

```text
js/
├── core/
│   ├── firebase.js
│   ├── constants.js
│   └── utils.js
│
├── auth/
│   └── auth.js
│
├── financeiro/
│   ├── lancamentos.js
│   ├── modelos-fixos.js
│   └── servicos.js
│
├── categorias/
│   └── categorias.js
│
├── dashboard/
│   └── dashboard.js
│
├── sistema/
│   ├── versionamento.js
│   ├── monitoramento.js
│   └── pwa.js
│
└── ui/
    ├── modais.js
    ├── navegacao.js
    └── notificacoes.js
```

Essa estrutura é uma **proposta**, não uma descrição do código atual.

## 17. Regra de ouro da manutenção

Antes de alterar uma regra financeira:

1. localizar a função que implementa a regra;
2. identificar quem a chama;
3. verificar impacto no Firestore;
4. verificar impacto no dashboard;
5. verificar impacto em recorrências/categorias;
6. documentar a decisão;
7. só então alterar o código.

O objetivo deste documento é permitir que o desenvolvedor retome o projeto sem depender da memória de quem o escreveu.
