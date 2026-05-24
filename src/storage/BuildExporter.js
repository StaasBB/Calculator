export class BuildExporter {
    /**
     * ЭКСТРЕМАЛЬНОЕ СЖАТИЕ: превращает текст '0101' в настоящие компактные байты
     */
    static generateGlobalHash(allTrees) {
        // 1. Собираем одну длинную сплошную строку из '0' и '1'
        const bitsStr = allTrees.map(tree => {
            return tree.nodes.map(n => n.isActive ? '1' : '0').join('');
        }).join('');

        // 2. Вычисляем, сколько байт нам понадобится (округляем в большую сторону)
        const byteLength = Math.ceil(bitsStr.length / 8);
        const bytes = new Uint8Array(byteLength);

        // 3. Упаковываем каждые 8 перков (бит) в 1 число (байт)
        for (let i = 0; i < bitsStr.length; i++) {
            if (bitsStr[i] === '1') {
                const byteIndex = Math.floor(i / 8);
                const bitIndex = 7 - (i % 8); // Записываем слева направо
                bytes[byteIndex] |= (1 << bitIndex);
            }
        }

        // 4. Переводим бинарные байты в чистую компактную строку Base64
        const binaryString = String.fromCharCode.apply(null, bytes);
        return btoa(binaryString)
            .replace(/\+/g, '-')   // Делаем ссылку безопасной для URL
            .replace(/\//g, '_')
            .replace(/=+$/, '');   // Убираем уродливые знаки '=' на конце
    }

    /**
     * РАСПАКОВКА: читает компактные байты и восстанавливает перки
     */
    static applyGlobalHash(allTrees, safeBase64Hash) {
        if (!safeBase64Hash) return false;
        try {
            // Восстанавливаем стандартные символы Base64 перед декодированием
            let base64 = safeBase64Hash.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';

            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Восстанавливаем исходную строку из '0' и '1'
            let bitsStr = '';
            for (let i = 0; i < bytes.length; i++) {
                const byte = bytes[i];
                for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
                    bitsStr += ((byte >> bitIndex) & 1) ? '1' : '0';
                }
            }

            // Нарезаем биты обратно по деревьям
            let pointer = 0;
            allTrees.forEach((tree) => {
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
            console.error("Ошибка чтения хэша билда:", e);
            return false;
        }
    }

    /**
     * Генерирует ссылку для копирования
     */
    static getShareUrl(allTrees) {
        const hash = this.generateGlobalHash(allTrees);
        const currentUrl = new URL(window.location.origin + window.location.pathname);
        currentUrl.searchParams.set('build', hash);
        return currentUrl.toString();
    }

    /**
     * Достает хэш из адресной строки
     */
    static getHashFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('build');
    }
}
