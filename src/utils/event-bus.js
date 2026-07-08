/**
 * @fileoverview EventBus nativo y liviano para comunicación desacoplada entre componentes.
 */

/**
 * Bus de eventos desacoplado (Pub/Sub).
 */
export const EventBus = {
  /**
   * @type {Object.<string, Function[]>}
   */
  events: {},

  /**
   * Suscribe una función callback a un evento específico.
   * @param {string} event Nombre del evento.
   * @param {Function} callback Función a ejecutar cuando ocurra el evento.
   * @returns {Function} Función para cancelar la suscripción.
   */
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Retornamos una función para cancelar la suscripción fácilmente
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  },

  /**
   * Emite un evento con datos asociados a todos los suscriptores.
   * @param {string} event Nombre del evento.
   * @param {*} [data] Datos asociados al evento.
   */
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error en callback del evento "${event}":`, error);
      }
    });
  }
};
