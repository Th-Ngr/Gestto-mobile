import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7ugVILO8olKtzkCJI_7BRlzY6Qe0-rCM",
    authDomain: "gst-financeira.firebaseapp.com",
    projectId: "gst-financeira"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
let editId = null;

// --- NAVEGAÇÃO SPA ---
window.navegar = (pagina) => {
    const home = document.getElementById("tela-lancamentos");
    const perfil = document.getElementById("perfilSection");
    const navH = document.getElementById("nav-home");
    const navP = document.getElementById("btnConfiguracoes");

    if(pagina === 'perfil') {
        home.style.display = 'none'; perfil.style.display = 'block';
        navP.classList.add('active'); navH.classList.remove('active');
        carregarDadosPerfil();
    } else {
        home.style.display = 'block'; perfil.style.display = 'none';
        navH.classList.add('active'); navP.classList.remove('active');
    }
};

// --- AUTH OBSERVER ---
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
    if(select.options.length > 0) return;
    months.forEach(m => {
        let opt = document.createElement("option");
        opt.value = m; opt.textContent = m;
        select.appendChild(opt);
    });
    select.value = months[new Date().getMonth()];
    select.onchange = carregarLancamentos;
}

// --- LOGICA DE TIPO (ENTRADA/SAIDA) ---
window.setTipo = (t) => {
    document.getElementById("tipo").value = t;
    document.getElementById("btnTipoE").classList.toggle("active", t === 'entrada');
    document.getElementById("btnTipoS").classList.toggle("active", t === 'saida');
};

// --- CARREGAR LANÇAMENTOS (FORMATO CARD) ---
window.carregarLancamentos = async () => {
    if (!auth.currentUser) return;
    const mes = document.getElementById("monthSelect").value;
    const q = query(collection(db, "lancamentos"), where("userId", "==", auth.currentUser.uid), where("mes", "==", mes));
    const snap = await getDocs(q);
    
    const eBody = document.getElementById("entradaBody");
    const sBody = document.getElementById("saidaBody");
    eBody.innerHTML = ""; sBody.innerHTML = "";
    
    let tE = 0, tS = 0;
    snap.forEach(d => {
        const item = d.data();
        const v = parseFloat(item.valor) || 0;
        const statusClass = item.status === "Pago" ? "paid" : "pending";
        const iconClass = item.tipo === "entrada" ? "income" : "expense";
        const iconSeta = item.tipo === "entrada" ? "↑" : "↓";

        const card = `
            <div class="transaction-card">
                <div class="icon ${iconClass}">${iconSeta}</div>
                <div class="info" onclick="prepararEdicao('${d.id}')">
                    <span class="title">${item.descricao}</span>
                    <span class="category">${item.cliente || '-'}</span>
                </div>
                <div class="right">
                    <span class="amount">R$ ${v.toFixed(2)}</span>
                    <span class="badge ${statusClass}">${item.status}</span>
                </div>
                <button onclick="deletar('${d.id}')" style="margin-left:10px; border:none; background:none; color:red; opacity:0.3;"><i class="fa-solid fa-trash"></i></button>
            </div>`;

        if (item.tipo === "entrada") { tE += v; eBody.innerHTML += card; }
        else { tS += v; sBody.innerHTML += card; }
    });

    document.getElementById("totalEntrada").innerText = tE.toFixed(2);
    document.getElementById("totalSaida").innerText = tS.toFixed(2);
    document.getElementById("lucro").innerText = (tE - tS).toFixed(2);
};

// --- ADICIONAR ---
window.addLancamento = async () => {
    const dados = {
        userId: auth.currentUser.uid,
        mes: document.getElementById("monthSelect").value,
        descricao: document.getElementById("descricao").value,
        cliente: document.getElementById("cliente").value,
        valor: parseFloat(document.getElementById("valor").value) || 0,
        data: document.getElementById("data").value,
        tipo: document.getElementById("tipo").value,
        pagamento: "Pix", status: "Pago", ajudante: 0
    };
    if(!dados.descricao || !dados.valor) return alert("Preencha descrição e valor");
    await addDoc(collection(db, "lancamentos"), dados);
    limparCampos();
    carregarLancamentos();
};

function limparCampos() {
    ["descricao","cliente","valor","data"].forEach(id => document.getElementById(id).value = "");
}

// --- EDITAR / DELETAR ---
window.prepararEdicao = async (id) => {
    const d = await getDoc(doc(db, "lancamentos", id));
    if(!d.exists()) return;
    const data = d.data();
    editId = id;
    document.getElementById("editDescricao").value = data.descricao;
    document.getElementById("editValor").value = data.valor;
    document.getElementById("editData").value = data.data;
    document.getElementById("editModal").style.display = "flex";
};

window.salvarEdicao = async () => {
    await setDoc(doc(db, "lancamentos", editId), {
        descricao: document.getElementById("editDescricao").value,
        valor: parseFloat(document.getElementById("editValor").value),
        data: document.getElementById("editData").value
    }, { merge: true });
    fecharModal();
    carregarLancamentos();
};

window.fecharModal = () => { document.getElementById("editModal").style.display="none"; editId=null; };

window.deletar = async (id) => { if(confirm("Excluir?")) { await deleteDoc(doc(db, "lancamentos", id)); carregarLancamentos(); } };

// --- LOGIN / LOGOUT / PERFIL ---
document.getElementById("btnLogin").onclick = () => {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert("Erro: " + err.message));
};

document.getElementById("btnOpenRegister").onclick = () => document.getElementById("modalCadastro").style.display = "flex";

document.getElementById("formCadastroFirebase").onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.getElementById("regNome").value;
    const email = document.getElementById("regEmail").value;
    const senha = document.getElementById("regSenha").value;
    try {
        const res = await createUserWithEmailAndPassword(auth, email, senha);
        await setDoc(doc(db, "usuarios", res.user.uid), { nome: nome, email: email });
        alert("Cadastrado!");
        document.getElementById("modalCadastro").style.display = "none";
    } catch(err) { alert(err.message); }
};

async function carregarDadosPerfil() {
    const d = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
    if(d.exists()) document.getElementById("perfilNome").innerText = d.data().nome;
    document.getElementById("perfilEmail").innerText = auth.currentUser.email;
}
window.toggleSecao = (idLista, elementoHeader) => {
    const lista = document.getElementById(idLista);
    
    // Alterna a classe 'hidden' na lista de cards
    lista.classList.toggle('hidden');
    
    // Alterna a classe 'closed' no cabeçalho para girar a seta
    elementoHeader.classList.toggle('closed');
};

window.logout = () => signOut(auth);