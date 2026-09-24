(function () {
    const API_URL = 'https://adoraplay-api.digiartesai.workers.dev';
    const section = document.getElementById('gamificacaoSection');
    const lista = document.getElementById('listaMissoesGamificacao');
    const totalPontos = document.getElementById('gamificacaoTotalPontos');
    const nivel = document.getElementById('gamificacaoNivel');
    const nivelTexto = document.getElementById('gamificacaoNivelTexto');
    const proximoNivel = document.getElementById('gamificacaoProximoNivel');
    const barraNivel = document.getElementById('gamificacaoBarraNivel');
    const pontosQuiz = document.getElementById('gamificacaoPontosQuiz');
    const missoesConcluidas = document.getElementById('gamificacaoMissoesConcluidas');
    const diasConcluidos = document.getElementById('gamificacaoDiasConcluidos');
    const mensagem = document.getElementById('gamificacaoMensagem');

    if (!section || !lista) return;

    let painelAtual = null;
    let timerMissao = null;
    let missaoTimerAtual = null;
    const timerElement = document.getElementById('missaoLeituraTimer');
    const timerTitulo = document.getElementById('missaoLeituraTitulo');
    const timerTempo = document.getElementById('missaoLeituraTempo');
    const timerBotao = document.getElementById('finalizarLeituraMissao');
    const leitorMissao = document.getElementById('leituraMissaoGamificacao');
    let mostrarAtrasadas = false;

    function dataLocalISO(data = new Date()) {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(data);
        const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
        return `${valores.year}-${valores.month}-${valores.day}`;
    }

    function diaDoPlano(inicioPlano) {
        if (!inicioPlano) return 1;
        const textoInicio = String(inicioPlano);
        const dataInicio = /^\d{4}-\d{2}-\d{2}$/.test(textoInicio)
            ? textoInicio
            : dataLocalISO(new Date(`${textoInicio.replace(' ', 'T')}Z`));
        const [ano, mes, dia] = dataInicio.split('-').map(Number);
        const [anoHoje, mesHoje, diaHoje] = dataLocalISO().split('-').map(Number);
        const inicioUTC = Date.UTC(ano, mes - 1, dia);
        const hojeUTC = Date.UTC(anoHoje, mesHoje - 1, diaHoje);
        return Math.max(1, Math.floor((hojeUTC - inicioUTC) / 86400000) + 1);
    }

    function usuarioAtual() {
        try { return JSON.parse(localStorage.getItem('adoraplayGoogleUser')); } catch { return null; }
    }

    function chaveInicioPlano() {
        const usuario = usuarioAtual();
        return usuario?.google_id ? `adoraplayPlanoBibliaInicio:${usuario.google_id}` : null;
    }

    function inicioPlanoLocal() {
        const chave = chaveInicioPlano();
        return chave ? localStorage.getItem(chave) : null;
    }

    function escapar(valor) {
        return String(valor || '').replace(/[&<>"']/g, (caractere) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[caractere]));
    }

    function normalizarLivro(livro) {
        const normalizado = String(livro || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '');
        const aliases = {
            proneverbios: 'proverbios',
            cantares: 'canticos',
            genesis: 'gn'
        };
        return aliases[normalizado] || normalizado;
    }

    function formatarTempoMissao(segundos) {
        const minutos = Math.floor(Math.max(0, segundos) / 60);
        const restantes = Math.max(0, segundos) % 60;
        return `${String(minutos).padStart(2, '0')}:${String(restantes).padStart(2, '0')}`;
    }

    function pararTimerMissao() {
        window.clearInterval(timerMissao);
        timerMissao = null;
        missaoTimerAtual = null;
        if (timerElement) timerElement.hidden = true;
        if (timerBotao) {
            timerBotao.disabled = true;
            timerBotao.textContent = 'Aguardando tempo';
        }
    }

    window.iniciarTimerMissaoBiblia = function iniciarTimerMissaoBiblia({ idMissao, minutos, titulo } = {}) {
        if (!idMissao || missaoTimerAtual?.idMissao === idMissao) return;
        pararTimerMissao();
        missaoTimerAtual = { idMissao, segundos: Math.max(1, Number(minutos) || 1) * 60 };
        timerTitulo.textContent = titulo || 'Missão de leitura';
        timerTempo.textContent = formatarTempoMissao(missaoTimerAtual.segundos);
        timerBotao.disabled = true;
        timerBotao.textContent = 'Aguardando tempo';
        timerElement.hidden = false;
        timerMissao = window.setInterval(() => {
            missaoTimerAtual.segundos -= 1;
            timerTempo.textContent = formatarTempoMissao(missaoTimerAtual.segundos);
            if (missaoTimerAtual.segundos > 0) return;
            window.clearInterval(timerMissao);
            timerMissao = null;
            missaoTimerAtual.segundos = 0;
            timerBotao.disabled = false;
            timerBotao.textContent = 'Finalizar leitura';
        }, 1000);
    };

    timerBotao?.addEventListener('click', () => {
        if (missaoTimerAtual?.segundos === 0) {
            window.concluirMissaoGamificacao(missaoTimerAtual.idMissao);
        }
    });

    function renderizarPainel() {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) {
            mensagem.textContent = 'Entre com Google para acompanhar seus pontos e missões.';
            lista.innerHTML = `
                <div class="gamificacao-login-aviso">
                    <strong>Faça login para participar</strong>
                    <p>Entre com Google para acumular XP, concluir missões diárias e acompanhar seu nível.</p>
                    <button type="button" class="btn principal" onclick="document.getElementById('googleSignInButton')?.click()">
                        Entrar com Google
                    </button>
                </div>`;
            totalPontos.textContent = '0';
            nivel.textContent = '0';
            nivelTexto.textContent = 'Nível 0';
            proximoNivel.textContent = 'Entre com Google para evoluir';
            barraNivel.style.width = '0%';
            pontosQuiz.textContent = '0';
            missoesConcluidas.textContent = '0';
            diasConcluidos.textContent = '0';
            return;
        }

        const resumo = painelAtual?.resumo || {};
        totalPontos.textContent = resumo.total_pontos || 0;
        const nivelAtual = Number(resumo.nivel) || 0;
        nivel.textContent = `${nivelAtual}/${resumo.nivel_maximo || 99}`;
        nivelTexto.textContent = `Nível ${nivelAtual}`;
        const pontosTotais = Number(resumo.total_pontos) || 0;
        const pontosNivelAtual = Number(resumo.pontos_nivel_atual) || 0;
        const pontosProximoNivel = Number(resumo.pontos_proximo_nivel);
        proximoNivel.textContent = resumo.pontos_proximo_nivel === null || !Number.isFinite(pontosProximoNivel)
            ? 'Nível máximo alcançado'
            : `${Math.max(0, pontosTotais - pontosNivelAtual)} / ${pontosProximoNivel - pontosNivelAtual} XP para o nível ${nivelAtual + 1}`;
        const progressoNivel = Number(resumo.progresso_nivel);
        barraNivel.style.width = `${Number.isFinite(progressoNivel) ? Math.min(100, Math.max(0, progressoNivel)) : 0}%`;
        pontosQuiz.textContent = resumo.pontos_quiz || 0;
        missoesConcluidas.textContent = resumo.missoes_concluidas || 0;
        diasConcluidos.textContent = resumo.dias_concluidos || 0;
        mensagem.textContent = 'As missões permanecem disponíveis até você concluí-las.';

        const missoes = painelAtual?.missoes || [];
        const diaAtual = diaDoPlano(painelAtual?.inicio_plano);
        const doDia = missoes.filter((missao) => Number(missao.dia) === diaAtual);
        const atrasadas = missoes.filter((missao) => Number(missao.dia) < diaAtual && !missao.concluida);
        const exibidas = mostrarAtrasadas ? atrasadas : doDia;
        const botaoAtrasadas = atrasadas.length
            ? `<button type="button" class="btn-acao-desafio" id="alternarMissoesAtrasadas">${mostrarAtrasadas ? 'Voltar para hoje' : `Missões atrasadas (${atrasadas.length})`}</button>`
            : '';
        const cards = exibidas.map((item) => `
                <article class="missao-gamificacao ${item.concluida ? 'is-concluida' : ''}">
                    <div>
                        <strong>${escapar(item.titulo)}</strong>
                        <small>${item.versiculos_estimados} versículos · ${Number(item.recompensa_bonus) || 0} pontos</small>
                    </div>
                    <div class="missao-acoes">
                        ${item.concluida
                            ? '<span class="missao-status">Concluída</span>'
                            : `<button type="button" class="link-button" onclick="window.abrirMissaoGamificacao('${escapar(item.livro)}', ${item.capitulo}, '${escapar(item.id_missao)}', ${Number(item.tempo_estimado_minutos) || 1}, '${escapar(item.titulo)}', false, ${Number(item.dia)})">Ler</button>`}
                    </div>
                </article>`).join('');
        lista.innerHTML = `${botaoAtrasadas}<section class="dia-gamificacao"><div class="dia-gamificacao-header"><h3>${mostrarAtrasadas ? 'Missões atrasadas' : `Missões do dia ${diaAtual}`}</h3><small>${exibidas.filter((item) => item.concluida).length}/${exibidas.length} concluídas</small></div>${cards || `<p class="empty-state">${mostrarAtrasadas ? 'Nenhuma missão atrasada.' : 'Nenhuma missão prevista para hoje.'}</p>`}</section>`;
        document.getElementById('alternarMissoesAtrasadas')?.addEventListener('click', () => {
            mostrarAtrasadas = !mostrarAtrasadas;
            renderizarPainel();
        });
    }

    async function carregarPainel() {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) {
            painelAtual = null;
            renderizarPainel();
            return;
        }
        try {
            const resposta = await fetch(`${API_URL}/api/gamificacao/painel?google_id=${encodeURIComponent(usuario.google_id)}&t=${Date.now()}`, { cache: 'no-store' });
            if (!resposta.ok) {
                const erroApi = await resposta.json().catch(() => null);
                throw new Error(erroApi?.error || `HTTP ${resposta.status}`);
            }
            painelAtual = await resposta.json();
            painelAtual.inicio_plano = painelAtual.inicio_plano || inicioPlanoLocal();
            renderizarPainel();
        } catch (erro) {
            mensagem.textContent = erro.message || 'Não foi possível carregar suas missões.';
            lista.innerHTML = '<p class="empty-state">A configuração das missões ainda não está disponível.</p>';
            console.warn('Erro ao carregar gamificação:', erro.message);
        }
    }

    window.mostrarGamificacao = function mostrarGamificacao() {
        if (typeof homeSection !== 'undefined' && homeSection) homeSection.style.display = 'none';
        if (typeof bibliotecaSection !== 'undefined' && bibliotecaSection) bibliotecaSection.style.display = 'none';
        if (typeof bibliaSection !== 'undefined' && bibliaSection) bibliaSection.style.display = 'none';
        if (window.quizSection) window.quizSection.style.display = 'none';
        if (window.quizDesafioSection) window.quizDesafioSection.style.display = 'none';
        if (window.desafiosSection) window.desafiosSection.style.display = 'none';
        section.style.display = 'grid';
        if (typeof navegarPorRota === 'function') navegarPorRota('/gamificacao');
        carregarPainel();
    };

    window.abrirMissaoGamificacao = function abrirMissaoGamificacao(livro, capitulo, idMissao, minutos, titulo, concluida, diaMissao) {
        if (!painelAtual?.inicio_plano && Number(diaMissao) === 1) {
            const inicio = dataLocalISO();
            const chave = chaveInicioPlano();
            if (chave) localStorage.setItem(chave, inicio);
            if (painelAtual) painelAtual.inicio_plano = inicio;
        }
        if (!concluida) window.iniciarTimerMissaoBiblia?.({ idMissao, minutos, titulo });
        if (!leitorMissao) return;
        leitorMissao.hidden = false;
        leitorMissao.innerHTML = `<h3>${escapar(titulo || `${livro} ${capitulo}`)}</h3><p>Carregando leitura…</p>`;
        const nomeArquivo = normalizarLivro(livro).replace(/^gn$/, 'genesis');
        fetch(`biblias/acf/${nomeArquivo}.json`).then((resposta) => {
            if (!resposta.ok) throw new Error('Não foi possível carregar este capítulo.');
            return resposta.json();
        }).then((dados) => {
            const capituloDados = dados.books?.[0]?.chapters?.find((item) => Number(item.chapter) === Number(capitulo));
            if (!capituloDados) throw new Error('Capítulo não encontrado.');
            leitorMissao.innerHTML = `<h3>${escapar(livro)} ${capitulo}</h3>${capituloDados.verses.map((versiculo) => `<p class="versiculo-missao"><strong>${versiculo.verse}</strong> ${escapar(versiculo.text)}</p>`).join('')}`;
            leitorMissao.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }).catch((erro) => { leitorMissao.innerHTML = `<p class="empty-state">${escapar(erro.message)}</p>`; });
    };

    window.concluirMissaoGamificacao = async function concluirMissaoGamificacao(idMissao, automatica = false) {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) return window.mostrarToast?.('Entre com Google para concluir missões.', 'erro');
        try {
            const resposta = await fetch(`${API_URL}/api/gamificacao/missoes/${encodeURIComponent(idMissao)}/concluir`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ google_id: usuario.google_id })
            });
            const dados = await resposta.json().catch(() => null);
            if (!resposta.ok) throw new Error(dados?.error || `HTTP ${resposta.status}`);
            if (missaoTimerAtual?.idMissao === idMissao) pararTimerMissao();
            window.mostrarToast?.(`Missão concluída! +${dados.pontos_ganhos} pontos.`, 'sucesso');
            if (leitorMissao) {
                leitorMissao.hidden = true;
                leitorMissao.replaceChildren();
            }
            mostrarAtrasadas = false;
            await carregarPainel();
        } catch (erro) {
            if (!automatica) window.mostrarToast?.(erro.message || 'Não foi possível concluir a missão.', 'erro');
        }
    };

    window.addEventListener('adoraplay:login', carregarPainel);
    window.addEventListener('adoraplay:logout', () => { painelAtual = null; renderizarPainel(); });
    window.carregarPainelGamificacao = carregarPainel;
    renderizarPainel();
}());
