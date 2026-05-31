export class BuildExporter {
    static generateGlobalHash(allTrees) {
        const bitsStr = allTrees.map(tree => {
            return tree.nodes.map(n => n.isActive ? '1' : '0').join('');
        }).join('');

        const byteLength = Math.ceil(bitsStr.length / 8);
        const bytes = new Uint8Array(byteLength);

        for (let i = 0; i < bitsStr.length; i++) {
            if (bitsStr[i] === '1') {
                const byteIndex = Math.floor(i / 8);
                const bitIndex = 7 - (i % 8);
                bytes[byteIndex] |= (1 << bitIndex);
            }
        }

        const binaryString = String.fromCharCode.apply(null, bytes);
        return btoa(binaryString)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    static applyGlobalHash(allTrees, safeBase64Hash) {
        if (!safeBase64Hash) return false;

        try {
            let base64 = safeBase64Hash.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';

            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            let bitsStr = '';

            for (let i = 0; i < bytes.length; i++) {
                const byte = bytes[i];
                for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
                    bitsStr += ((byte >> bitIndex) & 1) ? '1' : '0';
                }
            }

            let pointer = 0;

            allTrees.forEach(tree => {
                const totalNodes = tree.nodes.length;
                const treeHash = bitsStr.substring(pointer, pointer + totalNodes);
                pointer += totalNodes;

                if (!treeHash || treeHash.length !== totalNodes) return;

                tree.nodes.forEach((node, nodeIndex) => {
                    node.isActive = treeHash[nodeIndex] === '1';
                });
            });

            return true;
        } catch (e) {
            console.error('Ошибка чтения хэша билда:', e);
            return false;
        }
    }

    static encodeNote(note) {
        if (!note || !note.trim()) return null;

        return btoa(unescape(encodeURIComponent(note)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    static decodeNote(encodedNote) {
        if (!encodedNote) return '';

        try {
            let base64 = encodedNote.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';

            return decodeURIComponent(escape(atob(base64)));
        } catch (e) {
            console.error('Ошибка чтения заметки из ссылки:', e);
            return '';
        }
    }

    static getShareUrl(allTrees, note = '') {
        const hash = this.generateGlobalHash(allTrees);
        const currentUrl = new URL(window.location.origin + window.location.pathname);

        currentUrl.searchParams.set('build', hash);

        const encodedNote = this.encodeNote(note);
        if (encodedNote) {
            currentUrl.searchParams.set('note', encodedNote);
        }

        return currentUrl.toString();
    }

    static getHashFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('build');
    }

    static getNoteFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return this.decodeNote(urlParams.get('note'));
    }
}