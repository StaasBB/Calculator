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
     * ИСПРАВЛЕНО: Активирует ВСЕ ветки, если ни одна не вкачана.
     * Если хоть одна уже активна — активирует только сам перк.
     */
    static activateChain(tree, node) {
        if (node.isActive) return;

        if (node.requires && node.requires.length > 0) {
            // Проверяем, есть ли среди родителей хотя бы один уже АКТИВНЫЙ перк
            const hasAnyActiveParent = node.requires.some(reqId => {
                const parent = tree.getNodeById(reqId);
                return parent ? parent.isActive : false;
            });

            // Если НИ ОДИН из родителей не активирован — рекурсивно запускаем прокачку ВСЕХ веток (всех родителей)
            if (!hasAnyActiveParent) {
                node.requires.forEach(reqId => {
                    const parent = tree.getNodeById(reqId);
                    if (parent && !parent.isActive) {
                        this.activateChain(tree, parent);
                    }
                });
            }
            // Если хотя бы один родитель БЫЛ активен, мы пропускаем блок выше,
            // ветка считается подведенной, и другие параллельные пути не трогаем!
        }

        // Включаем текущий перк
        node.isActive = true;
    }

    /**
     * Умная деактивация с учетом развилок и альтернативных путей (сверху вниз)
     */
    static deactivateChain(tree, startNode) {
        startNode.isActive = false;

        let stateChanged = true;
        while (stateChanged) {
            stateChanged = false;

            tree.nodes.forEach(node => {
                if (node.isActive && node.requires && node.requires.length > 0) {
                    
                    const hasAlternativePath = node.requires.some(reqId => {
                        const parent = tree.getNodeById(reqId);
                        return parent ? parent.isActive : false;
                    });

                    if (!hasAlternativePath) {
                        node.isActive = false;
                        stateChanged = true; 
                    }
                }
            });
        }
    }

    /**
     * Проверяет валидность дерева (например, после загрузки хэша)
     */
    static validate(tree) {
        let stateChanged = true;
        while (stateChanged) {
            stateChanged = false;
            tree.nodes.forEach(node => {
                if (node.isActive && node.requires && node.requires.length > 0) {
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
