/* Store — estado global persistido em localStorage + SQLite (via /api/state) */
const { useState, useEffect, useCallback, useRef, createContext, useContext } = React;

const STORE_KEY = 'calc3d_v1';
const API       = '/api/state';
const IS_DEMO   = new URLSearchParams(location.search).get('demo') === '1';

function parseState(p) {
  if (!p) return null;
  return {
    printers: (p.printers || APP_DATA.PRINTERS).map(normPrinter),
    materials: (p.materials || APP_DATA.MATERIALS).map(normMaterial),
    history:  p.history  || [],
    schedule: p.schedule || [],
    catalog:  p.catalog  || [],
    clients:  p.clients  || [],
    settings: { ...APP_DATA.SETTINGS, ...(p.settings || {}) },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return parseState(JSON.parse(raw)) || makeDefault();
  } catch (e) { /* ignore */ }
  return makeDefault();
}

function makeDefault() {
  return {
    printers: APP_DATA.PRINTERS,
    materials: APP_DATA.MATERIALS,
    history: [], schedule: [], catalog: [], clients: [],
    settings: { ...APP_DATA.SETTINGS },
  };
}

// backfill de campos novos em dados já salvos
function normMaterial(m) {
  const spoolWeight = m.spoolWeight != null ? m.spoolWeight : 1000;
  const spools = m.spools != null ? m.spools : 1;
  return {
    brand: '', colorName: '', notes: '', lowStockG: 200,
    spoolWeight, spools,
    remainingG: m.remainingG != null ? m.remainingG : spoolWeight * spools,
    ...m,
  };
}
function normPrinter(p) {
  return { paybackMonths: 24, hoursPerDay: 8, daysPerMonth: 30, maintenancePct: 10, failurePct: 15, lifespanYears: 3, ...p };
}

const StoreCtx = createContext(null);

