// ==========================================
// RANKING MUNDIAL - ADORAPLAY
// ==========================================

window.musicas = window.musicas || [];

function extrairRanking(dados) {
    if (Array.isArray(dados)) return dados;
    if (!dados || typeof dados !== "object") return [];

    const chavesPossiveis = ["ranking", "value", "data", "items", "top", "top8"];
    for (const chave of chavesPossiveis) {
        if (Array.isArray(dados[chave])) {
            return dados[chave];
        }
    }

    return [];
}

async function carregarRanking() {
    window.musicas = window.musicas || [];

    const container = document.getElementById("maisOuvidas");
    if (!container) return;

    try {
        const endpointRanking = `https://adoraplay-api.digiartesai.workers.dev/api/ranking?t=${Date.now()}`;
        const resposta = await fetch(endpointRanking, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            if (typeof window.renderizarRanking === 'function') {
                window.renderizarRanking([]);
                return;
            }

            container.innerHTML = "";
            return;
        }

        const dados = await resposta.json();
        const ranking = extrairRanking(dados);

        if (typeof window.renderizarRanking === 'function') {
            window.renderizarRanking(ranking);
            return;
        }

        const medalhas = ["🥇", "🥈", "🥉"];
        container.innerHTML = "";
        ranking.slice(0, 8).forEach((item, posicao) => {
            const musica = window.musicas.find(m => Number(m.id) === Number(item.id));
            if (!musica) return;
            const indice = window.musicas.findIndex(m => Number(m.id) === Number(item.id));
            if (indice === -1) return;
            const rankLabel = posicao === 0 ? medalhas[0] : posicao === 1 ? medalhas[1] : posicao === 2 ? medalhas[2] : `${posicao + 1}`;
            container.innerHTML += `
                <article class="ranking-card" onclick="tocar(${indice})">
                    <img src="${musica.capa_musica || musica.capa || 'assets/icons/album.svg'}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
                    <div class="ranking-footer">
                        <button class="card-play" onclick="event.stopPropagation(); tocar(${indice})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                            <img src="assets/icons/play.svg" alt="">
                        </button>
                        <div class="ranking-badge">${rankLabel}</div>
                    </div>
                    <small>${item.reproducoes || 0} reproduções</small>
                </article>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar ranking:", erro);
        if (typeof window.renderizarRanking === 'function') {
            window.renderizarRanking([]);
            return;
        }

        if (container) container.innerHTML = "";
    }
}

window.carregarRanking = carregarRanking;

const API_RANKING_QUIZ = 'https://adoraplay-api.digiartesai.workers.dev';

async function carregarPreferenciaRankingQuiz(googleId) {
    if (!googleId) return false;
    try {
        const resposta = await fetch(`${API_RANKING_QUIZ}/api/quiz/ranking?google_id=${encodeURIComponent(googleId)}`, {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        if (!resposta.ok) return false;
        const dados = await resposta.json();
        return Boolean(dados?.permitido);
    } catch (erro) {
        console.warn('Não foi possível carregar a preferência do ranking:', erro.message);
        return false;
    }
}

async function salvarPreferenciaRankingQuiz({ google_id, acertos, desafio_id, permitir }) {
    if (!google_id) return false;
    try {
        const resposta = await fetch(`${API_RANKING_QUIZ}/api/quiz/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_id, acertos, desafio_id, permitir })
        });
        if (!resposta.ok) return false;
        return true;
    } catch (erro) {
        console.warn('Não foi possível salvar a preferência do ranking:', erro.message);
        return false;
    }
}

async function retirarRankingQuiz({ google_id, desafio_id = null }) {
    if (!google_id) return false;
    try {
        const resposta = await fetch(`${API_RANKING_QUIZ}/api/quiz/ranking`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_id, desafio_id })
        });
        if (!resposta.ok) return false;
        return true;
    } catch (erro) {
        console.warn('Não foi possível retirar o ranking do usuário:', erro.message);
        return false;
    }
}

