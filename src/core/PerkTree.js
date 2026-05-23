import { PerkNode } from './PerkNode.js';

export class PerkTree {
    constructor(treeData) {
        this.treeId = treeData.id;
        this.title = treeData.title;
        this.nodes = treeData.nodes.map(data => new PerkNode(data));
        
        this.classType = treeData.classType || "extra";
        // ДОБАВЛЕНО: Считываем имя темы ("red", "blue" и т.д.)
        this.themeColor = treeData.themeColor || "yellow"; 
        
        this.hitBox = null; 
    }

    getNodeById(id) {
        return this.nodes.find(n => n.id === id);
    }
}
