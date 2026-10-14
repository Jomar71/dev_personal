---
name: servir-local
description: Inicia un servidor HTTP local para el proyecto usando npx serve o python. Úsalo cuando necesites probar el proyecto en el navegador con funcionalidad fetch.
---

## Qué hago

Inicio un servidor HTTP estático en el puerto 8080 para el proyecto.

## Cuándo usarme

Úsalo cuando:

- Necesites probar funcionalidades que requieran `fetch` (como carga de Excel)
- Quieras verificar cambios en el navegador con todas las funcionalidades habilitadas
- No puedas usar `file://` por restricciones del navegador

## Comando

Ejecuta:

!`npx serve . -l 8080`

Si `npx serve` no está disponible, usa:

!`python -m http.server 8080`

Luego abre `http://localhost:8080` en tu navegador.