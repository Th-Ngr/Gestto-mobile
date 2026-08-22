import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Gerencia a versão da aplicação e o fluxo de novidades.
 *
 * Uma única assinatura de onSnapshot substitui os listeners duplicados
 * que existiam no script principal.
 */
export function iniciarMonitoramentoVersao(db) {
    const sistemaRef = doc(db, "configuracoes", "sistema");

    onSnapshot(
        sistemaRef,
        (snapshot) => {
            if (!snapshot.exists()) return;

            const dados = snapshot.data();
            const versaoBanco = String(dados.versaoApp || "").trim();
            if (!versaoBanco) return;

            const versaoCache = localStorage.getItem("versao_cache");
            const versaoApp = localStorage.getItem("app_version");

            // Primeiro acesso: sincroniza os dois marcadores sem forçar atualização.
            if (!versaoCache || !versaoApp) {
                localStorage.setItem("versao_cache", versaoBanco);
                localStorage.setItem("app_version", versaoBanco);
                return;
            }

            // Exibe as novidades uma única vez após o reload.
            if (
                versaoBanco === versaoApp &&
                localStorage.getItem("mostrar_novidades") === "true"
            ) {
                localStorage.removeItem("mostrar_novidades");
                mostrarNovidades(dados, versaoBanco);
                return;
            }

            // Evita timers duplicados.
            if (versaoBanco !== versaoApp && !window.atualizacaoEmCurso) {
                iniciarContagemAtualizacao(dados, versaoBanco);
            }
        },
        (erro) => {
            console.error("Erro ao monitorar versão do GESTTO:", erro);
        }
    );

    // Manutenção é independente da versão.
    onSnapshot(
        sistemaRef,
        (snapshot) => {
            if (!snapshot.exists()) return;
            const dados = snapshot.data();

            if (dados.emManutencao === true) {
                Swal.fire({
                    toast: true,
                    position: "top",
                    icon: "warning",
                    title: "MANUTENÇÃO ATIVA",
                    text: dados.mensagem || "O sistema está temporariamente em manutenção.",
                    timer: null,
                    showConfirmButton: false,
                    backdrop: false,
                    customClass: { popup: "banner-manutencao-fixo" }
                });
            }
        },
        (erro) => console.error("Erro ao monitorar manutenção:", erro)
    );
}

function iniciarContagemAtualizacao(dados, versaoBanco) {
    window.atualizacaoEmCurso = true;

    let segundosRestantes = Math.max(
        1,
        Number(dados.tempoParaAtualizar || 1) * 60
    );

    // Mantém o banner administrativo existente visível.
    const banner = document.getElementById("banner-admin");
    if (banner) banner.style.display = "block";

    Swal.fire({
        toast: true,
        position: "top",
        icon: "info",
        title: `Nova versão ${versaoBanco} disponível`,
        html: `Atualizando em <b>${segundosRestantes}</b> segundos...<br><small>${dados.mensagemUpdate || ""}</small>`,
        timer: segundosRestantes * 1000,
        timerProgressBar: true,
        showConfirmButton: false,
        backdrop: false,
        customClass: { popup: "banner-atualizacao-minuto" },
        didOpen: () => {
            const container = Swal.getHtmlContainer();
            const contador = container?.querySelector("b");

            window.gesttoVersionTimer = setInterval(() => {
                segundosRestantes -= 1;
                if (contador) contador.textContent = String(segundosRestantes);

                if (segundosRestantes <= 0) {
                    clearInterval(window.gesttoVersionTimer);
                    localStorage.setItem("versao_cache", versaoBanco);
                    localStorage.setItem("app_version", versaoBanco);
                    localStorage.setItem("mostrar_novidades", "true");

                    window.location.href =
                        window.location.origin +
                        window.location.pathname +
                        "?v=" +
                        Date.now();
                }
            }, 1000);
        },
        willClose: () => {
            if (window.gesttoVersionTimer) {
                clearInterval(window.gesttoVersionTimer);
                window.gesttoVersionTimer = null;
            }
        }
    });
}

function mostrarNovidades(dados, versao) {
    const exibir = () => {
        const modal = document.getElementById("modal-novidades");
        const overlay = document.getElementById("modal-overlay");
        const txtVersao = document.getElementById("txt-versao-modal");
        const txtNovidades = document.getElementById("txt-novidades-modal");

        if (!modal || !overlay) return;

        if (txtVersao) txtVersao.innerText = `Versão: ${versao}`;
        if (txtNovidades) {
            txtNovidades.innerText =
                dados.novidades || "Melhorias gerais no sistema.";
        }

        modal.style.display = "block";
        overlay.style.display = "block";
    };

    if (document.readyState === "complete") {
        exibir();
    } else {
        window.addEventListener("load", exibir, { once: true });
    }
}
