// Elementos Globais
const audioPlayer = document.getElementById("audioPlayer");
const miniPlayer = document.getElementById("miniPlayer");
const miniCapa = document.getElementById("miniCapa");
const miniTitulo = document.getElementById("miniTitulo");
const miniArtista = document.getElementById("miniArtista");
const btnPlay = document.getElementById("btnPlay");

// Novos Elementos Globais para Shuffle e Repeat
const btnShuffle = document.getElementById("btnShuffle");
const btnRepeat = document.getElementById("btnRepeat");

// Elementos da Barra de Progresso
const progressBar = document.getElementById("progressBar");
const currentTime = document.getElementById("currentTime");
const durationTime = document.getElementById("durationTime");

// Estado
let playlist = [];
let musicaAtual = 0;
let tocando = false;

// Estados das novas funções
let modoShuffle = false;
let modoRepeat = false; // false = sem repetição, true = repete a música atual

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

// Garante o carregamento da playlist dinâmica do app.js
function carregarPlaylist(lista) { 
    playlist = [...lista]; 
    atualizarBotoesModo();
}

if (window.playlist && window.playlist.length > 0) {
    playlist = [...window.playlist];
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
    // 1. SE NÃO HOUVER MÚSICA CARREGADA (Player está vazio/com endereço local no início)
    if (!audioPlayer.src || audioPlayer.src === "" || audioPlayer.src === window.location.href) {
        if (typeof musicas !== "undefined" && musicas.length > 0) {
            
            // Abastece a playlist para que a navegação funcione perfeitamente
            carregarPlaylist(musicas);
            
            let indiceParaTocar = 0; // Início padrão: primeiro item do JSON

            // Busca dinamicamente qual é a música TOP 1 do ranking de mais ouvidas
            if (typeof maisOuvidas !== "undefined" && maisOuvidas.length > 0) {
                const top1 = maisOuvidas[0]; 
                
                // Localiza o índice correspondente no array geral de músicas
                const idxTop1 = musicas.findIndex(m => m.id === top1.id);
                if (idxTop1 >= 0) {
                    indiceParaTocar = idxTop1;
                }
            }

            // Inicia a reprodução
            tocar(indiceParaTocar);
            return; // Interrompe para evitar conflito com o bloco padrão abaixo
        }
    }

    // 2. LÓGICA PADRÃO (Para quando uma música já está carregada/em andamento)
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
    
    if (!playlist || !playlist[musicaAtual]) return;
    const musica = playlist[musicaAtual];
    
    if (miniTitulo) miniTitulo.textContent = musica.titulo;
    if (miniArtista) miniArtista.textContent = musica.artista;
    
    if (miniCapa) {
        const capaIndividual = obterCapaMusica(musica);
        miniCapa.src = capaIndividual;
        miniCapa.onerror = () => {
            miniCapa.src = musica.capa || "assets/icons/album.svg";
        };
    }
    
    // Atualiza o ícone interno do botão Play/Pause central (sempre em contraste escuro)
    if (btnPlay) {
        let img = btnPlay.querySelector("img");
        if (img) {
            img.src = tocando ? "assets/icons/pause.svg" : "assets/icons/play.svg";
            // Ajusta o alinhamento visual perfeito dependendo do ícone ativo
            img.style.marginLeft = tocando ? "0px" : "2px";
        }
    }
    
    atualizarBotoesModo();
    atualizarBotaoFavorito();
}

// Pula para a próxima música
function proxima() { 
    if (playlist.length === 0) return;

    if (modoShuffle) {
        if (playlist.length > 1) {
            let novoIndice;
            do {
                novoIndice = Math.floor(Math.random() * playlist.length);
            } while (novoIndice === musicaAtual);
            musicaAtual = novoIndice;
        } else {
            musicaAtual = 0;
        }
    } else {
        musicaAtual = (musicaAtual + 1) % playlist.length; 
    }
    
    tocar(musicaAtual); 
}

