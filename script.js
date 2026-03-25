//
// 1. Inicialização do App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"; 

// 2. Autenticação
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 3. Firestore (Banco de Dados e Persistência Offline)
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

        // Configuração do Firebase //
const firebaseConfig = {
    apiKey: "AIzaSyB7ugVILO8olKtzkCJI_7BRlzY6Qe0-rCM",
    authDomain: "gst-financeira.firebaseapp.com",
    projectId: "gst-financeira"
};
//Solicitação de notificação//
window.solicitarNotificacao = () => {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
};
Swal
const recuperarSenha = (email) => {
    sendPasswordResetEmail(auth, email)
        .then(() => {
            Swal.fire('Sucesso', 'E-mail de recuperação enviado!', 'success');
        })
        .catch((error) => {
            Swal.fire('Erro', 'E-mail não encontrado.', 'error');
        });
};

// Chame isso na verificação se for "hoje"
if (Notification.permission === "granted" && p.status === "hoje") {
    new Notification("Vencimento Hoje!", {
        body: `O pagamento de ${p.nome} (R$ ${p.valor}) vence hoje!`,
        icon: "sua_logo.png"
});
}



// --- SERVICE WORKER (PWA) ---

// 1. Inicialização do App e Serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 2. Inicialização do Firestore com Persistência Moderna (Substitui o enableIndexedDbPersistence)
// Isso evita que o debugger trave por conflito de abas
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// 3. Constantes e Utilitários
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Toast configurado globalmente//

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    backdrop: false,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

// 4. Função de Cadastro Profissional
async function cadastrarUsuario(email, senha) {
    try {
        // Criar o usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // Disparar e-mail de verificação imediatamente
        await sendEmailVerification(user);

        // Criar o documento do usuário no Firestore (Importante para comercializar)
        await setDoc(doc(db, "usuarios", user.uid), {
            email: user.email,
            dataCriacao: new Date(),
            status: "aguardando_verificacao",
            plano: "free"
        });

        Swal.fire({
            title: 'Sucesso!',
            html: `Conta criada para <b>${email}</b>.<br><br>Enviamos um link de confirmação. Você precisa validar seu e-mail para acessar o sistema.`,
            icon: 'success',
            confirmButtonColor: 'var(--success)'
        });

    } catch (error) {
        console.error("Erro no cadastro:", error);
        let mensagem = "Não foi possível criar a conta.";
        
        if (error.code === 'auth/email-already-in-use') mensagem = "Este e-mail já está em uso.";
        if (error.code === 'auth/weak-password') mensagem = "A senha deve ter pelo menos 6 caracteres.";
        
        Swal.fire('Erro no Cadastro', mensagem, 'error');
    }
}

// Toast para Avisos do Sistema / Telegram
const AlertToast = Swal.mixin({
    toast: true,
    position: 'top', // Centro-topo para máxima visibilidade
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    backdrop: false,
    customClass: {
        popup: 'toast-sistema-alert'
    }
});
let listaServicosCache = [];
let regrasCategorias = []; // Armazena as regras na memória do app
let categoriasAtivas = []; // Será preenchida ao carregar o app
let promptInstalacao; // Variável global para armazenar o evento de instalação da PWA
let cronometroAtivo = false; // Evita múltiplos timers simultâneos de atualização

// Função que "escuta" o Bot de Suporte
onSnapshot(doc(db, "configuracoes", "sistema"), (snapshot) => {
    if (snapshot.exists()) {
        const dados = snapshot.data();
        const versaoNoFirebase = dados.versaoApp;
        const versaoNoCache = localStorage.getItem("versao_cache");

        // 1. LIMPEZA INICIAL: Se algo mudar, fechamos o que estava aberto para reavaliar
        // Isso evita que o banner de manutenção "vire" o de atualização sem resetar o timer
        
         if (dados.emManutencao === true) {
            Swal.fire({
                toast: true, position: 'top', icon: 'warning',
                title: 'MANUTENÇÃO ATIVA', text: dados.mensagem,
                timer: null, showConfirmButton: false, backdrop: false,
                customClass: { popup: 'banner-manutencao-fixo' }
            });
            
        }

         
        if (versaoNoCache !== versaoNoFirebase) {
            let segundosRestantes = 60;

            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'info',
                title: `Nova versão ${versaoNoFirebase} disponível`,
                html: `Atualizando em <b>${segundosRestantes}</b> segundos...<br><small>${dados.mensagemUpdate || ''}</small>`,
                timer: 60000,
                timerProgressBar: true,
                showConfirmButton: false,
                backdrop: false,
                customClass: { popup: 'banner-atualizacao-minuto' },
                didOpen: () => {
                    const b = Swal.getHtmlContainer().querySelector('b');
                    const timerInterval = setInterval(() => {
                        segundosRestantes--;
                        if (b) b.textContent = segundosRestantes;
                        if (segundosRestantes <= 0) {
                            clearInterval(timerInterval);
                            // Salva a nova versão no cache ANTES de recarregar
                            localStorage.setItem("versao_cache", versaoNoFirebase);
                            window.location.reload(); // Recarrega a página
                        }
                    }, 1000);
                }
            });
        } else {
            // Se as versões forem iguais, garantimos que não há Toasts de atualização abertos
            // Mas cuidado para não fechar outros Toasts legítimos! 
            // Se quiser ser específico, use uma verificação de classe.
        }
    }
});

// Função que atualiza a versão do service-worker e força o reload do app quando o admin subir uma nova versão no Firebase.
onSnapshot(doc(db, "configuracoes", "sistema"), (snapshot) => {
    if (snapshot.exists()) {
        const dados = snapshot.data();
        
        // 1. SINCRONIZAÇÃO INICIAL (Onde o erro costuma nascer)
        // Se não existir versão no navegador, pegamos a do banco para evitar o loop.
        if (!localStorage.getItem('app_version')) {
            localStorage.setItem('app_version', (dados.versaoApp || "1.0.0").trim());
            console.log("✅ Versão sincronizada com o Firebase no primeiro acesso.");
            return; 
        }

        // Definimos as constantes aqui dentro para não dar ReferenceError
        const versaoNoNavegador = (localStorage.getItem('app_version') || "1.0.0").trim();
        const versaoNoBanco = (dados.versaoApp || "").trim();

        console.log(`🔎 Verificação: Local(${versaoNoNavegador}) | Banco(${versaoNoBanco})`);

        // --- BLOCO A: EXIBIR O MODAL DE NOVIDADES (PÓS-RELOAD) ---
        if (versaoNoBanco === versaoNoNavegador && localStorage.getItem('mostrar_novidades') === 'true') {
            localStorage.removeItem('mostrar_novidades');

            // Garantimos que o código espere o HTML carregar
            const exibirModal = () => {
                const modal = document.getElementById("modal-novidades");
                const overlay = document.getElementById("modal-overlay");
                const txtVersao = document.getElementById("txt-versao-modal");
                const txtNovidades = document.getElementById("txt-novidades-modal");

                if (modal && overlay) {
                    txtVersao.innerText = `Versão: ${versaoNoBanco}`;
                    txtNovidades.innerText = dados.novidades || "Melhorias gerais no sistema.";
                    modal.style.display = "block";
                    overlay.style.display = "block";
                }
            };

            if (document.readyState === 'complete') {
                exibirModal();
            } else {
                window.addEventListener('load', exibirModal);
            }
            return;
        }

        // --- BLOCO B: DETECTAR ATUALIZAÇÃO (TIMER) ---
        if (versaoNoBanco !== "" && versaoNoBanco !== versaoNoNavegador) {
            
            if (window.atualizacaoEmCurso) return;
            window.atualizacaoEmCurso = true;

            const banner = document.getElementById("banner-admin");
            if (banner) banner.style.display = "block";

            let tempoRestante = (dados.tempoParaAtualizar || 1) * 60;

            const contador = setInterval(() => {
                tempoRestante--;
                const txtAdmin = document.getElementById("txt-admin");
                if (txtAdmin) txtAdmin.innerText = `Nova versão ${versaoNoBanco} disponível. Atualizando em ${tempoRestante}s...`;

                if (tempoRestante <= 0) {
                    clearInterval(contador);

                    // Gravamos a versão do BANCO no local para o navegador "saber" que atualizou
                    localStorage.setItem('app_version', versaoNoBanco);
                    localStorage.setItem('mostrar_novidades', 'true');

                    setTimeout(() => {
                        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
                    }, 500);
                }
            }, 1000);
        }
    }
});

