/**
 * @fileoverview Gestor de diálogos (modales) reutilizable y animado.
 */

const overlay = document.getElementById('global-dialog-overlay');
const dialog = document.getElementById('global-dialog');

export const DialogManager = {
  /**
   * Abre el diálogo global con contenido personalizado.
   * @param {string} htmlContent Contenido HTML para inyectar en el modal.
   * @param {Function} [onOpen] Callback a ejecutar después de renderizar el contenido.
   */
  open(htmlContent, onOpen) {
    if (!overlay || !dialog) return;

    dialog.innerHTML = `
      <button class="dialog-close-btn" style="position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; color: var(--md-sys-color-on-surface-variant)">
        <span class="icon">close</span>
      </button>
      ${htmlContent}
    `;

    // Botón de cerrar por defecto
    const closeBtn = dialog.querySelector('.dialog-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Cerrar al dar click fuera del diálogo
    const clickOutsideHandler = (e) => {
      if (e.target === overlay) {
        this.close();
        overlay.removeEventListener('click', clickOutsideHandler);
      }
    };
    overlay.addEventListener('click', clickOutsideHandler);

    overlay.classList.add('active');

    if (onOpen) {
      onOpen(dialog);
    }
  },

  /**
   * Cierra el diálogo global.
   */
  close() {
    if (!overlay) return;
    overlay.classList.remove('active');
  }
};
