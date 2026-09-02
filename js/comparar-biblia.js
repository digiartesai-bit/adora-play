(function () {
    const versions = [
        { id: 'nvi', name: 'NVI' },
        { id: 'acf', name: 'ACF' },
        { id: 'at', name: 'AT' },
        { id: 'kjvl', name: 'KJVT' },
        { id: 'nva', name: 'NVA' }
    ];
    const fileNameOverrides = {
        kjvl: {
            '1samuel': '1_samuel', '2samuel': '2_samuel',
            '1reis': '1_reis', '2reis': '2_reis',
            '1cronicas': '1_cronicas', '2cronicas': '2_cronicas',
            '1corintios': '1_corintios', '2corintios': '2_corintios',
            '1tessalonicenses': '1_tessalonicenses', '2tessalonicenses': '2_tessalonicenses',
            '1timoteo': '1_timotio', '2timoteo': '2_timotio',
            '1pedro': '1_pedro', '2pedro': '2_pedro',
            '1joao': '1_joao', '2joao': '2_joao', '3joao': '3_joao',
            'canticos': 'cantares', 'habacuque': 'abacuque'
        }
    };

    function getBookFileName(version, bookName) {
        const normalizedName = bookName.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        return fileNameOverrides[version]?.[normalizedName] || normalizedName;
    }

    async function loadVersionText(version, details) {
        const source = `biblias/${version.id}/${getBookFileName(version.id, details.bookName)}.json`;
        const response = await fetch(source);
        if (!response.ok) throw new Error(`Não foi possível carregar ${version.name}.`);
        const data = await response.json();
        const chapter = data.books?.[0]?.chapters?.find(item => item.chapter === details.chapter);
        const versesByNumber = new Map(chapter?.verses?.map(verse => [verse.verse, verse.text]));
        const text = details.verses.map(verse => versesByNumber.get(verse)).filter(Boolean).join(' ');
        if (!text) throw new Error(`Não foi possível localizar os versículos em ${version.name}.`);
        return text;
    }

    function close(dialog) {
        dialog.remove();
    }

    async function open(details) {
        const dialog = document.createElement('div');
        dialog.className = 'bible-compare-dialog';
        const panel = document.createElement('section');
        panel.className = 'bible-compare-panel';
        const heading = document.createElement('div');
        heading.className = 'bible-share-dialog-heading';
        const title = document.createElement('h3');
        title.textContent = details.reference;
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'bible-inline-close';
        closeButton.textContent = '×';
        closeButton.setAttribute('aria-label', 'Fechar comparação');
        closeButton.addEventListener('click', () => close(dialog));
        heading.append(title, closeButton);
        const list = document.createElement('div');
        list.className = 'bible-compare-list';
        panel.append(heading, list);
        dialog.appendChild(panel);
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) close(dialog);
        });
        document.body.appendChild(dialog);

        versions.forEach((version) => {
            const item = document.createElement('article');
            item.className = 'bible-compare-item';
            const versionName = document.createElement('strong');
            versionName.textContent = version.name;
            const verseText = document.createElement('p');
            verseText.textContent = 'Carregando...';
            item.append(versionName, verseText);
            list.appendChild(item);
            loadVersionText(version, details)
                .then(value => { verseText.textContent = value; })
                .catch(() => { verseText.textContent = 'Versículo indisponível nesta versão.'; });
        });
    }

    window.bibleComparison = { open };
}());
