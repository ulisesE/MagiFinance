/**
 * @fileoverview Funciones auxiliares de consulta (Queries) que unen Storage y Engine.
 */

import { db } from './db';
import { BalanceEngine } from '../engine/balance.engine';
import { AnalyticsEngine } from '../engine/analytics.engine';
import { InsightsEngine } from '../engine/insights.engine';
import { DebtEngine } from '../engine/debt.engine';
import { GoalEngine } from '../engine/goal.engine';
import { EventBus } from '../utils/event-bus';
import dayjs from 'dayjs';

export const Queries = {
  /**
   * Obtiene la configuración general por clave.
   * @param {string} key
   * @returns {Promise<*>}
   */
  async getSetting(key) {
    const item = await db.settings.get(key);
    return item ? item.value : null;
  },

  /**
   * Guarda o actualiza una configuración.
   * @param {string} key
   * @param {*} value
   */
  async setSetting(key, value) {
    await db.settings.put({ key, value });
    EventBus.emit('settings:changed', { key, value });
  },

  /**
   * Obtiene todos los activos registrados.
   */
  async getAssets() {
    return db.assets.toArray();
  },

  /**
   * Agrega un nuevo activo.
   */
  async addAsset(asset) {
    await db.assets.add(asset);
    EventBus.emit('data:changed');
  },

  /**
   * Actualiza un activo existente.
   */
  async editAsset(id, updatedAsset) {
    await db.assets.update(id, updatedAsset);
    EventBus.emit('data:changed');
  },

  /**
   * Obtiene todos los activos con sus balances calculados a una fecha dada.
   * @param {string} [targetDate] Fecha límite (por defecto hoy).
   */
  async getAssetsWithBalances(targetDate = dayjs().format('YYYY-MM-DD')) {
    const assets = await db.assets.toArray();
    const buckets = await db.buckets.toArray();
    const dbSnapshots = await db.snapshots.toArray();
    const snapshots = dbSnapshots.map(s => ({
      ...s,
      ...s.rawJson
    }));
    const transactions = await db.transactions.toArray();

    return BalanceEngine.calculateState(assets, buckets, snapshots, transactions, targetDate);
  },

  /**
   * Obtiene el payload unificado de información financiera.
   * @param {string} [targetDate] Fecha límite.
   */
  async getFinancialSummary(targetDate = dayjs().format('YYYY-MM-DD')) {
    const assets = await db.assets.toArray();
    const buckets = await db.buckets.toArray();
    const dbSnapshots = await db.snapshots.toArray();
    const snapshots = dbSnapshots.map(s => ({
      ...s,
      ...s.rawJson
    }));
    const transactions = await db.transactions.toArray();

    const engineState = BalanceEngine.calculateState(assets, buckets, snapshots, transactions, targetDate);

    // Obtener metas y deudas con progreso
    const goals = await this.getGoalsWithProgress();
    const debts = await this.getDebtsWithProgress();

    // Filtrar activos reales y pasivos
    const realAssets = engineState.assets.filter(a => !a.type.startsWith('liability_'));
    const liabilities = engineState.assets.filter(a => a.type.startsWith('liability_'));

    // Calcular fondo de emergencia
    const emergencyFundGoal = goals.find(g => g.name.toLowerCase().includes('emergencia') || g.id === 'emergencia');
    const emergencyFund = emergencyFundGoal ? emergencyFundGoal.currentAmount : 0;

    return {
      assets: realAssets,
      buckets: engineState.buckets,
      liabilities,
      netWorth: engineState.netWorth,
      liquidity: engineState.liquidity,
      reserved: engineState.reserved,
      available: engineState.available,
      goals,
      debts,
      emergencyFund
    };
  },

  /**
   * Obtiene todos los apartados registrados.
   */
  async getBuckets() {
    return db.buckets.toArray();
  },

  /**
   * Agrega un nuevo apartado con validación de activo origen.
   */
  async addBucket(bucket) {
    const asset = await db.assets.get(bucket.assetId);
    if (!asset) {
      throw new Error(`El activo origen "${bucket.assetId}" no existe.`);
    }
    await db.buckets.add(bucket);
    EventBus.emit('data:changed');
  },

  /**
   * Edita un apartado.
   */
  async editBucket(id, updatedBucket) {
    await db.buckets.update(id, updatedBucket);
    EventBus.emit('data:changed');
  },

  /**
   * Elimina un apartado.
   */
  async deleteBucket(id) {
    await db.buckets.delete(id);
    EventBus.emit('data:changed');
  },

  /**
   * Obtiene las transacciones filtradas y ordenadas por fecha descendente.
   */
  async getTransactions(filters = {}) {
    let collection = db.transactions.orderBy('date').reverse();

    let txs = await collection.toArray();

    // Aplicamos filtros en memoria
    if (filters.startDate) {
      txs = txs.filter(t => t.date >= filters.startDate);
    }
    if (filters.endDate) {
      txs = txs.filter(t => t.date <= filters.endDate);
    }
    if (filters.type) {
      txs = txs.filter(t => t.type === filters.type);
    }
    if (filters.category) {
      txs = txs.filter(t => t.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.assetId) {
      txs = txs.filter(t => t.assetId === filters.assetId || t.destinationAssetId === filters.assetId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      txs = txs.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    return txs;
  },

  /**
   * Agrega una transacción manual.
   */
  async addTransaction(tx) {
    const id = await db.transactions.add({
      ...tx,
      createdAt: Date.now()
    });
    EventBus.emit('data:changed');
    return id;
  },

  /**
   * Actualiza una transacción.
   */
  async editTransaction(id, updatedTx) {
    await db.transactions.update(id, updatedTx);
    EventBus.emit('data:changed');
  },

  /**
   * Elimina una transacción.
   */
  async deleteTransaction(id) {
    await db.transactions.delete(id);
    EventBus.emit('data:changed');
  },

  /**
   * Obtiene las deudas con su progreso calculado.
   */
  async getDebtsWithProgress() {
    const debts = await db.debts.toArray();
    const transactions = await db.transactions.toArray();

    return debts.map(debt => {
      const payments = transactions.filter(t => t.type === 'debt_payment' && t.debtId === debt.id);
      const state = DebtEngine.calculateState(debt, payments);
      return {
        ...debt,
        ...state
      };
    });
  },

  /**
   * Agrega una deuda.
   */
  async addDebt(debt) {
    await db.debts.add(debt);
    EventBus.emit('data:changed');
  },

  /**
   * Edita una deuda.
   */
  async editDebt(id, updatedDebt) {
    await db.debts.update(id, updatedDebt);
    EventBus.emit('data:changed');
  },

  /**
   * Elimina una deuda.
   */
  async deleteDebt(id) {
    await db.debts.delete(id);
    EventBus.emit('data:changed');
  },

  /**
   * Obtiene las metas con su progreso calculado.
   */
  async getGoalsWithProgress() {
    const goals = await db.goals.toArray();
    
    // Para simplificar, calculamos el currentAmount acumulando transacciones asociadas a la meta si las hubiera,
    // o usando el currentAmount que actualiza el usuario en la meta.
    // En este diseño simplificado, la meta guarda su saldo acumulado directo, pero se puede alimentar
    // desde snapshots o transacciones.
    return goals.map(goal => {
      const state = GoalEngine.calculateProgress(goal);
      return {
        ...goal,
        ...state
      };
    });
  },

  /**
   * Agrega una meta.
   */
  async addGoal(goal) {
    await db.goals.add(goal);
    EventBus.emit('data:changed');
  },

  /**
   * Edita una meta.
   */
  async editGoal(id, updatedGoal) {
    await db.goals.update(id, updatedGoal);
    EventBus.emit('data:changed');
  },

  /**
   * Elimina una meta.
   */
  async deleteGoal(id) {
    await db.goals.delete(id);
    EventBus.emit('data:changed');
  },

  /**
   * Registra un Snapshot financiero MFP-Snapshot-v1 o v2.
   */
  async importSnapshot(snapshotData) {
    let snapshotToImport = snapshotData;
    const migratedBuckets = [];
    let isV1 = false;

    // Lógica de migración automática para snapshots antiguos (v1 -> v2)
    if (snapshotData.assets) {
      const cleanAssets = snapshotData.assets.map(asset => {
        if (asset.children && Array.isArray(asset.children)) {
          isV1 = true;
          asset.children.forEach(child => {
            migratedBuckets.push({
              id: child.id,
              name: child.name,
              assetId: asset.id,
              balance: child.balance,
              color: child.color || null,
              icon: child.icon || null
            });
          });
          const { children, ...rest } = asset;
          return rest;
        }
        return asset;
      });

      if (isV1) {
        snapshotToImport = {
          ...snapshotData,
          schema: 'MFP-Snapshot-v2',
          assets: cleanAssets,
          buckets: migratedBuckets
        };
      }
    }

    // 1. Agregar a snapshots (guardar versión migrada)
    await db.snapshots.add({
      date: snapshotToImport.date,
      createdAt: Date.now(),
      rawJson: snapshotToImport
    });

    // 2. Insertar activos incluidos si no existen
    if (snapshotToImport.assets) {
      for (const asset of snapshotToImport.assets) {
        const exists = await db.assets.get(asset.id);
        if (!exists) {
          await db.assets.add({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            isActive: true
          });
        }
      }
    }

    // 3. Insertar apartados (buckets) incluidos si no existen
    if (snapshotToImport.buckets) {
      for (const bucket of snapshotToImport.buckets) {
        const exists = await db.buckets.get(bucket.id);
        if (!exists) {
          await db.buckets.add({
            id: bucket.id,
            name: bucket.name,
            assetId: bucket.assetId
          });
        }
      }
    }

    // 4. Insertar deudas incluidas si no existen
    if (snapshotToImport.debts) {
      for (const debt of snapshotToImport.debts) {
        const exists = await db.debts.get(debt.id);
        if (!exists) {
          await db.debts.add({
            id: debt.id,
            name: debt.name,
            amount: debt.amount,
            originalAmount: debt.originalAmount || debt.amount,
            status: debt.status || 'active',
            startDate: snapshotToImport.date,
            notes: 'Importado de snapshot'
          });
        }
      }
    }

    // 5. Insertar metas incluidas si no existen
    if (snapshotToImport.goals) {
      for (const goal of snapshotToImport.goals) {
        const exists = await db.goals.get(goal.id);
        if (!exists) {
          await db.goals.add({
            id: goal.id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount || 0,
            targetDate: goal.targetDate || dayjs().add(1, 'year').format('YYYY-MM-DD')
          });
        }
      }
    }

    EventBus.emit('data:changed');
  },

  /**
   * Importa transacciones MFP-Events-v1.
   */
  async importTransactions(eventsData) {
    // Autoprovisionar activos referenciados si no existen en la BD
    const uniqueAssetIds = new Set();
    eventsData.events.forEach(ev => {
      if (ev.assetId) uniqueAssetIds.add(ev.assetId);
      if (ev.destinationAssetId) uniqueAssetIds.add(ev.destinationAssetId);
    });

    for (const assetId of uniqueAssetIds) {
      const exists = await db.assets.get(assetId);
      if (!exists) {
        // Intentar deducir un tipo inteligente por su ID (ej: tdc, crédito)
        const isLiability = assetId.includes('credit') || assetId.includes('tdc') || assetId.includes('deuda') || assetId.includes('loan');
        await db.assets.add({
          id: assetId,
          name: assetId.charAt(0).toUpperCase() + assetId.slice(1).replace(/[-_]/g, ' '),
          type: isLiability ? 'liability_credit' : 'liquid',
          isActive: true
        });
      }
    }

    const txsToInsert = eventsData.events.map(ev => ({
      ...ev,
      createdAt: Date.now()
    }));
    
    await db.transactions.bulkAdd(txsToInsert);
    EventBus.emit('data:changed');
  },

  /**
   * Obtiene todos los datos compilados para el Dashboard.
   */
  async getDashboardData() {
    const today = dayjs();
    const currentMonthStart = today.startOf('month').format('YYYY-MM-DD');
    const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD');

    const prevMonthStart = today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const prevMonthEnd = today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

    // 1. Obtener estados de balances unificados (hoy vs hace un mes)
    const summary = await this.getFinancialSummary(today.format('YYYY-MM-DD'));
    const summaryMonthAgo = await this.getFinancialSummary(today.subtract(1, 'month').format('YYYY-MM-DD'));

    // 2. Obtener todas las transacciones
    const txs = await db.transactions.toArray();
    const assets = await db.assets.toArray();
    const dbSnapshots = await db.snapshots.toArray();
    const snapshots = dbSnapshots.map(s => ({
      ...s,
      ...s.rawJson
    }));

    // 3. Calcular ingresos/egresos del mes actual y mes anterior
    const currentStats = AnalyticsEngine.getIncomeVsExpense(txs, currentMonthStart, currentMonthEnd);
    const prevStats = AnalyticsEngine.getIncomeVsExpense(txs, prevMonthStart, prevMonthEnd);

    // 4. Generar insights
    const insights = InsightsEngine.generate(
      currentStats,
      prevStats,
      summary.netWorth,
      summaryMonthAgo.netWorth,
      summary.liquidity
    );

    // 5. Historial de patrimonio de los últimos 6 meses para minigráfico
    const history6Months = AnalyticsEngine.getNetWorthHistory(assets, snapshots, txs, 6);

    return {
      summary,
      previousNetWorth: summaryMonthAgo.netWorth,
      currentMonthStats: currentStats,
      insights,
      history: history6Months
    };
  }
};
