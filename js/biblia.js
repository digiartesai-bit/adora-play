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
    const previousChapterButton = document.getElementById('capituloAnterior');
    const nextChapterButton = document.getElementById('capituloSeguinte');
    const scrollTopButton = document.getElementById('voltarTopoBiblia');
    const quickActions = document.getElementById('acoesRapidasBiblia');
    const quickNoteEditor = document.getElementById('editorAnotacaoBiblia');
    const quickNoteInput = document.getElementById('anotacaoRapidaBiblia');
    const quickCompareButton = document.getElementById('compararSelecaoBiblia');
    const quickShareButton = document.getElementById('compartilharSelecaoBiblia');
    const quickNoteButton = document.getElementById('anotarSelecaoBiblia');
    const saveNoteButton = document.getElementById('salvarAnotacaoBiblia');
    const quickMarkButton = document.getElementById('marcarSelecaoBiblia');
    const clearSelectionButton = document.getElementById('limparSelecaoBiblia');
    const clearSelectionMobileButton = document.getElementById('limparSelecaoBibliaMobile');
    const selectedVerseCount = document.getElementById('quantidadeSelecaoBiblia');
    const versionSelect = document.getElementById('seletorVersaoBiblia');
    const savedStudiesKey = 'adoraPlayBibliaEstudos';
    const apiUrl = 'https://adoraplay-api.digiartesai.workers.dev';
    const shareLimits = { verses: 3, words: 90 };
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
    let editingStudyId = null;
    const selectedVerseIndexes = new Set();
    let selectedVersion = 'nvi';
    const versionCache = new Map();
    const bookFileNameOverrides = {
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
        return bookFileNameOverrides[version]?.[normalizedName] || normalizedName;
    }

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
        return `${selectedVersion}:${selectedBook.abbrev}:${chapter.chapter}:${verse.verse}`;
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

    function getSelectedVerseDetails() {
        const chapter = selectedBookData.chapters[selectedChapter];
        const verseIndexes = [...selectedVerseIndexes].sort((first, second) => first - second);
        const verses = verseIndexes.map(index => chapter.verses[index].verse);
        return {
            key: `${selectedVersion}:${selectedBook.abbrev}:${chapter.chapter}:${verses.join(',')}`,
            reference: `${selectedBook.name} ${chapter.chapter}:${verses.join(', ')}`,
            text: verseIndexes.map(index => chapter.verses[index].text).join(' '),
            bookAbbrev: selectedBook.abbrev,
            bookName: selectedBook.name,
            chapter: chapter.chapter,
            verses,
            version: selectedVersion
        };
    }

    function getStudyForSelection(details) {
        const studies = getSavedStudies();
        const study = studies[`${details.version}:${details.bookAbbrev}:${details.chapter}:${details.verses[0]}`];
        return study?.verses?.length === details.verses.length
            && study.verses.every((verse, index) => verse === details.verses[index])
            ? study
            : null;
    }

    function clearSelectedVerses() {
        selectedVerse = null;
        editingStudyId = null;
        selectedVerseIndexes.clear();
    }

    function getStudyBeingEdited(details) {
        const exactStudy = getStudyForSelection(details);
        if (exactStudy?.id) return exactStudy;
        return Object.values(getSavedStudies()).find((study) => study.id === editingStudyId) || null;
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
            let groupedVerses = remoteStudy.versiculos;
            if (typeof groupedVerses === 'string') {
                try {
                    groupedVerses = JSON.parse(groupedVerses);
                } catch {
                    groupedVerses = null;
                }
            }
            const verses = Array.isArray(groupedVerses)
                ? groupedVerses.map(Number)
                : [Number(remoteStudy.versiculo)];
            if (!book || !Number.isInteger(chapter) || !verses.length || verses.some(verse => !Number.isInteger(verse))) return;

            const version = remoteStudy.versao || 'acf';
            const study = {
                id: remoteStudy.id,
                key: `${version}:${book.abbrev}:${chapter}:${verses.join(',')}`,
                reference: `${book.name} ${chapter}:${verses.join(', ')}`,
                text: remoteStudy.texto || '',
                bookAbbrev: book.abbrev,
                chapter,
                verse: verses[0],
                verses,
                version,
                highlighted: true,
                note: remoteStudy.texto || '',
                updatedAt: remoteStudy.criado_em
            };
            verses.forEach((verse) => {
                studies[`${version}:${book.abbrev}:${chapter}:${verse}`] = study;
            });
        });

        saveStudies(studies);
        updateVerseStyles();
        if (!notesPanel.hidden) renderNotes();
        updateQuickActions();
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

    function closeVerseStudy(clearSelection = false) {
        if (!clearSelection) return;
        clearSelectedVerses();
        versesGrid.querySelectorAll('.bible-number-button').forEach((button) => {
            button.classList.remove('is-selected');
        });
        text.querySelectorAll('.bible-verse').forEach((verse) => {
            verse.classList.remove('is-selected');
        });
        quickActions.hidden = true;
        quickNoteEditor.hidden = true;
        quickNoteInput.value = '';
    }

    function updateQuickActions() {
        if (!selectedVerseIndexes.size) {
            quickActions.hidden = true;
            return;
        }
        const details = getSelectedVerseDetails();
        const study = getStudyBeingEdited(details);
        quickActions.hidden = false;
        selectedVerseCount.textContent = `${details.verses.length} sel`;
        quickMarkButton.classList.toggle('is-marked', Boolean(study?.highlighted));
        quickMarkButton.textContent = study?.highlighted ? 'Desmarcar' : 'Marcar';
        quickNoteButton.textContent = study?.note ? 'Editar anotação' : 'Anotar';
        if (!quickNoteEditor.hidden) {
            quickNoteInput.value = study?.note || '';
            saveNoteButton.textContent = study?.note ? 'Atualizar anotação' : 'Salvar anotação';
        }
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

    async function shareVerseImage(details, shareButton) {
        const wordCount = details.text.trim().split(/\s+/).filter(Boolean).length;
        if (details.verses?.length > shareLimits.verses || wordCount > shareLimits.words) {
            window.alert(`A imagem pode conter até ${shareLimits.verses} versículos e ${shareLimits.words} palavras.`);
            return;
        }

        try {
            shareButton.disabled = true;
            window.bibleImageShare.open(details);
        } catch (error) {
            console.warn('Não foi possível abrir o compartilhamento:', error);
            window.alert('Não foi possível abrir o compartilhamento da imagem.');
        } finally {
            shareButton.disabled = false;
        }
    }

    function formatAbbreviation(abbreviation) {
        if (abbreviation === 'atos') return 'At';
        const match = abbreviation.match(/^(\d*)(.*)$/);
        return `${match[1]}${match[2].charAt(0).toUpperCase()}${match[2].slice(1)}`;
    }

    async function loadBookData(version, book) {
        const cacheKey = `${version}:${book.abbrev}`;
        if (versionCache.has(cacheKey)) return versionCache.get(cacheKey);
        const response = await fetch(`biblias/${version}/${getBookFileName(version, book.name)}.json`);
        if (!response.ok) throw new Error(`Não foi possível carregar ${book.name} na versão ${version.toUpperCase()}.`);
        const data = await response.json();
        if (!Array.isArray(data.books) || data.books.length !== 1 || data.books[0].abbrev !== book.abbrev) {
            throw new Error(`O arquivo de ${book.name} possui formato inválido.`);
        }
        versionCache.set(cacheKey, data.books[0]);
        return data.books[0];
    }

    function setBibleVersion(version) {
        selectedVersion = version;
        versionSelect.value = version;
        selectedBook = null;
        selectedBookData = null;
        selectedChapter = null;
        clearSelectedVerses();
        return Promise.resolve();
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
            selectedBookData = await loadBookData(selectedVersion, book);
            selectedBook = book;
            selectedChapter = null;
            clearSelectedVerses();
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
        clearSelectedVerses();
        closeVerseStudy();
        const chapter = selectedBookData.chapters[chapterIndex];
        const verses = chapter.verses;
        versesTitle.textContent = `${selectedBook.name} ${chapter.chapter}: versículos`;
        versesGrid.replaceChildren();
        verses.forEach((verse, index) => {
            versesGrid.appendChild(createButton('bible-number-button', String(verse.verse), () => navigateToVerse(index)));
        });
        renderChapter(verses);
        updateChapterNavigation();
        chaptersPanel.hidden = true;
        versesPanel.hidden = false;
        notesPanel.hidden = true;
        subtitle.textContent = `${selectedVersion.toUpperCase()}: ${selectedBook.name} ${chapter.chapter} possui ${verses.length} versículos.`;
        setStep('verse');
        window.scrollTo({ top: versesPanel.offsetTop - 16, behavior: 'smooth' });
    }

    function updateChapterNavigation() {
        const currentBookIndex = books.findIndex(book => book.abbrev === selectedBook.abbrev);
        const isFirstChapter = selectedChapter === 0;
        const isLastChapter = selectedChapter === selectedBookData.chapters.length - 1;
        previousChapterButton.hidden = isFirstChapter && currentBookIndex === 0;
        nextChapterButton.hidden = isLastChapter && currentBookIndex === books.length - 1;
        const previousBook = books[currentBookIndex - 1];
        const nextBook = books[currentBookIndex + 1];
        previousChapterButton.textContent = isFirstChapter
            ? (previousBook ? `${previousBook.name} (último capítulo)` : '')
            : `Capítulo ${selectedBookData.chapters[selectedChapter - 1].chapter}`;
        nextChapterButton.textContent = isLastChapter
            ? (nextBook ? `${nextBook.name} (capítulo 1)` : '')
            : `Capítulo ${selectedBookData.chapters[selectedChapter + 1].chapter}`;
    }

    async function navigateChapter(direction) {
        const nextChapterIndex = selectedChapter + direction;
        if (nextChapterIndex >= 0 && nextChapterIndex < selectedBookData.chapters.length) {
            selectChapter(nextChapterIndex);
            return;
        }

        const currentBookIndex = books.findIndex(book => book.abbrev === selectedBook.abbrev);
        const adjacentBook = books[currentBookIndex + direction];
        if (!adjacentBook) return;
        await loadBook(adjacentBook);
        selectChapter(direction > 0 ? 0 : selectedBookData.chapters.length - 1);
    }

    function updateScrollTopButton() {
        const hasVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
        const hasScrolledPastReading = window.scrollY > versesPanel.offsetTop;
        scrollTopButton.hidden = versesPanel.hidden || !quickActions.hidden || !hasVerticalScroll || !hasScrolledPastReading;
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
            verseElement.addEventListener('click', () => selectVerse(index, !selectedVerseIndexes.has(index)));
            text.appendChild(verseElement);
        });
        updateVerseStyles();
    }

    function selectVerse(verseIndex, isSelected) {
        selectedVerse = verseIndex;
        if (isSelected) selectedVerseIndexes.add(verseIndex);
        else selectedVerseIndexes.delete(verseIndex);
        if (selectedVerseIndexes.size) {
            const exactStudy = getStudyForSelection(getSelectedVerseDetails());
            if (exactStudy?.id) editingStudyId = exactStudy.id;
        }
        versesGrid.querySelectorAll('.bible-number-button').forEach((button, index) => {
            button.classList.toggle('is-selected', selectedVerseIndexes.has(index));
        });
        text.querySelectorAll('.bible-verse').forEach((verse, index) => {
            verse.classList.toggle('is-selected', selectedVerseIndexes.has(index));
        });
        updateQuickActions();
        document.getElementById(`versiculo-${selectedBookData.chapters[selectedChapter].verses[verseIndex].verse}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function navigateToVerse(verseIndex) {
        clearSelectedVerses();
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
        const study = getStudyForSelection(details);
        try {
            markButton.disabled = true;
            if (study?.id) {
                await requestBibleApi('/api/anotacoes', 'DELETE', { id: study.id });
            } else {
                await sendToBibleApi('/api/anotacoes', {
                    livro: selectedBook.name,
                    capitulo: details.chapter,
                    versiculo: details.verses[0],
                    versiculos: details.verses,
                    versao: selectedVersion,
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

        const study = getStudyBeingEdited(details);
        if (!study?.id) {
            window.alert('Marque o versículo antes de salvar uma anotação.');
            return;
        }

        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando...';
            await requestBibleApi('/api/anotacoes', 'PUT', {
                id: study.id,
                livro: selectedBook.name,
                capitulo: details.chapter,
                versiculo: details.verses[0],
                versiculos: details.verses,
                versao: selectedVersion,
                texto: noteText
            });
            await loadRemoteStudies();
            quickNoteEditor.hidden = true;
        } catch (error) {
            console.warn('Não foi possível salvar a anotação:', error.message);
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar anotação';
            window.alert(`Não foi possível salvar a anotação no Cloudflare: ${error.message}`);
        }
    }

    async function deleteVerseStudy(details) {
        const study = getStudyForSelection(details);
        if (!study?.id || !study.note) return;

        try {
            await requestBibleApi('/api/anotacoes', 'PUT', { id: study.id, texto: '' });
            await loadRemoteStudies();
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
        scrollTopButton.hidden = true;
        notesPanel.hidden = true;
        closeVerseStudy(true);
        subtitle.textContent = `${selectedVersion.toUpperCase()} selecionada. Escolha um livro para começar a leitura.`;
        setStep('book');
    }

    function showChapters() {
        if (!selectedBookData) return;
        chaptersPanel.hidden = false;
        versesPanel.hidden = true;
        scrollTopButton.hidden = true;
        notesPanel.hidden = true;
        closeVerseStudy(true);
        subtitle.textContent = `Escolha um capítulo de ${selectedBook.name}.`;
        setStep('chapter');
    }

    function showNotes() {
        closeVerseStudy(true);
        document.getElementById('painelLivros').hidden = true;
        chaptersPanel.hidden = true;
        versesPanel.hidden = true;
        scrollTopButton.hidden = true;
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
    quickCompareButton.addEventListener('click', () => window.bibleComparison.open(getSelectedVerseDetails()));
    quickShareButton.addEventListener('click', () => shareVerseImage(getSelectedVerseDetails(), quickShareButton));
    quickMarkButton.addEventListener('click', () => toggleVerseHighlight(getSelectedVerseDetails(), quickMarkButton));
    quickNoteButton.addEventListener('click', () => {
        if (quickNoteEditor.hidden) {
            const study = getStudyBeingEdited(getSelectedVerseDetails());
            quickNoteEditor.hidden = false;
            quickNoteInput.value = study?.note || '';
            saveNoteButton.textContent = study?.note ? 'Atualizar anotação' : 'Salvar anotação';
            updateQuickActions();
            quickNoteInput.focus();
        }
    });
    saveNoteButton.addEventListener('click', () => saveVerseStudy(getSelectedVerseDetails(), quickNoteInput.value, saveNoteButton));
    clearSelectionButton.addEventListener('click', () => closeVerseStudy(true));
    clearSelectionMobileButton.addEventListener('click', () => closeVerseStudy(true));
    previousChapterButton.addEventListener('click', () => navigateChapter(-1));
    nextChapterButton.addEventListener('click', () => navigateChapter(1));
    scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', updateScrollTopButton, { passive: true });
    window.addEventListener('resize', updateScrollTopButton);
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
