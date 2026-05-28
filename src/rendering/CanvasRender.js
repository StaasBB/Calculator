// Подтягиваем обновленный фронтенд-класс отображения подсказок TooltipView
import { TooltipView } from './TooltipView.js';
import { UIManager } from './UIManager.js';

export class CanvasRender {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.sidebarWidth = 290; 
        
        // Инициализируем TooltipView
        this.tooltipSystem = new TooltipView();
        this.uiManager = new UIManager(this.ctx, this.sidebarWidth);
    }

    /**
     * ОПТИМИЗИРОВАНО: Получает физический цвет из CSS на основе базового имени цвета из JSON и его роли.
     * Защищает проект от жесткой привязки к классам вроде "маг/воин".
     * 
     * @param {Object|string} treeOrColorName - Объект ветки (tree) или чистое имя цвета ('red', 'green' и т.д.)
     * @param {string} role - Требуемый слой: 'main' (активный), 'bg' (фон), 'border' (рамка), 'glow' (свет)
     */
    getColorFromCSS(treeOrColorName, role = 'main') {
        let colorName = 'yellow'; // Дефолт на случай непредвиденных данных
        
        if (typeof treeOrColorName === 'string') {
            colorName = treeOrColorName;
        } else if (treeOrColorName && treeOrColorName.themeColor) {
            colorName = treeOrColorName.themeColor;
        }

        // Очищаем от возможных префиксов, если они случайно пришли из старого кода
        colorName = colorName.replace('--', '').toLowerCase();

        // Автоматически собираем имя новой спектральной переменной (например: --green-glow или --blue-main)
        const variableName = `--${colorName}-${role}`;
        
        // Достаем значение из :root
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || "#555";
    }

    render(activeTree, allTrees) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const totalPoints = allTrees.reduce((sum, t) => sum + t.nodes.filter(n => n.isActive).length, 0);

        // ФРОНТЕНД-ЭФФЕКТ: Вычисляем мягкую синусоидальную пульсацию прозрачности от 0.35 до 0.85
        // Скорость пульсации регулируется множителем (0.005)
        this.pulseAlpha = 0.45 + Math.sin(Date.now() * 0.003) * 0.25;
        
        // 1. Отрисовка Сайдбара
        this.uiManager.renderSidebar(allTrees, activeTree, totalPoints, this.getColorFromCSS.bind(this), this.mousePos || null);
        
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

        // ЦИКЛ АНИМАЦИИ: Если контроллер передал активный бэкенд-прогноз,
        // заставляем холст постоянно перерисовываться для гладкого и мягкого мигания 60 FPS
        if (this.hoveredNode && this.activePrediction) {
            requestAnimationFrame(() => this.render(activeTree, allTrees));
        }
    }

    renderTree(activeTree) {
        const mainColor = this.getColorFromCSS(activeTree, 'main');
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

        // Динамический расчет уровня
        const activeNodes = activeTree.nodes.filter(n => n.isActive);
        const activeCount = activeNodes.length; 
        
        let maxSkillRequired = 0;
        activeNodes.forEach(node => {
            const nodeLevel = Number(node.levelReq) || 0;
            if (nodeLevel > maxSkillRequired) maxSkillRequired = nodeLevel;
        });

        const labelPrefix = activeTree.classType === "extra" ? "Уровень" : "Навык";
        const statusText = maxSkillRequired > 0 
            ? `${labelPrefix} ${maxSkillRequired} | Перков ${activeCount}` 
            : `Перков ${activeCount}`;
        const titleWidth = this.ctx.measureText(activeTree.title).width;
        this.ctx.font = "14px 'Segoe UI', Arial";
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        this.ctx.fillText(statusText, 40 + titleWidth + 20, 48);
        this.ctx.restore();

        // Извлекаем массив затронутых ID из бэкенд-прогноза, если он существует
        const chainIds = (this.activePrediction && this.activePrediction.chainIds) ? this.activePrediction.chainIds : [];
        const actionType = this.activePrediction ? this.activePrediction.actionType : 'none';

        // ШАГ 1: Рисуем линии (нижний слой)
        activeTree.nodes.forEach(node => {
            const { x, y } = node;
            node.requires.forEach(reqId => {
                const parent = activeTree.getNodeById(reqId);
                if (parent) {
                    const isLineActive = node.isActive && parent.isActive;
                    
                    let isHoverChain = false;
                    let isDangerChain = false;

                    // Если бэкенд передал затронутые ID для анимации
                    if (this.activePrediction && chainIds.length > 0) {
                        if (actionType === 'activate') {
                            // Проверяем, горит ли уже эта соединительная линия по факту
                            const isLineCurrentlyActive = node.isActive && parent.isActive;

                            // Линия должна мигать, если оба её конца (и родитель, и ребенок) входят в просчитанный бэкендом chainIds,
                            // но при этом сама эта линия связи между ними в данный момент еще СЕРАЯ (неактивная)
                            if (chainIds.includes(node.id) && chainIds.includes(parent.id)) {
                                if (!isLineCurrentlyActive) {
                                    isHoverChain = true;
                                }
                            }
                        } else if (actionType === 'deactivate') {
                            // При деактивации пунктиром горят все связи отваливающейся ветки
                            if (chainIds.includes(node.id) || chainIds.includes(parent.id)) {
                                if (node.isActive && parent.isActive) {
                                    isDangerChain = true;
                                }
                            }
                        }
                    }




                    this.ctx.save();
                    
                    if (isDangerChain) {
                        // 1. Рисуем толстую ЧЕРНУЮ подложку, чтобы рубиновый пунктир не сливался с кованым воином
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(parent.x, parent.y);
                        this.ctx.strokeStyle = "#000000";
                        this.ctx.lineWidth = 6;
                        this.ctx.stroke();

                        // 2. Поверх рисуем яркий рубиново-розовый пунктир с пульсацией
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(parent.x, parent.y);
                        this.ctx.setLineDash([4, 4]); // Пунктир: 4px штрих, 4px пропуск
                        this.ctx.strokeStyle = `rgba(255, 77, 121, ${this.pulseAlpha})`; 
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    } 
                    else if (isHoverChain) {
                        // Сплошное мягкое мигание цепочки активации основным цветом ветки из JSON
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(parent.x, parent.y);
                        this.ctx.strokeStyle = mainColor;
                        this.ctx.globalAlpha = this.pulseAlpha;
                        this.ctx.lineWidth = 4;
                        this.ctx.stroke();
                    } 
                    else {
                        // Обычное стандартное состояние линии
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(parent.x, parent.y);
                        this.ctx.strokeStyle = isLineActive ? mainColor : "#222226";
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }

                    this.ctx.restore();
                }
            });
        });

        // ШАГ 2: Рисуем кружки и тексты (верхний слой)
        activeTree.nodes.forEach(node => {
            const { x, y } = node;
            
            let pulseThisNode = false;
            let dangerThisNode = false;

            if (this.activePrediction && chainIds.length > 0) {
                if (actionType === 'activate' && chainIds.includes(node.id) && !node.isActive) {
                    pulseThisNode = true; 
                } else if (actionType === 'deactivate' && chainIds.includes(node.id)) {
                    dangerThisNode = true; 
                }
            }

            // --- ШАГ А: ПЛОТНАЯ ПОДЛОЖКА ДЛЯ СКРЫТИЯ ПОЛОС СВЯЗЕЙ ---
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(x, y, 14, 0, Math.PI * 2);
            // Рисуем глухой круг цвета заднего фона центрального окна, чтобы перекрыть линии
            this.ctx.fillStyle = "rgba(12, 12, 14, 1.0)"; 
            this.ctx.fill();
            this.ctx.restore();

            // --- ШАГ Б: ОТРИСОВКА САМОЙ НОДЫ С ЭФФЕКТОМ СВЕЧЕНИЯ (GLOW) ---
            this.ctx.save();
            
            // Включаем эффект неоновой ауры (подсветки) при наведении или участии в цепочке
            if (dangerThisNode) {
                this.ctx.shadowColor = "#ff4d79"; // Рубиновая аура для отмены
                this.ctx.shadowBlur = 12;
            } else if (pulseThisNode) {
                this.ctx.shadowColor = mainColor; // Цветная аура ветки для прокачки
                this.ctx.shadowBlur = 12;
            } else if (this.hoveredNode && this.hoveredNode.id === node.id) {
                // Если мышь просто наведена на перк (без цепочек) — тоже даем легкую подсветку
                this.ctx.shadowColor = node.isActive ? "#ffffff" : mainColor;
                this.ctx.shadowBlur = 8;
            }

            this.ctx.beginPath();
            this.ctx.arc(x, y, 14, 0, Math.PI * 2);

            if (dangerThisNode) {
                this.ctx.fillStyle = "#ff4d79";
                this.ctx.globalAlpha = 0.6 + (this.pulseAlpha - 0.35) * 0.8;
                this.ctx.fill();
                this.ctx.strokeStyle = "#ffffff";
            } else if (pulseThisNode) {
                this.ctx.fillStyle = mainColor;
                this.ctx.globalAlpha = 0.6 + (this.pulseAlpha - 0.35) * 0.8;
                this.ctx.fill();
                this.ctx.strokeStyle = "#ffffff";
            } else {
                this.ctx.fillStyle = node.isActive ? mainColor : "#16161a";
                this.ctx.fill();
                this.ctx.strokeStyle = node.isActive ? "#ffffff" : mainColor;
            }

            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore(); // Сбрасываем прозрачность и эффекты тени/свечения перед текстом

            // --- ШАГ В: СТАТИЧНАЯ ОТРИСОВКА ТЕКСТА ---
            this.ctx.save();
            this.ctx.globalAlpha = 1.0; 
            this.ctx.fillStyle = node.isActive ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
            this.ctx.font = "12px 'Segoe UI', Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(node.name, x, y + 28);
            this.ctx.restore();
            
            node.hitBox = { x: x - 14, y: y - 14, w: 28, h: 28 };
        });



    }

}
