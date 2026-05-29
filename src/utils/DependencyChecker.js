// Главный центр управления графом перков. Содержит все математические алгоритмы
// обхода дерева, расчета связей, массовой активации и деактивации узлов
export class DependencyChecker {
    
    // Точка входа для изменения состояния перка по клику/тапу
    static handleNodeClick(tree, node) {
        if (!node.isActive) {
            this.activateChain(tree, node);
        } else {
            this.deactivateChain(tree, node);
        }
    }

    // Активирует перк и всю вычисленную цепочку его родителей
    static activateChain(tree, node) {
        if (!tree || !node) return;

        const chainIds = this.getActivationChainIds(tree, node);
        chainIds.forEach(id => {
            const targetNode = tree.getNodeById(id);
            if (targetNode) targetNode.isActive = true;
        });
        node.isActive = true;
    }

    // Отключает перк и все зависимые от него верхние ветки
    static deactivateChain(tree, node) {
        if (!tree || !node) return;

        const chainIds = DependencyChecker.getDeactivationChainIds(tree, node);
        chainIds.forEach(id => {
            const targetNode = tree.getNodeById(id);
            if (targetNode) targetNode.isActive = false;
        });
        node.isActive = false;
    }   

    // Симулирует сброс ветки в памяти и собирает ID всех перков, которые обрушатся
    static getDeactivationChainIds(tree, startNode) {
        const originalStates = new Map();
        tree.nodes.forEach(n => originalStates.set(n.id, n.isActive));

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

        const affectedIds = [];
        tree.nodes.forEach(node => {
            if (originalStates.get(node.id) === true && node.isActive === false) {
                affectedIds.push(node.id);
            }
            node.isActive = originalStates.get(node.id);
        });

        return affectedIds;
    }

    // Рекурсивно собирает всю цепочку неактивных родителей до самого корня дерева
    static getActivationChainIds(tree, startNode, visited = new Set()) {
        if (!startNode || visited.has(startNode.id)) return [];
        visited.add(startNode.id);

        let chain = [startNode.id];

        if (startNode.requires && startNode.requires.length > 0) {
            const hasActiveParent = startNode.requires.some(reqId => {
                const p = tree.getNodeById(reqId);
                return p && p.isActive;
            });

            if (!hasActiveParent) {
                startNode.requires.forEach(reqId => {
                    const parent = tree.getNodeById(reqId);
                    if (parent && !parent.isActive) {
                        chain = chain.concat(this.getActivationChainIds(tree, parent, visited));
                    }
                });
            } else {
                startNode.requires.forEach(reqId => {
                    const parent = tree.getNodeById(reqId);
                    if (parent && parent.isActive) {
                        chain.push(parent.id);
                    }
                });
            }
        }
        return chain;
    }

    // Симулирует активацию перка в памяти и собирает ID всех узлов,
    // которые изменят свое состояние или свяжутся с этой цепочкой
    static getActivationChainIds(tree, startNode) {
        if (!tree || !startNode) return [];

        // 1. Создаем карту виртуальных состояний на основе текущего реального дерева
        const virtualStates = new Map();
        tree.nodes.forEach(n => virtualStates.set(n.id, n.isActive));

        // 2. Запускаем рекурсивную симуляцию прокачки по нашей виртуальной карте
        this._runSimulationActivate(tree, startNode.id, virtualStates);

        // 3. Собираем ID тех перков, которые в ходе симуляции перешли из false в true
        const affectedIds = [];
        tree.nodes.forEach(node => {
            const isNowActive = virtualStates.get(node.id);
            const wasOriginallyActive = node.isActive; // Реальное исходное состояние

            if (isNowActive && !wasOriginallyActive) {
                affectedIds.push(node.id);
            }
        });

        // Гарантированно добавляем сам стартовый перк в массив мигания, если он был серым
        if (!startNode.isActive && !affectedIds.includes(startNode.id)) {
            affectedIds.push(startNode.id);
        }

        // 4. ФИКС СКРЫТЫХ МОСТОВ ДЛЯ РАЗВИЛОК И АКТИВНЫХ ПРЕДКОВ
        
        // А. Мосты вверх
        tree.nodes.forEach(node => {
            if (node.isActive === true && node.requires) {
                const connectsToNewChain = node.requires.some(reqId => affectedIds.includes(reqId));
                if (connectsToNewChain && !affectedIds.includes(node.id)) {
                    affectedIds.push(node.id);
                }
            }
        });

        // Б. Мосты вниз
        // Если перк из нашей новой будущей цепочки прокачки требует родителя, который УЖЕ активен в базе,
        // мы ОБЯЗАНЫ добавить этого активного родителя в массив chainIds
        // Это заставит соединительную линию между ними мигать цветом ветки на Canvas
        tree.nodes.forEach(node => {
            if (affectedIds.includes(node.id) && node.requires) {
                node.requires.forEach(reqId => {
                    const parent = tree.getNodeById(reqId);
                    if (parent && parent.isActive === true && !affectedIds.includes(parent.id)) {
                        affectedIds.push(parent.id);
                    }
                });
            }
        });

        return affectedIds;

    }

    // ВНУТРЕННИЙ МЕТОД СИМУЛЯЦИИ: Опирается СТРОГО на переданную карту virtualStates.
    // Это позволяет рекурсии видеть реальные разрывы цепей и докачивать предков до самого старта.
    static _runSimulationActivate(tree, nodeId, virtualStates) {
        // Если в виртуальном пространстве перк уже активен выходим, этот путь уже просчитан
        if (virtualStates.get(nodeId) === true) return;

        const node = tree.getNodeById(nodeId);
        if (!node) return;

        if (node.requires && node.requires.length > 0) {
            // Проверяем, есть ли среди родителей хотя бы один перк, активный в нашей виртуальной карте
            const hasAnyActiveParent = node.requires.some(reqId => virtualStates.get(reqId) === true);

            // Если пути к старту через родителей нет рекурсивно запускаем симуляцию для ВСЕХ родителей
            if (!hasAnyActiveParent) {
                node.requires.forEach(reqId => {
                    this._runSimulationActivate(tree, reqId, virtualStates);
                });
            }
        }

        // Активируем ноду в нашей виртуальной карте
        virtualStates.set(nodeId, true);
    }

    // Проверяет валидность дерева (после загрузки сохранений)
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
