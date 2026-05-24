import { BuildSaver } from './BuildSaver.js';
import { BuildExporter } from './BuildExporter.js';
import { DependencyChecker } from '../utils/DependencyChecker.js';

export class ProfileManager {
    constructor(state, onStateChange) {
        this.state = state;
        this.onStateChange = onStateChange;
        this.currentMode = null; 
        this.editingSlotId = null; 

        // Таймер для контроля перевода курсора с кнопки на выпадающий список
        this.leaveTimeout = null;

        this.initDOMReferences();
        this.initEvents();
    }

    initDOMReferences() {
        this.btnLoad = document.getElementById('trigger-load');
        this.btnSave = document.getElementById('trigger-save');
        this.dropdown = document.getElementById('profiles-dropdown-list');
    }

    initEvents() {
        // ИСПРАВЛЕНО: При клике на кнопки мы принудительно очищаем старый таймер,
        // чтобы он не закрывал только что открытое новое окно!
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

        // АВТОЗАКРЫТИЕ ПРИ УВОДЕ МЫШИ
        // 1. Когда мышь заходит внутрь выпадающего списка — отменяем таймер закрытия
        this.dropdown.addEventListener('mouseenter', () => {
            this.clearLeaveTimeout();
        });

        // 2. Когда мышь полностью ПОКИДАЕТ выпадающий список — мгновенно закрываем его
        this.dropdown.addEventListener('mouseleave', () => {
            this.closeDropdown();
            this.onStateChange();
        });

        // 3. Дополнительная защита: если мышь ушла с самих кнопок хедера и не дошла до списка
        const handleButtonLeave = () => {
            // Сначала на всякий случай очищаем предыдущий таймер, чтобы они не множились
            this.clearLeaveTimeout();
            
            // Даем пользователю 500мс, чтобы донести мышь от кнопки до выпавшего списка
            this.leaveTimeout = setTimeout(() => {
                this.closeDropdown();
                this.onStateChange();
            }, 500);
        };

        if (this.btnLoad) this.btnLoad.addEventListener('mouseleave', handleButtonLeave);
        if (this.btnSave) this.btnSave.addEventListener('mouseleave', handleButtonLeave);

        // Дополнительная защита: закрываем меню при клике по Canvas-области
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('mousedown', () => {
                this.closeDropdown();
                this.onStateChange();
            });
        }

