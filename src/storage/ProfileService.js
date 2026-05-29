import { BuildExporter } from './BuildExporter.js';

/**
 * Класс ProfileService (Бэкенд-слой / Модель)
 * Отвечает за логику работы со слотами профилей в LocalStorage.
 * Оперирует исключительно чистыми данными и массивами.
 */
export class ProfileService {
    constructor() {
        this.slotPrefix = 'rfab_profile_slot_';
    }

    /**
     * Возвращает динамический список слотов с гарантированным одним пустым слотом на конце
     */
    getSlotsList() {
        const slots = [];
        let maxFoundIndex = 3; 

        // Ищем максимальный заполненный индекс в LocalStorage
        for (let i = 1; i < 100; i++) {
            if (localStorage.getItem(`${this.slotPrefix}${i}`)) {
                if (i > maxFoundIndex) maxFoundIndex = i;
            }
        }

        // Наполняем массив текущими данными
        for (let i = 1; i <= maxFoundIndex; i++) {
            const rawData = localStorage.getItem(`${this.slotPrefix}${i}`);
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

        // Если все текущие слоты заняты — ВСЕГДА создаем ОДИН следующий пустой слот в самом конце
        const hasAnyEmptySlot = slots.some(s => s.data === null);
        if (!hasAnyEmptySlot) {
            slots.push({ id: slots.length + 1, data: null });
        }

        // Обрезаем лишние хвосты, но сохраняем один пустой слот на конце
        if (slots.length > 3) {
            let lastFilledIndex = -1;
            for (let i = slots.length - 1; i >= 0; i--) {
                if (slots[i].data !== null) {
                    lastFilledIndex = i;
                    break;
                }
            }
            if (lastFilledIndex < 3) {
                return slots.slice(0, 4);
            } else {
                return slots.slice(0, lastFilledIndex + 2);
            }
        }
        return slots;
    }

    /**
     * Записывает данные сборки в конкретный слот
     */
    saveSlot(slotId, name, allTrees) {
        const compressedBuildHash = BuildExporter.generateGlobalHash(allTrees);
        const saveData = {
            name: name || `Билд ${slotId}`,
            build: compressedBuildHash
        };
        localStorage.setItem(`${this.slotPrefix}${slotId}`, JSON.stringify(saveData));
    }

    /**
     * Удаляет профиль из памяти
     */
    deleteSlot(slotId) {
        localStorage.removeItem(`${this.slotPrefix}${slotId}`);
    }
}
