export class NotesManager {
    constructor(onStateChange) {
        this.onStateChange = onStateChange;
        this.STORAGE_KEY = 'rfab_current_build_note';

        this.currentSlotId = null;
        this.currentNote = localStorage.getItem(this.STORAGE_KEY) || '';
        this.isOpen = false;

        this.initDOM();
    }

    initDOM() {
        this.panel = document.createElement('div');
        this.panel.className = 'notes-panel';

        this.textarea = document.createElement('textarea');
        this.textarea.className = 'notes-textarea';
        this.textarea.placeholder = 'Заметки к билду...';
        this.textarea.value = this.currentNote;

        this.panel.appendChild(this.textarea);

        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer && canvasContainer.parentNode) {
            canvasContainer.parentNode.insertBefore(this.panel, canvasContainer.nextSibling);
        } else {
            document.body.appendChild(this.panel);
        }

        this.textarea.addEventListener('input', () => {
            this.currentNote = this.textarea.value;
            this.saveCurrentNote();
            this.autoResize();
            this.onStateChange();
        });

        window.addEventListener('resize', () => {
            if (this.isOpen) this.autoResize();
        });
    }

    setSlot(slotId, note = '') {
        this.currentSlotId = slotId;
        this.currentNote = note || '';

        this.textarea.value = this.currentNote;
        this.saveCurrentNote();
        this.autoResize();
        this.onStateChange();
    }

    setExternalNote(note = '') {
        this.currentSlotId = null;
        this.currentNote = note || '';

        this.textarea.value = this.currentNote;
        this.saveCurrentNote();
        this.autoResize();
        this.onStateChange();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.classList.toggle('open', this.isOpen);

        if (this.isOpen) {
            this.autoResize();
            this.textarea.focus();
        }

        this.onStateChange();
    }

    hasNote() {
        return this.currentNote.trim().length > 0;
    }

    getNote() {
        return this.currentNote || '';
    }

    saveCurrentNote() {
        if (this.currentNote.trim()) {
            localStorage.setItem(this.STORAGE_KEY, this.currentNote);
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }

        const url = new URL(window.location.href);

        if (url.searchParams.has('build') || url.searchParams.has('note')) {
            url.searchParams.delete('build');
            url.searchParams.delete('note');

            const cleanUrl =
                url.pathname +
                (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') +
                url.hash;

            window.history.replaceState({}, '', cleanUrl);
        }
    }

    autoResize() {
        if (!this.textarea) return;

        // Сбрасываем высоту, чтобы scrollHeight правильно посчитал
        this.textarea.style.height = 'auto';

        // Получаем ограничение из CSS
        const style = window.getComputedStyle(this.textarea);
        const maxHeight = parseInt(style.maxHeight, 10) || 120;
        const minHeight = parseInt(style.minHeight, 10) || 120;

        const wantedHeight = this.textarea.scrollHeight + 4; // немного padding

        const finalHeight = Math.max(minHeight, Math.min(wantedHeight, maxHeight));
        this.textarea.style.height = `${finalHeight}px`;

        this.textarea.style.overflowY = wantedHeight > maxHeight ? 'auto' : 'hidden';
    }
}