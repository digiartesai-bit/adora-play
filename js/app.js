const homeSection = document.getElementById('homeSection');
const bibliotecaSection = document.getElementById('bibliotecaSection');
const bibliaSection = document.getElementById('bibliaSection');
const favoritosVisiveis = document.getElementById('favoritosVisiveis');
const moreOuvidasContainer = document.getElementById('maisOuvidas');
const albumsContainer = document.getElementById('albuns');
const libraryGrid = document.getElementById('bibliotecaGrid');
const albumFilter = document.getElementById('albumFilter');
const librarySectionTitle = document.getElementById('librarySectionTitle');
const librarySectionSubtitle = document.getElementById('librarySectionSubtitle');
const albumTracksPanel = document.getElementById('albumTracksPanel');
const albumTracksTitle = document.getElementById('albumTracksTitle');
const albumTracksList = document.getElementById('albumTracksList');
const destaqueTitulo = document.getElementById('destaqueTitulo');
const destaqueArtista = document.getElementById('destaqueArtista');
const destaqueCapa = document.getElementById('destaqueCapa');
const miniCardsNovidades = document.getElementById('miniCardsNovidades');
const btnInstall = document.getElementById('btnInstall');
const btnMenuMobile = document.getElementById('btnMenuMobile');
const headerQuickActions = document.getElementById('headerQuickActions');

const appState = {
    musicas: [],
    albumSelecionado: null,
    rankingData: [],
    bibliotecaSomenteFavoritos: false,
};

function ocultarGamificacao() {
    const gamificacaoSection = document.getElementById('gamificacaoSection');
    if (gamificacaoSection) gamificacaoSection.style.display = 'none';
}

let musicas = appState.musicas;
let albumSelecionado = appState.albumSelecionado;
let rankingData = appState.rankingData;
let bibliotecaSomenteFavoritos = appState.bibliotecaSomenteFavoritos;
let deferredInstallPrompt = null;

function sincronizarEstadoApp() {
    appState.musicas = musicas;
    appState.albumSelecionado = albumSelecionado;
    appState.rankingData = rankingData;
    appState.bibliotecaSomenteFavoritos = bibliotecaSomenteFavoritos;
}

function obterChaveMusica(musica) {
    return String(musica?.id ?? musica?.audio ?? musica?.titulo ?? '').trim();
}

function encontrarIndiceDaMusica(musica) {
    const chave = obterChaveMusica(musica);
    return musicas.findIndex(item => obterChaveMusica(item) === chave);
}

function inicializarMenuMobile() {
    if (!btnMenuMobile || !headerQuickActions) return;

    const abrirMenu = () => {
        headerQuickActions.classList.add('is-open');
        btnMenuMobile.setAttribute('aria-expanded', 'true');
    };

    const fecharMenu = () => {
        headerQuickActions.classList.remove('is-open');
        btnMenuMobile.setAttribute('aria-expanded', 'false');
    };

    btnMenuMobile.addEventListener('click', (event) => {
        event.stopPropagation();
        const aberto = headerQuickActions.classList.contains('is-open');
        if (aberto) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    document.addEventListener('click', (event) => {
        if (headerQuickActions.contains(event.target) || btnMenuMobile.contains(event.target)) {
            return;
        }
        fecharMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            fecharMenu();
        }
    });

    headerQuickActions.addEventListener('click', (event) => {
        const alvo = event.target;
        if (!(alvo instanceof Element)) return;

        if (window.innerWidth <= 900 && alvo.closest('button')) {
            fecharMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
            fecharMenu();
        }
    });
}

// ==========================================================================
// CONTROLE DE INSTALAÇÃO DO PWA
// ==========================================================================
let instaladorPrompt;

function jaInstalado() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||             // iOS
        localStorage.getItem('pwaInstalado') === '1'        // fallback pós-instalação
    );
}

function mostrarBotao() {
    if (btnInstall && !jaInstalado()) {
        btnInstall.classList.add('mostrar-btn');
    }
}

function esconderBotao() {
    if (btnInstall) btnInstall.classList.remove('mostrar-btn');
}

