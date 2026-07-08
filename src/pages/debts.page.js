/**
 * @fileoverview Controlador de la página de Deudas y Estrategias de Pago (Bola de Nieve/Avalancha).
 */

import { Queries } from '../storage/queries';
import { DialogManager } from '../utils/dialog';
import { DebtEngine } from '../engine/debt.engine';
import { db } from '../storage/db';
import dayjs from 'dayjs';

/**
 * Renderiza la vista de Deudas.
 * @param {HTMLElement} container Contenedor principal.
 */
export async function renderDebts(container) {
  const renderContent = async () => {
    const debts = await Queries.getDebtsWithProgress();

    // Sumar deudas activas
    const totalRemaining = debts
      .filter(d => !d.isPaid)
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    // Calcular prioridades
    const priorities = DebtEngine.getPaymentPriority(debts);

    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header & Action -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 16px 24px;">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">PLAN DE REDUCCIÓN</span>
            <h1 class="text-headline-medium" style="font-weight: 700;">Pasivos y Deudas</h1>
          </div>
          <button id="add-debt-btn" class="btn btn-primary">
            <span class="icon">add</span> Registrar Deuda
          </button>
        </div>

        <!-- KPI Card -->
        <div class="card flex-row justify-between align-center">
          <div class="flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Pasivo Exigible Restante</span>
            <h2 style="color: var(--color-expense); font-weight: 800;">$${totalRemaining.toLocaleString()}</h2>
          </div>
          <span class="icon" style="font-size: 40px; color: var(--color-expense);">credit_card_off</span>
        </div>

        <!-- Debts List -->
        <div class="card flex-column gap-md">
          <h2 class="text-title-large">Mis Deudas</h2>
          <div class="flex-column gap-md">
            ${debts.length === 0 
              ? '<p class="text-body-medium" style="color: var(--md-sys-color-outline)">¡Felicidades! No tienes deudas registradas.</p>' 
              : debts.map(debt => {
                  const pct = debt.progress.toFixed(0);
                  const statusBadge = debt.isPaid 
                    ? '<span class="badge badge-income">Pagada</span>' 
                    : '<span class="badge badge-expense">Activa</span>';
                  
                  return `
                    <div class="flex-column card" style="padding: 16px; border-radius: var(--border-radius-md); background-color: var(--md-sys-color-surface-variant); border: none; gap: 8px;">
                      <div class="flex-row justify-between align-center">
                        <div class="flex-row align-center gap-sm">
                          <span class="icon" style="color: var(--color-expense);">local_activity</span>
                          <strong class="text-title-medium">${debt.name}</strong>
                          ${statusBadge}
                        </div>
                        <div class="flex-row align-center gap-sm">
                          <button class="edit-debt-btn icon" data-id="${debt.id}" style="color: var(--md-sys-color-outline); font-size: 20px;">edit</button>
                          <button class="delete-debt-btn icon" data-id="${debt.id}" style="color: var(--color-expense); font-size: 20px;">delete</button>
                        </div>
                      </div>

                      <div class="flex-row justify-between text-body-medium mt-xs">
                        <span>Original: $${(debt.originalAmount || debt.amount).toLocaleString()}</span>
                        <span>Restan: <strong style="color: var(--color-expense); font-size: 1rem;">$${debt.remainingAmount.toLocaleString()}</strong></span>
                      </div>

                      <!-- Progress bar -->
                      <div style="width: 100%; height: 8px; background-color: var(--md-sys-color-surface); border-radius: 4px; overflow: hidden; position: relative;" class="mt-xs">
                        <div style="width: ${pct}%; height: 100%; background-color: var(--md-sys-color-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
                      </div>
                      <div class="flex-row justify-between text-label-small" style="color: var(--md-sys-color-outline);">
                        <span>Progreso de Pago</span>
                        <span>${pct}% amortizado</span>
                      </div>
                      ${debt.notes ? `<p class="text-body-small" style="color: var(--md-sys-color-outline); font-style: italic; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 4px;">Nota: ${debt.notes}</p>` : ''}
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>

        <!-- Strategy Advisor (Snowball vs Avalanche) -->
        ${debts.length > 0 && totalRemaining > 0 ? `
          <div class="card flex-column gap-md">
            <h2 class="text-title-large flex-row align-center gap-xs">
              <span class="icon" style="color: var(--md-sys-color-primary);">bolt</span>
              Estrategias Recomendadas de Amortización
            </h2>
            <p class="text-body-small" style="color: var(--md-sys-color-outline);">
              Si dispones de capital extra para abonar a capital este mes, te sugerimos seguir uno de estos planes:
            </p>

            <div style="display: grid; grid-template-columns: 1fr; gap: 16px; @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }">
              
              <!-- Snowball plan -->
              <div class="flex-column gap-sm" style="padding: 12px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-md);">
                <strong class="text-title-small flex-row align-center gap-xs" style="color: var(--md-sys-color-primary);">
                  <span class="icon">ac_unit</span> Bola de Nieve (Snowball)
                </strong>
                <p class="text-body-small" style="color: var(--md-sys-color-on-surface-variant);">
                  Paga los saldos más pequeños primero para obtener victorias psicológicas rápidas.
                </p>
                <ol style="margin-left: 16px;" class="text-body-medium flex-column gap-xs mt-xs">
                  ${priorities.snowball.map((d, index) => `<li><strong>${index + 1}. ${d.name}</strong> ($${d.remainingAmount.toLocaleString()})</li>`).join('')}
                </ol>
              </div>

              <!-- Avalanche plan -->
              <div class="flex-column gap-sm" style="padding: 12px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-md);">
                <strong class="text-title-small flex-row align-center gap-xs" style="color: var(--md-sys-color-primary);">
                  <span class="icon">thunderstorm</span> Avalancha (Avalanche)
                </strong>
                <p class="text-body-small" style="color: var(--md-sys-color-on-surface-variant);">
                  Ataca el saldo nominal más grande para reducir la carga de pasivo consolidado rápidamente.
                </p>
                <ol style="margin-left: 16px;" class="text-body-medium flex-column gap-xs mt-xs">
                  ${priorities.avalanche.map((d, index) => `<li><strong>${index + 1}. ${d.name}</strong> ($${d.remainingAmount.toLocaleString()})</li>`).join('')}
                </ol>
              </div>

            </div>
          </div>
        ` : ''}

      </div>
    `;

    // Asignar eventos
    document.getElementById('add-debt-btn').addEventListener('click', () => {
      openAddDebtDialog(renderContent);
    });

    container.querySelectorAll('.edit-debt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        openEditDebtDialog(id, renderContent);
      });
    });

    container.querySelectorAll('.delete-debt-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('¿Estás seguro de eliminar esta deuda? Se conservarán los movimientos de pago asociados.')) {
          await Queries.deleteDebt(id);
          renderContent();
        }
      });
    });
  };

  await renderContent();
}