// Função que "escuta" o Bot de Suporte para mostrar novidades ou banner de atualização//
onSnapshot(doc(db, "configuracoes", "sistema"), (snapshot) => {
    if (snapshot.exists()) {
        const dados = snapshot.data();
        
        // 1. SINCRONIZAÇÃO INICIAL (Evita loop no primeiro acesso)
        if (!localStorage.getItem('app_version')) {
            localStorage.setItem('app_version', (dados.versaoApp || "1.0.0").trim());
            console.log("✅ Versão inicial sincronizada.");
            return; 
        }

        const versaoNoNavegador = localStorage.getItem('app_version').trim();
        const versaoNoBanco = (dados.versaoApp || "").trim();

        // --- BLOCO A: EXIBIR O MODAL DE NOVIDADES (PÓS-RELOAD) ---
        if (versaoNoBanco === versaoNoNavegador && localStorage.getItem('mostrar_novidades') === 'true') {
            localStorage.removeItem('mostrar_novidades');

            // Esperamos o 'load' para garantir que o Modal já exista no DOM
            window.addEventListener('load', () => {
                const modal = document.getElementById("modal-novidades");
                const overlay = document.getElementById("modal-overlay");
                const txtVersao = document.getElementById("txt-versao-modal");
                const txtNovidades = document.getElementById("txt-novidades-modal");

                if (modal && overlay) {
                    txtVersao.innerText = `Versão: ${versaoNoBanco}`;
                    txtNovidades.innerText = dados.novidades || "Melhorias gerais no sistema.";
                    
                    modal.style.display = "block";
                    overlay.style.display = "block";
                }
            });
            return;
        }

        // --- BLOCO B: DETECTAR ATUALIZAÇÃO (BANNER + TIMER) ---
        if (versaoNoBanco !== "" && versaoNoBanco !== versaoNoNavegador) {
            
            // Evita múltiplos timers caso o admin atualize várias vezes seguidas//
            if (window.atualizacaoEmCurso) return;
            window.atualizacaoEmCurso = true;

            const banner = document.getElementById("banner-admin");
            if (banner) banner.style.display = "block";

            let tempoRestante = (dados.tempoParaAtualizar || 1) * 60;

        }
    }
});
// --- FUNÇÃO PARA FECHAR O MODAL DE NOVIDADES//
window.fecharModalNovidades = function() {
    const modal = document.getElementById("modal-novidades");
    const overlay = document.getElementById("modal-overlay");
    
    if (modal) modal.style.display = "none";
    if (overlay) overlay.style.display = "none";
    
};
// ---LOG TELEGRAM (SUPORTE TÉCNICO) ---
window.logErroTelegram = async (local, erro) => {
    const TOKEN = "8735026345:AAGLIG0AGlP5CfaFVEGuGb0cVU0IyUCbPNo";
    const CHAT_ID = "8125669194";
    
    // Coleta informações do usuário logado
    let infoUsuario = "Não logado";
    if (typeof auth !== 'undefined' && auth.currentUser) {
        infoUsuario = auth.currentUser.email;
    }

    const erroTexto = erro instanceof Error ? erro.message : String(erro);
    
    // --- GRAVAR NO FIRESTORE (Documento sistema) ---
    try {
        const logRef = doc(db, "configuracoes", "sistema");
        const docSnap = await getDoc(logRef);

        // Criamos o objeto exatamente como o Bot espera ler
        const novoErroFormatado = {
            erro: `${local}: ${erroTexto}`, // Junta o local e a mensagem
            usuario: infoUsuario,
            data: new Date().toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            resolvido: false
        };

        if (docSnap.exists()) {
            // Pega o histórico atual ou cria array vazio
            let listaAtual = docSnap.data().historicoErros || [];
            
            // Adiciona no topo e limita aos 5 últimos
            listaAtual.unshift(novoErroFormatado); 
            listaAtual = listaAtual.slice(0, 5); 

            // Atualiza apenas o campo de erros sem mexer no resto (versão, banner, etc)
            await updateDoc(logRef, { historicoErros: listaAtual });
        } else {
            // Cria o documento caso ele não exista (segurança)
            await setDoc(logRef, { historicoErros: [novoErroFormatado] }, { merge: true });
        }
        console.log("✅ Erro registrado no Firestore (documento sistema).");
    } catch (e) {
        console.error("❌ Erro ao salvar no Firestore:", e);
    }

    // --- ENVIO PARA O TELEGRAM (Notificação Direta) ---
    const mensagemHTML = `<b>🔴 ERRO NO SISTEMA</b>\n\n<b>📍 Local:</b> ${local}\n<b>❌ Erro:</b> ${erroTexto}\n<b>👤 Usuário:</b> ${infoUsuario}`;
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                text: mensagemHTML, 
                parse_mode: "HTML" 
            })
        });
    } catch (e) { 
        console.error("Erro ao enviar notificação para o Telegram:", e); 
    }
};
// --- CONTROLE DO APP & AUTH ---
onAuthStateChanged(auth, async (user) => { 
    if (user) { 
        // --- FILTRO DE SEGURANÇA COMERCIAL ---
        if (!user.emailVerified) {
            document.getElementById("auth").style.display = "flex"; 
            document.getElementById("app").style.display = "none";

            Swal.fire({
                title: 'Verifique seu e-mail',
                html: `Seu acesso está bloqueado.<br>Enviamos um link para <b>${user.email}</b>.<br><small>Verifique também sua caixa de Spam.</small>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                confirmButtonText: 'Reenviar Link',
                cancelButtonText: 'Sair'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const { sendEmailVerification } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                    await sendEmailVerification(user);
                    Swal.fire('Enviado!', 'Confira seu e-mail novamente.', 'success');
                }
                //await auth.signOut();//
            });
            return; // INTERROMPE aqui, não carrega os dados abaixo
        }//
        // -------------------------------------

        document.getElementById("auth").style.display = "none"; 
        document.getElementById("app").style.display = "block"; 
        
        configurarMeses(); 
        
        await window.carregarModelosFixos();
        await window.gerarProjecaoMesAtual(); 
        await carregarLancamentos(); 

        const jaAvisouNestaSessao = sessionStorage.getItem('avisoFinanceiroExibido');
        if (!jaAvisouNestaSessao) {
            await window.notificarStatusFinanceiro(); 
            sessionStorage.setItem('avisoFinanceiroExibido', 'true'); // Corrigi a chave para bater com o get
        }

        // Configuração do Input Inteligente
        const inputDesc = document.getElementById("descricao");
        if (inputDesc) {
            inputDesc.replaceWith(inputDesc.cloneNode(true)); 
            const novoInputDesc = document.getElementById("descricao");
            
            novoInputDesc.addEventListener("blur", async (e) => {
                const termo = e.target.value.trim();
                const tipo = document.getElementById("tipo").value;
                if (termo.length < 3) return;

                if (tipo === "entrada") {
                    await window.verificarServicoInteligente(termo);
                } else {
                    await window.verificarGastoFixoInteligente(termo);
                }
            });
        }

        window.Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });

        try {
            const qRegras = query(collection(db, "regras_categorias"), where("uid", "==", user.uid));
            const snapRegras = await getDocs(qRegras);
            regrasCategorias = snapRegras.docs.map(d => d.data());
        } catch (e) {
            console.error("Erro ao carregar regras:", e);
        }

    } else { 
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none"; 
        sessionStorage.removeItem('avisoFinanceiroExibido');
    }
});

//ALTERAÇÃO DE TEMA
// Função para aplicar o tema e salvar a preferência
window.aplicarTema = (tema) => {
    const icon = document.getElementById('dark-icon');
    const status = document.getElementById('status-dark');

    if (tema === 'dark') {
        document.body.classList.add('dark-theme');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
        if (status) status.innerText = "Ativado";
        localStorage.setItem('tema-preferido', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        if (icon) icon.classList.replace('fa-sun', 'fa-moon');
        if (status) status.innerText = "Desativado";
        localStorage.setItem('tema-preferido', 'light');
    }
    
    // Atualiza os gráficos para as cores de fonte novas (claro/escuro)
    if (window.atualizarGraficosBarras) window.atualizarGraficosBarras();
};

// Função do Botão (Toggle manual)
window.toggleDarkMode = () => {
    const isDark = document.body.classList.contains('dark-theme');
    window.aplicarTema(isDark ? 'light' : 'dark');
};

// LOGICA DE DETECÇÃO (Rodar ao carregar o App)
const inicializarTema = () => {
    const preferênciaSalva = localStorage.getItem('tema-preferido');
    const darkModeSistema = window.matchMedia('(prefers-color-scheme: dark)');

    if (preferênciaSalva) {
        // Se o usuário já escolheu manualmente no seu app, usa essa escolha
        window.aplicarTema(preferênciaSalva);
    } else {
        // Se não tem escolha salva, segue o que estiver no sistema do celular
        window.aplicarTema(darkModeSistema.matches ? 'dark' : 'light');
    }

    // Escuta mudanças no sistema em tempo real (ex: o celular escurece ao pôr do sol)
    darkModeSistema.addEventListener('change', e => {
        if (!localStorage.getItem('tema-preferido')) {
            window.aplicarTema(e.matches ? 'dark' : 'light');
        }
    });
};

// Chame isso dentro do seu DOMContentLoaded ou no final do arquivo
document.addEventListener('DOMContentLoaded', inicializarTema);

window.recuperarSenha = async () => {
    const emailInput = document.getElementById('email-login')?.value;

    const { value: email } = await Swal.fire({
        title: 'Recuperar Senha',
        input: 'email',
        inputLabel: 'Digite seu e-mail cadastrado',
        inputValue: emailInput || '',
        showCancelButton: true,
        confirmButtonText: 'Enviar Link',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) return 'Você precisa digitar um e-mail!';
        }
    });

    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            Swal.fire(
                'E-mail Enviado!',
                'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.',
                'success'
            );
        } catch (error) {
            console.error("Erro ao resetar senha:", error);
            let mensagem = "Ocorreu um erro ao tentar enviar o e-mail.";
            if (error.code === 'auth/user-not-found') mensagem = "Este e-mail não está cadastrado no sistema.";
            
            Swal.fire('Erro', mensagem, 'error');
        }
    }
};
// --- CONFIGURAÇÃO DE MESES (FILTRO) ---
function configurarMeses() {
    // CORREÇÃO: Verificação de existência do select para evitar erros de referência //
    const select = document.getElementById("monthSelect");
    if(select && select.options.length === 0) {
        months.forEach(m => { let opt = document.createElement("option"); opt.value = m; opt.textContent = m; select.appendChild(opt); });
        select.value = months[new Date().getMonth()];
        select.onchange = carregarLancamentos;
    }
}
// --- NAVEGAÇÃO ---
// 1. FUNÇÃO DE NAVEGAÇÃO (Chame isso quando trocar de aba)
window.atualizarBotaoNavegação = (pagina) => {
    const btn = document.getElementById('btn-l');
    const iHome = document.getElementById('icon-home');
    const iSun = document.getElementById('icon-tema-sun');
    const iMoon = document.getElementById('icon-tema-moon');

    if (pagina === 'perfil') {
        // Inicia o giro
        btn.classList.add('btn-estado-perfil');
        
        // Troca o ícone (Ocorre durante o giro)
        iHome.style.display = 'none';
        const isDark = document.body.classList.contains('dark-theme');
        if (isDark) {
            iMoon.style.display = 'block';
            iSun.style.display = 'none';
        } else {
            iSun.style.display = 'block';
            iMoon.style.display = 'none';
        }
    } else {
        // Volta ao estado original
        btn.classList.remove('btn-estado-perfil');
        
        // Retorna o "+"
        iHome.style.display = 'block';
        iSun.style.display = 'none';
        iMoon.style.display = 'none';
    }
};

// 2. FUNÇÃO DE CLIQUE (Decide o que o botão faz)
window.gerenciarAcaoBotao = () => {
    const btn = document.getElementById('btn-l');
    
    if (btn.classList.contains('btn-estado-perfil')) {
        // Se estiver girado (Perfil), ele alterna o tema
        window.alternarTemaGestto();
    } else {
        // Se estiver normal (Home), abre seu formulário/modal
        if (window.abrirModalLancamento) window.abrirModalLancamento();
    }
};

// 3. FUNÇÃO DE TROCA DE TEMA (O Toggle)
window.alternarTemaGestto = () => {
    const body = document.body;
    body.classList.toggle('dark-theme');
    
    // Salva a preferência
    const novoTema = body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('tema-preferido', novoTema);
    
    // Atualiza o ícone visualmente NA HORA (dentro do botão girado)
    const iSun = document.getElementById('icon-tema-sun');
    const iMoon = document.getElementById('icon-tema-moon');
    
    if (novoTema === 'dark') {
        iMoon.style.display = 'block';
        iSun.style.display = 'none';
    } else {
        iSun.style.display = 'block';
        iMoon.style.display = 'none';
    }

    // Atualiza os gráficos para as novas cores de texto
    if (window.atualizarGraficosBarras) window.atualizarGraficosBarras();
};

window.navegar = (pagina) => {
    // 1. Controle de Telas
    document.getElementById("tela-lancamentos").style.display = pagina === 'home' ? 'block' : 'none';
    document.getElementById("perfilSection").style.display = pagina === 'perfil' ? 'block' : 'none';
    
    // 2. Controle da Navbar
    document.getElementById("nav-home").classList.toggle("active", pagina === 'home');
    document.getElementById("btnConfiguracoes").classList.toggle("active", pagina === 'perfil');

    const btnL = document.getElementById("btn-l");
    const iconPlus = document.getElementById("icon-plus"); 
    const iconTema = document.getElementById("icon-tema"); 
    const engrenagem = document.getElementById("btn-settings");

    if (pagina === 'perfil') {
        // --- ESTADO PERFIL ---
        if (btnL) {
            btnL.classList.add("btn-principal-perfil"); // Gira o botão
            if(iconPlus) iconPlus.style.display = "none";
            if(iconTema) {
                iconTema.style.display = "block";
                // Ajusta o ícone inicial do tema ao entrar no perfil
                const isDark = document.body.classList.contains('dark-theme');
                iconTema.className = isDark ? "fa-solid fa-moon" : "fa-solid fa-sun";
            }
        }
        
        if (engrenagem) {
            engrenagem.style.display = "flex";
            engrenagem.classList.add("animacao-redemoinho");
        }
        window.carregarDadosPerfil();

    } else {
        // --- ESTADO HOME ---
        if (btnL) {
            btnL.classList.remove("btn-principal-perfil"); // Desgira o botão
            if(iconPlus) iconPlus.style.display = "block";
            if(iconTema) iconTema.style.display = "none";
        }
        if (engrenagem) engrenagem.style.display = "none";
    }
};

// 3. AÇÃO DO BOTÃO (A que você enviou, integrada)
window.executarAcaoPrincipal = () => {
    const btnL = document.getElementById("btn-l");
    
    // IMPORTANTE: A classe aqui deve ser a mesma do navegar (btn-principal-perfil)
    if (btnL.classList.contains("btn-principal-perfil")) {
        // Se estiver girado (Perfil), alterna o tema
        window.toggleDarkMode(); 
        
        // Atualiza o ícone Sol/Lua imediatamente
        const iconTema = document.getElementById("icon-tema");
        const isDark = document.body.classList.contains('dark-theme');
        if(iconTema) iconTema.className = isDark ? "fa-solid fa-moon" : "fa-solid fa-sun";
    } else {
        // Se estiver na Home (sem a classe de giro), abre o lançamento
        // Verifique se o nome da sua função de abrir modal é exatamente este:
        if (typeof window.abrirModalNovo() === 'function') {
            window.abrirModalNovo(); // Chama a função de abrir o modal de novo lançamento
        } else {
            console.log("Função abrirModalLancamento não encontrada!");
        }
    }
};
// --- MODAL DE NOVO LANÇAMENTO (POP-UP) ---
window.abrirModalNovo = () => {
    document.getElementById("modalNovo").style.display = "flex";
    window.setTipo('entrada');
    document.getElementById("data").value = new Date().toISOString().split('T')[0];
    
};
window.fecharModalNovo = () => {
    document.getElementById("modalNovo").style.display = "none";
    window.limparCamposModal();
};
// --- CRUD LANÇAMENTOS ---
window.carregarLancamentos = async () => {
    const user = auth.currentUser;

    if (!user) {
        console.warn("Usuário não detectado, tentando novamente em 1s...");
        setTimeout(window.carregarLancamentos, 1000);
        return;
    }
    try {
        const user = auth.currentUser;
    if (!user) return;
        const mes = document.getElementById("monthSelect").value;
        const q = query(collection(db, "lancamentos"), where("userId", "==", user.uid), where("mes", "==", mes));
        const snap = await getDocs(q);
        const eBody = document.getElementById("entradaBody"), sBody = document.getElementById("saidaBody"); 
        eBody.innerHTML = ""; sBody.innerHTML = "";
        let tE = 0, tS = 0;
        
        snap.forEach(d => {
            const item = d.data();
            const v = parseFloat(item.valor) || 0;
            const card = `<div class="transaction-card">
                <div class="icon ${item.tipo === "entrada" ? "income" : "expense"}">${item.tipo === "entrada" ? "↑" : "↓"}</div>
                <div class="info" onclick="window.prepararEdicao('${d.id}')">
                    <span class="title">${item.descricao}</span>
                    <span class="category">${item.cliente || '-'}</span>
                </div>
                <div class="right">
                    <span class="amount">R$ ${v.toFixed(2)}</span>
                    <span class="badge ${item.status === "Pago" ? "paid" : "pending"}">${item.status}</span>
                </div>
                <button onclick="window.deletar('${d.id}')" style="margin-left:10px; border:none; background:none; color:var(--danger); "><i class="fa-solid fa-trash"></i></button>
            </div>`;
            if (item.tipo === "entrada") { tE += v; eBody.innerHTML += card; } else { tS += v; sBody.innerHTML += card; }
        });
        document.getElementById("totalEntrada").innerText = tE.toFixed(2);
        document.getElementById("totalSaida").innerText = tS.toFixed(2);
        document.getElementById("lucro").innerText = (tE - tS).toFixed(2);
    } catch (e) { window.logErroTelegram("carregarLancamentos", e.message); }

    window.atualizarGraficosBarras();

};

// sistema de notificação//
window.gerarProjecaoMesAtual = async () => {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const anoAtual = hoje.getFullYear();
    
    // Lista para converter o número do mês no nome que você usa no select
    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Se o monthSelect estiver vazio, pegamos o mês atual por extenso
    // Caso contrário, usamos o valor selecionado pelo usuário
    let mesFiltro = document.getElementById("monthSelect").value;
    
    if (!mesFiltro) {
        mesFiltro = mesesNomes[hoje.getMonth()];
    }

    const uid = auth.currentUser.uid;

    try {
        const qModelos = query(collection(db, "modelos_fixos"), where("uid", "==", uid));
        const snapModelos = await getDocs(qModelos);

        for (const docModelo of snapModelos.docs) {
            const modelo = docModelo.data();
            
            // Criamos o ID Composto usando o NOME do mês agora (ex: Agua08Março2026)
            const idComposto = `${modelo.nome.replace(/\s+/g, '')}${String(modelo.dia).padStart(2, '0')}${mesFiltro}${anoAtual}`;

            const docRef = doc(db, "lancamentos", idComposto);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                // Lógica de Status (Lembrando de usar "Pendente" ou "Atrasado" com maiúscula se for o seu padrão)
                let statusInicial = (diaAtual > modelo.dia) ? "Atrasado" : "Pendente";

                await setDoc(docRef, {
                    userId: uid,
                    descricao: modelo.nome,
                    valor: parseFloat(modelo.valor),
                    data: `${anoAtual}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(modelo.dia).padStart(2, '0')}`,
                    tipo: "saida",
                    status: statusInicial,
                    mes: mesFiltro, // Agora salvará "Março"
                    origem: "fixo",
                    dataCriacao: new Date()
                });
            }
        }
        window.carregarLancamentos();

    } catch (e) {
        console.error("Erro ao gerar projeção:", e);
        window.logErroTelegram("erro ao gerar projeção", e.message); }

};

window.exibirAlertasPendencias = async () => {
    const uid = auth.currentUser.uid;
    const mesAtual = document.getElementById("monthSelect").value; // Pega o mês da tela

    // Busca apenas o que está no banco como pendente ou atrasado
    const q = query(
        collection(db, "lancamentos"), 
        where("userId", "==", uid),
        where("mes", "==", mesAtual), // Garanta que você salva o campo 'mes' no setDoc
        where("status", "in", ["pendente", "atrasado"])
    );

    const snap = await getDocs(q);
    
    if (!snap.empty) {
        const total = snap.size;
        Swal.fire({
            title: 'Pendências Financeiras',
            text: `Você tem ${total} contas que precisam de atenção este mês.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver e Pagar',
            cancelButtonText: 'Depois'
        }).then((result) => {
            if (result.isConfirmed) {
                window.abrirModalGestaoPendencias(); // Vamos criar este modal agora
            }
        });
    }
};

window.notificarStatusFinanceiro = async () => {
    const uid = auth.currentUser.uid;
    const mesAtual = document.getElementById("monthSelect").value;

    try {
        // 1. Buscamos todos os lançamentos que NÃO estão pagos (Atrasados e Pendentes)
        const q = query(
            collection(db, "lancamentos"),
            where("userId", "==", uid),
            where("mes", "==", mesAtual),
            where("status", "in", ["Atrasado", "Pendente"])
        );

        const snap = await getDocs(q);
        
        if (snap.empty) return; // Se não houver nada, não exibe alerta

        // 2. Separamos os itens em dois grupos
        const atrasados = [];
        const pendentes = [];

        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === "Atrasado") {
                atrasados.push(data.descricao);
            } else {
                pendentes.push(data.descricao);
            }
        });

        // 3. Só mostramos o alerta se houver pelo menos um dos dois
        if (atrasados.length > 0 || pendentes.length > 0) {
            
            Swal.fire({
                title: 'Resumo de Pendências',
                html: `
                    <div style="text-align: left; font-family: sans-serif;">
                        <div style="margin-bottom: 15px; padding: 10px; border-radius: 8px; background: var(--background); border-left: 5px solid var(--danger);">
                            <h4 style="margin: 0 0 5px 0; color: var(--danger);">
                                <i class="fa-solid fa-circle-xmark"></i> Atrasadas (${atrasados.length})
                            </h4>
                            <small>${atrasados.length > 0 ? atrasados.slice(0, 3).join(", ") : "Nenhuma conta vencida"}</small>
                        </div>

                        <div style="padding: 10px; border-radius: 8px; background: var(--background); border-left: 5px solid var(--warning);">
                            <h4 style="margin: 0 0 5px 0; color: var(--warning);">
                                <i class="fa-solid fa-clock"></i> Pendentes (${pendentes.length})
                            </h4>
                            <small>${pendentes.length > 0 ? pendentes.slice(0, 3).join(", ") : "Tudo em dia por enquanto"}</small>
                        </div>
                    </div>
                `,
                icon: atrasados.length > 0 ? 'error' : 'info', // Ícone de erro se houver atrasos, senão info
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Ver Detalhes',
                cancelButtonText: 'Fechar',
            }).then((result) => {
                if (result.isConfirmed) {
                    window.abrirModalGestaoPendencias();
                }
            });
        }
    } catch (e) {
        console.error("Erro ao verificar status:", e);
    }
};

