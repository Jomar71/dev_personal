/* ============================================================
   excelHandler.js · Lectura / escritura de Excel con SheetJS
   Soporta: multip-hoja, detección automática de columnas,
   hojas como grupo, columnas extra y videos.

   Modelo de datos (plano):
     {
       hoja:      "IA",                       // nombre de la hoja de origen
       categoria: "IA",                       // grupo (col. CATEGORÍA o la hoja)
       nombre:    "ChatGPT",                  // col. NOMBRE
       uso:       "Asistente de IA para texto",// col. USO
       link:      "https://chat.openai.com",  // col. LINK
       video:     "https://youtube.com/...",  // col. LINK DE VIDEOS (opcional)
       extra:     { ... },                    // otras columnas (opcional)
       hasExtra:  false
     }
   ============================================================ */
(function () {
  'use strict';

  /* --- Normalización de texto para comparar encabezados --- */
  const ACCENTS = /[\u0300-\u036f]/g;
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(ACCENTS, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* --- Diccionarios de encabezados núcleo --- */
  const HEADER_SETS = {
    category: ['categoria', 'categorias', 'categoria 1', 'category', 'categories', 'grupo', 'apartado', 'tipo'],
    name: ['nombre', 'name', 'titulo', 'recurso', 'herramienta', 'app', 'aplicacion', 'recurso 1'],
    uses: ['uso', 'usos', 'descripcion', 'descripciones', 'detalle', 'detalles', 'desc', 'nota', 'notas', 'que hace', 'para que sirve', 'comentarios'],
    link: ['link', 'links', 'url', 'enlace', 'enlaces', 'pagina', 'web', 'website', 'sitio', 'acceso', 'direccion']
  };

  const IGNORED_HEADERS = new Set([
    'n°', 'nro', 'numero', 'no', '#', 'id', 'item', 'columna2', 'columna', 'columna3', 'columna4', 'columna5', 'columna1'
  ]);

  /* Etiquetas que por sí solas delatan una fila de encabezados en hojas "apuntes". */
  const GENERIC_LABELS = new Set([
    'tiempo', 'temas', 'sub temas', 'subtema', 'subtemas', 'contenido', 'webs que utilizaremos',
    'contrasena', 'otro', 'comando', 'utilidad', 'espanol', 'vs code', 'trigger', 'content',
    'n', 'no', 'numero', 'nombre', 'link', 'url', 'usos', 'uso', 'e-mail', 'usuario', 'api keys'
  ]);

  const SECRET_RE = /contras|clave|password|usuario|user|email|correo|token|secret|apikey|api key|contrase/;
  const VIDEO_RE = /video|tutorial/;

  function isCategoryHeader(h) { return HEADER_SETS.category.includes(h); }
  function isNameHeader(h) { return HEADER_SETS.name.includes(h); }
  function isUsesHeader(h) { return HEADER_SETS.uses.includes(h); }
  function isLinkHeader(h) { return HEADER_SETS.link.includes(h); }
  /* Cualquier encabezado con "video"/"tutorial" que no sea núcleo. */
  function isVideoHeader(h) {
    return VIDEO_RE.test(h) && !isCategoryHeader(h) && !isNameHeader(h) && !isUsesHeader(h) && !isLinkHeader(h);
  }
  function isCoreHeader(h) {
    return isCategoryHeader(h) || isNameHeader(h) || isUsesHeader(h) || isLinkHeader(h) || isVideoHeader(h);
  }
  function isSecretHeader(h) { return SECRET_RE.test(norm(h)); }

  function cleanSheetName(raw) {
    let s = String(raw || '').replace(/\uFEFF/g, '').trim();
    s = s.replace(/^(hoja|sheet)\s*\d+$/i, '').trim();
    return s;
  }

  function isSecretValue(v) {
    return /contrase|captcha|password/i.test(String(v));
  }

  /* --- ¿El valor parece una URL? --- */
  function looksLikeUrl(v) {
    const s = String(v || '').trim();
    if (!s || /\s/.test(s)) return false;
    return /^https?:\/\//i.test(s) || /^www\./i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(s);
  }

  /* --- Fila de encabezados con columnas núcleo (NOMBRE/LINK/USO/…); -1 si no hay --- */
  function findCoreHeaderRow(rows) {
    const LIMIT = 6;
    for (let r = 0; r < Math.min(rows.length, LIMIT); r++) {
      const cells = rows[r] || [];
      let core = 0;
      for (let c = 0; c < cells.length; c++) {
        const h = norm(cells[c]);
        if (h && isCoreHeader(h)) core++;
      }
      if (core >= 1) return r;
    }
    return -1;
  }

  /* --- Fila de encabezados para hojas tipo "apuntes" (sin columnas núcleo) --- */
  function findGenericHeaderRow(rows) {
    const count = (r) => (rows[r] || []).filter(c => cellText(c) !== '').length;
    if (rows.length > 1 && count(0) <= 1) return 1;
    return 0;
  }

  /* --- Convierte a URL completa (agrega https:// si falta) --- */
  function ensureUrl(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    s = s.replace(/[\u2010-\u2015\u2013]/g, '-');
    if (!/^https?:\/\//i.test(s)) {
      s = 'https://' + s;
    }
    return s;
  }

  function cellText(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).trim();
  }

  /* --- Parseo genérico: cada fila se convierte en una tarjeta ---
     Se usa en hojas "tipo apuntes" (varias columnas de texto, sin NOMBRE/LINK):
     la primera celda útil es el título y el resto pasa a la descripción. */
  function parseSheetGeneric(rows, headerRow, sheet) {
    const header = (rows[headerRow] || []).map(cellText);
    const dataRows = [];
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      if (Array.isArray(row) && row.some(c => cellText(c) !== '')) dataRows.push(row);
    }
    if (!dataRows.length) return [];

    // Columnas "constantes": etiquetas que se repiten en casi todas las filas
    // (p. ej. una columna "VS CODE") → no sirven como título.
    const freq = {};
    for (const row of dataRows) {
      for (let c = 0; c < row.length; c++) {
        const v = cellText(row[c]);
        if (!v) continue;
        (freq[c] || (freq[c] = {}))[v] = (freq[c][v] || 0) + 1;
      }
    }
    const constCols = {};
    if (dataRows.length >= 4) {
      for (const c in freq) {
        const top = Math.max.apply(null, Object.values(freq[c]));
        if (top / dataRows.length >= 0.6) constCols[c] = true;
      }
    }

    const out = [];
    for (const row of dataRows) {
      const cells = [];
      for (let c = 0; c < row.length; c++) {
        const v = cellText(row[c]);
        if (!v || /^\d+$/.test(v)) continue;
        cells.push({ c: c, v: v, h: header[c] || '' });
      }
      if (!cells.length) continue;
      if (cells.every(x => GENERIC_LABELS.has(norm(x.v)))) continue;

      let nameCell = cells.find(x => !constCols[x.c]);
      if (!nameCell) nameCell = cells[0];

      let link = '';
      let video = '';
      const used = [];
      for (const x of cells) {
        if (x === nameCell || constCols[x.c]) continue;
        const isVideoCol = VIDEO_RE.test(norm(x.h));
        if (isVideoCol && !video && looksLikeUrl(x.v)) { video = ensureUrl(x.v); continue; }
        if (!link && !isVideoCol && looksLikeUrl(x.v)) { link = ensureUrl(x.v); continue; }
        used.push(x.v);
      }

      out.push({
        hoja: sheet,
        categoria: sheet,
        nombre: nameCell.v,
        uso: used.join(' · '),
        link: link,
        video: video,
        extra: {},
        hasExtra: false
      });
    }
    return out;
  }

  /* --- Parsea una hoja y devuelve recursos (modelo nuevo) --- */
  function parseSheet(ws, sheetName) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    const sheet = cleanSheetName(sheetName);

    const headerRow = findCoreHeaderRow(rows);
    if (headerRow === -1) {
      // Hoja sin columnas NOMBRE/LINK → hojas "tipo apuntes".
      return parseSheetGeneric(rows, findGenericHeaderRow(rows), sheet);
    }

    const header = (rows[headerRow] || []).map(cellText);

    const cols = {
      category: -1,
      name: -1,
      uses: -1,
      link: -1,
      video: -1,
      extra: {}
    };

    for (let c = 0; c < header.length; c++) {
      const h = norm(header[c]);
      if (!h || IGNORED_HEADERS.has(h)) continue;
      if (cols.category === -1 && isCategoryHeader(h)) { cols.category = c; continue; }
      if (cols.name === -1 && isNameHeader(h)) { cols.name = c; continue; }
      if (cols.uses === -1 && isUsesHeader(h)) { cols.uses = c; continue; }
      if (cols.link === -1 && isLinkHeader(h)) { cols.link = c; continue; }
      if (cols.video === -1 && isVideoHeader(h)) { cols.video = c; cols.videoHeader = header[c]; continue; }
      if (!cols.extra[header[c]]) cols.extra[header[c]] = c;
    }

    const resources = [];

    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      if (!Array.isArray(row) || !row.some(c => cellText(c) !== '')) continue;

      let categoria = cols.category > -1 ? cellText(row[cols.category]) : '';
      const nombre = cols.name > -1 ? cellText(row[cols.name]) : '';
      let uso = cols.uses > -1 ? cellText(row[cols.uses]) : '';
      const linkRaw = cols.link > -1 ? cellText(row[cols.link]) : '';
      const videoRaw = cols.video > -1 ? cellText(row[cols.video]) : '';

      // Auto-tipo: si la categoría es numérica, no sirve
      if (/^\d+$/.test(categoria)) categoria = '';
      if (!categoria && sheet) categoria = sheet;

      // Nombre de respaldo (uso, o el propio enlace)
      let effectiveName = nombre;
      if (!effectiveName && uso) {
        effectiveName = uso;
        uso = '';
      }
      if (!effectiveName && linkRaw) {
        if (looksLikeUrl(linkRaw)) {
          const m = String(linkRaw).match(/^(?:[a-z]+:\/\/)?(?:www\.)?([^\/\?#\s]+)/i);
          effectiveName = m && m[1] ? m[1] : linkRaw;
        } else {
          effectiveName = linkRaw;
        }
      }

      // Sin nombre = fila inútil
      if (!effectiveName) continue;

      // Columnas extra
      const extra = {};
      let hasExtra = false;
      for (const key in cols.extra) {
        const c = cols.extra[key];
        const v = cellText(row[c]);
        if (v) { extra[key] = v; hasExtra = true; }
      }

      // LINK: solo si es una URL real; si no, se conserva como nota extra.
      let link = '';
      if (linkRaw) {
        if (looksLikeUrl(linkRaw)) {
          link = ensureUrl(linkRaw);
        } else if (cols.link > -1 && header[cols.link] && linkRaw !== effectiveName) {
          extra[header[cols.link]] = linkRaw;
          hasExtra = true;
        }
      }

      // Video: solo si es una URL real; si no, se conserva como nota extra.
      let video = '';
      if (videoRaw) {
        if (looksLikeUrl(videoRaw)) {
          video = ensureUrl(videoRaw);
        } else if (cols.videoHeader) {
          extra[cols.videoHeader] = videoRaw;
          hasExtra = true;
        }
      }

      resources.push({
        hoja: sheet,
        categoria: categoria || 'Sin categoría',
        nombre: effectiveName,
        uso,
        link,
        video,
        extra,
        hasExtra
      });
    }

    if (!resources.length) {
      const generic = parseSheetGeneric(rows, findGenericHeaderRow(rows), sheet);
      if (generic.length) return generic;
    }
    return resources;
  }

  /* --- Deduplica por nombre+enlace fusionando campos vacíos --- */
  function finalize(resources) {
    const byKey = new Map();
    for (const res of resources) {
      if (!res.nombre && !res.link) continue;
      const key = norm(res.hoja) + '|' + norm(res.nombre) + '|' + norm(res.link);
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, res); continue; }
      if (!prev.uso && res.uso) prev.uso = res.uso;
      if (!prev.video && res.video) prev.video = res.video;
      if ((!prev.categoria || prev.categoria === 'Sin categoría') && res.categoria && res.categoria !== 'Sin categoría') {
        prev.categoria = res.categoria;
      }
      if (res.hasExtra && res.extra) {
        for (const k in res.extra) {
          if (prev.extra[k] === undefined || prev.extra[k] === '') prev.extra[k] = res.extra[k];
        }
        prev.hasExtra = Object.keys(prev.extra).length > 0;
      }
    }
    return Array.from(byKey.values());
  }

  /* --- Normaliza un registro (migra el modelo antiguo -> nuevo) --- */
  function normalizeRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const out = {
      hoja: raw.hoja != null ? String(raw.hoja) : String(raw.sourceSheet || ''),
      categoria: raw.categoria != null ? String(raw.categoria) : String(raw.category || ''),
      nombre: raw.nombre != null ? String(raw.nombre) : String(raw.name || ''),
      uso: raw.uso != null ? String(raw.uso) : String(raw.uses || ''),
      link: String(raw.link || ''),
      video: String(raw.video || ''),
      extra: {},
      hasExtra: false
    };

    const extra = Object.assign({}, raw.extra || {});

    // Sacar el video de las columnas extra (modelo antiguo)
    if (!out.video) {
      for (const k of Object.keys(extra)) {
        if (VIDEO_RE.test(norm(k)) && looksLikeUrl(extra[k])) {
          out.video = extra[k];
          delete extra[k];
          break;
        }
      }
    }

    if (out.video) out.video = looksLikeUrl(out.video) ? ensureUrl(out.video) : out.video;
    if (out.link && /^https?:\/\//i.test(out.link) === false && looksLikeUrl(out.link)) {
      out.link = ensureUrl(out.link);
    }

    out.extra = extra;
    out.hasExtra = Object.keys(extra).length > 0;
    if (!out.categoria) out.categoria = out.hoja || 'Sin categoría';
    return out;
  }

  /* --- Normaliza una lista completa (semilla / localStorage) --- */
  function normalizeList(list) {
    return (Array.isArray(list) ? list : []).map(normalizeRecord).filter(Boolean);
  }

  /* --- Punto de entrada: archivo → lista de recursos --- */
  function parseFile(file) {
    return file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      if (!wb || !wb.SheetNames.length) {
        throw new Error('El archivo no contiene hojas válidas.');
      }
      const all = [];
      const report = { sheets: wb.SheetNames.length, bySheet: {} };
      for (const sheetName of wb.SheetNames) {
        try {
          const ws = wb.Sheets[sheetName];
          if (!ws || !ws['!ref']) continue;
          const items = parseSheet(ws, sheetName);
          report.bySheet[sheetName] = items.length;
          all.push(...items);
        } catch (e) {
          report.bySheet[sheetName] = 0;
        }
      }
      const resources = finalize(all);
      report.total = resources.length;
      report.source = file.name;
      return { resources, report };
    });
  }

  /* --- Exporta la lista actual a un .xlsx --- */
  function exportResources(resources) {
    const extraKeys = [];
    const extraSeen = new Set();
    for (const res of resources) {
      if (res.hasExtra && res.extra) {
        for (const key of Object.keys(res.extra)) {
          const k = key.trim();
          if (k && !extraSeen.has(k)) { extraSeen.add(k); extraKeys.push(key); }
        }
      }
    }

    const header = ['HOJA', 'CATEGORÍA', 'NOMBRE', 'USO', 'LINK', 'LINK DE VIDEOS'];
    for (const k of extraKeys) header.push(k.toUpperCase());

    const aoa = [header];
    for (const res of resources) {
      const row = [res.hoja, res.categoria, res.nombre, res.uso, res.link, res.video];
      for (const k of extraKeys) row.push(res.extra && res.extra[k] !== undefined ? res.extra[k] : '');
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 18 }, { wch: 20 }, { wch: 42 }, { wch: 46 }, { wch: 50 }, { wch: 50 }
    ];
    extraKeys.forEach(() => ws['!cols'].push({ wch: 28 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RECURSOS');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, 'recursos-' + stamp + '.xlsx');
  }

  /* --- Utilidades expuestas --- */
  window.JMExcel = {
    parseFile,
    exportResources,
    normalizeRecord,
    normalizeList,
    ensureUrl,
    looksLikeUrl,
    isSecretHeader,
    isSecretValue
  };
})();