// Volta para a música anterior
function anterior() { 
    if (playlist.length === 0) return;

    if (modoShuffle) {
        if (playlist.length > 1) {
            let novoIndice;
            do {
                novoIndice = Math.floor(Math.random() * playlist.length);
            } while (novoIndice === musicaAtual);
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

// Visual dos botões de Shuffle e Repeat com brilho dourado inteligente
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

// Eventos de Progresso do Áudio
if (audioPlayer) {
    
    // GARANTIA DE REPEAT: Reseta a trava no momento exato em que o áudio ganha o Play (nova música ou repetição)
    audioPlayer.addEventListener("play", () => {
        // Se a música está no primeiro segundo (iniciando do zero ou via repeat), libera nova contagem
        if (audioPlayer.currentTime < 1) {
            streamRegistrado = false;
        }
    });

    // Dispara continuamente enquanto a música toca
    audioPlayer.addEventListener("timeupdate", () => {
        const current = audioPlayer.currentTime;
        const duration = audioPlayer.duration;

        // 1. Atualiza a barra de progresso visual
        if (progressBar) {
            progressBar.value = duration ? (current / duration) * 100 : 0;
        }

        if (currentTime) currentTime.textContent = formatarTempo(current);
        if (durationTime) durationTime.textContent = formatarTempo(duration || 0);

        // 2. REGISTRO DINÂMICO DE STREAM (90% Ouvido)
        if (duration && !streamRegistrado) {
            const porcentagemOuvida = (current / duration) * 100;
            
            if (porcentagemOuvida >= 90) {
                registrarReproducao(playlist[musicaAtual].id);
                streamRegistrado = true; // Trava para não computar em loops dentro da mesma rodada
            }
        }
    });

    // Quando a música acaba
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
function toggleFavorito() {
    if (!playlist || !playlist[musicaAtual]) return;
    const musica = playlist[musicaAtual];

    const musicaParaSalvar = {
        ...musica,
        capa: obterCapaMusica(musica),
        capa_musica: obterCapaMusica(musica)
    };
    
    let favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    const index = favoritos.findIndex(f => f.titulo.trim() === musica.titulo.trim());
    
    if (index > -1) {
        favoritos.splice(index, 1);
    } else {
        favoritos.push(musicaParaSalvar);
    }
    
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
    atualizarBotaoFavorito();

    if (typeof renderizarFavoritosHorizontais === "function") {
        renderizarFavoritosHorizontais();
    }
}

function atualizarBotaoFavorito() {
    const imgFavorito = document.getElementById("imgFavorito");
    if (!imgFavorito) return;
    
    const musica = playlist[musicaAtual];
    if (!musica) return;
    
    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    const ehFavorito = favoritos.some(f => f.titulo.trim() === musica.titulo.trim());
    
    // Favorito Ativo (Vermelho/Dourado Brilhante) vs Inativo (Dourado Translúcido)
    const filtroAtivo = "brightness(1.2) saturate(10) drop-shadow(0px 0px 4px rgba(212, 175, 55, 0.8))";
    const filtroInativo = "brightness(0) saturate(100%) invert(84%) sepia(23%) saturate(1067%) hue-rotate(352deg) brightness(85%) contrast(85%)";

    imgFavorito.style.filter = ehFavorito ? filtroAtivo : filtroInativo;
    imgFavorito.style.opacity = ehFavorito ? "1" : "0.5";
}

// ==========================================
// GESTÃO DE HISTÓRICO
// ==========================================

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

    // ✅ SALVA O HISTÓRICO CORRETAMENTE
    localStorage.setItem('historico_adoraplay', JSON.stringify(historico));
    
    // ✅ RENDERIZA AS ÚLTIMAS OUVIDAS SE A FUNÇÃO EXISTIR
    if (typeof window.renderizarUltimasOuvidas === "function") {
        window.renderizarUltimasOuvidas();
    }
} // ✅ FECHAMENTO CORRETO

// Envia o id da música para a API de estatísticas e atualiza o ranking
async function registrarReproducao(id) {
    if (!id) return;

    try {
        const resposta = await fetch("https://adoraplay-api.digiartesai.workers.dev/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ id }),
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
// INICIALIZAÇÃO DA TOP 1 (CHAMADA LOGO APÓS O FETCH DO APP.JS)
// ==========================================
function inicializarPlayerComTop1() {
    // 1. Garante que a lista de músicas global existe e tem itens
    if (typeof musicas !== "undefined" && musicas.length > 0) {
        
        // 2. Abastece a playlist do player
        carregarPlaylist(musicas);
        
        let indiceTop1 = 0; // Padrão: primeira música da lista

        // 3. Tenta localizar a música Top 1 do seu ranking
        if (typeof maisOuvidas !== "undefined" && maisOuvidas.length > 0) {
            const top1 = maisOuvidas[0];
            const idxTop1 = musicas.findIndex(m => m.id === top1.id);
            if (idxTop1 >= 0) {
                indiceTop1 = idxTop1;
            }
        }

        // 4. Define o índice atual sem iniciar o áudio
        musicaAtual = indiceTop1;
        const musica = playlist[musicaAtual];

        // 5. Carrega o caminho do arquivo de áudio silenciosamente
        if (audioPlayer && musica) {
            audioPlayer.src = musica.audio;
        }

        // 6. Atualiza o visual (Capa, Título, Artista) mantendo o estado de pausa
        atualizarMiniPlayer();
    }
}
