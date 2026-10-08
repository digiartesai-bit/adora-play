(function () {
    const CHAVE = 'tourConcluido';
    // Em revisão: com false o tour reaparece sempre. Trocar para true ao finalizar.
    const GRAVAR_FLAG = false;

    const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

    async function esperar(seletor, tentativas = 30) {
        for (let i = 0; i < tentativas; i++) {
            const el = document.querySelector(seletor);
            if (el) return el;
            await pausa(100);
        }
        return null;
    }

    let bibliaAbertaPeloTour = false;
    let tourAgendado = false;

    function usuarioAtual() {
        try {
            return JSON.parse(localStorage.getItem('adoraplayGoogleUser'));
        } catch {
            return null;
        }
    }

    function atualizarAvisoVisitante() {
        const aviso = document.getElementById('guestLoginNotice');
        if (aviso) aviso.hidden = Boolean(usuarioAtual()?.google_id);
    }

    function agendarTour() {
        if (tourAgendado || !deveIniciar()) return;
        tourAgendado = true;
        window.setTimeout(() => {
            if (deveIniciar() && !document.querySelector('.tour-caixa')) iniciar();
            else tourAgendado = false;
        }, 1200);
    }

    // A Bíblia rola a página com animação; espera parar antes de medir o alvo.
    async function estabilizar(el) {
        let anterior = null;
        let iguais = 0;
        for (let i = 0; i < 25 && iguais < 3; i++) {
            const topo = el.getBoundingClientRect().top;
            iguais = topo === anterior ? iguais + 1 : 0;
            anterior = topo;
            await pausa(60);
        }
    }

    async function abrirBiblia() {
        if (!bibliaAbertaPeloTour) {
            bibliaAbertaPeloTour = true;
            window.navegarPorRota?.('/biblia');
            await window.mostrarBiblia?.();
        }
        await esperar('#gruposLivros button');
    }

    async function abrirLivro() {
        await abrirBiblia();
        if (document.getElementById('painelCapitulos')?.hidden === false) return;
        const livro = document.querySelector('#gruposLivros button');
        livro?.click();
        await esperar('#gradeCapitulos button');
    }

    async function abrirCapitulo() {
        await abrirLivro();
        if (document.getElementById('painelVersiculos')?.hidden === false) return;
        document.querySelector('#gradeCapitulos button')?.click();
        await esperar('#textoVersiculo .bible-verse');
    }

    async function selecionarVersiculo() {
        await abrirCapitulo();
        if (document.getElementById('acoesRapidasBiblia')?.hidden === false) return;
        document.querySelector('#textoVersiculo .bible-verse')?.click();
        await pausa(300);
    }

    function voltarParaHome() {
        if (!bibliaAbertaPeloTour) return;
        bibliaAbertaPeloTour = false;
        const limpar = document.getElementById('limparSelecaoBibliaMobile');
        if (limpar && limpar.getBoundingClientRect().width > 0) limpar.click();
        document.getElementById('fecharBiblia')?.click();
    }

    const passos = [
        { alvo: '#search-input', titulo: 'Busca', texto: 'Pesquise músicas e livros da Bíblia por aqui.' },
        { alvo: '#abrirPreferencias', titulo: 'Preferências', texto: 'Veja seus dados, controle a exibição no ranking, escolha a versão da Bíblia, instale o app ou encerre sua conta.', menu: true },
        { alvo: '#btnInstall.mostrar-btn', titulo: 'Instalar', texto: 'Instale o AdoraPlay no seu aparelho para abrir como um app.', menu: true },
        { alvo: '#btnBiblioteca', titulo: 'Biblioteca', texto: 'Todas as músicas e seus favoritos em um só lugar.', menu: true },
        { alvo: '#btnJogos', titulo: 'Jogos', texto: 'Missões de leitura, quiz e desafios com amigos.', menu: true },
        { alvo: '#btnBiblia', titulo: 'Bíblia', texto: 'Vamos conhecer a leitura da Bíblia.', menu: true },
        { alvo: '.bible-version-row', titulo: 'Versão', texto: 'Escolha a versão bíblica de sua preferência.', preparar: abrirBiblia },
        { alvo: '#gruposLivros button', titulo: 'Livros', texto: 'Toque no livro que deseja ler, do Antigo ou do Novo Testamento. Ex.: Gênesis.', topo: true, preparar: abrirBiblia },
        { alvo: '#gradeCapitulos button', titulo: 'Capítulos', texto: 'Depois escolha o capítulo. Ex.: capítulo 1.', topo: true, preparar: abrirLivro },
        { alvo: '#gradeVersiculos button', titulo: 'Versículos', texto: 'Toque em um número para ir direto ao versículo. Ex.: versículo 1.', topo: true, preparar: abrirCapitulo },
        { alvo: '#textoVersiculo .bible-verse', titulo: 'Seleção', texto: 'Toque no texto de um ou mais versículos para selecioná-los.', topo: true, preparar: selecionarVersiculo },
        { alvo: '#compararSelecaoBiblia', titulo: 'Comparar', texto: 'Compare o versículo selecionado em outras versões.', preparar: selecionarVersiculo },
        { alvo: '#compartilharSelecaoBiblia', titulo: 'Compartilhar', texto: 'Gere uma imagem do versículo para compartilhar.', preparar: selecionarVersiculo },
        { alvo: '#anotarSelecaoBiblia', titulo: 'Anotar', texto: 'Escreva uma anotação. Ela fica salva na sua conta.', preparar: selecionarVersiculo },
        { alvo: '#marcarSelecaoBiblia', titulo: 'Marcar', texto: 'Marque o versículo para encontrá-lo depois em Minhas anotações.', preparar: selecionarVersiculo },
        { alvo: '#miniPlayer', titulo: 'Player', texto: 'Controle a música, favorite e compartilhe sem sair da página.', preparar: voltarParaHome }
    ];

    let lista = [];
    let indice = 0;
    let ocupado = false;
    let overlay, destaque, caixa;

    function visivel(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }

    function abrirMenuSePreciso(passo) {
        const menu = document.getElementById('headerQuickActions');
        const botao = document.getElementById('btnMenuMobile');
        if (!menu || !botao || !visivel(botao)) return;
        const abrir = !!passo.menu;
        menu.classList.toggle('is-open', abrir);
        botao.setAttribute('aria-expanded', String(abrir));
    }

    function resolverAlvo(passo) {
        abrirMenuSePreciso(passo);
        return Array.from(document.querySelectorAll(passo.alvo)).find(visivel) || null;
    }

    function encerrar(naoExibirMais) {
        if (naoExibirMais && GRAVAR_FLAG) localStorage.setItem(CHAVE, '1');
        abrirMenuSePreciso({ menu: false });
        voltarParaHome();
        document.documentElement.classList.remove('tour-travado');
        overlay?.remove();
        destaque?.remove();
        caixa?.remove();
        window.removeEventListener('resize', posicionar);
        document.removeEventListener('keydown', teclado);
    }

    function teclado(e) {
        if (e.key === 'Escape') encerrar(false);
    }

    function posicionar() {
        const passo = lista[indice];
        const el = passo && resolverAlvo(passo);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const folga = 6;
        Object.assign(destaque.style, {
            top: `${r.top - folga}px`,
            left: `${r.left - folga}px`,
            width: `${r.width + folga * 2}px`,
            height: `${r.height + folga * 2}px`
        });

        const cw = caixa.offsetWidth;
        const ch = caixa.offsetHeight;
        const margem = 12;
        let top = r.bottom + margem + folga;
        if (top + ch > window.innerHeight - margem) top = r.top - ch - margem - folga;
        top = Math.max(margem, Math.min(top, window.innerHeight - ch - margem));
        let left = (window.innerWidth - cw) / 2;
        left = Math.max(margem, left);
        caixa.style.top = `${top}px`;
        caixa.style.left = `${left}px`;
    }

    async function mostrarPasso() {
        ocupado = true;
        let passo = lista[indice];
        let el = null;
        while (passo) {
            await passo.preparar?.();
            el = resolverAlvo(passo);
            if (el) break;
            lista.splice(indice, 1);
            passo = lista[indice];
        }
        ocupado = false;
        if (!overlay?.isConnected) return;
        if (!el) return encerrar(false);
        if (passo.topo) window.scrollBy({ top: el.getBoundingClientRect().top - 90, behavior: 'instant' });
        else el.scrollIntoView({ block: 'center', behavior: 'instant' });
        await estabilizar(el);
        if (!overlay?.isConnected) return;

        const ultimo = indice === lista.length - 1;
        caixa.innerHTML = `
            <span class="tour-contador">${indice + 1} de ${lista.length}</span>
            <h3 id="tourTitulo"></h3>
            <p></p>
            <div class="tour-acoes">
                <button type="button" class="tour-nao-exibir">Não exibir mais</button>
                <button type="button" class="tour-proximo">${ultimo ? 'Concluir' : 'Próximo'}</button>
            </div>`;
        caixa.querySelector('h3').textContent = passo.titulo;
        caixa.querySelector('p').textContent = passo.texto;
        caixa.querySelector('.tour-nao-exibir').addEventListener('click', () => encerrar(true));
        caixa.querySelector('.tour-proximo').addEventListener('click', () => {
            if (ocupado) return;
            if (ultimo) return encerrar(true);
            indice += 1;
            mostrarPasso();
        });
        posicionar();
        caixa.querySelector('.tour-proximo').focus({ preventScroll: true });
    }

    function iniciar() {
        if (!deveIniciar()) return;
        lista = passos.slice();
        indice = 0;

        overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        destaque = document.createElement('div');
        destaque.className = 'tour-destaque';
        caixa = document.createElement('div');
        caixa.className = 'tour-caixa';
        caixa.setAttribute('role', 'dialog');
        caixa.setAttribute('aria-labelledby', 'tourTitulo');

        // Impede que cliques no tour fechem o menu mobile (listener global em app.js).
        [overlay, caixa].forEach((el) => el.addEventListener('click', (e) => e.stopPropagation()));

        document.body.append(overlay, destaque, caixa);
        document.documentElement.classList.add('tour-travado');
        window.addEventListener('resize', posicionar);
        document.addEventListener('keydown', teclado);
        mostrarPasso();
    }

    function deveIniciar() {
        if (GRAVAR_FLAG && localStorage.getItem(CHAVE) === '1') return false;
        if (!usuarioAtual()?.google_id) return false;
        const params = new URLSearchParams(window.location.search);
        const rota = (window.location.hash || '').replace(/^#/, '');
        return !params.get('id') && !params.get('desafio') && rota !== '/preferencias';
    }

    window.iniciarTourAdoraPlay = iniciar;

    window.addEventListener('load', () => {
        atualizarAvisoVisitante();
        agendarTour();
    });

    window.addEventListener('adoraplay:login', () => {
        atualizarAvisoVisitante();
        agendarTour();
    });
    window.addEventListener('adoraplay:logout', atualizarAvisoVisitante);

    document.getElementById('guestLoginNoticeFechar')?.addEventListener('click', () => {
        document.getElementById('guestLoginNotice').hidden = true;
    });
    document.getElementById('guestLoginNoticeEntrar')?.addEventListener('click', () => {
        document.getElementById('googleSignInButton')?.click();
    });
})();
