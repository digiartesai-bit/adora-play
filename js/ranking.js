// ==========================================
// RANKING MUNDIAL - ADORAPLAY
// ==========================================

window.musicas = window.musicas || [];

function extrairRanking(dados) {
    if (Array.isArray(dados)) return dados;
    if (!dados || typeof dados !== "object") return [];

    const chavesPossiveis = ["ranking", "value", "data", "items", "top", "top8"];
    for (const chave of chavesPossiveis) {
        if (Array.isArray(dados[chave])) {
            return dados[chave];
        }
    }

    return [];
}

async function carregarRanking() {
    window.musicas = window.musicas || [];

    const container = document.getElementById("maisOuvidas");
    if (!container) return;

    try {
        const endpointRanking = `https://adoraplay-api.digiartesai.workers.dev/ranking?t=${Date.now()}`;
        const resposta = await fetch(endpointRanking, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            if (typeof window.renderizarRanking === 'function') {
                window.renderizarRanking([]);
                return;
            }

            container.innerHTML = "";
            return;
        }

        const dados = await resposta.json();
        const ranking = extrairRanking(dados);

        if (typeof window.renderizarRanking === 'function') {
            window.renderizarRanking(ranking);
            return;
        }

        const medalhas = ["🥇", "🥈", "🥉"];
        container.innerHTML = "";
        ranking.slice(0, 8).forEach((item, posicao) => {
            const musica = window.musicas.find(m => Number(m.id) === Number(item.id));
            if (!musica) return;
            const indice = window.musicas.findIndex(m => Number(m.id) === Number(item.id));
            if (indice === -1) return;
            const rankLabel = posicao === 0 ? medalhas[0] : posicao === 1 ? medalhas[1] : posicao === 2 ? medalhas[2] : `${posicao + 1}`;
            container.innerHTML += `
                <article class="ranking-card" onclick="tocar(${indice})">
                    <img src="${musica.capa_musica || musica.capa || 'assets/icons/album.svg'}" alt="${musica.titulo}" onerror="this.src='assets/icons/album.svg'">
                    <div class="ranking-footer">
                        <button class="card-play" onclick="event.stopPropagation(); tocar(${indice})" aria-label="Reproduzir ${musica.titulo}" title="Reproduzir">
                            <img src="assets/icons/play.svg" alt="">
                        </button>
                        <div class="ranking-badge">${rankLabel}</div>
                    </div>
                    <small>${item.reproducoes || 0} reproduções</small>
                </article>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar ranking:", erro);
        if (typeof window.renderizarRanking === 'function') {
            window.renderizarRanking([]);
            return;
        }

        if (container) container.innerHTML = "";
    }
}

window.carregarRanking = carregarRanking;