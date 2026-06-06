/* Catálogo de produtos — VITRINE de pedestais iluminados.
   Cada produto é uma peça impressa em isométrico sobre um pedestal com holofote. */

function PrintedPiece({ color, seed }) {
  // mini peça isométrica empilhada (cor do material), determinística pelo seed
  let h = 0; for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const kind = h % 4; // 0 cubo, 1 cilindro/octógono, 2 prisma, 3 torre
  const U = 26, C = Math.cos(Math.PI / 6) * U, S = Math.sin(Math.PI / 6) * U;
  const pt = (x, y, z) => `${((x - y) * C).toFixed(1)},${((x + y) * S - z * U).toFixed(1)}`;
  const dark = (p) => `color-mix(in oklab, ${color}, #000 ${p}%)`;
  const light = (p) => `color-mix(in oklab, ${color}, #fff ${p}%)`;
  const W = 1, layers = kind === 3 ? 5 : 3;
  const faces = [];
  for (let i = 0; i < layers; i++) {
    const z0 = i, z1 = i + 1;
    faces.push(<polygon key={'f' + i} points={`${pt(0, W, z0)} ${pt(W, W, z0)} ${pt(W, W, z1)} ${pt(0, W, z1)}`} fill={color} />);
    faces.push(<polygon key={'r' + i} points={`${pt(W, W, z0)} ${pt(W, 0, z0)} ${pt(W, 0, z1)} ${pt(W, W, z1)}`} fill={dark(26)} />);
  }
  return (
    <svg className="pp-iso" viewBox="-46 -92 92 120">
      {faces}
      <polygon points={`${pt(0, 0, layers)} ${pt(W, 0, layers)} ${pt(W, W, layers)} ${pt(0, W, layers)}`} fill={light(16)} />
    </svg>
  );
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
