import { DependencyChecker } from '../utils/DependencyChecker.js';
import { BuildSaver } from '../storage/BuildSaver.js';
import { BuildExporter } from '../storage/BuildExporter.js';
import { PerkStatePredictor } from './PerkStatePredictor.js';

export class InputController {
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
        const clientX = e.clientX;
        const clientY = e.clientY;
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    /**
     * Универсальный метод обновления тултипа на основе прогноза PerkStatePredictor
     */
    updateTooltipForNode(e, node) {
        if (!this.renderer || !this.renderer.tooltipSystem || !this.state.activeTree) return;

        // Запрашиваем чистые расчеты у бэкенд-слоя без каких-либо искусственных инверсий флагов
        const prediction = PerkStatePredictor.predictAction(this.state.activeTree, node);
        const currentHexColor = this.renderer.getColorFromCSS(this.state.activeTree, 'main');
        
        // Отправляем готовую строку во фронтенд-отображение TooltipView
        this.renderer.tooltipSystem.show(
            e.clientX, 
            e.clientY, 
            node.name, 
            node.effects, 
            currentHexColor, 
            prediction.displayString
        );
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
                        
                        if (e.isTouch) {
                            // ЖЕЛЕЗНЫЙ МОБИЛЬНЫЙ ФИКС:
                            // Сначала рассчитываем и фиксируем тултип по ИСХОДНОМУ состоянию дерева.
                            // Предсказатель увидит всю честную цепочку (+3, +5, -4) до того, как данные изменятся!
                            this.updateTooltipForNode(e, node);
                            
                            // И только после этого меняем состояние перков в базе данных
                            DependencyChecker.handleNodeClick(this.state.activeTree, node);
                            
                            // На смартфонах жестко зачищаем анимации, чтобы не тратить батарею
                            if (this.renderer) {
                                this.renderer.activePrediction = null;
                                this.renderer.hoveredNode = null;
                            }
                        } else {
                            // ЖЕЛЕЗНЫЙ ПК ФИКС:
                            // На ПК мышь остается на месте, поэтому сначала меняем состояние в базе данных
                            DependencyChecker.handleNodeClick(this.state.activeTree, node);
                            
                            // Мгновенно пересчитываем новый прогноз вдогонку, чтобы перерисовать линии пунктиром
                            if (this.renderer) {
                                const newPrediction = PerkStatePredictor.predictAction(this.state.activeTree, node);
                                this.renderer.activePrediction = newPrediction;
                                this.renderer.hoveredNode = node;
                            }
                            
                            // Обновляем тултип в следующем микрокадре отрисовки браузера
                            setTimeout(() => {
                                this.updateTooltipForNode(e, node);
                            }, 0);
                        }

                        // Сохраняем билд в память устройства
                        BuildSaver.saveToLocalStorage(this.state.allTrees);
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
            if (e.cancelable) {
                e.preventDefault(); 
            }
            if (e.changedTouches && e.changedTouches.length > 0) {
                // ИСПРАВЛЕНО: Корректно берем первый элемент из коллекции касаний [0]
                const touch = e.changedTouches[0];
                
                const fakeEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    isTouch: true 
                };
                
                handleSelect(fakeEvent);
            }
        });

        // ГЛОБАЛЬНЫЙ ЗАКРЫВАТЕЛЬ: Если тапнули вообще мимо холста
        window.addEventListener('touchend', (e) => {
            if (e.target !== this.canvas && this.renderer && this.renderer.tooltipSystem) {
                this.renderer.tooltipSystem.hide();
                this.onStateChange();
            }
        }, { passive: true });

        // ДВИЖЕНИЕ МЫШИ (Только для ПК — динамический рендеринг ховеров и подсказок)
        this.canvas.addEventListener('mousemove', (e) => {
            const { x, y } = this.getMousePos(e);
            
            // Передаем координаты мыши в рендерер для отрисовки ховеров кнопок сайдбара
            if (this.renderer) {
                this.renderer.mousePos = { x, y };
            }

            let found = false;
            let overButton = false;

            // 1. Проверяем наведение на кнопки сайдбара
            this.state.allTrees.forEach(tree => {
                if (!tree.hitBox) return;
                if (x > tree.hitBox.x && x < tree.hitBox.x + tree.hitBox.w &&
                    y > tree.hitBox.y && y < tree.hitBox.y + tree.hitBox.h) {
                    overButton = true;
                    found = true;
                }
            });

            this.canvas.style.cursor = overButton ? 'pointer' : 'default';

            // 2. Проверяем наведение на кружки-перки самого дерева
            if (!found && this.state.activeTree) {
                const relativeX = x - this.renderer.sidebarWidth;
                
                this.state.activeTree.nodes.forEach(node => {
                    if (!node.hitBox) return;
                    if (relativeX > node.hitBox.x && relativeX < node.hitBox.x + node.hitBox.w &&
                        y > node.hitBox.y && y < node.hitBox.y + node.hitBox.h) {
                        
                        // НОВОЕ (Архитектурное разделение):
                        // Запрашиваем у бэкенд-предсказателя полный расчет цепочки для этой ноды
                        const prediction = PerkStatePredictor.predictAction(this.state.activeTree, node);

                        if (this.renderer) {
                            // Передаем весь объект прогноза во фронтенд-отрисовщик
                            // Рендерер получит: { actionType: 'activate'/'deactivate', chainIds: [...] }
                            this.renderer.activePrediction = prediction;
                            this.renderer.hoveredNode = node;
                        }

                        // Показываем тултип (метод сам вызовет prediction внутри себя)
                        this.updateTooltipForNode(e, node);
                        this.canvas.style.cursor = 'pointer';
                        found = true;
                    }
                });
            }

            // ИСПРАВЛЕНО: Если мышь ушла с перка — зачищаем состояние прогноза анимаций
            if (!found) {
                if (this.renderer) {
                    this.renderer.tooltipSystem.hide();
                    
                    // Если до этого был активный прогноз — сбрасываем его
                    if (this.renderer.activePrediction || this.renderer.hoveredNode) {
                        this.renderer.activePrediction = null;
                        this.renderer.hoveredNode = null;
                        this.onStateChange(); // Делаем один финальный чистый кадр
                    }
                }
            }
            
            // Вызываем перерисовку для сайдбара
            this.onStateChange();
        });



        // Скрытие тултипов при уходе курсора (ПК)
        this.canvas.addEventListener('mouseleave', () => {
            if (this.renderer) {
                this.renderer.mousePos = null;
                this.renderer.hoveredNode = null;
                this.renderer.activePrediction = null; // НОВОЕ: Очищаем бэкенд-прогноз при уходе мыши
                
                if (this.renderer.tooltipSystem) {
                    this.renderer.tooltipSystem.hide();
                }
                this.onStateChange();
            }
        });


    }

    initUtilityButtons() {
        const btnShare = document.getElementById('btn-share');
        const btnResetTree = document.getElementById('btn-reset-tree');
        const btnResetAll = document.getElementById('btn-reset-all');

        if (btnShare) {
            btnShare.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const shareUrl = BuildExporter.getShareUrl(this.state.allTrees);
                navigator.clipboard.writeText(shareUrl)
                    .then(() => alert("Ссылка на ваш билд скопирована в буфер обмена!"))
                    .catch(err => console.error(err));
            });
        }

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