window.abrirModalGestaoPendencias = async () => {
    const uid = auth.currentUser.uid;
    const mesAtual = document.getElementById("monthSelect").value;
    const container = document.getElementById("listaPendenciasContainer");
    
    // Mostra o modal
    document.getElementById('modalPendencias').style.display = 'block';
    container.innerHTML = "<p style='text-align:center;'>Carregando pendências...</p>";

    try {
        const q = query(
            collection(db, "lancamentos"),
            where("userId", "==", uid),
            where("mes", "==", mesAtual),
            where("status", "in", ["Atrasado", "Pendente"]),
            where("tipo", "==", "saida")
        );

        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<div style='text-align:center; padding:20px;'>🎉 Tudo pago por aqui!</div>";
            return;
        }

        snap.forEach(docSnap => {
            const item = docSnap.data();
            const idDoc = docSnap.id;
            const corStatus = item.status === 'Atrasado' ? 'var(--danger)' : 'var(--warning)';

            container.innerHTML += `
                <div class="transaction-card" style="border-left: 5px solid ${corStatus}; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--background); border-radius:8px;">
                    <div class="info">
                        <span class="title" style="display:block; font-weight:bold;">${item.descricao}</span>
                        <span class="category" style="font-size:12px; color:var(--text);">Vence dia: ${item.data.split('-')[2] || '--'}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="amount" style="font-weight:bold;">R$ ${parseFloat(item.valor).toFixed(2)}</span>
                        <button onclick="window.confirmarPagamentoRapido('${idDoc}', '${item.descricao}')" 
                                style="background:var(--success); color:var(--text); border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">
                            <i class="fa-solid fa-check"></i> Pago
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Erro ao carregar pendências:", e);
        container.innerHTML = "<p>Erro ao carregar dados.</p>";
    }
};

window.confirmarPagamentoRapido = async (idDoc, nome) => {
    try {
        await updateDoc(doc(db, "lancamentos", idDoc), {
            status: "Pago",
            dataPagamento: new Date()
        });

        // Notificação de sucesso
        if (window.Toast) {
            window.Toast.fire({
                icon: 'success',
                title: `${nome} marcado como pago!`
            });
        }

        // Atualiza o modal de pendências (remove o item da lista)
        window.abrirModalGestaoPendencias();
        
        // Atualiza a tabela principal ao fundo
        if (window.carregarLancamentos) window.carregarLancamentos();

    } catch (e) {
        console.error("Erro ao dar baixa:", e);
        Swal.fire('Erro', 'Não foi possível atualizar o status.', 'error');
    }
};

// --- CONTROLE DE TIPO (ENTRADA/SAÍDA) ---
window.setTipo = (t) => {
    // 1. Atualiza o valor do tipo e as classes dos botões
    document.getElementById("tipo").value = t;
    document.getElementById("btnTipoE").classList.toggle("active", t === 'entrada');
    document.getElementById("btnTipoS").classList.toggle("active", t === 'saida');

    // 2. Lógica do campo Cliente com Transição Suave
    const groupCliente = document.getElementById("group-cliente");
    const inputCliente = document.getElementById("cliente");

    if (groupCliente && inputCliente) {
        if (t === 'saida') {
            // Adiciona a classe que dispara a animação CSS
            groupCliente.classList.add("hidden"); 
            inputCliente.required = false;
            inputCliente.value = "";
        } else {
            // Remove a classe para mostrar suavemente
            groupCliente.classList.remove("hidden");
            inputCliente.required = true;
        }
    }
};
// --- FUNÇÕES DE LANÇAMENTOS E LIMPEZA---
window.addLancamento = async () => {
    const descricao = document.getElementById("descricao").value;
    const valorInput = document.getElementById("valor").value;
    const valor = parseFloat(valorInput) || 0;
    const dataBase = document.getElementById("data").value;
    const cliente = document.getElementById("cliente").value;
    const tipo = document.getElementById("tipo").value; // Agora pegará o valor correto
    const mesSelecionado = document.getElementById("monthSelect").value;
    const isFixa = document.getElementById("isFixa").checked;

    if (!descricao || !valor || !dataBase) {
        return Swal.fire('Atenção', 'Preencha Descrição, Valor e Data.', 'warning');
    }

    try {
        const uid = auth.currentUser.uid;
        const categoriaIdentificada = window.identificarCategoriaPelaDescricao(descricao);

        const novo = { 
            userId: uid, 
            descricao, 
            valor, 
            data: dataBase, 
            cliente: tipo === 'entrada' ? cliente : "", // Limpa cliente se for saída
            tipo, 
            isFixa, 
            mes: mesSelecionado, 
            status: "Pago",
            categoria: categoriaIdentificada 
        };
        
        await addDoc(collection(db, "lancamentos"), novo);

        if (isFixa) {
            await addDoc(collection(db, "modelos_fixos"), {
                uid: uid,
                nome: descricao,
                valor: valor,
                dia: parseInt(dataBase.split('-')[2]),
                categoria: categoriaIdentificada,
                dataCriacao: new Date()
            });

            let indice = months.indexOf(mesSelecionado);
            for (let i = indice + 1; i < months.length; i++) {
                await addDoc(collection(db, "lancamentos"), { ...novo, mes: months[i] });
            }
        }
        
        // Dispara a verificação inteligente de alteração de preço
        window.verificarAtualizacaoModelo(descricao, valor);

        window.fecharModalNovo();
        window.limparCamposModal();
        window.carregarLancamentos();
        
        Toast.fire({
            icon: 'success',
            title: isFixa ? 'Lançamento Fixo Replicado!' : 'Salvo com sucesso!'
        });

    } catch (e) { 
        window.logErroTelegram("addLancamento", e.message); 
        Swal.fire('Erro', 'Falha ao guardar registro.', 'error');
    }
};

window.limparCamposModal = () => {
    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("data").value = "";
    document.getElementById("cliente").value = "";
    document.getElementById("tipo").value = "saida"; // ou o seu valor padrão
    document.getElementById("isFixa").checked = false;
    
    // Se o seu modal usa o select de meses, talvez queira resetar para o atual
    // document.getElementById("monthSelect").value = mesAtual;
};

// Função para verificar se o valor do serviço/modelo mudou
window.verificarAtualizacaoModelo = async (descricao, valorNovo) => {
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, "usuarios", uid);
    
    try {
        // Busca preferência e serviços
        const userSnap = await getDoc(userDocRef);
        const preferencia = userSnap.data()?.preferenciaAtualizacao; // 'sempre', 'nunca' ou undefined

        // Busca o serviço na coleção "servicos" (ou modelos_fixos, ajuste conforme o seu uso)
        const q = query(collection(db, "servicos"), where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        let servicoEncontrado = null;

        querySnapshot.forEach(doc => {
            if (doc.data().nome.toLowerCase() === descricao.toLowerCase()) {
                servicoEncontrado = { id: doc.id, ...doc.data() };
            }
        });

        // Se não houver serviço salvo ou o valor for o mesmo, encerra
        if (!servicoEncontrado || servicoEncontrado.valor === valorNovo) return;

        // Se o usuário já marcou "Sempre" ou "Nunca"
        if (preferencia === 'sempre') {
            await updateDoc(doc(db, "servicos", servicoEncontrado.id), { valor: valorNovo });
            return window.mostrarTutorialAjuste();
        }
        if (preferencia === 'nunca') {
            return window.mostrarTutorialAjuste();
        }

        // Se não tem preferência, abre o SweetAlert2 com checkbox
        const result = await Swal.fire({
            title: 'Atualizar valor do modelo?',
            html: `
                <p style="font-size: 14px; color: #555;">
                    O valor para <b>${servicoEncontrado.nome}</b> é diferente do salvo (R$ ${servicoEncontrado.valor.toFixed(2)}).
                </p>
                <div style="margin-top: 15px; font-size: 13px;">
                    <input type="checkbox" id="swal-pref-check" style="cursor:pointer;">
                    <label for="swal-pref-check" style="cursor:pointer;"> Não perguntar novamente</label>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, atualizar padrão',
            cancelButtonText: 'Não, só desta vez',
            confirmButtonColor: 'var(--success)',
            cancelButtonColor: 'var(--danger)'
        });

        const marcarNovamente = document.getElementById('swal-pref-check').checked;

        if (result.isConfirmed) {
            // Atualiza o modelo
            await updateDoc(doc(db, "servicos", servicoEncontrado.id), { valor: valorNovo });
            if (marcarNovamente) await updateDoc(userDocRef, { preferenciaAtualizacao: 'sempre' });
        } else {
            // Não atualiza o modelo
            if (marcarNovamente) await updateDoc(userDocRef, { preferenciaAtualizacao: 'nunca' });
        }

        // Após qualquer decisão, mostra como fazer manualmente no futuro
        window.mostrarTutorialAjuste();

    } catch (e) {
        console.error("Erro na verificação de modelo:", e);
    }
};

