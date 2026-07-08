/**
 * @fileoverview Script automatizado de verificación y pruebas unitarias de los Motores Financieros.
 */

import { BalanceEngine } from '../src/engine/balance.engine.js';
import { JsonEngine } from '../src/engine/json.engine.js';
import { DebtEngine } from '../src/engine/debt.engine.js';
import { GoalEngine } from '../src/engine/goal.engine.js';

console.log('🧪 Iniciando pruebas automáticas de motores de MagiFinance...\n');

let failedTests = 0;
let passedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(` ✅ PASSED: ${message}`);
  } else {
    failedTests++;
    console.error(` ❌ FAILED: ${message}`);
  }
}

// -------------------------------------------------------------
// 1. Pruebas de JsonEngine
// -------------------------------------------------------------
console.log('--- 1. Pruebas de Validación de Contratos JSON (JsonEngine) ---');

const validSnapshot = {
  schema: 'MFP-Snapshot-v1',
  timestamp: 1234567,
  date: '2026-06-01',
  assets: [
    { id: 'bbva', name: 'BBVA', type: 'liquid', balance: 1000 }
  ],
  debts: [],
  goals: []
};

const invalidSnapshot = {
  schema: 'MFP-Snapshot-v1',
  date: 'fecha-incorrecta',
  assets: 'no-es-un-arreglo'
};

const snapValValid = JsonEngine.validateSnapshotV1(validSnapshot);
assert(snapValValid.isValid === true, 'Debería aceptar un snapshot con formato MFP-Snapshot-v1 válido');

const snapValInvalid = JsonEngine.validateSnapshotV1(invalidSnapshot);
assert(snapValInvalid.isValid === false && snapValInvalid.errors.length > 0, 'Debería rechazar un snapshot con datos inválidos o erróneos');

// -------------------------------------------------------------
// 2. Pruebas de BalanceEngine (Algoritmo Checkpoint + Delta)
// -------------------------------------------------------------
console.log('\n--- 2. Pruebas del Motor de Balances (BalanceEngine) ---');

const seedAssets = [
  { id: 'bbva', name: 'BBVA', type: 'liquid', isActive: true },
  { id: 'nu', name: 'Nu', type: 'savings', isActive: true }
];

const snapshots = [
  {
    date: '2026-06-01',
    assets: [
      { id: 'bbva', name: 'BBVA', type: 'liquid', balance: 10000.00 },
      { id: 'nu', name: 'Nu', type: 'savings', balance: 20000.00 }
    ]
  }
];

const transactions = [
  // Del 2 de junio: gasto en bbva
  { date: '2026-06-02', type: 'expense', amount: 500, assetId: 'bbva', category: 'Food' },
  // Del 5 de junio: ingreso en bbva
  { date: '2026-06-05', type: 'income', amount: 3000, assetId: 'bbva', category: 'Salary' },
  // Del 10 de junio: transferencia de bbva a nu
  { date: '2026-06-10', type: 'transfer', amount: 2000, assetId: 'bbva', destinationAssetId: 'nu', category: 'Transfer' },
  // Del 12 de junio: ajuste de saldo en nu a un monto de 30000 fijo
  { date: '2026-06-12', type: 'adjustment', amount: 30000, assetId: 'nu', category: 'Adjustment' }
];

// Cálculo al 15 de junio (después de todas las transacciones)
const stateAt15 = BalanceEngine.calculateState(seedAssets, snapshots, transactions, '2026-06-15');

// Explicación matemática:
// bbva inicial = 10,000
// - 500 (gasto) = 9,500
// + 3,000 (ingreso) = 12,500
// - 2,000 (transferencia) = 10,500
// Balance final bbva = 10,500

// nu inicial = 20,000
// + 2,000 (transferencia) = 22,000
// ajuste a 30,000 fijo = 30,000
// Balance final nu = 30,000

// Patrimonio Neto = 10,500 + 30,000 = 40,500
assert(stateAt15.netWorth === 40500, 'El patrimonio neto final debería ser 40,500');
assert(stateAt15.assets.find(a => a.id === 'bbva').balance === 10500, 'El saldo del activo "bbva" debería ser 10,500');
assert(stateAt15.assets.find(a => a.id === 'nu').balance === 30000, 'El saldo del activo "nu" debería ser ajustado a 30,000');

// Cálculo al 8 de junio (antes de la transferencia y el ajuste)
const stateAt08 = BalanceEngine.calculateState(seedAssets, snapshots, transactions, '2026-06-08');
// bbva = 10,000 - 500 + 3,000 = 12,500
// nu = 20,000
assert(stateAt08.assets.find(a => a.id === 'bbva').balance === 12500, 'El saldo de bbva al 8 de junio debería ser 12,500');
assert(stateAt08.assets.find(a => a.id === 'nu').balance === 20000, 'El saldo de nu al 8 de junio debería ser 20,000 (antes de la transferencia)');

// -------------------------------------------------------------
// 3. Pruebas de DebtEngine
// -------------------------------------------------------------
console.log('\n--- 3. Pruebas del Motor de Deudas (DebtEngine) ---');

const mockDebt = {
  id: 'credito-auto',
  name: 'Auto',
  amount: 100000.00,
  originalAmount: 150000.00,
  status: 'active'
};

const mockPayments = [
  { amount: 5000 },
  { amount: 5000 }
];

const debtState = DebtEngine.calculateState(mockDebt, mockPayments);
// remainingAmount = 100000 - 10000 = 90000
// progress = ((150000 - 90000) / 150000) * 100 = (60000 / 150000) * 100 = 40%
assert(debtState.remainingAmount === 90000, 'La deuda restante debería ser 90,000');
assert(debtState.progress === 40, 'El progreso de amortización de la deuda debería ser 40%');

// -------------------------------------------------------------
// 4. Pruebas de GoalEngine
// -------------------------------------------------------------
console.log('\n--- 4. Pruebas del Motor de Metas (GoalEngine) ---');

const mockGoal = {
  id: 'viaje',
  name: 'Viaje',
  targetAmount: 50000.00,
  currentAmount: 20000.00,
  targetDate: '2026-11-01' // Supongamos que faltan meses
};

const goalState = GoalEngine.calculateProgress(mockGoal);
assert(goalState.percentage === 40, 'El porcentaje de cumplimiento de la meta debería ser 40%');
assert(goalState.remainingAmount === 30000, 'Deberían restar 30,000 para cumplir la meta');

// -------------------------------------------------------------
// Resumen de resultados
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log(`📊 RESULTADOS: ${passedTests} exitosas, ${failedTests} fallidas.`);
console.log('=============================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ¡Todos los motores financieros funcionan a la perfección y pasaron la auditoría! 🚀');
  process.exit(0);
}
