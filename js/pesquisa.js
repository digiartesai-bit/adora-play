let catalogoMusicas = [];
let catalogoLivrosBiblia = [];
let carregamentoPesquisa = null;
const dadosLivrosBibliaCache = new Map();
let sequenciaBusca = 0;

async function inicializarPesquisa() {
    if (carregamentoPesquisa) return carregamentoPesquisa;
    carregamentoPesquisa = (async () => {
        try {
            const resposta = await fetch('musicas.json');
            catalogoMusicas = await resposta.json();
        } catch (error) {
            console.error('Erro ao carregar o arquivo JSON de músicas:', error);
        }
        try {
            const resposta = await fetch('biblias/livros.json');
            const catalogo = await resposta.json();
            catalogoLivrosBiblia = [
                ...(catalogo.testamento_antigo || []),
                ...(catalogo.testamento_novo || [])
            ];
        } catch (error) {
            console.error('Erro ao carregar o catálogo de livros da Bíblia:', error);
        }
    })();
    return carregamentoPesquisa;
}

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function normalizarChaveBiblia(texto) {
    return normalizarTexto(texto).replace(/[^a-z0-9]/g, '');
}

function buscarLivrosBiblia(termo) {
    const referencia = termo.match(/^(.+?)\s+(\d{1,3})(?::(\d{1,3}))?$/);
    if (referencia) {
        const chaveLivro = normalizarChaveBiblia(referencia[1]);
        const livro = catalogoLivrosBiblia.find((item) => (
            normalizarChaveBiblia(item.livro) === chaveLivro
            || normalizarChaveBiblia(item.abreviacao) === chaveLivro
        ));
        const capitulo = Number(referencia[2]);
        const versiculo = referencia[3] ? Number(referencia[3]) : null;
        if (!livro || capitulo < 1 || capitulo > Number(livro.capitulos) || versiculo === 0) return [];
        return [{ livro, capitulo, versiculo }];
    }

    const chaveBusca = normalizarChaveBiblia(termo);
    if (!chaveBusca) return [];
    return catalogoLivrosBiblia
        .filter((livro) => (
            normalizarChaveBiblia(livro.livro).startsWith(chaveBusca)
            || normalizarChaveBiblia(livro.abreviacao).startsWith(chaveBusca)
        ))
        .slice(0, 8)
        .map((livro) => ({ livro, capitulo: null }));
}

async function validarVersiculoBiblia(resultado) {
    const versao = document.getElementById('seletorVersaoBiblia')?.value || 'acf';
    const nomeArquivo = normalizarChaveBiblia(resultado.livro.livro);
    const chaveCache = `${versao}:${nomeArquivo}`;
    if (!dadosLivrosBibliaCache.has(chaveCache)) {
        dadosLivrosBibliaCache.set(chaveCache, fetch(`biblias/${versao}/${nomeArquivo}.json`)
            .then((resposta) => {
                if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
                return resposta.json();
            }));
    }

    try {
        const dados = await dadosLivrosBibliaCache.get(chaveCache);
        const livro = dados.books?.find((item) => (
            normalizarChaveBiblia(item.name) === normalizarChaveBiblia(resultado.livro.livro)
        ));
        const capitulo = livro?.chapters?.find((item) => Number(item.chapter) === resultado.capitulo);
        return Boolean(capitulo?.verses?.some((item) => (
            Number(item.verse) <= resultado.versiculo
            && Number(item.verse_end || item.verse) >= resultado.versiculo
        )));
    } catch (error) {
        dadosLivrosBibliaCache.delete(chaveCache);
        console.warn('Não foi possível validar o versículo da busca:', error.message);
        return false;
    }
}

