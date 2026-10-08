(function () {
    const ADMIN_EMAIL = 'digiartesai@gmail.com';
    const API_URL = 'https://adoraplay-api.digiartesai.workers.dev';
    const panel = document.getElementById('adminTempoPainel');
    const search = document.getElementById('adminTempoBusca');
    const rows = document.getElementById('adminTempoLinhas');
    const status = document.getElementById('adminTempoStatus');
    const message = document.getElementById('adminTempoMensagem');
    const refreshButton = document.getElementById('adminTempoAtualizar');
    const logoutButton = document.getElementById('adminTempoSair');
    let accessToken = null;
    let missions = [];

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[character]);
    }

    function setMessage(element, text, kind = '') {
        element.textContent = text;
        element.dataset.kind = kind;
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

    function voltarParaHome() {
        window.navegarPorRota?.('/', { replace: true });
        window.mostrarHome?.({ preservarRota: true });
    }

    window.mostrarAjusteTempo = async function mostrarAjusteTempo() {
        accessToken = lerSessaoAdmin();
        if (!accessToken) return voltarParaHome();

        try {
            const data = await api('/api/admin/gamificacao/missoes');
            missions = data.missoes || [];
        } catch {
            accessToken = null;
            return voltarParaHome();
        }

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
        if (!response.ok) throw new Error(data.error || `Falha na solicitação (${response.status}).`);
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
