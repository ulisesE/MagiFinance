/**
 * @fileoverview Controlador de la página de Apartados (Buckets).
 */

import { Queries } from '../storage/queries';
import { DialogManager } from '../utils/dialog';
import { Toast } from '../utils/toast';
import { db } from '../storage/db';

/**
 * Renderiza la vista de Apartados (Buckets).
 * @param {HTMLElement} container Contenedor principal.
 */
export async function renderBuckets(container) {
  const renderContent = async () => {
    const summary = await Queries.getFinancialSummary();
    const assets = summary.assets;
    const buckets = summary.buckets;

    // Agrupar apartados por activo físico
    const assetsMap = new Map();
    assets.forEach(asset => {
      assetsMap.set(asset.id, { ...asset, buckets: [] });
    });

    buckets.forEach(bucket => {
      const parent = assetsMap.get(bucket.assetId);
      if (parent) {
        parent.buckets.push(bucket);
      }
    });

    const groupedAssets = Array.from(assetsMap.values());

    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header & Action -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 16px 24px;">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">ASIGNACIÓN LÓGICA</span>
            <h1 class="text-headline-medium" style="font-weight: 700;">Mis Apartados</h1>
          </div>
          <button id="add-bucket-btn" class="btn btn-primary">
            <span class="icon">add</span> Nuevo Apartado
          </button>
        </div>

        <!-- Total Reserved Card -->
        <div class="card flex-row justify-between align-center" style="border-left: 6px solid var(--md-sys-color-primary);">
          <div class="flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Dinero Total Reservado</span>
            <h2 style="color: var(--md-sys-color-primary); font-weight: 800;">$${summary.reserved.toLocaleString()}</h2>
          </div>
          <span class="icon" style="font-size: 40px; color: var(--md-sys-color-primary);">wallet</span>
        </div>

        <!-- Assets & Buckets Group List -->
        <div class="flex-column gap-md">
          ${groupedAssets.length === 0
            ? '<div class="card"><p class="text-body-medium" style="color: var(--md-sys-color-outline)">No tienes cuentas creadas para alojar apartados.</p></div>'
            : groupedAssets.map(asset => {
                const assetBucketsSum = asset.buckets.reduce((sum, b) => sum + b.balance, 0);
                const unusedBalance = asset.balance - assetBucketsSum;
                
                return `
                  <div class="card flex-column gap-md" style="padding: 20px;">
                    <div class="flex-row justify-between align-center" style="border-bottom: 1px solid var(--md-sys-color-surface-variant); padding-bottom: 8px;">
                      <div class="flex-column">
                        <strong class="text-title-large">${asset.name}</strong>
                        <span class="text-body-small" style="color: var(--md-sys-color-outline);">Saldo Total Físico: $${asset.balance.toLocaleString()}</span>
                      </div>
                      <span class="badge" style="background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container);">
                        ${asset.buckets.length} apartados
                      </span>
                    </div>

                    <!-- Buckets list -->
                    <div class="flex-column gap-sm">
                      ${asset.buckets.length === 0 
                        ? '<p class="text-body-small" style="color: var(--md-sys-color-outline); padding: 8px 0;">No hay apartados en esta cuenta física.</p>'
                        : asset.buckets.map(bucket => {
                            const pct = asset.balance > 0 ? ((bucket.balance / asset.balance) * 100).toFixed(1) : 0;
                            return `
                              <div class="flex-row justify-between align-center" style="padding: 10px 12px; background-color: var(--md-sys-color-surface); border-radius: var(--border-radius-sm);">
                                <div class="flex-row align-center gap-md">
                                  <span class="icon" style="color: var(--md-sys-color-primary); font-size: 24px;">folder_special</span>
                                  <div class="flex-column">
                                    <strong class="text-title-medium">${bucket.name}</strong>
                                    <span class="text-label-small" style="color: var(--md-sys-color-outline);">${pct}% de la cuenta</span>
                                  </div>
                                </div>
                                <div class="flex-row align-center gap-md">
                                  <strong class="text-title-large" style="color: var(--md-sys-color-primary);">$${bucket.balance.toLocaleString()}</strong>
                                  <button class="edit-bucket-btn icon" data-id="${bucket.id}" style="color: var(--md-sys-color-outline); font-size: 20px;">edit</button>
                                  <button class="delete-bucket-btn icon" data-id="${bucket.id}" style="color: var(--color-expense); font-size: 20px;">delete</button>
                                </div>
                              </div>
                            `;
                          }).join('')
                      }

                      <!-- Free/Unallocated money indicator -->
                      <div class="flex-row justify-between align-center" style="padding: 8px 12px; border-top: 1px dashed var(--md-sys-color-outline-variant); margin-top: 4px; font-style: italic;">
                        <span class="text-body-small" style="color: var(--md-sys-color-outline);">Dinero disponible no reservado</span>
                        <strong class="text-body-medium" style="color: var(--color-income);">$${unusedBalance.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')
          }
        </div>

      </div>
    `;

    // Asignar eventos
    document.getElementById('add-bucket-btn').addEventListener('click', () => {
      openAddBucketDialog(renderContent);
    });

    container.querySelectorAll('.edit-bucket-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openEditBucketDialog(id, renderContent);
      });
    });

    container.querySelectorAll('.delete-bucket-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const bucket = await db.buckets.get(id);
        if (!bucket) return;

        if (confirm(`¿Estás seguro de eliminar el apartado "${bucket.name}"?`)) {
          await Queries.deleteBucket(id);
          Toast.info(`Apartado "${bucket.name}" eliminado.`);
          renderContent();
        }
      });
    });
  };

  await renderContent();
}

