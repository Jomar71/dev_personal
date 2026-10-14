# MEMORY.md

## Identidad del Proyecto
- **Nombre**: jmpersonal
- **Propósito**: Gestión de recursos/agenda con persistencia local y carga desde Excel.
- **Autor**: Desarrollador colombiano, trabaja desde VS Code en Windows 11.
- **Idioma de trabajo**: Español (Colombia). Las respuestas y comentarios del código deben ser en español.

## Stack Técnico Confirmado
- JavaScript vanilla (sin frameworks, sin TypeScript).
- HTML5 + CSS3 puro.
- SheetJS (xlsx) como única dependencia externa, cargada localmente desde `js/vendor/`.
- Sin build tools, sin bundlers, sin npm scripts. El proyecto se sirve como archivos estáticos.

## Convenciones de Código (Decisiones ya tomadas)
- Todos los módulos usan el patrón IIFE `(function () { 'use strict'; ... window.JM... = ...; })();`. No romper este patrón.
- Cada módulo expone su API en el objeto global `window.JM*` (JMStorage, JMExcel, JMSearch).
- **No usar ES Modules** (`import`/`export`). Todo es global vía etiquetas `<script>`.
- Comentarios y nombres de funciones en español cuando sea posible, para mantener consistencia con el resto del proyecto.
- El orden de carga de scripts y los contratos globales están definidos en `AGENTS.md`. Consultarlo antes de añadir o modificar scripts.

## Almacenamiento y Datos
- Clave de `localStorage`: `jm_repositorio_v1`.
- Límite conocido: ~4.5 MB. Tener en cuenta antes de implementar features que guarden muchos datos.
- Clave de tema: `jm_theme`.
- Los datos semilla viven en `window.JM_SEED` (dentro de `data/recursos.js`).
- Orden de hidratación: `localStorage` -> `JM_SEED` -> estado vacío.

## Advertencias Recordadas
- `data/recursos.js` es una sola línea minificada. **Nunca editarlo por líneas**, siempre buscar y reemplazar por patrones específicos.
- No hay tests automatizados. Validar siempre abriendo el navegador o con `node -e` simulando `window`.
- Cargar el proyecto con servidor HTTP (`npx serve .` o `python -m http.server 8080`) para que `fetch` funcione; abrir con `file://` limita funcionalidades.

## Preferencias del Desarrollador
- Prefiero soluciones simples y sin dependencias antes que instalar librerías nuevas.
- Cuando haya que añadir una librería, evaluar primero si se puede resolver con JS nativo.
- Evitar refactorizaciones grandes sin discutirlo antes.
- Confirmar siempre los cambios en el navegador antes de dar una tarea por terminada.

## Contexto Histórico
- El proyecto nació como una app de agenda con carga desde Excel.
- Se decidió mantener todo estático y offline para poder usarse sin servidor ni conexión.
- Se evitó deliberadamente usar React/Vue para no añadir build steps.