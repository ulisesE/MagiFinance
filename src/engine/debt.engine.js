/**
 * @fileoverview Motor de Deudas (Cálculo de progreso y simulaciones Bola de Nieve/Avalancha).
 */

export const DebtEngine = {
  /**
   * Calcula el estado actual de una deuda basándose en sus transacciones de pago.
   * @param {Object} debt Deuda individual { id, name, amount, originalAmount, status, notes }
   * @param {Array} payments Transacciones de tipo 'debt_payment' para esta deuda.
   * @returns {Object} Estado de la deuda { remainingAmount, paidAmount, progress, isPaid }
   */
  calculateState(debt, payments) {
    const paidAmount = payments.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Si originalAmount no existe, asumimos que 'amount' es el monto original registrado
    const original = debt.originalAmount || debt.amount;
    const remainingAmount = Math.max(debt.amount - paidAmount, 0);
    
    const isPaid = remainingAmount === 0 || debt.status === 'paid';
    
    let progress = 0;
    if (original > 0) {
      const amountPaidTotal = original - remainingAmount;
      progress = Math.min((amountPaidTotal / original) * 100, 100);
    }

    return {
      remainingAmount,
      paidAmount,
      progress,
      isPaid
    };
  },

  /**
   * Genera recomendaciones de prioridad de pago de deudas.
   * @param {Array} debtsList Lista de deudas activas con sus estados calculados.
   * @returns {Object} Recomendaciones { snowball: Array, avalanche: Array }
   */
  getPaymentPriority(debtsList) {
    const activeDebts = debtsList.filter(d => !d.isPaid);

    // Bola de nieve: Ordenar de menor deuda a mayor deuda (permite victorias psicológicas rápidas)
    const snowball = [...activeDebts].sort((a, b) => a.remainingAmount - b.remainingAmount);

    // Avalancha: En nuestro esquema V1 no tenemos tasa de interés, por lo que ordenamos de mayor a menor saldo para atacar el pasivo más grande
    const avalanche = [...activeDebts].sort((a, b) => b.remainingAmount - a.remainingAmount);

    return {
      snowball,
      avalanche
    };
  }
};