function inicializarInstalacaoPWA() {
    if (!btnInstall) return;

    // 1. Se já está instalado, esconde o botão imediatamente
    if (jaInstalado()) {
        esconderBotao();
    }

    // 2. Clique no botão de instalação
    btnInstall.addEventListener('click', async (e) => {
        e.preventDefault();
        if (instaladorPrompt) {
            instaladorPrompt.prompt();
            const { outcome } = await instaladorPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('pwaInstalado', '1');
                esconderBotao();
            }
            instaladorPrompt = null;
        } else {
            alert(
                "Para instalar o AdoraPlay agora:\n\n" +
                "1. Toque nos 3 pontinhos (Menu) do seu navegador.\n" +
                "2. Procure por 'Instalar aplicativo' ou 'Adicionar à tela inicial'."
            );
        }
    });
}

// 3. Navegador avisa que o app pode ser instalado
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    instaladorPrompt = e;
    mostrarBotao();
});

// 4. Instalação concluída com sucesso
window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwaInstalado', '1');
    esconderBotao();
    instaladorPrompt = null;
});


function navegarPorRota(rota, opcao = {}) {
    const rotaNormalizada = rota && rota.startsWith('/') ? rota : `/${rota || ''}`;
    const urlAtual = new URL(window.location.href);
    urlAtual.pathname = '/';
    urlAtual.hash = rotaNormalizada === '/' ? '' : `#${rotaNormalizada}`;

    const destino = `${urlAtual.pathname}${urlAtual.search}${urlAtual.hash}`;
    const enderecoAtual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (destino === enderecoAtual) return;

    if (opcao.replace) {
        history.replaceState({}, '', destino);
    } else {
        history.pushState({}, '', destino);
    }
}

window.compartilharLinkNoFacebook = function compartilharLinkNoFacebook(link) {
    if (!link) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
};

