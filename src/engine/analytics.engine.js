/**
 * @fileoverview Motor de Analíticas Financieras (Reportes, Categorías, Historiales).
 */

import { BalanceEngine } from './balance.engine';
import dayjs from 'dayjs';

export const AnalyticsEngine = {
  /**
   * Agrupa los gastos de un periodo por categoría.
   * @param {Array} transactions Lista de transacciones.
   * @param {string} startDate Fecha de inicio (YYYY-MM-DD).
   * @param {string} endDate Fecha de fin (YYYY-MM-DD).
   * @returns {Array} Lista ordenada de gastos por categoría [{ category, amount, percentage }]
   */
  getSpendingByCategory(transactions, startDate, endDate) {
    const periodTx = transactions.filter(t => 
      t.date >= startDate && 
      t.date <= endDate && 
      t.type === 'expense'
    );

    const categoriesMap = new Map();
    let totalExpense = 0;

    periodTx.forEach(tx => {
      const current = categoriesMap.get(tx.category) || 0;
      categoriesMap.set(tx.category, current + tx.amount);
      totalExpense += tx.amount;
    });

    return Array.from(categoriesMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  /**
   * Obtiene la comparativa de ingresos vs gastos.
   * @param {Array} transactions Lista de transacciones.
   * @param {string} startDate Fecha de inicio.
   * @param {string} endDate Fecha de fin.
   * @returns {Object} { income, expense, netSavings, savingsRate }
   */
  getIncomeVsExpense(transactions, startDate, endDate) {
    const periodTx = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    
    let income = 0;
    let expense = 0;

    periodTx.forEach(tx => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });

    const netSavings = income - expense;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    return {
      income,
      expense,
      netSavings,
      savingsRate
    };
  },

  /**
   * Genera el historial mensual del patrimonio de los últimos N meses.
   * @param {Array} seedAssets Lista de activos en el sistema.
   * @param {Array} snapshots Lista de todos los snapshots.
   * @param {Array} transactions Lista de transacciones.
   * @param {number} monthsCount Cantidad de meses hacia atrás a calcular.
   * @returns {Array} Puntos de datos mensuales [{ monthLabel, netWorth, assetsTotal, liabilitiesTotal }]
   */
  getNetWorthHistory(seedAssets, snapshots, transactions, monthsCount = 12) {
    const history = [];
    const today = dayjs();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetMonth = today.subtract(i, 'month');
      const monthEndStr = targetMonth.endOf('month').format('YYYY-MM-DD');
      const monthLabel = targetMonth.format('MMM YYYY');

      const state = BalanceEngine.calculateState(seedAssets, snapshots, transactions, monthEndStr);

      history.push({
        monthLabel,
        netWorth: state.netWorth,
        assetsTotal: state.assetsTotal,
        liabilitiesTotal: state.liabilitiesTotal
      });
    }

    return history;
  }
};
