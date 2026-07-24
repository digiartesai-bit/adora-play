// ==========================================================================
// RECURSO 1: LIBERDADE DE REPRODUÇÃO - CLIQUE E ARRASTE NO DESKTOP
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const carrosseis = document.querySelectorAll('#albuns, #continueOuvindo, #maisOuvidas');
    const wheelSnapTimers = new WeakMap();

    const obterSliderDoAlvo = (alvo) => {
        if (alvo instanceof Element) {
            return alvo.closest('#maisOuvidas, #albuns, #continueOuvindo');
        }
        if (alvo && alvo.parentElement) {
            return alvo.parentElement.closest('#maisOuvidas, #albuns, #continueOuvindo');
        }
        return null;
    };

    const lidarComWheelHorizontal = (e, sliderForcado = null) => {
        const slider = sliderForcado || obterSliderDoAlvo(e.target);
        if (!slider) return;

        const deltaY = typeof e.deltaY === 'number'
            ? e.deltaY
            : (typeof e.wheelDelta === 'number' ? -e.wheelDelta : 0);
        const deltaX = typeof e.deltaX === 'number' ? e.deltaX : 0;
        const deltaPrincipal = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

        if (!deltaPrincipal) return;

        slider.style.scrollSnapType = 'none';
        const timerAtual = wheelSnapTimers.get(slider);
        if (timerAtual) {
            clearTimeout(timerAtual);
        }

        if (e.cancelable) {
            e.preventDefault();
        }

        slider.scrollLeft += (deltaPrincipal * 1.1);

        const novoTimer = setTimeout(() => {
            slider.style.scrollSnapType = 'x mandatory';
        }, 140);
        wheelSnapTimers.set(slider, novoTimer);
    };

    carrosseis.forEach(slider => {
        if (!slider) return;

        let arrastando = false;
        let suprimiuClique = false;
        let inicioX = 0;
        let scrollInicial = 0;
        let ultimoDeltaX = 0;

        slider.addEventListener('dragstart', (e) => e.preventDefault());
        slider.querySelectorAll('*').forEach(el => {
            el.addEventListener('dragstart', (e) => e.preventDefault());
        });

        const bloquearSelecaoPagina = (bloquear) => {
            document.body.style.userSelect = bloquear ? 'none' : '';
            document.body.style.webkitUserSelect = bloquear ? 'none' : '';
        };

        const iniciarArraste = (x) => {
            arrastando = true;
            suprimiuClique = false;
            ultimoDeltaX = 0;
            inicioX = x;
            scrollInicial = slider.scrollLeft;
            slider.style.cursor = 'grabbing';
            slider.style.scrollSnapType = 'none';
            bloquearSelecaoPagina(true);
        };

        const moverArraste = (x, fator) => {
            if (!arrastando) return;

            const deslocamento = x - inicioX;
            ultimoDeltaX = deslocamento;
            if (Math.abs(deslocamento) > 4) {
                suprimiuClique = true;
            }

            slider.scrollLeft = scrollInicial - (deslocamento * fator);
        };

        const finalizarArraste = () => {
            if (!arrastando) return;

            arrastando = false;
            slider.style.cursor = 'grab';
            slider.style.scrollSnapType = 'x mandatory';
            bloquearSelecaoPagina(false);
        };

        // Desktop e DevTools responsivo (mouse)
        slider.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            iniciarArraste(e.pageX);
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!arrastando) return;
            moverArraste(e.pageX, 2);
            e.preventDefault();
        });

        window.addEventListener('mouseup', () => {
            finalizarArraste();
        });

        // Toque real (mobile)
        slider.addEventListener('touchstart', (e) => {
            const toque = e.touches && e.touches[0];
            if (!toque) return;
            iniciarArraste(toque.pageX);
        }, { passive: true });

        slider.addEventListener('touchmove', (e) => {
            if (!arrastando) return;
            const toque = e.touches && e.touches[0];
            if (!toque) return;
            moverArraste(toque.pageX, 1.35);

            // Evita rolagem vertical da página somente quando há arraste horizontal claro.
            if (Math.abs(ultimoDeltaX) > 6 && e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });

        slider.addEventListener('touchend', () => {
            finalizarArraste();
        });

        slider.addEventListener('touchcancel', () => {
            finalizarArraste();
        });

        slider.addEventListener('click', (e) => {
            if (!suprimiuClique) return;
            e.preventDefault();
            e.stopPropagation();
            suprimiuClique = false;
        }, true);

        slider.addEventListener('wheel', (e) => {
            lidarComWheelHorizontal(e, slider);
        }, { passive: false });

        slider.addEventListener('mousewheel', (e) => {
            lidarComWheelHorizontal(e, slider);
        }, { passive: false });

    });

    // Wheel delegado: funciona mesmo com conteúdo re-renderizado dentro do carrossel.
    document.addEventListener('wheel', (e) => {
        lidarComWheelHorizontal(e);
    }, { passive: false, capture: true });

    document.addEventListener('mousewheel', (e) => {
        lidarComWheelHorizontal(e);
    }, { passive: false, capture: true });
});

