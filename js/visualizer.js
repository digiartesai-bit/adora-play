// Arquivo isolado para controle de efeitos visuais sem risco de bloquear o áudio
(function() {
    const audioElement = document.getElementById("audioPlayer");
    const targetButton = document.getElementById("btnPlay");

    let animacaoId = null;
    let angulo = 0;

    // Função que faz o botão crescer e diminuir simulando uma batida suave
    function simularPulsação() {
        if (!targetButton || !audioElement || audioElement.paused) {
            if (targetButton) targetButton.style.transform = "scale(1)";
            return;
        }

        // Cria uma onda matemática suave (seno) que varia entre 0 e 1 de forma cíclica
        // Aumente ou diminua o '0.15' para acelerar ou desacelerar o ritmo do pulso
        angulo += 0.15; 
        
        // Transforma a oscilação em uma escala CSS sutil (entre 1.0 e 1.10)
        const variacao = (Math.sin(angulo) + 1) / 2; // Normaliza entre 0 e 1
        const escala = 1 + (variacao * 0.10); 

        // Aplica o efeito no botão
        targetButton.style.transform = `scale(${escala})`;
        targetButton.style.transition = "transform 0.05s ease-out";

        // Continua o loop de animação
        animacaoId = requestAnimationFrame(simularPulsação);
    }

    if (audioElement && targetButton) {
        
        // Quando a música começa a tocar, inicia o pulso visual
        audioElement.addEventListener("play", () => {
            if (animacaoId) cancelAnimationFrame(animacaoId);
            simularPulsação();
        });

        // Quando pausa, termina ou muda de faixa, para o pulso e reseta o tamanho
        const pararPulso = () => {
            if (animacaoId) cancelAnimationFrame(animacaoId);
            if (targetButton) {
                targetButton.style.transform = "scale(1)";
            }
        };

        audioElement.addEventListener("pause", pararPulso);
        audioElement.addEventListener("ended", pararPulso);
    }
})();

