📖 Documentação Técnica: script.js (Gestto Mobile)

O arquivo utiliza a versão modular (v10+) do Firebase SDK e é responsável por toda a lógica de negócio, persistência de dados e interface dinâmica.
1. Importações e Configuração Inicial
📦 Imports (Firebase SDK)

O código importa módulos específicos para garantir performance e segurança:

    App: initializeApp para conectar o site ao projeto do Google.

    Auth: Gerencia login, cadastro e estado da sessão do usuário.

    Firestore: Banco de Dados NoSQL. Inclui funções de CRUD (addDoc, updateDoc, deleteDoc) e o onSnapshot para atualizações em tempo real.

⚙️ Constantes de Configuração

    firebaseConfig: Contém as chaves de API e identificadores do seu projeto Firebase.

    db / auth: Instâncias inicializadas para uso em todo o script.

    months: Array de strings utilizado para converter índices numéricos (0-11) em nomes de meses em português.

2. Variáveis de Estado (let)

Estas variáveis mantêm dados temporários na memória enquanto o app está aberto:

    regrasCategorias / categoriasAtivas: Listas carregadas do banco para alimentar os filtros e o preenchimento automático de categorias.

    cronometroAtualizacao: Armazena a instância do setInterval usado no banner de atualização (permite limpar o contador se necessário).

    deferredPrompt: Guarda o evento de instalação do PWA para disparar o convite de "Adicionar à tela de início".

3. Sistema de Atualização e Monitoramento (Real-time)
🔄 onSnapshot(doc(db, "configuracoes", "sistema"), ...)

Esta é a função mais crítica para a manutenção do app.

    O que faz: Monitora o documento "sistema" no Firebase.

    Lógica Anti-Loop: 1. Compara a versão no localStorage com a do Banco.
    2. Se forem diferentes, ativa o #banner-admin e inicia uma contagem regressiva.
    3. Ao final, salva a nova versão no navegador e força um recarregamento com ?v=Date.now() para "limpar" o cache do navegador.

    Modal de Novidades: Se o app acaba de ser recarregado após uma atualização, ela dispara o modal com o campo dados.novidades.

4. Funções de Autenticação

    onAuthStateChanged: Monitora se o usuário entrou ou saiu. Se logado, chama carregarApp(), caso contrário, exibe a tela de login.

    handleLogin / handleSignup / handleLogout: Funções que processam o formulário de entrada, criação de conta (via email/senha) e encerramento de sessão.

5. Funções de Interface e Navegação (UI)

    showSection(sectionId): Esconde todas as telas e mostra apenas a solicitada (Dashboard, Transações, etc.).

    abrirModal / fecharModal: Manipulam o CSS (display: flex/none) para exibir formulários de cadastro.

    window.fecharModalNovidades: Função global (anexada ao window) para fechar o pop-up de atualização.

6. Lógica de Negócio e Dados (Firestore)
📊 Dashboard e Transações

    carregarTransacoes(): A função principal de dados. Ela filtra as transações pelo mês/ano selecionados, soma os valores (Receitas vs Despesas) e atualiza o saldo em tela.

    atualizarGrafico(): Utiliza a biblioteca Chart.js para gerar o gráfico de pizza baseado nas categorias das despesas filtradas.

    salvarTransacao(): Coleta os dados do formulário e envia para a coleção usuarios/UID/transacoes.

🛠️ Serviços e Contas Fixas

    carregarServicos(): Busca modelos de serviços pré-cadastrados para agilizar novos lançamentos.

    gerarTransacoesMes(): Função automatizada que verifica quais "Contas Fixas" ainda não foram lançadas no mês atual e as cria no banco com um clique.

7. Utilidades e Formatação

    formatarMoeda(valor): Converte números para o padrão brasileiro (R$ 0,00).

    formatarDataFirestore(dataISO): Converte a data do input HTML para o formato legível DD/MM.

    extrairMesAno(dataISO): Helper para organizar as transações cronologicamente.

8. Progressive Web App (PWA)

    beforeinstallprompt: Detecta se o navegador permite instalação e mostra o botão #btnInstalarApp.

    Service Worker Registration: Tenta registrar o service-worker.js para permitir cache e funcionamento offline.

    Detecção de iOS: Verifica se o usuário está num iPhone e, se não estiver em modo "Standalone" (instalado), fornece instruções de instalação manual.

⚠️ Notas de Manutenção:

    Segurança: Todas as consultas ao banco usam o auth.currentUser.uid para garantir que um usuário nunca veja os dados de outro.

    Performance: O uso de onSnapshot é limitado a configurações globais. Transações financeiras são carregadas sob demanda (getDocs) para economizar recursos do Firebase.