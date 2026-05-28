import { DependencyChecker } from '../utils/DependencyChecker.js';

/**
 * Класс PerkStatePredictor (Бэкенд-слой / Презентер)
 * Отвечает исключительно за подготовку данных прогноза для фронтенда.
 * Запрашивает чистые расчеты графов у DependencyChecker и переводит их в строки интерфейса.
 */
export class PerkStatePredictor {
    
    /**
     * Анализирует перк и возвращает готовый объект прогноза для TooltipView и CanvasRender
     */
    static predictAction(tree, node) {
        if (!tree || !node) {
            return {
                actionType: 'none',
                count: 0,
                displayString: null,
                chainIds: []
            };
        }

        // --- ЛОГИКА ДЕАКТИВАЦИИ (Сброс перка) ---
        if (node.isActive) {
            // Запрашиваем расчет путей у Чеккера
            const dangerChainIds = DependencyChecker.getDeactivationChainIds(tree, node);
            const deactivations = dangerChainIds.length;

            return {
                actionType: 'deactivate',
                count: deactivations,
                displayString: deactivations > 0 ? `-${deactivations}` : null,
                chainIds: dangerChainIds
            };
        } 
        
        // --- ЛОГИКА АКТИВАЦИИ (Покупка перка) ---
        else {
            // Запрашиваем расчет путей у Чеккера
            const activationChainIds = DependencyChecker.getActivationChainIds(tree, node);
            
            // Считаем, сколько из этих нод реально изменят статус (были неактивными)
            const activationsCount = activationChainIds.filter(id => {
                const n = tree.getNodeById(id);
                return n ? !n.isActive : true;
            }).length;

            return {
                actionType: 'activate',
                count: activationsCount,
                displayString: activationsCount > 0 ? `+${activationsCount}` : null,
                chainIds: activationChainIds
            };
        }
    }
}
