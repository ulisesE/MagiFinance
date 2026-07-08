/**
 * @fileoverview Motor de Metas Financieras (Cálculo de progreso y proyecciones).
 */

import dayjs from 'dayjs';

export const GoalEngine = {
  /**
   * Procesa el progreso e información analítica de una meta.
   * @param {Object} goal Objeto de meta { id, name, targetAmount, currentAmount, targetDate }
   * @returns {Object} Progreso procesado { percentage, remainingAmount, monthsRemaining, requiredMonthlySaving, isOverdue }
   */
  calculateProgress(goal) {
    const percentage = goal.targetAmount > 0 
      ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
      : 0;

    const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);
    
    if (remainingAmount === 0) {
      return {
        percentage,
        remainingAmount,
        monthsRemaining: 0,
        requiredMonthlySaving: 0,
        isOverdue: false
      };
    }

    const today = dayjs();
    const target = dayjs(goal.targetDate);
    const monthsRemaining = target.diff(today, 'month', true); // Fracción de meses
    const isOverdue = target.isBefore(today) && remainingAmount > 0;

    let requiredMonthlySaving = 0;
    if (monthsRemaining > 0) {
      requiredMonthlySaving = remainingAmount / monthsRemaining;
    } else if (!isOverdue) {
      // Si falta menos de un mes, estimamos el restante directo
      requiredMonthlySaving = remainingAmount;
    }

    return {
      percentage,
      remainingAmount,
      monthsRemaining: Math.max(Math.ceil(monthsRemaining), 0),
      requiredMonthlySaving,
      isOverdue
    };
  }
};
