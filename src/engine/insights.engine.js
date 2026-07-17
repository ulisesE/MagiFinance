/**
 * @fileoverview Motor de Insights basado en reglas y heurísticas financieras.
 */

import dayjs from 'dayjs';

export const InsightsEngine = {
  /**
   * Genera observaciones y consejos financieros basados en el estado actual.
   * @param {Object} currentMonth Actividad del mes actual { income, expense, netSavings, savingsRate }
   * @param {Object} prevMonth Actividad del mes anterior { income, expense, netSavings, savingsRate }
   * @param {number} netWorth Patrimonio neto actual.
   * @param {number} prevNetWorth Patrimonio neto del mes anterior.
   * @param {number} liquidAssets Activos líquidos disponibles.
   * @param {Array} [liabilities] Arreglo de pasivos actuales.
   * @param {Array} [debts] Arreglo de deudas activas.
   * @param {string} [targetDate] Fecha actual para evaluar vencimientos.
   * @param {Array} [transactions] Historial de transacciones para calcular abonos a tarjetas.
   * @returns {Array} Colección de observaciones [{ type, title, description }]
   */
  generate(currentMonth, prevMonth, netWorth, prevNetWorth, liquidAssets, liabilities = [], debts = [], targetDate = '', transactions = []) {
    const insights = [];

    // Rule 1: Ahorro positivo vs negativo
    if (currentMonth.netSavings < 0) {
      insights.push({
        type: 'warning',
        title: 'Presupuesto Deficitario',
        description: `Este mes has gastado $${Math.abs(currentMonth.netSavings).toLocaleString()} más de lo que ingresaste. Revisa tus gastos no esenciales.`
      });
    } else if (currentMonth.savingsRate >= 20) {
      insights.push({
        type: 'success',
        title: 'Excelente Tasa de Ahorro',
        description: `Estás ahorrando el ${currentMonth.savingsRate.toFixed(1)}% de tus ingresos. Superas la regla de oro del 20%.`
      });
    } else if (currentMonth.savingsRate > 0) {
      insights.push({
        type: 'info',
        title: 'Tasa de Ahorro Moderada',
        description: `Estás ahorrando el ${currentMonth.savingsRate.toFixed(1)}% de tus ingresos. Intenta ajustar suscripciones para llegar al 20%.`
      });
    }

    // Rule 2: Comparativa de gastos vs mes anterior
    if (prevMonth && prevMonth.expense > 0) {
      const expenseDiff = ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100;
      if (expenseDiff > 10) {
        insights.push({
          type: 'warning',
          title: 'Incremento en Gastos',
          description: `Tus gastos subieron un ${expenseDiff.toFixed(1)}% comparado con el mes anterior ($${currentMonth.expense.toLocaleString()} vs $${prevMonth.expense.toLocaleString()}).`
        });
      } else if (expenseDiff < -10) {
        insights.push({
          type: 'success',
          title: 'Reducción de Gastos',
          description: `¡Felicidades! Lograste reducir tus gastos un ${Math.abs(expenseDiff).toFixed(1)}% con respecto al mes pasado.`
        });
      }
    }

    // Rule 3: Evolución de Patrimonio
    if (prevNetWorth > 0) {
      const nwDiff = ((netWorth - prevNetWorth) / prevNetWorth) * 100;
      if (nwDiff > 0) {
        insights.push({
          type: 'success',
          title: 'Crecimiento de Patrimonio',
          description: `Tu patrimonio neto aumentó un ${nwDiff.toFixed(1)}% desde el snapshot anterior.`
        });
      } else if (nwDiff < 0) {
        insights.push({
          type: 'warning',
          title: 'Contracción de Patrimonio',
          description: `Tu patrimonio neto se redujo un ${Math.abs(nwDiff).toFixed(1)}% debido a aumentos en pasivos o depreciación.`
        });
      }
    }

    // Rule 4: Cobertura del Fondo de Emergencia
    if (currentMonth.expense > 0) {
      const monthsCovered = liquidAssets / currentMonth.expense;
      if (monthsCovered >= 6) {
        insights.push({
          type: 'success',
          title: 'Fondo de Emergencia Sólido',
          description: `Tus activos líquidos ($${liquidAssets.toLocaleString()}) cubren más de 6 meses de tus gastos promedio actuales.`
        });
      } else if (monthsCovered >= 3) {
        insights.push({
          type: 'info',
          title: 'Fondo de Emergencia Adecuado',
          description: `Tienes cobertura para ${monthsCovered.toFixed(1)} meses de gastos. Estás en la zona segura recomendada.`
        });
      } else {
        insights.push({
          type: 'warning',
          title: 'Fondo de Emergencia Bajo',
          description: `Tus reservas líquidas cubren menos de 3 meses de gastos (${monthsCovered.toFixed(1)} meses). Prioriza capitalizar este fondo.`
        });
      }
    }

    // Rule 5: Vencimiento de Tarjeta de Crédito Cercano
    let totalTdcRemainingPayment = 0;
    if (targetDate && liabilities.length > 0) {
      const todayDate = dayjs(targetDate);
      liabilities.forEach(l => {
        if (l.type === 'liability_credit') {
          // Calcular el saldo restante para no generar intereses posterior al corte
          const payments = transactions.filter(t => 
            t.date > (l.statementDate || '0000-00-00') &&
            t.date <= targetDate &&
            (
              (t.type === 'transfer' && t.destinationAssetId === l.id) ||
              ((t.type === 'income' || t.type === 'debt_payment') && t.assetId === l.id)
            )
          );
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          const remainingToAvoidInterest = Math.max(0, (l.statementBalance || 0) - totalPaid);
          totalTdcRemainingPayment += remainingToAvoidInterest;

          if (remainingToAvoidInterest > 0 && l.paymentDueDate) {
            const dueDate = dayjs(l.paymentDueDate);
            const diffDays = dueDate.diff(todayDate, 'day');
            if (diffDays >= 0 && diffDays <= 7) {
              insights.push({
                type: 'warning',
                title: 'Vencimiento de Tarjeta Cercano',
                description: `Tu tarjeta "${l.name}" tiene un pago pendiente para no generar intereses de $${remainingToAvoidInterest.toLocaleString()} que vence en ${diffDays} días (${l.paymentDueDate}).`
              });
            }
          }
        }
      });
    }

    // Rule 6: Riesgo de Liquidez (TDC vs Efectivo)
    if (totalTdcRemainingPayment > liquidAssets) {
      insights.push({
        type: 'warning',
        title: 'Riesgo de Liquidez',
        description: `El pago para no generar intereses de tus tarjetas ($${totalTdcRemainingPayment.toLocaleString()}) supera tu Liquidez Real ($${liquidAssets.toLocaleString()}). Evita comprometer más efectivo.`
      });
    }

    // Rule 7: Endeudamiento Elevado
    const totalLiabilitiesSum = liabilities.reduce((sum, l) => sum + Math.abs(l.balance), 0);
    const calculatedAssetsTotal = netWorth + totalLiabilitiesSum;
    if (calculatedAssetsTotal > 0) {
      const debtRatio = (totalLiabilitiesSum / calculatedAssetsTotal) * 100;
      if (debtRatio > 40) {
        insights.push({
          type: 'warning',
          title: 'Alto Nivel de Endeudamiento',
          description: `Tus pasivos representan el ${debtRatio.toFixed(0)}% de tus activos totales ($${calculatedAssetsTotal.toLocaleString()}). Te recomendamos amortizar deudas.`
        });
      }
    }

    return insights;
  }
};
