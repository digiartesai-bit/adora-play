// Elementos Globais
const audioPlayer = document.getElementById("audioPlayer");
const miniPlayer = document.getElementById("miniPlayer");
const miniCapa = document.getElementById("miniCapa");
const miniTitulo = document.getElementById("miniTitulo");
const miniArtista = document.getElementById("miniArtista");
const btnPlay = document.getElementById("btnPlay");
const imgFavoritoMini = document.getElementById("imgFavorito");
const imgFavoritoHero = document.getElementById("imgFavoritoHero");
const btnFavoritoMini = imgFavoritoMini ? imgFavoritoMini.closest("button") : null;
const btnFavoritoHero = imgFavoritoHero ? imgFavoritoHero.closest("button") : null;

// Novos Elementos Globais para Shuffle e Repeat
const btnShuffle = document.getElementById("btnShuffle");
const btnRepeat = document.getElementById("btnRepeat");

// Elementos da Barra de Progresso
const progressBar = document.getElementById("progressBar");
const currentTime = document.getElementById("currentTime");
const durationTime = document.getElementById("durationTime");

function atualizarEspacoMiniPlayer() {
    if (!miniPlayer) return;

    const estilos = window.getComputedStyle(miniPlayer);
    const bottom = parseFloat(estilos.bottom) || 0;
    const altura = miniPlayer.offsetHeight || 0;
    const espaco = Math.max(110, Math.ceil(altura + bottom + 12));
    document.body.style.setProperty("--mini-player-space", `${espaco}px`);
}

if (miniPlayer) {
    window.addEventListener("resize", atualizarEspacoMiniPlayer);
    window.addEventListener("orientationchange", atualizarEspacoMiniPlayer);

    if (typeof ResizeObserver !== "undefined") {
        const miniPlayerObserver = new ResizeObserver(() => {
            atualizarEspacoMiniPlayer();
        });
        miniPlayerObserver.observe(miniPlayer);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", atualizarEspacoMiniPlayer, { once: true });
    } else {
        atualizarEspacoMiniPlayer();
    }
}

// Estado
let playlist = [];
let musicaAtual = 0;
let tocando = false;

// Estados das novas funções
let modoShuffle = false;
let modoRepeat = false; // false = sem repetição, true = repete a música atual
let favoritos = [];
const API_URL = "https://adoraplay-api.digiartesai.workers.dev";

// Variável de controle para contar apenas uma vez por reprodução
let streamRegistrado = false;

// Simplificado para ler diretamente "capa_musica" do seu JSON
function obterCapaMusica(musica) {
    if (!musica) return "assets/icons/album.svg";
    if (musica.capa_musica) {
        return musica.capa_musica;
    }
    return musica.capa || "assets/icons/album.svg";
}

function limitarTituloPlayer(texto, limite = 10) {
    const valor = String(texto || "");
    return valor.length > limite ? `${valor.slice(0, limite)}...` : valor;
}

// Garante o carregamento da playlist dinâmica do app.js
function carregarPlaylist(lista) { 
    playlist = [...lista]; 
    atualizarBotoesModo();
}

if (window.playlist && window.playlist.length > 0) {
    playlist = [...window.playlist];
}

function obterUsuarioGoogle() {
    try {
        return JSON.parse(localStorage.getItem('adoraplayGoogleUser'));
    } catch {
        return null;
    }
}

function obterFavoritos() {
    return [...favoritos];
}

function notificarFavoritosAtualizados() {
    window.dispatchEvent(new Event('adoraplay:favoritos-atualizados'));
    atualizarBotaoFavorito();
}

