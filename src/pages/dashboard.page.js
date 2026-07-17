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
    const { summary, previousNetWorth, currentMonthStats, insights, history, txs } = data;
    const snapshotsCount = await db.snapshots.count();

    // Verificar si la base de datos está vacía (onboarding)
    if (!summary.assets || (summary.assets.length === 0 && summary.liabilities.length === 0)) {
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

    // Obtener los datos del snapshot anterior
    const prevSnapshotSummary = data.prevSnapshotSummary;

    // 1. Variación de Patrimonio Neto
    const nwVariation = prevSnapshotSummary ? summary.netWorth - prevSnapshotSummary.netWorth : 0;
    const nwVariationPercent = (prevSnapshotSummary && prevSnapshotSummary.netWorth > 0) ? (nwVariation / prevSnapshotSummary.netWorth) * 100 : 0;
    const nwVariationClass = nwVariation >= 0 ? 'text-income' : 'text-expense';
    const nwVariationIcon = nwVariation >= 0 ? 'trending_up' : 'trending_down';
    const nwVariationText = prevSnapshotSummary 
      ? `${nwVariation >= 0 ? '+' : ''}$${nwVariation.toLocaleString()} (${nwVariationPercent >= 0 ? '+' : ''}${nwVariationPercent.toFixed(1)}% vs snapshot anterior)`
      : 'Sin snapshot anterior';

    // 2. Variación de Activos Totales
    const assetsVariation = prevSnapshotSummary ? summary.assetsTotal - prevSnapshotSummary.assetsTotal : 0;
    const assetsVariationPercent = (prevSnapshotSummary && prevSnapshotSummary.assetsTotal > 0) ? (assetsVariation / prevSnapshotSummary.assetsTotal) * 100 : 0;
    const assetsVariationClass = assetsVariation >= 0 ? 'text-income' : 'text-expense';
    const assetsVariationIcon = assetsVariation >= 0 ? 'trending_up' : 'trending_down';
    const assetsVariationText = prevSnapshotSummary
      ? `${assetsVariation >= 0 ? '+' : ''}$${assetsVariation.toLocaleString()} (${assetsVariationPercent >= 0 ? '+' : ''}${assetsVariationPercent.toFixed(1)}% vs snapshot anterior)`
      : 'Sin snapshot anterior';

    // 3. Variación de Pasivos Totales (un decremento de deuda es positivo/verde)
    const liabilitiesVariation = prevSnapshotSummary ? summary.liabilitiesTotal - prevSnapshotSummary.liabilitiesTotal : 0;
    const liabilitiesVariationPercent = (prevSnapshotSummary && prevSnapshotSummary.liabilitiesTotal > 0) ? (liabilitiesVariation / prevSnapshotSummary.liabilitiesTotal) * 100 : 0;
    const liabilitiesVariationClass = liabilitiesVariation <= 0 ? 'text-income' : 'text-expense';
    const liabilitiesVariationIcon = liabilitiesVariation <= 0 ? 'trending_down' : 'trending_up';
    const liabilitiesVariationText = prevSnapshotSummary
      ? `${liabilitiesVariation >= 0 ? '+' : ''}$${liabilitiesVariation.toLocaleString()} (${liabilitiesVariationPercent >= 0 ? '+' : ''}${liabilitiesVariationPercent.toFixed(1)}% vs snapshot anterior)`
      : 'Sin snapshot anterior';

    // Calcular KPIs extendidos de salud financiera
    // 1. Tarjetas de crédito (próximos pagos reales)
    let totalTdcPayment = 0;
    let closestDueDate = null;

    summary.liabilities.forEach(l => {
      if (l.type === 'liability_credit') {
        const payments = txs.filter(t => 
          t.date > (l.statementDate || '0000-00-00') &&
          t.date <= dayjs().format('YYYY-MM-DD') &&
          (
            (t.type === 'transfer' && t.destinationAssetId === l.id) ||
            ((t.type === 'income' || t.type === 'debt_payment') && t.assetId === l.id)
          )
        );
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
        const remainingToAvoidInterest = Math.max(0, (l.statementBalance || 0) - totalPaid);
        totalTdcPayment += remainingToAvoidInterest;

        if (remainingToAvoidInterest > 0 && l.paymentDueDate) {
          if (!closestDueDate || l.paymentDueDate < closestDueDate) {
            closestDueDate = l.paymentDueDate;
          }
        }
      }
    });

    // 2. Préstamos / Deudas
    const activeDebts = summary.debts.filter(d => !d.isPaid);
    const totalDebts = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const loanPaymentAmount = activeDebts.reduce((sum, d) => {
      const matches = d.notes ? d.notes.match(/pago:\s*\$?([\d,.]+)/i) : null;
      if (matches) return sum + parseFloat(matches[1].replace(/,/g, ''));
      return sum + (d.remainingAmount * 0.05);
    }, 0);

    const nextPaymentAmount = totalTdcPayment + loanPaymentAmount;
    let paymentDueDateLabel = 'Sin pagos pendientes';
    if (nextPaymentAmount > 0) {
      if (closestDueDate) {
        paymentDueDateLabel = `Límite: ${dayjs(closestDueDate).format('DD [de] MMMM')}`;
      } else {
        paymentDueDateLabel = 'Cuota sugerida mensual';
      }
    }

    const activeGoals = summary.goals.filter(g => !g.isCompleted);
    const totalGoalsSaved = summary.goals.reduce((sum, g) => sum + g.currentAmount, 0);

    // Separar activos para mostrar
    const liquidAssets = summary.assets.filter(a => a.type === 'liquid');
    const savingsAssets = summary.assets.filter(a => a.type === 'savings');
    const investmentAssets = summary.assets.filter(a => a.type === 'investment');
    const fixedAssets = summary.assets.filter(a => a.type === 'fixed');
    
    // Contenido HTML de la página
    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Dashboard Header & Top Actions -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 20px 24px; border-radius: var(--border-radius-xl);">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">LIBRO CONTABLE</span>
            <h1 class="text-headline-medium" style="font-weight: 800; margin: 0;">MagiFinance Dashboard</h1>
          </div>
          <div class="flex-row gap-sm">
            <button id="quick-import-json" class="btn btn-outlined">
              <span class="icon">upload_file</span> Importar Snapshot
            </button>
            <button id="quick-add-tx" class="btn btn-primary">
              <span class="icon">add</span> Nuevo Movimiento
            </button>
          </div>
        </div>

        <!-- Three Columns: Assets, Liabilities, Net Worth -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          
          <!-- Activos Totales Card -->
          <div class="card flex-column gap-xs" style="background-color: var(--md-sys-color-surface-variant); border: none;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Activos Totales</span>
            <h2 class="text-display-small" style="font-weight: 800; color: var(--md-sys-color-on-background); margin: 4px 0;">$${summary.assetsTotal.toLocaleString()}</h2>
            <div class="flex-row align-center gap-xs ${assetsVariationClass}" style="font-weight: 500; font-size: 0.825rem;">
              <span class="icon" style="font-size: 16px;">${assetsVariationIcon}</span>
              <span>${assetsVariationText}</span>
            </div>
          </div>

          <!-- Pasivos Totales Card -->
          <div class="card flex-column gap-xs" style="background-color: var(--md-sys-color-surface-variant); border: none;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Pasivos Totales</span>
            <h2 class="text-display-small" style="font-weight: 800; color: var(--md-sys-color-on-background); margin: 4px 0;">$${summary.liabilitiesTotal.toLocaleString()}</h2>
            <div class="flex-row align-center gap-xs ${liabilitiesVariationClass}" style="font-weight: 500; font-size: 0.825rem;">
              <span class="icon" style="font-size: 16px;">${liabilitiesVariationIcon}</span>
              <span>${liabilitiesVariationText}</span>
            </div>
          </div>

          <!-- Patrimonio Neto Card -->
          <div class="card flex-column gap-xs" style="background-color: var(--md-sys-color-primary-container); border: 1px solid var(--md-sys-color-primary);">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-primary-container);">Patrimonio Neto</span>
            <h2 class="text-display-small" style="font-weight: 800; color: var(--md-sys-color-primary); margin: 4px 0;">$${summary.netWorth.toLocaleString()}</h2>
            <div class="flex-row align-center gap-xs ${nwVariationClass}" style="font-weight: 500; font-size: 0.825rem;">
              <span class="icon" style="font-size: 16px;">${nwVariationIcon}</span>
              <span>${nwVariationText}</span>
            </div>
          </div>

        </div>

        <!-- KPIs Grid (MD3 Cards) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          
          <div id="kpi-networth" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Patrimonio Neto</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--md-sys-color-on-background);">$${summary.netWorth.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">Balance total consolidado</span>
          </div>

          <div id="kpi-available" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Dinero Disponible</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-income);">$${summary.available.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">Liquidez libre de apartados</span>
          </div>

          <div id="kpi-reserved" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Dinero Reservado</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--md-sys-color-primary);">$${summary.reserved.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">Asignado en Apartados</span>
          </div>

          <div id="kpi-debts" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Total de Deudas</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-expense);">$${totalDebts.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">${summary.debts.filter(d => !d.isPaid).length} pasivos activos</span>
          </div>

          <div id="kpi-nextpayment" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Próximo Pago Real</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-expense);">$${nextPaymentAmount.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">${paymentDueDateLabel}</span>
          </div>

          <div id="kpi-emergency" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Fondo de Emergencia</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-transfer);">$${summary.emergencyFund.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">Reserva de seguridad</span>
          </div>

          <div id="kpi-goals" class="card flex-column gap-xs" style="cursor: pointer;">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Ahorro en Metas</span>
            <span class="text-headline-small" style="font-weight: 700; color: var(--color-transfer);">$${totalGoalsSaved.toLocaleString()}</span>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">${activeGoals.length} metas activas</span>
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
                <strong>$${summary.liabilities.filter(a => a.type === 'liability_credit').reduce((sum, a) => sum + Math.abs(a.balance), 0).toLocaleString()}</strong>
              </div>
              <div class="flex-row justify-between text-body-small">
                <span>Préstamos / Deudas</span>
                <strong>$${summary.liabilities.filter(a => a.type === 'liability_debt').reduce((sum, a) => sum + Math.abs(a.balance), 0).toLocaleString()}</strong>
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
    document.getElementById('kpi-networth')?.addEventListener('click', () => { window.location.hash = '#/assets'; });
    document.getElementById('kpi-available')?.addEventListener('click', () => { window.location.hash = '#/assets'; });
    document.getElementById('kpi-reserved')?.addEventListener('click', () => { window.location.hash = '#/buckets'; });
    document.getElementById('kpi-debts')?.addEventListener('click', () => { window.location.hash = '#/debts'; });
    document.getElementById('kpi-nextpayment')?.addEventListener('click', () => { window.location.hash = '#/debts'; });
    document.getElementById('kpi-emergency')?.addEventListener('click', () => { window.location.hash = '#/goals'; });
    document.getElementById('kpi-goals')?.addEventListener('click', () => { window.location.hash = '#/goals'; });

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
  const buckets = await Queries.getBuckets();

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

      <div class="form-group" id="bucket-group" style="display: none;">
        <label class="form-label">Apartado de Origen</label>
        <select id="tx-bucket" class="form-control">
          <!-- Rellenado dinámicamente -->
        </select>
      </div>

      <div class="form-group" id="dest-asset-group" style="display: none;">
        <label class="form-label">Activo de Destino (Cuenta)</label>
        <select id="tx-dest-asset" class="form-control">
          ${optionsHtml}
        </select>
      </div>

      <div class="form-group" id="dest-bucket-group" style="display: none;">
        <label class="form-label">Apartado de Destino</label>
        <select id="tx-dest-bucket" class="form-control">
          <!-- Rellenado dinámicamente -->
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
    const assetSelect = modal.querySelector('#tx-asset');
    const destAssetSelect = modal.querySelector('#tx-dest-asset');
    const bucketGroup = modal.querySelector('#bucket-group');
    const bucketSelect = modal.querySelector('#tx-bucket');
    const destBucketGroup = modal.querySelector('#dest-bucket-group');
    const destBucketSelect = modal.querySelector('#tx-dest-bucket');
    const destGroup = modal.querySelector('#dest-asset-group');
    const debtGroup = modal.querySelector('#debt-group');
    const cancelBtn = modal.querySelector('#cancel-tx-btn');
    const form = modal.querySelector('#new-tx-form');

    const updateBuckets = () => {
      const assetId = assetSelect.value;
      const assetBuckets = buckets.filter(b => b.assetId === assetId);
      if (assetBuckets.length > 0) {
        bucketGroup.style.display = 'flex';
        bucketSelect.innerHTML = '<option value="">Ninguno (Saldo general de la cuenta)</option>' + 
          assetBuckets.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      } else {
        bucketGroup.style.display = 'none';
        bucketSelect.value = '';
      }
    };

    const updateDestBuckets = () => {
      const isTransfer = typeSelect.value === 'transfer';
      const destAssetId = destAssetSelect.value;
      const destAssetBuckets = buckets.filter(b => b.assetId === destAssetId);
      if (isTransfer && destAssetBuckets.length > 0) {
        destBucketGroup.style.display = 'flex';
        destBucketSelect.innerHTML = '<option value="">Ninguno (Saldo general de la cuenta)</option>' + 
          destAssetBuckets.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      } else {
        destBucketGroup.style.display = 'none';
        destBucketSelect.value = '';
      }
    };

    typeSelect.addEventListener('change', () => {
      const type = typeSelect.value;
      destGroup.style.display = type === 'transfer' ? 'flex' : 'none';
      debtGroup.style.display = type === 'debt_payment' ? 'flex' : 'none';
      updateDestBuckets();
    });

    assetSelect.addEventListener('change', updateBuckets);
    destAssetSelect.addEventListener('change', updateDestBuckets);

    // Initial check
    updateBuckets();
    updateDestBuckets();

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const tx = {
        date: modal.querySelector('#tx-date').value,
        type: typeSelect.value,
        assetId: assetSelect.value,
        amount: parseFloat(modal.querySelector('#tx-amount').value),
        category: modal.querySelector('#tx-category').value.trim(),
        description: modal.querySelector('#tx-desc').value.trim()
      };

      const bucketId = bucketSelect.value;
      if (bucketId) tx.bucketId = bucketId;

      if (tx.type === 'transfer') {
        tx.destinationAssetId = destAssetSelect.value;
        const destBucketId = destBucketSelect.value;
        if (destBucketId) tx.destinationBucketId = destBucketId;
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
