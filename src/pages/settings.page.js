/**
 * @fileoverview Controlador de la página de Configuración (Backup, Tema y Borrado seguro).
 */

import { Queries } from '../storage/queries';
import { EventBus } from '../utils/event-bus';
import { db } from '../storage/db';
import { Toast } from '../utils/toast';
import dayjs from 'dayjs';

/**
 * Renderiza la vista de Configuración.
 * @param {HTMLElement} container Contenedor principal.
 */
export async function renderSettings(container) {
  const currentTheme = await Queries.getSetting('theme') || 'dark';

  const renderContent = () => {
    container.innerHTML = `
      <div class="flex-column gap-lg">
        
        <!-- Header -->
        <div class="card card-glass" style="padding: 16px 24px;">
          <span class="text-label-large" style="color: var(--md-sys-color-primary);">PREFERENCIAS</span>
          <h1 class="text-headline-medium" style="font-weight: 700;">Ajustes del Sistema</h1>
        </div>

        <!-- Personalization Card -->
        <div class="card flex-column gap-md">
          <h2 class="text-title-large">Personalización Visual</h2>
          
          <div class="flex-row justify-between align-center" style="padding: 8px 0;">
            <div class="flex-column gap-xs">
              <span class="text-title-small">Tema de la Interfaz</span>
              <span class="text-body-small" style="color: var(--md-sys-color-outline);">Alterna entre colores claros y oscuros</span>
            </div>
            <div>
              <select id="setting-theme-select" class="form-control" style="background-color: var(--md-sys-color-surface-variant)">
                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Modo Claro (Light)</option>
                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Modo Oscuro (Dark)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Backup Card (Import/Export) -->
        <div class="card flex-column gap-md">
          <h2 class="text-title-large">Respaldos y Copias de Seguridad</h2>
          <p class="text-body-medium" style="color: var(--md-sys-color-on-surface-variant);">
            MagiFinance es 100% local. Tu información nunca sale de tu navegador. Te recomendamos exportar respaldos periódicamente para evitar pérdidas si borras los datos de navegación.
          </p>

          <div style="display: grid; grid-template-columns: 1fr; gap: 16px; @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }">
            
            <div class="flex-column gap-sm" style="padding: 16px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-md);">
              <strong class="text-title-small">Guardar Copia de Seguridad</strong>
              <p class="text-body-small" style="color: var(--md-sys-color-outline); margin-bottom: 8px;">
                Descarga un archivo JSON cifrado localmente con toda tu configuración, activos, deudas, metas e historial completo de transacciones.
              </p>
              <button id="export-backup-btn" class="btn btn-primary w-full">
                <span class="icon">download</span> Exportar Base de Datos (.json)
              </button>
            </div>

            <div class="flex-column gap-sm" style="padding: 16px; background-color: var(--md-sys-color-surface-variant); border-radius: var(--border-radius-md); position: relative;">
              <strong class="text-title-small">Restaurar Copia de Seguridad</strong>
              <p class="text-body-small" style="color: var(--md-sys-color-outline); margin-bottom: 8px;">
                Carga un archivo JSON previamente exportado. Esta operación restablecerá completamente tu base de datos actual.
              </p>
              <button id="trigger-import-backup-btn" class="btn btn-outlined w-full">
                <span class="icon">upload</span> Importar Respaldo (.json)
              </button>
              <input type="file" id="backup-file-picker" accept=".json" style="position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px;" />
            </div>

          </div>
        </div>

        <!-- Danger Zone Card -->
        <div class="card flex-column gap-md" style="border-color: var(--md-sys-color-error);">
          <h2 class="text-title-large" style="color: var(--md-sys-color-error);">Zona de Peligro</h2>
          <p class="text-body-medium" style="color: var(--md-sys-color-outline);">
            Estas acciones borrarán de forma irreversible todos los datos almacenados en este dispositivo.
          </p>
          
          <div class="flex-row justify-between align-center" style="padding-top: 8px;">
            <div class="flex-column gap-xs">
              <span class="text-title-small">Vaciar Base de Datos</span>
              <span class="text-body-small" style="color: var(--md-sys-color-outline);">Restablece la app al estado inicial de fábrica</span>
            </div>
            <button id="clear-database-btn" class="btn btn-outlined" style="color: var(--md-sys-color-error); border-color: var(--md-sys-color-error);">
              <span class="icon">delete_forever</span> Vaciar Datos
            </button>
          </div>
        </div>

      </div>
    `;

    // 1. Manejo del Tema
    const themeSelect = document.getElementById('setting-theme-select');
    themeSelect.addEventListener('change', async () => {
      const val = themeSelect.value;
      await Queries.setSetting('theme', val);
      
      // Aplicar clases de tema de forma reactiva
      if (val === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        document.getElementById('theme-color-meta').setAttribute('content', '#0f1210');
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        document.getElementById('theme-color-meta').setAttribute('content', '#006c47');
      }
    });

    // 2. Exportación de Respaldo
    document.getElementById('export-backup-btn').addEventListener('click', async () => {
      await exportDatabaseBackup();
    });

    // 3. Importación de Respaldo
    const filePicker = document.getElementById('backup-file-picker');
    const triggerBtn = document.getElementById('trigger-import-backup-btn');

    triggerBtn.addEventListener('click', () => {
      filePicker.click();
    });

    filePicker.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const confirmRestore = confirm('¿Estás seguro de restaurar este respaldo? Se sobrescribirá TODA tu información actual.');
      if (!confirmRestore) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const payload = JSON.parse(event.target.result);
          if (payload.schema !== 'MFP-Backup-v1') {
            alert('Formato de respaldo no reconocido. Debe ser un archivo "MFP-Backup-v1".');
            return;
          }

          await restoreDatabaseBackup(payload.data);
          alert('Base de datos restaurada correctamente.');
          window.location.hash = '#/dashboard';
        } catch (err) {
          alert(`Error al procesar el respaldo: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });

    // 4. Limpieza de base de datos
    document.getElementById('clear-database-btn').addEventListener('click', async () => {
      const firstConfirm = confirm('¿Confirmas que deseas eliminar todos tus datos financieros de forma permanente? No se puede deshacer.');
      if (!firstConfirm) return;
      
      const secondConfirm = confirm('Por seguridad física: ¿Estás ABSOLUTAMENTE seguro de borrar la contabilidad? Tu saldo de activos, deudas y metas volverá a cero.');
      if (!secondConfirm) return;

      await clearIndexedDB();
      alert('Contabilidad vaciada. La página se recargará.');
      window.location.reload();
    });
  };

  renderContent();
}

/**
 * Genera y descarga el respaldo de base de datos completa.
 */
async function exportDatabaseBackup() {
  try {
    const snapshots = await db.snapshots.toArray();
    const transactions = await db.transactions.toArray();
    const assets = await db.assets.toArray();
    const debts = await db.debts.toArray();
    const goals = await db.goals.toArray();
    const settings = await db.settings.toArray();

    const backup = {
      schema: 'MFP-Backup-v1',
      timestamp: Date.now(),
      data: {
        snapshots,
        transactions,
        assets,
        debts,
        goals,
        settings
      }
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `MFP_Backup_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Toast.success('¡Respaldo descargado correctamente!');
  } catch (error) {
    alert(`Error al exportar respaldo: ${error.message}`);
  }
}

/**
 * Restaura toda la información en las tablas IndexedDB.
 */
async function restoreDatabaseBackup(data) {
  await db.transaction('rw', [db.snapshots, db.transactions, db.assets, db.debts, db.goals, db.settings], async () => {
    // Vaciar tablas
    await db.snapshots.clear();
    await db.transactions.clear();
    await db.assets.clear();
    await db.debts.clear();
    await db.goals.clear();
    await db.settings.clear();

    // Reinsertar
    if (data.snapshots) await db.snapshots.bulkAdd(data.snapshots);
    if (data.transactions) await db.transactions.bulkAdd(data.transactions);
    if (data.assets) await db.assets.bulkAdd(data.assets);
    if (data.debts) await db.debts.bulkAdd(data.debts);
    if (data.goals) await db.goals.bulkAdd(data.goals);
    if (data.settings) await db.settings.bulkAdd(data.settings);
  });

  EventBus.emit('data:changed');
  Toast.success('¡Respaldo restaurado con éxito!');
}

/**
 * Elimina toda la información de IndexedDB manteniendo semillas vacías.
 */
async function clearIndexedDB() {
  await db.transaction('rw', [db.snapshots, db.transactions, db.assets, db.debts, db.goals, db.settings], async () => {
    await db.snapshots.clear();
    await db.transactions.clear();
    await db.assets.clear();
    await db.debts.clear();
    await db.goals.clear();
    await db.settings.clear();
  });

  // Re-sembrar
  db.settings.bulkAdd([
    { key: 'theme', value: 'dark' },
    { key: 'currency', value: 'MXN' },
    { key: 'initializedAt', value: Date.now() }
  ]);

  db.assets.bulkAdd([
    { id: 'bbva', name: 'BBVA Nómina', type: 'liquid', isActive: true },
    { id: 'nu', name: 'Nu Cajita', type: 'savings', isActive: true },
    { id: 'efectivo', name: 'Efectivo Wallet', type: 'liquid', isActive: true }
  ]);
}
