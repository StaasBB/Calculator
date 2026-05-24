import { DependencyChecker } from '../utils/DependencyChecker.js';
import { BuildSaver } from '../storage/BuildSaver.js';
import { BuildExporter } from '../storage/BuildExporter.js';

export class InputManager {
    constructor(canvas, state, renderer, onStateChange) {
        this.canvas = canvas;
        this.state = state;
        this.renderer = renderer;
        this.onStateChange = onStateChange; 

        this.resetConfirmationActive = false;

        this.initEvents();
        this.initUtilityButtons(); 
    }

    /**
     * ОПТИМИЗАЦИЯ: Единственная точка расчета координат
     */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Для нативного скролла используем только стандартные координаты клика.
        // Браузер сам переведет короткий тап на мобильном в clientX/clientY.
        const clientX = e.clientX;
        const clientY = e.clientY;

        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    initEvents() {
        // ОДНА ЛОГИКА ДЛЯ НАЖАТИЯ И ТАПА
        const handleSelect = (e) => {
            const { x, y } = this.getMousePos(e); 
            let clickedInSidebar = false;
            let clickedOnNode = false;
            
            // 1. Проверяем попадание в сайдбар (переключение веток)
            this.state.allTrees.forEach(tree => {
                if (!tree.hitBox) return;
                if (x > tree.hitBox.x && x < tree.hitBox.x + tree.hitBox.w &&
                    y > tree.hitBox.y && y < tree.hitBox.y + tree.hitBox.h) {
                    this.state.activeTree = tree;
                    clickedInSidebar = true;
                    
                    // ИСПРАВЛЕНО: Гарантированно прячем тултип старого перка при переключении ветки
                    if (this.renderer && this.renderer.tooltipSystem) {
                        this.renderer.tooltipSystem.hide();
                    }
                    
                    this.onStateChange();
                }
            });

            if (clickedInSidebar) return;

            // 2. Проверяем попадание в ноды (перки) дерева
            if (this.state.activeTree) {
                const relativeX = x - this.renderer.sidebarWidth;

                this.state.activeTree.nodes.forEach(node => {
                    if (!node.hitBox) return;
                    if (relativeX > node.hitBox.x && relativeX < node.hitBox.x + node.hitBox.w &&
                        y > node.hitBox.y && y < node.hitBox.y + node.hitBox.h) {
                        
                        // Активируем перк
                        DependencyChecker.handleNodeClick(this.state.activeTree, node);
                        BuildSaver.saveToLocalStorage(this.state.allTrees);
                        
                        // УБРАНО: BuildExporter.updateUrl больше не вызывается здесь!
                        // Адресная строка браузера остается чистой во время прокачки перков.
                        
                        // НА ТЕЛЕФОНЕ: Показываем тултип для этого перка прямо в точке отрыва пальца
                        if (e.isTouch && this.renderer && this.renderer.tooltipSystem) {
                            const currentHexColor = this.renderer.getColorFromCSS(`--${this.state.activeTree.themeColor}`);
                            this.renderer.tooltipSystem.show(e.clientX, e.clientY, node.name, node.effects, currentHexColor);
                        }
                        
                        clickedOnNode = true;
                        this.onStateChange();
                    }
                });
            }


            // Если палец/мышь оторвались на пустом месте — убираем тултип
            if (!clickedOnNode && this.renderer && this.renderer.tooltipSystem) {
                this.renderer.tooltipSystem.hide();
                this.onStateChange();
            }
        };

        // НА ПК: Обычный клик мыши
        this.canvas.addEventListener('click', (e) => {
            if (e.detail === 0) return; // Игнорируем фантомные клики
            e.isTouch = false;
            handleSelect(e);
        });

        // НА ТЕЛЕФОНЕ: Логика, завязанная ИСКЛЮЧИТЕЛЬНО на отрыв пальца
        this.canvas.addEventListener('touchend', (e) => {
            // ИСПРАВЛЕНО: Блокируем 'ghost click' только если событие является отменяемым.
            // Если в этот момент идет скролл контента, e.preventDefault() вызываться не будет, и спам прекратится.
            if (e.cancelable) {
                e.preventDefault(); 
            }

            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                
                // Формируем безопасный объект события для handleSelect
                const fakeEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    isTouch: true // Флаг для вывода тултипа на мобильном
                };
                
                handleSelect(fakeEvent);
            }
        });

        // ГЛОБАЛЬНЫЙ ЗАКРЫВАТЕЛЬ: Если тапнули вообще мимо холста (по кнопкам утилит, хедеру, футеру)
        window.addEventListener('touchend', (e) => {
            if (e.target !== this.canvas && this.renderer && this.renderer.tooltipSystem) {
                this.renderer.tooltipSystem.hide();
                this.onStateChange();
            }
        }, { passive: true });

        // ДВИЖЕНИЕ МЫШИ (Только для ПК — сохраняем наведение и ховеры)
        this.canvas.addEventListener('mousemove', (e) => {
            const { x, y } = this.getMousePos(e);
            let found = false;
            let overButton = false;

            this.state.allTrees.forEach(tree => {
                if (!tree.hitBox) return;
                if (x > tree.hitBox.x && x < tree.hitBox.x + tree.hitBox.w &&
                    y > tree.hitBox.y && y < tree.hitBox.y + tree.hitBox.h) {
                    overButton = true;
                    found = true;
                }
            });

            this.canvas.style.cursor = overButton ? 'pointer' : 'default';

            if (!found && this.state.activeTree) {
                const relX = x - this.renderer.sidebarWidth;
                this.state.activeTree.nodes.forEach(node => {
                    if (!node.hitBox) return;
                    if (relX > node.hitBox.x && relX < node.hitBox.x + node.hitBox.w &&
                        y > node.hitBox.y && y < node.hitBox.y + node.hitBox.h) {
                        
                        const currentHexColor = this.renderer.getColorFromCSS(`--${this.state.activeTree.themeColor}`);
                        this.renderer.tooltipSystem.show(e.clientX, e.clientY, node.name, node.effects, currentHexColor);
                        this.canvas.style.cursor = 'pointer';
                        found = true;
                    }
                });
            }

            if (!found) this.renderer.tooltipSystem.hide();
            this.onStateChange();
        });

        // Скрытие тултипов при уходе курсора (ПК)
        this.canvas.addEventListener('mouseleave', () => {
            if (this.renderer && this.renderer.tooltipSystem) {
                this.renderer.tooltipSystem.hide();
                this.onStateChange();
            }
        });
    }

    initUtilityButtons() {
        const btnShare = document.getElementById('btn-share');
        const btnResetTree = document.getElementById('btn-reset-tree');
        const btnResetAll = document.getElementById('btn-reset-all');

        // Кнопка "Поделиться" генерирует и копирует супер-сжатую ссылку
        if (btnShare) {
            btnShare.addEventListener('click', (e) => {
                e.stopPropagation(); // Не пускаем клик к глобальным закрывателям тултипов
                const shareUrl = BuildExporter.getShareUrl(this.state.allTrees);
                navigator.clipboard.writeText(shareUrl)
                    .then(() => alert("Ссылка на ваш билд скопирована в буфер обмена!"))
                    .catch(err => console.error(err));
            });
        }

        // ИСПРАВЛЕНО: Кнопки Сохранить (trigger-save) и Загрузить (trigger-load)
        // из InputManager полностью убраны! На них уже навешаны правильные слушатели
        // внутри initEvents() вашего класса ProfileManager.

        if (btnResetTree) {
            btnResetTree.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.state.activeTree) return;
                this.state.activeTree.nodes.forEach(node => node.isActive = false);
                BuildSaver.saveToLocalStorage(this.state.allTrees);
                this.onStateChange();
            });
        }

        if (btnResetAll) {
            btnResetAll.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.resetConfirmationActive) {
                    this.resetConfirmationActive = true;
                    btnResetAll.textContent = "Вы уверены?";
                } else {
                    this.state.allTrees.forEach(t => t.nodes.forEach(n => n.isActive = false));
                    this.resetConfirmationActive = false;
                    btnResetAll.textContent = "Сбросить всё";
                    BuildSaver.saveToLocalStorage(this.state.allTrees);
                    this.onStateChange();
                }
            });

            btnResetAll.addEventListener('mouseleave', () => {
                if (this.resetConfirmationActive) {
                    this.resetConfirmationActive = false;
                    btnResetAll.textContent = "Сбросить всё";
                }
            });
        }
    }


}
