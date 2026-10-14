# AGENTS.md

## Descripción del Repositorio
- Aplicación web 100% estática del lado del cliente (JS vanilla, HTML, CSS). Sin herramientas de compilación, empaquetadores ni `package.json`.
- Punto de entrada: `index.html`.

## Desarrollo y Servidor Local
- Servir localmente con cualquier servidor HTTP estático:
  - `npx serve .`
  - `python -m http.server 8080`
- Abrir `index.html` directamente mediante `file://` funciona gracias a los datos semilla integrados (`data/recursos.js`), pero las restricciones de seguridad del navegador impiden operaciones de `fetch` a archivos locales.

## Arquitectura y Orden de Scripts
- Los scripts se ejecutan en el ámbito global mediante etiquetas `<script>` en `index.html`. **No usar sintaxis de módulos ES (`import`/`export`)** a menos que se actualicen las etiquetas a `type="module"`.
- Orden de carga y contratos globales:
  1. `js/vendor/xlsx.full.min.js` -> `window.XLSX` (build offline de SheetJS).
  2. `js/storage.js` -> `window.JMStorage` (persistencia en localStorage bajo la clave `jm_repositorio_v3`, límite de ~4.5 MB).
  3. `js/excelHandler.js` -> `window.JMExcel` (coincidencia flexible de columnas, consolidación de múltiples hojas, wrapper de SheetJS).
  4. `js/search.js` -> `window.JMSearch` (eliminación de acentos/diacríticos con `NFD`, búsqueda por tokens con regex, resaltado con `<mark>`).
  5. `data/recursos.js` -> `window.JM_SEED` (conjunto de datos inicial de respaldo).
  6. `js/app.js` -> Controlador de UI, renderizado en el DOM, cambio de tema (`jm_theme`), drag-and-drop.

## Prioridad de Hidratación de Datos
- Al iniciar, `app.js` comprueba:
  1. `localStorage` (`JMStorage.load()`). Si existen datos, los utiliza.
  2. Si está vacío, recurre a `window.JM_SEED` de `data/recursos.js` y los guarda en `localStorage`.
  3. Si ambos están vacíos, muestra el estado vacío con zona de arrastre (`#emptyState`).

## Particularidades y Advertencias
- `data/recursos.js`: Contiene una asignación JSON minificada de una sola línea a `window.JM_SEED`. Evitar leer sin límite de líneas o realizar ediciones basadas en líneas.
- Patrón de módulos: Cada archivo JS está envuelto en una IIFE `(function () { 'use strict'; ... window.JM... = ...; })();`. Mantener este patrón en cualquier script nuevo.
- Sin suite de pruebas automatizada: Validar cambios de JS en el navegador o mediante scripts puntuales en Node (`node -e "..."` simulando `window` si es necesario).

## Memoria
- Al iniciar una sesión nueva, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Cuando el usuario diga "terminamos" o "guarda esto", actualiza `MEMORY.md`: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

