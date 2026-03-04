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

// --- SISTEMA DE LOG TELEGRAM ---
window.logErroTelegram = async (local, erro) => {
    const TOKEN = "8735026345:AAGLIG0AGlP5CfaFVEGuGb0cVU0IyUCbPNo";
    const CHAT_ID = "8125669194";
    
    // Pega o e-mail do usuário se estiver logado
    const usuario = auth?.currentUser?.email || "Deslogado";
    
    // Pega informações simplificadas do aparelho (ex: iPhone, Android, Chrome)
    const infoAparelho = navigator.userAgent.split('(')[1]?.split(')')[0] || "Desconhecido";

    const mensagem = `
⚠️ *ERRO DETECTADO NO GESTTO*
━━━━━━━━━━━━━━━━━━
📍 *Local:* ${local}
👤 *Usuário:* ${usuario}
📱 *Aparelho:* ${infoAparelho}
❌ *Mensagem:* ${erro.message || erro}
⏰ *Data:* ${new Date().toLocaleString("pt-BR")}
━━━━━━━━━━━━━━━━━━
    `;

    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: mensagem,
                parse_mode: "Markdown"
            })
        });
    } catch (e) {
        console.error("Falha ao reportar erro ao Telegram", e);
    }
};

// --- NAVEGAÇÃO ---
window.navegar = (pagina) => {
    const home = document.getElementById("tela-lancamentos"), perfil = document.getElementById("perfilSection");
    if(pagina === 'perfil') { home.style.display = 'none'; perfil.style.display = 'block'; carregarDadosPerfil(); }
    else { home.style.display = 'block'; perfil.style.display = 'none'; }
};

onAuthStateChanged(auth, user => {
    if (user) { document.getElementById("auth").style.display = "none"; document.getElementById("app").style.display = "block"; configurarMeses(); carregarLancamentos(); }
    else { document.getElementById("auth").style.display = "flex"; document.getElementById("app").style.display = "none"; }
});

function configurarMeses() {
    const select = document.getElementById("monthSelect");
    if(select.options.length > 0) return;
    months.forEach(m => { let opt = document.createElement("option"); opt.value = m; opt.textContent = m; select.appendChild(opt); });
    select.value = months[new Date().getMonth()];
    select.onchange = carregarLancamentos;
}

window.setTipo = (t) => {
    document.getElementById("tipo").value = t;
    document.getElementById("btnTipoE").classList.toggle("active", t === 'entrada');
    document.getElementById("btnTipoS").classList.toggle("active", t === 'saida');
};

// --- CRUD ---
window.carregarLancamentos = async () => {
    try {
        if (!auth.currentUser) return;
        const mes = document.getElementById("monthSelect").value;
        const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid), where("mes", "==", mes));
        const snap = await getDocs(q);
        const eBody = document.getElementById("entradaBody"), sBody = document.getElementById("saidaBody");
        eBody.innerHTML = ""; sBody.innerHTML = "";
        let tE = 0, tS = 0;

        snap.forEach(d => {
            const item = d.data();
            const v = parseFloat(item.valor) || 0;
            const statusClass = item.status === "Pago" ? "paid" : "pending";
            const fixaIcon = item.isFixa ? '<i class="fa-solid fa-rotate" style="font-size:10px; margin-left:5px; color:var(--primary);"></i>' : '';
            const card = `<div class="transaction-card">
                <div class="icon ${item.tipo === "entrada" ? "income" : "expense"}">${item.tipo === "entrada" ? "↑" : "↓"}</div>
                <div class="info" onclick="prepararEdicao('${d.id}')">
                    <span class="title">${item.descricao}${fixaIcon}</span>
                    <span class="category">${item.cliente || '-'}</span>
                </div>
                <div class="right">
                    <span class="amount">R$ ${v.toFixed(2)}</span>
                    <span class="badge ${statusClass}">${item.status}</span>
                </div>
                <button onclick="deletar('${d.id}')" style="margin-left:10px; border:none; background:none; color:red; opacity:0.3;"><i class="fa-solid fa-trash"></i></button>
            </div>`;
            if (item.tipo === "entrada") { tE += v; eBody.innerHTML += card; } else { tS += v; sBody.innerHTML += card; }
        });
        document.getElementById("totalEntrada").innerText = tE.toFixed(2);
        document.getElementById("totalSaida").innerText = tS.toFixed(2);
        document.getElementById("lucro").innerText = (tE - tS).toFixed(2);
    } catch (e) { logErroTelegram("carregarLancamentos", e); }
};

window.addLancamento = async () => {
    const descricao = document.getElementById("descricao").value;
    const valor = parseFloat(document.getElementById("valor").value) || 0;
    const dataBase = document.getElementById("data").value;
    const cliente = document.getElementById("cliente").value;
    const tipo = document.getElementById("tipo").value;
    const mesSelecionado = document.getElementById("monthSelect").value;
    const isFixa = document.getElementById("isFixa").checked;

    if (!descricao || !valor || !dataBase) {
        return alert("Por favor, preencha Descrição, Valor e Data.");
    }

    const novoLancamento = {
        userId: auth.currentUser.uid,
        descricao,
        valor,
        data: dataBase,
        cliente,
        tipo,
        isFixa,
        mes: mesSelecionado,
        status: "Pago",
        pagamento: "Pix",
        ajudante: "0"
    };

    try {
        // 1. Salva o lançamento no mês atual
        await addDoc(collection(db, "lancamentos"), novoLancamento);

        // 2. Se for fixa, replica para os meses seguintes do ano
        if (isFixa) {
            const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            let indiceMesAtual = mesesAno.indexOf(mesSelecionado);

            for (let i = indiceMesAtual + 1; i < mesesAno.length; i++) {
                const copiaFixa = { 
                    ...novoLancamento, 
                    mes: mesesAno[i] 
                };
                await addDoc(collection(db, "lancamentos"), copiaFixa);
            }
            alert(`Lançamento fixo replicado até Dezembro!`);
        }

        // Limpa os campos
        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";
        document.getElementById("cliente").value = "";
        document.getElementById("isFixa").checked = false;
        
        carregarLancamentos();

    } catch (error) {
        // AQUI ESTÁ O CHAMADO QUE FALTAVA!
        if (window.logErroTelegram) {
            window.logErroTelegram("addLancamento (Replicação)", error);
        }
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar lançamento. O administrador foi avisado.");
    }
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
        fecharModal(); carregarLancamentos();
    } catch (e) { logErroTelegram("salvarEdicao", e); }
};

window.fecharModal = () => document.getElementById("editModal").style.display = "none";
window.deletar = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "lancamentos", id)); carregarLancamentos(); };
window.logout = () => signOut(auth);

// --- PERFIL E AUTH ---
document.getElementById("btnLogin").onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value).catch(e => logErroTelegram("Login", e));
};
async function carregarDadosPerfil() {
    const d = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
    if(d.exists()) document.getElementById("perfilNome").innerText = d.data().nome;
    document.getElementById("perfilEmail").innerText = auth.currentUser.email;
}
window.toggleSecao = (id, header) => { document.getElementById(id).classList.toggle('hidden'); header.classList.toggle('closed'); };