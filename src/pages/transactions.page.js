/**
 * @fileoverview Controlador de la página de Transacciones (Búsqueda, Filtros e Importación inteligente).
 */

import { Queries } from '../storage/queries';
import { JsonEngine } from '../engine/json.engine';
import { DialogManager } from '../utils/dialog';
import { db } from '../storage/db';
import { openAddAssetDialog } from './assets.page';
import { Toast } from '../utils/toast';
import dayjs from 'dayjs';

/**
 * Renderiza la vista de Transacciones.
 * @param {HTMLElement} container Contenedor principal.
 */
export async function renderTransactions(container) {
  // Inicialización de filtros temporales en memoria
  const filters = {
    startDate: '',
    endDate: '',
    type: '',
    assetId: '',
    search: ''
  };

  const renderContent = async () => {
    const txs = await Queries.getTransactions(filters);
    const assets = await Queries.getAssets();

    // Obtener categorías únicas para autocompletar o filtro rápido
    const allTxs = await Queries.getTransactions({});
    const categories = Array.from(new Set(allTxs.map(t => t.category))).filter(Boolean);

    const assetOptions = assets.map(a => `<option value="${a.id}" ${filters.assetId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');

    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header & Import Action -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 16px 24px;">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">MOVIMIENTOS</span>
            <h1 class="text-headline-medium" style="font-weight: 700;">Historial Financiero</h1>
          </div>
          <div class="flex-row gap-sm">
            <button id="import-json-btn" class="btn btn-outlined">
              <span class="icon">upload_file</span> Importar JSON
            </button>
            <button id="add-tx-btn" class="btn btn-primary">
              <span class="icon">add</span> Manual
            </button>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="card flex-column gap-md">
          <h2 class="text-title-small">Filtros y Búsqueda</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
            
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">Buscar</label>
              <input type="text" id="filter-search" class="form-control" placeholder="Ej: súper, Walmart..." value="${filters.search}" style="padding: 6px 10px;" />
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">Tipo</label>
              <select id="filter-type" class="form-control" style="padding: 6px 10px;">
                <option value="">Todos</option>
                <option value="expense" ${filters.type === 'expense' ? 'selected' : ''}>Gastos</option>
                <option value="income" ${filters.type === 'income' ? 'selected' : ''}>Ingresos</option>
                <option value="transfer" ${filters.type === 'transfer' ? 'selected' : ''}>Transferencias</option>
                <option value="debt_payment" ${filters.type === 'debt_payment' ? 'selected' : ''}>Pago Deuda</option>
                <option value="adjustment" ${filters.type === 'adjustment' ? 'selected' : ''}>Ajustes</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">Activo</label>
              <select id="filter-asset" class="form-control" style="padding: 6px 10px;">
                <option value="">Todos</option>
                ${assetOptions}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">Desde</label>
              <input type="date" id="filter-start" class="form-control" value="${filters.startDate}" style="padding: 6px 10px;" />
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">Hasta</label>
              <input type="date" id="filter-end" class="form-control" value="${filters.endDate}" style="padding: 6px 10px;" />
            </div>

          </div>
        </div>

        <!-- Transactions Table/List -->
        <div class="card flex-column gap-md" style="padding: 8px 0; overflow-x: auto;">
          <div style="padding: 12px 24px;" class="flex-row justify-between align-center">
            <h2 class="text-title-large">Resultados</h2>
            <span class="text-label-medium" style="color: var(--md-sys-color-outline);">${txs.length} movimientos encontrados</span>
          </div>

          ${txs.length === 0 
            ? `<div style="text-align: center; padding: 40px 20px; color: var(--md-sys-color-outline)">
                 <span class="icon" style="font-size: 40px;">receipt</span>
                 <p class="mt-sm">No se encontraron movimientos con los filtros actuales.</p>
               </div>`
            : `
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--md-sys-color-outline-variant); color: var(--md-sys-color-outline); font-size: 0.75rem; text-transform: uppercase;">
                    <th style="padding: 12px 24px;">Fecha</th>
                    <th style="padding: 12px 12px;">Categoría / Info</th>
                    <th style="padding: 12px 12px;">Descripción</th>
                    <th style="padding: 12px 12px;">Cuenta</th>
                    <th style="padding: 12px 24px; text-align: right;">Monto</th>
                    <th style="padding: 12px 24px; text-align: center; width: 80px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${txs.map(t => {
                    const badgeClass = `badge-${t.type}`;
                    const assetObj = assets.find(a => a.id === t.assetId);
                    const destAssetObj = t.destinationAssetId ? assets.find(a => a.id === t.destinationAssetId) : null;
                    
                    let accountText = assetObj ? assetObj.name : 'Desconocido';
                    if (t.type === 'transfer' && destAssetObj) {
                      accountText = `${assetObj ? assetObj.name : '?' } ➔ ${destAssetObj.name}`;
                    }

                    const sign = (t.type === 'expense' || t.type === 'debt_payment') ? '-' : (t.type === 'income' ? '+' : '');
                    const amountCol = t.type === 'expense' || t.type === 'debt_payment' 
                      ? 'var(--color-expense)' 
                      : (t.type === 'income' ? 'var(--color-income)' : 'var(--md-sys-color-on-background)');

                    return `
                      <tr style="border-bottom: 1px solid var(--md-sys-color-outline-variant); font-size: 0.875rem;" class="tx-row">
                        <td style="padding: 14px 24px; white-space: nowrap;">${dayjs(t.date).format('DD MMM YYYY')}</td>
                        <td style="padding: 14px 12px;">
                          <span class="badge ${badgeClass}">${t.category}</span>
                        </td>
                        <td style="padding: 14px 12px;">${t.description || '—'}</td>
                        <td style="padding: 14px 12px; white-space: nowrap;">${accountText}</td>
                        <td style="padding: 14px 24px; text-align: right; font-weight: 600; color: ${amountCol};">
                          ${sign}$${t.amount.toLocaleString()}
                        </td>
                        <td style="padding: 14px 24px; text-align: center;">
                          <button class="edit-tx-btn icon" data-id="${t.id}" style="font-size: 18px; color: var(--md-sys-color-primary); margin-right: 8px;">edit</button>
                          <button class="delete-tx-btn icon" data-id="${t.id}" style="font-size: 18px; color: var(--color-expense);">delete</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `
          }
        </div>
      </div>
    `;

    // Asignar eventos de filtros
    const searchEl = document.getElementById('filter-search');
    const typeEl = document.getElementById('filter-type');
    const assetEl = document.getElementById('filter-asset');
    const startEl = document.getElementById('filter-start');
    const endEl = document.getElementById('filter-end');

    const triggerSearch = () => {
      filters.search = searchEl.value;
      filters.type = typeEl.value;
      filters.assetId = assetEl.value;
      filters.startDate = startEl.value;
      filters.endDate = endEl.value;
      renderContent();
    };

    // Debounce simple para búsquedas
    let searchTimeout;
    searchEl.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(triggerSearch, 300);
    });

    typeEl.addEventListener('change', triggerSearch);
    assetEl.addEventListener('change', triggerSearch);
    startEl.addEventListener('change', triggerSearch);
    endEl.addEventListener('change', triggerSearch);

    // Botones de acción general
    document.getElementById('add-tx-btn').addEventListener('click', () => {
      openAddManualDialog(renderContent);
    });

    document.getElementById('import-json-btn').addEventListener('click', () => {
      openImportDialog(renderContent);
    });

    // Eventos individuales de filas (editar/eliminar)
    container.querySelectorAll('.edit-tx-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        openEditDialog(id, renderContent);
      });
    });

    container.querySelectorAll('.delete-tx-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        if (confirm('¿Estás seguro de eliminar este movimiento?')) {
          await Queries.deleteTransaction(id);
          renderContent();
        }
      });
    });
  };

  await renderContent();
}

/**
 * Abre el diálogo de importación inteligente.
 */
export function openImportDialog(onSuccess) {
  const dialogHtml = `
    <h2 class="text-title-large">Importar Archivo Financiero</h2>
    <p class="text-body-small" style="color: var(--md-sys-color-outline);">
      Selecciona un archivo JSON válido generado por ChatGPT u otro origen que cumpla con los esquemas MFP-Snapshot o MFP-Events.
    </p>
    <div class="flex-column gap-md mt-sm">
      <div class="form-group" style="border: 2px dashed var(--md-sys-color-outline); padding: 24px; border-radius: var(--border-radius-md); text-align: center; cursor: pointer; position: relative;">
        <span class="icon" style="font-size: 36px; color: var(--md-sys-color-primary);">upload_file</span>
        <p class="text-body-medium mt-sm">Haz clic para buscar o arrastra un archivo aquí.</p>
        <input type="file" id="json-file-picker" accept=".json" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" />
      </div>
      
      <!-- Preview Area -->
      <div id="import-preview-area" class="flex-column gap-sm" style="display: none;">
        <!-- Se rellena dinámicamente -->
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="import-close-btn">Cancelar</button>
        <button type="button" class="btn btn-primary" id="confirm-import-btn" disabled>Confirmar Carga</button>
      </div>
    </div>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const filePicker = modal.querySelector('#json-file-picker');
    const previewArea = modal.querySelector('#import-preview-area');
    const confirmBtn = modal.querySelector('#confirm-import-btn');
    const closeBtn = modal.querySelector('#import-close-btn');

    let parsedPayload = null;
    let importType = null;

    closeBtn.addEventListener('click', () => DialogManager.close());

    filePicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target.result);
          let validation = { isValid: false, errors: [] };

          if (json.schema === 'MFP-Snapshot-v1') {
            validation = JsonEngine.validateSnapshotV1(json);
            importType = 'snapshot';
          } else if (json.schema === 'MFP-Snapshot-v2') {
            validation = JsonEngine.validateSnapshotV2(json);
            importType = 'snapshot';
          } else if (json.schema === 'MFP-Events-v1') {
            validation = JsonEngine.validateTransactionsV1(json);
            importType = 'events';
          } else {
            validation.errors.push('Esquema JSON no reconocido o faltante.');
          }

          if (!validation.isValid) {
            previewArea.style.display = 'flex';
            previewArea.innerHTML = `
              <div style="padding: 12px; background-color: var(--md-sys-color-error-container); border-radius: var(--border-radius-sm); color: var(--md-sys-color-on-error-container);">
                <strong class="text-body-medium">Errores en el archivo:</strong>
                <ul class="text-body-small mt-xs" style="margin-left: 16px;">
                  ${validation.errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
              </div>
            `;
            confirmBtn.disabled = true;
            return;
          }

          // Validar duplicados contra BD
          const snapshots = await Queries.getSetting('snapshots') || []; // No, de IndexedDB directamente
          const dbSnapshots = await Queries.getAssetsWithBalances().then(() => Queries.getTransactions({})); // Fetch de base de datos
          
          // Consultas directas de Dexie para checkear duplicados
          const existingSnapshots = await Queries.getAssetsWithBalances().then(() => requireDbSnapshots());
          const existingTxs = await Queries.getTransactions({});

          const dupCheck = JsonEngine.checkDuplicates(json, importType, existingSnapshots, existingTxs);
          parsedPayload = json;

          previewArea.style.display = 'flex';
          previewArea.innerHTML = `
            <div style="padding: 12px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-sm);" class="flex-column gap-xs">
              <span class="text-label-large" style="color: var(--md-sys-color-primary);">VISTA PREVIA DE IMPORTACIÓN</span>
              <div class="flex-row justify-between text-body-medium mt-xs">
                <span>Tipo de archivo:</span>
                <strong>${importType === 'snapshot' ? 'Instantánea Financiera (Snapshot)' : 'Listado de Transacciones'}</strong>
              </div>
              <div class="flex-row justify-between text-body-medium">
                <span>Nuevos registros:</span>
                <strong style="color: var(--color-income);">${dupCheck.newCount}</strong>
              </div>
              <div class="flex-row justify-between text-body-medium">
                <span>Registros duplicados (se omitirán):</span>
                <strong style="color: var(--color-adjustment);">${dupCheck.duplicateCount}</strong>
              </div>
              
              ${dupCheck.duplicateCount > 0 ? `
                <div style="max-height: 80px; overflow-y: auto; background-color: rgba(0,0,0,0.05); padding: 4px; font-size: 11px; margin-top: 6px; color: var(--md-sys-color-outline);">
                  ${dupCheck.duplicatesList.map(d => `<div>• ${d}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          `;

          confirmBtn.disabled = dupCheck.newCount === 0;

        } catch (err) {
          previewArea.style.display = 'flex';
          previewArea.innerHTML = `
            <div style="padding: 12px; background-color: var(--md-sys-color-error-container); border-radius: var(--border-radius-sm); color: var(--md-sys-color-on-error-container);">
              <strong>Error de lectura:</strong> El archivo no es un JSON válido (${err.message}).
            </div>
          `;
          confirmBtn.disabled = true;
        }
      };
      reader.readAsText(file);
    });

    confirmBtn.addEventListener('click', async () => {
      if (!parsedPayload) return;

      if (importType === 'snapshot') {
        await Queries.importSnapshot(parsedPayload);
        Toast.success('¡Instantánea (Snapshot) importada correctamente!');
      } else if (importType === 'events') {
        await Queries.importTransactions(parsedPayload);
        Toast.success('¡Historial de transacciones importado correctamente!');
      }

      DialogManager.close();
      onSuccess();
    });
  });
}

