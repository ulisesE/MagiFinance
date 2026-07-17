/**
 * @fileoverview Validador e importador inteligente de esquemas JSON (MFP Contracts).
 */

/**
 * Validador inteligente de datos financieros en formato JSON.
 */
export const JsonEngine = {
  /**
   * Valida un archivo JSON de Snapshot financiero (MFP-Snapshot-v1).
   * @param {Object} json Objeto JSON importado.
   * @returns {Object} Resultado de la validación { isValid, errors, data }
   */
  validateSnapshotV1(json) {
    const errors = [];
    
    if (!json || typeof json !== 'object') {
      return { isValid: false, errors: ['El archivo no contiene un JSON válido.'] };
    }

    if (json.schema !== 'MFP-Snapshot-v1') {
      errors.push(`Esquema inválido. Se esperaba 'MFP-Snapshot-v1' y se obtuvo '${json.schema || 'desconocido'}'.`);
    }

    if (!json.date || !/^\d{4}-\d{2}-\d{2}$/.test(json.date)) {
      errors.push('La fecha del snapshot es obligatoria y debe tener formato YYYY-MM-DD.');
    }

    if (!Array.isArray(json.assets)) {
      errors.push('El campo "assets" es obligatorio y debe ser un arreglo.');
    } else {
      json.assets.forEach((asset, idx) => {
        if (!asset.id) errors.push(`Activo en posición ${idx}: Falta el ID obligatorio.`);
        if (!asset.name) errors.push(`Activo "${asset.id || idx}": Falta el nombre.`);
        if (!asset.type) errors.push(`Activo "${asset.id || idx}": Falta el tipo (liquid, savings, investment, fixed, liability_credit, liability_debt).`);
        if (typeof asset.balance !== 'number') errors.push(`Activo "${asset.id || idx}": El balance debe ser un número.`);
      });
    }

    if (json.debts && !Array.isArray(json.debts)) {
      errors.push('El campo "debts" debe ser un arreglo si está presente.');
    } else if (json.debts) {
      json.debts.forEach((debt, idx) => {
        if (!debt.id) errors.push(`Deuda en posición ${idx}: Falta el ID obligatorio.`);
        if (!debt.name) errors.push(`Deuda "${debt.id || idx}": Falta el nombre.`);
        if (typeof debt.amount !== 'number') errors.push(`Deuda "${debt.id || idx}": El monto debe ser un número.`);
      });
    }

    if (json.goals && !Array.isArray(json.goals)) {
      errors.push('El campo "goals" debe ser un arreglo si está presente.');
    } else if (json.goals) {
      json.goals.forEach((goal, idx) => {
        if (!goal.id) errors.push(`Meta en posición ${idx}: Falta el ID obligatorio.`);
        if (!goal.name) errors.push(`Meta "${goal.id || idx}": Falta el nombre.`);
        if (typeof goal.targetAmount !== 'number') errors.push(`Meta "${goal.id || idx}": El monto objetivo debe ser un número.`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: json
    };
  },

  /**
   * Valida un archivo JSON de Snapshot financiero v2 (MFP-Snapshot-v2).
   * @param {Object} json Objeto JSON importado.
   * @returns {Object} Resultado de la validación { isValid, errors, data }
   */
  validateSnapshotV2(json) {
    const errors = [];
    
    if (!json || typeof json !== 'object') {
      return { isValid: false, errors: ['El archivo no contiene un JSON válido.'] };
    }

    if (json.schema !== 'MFP-Snapshot-v2') {
      errors.push(`Esquema inválido. Se esperaba 'MFP-Snapshot-v2' y se obtuvo '${json.schema || 'desconocido'}'.`);
    }

    if (!json.date || !/^\d{4}-\d{2}-\d{2}$/.test(json.date)) {
      errors.push('La fecha del snapshot es obligatoria y debe tener formato YYYY-MM-DD.');
    }

    if (!Array.isArray(json.assets)) {
      errors.push('El campo "assets" es obligatorio y debe ser un arreglo.');
    } else {
      json.assets.forEach((asset, idx) => {
        if (!asset.id) errors.push(`Activo en posición ${idx}: Falta el ID obligatorio.`);
        if (!asset.name) errors.push(`Activo "${asset.id || idx}": Falta el nombre.`);
        if (!asset.type) {
          errors.push(`Activo "${asset.id || idx}": Falta el tipo (liquid, savings, investment, fixed, receivable).`);
        } else {
          const allowedTypes = ['liquid', 'savings', 'investment', 'fixed', 'receivable', 'liability_credit', 'liability_debt', 'liability_payable'];
          if (!allowedTypes.includes(asset.type) && !asset.type.startsWith('liability_')) {
            errors.push(`Activo "${asset.id || idx}": Tipo "${asset.type}" no reconocido.`);
          }
        }
        if (typeof asset.balance !== 'number') errors.push(`Activo "${asset.id || idx}": El balance debe ser un número.`);
      });
    }

    if (json.buckets && !Array.isArray(json.buckets)) {
      errors.push('El campo "buckets" debe ser un arreglo si está presente.');
    } else if (json.buckets) {
      json.buckets.forEach((bucket, idx) => {
        if (!bucket.id) errors.push(`Apartado en posición ${idx}: Falta el ID obligatorio.`);
        if (!bucket.name) errors.push(`Apartado "${bucket.id || idx}": Falta el nombre.`);
        if (!bucket.assetId) errors.push(`Apartado "${bucket.id || idx}": Falta el assetId del activo asociado.`);
        if (typeof bucket.balance !== 'number') errors.push(`Apartado "${bucket.id || idx}": El saldo debe ser un número.`);
      });
    }

    if (json.liabilities && !Array.isArray(json.liabilities)) {
      errors.push('El campo "liabilities" debe ser un arreglo si está presente.');
    } else if (json.liabilities) {
      json.liabilities.forEach((lib, idx) => {
        if (!lib.id) errors.push(`Pasivo en posición ${idx}: Falta el ID obligatorio.`);
        if (!lib.name) errors.push(`Pasivo "${lib.id || idx}": Falta el nombre.`);
        if (!lib.type) errors.push(`Pasivo "${lib.id || idx}": Falta el tipo (credit_card, debt, loan, payable).`);
        if (typeof lib.balance !== 'number') errors.push(`Pasivo "${lib.id || idx}": El balance debe ser un número.`);
      });
    }

    if (json.debts && !Array.isArray(json.debts)) {
      errors.push('El campo "debts" debe ser un arreglo si está presente.');
    } else if (json.debts) {
      json.debts.forEach((debt, idx) => {
        if (!debt.id) errors.push(`Deuda en posición ${idx}: Falta el ID obligatorio.`);
        if (!debt.name) errors.push(`Deuda "${debt.id || idx}": Falta el nombre.`);
        if (typeof debt.amount !== 'number') errors.push(`Deuda "${debt.id || idx}": El monto debe ser un número.`);
      });
    }

    if (json.goals && !Array.isArray(json.goals)) {
      errors.push('El campo "goals" debe ser un arreglo si está presente.');
    } else if (json.goals) {
      json.goals.forEach((goal, idx) => {
        if (!goal.id) errors.push(`Meta en posición ${idx}: Falta el ID obligatorio.`);
        if (!goal.name) errors.push(`Meta "${goal.id || idx}": Falta el nombre.`);
        if (typeof goal.targetAmount !== 'number') errors.push(`Meta "${goal.id || idx}": El monto objetivo debe ser un número.`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: json
    };
  },

  /**
   * Valida un archivo JSON de Transacciones (MFP-Events-v1).
   * @param {Object} json Objeto JSON importado.
   * @returns {Object} Resultado de la validación { isValid, errors, data }
   */
  validateTransactionsV1(json) {
    const errors = [];

    if (!json || typeof json !== 'object') {
      return { isValid: false, errors: ['El archivo no contiene un JSON válido.'] };
    }

    if (json.schema !== 'MFP-Events-v1') {
      errors.push(`Esquema inválido. Se esperaba 'MFP-Events-v1' y se obtuvo '${json.schema || 'desconocido'}'.`);
    }

    if (!Array.isArray(json.events)) {
      errors.push('El campo "events" es obligatorio y debe ser un arreglo.');
    } else {
      json.events.forEach((event, idx) => {
        const id = event.id || `index_${idx}`;
        if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
          errors.push(`Evento "${id}": La fecha es obligatoria y debe tener formato YYYY-MM-DD.`);
        }
        if (!event.type || !['income', 'expense', 'transfer', 'debt_payment', 'adjustment'].includes(event.type)) {
          errors.push(`Evento "${id}": El tipo debe ser income, expense, transfer, debt_payment o adjustment.`);
        }
        if (!event.category) {
          errors.push(`Evento "${id}": La categoría es obligatoria.`);
        }
        if (typeof event.amount !== 'number' || event.amount <= 0) {
          errors.push(`Evento "${id}": El monto es obligatorio y debe ser un número positivo.`);
        }
        if (!event.assetId) {
          errors.push(`Evento "${id}": El ID del activo origen (assetId) es obligatorio.`);
        }
        if (event.type === 'transfer' && !event.destinationAssetId) {
          errors.push(`Evento "${id}": La cuenta destino (destinationAssetId) es obligatoria para transferencias.`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: json
    };
  },

  /**
   * Compara los datos importados con la base de datos para buscar duplicidad.
   * @param {Object} data Datos importados validados.
   * @param {string} type Tipo de esquema ('snapshot' | 'events').
   * @param {Array} existingSnapshots Snapshots existentes en DB.
   * @param {Array} existingTransactions Transacciones existentes en DB.
   * @returns {Object} Resumen de duplicados y nuevos registros { newCount, duplicateCount, duplicatesList }
   */
  checkDuplicates(data, type, existingSnapshots, existingTransactions) {
    let newCount = 0;
    let duplicateCount = 0;
    const duplicatesList = [];

    if (type === 'snapshot') {
      const dates = existingSnapshots.map(s => s.date);
      if (dates.includes(data.date)) {
        duplicateCount = 1;
        duplicatesList.push(`Snapshot del día ${data.date}`);
      } else {
        newCount = 1;
      }
    } else if (type === 'events') {
      data.events.forEach(ev => {
        // Criterio de duplicidad para transacciones: coincidencia exacta de fecha, tipo, categoría, monto y assetId
        const isDup = existingTransactions.some(dbEv => 
          dbEv.date === ev.date &&
          dbEv.type === ev.type &&
          dbEv.category === ev.category &&
          dbEv.amount === ev.amount &&
          dbEv.assetId === ev.assetId &&
          dbEv.description === ev.description
        );

        if (isDup) {
          duplicateCount++;
          duplicatesList.push(`Tx ${ev.date} - ${ev.description || ev.category} ($${ev.amount})`);
        } else {
          newCount++;
        }
      });
    }

    return {
      newCount,
      duplicateCount,
      duplicatesList
    };
  }
};
