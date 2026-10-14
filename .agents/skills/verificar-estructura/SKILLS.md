---
name: verificar-estructura
description: Verifica que el orden de scripts en index.html y los contratos globales (window.JM*) se mantengan correctos. Úsalo cuando se añadan o modifiquen scripts.
---

## Qué hago

- Reviso el orden de las etiquetas `<script>` en `index.html`.
- Verifico que el orden coincida con el contrato global definido en AGENTS.md.
- Compruebo que cada archivo JS nuevo siga el patrón IIFE y exponga su API en `window.JM*`.

## Cuándo usarme

Úsalo cuando:

- Se añada un nuevo archivo JS al proyecto
- Se modifique el orden de las etiquetas `<script>` en `index.html`
- Se refactorice un módulo existente

## Referencia del contrato

Orden correcto según AGENTS.md:

1. `js/vendor/xlsx.full.min.js` -> `window.XLSX`
2. `js/storage.js` -> `window.JMStorage`
3. `js/excelHandler.js` -> `window.JMExcel`
4. `js/search.js` -> `window.JMSearch`
5. `data/recursos.js` -> `window.JM_SEED`
6. `js/app.js` -> Controlador de UI

## Verificación

Revisa `index.html` y confirma que el orden de los scripts coincida.
Revisa cada archivo JS nuevo y confirma que use el patrón IIFE y exponga su API correctamente.