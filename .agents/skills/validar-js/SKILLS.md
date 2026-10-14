---
name: validar-js
description: Verifica la sintaxis de todos los archivos JS del proyecto y detecta errores básicos. Úsalo cuando se modifiquen archivos JS o antes de confirmar cambios.
---

## Qué hago

- Ejecuto `node --check` sobre cada archivo `.js` del directorio `js/` para verificar errores de sintaxis.
- Reporto cualquier archivo que falle, mostrando el error exacto.

## Cuándo usarme

Úsalo después de cualquier modificación a un archivo JS.
También úsalo antes de hacer commit de cambios que afecten a la lógica del proyecto.

## Cómo ejecutar

Ejecuta este comando para verificar todos los archivos JS:

!`find js -name "*.js" -not -path "*/vendor/*" -exec node --check {} \; 2>&1`

Si algún archivo falla, muestra el error y sugiere una corrección.