/* Login do Google para o ambiente local. O client ID e publico para apps web. */
(function () {
    const CLIENT_ID = '674847926774-7b1n759ots2bt8nkn9pmglmr6hpkee2e.apps.googleusercontent.com';
    const STORAGE_KEY = 'adoraplayGoogleUser';
    const API_URL = 'https://adoraplay-api.digiartesai.workers.dev';
    const signInButton = document.getElementById('googleSignInButton');
    const userBox = document.getElementById('googleUser');
    const avatar = document.getElementById('googleUserAvatar');
    const userName = document.getElementById('googleUserName');
    const signOut = document.getElementById('googleSignOut');
    let tokenClient;

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
            exibirUsuario(user);
            window.dispatchEvent(new CustomEvent('adoraplay:login', { detail: user }));

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

    signOut?.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event('adoraplay:logout'));
        mostrarLogin();
    });

    inicializarGoogle();
})();
