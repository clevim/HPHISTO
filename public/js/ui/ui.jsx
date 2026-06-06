/* UI primitives + ícones (linha, estilo técnico) */

const ICONS = {
  anvil: 'M1.5 9.5 L7 7 L21.5 7 L21.5 10.5 L15.5 10.5 L13.5 13 L14 17 L18.5 17 L18.5 19.5 L5.5 19.5 L5.5 17 L10 17 L10.5 13 L5 10.5 Z',
  calc: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M8 7h8M8 11h2M8 15h2M14 11h2M14 15h2M9 3h6v3H9z',
  printer: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  history: 'M3 3v5h5M3.05 13a9 9 0 1 0 .5-4.5L3 8M12 7v5l4 2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  copy: 'M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  x: 'M18 6 6 18M6 6l12 12',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  check: 'M20 6 9 17l-5-5',
  chevron: 'M6 9l6 6 6-6',
  bolt: 'M13 2 3 14h9l-1 8 10-12h-9z',
  cube: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12l8.73-5.04M12 22.08V12',
  spool: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v6M12 16v6',
  tag: 'M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  coins: 'M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82',
  weight: 'M6.5 6.5h11l2.5 13H4zM12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
  play: 'M5 3l14 9-14 9V3z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  trend: 'M3 17l6-6 4 4 8-8M21 7h-6M21 7v6',
  alert: 'M12 2 2 20h20L12 2zM12 9v5M12 17h.01',
  box: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12l8.73-5.04M12 22.08V12',
  columns: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v18M15 3v18',
  flame: 'M12 2c1 5-3 6-3 10a3 3 0 0 0 6 0c0-1-.5-2-1-2.5C15 12 14 14 14 14s2-1 2-4c2 2 3 4 3 6a7 7 0 0 1-14 0c0-5 5-7 7-14z',
  volume: 'M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14',
  maximize: 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3',
  cart: 'M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  nfc: 'M6 8a6 5 0 0 0 0 8M9.5 6a9 7.5 0 0 0 0 12M18 8a6 5 0 0 1 0 8M14.5 6a9 7.5 0 0 1 0 12',
  download2: 'M12 3v12M8 11l4 4 4-4M4 19h16',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  restore: 'M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8M3 4v4h4',
};

function Icon({ name, style, className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <path d={ICONS[name] || ICONS.cube} />
    </svg>
  );
}

