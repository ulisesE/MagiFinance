/**
 * @fileoverview Controlador de la página de Metas Financieras (Ahorros y Objetivos).
 */

import { Queries } from '../storage/queries';
import { DialogManager } from '../utils/dialog';
import { db } from '../storage/db';
import { Toast } from '../utils/toast';
import dayjs from 'dayjs';

/**
 * Renderiza la vista de Metas.
 * @param {HTMLElement} container Contenedor principal.
 */
export async function renderGoals(container) {
  const renderContent = async () => {
    const goals = await Queries.getGoalsWithProgress();

    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header & Action -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 16px 24px;">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">PLANIFICACIÓN DE CAPITAL</span>
            <h1 class="text-headline-medium" style="font-weight: 700;">Objetivos y Metas</h1>
          </div>
          <button id="add-goal-btn" class="btn btn-primary">
            <span class="icon">add</span> Crear Nueva Meta
          </button>
        </div>

        <!-- Goals Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          ${goals.length === 0 
            ? `<div class="card flex-column align-center gap-sm" style="grid-column: 1 / -1; padding: 40px;">
                 <span class="icon" style="font-size: 40px; color: var(--md-sys-color-outline)">track_changes</span>
                 <p style="color: var(--md-sys-color-outline)">No has creado ninguna meta de ahorro aún.</p>
               </div>`
            : goals.map(goal => {
                const pct = goal.percentage.toFixed(0);
                const isOverdueClass = goal.isOverdue ? 'text-expense' : 'text-income';
                
                return `
                  <div class="card flex-column gap-sm">
                    <div class="flex-row justify-between align-center">
                      <div class="flex-row align-center gap-xs">
                        <span class="icon" style="color: var(--md-sys-color-primary);">stars</span>
                        <strong class="text-title-medium">${goal.name}</strong>
                      </div>
                      <div class="flex-row gap-xs">
                        <button class="edit-goal-btn icon" data-id="${goal.id}" style="color: var(--md-sys-color-outline); font-size: 18px;">edit</button>
                        <button class="delete-goal-btn icon" data-id="${goal.id}" style="color: var(--color-expense); font-size: 18px;">delete</button>
                      </div>
                    </div>

                    <!-- Progress numbers -->
                    <div class="flex-row justify-between align-center mt-xs">
                      <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Acumulado:</span>
                      <strong>$${goal.currentAmount.toLocaleString()} / $${goal.targetAmount.toLocaleString()}</strong>
                    </div>

                    <!-- Progress bar -->
                    <div style="width: 100%; height: 8px; background-color: var(--md-sys-color-surface-variant); border-radius: 4px; overflow: hidden; position: relative;">
                      <div style="width: ${pct}%; height: 100%; background-color: var(--md-sys-color-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>

                    <div class="flex-row justify-between text-label-small" style="color: var(--md-sys-color-outline);">
                      <span>Progreso: ${pct}%</span>
                      <span>Objetivo: ${dayjs(goal.targetDate).format('DD MMM YYYY')}</span>
                    </div>

                    <hr style="border: 0; border-top: 1px dashed var(--md-sys-color-outline-variant); margin: 4px 0;" />

                    <!-- Forecast advice -->
                    <div class="flex-column gap-xs text-body-small" style="color: var(--md-sys-color-on-surface-variant);">
                      ${goal.remainingAmount === 0 
                        ? '<span style="color: var(--color-income); font-weight: 500;">¡Meta alcanzada exitosamente! 🎉</span>'
                        : goal.isOverdue
                          ? `<span class="${isOverdueClass}" style="font-weight: 500;">Fórmula vencida por $${goal.remainingAmount.toLocaleString()}</span>`
                          : `<span>Restan <strong>${goal.monthsRemaining} meses</strong> para completarla.</span>
                             <span>Ahorro mensual sugerido: <strong style="color: var(--md-sys-color-primary)">$${goal.requiredMonthlySaving.toFixed(2)}</strong></span>`
                      }
                    </div>
                  </div>
                `;
              }).join('')
          }
        </div>

      </div>
    `;

    // Asignar eventos
    document.getElementById('add-goal-btn').addEventListener('click', () => {
      openAddGoalDialog(renderContent);
    });

    container.querySelectorAll('.edit-goal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        openEditGoalDialog(id, renderContent);
      });
    });

    container.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('¿Estás seguro de eliminar esta meta?')) {
          await Queries.deleteGoal(id);
          Toast.info('Meta de ahorro eliminada.');
          renderContent();
        }
      });
    });
  };

  await renderContent();
}

/**
 * Diálogo para agregar una meta.
 */
function openAddGoalDialog(onSuccess) {
  const dialogHtml = `
    <h2 class="text-title-large">Crear Meta de Ahorro</h2>
    <form id="add-goal-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">ID de la Meta</label>
        <input type="text" id="goal-id" class="form-control" placeholder="Ej: viaje, fondo-auto (letras/guiones)" required />
      </div>

      <div class="form-group">
        <label class="form-label">Nombre del Objetivo</label>
        <input type="text" id="goal-name" class="form-control" placeholder="Ej: Fondo de Emergencia" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto Objetivo ($)</label>
        <input type="number" id="goal-target" class="form-control" placeholder="0.00" step="0.01" min="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto Inicial Ahorrado ($)</label>
        <input type="number" id="goal-current" class="form-control" placeholder="0.00" value="0.00" step="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Fecha Límite</label>
        <input type="date" id="goal-date" class="form-control" value="${dayjs().add(1, 'year').format('YYYY-MM-DD')}" required />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-goal-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear Meta</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#add-goal-form');
    const cancelBtn = modal.querySelector('#cancel-goal-btn');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newGoal = {
        id: modal.querySelector('#goal-id').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''),
        name: modal.querySelector('#goal-name').value.trim(),
        targetAmount: parseFloat(modal.querySelector('#goal-target').value),
        currentAmount: parseFloat(modal.querySelector('#goal-current').value),
        targetDate: modal.querySelector('#goal-date').value
      };

      if (!newGoal.id) return;

      const existing = await Queries.getGoalsWithProgress();
      if (existing.some(g => g.id === newGoal.id)) {
        alert('Este ID de meta ya está registrado.');
        return;
      }

      await Queries.addGoal(newGoal);
      Toast.success(`¡Meta "${newGoal.name}" creada con éxito!`);
      DialogManager.close();
      onSuccess();
    });
  });
}

