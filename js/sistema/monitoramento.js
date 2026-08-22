import {
    doc,
    getDoc,
    updateDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * ============================================================
 * GESTTO — MONITORAMENTO CENTRAL
 * ============================================================
 *
 * Responsabilidades:
 * - Capturar erros;
 * - Identificar o usuário;
 * - Registrar erros no Firestore;
 * - Manter os 5 últimos erros;
 * - Montar a mensagem do Telegram;
 * - Enviar a notificação;
 * - Impedir que uma falha do monitoramento derrube o sistema.
 *
 * Compatibilidade:
 *
 *     window.logErroTelegram(local, erro);
 *
 * ============================================================
 */

/* ============================================================
 * CONFIGURAÇÕES
 * ============================================================
 */

const CONFIGURACOES_COLLECTION = "configuracoes";
const SISTEMA_DOCUMENT = "sistema";
const HISTORICO_ERROS_FIELD = "historicoErros";

const LIMITE_HISTORICO_ERROS = 5;

/*
 * O Chat ID pode permanecer no frontend.
 *
 * O TOKEN NÃO deve ficar aqui.
 *
 * Configure o endpoint de Telegram através de:
 *
 * window.GESTTO_MONITORAMENTO = {
 *     telegramEndpoint: "https://seu-backend/telegram",
 *     telegramChatId: "8125669194"
 * };
 */

const CHAT_ID_PADRAO = "8125669194";


/* ============================================================
 * CONFIGURAÇÃO DO TELEGRAM
 * ============================================================
 */

function obterConfiguracaoTelegram() {

    const configuracao =
        window.GESTTO_MONITORAMENTO || {};

    return {

        endpoint:
            configuracao.telegramEndpoint || "",

        chatId:
            configuracao.telegramChatId ||
            CHAT_ID_PADRAO
    };
}


/* ============================================================
 * USUÁRIO
 * ============================================================
 */

function obterInfoUsuario(auth) {

    if (
        typeof auth !== "undefined" &&
        auth &&
        auth.currentUser
    ) {

        return (
            auth.currentUser.email ||
            "Usuário autenticado"
        );
    }

    return "Não logado";
}


/* ============================================================
 * NORMALIZAÇÃO DO ERRO
 * ============================================================
 */

function normalizarErro(erro) {

    if (erro instanceof Error) {
        return erro.message;
    }

    return String(erro);
}


/* ============================================================
 * CRIAÇÃO DO REGISTRO
 * ============================================================
 */

function criarRegistroErro(
    local,
    erroTexto,
    infoUsuario
) {

    return {

        erro:
            `${local}: ${erroTexto}`,

        usuario:
            infoUsuario,

        data:
            new Date().toLocaleString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ),

        resolvido: false
    };
}


/* ============================================================
 * FIRESTORE
 * ============================================================
 *
 * Estrutura:
 *
 * configuracoes
 *     └── sistema
 *           └── historicoErros
 *
 * Mantém somente os 5 erros mais recentes.
 *
 * ============================================================
 */

async function registrarErroFirestore(
    db,
    novoErro
) {

    const referenciaSistema =
        doc(
            db,
            CONFIGURACOES_COLLECTION,
            SISTEMA_DOCUMENT
        );

    const documento =
        await getDoc(
            referenciaSistema
        );


    /*
     * Documento já existe.
     */

    if (documento.exists()) {

        let historico =
            documento.data()
                [HISTORICO_ERROS_FIELD] || [];


        /*
         * Novo erro entra no início.
         */

        historico = [
            novoErro,
            ...historico
        ];


        /*
         * Mantém somente os
         * cinco últimos.
         */

        historico =
            historico.slice(
                0,
                LIMITE_HISTORICO_ERROS
            );


        /*
         * Atualiza somente
         * historicoErros.
         *
         * Não mexe em:
         * - versão;
         * - manutenção;
         * - novidades;
         * - outras configurações.
         */

        await updateDoc(
            referenciaSistema,
            {
                [HISTORICO_ERROS_FIELD]:
                    historico
            }
        );

    }

    /*
     * Documento ainda não existe.
     */

    else {

        await setDoc(
            referenciaSistema,
            {
                [HISTORICO_ERROS_FIELD]:
                    [novoErro]
            },
            {
                merge: true
            }
        );
    }


    console.log(
        "✅ Erro registrado no Firestore (documento sistema)."
    );
}


