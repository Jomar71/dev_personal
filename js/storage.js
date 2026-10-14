/* ============================================================
   storage.js · Persistencia en localStorage
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'jm_repositorio_v3';
  const MAX_SIZE = 4.5e6;

  const Storage = {
    save(data) {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        fileName: data.fileName || '',
        seedVersion: data.seedVersion || '',
        fromSeed: !!data.fromSeed,
        count: data.resources ? data.resources.length : 0,
        resources: data.resources || []
      };
      const json = JSON.stringify(payload);
      if (json.length > MAX_SIZE) {
        throw new Error(
          'El archivo es demasiado grande para guardarlo en el navegador (límite ~4.5 MB). ' +
          'Los datos se muestran en esta sesión pero no quedan guardados.'
        );
      }
      try {
        localStorage.setItem(STORAGE_KEY, json);
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          throw new Error(
            'No hay espacio suficiente en el navegador para guardar los datos. ' +
            'Los datos se muestran en esta sesión pero no quedan guardados.'
          );
        }
        throw e;
      }
      return payload;
    },

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!Array.isArray(data.resources)) return null;
        return data;
      } catch (e) {
        this.clear();
        return null;
      }
    },

    clear() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* sin acción */
      }
    },

    get size() {
      const raw = localStorage.getItem(STORAGE_KEY) || '';
      return raw.length;
    }
  };

  if (typeof window !== 'undefined') {
    window.JMStorage = Storage;
  }
})();