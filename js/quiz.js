// Quiz Biblico e Desafio - integrados como secoes da SPA (sem paginas separadas)
const API_URL_QUIZ = 'https://adoraplay-api.digiartesai.workers.dev';

const quizSection = document.getElementById('quizSection');
const quizDesafioSection = document.getElementById('quizDesafioSection');
window.quizSection = quizSection;
window.quizDesafioSection = quizDesafioSection;

// ---------------------------------------------------------------------------
// Toast (substitui alert() nativo)
// ---------------------------------------------------------------------------
function mostrarToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return window.alert(mensagem);
    const toast = document.createElement('div');
    toast.className = `toast${tipo === 'erro' ? ' toast-erro' : ''}${tipo === 'sucesso' ? ' toast-sucesso' : ''}`;
    toast.textContent = mensagem;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => toast.remove(), 250);
    }, 4000);
}
window.mostrarToast = mostrarToast;

function obterUsuarioQuiz() {
    try { return JSON.parse(localStorage.getItem('adoraplayGoogleUser')); } catch { return null; }
}

function embaralharQuiz(lista) {
    const copia = [...lista];
    for (let indice = copia.length - 1; indice > 0; indice--) {
        const sorteado = Math.floor(Math.random() * (indice + 1));
        [copia[indice], copia[sorteado]] = [copia[sorteado], copia[indice]];
    }
    return copia;
}

