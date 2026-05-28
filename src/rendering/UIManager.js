export class UIManager {
    constructor(ctx, sidebarWidth) {
        this.ctx = ctx;
        this.sidebarWidth = sidebarWidth;
    }

    renderSidebar(allTrees, activeTree, totalPoints, getColor, mousePos = null) {
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
        const gap = 5;                                 // Уменьшенный отступ между кнопками

        // Вычисляем, сколько места займут две кнопки вместе со своим внутренним отступом gap
        const totalGridWidth = (buttonW * 2) + gap;
        // Динамически вычисляем отступ от краев сайдбара, чтобы сетка встала строго по центру
        const sidebarPadding = (this.sidebarWidth - totalGridWidth) / 2;

        // 2. ИЗОЛИРОВАННАЯ ОТРИСОВКА СЧЕТЧИКА
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

        // ЛОКАЛЬНЫЙ ХЕЛПЕР ЦВЕТА: Напрямую вытаскивает спектральные переменные из :root по имени цвета
        const getStyleColor = (colorName, role) => {
            const cleanColor = colorName.replace('--', '').toLowerCase();
            const variableName = `--${cleanColor}-${role}`;
            return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || "#555";
        };

        for (const key in groups) {
            const group = groups[key];
            if (group.trees.length === 0) continue;

            // Отрисовка заголовков групп
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

                // Выбор ветки по оригинальной логике treeId
                const isSelected = activeTree && activeTree.treeId === tree.treeId;

                // Расчет ховера
                const isHovered = mousePos && 
                                  mousePos.x >= x && mousePos.x <= x + buttonW && 
                                  mousePos.y >= buttonY && mousePos.y <= buttonY + buttonH;

                // Получаем спектральные цвета для фонов и рамок
                const mainColor = getStyleColor(tree.themeColor, 'main');
                const bgColor = getStyleColor(tree.themeColor, 'bg');
                const glowColor = getStyleColor(tree.themeColor, 'glow');

                // Считаем активные перки
                const activeNodes = tree.nodes.filter(n => n.isActive);
                const spentInTree = activeNodes.length;

                ctx.save();

                // ЭФФЕКТ СВЕЧЕНИЯ ДЛЯ ВЫБРАННОЙ КНОПКИ
                if (isSelected) {
                    ctx.shadowColor = mainColor;
                    ctx.shadowBlur = 10;
                }

                // 1 слой: ТЕМНЫЙ, НО ЦВЕТНОЙ ФОН (Подложка карточки кнопки)
                if (isSelected) {
                    ctx.fillStyle = bgColor; 
                } else if (isHovered) {
                    ctx.fillStyle = "#1e1e24"; 
                } else {
                    ctx.fillStyle = bgColor;
                }
                this.drawRoundedRect(ctx, x, buttonY, buttonW, buttonH, 5);
                ctx.fill();

                // Сбрасываем тень
                ctx.shadowBlur = 0;

                // 2 слой: АТМОСФЕРНЫЙ ЦВЕТНОЙ ГРАДИЕНТ
                const gradient = ctx.createLinearGradient(x, buttonY, x, buttonY + buttonH);
                if (isSelected) {
                    gradient.addColorStop(0, glowColor); 
                    gradient.addColorStop(0.4, glowColor);
                    gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
                } else if (isHovered) {
                    gradient.addColorStop(0, mainColor); 
                    gradient.addColorStop(1, "transparent");
                } else {
                    gradient.addColorStop(0, glowColor.replace('0.22', '0.1').replace('0.25', '0.1').replace('0.18', '0.08'));
                    gradient.addColorStop(1, "transparent");
                }
                ctx.fillStyle = gradient;
                this.drawRoundedRect(ctx, x, buttonY, buttonW, buttonH, 5);
                ctx.fill();

                // 3 слой: Объемная светящаяся рамка кнопок с правильным приоритетом
                ctx.lineWidth = isSelected ? 1.5 : 1;
                
                // ИСПРАВЛЕНО НАМЕРТВО: Если ветка ВЫБРАНА, то рамка ВСЕГДА остается белой, даже при ховере
                if (isSelected) {
                    ctx.strokeStyle = "#ffffff"; 
                    ctx.stroke();
                } 
                // Если ветка НЕ выбрана, но на неё НАВЕЛИ мышь — включаем неоновый ховер-эффект
                else if (isHovered) {
                    ctx.strokeStyle = mainColor;
                    ctx.save();
                    ctx.globalCompositeOperation = "screen"; 
                    this.drawRoundedRect(ctx, x, buttonY, buttonW, buttonH, 5);
                    ctx.stroke();
                    ctx.restore();
                } 
                // Базовое состояние неактивной кнопки
                else {
                    ctx.strokeStyle = mainColor; 
                    ctx.stroke();
                }

                // 4 слой: Тонкий световой блик по верхней грани (Материальный объем)
                if (isSelected || isHovered) {
                    ctx.beginPath();
                    ctx.moveTo(x + 5, buttonY + 0.5);
                    ctx.lineTo(x + buttonW - 5, buttonY + 0.5);
                    ctx.strokeStyle = isSelected ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.18)";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                // ОТРИСОВКА ТЕКСТА КНОПКИ
                ctx.textAlign = "center";

                if (spentInTree > 0) {
                    let maxTreeSkill = 0;
                    activeNodes.forEach(node => {
                        if (node.levelReq > maxTreeSkill) maxTreeSkill = node.levelReq;
                    });

                    // Строка 1: Название ветки
                    ctx.fillStyle = "#ffffff";
                    ctx.font = (isSelected || isHovered) ? "bold 11px 'Segoe UI', Arial" : "11px 'Segoe UI', Arial";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tree.title, x + buttonW / 2, buttonY + (buttonH / 2) - 6);

                    // Строка 2: Характеристики под названием
                    ctx.font = "300 11px 'Segoe UI', Arial";
                    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
                    
                    const labelPrefix = tree.classType === "extra" ? "уровень" : "навык";
                    const subText = maxTreeSkill > 0 
                        ? `${labelPrefix} ${maxTreeSkill} | перков ${spentInTree}` 
                        : `перков ${spentInTree}`;
                        
                    ctx.fillText(subText, x + buttonW / 2, buttonY + (buttonH / 2) + 7);
                } else {
                    // ДЕФОЛТНЫЙ РЕЖИМ (Нет перков)
                    ctx.fillStyle = (isSelected || isHovered) ? "#ffffff" : "rgba(255, 255, 255, 0.65)";
                    ctx.font = (isSelected || isHovered) ? "bold 12px 'Segoe UI', Arial" : "12px 'Segoe UI', Arial";
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
        ctx.lineTo(x + width, y + height - radius);ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);ctx.lineTo(x + radius, y + height);ctx.quadraticCurveTo(x, y + height, x, y + height - radius);ctx.lineTo(x, y + radius);ctx.quadraticCurveTo(x, y, x + radius, y);ctx.closePath();}}
