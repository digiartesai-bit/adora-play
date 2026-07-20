const secaoFavoritos = document.getElementById("secaoFavoritos");
const favoritosHorizontal = document.getElementById("favoritosHorizontal");
const continueOuvindo = document.getElementById("continueOuvindo");
const albuns = document.getElementById("albuns");
const listaMusicas = document.getElementById("listaMusicas");

let musicas = [];
let filtroAtivo = null;

// ==========================================================================
// 1. CARREGAMENTO DOS DADOS (JSON) E SELEÇÃO DE MÚSICA COMPARTILHADA
// ==========================================================================
fetch("musicas.json")
.then(response => response.json())
.then(data => {
    musicas = data;
    window.musicas = data; // Torna a lista visível para outros scripts (como o recursos.js)
    
    if (typeof carregarPlaylist === "function") {
        carregarPlaylist(musicas);
    } else {
        window.playlist = musicas;
    }
    
    carregarTela();
    carregarRanking();

    // INICIALIZAÇÃO DO PLAYER: Chama a função assim que os dados estão prontos!
    if (typeof inicializarPlayerComTop1 === "function") {
        inicializarPlayerComTop1();
    }

    // 🔥 VERIFICA SE O APP FOI ABERTO COM UMA MÚSICA COMPARTILHADA NO LINK
    const urlParams = new URLSearchParams(window.location.search);
    const musicaParaTocar = urlParams.get('musica');

    if (musicaParaTocar) {
        // Encontra o índice da música correspondente na lista que acabou de baixar
        const indexMusica = musicas.findIndex(m => m.titulo === musicaParaTocar);
        
        // Se a música for encontrada no banco de dados, dá o play automático!
        if (indexMusica !== -1 && typeof tocar === "function") {
            setTimeout(() => {
                tocar(indexMusica);
            }, 500); // Meio segundo de atraso para garantir que a interface está pronta
        }
    }
})
.catch(err => console.error("Erro ao carregar músicas:", err));


// ==========================================================================
// 2. FUNÇÕES DE RENDERIZAÇÃO DA INTERFACE (UI)
// ==========================================================================
function carregarTela() {
    document.querySelectorAll(".secao").forEach(sec => sec.style.display = "block");

    const titulo = document.getElementById("tituloListaMusicas");
    if (titulo) titulo.textContent = "Adicionados recentemente";

    if (albuns) albuns.innerHTML = "";
    if (listaMusicas) listaMusicas.innerHTML = "";

    // Chama a renderização de favoritos com 500ms de atraso para garantir
    // que todo o HTML/JSON esteja assentado e o recursos.js desenhe firme na tela
    setTimeout(() => {
        if (typeof window.renderizarFavoritosHorizontais === "function") {
            window.renderizarFavoritosHorizontais();
        }
    }, 500);

    renderizarUltimasOuvidas();
    
    // Renderiza a seção de "Adicionados Recentemente" (as 3 últimas criadas no JSON)
    const ultimasAdicionadas = [...musicas].slice(-3).reverse(); 
    
    ultimasAdicionadas.forEach((musica) => {
        const indexOriginal = musicas.findIndex(m => m.audio === musica.audio);
        if (listaMusicas) {
            renderizarItemMusica(musica, indexOriginal, listaMusicas);
        }
    });

    // Renderiza a Navegação por Álbum
    const albunsAdicionados = new Set();
    musicas.forEach((musica) => {
        if (musica.album && !albunsAdicionados.has(musica.album)) {
            albunsAdicionados.add(musica.album);
            
            if (albuns) {
                albuns.innerHTML += `
                <div class="card" onclick="filtrarPorAlbum('${musica.album}')" style="cursor: pointer; width: 100px; display: inline-block; margin-right: 15px; vertical-align: top;">
                    <img src="${musica.capa || 'assets/icons/album.svg'}" onerror="this.src='assets/icons/album.svg'" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px; display: block;">
                    <p style="margin-top: 5px; font-size: 13px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${musica.album}</p>
                </div>`;
            }
        }
    });
}