        // ИСПРАВЛЕНО ДЛЯ МОБИЛЬНЫХ: Закрытие меню при тапе в любое место мимо кнопок и списка
        window.addEventListener('touchend', (e) => {
            // Если выпадающее меню сейчас закрыто — ничего не делаем
            if (!this.dropdown || !this.dropdown.classList.contains('open')) return;

            // Проверяем, пришелся ли тап по кнопкам "Сохранить", "Загрузить" или по самому меню
            const clickedOnLoad = this.btnLoad && this.btnLoad.contains(e.target);
            const clickedOnSave = this.btnSave && this.btnSave.contains(e.target);
            const clickedInsideDropdown = this.dropdown.contains(e.target);

            // Если пользователь тапнул МИМО всех этих элементов — мягко закрываем меню
            if (!clickedOnLoad && !clickedOnSave && !clickedInsideDropdown) {
                this.closeDropdown();
                this.onStateChange();
            }
        }, { passive: true });

    }

    /**
     * ОПТИМИЗАЦИЯ: Изолированный безопасный метод для сброса таймера
     */
    clearLeaveTimeout() {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
    }

    closeDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.remove('open');
            this.editingSlotId = null; 
            this.clearLeaveTimeout(); // Очищаем таймер при закрытии
        }
    }

    toggleDropdown(mode) {
        if (this.dropdown.classList.contains('open') && this.currentMode === mode) {
            this.closeDropdown();
        } else {
            this.currentMode = mode;
            this.editingSlotId = null; 
            this.renderDropdown();
            
            this.dropdown.classList.add('open');

            const targetButton = mode === 'load' ? this.btnLoad : this.btnSave;
            
            if (targetButton) {
                const rect = targetButton.getBoundingClientRect();
                const dropdownWidth = this.dropdown.offsetWidth;

                const topPos = rect.bottom + window.pageYOffset;
                
                const buttonCenter = rect.left + (rect.width / 2);
                let leftPos = buttonCenter - (dropdownWidth / 2);

                if (leftPos < 10) leftPos = 10;
                if (leftPos + dropdownWidth > window.innerWidth - 10) {
                    leftPos = window.innerWidth - dropdownWidth - 10;
                }

                this.dropdown.style.top = `${topPos}px`;
                this.dropdown.style.left = `${leftPos}px`;
            }
        }
    }

    /**
     * ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Логика динамического расширения теперь 
     * гарантированно оставляет один пустой слот на конце.
     */
    getSlotsList() {
        const slots = [];
        let maxFoundIndex = 3; 

        // 1. Ищем максимальный заполненный индекс в LocalStorage
        for (let i = 1; i < 100; i++) {
            if (localStorage.getItem(`rfab_profile_slot_${i}`)) {
                if (i > maxFoundIndex) {
                    maxFoundIndex = i;
                }
            }
        }

        // 2. Наполняем массив текущими данными
        for (let i = 1; i <= maxFoundIndex; i++) {
            const rawData = localStorage.getItem(`rfab_profile_slot_${i}`);
            let parsedData = null;
            if (rawData) {
                try {
                    parsedData = JSON.parse(rawData);
                } catch(e) {
                    console.error(`Поврежденный слот ${i}`, e);
                }
            }
            slots.push({ id: i, data: parsedData });
        }

        // 3. Если все текущие слоты заняты — ВСЕГДА создаем ОДИН следующий пустой слот в самом конце
        const hasAnyEmptySlot = slots.some(s => s.data === null);
        if (!hasAnyEmptySlot) {
            const nextFreeId = slots.length + 1;
            slots.push({ id: nextFreeId, data: null });
        }

        // 4. ИСПРАВЛЕНО: Обрезаем лишние хвосты, но гарантированно сохраняем 
        // один единственный пустой слот для добавления новых билдов.
        if (slots.length > 3) {
            // Находим индекс самого последнего слота, в котором РЕАЛЬНО есть сохраненные данные
            let lastFilledIndex = -1;
            for (let i = slots.length - 1; i >= 0; i--) {
                if (slots[i].data !== null) {
                    lastFilledIndex = i;
                    break;
                }
            }

            // Если данные есть только в первых трех слотах (или меньше)
            if (lastFilledIndex < 3) {
                // Возвращаем базовые 3 слота + ровно один пустой Слот 4 на конце
                return slots.slice(0, 4);
            } else {
                // Если заполнен, например, 4-й слот — возвращаем все заполненные слоты 
                // плюс ровно один следующий пустой слот после него
                return slots.slice(0, lastFilledIndex + 2);
            }
        }

        return slots;
    }







    renderDropdown() {
        this.dropdown.innerHTML = '';
        const slots = this.getSlotsList();

        slots.forEach(slot => {
            const item = document.createElement('div');
            item.className = 'profile-item';

            if (this.currentMode === 'save' && this.editingSlotId === slot.id) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'profile-item-input';
                input.maxLength = 20;
                input.value = slot.data ? slot.data.name : `Билд ${slot.id}`;
                
                const saveBtn = document.createElement('button');
                saveBtn.className = 'profile-item-save-btn';
                saveBtn.textContent = 'OK';
                
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'profile-item-cancel-btn';
                cancelBtn.innerHTML = '&times;';

                item.appendChild(input);
                item.appendChild(saveBtn);
                item.appendChild(cancelBtn);

                item.addEventListener('click', (e) => e.stopPropagation());

                saveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.executeSave(slot.id, input.value.trim());
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.executeSave(slot.id, input.value.trim());
                    }
                });

                cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editingSlotId = null;
                    this.renderDropdown();
                });

            } else {
                const nameDiv = document.createElement('div');
                nameDiv.className = 'profile-item-name';
                
                if (slot.data) {
                    nameDiv.textContent = `Слот ${slot.id}: ${slot.data.name}`;
                } else {
                    nameDiv.className += ' empty';
                    nameDiv.textContent = `Слот ${slot.id}: [Пустой слот]`;
                }

                item.appendChild(nameDiv);

                if (slot.data) {
                    const delSpan = document.createElement('span');
                    delSpan.className = 'profile-item-delete';
                    delSpan.innerHTML = '&times;';
                    delSpan.addEventListener('click', (e) => {
                        e.stopPropagation();
                        localStorage.removeItem(`rfab_profile_slot_${slot.id}`);
                        this.renderDropdown();
                    });
                    item.appendChild(delSpan);
                }
                
                item.addEventListener('click', () => {
                    if (this.currentMode === 'save') {
                        this.editingSlotId = slot.id;
                        this.renderDropdown();
                        setTimeout(() => {
                            const activeInput = item.querySelector('.profile-item-input');
                            if (activeInput) activeInput.focus();
                        }, 20);
                    } else if (this.currentMode === 'load' && slot.data) {
                        this.executeLoad(slot.data.build);
                    }
                });
            }

            this.dropdown.appendChild(item);
        });
    }

    executeSave(slotId, nameInput) {
        const name = nameInput || `Билд ${slotId}`;
        
        // Генерируем короткий бинарный хэш без дефисов
        const compressedBuildHash = BuildExporter.generateGlobalHash(this.state.allTrees);

        const saveData = {
            name: name,
            build: compressedBuildHash
        };

        localStorage.setItem(`rfab_profile_slot_${slotId}`, JSON.stringify(saveData));
        
        this.closeDropdown(); 
        this.onStateChange();
    }

    executeLoad(buildHash) {
        // Прямое применение нового битового хэша без проверок на старые массивы
        if (typeof buildHash === 'string') {
            BuildExporter.applyGlobalHash(this.state.allTrees, buildHash);
        }

        // Валидация зависимостей перков после загрузки нового состояния
        this.state.allTrees.forEach(t => DependencyChecker.validate(t));
        
        // Обновление глобального автосейва в LocalStorage
        if (typeof BuildSaver !== 'undefined' && BuildSaver.saveToLocalStorage) {
            BuildSaver.saveToLocalStorage(this.state.allTrees);
        }
        
        this.closeDropdown();
        this.onStateChange();
    }
}