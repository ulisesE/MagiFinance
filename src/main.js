/**
 * @fileoverview Punto de entrada principal de la aplicación.
 * Registra rutas, inicializa el enrutador y controla los ciclos de vida generales.
 */

import './styles/variables.css';
import './styles/main.css';
import { Router } from './utils/router';
import { renderDashboard } from './pages/dashboard.page';
import { renderAnalytics } from './pages/analytics.page';
import { renderTransactions } from './pages/transactions.page';
import { renderAssets } from './pages/assets.page';
import { renderDebts } from './pages/debts.page';
import { renderGoals } from './pages/goals.page';
import { renderSettings } from './pages/settings.page';
import { renderBuckets } from './pages/buckets.page';
import { Queries } from './storage/queries';
import { EventBus } from './utils/event-bus';

// 1. Definición del mapeo de rutas SPA
const routes = {
  '/dashboard': renderDashboard,
  '/analytics': renderAnalytics,
  '/transactions': renderTransactions,
  '/assets': renderAssets,
  '/buckets': renderBuckets,
  '/debts': renderDebts,
  '/goals': renderGoals,
  '/settings': renderSettings
};

document.addEventListener('DOMContentLoaded', async () => {
  // 2. Inicializar enrutador
  const router = new Router(routes, 'main-content');

  // 3. Configurar preferencias iniciales (e.g., Modo Visual / Tema)
  const savedTheme = await Queries.getSetting('theme') || 'dark';
  applyTheme(savedTheme);

  // Botón rápido de alternancia de tema en el Header
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    // Actualizar icono inicial
    updateThemeIcon(themeToggleBtn, savedTheme);

    themeToggleBtn.addEventListener('click', async () => {
      const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      await Queries.setSetting('theme', newTheme);
      applyTheme(newTheme);
      updateThemeIcon(themeToggleBtn, newTheme);
    });
  }

  // 4. Suscribirse a cambios globales de datos en la BD para refrescar la página actual
  EventBus.subscribe('data:changed', () => {
    console.log('Se detectaron cambios en la base de datos local. Refrescando vista activa...');
    router.handleRoute(); // Vuelve a ejecutar el renderizador de la página activa
  });

  // 5. Registro de Service Worker para PWA Offline (Solo en producción)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registrado correctamente con alcance:', reg.scope);
        })
        .catch(err => {
          console.error('Error al registrar Service Worker:', err);
        });
    });
  }
});

/**
 * Aplica clases de diseño del tema al body del documento.
 * @param {string} theme ('light' | 'dark')
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    document.getElementById('theme-color-meta')?.setAttribute('content', '#0f1210');
  } else {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    document.getElementById('theme-color-meta')?.setAttribute('content', '#006c47');
  }
}

/**
 * Actualiza el icono del botón de alternancia de tema.
 */
function updateThemeIcon(btn, theme) {
  const icon = btn.querySelector('.icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }
}