function renderizarUltimasOuvidas() {
    const secaoContinue = document.getElementById("secaoContinue") || document.querySelector(".continue-ouvindo");
    if (!continueOuvindo) return;

    const historico = JSON.parse(localStorage.getItem('historico_adoraplay')) || [];

    if (historico.length === 0) {
        if (secaoContinue) secaoContinue.style.display = "none";
        return;
    }

    if (secaoContinue) secaoContinue.style.display = "block";
    continueOuvindo.innerHTML = "";

    historico.forEach((musica) => {
        let indexOriginal = musicas.findIndex(m => m.audio === musica.audio);
        if (indexOriginal === -1) indexOriginal = 0;

        const capaMusica = typeof obterCapaMusica === "function" ? obterCapaMusica(musica) : "assets/icons/album.svg";

        continueOuvindo.innerHTML += `
        <div class="card" onclick="tocar(${indexOriginal})" style="cursor: pointer; width: 100px; display: inline-block; margin-right: 15px; vertical-align: top;">
            <img src="${capaMusica}" onerror="this.src='${musica.capa || 'assets/icons/album.svg'}'" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; display: block;">
            <p style="margin-top: 5px; font-size: 13px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${musica.titulo}</p>
        </div>`;
    });
}

function renderizarItemMusica(musica, index, container) {
    const capaMusica = typeof obterCapaMusica === "function" ? obterCapaMusica(musica) : "assets/icons/album.svg";

    container.innerHTML += `
    <div class="musica">
        <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${capaMusica}" onerror="this.src='${musica.capa || 'assets/icons/album.svg'}'" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div>
                <strong>${musica.titulo}</strong><br>
                <small>${musica.artista}</small>
            </div>
        </div>
        <button onclick="tocar(${index})">
            <img src="assets/icons/play.svg" alt="Tocar" width="16" height="16">
        </button>
    </div>`;
}

function filtrarPorAlbum(nomeAlbum) {
    const titulo = document.getElementById("tituloListaMusicas");
    if (!listaMusicas) return;
    listaMusicas.innerHTML = "";

    if (filtroAtivo === nomeAlbum) {
        filtroAtivo = null;
        if (titulo) titulo.textContent = "Adicionados recentemente";
        
        const ultimasAdicionadas = [...musicas].slice(-3).reverse();
        ultimasAdicionadas.forEach((musica) => {
            const indexOriginal = musicas.findIndex(m => m.audio === musica.audio);
            renderizarItemMusica(musica, indexOriginal, listaMusicas);
        });
        return;
    }

    filtroAtivo = nomeAlbum;
    if (titulo) titulo.textContent = `Músicas de: ${nomeAlbum}`;

    musicas.forEach((musica, index) => {
        if (musica.album === nomeAlbum) {
            renderizarItemMusica(musica, index, listaMusicas);
        }
    });
}


// ==========================================================================
// 3. INSTALAÇÃO DO PROMPT DO PWA (CONFIGURAÇÃO SECUNDÁRIA)
// ==========================================================================
let instaladorPrompt;
const btnInstalar = document.getElementById('seu-botao-de-instalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    instaladorPrompt = e;
    if (btnInstalar) {
        btnInstalar.style.display = 'flex';
    }
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async (e) => {
        e.preventDefault();
        if (instaladorPrompt) {
            instaladorPrompt.prompt();
            const { outcome } = await instaladorPrompt.userChoice;
            console.log(`Escolha do usuário: ${outcome}`);
            instaladorPrompt = null;
            btnInstalar.style.display = 'none';
        }
    });
}

window.addEventListener('appinstalled', () => {
    if (btnInstalar) {
        btnInstalar.style.display = 'none';
    }
    console.log('App instalado com sucesso e adicionado à tela de início!');
});

// ...existing code...

// ==========================================
// INICIALIZAÇÃO: CARREGA ÚLTIMA MÚSICA AO ABRIR
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (musicas && musicas.length > 0) {
            // Pega a última música (ID 9)
            const ultimaMusica = musicas[musicas.length - 1];
            const indexUltima = musicas.length - 1;
            
            // Carrega a música no player
            musicaAtual = indexUltima;
            
            if (audioPlayer && ultimaMusica) {
                audioPlayer.src = ultimaMusica.audio;
                atualizarMiniPlayer();
                
                console.log('✅ Última música carregada:', ultimaMusica.titulo);
            }
        }
    }, 1000); // Aguarda 1s para garantir que JSON foi carregado
});