function obterRotaAtual() {
    const hashAtual = (window.location.hash || '').replace(/^#/, '').trim();
    const caminho = (window.location.pathname || '/').trim();
    const rotaBase = caminho && caminho !== '/' ? caminho : hashAtual || '/';
    const rota = rotaBase.startsWith('/') ? rotaBase : `/${rotaBase}`;
    return rota.length > 1 ? rota.replace(/\/+$/, '') : rota;
}

function aplicarRotaAtual() {
    const rota = obterRotaAtual();
    const params = new URLSearchParams(window.location.search);

    if (rota === '/biblioteca' || rota === '/biblioteca/favoritos') {
        mostrarBiblioteca(rota === '/biblioteca/favoritos');
        return;
    }

    if (rota === '/biblia' || rota.startsWith('/biblia/')) {
        if (typeof window.mostrarBiblia === 'function') {
            const pronta = window.mostrarBiblia();
            if (typeof window.abrirBibliaPorRota === 'function') {
                const partes = rota.split('/').filter(Boolean);
                const livro = partes[1] || null;
                const capitulo = partes[2] || null;
                Promise.resolve(pronta).then(() => window.abrirBibliaPorRota({ livro, capitulo }));
            }
        }
        return;
    }

    if (rota === '/quiz') {
        if (typeof window.mostrarQuiz === 'function') window.mostrarQuiz();
        return;
    }

    if (rota.startsWith('/desafio/')) {
        const id = rota.split('/').filter(Boolean)[1];
        if (id && typeof window.mostrarQuizDesafio === 'function') {
            window.mostrarQuizDesafio(id);
        }
        return;
    }

    if (rota === '/desafios' || /^\/desafios\/(abertos|finalizados|individuais)$/.test(rota)) {
        if (typeof window.mostrarDesafios === 'function') {
            const tipoDaRota = rota.split('/')[2];
            window.mostrarDesafios(tipoDaRota || params.get('tipo') || 'abertos');
        }
        return;
    }

    if (rota === '/gamificacao' || rota === '/missoes') {
        if (typeof window.mostrarGamificacao === 'function') window.mostrarGamificacao();
        return;
    }

    if (rota === '/quiz/desafios') {
        if (typeof window.mostrarDesafios === 'function') {
            window.mostrarDesafios('abertos');
        }
        return;
    }

    if (rota === '/inicio' || rota === '/home') {
        mostrarHome();
        return;
    }

    if (rota === '/ranking' || rota === '/ranking/quiz') {
        mostrarHome({ preservarRota: true });
        window.requestAnimationFrame(() => {
            const seletor = rota.endsWith('/quiz') ? '.quiz-ranking-section' : '.section-ranking';
            document.querySelector(seletor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
    }

    mostrarHome();
}

function mostrarBiblioteca(comFavoritos = false) {
    ocultarGamificacao();
    if (homeSection) homeSection.style.display = 'none';
    if (bibliotecaSection) bibliotecaSection.style.display = 'grid';
    if (bibliaSection) bibliaSection.style.display = 'none';
    if (quizSection) quizSection.style.display = 'none';
    if (quizDesafioSection) quizDesafioSection.style.display = 'none';
    if (desafiosSection) desafiosSection.style.display = 'none';
    const gamificacaoSection = document.getElementById('gamificacaoSection');
    if (gamificacaoSection) gamificacaoSection.style.display = 'none';
    bibliotecaSomenteFavoritos = comFavoritos;
    sincronizarEstadoApp();

    if (librarySectionTitle) {
        librarySectionTitle.textContent = comFavoritos ? 'Favoritos' : 'Biblioteca';
    }

    if (librarySectionSubtitle) {
        librarySectionSubtitle.textContent = comFavoritos ? 'Suas musicas favoritas' : 'Todas as musicas';
    }

    albumSelecionado = null;
    sincronizarEstadoApp();
    navegarPorRota(comFavoritos ? '/biblioteca/favoritos' : '/biblioteca');
    renderizarBiblioteca();
}

function mostrarHome(opcoes = {}) {
    ocultarGamificacao();
    if (homeSection) homeSection.style.display = 'grid';
    if (bibliotecaSection) bibliotecaSection.style.display = 'none';
    if (bibliaSection) bibliaSection.style.display = 'none';
    if (quizSection) quizSection.style.display = 'none';
    if (quizDesafioSection) quizDesafioSection.style.display = 'none';
    if (desafiosSection) desafiosSection.style.display = 'none';
    const gamificacaoSection = document.getElementById('gamificacaoSection');
    if (gamificacaoSection) gamificacaoSection.style.display = 'none';
    if (typeof window.pararTimerQuizDesafio === 'function') window.pararTimerQuizDesafio();
     // Reseta a seleção do álbum ao voltar para a home, fechando o carrossel aberto
    albumSelecionado = null;
    sincronizarEstadoApp();
    if (!opcoes.preservarRota) navegarPorRota('/');
    renderizarFaixasDoAlbum(null);
}


function abrirMusicaCompartilhadaPorIdDaURL() {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");

    if (!idParam || !Array.isArray(musicas) || musicas.length === 0) return false;

    const idNumero = Number(idParam);
    const indice = musicas.findIndex(m =>
        Number(m.id) === idNumero || String(m.id) === String(idParam)
    );

    if (indice < 0) return false;
// trava global para impedir sobrescrita pelo Top1
    window.__musicaInicialViaLink = true;
    window.__musicaInicialIndice = indice;

    if (typeof carregarPlaylist === "function") carregarPlaylist(musicas);
    if (typeof tocar === "function") tocar(indice);

    return true;
}

function abrirDesafioCompartilhadoPorIdDaURL() {
    const params = new URLSearchParams(window.location.search);
    const desafioId = params.get("desafio");
    if (!desafioId || typeof window.mostrarQuizDesafio !== "function") return false;
    window.mostrarQuizDesafio(desafioId);
    return true;
}


function carregarDados() {
    fetch('musicas.json')
        .then(response => {
            if (!response.ok) throw new Error(`musicas.json nao encontrado (${response.status})`);
            return response.json();
        })
        
.then(data => {
    if (!Array.isArray(data)) throw new Error('musicas.json precisa conter uma lista de musicas');
    musicas = data;
    sincronizarEstadoApp();
    window.musicas = data;
    const totalMusicas = Number(data.at(-1)?.id || data.length);
    const musicasHojeCount = document.getElementById('musicasHojeCount');

if (musicasHojeCount) {
    musicasHojeCount.textContent = totalMusicas;
}
    if (typeof carregarPlaylist === 'function') carregarPlaylist(musicas);

    if (typeof window.carregarFavoritos === 'function') {
        window.carregarFavoritos().catch((erro) => console.warn('Falha ao carregar favoritos:', erro.message));
    }

    exibirHome();
    carregarRanking();
    if (typeof carregarRankingQuiz === 'function') {
        carregarRankingQuiz();
    }

    const abriuViaLink = abrirMusicaCompartilhadaPorIdDaURL();
    if (!abriuViaLink && typeof inicializarPlayerComTop1 === 'function') {
        inicializarPlayerComTop1();
    }

    abrirDesafioCompartilhadoPorIdDaURL();

    if (typeof inicializarPesquisa === 'function') {
        inicializarPesquisa();
    }
})

        .catch(err => {
            console.error('Erro ao carregar musicas:', err);
            if (libraryGrid) {
                libraryGrid.innerHTML = '<p class="empty-state">Nao foi possivel carregar as musicas. Abra o site por um servidor local.</p>';
            }
        });
}

function exibirHome() {
    const marcadas = musicas.filter(m => m.destaque === true);
    let selecionadas = marcadas.slice(0, 3);

    if (selecionadas.length < 3) {
        const idsJaUsados = new Set(selecionadas.map(m => m.id));
        const complemento = [...musicas]
            .filter(m => !idsJaUsados.has(m.id))
            .sort((a, b) => new Date(b.data_cadastro || 0) - new Date(a.data_cadastro || 0))
            .slice(0, 3 - selecionadas.length);
        selecionadas = [...selecionadas, ...complemento];
    }

    // Prioriza quem tem destaque_principal:true; senão usa o primeiro da lista
    const indicePrincipal = selecionadas.findIndex(m => m.destaque_principal === true);
    const destaque = indicePrincipal >= 0
        ? selecionadas.splice(indicePrincipal, 1)[0]
        : selecionadas.shift();

    if (destaqueTitulo) destaqueTitulo.textContent = destaque?.titulo || 'Sem destaque';
    if (destaqueArtista) destaqueArtista.textContent = destaque?.artista || 'Nenhuma música disponível';
    if (destaqueCapa && destaque) {
        destaqueCapa.src = destaque.capa_musica || 'assets/icons/album.svg';
        destaqueCapa.onerror = () => {
            destaqueCapa.src = 'assets/icons/album.svg';
        };
    }

    if (miniCardsNovidades) {
        miniCardsNovidades.innerHTML = '';
        selecionadas.slice(0, 2).forEach((musica) => {
            // Procura o índice diretamente na playlist/musicas global de forma segura
            const idx = playlist.length > 0 
                ? playlist.findIndex(item => item.audio === musica.audio) 
                : musicas.findIndex(item => item.audio === musica.audio);
                
            miniCardsNovidades.innerHTML += criarCardMiniNovidade(musica, idx);
        });
    }

    renderizarFavoritosVisiveis();
    renderizarAlbuns();
}

function criarCardMiniNovidade(musica, index) {
    const capa = musica.capa_musica || 'assets/icons/album.svg';
    return `
        <article class="mini-card-compact" onclick="tocar(${index})">
            <div class="card-cover-wrap">
                <img src="${capa}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
            </div>
            <div>
                <strong>${musica.titulo}</strong>
                <small>${musica.artista}</small>
            </div>
            <button class="card-play" onclick="event.stopPropagation(); tocar(${index})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                <img src="assets/icons/play.svg" alt="">
            </button>
        </article>
    `;
}

function renderizarFavoritosVisiveis() {
    if (!favoritosVisiveis) return;
    const favoritos = window.obterFavoritos ? window.obterFavoritos() : [];
    favoritosVisiveis.innerHTML = '';
    favoritos.slice(0, 4).forEach((musica, indexFavorito) => {
        favoritosVisiveis.innerHTML += criarCardFavoritoCompacto(musica, indexFavorito);
    });
}

function criarCardFavoritoCompacto(musica, indexFavorito) {
    const capa = musica.capa_musica || 'assets/icons/album.svg';
    return `
        <article class="favorito-card-compact" onclick="window.tocarFavoritoPorIndice(${indexFavorito})">
            <div class="card-cover-wrap">
                <img src="${capa}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
            </div>
            <div class="favorito-meta">
                <strong>${musica.titulo}</strong>
                <small>${musica.artista}</small>
            </div>
            <button class="card-play" onclick="event.stopPropagation(); window.tocarFavoritoPorIndice(${indexFavorito})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                <img src="assets/icons/play.svg" alt="">
            </button>
        </article>
    `;
}

function renderizarAlbuns() {
    if (!albumsContainer) return;
    const albunsUnicos = [];
    albumsContainer.innerHTML = '';
    musicas.forEach(musica => {
        if (musica.album && !albunsUnicos.includes(musica.album)) {
            albunsUnicos.push(musica.album);
            albumsContainer.innerHTML += criarCardAlbum(musica);
        }
    });
}

function criarCardAlbum(musica) {
    const capa = musica.capa || 'assets/icons/album.svg';
    const albumEscapado = JSON.stringify(musica.album || '');
    return `
        <article class="album-card" onclick='filtrarBibliotecaPorAlbum(${albumEscapado})'>
            <img src="${capa}" alt="${musica.album}" onerror="this.src='assets/icons/album.svg'">
        </article>
    `;
}

function filtrarBibliotecaPorAlbum(album) {
    if (albumSelecionado === album && album !== null) {
        albumSelecionado = null;
        sincronizarEstadoApp();
        renderizarBiblioteca();
        renderizarFaixasDoAlbum(null);
        return;
    }
    albumSelecionado = album;
    sincronizarEstadoApp();
    renderizarBiblioteca();
    renderizarFaixasDoAlbum(album);
}

function renderizarFaixasDoAlbum(album) {
    if (!albumTracksPanel || !albumTracksList || !albumTracksTitle) return;

    if (!album) {
        albumTracksPanel.hidden = true;
        albumTracksList.innerHTML = '';
        return;
    }

    const favoritos = window.obterFavoritos ? window.obterFavoritos() : [];
    const favoritoPorChave = new Set(favoritos.map(obterChaveMusica));
    const faixas = musicas.filter(musica => musica.album === album);

    albumTracksTitle.textContent = `Faixas de ${album}`;
    albumTracksList.innerHTML = faixas.length ? faixas.map((musica) => {
        const indice = musicas.findIndex(m => m.audio === musica.audio);
        const chave = obterChaveMusica(musica);
        const ehFavorita = favoritoPorChave.has(chave);
        return `
            <article class="album-track-item" onclick="tocar(${indice})">
                <img src="${musica.capa_musica || 'assets/icons/album.svg'}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
                <div class="album-track-meta">
                    <strong>${musica.titulo}</strong>
                    <small>${musica.artista}</small>
                </div>
                <div class="library-actions">
                    <button class="library-play" onclick="event.stopPropagation(); tocar(${indice})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                        <img src="assets/icons/play.svg" alt="">
                    </button>
                    <button class="library-favorite ${ehFavorita ? 'is-favorited' : ''}" onclick="event.stopPropagation(); alternarFavoritoBiblioteca(${indice})" aria-label="Favoritar ${musica.titulo}" title="Favoritar">
                        <img src="${ehFavorita ? 'assets/icons/heart-fill-red.svg' : 'assets/icons/heart-outline-red.svg'}" alt="Favorito">
                    </button>
                </div>
            </article>
        `;
    }).join('') : '<p class="empty-state">Nenhuma faixa neste album.</p>';

    albumTracksPanel.hidden = false;
}

function renderizarBiblioteca() {
    if (!libraryGrid) return;
    const favoritos = window.obterFavoritos ? window.obterFavoritos() : [];
    const favoritoPorChave = new Set(favoritos.map(obterChaveMusica));
    const listaBase = bibliotecaSomenteFavoritos
        ? musicas.filter(musica => favoritoPorChave.has(obterChaveMusica(musica)))
        : musicas;
    const lista = albumSelecionado
        ? listaBase.filter(m => m.album === albumSelecionado)
        : [...listaBase];

    libraryGrid.innerHTML = lista.length ? lista.map((musica) => {
        const chaveMusica = obterChaveMusica(musica);
        const ehFavorita = favoritoPorChave.has(chaveMusica);
        const indiceMusica = musicas.findIndex(m => m.audio === musica.audio);
        const indiceFavorito = favoritos.findIndex(m => obterChaveMusica(m) === chaveMusica);
        const acaoTocar = bibliotecaSomenteFavoritos
            ? `window.tocarFavoritoPorIndice(${indiceFavorito})`
            : `tocar(${indiceMusica})`;
        return `
            <article class="library-item" onclick="${acaoTocar}">
                <img src="${musica.capa_musica || 'assets/icons/album.svg'}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
                <div>
                    <strong>${musica.titulo}</strong>
                    <small>${musica.artista}</small>
                </div>
                <div class="library-actions">
                    <button class="library-play" onclick="event.stopPropagation(); ${acaoTocar}" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                        <img src="assets/icons/play.svg" alt="">
                    </button>
                    <button class="library-favorite ${ehFavorita ? 'is-favorited' : ''}" onclick="event.stopPropagation(); alternarFavoritoBiblioteca(${musicas.findIndex(m => m.audio === musica.audio)})" aria-label="Favoritar ${musica.titulo}" title="Favoritar">
                        <img src="${ehFavorita ? 'assets/icons/heart-fill-red.svg' : 'assets/icons/heart-outline-red.svg'}" alt="Favorito">
                    </button>
                </div>
            </article>
        `;
    }).join('') : '<p class="empty-state">Nenhuma musica encontrada.</p>';

    if (albumFilter) {
        const albunsUnicos = [...new Set(musicas.map(m => m.album).filter(Boolean))];
        albumFilter.innerHTML = `
            <button class="chip ${albumSelecionado === null ? 'active' : ''}" onclick="filtrarBibliotecaPorAlbum(null)">Todos</button>
            ${albunsUnicos.map(album => {
                const albumEscapado = JSON.stringify(album || '');
                return `<button class="chip ${albumSelecionado === album ? 'active' : ''}" onclick='filtrarBibliotecaPorAlbum(${albumEscapado})'>${album}</button>`;
            }).join('')}
        `;
    }
}

function renderizarRanking(ranking) {
    rankingData = Array.isArray(ranking) ? ranking : [];
    sincronizarEstadoApp();
    if (!moreOuvidasContainer) return;
    moreOuvidasContainer.innerHTML = '';

    const rankingNormalizado = rankingData
        .filter(item => item && item.id != null)
        .map(item => ({
            id: Number(item.id),
            reproducoes: Number(item.reproducoes) || 0
        }))
        .sort((a, b) => b.reproducoes - a.reproducoes);

    if (rankingNormalizado.length === 0) {
        moreOuvidasContainer.innerHTML = '<p class="empty-state">Ranking sem dados no momento.</p>';
        return;
    }

    const medalhas = ['🥇', '🥈', '🥉'];

    rankingNormalizado.slice(0, 8).forEach((item, index) => {
        const musica = musicas.find(m => Number(m.id) === Number(item.id));
        const rankLabel = medalhas[index] || `${index + 1}`;
        const reproducoes = item.reproducoes || 0;
        const labelReproducoes = reproducoes === 1
            ? `${reproducoes} reproducao`
            : `${reproducoes} reproducoes`;
        const indiceMusica = musicas.findIndex(m => Number(m.id) === Number(item.id));

        if (!musica) {
            moreOuvidasContainer.innerHTML += `
                <article class="ranking-card" data-ranking-id="${item.id}">
                    <img src="assets/icons/album.svg" alt="Faixa fora do catalogo" onerror="this.src='assets/icons/album.svg'">
                    <div class="ranking-footer">
                        <button class="card-play" type="button" aria-label="Faixa indisponivel" title="Faixa indisponivel" disabled>
                            <img src="assets/icons/play.svg" alt="">
                        </button>
                        <div class="ranking-badge">${rankLabel}</div>
                    </div>
                    <small>${labelReproducoes}</small>
                </article>
            `;
            return;
        }

        moreOuvidasContainer.innerHTML += `
            <article class="ranking-card" onclick="tocar(${indiceMusica})" data-ranking-id="${item.id}">
                <img src="${musica.capa_musica || 'assets/icons/album.svg'}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
                <div class="ranking-footer">
                    <button class="card-play" onclick="event.stopPropagation(); tocar(${indiceMusica})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                        <img src="assets/icons/play.svg" alt="">
                    </button>
                    <div class="ranking-badge">${rankLabel}</div>
                </div>
                <small>${labelReproducoes}</small>
            </article>
        `;
    });
}

function tocarDestaque() {
    // Busca exatamente a música marcada como destaque principal no array global
    const destaquePrincipal = musicas.find(m => m.destaque_principal === true) || musicas.find(m => m.destaque === true);
    if (!destaquePrincipal) return;

    // Acha o índice real dessa música dentro da playlist atual do player
    const index = playlist.findIndex(m => m.audio === destaquePrincipal.audio);
    if (index >= 0) {
        tocar(index);
    } else {
        // Fallback caso a playlist ainda não esteja sincronizada
        carregarPlaylist(musicas);
        const indexGlobal = musicas.findIndex(m => m.audio === destaquePrincipal.audio);
        if (indexGlobal >= 0) tocar(indexGlobal);
    }
}

window.renderizarFavoritosHorizontais = function() {
    renderizarFavoritosVisiveis();
};

window.navegarPorRota = navegarPorRota;
window.aplicarRotaAtual = aplicarRotaAtual;
window.mostrarBiblioteca = mostrarBiblioteca;
window.mostrarHome = mostrarHome;
window.filtrarBibliotecaPorAlbum = filtrarBibliotecaPorAlbum;
window.tocarDestaque = tocarDestaque;
window.renderizarRanking = renderizarRanking;
window.carregarDados = carregarDados;
window.renderizarBibliotecaAtual = renderizarBiblioteca;
window.alternarFavoritoBiblioteca = function(indice) {
    if (typeof window.toggleFavoritoPorIndice === 'function') {
        window.toggleFavoritoPorIndice(indice);
    }
    renderizarFavoritosVisiveis();
    renderizarBiblioteca();
    if (albumSelecionado) {
        renderizarFaixasDoAlbum(albumSelecionado);
    }
};

window.addEventListener('adoraplay:favoritos-atualizados', () => {
    renderizarFavoritosVisiveis();
    renderizarBiblioteca();
    if (albumSelecionado) renderizarFaixasDoAlbum(albumSelecionado);
});

window.addEventListener('popstate', () => {
    aplicarRotaAtual();
});

window.addEventListener('hashchange', () => {
    aplicarRotaAtual();
});

function inicializarRouter() {
    const rotaInicial = obterRotaAtual();
    const params = new URLSearchParams(window.location.search);

    if (rotaInicial === '/' && params.get('id')) {
        setTimeout(() => abrirMusicaCompartilhadaPorIdDaURL(), 0);
        return;
    }

    if (rotaInicial === '/' && params.get('desafio')) {
        setTimeout(() => abrirDesafioCompartilhadoPorIdDaURL(), 0);
        return;
    }

    window.addEventListener('load', () => {
        aplicarRotaAtual();
    }, { once: true });
}

inicializarMenuMobile();
inicializarInstalacaoPWA();
inicializarRouter();
carregarDados();
