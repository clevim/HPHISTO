/* Seção de custos detalhados — mão de obra, modelagem, overhead, consumíveis, embalagem, frete */

function DetailedSection({ store, input, set }) {
  const t = store.t;
  const cur = store.curSymbol();

  const addConsumable = (preset) => {
    const c = preset || { label: '', cost: '' };
    set({ consumables: [...input.consumables, { id: APP_DATA.uid('c_'), label: c.label, cost: c.cost }] });
  };
  const updateConsumable = (id, patch) =>
    set({ consumables: input.consumables.map(c => c.id === id ? { ...c, ...patch } : c) });
  const removeConsumable = (id) =>
    set({ consumables: input.consumables.filter(c => c.id !== id) });

  return (
    <div className="card card-pad stack">
      <SectionLabel>{t('addons')}</SectionLabel>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label={t('labor')} hint={`${cur}${store.settings.laborRate}/h`}>
          <NumberInput value={input.laborHours} step={0.5} onChange={v => set({ laborHours: v })} affix={t('hours')} />
        </Field>
        <Field label={t('modeling')}>
          <NumberInput value={input.modelingFee} step={1} onChange={v => set({ modelingFee: v })} affixLeft={cur} />
        </Field>
        <Field label={t('packaging')}>
          <NumberInput value={input.packaging} step={0.5} onChange={v => set({ packaging: v })} affixLeft={cur} />
        </Field>
        <Field label={t('shipping')} hint={t('total_for') + ' pedido'}>
          <NumberInput value={input.shipping} step={1} onChange={v => set({ shipping: v })} affixLeft={cur} />
        </Field>
      </div>

      {store.settings.monthlyOverhead > 0 && (
        <Switch on={input.useOverhead} onChange={v => set({ useOverhead: v })}
          label={`${t('overhead')} (${store.money(store.settings.monthlyOverhead)}/mês)`} />
      )}

      {/* Consumíveis */}
      <div className="divider" style={{ margin: '4px 0' }} />
      <div className="flex between">
        <span className="card-title-mono">{t('consumables')}</span>
        <span className="muted mono" style={{ fontSize: 11 }}>
          {store.money(input.consumables.reduce((a, c) => a + (Number(c.cost) || 0), 0))}
        </span>
      </div>

      {input.consumables.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          {input.consumables.map(c => (
            <div className="flex" key={c.id} style={{ gap: 8 }}>
              <div className="control grow">
                <input value={c.label} placeholder="Consumível" onChange={e => updateConsumable(c.id, { label: e.target.value })} />
              </div>
              <div style={{ width: 130 }}>
                <NumberInput value={c.cost} step={0.1} onChange={v => updateConsumable(c.id, { cost: v })} affixLeft={cur} />
              </div>
              <Button variant="danger" className="btn btn-danger btn-icon" onClick={() => removeConsumable(c.id)}><Icon name="x" /></Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {APP_DATA.CONSUMABLE_PRESETS.map(p => (
          <button key={p.label} className="tag" onClick={() => addConsumable(p)} style={{ cursor: 'pointer' }}>
            <Icon name="plus" style={{ width: 12, height: 12 }} /> {p.label}
          </button>
        ))}
        <button className="tag accent" onClick={() => addConsumable()} style={{ cursor: 'pointer' }}>
          <Icon name="plus" style={{ width: 12, height: 12 }} /> {t('add_consumable')}
        </button>
      </div>
    </div>
  );
}

window.DetailedSection = DetailedSection;
