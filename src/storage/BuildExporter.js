export class BuildExporter {
    /**
     * Генерирует единый хэш для абсолютно всех веток калькулятора
     */
    static generateGlobalHash(allTrees) {
        const rawString = allTrees.map(tree => {
            return tree.nodes.map(n => n.isActive ? '1' : '0').join('');
        }).join('-'); // Разделяем ветки дефисом
        
        // Кодируем в Base64, чтобы ссылка выглядела аккуратно
        return btoa(rawString);
    }

    /**
     * Применяет глобальный хэш к массиву веток
     */
    static applyGlobalHash(allTrees, base64Hash) {
        if (!base64Hash) return false;
        try {
            const rawString = atob(base64Hash);
            const treeHashes = rawString.split('-');

            allTrees.forEach((tree, index) => {
                const hash = treeHashes[index];
                if (!hash || hash.length !== tree.nodes.length) return;
                
                tree.nodes.forEach((node, nodeIndex) => {
                    node.isActive = hash[nodeIndex] === '1';
                });
            });
            return true;
        } catch (e) {
            console.error("Ошибка чтения хэша билда:", e);
            return false;
        }
    }

    /**
     * Обновляет URL в строке браузера без перезагрузки страницы
     */
    static updateUrl(allTrees) {
        const hash = this.generateGlobalHash(allTrees);
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?build=${hash}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    /**
     * Достает хэш из адресной строки при открытии сайта
     */
    static getHashFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('build');
    }
}
