# 💳 MagiFinance - Libro Contable & Patrimonio Personal Offline

MagiFinance es una **Progressive Web App (PWA)** de finanzas personales diseñada para funcionar completamente de manera local y offline, sin necesidad de un backend. Utiliza **IndexedDB** a través de **Dexie.js** para la persistencia e implementa una arquitectura modular desacoplada de alto rendimiento basada en Javascript Vanilla.

El flujo de trabajo principal consiste en importar instantáneas de balance (Snapshots) y movimientos (Transacciones) generados por herramientas externas (como ChatGPT), combinándolos en tiempo real mediante un algoritmo **Checkpoint + Delta** para calcular tu patrimonio neto y ofrecer analíticas financieras y recomendaciones tácticas.

---

## 🚀 Características Clave

* 📱 **PWA Completa & Offline First**: Instalable en dispositivos móviles y de escritorio. Funciona 100% offline gracias a una estrategia de cacheo en Service Worker.
* 🔒 **Seguridad y Privacidad Absoluta**: Los datos financieros jamás salen de tu dispositivo. Todo permanece en el IndexedDB local de tu navegador.
* ⚙️ **Arquitectura Modular Desacoplada (Engine-View-Storage)**: Las reglas matemáticas y heurísticas de negocio viven en un motor de JS puro (`src/engine/`), totalmente aislado de la persistencia y del DOM.
* 📈 **Visualizaciones y Reportes**: Gráficos interactivos construidos con **Chart.js** para visualizar la evolución del patrimonio neto, la distribución de tus activos y los gastos por categoría.
* 🤖 **Smart JSON Importer**: Validador de esquemas e integridad de datos antes de guardar, con detección automática de duplicados para evitar inconsistencias al cargar archivos generados por ChatGPT.
* 💡 **Heurísticas e Insights**: Motor financiero rule-based que sugiere estrategias de amortización de deudas (Bola de Nieve y Avalancha), analiza tu tasa de ahorro y monitorea la salud de tu fondo de emergencia.

---

## 🛠️ Stack Tecnológico

* **Core**: Vanilla JavaScript ES2023
* **Diseño**: CSS Moderno, Material Design 3 & Material You (Modo Claro/Oscuro dinámico)
* **Persistencia**: Dexie.js (IndexedDB wrapper)
* **Gráficos**: Chart.js
* **Fechas**: Day.js
* **Construcción**: Vite

---

## 📁 Arquitectura y Estructura del Proyecto

El código está estructurado para ser fácilmente extensible (por ejemplo, para agregar en el futuro módulos de inventario, inversiones complejas o reportes fiscales) sin reescribir el núcleo:

```text
/src
├── /assets           # Iconos, logotipos y splash screens
├── /config           # Constantes del sistema y variables de temas
├── /styles           # Hojas de estilo globales (variables M3, layouts responsivos)
├── /utils            # Utilidades generales (EventBus Pub/Sub y Router de Hash)
├── /storage          # Cliente de Dexie.js y funciones auxiliares de consulta (Queries)
├── /engine           # Reglas financieras puras y aisladas (100% testeables en node/bun)
│   ├── balance.engine.js    # Consolidación Checkpoint + Delta
│   ├── analytics.engine.js  # Procesado de históricos e ingresos/egresos
│   ├── insights.engine.js   # Generación de sugerencias heurísticas
│   ├── json.engine.js       # Validador de integridad y duplicados de importaciones
│   ├── goal.engine.js       # Proyecciones matemáticas de metas
│   └── debt.engine.js       # Simulador de priorización de deudas
├── /components       # Componentes visuales encapsulados
└── /pages            # Controladores de vista SPA (Dashboard, Analíticas, Movimientos, etc.)
```

---

## 📥 Contratos de Datos JSON (Formatos MFP)

MagiFinance utiliza contratos versionados fijos para asegurar la compatibilidad hacia atrás durante años al importar información de ChatGPT.

### 1. Instantánea de Capital (`MFP-Snapshot-v1`)
Representa el estado actual de tus cuentas y activos en una fecha específica.

```json
{
  "schema": "MFP-Snapshot-v1",
  "timestamp": 1783457920,
  "date": "2026-06-01",
  "assets": [
    { "id": "bbva", "name": "BBVA Nómina", "type": "liquid", "balance": 45000.00 },
    { "id": "nu", "name": "Nu Ahorro", "type": "savings", "balance": 80000.00 },
    { "id": "efectivo", "name": "Efectivo Wallet", "type": "liquid", "balance": 1500.00 },
    { "id": "nu-tdc", "name": "Nu TDC", "type": "liability_credit", "balance": -5200.00 }
  ],
  "debts": [
    { "id": "credito-auto", "name": "Crédito Auto", "amount": 120000.00, "originalAmount": 150000.00, "status": "active" }
  ],
  "goals": [
    { "id": "fondo-emergencia", "name": "Fondo Emergencia", "targetAmount": 100000.00, "currentAmount": 80000.00, "targetDate": "2026-12-31" }
  ]
}
```

### 2. Flujo de Eventos/Transacciones (`MFP-Events-v1`)
Representa los movimientos que ocurren a lo largo del tiempo. Los saldos de las cuentas se acumularán a partir del snapshot más reciente aplicando estos deltas.

```json
{
  "schema": "MFP-Events-v1",
  "timestamp": 1783457920,
  "events": [
    {
      "id": "tx-201",
      "date": "2026-06-02",
      "type": "expense",
      "category": "Comida",
      "description": "Supermercado Walmart",
      "amount": 1250.00,
      "assetId": "bbva"
    },
    {
      "id": "tx-202",
      "date": "2026-06-12",
      "type": "transfer",
      "category": "Ahorro",
      "description": "Envío a Cajita Nu",
      "amount": 10000.00,
      "assetId": "bbva",
      "destinationAssetId": "nu"
    }
  ]
}
```

---

## 💻 Guía de Inicio Rápido

### Prerrequisitos
Tener instalado [Node.js](https://nodejs.org/) (o [Bun](https://bun.sh/) para un rendimiento óptimo de dependencias).

### Desarrollo Local
1. Clona el repositorio e ingresa a la carpeta:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd magifinance
   ```
2. Instala las dependencias necesarias:
   ```bash
   bun install
   # o bien: npm install
   ```
3. Inicia el servidor local de desarrollo:
   ```bash
   bun run dev
   # o bien: npm run dev
   ```
   La aplicación se abrirá en `http://localhost:3000/`.

### Construcción para Producción (Listo para GitHub Pages)
Compila el bundle optimizado para despliegue:
```bash
bun run build
# o bien: npm run build
```
Vite generará los archivos finales en la carpeta `/dist`. El archivo `vite.config.js` está preconfigurado con una ruta base relativa (`base: './'`), lo que significa que el directorio `/dist` puede cargarse en cualquier rama de GitHub Pages o subdirectorio de servidor y los recursos CSS/JS se enlazarán correctamente de forma automática.
