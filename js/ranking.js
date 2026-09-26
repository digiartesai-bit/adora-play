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

const FAIXAS_NIVEL_TEMATICO = [
    { nome: 'Neófito', significado: 'Iniciante, recém-chegado.' },
    { nome: 'Vocacionado', significado: 'Chamado para a jornada.' },
    { nome: 'Aprendiz', significado: 'Quem está absorvendo os primeiros ensinamentos.' },
    { nome: 'Discípulo', significado: 'Aquele que segue e aprende ativamente.' },
    { nome: 'Bereano', significado: 'Inspirado nos bereanos de Atos 17, que conferiam as Escrituras.' },
    { nome: 'Prudente', significado: 'Reflete maturidade e bom senso.' },
    { nome: 'Zeloso', significado: 'Demonstra dedicação e fervor.' },
    { nome: 'Cooperador', significado: 'Já atua ativamente, ajudando na dinâmica da comunidade.' },
    { nome: 'Despenseiro', significado: 'Guardião e administrador fiel dos conhecimentos adquiridos.' },
    { nome: 'Arauto', significado: 'Aquele que proclama e difunde a mensagem.' },
    { nome: 'Evangelista', significado: 'Focado em propagar a fé e os estudos.' },
    { nome: 'Atalaia', significado: 'Guardião vigilante, que conhece bem a Palavra e alerta ou orienta os demais.' },
    { nome: 'Apologista', significado: 'Defensor intelectual da fé.' },
    { nome: 'Confessor', significado: 'Aquele que testemunha corajosamente a sua fé.' },
    { nome: 'Reformador', significado: 'Marca uma fase de grande transformação e impacto.' },
    { nome: 'Instrutor', significado: 'Capaz de ensinar e guiar os outros nas leituras.' },
    { nome: 'Exegeta', significado: 'Especialista em aprofundar-se nos textos e significados.' },
    { nome: 'Teólogo', significado: 'Domínio avançado do conhecimento bíblico.' },
    { nome: 'Erudito', significado: 'Soma de profundidade, sabedoria e muita leitura.' },
    { nome: 'Mestre da Palavra', significado: 'O topo da jornada, para os maiores pontuadores.' }
];

function faixaTematicaNivel(nivel) {
    const nivelSeguro = Math.min(99, Math.max(0, Number(nivel) || 0));
    return FAIXAS_NIVEL_TEMATICO[Math.floor(nivelSeguro / 5)];
}

function inicializarAjudaNivelTematico() {
    if (document.getElementById('popoverNivelTematico')) return;
    const popover = document.createElement('div');
    popover.id = 'popoverNivelTematico';
    popover.className = 'popover-nivel-tematico';
    popover.hidden = true;
    popover.setAttribute('role', 'tooltip');
    document.body.appendChild(popover);

    document.addEventListener('click', (evento) => {
        const botao = evento.target.closest('.btn-ajuda-nivel-tematico');
        if (!botao) {
            popover.hidden = true;
            return;
        }
        evento.stopPropagation();
        if (!popover.hidden && popover.dataset.ancora === botao.dataset.faixa) {
            popover.hidden = true;
            return;
        }
        popover.dataset.ancora = botao.dataset.faixa;
        popover.innerHTML = `<strong>${escaparTextoRanking(botao.dataset.titulo)}</strong><span>${escaparTextoRanking(botao.dataset.significado)}</span>`;
        popover.hidden = false;
        const rect = botao.getBoundingClientRect();
        const largura = Math.min(280, window.innerWidth - 24);
        popover.style.width = `${largura}px`;
        popover.style.left = `${Math.max(12, Math.min(rect.left + window.scrollX - largura / 2, window.scrollX + window.innerWidth - largura - 12))}px`;
        popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
    });
    document.addEventListener('scroll', () => { popover.hidden = true; }, { passive: true });
}

function criarCardIndividualRanking(item, indice) {
    const nivel = Number(item.nivel) || 0;
    const faixa = faixaTematicaNivel(nivel);
    const indiceFaixa = Math.floor(Math.min(99, Math.max(0, nivel)) / 5);
    inicializarAjudaNivelTematico();
    return `
        <article class="quiz-ranking-item">
            <span class="quiz-ranking-medalha">${medalhaOuPosicao(indice)}</span>
            <img src="${escaparTextoRanking(item.foto || 'assets/icons/profile.svg')}" alt="" onerror="this.src='assets/icons/profile.svg'">
            <div class="quiz-ranking-identidade">
                <strong>${escaparTextoRanking(item.nome || 'Jogador')}</strong>
                <small>Nível ${nivel} · ${escaparTextoRanking(faixa.nome)}
                    <button type="button" class="btn-ajuda-nivel-tematico" aria-label="Significado de ${escaparTextoRanking(faixa.nome)}"
                        data-faixa="${indiceFaixa}" data-titulo="${escaparTextoRanking(faixa.nome)}"
                        data-significado="${escaparTextoRanking(faixa.significado)}">?</button>
                </small>
            </div>
            <b class="quiz-ranking-xp">${Number(item.pontos_totais) || 0}<small>XP</small></b>
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
    const tipoValido = ['abertos', 'finalizados', 'individuais'].includes(tipo) ? tipo : 'abertos';
    window.navegarPorRota?.(`/desafios/${tipoValido}`);
    document.getElementById('gamificacaoSection')?.style.setProperty('display', 'none');
    if (typeof homeSection !== 'undefined' && homeSection) homeSection.style.display = 'none';
    if (typeof bibliotecaSection !== 'undefined' && bibliotecaSection) bibliotecaSection.style.display = 'none';
    if (typeof bibliaSection !== 'undefined' && bibliaSection) bibliaSection.style.display = 'none';
    if (window.quizSection) window.quizSection.style.display = 'none';
    if (window.quizDesafioSection) window.quizDesafioSection.style.display = 'none';
    desafiosSection.style.display = 'grid';
    tipoDesafiosExibidoAtualmente = tipoValido;

    const { abertos, finalizados } = separarDesafiosPorStatus(ultimosDesafiosRanking);
    const rankingIndividual = tipoValido === 'individuais';
    const lista = rankingIndividual ? ultimosIndividuaisRanking : tipoValido === 'finalizados' ? finalizados : abertos;
    const titulo = document.getElementById('desafiosSectionTitulo');
    if (titulo) titulo.textContent = rankingIndividual ? 'Ranking do quiz' : tipoValido === 'finalizados' ? 'Desafios finalizados' : 'Desafios abertos';
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
        if (window.compartilharLinkNoFacebook) {
            window.compartilharLinkNoFacebook(link);
            window.mostrarToast?.('Facebook aberto com o link preenchido. Revise e confirme a publicação por lá.', 'info');
            return;
        }
        await navigator.clipboard.writeText(link);
        window.mostrarToast?.('Link copiado para compartilhar.', 'info');
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
