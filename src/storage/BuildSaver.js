export class BuildSaver {
    static STORAGE_KEY = 'rfab_perk_calculator_build';

    static saveToLocalStorage(allTrees) {
        const buildData = allTrees.map(tree => ({
            id: tree.treeId,
            activeNodes: tree.nodes.filter(n => n.isActive).map(n => n.id)
        }));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buildData));
    }

    static loadFromLocalStorage(allTrees) {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return false;

        try {
            const savedData = JSON.parse(data);
            savedData.forEach(savedTree => {
                const tree = allTrees.find(t => t.treeId === savedTree.id);
                if (!tree) return;

                tree.nodes.forEach(node => {
                    node.isActive = savedTree.activeNodes.includes(node.id);
                });
            });
            return true;
        } catch (e) {
            console.error("Ошибка загрузки из LocalStorage", e);
            return false;
        }
    }
}
