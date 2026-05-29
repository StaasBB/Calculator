/**
 * Класс ProfileView (Фронтенд-слой / Представление)
 * Отвечает за генерацию HTML-элементов выпадающего списка профилей.
 */
export class ProfileView {
    constructor(dropdownElement) {
        this.dropdown = dropdownElement;
    }

    /**
     * Полностью очищает список перед новой прорисовкой
     */
    clear() {
        if (this.dropdown) this.dropdown.innerHTML = '';
    }

    /**
     * Переключает видимость выпадающего окна
     */
    toggle(open) {
        if (!this.dropdown) return;
        if (open) {
            this.dropdown.classList.add('open');
        } else {
            this.dropdown.classList.remove('open');
        }
    }

    /**
     * Позиционирует выпадающее меню строго под нажатой кнопкой хедера
     */
    setPosition(targetButton) {
        if (!this.dropdown || !targetButton) return;
        
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

    /**
     * Создает HTML-элемент строки редактирования (режим ввода имени)
     */
    createEditItem(slot, onSave, onCancel, onFocus) {
        const item = document.createElement('div');
        item.className = 'profile-item editing';
        item.style.background = 'rgba(205, 168, 105, 0.03)'; // Легкий золотистый оттенок при редактировании
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'profile-item-input';
        input.maxLength = 20;
        input.value = slot.data ? slot.data.name : `Билд ${slot.id}`;
        
        input.addEventListener('focus', onFocus);
        
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
            onSave(input.value.trim());
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onSave(input.value.trim());
            }
        });
        
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onCancel();
        });

        this.dropdown.appendChild(item);
        setTimeout(() => input.focus(), 20);
    }

    /**
     * Создает стандартную текстовую строку профиля
     */
    createStandardItem(slot, currentMode, onDelete, onClick) {
        const item = document.createElement('div');
        item.className = 'profile-item';
        
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
                onDelete();
            });
            item.appendChild(delSpan);
        }

        item.addEventListener('click', onClick);
        this.dropdown.appendChild(item);
    }
}
