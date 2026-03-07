Esta documentação detalha o funcionamento dos três pilares do sistema: Estrutura (HTML), Estética (CSS) e Inteligência (JS).
1. O Cérebro: script.js

Este arquivo gerencia a lógica de negócio, autenticação e a sincronização em tempo real com o Firebase.
📦 Importações e Globais

    Firebase Modules: Utiliza a versão 10 (Modular) para Auth e Firestore.

    firebaseConfig: Constante com as credenciais do projeto.

    db / auth: Instâncias de conexão com o banco e sistema de login.

    months: Array de tradução para os meses do ano.

🛠️ Funções Principais
### 🛠️ Funções Principais

| Função | Tipo | Descrição |
| :--- | :--- | :--- |
| `onSnapshot` | Listener | Monitora a versão do sistema no Firebase. Gerencia o banner de update e o modal de novidades. |
| `carregarTransacoes` | Dados | Filtra e soma as finanças do mês selecionado. Atualiza o saldo e os cards de resumo. |
| `atualizarGrafico` | UI/Charts | Processa as categorias das despesas e gera o gráfico Donut via **Chart.js**. |
| `showSection` | Navegação | Alterna a visibilidade entre Dashboard, Transações e Contas Fixas. |
| `salvarTransacao` | Escrita | Valida e envia novos registros para a subcoleção do utilizador. |
| `gerarTransacoesMes` | Automação | Clona os modelos de "Contas Fixas" para o mês atual com um clique. |
🏗️ Blocos de Construção

    <head>: Contém as meta tags de mobile (viewport, apple-mobile-web-app) e o link para o manifest.json.

    #banner-admin: Div fixa no topo para alertas de sistema.

    #auth: Seção de Login e Cadastro (exibida apenas se o utilizador estiver deslogado).

    #app: O container principal que contém:

        Header: Saldo e filtros.

        Dashboard: Cards e Gráfico.

        Nav-Mobile: Menu inferior fixo.

    Modais: Containers de formulários (#modalTransacao, #modalFixo, #modal-novidades).

3. A Estética: styles.css

Define a identidade visual e a experiência de uso (UX) em dispositivos móveis.
🎨 Design System (:root)

    Paleta: Baseada em --primary (#20B2AA) para ações e tons de cinza para hierarquia.

    Feedback Visual: Cores de status para --success (receitas) e --danger (despesas).

📱 Componentes UI

    .nav-mobile: Barra inferior com z-index elevado, garantindo acesso rápido aos menus.

    .form-group: Inputs com labels flutuantes para economizar espaço em telas pequenas.

    @keyframes popIn: Animação de escala e opacidade aplicada aos modais para um efeito mais suave.

    .header { position: sticky }: Mantém o controle de meses sempre no topo durante o scroll.

🚀 Como Manter o Sistema

    Para atualizar a versão: Use o comando /versao no Bot do Telegram. O sistema cuidará do resto.

    Para mudar cores: Altere apenas as variáveis no início do styles.css.

    Para novas funcionalidades: Adicione uma nova section no HTML e uma função correspondente no script.js, chamando-a via showSection.


🤖 Documentação Técnica: Bot do Telegram (Google Apps Script)

Este script atua como um Webhook. Ele recebe mensagens do Telegram, processa comandos e atualiza o Firebase Firestore via REST API.
1. Configurações e Globais

    BOT_TOKEN: A chave secreta fornecida pelo @BotFather. Autoriza o script a responder em nome do bot.

    PROJECT_ID: O ID único do teu projeto Firebase (gst-financeira), usado para construir os URLs da API.

2. Função Principal: doPost(e)

É o ponto de entrada. Sempre que alguém envia uma mensagem ao Bot, o Telegram dispara um "evento" para esta função.

    JSON.parse(e.postData.contents): Converte os dados brutos recebidos em um objeto legível.

    Fluxo de Decisão: O script usa if / else if para identificar qual comando foi digitado (/versao, /avisar, /limpar, /status).

3. Comandos do Utilizador


🚀 /versao [n] | [texto]

O comando mais importante para a manutenção.

    O que faz: Divide a mensagem no caractere |. A primeira parte vira a versaoApp e a segunda vira as novidades.

    Impacto: Ao atualizar estes campos no Firestore, todos os utilizadores ligados verão o banner de contagem regressiva no index.html.

⚠️ /avisar [mensagem]

    O que faz: Ativa o modo de manutenção global.

    Impacto: Define emManutencao: true e grava a mensagem. Útil para avisar sobre paragens técnicas rápidas.

✅ /limpar

    O que faz: Desativa o banner de manutenção e redefine a mensagem para "Sistema Online".

📊 /status

    O que faz: Faz um GET no Firestore para ler os valores atuais.

    Retorno: Devolve ao utilizador do Telegram um resumo de qual versão está ativa e se a manutenção está ligada.

### 🔗 Funções de Comunicação (Firebase REST API)

| Função | Método HTTP | Descrição |
| :--- | :--- | :--- |
| `getStatusFirestore` | **GET** | Lê o documento `configuracoes/sistema`. Mapeia os dados do formato específico do Google. |
| `setManutencaoFirestore` | **PATCH** | Atualiza apenas os campos de manutenção e mensagem de alerta. |
| `atualizarVersaoCompleta` | **PATCH** | Grava a nova versão (string) e o log de novidades no banco. |

## 🛠️ Funções de Apoio (Bot Telegram)

As funções de apoio são utilitários essenciais que garantem a formatação correta dos dados e a fluidez na comunicação entre o Google Apps Script e a API do Telegram.

### 📋 Tabela de Utilidades

| Função | Parâmetros | Descrição |
| :--- | :--- | :--- |
| `responder` | `chatId, texto` | Envia uma resposta via POST para o Telegram utilizando `parse_mode: Markdown`. |
| `formatarData` | `isoString` | Converte o timestamp ISO do Firestore para o padrão brasileiro/português (`DD/MM/YYYY HH:mm`). |
| `UrlFetchApp` | `url, options` | Método nativo do GAS usado para fazer as requisições HTTP para o Telegram e Firebase. |



### 💻 Detalhe do Código

Abaixo está a implementação lógica destas funções no ficheiro `.gs`:

```javascript
/**
 * Envia uma mensagem formatada para o chat do administrador.
 */
function responder(chatId, texto) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: texto,
    parse_mode: "Markdown"
  };
  
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}

/**
 * Ajusta a data do sistema (UTC) para o fuso horário local.
 */
function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
🛠 Como atualizar o Bot

Sempre que alterares este código no Google Apps Script:

    Clica em Implantar > Nova Implantação.

    Seleciona o tipo App da Web.

    Em "Quem pode aceder", define sempre como Qualquer pessoa.

    Copia o novo URL gerado (se o URL mudar, tens de avisar o Telegram via setWebhook).

