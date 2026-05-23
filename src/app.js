import { PerkTree } from './core/PerkTree.js';
import { CanvasRender } from './rendering/CanvasRender.js';
import { InputManager } from './core/InputManager.js';
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
    allTrees: []
};

// ОПТИМИЗАЦИЯ: Функция рендера вынесена наверх, чтобы быть доступной всем менеджерам без конфликтов областей видимости
function render() {
    if (renderer && state.activeTree) {
        renderer.render(state.activeTree, state.allTrees);
    }
}

async function init() {
    try {
        // 1. Загружаем JSON с перками
        const response = await fetch('./src/data/perks.json');
        if (!response.ok) throw new Error(`Ошибка загрузки JSON: ${response.status}`);
        const data = await response.json();

        // 2. Инициализируем структуры данных веток (СТРОГО после получения данных)
        state.allTrees = data.trees.map(t => new PerkTree(t));
        state.activeTree = state.allTrees[0] || null; // По дефолту первая ветка

        // 3. Загружаем билд: Ссылка из URL в приоритете, если пустая — берем LocalStorage
        const urlHash = BuildExporter.getHashFromUrl();
        if (urlHash) {
            BuildExporter.applyGlobalHash(state.allTrees, urlHash);
        } else {
            BuildSaver.loadFromLocalStorage(state.allTrees);
        }
        
        // Валидируем связи на случай битых или устаревших сохранений
        state.allTrees.forEach(tree => DependencyChecker.validate(tree));

        // 4. Инициализируем менеджер ввода (клики по Canvas, ховеры, тултипы)
        new InputManager(canvas, state, renderer, render);

        // 5. Инициализируем менеджер профилей (кнопки ЗАГРУЗИТЬ / СОХРАНИТЬ в Сайдбаре)
        new ProfileManager(state, render);

        // Финальный первичный кадр при успешном старте
        render();

    } catch (error) {
        console.error("Критическая ошибка инициализации калькулятора перков:", error);
    }
}

// Запускаем приложение только после полной загрузки DOM дерева браузером
window.addEventListener('DOMContentLoaded', init);