// Função de Tutorial/Instrução
window.mostrarTutorialAjuste = () => {
    Swal.fire({
        title: 'Dica de Gestão',
        text: 'Você pode gerenciar todos os seus serviços na aba "Perfil" clicando no botão "Meu serviço/Produtos" .',
        icon: 'info',
        confirmButtonText: 'Entendi',
        confirmButtonColor: 'var(--success)'
    });
};

// Função do Pop-up Educativo
window.mostrarTutorialAjuste = () => {
    Swal.fire({
        title: 'Como gerenciar modelos',
        text: 'Você pode alterar nomes e valores definitivos a qualquer momento na aba "Serviços" dentro do menu de configurações.',
        icon: 'info',
        confirmButtonText: 'Entendi',
        confirmButtonColor: '#20B2AA'
    });
};

// --- EDIÇÃO DE LANÇAMENTOS ---
window.prepararEdicao = async (id) => {
    const docSnap = await getDoc(doc(db, "lancamentos", id));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById("editId").value = id;
        document.getElementById("editDescricao").value = d.descricao;
        document.getElementById("editValor").value = d.valor;
        document.getElementById("editData").value = d.data;
        document.getElementById("editMes").value = d.mes;
        document.getElementById("editStatus").value = d.status || "Pago";
        document.getElementById("editModal").style.display = "flex";
    }
};
// CORREÇÃO: A função salvarEdicao estava com um erro de referência na variável 'id' que não existia no escopo. Agora ela pega o ID do input escondido que é preenchido na função prepararEdicao.
window.salvarEdicao = async () => {
    const id = document.getElementById("editId").value;
    const dados = {
        descricao: document.getElementById("editDescricao").value,
        valor: parseFloat(document.getElementById("editValor").value),
        data: document.getElementById("editData").value,
        mes: document.getElementById("editMes").value,
        status: document.getElementById("editStatus").value
    };
    try {
        await updateDoc(doc(db, "lancamentos", id), dados);
        window.fecharModal(); 
        window.carregarLancamentos(); 
    } catch (e) { window.logErroTelegram("salvarEdicao", e.message); }
};
// linha 514 estava com erro de referência na variável 'id' que não existia no escopo. Agora ela pega o ID do input escondido que é preenchido na função prepararEdicao.
window.fecharModal = () => document.getElementById("editModal").style.display = "none";
// linha 516 a 561 estava com erro de referência na variável 'id' que não existia no escopo. Agora ela pega o ID do input escondido que é preenchido na função prepararEdicao.
window.deletar = async (id) => {
    try {
        const docRef = doc(db, "lancamentos", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        const item = docSnap.data();

        const result = await Swal.fire({
            title: 'Excluir registro?',
            text: item.isFixa ? `"${item.descricao}" é fixo. Apagar apenas este ou todos os meses futuros?` : "Deseja excluir este registro?",
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: item.isFixa,
            confirmButtonText: item.isFixa ? 'Apagar todos os meses' : 'Sim, excluir',
            denyButtonText: 'Apagar apenas este',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33'
        });

        if (result.isDismissed) return;

        if (result.isConfirmed && item.isFixa) {
            // Deleção em massa
            const mesesParaApagar = months.slice(months.indexOf(item.mes));
            const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid), where("descricao", "==", item.descricao));
            const querySnapshot = await getDocs(q);
            
            const promises = [];
            querySnapshot.forEach((d) => {
                if (mesesParaApagar.includes(d.data().mes)) {
                    promises.push(deleteDoc(doc(db, "lancamentos", d.id)));
                }
            });
            await Promise.all(promises);
            Toast.fire({ icon: 'success', title: 'Gasto fixo removido do calendário.' });
        } else {
            // Deleção simples
            await deleteDoc(docRef);
            Toast.fire({ icon: 'success', title: 'Registro excluído.' });
        }

        window.carregarLancamentos();
    } catch (e) {
        window.logErroTelegram("deletar", e.message);
    }
};
// --- GESTÃO DE PERFIL ---
window.carregarDadosPerfil = async () => {
    try {
        const d = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        document.getElementById("perfilEmail").innerText = auth.currentUser.email;
        document.getElementById("editEmail").value = auth.currentUser.email;
        if(d.exists()) {
            const dados = d.data();
            document.getElementById("perfilNome").innerText = dados.nome || "Usuário";
            document.getElementById("editNome").value = dados.nome || "";
            document.getElementById("editEmpresa").value = dados.empresa || "";
            document.getElementById("editContato").value = dados.contato || "";
        }
    } catch (e) { window.logErroTelegram("carregarDadosPerfil", e.message); }
};
// CORREÇÃO: A função salvarDadosPerfil estava com erro de referência na variável 'id' que não existia no escopo. Agora ela pega o ID do usuário autenticado.
window.salvarDadosPerfil = async () => {
    // 1. Capturamos os elementos primeiro para testar se existem
    const elNome = document.getElementById("editNome");
    const elEmpresa = document.getElementById("editEmpresa");
    const elContato = document.getElementById("editContato");

    // 2. Verificação de segurança no console (aperte F12 para ver)
    console.log("Valores atuais:", {
        nome: elNome?.value,
        empresa: elEmpresa?.value,
        contato: elContato?.value
    });

    // 3. Pegamos os valores removendo espaços em branco extras
    const nome = elNome?.value?.trim();
    const empresa = elEmpresa?.value?.trim();
    const contato = elContato?.value?.trim();

    // 4. Se o JS não encontrar o valor, ele para aqui com um aviso claro
    if (!nome || !empresa) {
        return Swal.fire('Atenção', 'Nome e Empresa são obrigatórios!', 'warning');
    }

    try {
        const uid = auth.currentUser.uid;
        const email = auth.currentUser.email;

        await setDoc(doc(db, "usuarios", uid), { 
            nome, 
            empresa, 
            contato: contato || "", // Evita erro se contato estiver vazio
            email 
        }, { merge: true });

        Swal.fire('Sucesso', 'Perfil atualizado com sucesso!', 'success');
        
        if (window.carregarDadosPerfil) {
            window.carregarDadosPerfil();
        }
    } catch (e) { 
        console.error("Erro ao salvar perfil:", e);
        if (window.logErroTelegram) window.logErroTelegram("salvarDadosPerfil", e.message); 
    }
};
// --- PWA & INSTALAÇÃO ---
if ('serviceWorker' in navigator) {
    
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/Gestto-mobile/service-worker.js', { scope: '/Gestto-mobile/' })
            .then(reg => console.log('Service Worker registrado no GitHub Pages!'))
            .catch(err => console.log('Erro de registro:', err));
    });
}
// Evento para capturar o prompt de instalação da PWA
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptInstalacao = e;
    const banner = document.getElementById("installBanner");
    if (banner) banner.style.display = "block";
});
// Função para acionar o prompt de instalação quando o usuário clicar no banner
window.instalarPWA = async () => {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    const { outcome } = await promptInstalacao.userChoice;
    if (outcome === "accepted") document.getElementById("installBanner").style.display = "none";
    promptInstalacao = null;
};
// --- UTILITÁRIOS ---
window.logout = async () => {
    // 1. Fechar o menu lateral IMEDIATAMENTE para não atrapalhar o pop-up
    window.fecharDrawer();

    // 2. Agora mostramos o pop-up de confirmação
    const result = await Swal.fire({
        title: 'Sair do Gestto?',
        text: "Você precisará fazer login novamente.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, sair!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            window.logErroTelegram("Erro_Logout", error.message);
            Swal.fire('Erro', 'Não foi possível sair.', 'error');
        }
    }
};
// Função para alternar seções (ex: detalhes do perfil)
window.toggleSecao = (id, header) => { 
    document.getElementById(id).classList.toggle('hidden'); 
    header.classList.toggle('closed'); 
};
                    // 1. LÓGICA DE LOGIN //

