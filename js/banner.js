// ==========================================
// CONTROLE DO BANNER E NAVEGAÇÃO DE LANÇAMENTOS
// ==========================================

// Função que verifica a cada meio segundo se as músicas carregaram
const intervaloVerificacao = setInterval(() => {
    if (typeof musicas !== "undefined" && musicas.length > 0) {
        clearInterval(intervaloVerificacao);
        iniciarBanner();
    }
}, 500);

function iniciarBanner() {
    const banner = document.querySelector(".banner");
    if (!banner) return;

    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);

    // Filtra todas as músicas da semana
    const lancamentosDaSemana = musicas.filter(musica => {
        if (!musica.data_cadastro) return false;
        const [ano, mes, dia] = musica.data_cadastro.split("-");
        const dataCadastro = new Date(ano, mes - 1, dia);
        return dataCadastro >= seteDiasAtras && dataCadastro <= hoje;
    });

    if (lancamentosDaSemana.length > 0) {
        banner.style.display = "block";
        window.lancamentosAtuais = lancamentosDaSemana; 
    } else {
        banner.style.display = "none";
    }
}

// 1. ABRIR TELA DE LANÇAMENTOS
function abrirTelaLancamentos() {
    const lista = window.lancamentosAtuais || [];
    if (lista.length === 0) return;

    // Oculta elementos da Home
    const banner = document.querySelector(".banner");
    if (banner) banner.style.display = "none";
    document.querySelectorAll(".secao").forEach(s => s.style.display = "none");
    
    const tela = document.getElementById("telaLancamentos");
    if (!tela) return;
    tela.style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // --- RENDERIZAR OS LANÇAMENTOS DINAMICAMENTE ---
    if (lista.length === 1) {
        const musica = lista[0];
        tela.querySelector(".container-lancamentos-dinamico")?.remove(); // Limpa anterior
        
        document.getElementById("lancamentoCapa").style.display = "block";
        document.getElementById("lancamentoCapa").src = musica.capa_musica || musica.capa;
        document.getElementById("lancamentoTitulo").style.display = "block";
        document.getElementById("lancamentoTitulo").textContent = musica.titulo;
        document.getElementById("lancamentoArtista").style.display = "block";
        document.getElementById("lancamentoArtista").textContent = musica.artista;
        
        const btnPlay = document.getElementById("btnOuvirLancamento");
        btnPlay.style.display = "inline-flex";
        btnPlay.onclick = () => tocarEstaMusica(musica);
    } 
    else {
        // Oculta placeholders individuais
        document.getElementById("lancamentoCapa").style.display = "none";
        document.getElementById("lancamentoTitulo").style.display = "none";
        document.getElementById("lancamentoArtista").style.display = "none";
        document.getElementById("btnOuvirLancamento").style.display = "none";

        tela.querySelector(".container-lancamentos-dinamico")?.remove();

        const container = document.createElement("div");
        container.className = "container-lancamentos-dinamico";
        container.style.cssText = "display: flex; flex-direction: column; gap: 15px; margin-top: 20px; text-align: left;";

        // Mostra os lançamentos (do mais recente para o mais antigo)
        [...lista].reverse().forEach(musica => {
            const itemHtml = `
                <div onclick="tocarEstaMusica(${JSON.stringify(musica).replace(/"/g, '&quot;')})" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 16px; cursor: pointer;">
                    <img src="${musica.capa_musica || musica.capa}" style="width: 60px; height: 60px; border-radius: 10px; object-fit: cover;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: #fff; font-size: 16px;">${musica.titulo}</h4>
                        <p style="margin: 3px 0 0; color: #94a3b8; font-size: 13px;">${musica.artista}</p>
                    </div>
                    <button style="background: #D4AF37; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                        <img src="assets/icons/play.svg" width="12" height="12" style="filter: brightness(0); margin-left: 2px;">
                    </button>
                </div>
            `;
            container.innerHTML += itemHtml;
        });

        tela.querySelector("div[style*='text-align: center']").appendChild(container);
    }
}

// 2. VOLTAR PARA A HOME (RESTAURA TODAS AS SEÇÕES)
function voltarParaHome() {
    const tela = document.getElementById("telaLancamentos");
    if (tela) tela.style.display = "none";
    
    iniciarBanner();
    
    if (typeof carregarTela === "function") {
        carregarTela();
    } else {
        document.querySelectorAll(".secao").forEach(secao => {
            if (secao.id !== "secaoMaisOuvidas" && secao.id !== "secaoFavoritos" && secao.id !== "secaoContinue") {
                secao.style.display = "block";
            }
        });
    }
}

function tocarEstaMusica(musica) {
    if (!musica) return;
    
    // 1. Carrega a playlist no player para o usuário poder passar de faixa
    if (typeof carregarPlaylist === "function") {
        carregarPlaylist(musicas);
    }
    
    // 2. Descobre a posição da música na lista geral
    const idx = musicas.findIndex(m => m.id === musica.id);
    
    // 3. Toca a música usando o player
    if (typeof tocar === "function") {
        tocar(idx >= 0 ? idx : 0);
    }

    // 4. BLINDAGEM: Como o player acabou de rodar e forçou a atualização das seções,
    // nós "escondemos" elas novamente logo em seguida, mantendo a tela de lançamentos limpa!
    const telaLancamentos = document.getElementById("telaLancamentos");
    if (telaLancamentos && telaLancamentos.style.display === "block") {
        document.querySelectorAll(".secao").forEach(secao => {
            secao.style.display = "none";
        });
    }
}


// ==========================================
// MONITOR DE CLIQUES GLOBAL (BOTAO INÍCIO / MENUS)
// ==========================================
document.addEventListener("click", function(event) {
    // Procura se o clique ocorreu no botão de início ou em qualquer item que leve para a Home
    const elementoClicado = event.target.closest("a, button, div, li, span");
    
    if (elementoClicado) {
        const texto = (elementoClicado.textContent || "").trim();
        const html = elementoClicado.innerHTML || "";
        const onclickAttr = elementoClicado.getAttribute("onclick") || "";

        // Se clicar em "Início", na casinha, ou em botões de navegação lateral/inferior
        if (
            texto.includes("Início") || 
            html.includes("home") || 
            onclickAttr.includes("Home") || 
            onclickAttr.includes("carregarTela") ||
            elementoClicado.id === "btnInicio"
        ) {
            // Fecha a tela de lançamentos imediatamente
            const tela = document.getElementById("telaLancamentos");
            if (tela && tela.style.display === "block") {
                tela.style.display = "none";
                
                // Força o banner a reavaliar se deve aparecer na Home
                iniciarBanner();
                
                // Exibe novamente as seções normais do app caso tenham sido ocultadas
                document.querySelectorAll(".secao").forEach(secao => {
                    if (secao.id !== "secaoMaisOuvidas" && secao.id !== "secaoFavoritos" && secao.id !== "secaoContinue") {
                        secao.style.display = "block";
                    }
                });
            }
        }
    }
});
