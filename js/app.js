/* ============================================================
   app.js · Orquestador principal
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  /* ---------- Estado ---------- */
  const state = {
    resources: [],
    storedName: '',
    query: '',        // búsqueda de recursos (panel derecho)
    category: null,   // hoja activa (nombre de hoja)
    sort: 'nameAsc',
    view: 'grid',
    theme: loadTheme()
  };

  /* ---------- Paleta y config de categorías ---------- */
  const PALETTE = [
    '#2563eb', '#0891b2', '#0f766e', '#15803d',
    '#4d7c0f', '#a16207', '#ea580c', '#dc2626',
    '#db2777', '#c026d3', '#7c3aed', '#475569'
  ];

  const ICON = {
    copy: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    open: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>'
  };

  function categoryColor(name) {
    let h = 0;
    const n = JMSearch.fold(name);
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  /* ---------- Dominio legible de un enlace ---------- */
  function domainOf(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw);
      return u.hostname.replace(/^www\./i, '');
    } catch (e) {
      const m = raw.match(/^(?:[a-z]+:\/\/)?([^\/\?#\s]+)/i);
      return m && m[1] ? m[1].replace(/^www\./i, '') : '';
    }
  }

  function hasExtra(res) {
    return !!(res.hasExtra && res.extra && Object.keys(res.extra).length);
  }

  /* ---------- Tema ---------- */
  function loadTheme() {
    const saved = localStorage.getItem('jm_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('jm_theme', theme); } catch (e) {}
    const btn = $('#themeToggle');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }

  /* ---------- Notificaciones ---------- */
  function toast(message, kind) {
    const region = $('#toastRegion');
    const icons = {
      success: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('data-kind', kind || 'info');
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.innerHTML = icons[kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info'] +
      '<span>' + JMSearch.escapeHtml(message) + '</span>';
    region.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    }, 4200);
  }

  /* ---------- Copiar al portapapeles ---------- */
  function fallbackCopy(text, done, fail) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? done() : fail();
    } catch (e) {
      fail();
    }
  }
  function copyLink(url, btn) {
    const text = String(url || '');
    if (!text) return;
    const done = () => {
      if (btn) {
        btn.classList.add('is-copied');
        const prev = btn.innerHTML;
        btn.innerHTML = ICON.check;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = prev;
        }, 1500);
      }
      toast('Enlace copiado al portapapeles.', 'success');
    };
    const fail = () => toast('No se pudo copiar el enlace.', 'error');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done, fail));
    } else {
      fallbackCopy(text, done, fail);
    }
  }

  /* ---------- Hojas (conteo + coincidencias + colores) ---------- */
  function buildCategoryList() {
    const counts = {};
    for (const r of state.resources) {
      const c = r.hoja || 'Sin hoja';
      counts[c] = (counts[c] || 0) + 1;
    }

    const terms = JMSearch.termsFromQuery(state.query);
    const searching = terms.length > 0;
    const matchCounts = {};
    if (searching) {
      for (const r of state.resources) {
        if (JMSearch.resourceMatches(r, terms)) {
          const c = r.hoja || 'Sin hoja';
          matchCounts[c] = (matchCounts[c] || 0) + 1;
        }
      }
    }
    return Object.keys(counts)
      .map(name => ({
        name,
        count: counts[name],
        matches: searching ? (matchCounts[name] || 0) : counts[name],
        searching: searching,
        color: categoryColor(name)
      }))
      .sort((a, b) => {
        const na = JMSearch.fold(a.name);
        const nb = JMSearch.fold(b.name);
        return na < nb ? -1 : na > nb ? 1 : 0;
      });
  }

  /* Nombre de la primera hoja (la que aparece arriba en el índice). */
  function firstSheetName() {
    const cats = buildCategoryList();
    return cats.length ? cats[0].name : null;
  }

  /* ---------- Render del índice lateral (solo nombres de hoja) ---------- */
  function renderCategoryIndex() {
    const box = $('#categoryIndex');
    const cats = buildCategoryList();
    box.innerHTML = cats.map((c) => {
      const searching = c.searching;
      const active = !searching && state.category === c.name;
      const empty = searching && c.matches === 0;
      const label = searching
        ? c.matches + (c.matches === 1 ? ' coincidencia' : ' coincidencias') + ' en «' + c.name + '»'
        : c.count + (c.count === 1 ? ' recurso en ' : ' recursos en ') + '«' + c.name + '»';
      return '<button type="button" class="index-item' + (active ? ' is-active' : '') + (empty ? ' is-empty' : '') + '"' +
        ' data-category="' + JMSearch.escapeAttr(c.name) + '" aria-pressed="' + active + '"' +
        ' style="--cat:' + c.color + '" title="' + JMSearch.escapeAttr(label) + '">' +
        '<span class="index-item__dot"></span>' +
        '<span class="index-item__label">' + JMSearch.escapeHtml(c.name) + '</span>' +
        '<span class="index-item__count">' + c.matches + '</span></button>';
    }).join('');
  }

  /* ---------- Bloque de detalles extra ---------- */
  function extraBlockContent(res) {
    if (!hasExtra(res)) return '';
    const terms = JMSearch.termsFromQuery(state.query);
    const items = Object.keys(res.extra).map((key) => {
      let val = JMSearch.escapeHtml(res.extra[key]);
      if (terms.length && JMSearch.fold(res.extra[key]).includes(terms.join(' '))) {
        val = JMSearch.highlight(res.extra[key], terms, 140);
      }
      const secret = JMExcel.isSecretHeader(key) || JMExcel.isSecretValue(res.extra[key]);
      const action = secret
        ? '<button type="button" class="extra-reveal" aria-label="Mostrar ' + JMSearch.escapeAttr(key) + '" title="Mostrar">' +
          '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>'
        : '';
      return '<li class="extra-item' + (secret ? ' is-secret' : '') + '" data-secret="' + secret + '">' +
        '<span class="extra-item__label">' + JMSearch.escapeHtml(key) + '</span>' +
        '<span class="extra-item__actions">' +
        '<code>' + val + '</code>' + action +
        '</span></li>';
    }).join('');
    return '<div class="card__extra"><ul class="extra-list">' + items + '</ul></div>';
  }

  /* ---------- Detalles: botón de alternancia ---------- */
  function detailsButton(targetId, extraClass) {
    return '<button type="button" class="act ' + (extraClass || '') + '" data-details data-target="' + targetId + '"' +
      ' aria-expanded="false" aria-label="Ver detalles" title="Detalles">' + ICON.info + '</button>';
  }

  /* ---------- Botón "Ver video" ---------- */
  function videoButton(res) {
    return '<a class="btn btn--video" href="' + JMSearch.escapeAttr(res.video) +
      '" target="_blank" rel="noopener noreferrer" title="Ver video">' + ICON.play + ' Ver video</a>';
  }

  /* ---------- Tarjeta de enlace (vista cuadrícula) ---------- */
  function renderCard(res, idx) {
    const terms = JMSearch.termsFromQuery(state.query);
    const color = categoryColor(res.categoria);
    const linkAttr = JMSearch.escapeAttr(res.link || '');
    const domain = res.link ? domainOf(res.link) : '';
    const details = hasExtra(res);
    const target = 'c-extra-' + idx;
    const sheetTag = (res.hoja && res.hoja !== res.categoria)
      ? '<span class="card__sheet" title="Hoja">' + JMSearch.escapeHtml(res.hoja) + '</span>'
      : '';

    const title = res.link
      ? '<a href="' + linkAttr + '" target="_blank" rel="noopener noreferrer" title="' + linkAttr + '">' + JMSearch.highlight(res.nombre, terms, 90) + '</a>'
      : JMSearch.highlight(res.nombre, terms, 90);

    const openBtn = res.link
      ? '<a class="btn btn--open" href="' + linkAttr + '" target="_blank" rel="noopener noreferrer">' + ICON.open + ' Abrir recurso</a>'
      : '<span class="btn is-disabled" title="Este recurso no tiene enlace">Sin enlace</span>';

    return '<article class="card" data-idx="' + idx + '" style="--cat:' + color + '">' +
      '<div class="card__top">' +
        '<span class="card__cat"><span class="card__cat-dot"></span><span>' + JMSearch.escapeHtml(res.categoria) + '</span></span>' +
        sheetTag +
      '</div>' +
      '<h3 class="card__title">' + title + '</h3>' +
      (res.uso ? '<p class="card__uses">' + JMSearch.highlight(res.uso, terms, 170) + '</p>' : '<p class="card__uses" hidden></p>') +
      (domain ? '<p class="card__domain">' + JMSearch.escapeHtml(domain) + '</p>' : '') +
      '<div class="card__actions">' + openBtn +
        (res.video ? videoButton(res) : '') +
        (details ? detailsButton(target, 'card__details-btn') : '') + '</div>' +
      (details ? '<div class="card__extra" id="' + target + '" hidden>' + extraBlockContent(res) + '</div>' : '') +
    '</article>';
  }

  /* ---------- Entrada compacta (vista índice) ---------- */
  function renderEntry(res, idx) {
    const terms = JMSearch.termsFromQuery(state.query);
    const color = categoryColor(res.categoria);
    const linkAttr = JMSearch.escapeAttr(res.link || '');
    const domain = res.link ? domainOf(res.link) : '';
    const details = hasExtra(res);
    const target = 'e-extra-' + idx;

    const title = res.link
      ? '<a href="' + linkAttr + '" target="_blank" rel="noopener noreferrer" title="' + linkAttr + '">' + JMSearch.highlight(res.nombre, terms, 110) + '</a>'
      : JMSearch.highlight(res.nombre, terms, 110);

    const videoAct = res.video
      ? '<a class="act act--video" href="' + JMSearch.escapeAttr(res.video) + '" target="_blank" rel="noopener noreferrer" aria-label="Ver video" title="Ver video">' + ICON.play + '</a>'
      : '';

    const actions = res.link
      ? '<a class="btn btn--open" href="' + linkAttr + '" target="_blank" rel="noopener noreferrer">Abrir</a>' +
        videoAct +
        '<button type="button" class="act" data-copy="' + linkAttr + '" aria-label="Copiar enlace" title="Copiar enlace">' + ICON.copy + '</button>'
      : videoAct + '<span class="btn is-disabled" title="Sin enlace">Sin enlace</span>';

    return '<article class="entry" data-idx="' + idx + '" style="--cat:' + color + '">' +
      '<div class="entry__body">' +
        '<span class="entry__cat">' + JMSearch.escapeHtml(res.categoria) + '</span>' +
        '<h3 class="entry__title">' + title + '</h3>' +
        (res.uso ? '<p class="entry__uses">' + JMSearch.highlight(res.uso, terms, 170) + '</p>' : '<p class="entry__uses" hidden></p>') +
      '</div>' +
      (domain ? '<span class="entry__domain" title="' + JMSearch.escapeAttr(domain) + '">' + JMSearch.escapeHtml(domain) + '</span>' : '') +
      '<div class="entry__actions">' + actions + (details ? detailsButton(target) : '') + '</div>' +
      (details ? '<div class="entry__extra" id="' + target + '" hidden>' + extraBlockContent(res) + '</div>' : '') +
    '</article>';
  }

  /* ---------- Fila de tabla (vista tabla) ---------- */
  function renderTableRow(res, idx) {
    const terms = JMSearch.termsFromQuery(state.query);
    const color = categoryColor(res.categoria);
    const uso = res.uso ? JMSearch.highlight(res.uso, terms, 120) : '';
    const linkAttr = JMSearch.escapeAttr(res.link || '#');
    const details = hasExtra(res);
    const target = 't-extra-' + idx;
    let status = '';

    if (details) {
      const secretCount = Object.keys(res.extra).filter(k => JMExcel.isSecretHeader(k) || JMExcel.isSecretValue(res.extra[k])).length;
      status = '<button type="button" class="btn-link" data-details data-target="' + target + '" aria-expanded="false">' +
        (secretCount ? '🔒 ' : '') + 'Detalles</button>';
    }

    const actions =
      (res.link
        ? '<a class="btn" href="' + linkAttr + '" target="_blank" rel="noopener noreferrer">' + ICON.open + ' Abrir</a>'
        : '<span class="btn is-disabled" title="Sin enlace">Sin enlace</span>') +
      (res.video
        ? '<a class="btn btn--video" href="' + JMSearch.escapeAttr(res.video) + '" target="_blank" rel="noopener noreferrer">' + ICON.play + ' Video</a>'
        : '');

    return '<tr>' +
      '<td class="td-cat"><span class="mini-chip" style="--cat:' + color + '"><span>' + JMSearch.escapeHtml(res.categoria) + '</span></span></td>' +
      '<td class="td-name">' + JMSearch.highlight(res.nombre, terms, 100) + '</td>' +
      '<td class="td-uses"' + (uso ? '' : ' hidden') + '>' + uso +
        (status ? '<div class="table-extra-toggler" style="margin-top:4px">' + status + '</div>' : '') +
      '</td>' +
      '<td class="td-link"><div class="td-actions">' + actions + '</div></td>' +
    '</tr>' +
    (details ? '<tr id="' + target + '" class="table-extra-row" hidden><td colspan="4">' + extraBlockContent(res) + '</td></tr>' : '');
  }

  /* ---------- Render principal ---------- */
  function render() {
    // Si hay datos y ninguna hoja activa, se abre automáticamente la primera.
    if (state.resources.length && state.category === null) {
      state.category = firstSheetName();
    }

    const filtered = JMSearch.filterResources(state.resources, state.query, state.category);
    const sorted = JMSearch.sortResources(filtered, state.sort);

    $('#totalCount').textContent = state.resources.length;

    const terms = JMSearch.termsFromQuery(state.query);
    const searching = terms.length > 0;
    let resultsHtml = 'Mostrando <strong>' + sorted.length + '</strong> de <strong>' + state.resources.length + '</strong> recursos';
    if (searching && sorted.length) {
      const sheetsWithHits = new Set(sorted.map(r => r.hoja || 'Sin hoja')).size;
      resultsHtml += ' · <strong>' + sorted.length + '</strong> coincidencia' + (sorted.length === 1 ? '' : 's') +
        ' en <strong>' + sheetsWithHits + '</strong> hoja' + (sheetsWithHits === 1 ? '' : 's');
    } else if (!searching) {
      resultsHtml += ' en esta hoja';
    }
    $('#resultsText').innerHTML = resultsHtml;

    const source = $('#sourceName');
    if (source) {
      source.textContent = state.storedName || '—';
      source.title = state.storedName ? ('Recursos cargados desde "' + state.storedName + '"') : 'Aún no se ha cargado ningún archivo';
    }

    $('#clearFilters').hidden = state.query === '';
    $('#clearSearch').hidden = state.query === '';

    renderCategoryIndex();

    const indexView = $('#indexView');
    const grid = $('#resourcesView');
    const table = $('#tableWrap');
    const noResults = $('#noResults');
    const emptyState = $('#emptyState');

    if (!state.resources.length) {
      indexView.hidden = true;
      grid.hidden = true;
      table.hidden = true;
      noResults.hidden = true;
      emptyState.hidden = false;
      $('#main').setAttribute('aria-busy', 'false');
      return;
    }

    emptyState.hidden = true;

    if (!sorted.length) {
      indexView.hidden = true;
      grid.hidden = true;
      table.hidden = true;
      noResults.hidden = false;
      const noteText = $('#noResultsText');
      if (noteText) {
        noteText.textContent = state.query
          ? 'No se encontraron recursos para «' + state.query + '» en ningún índice, hoja o enlace.'
          : 'Esta hoja no tiene recursos que mostrar.';
      }
      $('#main').setAttribute('aria-busy', 'false');
      return;
    }
    noResults.hidden = true;

    if (state.view === 'table') {
      indexView.hidden = true;
      grid.hidden = true;
      table.hidden = false;
      $('#tableBody').innerHTML = sorted.map(renderTableRow).join('');
    } else if (state.view === 'grid') {
      indexView.hidden = true;
      table.hidden = true;
      grid.hidden = false;
      grid.innerHTML = sorted.map(renderCard).join('');
    } else {
      grid.hidden = true;
      table.hidden = true;
      indexView.hidden = false;
      indexView.innerHTML = sorted.map(renderEntry).join('');
    }
    $('#main').setAttribute('aria-busy', 'false');
  }

  /* ---------- Cambio de vista ---------- */
  function setView(view) {
    state.view = view;
    const map = { index: '#viewIndex', grid: '#viewGrid', table: '#viewTable' };
    Object.keys(map).forEach((key) => {
      const el = $(map[key]);
      const on = key === view;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    render();
  }

  /* ---------- Carga / guardado de datos ---------- */
  function loadData(source, fileName) {
    try {
      JMStorage.save({ resources: source, fileName: fileName || '' });
    } catch (e) {
      toast(e.message, 'error');
    }
    state.resources = JMExcel.normalizeList(source);
    state.storedName = fileName || '';
    state.query = '';
    state.category = null;
    $('#searchInput').value = '';
    $('#sortSelect').value = 'nameAsc';
    state.sort = 'nameAsc';
    render();
  }

  function handleFile(file) {
    if (!file) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(file.name) || /spreadsheet|excel|csv/.test(file.type);
    if (!ok) {
      toast('Formato no válido. Sube un archivo .xlsx, .xls o .csv.', 'error');
      return;
    }
    $('#main').setAttribute('aria-busy', 'true');
    toast('Leyendo "' + file.name + '"…', 'info');
    JMExcel.parseFile(file)
      .then(({ resources, report }) => {
        if (!resources.length) {
          $('#main').setAttribute('aria-busy', 'false');
          toast('No se encontraron recursos en el archivo. Revisa las columnas (CATEGORÍA, NOMBRE, USOS, LINK).', 'error');
          return;
        }
        loadData(resources, file.name);
        toast('✓ Se cargaron ' + resources.length + ' recursos desde "' + file.name + '" (' +
          report.sheets + ' hoja' + (report.sheets !== 1 ? 's' : '') + ').', 'success');
      })
      .catch((err) => {
        $('#main').setAttribute('aria-busy', 'false');
        toast('Error al leer el archivo: ' + (err && err.message ? err.message : String(err)), 'error');
      });
  }

  /* ---------- Exportar ---------- */
  function handleExport() {
    if (!state.resources.length) {
      toast('No hay datos para exportar. Carga primero un archivo Excel.', 'error');
      return;
    }
    toast('Generando archivo Excel…', 'info');
    JMExcel.exportResources(state.resources);
    toast('✓ Excel exportado correctamente.', 'success');
  }

  /* ---------- Auto-sincronización con links.xlsx (modo servidor) ---------- */
  function shouldAutoSync(fileName) {
    return !fileName || fileName === 'links.xlsx' || fileName === 'data/links.xlsx';
  }

  function autoSync() {
    if (!/^https?:/i.test(window.location.protocol)) return Promise.resolve(false);
    const candidates = ['links.xlsx', 'data/links.xlsx'];
    return (async function () {
      for (const path of candidates) {
        try {
          const res = await fetch(path, { cache: 'no-store' });
          if (!res.ok) continue;
          const blob = await res.blob();
          const type = blob.type || (path.endsWith('.csv')
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          const { resources, report } = await JMExcel.parseFile(new File([blob], path.split('/').pop(), { type }));
          if (!resources.length) continue;
          loadData(resources, path.split('/').pop());
          toast('✓ Sincronizado desde "' + path.split('/').pop() + '" (' + resources.length + ' recursos' +
            (report.sheets > 1 ? ' · ' + report.sheets + ' hojas' : '') + ').', 'success');
          return true;
        } catch (e) { /* probar siguiente */ }
      }
      return false;
    })();
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    let debounce = null;
    $('#searchInput').addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.query = e.target.value.trim();
        render();
      }, 130);
    });

    $('#clearSearch').addEventListener('click', () => {
      $('#searchInput').value = '';
      state.query = '';
      render();
      $('#searchInput').focus();
    });

    $('#sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      render();
    });

    $('#categoryIndex').addEventListener('click', (e) => {
      const item = e.target.closest('.index-item');
      if (!item) return;
      state.category = item.getAttribute('data-category');
      render();
    });

    $('#clearFilters').addEventListener('click', () => {
      $('#searchInput').value = '';
      state.query = '';
      render();
    });

    $('#resetSearchBtn').addEventListener('click', () => {
      $('#searchInput').value = '';
      state.query = '';
      render();
      $('#searchInput').focus();
    });

    $('#viewIndex').addEventListener('click', () => setView('index'));
    $('#viewGrid').addEventListener('click', () => setView('grid'));
    $('#viewTable').addEventListener('click', () => setView('table'));

    $('#themeToggle').addEventListener('click', () => {
      state.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(state.theme);
    });

    const input = $('#fileInput');
    $('#btnUpload').addEventListener('click', () => input.click());
    $('#btnPickFirst').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      handleFile(input.files[0]);
      input.value = '';
    });

    $('#btnExport').addEventListener('click', handleExport);

    /* Delegación global: revelar secretos, copiar, detalles */
    document.addEventListener('click', (e) => {
      const reveal = e.target.closest('.extra-reveal');
      if (reveal) {
        const item = reveal.closest('.extra-item');
        if (item) {
          const shown = item.classList.toggle('is-revealed');
          const label = item.querySelector('.extra-item__label');
          const name = label ? label.textContent : '';
          reveal.setAttribute('aria-label', (shown ? 'Ocultar ' : 'Mostrar ') + name);
          reveal.setAttribute('title', shown ? 'Ocultar' : 'Mostrar');
        }
        return;
      }

      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyLink(copyBtn.getAttribute('data-copy'), copyBtn);
        return;
      }

      const detailsBtn = e.target.closest('[data-details]');
      if (detailsBtn) {
        const target = document.getElementById(detailsBtn.getAttribute('data-target'));
        if (target) {
          const expanded = target.hidden;
          target.hidden = !expanded;
          detailsBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
      }
    });

    /* Atajos de teclado */
    document.addEventListener('keydown', (e) => {
      const el = e.target;
      const tag = (el && el.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable);
      const search = $('#searchInput');

      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        search.focus();
        search.select();
        return;
      }
      if (e.key === '/' && !typing) {
        e.preventDefault();
        search.focus();
        return;
      }
      if (e.key === 'Escape' && document.activeElement === search && state.query) {
        search.value = '';
        state.query = '';
        render();
      }
    });

    /* Arrastrar y soltar */
    let dragDepth = 0;
    const overlay = $('#dropOverlay');
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragDepth++;
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
    });
    document.addEventListener('dragover', (e) => { e.preventDefault(); });
    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
      }
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        handleFile(files[0]);
        if (files.length > 1) toast('Se ignoraron archivos adicionales; se procesó solo el primero.', 'info');
      }
    });

    const dropzone = $('.dropzone');
    if (dropzone) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        input.click();
      });
      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      });
    }

    applyTheme(state.theme);
    setView(state.view);
  }

  /* ---------- Arranque ---------- */
  function init() {
    bindEvents();
    (async function () {
      const saved = JMStorage.load();
      const fileName = saved ? (saved.fileName || '') : '';
      const seed = window.JM_SEED;
      const seedOk = !!(seed && Array.isArray(seed.resources) && seed.resources.length);
      const savedOk = !!(saved && Array.isArray(saved.resources) && saved.resources.length);

      if (shouldAutoSync(fileName)) {
        const synced = await autoSync();
        if (synced) return;
      }

      // Si la semilla integrada cambió (nuevo generatedAt) y los datos guardados
      // vienen de una semilla anterior, se descartan y se usa la semilla nueva.
      const seedFromLinks = !fileName || fileName === 'links.xlsx' || fileName === 'data/links.xlsx';
      const staleSeed = savedOk && seedOk && (
        (saved.fromSeed === true && saved.seedVersion !== seed.generatedAt) ||
        (saved.fromSeed === undefined && seedFromLinks)
      );

      if (savedOk && !staleSeed) {
        state.resources = JMExcel.normalizeList(saved.resources);
        state.storedName = fileName;
        render();
        toast('Datos cargados desde el navegador (' + saved.resources.length + ' recursos' +
          (state.storedName ? ' · ' + state.storedName : '') + ').', 'success');
        return;
      }

      if (seedOk) {
        state.resources = JMExcel.normalizeList(seed.resources);
        state.storedName = seed.fileName || 'links.xlsx';
        try {
          JMStorage.save({ resources: state.resources, fileName: state.storedName, seedVersion: seed.generatedAt || '', fromSeed: true });
        } catch (e) { /* sin acción */ }
        render();
        toast('Se cargaron ' + seed.resources.length + ' recursos desde "' + state.storedName +
          '" (archivo integrado). Para actualizarlos, pulsa "Cargar Excel".', 'info');
      } else {
        render();
      }
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
