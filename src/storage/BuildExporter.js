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
     * ИСПРАВЛЕНО: Безопасное обновление URL без перезагрузки страницы и поломки CSS путей
     */
    static updateUrl(allTrees) {
        const hash = this.generateGlobalHash(allTrees);
        
        // Создаем чистый объект URL на основе текущего адреса в браузере
        const currentUrl = new URL(window.location.href);
        
        // Меняем/добавляем только параметр ?build=...
        currentUrl.searchParams.set('build', hash);
        
        // Обновляем адресную строку безопасным методом, который не трогает относительные пути стилей
        window.history.replaceState({ path: currentUrl.toString() }, '', currentUrl.toString());
    }


    /**
     * Достает хэш из адресной строки при открытии сайта
     */
    static getHashFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('build');
    }
}
