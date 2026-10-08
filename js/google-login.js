/* Login do Google para o ambiente local. O client ID e publico para apps web. */
(function () {
    const CLIENT_ID = '674847926774-7b1n759ots2bt8nkn9pmglmr6hpkee2e.apps.googleusercontent.com';
    const STORAGE_KEY = 'adoraplayGoogleUser';
    const API_URL = 'https://adoraplay-api.digiartesai.workers.dev';
    const signInButton = document.getElementById('googleSignInButton');
    const userBox = document.getElementById('googleUser');
    const avatar = document.getElementById('googleUserAvatar');
    const userName = document.getElementById('googleUserName');
    const TOKEN_KEY = 'adoraplayGoogleToken';
    let tokenClient;

    function lerToken() {
        try {
            const sessao = JSON.parse(localStorage.getItem(TOKEN_KEY));
            return sessao?.token && sessao.expira > Date.now() ? sessao.token : null;
        } catch {
            return null;
        }
    }

    function salvarToken(resposta) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify({
            token: resposta.access_token,
            expira: Date.now() + (Number(resposta.expires_in) || 3600) * 1000 - 60000
        }));
    }

    function exibirUsuario(user) {
        if (!user || !user.name || !userBox) return;
        userName.textContent = user.name;
        avatar.src = user.picture || 'assets/icons/profile.svg';
        avatar.alt = `Foto de ${user.name}`;
        signInButton.hidden = true;
        userBox.hidden = false;
    }

    function mostrarLogin() {
        if (userBox) userBox.hidden = true;
        if (signInButton) signInButton.hidden = false;
    }

    async function concluirLogin(resposta) {
        if (resposta.error) {
            console.error('Login Google cancelado ou recusado.', resposta);
            return;
        }

        try {
            const respostaUsuario = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resposta.access_token}` }
            });
            if (!respostaUsuario.ok) throw new Error('Não foi possível obter o perfil Google.');

            const dados = await respostaUsuario.json();
            const user = {
                google_id: dados.sub,
                name: dados.name,
                email: dados.email,
                picture: dados.picture
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            salvarToken(resposta);
            exibirUsuario(user);

            try {
                const respostaLogin = await fetch(`${API_URL}/api/login-google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        google_id: user.google_id,
                        nome: user.name,
                        email: user.email,
                        foto: user.picture
                    })
                });
                if (!respostaLogin.ok) throw new Error(`HTTP ${respostaLogin.status}`);
            } catch (error) {
                console.warn('Sessão Google iniciada, mas não foi possível sincronizar no Cloudflare:', error.message);
            }
            window.dispatchEvent(new CustomEvent('adoraplay:login', { detail: user }));
        } catch (error) {
            console.error('Não foi possível concluir o login Google.', error);
        }
    }

    function inicializarGoogle() {
        if (!window.google?.accounts?.oauth2 || !signInButton) {
            window.setTimeout(inicializarGoogle, 100);
            return;
        }

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'openid email profile',
            callback: concluirLogin
        });
        signInButton.addEventListener('click', () => {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        });
    }

    try {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEY));
        exibirUsuario(user);
        if (user?.google_id) {
            window.dispatchEvent(new CustomEvent('adoraplay:login', { detail: user }));
        }
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }

    window.sairDaContaGoogle = function sairDaContaGoogle() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new Event('adoraplay:logout'));
        mostrarLogin();
        window.navegarPorRota?.('/', { replace: true });
        window.mostrarHome?.({ preservarRota: true });
    };

    // Deve ser chamada direto de um clique, senão o navegador bloqueia o popup do Google.
    window.adoraplayObterTokenGoogle = function adoraplayObterTokenGoogle() {
        const guardado = lerToken();
        if (guardado) return Promise.resolve(guardado);
        return new Promise((resolve, reject) => {
            if (!window.google?.accounts?.oauth2) return reject(new Error('Login do Google indisponível.'));
            let usuario = null;
            try {
                usuario = JSON.parse(localStorage.getItem(STORAGE_KEY));
            } catch {
                usuario = null;
            }
            window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'openid email profile',
                callback: (resposta) => {
                    if (resposta.error || !resposta.access_token) {
                        return reject(new Error('Não foi possível confirmar sua sessão.'));
                    }
                    salvarToken(resposta);
                    resolve(resposta.access_token);
                },
                error_callback: () => reject(new Error('Confirmação cancelada ou bloqueada pelo navegador.'))
            }).requestAccessToken({ prompt: '', ...(usuario?.email ? { login_hint: usuario.email } : {}) });
        });
    };

    inicializarGoogle();
})();
