(function () {
    const ADMIN_EMAIL = 'digiartesai@gmail.com';
    const CLIENT_ID = '674847926774-7b1n759ots2bt8nkn9pmglmr6hpkee2e.apps.googleusercontent.com';
    const API_URL = 'https://adoraplay-api.digiartesai.workers.dev';
    const panel = document.getElementById('adminTempoPainel');
    const search = document.getElementById('adminTempoBusca');
    const rows = document.getElementById('adminTempoLinhas');
    const status = document.getElementById('adminTempoStatus');
    const message = document.getElementById('adminTempoMensagem');
    let loginSection = document.getElementById('adminTempoLogin');
    let loginButton = document.getElementById('adminTempoEntrar');
    let loginStatus = document.getElementById('adminTempoLoginStatus');
    const refreshButton = document.getElementById('adminTempoAtualizar');
    const logoutButton = document.getElementById('adminTempoSair');
    let accessToken = null;
    let missions = [];
    let loginListenerRegistered = false;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[character]);
    }

    function setMessage(element, text, kind = '') {
        if (!element) return;
        element.textContent = text;
        element.dataset.kind = kind;
    }

    function garantirElementosLogin() {
        if (!loginSection || !loginButton || !loginStatus) {
            const secaoAdmin = document.getElementById('adminTempoSection');
            if (!secaoAdmin || !panel) return false;
            loginSection = document.createElement('section');
            loginSection.id = 'adminTempoLogin';
            loginSection.className = 'admin-tempo-access';
            loginSection.hidden = true;
            loginSection.innerHTML = `
                <p>Sua sessão administrativa expirou. Entre novamente com a conta Google administradora para continuar.</p>
                <button id="adminTempoEntrar" class="admin-tempo-button" type="button">Entrar novamente com Google</button>
                <p id="adminTempoLoginStatus" class="admin-tempo-status" role="status" aria-live="polite"></p>`;
            secaoAdmin.querySelector('.admin-tempo-content')?.insertBefore(loginSection, panel);
            loginButton = loginSection.querySelector('#adminTempoEntrar');
            loginStatus = loginSection.querySelector('#adminTempoLoginStatus');
        }

        if (!loginButton || !loginStatus) return false;
        if (!loginListenerRegistered) {
            loginButton.addEventListener('click', autenticarAdminPorClique);
            loginListenerRegistered = true;
        }
        return true;
    }

    function lerSessaoAdmin() {
        try {
            const usuario = JSON.parse(localStorage.getItem('adoraplayGoogleUser'));
            const sessao = JSON.parse(localStorage.getItem('adoraplayGoogleToken'));
            if (usuario?.email?.toLowerCase() !== ADMIN_EMAIL) return null;
            if (!sessao?.token || sessao.expira <= Date.now()) return null;
            return sessao.token;
        } catch {
            return null;
        }
    }

    function usuarioSalvo() {
        try {
            return JSON.parse(localStorage.getItem('adoraplayGoogleUser'));
        } catch {
            return null;
        }
    }

    function mostrarPaginaAdmin() {
        [
            'homeSection', 'jogosSection', 'gamificacaoSection', 'bibliotecaSection',
            'bibliaSection', 'quizSection', 'quizDesafioSection', 'desafiosSection'
        ].forEach((id) => {
            const section = document.getElementById(id);
            if (section) section.style.display = 'none';
        });
        const adminSection = document.getElementById('adminTempoSection');
        adminSection.hidden = false;
        adminSection.style.display = 'block';
    }

    function solicitarLogin(texto = 'Sua sessão administrativa expirou. Entre novamente para continuar.') {
        if (!garantirElementosLogin()) return voltarParaHome();
        accessToken = null;
        panel.hidden = true;
        loginSection.hidden = false;
        setMessage(loginStatus, texto);
    }

    function autenticarAdminPorClique() {
        if (!window.google?.accounts?.oauth2) {
            setMessage(loginStatus, 'O login do Google ainda está carregando. Tente novamente.', 'error');
            return;
        }

        loginButton.disabled = true;
        setMessage(loginStatus, 'Aguardando confirmação do Google...');
        window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'openid email profile',
            callback: async (resposta) => {
                if (resposta.error || !resposta.access_token) {
                    loginButton.disabled = false;
                    return setMessage(loginStatus, 'Não foi possível renovar a sessão. Tente novamente.', 'error');
                }

                try {
                    const perfilResposta = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${resposta.access_token}` }
                    });
                    if (!perfilResposta.ok) throw new Error('O Google não confirmou a conta.');
                    const perfil = await perfilResposta.json();
                    if (perfil.email?.toLowerCase() !== ADMIN_EMAIL || perfil.email_verified !== true) {
                        throw new Error('Use a conta Google administradora do AdoraPlay.');
                    }
                    localStorage.setItem('adoraplayGoogleToken', JSON.stringify({
                        token: resposta.access_token,
                        expira: Date.now() + (Number(resposta.expires_in) || 3600) * 1000 - 60000
                    }));
                    await window.mostrarAjusteTempo();
                } catch (error) {
                    loginButton.disabled = false;
                    setMessage(loginStatus, error.message, 'error');
                }
            },
            error_callback: () => {
                loginButton.disabled = false;
                setMessage(loginStatus, 'A confirmação do Google foi cancelada ou bloqueada.', 'error');
            }
        }).requestAccessToken({ prompt: 'select_account', login_hint: ADMIN_EMAIL });
    }

    function voltarParaHome() {
        window.navegarPorRota?.('/', { replace: true });
        window.mostrarHome?.({ preservarRota: true });
    }

    window.mostrarAjusteTempo = async function mostrarAjusteTempo() {
        if (usuarioSalvo()?.email?.toLowerCase() !== ADMIN_EMAIL) return voltarParaHome();
        mostrarPaginaAdmin();
        accessToken = lerSessaoAdmin();
        if (!accessToken) return solicitarLogin();

        try {
            const data = await api('/api/admin/gamificacao/missoes');
            missions = data.missoes || [];
        } catch (error) {
            accessToken = null;
            if (error.status === 403) return voltarParaHome();
            return solicitarLogin(error.status === 401
                ? 'Sua sessão administrativa expirou. Entre novamente para continuar.'
                : `${error.message} Você pode tentar entrar novamente.`);
        }

        loginSection.hidden = true;
        panel.hidden = false;
        renderMissions();
    };

    async function api(path, options = {}) {
        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                Authorization: `Bearer ${accessToken}`,
                ...options.headers
            },
            cache: 'no-store'
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || `Falha na solicitação (${response.status}).`);
            error.status = response.status;
            throw error;
        }
        return data;
    }

    function renderMissions() {
        const query = search.value.trim().toLocaleLowerCase('pt-BR');
        const filtered = missions.filter((mission) =>
            `${mission.id_missao} ${mission.titulo} ${mission.livro} ${mission.capitulo} ${mission.dia}`
                .toLocaleLowerCase('pt-BR').includes(query)
        );
        rows.innerHTML = filtered.map((mission) => `
            <tr data-mission-id="${escapeHtml(mission.id_missao)}">
                <td>
                    <span class="admin-tempo-mission-title">${escapeHtml(mission.titulo)}</span>
                    <span class="admin-tempo-mission-id">Dia ${Number(mission.dia)} · ${escapeHtml(mission.id_missao)}</span>
                </td>
                <td>${escapeHtml(mission.livro)} ${Number(mission.capitulo)}</td>
                <td>
                    <label class="visually-hidden" for="tempo-${escapeHtml(mission.id_missao)}">Minutos para ${escapeHtml(mission.titulo)}</label>
                    <input class="admin-tempo-minutes" id="tempo-${escapeHtml(mission.id_missao)}" type="number" min="0.1" max="240" step="0.1" value="${Number(mission.tempo_estimado_minutos) || 0.1}">
                </td>
                <td><button class="admin-tempo-save" type="button">Salvar</button></td>
            </tr>`).join('');
        setMessage(status, `${filtered.length} de ${missions.length} missões exibidas.`);
    }

    async function carregarMissoes() {
        refreshButton.disabled = true;
        setMessage(status, 'Carregando missões...');
        try {
            const data = await api('/api/admin/gamificacao/missoes');
            missions = data.missoes || [];
            renderMissions();
        } catch (error) {
            setMessage(status, error.message, 'error');
        } finally {
            refreshButton.disabled = false;
        }
    }

    garantirElementosLogin();
    search.addEventListener('input', renderMissions);
    refreshButton.addEventListener('click', carregarMissoes);
    logoutButton.addEventListener('click', () => {
        accessToken = null;
        missions = [];
        rows.replaceChildren();
        panel.hidden = true;
        document.getElementById('adminTempoSection').hidden = true;
        voltarParaHome();
    });
    rows.addEventListener('click', async (event) => {
        const button = event.target.closest('.admin-tempo-save');
        if (!button) return;
        const row = button.closest('tr');
        const input = row.querySelector('input');
        const minutes = Number(input.value);
        if (!Number.isFinite(minutes) || minutes < 0.1 || minutes > 240) {
            setMessage(status, 'Informe um tempo entre 0,1 e 240 minutos.', 'error');
            input.focus();
            return;
        }
        button.disabled = true;
        button.textContent = 'Salvando...';
        try {
            await api(`/api/admin/gamificacao/missoes/${encodeURIComponent(row.dataset.missionId)}/tempo`, {
                method: 'PUT',
                body: JSON.stringify({ tempo_estimado_minutos: minutes })
            });
            const mission = missions.find((item) => item.id_missao === row.dataset.missionId);
            if (mission) mission.tempo_estimado_minutos = minutes;
            setMessage(status, `Tempo salvo: ${minutes} min.`, 'success');
            button.textContent = 'Salvo';
            window.setTimeout(() => {
                if (button.isConnected) button.textContent = 'Salvar';
            }, 1600);
        } catch (error) {
            setMessage(status, error.message, 'error');
            button.textContent = 'Salvar';
        } finally {
            button.disabled = false;
        }
    });
}());