function StoreProvider({ children }) {
  const [state, setState] = useState(() =>
    IS_DEMO ? parseState(APP_DATA.DEMO_DATA) : loadState()
  );
  const synced = useRef(false);

  useEffect(() => {
    if (IS_DEMO) return; // demo: não busca nem sincroniza com o servidor
    fetch(API)
      .then(r => r.ok ? r.json() : null)
      .then(remote => { const s = parseState(remote); if (s) setState(s); })
      .catch(() => {})
      .finally(() => { synced.current = true; });
  }, []);

  useEffect(() => {
    if (IS_DEMO) return; // demo: mudanças ficam só em memória React
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
    if (!synced.current) return;
    fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {});
  }, [state]);

  const api = {
    ...state,
    isDemo: IS_DEMO,
    t: (key) => I18N.t(state.settings.lang, key),
    money: (v) => I18N.money(v, state.settings),
    curSymbol: () => I18N.curSymbol(state.settings),

    updateSettings: (patch) => setState(s => ({ ...s, settings: { ...s.settings, ...patch } })),

    addNfcFormat: (f) => setState(s => ({ ...s, settings: { ...s.settings, nfcFormats: [...(s.settings.nfcFormats || []), { ...f, id: 'fmt_' + Math.random().toString(36).slice(2, 8) }] } })),
    updateNfcFormat: (id, patch) => setState(s => ({ ...s, settings: { ...s.settings, nfcFormats: (s.settings.nfcFormats || []).map(f => f.id === id ? { ...f, ...patch } : f) } })),
    removeNfcFormat: (id) => setState(s => ({ ...s, settings: { ...s.settings, nfcFormats: (s.settings.nfcFormats || []).filter(f => f.id !== id), nfcFormat: s.settings.nfcFormat === id ? 'ace' : s.settings.nfcFormat } })),

    addPrinter: (p) => setState(s => ({ ...s, printers: [...s.printers, { ...p, id: APP_DATA.uid('prn_') }] })),
    updatePrinter: (id, patch) => setState(s => ({ ...s, printers: s.printers.map(p => p.id === id ? { ...p, ...patch } : p) })),
    removePrinter: (id) => setState(s => ({ ...s, printers: s.printers.filter(p => p.id !== id) })),
    duplicatePrinter: (id) => setState(s => {
      const o = s.printers.find(p => p.id === id); if (!o) return s;
      return { ...s, printers: [...s.printers, { ...o, id: APP_DATA.uid('prn_'), name: o.name + ' (cópia)' }] };
    }),

    addMaterial: (m) => setState(s => ({ ...s, materials: [...s.materials, { ...m, id: APP_DATA.uid('mat_') }] })),
    updateMaterial: (id, patch) => setState(s => ({ ...s, materials: s.materials.map(m => m.id === id ? { ...m, ...patch } : m) })),
    removeMaterial: (id) => setState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) })),
    duplicateMaterial: (id) => setState(s => {
      const o = s.materials.find(m => m.id === id); if (!o) return s;
      return { ...s, materials: [...s.materials, { ...o, id: APP_DATA.uid('mat_'), name: o.name + ' (cópia)' }] };
    }),

    saveQuote: (q) => setState(s => ({ ...s, history: [{ ...q, id: APP_DATA.uid('q_'), savedAt: Date.now() }, ...s.history] })),
    removeQuote: (id) => setState(s => ({ ...s, history: s.history.filter(q => q.id !== id) })),

    addJob: (j) => setState(s => ({ ...s, schedule: [...s.schedule, { ...j, id: APP_DATA.uid('job_') }] })),
    updateJob: (id, patch) => setState(s => ({ ...s, schedule: s.schedule.map(j => j.id === id ? { ...j, ...patch } : j) })),
    removeJob: (id) => setState(s => ({ ...s, schedule: s.schedule.filter(j => j.id !== id) })),

    addProduct: (pr) => setState(s => ({ ...s, catalog: [{ ...pr, id: APP_DATA.uid('prod_'), createdAt: Date.now() }, ...s.catalog] })),
    updateProduct: (id, patch) => setState(s => ({ ...s, catalog: s.catalog.map(p => p.id === id ? { ...p, ...patch } : p) })),
    removeProduct: (id) => setState(s => ({ ...s, catalog: s.catalog.filter(p => p.id !== id) })),

    addClient: (c) => { const id = APP_DATA.uid('cli_'); setState(s => ({ ...s, clients: [{ ...c, id, createdAt: Date.now() }, ...(s.clients || [])] })); return id; },
    updateClient: (id, patch) => setState(s => ({ ...s, clients: (s.clients || []).map(c => c.id === id ? { ...c, ...patch } : c) })),
    removeClient: (id) => setState(s => ({ ...s, clients: (s.clients || []).filter(c => c.id !== id),
      history: s.history.map(q => q.clientId === id ? { ...q, clientId: null } : q) })),

    // backup / restauração
    exportData: () => JSON.stringify({ __app: 'HFSTO', __v: 1, exportedAt: Date.now(),
      data: { printers: state.printers, materials: state.materials, history: state.history,
        schedule: state.schedule, catalog: state.catalog, clients: state.clients || [], settings: state.settings } }, null, 2),
    importData: (json, mode) => {
      let obj; try { obj = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return { ok: false, error: 'parse' }; }
      const d = obj && obj.data ? obj.data : obj;
      if (!d || (!d.materials && !d.printers && !d.history)) return { ok: false, error: 'shape' };
      setState(s => {
        if (mode === 'merge') {
          const byId = (arr) => { const seen = new Set((s[arr] || []).map(x => x.id)); return [...(s[arr] || []), ...((d[arr] || []).filter(x => !seen.has(x.id)))]; };
          return { ...s,
            printers: byId('printers'), materials: byId('materials'), history: byId('history'),
            schedule: byId('schedule'), catalog: byId('catalog'), clients: byId('clients'),
            settings: { ...s.settings, ...(d.settings || {}) } };
        }
        return { ...s,
          printers: d.printers || s.printers, materials: d.materials || s.materials,
          history: d.history || [], schedule: d.schedule || [], catalog: d.catalog || [], clients: d.clients || [],
          settings: { ...APP_DATA.SETTINGS, ...(d.settings || {}) } };
      });
      return { ok: true };
    },

    // baixa de estoque do filamento (consumo em gramas)
    consumeMaterial: (id, grams) => setState(s => ({ ...s, materials: s.materials.map(m =>
      m.id === id ? { ...m, remainingG: Math.max(0, (m.remainingG != null ? m.remainingG : (m.spoolWeight || 1000) * (m.spools || 1)) - grams) } : m) })),
  };

  return React.createElement(StoreCtx.Provider, { value: api }, children);
}

function useStore() { return useContext(StoreCtx); }

window.StoreProvider = StoreProvider;
window.useStore = useStore;
