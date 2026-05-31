/**
 * Класс VersionSelector (Фронтенд-компонент)
 * Полностью динамический переключатель версий сборки.
 * Берет все данные из внешнего манифеста versions.json без единой захардкоженной строки.
 */
import { ToastView } from './ToastView.js';

export class VersionSelector {
    constructor(onVersionChange) {
        this.onVersionChange = onVersionChange;
        this.storageKey = 'rfab_selected_version';
        this.versions = []; // Массив наполнится динамически из файла манифеста
        this.isOpen = false;
        
        this.initDOM();
    }

    /**
     * Считывает сохраненную версию из LocalStorage.
     * Если кэш пустой — берет самую первую версию из манифеста.
     */
    getSelectedVersionUrl() {
        const savedUrl = localStorage.getItem(this.storageKey);
        const exists = this.versions.some(v => v.url === savedUrl);
        return exists ? savedUrl : (this.versions[0] ? this.versions[0].url : './src/data/perks_prime.json');
    }

    /**
     * Обновляет короткое текстовое название внутри кнопки
     */
    updateButtonText(shortName) {
        const textEl = document.getElementById('rfab-version-btn-text');
        if (textEl) {
            textEl.textContent = shortName;
        }
    }

    /**
     * Асинхронно инициализирует селектор версий
     */
    async initDOM() {
        this.btnContainer = document.getElementById('trigger-version');
        if (!this.btnContainer) {
            console.error('VersionSelector: Кнопка #trigger-version не найдена в index.html!');
            return;
        }

        try {
            // 1. СКАЧИВАЕМ МАНИФЕСТ ВЕРСИЙ — Полный уход от хардкода!
            const response = await fetch('./src/data/versions.json');
            if (!response.ok) throw new Error(`Ошибка манифеста: ${response.status}`);
            this.versions = await response.json();

            // 2. Создаем кастомный блок выпадающего списка
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'profiles-dropdown version-custom-dropdown';
            this.dropdown.style.width = '260px'; 
            document.body.appendChild(this.dropdown);

            // Отрисовываем элементы списка
            this.renderDropdown();

            // 3. Настраиваем клик по кнопке в таб-баре
            this.btnContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('profiles-dropdown-list')?.classList.remove('open');
                this.toggleDropdown();
            });

            // Навешиваем автозакрыватели окон
            const canvas = document.getElementById('gameCanvas');
            if (canvas) canvas.addEventListener('mousedown', () => this.closeDropdown());

            window.addEventListener('touchend', (e) => {
                if (!this.isOpen) return;
                if (!this.btnContainer.contains(e.target) && !this.dropdown.contains(e.target)) {
                    this.closeDropdown();
                }
            }, { passive: true });

            // Сообщаем главному приложению app.js, какой файл из кэша или манифеста нужно загрузить на старте
            const startUrl = this.getSelectedVersionUrl();
            if (typeof this.onVersionChange === 'function') {
                this.onVersionChange(startUrl);
            }

        } catch (e) {
            console.error("Критическая ошибка загрузки карты версий:", e);
        }
    }

    /**
     * Рендерит пункты списка СТРОГО на основе полных имен из versions.json
     */
    renderDropdown() {
        if (!this.dropdown) return;
        this.dropdown.innerHTML = '';
        const currentUrl = this.getSelectedVersionUrl();

        this.versions.forEach(v => {
            const item = document.createElement('div');
            item.className = 'profile-item';
            
            if (v.url === currentUrl) {
                item.style.background = 'rgba(246, 179, 106, 0.1)';
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = 'profile-item-name';
            
            // ИСПРАВЛЕНО НАМЕРТВО: Текст берется прямо из поля fullName файла манифеста без [] и дат!
            if (v.url === currentUrl) {
                nameDiv.innerHTML = `${v.fullName} <span style="color: #f6b36a; font-style: italic; font-size: 11px; margin-left: 8px;">(активна)</span>`;
            } else {
                nameDiv.textContent = v.fullName;
            }

            item.appendChild(nameDiv);

            // Клик по пункту меню
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                localStorage.setItem(this.storageKey, v.url);
                ToastView.show(`Версия выбрана: ${v.shortName || v.fullName}`);
                this.renderDropdown(); 
                this.closeDropdown();

                if (typeof this.onVersionChange === 'function') {
                    this.onVersionChange(v.url);
                }
            });

            this.dropdown.appendChild(item);
        });
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.isOpen = true;
            this.dropdown.classList.add('open');
            this.setPosition();
        }
    }

    closeDropdown() {
        this.isOpen = false;
        this.dropdown?.classList.remove('open');
    }

    setPosition() {
        if (!this.dropdown || !this.btnContainer) return;
        const rect = this.btnContainer.getBoundingClientRect();
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