// ===========================================================================
// QUIZ SOLO
// ===========================================================================
(function () {
    const $ = (id) => document.getElementById(id);
    const progresso = $('quizProgresso');
    const pergunta = $('quizPergunta');
    const alternativas = $('quizAlternativas');
    const feedback = $('quizFeedback');
    const confirmar = $('quizConfirmar');
    const proxima = $('quizProxima');
    const pausar = $('quizPausar');
    const quizCard = $('quizCardPergunta');
    const resultadoCard = $('quizResultado');
    const pontuacao = $('quizPontuacao');
    const mensagemResultado = $('quizMensagemResultado');
    const reiniciar = $('quizReiniciar');
    const criarDesafio = $('quizCriarDesafio');
    const salvarRanking = $('quizSalvarRanking');
    const retirarRanking = $('quizRetirarRanking');
    const permitirRanking = $('quizPermitirRanking');
    const consentimentoRanking = $('quizConsentimentoRanking');
    const fechar = $('fecharQuiz');
    const entrarRanking = $('quizEntrarRanking');
    const sairRanking = $('quizSairRanking');

    if (!quizCard) return;

    let perguntas = [];
    let sessao = null;
    let respostaSelecionada = null;
    let respondido = false;
    let usuario = obterUsuarioQuiz();
    let rankingPermitido = false;
    let rankingSalvo = false;
    let iniciado = false;

    function sessaoInicial(ids = embaralharQuiz(perguntas.map((item) => item.id)), desafioId = null) {
        return { fila: ids, indice: 0, acertos: 0, desafio_id: desafioId, finalizada: false };
    }

    // Grava a pontuacao no banco apenas quando o quiz e finalizado/pausado, nunca a cada pergunta.
    async function salvarSessaoFinal() {

            async function registrarVitoriaQuizSolo() {
                if (!usuario?.google_id || !sessao?.finalizada) return;
                try {
                    await fetch(`${API_URL_QUIZ}/api/gamificacao/quiz-vitoria`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ google_id: usuario.google_id, referencia: `solo:${sessao.fila.join(',')}` })
                    });
                } catch (erro) {
                    console.warn('Não foi possível registrar os pontos do quiz:', erro.message);
                }
            }
        if (!usuario?.google_id || !sessao) return false;
        try {
            const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/sessao`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_id: usuario.google_id, ...sessao })
            });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            return true;
        } catch (erro) {
            console.warn('Nao foi possivel salvar sua pontuacao agora:', erro.message);
            return false;
        }
    }

    async function carregarPreferenciaRanking() {
        rankingPermitido = false;
        rankingSalvo = false;
        permitirRanking.checked = false;
        if (!usuario?.google_id) return;
        const permitido = await window.carregarPreferenciaRankingQuiz?.(usuario.google_id);
        rankingPermitido = Boolean(permitido);
        rankingSalvo = rankingPermitido;
        permitirRanking.checked = rankingPermitido;
    }

    function obterPerguntaAtual() {
        return perguntas.find((item) => String(item.id) === String(sessao.fila[sessao.indice]));
    }

    function atualizarBotoes() {
        confirmar.hidden = respondido;
        proxima.hidden = !respondido;
        confirmar.disabled = respostaSelecionada === null || respondido;
    }

    function renderizarPergunta() {
        const atual = obterPerguntaAtual();
        if (!atual) return mostrarResultado(true);
        respondido = false;
        respostaSelecionada = null;
        feedback.hidden = true;
        feedback.textContent = '';
        progresso.textContent = `Nivel ${Math.floor(sessao.indice / 20) + 1} - Pergunta ${(sessao.indice % 20) + 1} de 20`;
        pergunta.textContent = atual.pergunta;
        alternativas.innerHTML = '';
        atual.alternativas.forEach((texto, indice) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'alternativa';
            const input = document.createElement('input');
            input.type = 'radio'; input.name = 'quiz-alternativa'; input.id = `quiz-alt-${indice}`;
            const label = document.createElement('label'); label.htmlFor = input.id; label.textContent = texto;
            const escolher = () => {
                if (respondido) return;
                respostaSelecionada = indice; input.checked = true;
                alternativas.querySelectorAll('.alternativa').forEach((item) => item.classList.remove('selecionada'));
                wrapper.classList.add('selecionada'); atualizarBotoes();
            };
            wrapper.addEventListener('click', escolher); input.addEventListener('change', escolher);
            wrapper.append(input, label); alternativas.appendChild(wrapper);
        });
        atualizarBotoes();
    }

    function confirmarResposta() {
        if (respondido || respostaSelecionada === null) return;
        const atual = obterPerguntaAtual();
        const correta = respostaSelecionada === atual.resposta;
        respondido = true;
        if (correta) sessao.acertos++;
        alternativas.querySelectorAll('.alternativa').forEach((opcao, indice) => {
            opcao.classList.add('desabilitada'); opcao.querySelector('input').disabled = true;
            if (indice === atual.resposta) opcao.classList.add('correta');
            if (indice === respostaSelecionada && !correta) opcao.classList.add('errada');
        });
        feedback.hidden = false;
        feedback.textContent = correta ? 'Resposta correta! Muito bem.' : `Resposta incorreta. A alternativa correta e: ${atual.alternativas[atual.resposta]}`;
        sessao.indice++;
        atualizarBotoes();
    }

    function continuar() {
        if (sessao.indice >= sessao.fila.length) return mostrarResultado(true);
        if (sessao.indice % 20 === 0) {
            const nivel = sessao.indice / 20;
            const deseja = window.confirm(`Voce concluiu o nivel ${nivel}. Deseja continuar no nivel ${nivel + 1}?`);
            if (!deseja) return parar();
        }
        renderizarPergunta();
    }

    async function parar() {
        await salvarSessaoFinal();
        if (usuario?.google_id && rankingPermitido) await salvarNoRanking(true);
        mostrarResultado(false);
    }

    /* function mostrarResultado(completo) {
        quizCard.hidden = true; resultadoCard.hidden = false;
        pontuacao.textContent = `${sessao.acertos} acertos`;
        mensagemResultado.textContent = completo ? 'Parabens! Voce concluiu todas as perguntas.' : `Voce parou no nivel ${Math.floor(sessao.indice / 20) + 1}. Sua pontuacao foi salva.`;
        if (completo) { sessao.finalizada = true; salvarSessaoFinal(); }
        atualizarPainelRanking();
    } */
   /* function mostrarResultado(completo) {
    quizCard.hidden = true; 
    resultadoCard.hidden = false;
    
    // Atualiza a pontuação
    pontuacao.textContent = `${sessao.acertos} acertos`;

    // Mensagem informativa
    mensagemResultado.textContent = completo 
        ? 'Parabéns! Você concluiu todas as perguntas.' 
        : `Você parou no nível ${Math.floor(sessao.indice / 20) + 1}.`;

    // Se estiver completo, garante que o estado no servidor reflita isso
    if (completo && !sessao.finalizada) { 
        sessao.finalizada = true; 
        salvarSessaoFinal(); 
        registrarVitoriaQuizSolo();
    }

    // --- CONTROLE DE BOTÕES ---
    // Ajuste aqui os IDs conforme o que você tem no seu HTML
    const btnContinuar = document.getElementById('quizContinuar'); // Botão para voltar ao jogo
    const btnReiniciar = document.getElementById('quizReiniciar'); // Botão para zerar tudo
    const btnHome = document.getElementById('fecharQuiz');       // Botão para voltar a home

    if (btnContinuar) {
        // Só permite continuar se o jogo NÃO estiver finalizado
        btnContinuar.hidden = completo;
    }

    if (btnReiniciar) {
        btnReiniciar.hidden = false; // Sempre disponível
    }

    if (btnHome) {
        btnHome.hidden = false; // Sempre disponível
    }

    atualizarPainelRanking();
} */
function mostrarResultado(completo) {
    quizCard.hidden = true; 
    resultadoCard.hidden = false;
    
    // Atualiza a pontuação
    pontuacao.textContent = `${sessao.acertos} acertos`;

    // Mensagem informativa
    mensagemResultado.textContent = completo 
        ? 'Parabéns! Você concluiu todas as perguntas.' 
        : `Você parou no nível ${Math.floor(sessao.indice / 20) + 1}.`;

    // Se estiver completo, garante que o estado no servidor reflita isso
    if (completo && !sessao.finalizada) { 
        sessao.finalizada = true; 
        salvarSessaoFinal(); 
    }

    // --- CONTROLE DE BOTÕES ---
    const btnContinuar = document.getElementById('quizContinuar'); // Botão criado no HTML
    const btnReiniciar = document.getElementById('quizReiniciar');
    const btnHome = document.getElementById('fecharQuiz');       // Botão que volta para a home

    // 1. Botão Continuar: Só aparece se o jogo NÃO estiver completo
    if (btnContinuar) {
        btnContinuar.hidden = completo;
    }

    // 2. Botão Reiniciar: Sempre disponível
    if (btnReiniciar) {
        btnReiniciar.hidden = false;
        // Opcional: altera o texto para ficar mais intuitivo
        btnReiniciar.textContent = completo ? 'Jogar novamente' : 'Reiniciar Quiz';
    }

    // 3. Botão Home: Sempre disponível
    if (btnHome) {
        btnHome.hidden = false;
    }

    atualizarPainelRanking();
}

    // Mostra o termo de consentimento so para quem esta logado e ainda nao autorizou o ranking.
    /* function atualizarPainelRanking() {
        const logado = Boolean(usuario?.google_id);
        if (sairRanking) sairRanking.hidden = !logado || !rankingSalvo;
        if (entrarRanking) entrarRanking.hidden = logado;
        // A publicação só é exibida após login e consentimento explícito.
        // O checkbox do termo salva a permissão ao ser marcado.
        salvarRanking.hidden = !logado || !rankingPermitido;
        salvarRanking.disabled = !logado;
        salvarRanking.textContent = !logado ? 'Entre com Google para aparecer no ranking' : rankingSalvo ? 'Pontuacao publicada' : 'Salvar preferencia e pontuacao';
        retirarRanking.hidden = !logado || !rankingSalvo;
        permitirRanking.checked = rankingPermitido;
        permitirRanking.disabled = !logado;
        if (consentimentoRanking) consentimentoRanking.hidden = !logado || rankingPermitido;
    } */
    function atualizarPainelRanking() {
        const logado = Boolean(usuario?.google_id);

        // 1. Controle de botões de sair/entrar do ranking
        if (sairRanking) sairRanking.hidden = !logado || !rankingSalvo;
        if (entrarRanking) entrarRanking.hidden = logado;

        // 2. Lógica do botão "Salvar/Permitir"
        // O botão só aparece se o usuário está logado E ainda não permitiu,
        // E o checkbox (permitirRanking) estiver marcado.
        const podeSalvar = logado && !rankingPermitido && permitirRanking.checked;

        salvarRanking.hidden = !logado || rankingPermitido || !permitirRanking.checked;
        salvarRanking.disabled = !podeSalvar;
        salvarRanking.textContent = 'Publicar no ranking';

        // 3. Botão de retirar do ranking
        retirarRanking.hidden = !logado || !rankingSalvo;

        // 4. Checkbox e Termo (esconde se já permitiu)
        permitirRanking.disabled = !logado || rankingPermitido;
        if (consentimentoRanking) consentimentoRanking.hidden = !logado || rankingPermitido;
    }

    /* async function salvarNoRanking(automatico = false) {
        if (!usuario?.google_id) return mostrarToast('Entre com Google para salvar sua pontuacao no ranking.', 'erro');
        const permitir = automatico ? rankingPermitido : permitirRanking.checked;
        salvarRanking.disabled = true;
        await salvarSessaoFinal();
        const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/ranking`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_id: usuario.google_id, acertos: sessao.acertos, desafio_id: sessao.desafio_id, permitir })
        });
        if (!resposta.ok) {
            salvarRanking.disabled = false;
            return mostrarToast('Nao foi possivel salvar a preferencia agora.', 'erro');
        }
        rankingPermitido = permitir;
        rankingSalvo = permitir;
        atualizarPainelRanking();
        await window.carregarRankingQuiz?.();
    } */
    async function salvarNoRanking() {
        if (!usuario?.google_id) return mostrarToast('Entre com Google para salvar sua pontuacao no ranking.', 'erro');

        const permitir = permitirRanking.checked;
        salvarRanking.disabled = true;

        await salvarSessaoFinal();

        const ok = await window.salvarPreferenciaRankingQuiz?.({
            google_id: usuario.google_id,
            acertos: sessao.acertos,
            desafio_id: sessao.desafio_id,
            permitir
        });

        if (!ok) {
            salvarRanking.disabled = false;
            return mostrarToast('Nao foi possivel publicar no ranking agora.', 'erro');
        }

        rankingPermitido = true;
        rankingSalvo = true;

        mostrarToast('Publicado no ranking com sucesso!', 'sucesso');
        atualizarPainelRanking();
        await window.carregarRankingQuiz?.();
    }

    async function apagarRanking() {
        if (!usuario?.google_id) return;
        const ok = await window.retirarRankingQuiz?.({
            google_id: usuario.google_id,
            desafio_id: sessao?.desafio_id || null
        });

        if (!ok) {
            console.warn('Não foi possível remover o registro do ranking do usuário.');
            return;
        }

        rankingPermitido = false;
        rankingSalvo = false;
        atualizarPainelRanking();
        await window.carregarRankingQuiz?.();
    }

    async function retirarDoRanking() {
        if (!usuario?.google_id || !window.confirm('Retirar seu nome, avatar e pontuacao do ranking?')) return;
        await apagarRanking();
        salvarRanking.disabled = false;
        salvarRanking.textContent = 'Salvar preferencia e pontuacao';
        permitirRanking.checked = false;
        permitirRanking.disabled = false;
        if (consentimentoRanking) consentimentoRanking.hidden = false;
    }

    async function iniciarDesafio() {
        if (!usuario?.google_id) return mostrarToast('Entre com Google para criar um desafio.', 'erro');
        const perguntasDesafio = embaralharQuiz(perguntas.map((item) => item.id)).slice(0, 15);
        try {
            const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/desafios`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_id: usuario.google_id, perguntas_ids: perguntasDesafio })
            });
            if (!resposta.ok) throw new Error('Falha ao criar desafio - Desafio ativo');
            const dados = await resposta.json();
            window.mostrarQuizDesafio(dados.id);
        } catch (erro) {
            mostrarToast('Nao foi possivel iniciar o desafio: ' + erro.message, 'erro');
        }
    }

    async function iniciarQuizSolo() {
        if (iniciado) return;
        iniciado = true;
        try {
            const resposta = await fetch('biblias/quiz/quiz.json');
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao carregar as perguntas do quiz.`);
            const dados = await resposta.json(); perguntas = dados.quiz?.perguntas || [];
            if (!perguntas.length) throw new Error('Nenhuma pergunta encontrada.');
            usuario = obterUsuarioQuiz();
            await carregarPreferenciaRanking();

            // Tenta restaurar progresso salvo no servidor (solo)
            if (usuario?.google_id) {
                try {
                    const res = await fetch(`${API_URL_QUIZ}/api/quiz/sessao?google_id=${encodeURIComponent(usuario.google_id)}&desafio_id=`);
                    if (res.ok) {
                        const saved = await res.json();
                        if (saved && Array.isArray(saved.fila) && saved.fila.length) {
                            const filaValida = saved.fila.filter(id => perguntas.some(p => String(p.id) === String(id)));
                            if (filaValida.length) {
                                sessao = {
                                    fila: filaValida,
                                    indice: Math.min(Number(saved.indice) || 0, filaValida.length),
                                    acertos: saved.acertos || 0,
                                    desafio_id: saved.desafio_id || null,
                                    finalizada: Boolean(saved.finalizada)
                                };

                                // CORREÇÃO: Não forçamos o mostrarResultado aqui.
                                // Se estiver finalizada, deixamos o fluxo seguir para a tela de opções (mostrarResultado).
                                // Se não estiver, renderizamos a pergunta onde parou.
                                if (sessao.finalizada || sessao.indice >= sessao.fila.length) {
                                    return mostrarResultado(true);
                                }

                                renderizarPergunta();
                                return;
                            }
                        }
                    }
                } catch (e) { /* sem servidor - novo quiz */ }
            }

            sessao = sessaoInicial();
            renderizarPergunta();
        } catch (erro) {
            iniciado = false;
            pergunta.textContent = 'Nao foi possivel carregar as perguntas do quiz.';
            console.error(erro);
        }
    }

    confirmar.addEventListener('click', confirmarResposta);
    proxima.addEventListener('click', continuar);
    pausar.addEventListener('click', parar);
    criarDesafio.addEventListener('click', iniciarDesafio);
    salvarRanking.addEventListener('click', () => salvarNoRanking(false));
    retirarRanking.addEventListener('click', retirarDoRanking);
    entrarRanking?.addEventListener('click', () => document.getElementById('googleSignInButton')?.click());
    sairRanking?.addEventListener('click', retirarDoRanking);
    /* permitirRanking.addEventListener('change', () => {
        if (permitirRanking.checked) salvarNoRanking(false);
    }); */
    permitirRanking.addEventListener('change', () => {
        atualizarPainelRanking();
    });
    fechar?.addEventListener('click', () => window.mostrarHome());
    /* reiniciar.addEventListener('click', async () => {
        if (!window.confirm('O jogo sera reiniciado e sua pontuacao ficara zerada. Deseja continuar?')) return;
        await apagarRanking();
        sessao = sessaoInicial(sessao.fila, sessao.desafio_id);
        resultadoCard.hidden = true; quizCard.hidden = false; renderizarPergunta();
    }); */
    reiniciar.addEventListener('click', async () => {
    if (!window.confirm('O jogo sera reiniciado e sua pontuacao ficara zerada. Deseja continuar?')) return;

    // 1. Apaga ranking se houver
    await apagarRanking();

    // 2. Cria uma nova sessão (nova fila e índices zerados)
    // Usamos sessao.desafio_id para manter o contexto caso fosse um desafio (embora no solo seja null)
    sessao = sessaoInicial(undefined, sessao.desafio_id); 

    // 3. SALVA O ESTADO ZERADO NO SERVIDOR imediatamente
    // Isso é crucial para que, ao fechar e abrir, não volte o progresso antigo
    await salvarSessaoFinal();

    // 4. Atualiza a interface
    resultadoCard.hidden = true; 
    quizCard.hidden = false; 
    renderizarPergunta();
});
    window.addEventListener('adoraplay:login', async (evento) => {
        usuario = evento.detail;
        rankingPermitido = false;
        rankingSalvo = false;
        atualizarPainelRanking();
        await carregarPreferenciaRanking();
        atualizarPainelRanking();
    });
    window.addEventListener('adoraplay:logout', () => {
        usuario = null;
        rankingPermitido = false;
        rankingSalvo = false;
        atualizarPainelRanking();
    });

    window.mostrarQuiz = function mostrarQuiz() {
        window.navegarPorRota?.('/quiz');
        document.getElementById('gamificacaoSection')?.style.setProperty('display', 'none');
        if (homeSection) homeSection.style.display = 'none';
        if (bibliotecaSection) bibliotecaSection.style.display = 'none';
        if (bibliaSection) bibliaSection.style.display = 'none';
        if (quizDesafioSection) quizDesafioSection.style.display = 'none';
        if (window.desafiosSection) window.desafiosSection.style.display = 'none';
        if (quizSection) quizSection.style.display = 'grid';
        // Garante que o cartão de pergunta esteja visível ao entrar
    const quizCard = document.getElementById('quizCardPergunta');
    if (quizCard) quizCard.hidden = false;
    
    // Garante que o resultado esteja escondido
    const resultadoCard = document.getElementById('quizResultado');
    if (resultadoCard) resultadoCard.hidden = true;
        iniciarQuizSolo();
    };
})();

