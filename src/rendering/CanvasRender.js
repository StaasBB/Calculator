import { TooltipSystem } from './TooltipSystem.js';
import { UIManager } from './UIManager.js';

export class CanvasRender {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.sidebarWidth = 290; 
        
        this.tooltipSystem = new TooltipSystem(this.ctx);
        this.uiManager = new UIManager(this.ctx, this.sidebarWidth);
    }

    /**
     * Позволяет динамически вытащить HEX/RGB цвет из :root в CSS
     */
    getColorFromCSS(variableName) {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || "#555";
    }

    render(activeTree, allTrees) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Получаем сумму очков
        const totalPoints = allTrees.reduce((sum, t) => sum + t.nodes.filter(n => n.isActive).length, 0);

        // 1. Отрисовка Сайдбара (UIManager внутри сам считает цвета кнопок через глобальную функцию)
        this.uiManager.renderSidebar(allTrees, activeTree, totalPoints, this.getColorFromCSS.bind(this));

        // 2. Рисуем фон центрального игрового окна
        this.ctx.save();
        this.ctx.fillStyle = "rgba(12, 12, 14, 0.9)";
        this.ctx.fillRect(this.sidebarWidth, 0, this.canvas.width - this.sidebarWidth, this.canvas.height);
        this.ctx.restore();

        // 3. Рисуем дерево
        this.ctx.save();
        this.ctx.translate(this.sidebarWidth, 0); 
        if (activeTree) {
            this.renderTree(activeTree); 
        }
        this.ctx.restore();

        // 4. Тултипы поверх всего холста
        this.tooltipSystem.render();
    }

    renderTree(activeTree) {
        // Получаем основной и блеклый цвет из CSS для текущей ветки
        const mainColor = this.getColorFromCSS(`--${activeTree.themeColor}`);
        const lightColor = this.getColorFromCSS(`--light-${activeTree.themeColor}`);

        this.ctx.save();
        // Красивое название в фоне (большая тень)
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        this.ctx.font = "bold 88px 'Segoe UI', Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(activeTree.title, 40, 90); 

        // Основной заголовок
        this.ctx.font = "bold 24px 'Segoe UI', Arial";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(activeTree.title, 40, 45);

        // 3. ДИНАМИЧЕСКИЙ РАСЧЕТ ХАРАКТЕРИСТИК ВЕТКИ
        const activeNodes = activeTree.nodes.filter(n => n.isActive);
        const activeCount = activeNodes.length; 
        
        let maxSkillRequired = 0;
        activeNodes.forEach(node => {
            const nodeLevel = Number(node.levelReq) || 0;
            if (nodeLevel > maxSkillRequired) {
                maxSkillRequired = nodeLevel;
            }
        });

        // ИСПРАВЛЕНО: Меняем слово "Навык" на "Уровень" для дополнительных веток (classType === "extra")
        const labelPrefix = activeTree.classType === "extra" ? "Уровень" : "Навык";

        const statusText = maxSkillRequired > 0 
            ? `${labelPrefix} ${maxSkillRequired} | Перков ${activeCount}` 
            : `Перков ${activeCount}`;

        const titleWidth = this.ctx.measureText(activeTree.title).width;

        this.ctx.font = "14px 'Segoe UI', Arial";
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        this.ctx.fillText(statusText, 40 + titleWidth + 20, 48);
        this.ctx.restore();

        // ШАГ 1: Рисуем линии (нижний слой)
        activeTree.nodes.forEach(node => {
            const { x, y } = node;
            node.requires.forEach(reqId => {
                const parent = activeTree.getNodeById(reqId);
                if (parent) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(parent.x, parent.y);
                    
                    // ИСПРАВЛЕНО: Линия горит ярким цветом темы только если активны И родитель, И потомок!
                    const isLineActive = node.isActive && parent.isActive;
                    
                    this.ctx.strokeStyle = isLineActive ? mainColor : "#222226";
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                }
            });
        });

        // ШАГ 2: Рисуем кружки и тексты (верхний слой)
        activeTree.nodes.forEach(node => {
            const { x, y } = node;

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(x, y, 14, 0, Math.PI * 2);
            this.ctx.fillStyle = node.isActive ? mainColor : "#16161a";
            this.ctx.fill();
            this.ctx.strokeStyle = node.isActive ? "#ffffff" : mainColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.fillStyle = node.isActive ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
            this.ctx.font = "12px 'Segoe UI', Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(node.name, x, y + 28);
            this.ctx.restore();

            node.hitBox = { x: x - 14, y: y - 14, w: 28, h: 28 };
        });
    }
}
