/**
 * Класс TooltipView (Фронтенд-слой)
 * Отвечает исключительно за рендеринг, стилизацию и позиционирование 
 * всплывающей подсказки (тултипа) на экране. Не содержит никакой бизнес-логики.
 */
export class TooltipView {
    constructor() {
        this.el = null;
        this.initDOM();
    }

    /**
     * Инициализация структуры тултипа в HTML документе
     */
    initDOM() {
        // Защита от дублирования элемента в DOM
        if (document.getElementById('calculator-tooltip')) return;
        
        const tooltip = document.createElement('div');
        tooltip.id = 'calculator-tooltip';
        document.body.appendChild(tooltip);
        this.el = tooltip;

        // ПЕРЕХВАТ КОЛЕСИКА (Для ПК): Скроллим подсказку, если текст большой
        window.addEventListener('wheel', (e) => {
            if (!this.el || this.el.style.display === 'none' || !this.el.classList.contains('visible')) return;
            
            const rect = this.el.getBoundingClientRect();
            const isMouseOverTooltip = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );

            if (isMouseOverTooltip) {
                if (this.el.scrollHeight > this.el.offsetHeight) {
                    this.el.scrollTop += e.deltaY;
                    e.preventDefault();
                }
            }
        }, { passive: false });

        // ДЛЯ ТЕЛЕФОНОВ: Тап по самому тултипу мгновенно скрывает его
        tooltip.addEventListener('touchend', (e) => {
            this.hide();
            e.stopPropagation(); // Предотвращаем клик по элементам под тултипом
        });
    }

    /**
     * Отрисовывает тултип на экране с переданными данными.
     * 
     * @param {number} x - Координата X курсора/тапа (clientX)
     * @param {number} y - Координата Y курсора/тапа (clientY)
     * @param {string} title - Название перка
     * @param {Array|string} description - Эффекты перка (строка или массив строк)
     * @param {string} borderColor - Hex или RGB цвет рамки (цвет темы ветки)
     * @param {string|null} counterString - Готовая строка счетчика нод от бэкенда (например, "+3", "-1")
     */
    show(x, y, title, description, borderColor, counterString = null) {
        if (!this.el) this.initDOM();

        const currentBorderColor = borderColor || 'rgba(235, 94, 40, 0.75)';
        this.el.style.border = `1.5px solid ${currentBorderColor}`;
        this.el.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.7), 0 0 8px ${currentBorderColor}`;

        // НОВОЕ: Вспомогательная функция для склонения слова "перк" в зависимости от числа
        const getPerkPluralForm = (str) => {
            if (!str) return '';
            // Вытаскиваем чистое число без знаков плюс/минус (например, "+3" -> 3)
            const count = Math.abs(parseInt(str, 10));
            if (isNaN(count)) return '';

            const mod10 = count % 10;
            const mod100 = count % 100;

            // Правила склонения русского языка:
            // 11-14 перков
            if (mod100 >= 11 && mod100 <= 14) {
                return 'Перков';
            }
            // 1 перк, 21 перк
            if (mod10 === 1) {
                return 'Перк';
            }
            // 2, 3, 4 перка
            if (mod10 >= 2 && mod10 <= 4) {
                return 'Перка';
            }
            // 5-9, 0 перков
            return 'Перков';
        };

        // Генерируем правильное русское окончание на основе переданной строки
        const perkLabel = counterString !== null ? getPerkPluralForm(counterString) : '';

        // Формируем шапку тултипа
        let html = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        ">
            <div style="
                font-weight: bold;
                font-size: 20px;
                color: #f5f5f7;
                line-height: 1.1;
            ">
                ${title}
            </div>

            ${
                counterString !== null
                ? `
                <div style="
                    flex-shrink: 0;
                    padding: 4px 10px;
                    border-radius: 6px;
                    background: ${counterString.startsWith('-') ? 'rgba(239, 71, 111, 0.15)' : 'rgba(255,255,255,0.08)'};
                    color: ${counterString.startsWith('-') ? '#ef476f' : '#ffffff'};
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.4px;
                ">
                    ${counterString} ${perkLabel}
                </div>
                `
                : ''
            }
        </div>
        `;
        
        // Формируем тело с описанием эффектов
        const lines = Array.isArray(description) ? description : (description ? description.split('\n') : []);
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.startsWith("•")) {
                html += `
                    <div style="font-size: 14px; line-height: 18px; color: #e0e0e6; display: flex; gap: 8px; margin-bottom: 3px;">
                        <span style="color: ${currentBorderColor}; font-weight: bold;">•</span>
                        <span>${trimmed.substring(1).trim()}</span>
                    </div>`;
            } else if (line.startsWith("  ") || line.startsWith("\t")) {
                html += `<div style="font-size: 14px; line-height: 18px; color: rgba(255, 255, 255, 0.45); padding-left: 16px; margin-bottom: 3px;">${trimmed}</div>`;
            } else {
                html += `<div style="font-size: 14px; line-height: 18px; color: #cccccc; margin-bottom: 3px;">${trimmed}</div>`;
            }
        });

        this.el.innerHTML = html;
        this.el.style.display = 'block';
        this.el.scrollTop = 0; // Сброс скролла при открытии нового перка

        // Плавное появление через CSS-класс
        setTimeout(() => {
            if (this.el) this.el.classList.add('visible');
        }, 10);

        this.updatePosition(x, y);
    }

    /**
     * Рассчитывает позицию тултипа на экране, предотвращая его выход за границы дисплея
     */
    updatePosition(clientX, clientY) {
        if (!this.el) return;

        const paddingOffset = 20; 
        const maxAvailableWidth = window.innerWidth - (paddingOffset * 2);
        this.el.style.maxWidth = `${maxAvailableWidth}px`;

        const tooltipWidth = this.el.offsetWidth;
        const tooltipHeight = this.el.offsetHeight;

        let left = clientX - (tooltipWidth / 2);
        let top = clientY - tooltipHeight - 20;

        // Корректировка по горизонтали
        if (left < paddingOffset) left = paddingOffset;
        if (left + tooltipWidth > window.innerWidth - paddingOffset) left = window.innerWidth - tooltipWidth - paddingOffset;
        
        // Корректировка по вертикали (если не влезает сверху, перекидываем под палец/курсор)
        if (top < paddingOffset) {
            const spaceBelow = window.innerHeight - clientY - paddingOffset;
            if (spaceBelow > tooltipHeight + 20) {
                top = clientY + 20;
            } else {
                top = paddingOffset;
            }
        }

        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
    }

    /**
     * Скрывает тултип с экрана
     */
    hide() {
        if (this.el) {
            this.el.classList.remove('visible');
            this.el.style.display = 'none';
        }
    }
}
