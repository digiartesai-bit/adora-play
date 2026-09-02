(function () {
    const backgrounds = [
        { name: 'Azul', source: 'assets/fundo_versiculo/fundo_azul.jpg' },
        { name: 'Preto', source: 'assets/fundo_versiculo/fundo_preto.jpg' },
        { name: 'Vermelho', source: 'assets/fundo_versiculo/fundo_vermelho.jpg' }
    ];

    function loadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
        });
    }

    function wrapText(context, value, maxWidth) {
        const lines = [];
        let line = '';
        String(value).trim().split(/\s+/).forEach((word) => {
            const candidate = line ? `${line} ${word}` : word;
            if (line && context.measureText(candidate).width > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        });
        if (line) lines.push(line);
        return lines;
    }

    async function drawImage(details, source) {
        const canvas = document.createElement('canvas');
        const dimensions = { width: 1200, height: 1600 };
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const context = canvas.getContext('2d');
        const padding = Math.round(dimensions.width * 0.11);
        const background = await loadImage(source);
        const scale = Math.max(dimensions.width / background.width, dimensions.height / background.height);
        const backgroundWidth = background.width * scale;
        const backgroundHeight = background.height * scale;

        context.drawImage(background, (dimensions.width - backgroundWidth) / 2, (dimensions.height - backgroundHeight) / 2, backgroundWidth, backgroundHeight);
        context.fillStyle = 'rgba(3, 19, 35, 0.34)';
        context.fillRect(0, 0, dimensions.width, dimensions.height);
        context.fillStyle = '#d4af35';
        context.fillRect(padding, padding, 12, dimensions.height - (padding * 2));

        let fontSize = 70;
        let lines = [];
        do {
            context.font = `${fontSize}px Georgia, serif`;
            lines = wrapText(context, details.text, dimensions.width - (padding * 2) - 168);
            if ((lines.length * fontSize * 1.55) <= dimensions.height * 0.48 || fontSize <= 38) break;
            fontSize -= 4;
        } while (fontSize > 38);

        const textHeight = lines.length * fontSize * 1.55;
        const textStart = Math.round((dimensions.height - textHeight) / 2);
        context.fillStyle = '#ffffff';
        context.font = `${fontSize}px Georgia, serif`;
        context.textBaseline = 'top';
        lines.forEach((line, index) => context.fillText(line, padding + 120, textStart + (index * fontSize * 1.55)));
        context.fillStyle = '#f2d778';
        context.font = '700 36px Poppins, sans-serif';
        context.fillText(details.reference, padding + 120, dimensions.height - padding - 148);
        context.fillStyle = 'rgba(255, 255, 255, 0.72)';
        context.font = '500 24px Poppins, sans-serif';
        context.fillText(`Bíblia ${details.version.toUpperCase()}  |  AdoraPlay`, padding + 120, dimensions.height - padding - 94);
        return canvas;
    }

    function closeDialog(dialog) {
        dialog.remove();
    }

    async function open(details) {
        const dialog = document.createElement('div');
        dialog.className = 'bible-share-dialog';
        const panel = document.createElement('section');
        panel.className = 'bible-share-panel';
        const heading = document.createElement('div');
        heading.className = 'bible-share-dialog-heading';
        const title = document.createElement('h3');
        title.textContent = 'Compartilhar imagem';
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'bible-inline-close';
        closeButton.textContent = '×';
        closeButton.setAttribute('aria-label', 'Fechar compartilhamento');
        closeButton.addEventListener('click', () => closeDialog(dialog));
        heading.append(title, closeButton);

        const choices = document.createElement('div');
        choices.className = 'bible-background-choices';
        const preview = document.createElement('img');
        preview.className = 'bible-share-preview';
        preview.alt = `Prévia de ${details.reference}`;
        const sendButton = document.createElement('button');
        sendButton.type = 'button';
        sendButton.className = 'bible-share-send';
        sendButton.textContent = 'Compartilhar imagem';
        let selectedBackground = backgrounds[0];
        let canvas;

        async function renderPreview() {
            choices.querySelectorAll('button').forEach((button) => {
                button.classList.toggle('is-selected', button.dataset.source === selectedBackground.source);
            });
            preview.removeAttribute('src');
            canvas = await drawImage(details, selectedBackground.source);
            preview.src = canvas.toDataURL('image/png');
        }

        backgrounds.forEach((background) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.source = background.source;
            button.title = background.name;
            const thumbnail = document.createElement('img');
            thumbnail.src = background.source;
            thumbnail.alt = background.name;
            button.appendChild(thumbnail);
            button.addEventListener('click', () => {
                selectedBackground = background;
                renderPreview().catch(() => window.alert('Não foi possível criar a prévia da imagem.'));
            });
            choices.appendChild(button);
        });

        sendButton.addEventListener('click', async () => {
            if (!canvas) return;
            sendButton.disabled = true;
            const data = canvas.toDataURL('image/png');
            const bytes = Uint8Array.from(atob(data.split(',')[1]), character => character.charCodeAt(0));
            const verseReference = details.verses?.join('-') || details.verse;
            const file = new File([bytes], `versiculo-${details.bookAbbrev}-${details.chapter}-${verseReference}.png`, { type: 'image/png' });
            try {
                if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file] });
                    closeDialog(dialog);
                    return;
                }
            } catch (error) {
                if (error.name === 'AbortError') return;
            } finally {
                sendButton.disabled = false;
            }
            const link = document.createElement('a');
            link.href = data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
        });

        panel.append(heading, choices, preview, sendButton);
        dialog.appendChild(panel);
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) closeDialog(dialog);
        });
        document.body.appendChild(dialog);
        try {
            await renderPreview();
        } catch (error) {
            closeDialog(dialog);
            window.alert('Não foi possível criar a prévia da imagem.');
        }
    }

    window.bibleImageShare = { open };
}());