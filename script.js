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

let regrasCategorias = []; // Armazena as regras na memória do app
let categoriasAtivas = []; // Será preenchida ao carregar o app
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
    ______________________________
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
onAuthStateChanged(auth, async (user) => { // Adicionado async aqui
    if (user) { 
        document.getElementById("auth").style.display = "none"; 
        document.getElementById("app").style.display = "block"; 
        configurarMeses(); 
        carregarLancamentos(); 

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

    window.atualizarGraficosBarras();

};

window.setTipo = (t) => {
    document.getElementById("tipo").value = t;
    document.getElementById("btnTipoE").classList.toggle("active", t === 'entrada');
    document.getElementById("btnTipoS").classList.toggle("active", t === 'saida');
};

window.addLancamento = async () => {
    // 1. Captura dos elementos do formulário
    const descricao = document.getElementById("descricao").value;
    const valorInput = document.getElementById("valor").value;
    const valor = parseFloat(valorInput) || 0;
    const dataBase = document.getElementById("data").value;
    const cliente = document.getElementById("cliente").value;
    const tipo = document.getElementById("tipo").value;
    const mesSelecionado = document.getElementById("monthSelect").value;
    const isFixa = document.getElementById("isFixa").checked;

    // Validação básica
    if (!descricao || !valor || !dataBase) return alert("Preencha Descrição, Valor e Data.");

    try {
        const uid = auth.currentUser.uid;

        // --- A MÁGICA DA AUTOMAÇÃO ---
        // Aqui chamamos a função que criamos para descobrir a categoria baseada nas regras
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
            categoria: categoriaIdentificada // Salva a categoria (ex: "Aluguel", "Vendas", ou "Geral")
        };
        
        // 1. Salva o lançamento no mês atual
        await addDoc(collection(db, "lancamentos"), novo);

        // 2. Lógica para Lançamentos Fixos
        if (isFixa) {
            // Salva como Modelo no Gerenciador para aparecer no botão "Gerenciar Gastos"
            await addDoc(collection(db, "modelos_fixos"), {
                uid: uid,
                nome: descricao,
                valor: valor,
                dia: parseInt(dataBase.split('-')[2]), // Extrai o dia (DD) da data (AAAA-MM-DD)
                categoria: categoriaIdentificada,
                dataCriacao: new Date()
            });

            // Réplica para os meses restantes do ano corrente
            let indice = months.indexOf(mesSelecionado);
            for (let i = indice + 1; i < months.length; i++) {
                await addDoc(collection(db, "lancamentos"), { 
                    ...novo, 
                    mes: months[i] 
                });
            }
        }
        
        // Limpeza e Atualização da Tela
        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";
        document.getElementById("cliente").value = "";
        document.getElementById("isFixa").checked = false;
        
        window.fecharModalNovo();
        window.carregarLancamentos(); // Recarrega a lista
        window.atualizarGraficosBarras(); // Atualiza o gráfico com a nova barra de categoria
        
        alert(isFixa ? "Lançamento Fixo replicado com sucesso!" : "Lançamento salvo com sucesso!");

    } catch (e) { 
        window.logErroTelegram("addLancamento_Automatizado", e.message); 
        console.error("Erro ao salvar:", e);
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
        window.fecharModal(); 
        window.carregarLancamentos(); 
    } catch (e) { window.logErroTelegram("salvarEdicao", e.message); }
};

window.fecharModal = () => document.getElementById("editModal").style.display = "none";
window.deletar = async (id) => {
    try {
        const docRef = doc(db, "lancamentos", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;
        const item = docSnap.data();

        let excluirTudo = false;
        if (item.isFixa) {
            excluirTudo = confirm(`"${item.descricao}" é um lançamento fixo. Deseja excluir também as repetições dos meses seguintes?`);
        } else {
            if (!confirm("Deseja eliminar este registo?")) return;
        }

        if (excluirTudo) {
            // 1. Identifica o índice do mês atual
            const indiceMesAtual = months.indexOf(item.mes);
            const mesesParaApagar = months.slice(indiceMesAtual);

            // 2. Busca todos os lançamentos iguais deste usuário nos meses seguintes
            const q = query(
                collection(db, "lancamentos"), 
                where("userId", "==", auth.currentUser.uid),
                where("descricao", "==", item.descricao),
                where("valor", "==", item.valor)
            );

            const querySnapshot = await getDocs(q);
            
            // 3. Deleta apenas os que pertencem ao mês atual ou meses futuros
            const deletarPromises = [];
            querySnapshot.forEach((d) => {
                if (mesesParaApagar.includes(d.data().mes)) {
                    deletarPromises.push(deleteDoc(doc(db, "lancamentos", d.id)));
                }
            });

            await Promise.all(deletarPromises);
            alert("Lançamento e repetições futuras excluídas.");
        } else {
            // Exclusão simples (apenas o registro clicado)
            await deleteDoc(docRef);
        }

        window.carregarLancamentos(); // Atualiza a lista na tela
    } catch (e) {
        window.logErroTelegram("deletar_Cascata", e.message);
        console.error(e);
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
window.logout = async () => {
    try {
        // 1. Desloga do Firebase
        await signOut(auth);
        
        // 2. Esconde todos os modais e seções que podem estar abertas
        const modais = ["modalPerfil", "perfilSection", "modalNovo", "modalGerenciadorFixos", "modalGerenciadorServicos"];
        modais.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        // 3. Garante que a tela de login apareça e o app suma
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none";

        // Opcional: Recarregar a página limpa qualquer lixo da memória
        // location.reload(); 
        
    } catch (e) {
        window.logErroTelegram("Logout", e.message);
    }
};
window.toggleSecao = (id, header) => { 
    document.getElementById(id).classList.toggle('hidden'); 
    header.classList.toggle('closed'); 
};

// Eventos de Botões (Login / Cadastro)
document.getElementById("btnLogin").onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value)
    .catch(e => window.logErroTelegram("Login", e.message));

    // Certifique-se de adicionar 'createUserWithEmailAndPassword' no seu import lá no topo:
// import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, ... } from "...";

const btnRegistrar = document.getElementById("btnRegistrar");

if (btnRegistrar) {
    btnRegistrar.addEventListener("click", async () => {
        const nome = document.getElementById("cadNome").value;
        const email = document.getElementById("cadEmail").value;
        const senha = document.getElementById("cadSenha").value;

        if (!email || !senha || !nome) {
            alert("Por favor, preencha todos os campos.");
            return;
        }

        try {
            // 1. Cria o usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // 2. Salva o nome do usuário no Firestore (opcional, mas recomendado)
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: nome,
                email: email,
                createdAt: new Date()
            });

            alert("Conta criada com sucesso!");
            window.mostrarLogin(); // Volta para a tela de login
            
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            let mensagem = "Erro ao criar conta.";
            if (error.code === 'auth/email-already-in-use') mensagem = "Este e-mail já está em uso.";
            if (error.code === 'auth/weak-password') mensagem = "A senha deve ter pelo menos 6 caracteres.";
            
            alert(mensagem);
            window.logErroTelegram("Cadastro", error.message);
        }
    });
}
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

// Excluir Modelo
window.excluirModeloFixo = async function(id) {
    if (confirm("Deseja apagar este modelo fixo?")) {
        try {
            await deleteDoc(doc(db, "modelos_fixos", id));
            await window.carregarModelosFixos();
        } catch (e) {
            window.logErroTelegram("excluirModeloFixo", e.message);
        }
    }
};

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
        // ... (seu código de quando está logado)
    } else { 
        // Quando o usuário sai:
        document.getElementById("auth").style.display = "flex"; 
        document.getElementById("app").style.display = "none";
        
        // Esconde a seção de perfil caso ela tenha ficado aberta
        const perfil = document.getElementById("perfilSection");
        if(perfil) perfil.style.display = "none";
    }
});

let instanciaEntradas = null;
let instanciaSaidas = null;

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

let deferredPrompt;
const btnInstalar = document.getElementById('btnInstalarApp');

// 1. Escuta o evento de instalação do navegador
window.addEventListener('beforeinstallprompt', (e) => {
    // Impede que o navegador mostre o banner padrão feio
    e.preventDefault();
    // Guarda o evento para usar depois
    deferredPrompt = e;
    // Mostra o seu botão personalizado
    if (btnInstalar) btnInstalar.style.display = 'block';
});

// 2. Lógica ao clicar no seu botão
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

// 3. Esconde o botão se o app já estiver instalado
window.addEventListener('appinstalled', () => {
    console.log('Gestto instalado com sucesso!');
    if (btnInstalar) btnInstalar.style.display = 'none';
});

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

if (isIOS && !isStandalone) {
    // Aqui você pode mostrar uma mensagem pequena: 
    // "Para instalar, clique no ícone de compartilhar e 'Adicionar à Tela de Início'"
    console.log("Dica: No iPhone, instale via menu de compartilhamento do Safari.");
}
