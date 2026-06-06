/* Comparador inline — usado DENTRO da calculadora.
   Compara o setup atual da peça com alternativas (impressora + material). */

function CompareInline({ store, base }) {
  const t = store.t;
  const money = (v) => I18N.money(v, store.settings);
  const [open, setOpen] = useState(false);

  // setups alternativos (além do atual). Começa vazio; usuário adiciona.
  const [alts, setAlts] = useState([]);
  const addAlt = () => setAlts(arr => arr.length >= 2 ? arr : [...arr, {
    id: 'a' + Date.now(),
    printerId: store.printers.find(p => p.id !== base.printerId)?.id || base.printerId,
    materialId: store.materials.find(m => m.id !== base.materialId)?.id || base.materialId,
  }]);
  const setAlt = (id, patch) => setAlts(arr => arr.map(s => s.id === id ? { ...s, ...patch } : s));
  const rmAlt = (id) => setAlts(arr => arr.filter(s => s.id !== id));

  const calcFor = (printerId, materialId) => {
    const printer = store.printers.find(p => p.id === printerId);
    const material = store.materials.find(m => m.id === materialId);
    return CALC.compute({
      quantity: Number(base.quantity) || 1, inputMode: 'weight',
      weightG: Number(base.weightG) || 0,
      timeHours: Number(base.timeHours) || 0, timeMinutes: Number(base.timeMinutes) || 0,
      margin: Number(base.margin) || 0, cardFeePct: Number(base.cardFeePct) || 0,
    }, printer, material, store.settings);
  };

  const rows = [
    { id: 'base', current: true, printerId: base.printerId, materialId: base.materialId },
    ...alts,
  ].map(s => ({ ...s, r: calcFor(s.printerId, s.materialId) }));

  const valid = rows.filter(x => x.r.unitCost > 0);
  const cheapest = valid.length ? valid.reduce((a, b) => b.r.unitCost < a.r.unitCost ? b : a).id : null;
  const fastest = valid.length ? valid.reduce((a, b) => b.r.hours < a.r.hours ? b : a).id : null;
  const maxPrice = Math.max(...rows.map(x => x.r.unitPrice), 0.01);

  const baseReady = base.weightG > 0;

  return (
    <div className="card card-pad stack">
      <button className="cmp-toggle" onClick={() => setOpen(o => !o)}>
        <Icon name="columns" />
        <span className="grow" style={{ textAlign: 'left' }}>{t('compare_inline')}</span>
        {alts.length > 0 && <span className="tag accent">{alts.length + 1}</span>}
        <Icon name="chevron" className={'cmp-chev' + (open ? ' up' : '')} />
      </button>

      {open && (
        <div className="stack" style={{ gap: 12 }}>
          {!baseReady && <div className="muted" style={{ fontSize: 12.5 }}>{t('compare_hint')}</div>}
          <div className="cmp-rows">
            {rows.map((row, i) => {
              const isCheap = row.id === cheapest, isFast = row.id === fastest;
              const printer = store.printers.find(p => p.id === row.printerId);
              return (
                <div className={'cmp-line' + (isCheap ? ' win' : '') + (row.current ? ' current' : '')} key={row.id}>
                  <div className="cl-head">
                    {row.current
                      ? <span className="cl-tag">{t('current_setup')}</span>
                      : <span className="cl-tag alt">{t('setup_n')} {i + 1}</span>}
                    {!row.current && <button className="cl-rm" onClick={() => rmAlt(row.id)}><Icon name="x" /></button>}
                  </div>
                  <div className="cl-selects">
                    {row.current ? (
                      <span className="cl-fixed mono">{printer?.name} · {store.materials.find(m => m.id === row.materialId)?.name}</span>
                    ) : (
                      <>
                        <Select value={row.printerId} onChange={v => setAlt(row.id, { printerId: v })}>
                          {store.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Select value={row.materialId} onChange={v => setAlt(row.id, { materialId: v })}>
                          {store.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                      </>
                    )}
                  </div>
                  <div className="cl-metrics">
                    <div className="cl-price mono">{money(row.r.unitPrice)}<span className="cl-bar"><span style={{ width: (row.r.unitPrice / maxPrice * 100) + '%' }} /></span></div>
                    <div className="cl-sub mono">{t('cost')} {money(row.r.unitCost)} · {row.r.hours.toFixed(1)}h</div>
                    <div className="cl-badges">
                      {isCheap && <span className="cmp-badge cheap"><Icon name="coins" />{t('cheapest')}</span>}
                      {isFast && <span className="cmp-badge fast"><Icon name="bolt" />{t('fastest')}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {alts.length < 2 && (
            <button className="cmp-add-line" onClick={addAlt}><Icon name="plus" />{t('add_setup')}</button>
          )}
        </div>
      )}
    </div>
  );
}

window.CompareInline = CompareInline;