document.getElementById("btnLogin").onclick = async () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    if (!email || !pass) {
        return Swal.fire('Ops!', 'Preencha e-mail e senha.', 'warning');
    }

    // Mostrar carregando
    Swal.fire({
        title: 'Autenticando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        Swal.close(); // Fecha o carregando ao entrar
    } catch (error) {
        window.logErroTelegram("Tela de Login", error.message);
        
        // Tradução amigável de erros comuns do Firebase
        let mensagem = "Erro ao tentar entrar.";
        if (error.code === 'auth/invalid-credential') mensagem = "E-mail ou senha incorretos.";
        if (error.code === 'auth/user-not-found') mensagem = "Usuário não encontrado.";
        if (error.code === 'auth/wrong-password') mensagem = "Senha incorreta.";

        Swal.fire({
            icon: 'error',
            title: 'Falha no Acesso',
            text: mensagem,
            confirmButtonColor: 'var(--danger)'
        });
    }
};
// 2. LÓGICA DE CADASTRO
    const btnRegistrar = document.getElementById("btnRegistrar");

    if (btnRegistrar) {
    btnRegistrar.onclick = async (e) => {
        // Evita que a página recarregue caso o botão esteja em um form
        if (e) e.preventDefault();

        const nome = document.getElementById("cadNome").value;
        const email = document.getElementById("cadEmail").value;
        const senha = document.getElementById("cadSenha").value;

        if (!email || !senha || !nome) {
            alert("Por favor, preencha todos os campos de cadastro.");
            return;
        }

        try {
            // Cria o usuário
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // Salva dados adicionais no Firestore
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: nome,
                email: email,
                createdAt: new Date()
            });

           Swal.fire({
    title: 'Bem-vindo(a)!',
    text: 'Sua conta foi criada com sucesso!',
    icon: 'success',
    confirmButtonText: 'Começar agora',
    confirmButtonColor: 'var(--success)',
    background: 'var(--background)',
    borderRadius: '20px',
    showClass: {
        popup: 'animate__animated animate__backInDown' // Se quiser animação extra
    },
    hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
    }
});
            
            // Tenta voltar para a tela de login visualmente
            if (typeof window.mostrarLogin === "function") {
                window.mostrarLogin();
            } else {
                location.reload();
            }

        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            let mensagem = "Erro ao criar conta.";
            
            if (error.code === 'auth/email-already-in-use') mensagem = "Este e-mail já está em uso.";
            if (error.code === 'auth/weak-password') mensagem = "A senha deve ter pelo menos 6 caracteres.";
            if (error.code === 'auth/invalid-email') mensagem = "E-mail inválido.";
            
            alert(mensagem);
            window.logErroTelegram("Cadastro", error.message);
        }
    };
}
// --- CONTROLE DA INTERFACE ---
window.abrirModalPerfil = async () => {
    // Busca dados atuais do usuário
    const snap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById("editNome").value = d.nome || "";
        document.getElementById("editEmpresa").value = d.empresa || "";
        document.getElementById("editContato").value = d.contato || "";
        
    }
    
    // Mostra o Drawer e o Overlay
    document.getElementById("drawerPerfil").classList.add("active");
    document.getElementById("overlay").style.display = "flex";
    
};
// Fechar Modal de Perfil
window.fecharDrawer = () => {
    document.getElementById("drawerPerfil").classList.remove("active");
    document.getElementById("overlay").style.display = "none";
    window.toggleEdicao()
};
        // --- NOVAS FUNÇÕES DE APOIO --- //