window.carregarPreferenciaRankingQuiz = carregarPreferenciaRankingQuiz;
window.salvarPreferenciaRankingQuiz = salvarPreferenciaRankingQuiz;
window.retirarRankingQuiz = retirarRankingQuiz;

function escaparTextoRanking(valor) {
    return String(valor || '').replace(/[&<>"']/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caractere]));
}

const desafiosSection = document.getElementById('desafiosSection');
const listaDesafiosCompleta = document.getElementById('listaDesafiosCompleta');
window.desafiosSection = desafiosSection;

let ultimosDesafiosRanking = [];
let ultimosIndividuaisRanking = [];
let tipoDesafiosExibidoAtualmente = null;

function obterUsuarioAtualRanking() {
    try { return JSON.parse(localStorage.getItem('adoraplayGoogleUser')); } catch { return null; }
}

function medalhaOuPosicao(indice) {
    return ['🥇', '🥈', '🥉'][indice] || `${indice + 1}`;
}

function renderizarIndividuaisQuiz(lista) {
    const individuais = document.getElementById('rankingQuizIndividual');
    const verTodosBotao = document.getElementById('verTodosRankingIndividual');
    if (!individuais) return;
    if (!lista || !lista.length) {
        individuais.innerHTML = '<small>Ainda não há pontuações publicadas.</small>';
        if (verTodosBotao) verTodosBotao.hidden = true;
        return;
    }
    individuais.innerHTML = lista.slice(0, 3).map(criarCardIndividualRanking).join('');
    if (verTodosBotao) verTodosBotao.hidden = lista.length <= 3;
}

function criarCardIndividualRanking(item, indice) {
    return `
        <article class="quiz-ranking-item">
            <span>${medalhaOuPosicao(indice)}</span>
            <img src="${escaparTextoRanking(item.foto || 'assets/icons/profile.svg')}" alt="" onerror="this.src='assets/icons/profile.svg'">
            <strong>${escaparTextoRanking(item.nome || 'Jogador')}</strong>
            <b>${item.pontuacao || 0}</b>
        </article>
    `;
}

function primeiroNomeRanking(nome) {
    return String(nome || 'Jogador').trim().split(' ')[0];
}

function criarCardDesafio(item) {
    const usuarioAtual = obterUsuarioAtualRanking();
    const googleIdAtual = usuarioAtual?.google_id || null;
    const souDesafiante = Boolean(googleIdAtual) && item.desafiante_id === googleIdAtual;
    const souDesafiado = Boolean(googleIdAtual) && item.desafiado_id === googleIdAtual;
    const temOponente = Boolean(item.desafiado_nome);
    const exibirPontuacao = item.status === 'finalizado';
    const linkDesafio = `index.html?desafio=${item.id}`;
    const statusTextos = { pendente: 'Pendente', aceito: 'Jogando', finalizado: 'Finalizado' };
    const statusTexto = statusTextos[item.status] || item.status;

    let acoesHtml = '';
    if (souDesafiante) {
        const podeCancelar = item.status === 'pendente' || item.status === 'aceito';
        acoesHtml = `
            ${podeCancelar ? `<button type="button" class="btn-acao-desafio" onclick="window.cancelarDesafioRanking('${item.id}')">Cancelar</button>` : ''}
            ${item.status === 'pendente' ? `<button type="button" class="btn-acao-desafio" onclick="window.compartilharDesafioRanking('${item.id}')">Compartilhar</button>` : ''}
        `;
    } else if (!temOponente && !souDesafiado) {
        acoesHtml = `<a href="${linkDesafio}" class="btn-aceitar-quiz" onclick="event.preventDefault(); window.mostrarQuizDesafio('${item.id}');">Aceitar desafio</a>`;
    }

    const confrontoHtml = temOponente ? `
            <div class="desafio-confronto">
                <img src="${escaparTextoRanking(item.desafiante_foto || 'assets/icons/profile.svg')}" alt="" onerror="this.src='assets/icons/profile.svg'">
                <span class="desafio-nome">${escaparTextoRanking(primeiroNomeRanking(item.desafiante_nome))}</span>
                ${exibirPontuacao ? `<b class="desafio-pontos">${item.desafiante_pontuacao || 0} pts</b>` : ''}
                <span class="desafio-vs">vs</span>
                ${exibirPontuacao ? `<b class="desafio-pontos">${item.desafiado_pontuacao || 0} pts</b>` : ''}
                <span class="desafio-nome">${escaparTextoRanking(primeiroNomeRanking(item.desafiado_nome))}</span>
                <img src="${escaparTextoRanking(item.desafiado_foto || 'assets/icons/profile.svg')}" alt="" onerror="this.src='assets/icons/profile.svg'">
            </div>` : `
            <div class="desafio-jogador">
                <img src="${escaparTextoRanking(item.desafiante_foto || 'assets/icons/profile.svg')}" alt="" onerror="this.src='assets/icons/profile.svg'">
                <span class="desafio-nome">${escaparTextoRanking(primeiroNomeRanking(item.desafiante_nome))}</span>
                ${exibirPontuacao ? `<b class="desafio-pontos">${item.desafiante_pontuacao || 0} pts</b>` : ''}
            </div>`;

    return `
        <article class="desafio-card desafio-${item.status}">
            ${confrontoHtml}
            <div class="desafio-rodape">
                <span class="desafio-status-label">${item.status === 'finalizado' ? '' : statusTexto}</span>
                <div class="desafio-acoes">${acoesHtml}</div>
            </div>
        </article>
    `;
}

function separarDesafiosPorStatus(lista) {
    const abertos = (lista || []).filter((item) => item.status === 'pendente' || item.status === 'aceito');
    const finalizados = (lista || []).filter((item) => item.status === 'finalizado');
    return { abertos, finalizados };
}

function renderizarListaDesafios(containerId, botaoVerTodosId, lista, limite) {
    const container = document.getElementById(containerId);
    const verTodosBotao = document.getElementById(botaoVerTodosId);
    if (!container) return;
    if (!lista || !lista.length) {
        container.innerHTML = '<small>Nenhum desafio por aqui.</small>';
        if (verTodosBotao) verTodosBotao.hidden = true;
        return;
    }
    container.innerHTML = lista.slice(0, limite).map(criarCardDesafio).join('');
    if (verTodosBotao) verTodosBotao.hidden = lista.length <= limite;
}

function renderizarDesafiosQuiz(lista) {
    const { abertos, finalizados } = separarDesafiosPorStatus(lista);
    const logado = Boolean(obterUsuarioAtualRanking()?.google_id);
    renderizarListaDesafios('rankingQuizAbertos', 'verTodosDesafiosAbertos', abertos, logado ? 3 : 1);
    renderizarListaDesafios('rankingQuizFinalizados', 'verTodosDesafiosFinalizados', finalizados, 1);
}

window.mostrarDesafios = function mostrarDesafios(tipo = 'abertos') {
    if (!desafiosSection) return;
    document.getElementById('gamificacaoSection')?.style.setProperty('display', 'none');
    if (typeof homeSection !== 'undefined' && homeSection) homeSection.style.display = 'none';
    if (typeof bibliotecaSection !== 'undefined' && bibliotecaSection) bibliotecaSection.style.display = 'none';
    if (typeof bibliaSection !== 'undefined' && bibliaSection) bibliaSection.style.display = 'none';
    if (window.quizSection) window.quizSection.style.display = 'none';
    if (window.quizDesafioSection) window.quizDesafioSection.style.display = 'none';
    desafiosSection.style.display = 'grid';
    tipoDesafiosExibidoAtualmente = tipo;

    const { abertos, finalizados } = separarDesafiosPorStatus(ultimosDesafiosRanking);
    const rankingIndividual = tipo === 'individuais';
    const lista = rankingIndividual ? ultimosIndividuaisRanking : tipo === 'finalizados' ? finalizados : abertos;
    const titulo = document.getElementById('desafiosSectionTitulo');
    if (titulo) titulo.textContent = rankingIndividual ? 'Ranking do quiz' : tipo === 'finalizados' ? 'Desafios finalizados' : 'Desafios abertos';
    if (listaDesafiosCompleta) {
        listaDesafiosCompleta.innerHTML = lista.length
            ? rankingIndividual ? lista.map(criarCardIndividualRanking).join('') : lista.map(criarCardDesafio).join('')
            : `<small>${rankingIndividual ? 'Ainda não há pontuações publicadas.' : 'Nenhum desafio por aqui.'}</small>`;
    }
};

window.cancelarDesafioRanking = async function cancelarDesafioRanking(id) {
    const usuario = obterUsuarioAtualRanking();
    if (!usuario?.google_id) return window.mostrarToast?.('Entre com Google para cancelar o desafio.', 'erro');
    if (!window.confirm('Deseja cancelar este desafio?')) return;
    try {
        const resposta = await fetch(`https://adoraplay-api.digiartesai.workers.dev/api/quiz/desafios/${encodeURIComponent(id)}/cancelar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ google_id: usuario.google_id })
        });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        window.mostrarToast?.('Desafio cancelado.', 'sucesso');
        carregarRankingQuiz();
    } catch (erro) {
        window.mostrarToast?.('Não foi possível cancelar o desafio agora.', 'erro');
    }
};

window.compartilharDesafioRanking = async function compartilharDesafioRanking(id) {
    const link = `https://share.adoraplay.com.br/compartilhar-desafio?desafio=${encodeURIComponent(id)}&v=${Date.now()}`;
    const dados = {
        title: 'Desafio Bíblico AdoraPlay',
        text: 'Aceite meu desafio no Quiz Bíblico AdoraPlay!',
        url: link
    };
    try {
        if (navigator.share) {
            await navigator.share(dados);
            return;
        }
        await navigator.clipboard.writeText(link);
        window.mostrarToast?.('Seu navegador não oferece o menu de compartilhamento. Link copiado!', 'info');
    } catch (erro) {
        if (erro.name !== 'AbortError') window.mostrarToast?.('Não foi possível compartilhar o desafio.', 'erro');
    }
};

// Reexibe os desafios com as ações corretas para o usuario atual ao entrar/sair da conta Google.
function atualizarDesafiosAposMudancaDeConta() {
    renderizarDesafiosQuiz(ultimosDesafiosRanking);
    if (desafiosSection && desafiosSection.style.display !== 'none' && tipoDesafiosExibidoAtualmente) {
        window.mostrarDesafios(tipoDesafiosExibidoAtualmente);
    }
}
window.addEventListener('adoraplay:login', atualizarDesafiosAposMudancaDeConta);
window.addEventListener('adoraplay:logout', atualizarDesafiosAposMudancaDeConta);

async function carregarRankingQuiz() {
    const individuais = document.getElementById('rankingQuizIndividual');
    const abertos = document.getElementById('rankingQuizAbertos');

    if (!individuais || !abertos) return;

    try {
        const resposta = await fetch(`https://adoraplay-api.digiartesai.workers.dev/api/quiz/ranking?t=${Date.now()}`, { 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        const dados = await resposta.json();

        ultimosIndividuaisRanking = Array.isArray(dados.individuais) ? dados.individuais : [];
        renderizarIndividuaisQuiz(ultimosIndividuaisRanking);

        ultimosDesafiosRanking = Array.isArray(dados.desafios) ? dados.desafios : [];
        renderizarDesafiosQuiz(ultimosDesafiosRanking);
    } catch (erro) {
        console.warn('Erro ao carregar ranking do quiz:', erro.message);
        if (individuais) individuais.innerHTML = '<small>Erro ao carregar.</small>';
        if (abertos) abertos.innerHTML = '<small>Erro ao carregar.</small>';
    }
}

window.carregarRankingQuiz = carregarRankingQuiz;
