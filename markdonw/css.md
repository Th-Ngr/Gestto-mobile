🎨 Documentação Técnica: styles.css (Gestto Mobile)
1. Variáveis Globais e Root (:root)

O uso de variáveis CSS permite que alteres a identidade visual da app (branding) em segundos, mudando apenas um valor.

    --primary (#20B2AA): A cor de destaque (Verde Água), usada em botões principais e headers.

    --background (#F8FAFC): Tom de cinza quase branco para o fundo, reduzindo o cansaço visual.

    --text (#1F2937): Cinza muito escuro (quase preto) para garantir alto contraste e legibilidade.

    Status Colors:

        --danger (#EF4444): Vermelho para erros, despesas ou botões de apagar.

        --success (#10B981): Verde para receitas ou confirmações.

        --warning (#F59E0B): Laranja para alertas ou itens pendentes.

    --radius (8px): Define o arredondamento padrão de todos os cartões e botões, criando um aspeto amigável.

2. Reset e Tipografia (*, body)

    box-sizing: border-box: Garante que o padding e a borda não aumentem o tamanho total dos elementos, facilitando o ajuste em ecrãs de telemóveis.

    font-family: 'Inter': Uma fonte moderna, otimizada para interfaces digitais, importada via Google Fonts.

    padding-bottom: 80px: Crucial. Reserva espaço no fundo para que o conteúdo não fique escondido atrás da barra de navegação fixa (.nav-mobile).

3. Componentes de Layout e Dashboard
🏦 Header e Saldo (.header, .saldo-valor)

    position: sticky: Mantém o saldo e o filtro de meses sempre visíveis no topo enquanto o utilizador faz scroll na lista.

    .saldo-valor: Destaque tipográfico (24px, negrito) para a informação mais importante do utilizador.

💳 Cartões de Resumo (.dashboard-cards, .card)

    Flexbox Layout: Usa display: flex com gap: 12px para distribuir os cartões de Receita, Despesa e Pendente de forma igualitária na largura do telemóvel.

    .card.receita / .card.despesa: Classes modificadoras que aplicam cores específicas às bordas ou ícones baseadas no tipo de dado.

4. Sistema de Formulários e Modais (.form-group, .modal-overlay)
📝 Campos de Entrada (.form-group)

    Design Flutuante: O input ocupa o espaço e a <label> é posicionada de forma a parecer integrada no campo.

    Foco: O uso de :focus altera a cor da borda para a cor --primary, dando feedback visual ao utilizador de onde ele está a escrever.

📦 Modais (.modal-overlay, .modal-content)

    Overlay: Um fundo escuro semi-transparente (rgba(0,0,0,0.5)) que foca a atenção do utilizador no formulário.

    .modal-content: Centralizado, com width: 90% para garantir que se adapta a iPhones pequenos e Androids grandes.

    Animação popIn: Define uma transição de escala (scale) e opacidade para que o modal "salte" suavemente na tela.

5. Navegação Móvel (.nav-mobile)

Esta é a barra de ferramentas no estilo "App Store" no fundo do ecrã.

    position: fixed / bottom: 0: Garante que os botões de navegação estejam sempre ao alcance do polegar.

    .nav-item.active: Quando uma secção está ativa, a cor muda para --primary, indicando a localização atual do utilizador.

    Botão Central (.btn-add-float): (Opcional no design) Muitas vezes estilizado para ser maior ou circular, facilitando a adição de novas transações.

6. Utilitários e Estados de Transação

    .transacao-item: Cada linha da lista de gastos. Usa justify-content: space-between para colocar o nome à esquerda e o valor à direita.

    .status-badge: Pequenas etiquetas arredondadas que indicam se uma conta está "Paga" ou "Pendente", usando as cores de sucesso e aviso.

    .config-btn-round: Botão circular estilizado com transition: 0.2s para dar um efeito de clique (feedback tátil) quando o utilizador toca na engrenagem de configurações.

7. Animações e Feedback

    @keyframes popIn:

        from: Começa com 85% do tamanho e invisível.

        to: Termina com tamanho real e opacidade total.

    :active State: Em quase todos os botões, o CSS aplica um transform: scale(0.95), simulando a pressão de um botão físico ao ser tocado.

💡 Dica de Manutenção:

Se quiseres criar um "Modo Escuro" no futuro, basta criares uma classe .dark-theme e redefinir as variáveis --background e --text dentro dela. O resto do CSS irá adaptar-se automaticamente!