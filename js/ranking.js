// ==========================================
// RANKING MUNDIAL - ADORAPLAY
// ==========================================

let musicas = window.musicas || [];

async function carregarRanking() {
    musicas = window.musicas || []; // ✅ Atualiza a cada chamada
    // ... resto do código
}

    const secao = document.getElementById("secaoMaisOuvidas");
    const container = document.getElementById("maisOuvidas");

    if (!secao || !container) return;

    try {

        const resposta = await fetch("https://adoraplay-api.digiartesai.workers.dev/");

        if (!resposta.ok) {
            secao.style.display = "none";
            return;
        }

        const ranking = await resposta.json();

        if (!ranking || ranking.length === 0) {
            secao.style.display = "none";
            return;
        }

        container.innerHTML = "";
        secao.style.display = "block";

        const medalhas = ["🥇", "🥈", "🥉"];

        ranking.forEach((item, posicao) => {

            const musica = musicas.find(m => Number(m.id) === Number(item.id));

            if (!musica) return;

            const indice = musicas.findIndex(m => Number(m.id) === Number(item.id));

            container.innerHTML += `
                <div class="card"
                     onclick="tocar(${indice})"
                     style="cursor:pointer; width:100px; display:inline-block; margin-right:15px; vertical-align:top;">

                    <img
                        src="${musica.capa_musica || musica.capa}"
                        onerror="this.src='assets/icons/album.svg'"
                        style="width:100px; height:100px; object-fit:cover; border-radius:10px; display:block;">

                    <p style="margin-top:6px; font-size:13px; text-align:center; color:#fff;">
                        ${medalhas[posicao]}
                    </p>

                    <!-- CONTAINER DO TÍTULO COM ALTURA MÍNIMA FIXA PARA EVITAR DESALINHAMENTO -->
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
                        ${item.reproducoes} reproduções
                    </small>

                </div>
            `;

        });

    } catch (erro) {

        console.error("Erro ao carregar ranking:", erro);
        secao.style.display = "none";

    }
