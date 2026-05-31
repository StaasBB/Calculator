export class BuildSaver {
    static STORAGE_KEY = 'rfab_perk_calculator_build';

    static clearUrlBuildParams() {
        const url = new URL(window.location.href);

        if (!url.searchParams.has('build') && !url.searchParams.has('note')) {
            return;
        }

        url.searchParams.delete('build');
        url.searchParams.delete('note');

        const cleanUrl =
            url.pathname +
            (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') +
            url.hash;

        window.history.replaceState({}, '', cleanUrl);
    }

    static saveToLocalStorage(allTrees) {
        const buildData = allTrees.map(tree => ({
            id: tree.treeId,
            activeNodes: tree.nodes.filter(n => n.isActive).map(n => n.id)
        }));

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buildData));

        // ВАЖНО: после обновления текущего автосейва URL больше не должен перебивать LocalStorage
        this.clearUrlBuildParams();
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