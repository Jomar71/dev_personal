# 📚 Repositorio de Recursos · JM

Aplicación web 100% estática (HTML + CSS + JavaScript vanilla) para organizar tu colección de recursos de Excel: **navegación por hojas y búsqueda instantánea de recursos**, todo guardado localmente en tu navegador.

## ✨ Funcionalidades

| Función | Detalle |
|---|---|
| 📥 **Carga de Excel** | Arrastra y suelta o sube archivos `.xlsx`, `.xls` y `.csv`. Usa SheetJS (incluido localmente, funciona sin internet). |
| 🧠 **Detección automática** | Reconoce las columnas **NOMBRE · USO · LINK · LINK DE VIDEOS** (también `TITULO`, `DESCRIPCION`, `URL`, `VIDEO`/`TUTORIAL`, etc.) ignorando acentos y mayúsculas. Si existe una columna **CATEGORÍA** manda esa; si no, el nombre de la hoja se usa como categoría. |
| 🗂️ **Multihojas** | Si tu Excel tiene varias hojas (una por tema), se combinan todas. El **nombre de cada hoja** es la categoría del recurso. |
| 🗒️ **Hojas tipo apuntes** | Si una hoja no tiene columnas NOMBRE/LINK (apuntes, comandos, tablas de referencia), cada fila se muestra como una tarjeta: el primer dato útil es el título y el resto pasa a la descripción. Así ninguna hoja queda vacía. |
| 🎬 **Videos** | Las columnas de video (`LINK DEL VIDEO`, `VIDEO`, `TUTORIAL`…) se detectan solas: si el valor es una URL, aparece un botón **Ver video** en cada recurso; si es una nota de texto, se conserva en "Detalles". |
| 🆕 **Columnas extra** | E-MAIL, USUARIO, CONTRASEÑA, OTRO… se conservan en "Detalles". Las contraseñas/claves se ocultan y se muestran con un botón ver/ocultar 👁️. |
| 🔍 **Búsqueda en vivo** | Busca en nombre, uso, categoría, hoja, enlace y video a la vez. Insensible a mayúsculas y acentos, coincidencias parciales y **resaltado** del término en los resultados. |
| 🏷️ **Navegación por hojas** | El panel izquierdo lista **solo los nombres de las hojas** del Excel con su conteo. Al abrir, se muestra automáticamente la **primera hoja**. Al hacer clic en cualquier hoja, el panel derecho muestra **todo el contenido de esa hoja** y marca la hoja activa. |
| ↔️ **Ordenamiento** | Nombre o categoría, A–Z / Z–A. |
| 🧮 **Contador** | "Mostrando X de Y recursos". |
| 🃏 **Tres vistas** | Cuadrícula de fichas (por defecto), índice compacto o tabla. |
| ⧉ **Copiar enlace** | Copia el URL al portapapeles desde cada recurso, con confirmación. |
| ⌨️ **Atajos** | `/` o `Ctrl/⌘ + K` enfocan la búsqueda; `Esc` la limpia. |
| 💾 **Persistencia** | Los datos se guardan en `localStorage`; no necesitas subir el Excel de nuevo. |
| 📤 **Exportar** | Descarga los recursos actuales como `.xlsx`. |
| 🌓 **Modo claro/oscuro** | Con persistencia de preferencia. |
| ♿ **Accesibilidad** | Navegación por teclado, `aria`, contraste WCAG AA, `focus-visible`, `prefers-reduced-motion`. |

## 📂 Estructura

```
jmpersonal/
├── index.html          → Página principal
├── css/
│   └── styles.css      → Estilos, temas y responsive
├── js/
│   ├── vendor/
│   │   └── xlsx.full.min.js   → SheetJS (offline)
│   ├── storage.js      → Persistencia en localStorage
│   ├── excelHandler.js → Lectura/escritura de Excel y detección de columnas
│   ├── search.js       → Búsqueda insensible a acentos + resaltado
│   └── app.js          → Lógica principal, render y eventos
├── data/
│   └── recursos.js     → Copia integrada de tus recursos (semilla inicial)
├── links.xlsx          → Tu Excel de recursos (opcional)
└── README.md
```

## 🚀 Cómo usarlo

**Doble clic en `index.html`** ya funciona por sí solo: como hay una copia de tus recursos en `data/recursos.js`, la app inicia mostrando la primera hoja; haz clic en cualquier hoja del panel izquierdo para ver su contenido, sin subir nada.

