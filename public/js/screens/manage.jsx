/* Telas de cadastro — Impressoras e Materiais */

function PrinterIso({ active }) {
  // mini-impressora isométrica (wireframe estilo cartesiana)
  const U = 30, C = Math.cos(Math.PI / 6) * U, S = Math.sin(Math.PI / 6) * U;
  const W = 1.5, H = 1.75;
  const P = (x, y, z) => `${((x - y) * C).toFixed(1)},${((x + y) * S - z * U).toFixed(1)}`;
  const pxy = (x, y, z) => ({ x: (x - y) * C, y: (x + y) * S - z * U });
  // cantos base e topo
  const edges = [
    // base
    [[0, 0, 0], [W, 0, 0]], [[W, 0, 0], [W, W, 0]], [[W, W, 0], [0, W, 0]], [[0, W, 0], [0, 0, 0]],
    // topo
    [[0, 0, H], [W, 0, H]], [[W, 0, H], [W, W, H]], [[W, W, H], [0, W, H]], [[0, W, H], [0, 0, H]],
    // verticais
    [[0, 0, 0], [0, 0, H]], [[W, 0, 0], [W, 0, H]], [[W, W, 0], [W, W, H]], [[0, W, 0], [0, W, H]],
  ];
  const bedZ = 0.34, gantryZ = 1.15;
  const bed = `${P(0.18, 0.18, bedZ)} ${P(W - 0.18, 0.18, bedZ)} ${P(W - 0.18, W - 0.18, bedZ)} ${P(0.18, W - 0.18, bedZ)}`;
  const head = pxy(W / 2, W / 2, gantryZ);
  const gL = pxy(0, W / 2, gantryZ), gR = pxy(W, W / 2, gantryZ);
  const spool = pxy(W / 2, 0, H + 0.05);
  return (
    <svg viewBox="-58 -76 116 132" className={'prn-iso' + (active ? ' on' : '')}>
      {/* painel traseiro faint */}
      <polygon points={`${P(0,0,0)} ${P(W,0,0)} ${P(W,0,H)} ${P(0,0,H)}`} className="prn-panel" />
      <polygon points={`${P(0,0,0)} ${P(0,W,0)} ${P(0,W,H)} ${P(0,0,H)}`} className="prn-panel2" />
      {/* mesa */}
      <polygon points={bed} className="prn-bed" />
      {/* frame */}
      {edges.map((e, i) => <line key={i} x1={pxy(...e[0]).x} y1={pxy(...e[0]).y} x2={pxy(...e[1]).x} y2={pxy(...e[1]).y} className="prn-edge" />)}
      {/* gantry + cabeçote */}
      <line x1={gL.x} y1={gL.y} x2={gR.x} y2={gR.y} className="prn-gantry" />
      <g className="prn-head" style={{ transform: `translate(${head.x}px, ${head.y}px)` }}>
        <rect x="-7" y="-6" width="14" height="9" rx="1" className="prn-carriage" />
        <polygon points="-3,3 3,3 0,8" className="prn-nozzle" />
        <circle cx="0" cy="9" r="1.6" className="prn-tip" />
      </g>
      {/* bobina no topo */}
      <g className="prn-spool" style={{ transformOrigin: `${spool.x}px ${spool.y}px` }}>
        <circle cx={spool.x} cy={spool.y} r="9" className="prn-spool-o" />
        <circle cx={spool.x} cy={spool.y} r="3" className="prn-spool-i" />
      </g>
    </svg>
  );
}

function PrinterModal({ store, editing, onClose }) {
  const t = store.t;
  const blank = { name: '', model: '', power: 200, value: 2000, lifespanYears: 3, paybackMonths: 24, hoursPerDay: 8, daysPerMonth: 30, maintenancePct: 10, failurePct: 15 };
  const [f, setF] = useState(editing || blank);
  const set = (p) => setF(s => ({ ...s, ...p }));
  const save = () => {
    if (editing) store.updatePrinter(editing.id, f); else store.addPrinter(f);
    onClose();
  };
  return (
    <Modal title={editing ? t('edit') + ' — ' + (editing.name) : t('add_printer')} onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={!f.name}>{t('save')}</Button></>}>
      <Field label={t('printer')}><TextInput value={f.name} onChange={v => set({ name: v })} placeholder="Ex: Ender 3 — bancada" /></Field>
      <Field label={t('model_label')}><TextInput value={f.model} onChange={v => set({ model: v })} placeholder="Creality / Bambu / ..." /></Field>
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label={t('power')}><NumberInput value={f.power} step={10} onChange={v => set({ power: v })} affix="W" /></Field>
        <Field label={t('machine_value')}><NumberInput value={f.value} step={50} onChange={v => set({ value: v })} affixLeft={store.curSymbol()} /></Field>
        <Field label={t('lifespan')}><NumberInput value={f.lifespanYears} step={1} onChange={v => set({ lifespanYears: v })} affix="anos" /></Field>
        <Field label={t('payback')}><NumberInput value={f.paybackMonths} step={1} onChange={v => set({ paybackMonths: v })} affix="mês" /></Field>
        <Field label={t('hours_day')}><NumberInput value={f.hoursPerDay} step={1} onChange={v => set({ hoursPerDay: v })} affix="h" /></Field>
        <Field label={t('days_month')}><NumberInput value={f.daysPerMonth} step={1} onChange={v => set({ daysPerMonth: v })} affix="d" /></Field>
        <Field label={t('maint_pct')}><NumberInput value={f.maintenancePct} step={1} onChange={v => set({ maintenancePct: v })} affix="%" /></Field>
        <Field label={t('fail_pct')}><NumberInput value={f.failurePct} step={1} onChange={v => set({ failurePct: v })} affix="%" /></Field>
      </div>
    </Modal>
  );
}

