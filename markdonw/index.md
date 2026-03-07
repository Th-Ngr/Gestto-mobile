🏗️ Documentação Técnica: index.html (Gestto Mobile)
1. Cabeçalho e Configurações de PWA (<head>)

Esta secção define como o navegador deve interpretar a aplicação e como ela aparece no telemóvel.
Meta Tags e Links:

    viewport: Essencial para mobile. Impede que o utilizador faça "zoom" acidental e garante que o layout ocupe 100% da largura do ecrã.

    apple-mobile-web-app-capable: Faz com que o site abra sem a barra de endereço do Safari no iPhone (estilo App).

    theme-color: Define a cor da barra de status do sistema operativo para #20B2AA (Verde Gestto).

    manifest.json: O ficheiro que permite que o site seja "instalado" no telemóvel.

    Chart.js: Importação da biblioteca para gerar os gráficos financeiros.

2. Componentes Globais de Alerta e Modais

São elementos que ficam "escondidos" e aparecem apenas em situações específicas.
🚩 Banner de Administração (#banner-admin)

    Função: Exibir contagem regressiva para atualizações ou avisos de manutenção.

    Estilo: Fica fixo no topo (position: fixed), com cor de destaque para atrair a atenção do utilizador.

🎁 Modal de Novidades (#modal-novidades)

    Função: Popup que aparece após uma atualização para listar o que mudou.

    IDs internos:

        txt-versao-modal: Recebe o número da nova versão.

        txt-novidades-modal: Recebe a descrição das melhorias.

3. Secção de Autenticação (#auth)

Esta secção contém os formulários de entrada.

    #formLogin: Contém campos para e-mail e palavra-passe, além do botão de login.

    #formSignup: Escondido por padrão, permite a criação de novas contas.

    Botões de Alternância: Funções JavaScript trocam a visibilidade entre "Entrar" e "Criar Conta".

4. Estrutura Principal da App (#app)

Onde a magia acontece após o login.
🏦 Cabeçalho Financeiro (.header)

    Saldo Total: Exibe o saldo consolidado do utilizador.

    Filtro de Meses: Botões "Anterior" e "Próximo" que disparam a atualização dos dados no Firebase através do JavaScript.

    #btn-config-geral: O ícone de engrenagem que abre as definições do perfil.

📊 Dashboard (Resumo)

    Cards de Resumo: Três blocos que mostram "Receitas", "Despesas" e "Pendente".

    Gráfico: Um elemento <canvas> onde o Chart.js desenha o gráfico de pizza das despesas por categoria.

5. Secções de Navegação (Views)

O sistema utiliza IDs para alternar entre as telas sem recarregar a página:

    #transacoes: Lista as entradas e saídas. Contém o botão "Gerar do Mês" (para automatizar contas fixas).

    #contas-fixas: Interface para gerir modelos de despesas que se repetem todos os meses.

6. Barra de Navegação Inferior (.nav-mobile)

O menu fixo no rodapé que dá a experiência de "App".

    Botões: Ícones do FontAwesome para alternar entre as secções (showSection).

    Botão Central (Mais): Um botão destacado para abrir rapidamente o modal de "Nova Transação".

7. Modais de Cadastro (Formulários)

Estruturas complexas para entrada de dados:

    #modalTransacao: Formulário para adicionar entradas/saídas. Inclui campos de Valor, Descrição, Data e Categoria.

    #modalFixo: Onde se define o "Dia de Vencimento" para as contas recorrentes.

    #modalGerenciadorServicos: Permite pré-cadastrar serviços comuns para não ter de digitar o nome e valor toda vez.

8. Elementos de Utilidade (id e let referenciados)

    #btnInstalarApp: Um botão que aparece apenas se o PWA ainda não estiver instalado.

    #loading-overlay: (Se implementado) Um ecrã de carregamento enquanto o Firebase procura os dados.

💡 Observação sobre as IDs:

Cada ID neste ficheiro (ex: fixoValor, transacaoDescricao, txt-admin) é uma "âncora" que o ficheiro script.js usa para ler o que o utilizador digitou ou para escrever informações que vieram do banco de dados. Se mudar o ID aqui, o JavaScript para de funcionar!