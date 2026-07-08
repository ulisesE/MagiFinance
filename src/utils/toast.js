/**
 * @fileoverview Utility to display global toast notifications (Snackbars) in MagiFinance.
 */

export const Toast = {
  _timeout: null,

  /**
   * Displays a global toast notification.
   * @param {string} message Message text to display.
   * @param {'success'|'error'|'info'} [type] Type of toast (affects border color and icon).
   * @param {number} [duration] Display duration in ms (default 3000ms).
   */
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('global-snackbar');
    const content = document.getElementById('snackbar-content');
    const msgElement = document.getElementById('snackbar-message');
    const iconElement = document.getElementById('snackbar-icon');

    if (!container || !content || !msgElement) return;

    // Set message text
    msgElement.textContent = message;

    // Set matching MD3 icon
    if (iconElement) {
      if (type === 'success') {
        iconElement.textContent = 'check_circle';
        iconElement.style.color = 'var(--color-income)';
      } else if (type === 'error') {
        iconElement.textContent = 'error';
        iconElement.style.color = 'var(--md-sys-color-error)';
      } else {
        iconElement.textContent = 'info';
        iconElement.style.color = 'var(--color-transfer)';
      }
    }

    // Set class styling
    content.className = `snackbar ${type}`;

    // Slide in
    container.classList.add('show');

    // Reset previous timeouts
    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    // Slide out after duration
    this._timeout = setTimeout(() => {
      container.classList.remove('show');
    }, duration);
  },

  success(message, duration) {
    this.show(message, 'success', duration);
  },

  error(message, duration) {
    this.show(message, 'error', duration);
  },

  info(message, duration) {
    this.show(message, 'info', duration);
  }
};
