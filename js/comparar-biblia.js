(function () {
    const versions = [
        { id: 'acf', name: 'ACF' },
        { id: 'kjvl', name: 'KJA' },
        { id: 'nbv', name: 'NBV' },
        { id: 'ntlh', name: 'NTLH' },
        { id: 'nvt', name: 'NVT' },
        { id: 'tb', name: 'TB' },
        { id: 'nva', name: 'NVA' }
    ];

    function getBookFileName(version, bookName) {
        const normalizedName = bookName.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        return normalizedName;
    }

    function getRequestedVerses(details) {
        const ranges = details.verseRanges?.length
            ? details.verseRanges
            : details.verses.map(verse => ({ start: verse, end: verse }));
        return [...new Set(ranges.flatMap(range => {
            const verses = [];
            for (let verse = range.start; verse <= range.end; verse += 1) verses.push(verse);
            return verses;
        }))];
    }

    async function loadVersionText(version, details) {
        const source = `biblias/${version.id}/${getBookFileName(version.id, details.bookName)}.json`;
        const response = await fetch(source);
        if (!response.ok) throw new Error(`Não foi possível carregar ${version.name}.`);
        const data = await response.json();
        const chapter = data.books?.[0]?.chapters?.find(item => item.chapter === details.chapter);
        const requestedVerses = getRequestedVerses(details);
        const matchedTexts = [];
        for (const verseNumber of requestedVerses) {
            const verse = chapter?.verses?.find(item => {
                const verseEnd = item.verse_end || item.verse;
                return item.verse <= verseNumber && verseNumber <= verseEnd;
            });
            if (verse && !matchedTexts.includes(verse.text)) matchedTexts.push(verse.text);
        }
        const text = matchedTexts.join(' ');
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
            const versionName = document.createElement('button');
            versionName.type = 'button';
            versionName.className = 'bible-comparison-link';
            versionName.textContent = version.name;
            versionName.title = `Abrir ${version.name} nesta passagem`;
            versionName.addEventListener('click', () => {
                close(dialog);
                window.openBibleComparisonVersion(version.id, details);
            });
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
