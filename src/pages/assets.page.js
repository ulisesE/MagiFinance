/**
 * @fileoverview Controlador de la página de Activos (Assets).
 */

import { Queries } from '../storage/queries';
import { DialogManager } from '../utils/dialog';
import { db } from '../storage/db';
import { Toast } from '../utils/toast';

/**
 * Renderiza la vista de Activos.
 * @param {HTMLElement} container Contenedor principal.
 */
export async function renderAssets(container) {
  const renderContent = async () => {
    // Obtener información financiera unificada
    const summary = await Queries.getFinancialSummary();
    const assets = summary.assets;
    const liabilities = summary.liabilities;

    // Calcular patrimonio líquido
    const totalLiabilitiesVal = liabilities.reduce((sum, l) => sum + Math.abs(l.balance), 0);
    const liquidNetWorth = summary.liquidity - totalLiabilitiesVal;

    const translateType = (type) => {
      switch (type) {
        case 'liquid': return 'Efectivo / Cuenta Corriente';
        case 'savings': return 'Ahorro / Cajitas';
        case 'investment': return 'Inversiones';
        case 'fixed': return 'Activos Fijos (Bienes)';
        case 'liability_credit': return 'Pasivo: Tarjeta de Crédito';
        case 'liability_debt': return 'Pasivo: Préstamo / Deuda';
        default: return type;
      }
    };

    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header & Action -->
        <div class="flex-row justify-between align-center card card-glass" style="padding: 16px 24px;">
          <div class="flex-column gap-xs">
            <span class="text-label-large" style="color: var(--md-sys-color-primary);">BALANCE DE CAPITAL</span>
            <h1 class="text-headline-medium" style="font-weight: 700;">Mis Activos y Cuentas</h1>
          </div>
          <button id="add-asset-btn" class="btn btn-primary">
            <span class="icon">add</span> Agregar Cuenta/Activo
          </button>
        </div>

        <!-- Net Worth Summary card -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="card flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Patrimonio Líquido</span>
            <h2 style="color: var(--md-sys-color-primary); font-weight: 800;">$${liquidNetWorth.toLocaleString()}</h2>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">Solo activos líquidos menos pasivos</span>
          </div>
          <div class="card flex-column gap-xs">
            <span class="text-label-medium" style="color: var(--md-sys-color-on-surface-variant);">Patrimonio Total</span>
            <h2 style="color: var(--color-income); font-weight: 800;">$${summary.netWorth.toLocaleString()}</h2>
            <span class="text-label-small" style="color: var(--md-sys-color-outline);">Todos los activos menos pasivos</span>
          </div>
        </div>

        <!-- Assets List Card -->
        <div class="card flex-column gap-md">
          <h2 class="text-title-large">Listado de Activos</h2>
          
          <div class="flex-column gap-sm">
            ${assets.map(asset => {
              const balanceCol = 'var(--md-sys-color-on-background)';
              const iconName = asset.type === 'savings' ? 'savings' : (asset.type === 'investment' ? 'show_chart' : 'account_balance_wallet');

              // Obtener apartados de este activo
              const assetBuckets = summary.buckets.filter(b => b.assetId === asset.id);
              const hasBuckets = assetBuckets.length > 0;

              let bucketsAccordionHtml = '';
              if (hasBuckets) {
                bucketsAccordionHtml = `
                  <div class="buckets-accordion" id="accordion-${asset.id}" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--md-sys-color-outline-variant); width: 100%;">
                    <div class="flex-column gap-xs">
                      ${assetBuckets.map(b => {
                        const pct = asset.balance > 0 ? ((b.balance / asset.balance) * 100).toFixed(1) : 0;
                        return `
                          <div class="flex-row justify-between align-center" style="padding: 8px 12px; background-color: var(--md-sys-color-surface); border-radius: var(--border-radius-xs); margin-bottom: 4px;">
                            <span class="text-body-medium flex-row align-center gap-xs">
                              <span class="icon" style="font-size: 16px; color: var(--md-sys-color-primary);">folder_special</span>
                              ${b.name}
                            </span>
                            <span class="text-body-medium" style="font-weight: 600; color: var(--md-sys-color-primary);">
                              $${b.balance.toLocaleString()} <span style="font-size: 11px; color: var(--md-sys-color-outline); margin-left: 4px; font-weight: normal;">(${pct}%)</span>
                            </span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }

              return `
                <div class="flex-column card" style="padding: 16px; background-color: var(--md-sys-color-surface-variant); border: none; gap: 8px;">
                  <div class="flex-row justify-between align-center w-full">
                    <div class="flex-row align-center gap-md">
                      <span class="icon" style="color: var(--md-sys-color-primary); font-size: 28px;">${iconName}</span>
                      <div class="flex-column">
                        <strong class="text-title-medium">${asset.name}</strong>
                        <span class="text-body-small" style="color: var(--md-sys-color-outline);">${translateType(asset.type)}</span>
                      </div>
                    </div>
                    <div class="flex-row align-center gap-md">
                      <strong class="text-title-large" style="color: ${balanceCol};">$${asset.balance.toLocaleString()}</strong>
                      <button class="edit-asset-btn icon" data-id="${asset.id}" style="color: var(--md-sys-color-outline); font-size: 20px;">edit</button>
                    </div>
                  </div>

                  ${hasBuckets ? `
                    <div class="flex-row justify-end align-center w-full mt-xs">
                      <button class="btn btn-outlined btn-small toggle-accordion-btn" data-target="accordion-${asset.id}" style="padding: 4px 8px; font-size: 11px;">
                        <span class="icon" style="font-size: 14px; margin-right: 4px;">expand_more</span> Ver Apartados
                      </button>
                    </div>
                  ` : ''}

                  ${bucketsAccordionHtml}
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    // Asignar eventos
    document.getElementById('add-asset-btn').addEventListener('click', () => {
      openAddAssetDialog(renderContent);
    });

    container.querySelectorAll('.edit-asset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openEditAssetDialog(id, renderContent);
      });
    });

    // Eventos del acordeón de apartados
    container.querySelectorAll('.toggle-accordion-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const accordion = document.getElementById(targetId);
        if (!accordion) return;
        
        if (accordion.style.display === 'none') {
          accordion.style.display = 'block';
          e.currentTarget.innerHTML = `<span class="icon" style="font-size: 14px; margin-right: 4px;">expand_less</span> Ocultar Apartados`;
        } else {
          accordion.style.display = 'none';
          e.currentTarget.innerHTML = `<span class="icon" style="font-size: 14px; margin-right: 4px;">expand_more</span> Ver Apartados`;
        }
      });
    });
  };

  await renderContent();
}

/**
 * Diálogo para agregar un nuevo activo.
 */
export function openAddAssetDialog(onSuccess) {
  const dialogHtml = `
    <h2 class="text-title-large">Agregar Cuenta o Activo</h2>
    <form id="add-asset-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Identificador Único (ID)</label>
        <input type="text" id="asset-id" class="form-control" placeholder="Ej: paypal, caje-chica (letras y guiones)" required />
      </div>

      <div class="form-group">
        <label class="form-label">Nombre Comercial</label>
        <input type="text" id="asset-name" class="form-control" placeholder="Ej: PayPal USD, Nu TDC" required />
      </div>

      <div class="form-group">
        <label class="form-label">Tipo de Activo / Cuenta</label>
        <select id="asset-type" class="form-control" required>
          <option value="liquid">Efectivo / Cuenta Corriente</option>
          <option value="savings">Ahorro programado (Cajitas / Plazo)</option>
          <option value="investment">Inversión (Bolsa, Cripto)</option>
          <option value="fixed">Activo Fijo (Bienes raíces, Vehículos)</option>
          <option value="liability_credit">Pasivo: Tarjeta de Crédito</option>
          <option value="liability_debt">Pasivo: Préstamo / Hipoteca</option>
        </select>
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-asset-btn">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Activo</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#add-asset-form');
    const cancelBtn = modal.querySelector('#cancel-asset-btn');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newAsset = {
        id: modal.querySelector('#asset-id').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''),
        name: modal.querySelector('#asset-name').value.trim(),
        type: modal.querySelector('#asset-type').value,
        isActive: true
      };

      if (!newAsset.id) {
        alert('ID de activo inválido.');
        return;
      }

      const existing = await Queries.getAssets();
      if (existing.some(a => a.id === newAsset.id)) {
        alert('Este ID de activo ya existe en el sistema.');
        return;
      }

      await Queries.addAsset(newAsset);
      Toast.success(`¡Cuenta "${newAsset.name}" agregada con éxito!`);
      DialogManager.close();
      onSuccess();
    });
  });
}

