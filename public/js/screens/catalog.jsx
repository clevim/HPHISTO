/* Catálogo de produtos — VITRINE de pedestais iluminados.
   Cada produto é uma peça impressa em isométrico sobre um pedestal com holofote. */

function PrintedPiece({ color, seed }) {
  // gerador procedural — 6 arquétipos, determinístico pelo seed
  // cores sempre elevadas em direção ao branco → visível mesmo em materiais escuros
  let h = 0; for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = (() => { let s = h; return () => { s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return((t^(t>>>14))>>>0)/4294967296; }; })();
  const kind = h % 6;

  const mw = (p) => `color-mix(in oklab, ${color}, #fff ${p}%)`;
  const mb = (p) => `color-mix(in oklab, ${color}, #000 ${p}%)`;
  const TOP = mw(52), FRONT = mw(28), RIGHT = mw(10), BACK = mb(20);

  const U = 28, Uz = 22;
  const C = Math.cos(Math.PI / 6) * U, S = Math.sin(Math.PI / 6) * U;
  const proj = (x, y, z) => [((x - y) * C), ((x + y) * S - z * Uz)];

  const rings = [];
  const pushRing = (z, r, rot, wob, N) => {
    const v = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2 + rot;
      const rr = r * (1 + (wob || 0) * Math.sin(3 * a + 1.7));
      v.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    rings.push({ v, z });
  };

  const H = 3.0 + rnd() * 1.4, STEPS = 10;
  if (kind === 0) {
    const lobes = 3 + Math.floor(rnd() * 3), tw = (rnd() - 0.5) * 2.8;
    for (let i = 0; i <= STEPS; i++) { const t = i/STEPS; pushRing(t*H, 0.68*(0.55+0.75*Math.sin(Math.PI*(0.15+t*0.7))), t*tw, 0.16+rnd()*0.1, 22); }
  } else if (kind === 1) {
    const N = 6 + (h%2)*2, tap = 0.10+rnd()*0.08;
    for (let i = 0; i <= STEPS; i++) { const t = i/STEPS; pushRing(t*H, 0.74-tap*t, 0, 0, N); }
  } else if (kind === 2) {
    const tiers = 2 + Math.floor(rnd()*2), th = H/tiers;
    for (let s = 0; s < tiers; s++) {
      const r = 0.78 - s*0.2, z0 = s*th;
      pushRing(z0, r, 0, 0, 4); pushRing(z0+0.01, r, 0, 0, 4);
      pushRing(z0+0.01, r*0.76, 0, 0, 4); pushRing(z0+th, r*0.76, 0, 0, 4);
    }
  } else if (kind === 3) {
    const N = 5 + Math.floor(rnd()*3);
    for (let i = 0; i <= STEPS; i++) { const t = i/STEPS; const p = t<0.5 ? 0.4+0.6*(t/0.5) : 1-(0.85*((t-0.5)/0.5)); pushRing(t*H, 0.70*p, Math.PI/N, 0, N); }
  } else if (kind === 4) {
    for (let i = 0; i <= STEPS*2; i++) { const t = i/(STEPS*2); const r = 0.60+(i%2===0?0.09:0); pushRing(t*H, r, i*0.22, 0, 18); }
  } else {
    const tw = 2.2+rnd()*2;
    for (let i = 0; i <= STEPS; i++) { const t = i/STEPS; pushRing(t*H, 0.56, t*tw, 0, 4); }
  }

  const faces = []; let k = 0;
  for (let ri = 0; ri < rings.length - 1; ri++) {
    const lo = rings[ri], hi = rings[ri+1];
    const N = Math.min(lo.v.length, hi.v.length) - 1;
    for (let vi = 0; vi < N; vi++) {
      const p0 = proj(lo.v[vi][0], lo.v[vi][1], lo.z);
      const p1 = proj(lo.v[vi+1][0], lo.v[vi+1][1], lo.z);
      const p2 = proj(hi.v[vi+1][0], hi.v[vi+1][1], hi.z);
      const p3 = proj(hi.v[vi][0], hi.v[vi][1], hi.z);
      const nx = p1[1]-p0[1], ny = -(p1[0]-p0[0]);
      const shade = (nx>0&&ny<0)?FRONT:(nx>0&&ny>0)?RIGHT:BACK;
      faces.push(<polygon key={k++} points={[p0,p1,p2,p3].map(p=>p.join(',')).join(' ')} fill={shade} />);
    }
  }
  const top = rings[rings.length-1];
  faces.push(<polygon key="t" points={top.v.slice(0,-1).map(([x,y])=>proj(x,y,top.z).join(',')).join(' ')} fill={TOP} />);

  const allP = rings.flatMap(r => r.v.map(([x,y]) => proj(x,y,r.z)));
  const xs = allP.map(p=>p[0]), ys = allP.map(p=>p[1]);
  const pad = 5;
  const vb = `${(Math.min(...xs)-pad).toFixed(0)} ${(Math.min(...ys)-pad).toFixed(0)} ${(Math.max(...xs)-Math.min(...xs)+2*pad).toFixed(0)} ${(Math.max(...ys)-Math.min(...ys)+2*pad).toFixed(0)}`;
  return <svg className="pp-iso" viewBox={vb}>{faces}</svg>;
}

