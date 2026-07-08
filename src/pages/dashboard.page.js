/**
 * @fileoverview Controlador de la página del Dashboard principal.
 */

import { Queries } from '../storage/queries';
import { DialogManager } from '../utils/dialog';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';

/**
 * Renderiza el Dashboard financiero.
 * @param {HTMLElement} container Contenedor donde renderizar.
 */
export async function renderDashboard(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
      <div class="text-title-medium" style="color: var(--md-sys-color-primary);">Cargando tu libro contable...</div>
    </div>
  `;

  try {
    const data = await Queries.getDashboardData();
    const { state, previousNetWorth, currentMonthStats, insights, history } = data;

    // Calcular variación
    const nwVariation = state.netWorth - previousNetWorth;
    const nwVariationPercent = previousNetWorth > 0 ? (nwVariation / previousNetWorth) * 100 : 0;
    const variationClass = nwVariation >= 0 ? 'text-income' : 'text-expense';
    const variationIcon = nwVariation >= 0 ? 'trending_up' : 'trending_down';
    const variationText = `${nwVariation >= 0 ? '+' : ''}$${nwVariation.toLocaleString()} (${nwVariationPercent.toFixed(1)}% vs mes anterior)`;

    // Separar activos y pasivos para mostrar
    const liquidAssets = state.assets.filter(a => a.type === 'liquid');
    const savingsAssets = state.assets.filter(a => a.type === 'savings');
    const investmentAssets = state.assets.filter(a => a.type === 'investment');
    const fixedAssets = state.assets.filter(a => a.type === 'fixed');
    
    // Contenido HTML de la página
    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Welcome banner -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 24px; border-radius: var(--border-radius-xl);">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">RESUMEN GENERAL</span>
            <h1 class="text-display-small" style="font-weight: 800;">$${state.netWorth.toLocaleString()}</h1>
            <div class="flex-row align-center gap-xs ${variationClass}" style="font-weight: 500; font-size: 0.875rem;">
              <span class="icon" style="font-size: 18px;">${variationIcon}</span>
              <span>${variationText}</span>
            </div>
          </div>
          <div class="flex-row gap-sm">
            <button id="quick-add-tx" class="btn btn-primary">
              <span class="icon">add</span> Nuevo Movimiento
            </button>
          </div>
        </div>

        <!-- KPIs Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
          
          <div class="card flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Activos Totales</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-income);">$${state.assetsTotal.toLocaleString()}</span>
          </div>

          <div class="card flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Pasivos Totales</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-expense);">$${state.liabilitiesTotal.toLocaleString()}</span>
          </div>

          <div class="card flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Liquidez Neta</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--md-sys-color-primary);">$${state.liquidNetWorth.toLocaleString()}</span>
          </div>

          <div class="card flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Ahorro de este Mes</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-transfer);">$${currentMonthStats.netSavings.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">${currentMonthStats.savingsRate.toFixed(1)}% tasa</span>
          </div>

        </div>

        <!-- Charts and Breakdown -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 24px; @media (min-width: 992px) { grid-template-columns: 2fr 1fr; }">
          
          <!-- Net Worth History Card -->
          <div class="card flex-column gap-md">
            <h2 class="text-title-large">Evolución de Patrimonio</h2>
            <div style="position: relative; height: 260px; width: 100%;">
              <canvas id="networth-chart"></canvas>
            </div>
          </div>

          <!-- Assets distribution or Insights -->
          <div class="card flex-column gap-md">
            <h2 class="text-title-large">Distribución de Activos</h2>
            <div class="flex-column gap-sm">
              <div class="flex-row justify-between text-body-medium">
                <span>Líquidos (Efectivo/Corriente)</span>
                <strong>$${liquidAssets.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</strong>
              </div>
              <div class="flex-row justify-between text-body-medium">
                <span>Ahorros (Cajitas/Plazos)</span>
                <strong>$${savingsAssets.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</strong>
              </div>
              <div class="flex-row justify-between text-body-medium">
                <span>Inversiones (Bolsa/Cripto)</span>
                <strong>$${investmentAssets.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</strong>
              </div>
              <div class="flex-row justify-between text-body-medium">
                <span>Activos Fijos (Bienes/Auto)</span>
                <strong>$${fixedAssets.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</strong>
              </div>
            </div>
            <hr style="border: 0; border-top: 1px solid var(--md-sys-color-outline-variant);" />
            <h3 class="text-title-small">Pasivos</h3>
            <div class="flex-column gap-xs">
              <div class="flex-row justify-between text-body-small">
                <span>Tarjetas de Crédito</span>
                <strong>$${state.assets.filter(a => a.type === 'liability_credit').reduce((sum, a) => sum + Math.abs(a.balance), 0).toLocaleString()}</strong>
              </div>
              <div class="flex-row justify-between text-body-small">
                <span>Préstamos / Deudas</span>
                <strong>$${state.assets.filter(a => a.type === 'liability_debt').reduce((sum, a) => sum + Math.abs(a.balance), 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>

        </div>

        <!-- Insights Module -->
        <div class="card flex-column gap-md">
          <h2 class="text-title-large flex-row align-center gap-xs">
            <span class="icon" style="color: var(--md-sys-color-primary);">lightbulb</span>
            Observaciones del Mes (Insights)
          </h2>
          <div class="flex-column gap-sm">
            ${insights.length === 0 
              ? '<p class="text-body-medium" style="color: var(--md-sys-color-outline)">Carga más datos o registra transacciones para activar el motor de insights.</p>' 
              : insights.map(ins => {
                  let borderCol = 'var(--md-sys-color-outline-variant)';
                  let icon = 'info';
                  if (ins.type === 'success') { borderCol = 'var(--color-income)'; icon = 'check_circle'; }
                  if (ins.type === 'warning') { borderCol = 'var(--color-expense)'; icon = 'warning'; }
                  
                  return `
                    <div class="flex-row align-center gap-md" style="padding: 12px 16px; border-left: 4px solid ${borderCol}; background-color: var(--md-sys-color-surface-variant); border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;">
                      <span class="icon" style="color: ${borderCol};">${icon}</span>
                      <div class="flex-column gap-xs">
                        <span class="text-title-small">${ins.title}</span>
                        <span class="text-body-small" style="color: var(--md-sys-color-on-surface-variant);">${ins.description}</span>
                      </div>
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>

      </div>
    `;

    // Hook up button
    document.getElementById('quick-add-tx').addEventListener('click', () => {
      openNewTransactionDialog();
    });

    // Renderizar gráfico
    renderChart(history);

  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    container.innerHTML = `
      <div class="card flex-column align-center gap-md">
        <span class="icon" style="color: var(--md-sys-color-error); font-size: 48px;">error</span>
        <h2>Error al cargar datos financieros</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Configura y renderiza el gráfico de evolución patrimonial.
 */
function renderChart(history) {
  const ctx = document.getElementById('networth-chart');
  if (!ctx) return;

  const labels = history.map(h => h.monthLabel);
  const netWorths = history.map(h => h.netWorth);
  const assets = history.map(h => h.assetsTotal);
  const liabilities = history.map(h => h.liabilitiesTotal);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Patrimonio Neto',
          data: netWorths,
          borderColor: '#006c47',
          backgroundColor: 'rgba(0, 108, 71, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 3
        },
        {
          label: 'Activos',
          data: assets,
          borderColor: '#0288d1',
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false
        },
        {
          label: 'Pasivos',
          data: liabilities,
          borderColor: '#d32f2f',
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'var(--md-sys-color-on-background)'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'var(--md-sys-color-on-background)' },
          grid: { display: false }
        },
        y: {
          ticks: { color: 'var(--md-sys-color-on-background)' },
          grid: { color: 'var(--md-sys-color-outline-variant)' }
        }
      }
    }
  });
}

