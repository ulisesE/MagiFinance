/**
 * @fileoverview Motor de agregación financiera (Algoritmo Checkpoint + Delta).
 */

/**
 * Calculador de balances consolidando snapshots y transacciones.
 */
export const BalanceEngine = {
  /**
   * Calcula los saldos consolidados de todos los Activos y Apartados a una fecha objetivo.
   * @param {Array} seedAssets Lista de activos registrados en el sistema.
   * @param {Array} seedBuckets Lista de apartados (buckets) registrados.
   * @param {Array} snapshots Lista de todos los snapshots.
   * @param {Array} transactions Lista de transacciones.
   * @param {string} targetDate Fecha límite de cálculo (YYYY-MM-DD).
   * @returns {Object} Balances consolidados y métricas
   */
  calculateState(seedAssets, seedBuckets, snapshots, transactions, targetDate) {
    // Compatibilidad retrospectiva con la firma antigua de 4 parámetros:
    // (seedAssets, snapshots, transactions, targetDate)
    if (targetDate === undefined && typeof transactions === 'string') {
      targetDate = transactions;
      transactions = snapshots;
      snapshots = seedBuckets;
      seedBuckets = [];
    }

    // 1. Encontrar el último snapshot en o antes de la fecha objetivo
    const sortedSnapshots = [...snapshots]
      .filter(s => s.date <= targetDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // Descendente por fecha

    const latestSnapshot = sortedSnapshots[0];
    const snapshotDate = latestSnapshot ? latestSnapshot.date : '0000-00-00';

    // Maps para acumular saldos
    const assetsMap = new Map();
    const bucketsMap = new Map();

    // Inicializar activos con saldo 0
    seedAssets.forEach(asset => {
      assetsMap.set(asset.id, {
        ...asset,
        balance: 0
      });
    });

    // Inicializar apartados con saldo 0
    seedBuckets.forEach(bucket => {
      bucketsMap.set(bucket.id, {
        ...bucket,
        balance: 0
      });
    });

    // 2. Inicializar con los datos del último snapshot (si existe)
    if (latestSnapshot) {
      if (latestSnapshot.assets) {
        latestSnapshot.assets.forEach(snapAsset => {
          const existing = assetsMap.get(snapAsset.id);
          if (existing) {
            assetsMap.set(snapAsset.id, {
              ...existing,
              name: snapAsset.name || existing.name,
              type: snapAsset.type || existing.type,
              balance: snapAsset.balance
            });
          } else {
            assetsMap.set(snapAsset.id, {
              id: snapAsset.id,
              name: snapAsset.name,
              type: snapAsset.type,
              isActive: true,
              balance: snapAsset.balance
            });
          }
        });
      }

      if (latestSnapshot.liabilities) {
        latestSnapshot.liabilities.forEach(snapLiability => {
          const existing = assetsMap.get(snapLiability.id);
          let dbType = snapLiability.type;
          if (dbType === 'credit_card') dbType = 'liability_credit';
          else if (dbType === 'debt' || dbType === 'loan') dbType = 'liability_debt';
          else if (dbType === 'payable') dbType = 'liability_payable';
          else if (!dbType?.startsWith('liability_')) {
            dbType = 'liability_' + dbType;
          }

          const balanceVal = -Math.abs(snapLiability.balance || 0);

          if (existing) {
            assetsMap.set(snapLiability.id, {
              ...existing,
              name: snapLiability.name || existing.name,
              type: dbType || existing.type,
              balance: balanceVal,
              statementBalance: snapLiability.statementBalance || 0,
              paymentDueDate: snapLiability.paymentDueDate || null,
              statementDate: snapLiability.statementDate || null
            });
          } else {
            assetsMap.set(snapLiability.id, {
              id: snapLiability.id,
              name: snapLiability.name,
              type: dbType,
              isActive: true,
              balance: balanceVal,
              statementBalance: snapLiability.statementBalance || 0,
              paymentDueDate: snapLiability.paymentDueDate || null,
              statementDate: snapLiability.statementDate || null
            });
          }
        });
      }

      if (latestSnapshot.buckets) {
        latestSnapshot.buckets.forEach(snapBucket => {
          const existing = bucketsMap.get(snapBucket.id);
          if (existing) {
            bucketsMap.set(snapBucket.id, {
              ...existing,
              name: snapBucket.name || existing.name,
              assetId: snapBucket.assetId || existing.assetId,
              balance: snapBucket.balance
            });
          } else {
            bucketsMap.set(snapBucket.id, {
              id: snapBucket.id,
              name: snapBucket.name,
              assetId: snapBucket.assetId,
              balance: snapBucket.balance,
              isActive: true
            });
          }
        });
      }
    }

    // 3. Obtener transacciones posteriores al snapshot y hasta la fecha objetivo
    const activeTx = transactions
      .filter(t => t.date > snapshotDate && t.date <= targetDate)
      .sort((a, b) => a.date.localeCompare(b.date)); // Cronológico

    // 4. Aplicar transacciones como deltas tanto a Activos como a Apartados (Buckets)
    activeTx.forEach(tx => {
      const sourceAsset = assetsMap.get(tx.assetId);
      const sourceBucket = tx.bucketId ? bucketsMap.get(tx.bucketId) : null;
      
      switch (tx.type) {
        case 'income':
          if (sourceAsset) sourceAsset.balance += tx.amount;
          if (sourceBucket) sourceBucket.balance += tx.amount;
          break;
          
        case 'expense':
        case 'debt_payment':
          if (sourceAsset) sourceAsset.balance -= tx.amount;
          if (sourceBucket) sourceBucket.balance -= tx.amount;
          break;
          
        case 'transfer':
          if (sourceAsset) sourceAsset.balance -= tx.amount;
          if (sourceBucket) sourceBucket.balance -= tx.amount;
          
          const destAsset = assetsMap.get(tx.destinationAssetId);
          if (destAsset) destAsset.balance += tx.amount;
          
          const destBucket = tx.destinationBucketId ? bucketsMap.get(tx.destinationBucketId) : null;
          if (destBucket) destBucket.balance += tx.amount;
          break;
          
        case 'adjustment':
          if (sourceAsset) sourceAsset.balance = tx.amount;
          if (sourceBucket) sourceBucket.balance = tx.amount;
          break;
      }
    });

    // 5. Calcular agregados contables de Patrimonio y Liquidez
    let assetsTotal = 0;
    let liabilitiesTotal = 0;
    let liquidAssetsTotal = 0;

    const computedAssets = Array.from(assetsMap.values());
    computedAssets.forEach(asset => {
      const balance = asset.balance;
      
      if (asset.type && asset.type.startsWith('liability_')) {
        liabilitiesTotal += Math.abs(balance);
      } else {
        assetsTotal += balance;
        if (asset.type === 'liquid' || asset.type === 'savings' || asset.type === 'cash') {
          liquidAssetsTotal += balance;
        }
      }
    });

    // Sumar saldos de todos los apartados (reservado) asociados a activos líquidos
    const computedBuckets = Array.from(bucketsMap.values());
    let reservedTotal = 0;
    computedBuckets.forEach(bucket => {
      const parentAsset = assetsMap.get(bucket.assetId);
      if (parentAsset && (parentAsset.type === 'liquid' || parentAsset.type === 'savings' || parentAsset.type === 'cash')) {
        reservedTotal += bucket.balance;
      }
    });

    const netWorth = assetsTotal - liabilitiesTotal;

    return {
      assets: computedAssets,
      buckets: computedBuckets,
      assetsTotal,
      liabilitiesTotal,
      netWorth,
      liquidity: liquidAssetsTotal,
      reserved: reservedTotal,
      available: liquidAssetsTotal - reservedTotal
    };
  },

  // Helper getters solicitados en Sección 3 para encapsulación
  getNetWorth(state) {
    return state.netWorth;
  },
  getLiquidity(state) {
    return state.liquidity;
  },
  getReservedAmount(state) {
    return state.reserved;
  },
  getAvailableCash(state) {
    return state.available;
  },
  getBucketTotals(state) {
    return state.buckets;
  }
};
