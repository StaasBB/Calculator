export class TooltipSystem {
    constructor() {
        this.el = null;
        this.initDOM();
    }

    initDOM() {
        if (document.getElementById('calculator-tooltip')) return;
        const tooltip = document.createElement('div');
        tooltip.id = 'calculator-tooltip';
        document.body.appendChild(tooltip);
        this.el = tooltip;

        // ПЕРЕХВАТ КОЛЕСИКА (Для ПК): скроллим JS-скриптом сквозь pointer-events: none
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

        // ДОБАВЛЕНО ДЛЯ ТЕЛЕФОНОВ: Тап по самому тултипу мгновенно скрывает его,
        // освобождая экран для дальнейшей работы с калькулятором
        tooltip.addEventListener('touchend', (e) => {
            this.hide();
            // Останавливаем всплытие, чтобы тап по тултипу случайно не кликнул под него в канвас
            e.stopPropagation(); 
        });
    }




    show(x, y, text, subtextArray, borderColor) {
        if (!this.el) this.initDOM();

        const currentBorderColor = borderColor || 'rgba(235, 94, 40, 0.75)';
        this.el.style.border = `1.5px solid ${currentBorderColor}`;
        this.el.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.7), 0 0 8px ${currentBorderColor}`;

        let html = `<div style="font-weight: bold; font-size: 20px; color: #f5f5f7; margin-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 6px;">${text}</div>`;
        
        const lines = Array.isArray(subtextArray) ? subtextArray : (subtextArray ? subtextArray.split('\n') : []);
        
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
        
        // Сбрасываем ползунок скролла тултипа в самый верх при открытии нового перка
        this.el.scrollTop = 0;

        setTimeout(() => {
            if (this.el) this.el.classList.add('visible');
        }, 10);

        this.updatePosition(x, y);
    }

    updatePosition(clientX, clientY) {
        if (!this.el) return;

        const paddingOffset = 20; 
        const maxAvailableWidth = window.innerWidth - (paddingOffset * 2);
        this.el.style.maxWidth = `${maxAvailableWidth}px`;

        const tooltipWidth = this.el.offsetWidth;
        const tooltipHeight = this.el.offsetHeight;

        let left = clientX - (tooltipWidth / 2);
        let top = clientY - tooltipHeight - 20;

        if (left < paddingOffset) left = paddingOffset;
        if (left + tooltipWidth > window.innerWidth - paddingOffset) left = window.innerWidth - tooltipWidth - paddingOffset;
        
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

    hide() {
        if (this.el) {
            this.el.classList.remove('visible');
            this.el.style.display = 'none';
        }
    }
    render() {}
}