async function filtrarMusicas() {
    const inputBusca = document.getElementById('search-input');
    const containerSugestoes = document.getElementById('resultados-busca-flutuante');
    if (!inputBusca || !containerSugestoes) return;

    const buscaAtual = ++sequenciaBusca;
    const termoFormatado = normalizarTexto(inputBusca.value);

    // Se o campo estiver vazio, esconde a caixinha e limpa tudo
    if (termoFormatado === "") {
        containerSugestoes.innerHTML = "";
        containerSugestoes.style.display = "none";
        return;
    }

    const resultadosFiltrados = catalogoMusicas.filter(musica => {
        const titulo = normalizarTexto(musica.titulo);
        const album = normalizarTexto(musica.album);
        const categoria = normalizarTexto(musica.categoria);
        return titulo.startsWith(termoFormatado)
            || album.startsWith(termoFormatado)
            || categoria.startsWith(termoFormatado);
    });
    let livrosEncontrados = buscarLivrosBiblia(termoFormatado);
    const referenciasComVersiculo = livrosEncontrados.filter((item) => item.versiculo);
    if (referenciasComVersiculo.length) {
        const versiculosValidos = await Promise.all(referenciasComVersiculo.map(validarVersiculoBiblia));
        if (buscaAtual !== sequenciaBusca) return;
        let indiceVersiculo = 0;
        livrosEncontrados = livrosEncontrados.filter((item) => (
            !item.versiculo || versiculosValidos[indiceVersiculo++]
        ));
    }
    if (buscaAtual !== sequenciaBusca) return;

    renderizarSugestoes(resultadosFiltrados, livrosEncontrados, containerSugestoes, inputBusca);
}

function criarTituloGrupo(titulo) {
    const elemento = document.createElement('div');
    elemento.className = 'sugestao-grupo-titulo';
    elemento.textContent = titulo;
    return elemento;
}

function fecharSugestoes(input, container) {
    input.value = '';
    container.replaceChildren();
    container.style.display = 'none';
}

function tocarSugestaoMusica(musica, input, container) {
    if (typeof musicas !== 'undefined' && musicas.length > 0) {
        if (typeof carregarPlaylist === 'function') carregarPlaylist(musicas);
        const indice = musicas.findIndex((item) => String(item.id) === String(musica.id));
        if (indice >= 0 && typeof tocar === 'function') tocar(indice);
    }
    fecharSugestoes(input, container);
}

function abrirSugestaoBiblia(resultado, input, container) {
    fecharSugestoes(input, container);
    const livro = resultado.livro.livro;
    const rotaLivro = `/biblia/${encodeURIComponent(livro)}`;
    const rotaCapitulo = resultado.capitulo ? `${rotaLivro}/${resultado.capitulo}` : rotaLivro;
    const rota = resultado.versiculo
        ? `${rotaCapitulo}/${resultado.versiculo}`
        : rotaCapitulo;
    window.navegarPorRota?.(rota);
    Promise.resolve(window.mostrarBiblia?.({ preservarEstado: true }))
        .then(() => window.abrirBibliaPorRota?.({
            livro,
            capitulo: resultado.capitulo || undefined,
            versiculo: resultado.versiculo || undefined
        }));
}

function renderizarSugestoes(musicas, livros, container, input) {
    container.replaceChildren();
    container.style.display = 'block';

    if (musicas.length === 0 && livros.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'sugestao-sem-resultado';
        vazio.textContent = 'Nenhuma música, livro ou capítulo encontrado.';
        container.appendChild(vazio);
        return;
    }

    if (musicas.length) {
        container.appendChild(criarTituloGrupo('Músicas'));
    }
    musicas.slice(0, 8).forEach((musica) => {
        const item = document.createElement('div');
        item.className = 'sugestao-item';
        const texto = document.createElement('span');
        texto.textContent = musica.titulo || 'Música sem título';
        const album = document.createElement('span');
        album.className = 'busca-estilo';
        album.textContent = musica.album || musica.categoria || 'Música';
        item.append(texto, album);
        item.addEventListener('click', () => tocarSugestaoMusica(musica, input, container));
        container.appendChild(item);
    });

    if (livros.length) {
        container.appendChild(criarTituloGrupo('Bíblia'));
    }
    livros.forEach((resultado) => {
        const item = document.createElement('div');
        item.className = 'sugestao-item';
        const texto = document.createElement('span');
        texto.textContent = resultado.capitulo
            ? `${resultado.livro.livro} ${resultado.capitulo}${resultado.versiculo ? `:${resultado.versiculo}` : ''}`
            : `${resultado.livro.livro} · ${resultado.livro.capitulos} capítulos`;
        const tipo = document.createElement('span');
        tipo.className = 'busca-estilo';
        tipo.textContent = resultado.capitulo ? 'Bíblia' : resultado.livro.abreviacao;
        item.append(texto, tipo);
        item.addEventListener('click', () => abrirSugestaoBiblia(resultado, input, container));
        container.appendChild(item);
    });
}

// Fecha as sugestões se o usuário clicar em qualquer outro lugar da tela
document.addEventListener('DOMContentLoaded', function() {
    inicializarPesquisa();
    const input = document.getElementById('search-input');
    if (input) {
        input.addEventListener('input', filtrarMusicas);
    }
});