/**
 * Diálogo para agregar un nuevo apartado.
 */
async function openAddBucketDialog(onSuccess) {
  const assets = await Queries.getAssets();
  const liquidAssets = assets.filter(a => !a.type.startsWith('liability_'));

  if (liquidAssets.length === 0) {
    alert('Primero debes crear una cuenta física en Activos.');
    return;
  }

  const optionsHtml = liquidAssets
    .map(a => `<option value="${a.id}">${a.name}</option>`)
    .join('');

  const dialogHtml = `
    <h2 class="text-title-large">Crear Nuevo Apartado</h2>
    <form id="add-bucket-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Identificador Único (ID)</label>
        <input type="text" id="bucket-id" class="form-control" placeholder="Ej: vacaciones, auto-nuevo (letras y guiones)" required />
      </div>

      <div class="form-group">
        <label class="form-label">Nombre del Apartado</label>
        <input type="text" id="bucket-name" class="form-control" placeholder="Ej: Ahorro Vacaciones, Enganche Auto" required />
      </div>

      <div class="form-group">
        <label class="form-label">Cuenta Física Asociada</label>
        <select id="bucket-asset" class="form-control" required>
          ${optionsHtml}
        </select>
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-bucket-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear Apartado</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#add-bucket-form');
    const cancelBtn = modal.querySelector('#cancel-bucket-btn');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newBucket = {
        id: modal.querySelector('#bucket-id').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''),
        name: modal.querySelector('#bucket-name').value.trim(),
        assetId: modal.querySelector('#bucket-asset').value,
        balance: 0
      };

      if (!newBucket.id) {
        alert('ID de apartado inválido.');
        return;
      }

      const existing = await Queries.getBuckets();
      if (existing.some(b => b.id === newBucket.id)) {
        alert('Este ID de apartado ya está registrado.');
        return;
      }

      await Queries.addBucket(newBucket);
      Toast.success(`Apartado "${newBucket.name}" creado con éxito.`);
      DialogManager.close();
      onSuccess();
    });
  });
}

/**
 * Diálogo para editar un apartado.
 */
async function openEditBucketDialog(id, onSuccess) {
  const bucket = await db.buckets.get(id);
  if (!bucket) return;

  const dialogHtml = `
    <h2 class="text-title-large">Editar Apartado</h2>
    <form id="edit-bucket-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Nombre del Apartado</label>
        <input type="text" id="bucket-name" class="form-control" value="${bucket.name}" required />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-edit-bucket">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#edit-bucket-form');
    const cancelBtn = modal.querySelector('#cancel-edit-bucket');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const updated = {
        name: modal.querySelector('#bucket-name').value.trim()
      };

      await Queries.editBucket(id, updated);
      Toast.success('Cambios guardados con éxito.');
      DialogManager.close();
      onSuccess();
    });
  });
}
