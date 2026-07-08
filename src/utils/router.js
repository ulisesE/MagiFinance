/**
 * @fileoverview Router reactivo basado en Hash para SPA sin dependencias.
 */

export class Router {
  /**
   * Crea una instancia del enrutador.
   * @param {Object.<string, Function>} routes Mapeo de rutas (ej: '/dashboard') a manejadores.
   * @param {string} [containerId] ID del contenedor del DOM principal.
   */
  constructor(routes, containerId = 'main-content') {
    this.routes = routes;
    this.containerId = containerId;
    
    // Escuchar eventos de cambio de ruta
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  /**
   * Obtiene el contenedor principal del DOM.
   * @returns {HTMLElement}
   */
  get container() {
    return document.getElementById(this.containerId);
  }

  /**
   * Maneja el enrutamiento al cargar o cambiar el hash.
   */
  handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    let path = hash.substring(1); // Remover '#'

    // Si el path no empieza con /, lo agregamos
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Actualizar clases activas en menús de navegación (Bottom Nav y Sidebar)
    document.querySelectorAll('.nav-item, .sidebar-item').forEach(el => {
      const href = el.getAttribute('href');
      // Coincidencia exacta o parcial
      if (href === hash || (href === '#/dashboard' && hash === '')) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Encontrar manejador
    const routeHandler = this.routes[path] || this.routes['/dashboard'];

    if (this.container) {
      this.container.innerHTML = ''; // Limpiar contenedor
      if (routeHandler) {
        routeHandler(this.container);
      } else {
        this.container.innerHTML = `
          <div class="card flex-column align-center gap-md">
            <span class="icon" style="font-size: 48px; color: var(--md-sys-color-error)">error</span>
            <h2>404 - Página No Encontrada</h2>
            <p>La sección a la que intentas ingresar no existe.</p>
            <a href="#/dashboard" class="btn btn-primary">Volver al Dashboard</a>
          </div>
        `;
      }
    }
  }

  /**
   * Navega programáticamente a una ruta.
   * @param {string} path Ruta sin el hash (ej: '/settings').
   */
  navigate(path) {
    const targetPath = path.startsWith('/') ? path : '/' + path;
    window.location.hash = targetPath;
  }
}
