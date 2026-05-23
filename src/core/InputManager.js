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
        const clientX = e.touches ? e.touches.clientX : e.clientX;
        const clientY = e.touches ? e.touches.clientY : e.clientY;

        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    initUtilityButtons() {
        const btnShare = document.getElementById('btn-share');
        const btnSave = document.getElementById('btn-save');
        const btnResetTree = document.getElementById('btn-reset-tree');
        const btnResetAll = document.getElementById('btn-reset-all');

        if (btnShare) {
            btnShare.addEventListener('click', () => {
                BuildExporter.updateUrl(this.state.allTrees);
                navigator.clipboard.writeText(window.location.href)
                    .then(() => alert("Ссылка скопирована в буфер обмена!"))
                    .catch(err => console.error(err));
            });
        }

        if (btnSave) {
            btnSave.addEventListener('click', () => {
                BuildSaver.saveToLocalStorage(this.state.allTrees);
                alert("Билд сохранен локально!");
            });
        }

        if (btnResetTree) {
            btnResetTree.addEventListener('click', () => {
                if (!this.state.activeTree) return;
                this.state.activeTree.nodes.forEach(node => node.isActive = false);
                BuildSaver.saveToLocalStorage(this.state.allTrees);
                BuildExporter.updateUrl(this.state.allTrees);
                this.onStateChange();
            });
        }

        if (btnResetAll) {
            btnResetAll.addEventListener('click', () => {
                if (!this.resetConfirmationActive) {
                    this.resetConfirmationActive = true;
                    btnResetAll.textContent = "Вы уверены?";
                } else {
                    this.state.allTrees.forEach(t => t.nodes.forEach(n => n.isActive = false));
                    this.resetConfirmationActive = false;
                    btnResetAll.textContent = "Сбросить всё";
                    BuildSaver.saveToLocalStorage(this.state.allTrees);
                    BuildExporter.updateUrl(this.state.allTrees);
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

    initEvents() {


        
        // НАЖАТИЕ МЫШИ
        this.canvas.addEventListener('mousedown', (e) => {
            const { x, y } = this.getMousePos(e); 
            let clickedInSidebar = false;
            
            this.state.allTrees.forEach(tree => {
                if (!tree.hitBox) return;
                if (x > tree.hitBox.x && x < tree.hitBox.x + tree.hitBox.w &&
                    y > tree.hitBox.y && y < tree.hitBox.y + tree.hitBox.h) {
                    this.state.activeTree = tree;
                    clickedInSidebar = true;
                    this.onStateChange();
                }
            });

            if (clickedInSidebar) return;

            if (this.state.activeTree) {
                const relativeX = x - this.renderer.sidebarWidth;

                this.state.activeTree.nodes.forEach(node => {
                    if (!node.hitBox) return;
                    if (relativeX > node.hitBox.x && relativeX < node.hitBox.x + node.hitBox.w &&
                        y > node.hitBox.y && y < node.hitBox.y + node.hitBox.h) {
                        
                        DependencyChecker.handleNodeClick(this.state.activeTree, node);
                        BuildSaver.saveToLocalStorage(this.state.allTrees);
                        BuildExporter.updateUrl(this.state.allTrees);
                        this.onStateChange();
                    }
                });
            }
        });

        // ДВИЖЕНИЕ МЫШИ
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

        // ИСПРАВЛЕНО: Тултип гарантированно скрывается, когда курсор уходит с Canvas на HTML-элементы шапки
        this.canvas.addEventListener('mouseleave', () => {
            if (this.renderer && this.renderer.tooltipSystem) {
                this.renderer.tooltipSystem.hide();
                this.onStateChange();
            }
        });
    }
}
