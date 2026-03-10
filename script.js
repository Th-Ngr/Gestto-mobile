//

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"; 
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        // Configuração do Firebase //
const firebaseConfig = {
    apiKey: "AIzaSyB7ugVILO8olKtzkCJI_7BRlzY6Qe0-rCM",
    authDomain: "gst-financeira.firebaseapp.com",
    projectId: "gst-financeira"
};

// --- SERVICE WORKER (PWA) ---

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
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
    
    console.log("✅ Modal de novidades fechado pelo usuário.");
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
    // CORREÇÃO: Verificação de null para evitar erros de referência///
    if (user) { 
        document.getElementById("auth").style.display = "none"; 
        document.getElementById("app").style.display = "block"; 
        configurarMeses(); 
        carregarLancamentos(); 

        const inputDesc = document.getElementById("descricao");
        if (inputDesc) {
            // Removemos listeners antigos para não duplicar chamadas
            inputDesc.replaceWith(inputDesc.cloneNode(true)); 
            const novoInputDesc = document.getElementById("descricao");
            
            novoInputDesc.addEventListener("blur", async (e) => {
                const termo = e.target.value.trim();
                const tipo = document.getElementById("tipo").value;
                
                if (termo.length < 3) return; // Só busca se tiver mais de 2 letras

                if (tipo === "entrada") {
                    await window.verificarServicoInteligente(termo);
                } else {
                    await window.verificarGastoFixoInteligente(termo);
                }
            });
        }
    

        try {
            // CORREÇÃO: Criando a variável snapRegras que estava faltando
            const qRegras = query(collection(db, "regras_categorias"), where("uid", "==", user.uid));
            const snapRegras = await getDocs(qRegras); // Agora ela está definida!
            regrasCategorias = snapRegras.docs.map(d => d.data());
        } catch (e) {
            console.error("Erro ao carregar regras:", e);
        }
    } else { 
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none"; 
    }
});
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
window.navegar = (pagina) => {
    // Controla as telas
    document.getElementById("tela-lancamentos").style.display = pagina === 'home' ? 'block' : 'none';
    document.getElementById("perfilSection").style.display = pagina === 'perfil' ? 'block' : 'none';
    
    // Controla as classes ativas na Navbar
    document.getElementById("nav-home").classList.toggle("active", pagina === 'home');
    document.getElementById("btnConfiguracoes").classList.toggle("active", pagina === 'perfil');

    // --- NOVA LÓGICA DA ENGRENAGEM ---
    const engrenagem = document.getElementById("btn-settings");
    if (engrenagem) {
        if (pagina === 'perfil') {
            engrenagem.style.display = "flex";
            // Remove a classe e adiciona de novo para reiniciar a animação
            engrenagem.classList.remove("animacao-redemoinho");
            void engrenagem.offsetWidth; // Truque para "resetar" o elemento no navegador
            engrenagem.classList.add("animacao-redemoinho");
        } else {
            engrenagem.style.display = "none";
            engrenagem.classList.remove("animacao-redemoinho");
        }
    }

    if(pagina === 'perfil') window.carregarDadosPerfil();
};
// --- MODAL DE NOVO LANÇAMENTO (POP-UP) ---
window.abrirModalNovo = () => {
    document.getElementById("modalNovo").style.display = "flex";
    document.getElementById("data").value = new Date().toISOString().split('T')[0];
};
window.fecharModalNovo = () => {
    document.getElementById("modalNovo").style.display = "none";
};
// --- CRUD LANÇAMENTOS ---
window.carregarLancamentos = async () => {
    
    try {
        
        const mes = document.getElementById("monthSelect").value;
        const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid), where("mes", "==", mes));
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
                <button onclick="window.deletar('${d.id}')" style="margin-left:10px; border:none; background:none; color:red; opacity:0.3;"><i class="fa-solid fa-trash"></i></button>
            </div>`;
            if (item.tipo === "entrada") { tE += v; eBody.innerHTML += card; } else { tS += v; sBody.innerHTML += card; }
        });
        document.getElementById("totalEntrada").innerText = tE.toFixed(2);
        document.getElementById("totalSaida").innerText = tS.toFixed(2);
        document.getElementById("lucro").innerText = (tE - tS).toFixed(2);
    } catch (e) { window.logErroTelegram("carregarLancamentos", e.message); }

    window.atualizarGraficosBarras();

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
// --- FUNÇÕES DE LANÇAMENTOS ---
window.addLancamento = async () => {
    const descricao = document.getElementById("descricao").value;
    const valorInput = document.getElementById("valor").value;
    const valor = parseFloat(valorInput) || 0;
    const dataBase = document.getElementById("data").value;
    const cliente = document.getElementById("cliente").value;
    const tipo = document.getElementById("tipo").value;
    const mesSelecionado = document.getElementById("monthSelect").value;
    const isFixa = document.getElementById("isFixa").checked;

    if (!descricao || !valor || !dataBase) {
        return Swal.fire('Atenção', 'Preencha Descrição, Valor e Data.', 'warning');
    }

    try {
        const uid = auth.currentUser.uid;
        // IDENTIFICAÇÃO DA CATEGORIA (Resolve o erro do gráfico)
        const categoriaIdentificada = window.identificarCategoriaPelaDescricao(descricao);

        const novo = { 
            userId: uid, 
            descricao, 
            valor, 
            data: dataBase, 
            cliente, 
            tipo, 
            isFixa, 
            mes: mesSelecionado, 
            status: "Pago",
            categoria: categoriaIdentificada 
        };
        
        await addDoc(collection(db, "lancamentos"), novo);

        if (isFixa) {
    await addDoc(collection(db, "modelos_fixos"), {
        uid: uid, // Use 'uid' para manter o padrão da busca inteligente
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
        
        window.fecharModalNovo();
        window.carregarLancamentos();
        
        // FEEDBACK COM TOAST
        Toast.fire({
            icon: 'success',
            title: isFixa ? 'Lançamento Fixo Replicado!' : 'Salvo com sucesso!'
        });

    } catch (e) { 
        window.logErroTelegram("addLancamento", e.message); 
        Swal.fire('Erro', 'Falha ao guardar registro.', 'error');
    }
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
    const nome = document.getElementById("editNome").value;
    const empresa = document.getElementById("editEmpresa").value;
    const contato = document.getElementById("editContato").value;
    if (!nome || !empresa) return alert("Preencha Nome e Empresa!");
    try {
        await setDoc(doc(db, "usuarios", auth.currentUser.uid), { nome, empresa, contato, email: auth.currentUser.email }, { merge: true });
        alert("Perfil atualizado!"); 
        window.carregarDadosPerfil();
    } catch (e) { window.logErroTelegram("salvarDadosPerfil", e.message); }
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
                    // 1. LÓGICA DE LOGIN
// Substitua o seubtnLogin.onclick por este:
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
            confirmButtonColor: '#d33'
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

            alert("Conta criada com sucesso!");
            
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
            // Abrir Modal de Perfil
// --- CONTROLE DA INTERFACE ---
window.abrirModalPerfil = async () => {
    // Busca dados atuais do usuário
    const snap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById("editNome").value = d.nome || "";
        document.getElementById("editEmpresa").value = d.empresa || "";
        document.getElementById("editContato").value = d.contato || "";
        document.getElementById("displayEmail").innerText = auth.currentUser.email;
    }
    
    // Mostra o Drawer e o Overlay
    document.getElementById("drawerPerfil").classList.add("active");
    document.getElementById("overlay").style.display = "block";
};
// Fechar Modal de Perfil
window.fecharDrawer = () => {
    document.getElementById("drawerPerfil").classList.remove("active");
    document.getElementById("overlay").style.display = "none";
};
        // --- NOVAS FUNÇÕES DE APOIO --- //

// Função para abrir o tutorial de uso do aplicativo
window.abrirTutorial = () => {
    Swal.fire({
        title: '📖 Como usar o Gestto',
        html: `
            <div style="text-align: left; font-size: 14px;">
                <p><b>1. Lançamentos:</b> Registre suas entradas e saídas diárias.</p>
                <p><b>2. Gastos Fixos:</b> Marque "Fixo" para que o sistema repita o gasto nos meses seguintes automaticamente.</p>
                <p><b>3. Categorias:</b> O sistema classifica seus gastos pela descrição (ex: "Aluguel" vai para moradia).</p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Entendi!'
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

        // 1. Atualiza o email na tela imediatamente
        const campoEmail = document.getElementById("perfilEmail");
        if (campoEmail) campoEmail.innerText = auth.currentUser.email;

        // 2. Busca dados extras no Firestore
        const userSnap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        
        if (userSnap.exists()) {
            const d = userSnap.data();
            
            // Atualiza os inputs do formulário
            if (document.getElementById("editNome")) document.getElementById("editNome").value = d.nome || "";
            if (document.getElementById("editEmpresa")) document.getElementById("editEmpresa").value = d.empresa || "";
            if (document.getElementById("editContato")) document.getElementById("editContato").value = d.contato || "";
            
            // Atualiza o nome de exibição no topo do modal
            if (document.getElementById("perfilNomeExibicao")) {
                document.getElementById("perfilNomeExibicao").innerText = d.nome || "Usuário";
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

    // 1. Validação Visual com SweetAlert
    if (!nome || !empresa) {
        return Swal.fire({
            icon: 'warning',
            title: 'Campos Obrigatórios',
            text: 'Por favor, preencha o Nome e a Empresa.',
            confirmButtonColor: 'var(--primary)'
        });
    }

    // 2. Mostrar estado de "Carregando"
    Swal.fire({
        title: 'A guardar alterações...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado.");

        // 3. Gravação no Firestore
        await setDoc(doc(db, "usuarios", user.uid), {
            nome: nome,
            empresa: empresa,
            contato: contato,
            email: user.email,
            ultimaAtualizacao: new Date().toISOString()
        }, { merge: true });

        // 4. Sucesso: Fecha o carregando e mostra o Toast
        Swal.close();
        
        // Fecha o acordeão e o menu lateral
        if(document.getElementById("secaoEdicao")) {
            document.getElementById("secaoEdicao").classList.remove("aberto");
        }
        window.fecharDrawer();

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });

        Toast.fire({
            icon: 'success',
            title: 'Perfil atualizado com sucesso!'
        });

    } catch (error) {
        // 5. Erro: Log no Telegram e aviso visual
        window.logErroTelegram("Salvar_Perfil", error.message);
        
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Salvar',
            text: 'Não foi possível atualizar o perfil. O erro foi enviado ao suporte.',
            confirmButtonColor: '#d33'
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
};

// Salvar Modelo
document.getElementById('formCadastrarModeloFixo').onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
        const novoModelo = {
            uid: user.uid,
            nome: document.getElementById('fixoNome').value,
            valor: parseFloat(document.getElementById('fixoValor').value),
            dia: parseInt(document.getElementById('fixoDia').value),
            dataCriacao: new Date()
        };

        await addDoc(collection(db, "modelos_fixos"), novoModelo);
        document.getElementById('formCadastrarModeloFixo').reset();
        await window.carregarModelosFixos();
    } catch (e) {
        window.logErroTelegram("salvarModeloFixo", e.message);
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
        <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid #efefef;">
            <div style="line-height: 1.2; flex: 1;">
                <strong style="font-size: 14px;">${item.nome}</strong><br>
                <small style="color: #64748b;">Dia ${item.dia} • R$ ${item.valor.toFixed(2)}</small>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.lancarModeloNoMes('${item.nome}', ${item.valor}, ${item.dia})" style="background: #e8f5e9; border: none; color: #2e7d32; padding: 8px; border-radius: 5px; cursor: pointer;">
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
window.lancarModeloNoMes = async (nome, valor, dia) => {
    const user = auth.currentUser;
    const mesSelecionado = document.getElementById("monthSelect").value;
    if (!user) return;

    // Descobrimos o índice do mês atual para saber quantos meses restam no ano
    const indiceMesInicial = months.indexOf(mesSelecionado);
    const anoAtual = new Date().getFullYear();

    try {
        // Criamos o objeto base do lançamento
        const novoDocBase = {
            userId: user.uid,
            descricao: nome,
            valor: valor,
            cliente: "Fixo Cadastrado",
            tipo: "saida",
            status: "Pago",
            isFixa: true,
            // Geramos a data padrão baseada no dia do modelo e no mês selecionado
            data: `${anoAtual}-${String(indiceMesInicial + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        };

        // Loop para lançar no mês selecionado e nos consecutivos (igual ao seu modal principal)
        for (let i = indiceMesInicial; i < months.length; i++) {
            await addDoc(collection(db, "lancamentos"), { 
                ...novoDocBase, 
                mes: months[i],
                // Ajusta a string de data para cada mês do loop
                data: `${anoAtual}-${String(i + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
            });
        }

        alert(`${nome} lançado com sucesso de ${mesSelecionado} até Dezembro!`);
        window.fecharGerenciadorFixos();
        window.carregarLancamentos(); // Atualiza a tela
    } catch (e) {
        window.logErroTelegram("lancarModeloNoMes_Replicado", e.message);
        alert("Erro ao lançar. O suporte foi avisado.");
    }
};

// --- GESTÃO DE SERVIÇOS ---
window.abrirGerenciadorServicos = () => {
    document.getElementById('modalGerenciadorServicos').style.display = 'flex';
    window.carregarServicos();
};

window.fecharGerenciadorServicos = () => {
    document.getElementById('modalGerenciadorServicos').style.display = 'none';
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
    const q = query(collection(db, "servicos"), where("uid", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    
    container.innerHTML = '';
    snap.forEach(d => {
        const s = d.data();
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <span>${s.nome} - <b>R$ ${s.valor.toFixed(2)}</b></span>
                <button onclick="window.excluirServico('${d.id}')" style="border:none; background:none; color:red;"><i class="fa-solid fa-trash"></i></button>
            </div>`;
    });
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

let instanciaEntradas = null;
let instanciaSaidas = null;

// GRÁFICOS DE BARRAS POR CATEGORIA
window.atualizarGraficosBarras = async () => {
    const mesAtual = document.getElementById("monthSelect").value;
    const user = auth.currentUser;
    if (!user) return;

    try {
        const q = query(collection(db, "lancamentos"), where("userId", "==", user.uid), where("mes", "==", mesAtual));
        const snap = await getDocs(q);

        // Objetos para agrupar por categoria
        let dadosEntradas = {};
        let dadosSaidas = {};

        snap.forEach(doc => {
            const item = doc.data();
            const valor = parseFloat(item.valor) || 0;
            const cat = item.categoria || "Geral"; // Se não tiver categoria, agrupa no "Geral"

            if (item.tipo === "entrada") {
                dadosEntradas[cat] = (dadosEntradas[cat] || 0) + valor;
            } else {
                dadosSaidas[cat] = (dadosSaidas[cat] || 0) + valor;
            }
        });

        // --- GRÁFICO DE ENTRADAS ---
        const ctxEntrada = document.getElementById('graficoEntradas').getContext('2d');
        if (instanciaEntradas) instanciaEntradas.destroy();
        instanciaEntradas = new Chart(ctxEntrada, {
            type: 'bar',
            data: {
                labels: Object.keys(dadosEntradas), // As categorias aparecem aqui
                datasets: [{
                    label: 'Entradas por Categoria',
                    data: Object.values(dadosEntradas),
                    backgroundColor: '#22c55e',
                    borderRadius: 8
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        // --- GRÁFICO DE SAÍDAS ---
        const ctxSaida = document.getElementById('graficoSaidas').getContext('2d');
        if (instanciaSaidas) instanciaSaidas.destroy();
        instanciaSaidas = new Chart(ctxSaida, {
            type: 'bar',
            data: {
                labels: Object.keys(dadosSaidas), // As categorias aparecem aqui
                datasets: [{
                    label: 'Saídas por Categoria',
                    data: Object.values(dadosSaidas),
                    backgroundColor: '#ef4444',
                    borderRadius: 8
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

    } catch (e) {
        window.logErroTelegram("erro_grafico_categorias", e.message);
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
        
        alert(`Automação Ativada!\n${contador} itens antigos atualizados.\nNovos itens com "${palavraChave}" serão "${novaCategoria}" automaticamente.`);
        
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
            const novaCat = prompt(`Deseja criar a categoria "${palavra}" no gráfico para todos os lançamentos que contêm essa palavra?`, palavra);
            if (novaCat) {
                window.aplicarCategoriaPorPadrao(palavra, novaCat);
            }
        };
        
        listaContainer.appendChild(btn);
    });
};
// Função para identificar a categoria de um lançamento baseado na descrição e nas regras salvas
window.identificarCategoriaPelaDescricao = (descricao) => {
    if (!descricao) return "Geral";
    const descUpper = descricao.toUpperCase();
    
    // Procura nas regras salvas se alguma palavra-chave está na descrição
    const regraEncontrada = regrasCategorias.find(regra => descUpper.includes(regra.palavra));
    
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
                <div style="text-align: left; font-family: 'Inter', sans-serif; color: #333;">
                    <p style="font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                        O <strong>Gestto</strong> é um ecossistema financeiro inteligente projetado para quem busca agilidade. 
                        Gerencie entradas, saídas e clientes em uma interface PWA de alta performance.
                    </p>
                    
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px; display: flex; justify-content: space-between;">
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
            confirmButtonColor: '#20B2AA',
            width: '90%' // Ajuste para ocupar bem a tela do celular
        });
    } catch (e) {
        console.error("Erro ao abrir Sobre:", e);
    }
};