/* ============================================================
 * ESCAPE HTML
 * ============================================================
 *
 * O Telegram utiliza parse_mode = HTML.
 *
 * Se um erro possuir <, >, &, etc.,
 * precisamos escapar esses caracteres.
 *
 * ============================================================
 */

function escaparHTML(valor) {

    return String(valor)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


/* ============================================================
 * MENSAGEM TELEGRAM
 * ============================================================
 */

function criarMensagemTelegram(
    local,
    erroTexto,
    infoUsuario
) {

    return (
        "<b>🔴 ERRO NO SISTEMA</b>\n\n" +

        `<b>📍 Local:</b> ` +
        `${escaparHTML(local)}\n` +

        `<b>❌ Erro:</b> ` +
        `${escaparHTML(erroTexto)}\n` +

        `<b>👤 Usuário:</b> ` +
        `${escaparHTML(infoUsuario)}`
    );
}


/* ============================================================
 * ENVIO TELEGRAM
 * ============================================================
 *
 * IMPORTANTE:
 *
 * O navegador NÃO chama diretamente:
 *
 * api.telegram.org
 *
 * O navegador chama um endpoint seguro.
 *
 * O backend é responsável por possuir o TOKEN.
 *
 * ============================================================
 */

async function enviarTelegram(
    local,
    erroTexto,
    infoUsuario
) {

    const configuracao =
        obterConfiguracaoTelegram();


    /*
     * Telegram não configurado.
     */

    if (!configuracao.endpoint) {

        console.warn(
            "⚠️ Telegram não configurado."
        );

        return;
    }


    const mensagemHTML =
        criarMensagemTelegram(
            local,
            erroTexto,
            infoUsuario
        );


    const resposta =
        await fetch(
            configuracao.endpoint,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        chat_id:
                            configuracao.chatId,

                        text:
                            mensagemHTML,

                        parse_mode:
                            "HTML"
                    })
            }
        );


    if (!resposta.ok) {

        throw new Error(
            `Servidor Telegram respondeu HTTP ${resposta.status}`
        );
    }
}


/* ============================================================
 * LOGGER PRINCIPAL
 * ============================================================
 */

export function criarLoggerErro(
    db,
    auth
) {

    return async function logErroTelegram(
        local,
        erro
    ) {

        /*
         * ------------------------------------------------------
         * 1. IDENTIFICA USUÁRIO
         * ------------------------------------------------------
         */

        const infoUsuario =
            obterInfoUsuario(auth);


        /*
         * ------------------------------------------------------
         * 2. NORMALIZA ERRO
         * ------------------------------------------------------
         */

        const erroTexto =
            normalizarErro(erro);


        /*
         * ------------------------------------------------------
         * 3. CRIA REGISTRO
         * ------------------------------------------------------
         */

        const novoErro =
            criarRegistroErro(
                local,
                erroTexto,
                infoUsuario
            );


        /*
         * ------------------------------------------------------
         * 4. FIRESTORE
         * ------------------------------------------------------
         *
         * Se o Firestore falhar,
         * o Telegram ainda será tentado.
         */

        try {

            await registrarErroFirestore(
                db,
                novoErro
            );

        }

        catch (erroFirestore) {

            console.error(
                "❌ Erro ao salvar no Firestore:",
                erroFirestore
            );
        }


        /*
         * ------------------------------------------------------
         * 5. TELEGRAM
         * ------------------------------------------------------
         *
         * Se o Telegram falhar,
         * o sistema não deve quebrar.
         */

        try {

            await enviarTelegram(
                local,
                erroTexto,
                infoUsuario
            );

        }

        catch (erroTelegram) {

            console.error(
                "❌ Erro ao enviar notificação para o Telegram:",
                erroTelegram
            );
        }
    };
}


/* ============================================================
 * INICIALIZAÇÃO
 * ============================================================
 */

export function inicializarMonitoramento(
    db,
    auth
) {

    const logger =
        criarLoggerErro(
            db,
            auth
        );


    /*
     * Mantém compatibilidade com
     * o código antigo do GESTTO.
     */

    window.logErroTelegram =
        logger;


    return logger;
}