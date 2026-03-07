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