**Opciones de ejecución:**
1. **Doble clic** en `index.html` ✔️ (lo normal: para ver cambios usa siempre **Cargar Excel**).
2. **Servidor local** (opcional, para que la app **re-sincronice `links.xlsx` automáticamente** en cada carga, sin pulsar nada):
   ```bash
   # en la carpeta del proyecto
   npx serve
   # o con Python
   python -m http.server 8080
   ```
   Abre `http://localhost:8080`.

> **¿Por qué antes no cargaba solo?** Al abrir con doble clic el navegador bloquea que una página lea archivos del disco por seguridad (protocolo `file://`): solo permite leer un archivo que tú selecciones. Por eso los datos van integrados en `data/recursos.js`.

**Actualizar tus recursos:**
- **Con servidor local:** edita `links.xlsx`, guarda los cambios y recarga la página. La app lee el archivo actualizado y muestra "✓ Sincronizado desde links.xlsx". Si abres una app cargada con otro archivo (distinto de `links.xlsx`), se respeta el tuyo y tendrás que usar **Cargar Excel**.
- **Con doble clic (`file://`):** pulsa **Cargar Excel** y selecciona el archivo editado; reemplaza los datos y los guarda en el navegador.
- El archivo `data/recursos.js` es una copia (semilla) de los recursos al momento de generarse. Si quieres que el doble-clic siempre muestre lo más nuevo, vuelve a generar esa semilla desde `links.xlsx`; si prefieres evitar tener la copia integrada, borra `data/recursos.js` sin problema y usa **Cargar Excel** o el servidor local.

**Primer uso:** si no hay datos ni semilla, pulsa **Cargar Excel** o arrastra tu archivo. Si el Excel tiene columnas con las palabras *nombre*, *uso/usos*, *link/url* y *video/tutorial* (y opcionalmente *categoría*), se detectan solas; el nombre de cada hoja se usa como categoría. Cualquier otra columna se muestra en "Detalles".

**Manejo de datos:** los datos quedan guardados en el navegador. Para actualizarlos, edita tu Excel y vuelve a pulsar **Cargar Excel**; para exportar la lista actual, usa **Exportar**.

## 📋 Requisitos del Excel (flexibles)

| Columna | Acepta | Ejemplo |
|---|---|---|
| CATEGORÍA | *(opcional)* `CATEGORIA`, `CATEGORÍAS`, `CATEGORY`, `GRUPO`… | `IA` |
| NOMBRE | `NOMBRE`, `TITULO`, `NAME`, `RECURSO`… | `ChatGPT` |
| USO | `USOS`, `USO`, `DESCRIPCION`, `NOTA`… | `Asistente de IA para texto` |
| LINK | `LINK`, `URL`, `ENLACE`, `PAGINA`… | `https://chat.openai.com` |
| LINK DE VIDEOS | *(opcional)* `LINK DEL VIDEO`, `VIDEO`, `TUTORIAL`… | `https://youtu.be/…` |

- El **panel izquierdo** lista **solo los nombres de las hojas** del Excel; la columna CATEGORÍA se conserva como etiqueta secundaria en cada recurso.
- Si **NOMBRE** está vacío pero hay descripción, el texto de uso pasa a ser el título.
- Si un valor de video no es una URL (por ejemplo una nota), no genera botón: se guarda en "Detalles".
- Si falta **LINK**, la tarjeta muestra "Sin enlace".
- A los enlaces sin `https://` se les agrega automáticamente.

## 🎨 Personalización rápida

- **Colores:** la paleta de acentos por categoría está en `PALETTE`, en `js/app.js`.
- **Marca:** nombre, logo SVG y colores en `css/styles.css` (variables `:root`) y `index.html`.
- **Tipografía:** Space Grotesk (titulares/identidad) y Hanken Grotesk (interfaz) se cargan desde Google Fonts; dominios y claves usan mono del sistema. Fallbacks locales incluidos (siguen funcionando offline).

## ℹ️ Notas técnicas

- Librería **SheetJS** (`xlsx.full.min.js`) vendida en `js/vendor/` para funcionar sin conexión. La licencia de SheetJS (Community) permite uso gratuito.
- Capacidad: `localStorage` admite ~5 MB; la app avisa si el archivo es demasiado grande (los datos se muestran igual, pero no se persisten).
- Recursos repetidos (mismo nombre + enlace) se fusionan al cargar: se completa la descripción y las columnas extra, sin descartar ninguna edición.