// Auxiliar para traer snapshots desde BD
async function requireDbSnapshots() {
  return db.snapshots.toArray();
}

/**
 * Abre el diálogo para agregar una transacción manualmente.
 */
async function openAddManualDialog(onSuccess) {
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
          openAddManualDialog(onSuccess);
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
          <option value="">Ninguna</option>
          ${debtOptionsHtml}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Monto ($)</label>
        <input type="number" id="tx-amount" class="form-control" placeholder="0.00" step="0.01" min="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        <input type="text" id="tx-category" class="form-control" placeholder="Ej: Comida, Salario" required />
      </div>

      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input type="text" id="tx-desc" class="form-control" placeholder="Ej: Supermercado Walmart" />
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
      DialogManager.close();
      onSuccess();
    });
  });
}

/**
 * Abre el diálogo para editar una transacción existente.
 */
async function openEditDialog(id, onSuccess) {
  const tx = await db.transactions.get(id);
  if (!tx) return;

  const assets = await Queries.getAssets();
  const debts = await Queries.getDebtsWithProgress();
  const buckets = await Queries.getBuckets();

  const optionsHtml = assets.map(a => `<option value="${a.id}" ${tx.assetId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
  const destOptionsHtml = assets.map(a => `<option value="${a.id}" ${tx.destinationAssetId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
  const debtOptionsHtml = debts.map(d => `<option value="${d.id}" ${tx.debtId === d.id ? 'selected' : ''}>${d.name}</option>`).join('');

  const dialogHtml = `
    <h2 class="text-title-large">Editar Movimiento</h2>
    <form id="edit-tx-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Fecha</label>
        <input type="date" id="tx-date" class="form-control" value="${tx.date}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Tipo de Movimiento</label>
        <select id="tx-type" class="form-control" required>
          <option value="expense" ${tx.type === 'expense' ? 'selected' : ''}>Gasto (Egreso)</option>
          <option value="income" ${tx.type === 'income' ? 'selected' : ''}>Ingreso</option>
          <option value="transfer" ${tx.type === 'transfer' ? 'selected' : ''}>Transferencia</option>
          <option value="debt_payment" ${tx.type === 'debt_payment' ? 'selected' : ''}>Pago Deuda</option>
          <option value="adjustment" ${tx.type === 'adjustment' ? 'selected' : ''}>Ajuste de Saldo</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Activo de Origen</label>
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

      <div class="form-group" id="dest-asset-group" style="${tx.type === 'transfer' ? 'display: flex;' : 'display: none;'}">
        <label class="form-label">Activo de Destino</label>
        <select id="tx-dest-asset" class="form-control">
          ${destOptionsHtml}
        </select>
      </div>

      <div class="form-group" id="dest-bucket-group" style="display: none;">
        <label class="form-label">Apartado de Destino</label>
        <select id="tx-dest-bucket" class="form-control">
          <!-- Rellenado dinámicamente -->
        </select>
      </div>

      <div class="form-group" id="debt-group" style="${tx.type === 'debt_payment' ? 'display: flex;' : 'display: none;'}">
        <label class="form-label">Asociar a Deuda</label>
        <select id="tx-debt" class="form-control">
          <option value="">Ninguna</option>
          ${debtOptionsHtml}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Monto ($)</label>
        <input type="number" id="tx-amount" class="form-control" value="${tx.amount}" step="0.01" min="0.01" required />
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        <input type="text" id="tx-category" class="form-control" value="${tx.category}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input type="text" id="tx-desc" class="form-control" value="${tx.description || ''}" />
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-edit-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
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
    const cancelBtn = modal.querySelector('#cancel-edit-btn');
    const form = modal.querySelector('#edit-tx-form');

    const updateBuckets = (initialValue) => {
      const assetId = assetSelect.value;
      const assetBuckets = buckets.filter(b => b.assetId === assetId);
      if (assetBuckets.length > 0) {
        bucketGroup.style.display = 'flex';
        bucketSelect.innerHTML = '<option value="">Ninguno (Saldo general de la cuenta)</option>' + 
          assetBuckets.map(b => `<option value="${b.id}" ${initialValue === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
      } else {
        bucketGroup.style.display = 'none';
        bucketSelect.value = '';
      }
    };

    const updateDestBuckets = (initialValue) => {
      const isTransfer = typeSelect.value === 'transfer';
      const destAssetId = destAssetSelect.value;
      const destAssetBuckets = buckets.filter(b => b.assetId === destAssetId);
      if (isTransfer && destAssetBuckets.length > 0) {
        destBucketGroup.style.display = 'flex';
        destBucketSelect.innerHTML = '<option value="">Ninguno (Saldo general de la cuenta)</option>' + 
          destAssetBuckets.map(b => `<option value="${b.id}" ${initialValue === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
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

    assetSelect.addEventListener('change', () => updateBuckets());
    destAssetSelect.addEventListener('change', () => updateDestBuckets());

    // Initial check using current tx values
    updateBuckets(tx.bucketId);
    updateDestBuckets(tx.destinationBucketId);

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const updatedTx = {
        date: modal.querySelector('#tx-date').value,
        type: typeSelect.value,
        assetId: assetSelect.value,
        amount: parseFloat(modal.querySelector('#tx-amount').value),
        category: modal.querySelector('#tx-category').value.trim(),
        description: modal.querySelector('#tx-desc').value.trim()
      };

      const bucketId = bucketSelect.value;
      updatedTx.bucketId = bucketId || null;

      if (updatedTx.type === 'transfer') {
        updatedTx.destinationAssetId = destAssetSelect.value;
        const destBucketId = destBucketSelect.value;
        updatedTx.destinationBucketId = destBucketId || null;
      } else {
        updatedTx.destinationAssetId = null;
        updatedTx.destinationBucketId = null;
      }
      
      if (updatedTx.type === 'debt_payment') {
        updatedTx.debtId = modal.querySelector('#tx-debt').value || null;
      } else {
        updatedTx.debtId = null;
      }

      await Queries.editTransaction(id, updatedTx);
      DialogManager.close();
      onSuccess();
    });
  });
}
