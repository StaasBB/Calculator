export class PerkNode {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.requires = data.requires || [];
        this.isActive = false;
        this.x = data.x || 0;
        this.y = data.y || 0;
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Безопасное чтение числового требования уровня навыки из JSON
        this.levelReq = typeof data.levelReq === 'number' ? data.levelReq : 0; 

        // Приведение эффектов к массиву строк
        if (Array.isArray(data.effects)) {
            this.effects = data.effects;
        } else if (typeof data.effects === 'string') {
            this.effects = data.effects ? [data.effects] : [];
        } else {
            this.effects = [];
        }
    }
}
