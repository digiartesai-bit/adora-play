// ==========================================
// RANKING MUNDIAL - ADORAPLAY
// ==========================================

let musicas = window.musicas || [];

async function carregarRanking() {
    musicas = window.musicas || [];

    const secao = document.getElementById("secaoMaisOuvidas");
    const container = document.getElementById("maisOuvidas");

    if (!secao || !container) return;

    try {
        const resposta = await fetch("https://adoraplay-api.digiartesai.workers.dev/", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            secao.style.display = "none";
            return;
        }

        const dados = await resposta.json();
        const ranking = Array.isArray(dados)
            ? dados
            : (dados && Array.isArray(dados.ranking) ? dados.ranking : []);

        if (!ranking || ranking.length === 0) {
            secao.style.display = "none";
            container.innerHTML = "";
            return;
        }

        container.innerHTML = "";
        secao.style.display = "block";

        const medalhas = ["🥇", "🥈", "🥉"];

        ranking.forEach((item, posicao) => {
            const musica = musicas.find(m => Number(m.id) === Number(item.id));
            if (!musica) return;

            const indice = musicas.findIndex(m => Number(m.id) === Number(item.id));
            if (indice === -1) return;

            container.innerHTML += `
                <div class="card"
                     onclick="tocar(${indice})"
                     style="cursor:pointer; width:100px; display:inline-block; margin-right:15px; vertical-align:top;">

                    <img
                        src="${musica.capa_musica || musica.capa || 'assets/icons/album.svg'}"
                        onerror="this.src='assets/icons/album.svg'"
                        style="width:100px; height:100px; object-fit:cover; border-radius:10px; display:block;">

                    <p style="margin-top:6px; font-size:13px; text-align:center; color:#fff;">
                        ${medalhas[posicao]}
                    </p>

                    <div style="min-height: 36px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
                        <p style="
                            font-size:13px;
                            text-align:center;
                            color:#fff;
                            margin:0;
                            line-height:1.3;
                            white-space:normal;
                            word-break:break-word;
                        ">
                            ${musica.titulo}
                        </p>
                    </div>

                    <small style="display:block; text-align:center; color:#999;">
                        ${item.reproducoes || 0} reproduções
                    </small>

                </div>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar ranking:", erro);
        secao.style.display = "none";
    }
}

window.carregarRanking = carregarRanking;
