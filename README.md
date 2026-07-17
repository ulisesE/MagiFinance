# 💳 MagiFinance - Libro Contable & Patrimonio Personal Offline

MagiFinance es una **Progressive Web App (PWA)** de finanzas personales diseñada para funcionar completamente de manera local y offline, sin necesidad de un servidor o backend. Utiliza **IndexedDB** a través de **Dexie.js** para la persistencia de datos y está estructurada bajo principios de arquitectura modular desacoplada en Vanilla JavaScript.

El flujo de trabajo principal consiste en importar instantáneas de balance (Snapshots) y listas de movimientos (Transacciones) generados por herramientas externas (como ChatGPT), combinándolos en tiempo real mediante un algoritmo **Checkpoint + Delta** para calcular tu patrimonio neto, mostrar analíticas y ofrecer insights tácticos.

---

## 🚀 Características Clave

* 📱 **PWA Completa & Offline First**: Instalable en dispositivos móviles y de escritorio. Funciona 100% offline gracias a la estrategia de caché del Service Worker.
* 🔒 **Seguridad y Privacidad Absoluta**: Tus datos financieros jamás salen de tu dispositivo. Todo permanece en el IndexedDB local de tu navegador.
* 🏁 **Onboarding Interactivo**: Pantalla de bienvenida diseñada para guiarte en tu primer inicio, con accesos directos para la carga de tus datos iniciales o la creación manual de cuentas.
* 🤖 **Autoprovisionamiento Inteligente**: Al importar tus datos (Snapshots o Transacciones), el sistema registra y configura de forma automática las cuentas, activos, pasivos, deudas y metas asociados, eliminando la necesidad de crearlos previamente.
* ⚙️ **Algoritmo Checkpoint + Delta**: Las reglas de cálculo y agregación matemática están desacopladas en el núcleo del sistema (`src/engine/`), lo que permite realizar proyecciones eficientes.
* 📈 **Visualizaciones y Reportes**: Gráficos interactivos construidos con **Chart.js** para visualizar la evolución del patrimonio neto, la distribución de tus activos y los gastos por categoría.

---

## 🛠️ Stack Tecnológico

* **Core**: Vanilla JavaScript ES2023
* **Diseño**: CSS Moderno, Material Design 3 & Material You (Modo Claro/Oscuro dinámico)
* **Persistencia**: Dexie.js (IndexedDB)
* **Gráficos**: Chart.js
* **Fechas**: Day.js
* **Construcción**: Vite

---

## 📁 Estructura del Proyecto

```text
magifinance/
├── docs/             # Ficheros compilados de producción (despliegue a GitHub Pages)
├── public/           # Archivos estáticos estables (manifest, favicon, sw.js)
├── src/
│   ├── assets/       # Logotipos e imágenes estáticas
│   ├── engine/       # Reglas financieras aisladas y testeables (cálculo, validación, insights)
│   ├── pages/        # Controladores de vista SPA (Dashboard, Analíticas, Movimientos, etc.)
│   ├── storage/      # Cliente de Dexie.js e inicialización de IndexedDB (db.js y Queries)
│   ├── styles/       # Hojas de estilo globales y tokens de diseño Material You
│   ├── utils/        # Utilidades (EventBus de reactividad y Enrutador SPA)
│   └── main.js       # Punto de entrada de la aplicación
├── index.html        # Plantilla HTML de desarrollo
├── package.json      # Configuración de dependencias y scripts de construcción
└── vite.config.js    # Configuración de compilación de Vite
```

---

## 📥 Contratos de Datos JSON (Formatos MFP)

MagiFinance utiliza contratos fijos para asegurar la compatibilidad durante la importación de datos generados por Inteligencias Artificiales.

### 1. Instantánea de Capital (`MFP-Snapshot-v1`)
Representa la foto fija de tus cuentas, deudas y metas en una fecha específica de origen.