// ===========================================================================
// QUIZ DESAFIO (partida entre dois jogadores)
// ===========================================================================
(function () {
    const $ = (id) => document.getElementById(id);
    const aguardando = $('desafioAguardando');
    const jogo = $('desafioJogo');
    const resultado = $('desafioResultado');
    const aceitar = $('desafioAceitar');
    const cancelar = $('desafioCancelar');
    const confirmar = $('desafioConfirmar');
    const proxima = $('desafioProxima');
    const cronometro = $('desafioCronometro');
    const progresso = $('desafioProgresso');
    const pergunta = $('desafioPergunta');
    const alternativas = $('desafioAlternativas');
    const feedback = $('desafioFeedback');
    const pontuacao = $('desafioPontuacao');
    const mensagemResultado = $('desafioMensagemResultado');
    const mensagemAguardando = $('desafioMensagemAguardando');
    const fechar = $('fecharQuizDesafio');

    if (!jogo) return;

    let usuario = obterUsuarioQuiz();
    let desafioId = null;
    let desafio = null;
    let sessao = null;
    let respostaSelecionada = null;
    let respondido = false;
    let segundos = 60;
    let timer = null;
    let aceitarDepoisDoLogin = false;
    let desafioAnulado = false;

    function formatarTempo(valor) {
        return `00:${String(Math.max(0, valor)).padStart(2, '0')}`;
    }

    function iniciarCronometro() {
        clearInterval(timer);
        segundos = 60;
        cronometro.textContent = formatarTempo(segundos);
        cronometro.classList.remove('urgente');
        timer = window.setInterval(() => {
            segundos--;
            cronometro.textContent = formatarTempo(segundos);
            if (segundos <= 10) cronometro.classList.add('urgente');
            if (segundos <= 0) {
                clearInterval(timer);
                terminarPorTempo();
            }
        }, 1000);
    }

    function limparCronometro() {
        clearInterval(timer);
        timer = null;
    }

    // Grava o progresso no banco apenas quando o desafio e finalizado, nunca a cada pergunta.
    async function salvarProgressoFinal() {
        try {
            const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}/progresso`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_id: usuario.google_id,
                    fila: desafio.perguntas_ids,
                    indice: sessao.indice,
                    acertos: sessao.acertos,
                    finalizada: true
                })
            });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const dados = await resposta.json().catch(() => null);
            if (dados?.status) desafio.status = dados.status;
            if (dados?.desafiante_pontuacao !== undefined) desafio.desafiante_pontuacao = dados.desafiante_pontuacao;
            if (dados?.desafiado_pontuacao !== undefined) desafio.desafiado_pontuacao = dados.desafiado_pontuacao;
            sessao.finalizada = true;
        } catch (erro) {
            console.warn('Nao foi possivel salvar sua pontuacao final do desafio:', erro.message);
            mostrarToast('Sua pontuacao pode nao ter sido salva. Verifique sua conexao.', 'erro');
        }
    }

    function desabilitarAlternativas() {
        alternativas.querySelectorAll('input').forEach((input) => { input.disabled = true; });
        alternativas.querySelectorAll('.alternativa').forEach((item) => item.classList.add('desabilitada'));
    }

    function exibirCompartilhamento() {
        const areaCompartilhar = $('desafioCompartilharDesafio');
        const inputLink = $('desafioLinkDesafio');
        const btnZap = $('desafioShareWhatsApp');
        const btnFacebook = $('desafioShareFacebook');
        const btnNativo = $('desafioShareNativo');
        const btnCopiar = $('desafioBtnCopiarLink');
        if (!areaCompartilhar) return;

        const link = `https://share.adoraplay.com.br/compartilhar-desafio?desafio=${encodeURIComponent(desafioId)}&v=${Date.now()}`;
        const texto = `Desafio voce a superar meus ${sessao.acertos} pontos no Quiz Biblico AdoraPlay! Acesse: `;

        areaCompartilhar.hidden = false;
        inputLink.value = link;
        btnZap.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto + link)}`;
        if (btnFacebook) {
            btnFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        }

        btnCopiar.onclick = () => {
            inputLink.select();
            navigator.clipboard?.writeText(link).catch(() => document.execCommand('copy'));
            btnCopiar.textContent = 'Copiado!';
            window.setTimeout(() => { btnCopiar.textContent = 'Copiar'; }, 2000);
        };

        if (navigator.share) {
            btnNativo.hidden = false;
            btnNativo.onclick = () => navigator.share({ title: 'Desafio Biblico', text: texto, url: link });
        } else {
            btnNativo.hidden = true;
        }
    }

    async function mostrarResultado() {
        limparCronometro();
        jogo.hidden = true;
        resultado.hidden = false;
        pontuacao.textContent = `${sessao.acertos} acertos`;

        // Busca o status mais recente no servidor, pois o outro participante pode ja ter finalizado.
        try {
            const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}`);
            if (resposta.ok) {
                const dadosAtualizados = await resposta.json();
                const statusFinalConfirmado = desafio.status === 'finalizado' || desafio.status === 'concluido';
                desafio = { ...desafio, ...dadosAtualizados };
                if (statusFinalConfirmado) desafio.status = 'finalizado';
            }
        } catch (erro) {
            console.warn('Nao foi possivel atualizar o status do desafio:', erro.message);
        }

        const souDesafiante = usuario?.google_id === desafio.desafiante_id;

        if (desafio.status === 'finalizado' || desafio.status === 'concluido') {
            const nomeDesafiante = desafio.desafiante_nome || 'Desafiante';
            const nomeDesafiado = desafio.desafiado_nome || 'Desafiado';
            mensagemResultado.textContent = `Resultado final: ${nomeDesafiante} ${desafio.desafiante_pontuacao ?? 0} x ${desafio.desafiado_pontuacao ?? 0} ${nomeDesafiado}`;
        } else if (souDesafiante) {
            mensagemResultado.textContent = 'Sua pontuacao foi registrada! Agora compartilhe o desafio com um amigo.';
            exibirCompartilhamento();
        } else {
            mensagemResultado.textContent = 'Sua parte foi salva. Aguarde o outro participante concluir.';
        }

        await window.carregarRankingQuiz?.();
        if (desafio.status === 'finalizado' || desafio.status === 'concluido') {
            window.setTimeout(() => window.mostrarHome?.(), 1200);
        }
    }

    async function avancar() {
        if (sessao.indice >= desafio.perguntas_ids.length) {
            await salvarProgressoFinal();
            await mostrarResultado();
            return;
        }
        renderizarPergunta();
    }

    function terminarPorTempo() {
        if (respondido) return;
        respondido = true;
        desabilitarAlternativas();
        feedback.hidden = false;
        feedback.textContent = 'O tempo acabou. Esta pergunta nao pode mais ser respondida. Clique em proxima para continuar.';
        sessao.indice++;
        atualizarBotoes();
    }

    function confirmarResposta() {
        if (respondido || respostaSelecionada === null) return;
        limparCronometro();
        const atual = desafio.perguntas[sessao.indice];
        const correta = respostaSelecionada === atual.resposta;
        respondido = true;
        if (correta) sessao.acertos++;
        alternativas.querySelectorAll('.alternativa').forEach((opcao, indice) => {
            opcao.querySelector('input').disabled = true;
            opcao.classList.add('desabilitada');
            if (indice === atual.resposta) opcao.classList.add('correta');
            if (indice === respostaSelecionada && !correta) opcao.classList.add('errada');
        });
        feedback.hidden = false;
        feedback.textContent = correta ? 'Resposta correta! Muito bem.' : `Resposta incorreta. A alternativa correta e: ${atual.alternativas[atual.resposta]}`;
        sessao.indice++;
        atualizarBotoes();
    }

    function atualizarBotoes() {
        confirmar.hidden = respondido;
        proxima.hidden = !respondido;
        confirmar.disabled = respostaSelecionada === null || respondido;
    }

    function renderizarPergunta() {
        const indicePergunta = sessao.indice;
        const atual = desafio.perguntas[indicePergunta];
        if (!atual) return mostrarResultado();
        respondido = false;
        respostaSelecionada = null;
        feedback.hidden = true;
        feedback.textContent = '';
        progresso.textContent = `Pergunta ${indicePergunta + 1} de 15`;
        pergunta.textContent = atual.pergunta;
        alternativas.innerHTML = '';
        atual.alternativas.forEach((texto, indice) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'alternativa';
            const input = document.createElement('input');
            input.type = 'radio'; input.name = 'desafio-alternativa'; input.id = `desafio-alt-${indice}`;
            const label = document.createElement('label'); label.htmlFor = input.id; label.textContent = texto;
            const escolher = () => {
                if (respondido) return;
                respostaSelecionada = indice; input.checked = true;
                alternativas.querySelectorAll('.alternativa').forEach((item) => item.classList.remove('selecionada'));
                wrapper.classList.add('selecionada'); atualizarBotoes();
            };
            wrapper.addEventListener('click', escolher); input.addEventListener('change', escolher);
            wrapper.append(input, label); alternativas.appendChild(wrapper);
        });
        atualizarBotoes();
        iniciarCronometro();
    }

    function iniciarSessaoDesafio() {
        sessao = { fila: desafio.perguntas_ids, indice: 0, acertos: 0 };
        jogo.hidden = false;
        aguardando.hidden = true;
        renderizarPergunta();
    }

    function dadosAnulacao() {
        return JSON.stringify({ google_id: usuario?.google_id });
    }

    function anularDesafioAoSair() {
        if (desafioAnulado || !desafioId || !usuario?.google_id || desafio?.status !== 'aceito' || sessao?.finalizada) return;
        desafioAnulado = true;
        const url = `${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}/anular`;
        const dados = dadosAnulacao();
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([dados], { type: 'application/json' }));
            return;
        }
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: dados,
            keepalive: true
        }).catch(() => {});
    }

    async function anularDesafioAtual() {
        if (desafioAnulado || !desafioId || !usuario?.google_id || desafio?.status !== 'aceito' || sessao?.finalizada) return true;
        desafioAnulado = true;
        limparCronometro();
        try {
            const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}/anular`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dadosAnulacao()
            });
            return resposta.ok;
        } catch (erro) {
            console.warn('Não foi possível anular o desafio:', erro.message);
            return false;
        }
    }

    async function aceitarDesafioAtual() {
        if (!desafioId) return;
        if (!usuario?.google_id) {
            aceitarDepoisDoLogin = true;
            document.getElementById('googleSignInButton')?.click();
            return;
        }
        const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}/aceitar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_id: usuario.google_id })
        });
        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => null);
            const mensagem = dados?.error || 'Este desafio já foi aceito ou não está disponível.';
            mostrarToast(`${mensagem} A lista será atualizada.`, 'erro');
            await window.carregarRankingQuiz?.();
            return carregar();
        }
        desafio = await resposta.json();
        desafio.perguntas = await carregarPerguntas();
        iniciarSessaoDesafio();
    }

    async function carregarPerguntas() {
        const resposta = await fetch('biblias/quiz/quiz.json');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao carregar as perguntas do desafio.`);
        const dados = await resposta.json();
        const porId = new Map((dados.quiz?.perguntas || []).map((item) => [String(item.id), item]));
        return desafio.perguntas_ids.map((id) => porId.get(String(id))).filter(Boolean);
    }

    async function carregar() {
        if (!desafioId) throw new Error('ID do desafio ausente.');
        const resposta = await fetch(`${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}`);
        if (!resposta.ok) throw new Error('Desafio nao encontrado.');
        desafio = await resposta.json();
        desafio.perguntas = await carregarPerguntas();
        const souDesafiante = usuario?.google_id === desafio.desafiante_id;
        const souDesafiado = usuario?.google_id === desafio.desafiado_id;
        if (souDesafiante || souDesafiado) {
            const podeCancelar = souDesafiante && desafio.status === 'pendente';
            const podeDesistir = souDesafiado && desafio.status === 'aceito';
            cancelar.hidden = !podeCancelar && !podeDesistir;
            cancelar.textContent = podeDesistir ? 'Desistir' : 'Cancelar desafio';
            // Impede jogar novamente: se o desafio ja terminou ou este participante ja enviou sua pontuacao final.
            if (desafio.status === 'finalizado' || desafio.status === 'concluido') {
                sessao = { fila: desafio.perguntas_ids, indice: desafio.perguntas_ids.length, acertos: souDesafiante ? (desafio.desafiante_pontuacao || 0) : (desafio.desafiado_pontuacao || 0), finalizada: true };
                return mostrarResultado();
            }
            const progressoSalvo = await fetch(`${API_URL_QUIZ}/api/quiz/sessao?google_id=${encodeURIComponent(usuario.google_id)}&desafio_id=${encodeURIComponent(desafioId)}`)
                .then((r) => (r.ok ? r.json() : null)).catch(() => null);
            if (progressoSalvo && Array.isArray(progressoSalvo.fila)) {
                sessao = {
                    fila: desafio.perguntas_ids,
                    indice: Math.min(Number(progressoSalvo.indice) || 0, desafio.perguntas_ids.length),
                    acertos: Number(progressoSalvo.acertos) || 0
                };
                if (progressoSalvo.finalizada || sessao.indice >= desafio.perguntas_ids.length) return mostrarResultado();
                jogo.hidden = false;
                aguardando.hidden = true;
                return renderizarPergunta();
            }
            return iniciarSessaoDesafio();
        }
        aguardando.hidden = false;
        mensagemAguardando.textContent = usuario?.google_id ? 'Aceite o desafio para iniciar suas 15 perguntas.' : 'Entre com Google para aceitar este desafio.';
        aceitar.textContent = usuario?.google_id ? 'Aceitar desafio' : 'Entrar e aceitar desafio';
    }

    aceitar.addEventListener('click', aceitarDesafioAtual);
    confirmar.addEventListener('click', confirmarResposta);
    proxima.addEventListener('click', avancar);
    fechar?.addEventListener('click', async () => {
        await anularDesafioAtual();
        window.mostrarHome();
    });
    cancelar.addEventListener('click', async () => {
        const souDesafiado = usuario?.google_id === desafio?.desafiado_id;
        const mensagem = souDesafiado
            ? 'Deseja desistir deste desafio? O jogo será anulado e ficará pendente novamente.'
            : 'Deseja cancelar este desafio?';
        if (!window.confirm(mensagem)) return;
        if (souDesafiado) {
            await anularDesafioAtual();
        } else {
            limparCronometro();
            await fetch(`${API_URL_QUIZ}/api/quiz/desafios/${encodeURIComponent(desafioId)}/cancelar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_id: usuario.google_id })
            });
        }
        window.mostrarHome();
    });
    window.addEventListener('pagehide', anularDesafioAoSair);
    window.addEventListener('adoraplay:login', async (evento) => {
        usuario = evento.detail;
        if (aceitarDepoisDoLogin) {
            aceitarDepoisDoLogin = false;
            await aceitarDesafioAtual();
        }
    });
    window.addEventListener('adoraplay:logout', () => {
        usuario = null;
        if (aguardando && !aguardando.hidden) {
            mensagemAguardando.textContent = 'Entre com Google para aceitar este desafio.';
            aceitar.textContent = 'Entrar e aceitar desafio';
        }
    });

    window.pararTimerQuizDesafio = limparCronometro;

    window.mostrarQuizDesafio = function mostrarQuizDesafio(id) {
        if (id) window.navegarPorRota?.(`/desafio/${encodeURIComponent(id)}`);
        document.getElementById('gamificacaoSection')?.style.setProperty('display', 'none');
        if (homeSection) homeSection.style.display = 'none';
        if (bibliotecaSection) bibliotecaSection.style.display = 'none';
        if (bibliaSection) bibliaSection.style.display = 'none';
        if (quizSection) quizSection.style.display = 'none';
        if (window.desafiosSection) window.desafiosSection.style.display = 'none';
        if (quizDesafioSection) quizDesafioSection.style.display = 'grid';
        if (desafioId === id) return;
        desafioId = id;
        desafioAnulado = false;
        aguardando.hidden = true; jogo.hidden = true; resultado.hidden = true;
        carregar().catch((erro) => {
            aguardando.hidden = false;
            mensagemAguardando.textContent = erro.message;
            aceitar.hidden = true;
        });
    };
})();
