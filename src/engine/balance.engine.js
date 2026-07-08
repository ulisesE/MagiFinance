/**
 * @fileoverview Motor de agregación financiera (Algoritmo Checkpoint + Delta).
 */

/**
 * Calculador de balances consolidando snapshots y transacciones.
 */
export const BalanceEngine = {
  /**
   * Calcula los saldos consolidados de todos los Activos a una fecha objetivo.
   * @param {Array} seedAssets Lista de activos registrados en el sistema.
   * @param {Array} snapshots Lista de todos los snapshots.
   * @param {Array} transactions Lista de transacciones.
   * @param {string} targetDate Fecha límite de cálculo (YYYY-MM-DD).
   * @returns {Object} Balances consolidados y métricas { assets, netWorth, liquidNetWorth, assetsTotal, liabilitiesTotal }
   */
  calculateState(seedAssets, snapshots, transactions, targetDate) {
    // 1. Encontrar el último snapshot en o antes de la fecha objetivo
    const sortedSnapshots = [...snapshots]
      .filter(s => s.date <= targetDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // Descendente por fecha

    const latestSnapshot = sortedSnapshots[0];
    const snapshotDate = latestSnapshot ? latestSnapshot.date : '0000-00-00';

    // Map para acumular los saldos de los activos
    const assetsMap = new Map();

    // Inicializar con los activos del sistema (saldo 0 por defecto)
    seedAssets.forEach(asset => {
      assetsMap.set(asset.id, {
        ...asset,
        balance: 0
      });
    });

    // 2. Si hay snapshot, inicializar balances con los datos del snapshot
    if (latestSnapshot && latestSnapshot.assets) {
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
          // Si el snapshot tiene un activo que no está en los activos del sistema (e.g. histórico)
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

    // 3. Obtener transacciones posteriores al snapshot y hasta la fecha objetivo
    const activeTx = transactions
      .filter(t => t.date > snapshotDate && t.date <= targetDate)
      .sort((a, b) => a.date.localeCompare(b.date)); // Cronológico

    // 4. Aplicar transacciones como deltas
    activeTx.forEach(tx => {
      const source = assetsMap.get(tx.assetId);
      
      switch (tx.type) {
        case 'income':
          if (source) source.balance += tx.amount;
          break;
          
        case 'expense':
        case 'debt_payment':
          if (source) source.balance -= tx.amount;
          break;
          
        case 'transfer':
          if (source) source.balance -= tx.amount;
          const dest = assetsMap.get(tx.destinationAssetId);
          if (dest) dest.balance += tx.amount;
          break;
          
        case 'adjustment':
          // El ajuste fija el saldo del activo a un monto específico
          if (source) source.balance = tx.amount;
          break;
      }
    });

    // 5. Calcular agregados de Patrimonio
    let assetsTotal = 0;
    let liabilitiesTotal = 0;
    let liquidAssetsTotal = 0;

    const computedAssets = Array.from(assetsMap.values());

    computedAssets.forEach(asset => {
      const balance = asset.balance;
      
      // Clasificación contable
      if (asset.type.startsWith('liability_')) {
        // Los pasivos restan al patrimonio. 
        // Si el saldo es negativo (e.g. -$5,000 en TDC), sumamos su valor absoluto a las deudas.
        liabilitiesTotal += Math.abs(balance);
      } else {
        assetsTotal += balance;
        if (asset.type === 'liquid') {
          liquidAssetsTotal += balance;
        }
      }
    });

    const netWorth = assetsTotal - liabilitiesTotal;
    const liquidNetWorth = liquidAssetsTotal - liabilitiesTotal;

    return {
      assets: computedAssets,
      assetsTotal,
      liabilitiesTotal,
      netWorth,
      liquidNetWorth
    };
  }
};