```json
{
  "schema": "MFP-Snapshot-v1",
  "timestamp": 1783468800,
  "date": "2026-07-08",
  "assets": [
    { "id": "bbva-apartados", "name": "BBVA Apartados", "type": "savings", "balance": 2784.26 },
    { "id": "efectivo-cartera", "name": "Efectivo en Cartera", "type": "liquid", "balance": 700.00 },
    { "id": "efectivo-reservado", "name": "Efectivo Reservado", "type": "liquid", "balance": 3000.00 },
    { "id": "bbva-tdc", "name": "Tarjeta BBVA", "type": "liability_credit", "balance": -19020.87 }
  ],
  "debts": [
    { "id": "credito-nomina-bbva", "name": "Crédito de Nómina BBVA", "amount": 0.00 },
    { "id": "equipo-audio", "name": "Bajo + Mezcladora", "amount": 2000.00 }
  ],
  "goals": [
    { "id": "ahorro-general", "name": "Ahorro General", "targetAmount": 10000.00 },
    { "id": "fondo-emergencia", "name": "Fondo de Emergencia", "targetAmount": 10000.00 },
    { "id": "metas", "name": "Metas", "targetAmount": 5000.00 }
  ]
}
```

### 2. Flujo de Transacciones (`MFP-Events-v1`)
Representa los movimientos que ocurren a lo largo del tiempo. Los saldos de las cuentas se acumularán a partir del snapshot más reciente aplicando estos deltas.

```json
{
  "schema": "MFP-Events-v1",
  "timestamp": 1783457950,
  "events": [
    {
      "id": "tx-301",
      "date": "2026-07-09",
      "type": "expense",
      "category": "Alimentos",
      "description": "Supermercado Semanal",
      "amount": 850.00,
      "assetId": "efectivo-cartera"
    },
    {
      "id": "tx-302",
      "date": "2026-07-15",
      "type": "income",
      "category": "Nómina",
      "description": "Pago Primera Quincena",
      "amount": 15000.00,
      "assetId": "bbva-apartados"
    }
  ]
}
```

## 🤖 Generación de Datos con Inteligencia Artificial (ChatGPT, Claude, etc.)

Para mantener actualizado tu sistema de manera automática, puedes usar un LLM (como ChatGPT, Claude o Gemini) para procesar tus estados de cuenta, correos de notificaciones de transacciones o textos bancarios y convertirlos a los formatos admitidos por MagiFinance.

### 1. Prompt para Generar Instantáneas de Capital (`MFP-Snapshot-v2`)

Utiliza este prompt para que la IA procese una lista de tus cuentas, deudas, metas y saldos actuales a una fecha de corte y genere el JSON de snapshot inicial o recurrente:

```text
Actúa como un convertidor de balances y estados financieros ultra-preciso. Tu objetivo es procesar la lista de saldos de mis cuentas, deudas, metas y tarjetas de crédito que te proporcionaré a continuación y generar un archivo JSON compatible con la aplicación MagiFinance utilizando el esquema de contrato `MFP-Snapshot-v2`.

### Instrucciones de Mapeo:
1. **schema**: Debe ser exactamente "MFP-Snapshot-v2".
2. **timestamp**: Coloca la marca de tiempo Unix actual en segundos correspondientes al momento de generación.
3. **date**: La fecha del snapshot en formato "YYYY-MM-DD" (por defecto la fecha de hoy).
4. **metadata**: Un objeto con la propiedad "currency" (ej. "MXN", "USD").
5. **assets**: Un arreglo de objetos para mis activos reales (cuentas con saldo positivo):
   - **id**: Identificador único corto en minúsculas y sin espacios (ej. "bbva", "nu", "efectivo-cartera", "casa-propia").
   - **name**: Nombre comercial legible (ej. "BBVA Débito", "Nu Cajita", "Casa Propia").
   - **type**: Tipo de activo. Debe ser uno de los siguientes:
     * "liquid": Efectivo o cuenta corriente de uso diario.
     * "savings": Cuentas de ahorro, plazos o apartados especiales.
     * "investment": Inversiones (bolsa, fondos, criptomonedas).
     * "fixed": Activos fijos o bienes (vehículos, propiedades).
     * "receivable": Cuentas por cobrar (dinero que otros te deben).
   - **balance**: Monto numérico con el saldo actual de la cuenta (positivo).
6. **buckets**: Un arreglo de objetos para mis apartados vinculados a cuentas de ahorro:
   - **id**: Identificador único corto (ej. "bucket-emergencia", "bucket-ahorro").
   - **assetId**: El ID de la cuenta madre donde reside el apartado (ej. "nu" o "bbva-apartados").
   - **name**: Nombre legible del apartado (ej. "Fondo de Emergencia", "Vacaciones").
   - **balance**: Saldo numérico positivo en el apartado.
7. **liabilities**: Un arreglo de objetos para mis pasivos (tarjetas de crédito y cuentas por pagar):
   - **id**: Identificador único corto (ej. "bbva-tdc", "prestamo-personal", "renta-por-pagar").
   - **name**: Nombre comercial legible (ej. "Tarjeta BBVA", "Renta por Pagar").
   - **type**: Tipo de pasivo. Debe ser:
     * "credit_card": Tarjeta de crédito.
     * "payable": Cuentas por pagar (dinero que debes a terceros).
   - **balance**: Monto numérico con el saldo total adeudado de la cuenta (positivo).
   - **statementBalance**: Saldo al corte (pago para no generar intereses) de la tarjeta.
   - **statementDate**: Fecha de corte de la tarjeta en formato "YYYY-MM-DD".
   - **paymentDueDate**: Fecha límite de pago de la tarjeta en formato "YYYY-MM-DD".
8. **debts**: Un arreglo de deudas tradicionales o préstamos con saldo y meta (opcional):
   - **id**: Identificador único (ej. "credito-auto").
   - **name**: Nombre de la deuda (ej. "Crédito Automotriz").
   - **amount**: El saldo insoluto restante (positivo).
9. **goals**: Un arreglo de metas de ahorro generales (opcional):
   - **id**: Identificador único (ej. "viaje-japon").
   - **name**: Nombre de la meta (ej. "Viaje a Japón").
   - **targetAmount**: El monto objetivo final a ahorrar.
   - **currentAmount**: El monto ya acumulado (opcional, por defecto 0).

### Formato de Salida:
Devuelve únicamente el archivo JSON válido, sin explicaciones ni bloques de código de texto adicionales fuera del JSON.

Aquí están mis datos de balance a procesar:
[PEGA AQUÍ TUS CUENTAS, TARJETAS DE CRÉDITO Y SALDOS]
```

### 2. Prompt para Generar Movimientos (`MFP-Events-v1`)

Utiliza este prompt para que la IA convierta una serie de cargos, abonos y transferencias recientes a un formato de deltas de MagiFinance:

```text
Actúa como un convertidor de datos financieros ultra-preciso. Tu objetivo es procesar la lista de transacciones/movimientos en texto plano o CSV que te proporcionaré a continuación y generar un archivo JSON compatible con la aplicación MagiFinance utilizando el esquema de contrato `MFP-Events-v1`.

### Instrucciones de Mapeo:
1. **schema**: Debe ser exactamente "MFP-Events-v1".
2. **timestamp**: Coloca la marca de tiempo Unix actual en segundos correspondientes al momento de generación.
3. **events**: Un arreglo de objetos, donde cada objeto representa una transacción con las siguientes propiedades:
   - **id**: Un identificador único corto para la transacción (por ejemplo, "tx-1", "tx-2", etc.).
   - **date**: La fecha del movimiento en formato "YYYY-MM-DD".
   - **type**: Tipo de transacción. Debe ser uno de los siguientes:
     * "income": Ingresos / Abonos.
     * "expense": Gastos / Cargos.
     * "transfer": Transferencias entre mis propias cuentas (requiere `destinationAssetId`).
     * "debt_payment": Pago de deudas / Créditos / Tarjetas.
     * "adjustment": Ajustes de saldo.
   - **category**: Categoría del movimiento (ej. "Alimentos", "Servicios", "Nómina", "Diversión", "Transporte", etc.).
   - **description**: Descripción legible o concepto del movimiento.
   - **amount**: El monto numérico de la transacción. Debe ser un número positivo (siempre mayor a 0). No incluyas signos de moneda ni comas de miles.
   - **assetId**: El identificador de la cuenta origen en MagiFinance donde ocurrió el movimiento. Debe mapearse a uno de los siguientes IDs de mis cuentas configuradas (ej. "bbva", "nu", "bbva-tdc", etc.).
   - **destinationAssetId**: (Solo si el `type` es "transfer") El ID de la cuenta destino donde se recibe el dinero (ej. si pago la tarjeta desde mi débito, `assetId` es "bbva" y `destinationAssetId` es "bbva-tdc").

### Formato de Salida:
Devuelve únicamente el archivo JSON válido, sin explicaciones ni bloques de texto adicionales fuera del JSON.

Aquí están mis movimientos a procesar:
[PEGA AQUÍ TUS MOVIMIENTOS BANCARIOS / TEXTO / CSV]
```

#### 💡 Consejos para la Importación:
- **Mantener Consistencia en IDs**: Asegúrate de que los `assetId` en el JSON coincidan exactamente con los identificadores de tus cuentas en la aplicación (puedes consultarlos o editarlos en la sección de **Cuentas/Activos**).
- **Evitar Duplicados**: El importador de MagiFinance es inteligente: si intentas cargar una transacción con la misma combinación exacta de fecha, tipo, categoría, descripción, monto y cuenta de origen que una ya de por sí registrada, la omitirá automáticamente.
- **Flujo de Trabajo Recomendado**: 
  1. Copia tus movimientos recientes o el balance de tu banco.
  2. Pega la información en uno de los prompts anteriores en ChatGPT/Claude.
  3. Guarda la respuesta generada en un archivo con extensión `.json` (ej. `snapshot-hoy.json` o `movimientos-julio.json`).
  4. Ve a MagiFinance, haz clic en **Importar JSON** o **Importar Snapshot** en el Dashboard o sección Movimientos y sube el archivo.

---

## 💻 Guía de Inicio Rápido

### Prerrequisitos
Tener instalado [Node.js](https://nodejs.org/) o bien [Bun](https://bun.sh/) (recomendado para un desempeño superior).

### Desarrollo Local
1. Ingresa a la carpeta del proyecto:
   ```bash
   cd magifinance
   ```
2. Instala las dependencias necesarias:
   ```bash
   bun install
   # o bien: npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   bun run dev
   # o bien: npm run dev
   ```
   La aplicación estará disponible localmente en `http://localhost:3000/`.

---

## 🚀 Despliegue en Producción (GitHub Pages)

Para compilar y empaquetar la aplicación de manera optimizada:
```bash
bun run build
# o bien: npm run build
```

Vite generará los archivos optimizados dentro del directorio `/docs`. `vite.config.js` está configurado con rutas de assets relativas (`base: './'`) y carpeta de salida `outDir: 'docs'`.

Para que se visualice correctamente en GitHub Pages:
1. Sube los archivos a tu repositorio (asegúrate de incluir la carpeta `/docs`).
2. En GitHub, ve a **Settings** ➔ **Pages**.
3. En **Build and deployment** ➔ **Source**, elige **Deploy from a branch**.
4. En **Branch**, selecciona tu rama principal (ej: `main` o `master`) y en la carpeta elige **/docs** en lugar de `/(root)`.
5. Haz clic en **Save**.
