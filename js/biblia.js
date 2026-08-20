(function () {
    const books = [
        ['gn', 'Gênesis'], ['ex', 'Êxodo'], ['lv', 'Levítico'], ['nm', 'Números'], ['dt', 'Deuteronômio'], ['js', 'Josué'], ['jz', 'Juízes'], ['rt', 'Rute'], ['1sm', '1 Samuel'], ['2sm', '2 Samuel'], ['1rs', '1 Reis'], ['2rs', '2 Reis'], ['1cr', '1 Crônicas'], ['2cr', '2 Crônicas'], ['ed', 'Esdras'], ['ne', 'Neemias'], ['et', 'Ester'], ['jó', 'Jó'], ['sl', 'Salmos'], ['pv', 'Provérbios'], ['ec', 'Eclesiastes'], ['ct', 'Cânticos'], ['is', 'Isaías'], ['jr', 'Jeremias'], ['lm', 'Lamentações'], ['ez', 'Ezequiel'], ['dn', 'Daniel'], ['os', 'Oséias'], ['jl', 'Joel'], ['am', 'Amós'], ['ob', 'Obadias'], ['jn', 'Jonas'], ['mq', 'Miqueias'], ['na', 'Naum'], ['hc', 'Habacuque'], ['sf', 'Sofonias'], ['ag', 'Ageu'], ['zc', 'Zacarias'], ['ml', 'Malaquias'],
        ['mt', 'Mateus'], ['mc', 'Marcos'], ['lc', 'Lucas'], ['jo', 'João'], ['atos', 'Atos'], ['rm', 'Romanos'], ['1co', '1 Coríntios'], ['2co', '2 Coríntios'], ['gl', 'Gálatas'], ['ef', 'Efésios'], ['fp', 'Filipenses'], ['cl', 'Colossenses'], ['1ts', '1 Tessalonicenses'], ['2ts', '2 Tessalonicenses'], ['1tm', '1 Timóteo'], ['2tm', '2 Timóteo'], ['tt', 'Tito'], ['fm', 'Filemom'], ['hb', 'Hebreus'], ['tg', 'Tiago'], ['1pe', '1 Pedro'], ['2pe', '2 Pedro'], ['1jo', '1 João'], ['2jo', '2 João'], ['3jo', '3 João'], ['jd', 'Judas'], ['ap', 'Apocalipse']
    ].map(([abbrev, name], index) => ({ abbrev, name, testament: index < 39 ? 'Antigo Testamento' : 'Novo Testamento' }));

    const section = document.getElementById('bibliaSection');
    const homeSection = document.getElementById('homeSection');
    const librarySection = document.getElementById('bibliotecaSection');
    const groups = document.getElementById('gruposLivros');
    const chaptersPanel = document.getElementById('painelCapitulos');
    const versesPanel = document.getElementById('painelVersiculos');
    const chaptersGrid = document.getElementById('gradeCapitulos');
    const versesGrid = document.getElementById('gradeVersiculos');
    const chaptersTitle = document.getElementById('tituloCapitulos');
    const versesTitle = document.getElementById('tituloVersiculos');
    const subtitle = document.getElementById('bibliaSubtitulo');
    const reading = document.getElementById('leituraVersiculo');
    const reference = document.getElementById('referenciaVersiculo');
    const text = document.getElementById('textoVersiculo');
    const versionSelect = document.getElementById('seletorVersaoBiblia');
    const savedStudiesKey = 'adoraPlayBibliaEstudos';
    const apiUrl = 'https://adoraplay-api.digiartesai.workers.dev';
    const notesPanel = document.getElementById('painelAnotacoes');
    const notesList = document.getElementById('listaAnotacoes');
    const steps = {
        book: document.getElementById('passoLivro'),
        chapter: document.getElementById('passoCapitulo'),
        verse: document.getElementById('passoVersiculo'),
        notes: document.getElementById('passoAnotacoes')
    };

    let selectedBook = null;
    let selectedBookData = null;
    let selectedChapter = null;
    let selectedVerse = null;
    let selectedVersion = 'nvi';
    const versionCache = new Map();

    function getGoogleUser() {
        try {
            return JSON.parse(localStorage.getItem('adoraplayGoogleUser'));
        } catch {
            return null;
        }
    }

    async function requestBibleApi(path, method = 'GET', data = null) {
        const user = getGoogleUser();
        if (!user?.google_id) throw new Error('Entre com sua conta Google para sincronizar a Bíblia.');

        const url = new URL(`${apiUrl}${path}`);
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (method === 'GET') {
            url.searchParams.set('google_id', user.google_id);
        } else {
            options.body = JSON.stringify({ google_id: user.google_id, ...data });
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const result = await response.json().catch(() => null);
            throw new Error(result?.error || `HTTP ${response.status}`);
        }
        return response.json().catch(() => null);
    }

    function sendToBibleApi(path, data) {
        return requestBibleApi(path, 'POST', data);
    }

    function getSavedStudies() {
        try {
            const studies = JSON.parse(localStorage.getItem(savedStudiesKey));
            return studies && typeof studies === 'object' && !Array.isArray(studies) ? studies : {};
        } catch {
            return {};
        }
    }

    function saveStudies(studies) {
        localStorage.setItem(savedStudiesKey, JSON.stringify(studies));
    }

    function getVerseKey(verseIndex = selectedVerse) {
        const chapter = selectedBookData.chapters[selectedChapter];
        const verse = chapter.verses[verseIndex];
        return `${selectedBook.abbrev}:${chapter.chapter}:${verse.verse}`;
    }

    function getVerseDetails(verseIndex = selectedVerse) {
        return {
            key: getVerseKey(verseIndex),
            reference: `${selectedBook.name} ${selectedBookData.chapters[selectedChapter].chapter}:${selectedBookData.chapters[selectedChapter].verses[verseIndex].verse}`,
            text: selectedBookData.chapters[selectedChapter].verses[verseIndex].text,
            bookAbbrev: selectedBook.abbrev,
            chapter: selectedBookData.chapters[selectedChapter].chapter,
            verse: selectedBookData.chapters[selectedChapter].verses[verseIndex].verse,
            version: selectedVersion
        };
    }

    function getStudyLocation(study) {
        if (study.bookAbbrev && study.chapter && study.verse) return study;
        const parts = String(study.key || '').split(':');
        const hasVersion = parts.length === 4;
        return {
            ...study,
            version: study.version || (hasVersion ? parts[0] : 'acf'),
            bookAbbrev: study.bookAbbrev || parts[hasVersion ? 1 : 0],
            chapter: Number(study.chapter || parts[hasVersion ? 2 : 1]),
            verse: Number(study.verse || parts[hasVersion ? 3 : 2])
        };
    }

    async function loadRemoteStudies() {
        const remoteStudies = await requestBibleApi('/api/anotacoes');
        const studies = {};

        remoteStudies.forEach((remoteStudy) => {
            const book = books.find((item) => item.name === remoteStudy.livro);
            const chapter = Number(remoteStudy.capitulo);
            const verse = Number(remoteStudy.versiculo);
            if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) return;

            const key = `${book.abbrev}:${chapter}:${verse}`;
            studies[key] = {
                id: remoteStudy.id,
                key,
                reference: `${book.name} ${chapter}:${verse}`,
                text: remoteStudy.texto || '',
                bookAbbrev: book.abbrev,
                chapter,
                verse,
                version: selectedVersion,
                highlighted: true,
                note: remoteStudy.texto || '',
                updatedAt: remoteStudy.criado_em
            };
        });

        saveStudies(studies);
        updateVerseStyles();
        if (!notesPanel.hidden) renderNotes();
        if (selectedVerse !== null) showSelectedVerseStudy();
    }

    function renderNotes() {
        const studies = Object.values(getSavedStudies())
            .filter(study => study.highlighted || study.note)
            .map(getStudyLocation)
            .sort((first, second) => String(second.updatedAt || '').localeCompare(String(first.updatedAt || '')));

        notesList.replaceChildren();
        if (!studies.length) {
            const empty = document.createElement('p');
            empty.className = 'bible-notes-empty';
            empty.textContent = 'Nenhuma anotação ou versículo grifado salvo ainda.';
            notesList.appendChild(empty);
            return;
        }

        studies.forEach((study) => {
            const item = createButton('bible-note-item', '', () => openSavedStudy(study));
            const studyReference = document.createElement('strong');
            studyReference.className = 'bible-note-reference';
            studyReference.textContent = `${study.highlighted ? '★ ' : ''}${study.reference} (${String(study.version || 'acf').toUpperCase()})`;
            const studyText = document.createElement('span');
            studyText.className = 'bible-note-text';
            studyText.textContent = study.text;
            item.append(studyReference, studyText);
            if (study.note) {
                const preview = document.createElement('span');
                preview.className = 'bible-note-preview';
                preview.textContent = study.note;
                item.appendChild(preview);
            }
            notesList.appendChild(item);
        });
    }

    function updateVerseStyles() {
        if (selectedChapter === null) return;
        const studies = getSavedStudies();
        text.querySelectorAll('.bible-verse').forEach((verse, index) => {
            verse.classList.toggle('is-highlighted', Boolean(studies[getVerseKey(index)]?.highlighted));
            verse.querySelector('.bible-highlight-star')?.remove();
            if (studies[getVerseKey(index)]?.highlighted) {
                const star = document.createElement('span');
                star.className = 'bible-highlight-star';
                star.textContent = '★';
                star.setAttribute('aria-label', 'Versículo grifado');
                verse.prepend(star);
            }
        });
    }

    function closeVerseStudy() {
        text.querySelector('.bible-inline-editor')?.remove();
    }

    function showSelectedVerseStudy() {
        if (selectedVerse === null) return;
        const details = getVerseDetails();
        const study = getSavedStudies()[details.key];
        closeVerseStudy();
        const editor = document.createElement('section');
        editor.className = 'bible-inline-editor';
        const heading = document.createElement('div');
        heading.className = 'bible-study-heading';
        const title = document.createElement('h4');
        title.textContent = details.reference;
        const closeButton = createButton('bible-inline-close', '×', closeVerseStudy);
        closeButton.setAttribute('aria-label', 'Fechar anotação');
        closeButton.title = 'Fechar anotação';
        const markButton = createButton('bible-mark-button', '', () => toggleVerseHighlight(details, markButton));
        markButton.classList.toggle('is-marked', Boolean(study?.highlighted));
        markButton.textContent = study?.highlighted ? 'Desmarcar versículo' : 'Marcar versículo';
        const headingActions = document.createElement('div');
        headingActions.className = 'bible-editor-heading-actions';
        headingActions.append(closeButton, markButton);
        heading.append(title, headingActions);
        const label = document.createElement('label');
        label.className = 'bible-note-label';
        label.textContent = 'Anotação';
        const noteInput = document.createElement('textarea');
        noteInput.rows = 4;
        noteInput.placeholder = 'Escreva sua anotação sobre este versículo...';
        noteInput.value = study?.note || '';
        const actions = document.createElement('div');
        actions.className = 'bible-editor-actions';
        const saveButton = createButton('bible-save-note', 'Salvar anotação', () => saveVerseStudy(details, noteInput.value, saveButton));
        actions.appendChild(saveButton);
        if (study) {
            actions.appendChild(createButton('bible-delete-note', 'Apagar anotação', () => deleteVerseStudy(details)));
        }
        editor.append(heading, label, noteInput, actions);
        const verseNumber = selectedBookData.chapters[selectedChapter].verses[selectedVerse].verse;
        document.getElementById(`versiculo-${verseNumber}`).after(editor);
    }

    function setStep(step) {
        Object.entries(steps).forEach(([name, element]) => {
            element.classList.toggle('is-active', name === step);
        });
    }

    function createButton(className, label, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    }

    function formatAbbreviation(abbreviation) {
        if (abbreviation === 'atos') return 'At';
        const match = abbreviation.match(/^(\d*)(.*)$/);
        return `${match[1]}${match[2].charAt(0).toUpperCase()}${match[2].slice(1)}`;
    }

    async function loadVersion(version) {
        if (versionCache.has(version)) return versionCache.get(version);
        const response = await fetch(`versoes/${version}.json`);
        if (!response.ok) throw new Error(`Não foi possível carregar a versão ${version.toUpperCase()}.`);
        const data = await response.json();
        if (!Array.isArray(data.books) || data.books.length !== books.length) {
            throw new Error(`A versão ${version.toUpperCase()} possui formato inválido.`);
        }
        versionCache.set(version, data);
        return data;
    }

    async function setBibleVersion(version) {
        selectedVersion = version;
        versionSelect.value = version;
        selectedBook = null;
        selectedBookData = null;
        selectedChapter = null;
        selectedVerse = null;
        return loadVersion(version);
    }

    function renderBooks() {
        ['Antigo Testamento', 'Novo Testamento'].forEach((testament) => {
            const group = document.createElement('div');
            group.className = 'bible-book-group';
            const heading = document.createElement('h4');
            heading.textContent = testament;
            const grid = document.createElement('div');
            grid.className = 'bible-book-grid';

            books.filter(book => book.testament === testament).forEach((book) => {
                const button = createButton('bible-book-button', formatAbbreviation(book.abbrev), () => loadBook(book));
                button.setAttribute('aria-label', book.name);
                button.title = book.name;
                grid.appendChild(button);
            });

            group.append(heading, grid);
            groups.appendChild(group);
        });
    }

    async function loadBook(book) {
        subtitle.textContent = `Carregando ${book.name}...`;
        try {
            const versionData = await loadVersion(selectedVersion);
            selectedBookData = versionData.books.find(item => item.abbrev === book.abbrev);
            if (!selectedBookData) throw new Error(`Não foi possível localizar ${book.name}.`);
            selectedBook = book;
            selectedChapter = null;
            chaptersTitle.textContent = `${book.name}: capítulos`;
            chaptersGrid.replaceChildren();
            selectedBookData.chapters.forEach((_, index) => {
                chaptersGrid.appendChild(createButton('bible-number-button', String(index + 1), () => selectChapter(index)));
            });
            document.getElementById('painelLivros').hidden = true;
            chaptersPanel.hidden = false;
            versesPanel.hidden = true;
            notesPanel.hidden = true;
            subtitle.textContent = `${selectedVersion.toUpperCase()}: ${book.name} possui ${selectedBookData.chapters.length} capítulos.`;
            setStep('chapter');
        } catch (error) {
            console.error(error);
            subtitle.textContent = `Não foi possível abrir ${book.name}. Abra o site por um servidor local.`;
        }
    }

    function selectChapter(chapterIndex) {
        selectedChapter = chapterIndex;
        selectedVerse = null;
        closeVerseStudy();
        const chapter = selectedBookData.chapters[chapterIndex];
        const verses = chapter.verses;
        versesTitle.textContent = `${selectedBook.name} ${chapter.chapter}: versículos`;
        versesGrid.replaceChildren();
        verses.forEach((verse, index) => {
            versesGrid.appendChild(createButton('bible-number-button', String(verse.verse), () => navigateToVerse(index)));
        });
        renderChapter(verses);
        chaptersPanel.hidden = true;
        versesPanel.hidden = false;
        notesPanel.hidden = true;
        subtitle.textContent = `${selectedVersion.toUpperCase()}: ${selectedBook.name} ${chapter.chapter} possui ${verses.length} versículos.`;
        setStep('verse');
        sendToBibleApi('/api/marcacoes', {
            livro: selectedBook.name,
            capitulo: chapter.chapter
        }).catch((error) => console.warn('Não foi possível salvar a marcação de leitura:', error.message));
    }

    function renderChapter(verses) {
        reference.textContent = `${selectedBook.name} ${selectedBookData.chapters[selectedChapter].chapter} (${selectedVersion.toUpperCase()})`;
        text.replaceChildren();
        verses.forEach((verse, index) => {
            const verseElement = document.createElement('div');
            verseElement.className = 'bible-verse';
            verseElement.id = `versiculo-${verse.verse}`;
            const number = document.createElement('span');
            number.className = 'bible-verse-number';
            number.textContent = verse.verse;
            verseElement.append(number, verse.text);
            verseElement.addEventListener('click', () => selectVerse(index));
            text.appendChild(verseElement);
        });
        updateVerseStyles();
    }

    function selectVerse(verseIndex) {
        selectedVerse = verseIndex;
        versesGrid.querySelectorAll('.bible-number-button').forEach((button, index) => {
            button.classList.toggle('is-selected', index === verseIndex);
        });
        text.querySelectorAll('.bible-verse').forEach((verse, index) => {
            verse.classList.toggle('is-selected', index === verseIndex);
        });
        showSelectedVerseStudy();
        document.getElementById(`versiculo-${selectedBookData.chapters[selectedChapter].verses[verseIndex].verse}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function navigateToVerse(verseIndex) {
        selectedVerse = null;
        closeVerseStudy();
        versesGrid.querySelectorAll('.bible-number-button').forEach((button) => {
            button.classList.remove('is-selected');
        });
        text.querySelectorAll('.bible-verse').forEach((verse) => {
            verse.classList.remove('is-selected');
        });
        document.getElementById(`versiculo-${selectedBookData.chapters[selectedChapter].verses[verseIndex].verse}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function toggleVerseHighlight(details, markButton) {
        const studies = getSavedStudies();
        const study = studies[details.key];
        try {
            markButton.disabled = true;
            if (study?.id) {
                await requestBibleApi('/api/anotacoes', 'DELETE', { id: study.id });
            } else {
                await sendToBibleApi('/api/anotacoes', {
                    livro: selectedBook.name,
                    capitulo: details.chapter,
                    versiculo: details.verse,
                    texto: ''
                });
            }
            await loadRemoteStudies();
        } catch (error) {
            console.warn('Não foi possível alterar a marcação:', error.message);
            window.alert(`Não foi possível alterar a marcação no Cloudflare: ${error.message}`);
            markButton.disabled = false;
        }
    }

    async function saveVerseStudy(details, note, saveButton) {
        const noteText = note.trim();
        if (!noteText) {
            window.alert('Escreva uma anotação antes de salvar.');
            return;
        }

        const studies = getSavedStudies();
        const study = studies[details.key] || { ...details };
        study.highlighted = true;
        study.note = noteText;
        study.updatedAt = new Date().toISOString();
        studies[details.key] = study;
        saveStudies(studies);
        updateVerseStyles();

        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando...';
            if (study.id) {
                await requestBibleApi('/api/anotacoes', 'PUT', { id: study.id, texto: study.note });
            } else {
                await sendToBibleApi('/api/anotacoes', {
                    livro: selectedBook.name,
                    capitulo: details.chapter,
                    versiculo: details.verse,
                    texto: study.note
                });
            }
            await loadRemoteStudies();
            closeVerseStudy();
        } catch (error) {
            console.warn('Não foi possível salvar a anotação:', error.message);
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar anotação';
            window.alert(`Não foi possível salvar a anotação no Cloudflare: ${error.message}`);
        }
    }

    async function deleteVerseStudy(details) {
        const studies = getSavedStudies();
        const study = studies[details.key];
        if (!study?.id) return;

        try {
            await requestBibleApi('/api/anotacoes', 'DELETE', { id: study.id });
            await loadRemoteStudies();
            closeVerseStudy();
        } catch (error) {
            console.warn('Não foi possível apagar a anotação:', error.message);
            window.alert(`Não foi possível apagar a anotação no Cloudflare: ${error.message}`);
        }
    }

    async function openSavedStudy(study) {
        const book = books.find(item => item.abbrev === study.bookAbbrev);
        if (!book || !Number.isInteger(study.chapter) || !Number.isInteger(study.verse)) return;
        await setBibleVersion(study.version || 'acf');
        await loadBook(book);
        const chapterIndex = selectedBookData.chapters.findIndex(chapter => chapter.chapter === study.chapter);
        if (chapterIndex < 0) return;
        selectChapter(chapterIndex);
        const verseIndex = selectedBookData.chapters[chapterIndex].verses.findIndex(verse => verse.verse === study.verse);
        if (verseIndex >= 0) navigateToVerse(verseIndex);
    }

    function showBooks() {
        document.getElementById('painelLivros').hidden = false;
        chaptersPanel.hidden = true;
        versesPanel.hidden = true;
        notesPanel.hidden = true;
        closeVerseStudy();
        subtitle.textContent = `${selectedVersion.toUpperCase()} selecionada. Escolha um livro para começar a leitura.`;
        setStep('book');
    }

    function showChapters() {
        if (!selectedBookData) return;
        chaptersPanel.hidden = false;
        versesPanel.hidden = true;
        notesPanel.hidden = true;
        closeVerseStudy();
        subtitle.textContent = `Escolha um capítulo de ${selectedBook.name}.`;
        setStep('chapter');
    }

    function showNotes() {
        selectedVerse = null;
        closeVerseStudy();
        document.getElementById('painelLivros').hidden = true;
        chaptersPanel.hidden = true;
        versesPanel.hidden = true;
        notesPanel.hidden = false;
        subtitle.textContent = 'Revise seus versículos grifados e suas anotações.';
        setStep('notes');
        renderNotes();
    }

    function closeBible() {
        selectedVerse = null;
        showBooks();
        section.style.display = 'none';
        homeSection.style.display = 'grid';
    }

    window.mostrarBiblia = function () {
        if (!section) return;
        homeSection.style.display = 'none';
        librarySection.style.display = 'none';
        section.style.display = 'grid';
        setBibleVersion(selectedVersion)
            .then(async () => {
                if (getGoogleUser()?.google_id) await loadRemoteStudies();
                showBooks();
            })
            .catch((error) => {
                console.error(error);
                subtitle.textContent = 'Não foi possível carregar a versão bíblica selecionada.';
            });
    };

    document.getElementById('voltarLivros').addEventListener('click', showBooks);
    document.getElementById('voltarCapitulos').addEventListener('click', showChapters);
    document.getElementById('fecharBiblia').addEventListener('click', closeBible);
    versionSelect.value = selectedVersion;
    versionSelect.addEventListener('change', () => {
        setBibleVersion(versionSelect.value)
            .then(showBooks)
            .catch((error) => {
                console.error(error);
                subtitle.textContent = 'Não foi possível trocar a versão bíblica.';
            });
    });
    steps.book.addEventListener('click', showBooks);
    steps.chapter.addEventListener('click', showChapters);
    steps.verse.addEventListener('click', () => {
        if (selectedChapter !== null) {
            closeVerseStudy();
            versesPanel.hidden = false;
            setStep('verse');
        }
    });
    steps.notes.addEventListener('click', showNotes);
    window.addEventListener('adoraplay:login', () => {
        loadRemoteStudies().catch((error) => console.warn('Não foi possível carregar as anotações:', error.message));
    });
    window.addEventListener('adoraplay:logout', () => {
        saveStudies({});
        updateVerseStyles();
        if (!notesPanel.hidden) renderNotes();
    });
    renderBooks();
}());
