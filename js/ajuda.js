// Arquivo isolado para gerenciar a dica explicativa do Ranking do AdoraPlay
(function() {
    // Texto explicativo em conformidade com as regras do app
    const textoAjuda = "Este ranking exibe as músicas mais tocadas pelos usuários. Para uma reprodução ser contabilizada aqui, a faixa precisa ser ouvida por pelo menos 90% da sua duração total.";

    function inicializarAjudaRanking() {
        // 1. Procura especificamente o h3 da seção Mais Ouvidas no seu HTML
        const secaoMaisOuvidas = document.getElementById("secaoMaisOuvidas");
        if (!secaoMaisOuvidas) return;

        const tituloRanking = secaoMaisOuvidas.querySelector("h3");
        if (!tituloRanking) return;

        // Garante que o h3 alinhe o texto e a interrogação lado a lado de forma harmônica
        tituloRanking.style.display = "inline-flex";
        tituloRanking.style.alignItems = "center";
        tituloRanking.style.gap = "8px";

        // 2. Cria o mini círculo com a interrogação (?)
        const btnAjuda = document.createElement("span");
        btnAjuda.id = "btnAjudaRanking";
        btnAjuda.textContent = "?";
        
        // Estilo combinando com a identidade visual dourada do AdoraPlay
        btnAjuda.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            font-size: 11px;
            font-weight: bold;
            color: #d4af37;
            background: rgba(212, 175, 55, 0.15);
            border: 1px solid rgba(212, 175, 55, 0.4);
            border-radius: 50%;
            cursor: pointer;
            user-select: none;
            transition: all 0.2s ease;
        `;

        // Feedback visual rápido ao tocar no celular
        btnAjuda.addEventListener("touchstart", () => {
            btnAjuda.style.background = "rgba(212, 175, 55, 0.3)";
        });

        // 3. Cria o quadro explicativo semi-transparente (Popover/Glassmorphism)
        const popover = document.createElement("div");
        popover.id = "popoverAjudaRanking";
        popover.textContent = textoAjuda;
        
        popover.style.cssText = `
            position: absolute;
            z-index: 9999;
            width: 260px;
            padding: 12px 14px;
            background: rgba(8, 24, 38, 0.9); /* Mesma cor base do seu theme-color #081826 */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #eeeeee;
            font-size: 13px;
            line-height: 1.4;
            border-radius: 12px;
            border: 1px solid rgba(212, 175, 55, 0.2); /* Borda levemente dourada */
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease, transform 0.25s ease;
            transform: translateY(5px);
        `;

        // Insere os elementos no documento
        tituloRanking.appendChild(btnAjuda);
        document.body.appendChild(popover);

        // 4. Lógica de toque para abrir e fechar
        btnAjuda.addEventListener("click", function(evento) {
            evento.stopPropagation(); 

            const ativo = popover.style.opacity === "1";

            if (ativo) {
                fecharPopover();
            } else {
                const coordenadas = btnAjuda.getBoundingClientRect();
                
                // Calcula o posicionamento para ficar centralizado abaixo do ponto de interrogação
                let topo = coordenadas.bottom + window.scrollY + 8;
                let esquerda = coordenadas.left + window.scrollX - 120;

                // Proteções para o quadro não sumir para fora das laterais em telas pequenas de celular
                if (esquerda < 10) esquerda = 10;
                if (esquerda + 260 > window.innerWidth) {
                    esquerda = window.innerWidth - 270;
                }

                popover.style.top = `${topo}px`;
                popover.style.left = `${esquerda}px`;
                
                popover.style.opacity = "1";
                popover.style.transform = "translateY(0)";
                popover.style.pointerEvents = "auto";
            }
        });

        function fecharPopover() {
            popover.style.opacity = "0";
            popover.style.transform = "translateY(5px)";
            popover.style.pointerEvents = "none";
        }

        // Fecha se clicar em qualquer outra área da tela do celular
        document.addEventListener("click", function(evento) {
            if (evento.target !== popover && evento.target !== btnAjuda) {
                fecharPopover();
            }
        });
        
        // Fecha ao rolar a página para não quebrar o layout fluido
        document.addEventListener("scroll", fecharPopover, { passive: true });
    }

    // Aguarda o app.js puxar os dados da API e preencher a seção antes de injetar o botão
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(inicializarAjudaRanking, 800); 
    } else {
        window.addEventListener("DOMContentLoaded", () => setTimeout(inicializarAjudaRanking, 800));
    }
})();
