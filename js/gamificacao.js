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
    const totalMissoes = document.getElementById('gamificacaoTotalMissoes');
    const mensagem = document.getElementById('gamificacaoMensagem');
    const rankingConsentimento = document.getElementById('gamificacaoRankingConsentimento');
    const rankingMensagem = document.getElementById('gamificacaoRankingMensagem');
    const rankingPermitirArea = document.getElementById('gamificacaoRankingPermitirArea');
    const rankingCheckbox = document.getElementById('gamificacaoPermitirRanking');
    const rankingSalvar = document.getElementById('gamificacaoSalvarRanking');
    const rankingRetirar = document.getElementById('gamificacaoRetirarRanking');

    if (!section || !lista) return;

    let painelAtual = null;
    let rankingPermitido = false;
    let timerMissao = null;
    let missaoTimerAtual = null;
    const timerElement = document.getElementById('missaoLeituraTimer');
    const timerTitulo = document.getElementById('missaoLeituraTitulo');
    const timerTempo = document.getElementById('missaoLeituraTempo');
    const timerBotao = document.getElementById('finalizarLeituraMissao');
    const leitorMissao = document.getElementById('leituraMissaoGamificacao');
    let carregamentoLeituraMissao = 0;
    let controladorLeituraMissao = null;

    function renderizarConsentimentoRanking() {
        const usuario = usuarioAtual();
        if (!rankingConsentimento) return;
        rankingConsentimento.hidden = !usuario?.google_id;
        if (!usuario?.google_id) return;
        rankingMensagem.textContent = rankingPermitido
            ? 'Sua autorização vale para os pontos de missões e quiz no ranking geral.'
            : 'Autorize a exibição do seu nome, foto e pontuação de missões e quiz no ranking geral.';
        rankingPermitirArea.hidden = rankingPermitido;
        rankingRetirar.hidden = !rankingPermitido;
        rankingCheckbox.checked = false;
        rankingSalvar.disabled = true;
    }

    function usuarioAtual() {
        try { return JSON.parse(localStorage.getItem('adoraplayGoogleUser')); } catch { return null; }
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

    function converterTempoEstimadoParaSegundos(valor) {
        const tempo = String(valor ?? '').trim().replace(',', '.');
        const formatoMinutosSegundos = tempo.match(/^(\d+):(\d{1,2})$/);
        if (formatoMinutosSegundos) {
            const minutos = Number(formatoMinutosSegundos[1]) || 0;
            const segundos = Math.min(59, Number(formatoMinutosSegundos[2]) || 0);
            return Math.max(1, minutos * 60 + segundos);
        }

        const [minutosTexto, fracao = ''] = tempo.split('.');
        const minutos = Number.parseInt(minutosTexto, 10) || 0;
        // Na notação decimal acordada, 3.5 significa 3 minutos e 50 segundos;
        // 3.05 significa 3 minutos e 5 segundos.
        const segundos = fracao ? Number((fracao + '00').slice(0, 2)) || 0 : 0;
        return Math.max(1, minutos * 60 + segundos);
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
        missaoTimerAtual = { idMissao, segundos: converterTempoEstimadoParaSegundos(minutos) };
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
                    <p>Entre com Google para acumular XP, avançar no plano de leitura e acompanhar seu nível.</p>
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
            totalMissoes.textContent = '0';
            return;
        }

        const resumo = painelAtual?.resumo || {};
        totalPontos.textContent = resumo.total_pontos || 0;
        const nivelAtual = Number(resumo.nivel) || 0;
        nivel.textContent = `${nivelAtual}/${resumo.nivel_maximo || 99}`;
        const estrelas = Math.min(5, Number(resumo.estrelas) || 0);
        nivelTexto.textContent = `Nível ${nivelAtual}${estrelas ? ` ${'★'.repeat(estrelas)}` : ''}`;
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
        const quantidadeMissoes = Number(resumo.total_missoes) || painelAtual?.missoes?.length || 0;
        const quantidadeConcluidas = Number(resumo.missoes_concluidas) || 0;
        totalMissoes.textContent = Math.max(0, quantidadeMissoes - quantidadeConcluidas);
        mensagem.textContent = resumo.revisao
            ? 'Ciclo de revisão: as missões não somam novos pontos, e seus pontos e estrelas ficam guardados.'
            : 'Conclua uma missão para liberar a próxima. Não há prazo.';

        const missoes = painelAtual?.missoes || [];
        const concluidas = missoes.filter((missao) => missao.concluida).length;
        const missaoAtual = missoes.find((missao) => !missao.concluida);
        const card = missaoAtual ? `
            <article class="missao-gamificacao">
                <div>
                    <strong>${escapar(missaoAtual.titulo)}</strong>
                    <small>${Number(missaoAtual.versiculos_estimados) || 0} versículos · ${resumo.revisao ? 'revisão, sem novos pontos' : `${Number(missaoAtual.recompensa_bonus) || 0} pontos ao concluir`}</small>
                </div>
                <div class="missao-acoes">
                    <button type="button" class="link-button" onclick="window.abrirMissaoGamificacao('${escapar(missaoAtual.livro)}', ${missaoAtual.capitulo}, '${escapar(missaoAtual.id_missao)}', ${Number(missaoAtual.tempo_estimado_minutos) || 1}, '${escapar(missaoAtual.titulo)}', false)">Ler</button>
                </div>
            </article>`
            : (missoes.length ? `
                <div class="gamificacao-login-aviso">
                    <strong>Plano concluído! ${'★'.repeat(Math.max(1, estrelas))}</strong>
                    <p>Você concluiu as ${missoes.length} missões${estrelas >= 5 ? ' e já tem o máximo de 5 estrelas' : ' e ganhou uma estrela ao lado do seu nível'}. Um novo ciclo é de revisão: não rende novos pontos, e seus pontos e estrelas ficam guardados.</p>
                    ${resumo.pode_reiniciar ? '<button type="button" class="btn principal" onclick="window.reiniciarPlanoGamificacao()">Iniciar novo ciclo</button>' : ''}
                </div>` : '<p class="empty-state">Nenhuma missão disponível.</p>');
        const tituloProgresso = missaoAtual ? `Missão ${concluidas + 1} de ${missoes.length}` : 'Plano concluído';
        lista.innerHTML = `<section class="dia-gamificacao"><div class="dia-gamificacao-header"><h3>${tituloProgresso}</h3><small>${concluidas} concluídas</small></div>${card}</section>`;
    }

    async function carregarPainel() {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) {
            painelAtual = null;
            rankingPermitido = false;
            renderizarConsentimentoRanking();
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
            rankingPermitido = Boolean(await window.carregarPreferenciaRankingQuiz?.(usuario.google_id));
            window.dispatchEvent(new CustomEvent('adoraplay:ranking-permissao', { detail: { permitido: rankingPermitido } }));
            renderizarPainel();
            renderizarConsentimentoRanking();
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
        document.getElementById('jogosSection')?.style.setProperty('display', 'none');
        if (window.quizDesafioSection) window.quizDesafioSection.style.display = 'none';
        if (window.desafiosSection) window.desafiosSection.style.display = 'none';
        section.style.display = 'grid';
        if (typeof navegarPorRota === 'function') navegarPorRota('/gamificacao');
        carregarPainel();
    };

    rankingCheckbox?.addEventListener('change', () => {
        rankingSalvar.disabled = !rankingCheckbox.checked;
    });

    rankingSalvar?.addEventListener('click', async () => {
        const usuario = usuarioAtual();
        if (!usuario?.google_id || !rankingCheckbox.checked) return;
        rankingSalvar.disabled = true;
        const ok = await window.salvarPreferenciaRankingQuiz?.({
            google_id: usuario.google_id,
            acertos: 0,
            permitir: true
        });
        if (!ok) {
            rankingSalvar.disabled = false;
            window.mostrarToast?.('Não foi possível salvar a autorização agora.', 'erro');
            return;
        }
        rankingPermitido = true;
        renderizarConsentimentoRanking();
        window.dispatchEvent(new CustomEvent('adoraplay:ranking-permissao', { detail: { permitido: true } }));
        window.mostrarToast?.('Autorização do ranking salva.', 'sucesso');
        await window.carregarRankingQuiz?.();
    });

    rankingRetirar?.addEventListener('click', async () => {
        const usuario = usuarioAtual();
        if (!usuario?.google_id || !window.confirm('Retirar sua pontuação de missões e quiz do ranking geral?')) return;
        rankingRetirar.disabled = true;
        const ok = await window.retirarRankingQuiz?.({ google_id: usuario.google_id });
        rankingRetirar.disabled = false;
        if (!ok) {
            window.mostrarToast?.('Não foi possível retirar a autorização agora.', 'erro');
            return;
        }
        rankingPermitido = false;
        renderizarConsentimentoRanking();
        window.dispatchEvent(new CustomEvent('adoraplay:ranking-permissao', { detail: { permitido: false } }));
        window.mostrarToast?.('Sua pontuação foi retirada do ranking geral.', 'sucesso');
        await window.carregarRankingQuiz?.();
    });

    window.abrirMissaoGamificacao = function abrirMissaoGamificacao(livro, capitulo, idMissao, minutos, titulo, concluida) {
        if (!concluida) window.iniciarTimerMissaoBiblia?.({ idMissao, minutos, titulo });
        if (!leitorMissao) return;
        controladorLeituraMissao?.abort();
        controladorLeituraMissao = new AbortController();
        const sinal = controladorLeituraMissao.signal;
        const carregamentoAtual = ++carregamentoLeituraMissao;
        const aindaAtual = () => carregamentoAtual === carregamentoLeituraMissao && !sinal.aborted;
        leitorMissao.hidden = false;
        leitorMissao.innerHTML = `<h3>${escapar(titulo || `${livro} ${capitulo}`)}</h3><p>Carregando leitura…</p>`;
        const nomeArquivo = normalizarLivro(livro).replace(/^gn$/, 'genesis');
        const normalizarChave = (valor) => String(valor || '').normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const versaoLeitura = window.obterVersaoBiblia?.() || 'acf';
        const carregarLivroMissao = async () => {
            let resposta = await fetch(`biblias/${versaoLeitura}/${nomeArquivo}.json`, { signal: sinal });
            if (!resposta.ok && versaoLeitura !== 'acf') {
                resposta = await fetch(`biblias/acf/${nomeArquivo}.json`, { signal: sinal });
            }
            if (!resposta.ok) throw new Error('Não foi possível carregar este capítulo.');
            return resposta.json();
        };
        Promise.all([
            carregarLivroMissao(),
            fetch(`biblias/capitulos/${nomeArquivo}.json`, { signal: sinal })
                .then((resposta) => resposta.ok ? resposta.json() : null)
                .catch((erro) => {
                    if (erro.name === 'AbortError') throw erro;
                    return null;
                })
        ]).then(([dados, resumos]) => {
            if (!aindaAtual()) return;
            const capituloDados = dados.books?.[0]?.chapters?.find((item) => Number(item.chapter) === Number(capitulo));
            if (!capituloDados) throw new Error('Capítulo não encontrado.');
            const chaveEsperada = `${normalizarChave(livro)} ${Number(capitulo)}`;
            const resumo = resumos && Object.entries(resumos).find(([chave]) => normalizarChave(chave) === chaveEsperada)?.[1];
            const descricao = resumo ? `
                <section class="bible-chapter-description missao-chapter-description">
                    <strong>${escapar(resumo.titulo)}</strong>
                    <span>Tema central: ${escapar(resumo.tema_central)}</span>
                    <p>${escapar(resumo.descricao)}</p>
                </section>` : '';
            leitorMissao.innerHTML = `<h3>${escapar(livro)} ${Number(capitulo)}</h3>${descricao}${capituloDados.verses.map((versiculo) => `<p class="versiculo-missao"><strong>${versiculo.verse}</strong> ${escapar(versiculo.text)}</p>`).join('')}`;
            leitorMissao.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }).catch((erro) => {
            if (!aindaAtual() || erro.name === 'AbortError') return;
            leitorMissao.innerHTML = `<p class="empty-state">${escapar(erro.message)}</p>`;
        });
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
            window.mostrarToast?.(dados.revisao ? 'Missão revisada.' : `Missão concluída! +${dados.pontos_ganhos} pontos.`, 'sucesso');
            if (dados.plano_completo) window.mostrarToast?.('Parabéns! Você concluiu todas as missões e ganhou uma estrela.', 'sucesso');
            if (leitorMissao) {
                leitorMissao.hidden = true;
                leitorMissao.replaceChildren();
            }
            await carregarPainel();
        } catch (erro) {
            if (!automatica) window.mostrarToast?.(erro.message || 'Não foi possível concluir a missão.', 'erro');
        }
    };

    window.reiniciarPlanoGamificacao = async function reiniciarPlanoGamificacao() {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) return;
        if (!window.confirm('Iniciar um novo ciclo? Seus pontos e estrelas ficam guardados, mas as missões voltam ao início e passam a valer só como revisão, sem novos pontos.')) return;
        try {
            const resposta = await fetch(`${API_URL}/api/gamificacao/plano/reiniciar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_id: usuario.google_id, inicio_plano: new Date().toLocaleDateString('sv-SE') })
            });
            const dados = await resposta.json().catch(() => null);
            if (!resposta.ok) throw new Error(dados?.error || `HTTP ${resposta.status}`);
            window.mostrarToast?.('Novo ciclo iniciado.', 'sucesso');
            await carregarPainel();
        } catch (erro) {
            window.mostrarToast?.(erro.message || 'Não foi possível iniciar o novo ciclo.', 'erro');
        }
    };

    window.addEventListener('adoraplay:login', carregarPainel);
    window.addEventListener('adoraplay:logout', () => { painelAtual = null; rankingPermitido = false; renderizarConsentimentoRanking(); renderizarPainel(); });
    window.carregarPainelGamificacao = carregarPainel;
    renderizarPainel();
}());
