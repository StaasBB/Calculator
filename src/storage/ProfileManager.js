import { ProfileService } from './ProfileService.js';
import { ProfileView } from '../rendering/ProfileView.js';
import { DependencyChecker } from '../utils/DependencyChecker.js';
import { BuildExporter } from './BuildExporter.js';

export class ProfileManager {
    constructor(state, onStateChange) {
        this.state = state;
        this.onStateChange = onStateChange;
        
        this.currentMode = null; 
        this.editingSlotId = null; 
        this.leaveTimeout = null;
        this.isEditingInputFocused = false;

        // Инициализируем сервисные бэк/фронт слои
        this.service = new ProfileService();
        this.view = new ProfileView(document.getElementById('profiles-dropdown-list'));

        this.initDOMReferences();
        this.initEvents();
    }

    initDOMReferences() {
        this.btnLoad = document.getElementById('trigger-load');
        this.btnSave = document.getElementById('trigger-save');
    }

    initEvents() {
        if (this.btnLoad) {
            this.btnLoad.addEventListener('click', () => {
                this.clearLeaveTimeout();
                this.toggleDropdown('load');
            });
        }
        
        if (this.btnSave) {
            this.btnSave.addEventListener('click', () => {
                this.clearLeaveTimeout();
                this.toggleDropdown('save');
            });
        }

        if (this.view.dropdown) {
            this.view.dropdown.addEventListener('mouseenter', () => this.clearLeaveTimeout());
            this.view.dropdown.addEventListener('mouseleave', () => {
                if (this.isEditingInputFocused) return;
                this.closeDropdown();
                this.onStateChange();
            });
        }

        const handleButtonLeave = () => {
            if (this.isEditingInputFocused) return;
            this.clearLeaveTimeout();
            
            // Даем пользователю 500мс, чтобы донести мышь от кнопки до списка
            this.leaveTimeout = setTimeout(() => {
                if (this.isEditingInputFocused) return;
                this.closeDropdown();
                this.onStateChange();
            }, 500);
        };

        if (this.btnLoad) this.btnLoad.addEventListener('mouseleave', handleButtonLeave);
        if (this.btnSave) this.btnSave.addEventListener('mouseleave', handleButtonLeave);

        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('mousedown', () => {
                this.closeDropdown();
                this.onStateChange();
            });
        }

        // Закрытие меню при тапе мимо для мобилок
        window.addEventListener('touchend', (e) => {
            if (!this.view.dropdown || !this.view.dropdown.classList.contains('open')) return;
            
            const clickedOnLoad = this.btnLoad && this.btnLoad.contains(e.target);
            const clickedOnSave = this.btnSave && this.btnSave.contains(e.target);
            const clickedInsideDropdown = this.view.dropdown.contains(e.target);

            if (!clickedOnLoad && !clickedOnSave && !clickedInsideDropdown) {
                this.closeDropdown();
                this.onStateChange();
            }
        }, { passive: true });
    }

    clearLeaveTimeout() {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
    }

    closeDropdown() {
        this.view.toggle(false);
        this.editingSlotId = null;
        this.clearLeaveTimeout();
    }

    toggleDropdown(mode) {
        if (this.view.dropdown.classList.contains('open') && this.currentMode === mode) {
            this.closeDropdown();
        } else {
            this.currentMode = mode;
            this.editingSlotId = null; 
            this.renderDropdown();
            
            this.view.toggle(true);
            const targetButton = mode === 'load' ? this.btnLoad : this.btnSave;
            this.view.setPosition(targetButton);
        }
    }

    renderDropdown() {
        this.view.clear();
        const slots = this.service.getSlotsList();

        slots.forEach(slot => {
            if (this.currentMode === 'save' && this.editingSlotId === slot.id) {
                this.view.createEditItem(
                    slot,
                    (nameInput) => this.executeSave(slot.id, nameInput), // Нажали OK
                    () => { // Cancel
                        this.isEditingInputFocused = false;
                        this.editingSlotId = null;
                        this.renderDropdown();
                    },
                    () => { // Focus
                        this.isEditingInputFocused = true;
                        this.clearLeaveTimeout();
                    }
                );
            } else {
                this.view.createStandardItem(
                    slot,
                    this.currentMode,
                    () => { // Delete
                        this.service.deleteSlot(slot.id);
                        this.renderDropdown();
                    },
                    () => { // Клик по строке профиля
                        if (this.currentMode === 'save') {
                            this.isEditingInputFocused = true;
                            this.editingSlotId = slot.id;
                            this.renderDropdown();
                        } else if (this.currentMode === 'load' && slot.data) {
                            this.executeLoad(slot.data.build);
                        }
                    }
                );
            }
        });
    }

    executeSave(slotId, nameInput) {
        this.service.saveSlot(slotId, nameInput, this.state.allTrees);
        this.isEditingInputFocused = false;
        this.editingSlotId = null;
        this.renderDropdown();
        this.onStateChange();
    }

    executeLoad(buildHash) {
        if (typeof buildHash === 'string') {
            BuildExporter.applyGlobalHash(this.state.allTrees, buildHash);
        }
        this.state.allTrees.forEach(t => DependencyChecker.validate(t));
        
        // Перезапускаем глобальный автосейв в LocalStorage, если подключен класс
        import('./BuildSaver.js').then(({ BuildSaver }) => {
            if (BuildSaver && BuildSaver.saveToLocalStorage) {
                BuildSaver.saveToLocalStorage(this.state.allTrees);
            }
        }).catch(() => {});

        this.closeDropdown();
        this.onStateChange();
    }
}
