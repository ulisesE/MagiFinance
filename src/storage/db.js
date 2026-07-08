/**
 * @fileoverview Configuración e inicialización de IndexedDB usando Dexie.js.
 */

import Dexie from 'dexie';

export const db = new Dexie('MagiFinanceDB');

// Definición de esquema y tablas versión 3
db.version(3).stores({
  snapshots: '++id, date, createdAt',
  transactions: '++id, date, type, category, snapshotId, debtId, assetId, bucketId',
  assets: 'id, name, type, isActive',
  buckets: 'id, name, assetId',
  debts: 'id, name, status',
  goals: 'id, name',
  settings: 'key',
  backups: '++id, date, createdAt'
});

// Evento de inicialización de datos para la base de datos vacía
db.on('populate', () => {
  // Configuración predeterminada
  db.settings.bulkAdd([
    { key: 'theme', value: 'dark' },
    { key: 'currency', value: 'MXN' },
    { key: 'initializedAt', value: Date.now() }
  ]);

  // Activos iniciales por defecto (vacíos de saldo hasta cargar un snapshot)
  db.assets.bulkAdd([
    { id: 'bbva', name: 'BBVA Nómina', type: 'liquid', isActive: true },
    { id: 'nu', name: 'Nu Cajita', type: 'savings', isActive: true },
    { id: 'efectivo', name: 'Efectivo Wallet', type: 'liquid', isActive: true }
  ]);

  // Apartados semilla iniciales
  db.buckets.bulkAdd([
    { id: 'ahorro-general', name: 'Ahorro General', assetId: 'nu' },
    { id: 'fondo-emergencia', name: 'Fondo de Emergencia', assetId: 'nu' }
  ]);

  console.log('Base de datos MagiFinanceDB inicializada con datos semilla.');
});
