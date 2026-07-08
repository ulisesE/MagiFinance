/**
 * @fileoverview Controlador de la página de Analíticas y Gráficas detalladas.
 */

import { Queries } from '../storage/queries';
import { AnalyticsEngine } from '../engine/analytics.engine';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';

let categoryChartInstance = null;
let barChartInstance = null;

/**
 * Renderiza la vista de Analíticas y Reportes.
 * @param {HTMLElement} container Contenedor del DOM.
 */
export async function renderAnalytics(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
      <div class="text-title-medium" style="color: var(--md-sys-color-primary);">Calculando reportes y distribuciones...</div>
    </div>
  `;

  try {
    const txs = await Queries.getTransactions();

    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header & Filter -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 16px 24px;">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">REPORTES AVANZADOS</span>
            <h1 class="text-headline-medium" style="font-weight: 700;">Gráficas e Ingresos</h1>
          </div>
          <div>
            <select id="analytics-timeframe" class="form-control" style="background-color: var(--md-sys-color-surface)">
              <option value="current-month">Este Mes</option>
              <option value="last-month">Mes Anterior</option>
              <option value="last-3-months" selected>Últimos 3 Meses</option>
              <option value="last-6-months">Últimos 6 Meses</option>
            </select>
          </div>
        </div>

        <!-- Graphs Grid -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 24px; @media (min-width: 992px) { grid-template-columns: 1fr 1fr; }">
          
          <!-- Category Spending Card -->
          <div class="card flex-column gap-md">
            <h2 class="text-title-large">Gastos por Categoría</h2>
            <div id="category-chart-wrapper" style="position: relative; height: 260px; width: 100%;">
              <canvas id="category-chart"></canvas>
            </div>
            <div id="category-legend" class="flex-column gap-xs" style="max-height: 150px; overflow-y: auto;">
              <!-- Leyenda inyectada dinámicamente -->
            </div>
          </div>

          <!-- Income vs Expenses Card -->
          <div class="card flex-column gap-md">
            <h2 class="text-title-large">Comparativa Mensual</h2>
            <div id="bar-chart-wrapper" style="position: relative; height: 260px; width: 100%;">
              <canvas id="bar-chart"></canvas>
            </div>
            <div id="savings-summary-area" class="flex-column gap-sm">
              <!-- Resumen inyectado dinámicamente -->
            </div>
          </div>

        </div>

      </div>
    `;

    const timeframeSelect = document.getElementById('analytics-timeframe');
    timeframeSelect.addEventListener('change', () => {
      updateCharts(txs, timeframeSelect.value);
    });

    // Cargar charts por primera vez
    updateCharts(txs, timeframeSelect.value);

  } catch (error) {
    console.error('Error al cargar analíticas:', error);
    container.innerHTML = `
      <div class="card flex-column align-center gap-md">
        <span class="icon" style="color: var(--md-sys-color-error); font-size: 48px;">error</span>
        <h2>Error al generar analíticas</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Actualiza las gráficas basándose en el periodo seleccionado.
 */
function updateCharts(transactions, timeframe) {
  let startDate, endDate;
  const today = dayjs();

  switch (timeframe) {
    case 'current-month':
      startDate = today.startOf('month').format('YYYY-MM-DD');
      endDate = today.endOf('month').format('YYYY-MM-DD');
      break;
    case 'last-month':
      startDate = today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      endDate = today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
      break;
    case 'last-3-months':
      startDate = today.subtract(2, 'month').startOf('month').format('YYYY-MM-DD');
      endDate = today.endOf('month').format('YYYY-MM-DD');
      break;
    case 'last-6-months':
      startDate = today.subtract(5, 'month').startOf('month').format('YYYY-MM-DD');
      endDate = today.endOf('month').format('YYYY-MM-DD');
      break;
  }

  // 1. Gastos por categoría
  const categoryData = AnalyticsEngine.getSpendingByCategory(transactions, startDate, endDate);
  renderCategoryChart(categoryData);

  // 2. Ingresos vs Gastos
  const comparisonData = AnalyticsEngine.getIncomeVsExpense(transactions, startDate, endDate);
  renderComparisonChart(comparisonData, timeframe);
}

/**
 * Gráfico de Dona para categorías.
 */
function renderCategoryChart(data) {
  const wrapper = document.getElementById('category-chart-wrapper');
  const legendArea = document.getElementById('category-legend');
  if (!wrapper || !legendArea) return;

  // Limpiar instancia anterior
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }

  if (data.length === 0) {
    legendArea.innerHTML = '';
    wrapper.innerHTML = `
      <div class="flex-column align-center justify-center gap-xs" style="height: 100%; text-align: center; color: var(--md-sys-color-outline); padding: 20px 0;">
        <span class="icon" style="font-size: 48px; color: var(--md-sys-color-outline-variant);">pie_chart</span>
        <p class="text-body-medium" style="margin: 0;">No hay gastos registrados en este periodo.</p>
      </div>
    `;
    return;
  }

  // Restaurar canvas
  wrapper.innerHTML = '<canvas id="category-chart"></canvas>';
  const ctx = document.getElementById('category-chart');

  const labels = data.map(item => item.category);
  const amounts = data.map(item => item.amount);

  // Paleta de colores M3
  const palette = [
    '#006c47', '#3d6373', '#ba1a1a', '#ed6c02', '#0288d1', 
    '#9c27b0', '#673ab7', '#e91e63', '#ffeb3b', '#4caf50'
  ];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: amounts,
        backgroundColor: palette.slice(0, data.length),
        borderWidth: 2,
        borderColor: 'var(--md-sys-color-surface)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false } // Usaremos leyenda personalizada
      }
    }
  });

  // Renderizar la leyenda interactiva
  legendArea.innerHTML = data.map((item, idx) => {
    const col = palette[idx % palette.length];
    return `
      <div class="flex-row justify-between align-center" style="font-size: 0.875rem; padding: 4px 0;">
        <div class="flex-row align-center gap-sm">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${col};"></span>
          <span>${item.category}</span>
        </div>
        <strong>$${item.amount.toLocaleString()} (${item.percentage.toFixed(1)}%)</strong>
      </div>
    `;
  }).join('');
}

/**
 * Gráfico de barras para comparar Ingresos y Egresos.
 */
function renderComparisonChart(data, timeframe) {
  const wrapper = document.getElementById('bar-chart-wrapper');
  const summaryArea = document.getElementById('savings-summary-area');
  if (!wrapper || !summaryArea) return;

  if (barChartInstance) {
    barChartInstance.destroy();
    barChartInstance = null;
  }

  const hasData = data.income > 0 || data.expense > 0;

  if (!hasData) {
    wrapper.innerHTML = `
      <div class="flex-column align-center justify-center gap-xs" style="height: 100%; text-align: center; color: var(--md-sys-color-outline); padding: 20px 0;">
        <span class="icon" style="font-size: 48px; color: var(--md-sys-color-outline-variant);">bar_chart</span>
        <p class="text-body-medium" style="margin: 0;">No hay ingresos ni egresos en este periodo.</p>
      </div>
    `;
    summaryArea.innerHTML = `
      <div style="padding: 12px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-md); text-align: center; color: var(--md-sys-color-outline); font-size: 0.875rem;">
        Registra transacciones de ingresos o gastos para visualizar esta comparativa.
      </div>
    `;
    return;
  }

  // Restaurar canvas
  wrapper.innerHTML = '<canvas id="bar-chart"></canvas>';
  const ctx = document.getElementById('bar-chart');

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        label: 'Monto ($)',
        data: [data.income, data.expense],
        backgroundColor: [
          '#006c47', // Income (Primary verde)
          '#ba1a1a'  // Expense (Rojo M3)
        ],
        borderRadius: 8,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: { color: 'var(--md-sys-color-on-background)' },
          grid: { color: 'var(--md-sys-color-outline-variant)' }
        },
        x: {
          ticks: { color: 'var(--md-sys-color-on-background)' }
        }
      }
    }
  });

  // Resumen textual
  const savingsClass = data.netSavings >= 0 ? 'text-income' : 'text-expense';
  const actionText = data.netSavings >= 0 ? 'guardado' : 'deficitario';

  summaryArea.innerHTML = `
    <div style="padding: 12px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-md);" class="flex-column gap-xs">
      <div class="flex-row justify-between text-body-medium">
        <span>Ingresos Totales:</span>
        <strong style="color: var(--color-income);">$${data.income.toLocaleString()}</strong>
      </div>
      <div class="flex-row justify-between text-body-medium">
        <span>Gastos Totales:</span>
        <strong style="color: var(--color-expense);">$${data.expense.toLocaleString()}</strong>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--md-sys-color-outline-variant); margin: 6px 0;" />
      <div class="flex-row justify-between text-body-large" style="font-weight: 600;">
        <span>Resultado Neto:</span>
        <span class="${savingsClass}">$${data.netSavings.toLocaleString()}</span>
      </div>
      <div class="text-body-small" style="color: var(--md-sys-color-outline); margin-top: 4px; text-align: center;">
        Tasa de Ahorro: ${data.savingsRate.toFixed(1)}% (${actionText})
      </div>
    </div>
  `;
}
