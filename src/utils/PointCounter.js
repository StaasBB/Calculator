export class PointCounter {
    /**
     * Считает общее количество вложенных очков во всех деревьях навыков
     * @param {Array} allTrees - массив всех PerkTree объектов в приложении
     */
    static getTotalSpentPoints(allTrees) {
        let total = 0;
        allTrees.forEach(tree => {
            tree.nodes.forEach(node => {
                if (node.isActive) {
                    total += 1;
                }
            });
        });
        return total;
    }

    // Считает очки, потраченные конкретно в одной ветке
    static getTreeSpentPoints(tree) {
        return tree.nodes.filter(n => n.isActive).length;
    }
}