// Função para abrir o tutorial de uso do aplicativo
window.abrirTutorial = () => {
    Swal.fire({
        title: '📖 Como usar o Gestto',
        html: `
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <iframe 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"
                    src="" 
                    title="Tutorial Gestto"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>

            <div style="text-align: left; font-size: 14px; color: var(--text); line-height: 1.6;">
                <p style="margin-bottom: 8px;"><i class="fa-solid fa-plus-circle" style="color: var(--primary);"></i> <b>Lançamentos:</b> Registre suas entradas e saídas diárias no botão principal.</p>
                <p style="margin-bottom: 8px;"><i class="fa-solid fa-arrows-rotate" style="color: var(--warning);"></i> <b>Gastos Fixos:</b> Marque "Fixo" para repetir o gasto nos meses seguintes.</p>
                <p><i class="fa-solid fa-tags" style="color: var(--success);"></i> <b>Categorias:</b> O sistema classifica seus gastos automaticamente pela descrição.</p>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: 'Entendi!',
        confirmButtonColor: '#20B2AA', // Cor --primary do seu styles.css
        width: '95%',
        customClass: {
            popup: 'log-window-clean' // Usando sua classe de estilo do CSS
        }
    });
};
// Função para contatar o suporte via WhatsApp
window.contatarSuporte = () => {
    const msg = encodeURIComponent("Olá! Preciso de ajuda com o aplicativo Gestto.");
    window.open(`https://wa.me/55219********text=${msg}`, '_blank'); // Substitua pelo seu número
};

// Carregar Dados do Perfil do Firebase
window.carregarDadosPerfil = async () => {
    try {
        if (!auth.currentUser) return;

        const userSnap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        
        if (userSnap.exists()) {
            const d = userSnap.data();
            
            // Preenche os campos de input
            if (document.getElementById("editNome")) document.getElementById("editNome").value = d.nome || "";
            if (document.getElementById("editEmpresa")) document.getElementById("editEmpresa").value = d.empresa || "";
            if (document.getElementById("editContato")) document.getElementById("editContato").value = d.contato || "";
            
            // ATUALIZA O TEXTO DE EXIBIÇÃO NO TOPO
            const displayNome = document.getElementById("perfilNomeExibicao");
            if (displayNome) {
                // Aqui você escolhe: quer mostrar o Nome ou a Empresa no topo?
                displayNome.innerText = d.empresa || "Usuário";
            }
        }
    } catch (e) {
        window.logErroTelegram("carregarDadosPerfil", e.message);
    }
};

// Salvar Dados do Perfil

window.salvarDadosPerfil = async () => {
    const nome = document.getElementById("editNome").value;
    const empresa = document.getElementById("editEmpresa").value;
    const contato = document.getElementById("editContato").value;

    if (!nome || !empresa) {
        return Swal.fire({
            icon: 'warning',
            title: 'Campos Obrigatórios',
            text: 'Por favor, preencha o Nome e a Empresa.',
            confirmButtonColor: 'var(--success)'
        });
    }

    Swal.fire({
        title: 'A guardar alterações...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado.");

        // 1. Gravação no Firestore
        await setDoc(doc(db, "usuarios", user.uid), {
            nome: nome,
            empresa: empresa,
            contato: contato,
            email: user.email,
            ultimaAtualizacao: new Date().toISOString()
        }, { merge: true });

        // 2. ATUALIZAÇÃO DA TELA (O QUE ESTAVA FALTANDO)
        // Aqui atualizamos o nome no topo do perfil e o nome da empresa
        const elementoTopo = document.getElementById("perfilNomeExibicao");
        const elementoNomePrincipal = document.getElementById("perfilNome");
        
        if (elementoTopo) elementoTopo.innerText = empresa; // Exibe a Empresa no topo
        if (elementoNomePrincipal) elementoNomePrincipal.innerText = nome; // Nome da pessoa abaixo

        Swal.close();
        
        // Fecha a seção de edição (acordeão)
        if(document.getElementById("secaoEdicao")) {
            document.getElementById("secaoEdicao").classList.remove("aberto");
        }
        
        // Opcional: fechar o menu lateral
        window.fecharDrawer();

        Toast.fire({
            icon: 'success',
            title: 'Perfil e Empresa atualizados!'
        });

    } catch (error) {
        window.logErroTelegram("Salvar_Perfil", error.message);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Salvar',
            text: 'Não foi possível atualizar o perfil.',
            confirmButtonColor: '#ef4444'
        });
    }
};

// --- GESTÃO DE MODELOS FIXOS ---
window.abrirGerenciadorFixos = async function() {
    document.getElementById('modalGerenciadorFixos').style.display = 'flex';
    await window.carregarModelosFixos();
};
window.fecharGerenciadorFixos = function() {
    document.getElementById('modalGerenciadorFixos').style.display = 'none';
    window.limparFormModeloFixo() 
    
};
window.limparFormModeloFixo = function(){
    const campoNome = document.getElementById("fixoNome");
    const campoValor = document.getElementById("fixoValor");
    const campoDia = document.getElementById("fixoDia");
    const btnSalvar = document.getElementById("btnSalvarModeloFixo");
    const form = document.getElementById("formCadastrarModeloFixo");

    // 2. Reseta os valores dos campos
    if (campoNome) campoNome.value = "";
    if (campoValor) campoValor.value = "";
    if (campoDia) campoDia.value = "";

    // 3. Reseta o botão de salvar (caso estivesse em modo "Atualizar")
    if (btnSalvar) {
        btnSalvar.removeAttribute("data-id-edicao");
        btnSalvar.innerHTML = '<i class="fa-solid fa-plus"></i> Cadastrar Modelo';
    }
    
    // 4. Se houver o atributo de edição no container do formulário, remove também
    if (form) {
        form.removeAttribute("data-id-edicao");
    }

}

// Salvar Modelo
window.salvarModeloFixo = async () => {
    const form = document.getElementById("formCadastrarModeloFixo");
    const idEdicao = form.getAttribute("data-id-edicao");
    
    const nome = document.getElementById("fixoNome").value;
    const valor = parseFloat(document.getElementById("fixoValor").value);
    const dia = parseInt(document.getElementById("fixoDia").value);

    if (!nome || isNaN(valor) || isNaN(dia)) {
        return Swal.fire('Atenção', 'Preencha todos os campos corretamente.', 'warning');
    }

    try {
        const uid = auth.currentUser.uid;
        const dados = {
            uid: uid,
            nome: nome,
            valor: valor,
            dia: dia,
            categoria: window.identificarCategoriaPelaDescricao(nome) // Usa sua lógica de categoria
        };

        if (idEdicao) {
            // MODO EDIÇÃO
            await updateDoc(doc(db, "modelos_fixos", idEdicao), dados);
            form.removeAttribute("data-id-edicao");
            document.getElementById("btnSalvarModeloFixo").innerHTML = '<i class="fa-solid fa-plus"></i> Cadastrar Modelo';
            Toast.fire({ icon: 'success', title: 'Modelo atualizado!' });
        } else {
            // MODO NOVO CADASTRO
            await addDoc(collection(db, "modelos_fixos"), { ...dados, dataCriacao: new Date() });
            Toast.fire({ icon: 'success', title: 'Modelo cadastrado!' });
        }
        window.limparFormModeloFixo(); // Aquela função que limpa inputs e reseta o botão
        window.carregarModelosFixos(); // Recarrega a lista abaixo para mostrar o novo/editado

    } catch (e) {
        window.logErroTelegram("salvarModeloFixo", e.message);
        Swal.fire('Erro', 'Não foi possível salvar o modelo.', 'error');
    }
};
// Listar Modelos
window.carregarModelosFixos = async function() {
    const container = document.getElementById('listaModelosSalvos');
    if (!auth.currentUser) return;

    container.innerHTML = '<p style="text-align:center; font-size:12px; color: #888;">Carregando...</p>';

    try {
        const q = query(collection(db, "modelos_fixos"), where("uid", "==", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; font-size:14px; color: #999; margin: 20px 0;">Nenhum modelo cadastrado.</p>';
            return;
        }


    snapshot.forEach(docSnap => {
    const item = docSnap.data();
    container.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--white); padding: 12px; border-radius: 10px; margin-bottom: 8px; border: var(--border);">
            <div onclick="window.prepararEdicaoModeloFixo('${docSnap.id}')" style="line-height: 1.2; flex: 1; cursor: pointer;">
    <strong style="font-size: 14px;">${item.nome}</strong><br>
    <small style="color: var(--text);">Dia ${item.dia} • R$ ${item.valor.toFixed(2)}</small>
</div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.lancarModeloNoMes('${item.nome}', ${item.valor}, ${item.dia})" style="background: var(--background); border: none; color: var(--success); padding: 8px; border-radius: 5px; cursor: pointer;">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Lançar
                </button>
                <button onclick="window.excluirModeloFixo('${docSnap.id}')" style="background:none; border:none; color: var(--danger); cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
});
    } catch (e) {
        window.logErroTelegram("carregarModelosFixos", e.message);
    }
};

// EXCLUIR MODELO FIXO
window.excluirModeloFixo = async (id) => {
    const result = await Swal.fire({
        title: 'Remover Modelo?',
        text: "Novos meses não serão mais gerados automaticamente.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Remover',
        cancelButtonText: 'Manter'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "modelos_fixos", id));
            await window.carregarModelosFixos();
            Toast.fire({ icon: 'success', title: 'Modelo fixo removido.' });
        } catch (e) {
            window.logErroTelegram("excluirModeloFixo", e.message);
        }
    }
};

// EXCLUIR SERVIÇO
window.excluirServico = async (id) => {
    const result = await Swal.fire({
        title: 'Excluir serviço?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Excluir',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "servicos", id));
            window.carregarServicos();
            window.atualizarDatalistServicos();
            Toast.fire({ icon: 'success', title: 'Serviço deletado.' });
        } catch (e) {
            window.logErroTelegram("excluirServico", e.message);
        }
    }
};

// Lançar Modelo no Mês Selecionado e nos Consecutivos
window.lancarModeloNoMes = async (nome, valor, diaVencimento) => {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const anoAtual = hoje.getFullYear();
    
    // PEGA O MÊS EXATAMENTE COMO O SEU SELECT DE FILTRO USA (ex: "Março" ou "03")
    const mesFiltro = document.getElementById("monthSelect").value;

    // Lógica de Status (Ajustada para bater com seu CSS "Pago" ou "Pendente")
    let statusFinal = (diaAtual >= diaVencimento) ? "Pago" : "Pendente";

    // ID Composto para evitar duplicidade
    const idComposto = `${nome.replace(/\s+/g, '')}${String(diaVencimento).padStart(2, '0')}${mesFiltro}${anoAtual}`;

    try {
        const uid = auth.currentUser.uid;
        
        await setDoc(doc(db, "lancamentos", idComposto), {
            userId: uid,
            descricao: nome,
            valor: parseFloat(valor),
            data: `${anoAtual}-${mesFiltro}-${String(diaVencimento).padStart(2, '0')}`, // Ajuste conforme seu padrão
            tipo: "saida",
            status: statusFinal, // Agora com inicial Maiúscula para bater com seu card
            mes: mesFiltro,      // ISSO AQUI FAZ APARECER NA QUERY
            origem: "fixo",
            dataCriacao: new Date()
        });

        Toast.fire({ icon: 'success', title: `Lançado em ${mesFiltro}!` });

        // Chama a atualização da tabela
        await window.carregarLancamentos();

    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Falha ao salvar lançamento.', 'error');
    }
};
// --- GESTÃO DE SERVIÇOS ---
window.abrirGerenciadorServicos = () => {
    document.getElementById('modalGerenciadorServicos').style.display = 'flex';
    window.carregarServicos();
};

window.fecharGerenciadorServicos = () => {
    document.getElementById('modalGerenciadorServicos').style.display = 'none';
    document.getElementById("servicoNome").value = "";
    document.getElementById("servicoValor").value = "";
    document.getElementById('modal-servicos').style.display = 'none';

    const form = document.getElementById('formCadastrarServico');
    form.reset();
    form.removeAttribute('data-id-edicao');
    form.querySelector('button').innerHTML = '<i class="fa-solid fa-plus"></i> Cadastrar Serviço';
};
// Salvar Serviço
document.getElementById('formCadastrarServico').onsubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "servicos"), {
            uid: auth.currentUser.uid,
            nome: document.getElementById('servicoNome').value,
            valor: parseFloat(document.getElementById('servicoValor').value)
        });
        document.getElementById('formCadastrarServico').reset();
        window.carregarServicos();
        window.atualizarDatalistServicos(); // Atualiza as sugestões do formulário
    } catch (e) { window.logErroTelegram("salvarServico", e.message); }
};

