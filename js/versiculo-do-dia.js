(function () {
    const card = document.getElementById('versiculoDoDia');
    const reference = document.getElementById('versiculoDoDiaReferencia');
    const verseText = document.getElementById('versiculoDoDiaTexto');
    const reflection = document.getElementById('versiculoDoDiaReflita');
    const shareButton = document.getElementById('compartilharVersiculoDoDia');

    function getDayOfYear() {
        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 0);
        return Math.floor((today - yearStart) / 86400000);
    }

    function getDailyEntry(entries, dayOfYear) {
        const keys = Object.keys(entries).sort((first, second) => Number(first) - Number(second));
        return entries[keys[(dayOfYear - 1) % keys.length]];
    }

    async function loadDailyVerse() {
        try {
            const response = await fetch('diarios/diario.json');
            if (!response.ok) throw new Error('Não foi possível carregar o diário.');
            const dayOfYear = getDayOfYear();
            const entry = getDailyEntry(await response.json(), dayOfYear);
            if (!entry) return;

            reference.textContent = entry.referencia;
            verseText.textContent = entry.versiculo;
            reflection.textContent = entry.reflita;
            card.hidden = false;
            shareButton.addEventListener('click', () => {
                if (!window.bibleImageShare?.open) {
                    window.alert('O compartilhamento não está disponível agora. Tente novamente em instantes.');
                    return;
                }

                window.bibleImageShare.open({
                    reference: entry.referencia,
                    text: entry.versiculo,
                    reflection: entry.reflita,
                    footer: 'AdoraPlay',
                    verses: [1],
                    bookAbbrev: 'diario',
                    chapter: dayOfYear,
                    verse: 1
                });
            });
        } catch (error) {
            console.warn('Não foi possível carregar o versículo do dia:', error);
        }
    }

    loadDailyVerse();
}());