// ==========================================================================
// RECURSO 2: COMPARTILHAR MÚSICA COM LINK DIRETO PARA O PLAYER
// ==========================================================================
function compartilharMusicaAtual() {
    const titulo = document.getElementById("miniTitulo")?.textContent || "";
    const artista = document.getElementById("miniArtista")?.textContent || "AdoraPlay";
    
    if (!titulo) return; 

    const baseUrl = "https://digiartesai-bit.github.io/adora-play/";
    const urlAppComMusica = `${baseUrl}?musica=${encodeURIComponent(titulo)}`;
    const textoMensagem = `Ouça "${titulo}" de ${artista} no AdoraPlay! 🎶`;

    // Função interna para o Plano B (WhatsApp Web/API)
    const abrirWhatsAppComoFallback = () => {
        const textoCompleto = encodeURIComponent(`${textoMensagem}\n\n${urlAppComMusica}`);
        const urlWhatsapp = `https://api.whatsapp.com/send?text=${textoCompleto}`;
        window.open(urlWhatsapp, '_blank');
    };

    if (navigator.share) {
        navigator.share({
            title: 'AdoraPlay',
            text: textoMensagem,
            url: urlAppComMusica
        })
        .then(() => console.log('Compartilhado com sucesso!'))
        .catch((error) => {
            console.log('Nativo falhou ou cancelado, abrindo WhatsApp...', error);
            // 🔥 Se o nativo falhar (AbortError), ele abre o WhatsApp imediatamente!
            abrirWhatsAppComoFallback();
        });
    } else {
        abrirWhatsAppComoFallback();
    }
}

// ==========================================================================
// RECURSO 3: EXIBIR E ATUALIZAR FAVORITOS (TOTALMENTE AUTÔNOMO)
// ==========================================================================
window.removerFavoritoPorAudio = function(audio) {
    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    const novosFavoritos = favoritos.filter(f => f.audio !== audio);
    localStorage.setItem('favoritos', JSON.stringify(novosFavoritos));
    if (typeof window.renderizarFavoritosHorizontais === "function") {
        window.renderizarFavoritosHorizontais();
    }
};

window.renderizarFavoritosHorizontais = function() {
    const secaoFavoritos = document.getElementById("secaoFavoritos");
    const containerFavoritos = document.getElementById("container-favoritos");
    
    if (!secaoFavoritos || !containerFavoritos) return;

    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];

    if (favoritos.length === 0) {
        secaoFavoritos.style.display = "none";
        return;
    }

    containerFavoritos.innerHTML = "";

    const listaDeMusicas = window.musicas || window.playlist || [];

    favoritos.forEach((musica) => {
        let indexReal = listaDeMusicas.findIndex(m => m.audio === musica.audio);
        if (indexReal === -1) indexReal = 0;

        const capaMusica = typeof window.obterCapaMusica === "function"
            ? window.obterCapaMusica(musica)
            : (musica.capa_musica || musica.capa || "assets/icons/album.svg");

        containerFavoritos.innerHTML += `
        <div class="favorito-card" onclick="tocar(${indexReal})">
            <img src="${capaMusica}" onerror="this.src='assets/icons/album.svg'" alt="${musica.titulo}">
            <div class="favorito-card-info">
                <strong>${musica.titulo}</strong>
                <small>${musica.artista}</small>
            </div>
            <button onclick="event.stopPropagation(); window.removerFavoritoPorAudio('${musica.audio}');">
                <img src="assets/icons/heart.svg" alt="Remover favorito">
            </button>
        </div>`;
    });

    secaoFavoritos.style.display = "block";
};
