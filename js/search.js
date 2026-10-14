/* ============================================================
   search.js · Búsqueda, ordenamiento y resaltado
   ============================================================ */
(function () {
  'use strict';

  const ACCENTS = /[\u0300-\u036f]/g;

  function fold(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(ACCENTS, '');
  }

  /* Construye una clase regex acento+mayúsculas insensible para un carácter */
  const FOLD_CHARS = {
    a: '[aàáâäãåā]', e: '[eèéêëē]', i: '[iìíîïī]', o: '[oòóôöõō]',
    u: '[uùúûüū]', n: '[nñ]', c: '[cç]', s: '[sśš]', z: '[zźżž]', y: '[yýÿ]'
  };

  function escapeRegex(ch) {
    return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function charClass(ch) {
    return FOLD_CHARS[ch] || escapeRegex(ch);
  }

  /* Convierte un término normalizado (sin acentos) en regex insensible a acentos */
  function termToRegex(term) {
    const pattern = term.split('').map(charClass).join('');
    return new RegExp(pattern, 'gi');
  }

  /* Devuelve las palabras clave de una consulta */
  function termsFromQuery(query) {
    return fold(query).split(/[^a-z0-9áéíóúñü]+/i).filter(t => t.length > 1);
  }

  /* --- Texto indexable de un recurso (todos los campos buscables) --- */
  function searchableText(res) {
    return fold([
      res.hoja,
      res.categoria,
      res.nombre,
      res.uso,
      res.link,
      res.video
    ].join(' '));
  }

  /* --- ¿Un texto indexable cumple la consulta? (frase o todos los términos) --- */
  function textMatches(hay, terms) {
    if (!terms.length) return true;
    // 1) Coincidencia de frase completa (mayor prioridad)
    if (hay.includes(terms.join(' '))) return true;
    // 2) Todos los términos presentes en cualquier campo
    return terms.every(t => hay.includes(t));
  }

  /* --- Filtrado integral: hoja (grupo) + consulta (hoja/nombre/uso/link/video) --- */
  function filterResources(resources, query, activeSheet) {
    const terms = termsFromQuery(query);
    let list = resources;

    if (activeSheet && activeSheet !== 'all') {
      const target = fold(activeSheet);
      list = list.filter(r => fold(r.hoja || 'Sin hoja') === target);
    }

    if (terms.length === 0) return list;
    return list.filter(res => textMatches(searchableText(res), terms));
  }

  /* --- Ordenamiento --- */
  const SORTERS = {
    nameAsc: (a, b) => fold(a.nombre).localeCompare(fold(b.nombre)),
    nameDesc: (a, b) => fold(b.nombre).localeCompare(fold(a.nombre)),
    categoryAsc: (a, b) => fold(a.categoria).localeCompare(fold(b.categoria)) || fold(a.nombre).localeCompare(fold(b.nombre)),
    categoryDesc: (a, b) => fold(b.categoria).localeCompare(fold(a.categoria)) || fold(b.nombre).localeCompare(fold(a.nombre))
  };

  function sortResources(list, sortKey) {
    const sorter = SORTERS[sortKey] || SORTERS.nameAsc;
    return list.slice().sort(sorter);
  }

  /* --- Resaltado: envuelve coincidencias en <mark> (basado en rangos) --- */
  function highlight(text, terms, maxLen) {
    let source = String(text || '');
    if (!terms.length || !source) return escapeHtml(source);

    let suffix = '';
    if (maxLen && maxLen > 0 && source.length > maxLen) {
      source = source.slice(0, maxLen);
      suffix = '…';
    }

    const ranges = [];
    for (const term of terms) {
      const re = termToRegex(term);
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(source)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        ranges.push([m.index, m.index + m[0].length]);
      }
    }
    if (!ranges.length) return escapeHtml(source) + suffix;

    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    }

    let out = '';
    let pos = 0;
    for (const [s, e] of merged) {
      out += escapeHtml(source.slice(pos, s)) + '<mark>' + escapeHtml(source.slice(s, e)) + '</mark>';
      pos = e;
    }
    out += escapeHtml(source.slice(pos)) + suffix;
    return out;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, '&#96;');
  }

  window.JMSearch = {
    fold,
    termsFromQuery,
    filterResources,
    sortResources,
    highlight,
    escapeHtml,
    escapeAttr
  };
})();