/**
 * Abre el diálogo para registrar un nuevo movimiento manual.
 */
async function openNewTransactionDialog() {
  const assets = await Queries.getAssets();
  const debts = await Queries.getDebtsWithProgress();

  const optionsHtml = assets.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  const debtOptionsHtml = debts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

  const dialogHtml = `
    <h2 class="text-title-large">Registrar Nuevo Movimiento</h2>
    <form id="new-tx-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Fecha</label>
        <input type="date" id="tx-date" class="form-control" value="${dayjs().format('YYYY-MM-DD')}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Tipo de Movimiento</label>
        <select id="tx-type" class="form-control" required>
          <option value="expense">Gasto (Egreso)</option>
          <option value="income">Ingreso</option>
          <option value="transfer">Transferencia entre Activos</option>
          <option value="debt_payment">Pago de Deuda</option>
          <option value="adjustment">Ajuste de Saldo Directo</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Activo de Origen (Cuenta)</label>
        <select id="tx-asset" class="form-control" required>
          ${optionsHtml}
        </select>
      </div>

      <div class="form-group" id="dest-asset-group" style="display: none;">
        <label class="form-label">Activo de Destino (Cuenta)</label>
        <select id="tx-dest-asset" class="form-control">
          ${optionsHtml}
        </select>
      </div>

      <div class="form-group" id="debt-group" style="display: none;">
        <label class="form-label">Asociar a Deuda</label>
        <select id="tx-debt" class="form-control">
          <option value="">Ninguna - Solo Pago Manual</option>
          ${debtOptionsHtml}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Monto ($)</label>
        <input type="number" id="tx-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        <input type="text" id="tx-category" class="form-control" placeholder="Ej: Comida, Salario, Transporte" required />
      </div>

      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input type="text" id="tx-desc" class="form-control" placeholder="Ej: Supermercado, Pago quincena" />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-tx-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const typeSelect = modal.querySelector('#tx-type');
    const destGroup = modal.querySelector('#dest-asset-group');
    const debtGroup = modal.querySelector('#debt-group');
    const cancelBtn = modal.querySelector('#cancel-tx-btn');
    const form = modal.querySelector('#new-tx-form');

    // Cambiar la vista de campos dependientes del tipo
    typeSelect.addEventListener('change', () => {
      const type = typeSelect.value;
      destGroup.style.display = type === 'transfer' ? 'flex' : 'none';
      debtGroup.style.display = type === 'debt_payment' ? 'flex' : 'none';
    });

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const tx = {
        date: modal.querySelector('#tx-date').value,
        type: typeSelect.value,
        assetId: modal.querySelector('#tx-asset').value,
        amount: parseFloat(modal.querySelector('#tx-amount').value),
        category: modal.querySelector('#tx-category').value.trim(),
        description: modal.querySelector('#tx-desc').value.trim()
      };

      if (tx.type === 'transfer') {
        tx.destinationAssetId = modal.querySelector('#tx-dest-asset').value;
      }
      if (tx.type === 'debt_payment') {
        tx.debtId = modal.querySelector('#tx-debt').value || null;
      }

      await Queries.addTransaction(tx);
      DialogManager.close();
    });
  });
}