/**
 * Diálogo para editar un activo.
 */
async function openEditAssetDialog(id, onSuccess) {
  const asset = await db.assets.get(id);
  if (!asset) return;

  const dialogHtml = `
    <h2 class="text-title-large">Editar Cuenta / Activo</h2>
    <form id="edit-asset-form" class="flex-column gap-md mt-sm">
      <div class="form-group">
        <label class="form-label">Nombre Comercial</label>
        <input type="text" id="asset-name" class="form-control" value="${asset.name}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Tipo de Activo / Cuenta</label>
        <select id="asset-type" class="form-control" required>
          <option value="liquid" ${asset.type === 'liquid' ? 'selected' : ''}>Efectivo / Cuenta Corriente</option>
          <option value="savings" ${asset.type === 'savings' ? 'selected' : ''}>Ahorro programado (Cajitas / Plazo)</option>
          <option value="investment" ${asset.type === 'investment' ? 'selected' : ''}>Inversión (Bolsa, Cripto)</option>
          <option value="fixed" ${asset.type === 'fixed' ? 'selected' : ''}>Activo Fijo (Bienes raíces, Vehículos)</option>
          <option value="liability_credit" ${asset.type === 'liability_credit' ? 'selected' : ''}>Pasivo: Tarjeta de Crédito</option>
          <option value="liability_debt" ${asset.type === 'liability_debt' ? 'selected' : ''}>Pasivo: Préstamo / Hipoteca</option>
        </select>
      </div>

      <div class="form-group flex-row align-center gap-sm">
        <input type="checkbox" id="asset-active" ${asset.isActive ? 'checked' : ''} />
        <label for="asset-active" class="form-label" style="margin: 0;">Activo visible en la contabilidad</label>
      </div>

      <div class="flex-row gap-sm justify-between mt-md">
        <button type="button" class="btn btn-outlined" id="cancel-edit-asset">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </form>
  `;

  DialogManager.open(dialogHtml, (modal) => {
    const form = modal.querySelector('#edit-asset-form');
    const cancelBtn = modal.querySelector('#cancel-edit-asset');

    cancelBtn.addEventListener('click', () => DialogManager.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const updatedAsset = {
        name: modal.querySelector('#asset-name').value.trim(),
        type: modal.querySelector('#asset-type').value,
        isActive: modal.querySelector('#asset-active').checked
      };

      await Queries.editAsset(id, updatedAsset);
      Toast.success('¡Cambios de cuenta guardados!');
      DialogManager.close();
      onSuccess();
    });
  });
}
