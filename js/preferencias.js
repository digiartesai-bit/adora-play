(function () {
    const API_URL = 'https://adoraplay-api.digiartesai.workers.dev';
    const VERSOES_PADRAO = [
        ['acf', 'ACF'], ['kjvl', 'KJA'], ['nbv', 'NBV'], ['ntlh', 'NTLH'], ['nvt', 'NVT'], ['tb', 'TB'], ['nva', 'NVA']
    ];
    const estado = { versao_biblia: 'acf' };
    let dadosConta = null;
    let overlay = null;
    let modal = null;
    let abertaPorNavegacao = false;

    window.obterVersaoBiblia = () => estado.versao_biblia;

    function usuarioAtual() {
        try {
            return JSON.parse(localStorage.getItem('adoraplayGoogleUser'));
        } catch {
            return null;
        }
    }

    function avisarPreferencias(origem) {
        window.dispatchEvent(new CustomEvent('adoraplay:preferencias', {
            detail: { versao_biblia: estado.versao_biblia, origem }
        }));
    }

    async function carregar() {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) return null;
        try {
            const resposta = await fetch(`${API_URL}/api/usuario/preferencias?google_id=${encodeURIComponent(usuario.google_id)}`, { cache: 'no-store' });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            dadosConta = await resposta.json();
            estado.versao_biblia = dadosConta.versao_biblia || 'acf';
            avisarPreferencias('carregamento');
        } catch (erro) {
            console.warn('Não foi possível carregar as preferências:', erro.message);
        }
        return dadosConta;
    }

    async function salvar(corpo) {
        const usuario = usuarioAtual();
        if (!usuario?.google_id) return false;
        try {
            const resposta = await fetch(`${API_URL}/api/usuario/preferencias`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_id: usuario.google_id, ...corpo })
            });
            return resposta.ok;
        } catch {
            return false;
        }
    }

    function toast(mensagem, tipo = 'sucesso') {
        window.mostrarToast?.(mensagem, tipo);
    }

    function formatarData(valor) {
        if (!valor) return '';
        const data = new Date(`${String(valor).replace(' ', 'T')}Z`);
        return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function construir() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'prefs-overlay';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-labelledby', 'prefsTitulo');
        overlay.innerHTML = `
            <header class="prefs-topo">
                <button type="button" class="prefs-voltar" id="prefsVoltar">&larr; Voltar</button>
                <h2 id="prefsTitulo">Preferências</h2>
            </header>
            <div class="prefs-corpo">
                <section class="prefs-card">
                    <h3>Meus dados</h3>
                    <div class="prefs-perfil">
                        <img id="prefsAvatar" alt="">
                        <div>
                            <strong id="prefsNome"></strong>
                            <span id="prefsEmail"></span>
                            <small id="prefsUltimoLogin"></small>
                        </div>
                    </div>
                    <ul class="prefs-totais">
                        <li><b id="prefsFavoritos">-</b> favoritos</li>
                        <li><b id="prefsAnotacoes">-</b> anotações</li>
                        <li><b id="prefsMissoes">-</b> missões concluídas</li>
                    </ul>
                    <button type="button" class="prefs-botao" id="prefsSair">Sair da conta</button>
                </section>

                <section class="prefs-card">
                    <h3>Ranking</h3>
                    <p>Ao ocultar, você deixa de aparecer no ranking. Seus pontos são mantidos e você pode voltar a exibir quando quiser.</p>
                    <label class="prefs-switch">
                        <input type="checkbox" id="prefsRanking">
                        <span>Exibir meu nome e pontuação no ranking</span>
                    </label>
                    <small id="prefsRankingAviso"></small>
                </section>

                <section class="prefs-card">
                    <h3>Bíblia</h3>
                    <p>Versão usada na leitura livre e nas missões de leitura.</p>
                    <select id="prefsVersao" aria-label="Versão bíblica"></select>
                </section>

                <section class="prefs-card" id="prefsAppCard">
                    <h3>Aplicativo</h3>
                    <p>Instale o AdoraPlay para abrir como um app no seu aparelho.</p>
                    <button type="button" class="prefs-botao" id="prefsInstalar">Instalar app</button>
                </section>

                <section class="prefs-card prefs-perigo">
                    <h3>Excluir conta</h3>
                    <p>Apaga permanentemente sua conta e todos os seus dados.</p>
                    <button type="button" class="prefs-botao prefs-botao-perigo" id="prefsExcluir">Excluir minha conta</button>
                </section>
            </div>`;
        document.body.appendChild(overlay);

        const select = overlay.querySelector('#prefsVersao');
        const opcoes = Array.from(document.querySelectorAll('#seletorVersaoBiblia option'))
            .map((opcao) => [opcao.value, opcao.textContent.trim()]);
        (opcoes.length ? opcoes : VERSOES_PADRAO).forEach(([valor, rotulo]) => {
            select.appendChild(new Option(rotulo, valor));
        });

        overlay.querySelector('#prefsVoltar').addEventListener('click', voltar);
        overlay.querySelector('#prefsSair').addEventListener('click', () => window.sairDaContaGoogle?.());
        overlay.querySelector('#prefsInstalar').addEventListener('click', () => document.getElementById('btnInstall')?.click());
        overlay.querySelector('#prefsExcluir').addEventListener('click', abrirModalExclusao);
        overlay.querySelector('#prefsRanking').addEventListener('change', alterarRanking);
        select.addEventListener('change', alterarVersao);
        document.addEventListener('keydown', (evento) => {
            if (evento.key !== 'Escape' || overlay.hidden) return;
            if (modal) fecharModal();
            else voltar();
        });
    }

    function preencher() {
        const usuario = usuarioAtual();
        if (!usuario) return;
        const avatar = overlay.querySelector('#prefsAvatar');
        avatar.src = usuario.picture || 'assets/icons/profile.svg';
        overlay.querySelector('#prefsNome').textContent = usuario.name || '';
        overlay.querySelector('#prefsEmail').textContent = usuario.email || '';

        const ultimoLogin = formatarData(dadosConta?.ultimo_login);
        overlay.querySelector('#prefsUltimoLogin').textContent = ultimoLogin ? `Último acesso: ${ultimoLogin}` : '';
        overlay.querySelector('#prefsFavoritos').textContent = dadosConta?.totais?.favoritos ?? '-';
        overlay.querySelector('#prefsAnotacoes').textContent = dadosConta?.totais?.anotacoes ?? '-';
        overlay.querySelector('#prefsMissoes').textContent = dadosConta?.totais?.missoes ?? '-';

        const ranking = overlay.querySelector('#prefsRanking');
        const participa = Boolean(dadosConta?.ranking?.participa);
        ranking.checked = Boolean(dadosConta?.ranking?.visivel);
        ranking.disabled = !participa;
        overlay.querySelector('#prefsRankingAviso').textContent = participa
            ? ''
            : 'Você ainda não participou do ranking. Responda ao quiz e autorize a exibição para aparecer.';

        overlay.querySelector('#prefsVersao').value = estado.versao_biblia;
        overlay.querySelector('#prefsAppCard').hidden = typeof jaInstalado === 'function' && jaInstalado();
    }

    async function alterarRanking(evento) {
        const campo = evento.target;
        const visivel = campo.checked;
        campo.disabled = true;
        const ok = await salvar({ ranking_visivel: visivel });
        campo.disabled = false;
        if (!ok) {
            campo.checked = !visivel;
            return toast('Não foi possível salvar agora. Tente novamente.', 'erro');
        }
        if (dadosConta?.ranking) dadosConta.ranking.visivel = visivel;
        window.dispatchEvent(new CustomEvent('adoraplay:ranking-permissao', { detail: { permitido: visivel } }));
        window.carregarRankingQuiz?.();
        toast(visivel ? 'Você voltou a aparecer no ranking.' : 'Você foi ocultado do ranking.');
    }

    async function alterarVersao(evento) {
        const campo = evento.target;
        const anterior = estado.versao_biblia;
        const nova = campo.value;
        campo.disabled = true;
        const ok = await salvar({ versao_biblia: nova });
        campo.disabled = false;
        if (!ok) {
            campo.value = anterior;
            return toast('Não foi possível salvar agora. Tente novamente.', 'erro');
        }
        estado.versao_biblia = nova;
        avisarPreferencias('usuario');
        toast('Versão da Bíblia salva.');
    }

    function abrirModalExclusao() {
        if (modal) return;
        modal = document.createElement('div');
        modal.className = 'prefs-modal';
        modal.setAttribute('role', 'alertdialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'prefsModalTitulo');
        modal.innerHTML = `
            <div class="prefs-modal-caixa">
                <h3 id="prefsModalTitulo">Excluir conta e todos os dados?</h3>
                <p><strong>Esta ação é permanente e não pode ser desfeita.</strong> Serão apagados:</p>
                <ul>
                    <li>Favoritos e anotações da Bíblia</li>
                    <li>Progresso e pontos das missões e do quiz</li>
                    <li>Sua posição no ranking</li>
                    <li>Preferências e dados do perfil</li>
                </ul>
                <p class="prefs-modal-nota">Desafios feitos com outras pessoas continuam para elas, com seu nome e foto substituídos por "Usuário anônimo".</p>
                <label class="prefs-confirmar">
                    <span>Digite <b>EXCLUIR</b> para confirmar</span>
                    <input type="text" id="prefsConfirmacao" autocomplete="off" autocapitalize="characters">
                </label>
                <p class="prefs-modal-erro" id="prefsModalErro" role="alert"></p>
                <div class="prefs-modal-acoes">
                    <button type="button" class="prefs-botao" id="prefsModalCancelar">Cancelar</button>
                    <button type="button" class="prefs-botao prefs-botao-perigo" id="prefsModalConfirmar" disabled>Excluir tudo</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const campo = modal.querySelector('#prefsConfirmacao');
        const confirmar = modal.querySelector('#prefsModalConfirmar');
        campo.addEventListener('input', () => {
            confirmar.disabled = campo.value.trim().toUpperCase() !== 'EXCLUIR';
        });
        modal.querySelector('#prefsModalCancelar').addEventListener('click', fecharModal);
        confirmar.addEventListener('click', excluirConta);
        campo.focus();
    }

    function fecharModal() {
        modal?.remove();
        modal = null;
    }

    function excluirConta() {
        const usuario = usuarioAtual();
        const confirmar = modal.querySelector('#prefsModalConfirmar');
        const erro = modal.querySelector('#prefsModalErro');
        erro.textContent = '';
        confirmar.disabled = true;
        confirmar.textContent = 'Excluindo...';

        // O token precisa ser pedido direto do clique, antes de qualquer await.
        window.adoraplayObterTokenGoogle()
            .then(async (token) => {
                const resposta = await fetch(`${API_URL}/api/usuario`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ google_id: usuario?.google_id })
                });
                if (!resposta.ok) {
                    const dados = await resposta.json().catch(() => ({}));
                    throw new Error(dados.error || 'Não foi possível excluir a conta agora.');
                }
                window.sairDaContaGoogle?.();
                window.location.replace('/');
            })
            .catch((falha) => {
                erro.textContent = falha.message;
                confirmar.disabled = false;
                confirmar.textContent = 'Excluir tudo';
            });
    }

    function voltar() {
        if (abertaPorNavegacao) {
            abertaPorNavegacao = false;
            window.history.back();
            return;
        }
        fechar();
        window.navegarPorRota?.('/', { replace: true });
        window.mostrarHome?.({ preservarRota: true });
    }

    function fechar() {
        fecharModal();
        if (!overlay || overlay.hidden) return;
        overlay.hidden = true;
        document.documentElement.classList.remove('prefs-aberta');
    }

    window.mostrarPreferencias = async function mostrarPreferencias({ viaRota = false } = {}) {
        if (!usuarioAtual()?.google_id) {
            window.navegarPorRota?.('/', { replace: true });
            window.mostrarHome?.({ preservarRota: true });
            return;
        }
        construir();
        if (!viaRota && overlay.hidden) {
            window.navegarPorRota?.('/preferencias');
            abertaPorNavegacao = true;
        }
        overlay.hidden = false;
        document.documentElement.classList.add('prefs-aberta');
        preencher();
        overlay.scrollTop = 0;
        await carregar();
        if (!overlay.hidden) preencher();
    };

    window.fecharPreferencias = fechar;

    window.addEventListener('adoraplay:login', () => { carregar(); });
    window.addEventListener('adoraplay:logout', () => {
        dadosConta = null;
        estado.versao_biblia = 'acf';
        fechar();
        avisarPreferencias('carregamento');
    });
})();