function Button({ variant = 'ghost', size, icon, children, ...rest }) {
  return (
    <button className={`btn btn-${variant}${size ? ' btn-' + size : ''}`} {...rest}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}

function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}{hint && <span className="hint">· {hint}</span>}</label>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, mono, id }) {
  return (
    <div className="control">
      <input id={id} className={mono ? 'mono' : ''} value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function NumberInput({ value, onChange, affix, affixLeft, step, min, placeholder, id }) {
  const stp = step || 1;
  const bump = (dir) => {
    const cur = (value === '' || value == null) ? 0 : Number(value);
    let nv = cur + dir * stp;
    if (min != null && nv < min) nv = min;
    nv = Math.round(nv * 1e6) / 1e6;
    onChange(nv);
  };
  return (
    <div className="control has-stepper">
      {affixLeft && <span className="affix left">{affixLeft}</span>}
      <input id={id} type="text" inputMode="decimal" className="mono"
        value={value ?? ''} placeholder={placeholder}
        onChange={e => {
          const raw = e.target.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
          onChange(raw === '' || raw === '-' || raw === '.' ? '' : parseFloat(raw));
        }} />
      <span className="stepper">
        <button type="button" tabIndex="-1" onClick={() => bump(1)} aria-label="+"><svg viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" /></svg></button>
        <button type="button" tabIndex="-1" onClick={() => bump(-1)} aria-label="−"><svg viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" /></svg></button>
      </span>
      {affix && <span className="affix">{affix}</span>}
    </div>
  );
}

function Select({ value, onChange, children, id }) {
  return (
    <div className="control">
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>{children}</select>
      <span className="chev"><Icon name="chevron" style={{ width: 15, height: 15 }} /></span>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map(o => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <div className="pill-toggle" onClick={() => onChange(!on)}>
      <div className={'switch' + (on ? ' on' : '')} />
      {label && <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>}
    </div>
  );
}

function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <Button variant="subtle" className="btn btn-subtle btn-icon" onClick={onClose}><Icon name="x" /></Button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function SectionLabel({ children }) { return <div className="section-label">{children}</div>; }

/* ActionButton — tecla de máquina tátil p/ ações de criação principais */
function ActionButton({ icon = 'plus', children, sub, onClick, compact, outline }) {
  return (
    <button className={'act-btn' + (compact ? ' compact' : '') + (outline ? ' outline' : '')} onClick={onClick}>
      <span className="act-cap">
        <Icon name={icon} />
        <span className="act-plus"><Icon name="plus" /></span>
      </span>
      <span className="act-text">
        <span className="act-label">{children}</span>
        {sub && <span className="act-sub">{sub}</span>}
      </span>
      <span className="act-led" />
      <span className="act-bead" />
    </button>
  );
}

/* Knob — botão giratório tátil (margem, ajustes). Arraste pra cima/baixo. */
function describeArc(cx, cy, r, a0, a1) {
  const p = (a) => { const rad = a * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; };
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function Knob({ value, min = 0, max = 100, step = 1, onChange, unit = '', label, size = 116, format }) {
  const v = Number(value) || 0;
  const clamp = (n) => Math.max(min, Math.min(max, n));
  const t = (clamp(v) - min) / (max - min);
  const A0 = 135, SWEEP = 270;
  const ang = A0 + t * SWEEP;
  const drag = useRef(null);

  useEffect(() => {
    const move = (e) => {
      if (!drag.current) return;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = drag.current.y - cy;
      const range = max - min;
      let nv = drag.current.v + (dy / 160) * range;
      nv = Math.round(nv / step) * step;
      onChange(clamp(nv));
    };
    const up = () => { drag.current = null; document.body.style.cursor = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [min, max, step, onChange]);

  const start = (e) => { drag.current = { y: e.clientY, v }; document.body.style.cursor = 'ns-resize'; };
  const C = 60, R = 44;
  const [px, py] = [C + (R - 7) * Math.cos(ang * Math.PI / 180), C + (R - 7) * Math.sin(ang * Math.PI / 180)];
  const ticks = [];
  for (let i = 0; i <= 10; i++) { const a = (A0 + (i / 10) * SWEEP) * Math.PI / 180; ticks.push([C + (R + 5) * Math.cos(a), C + (R + 5) * Math.sin(a), C + (R + 9) * Math.cos(a), C + (R + 9) * Math.sin(a), i / 10 <= t]); }

  return (
    <div className="knob-wrap">
      <svg width={size} height={size} viewBox="0 0 120 120" className="knob" onPointerDown={start} style={{ touchAction: 'none' }}>
        {ticks.map((k, i) => <line key={i} x1={k[0]} y1={k[1]} x2={k[2]} y2={k[3]} className={'knob-tick' + (k[4] ? ' on' : '')} />)}
        <path d={describeArc(C, C, R, A0, A0 + SWEEP)} className="knob-track" />
        <path d={describeArc(C, C, R, A0, ang)} className="knob-fill" />
        <circle cx={C} cy={C} r="33" className="knob-body" />
        <circle cx={C} cy={C} r="33" className="knob-knurl" />
        <line x1={C} y1={C} x2={px} y2={py} className="knob-pointer" />
        <circle cx={px} cy={py} r="3.5" className="knob-dot" />
        <text x={C} y={unit ? C - 2 : C + 5} className="knob-val">{format ? format(v) : v}</text>
        {unit && <text x={C} y={C + 13} className="knob-unit">{unit}</text>}
      </svg>
      {label && <div className="knob-label">{label}</div>}
    </div>
  );
}

Object.assign(window, { Icon, Button, Field, TextInput, NumberInput, Select, Segmented, Switch, Modal, SectionLabel, Knob, ActionButton, ICONS });