/**
 * Diálogo para editar una meta.
 */
async function openEditGoalDialog(id, onSuccess) {
  const goal = await db.goals.get(id);
  if (!goal) return;

  const dialogHtml = `
    <h2 class="text-title-large">Editar Meta</h2>
    <form id="edit-goal-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Nombre del Objetivo</label>
        <input type="text" id="goal-name" class="form-control" value="${goal.name}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto Objetivo ($)</label>
        <input type="number" id="goal-target" class="form-control" value="${goal.targetAmount}" step="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Monto Ahorrado Actual ($)</label>
        <input type="number" id="goal-current" class="form-control" value="${goal.currentAmount}" step="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Fecha Límite</label>
        <input type="date" id="goal-date" class="form-control" value="${goal.targetDate}" required />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-edit-goal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#edit-goal-form');
    const cancelBtn = modal.querySelector('#cancel-edit-goal');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const updatedGoal = {
        name: modal.querySelector('#goal-name').value.trim(),
        targetAmount: parseFloat(modal.querySelector('#goal-target').value),
        currentAmount: parseFloat(modal.querySelector('#goal-current').value),
        targetDate: modal.querySelector('#goal-date').value
      };

      await Queries.editGoal(id, updatedGoal);
      Toast.success('¡Meta de ahorro actualizada!');
      DialogManager.close();
      onSuccess();
    });
  });
}