// Carregar Lista para Gestão e para o Datalist
window.carregarServicos = async () => {
    const container = document.getElementById('listaServicosSalvos');
    if (!auth.currentUser) return;

    const q = query(collection(db, "servicos"), where("uid", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    
    container.innerHTML = '';
    
    // --- NOVIDADE: Limpa e atualiza o cache para o gráfico ---
    listaServicosCache = []; 

    snap.forEach(d => {
        const s = d.data();
        
        // Alimenta o cache com o nome em minúsculo para comparação precisa
        listaServicosCache.push(s.nome.toLowerCase().trim());

        const div = document.createElement('div');
        div.className = 'servico-item';
        div.style = "background: var(--white); display:flex; justify-content:space-between; align-items:center; padding:10px; border:var(--border); border-radius: var(--radius); margin-bottom: 8px;";
        
        div.innerHTML = `
            <div onclick="window.prepararEdicaoServico('${d.id}')" style="cursor:pointer; flex-grow:1;">
                <strong style="display:block;">${s.nome}</strong>
                <small style="color:var(--success);">R$ ${parseFloat(s.valor).toFixed(2)}</small>
            </div>
            <button onclick="window.excluirServico('${d.id}')" style="background:none; border:none; color:var(--danger); padding:5px 10px;">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // Se você tiver uma função de atualizar o gráfico, chame-a aqui para sincronizar
    if (typeof window.renderizarGraficos === 'function') {
        window.renderizarGraficos();
    }
};

window.prepararEdicaoServico = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "servicos", id));
        if (docSnap.exists()) {
            const s = docSnap.data();
            
            // Preenche os inputs do seu index.html
            document.getElementById('servicoNome').value = s.nome;
            document.getElementById('servicoValor').value = s.valor;
            
            // Muda o texto do botão para indicar edição
            const btnSalvar = document.querySelector('#formCadastrarServico button');
            btnSalvar.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Serviço';
            
            // Guarda o ID no formulário para usarmos no salvamento
            document.getElementById('formCadastrarServico').setAttribute('data-id-edicao', id);
            
            Toast.fire({ icon: 'info', title: 'Editando: ' + s.nome });
        }
    } catch (e) {
        console.error("Erro ao carregar serviço:", e);
    }
};

document.getElementById('formCadastrarServico').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const idEdicao = form.getAttribute('data-id-edicao');
    
    const nome = document.getElementById('servicoNome').value;
    const valor = parseFloat(document.getElementById('servicoValor').value);

    try {
        const dados = {
            uid: auth.currentUser.uid,
            nome: nome,
            valor: valor
        };

        if (idEdicao) {
            // MODO EDIÇÃO
            await updateDoc(doc(db, "servicos", idEdicao), dados);
            form.removeAttribute('data-id-edicao');
            form.querySelector('button').innerHTML = '<i class="fa-solid fa-plus"></i> Cadastrar Serviço';
            Toast.fire({ icon: 'success', title: 'Serviço atualizado!' });
        } else {
            // MODO NOVO
            await addDoc(collection(db, "servicos"), dados);
            Toast.fire({ icon: 'success', title: 'Serviço cadastrado!' });
        }

        form.reset();
        window.carregarServicos();
        window.atualizarDatalistServicos(); // Mantém seus lançamentos atualizados

    } catch (e) {
        Swal.fire('Erro', 'Não foi possível salvar o serviço.', 'error');
    }
};

// ATUALIZA O DATALIST (Sugestões enquanto digita)
window.atualizarDatalistServicos = async () => {
    const datalist = document.getElementById('listaSugestoesServicos');
    const q = query(collection(db, "servicos"), where("uid", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    
    datalist.innerHTML = '';
    snap.forEach(d => {
        const s = d.data();
        let opt = document.createElement('option');
        opt.value = s.nome;
        datalist.appendChild(opt);
    });
};

// PREENCHE O VALOR AUTOMATICAMENTE
window.verificarSugestaoServico = async (valorDigitado) => {
    const q = query(collection(db, "servicos"), 
                    where("uid", "==", auth.currentUser.uid), 
                    where("nome", "==", valorDigitado));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        const dadosServico = snap.docs[0].data();
        document.getElementById('valor').value = dadosServico.valor;
        // Opcional: focar no próximo campo ou dar um feedback visual
    }
};

// Chamar atualização ao iniciar o app
onAuthStateChanged(auth, async (user) => {
    if (user) { 
        document.getElementById("auth").style.display = "none"; 
        document.getElementById("app").style.display = "block"; 
        await window.carregarDadosPerfil(); // Carrega os dados do perfil ao entrar
    } else { 
        // Quando o usuário sai:
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none";
        
        // Esconde a seção de perfil caso ela tenha ficado aberta
        const perfil = document.getElementById("perfilSection");
        if(perfil) perfil.style.display = "none";
    }

});

// INTELIGÊNCIA PARA ENTRADAS (SERVIÇOS)
window.verificarServicoInteligente = async (nomeOriginal) => {
    const user = auth.currentUser;
    if (!user) return;

    const nomeBusca = nomeOriginal.toLowerCase().trim();
    
    // Busca todos os serviços do usuário logado
    const q = query(collection(db, "servicos"), where("uid", "==", user.uid));
    const snap = await getDocs(q);

    // Procura na lista ignorando maiúsculas/minúsculas
    const servicoExistente = snap.docs.find(d => 
        d.data().nome.toLowerCase() === nomeBusca
    );

    if (servicoExistente) {
        const dados = servicoExistente.data();
        document.getElementById("valor").value = dados.valor;
        // Feedback visual
        document.getElementById("valor").style.backgroundColor = "#e8f5e9";
        setTimeout(() => document.getElementById("valor").style.backgroundColor = "", 1500);
        Toast.fire({ icon: 'info', title: `Serviço "${dados.nome}" reconhecido!` });
    } else {
        // Se não encontrar, sugere cadastrar (conforme sua solicitação)
        const res = await Swal.fire({
            title: 'Novo Serviço?',
            text: `Deseja salvar "${nomeOriginal}" como um serviço padrão?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, salvar'
        });

        if (res.isConfirmed) {
            const { value: valor } = await Swal.fire({
                title: 'Valor padrão:',
                input: 'number',
                inputLabel: 'R$',
                showCancelButton: true
            });
            if (valor) {
                await addDoc(collection(db, "servicos"), {
                    uid: user.uid,
                    nome: nomeOriginal,
                    valor: parseFloat(valor)
                });
                document.getElementById("valor").value = valor;
                Toast.fire({ icon: 'success', title: 'Serviço cadastrado!' });
            }
        }
    }
};

// INTELIGÊNCIA PARA SAÍDAS (GASTOS FIXOS)
window.verificarGastoFixoInteligente = async (nomeOriginal) => {
    const user = auth.currentUser;
    if (!user) return;

    const nomeBusca = nomeOriginal.toLowerCase().trim();
    
    // Busca na coleção modelos_fixos
    const q = query(collection(db, "modelos_fixos"), where("uid", "==", user.uid));
    const snap = await getDocs(q);

    const fixoExistente = snap.docs.find(d => 
        d.data().nome.toLowerCase() === nomeBusca
    );

    if (fixoExistente) {
        const dados = fixoExistente.data();
        document.getElementById("valor").value = dados.valor;
        document.getElementById("isFixa").checked = true; // Marca como fixo automaticamente
        
        document.getElementById("valor").style.backgroundColor = "#e8f5e9";
        setTimeout(() => document.getElementById("valor").style.backgroundColor = "", 1500);
        Toast.fire({ icon: 'info', title: `Gasto Fixo reconhecido!` });
    } else {
        const res = await Swal.fire({
            title: 'Tornar Gasto Fixo?',
            text: `Deseja registrar "${nomeOriginal}" como recorrente?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim'
        });
        if (res.isConfirmed) {
            document.getElementById("isFixa").checked = true;
        }
    }
};

window.prepararEdicaoModeloFixo = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "modelos_fixos", id));
        if (docSnap.exists()) {
            const dado = docSnap.data();
            
            // 1. Preenche os inputs específicos do menu de modelos fixos
            // Certifique-se de que os IDs abaixo batem com o seu HTML
            document.getElementById("fixoNome").value = dado.nome || "";
            document.getElementById("fixoValor").value = dado.valor || "";
            document.getElementById("fixoDia").value = dado.dia || "";

            // 2. Transforma o botão de "Cadastrar" em "Atualizar"
            // Use o ID ou classe do botão que fica dentro do menu de fixos
            const btnAcao = document.getElementById("btnSalvarModeloFixo");
            btnAcao.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Modelo';
            
            // 3. Marca o formulário com o ID de quem está sendo editado
            const form = document.getElementById("formCadastrarModeloFixo");
            form.setAttribute("data-id-edicao", id);

            // Rola para o topo do formulário para o usuário ver que preencheu
            form.scrollIntoView({ behavior: 'smooth' });

            Toast.fire({ icon: 'info', title: 'Editando: ' + dado.nome });
        }
    } catch (e) {
        window.logErroTelegram("prepararEdicaoModeloFixo", e.message);
    }
};

let instanciaEntradas = null;
let instanciaSaidas = null;
// Função Mestre para Renderizar qualquer gráfico de barras no sistema

window.renderizarGraficoGestto = (canvasId, label, labelsX, valores, corBase, corBorda) => {
    const ctx = document.getElementById(canvasId).getContext('2d');

    const chartExistente = Chart.getChart(canvasId);
    if (chartExistente) chartExistente.destroy();

    // 1. CAPTURA DINÂMICA DAS VARIÁVEIS CSS
    const estiloBody = getComputedStyle(document.body);
    const corTexto = estiloBody.getPropertyValue('--text').trim() || '#1f2937';
    // Criamos uma cor de grade que se adapta (clara no dark, escura no light)
    const isDark = document.body.classList.contains('dark-theme');
    const corGrade = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsX,
            datasets: [{
                label: label,
                data: valores,
                backgroundColor: corBase,
                borderColor: corBorda,
                borderWidth: 2,           
                borderRadius: 6,
                hoverBackgroundColor: corBorda
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: corTexto, // Texto do eixo X dinâmico
                        font: { family: "'Inter', sans-serif", size: 11, weight: '700' },
                        padding: 10,
                        maxRotation: 45, 
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { 
                        color: corGrade, // Linha horizontal dinâmica
                        drawBorder: false
                    },
                    ticks: { 
                        color: corTexto, // Valores do eixo Y dinâmicos
                        font: { size: 10, weight: '600' },
                        padding: 8
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#334155' : '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8,
                    displayColors: false,
                    padding: 12
                }
            }
        }
    });
};
// GRÁFICOS DE BARRAS POR CATEGORIA

window.atualizarGraficosBarras = async () => {
    const monthSelect = document.getElementById("monthSelect");
    if (!monthSelect) return;
    
    const mesAtual = monthSelect.value;
    const user = auth.currentUser;
    if (!user) return;

    try {
        const q = query(collection(db, "lancamentos"), 
            where("userId", "==", user.uid), 
            where("mes", "==", mesAtual)
        );
        const snap = await getDocs(q);

        let dadosEntradas = {};
        let dadosSaidas = {};

        snap.forEach(doc => {
            const item = doc.data();
            const valor = parseFloat(item.valor) || 0;
            const cat = item.categoria || "Geral";

            if (item.tipo === "entrada") {
                dadosEntradas[cat] = (dadosEntradas[cat] || 0) + valor;
            } else {
                dadosSaidas[cat] = (dadosSaidas[cat] || 0) + valor;
            }
        });

        // DEFINIÇÃO DE CORES (Ajustadas para contraste no Dark e Light)
        const cores = {
            entradaFundo: 'rgba(16, 185, 129, 0.2)', // Verde Suave (var --success)
            entradaBorda: '#10B981',                 
            saidaFundo: 'rgba(239, 68, 68, 0.2)',   // Vermelho Suave (var --danger)
            saidaBorda: '#EF4444'
        };

        // Renderiza ENTRADAS
        window.renderizarGraficoGestto(
            'graficoEntradas', 
            'Entradas R$', 
            Object.keys(dadosEntradas), 
            Object.values(dadosEntradas), 
            cores.entradaFundo,
            cores.entradaBorda
        );

        // Renderiza SAÍDAS
        window.renderizarGraficoGestto(
            'graficoSaidas', 
            'Saídas R$', 
            Object.keys(dadosSaidas), 
            Object.values(dadosSaidas), 
            cores.saidaFundo,
            cores.saidaBorda
        );

    } catch (e) {
        if(window.logErroTelegram) window.logErroTelegram("erro_grafico_categorias", e.message);
        console.error("Erro ao carregar gráficos:", e);
    }
};


// ANÁLISE DE PADRÕES PARA SUGESTÃO DE CATEGORIAS
window.analisarDescricoesParaCategorias = async () => {
    const user = auth.currentUser;
    if (!user) return;

    console.log("Iniciando análise de padrões...");
    const q = query(collection(db, "lancamentos"), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    
    let contagemPalavras = {};
    // Palavras que queremos ignorar (artigos, preposições, etc)
    const ignorar = ["DE", "DO", "DA", "E", "O", "A", "PARA", "COM", "EM", "UM", "UMA", "-", "PAGAMENTO", "RECEBIMENTO"];

    snap.forEach(doc => {
        const desc = doc.data().descricao.toUpperCase();
        const palavras = desc.split(" ");
        
        palavras.forEach(p => {
            if (p.length > 2 && !ignorar.includes(p)) {
                contagemPalavras[p] = (contagemPalavras[p] || 0) + 1;
            }
        });
    });

    // Transformar em array e ordenar pelas que mais aparecem
    const ranking = Object.entries(contagemPalavras)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Pega as 10 principais

    console.log("Sugestões de Categorias baseadas no seu uso:", ranking);
    return ranking;
};
// APLICA A CATEGORIA PARA O FUTURO E MIGRA O PASSADO
window.aplicarCategoriaPorPadrao = async (palavraChave, novaCategoria) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // 1. SALVAR A REGRA PARA O FUTURO
        // Criamos um ID único baseado na palavra para não duplicar regras
        const regraId = `${user.uid}_${palavraChave.toUpperCase()}`;
        await setDoc(doc(db, "regras_categorias", regraId), {
            uid: user.uid,
            palavra: palavraChave.toUpperCase(),
            categoria: novaCategoria
        });

        // Atualiza a memória local na hora
        regrasCategorias.push({ palavra: palavraChave.toUpperCase(), categoria: novaCategoria });

        // 2. MIGRAR O PASSADO (Seu código original com melhorias)
        const q = query(collection(db, "lancamentos"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        let contador = 0;

        const promessas = [];
        snap.forEach(docSnap => {
            const dados = docSnap.data();
            if (dados.descricao.toUpperCase().includes(palavraChave.toUpperCase())) {
                promessas.push(updateDoc(doc(db, "lancamentos", docSnap.id), {
                    categoria: novaCategoria
                }));
                contador++;
            }
        });

        await Promise.all(promessas);
        
        Swal.fire({
    title: 'Automação Ativada!',
    html: `
        <p style="font-size: 1.1em; color: #64748b;">
            <b>${contador}</b> itens antigos atualizados.
        </p>
        <p style="font-size: 0.9em; margin-top: 10px; color: #94a3b8;">
            Novos itens com "<b>${palavraChave}</b>" serão "<b>${novaCategoria}</b>" automaticamente.
        </p>
    `,
    icon: 'success',
    confirmButtonText: 'Entendido',
    confirmButtonColor: 'var(--success)', // Um verde esmeralda moderno
    borderRadius: '15px'           // Para combinar com seu novo design arredondado
});
        
        window.atualizarGraficosBarras();
    } catch (e) {
        window.logErroTelegram("aplicarCategoriaPorPadrao", e.message);
    }
};
// Função para gerar os botões de sugestão de categorias
window.gerarSugestoesCategorias = async () => {
    const listaContainer = document.getElementById('listaSugestoesIA');
    listaContainer.innerHTML = "<small>Analisando padrões...</small>";

    // 1. Pega o ranking das palavras que criamos antes
    const ranking = await window.analisarDescricoesParaCategorias();

    listaContainer.innerHTML = ""; // Limpa o carregando

    if (ranking.length === 0) {
        listaContainer.innerHTML = "<small>Nenhum dado encontrado para analisar.</small>";
        return;
    }

    // 2. Para cada palavra encontrada, cria um botão
    ranking.forEach(([palavra, contagem]) => {
        const btn = document.createElement('button');
        btn.innerHTML = `${palavra} <span style="font-size:10px; opacity:0.7;">(${contagem}x)</span>`;
        btn.style.cssText = "padding:5px 10px; border-radius:20px; border:1px solid #0ea5e9; background:white; color:#0369a1; cursor:pointer; font-size:12px; font-weight:600;";
        
        // 3. Ao clicar na palavra, ele abre a pergunta de migração
        btn.onclick = () => {
    Swal.fire({
        title: 'Criar Nova Categoria',
        text: `Deseja mapear todos os lançamentos que contêm "${palavra}" para uma categoria específica no gráfico?`,
        input: 'text',
        inputValue: palavra, // Já deixa a palavra sugerida no campo
        inputPlaceholder: 'Digite o nome da categoria...',
        showCancelButton: true,
        confirmButtonText: 'Aplicar Agora',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--success)',
        cancelButtonColor: 'var(--danger)',
        borderRadius: '15px',
        inputAttributes: {
            autocapitalize: 'off'
        },
        preConfirm: (valor) => {
            if (!valor) {
                Swal.showValidationMessage('Você precisa digitar um nome para a categoria!');
            }
            return valor;
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            // Chama sua função passando a palavra e a nova categoria digitada
            window.aplicarCategoriaPorPadrao(palavra, result.value);
            
            // Feedback de que a automação começou
            Swal.fire({
                title: 'Processando...',
                text: 'Estamos atualizando seus lançamentos.',
                icon: 'info',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};
        
        listaContainer.appendChild(btn);
    });
};
// Função para identificar a categoria de um lançamento baseado na descrição e nas regras salvas
window.identificarCategoriaPelaDescricao = (descricao) => {
    if (!descricao) return "Geral";
    const descUpper = descricao.toUpperCase().trim();
    
    // 1. VERIFICAÇÃO DINÂMICA: O nome digitado é um serviço salvo?
    if (listaServicosCache.includes(descUpper)) {
        return "Serviços";
    }

    // 2. VERIFICAÇÃO ESTÁTICA: Regras de palavras-chave (Aluguel, Luz, etc)
    const regraEncontrada = regrasCategorias.find(regra => descUpper.includes(regra.palavra.toUpperCase()));
    
    return regraEncontrada ? regraEncontrada.categoria : "Geral";
};
// Funções para alternar as telas
window.mostrarCadastro = () => {
    document.getElementById("formLogin").style.display = "none";
    document.getElementById("formCadastro").style.display = "block";
    document.getElementById("authSubtitle").innerText = "Crie sua conta gratuita";
};
// E a função de mostrar login, que pode ser chamada após o cadastro ou quando o usuário clicar em "Já tem conta?"
window.mostrarLogin = () => {
    document.getElementById("formLogin").style.display = "block";
    document.getElementById("formCadastro").style.display = "none";
    document.getElementById("authSubtitle").innerText = "Gestão simples para o seu negócio";
};
// Certifique-se de que o botão de registrar chame a função (se você já tiver uma de criar conta)
document.getElementById("btnRegistrar")?.addEventListener("click", () => {
    // Aqui viria sua função de Firebase createUserWithEmailAndPassword
    console.log("Iniciando criação de conta...");
});
// --- LÓGICA DE INSTALAÇÃO COMO PWA ---
let deferredPrompt;
const btnInstalar = document.getElementById('btnInstalarApp');
// Escuta o evento de instalação do navegador
window.addEventListener('beforeinstallprompt', (e) => {
    // Impede que o navegador mostre o banner padrão feio
    e.preventDefault();
    // Guarda o evento para usar depois
    deferredPrompt = e;
    // Mostra o seu botão personalizado
    if (btnInstalar) btnInstalar.style.display = 'block';
});

// Lógica ao clicar no seu botão
btnInstalar?.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Mostra o prompt de instalação
        deferredPrompt.prompt();
        // Espera a resposta do usuário
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário escolheu: ${outcome}`);
        // Limpa o prompt
        deferredPrompt = null;
        // Esconde o botão após a escolha
        btnInstalar.style.display = 'none';
    }
});

// Esconde o botão se o app já estiver instalado
window.addEventListener('appinstalled', () => {
    console.log('Gestto instalado com sucesso!');
    if (btnInstalar) btnInstalar.style.display = 'none';
});
// Dica para usuários de iOS, que não suportam o evento beforeinstallprompt e precisam usar o menu de compartilhamento do Safari para instalar
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

if (isIOS && !isStandalone) {
    // Aqui você pode mostrar uma mensagem pequena: 
    // "Para instalar, clique no ícone de compartilhar e 'Adicionar à Tela de Início'"
    console.log("Dica: No iPhone, instale via menu de compartilhamento do Safari.");
}
// --- FIM DAS LÓGICAS DE PWA ---
window.toggleEdicao = () => {
    const secao = document.getElementById("secaoEdicao");
    secao.classList.toggle("aberto");
    
    // Opcional: Rotacionar o ícone de seta (se você quiser dar um toque extra)
    const seta = document.querySelector(".fa-chevron-down");
    if (secao.classList.contains("aberto")) {
        seta.style.transform = "rotate(180deg)";
    } else {
        seta.style.transform = "rotate(0deg)";
    }
};

window.verNovidades = async () => {
    try {
        // Agora buscamos do documento 'logs' que criamos separado
        const docRef = doc(db, "configuracoes", "logs");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const { logCompleto } = docSnap.data();

            Swal.fire({
                title: 'Histórico de Atualizações',
                html: `
                    <div style="text-align: left; background: #f9f9f9; padding: 15px; border-radius: 10px; font-size: 13px; max-height: 300px; overflow-y: auto; border: 1px solid #eee; line-height: 1.6;">
                        <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Inter', sans-serif; margin: 0; color: #333;">${logCompleto || "Nenhum histórico disponível."}</pre>
                    </div>
                `,
                confirmButtonText: 'Fechar',
                confirmButtonColor: '#20B2AA'
            });
        }
    } catch (e) {
        console.error("Erro ao carregar logs:", e);
    }
};