async function migrarFavoritosLegados(usuario) {
    const dadosLegados = localStorage.getItem('favoritos');
    if (!dadosLegados) return;

    let favoritosLegados;
    try {
        favoritosLegados = JSON.parse(dadosLegados);
    } catch {
        localStorage.removeItem('favoritos');
        return;
    }

    if (!Array.isArray(favoritosLegados)) return;

    await Promise.all(favoritosLegados
        .filter((musica) => musica?.id != null)
        .map(async (musica) => {
            const resposta = await fetch(`${API_URL}/api/favoritos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    google_id: usuario.google_id,
                    musica_id: musica.id,
                    titulo: musica.titulo,
                    artista: musica.artista
                })
            });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        }));

    localStorage.removeItem('favoritos');
}

async function carregarFavoritos() {
    const usuario = obterUsuarioGoogle();
    if (!usuario?.google_id) {
        favoritos = [];
        notificarFavoritosAtualizados();
        return;
    }

    await migrarFavoritosLegados(usuario);

    const resposta = await fetch(`${API_URL}/api/favoritos?google_id=${encodeURIComponent(usuario.google_id)}`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const favoritosRemotos = await resposta.json();
    const catalogo = Array.isArray(window.musicas) ? window.musicas : playlist;
    favoritos = favoritosRemotos.map((favorito) => {
        const musicaCatalogo = catalogo.find((musica) => String(musica.id) === String(favorito.musica_id));
        return musicaCatalogo || {
            id: favorito.musica_id,
            titulo: favorito.titulo,
            artista: favorito.artista
        };
    });
    notificarFavoritosAtualizados();
}

function chaveMusica(musica) {
    if (!musica) return "";
    return String(musica.audio || musica.id || musica.titulo || "").trim();
}

async function alternarFavoritoDaMusica(musica) {
    if (!musica) return false;

    const usuario = obterUsuarioGoogle();
    if (!usuario?.google_id) {
        window.alert("Entre com sua conta Google para salvar favoritos.");
        return false;
    }

    const musicaParaSalvar = {
        ...musica,
        capa: obterCapaMusica(musica),
        capa_musica: obterCapaMusica(musica)
    };

    const chave = chaveMusica(musicaParaSalvar);
    const index = favoritos.findIndex(f => chaveMusica(f) === chave);

    const favoritado = index === -1;
    const resposta = await fetch(`${API_URL}/api/favoritos`, {
        method: favoritado ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(favoritado ? {
            google_id: usuario.google_id,
            musica_id: musicaParaSalvar.id,
            titulo: musicaParaSalvar.titulo,
            artista: musicaParaSalvar.artista
        } : {
            google_id: usuario.google_id,
            musica_id: musicaParaSalvar.id
        })
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    if (index > -1) {
        favoritos.splice(index, 1);
    } else {
        favoritos.push(musicaParaSalvar);
    }
    notificarFavoritosAtualizados();
    return favoritado;
}

window.obterFavoritos = obterFavoritos;
window.carregarFavoritos = carregarFavoritos;
window.addEventListener('adoraplay:login', () => {
    carregarFavoritos().catch((erro) => console.warn("Falha ao carregar favoritos:", erro.message));
});
window.addEventListener('adoraplay:logout', () => {
    favoritos = [];
    notificarFavoritosAtualizados();
});

// Configura a Media Session para o PWA não morrer em segundo plano
function configurarMediaSession() {
    if ('mediaSession' in navigator && playlist.length > 0) {
        const musica = playlist[musicaAtual];
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: musica.titulo || "Música",
            artist: musica.artista || "Artista",
            album: "Adoraplay",
            artwork: [
                { src: obterCapaMusica(musica), sizes: '512x512', type: 'image/png' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => { playPause(); });
        navigator.mediaSession.setActionHandler('pause', () => { playPause(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { anterior(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { proxima(); });
    }
}

// Toca uma música com base no índice
function tocar(indice) {
    if (!playlist || playlist.length === 0) return;
    if (indice < 0 || indice >= playlist.length) return;
    
    musicaAtual = indice;
    const musica = playlist[indice];
    
    // Reseta a trava do stream para a nova música que vai começar
    streamRegistrado = false;
    
    // Salva no histórico local do navegador ao dar play
    salvarNoHistorico(musica);
    
    // Define o áudio
    audioPlayer.src = musica.audio;
    
    // Exibe o mini-player IMEDIATAMENTE
    if (miniPlayer) {
        miniPlayer.style.display = "flex";
    }
    
    // Atualiza as informações na tela na mesma hora
    atualizarMiniPlayer();
    
    // Atualiza o sistema do celular sobre a mídia atual (fundamental para PWA)
    configurarMediaSession();
    
    // Inicia a reprodução tratando possíveis bloqueios do navegador
    audioPlayer.play()
        .then(() => {
            tocando = true;
            atualizarMiniPlayer(); 
        })
        .catch(erro => {
            console.warn("A reprodução foi impedida pelo navegador ou o áudio falhou:", erro);
            tocando = false;
            atualizarMiniPlayer();
        });
}

// Controla o Play e o Pause com segurança inteligente
function playPause() {
    // 1. SE NÃO HOUVER MÚSICA CARREGADA
    if (!audioPlayer.src || audioPlayer.src === "" || audioPlayer.src === window.location.href) {
        if (typeof musicas !== "undefined" && musicas.length > 0) {
            carregarPlaylist(musicas);
            let indiceParaTocar = 0;

            if (typeof maisOuvidas !== "undefined" && maisOuvidas.length > 0) {
                const top1 = maisOuvidas[0]; 
                const idxTop1 = musicas.findIndex(m => m.id === top1.id);
                if (idxTop1 >= 0) {
                    indiceParaTocar = idxTop1;
                }
            }

            tocar(indiceParaTocar);
            return;
        }
    }

    // 2. LÓGICA PADRÃO
    if (tocando) {
        audioPlayer.pause();
        tocando = false;
        atualizarMiniPlayer();
    } else {
        audioPlayer.play()
            .then(() => {
                tocando = true;
                atualizarMiniPlayer();
            })
            .catch(erro => {
                console.error("Erro ao tentar reproduzir:", erro);
                tocando = false;
                atualizarMiniPlayer();
            });
    }
}

// Atualiza o estado visual do player
function atualizarMiniPlayer() {
    if (!miniPlayer) return;
    miniPlayer.style.display = "flex";
    atualizarEspacoMiniPlayer();
    
    if (!playlist || !playlist[musicaAtual]) return;
    const musica = playlist[musicaAtual];
    
    if (miniTitulo) {
        miniTitulo.textContent = limitarTituloPlayer(musica.titulo, 35);
        miniTitulo.title = musica.titulo || "";
    }
    if (miniArtista) miniArtista.textContent = musica.artista;
    
    if (miniCapa) {
        const capaIndividual = obterCapaMusica(musica);
        miniCapa.src = capaIndividual;
        miniCapa.onerror = () => {
            miniCapa.src = musica.capa || "assets/icons/album.svg";
        };
    }
    
    if (btnPlay) {
        let img = btnPlay.querySelector("img");
        if (img) {
            img.src = tocando ? "assets/icons/pause.svg" : "assets/icons/play.svg";
            img.style.marginLeft = tocando ? "0px" : "2px";
        }
    }
    
    atualizarBotoesModo();
    atualizarBotaoFavorito();
}

// Pula para a próxima música (Otimizado para segundo plano)
function proxima() { 
    if (playlist.length === 0) return;

    if (modoShuffle) {
        if (playlist.length > 1) {
            let novoIndice;
            for (let i = 0; i < 10; i++) {
                novoIndice = Math.floor(Math.random() * playlist.length);
                if (novoIndice !== musicaAtual) break;
            }
            musicaAtual = novoIndice;
        } else {
            musicaAtual = 0;
        }
    } else {
        musicaAtual = (musicaAtual + 1) % playlist.length; 
    }
    
    tocar(musicaAtual); 
}

// Volta para a música anterior (Otimizado para segundo plano)
function anterior() { 
    if (playlist.length === 0) return;

    if (modoShuffle) {
        if (playlist.length > 1) {
            let novoIndice;
            for (let i = 0; i < 10; i++) {
                novoIndice = Math.floor(Math.random() * playlist.length);
                if (novoIndice !== musicaAtual) break;
            }
            musicaAtual = novoIndice;
        } else {
            musicaAtual = 0;
        }
    } else {
        musicaAtual = (musicaAtual - 1 + playlist.length) % playlist.length; 
    }
    
    tocar(musicaAtual); 
}

// FUNÇÃO: Ativa / Desativa o Modo Aleatório (Shuffle)
function alternarShuffle() {
    modoShuffle = !modoShuffle;
    if (modoShuffle) {
        modoRepeat = false;
    }
    atualizarBotoesModo();
}

// FUNÇÃO: Ativa / Desativa a Repetição
function alternarRepeat() {
    modoRepeat = !modoRepeat;
    if (modoRepeat) {
        modoShuffle = false;
    }
    atualizarBotoesModo();
}

// Visual dos botões de Shuffle e Repeat
function atualizarBotoesModo() {
    const btnShuffle = document.getElementById("btnShuffle");
    const btnRepeat = document.getElementById("btnRepeat");

    const filtroAtivo = "brightness(1.5) saturate(10) drop-shadow(0px 0px 5px rgba(212, 175, 55, 0.9))";
    const filtroInativo = "brightness(0) saturate(100%) invert(84%) sepia(23%) saturate(1067%) hue-rotate(352deg) brightness(85%) contrast(85%)";

    if (btnShuffle) {
        let img = btnShuffle.querySelector("img");
        if (img) {
            img.style.filter = modoShuffle ? filtroAtivo : filtroInativo;
            img.style.opacity = modoShuffle ? "1" : "0.5";
        }
    }
    
    if (btnRepeat) {
        let img = btnRepeat.querySelector("img");
        if (img) {
            img.style.filter = modoRepeat ? filtroAtivo : filtroInativo;
            img.style.opacity = modoRepeat ? "1" : "0.5";
        }
    }
}

function formatarTempo(segundos) {
    if (isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

// Eventos de Progresso e Tratamento de Rede do Áudio
if (audioPlayer) {
    
    // PROTEÇÃO CONTRA CONEXÃO LENTA/QUEDA: Se o áudio falhar ao carregar, tenta avançar após 3 segundos
    audioPlayer.addEventListener("error", () => {
        console.warn("Erro de rede ao carregar áudio. Tentando próxima música em instantes...");
        setTimeout(() => {
            proxima();
        }, 3000);
    });

    audioPlayer.addEventListener("play", () => {
        if (audioPlayer.currentTime < 1) {
            streamRegistrado = false;
        }
    });

    // ⬇️ COLE ESTE BLOCO NOVO AQUI ⬇️
    audioPlayer.addEventListener("timeupdate", () => {
        if (audioPlayer.duration && (audioPlayer.duration - audioPlayer.currentTime <= 15)) {
            if (!audioPlayer._preloadedNext) {
                audioPlayer._preloadedNext = true;
                const proximoIndice = (musicaAtual + 1) % playlist.length;
                if (playlist[proximoIndice]) {
                    const preloadLink = document.createElement('link');
                    preloadLink.rel = 'prefetch';
                    preloadLink.href = playlist[proximoIndice].audio;
                    document.head.appendChild(preloadLink);
                }
            }
        }
    });

    audioPlayer.addEventListener("play", () => {
        audioPlayer._preloadedNext = false;
    });
    // ⬆️ FIM DO BLOCO NOVO ⬆️


    audioPlayer.addEventListener("timeupdate", () => {
        const current = audioPlayer.currentTime;
        const duration = audioPlayer.duration;

        if (progressBar) {
            progressBar.value = duration ? (current / duration) * 100 : 0;
        }

        if (currentTime) currentTime.textContent = formatarTempo(current);
        if (durationTime) durationTime.textContent = formatarTempo(duration || 0);

        if (duration && !streamRegistrado) {
            const porcentagemOuvida = (current / duration) * 100;
            if (porcentagemOuvida >= 90) {
                registrarReproducao(playlist[musicaAtual].id);
                streamRegistrado = true;
            }
        }
    });

    audioPlayer.addEventListener("ended", () => {
        if (modoRepeat) {
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(err => console.log(err));
        } else {
            proxima();
        }
    });
}

if (progressBar) {
    progressBar.addEventListener("input", () => {
        if (audioPlayer && audioPlayer.duration) {
            audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
        }
    });
}

// LÓGICA DE FAVORITOS
async function toggleFavorito() {
    if (!playlist || !playlist[musicaAtual]) return;
    const musica = playlist[musicaAtual];

    try {
        await alternarFavoritoDaMusica(musica);
    } catch (erro) {
        console.warn("Falha ao salvar favorito:", erro.message);
        return;
    }
    atualizarBotaoFavorito();

    if (typeof renderizarFavoritosHorizontais === "function") {
        renderizarFavoritosHorizontais();
    }

    if (typeof window.renderizarBibliotecaAtual === "function") {
        window.renderizarBibliotecaAtual();
    }
}

window.toggleFavoritoPorIndice = async function(indice) {
    const lista = playlist.length > 0 ? playlist : (window.musicas || []);
    const musica = lista[indice];
    if (!musica) return;

    try {
        await alternarFavoritoDaMusica(musica);
    } catch (erro) {
        console.warn("Falha ao salvar favorito:", erro.message);
        return;
    }
    atualizarBotaoFavorito();

    if (typeof renderizarFavoritosHorizontais === "function") {
        renderizarFavoritosHorizontais();
    }

    if (typeof window.renderizarBibliotecaAtual === "function") {
        window.renderizarBibliotecaAtual();
    }
};

window.obterMusicaAtual = function () {
    if (!Array.isArray(playlist) || !playlist[musicaAtual]) return null;
    return playlist[musicaAtual];
};

function atualizarBotaoFavorito() {
    if (!imgFavoritoMini && !imgFavoritoHero) return;
    
    const musica = playlist[musicaAtual];
    if (!musica) return;
    
    const chaveAtual = chaveMusica(musica);
    const ehFavorito = favoritos.some(f => chaveMusica(f) === chaveAtual);

    const srcIcone = ehFavorito ? "assets/icons/heart-fill-red.svg" : "assets/icons/heart-outline-red.svg";

    [imgFavoritoMini, imgFavoritoHero].forEach((img) => {
        if (!img) return;
        img.src = srcIcone;
        img.style.opacity = "1";
        img.style.filter = "none";
    });

    [btnFavoritoMini, btnFavoritoHero].forEach((btn) => {
        if (!btn) return;
        btn.classList.toggle("is-favorited", ehFavorito);
    });
}

// ==========================================
// GESTÃO DE HISTÓRICO
// ==========================================
function salvarNoHistorico(musica) {
    let historico = JSON.parse(localStorage.getItem('historico_adoraplay')) || [];

    historico = historico.filter(m => m.audio !== musica.audio);
    historico.unshift(musica);

    if (historico.length > 3) {
        historico.pop();
    }

    localStorage.setItem('historico_adoraplay', JSON.stringify(historico));
    
    if (typeof window.renderizarUltimasOuvidas === "function") {
        window.renderizarUltimasOuvidas();
    }
}

// Envia o id da música para a API de estatísticas e atualiza o ranking
async function registrarReproducao(id) {
    if (!id) return;

    const idNumerico = Number(id);
    const catalogoAtual = Array.isArray(window.musicas) ? window.musicas : [];
    const idExisteNoCatalogo = catalogoAtual.some(item => Number(item.id) === idNumerico);

    if (!idExisteNoCatalogo) {
        console.warn("ID fora do catalogo local. Reproducao nao enviada:", id);
        return;
    }

    try {
        const resposta = await fetch("https://adoraplay-api.digiartesai.workers.dev/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ id: idNumerico }),
            mode: "cors",
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        const resultado = await resposta.json().catch(() => null);
        if (resultado && typeof carregarRanking === "function") {
            await carregarRanking();
        }
    } catch (erro) {
        console.warn("Falha ao computar reprodução:", erro.message);
    }
}

// ==========================================
// INICIALIZAÇÃO DA TOP 1
// ==========================================
function inicializarPlayerComTop1() {
    if (window.__musicaInicialViaLink) return;
    
    if (typeof musicas !== "undefined" && musicas.length > 0) {
        carregarPlaylist(musicas);
        
        let indiceTop1 = 0;

        if (typeof maisOuvidas !== "undefined" && maisOuvidas.length > 0) {
            const top1 = maisOuvidas[0];
            const idxTop1 = musicas.findIndex(m => m.id === top1.id);
            if (idxTop1 >= 0) {
                indiceTop1 = idxTop1;
            }
        }

        musicaAtual = indiceTop1;
        const musica = playlist[musicaAtual];

        if (audioPlayer && musica) {
            audioPlayer.src = musica.audio;
        }

        atualizarMiniPlayer();
    }
}
