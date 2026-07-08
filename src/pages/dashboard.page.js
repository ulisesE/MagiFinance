/**
 * @fileoverview Controlador de la página del Dashboard principal.
 */

import { Queries } from '../storage/queries';
import { DialogManager } from '../utils/dialog';
import { openImportDialog } from './transactions.page';
import { openAddAssetDialog } from './assets.page';
import { db } from '../storage/db';
import { Toast } from '../utils/toast';
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
    const snapshotsCount = await db.snapshots.count();

    // Verificar si la base de datos está vacía (onboarding)
    if (!state.assets || state.assets.length === 0) {
      container.innerHTML = `
        <div class="flex-column gap-xl align-center" style="max-width: 680px; margin: 40px auto; text-align: center; padding: 0 16px;">
          
          <!-- Welcome header -->
          <div class="flex-column align-center gap-sm">
            <div style="background: linear-gradient(135deg, var(--md-sys-color-primary-container), rgba(0, 108, 71, 0.2)); padding: 20px; border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; border: 1px solid var(--md-sys-color-primary);">
              <span class="icon" style="font-size: 40px; color: var(--md-sys-color-primary);">wallet</span>
            </div>
            <h1 class="text-display-small" style="font-weight: 800; background: linear-gradient(120deg, var(--md-sys-color-primary), #72daa7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Bienvenido a MagiFinance</h1>
            <p class="text-body-large" style="color: var(--md-sys-color-on-surface-variant); max-width: 520px; line-height: 1.6;">
              Tu libro contable y patrimonio personal 100% local y privado. Para comenzar, carga tu primer snapshot financiero o crea tus activos manualmente.
            </p>
          </div>

          <!-- Onboarding Path Cards -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; width: 100%; margin-top: 16px;">
            
            <!-- Card 1: Import Snapshot (Vibrant, primary onboarding path) -->
            <div id="onboarding-import-card" class="card card-glass flex-column justify-between align-center gap-md" style="padding: 32px 24px; border: 2px solid var(--md-sys-color-primary); cursor: pointer; border-radius: var(--border-radius-xl); text-align: center; min-height: 280px;">
              <div class="flex-column align-center gap-xs">
                <span class="icon" style="font-size: 40px; color: var(--md-sys-color-primary);">upload_file</span>
                <h2 class="text-title-large" style="font-weight: 700;">Importar Snapshot</h2>
                <p class="text-body-small" style="color: var(--md-sys-color-on-surface-variant); line-height: 1.5;">
                  ¿Tienes un estado de cuenta o balance JSON en formato <code>MFP-Snapshot-v1</code> generado por ChatGPT? Impórtalo para autoprovisionar todo al instante.
                </p>
              </div>
              <button class="btn btn-primary" style="width: 100%;">Cargar Archivo JSON</button>
            </div>

            <!-- Card 2: Manual Config -->
            <div id="onboarding-manual-card" class="card flex-column justify-between align-center gap-md" style="padding: 32px 24px; cursor: pointer; border-radius: var(--border-radius-xl); text-align: center; min-height: 280px;">
              <div class="flex-column align-center gap-xs">
                <span class="icon" style="font-size: 40px; color: var(--md-sys-color-outline);">account_balance_wallet</span>
                <h2 class="text-title-large" style="font-weight: 700;">Crear Activo Manual</h2>
                <p class="text-body-small" style="color: var(--md-sys-color-on-surface-variant); line-height: 1.5;">
                  Registra tus cuentas (efectivo, corriente, tarjetas o deudas) de forma individual para empezar a ingresar tus transacciones desde cero.
                </p>
              </div>
              <button class="btn btn-outlined" style="width: 100%;">Agregar Cuenta</button>
            </div>

          </div>

          <!-- Prompt Blueprint info -->
          <div class="card flex-column gap-sm" style="width: 100%; text-align: left; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-lg); margin-top: 16px;">
            <div class="flex-row gap-sm align-center">
              <span class="icon" style="color: var(--md-sys-color-primary);">info</span>
              <h3 class="text-title-small" style="color: var(--md-sys-color-primary); font-weight: 600;">¿Cómo estructurar tus datos con ChatGPT?</h3>
            </div>
            <p class="text-body-small" style="color: var(--md-sys-color-on-surface-variant); line-height: 1.6; margin: 0;">
              Puedes pedirle a ChatGPT: <em>"Genera un archivo JSON de MagiFinance usando el esquema de contrato de instantánea <code>MFP-Snapshot-v1</code> con la fecha de hoy, incluyendo mis cuentas BBVA ($12,000) y Efectivo ($1,500)"</em>. Al cargarlo, creará las cuentas y registrará los saldos iniciales automáticamente.
            </p>
          </div>

        </div>
      `;

      // Eventos del onboarding
      document.getElementById('onboarding-import-card').addEventListener('click', () => {
        openImportDialog(async () => {
          await renderDashboard(container);
        });
      });

      document.getElementById('onboarding-manual-card').addEventListener('click', () => {
        openAddAssetDialog(async () => {
          await renderDashboard(container);
        });
      });

      return;
    }

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
            <button id="quick-import-json" class="btn btn-outlined">
              <span class="icon">upload_file</span> Importar JSON
            </button>
            <button id="quick-add-tx" class="btn btn-primary">
              <span class="icon">add</span> Nuevo Movimiento
            </button>
          </div>
        </div>

        <!-- KPIs Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
          
          <div id="kpi-assets" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Activos Totales</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-income);">$${state.assetsTotal.toLocaleString()}</span>
          </div>

          <div id="kpi-liabilities" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Pasivos Totales</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-expense);">$${state.liabilitiesTotal.toLocaleString()}</span>
          </div>

          <div id="kpi-liquidity" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Liquidez Neta</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--md-sys-color-primary);">$${state.liquidNetWorth.toLocaleString()}</span>
          </div>

          <div id="kpi-savings" class="card flex-column gap-xs" style="cursor: pointer;">
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
            <div id="networth-chart-wrapper" style="position: relative; height: 260px; width: 100%;">
              ${snapshotsCount < 2 
                ? `<div class="flex-column align-center justify-center gap-xs" style="height: 100%; text-align: center; color: var(--md-sys-color-outline); padding: 20px 0;">
                     <span class="icon" style="font-size: 48px; color: var(--md-sys-color-outline-variant);">timeline</span>
                     <p class="text-body-medium" style="margin: 0; max-width: 280px; line-height: 1.4;">
                       Se requieren al menos 2 snapshots en meses distintos para trazar la evolución de tu patrimonio.
                     </p>
                   </div>`
                : `<canvas id="networth-chart"></canvas>`
              }
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

    // Hook up buttons
    document.getElementById('quick-add-tx').addEventListener('click', () => {
      openNewTransactionDialog();
    });
    
    const quickImportBtn = document.getElementById('quick-import-json');
    if (quickImportBtn) {
      quickImportBtn.addEventListener('click', () => {
        openImportDialog(async () => {
          await renderDashboard(container);
        });
      });
    }

    // Hook up KPI cards
    document.getElementById('kpi-assets')?.addEventListener('click', () => {
      window.location.hash = '#/assets';
    });
    document.getElementById('kpi-liabilities')?.addEventListener('click', () => {
      window.location.hash = '#/debts';
    });
    document.getElementById('kpi-liquidity')?.addEventListener('click', () => {
      window.location.hash = '#/assets';
    });
    document.getElementById('kpi-savings')?.addEventListener('click', () => {
      window.location.hash = '#/analytics';
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
  
  if (assets.length === 0) {
    const emptyDialogHtml = `
      <h2 class="text-title-large">Registrar Movimiento</h2>
      <div class="flex-column align-center gap-md mt-md" style="text-align: center; padding: 16px 8px;">
        <div style="background: rgba(0, 108, 71, 0.1); padding: 16px; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--md-sys-color-primary);">
          <span class="icon" style="font-size: 32px; color: var(--md-sys-color-primary);">account_balance_wallet</span>
        </div>
        <p class="text-body-medium" style="color: var(--md-sys-color-on-surface-variant); line-height: 1.5; margin: 0;">
          No tienes cuentas configuradas aún. Para poder registrar movimientos, primero debes crear al menos un activo (cuenta corriente, efectivo, etc.).
        </p>
        <div class="flex-row gap-sm justify-between w-full mt-sm">
          <button type="button" class="btn btn-outlined" id="empty-cancel-btn" style="flex: 1;">Cancelar</button>
          <button type="button" class="btn btn-primary" id="empty-create-asset-btn" style="flex: 1;">Crear Cuenta</button>
        </div>
      </div>
    `;

    DialogManager.open(emptyDialogHtml, (modal) => {
      modal.querySelector('#empty-cancel-btn').addEventListener('click', () => DialogManager.close());
      modal.querySelector('#empty-create-asset-btn').addEventListener('click', () => {
        DialogManager.close();
        openAddAssetDialog(() => {
          openNewTransactionDialog();
        });
      });
    });
    return;
  }

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
      Toast.success('¡Movimiento registrado con éxito!');
      DialogManager.close();
    });
  });
}
