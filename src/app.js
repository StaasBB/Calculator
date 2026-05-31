import { PerkTree } from './core/PerkTree.js';
import { CanvasRender } from './rendering/CanvasRender.js';
import { VersionSelector } from './rendering/VersionSelector.js';
import { InputController } from './core/InputController.js';
import { DependencyChecker } from './utils/DependencyChecker.js';
import { BuildExporter } from './storage/BuildExporter.js';
import { BuildSaver } from './storage/BuildSaver.js';
import { ProfileManager } from './storage/ProfileManager.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const renderer = new CanvasRender(canvas, ctx);

// Глобальное состояние приложения
let state = {
    activeTree: null,
    allTrees: [],
    currentVersion: ""
};

// Функция рендера вынесена наверх, чтобы быть доступной всем менеджерам без конфликтов областей видимости
function render() {
    if (renderer && state.activeTree) {
        renderer.render(state.activeTree, state.allTrees);
    }
}


/**
 * Динамически загружает любой JSON-файл версии из Чеккера/Селектора
 */
async function loadVersion(jsonUrl, selectorInstance = null) {
    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`Ошибка загрузки версии: ${response.status}`);
        const data = await response.json();

        // 1. Инициализируем структуры данных веток из вложенного массива (СТРОГО после получения данных)
        state.currentVersion = data.version || "RFAB SE XI | Prime Edition [ver. 17.03.2026]";
        state.allTrees = data.trees.map(t => new PerkTree(t));
        
        // ИСПРАВЛЕНО НАМЕРТВО: Фокусируемся СТРОГО на первой конкретной ветке из массива (индекс 0), 
        // чтобы Canvas не пытался рисовать весь массив веток разом и не устраивал хаос на холсте!
        state.activeTree = state.allTrees[0] || null;

        // 2. ВЫЧИСЛЯЕМ ПОЛНУЮ ВЕРСИЮ БЕЗ ДАТЫ (для пунктов кастомного выпадающего списка)
        let fullWithoutDate = state.currentVersion;
        if (fullWithoutDate.includes('[')) {
            // ИСПРАВЛЕНО: Сначала берем нулевой элемент массива строк после сплита [0], 
            // и только ПОТОМ применяем к этой строке метод .trim()!
            fullWithoutDate = fullWithoutDate.split('[')[0].trim();
        }
        state.fullVersionWithoutDate = fullWithoutDate;

        // 3. БЕРЕМ КОРОТКУЮ ВЕРСИЮ НАПРЯМУЮ ИЗ JSON (для названия на самой кнопке)
        state.shortVersion = data.shortVersion || "Prime Edition";

        // Если нам передан экземпляр селектора — просим его мгновенно обновить короткий текст на кнопке
        if (selectorInstance) {
            selectorInstance.updateButtonText(state.shortVersion);
        }

        // Загружаем билд: Ссылка из URL в приоритете, если пустая берем LocalStorage
        const urlHash = BuildExporter.getHashFromUrl();
        if (urlHash) {
            BuildExporter.applyGlobalHash(state.allTrees, urlHash);
        } else {
            BuildSaver.loadFromLocalStorage(state.allTrees);
        }
        
        const urlNote = BuildExporter.getNoteFromUrl();
        if (urlNote && state.notesManager) {
            state.notesManager.setExternalNote(urlNote);
        }
        
        // Валидируем связи на случай битых или устаревших сохранений
        state.allTrees.forEach(tree => DependencyChecker.validate(tree));

        // Отрисовываем обновленный кадр на холсте
        render();

    } catch (error) {
        console.error("Ошибка при динамической смене версии сборки:", error);
        alert("Не удалось загрузить данные выбранной версии сборки!");
    }
}



/**
 * Главная точка старта приложения
 */
async function init() {
    try {
        // Инициализируем полностью автономный класс выбора версий.
        // Он сам загрузит манифест versions.json, считает кэш памяти и вызовет loadVersion!
        const versionSelector = new VersionSelector(async (selectedJsonUrl) => {
            if (renderer && renderer.tooltipSystem) {
                renderer.tooltipSystem.hide();
            }
            await loadVersion(selectedJsonUrl, versionSelector);
        });

        // Инициализируем контроллеры ввода и профилей слотов (создаются ОДИН раз при старте)
        new InputController(canvas, state, renderer, render);
        new ProfileManager(state, render);

    } catch (error) {
        console.error("Критическая ошибка инициализации калькулятора перков:", error);
    }
}

window.addEventListener('DOMContentLoaded', init);


// Запускаем приложение только после полной загрузки DOM дерева браузером
window.addEventListener('DOMContentLoaded', init);