/**
 * Diálogo para agregar una deuda.
 */
function openAddDebtDialog(onSuccess) {
  const dialogHtml = `
    <h2 class="text-title-large">Registrar Deuda</h2>
    <form id="add-debt-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">ID de la Deuda</label>
        <input type="text" id="debt-id" class="form-control" placeholder="Ej: auto, credito-personal (letras/guiones)" required />
      </div>

      <div class="form-group">
        <label class="form-label">Nombre Comercial</label>
        <input type="text" id="debt-name" class="form-control" placeholder="Ej: Crédito Automotriz BBVA" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto de la Deuda al Iniciar ($)</label>
        <input type="number" id="debt-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto Original de Apertura ($ - Opcional)</label>
        <input type="number" id="debt-original" class="form-control" placeholder="Ej: Si ya habías pagado algo antes" step="0.01" />
      </div>

      <div class="form-group">
        <label class="form-label">Notas Adicionales</label>
        <input type="text" id="debt-notes" class="form-control" placeholder="Ej: Tasa fija 12.5%, plazo 36 meses" />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-debt-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar Deuda</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#add-debt-form');
    const cancelBtn = modal.querySelector('#cancel-debt-btn');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newDebt = {
        id: modal.querySelector('#debt-id').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''),
        name: modal.querySelector('#debt-name').value.trim(),
        amount: parseFloat(modal.querySelector('#debt-amount').value),
        originalAmount: parseFloat(modal.querySelector('#debt-original').value) || parseFloat(modal.querySelector('#debt-amount').value),
        status: 'active',
        notes: modal.querySelector('#debt-notes').value.trim(),
        startDate: dayjs().format('YYYY-MM-DD')
      };

      if (!newDebt.id) return;

      const existing = await Queries.getDebtsWithProgress();
      if (existing.some(d => d.id === newDebt.id)) {
        alert('Este ID de deuda ya está registrado.');
        return;
      }

      await Queries.addDebt(newDebt);
      
      // Creamos un pasivo (Asset de tipo liability_debt) asociado para que sume automáticamente en el balance consolidado
      await Queries.addAsset({
        id: newDebt.id,
        name: `Pasivo: ${newDebt.name}`,
        type: 'liability_debt',
        isActive: true
      });

      DialogManager.close();
      onSuccess();
    });
  });
}

/**
 * Diálogo para editar una deuda.
 */
async function openEditDebtDialog(id, onSuccess) {
  const debt = await db.debts.get(id);
  if (!debt) return;

  const dialogHtml = `
    <h2 class="text-title-large">Editar Deuda</h2>
    <form id="edit-debt-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Nombre</label>
        <input type="text" id="debt-name" class="form-control" value="${debt.name}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto de Registro Inicial ($)</label>
        <input type="number" id="debt-amount" class="form-control" value="${debt.amount}" step="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto Original Histórico ($)</label>
        <input type="number" id="debt-original" class="form-control" value="${debt.originalAmount}" step="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Estado</label>
        <select id="debt-status" class="form-control">
          <option value="active" ${debt.status === 'active' ? 'selected' : ''}>Activa</option>
          <option value="paid" ${debt.status === 'paid' ? 'selected' : ''}>Pagada</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Notas</label>
        <input type="text" id="debt-notes" class="form-control" value="${debt.notes || ''}" />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-edit-debt">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#edit-debt-form');
    const cancelBtn = modal.querySelector('#cancel-edit-debt');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const updatedDebt = {
        name: modal.querySelector('#debt-name').value.trim(),
        amount: parseFloat(modal.querySelector('#debt-amount').value),
        originalAmount: parseFloat(modal.querySelector('#debt-original').value),
        status: modal.querySelector('#debt-status').value,
        notes: modal.querySelector('#debt-notes').value.trim()
      };

      await Queries.editDebt(id, updatedDebt);
      DialogManager.close();
      onSuccess();
    });
  });
}