function PrintersScreen() {
  const store = useStore();
  const t = store.t;
  const [modal, setModal] = useState(null);

  const activeIds = new Set(store.schedule.filter(j => j.status === 'printing').map(j => j.printerId));

  return (
    <div className="page" style={{ maxWidth: 1120 }}>
      <div className="flex between" style={{ marginBottom: 18 }}>
        <SectionLabel>{store.printers.length} {t('nav_printers').toLowerCase()}</SectionLabel>
        <span className="screen-hint mono">{t('add_hint_prn')}</span>
      </div>
      <div className="bay-grid">
        <button className="bay bay-add" onClick={() => setModal('new')}>
          <div className="bay-stage">
            <svg viewBox="-60 -70 120 130" className="bay-add-iso">
              <polygon points="-42,8 0,30 42,8 0,-14" className="ba-bed" />
              <path d="M-42,8 L-42,-34 M42,8 L42,-34 M0,30 L0,-12 M-42,-34 L0,-12 L42,-34" className="ba-frame" />
              <line x1="0" y1="-2" x2="0" y2="-26" className="ba-plus" />
              <line x1="-12" y1="-14" x2="12" y2="-14" className="ba-plus" />
            </svg>
            <div className="bay-floor" />
            <span className="bay-add-tag">{t('add_sub_prn')}</span>
          </div>
          <div className="bay-plate">
            <div className="bay-plate-head">
              <div><div className="bay-name">{t('add_printer')}</div><div className="bay-model">{t('add_hint_prn')}</div></div>
              <span className="bay-no">+</span>
            </div>
          </div>
        </button>
        {store.printers.map((p, idx) => {
          const active = activeIds.has(p.id);
          return (
            <div className={'bay' + (active ? ' on' : '')} key={p.id}>
              <div className="bay-actions">
                <button onClick={() => store.duplicatePrinter(p.id)} title={t('duplicate')}><Icon name="copy" /></button>
                <button onClick={() => setModal(p)} title={t('edit')}><Icon name="edit" /></button>
                <button onClick={() => { if (confirm(t('confirm_del'))) store.removePrinter(p.id); }} title={t('remove')} className="danger"><Icon name="trash" /></button>
              </div>
              <div className="bay-stage" onClick={() => setModal(p)}>
                <span className={'bay-status ' + (active ? 'printing' : 'idle')}><span className="sb-dot" />{active ? t('st_printing') : 'ONLINE'}</span>
                <PrinterIso active={active} />
                <div className="bay-floor" />
              </div>
              <div className="bay-plate">
                <div className="bay-plate-head">
                  <div>
                    <div className="bay-name">{p.name}</div>
                    <div className="bay-model">{p.model || '—'}</div>
                  </div>
                  <span className="bay-no">#{String(idx + 1).padStart(2, '0')}</span>
                </div>
                <div className="bay-specs">
                  <div><span>{t('power')}</span><b>{p.power}W</b></div>
                  <div><span>{t('machine_value')}</span><b>{store.money(p.value)}</b></div>
                  <div><span>{t('lifespan')}</span><b>{p.lifespanYears}a</b></div>
                  <div><span>{t('fail_pct')}</span><b>{p.failurePct}%</b></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {modal && <PrinterModal store={store} editing={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function MaterialModal({ store, editing, onClose }) {
  const t = store.t;
  const blank = { name: '', type: 'PLA', brand: '', colorName: '', pricePerKg: 120, density: 1.24, diameter: 1.75, spoolWeight: 1000, spools: 1, remainingG: 1000, lowStockG: 200, color: '#E8743B', notes: '' };
  const [f, setF] = useState(editing || blank);
  const set = (p) => setF(s => ({ ...s, ...p }));
  const save = () => { if (editing) store.updateMaterial(editing.id, f); else store.addMaterial(f); onClose(); };
  const swatches = ['#E8743B', '#3B82C4', '#4CAF7D', '#C4523B', '#6B5BC4', '#C4A23B', '#3BA9C4', '#C43B7D', '#222222', '#888888'];
  return (
    <Modal title={editing ? t('edit') + ' — ' + editing.name : t('add_material')} onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={!f.name}>{t('save')}</Button></>}>
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label={t('material')}><TextInput value={f.name} onChange={v => set({ name: v })} placeholder="Ex: PLA Premium" /></Field>
        <Field label={t('mat_type')}><TextInput value={f.type} onChange={v => set({ type: v })} placeholder="PLA / ABS / PETG" /></Field>
        <Field label={t('brand')}><TextInput value={f.brand} onChange={v => set({ brand: v })} placeholder="Ex: 3D Fila, Voolt..." /></Field>
        <Field label={t('color_name')}><TextInput value={f.colorName} onChange={v => set({ colorName: v })} placeholder="Ex: Laranja fosco" /></Field>
      </div>

      <SectionLabel>{t('price_kg')} · {t('density')}</SectionLabel>
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label={t('price_kg')}><NumberInput value={f.pricePerKg} step={5} onChange={v => set({ pricePerKg: v })} affixLeft={store.curSymbol()} affix="/kg" /></Field>
        <Field label={t('density')}><NumberInput value={f.density} step={0.01} onChange={v => set({ density: v })} affix="g/cm³" /></Field>
        <Field label={t('diameter')}><NumberInput value={f.diameter} step={0.05} onChange={v => set({ diameter: v })} affix="mm" /></Field>
        <Field label={t('spool')}><NumberInput value={f.spoolWeight} step={50} onChange={v => set({ spoolWeight: v })} affix="g" /></Field>
      </div>

      <SectionLabel>{t('sec_stock')}</SectionLabel>
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label={t('spools_n')}><NumberInput value={f.spools} step={1} min={0} onChange={v => set({ spools: v })} affix="un" /></Field>
        <Field label={t('remaining')} hint={`de ${(f.spoolWeight * (f.spools || 1)).toFixed(0)}g`}><NumberInput value={f.remainingG} step={50} min={0} onChange={v => set({ remainingG: v })} affix="g" /></Field>
        <Field label={t('low_stock')}><NumberInput value={f.lowStockG} step={50} min={0} onChange={v => set({ lowStockG: v })} affix="g" /></Field>
      </div>

      <Field label="Cor" hint={t('custom_color')}>
        <div className="flex flex-wrap" style={{ gap: 8, alignItems: 'center' }}>
          {swatches.map(c => (
            <button key={c} onClick={() => set({ color: c })} style={{
              width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
              border: f.color === c ? '2px solid var(--ink)' : '2px solid transparent',
              boxShadow: '0 0 0 1px var(--line)',
            }} />
          ))}
          <label className="color-wheel" title={t('custom_color')}
            style={{ outline: swatches.includes(f.color) ? 'none' : '2px solid var(--ink)', outlineOffset: 2 }}>
            <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: f.color, boxShadow: '0 0 0 2px var(--card)' }} />
            <input type="color" value={f.color} onChange={e => set({ color: e.target.value })}
              style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </label>
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'uppercase' }}>{f.color}</span>
        </div>
      </Field>
      <Field label={t('notes')}>
        <div className="control"><input value={f.notes} placeholder="Temp. bico, cama, secagem..." onChange={e => set({ notes: e.target.value })} /></div>
      </Field>
    </Modal>
  );
}

function FilamentSpool({ m, store, pct, low }) {
  // carretel visto de frente — filamento em espiral contínua do núcleo p/ fora; esvazia de fora p/ dentro
  const R = 52, rCore = 16, rMax = 44;
  const band = (pct / 100) * (rMax - rCore);   // espessura do filamento (a partir do núcleo)
  const rOuter = rCore + band;
  const stroke = low ? 'var(--accent)' : m.color;
  // espiral de Arquimedes preenchendo do núcleo até o nível de estoque
  const spiralD = (() => {
    if (band < 1) return '';
    const rIn = rCore + 1.5;
    const turns = Math.max(2, Math.round(band / 2.4));
    const steps = Math.max(48, turns * 48);
    let d = '';
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      const ang = f * turns * 2 * Math.PI - Math.PI / 2;
      const r = rIn + (rOuter - rIn) * f;
      const x = 60 + r * Math.cos(ang), y = 66 + r * Math.sin(ang);
      d += (s === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return d;
  })();
  return (
    <svg viewBox="0 0 120 132" className="fil-spool">
      {/* peg / suporte */}
      <line x1="60" y1="2" x2="60" y2="14" className="fil-peg" />
      <circle cx="60" cy="3" r="3" className="fil-peg-cap" />
      {/* flange */}
      <circle cx="60" cy="66" r={R} className="fil-flange" />
      <circle cx="60" cy="66" r={R - 4} className="fil-flange-in" />
      {/* corpo translúcido do filamento (massa) */}
      {band >= 1 && <circle cx="60" cy="66" r={rOuter} fill={stroke} style={{ opacity: 0.13 }} />}
      {/* filamento em espiral contínua */}
      {spiralD && <path d={spiralD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }} />}
      {/* furos da flange — por cima da linha (a espiral passa por baixo) */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const a = (i * 60 - 90) * Math.PI / 180;
        return <circle key={i} cx={60 + 50 * Math.cos(a)} cy={66 + 50 * Math.sin(a)} r="3.4" className="fil-hole" />;
      })}
      {/* core */}
      <circle cx="60" cy="66" r="13" className="fil-core" />
      <circle cx="60" cy="66" r="5.5" className="fil-bore" />
    </svg>
  );
}

function MaterialsScreen() {
  const store = useStore();
  const t = store.t;
  const [modal, setModal] = useState(null);
  const [nfc, setNfc] = useState(null);

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <div className="flex between" style={{ marginBottom: 18 }}>
        <SectionLabel>{store.materials.length} {t('nav_materials').toLowerCase()}</SectionLabel>
        <span className="screen-hint mono">{t('add_hint_mat')}</span>
      </div>

      <div className="fil-wall">
        <button className="fil-cell fil-add" onClick={() => setModal('new')}>
          <span className="fil-spool-btn">
            <svg viewBox="0 0 120 132" className="fil-spool">
              <line x1="60" y1="2" x2="60" y2="14" className="fa-peg" />
              <circle cx="60" cy="3" r="3" className="fa-peg" />
              <circle cx="60" cy="66" r="52" className="fa-ring" />
              <circle cx="60" cy="66" r="30" className="fa-ring2" />
              <line x1="60" y1="52" x2="60" y2="80" className="fa-plus" />
              <line x1="46" y1="66" x2="74" y2="66" className="fa-plus" />
            </svg>
          </span>
          <div className="fil-info">
            <div className="fil-name">{t('add_material')}</div>
            <div className="fil-meta">{t('add_sub_mat')}</div>
          </div>
        </button>
        {store.materials.map(m => {
          const total = (m.spoolWeight || 1000) * (m.spools || 1);
          const remaining = m.remainingG != null ? m.remainingG : total;
          const pct = total > 0 ? Math.min(100, remaining / total * 100) : 0;
          const low = remaining <= (m.lowStockG || 0);
          return (
            <div className={'fil-cell' + (low ? ' low' : '')} key={m.id}>
              <div className="fil-actions">
                {store.settings.nfcEnabled !== false && <button onClick={() => setNfc(m)} title={t('nfc_gen')} className="nfc"><Icon name="nfc" /></button>}
                <button onClick={() => store.duplicateMaterial(m.id)} title={t('duplicate')}><Icon name="copy" /></button>
                <button onClick={() => setModal(m)} title={t('edit')}><Icon name="edit" /></button>
                <button onClick={() => { if (confirm(t('confirm_del'))) store.removeMaterial(m.id); }} title={t('remove')} className="danger"><Icon name="trash" /></button>
              </div>
              <button className="fil-spool-btn" onClick={() => setModal(m)}>
                <FilamentSpool m={m} store={store} pct={pct} low={low} />
                {low && <span className="fil-low">{t('low_stock_tag')}</span>}
              </button>
              <div className="fil-info">
                <div className="fil-name">{m.name}</div>
                <div className="fil-meta">{m.type} · {store.money(m.pricePerKg)}/kg</div>
                <div className="fil-stock">
                  <span className="mono" style={{ color: low ? 'var(--accent)' : 'var(--ink-2)' }}>{remaining.toFixed(0)}g</span>
                  <span className="muted mono">/ {total.toFixed(0)}g · {pct.toFixed(0)}%</span>
                </div>
                <button className="fil-refill" onClick={() => store.updateMaterial(m.id, { spools: (m.spools || 0) + 1, remainingG: remaining + (m.spoolWeight || 1000) })}>
                  <Icon name="plus" />{t('refill')}
                </button>
                {store.settings.nfcEnabled !== false && (
                  <button className="fil-nfc" onClick={() => setNfc(m)}>
                    <Icon name="nfc" />{t('nfc_tag')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {modal && <MaterialModal store={store} editing={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
      {nfc && <NfcModal store={store} material={nfc} onClose={() => setNfc(null)} />}
    </div>
  );
}

window.PrintersScreen = PrintersScreen;
window.MaterialsScreen = MaterialsScreen;
