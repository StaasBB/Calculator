export class DependencyChecker {
    /**
     * Обрабатывает клик по перку с учетом зависимостей
     */
    static handleNodeClick(tree, node) {
        if (!node.isActive) {
            this.activateChain(tree, node);
        } else {
            this.deactivateChain(tree, node);
        }
    }

    /**
     * Рекурсивно активирует перк и всех его необходимых родителей (снизу вверх)
     */
    static activateChain(tree, node) {
        node.isActive = true;
        node.requires.forEach(reqId => {
            const parent = tree.getNodeById(reqId);
            if (parent && !parent.isActive) {
                this.activateChain(tree, parent);
            }
        });
    }

    /**
     * ИСПРАВЛЕНО: Умная деактивация с учетом развилок и альтернативных путей (сверху вниз)
     */
    static deactivateChain(tree, startNode) {
        // 1. Снимаем активность с текущего перка
        startNode.isActive = false;

        // 2. Запускаем цикл валидации для всех перков дерева, пока система не придет в стабильное состояние.
        // Это необходимо, так как отключение одного перка может по цепочке заблокировать целую подветку дальше.
        let stateChanged = true;
        
        while (stateChanged) {
            stateChanged = false;

            tree.nodes.forEach(node => {
                // Нас интересуют только те перки, которые сейчас вкачаны и у которых ЕСТЬ требования (не корни)
                if (node.isActive && node.requires.length > 0) {
                    
                    // ИСПРАВЛЕНО: Проверяем, есть ли хоть ОДИН активный предок у этого перка
                    const hasAlternativePath = node.requires.some(reqId => {
                        const parent = tree.getNodeById(reqId);
                        return parent ? parent.isActive : false;
                    });

                    // Если все пути к перку ведут через отключенные таланты — отключаем его
                    if (!hasAlternativePath) {
                        node.isActive = false;
                        stateChanged = true; // Сигнализируем, что нужно проверить дерево еще раз для следующих потомков
                    }
                }
            });
        }
    }

    /**
     * Проверяет валидность дерева (например, после загрузки хэша или сэйва профиля)
     */
    static validate(tree) {
        let stateChanged = true;
        while (stateChanged) {
            stateChanged = false;
            tree.nodes.forEach(node => {
                if (node.isActive && node.requires.length > 0) {
                    const hasValidParent = node.requires.some(reqId => {
                        const parent = tree.getNodeById(reqId);
                        return parent ? parent.isActive : false;
                    });
                    
                    if (!hasValidParent) {
                        node.isActive = false;
                        stateChanged = true;
                    }
                }
            });
        }
    }
}