function CatalogScreen({ onNavigate, flash }) {
  const store = useStore();
  const t = store.t;
  const money = (v) => I18N.money(v, store.settings);

  return (
    <div className="page" style={{ maxWidth: 1120 }}>
      {flash && <div className="flash-ok"><Icon name="check" /> {t('product_saved')}</div>}
      <div className="flex between" style={{ marginBottom: 18 }}>
        <SectionLabel>{store.catalog.length} {t('nav_catalog').toLowerCase()}</SectionLabel>
      </div>

      <div className="shelf">
        {store.catalog.map(p => (
          <div className="ped" key={p.id}>
            <div className="ped-actions">
              <button onClick={() => { const n = prompt(t('product_name'), p.name); if (n != null) store.updateProduct(p.id, { name: n }); }} title={t('edit')}><Icon name="edit" /></button>
              <button onClick={() => { if (confirm(t('confirm_del'))) store.removeProduct(p.id); }} title={t('remove')} className="danger"><Icon name="trash" /></button>
            </div>
            <div className="ped-stage">
              <span className="ped-spot" style={{ '--c': p.color }} />
              <PrintedPiece color={p.color} seed={p.id + p.name} />
              <span className="ped-shadow" />
              <span className="ped-tag mono">{money(p.unitPrice)}</span>
            </div>
            <div className="ped-plate">
              <div className="ped-name">{p.name}</div>
              <div className="ped-meta mono">{p.materialName} · {(p.weight || 0).toFixed(0)}g · {(p.hours || 0).toFixed(1)}h</div>
              <div className="ped-foot">
                <span className="ped-cost mono">{t('cost')} {money(p.unitCost)}</span>
                <button className="ped-quote" onClick={() => onNavigate('calc', { loadInput: { ...p.input } })}>
                  <Icon name="calc" />{t('quote_product')}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* pedestal vazio — adicionar */}
        <button className="ped ped-empty" onClick={() => onNavigate('calc', { loadInput: null, fresh: Date.now() })}>
          <div className="ped-stage">
            <span className="ped-spot empty" />
            <span className="ped-plus"><Icon name="plus" /></span>
            <span className="ped-shadow" />
          </div>
          <div className="ped-plate">
            <div className="ped-name muted">{t('add_product')}</div>
            <div className="ped-meta mono">{t('save_to_catalog')}</div>
          </div>
        </button>
      </div>

      {store.catalog.length === 0 && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: 'center' }}>{t('catalog_empty')} — {t('save_to_catalog')} → na calculadora</p>
      )}
    </div>
  );
}

window.CatalogScreen = CatalogScreen;
