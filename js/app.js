const homeSection = document.getElementById('homeSection');
const bibliotecaSection = document.getElementById('bibliotecaSection');
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

let musicas = [];
let albumSelecionado = null;
let rankingData = [];
let bibliotecaSomenteFavoritos = false;
let deferredInstallPrompt = null;

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

        if (window.innerWidth <= 680 && alvo.closest('button')) {
            fecharMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 680) {
            fecharMenu();
        }
    });
}

function inicializarInstalacaoPWA() {
    if (!btnInstall) return;

    const emStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (emStandalone) {
        btnInstall.hidden = true;
        return;
    }

    btnInstall.hidden = false;
    btnInstall.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            alert('Para instalar, use o menu do navegador e escolha "Instalar app" ou "Adicionar a tela inicial".');
            return;
        }

        deferredInstallPrompt.prompt();
        try {
            await deferredInstallPrompt.userChoice;
        } catch (err) {
            console.warn('Instalacao cancelada:', err);
        }

        deferredInstallPrompt = null;
        btnInstall.hidden = true;
    });
}

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (btnInstall) btnInstall.hidden = false;
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (btnInstall) btnInstall.hidden = true;
});

function mostrarBiblioteca(comFavoritos = false) {
    if (homeSection) homeSection.style.display = 'none';
    if (bibliotecaSection) bibliotecaSection.style.display = 'grid';
    bibliotecaSomenteFavoritos = comFavoritos;

    if (librarySectionTitle) {
        librarySectionTitle.textContent = comFavoritos ? 'Favoritos' : 'Biblioteca';
    }

    if (librarySectionSubtitle) {
        librarySectionSubtitle.textContent = comFavoritos ? 'Suas musicas favoritas' : 'Todas as musicas';
    }

    albumSelecionado = null;
    renderizarBiblioteca();
}

function mostrarHome() {
    if (homeSection) homeSection.style.display = 'grid';
    if (bibliotecaSection) bibliotecaSection.style.display = 'none';
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
            window.musicas = data;
            if (typeof carregarPlaylist === 'function') carregarPlaylist(musicas);
            exibirHome();
            carregarRanking();
            inicializarPlayerComTop1();
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
            const idx = musicas.findIndex(item => item.audio === musica.audio);
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
    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    favoritosVisiveis.innerHTML = '';
    favoritos.slice(0, 4).forEach(musica => {
        const idx = musicas.findIndex(item => item.audio === musica.audio);
        favoritosVisiveis.innerHTML += criarCardFavoritoCompacto(musica, idx);
    });
}

function criarCardFavoritoCompacto(musica, index) {
    const capa = musica.capa_musica || 'assets/icons/album.svg';
    return `
        <article class="favorito-card-compact" onclick="tocar(${index})">
            <div class="card-cover-wrap">
                <img src="${capa}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
            </div>
            <div class="favorito-meta">
                <strong>${musica.titulo}</strong>
                <small>${musica.artista}</small>
            </div>
            <button class="card-play" onclick="event.stopPropagation(); tocar(${index})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
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
        renderizarBiblioteca();
        renderizarFaixasDoAlbum(null);
        return;
    }
    albumSelecionado = album;
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

    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    const favoritoPorChave = new Set(favoritos.map(f => String(f.audio || f.id || f.titulo || '').trim()));
    const faixas = musicas.filter(musica => musica.album === album);

    albumTracksTitle.textContent = `Faixas de ${album}`;
    albumTracksList.innerHTML = faixas.length ? faixas.map((musica) => {
        const indice = musicas.findIndex(m => m.audio === musica.audio);
        const chave = String(musica.audio || musica.id || musica.titulo || '').trim();
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
    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    const favoritoPorChave = new Set(favoritos.map(f => String(f.audio || f.id || f.titulo || '').trim()));
    const listaBase = bibliotecaSomenteFavoritos
        ? musicas.filter(musica => favoritoPorChave.has(String(musica.audio || musica.id || musica.titulo || '').trim()))
        : musicas;
    const lista = albumSelecionado
        ? listaBase.filter(m => m.album === albumSelecionado)
        : [...listaBase];

    libraryGrid.innerHTML = lista.length ? lista.map((musica) => {
        const chaveMusica = String(musica.audio || musica.id || musica.titulo || '').trim();
        const ehFavorita = favoritoPorChave.has(chaveMusica);
        return `
            <article class="library-item" onclick="tocar(${musicas.findIndex(m => m.audio === musica.audio)})">
                <img src="${musica.capa_musica || 'assets/icons/album.svg'}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
                <div>
                    <strong>${musica.titulo}</strong>
                    <small>${musica.artista}</small>
                </div>
                <div class="library-actions">
                    <button class="library-play" onclick="event.stopPropagation(); tocar(${musicas.findIndex(m => m.audio === musica.audio)})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
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

    rankingNormalizado.slice(0, 8).forEach((item, index) => {
        const musica = musicas.find(m => Number(m.id) === Number(item.id));
        const rankLabel = index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `${index + 1}`;
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
    const destaque = [...musicas].slice(-1)[0];
    const index = musicas.findIndex(m => m.audio === destaque?.audio);
    if (index >= 0) tocar(index);
}

window.renderizarFavoritosHorizontais = function() {
    renderizarFavoritosVisiveis();
};

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

inicializarMenuMobile();
inicializarInstalacaoPWA();
carregarDados();
