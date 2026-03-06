import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

let regrasCategorias = []; 
let promptInstalacao;

// --- SUPER LOG TELEGRAM ---
window.logErroTelegram = async (local, erro) => {
    const TOKEN = "8735026345:AAGLIG0AGlP5CfaFVEGuGb0cVU0IyUCbPNo";
    const CHAT_ID = "8125669194";
    let infoUsuario = auth.currentUser ? auth.currentUser.email : "Não logado";

    const mensagemHTML = `<b>🔴 ERRO NO SISTEMA</b>\n<b>📍 Local:</b> ${local}\n<b>❌ Erro:</b> ${erro}\n<b>👤 Usuário:</b> ${infoUsuario}`;

    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, text: mensagemHTML, parse_mode: "HTML" })
        });
    } catch (e) { console.error("Falha ao enviar log:", e); }
};

// --- CONTROLO DO APP & AUTH ---
onAuthStateChanged(auth, async (user) => {
    if (user) { 
        document.getElementById("auth").style.display = "none"; 
        document.getElementById("app").style.display = "block"; 
        configurarMeses(); 
        carregarLancamentos(); 
        window.atualizarDatalistServicos();

        try {
            // CORREÇÃO DO ERRO snapRegras
            const qRegras = query(collection(db, "regras_categorias"), where("uid", "==", user.uid));
            const snapRegras = await getDocs(qRegras);
            regrasCategorias = snapRegras.docs.map(d => d.data());
        } catch (e) { console.error("Erro regras:", e); }

    } else { 
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none"; 
    }
});

// --- FUNÇÕES DE LOGIN E CADASTRO (CORRIGIDAS E SEPARADAS) ---

// Login
document.getElementById("btnLogin").onclick = () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    signInWithEmailAndPassword(auth, email, pass)
    .catch(e => {
        alert("Erro no login: " + e.message);
        window.logErroTelegram("Login", e.message);
    });
};

// Cadastro
const btnRegistrar = document.getElementById("btnRegistrar");
if (btnRegistrar) {
    btnRegistrar.onclick = async () => {
        const nome = document.getElementById("cadNome").value;
        const email = document.getElementById("cadEmail").value;
        const senha = document.getElementById("cadSenha").value;

        if (!email || !senha || !nome) return alert("Preencha todos os campos!");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            await setDoc(doc(db, "usuarios", userCredential.user.uid), {
                nome, email, createdAt: new Date()
            });
            alert("Conta criada com sucesso!");
            location.reload(); 
        } catch (e) {
            alert("Erro: " + e.message);
            window.logErroTelegram("Cadastro", e.message);
        }
    };
}

// --- NAVEGAÇÃO E MODAIS ---
function configurarMeses() {
    const select = document.getElementById("monthSelect");
    if(select && select.options.length === 0) {
        months.forEach(m => { let opt = document.createElement("option"); opt.value = m; opt.textContent = m; select.appendChild(opt); });
        select.value = months[new Date().getMonth()];
        select.onchange = carregarLancamentos;
    }
}

window.navegar = (pagina) => {
    document.getElementById("tela-lancamentos").style.display = pagina === 'home' ? 'block' : 'none';
    document.getElementById("perfilSection").style.display = pagina === 'perfil' ? 'block' : 'none';
    if(pagina === 'perfil') window.carregarDadosPerfil();
};

window.abrirModalNovo = () => {
    document.getElementById("modalNovo").style.display = "flex";
    document.getElementById("data").value = new Date().toISOString().split('T')[0];
};
window.fecharModalNovo = () => document.getElementById("modalNovo").style.display = "none";

// --- CRUD LANÇAMENTOS ---
window.carregarLancamentos = async () => {
    if (!auth.currentUser) return;
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
                <div class="info" onclick="window.prepararEdicao('${d.id}')">
                    <span class="title">${item.descricao}</span>
                    <span class="category">${item.cliente || '-'}</span>
                </div>
                <div class="right">
                    <span class="amount">R$ ${v.toFixed(2)}</span>
                    <span class="badge ${item.status === "Pago" ? "paid" : "pending"}">${item.status}</span>
                </div>
                <button onclick="window.deletar('${d.id}')" style="color:red; opacity:0.3; border:none; background:none;"><i class="fa-solid fa-trash"></i></button>
            </div>`;
            if (item.tipo === "entrada") { tE += v; eBody.innerHTML += card; } else { tS += v; sBody.innerHTML += card; }
        });
        document.getElementById("totalEntrada").innerText = tE.toFixed(2);
        document.getElementById("totalSaida").innerText = tS.toFixed(2);
        document.getElementById("lucro").innerText = (tE - tS).toFixed(2);
        window.atualizarGraficosBarras();
    } catch (e) { window.logErroTelegram("carregarLancamentos", e.message); }
};

window.addLancamento = async () => {
    const descricao = document.getElementById("descricao").value;
    const valor = parseFloat(document.getElementById("valor").value) || 0;
    const data = document.getElementById("data").value;
    const tipo = document.getElementById("tipo").value;
    const mes = document.getElementById("monthSelect").value;

    if (!descricao || !valor) return alert("Preencha os dados!");

    try {
        await addDoc(collection(db, "lancamentos"), {
            userId: auth.currentUser.uid,
            descricao, valor, data, tipo, mes, status: "Pago"
        });
        window.fecharModalNovo();
        window.carregarLancamentos();
    } catch (e) { window.logErroTelegram("addLancamento", e.message); }
};

// --- RESTANTE DAS FUNÇÕES (PERFIL, PWA, ETC) ---
window.logout = () => signOut(auth);

window.carregarDadosPerfil = async () => {
    const d = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
    if(d.exists()) {
        const dados = d.data();
        document.getElementById("perfilEmail").innerText = auth.currentUser.email;
        document.getElementById("perfilNomeExibicao").innerText = dados.nome || "Usuário";
    }
};

// PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/Gestto-mobile/service-worker.js', { scope: '/Gestto-mobile/' });
    });
}