window.mostrarSobre = async () => {
    // 1. Puxa os dados dos dois documentos (Sincronia)
    const versaoLocal = (localStorage.getItem('app_version') || "1.0.0").trim();
    
    try {
        const docRef = doc(db, "configuracoes", "sistema");
        const docSnap = await getDoc(docRef);
        const logHistorico = docSnap.exists() ? docSnap.data().logCompleto : "Carregando histórico...";

        Swal.fire({
            title: 'Sobre o Gestto',
            html: `
                <div style="text-align: left; font-family: 'Inter', sans-serif; color: var(--background); background:var(--sucess)">
                    <p style="font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                        O <strong>Gestto</strong> é um ecossistema financeiro inteligente projetado para quem busca agilidade. 
                        Gerencie entradas, saídas e clientes em uma interface PWA de alta performance.
                    </p>
                    
                    <div style="font-size: 12px; color:; margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span><i class="fa-solid fa-code-branch"></i> Versão: ${versaoLocal}</span>
                        <span><i class="fa-solid fa-check-double"></i> Status: Online</span>
                    </div>

                    <div class="log-container-window">
                        <div class="log-header">
                            <span><i class="fa-solid fa-terminal"></i> Histórico de Sistema</span>
                        </div>
                        <div class="log-content">
                            <pre>${logHistorico}</pre>
                        </div>
                    </div>
                </div>
            `,
            confirmButtonText: 'Fechar',
            confirmButtonColor: 'var(--success)',
            width: '90%' // Ajuste para ocupar bem a tela do celular
        });
    } catch (e) {
        console.error("Erro ao abrir Sobre:", e);
    }
};

window.limparMeusDadosAntigos = async () => {
    // 1. Confirmação de segurança para não clicar sem querer
    const confirmacao = await Swal.fire({
        title: 'Tem certeza?',
        text: "Isso apagará TODOS os seus lançamentos. Os dados do testador beta não serão afetados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger)',
        cancelButtonColor: 'var(--success)',
        confirmButtonText: 'Sim, apagar tudo!',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacao.isConfirmed) return;

    const uid = auth.currentUser.uid; // Pega o seu ID atual
    console.log("Iniciando limpeza para o UID:", uid);

    try {
        // 2. Busca todos os documentos onde o userId é o SEU
        const q = query(collection(db, "lancamentos"), where("userId", "==", uid));
        const snap = await getDocs(q);

        if (snap.empty) {
            return Swal.fire('Vazio', 'Você não tem dados para apagar.', 'info');
        }

        // 3. Deleta um por um
        const promessasDelecao = snap.docs.map(docSnap => deleteDoc(doc(db, "lancamentos", docSnap.id)));
        
        await Promise.all(promessasDelecao);

        Swal.fire('Limpeza Concluída', `${snap.size} registros foram removidos.`, 'success');
        
        // 4. Atualiza a tela
        if (window.carregarLancamentos) window.carregarLancamentos();

    } catch (e) {
        console.error("Erro na limpeza:", e);
        Swal.fire('Erro', 'Falha ao apagar dados.', 'error');
    }
};