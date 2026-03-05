import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7ugVILO8olKtzkCJI_7BRlzY6Qe0-rCM",
    authDomain: "gst-financeira.firebaseapp.com",
    projectId: "gst-financeira"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

let promptInstalacao;

// --- SUPER LOG TELEGRAM (SUPORTE TÉCNICO) ---
window.logErroTelegram = async (local, erro) => {
    const TOKEN = "8735026345:AAGLIG0AGlP5CfaFVEGuGb0cVU0IyUCbPNo";
    const CHAT_ID = "8125669194";
    
    let infoUsuario = "Não logado";
    let infoEmpresa = "N/A";

    if (auth.currentUser) {
        try {
            const userSnap = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
            if (userSnap.exists()) {
                const d = userSnap.data();
                infoUsuario = `${d.nome || 'Sem Nome'} (${auth.currentUser.email})`;
                infoEmpresa = d.empresa || "Não informada";
            } else {
                infoUsuario = auth.currentUser.email;
            }
        } catch (e) {
            infoUsuario = auth.currentUser.email + " (Erro ao buscar perfil)";
        }
    }

    const mensagemHTML = `
<b>🔴 ERRO CRÍTICO NO SISTEMA</b>
_______________________________
<b>📍 Local:</b> ${local}
<b>❌ Erro:</b> ${erro}

<b>👤 Usuário:</b> ${infoUsuario}
<b>🏢 Empresa:</b> ${infoEmpresa}
<b>📱 Device:</b> ${navigator.userAgent.slice(0, 60)}
_______________________________
    `;

    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, text: mensagemHTML, parse_mode: "HTML" })
        });
    } catch (e) { console.error("Falha ao enviar log:", e); }
};

// --- CONTROLO DO APP & AUTH ---
onAuthStateChanged(auth, user => {
    if (user) { 
        document.getElementById("auth").style.display = "none"; 
        document.getElementById("app").style.display = "block"; 
        configurarMeses(); 
        carregarLancamentos(); 
    } else { 
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none"; 
    }
});

function configurarMeses() {
    const select = document.getElementById("monthSelect");
    if(select && select.options.length === 0) {
        months.forEach(m => { let opt = document.createElement("option"); opt.value = m; opt.textContent = m; select.appendChild(opt); });
        select.value = months[new Date().getMonth()];
        select.onchange = carregarLancamentos;
    }
}

// --- NAVEGAÇÃO ---
window.navegar = (pagina) => {
    document.getElementById("tela-lancamentos").style.display = pagina === 'home' ? 'block' : 'none';
    document.getElementById("perfilSection").style.display = pagina === 'perfil' ? 'block' : 'none';
    document.getElementById("nav-home").classList.toggle("active", pagina === 'home');
    document.getElementById("btnConfiguracoes").classList.toggle("active", pagina === 'perfil');
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
};

window.setTipo = (t) => {
    document.getElementById("tipo").value = t;
    document.getElementById("btnTipoE").classList.toggle("active", t === 'entrada');
    document.getElementById("btnTipoS").classList.toggle("active", t === 'saida');
};

window.addLancamento = async () => {
    const descricao = document.getElementById("descricao").value;
    const valor = parseFloat(document.getElementById("valor").value) || 0;
    const dataBase = document.getElementById("data").value;
    const cliente = document.getElementById("cliente").value;
    const tipo = document.getElementById("tipo").value;
    const mesSelecionado = document.getElementById("monthSelect").value;
    const isFixa = document.getElementById("isFixa").checked;

    if (!descricao || !valor || !dataBase) return alert("Preencha Descrição, Valor e Data.");

    try {
        const novo = { userId: auth.currentUser.uid, descricao, valor, data: dataBase, cliente, tipo, isFixa, mes: mesSelecionado, status: "Pago" };
        await addDoc(collection(db, "lancamentos"), novo);

        if (isFixa) {
            let indice = months.indexOf(mesSelecionado);
            for (let i = indice + 1; i < months.length; i++) {
                await addDoc(collection(db, "lancamentos"), { ...novo, mes: months[i] });
            }
        }
        
        // Limpar e fechar
        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";
        document.getElementById("cliente").value = "";
        window.fecharModalNovo();
        window.carregarLancamentos();
        alert("Lançamento guardado!");
    } catch (e) { window.logErroTelegram("addLancamento", e.message); }
};

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

window.fecharModal = () => document.getElementById("editModal").style.display = "none";
window.deletar = async (id) => { if(confirm("Eliminar este registo?")) { await deleteDoc(doc(db, "lancamentos", id)); window.carregarLancamentos(); } };

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
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
        .then(() => console.log("SW ok"))
        .catch(err => console.log("SW erro", err));
}

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptInstalacao = e;
    const banner = document.getElementById("installBanner");
    if (banner) banner.style.display = "block";
});

window.instalarPWA = async () => {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    const { outcome } = await promptInstalacao.userChoice;
    if (outcome === "accepted") document.getElementById("installBanner").style.display = "none";
    promptInstalacao = null;
};

// --- UTILITÁRIOS ---
window.logout = () => signOut(auth);
window.toggleSecao = (id, header) => { 
    document.getElementById(id).classList.toggle('hidden'); 
    header.classList.toggle('closed'); 
};

// Eventos de Botões (Login / Cadastro)
document.getElementById("btnLogin").onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value)
    .catch(e => window.logErroTelegram("Login", e.message));
};

// Abrir Modal de Perfil
window.abrirModalPerfil = () => {
    const modal = document.getElementById("modalPerfil");
    if (modal) {
        modal.style.display = "flex";
        window.carregarDadosPerfil(); // Busca dados atualizados do Firebase
    }
};

window.fecharModalPerfil = () => {
    const modal = document.getElementById("modalPerfil");
    if (modal) modal.style.display = "none";
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

    if (!nome || !empresa) return alert("Por favor, preencha Nome e Empresa.");

    try {
        const dados = {
            nome: nome,
            empresa: empresa,
            contato: contato,
            email: auth.currentUser.email,
            ultimaAtualizacao: new Date()
        };

        await setDoc(doc(db, "usuarios", auth.currentUser.uid), dados, { merge: true });
        
        alert("Perfil atualizado!");
        
        // Atualiza a interface sem precisar recarregar a página
        if (document.getElementById("perfilNomeExibicao")) {
            document.getElementById("perfilNomeExibicao").innerText = nome;
        }
        
        window.fecharModalPerfil();
    } catch (e) {
        window.logErroTelegram("salvarDadosPerfil", e.message);
        alert("Erro ao salvar. O suporte foi avisado.");
    }
};