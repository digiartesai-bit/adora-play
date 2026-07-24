// Variável global para armazenar os dados vindos do JSON
let catalogoMusicas = [];

/**
 * Carrega os dados do arquivo JSON de músicas (sem renderizar nada na tela ao iniciar)
 */
async function inicializarPesquisa() {
    try {
        const response = await fetch('musicas.json'); 
        catalogoMusicas = await response.json();
    } catch (error) {
        console.error("Erro ao carregar o arquivo JSON de músicas:", error);
    }
}

/**
 * Remove acentos, caracteres especiais e espaços extras para facilitar a busca
 */
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Função principal disparada a cada letra digitada no input
 */
function filtrarMusicas() {
    const inputBusca = document.getElementById('search-input');
    const containerSugestoes = document.getElementById('resultados-busca-flutuante');
    if (!inputBusca || !containerSugestoes) return;

    const termoFormatado = normalizarTexto(inputBusca.value);

    // Se o campo estiver vazio, esconde a caixinha e limpa tudo
    if (termoFormatado === "") {
        containerSugestoes.innerHTML = "";
        containerSugestoes.style.display = "none";
        return;
    }

    // Filtra procurando por músicas que COMECEM com o termo digitado
    const resultadosFiltrados = catalogoMusicas.filter(musica => {
        const titulo = normalizarTexto(musica.titulo);
        const album = normalizarTexto(musica.album);
        const categoria = normalizarTexto(musica.categoria);

        // .startsWith() garante que buscará apenas termos que iniciam com o que foi digitado
        return titulo.startsWith(termoFormatado) || 
               album.startsWith(termoFormatado) || 
               categoria.startsWith(termoFormatado);
    });

    renderizarSugestoes(resultadosFiltrados, containerSugestoes, inputBusca);
}

/** teste mudança 18/07 21:10
 * Monta apenas a lista de nomes das músicas na caixinha flutuante
 */
/*function renderizarSugestoes(lista, container, input) {
    container.innerHTML = ""; // Limpa os resultados anteriores
    container.style.display = "block"; // Mostra a caixinha

    // Se a busca não retornar nada
    if (lista.length === 0) {
        container.innerHTML = `<div class="sugestao-sem-resultado">Nenhum louvor encontrado 🤷</div>`;
        return;
    }

    // Cria apenas a linha com o nome da música
    lista.forEach(musica => {
        const item = document.createElement('div');
        item.className = 'sugestao-item';
        item.innerText = musica.titulo; // Exibe apenas o nome da música
        
        // Ao clicar, localiza o índice na playlist global, toca a música e limpa a busca
        item.onclick = () => {
            // Verifica se a lista global 'musicas' do app existe
            if (typeof musicas !== "undefined" && musicas.length > 0) {
                // Alinha as playlists para garantir consistência de navegação (Próximo/Anterior)
                if (typeof carregarPlaylist === "function") {
                    carregarPlaylist(musicas);
                }
                
                // Encontra a posição exata da música pelo ID correspondente
                const indiceNoGlobal = musicas.findIndex(m => m.id === musica.id);
                
                // Caso encontre, executa a função de reprodução do player.js
                if (indiceNoGlobal >= 0 && typeof tocar === "function") {
                    tocar(indiceNoGlobal);
                }
            }

            // Limpa o input e fecha a lista de busca
            input.value = "";
            container.innerHTML = "";
            container.style.display = "none";
        };

        container.appendChild(item);
    });
} */

/**
 * Monta a lista compacta de nomes das músicas com a categoria na caixinha flutuante
 */
function renderizarSugestoes(lista, container, input) {
    container.innerHTML = ""; // Limpa os resultados anteriores
    container.style.display = "block"; // Mostra a caixinha

    // Se a busca não retornar nada
    if (lista.length === 0) {
        container.innerHTML = `<div class="sugestao-sem-resultado">Nenhum louvor encontrado 🤷</div>`;
        return;
    }

    // Cria a linha com o nome da música e sua categoria lateral
    lista.forEach(musica => {
        const item = document.createElement('div');
        item.className = 'sugestao-item';
        
        // ALTERADO: Injeta o título e adiciona a tag estilizada com a categoria
        item.innerHTML = `
            <span>${musica.titulo}</span>
            <span class="busca-estilo">${musica.categoria || 'Louvor'}</span>
        `;
        
        // Ao clicar, localiza o índice na playlist global, toca a música e limpa a busca
        item.onclick = () => {
            // Verifica se a lista global 'musicas' do app existe
            if (typeof musicas !== "undefined" && musicas.length > 0) {
                // Alinha as playlists para garantir consistência de navegação (Próximo/Anterior)
                if (typeof carregarPlaylist === "function") {
                    carregarPlaylist(musicas);
                }
                
                // Encontra a posição exata da música pelo ID correspondente
                const indiceNoGlobal = musicas.findIndex(m => m.id === musica.id);
                
                // Caso encontre, executa a função de reprodução do player.js
                if (indiceNoGlobal >= 0 && typeof tocar === "function") {
                    tocar(indiceNoGlobal);
                }
            }

            // Limpa o input e fecha a lista de busca
            input.value = "";
            container.innerHTML = "";
            container.style.display = "none";
        };

        container.appendChild(item);
    });
}

// Fecha as sugestões se o usuário clicar em qualquer outro lugar da tela
document.addEventListener('DOMContentLoaded', function() {
    inicializarPesquisa();
    // Também adicione um listener ao input
    const input = document.getElementById('search-input');
    if (input) {
        input.addEventListener('input', filtrarMusicas);
    }
});

