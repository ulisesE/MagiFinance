/**
 * @fileoverview Script automatizado para verificar cálculos de pasivos, patrimonio neto, liquidez real e insights en MagiFinance.
 */

import { BalanceEngine } from '../src/engine/balance.engine.js';
import { JsonEngine } from '../src/engine/json.engine.js';
import { InsightsEngine } from '../src/engine/insights.engine.js';
import dayjs from 'dayjs';

console.log('🧪 Iniciando pruebas automáticas de pasivos y balance consolidado...\n');

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

// 1. Datos Semilla (Assets registrados en IndexedDB)
const seedAssets = [
  { id: 'bbva', name: 'BBVA Nómina', type: 'liquid', isActive: true },
  { id: 'nu', name: 'Nu Cajita', type: 'savings', isActive: true },
  { id: 'casa', name: 'Casa Propia', type: 'fixed', isActive: true },
  { id: 'bbva-tdc', name: 'BBVA Tarjeta', type: 'liability_credit', isActive: true }
];

const seedBuckets = [
  { id: 'bucket-ahorro', name: 'Ahorro', assetId: 'nu' }
];

// 2. Snapshot (Checkpoint contable)
const snapshots = [
  {
    date: '2026-07-17',
    assets: [
      { id: 'bbva', name: 'BBVA Nómina', type: 'liquid', balance: 10000.00 },
      { id: 'nu', name: 'Nu Cajita', type: 'savings', balance: 20000.00 },
      { id: 'casa', name: 'Casa Propia', type: 'fixed', balance: 500000.00 }
    ],
    liabilities: [
      {
        id: 'bbva-tdc',
        name: 'BBVA Tarjeta',
        type: 'credit_card',
        balance: 12000.00,
        statementBalance: 8000.00,
        statementDate: '2026-07-16',
        paymentDueDate: '2026-08-05'
      }
    ],
    buckets: [
      { id: 'bucket-ahorro', assetId: 'nu', name: 'Ahorro', balance: 5000.00 }
    ]
  }
];

// 3. Transacciones posteriores al snapshot (Deltas)
const transactions = [
  // 18 de julio: compra (gasto) en la tdc por $1,000
  { date: '2026-07-18', type: 'expense', amount: 1000, assetId: 'bbva-tdc', category: 'Shopping' },
  // 19 de julio: abono (transferencia) de bbva a tdc por $3,000
  { date: '2026-07-19', type: 'transfer', amount: 3000, assetId: 'bbva', destinationAssetId: 'bbva-tdc', category: 'CC Payment' }
];

// --- Ejecutar Cálculo de Estado ---
const targetDate = '2026-07-20';
const state = BalanceEngine.calculateState(seedAssets, seedBuckets, snapshots, transactions, targetDate);

// --- Verificaciones matemáticas ---

// A. Inicialización y Deltas de Pasivos
// Saldo inicial tdc en snapshot = -12,000
// Gasto del 18 de julio = -1,000
// Abono del 19 de julio = +3,000
// Saldo esperado = -12,000 - 1,000 + 3,000 = -10,000
const tdcAsset = state.assets.find(a => a.id === 'bbva-tdc');
assert(tdcAsset !== undefined, 'Debería cargar el pasivo "bbva-tdc" desde el snapshot');
assert(tdcAsset && tdcAsset.balance === -10000, `El saldo final de la TDC debería ser -10000 (obtenido: ${tdcAsset ? tdcAsset.balance : 'N/A'})`);

// B. Balances Consolidados (Patrimonio Neto)
// Activos reales: bbva (10,000 - 3,000 = 7,000) + nu (20,000) + casa (500,000) = 527,000
// Pasivos: bbva-tdc (-10,000) -> Valor absoluto = 10,000
// Patrimonio Neto esperado = 527,000 - 10,000 = 517,000
assert(state.assetsTotal === 527000, `Los activos totales deberían ser 527,000 (obtenido: ${state.assetsTotal})`);
assert(state.liabilitiesTotal === 10000, `Los pasivos totales deberían ser 10,000 (obtenido: ${state.liabilitiesTotal})`);
assert(state.netWorth === 517000, `El patrimonio neto debería ser 517,000 (obtenido: ${state.netWorth})`);

// C. Liquidez Real y Dinero Disponible
// Cuentas de liquidez real: bbva (7,000) + nu (20,000) = 27,000 (se excluye "casa" que es fixed)
// Dinero Reservado en buckets: bucket-ahorro (5,000)
// Dinero Disponible real = 27,000 - 5,000 = 22,000
assert(state.liquidity === 27000, `La liquidez total real debería ser 27,000 (obtenido: ${state.liquidity})`);
assert(state.reserved === 5000, `El dinero reservado en apartados debería ser 5,000 (obtenido: ${state.reserved})`);
assert(state.available === 22000, `El dinero disponible libre debería ser 22,000 (obtenido: ${state.available})`);


// --- Verificación del Próximo Pago Real (TDC) ---
// Saldo para no generar intereses en corte = $8,000
// Abonos posteriores a la fecha de corte (2026-07-16) = $3,000 (la transferencia del 19 de julio)
// Próximo Pago Real esperado = 8,000 - 3,000 = 5,000
const l = state.assets.find(a => a.id === 'bbva-tdc');
const tdcPayments = transactions.filter(t => 
  t.date > (l.statementDate || '') &&
  t.date <= targetDate &&
  (
    (t.type === 'transfer' && t.destinationAssetId === l.id) ||
    ((t.type === 'income' || t.type === 'debt_payment') && t.assetId === l.id)
  )
);
const totalPaid = tdcPayments.reduce((sum, t) => sum + t.amount, 0);
const remainingToAvoidInterest = Math.max(0, (l.statementBalance || 0) - totalPaid);
assert(remainingToAvoidInterest === 5000, `El próximo pago real de la TDC debería ser 5,000 (obtenido: ${remainingToAvoidInterest})`);


// --- Verificación de Insights ---
const currentMonthStats = { income: 3000, expense: 1000, netSavings: 2000, savingsRate: 66.7 };
const prevMonthStats = { income: 3000, expense: 800, netSavings: 2200, savingsRate: 73.3 };
// Simulamos fecha actual 2026-07-29 (a 7 días del vencimiento 2026-08-05 de la TDC)
const testDateNearDue = '2026-07-30';
const insights = InsightsEngine.generate(
  currentMonthStats,
  prevMonthStats,
  state.netWorth,
  state.netWorth - 1000, // Variación positiva anterior
  state.liquidity,
  state.assets.filter(a => a.type?.startsWith('liability_')),
  [],
  testDateNearDue,
  transactions
);

const hasNearDueInsight = insights.some(ins => ins.title.includes('Vencimiento de Tarjeta Cercano'));
assert(hasNearDueInsight === true, 'Debería generar un insight de advertencia de vencimiento cercano para la TDC');


// --- Resultados Finales ---
console.log('\n=============================================================');
console.log(`📊 RESULTADOS: ${passedTests} exitosas, ${failedTests} fallidas.`);
console.log('=============================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ¡Todos los motores de balance y pasivos pasaron la auditoría! 🚀');
  process.exit(0);
}
