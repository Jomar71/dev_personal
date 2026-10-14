---
name: carga-excel
description: Guía para modificar o revisar el flujo de carga de archivos Excel en el proyecto. Úsalo cuando se toque excelHandler.js, la zona de drag-and-drop o la consolidación de hojas.
---

## Contexto

El proyecto carga datos desde archivos Excel usando SheetJS (`window.XLSX`), con lógica propia en `js/excelHandler.js` (`window.JMExcel`).

## Reglas

- Toda la lógica de parseo de Excel debe vivir en `js/excelHandler.js`, no en `app.js`.
- Usa `window.XLSX.read()` con `{ type: 'array' }` para leer el archivo como ArrayBuffer.
- Para consolidar múltiples hojas, itera `workbook.SheetNames` y concatena los resultados.
- La coincidencia de columnas debe ser flexible: normaliza encabezados (minúsculas, sin acentos con `NFD`) antes de comparar.
- Después de cargar, los datos deben pasar por `JMStorage.save()` antes de renderizarse.
- Si el archivo no tiene las columnas esperadas, muestra un mensaje claro al usuario, no falles en silencio.

## Checklist de revisión

- [ ] ¿Se está leyendo el archivo como ArrayBuffer y no como texto?
- [ ] ¿Se manejan múltiples hojas correctamente?
- [ ] ¿Los encabezados se normalizan antes de comparar?
- [ ] ¿Los datos cargados se persisten en localStorage?
- [ ] ¿Hay un mensaje claro si el archivo es inválido?
- [ ] ¿Se respeta el límite de ~4.5 MB de localStorage?

## Al terminar

Indica qué puntos del checklist has comprobado y cómo.