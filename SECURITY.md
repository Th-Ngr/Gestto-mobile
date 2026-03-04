# Política de Segurança (Security Policy)

## Versões Suportadas

Atualmente, apenas a versão mais recente enviada para o branch `main` recebe atualizações de segurança.

| Versão | Suportada          |
| ------- | ------------------ |
| 4.0.x   | ✅ Sim              |
| < 4.0   | ❌ Não              |

## Como reportar uma vulnerabilidade

A segurança deste sistema de gestão financeira é levada a sério. Se você encontrar qualquer vulnerabilidade ou falha de segurança, por favor, siga os passos abaixo:

1. **Não abra uma "Issue" pública**: Para evitar a exploração da falha por terceiros, pedimos que reporte o problema de forma privada.
2. **Contato Privado**: Envie os detalhes do erro para o administrador via Telegram (conforme configurado no Bot do sistema) ou através do e-mail cadastrado no perfil do desenvolvedor.
3. **Detalhes**: Se possível, inclua passos para reproduzir o erro, o tipo de impacto e possíveis sugestões de correção.

## O que fazemos para proteger seus dados

* **Firebase Rules**: Utilizamos regras de segurança no Firestore que impedem que um usuário acesse dados de outro.
* **Logs em Tempo Real**: Erros críticos são reportados imediatamente ao administrador via Bot do Telegram para resposta rápida.
* **Restrição de Domínio**: As chaves de API estão restritas para funcionar apenas no domínio oficial do GitHub Pages deste projeto.

Agradecemos por ajudar a manter o Gestto seguro!
