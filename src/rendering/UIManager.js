export class UIManager {
    constructor(ctx, sidebarWidth) {
        this.ctx = ctx;
        this.sidebarWidth = sidebarWidth;
    }

    renderSidebar(allTrees, activeTree, totalPoints, getColor) {
        const ctx = this.ctx;
        
        // 1. Исходная заливка сплошного фона сайдбара с координаты 0
        const bgGrad = ctx.createLinearGradient(0, 0, this.sidebarWidth, 0);
        bgGrad.addColorStop(0, "#111113");
        bgGrad.addColorStop(1, "#16161a");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.sidebarWidth, ctx.canvas.height);
        
        ctx.strokeStyle = "#222226";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.sidebarWidth, 0);
        ctx.lineTo(this.sidebarWidth, ctx.canvas.height);
        ctx.stroke();

        // РАСЧЕТ ИДЕАЛЬНОЙ СИММЕТРИИ И ОТСТУПОВ
        const buttonW = (this.sidebarWidth - 30) / 2; // Базовая ширина кнопки
        const buttonH = 36;                            // Высота кнопки
        const gap = 5;                                 // ИСПРАВЛЕНО: уменьшенный отступ между кнопками

        // Вычисляем, сколько места займут две кнопки вместе со своим внутренним отступом gap
        const totalGridWidth = (buttonW * 2) + gap;
        // Динамически вычисляем отступ от краев сайдбара, чтобы сетка встала строго по центру
        const sidebarPadding = (this.sidebarWidth - totalGridWidth) / 2;

        // 2. ИЗОЛИРОВАННАЯ ОТРИСОВКА СЧЕТЧИКА (Выровнен по одной оси с кнопками)
        ctx.save();
        let currentY = 20; 

        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "11px 'Segoe UI', Arial";
        ctx.fillText("ВСЕГО ПЕРКОВ:", sidebarPadding, currentY);

        ctx.fillStyle = "#f5f5f7"; 
        ctx.font = "bold 20px 'Segoe UI', Arial";
        ctx.fillText(totalPoints.toString(), sidebarPadding, currentY + 15);
        ctx.restore(); 

        // Сдвигаем Y ниже счетчика к блокам веток
        currentY += 45;

        // 3. Группируем и рисуем ветки
        const groups = {
            "magic": { name: "МАГИЯ", trees: [] },
            "warrior": { name: "ВОИН", trees: [] },
            "rogue": { name: "ВОР", trees: [] },
            "extra": { name: "ДОПОЛНИТЕЛЬНО", trees: [] }
        };

        allTrees.forEach(t => {
            if (groups[t.classType]) groups[t.classType].trees.push(t);
        });

        for (const key in groups) {
            const group = groups[key];
            if (group.trees.length === 0) continue;

            // Отрисовка заголовков групп (Выровнены по одной оси с кнопками)
            ctx.save();
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.font = "bold 11px 'Segoe UI', Arial";
            ctx.fillText(group.name, sidebarPadding, currentY);
            ctx.restore();
            
            currentY += 14;

            group.trees.forEach((tree, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                
                const x = sidebarPadding + col * (buttonW + gap);
                const buttonY = currentY + row * (buttonH + gap);

                const isSelected = activeTree && activeTree.treeId === tree.treeId;

                const mainColor = getColor(`--${tree.themeColor}`);
                const lightColor = getColor(`--light-${tree.themeColor}`);

                // Считаем активные перки и максимальное требование к навыку конкретно для этой ветки
                const activeNodes = tree.nodes.filter(n => n.isActive);
                const spentInTree = activeNodes.length;

                ctx.save();
                if (isSelected) {
                    ctx.fillStyle = mainColor;
                } else {
                    ctx.fillStyle = lightColor;
                }
                
                this.drawRoundedRect(ctx, x, buttonY, buttonW, buttonH, 5);
                ctx.fill();

                ctx.strokeStyle = isSelected ? "#ffffff" : mainColor;
                ctx.lineWidth = isSelected ? 1.5 : 1;
                ctx.stroke();

                // ОТРИСОВКА ТЕКСТА КНОПКИ
                ctx.fillStyle = "#000000"; 
                ctx.textAlign = "center";

                if (spentInTree > 0) {
                    let maxTreeSkill = 0;
                    activeNodes.forEach(node => {
                        if (node.levelReq > maxTreeSkill) maxTreeSkill = node.levelReq;
                    });

                    // Строка 1: Название ветки (смещаем на 5px выше центра)
                    ctx.font = isSelected ? "bold 11px 'Segoe UI', Arial" : "11px 'Segoe UI', Arial";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tree.title, x + buttonW / 2, buttonY + (buttonH / 2) - 6);

                    // Строка 2: Характеристики (смещаем на 6px ниже центра, делаем шрифт меньше и блеклым)
                    ctx.font = "300 12px 'Segoe UI', Arial";
                    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
                    
                    // ИСПРАВЛЕНО: Меняем "навык" на "уровень" в зависимости от classType ветки
                    const labelPrefix = tree.classType === "extra" ? "уровень" : "навык";
                    
                    const subText = maxTreeSkill > 0 
                        ? `${labelPrefix} ${maxTreeSkill} | перков ${spentInTree}` 
                        : `перков ${spentInTree}`;
                        
                    ctx.fillText(subText, x + buttonW / 2, buttonY + (buttonH / 2) + 7);
                } else {
                    // ДЕФОЛТНЫЙ РЕЖИМ: Если перков нет — пишем в одну строку ровно по центру
                    ctx.font = isSelected ? "bold 11px 'Segoe UI', Arial" : "11px 'Segoe UI', Arial";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tree.title, x + buttonW / 2, buttonY + buttonH / 2);
                }

                
                ctx.restore();

                tree.hitBox = { x, y: buttonY, w: buttonW, h: buttonH };
            });


            const rowsCount = Math.ceil(group.trees.length / 2);
            currentY += rowsCount * (buttonH + gap) + 15;
        }
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
