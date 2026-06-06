/* Tela Calculadora — modo simples + detalhado, readout de preço ao vivo */

function ReadoutPanel({ result, store, input, onSave, onExport, onSaveProduct }) {
  const t = store.t;
  const s = store.settings;
  const lineLabel = (key) => key === 'material_cost' ? t('material_cost') : t(key);
  const material = store.materials.find(m => m.id === input.materialId);

  // preço a partir de uma margem (espelha CALC.compute)
  const fee = Number(input.cardFeePct) || 0;
  const priceFrom = (margin) => {
    let p = result.unitCost * (1 + (margin || 0) / 100);
    if (fee > 0 && fee < 100) p = p / (1 - fee / 100);
    return p;
  };
  const tiers = [
    { key: 'tier_retail', m: s.tierRetail },
    { key: 'tier_wholesale', m: s.tierWholesale },
    { key: 'tier_reseller', m: s.tierReseller },
  ];
  // termômetro de forja: 0–300% margem → 0–100% "temperatura"
  const heat = Math.max(0, Math.min(1, (result.margin || 0) / 250));

  return (
    <div className="stack readout-col">
      <BuildChamber result={result} store={store} input={input} material={material} />

      {s.forgeBar && result.unitCost > 0 && (
        <div className="forge-bar" title={t('forge_temp')}>
          <div className="forge-track">
            <div className="forge-fill" style={{ width: (10 + heat * 90) + '%' }} />
            <div className="forge-tip" style={{ left: (10 + heat * 90) + '%' }}><Icon name="flame" /></div>
          </div>
          <div className="forge-meta mono">
            <span>{t('margin')} {result.margin}%</span>
            <span>{t('profit')} {store.money(result.unitProfit)}</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <Icon name="coins" className="ico" />
          <h3>{t('breakdown')}</h3>
          <div className="spacer" />
          <span className="card-title-mono">{result.weight.toFixed(1)}g · {result.hours.toFixed(2)}h</span>
        </div>
        <div className="card-pad">
          {result.lines.length === 0 && <div className="muted" style={{ fontSize: 13 }}>{t('empty_calc')}</div>}
          <div className="brk">
            {result.lines.map(l => (
              <div className="brk-row" key={l.key}>
                <span className="bk-label" style={{ minWidth: 120 }}>
                  <span className="bk-dot" style={{ background: l.color }} />
                  {lineLabel(l.key)}
                </span>
                <span className="bk-bar-wrap"><span className="bk-bar" style={{ width: (l.value / Math.max(...result.lines.map(x => x.value), 0.0001) * 100) + '%', background: l.color }} /></span>
                <span className="bk-val">{store.money(l.value)}</span>
              </div>
            ))}
          </div>
          <div className="brk-total">
            <span className="t-label">{t('total_cost')}{result.qty > 1 ? ` (1×)` : ''}</span>
            <span className="t-val">{store.money(result.unitCost)}</span>
          </div>
          {result.qty > 1 && (
            <div className="brk-total" style={{ borderTop: 'none', paddingTop: 4 }}>
              <span className="t-label" style={{ color: 'var(--accent)' }}>{t('total_for')} {result.qty}×</span>
              <span className="t-val" style={{ color: 'var(--accent)' }}>{store.money(result.totalPrice)}</span>
            </div>
          )}
        </div>
      </div>

      {result.unitCost > 0 && (
        <div className="card">
          <div className="card-head">
            <Icon name="tag" className="ico" />
            <h3>{t('tiers_title')}</h3>
          </div>
          <div className="tiers">
            {tiers.map(tr => (
              <div className="tier-row" key={tr.key}>
                <span className="tier-name">{t(tr.key)}</span>
                <span className="tier-margin mono">{tr.m}%</span>
                <span className="tier-price mono">{store.money(priceFrom(tr.m))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex" style={{ gap: 8 }}>
        <Button variant="ghost" icon="history" onClick={onSave} style={{ flex: 1 }}>{t('save_quote')}</Button>
        <Button variant="primary" icon="doc" onClick={onExport} style={{ flex: 1 }}>{t('export_pdf')}</Button>
      </div>
      <Button variant="subtle" icon="box" onClick={onSaveProduct} style={{ justifyContent: 'center' }}>{t('save_to_catalog')}</Button>
    </div>
  );
}

function GcodeDrop({ store, onParsed, fileName, onClear }) {
  const t = store.t;
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handle = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = CALC.parseGcode(text);
      let geo = null;
      try { geo = CALC.parseGcodeGeo(text); } catch (err) { geo = null; }
      onParsed(parsed, file.name, geo);
    };
    reader.readAsText(file);
  };

  if (fileName) {
    return (
      <div className="dropzone" style={{ borderStyle: 'solid', borderColor: 'var(--good)' }}>
        <div className="dz-ico" style={{ color: 'var(--good)' }}><Icon name="check" /></div>
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t('gcode_loaded')}</div>
          <div className="muted mono" style={{ fontSize: 11.5 }}>{fileName}</div>
        </div>
        <Button variant="subtle" size="sm" onClick={onClear}>{t('gcode_clear')}</Button>
      </div>
    );
  }
  return (
    <div className={'dropzone' + (drag ? ' drag' : '')}
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}>
      <div className="dz-ico"><Icon name="upload" /></div>
      <div className="grow">
        <div style={{ fontWeight: 600, fontSize: 14 }}>{t('gcode_drop')}</div>
        <div className="muted" style={{ fontSize: 12 }}>{t('gcode_hint')}</div>
      </div>
      <input ref={inputRef} type="file" accept=".gcode,.gco,.g,.nc,text/plain" style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])} />
    </div>
  );
}

function CalculatorScreen({ initial, onNavigate }) {
  const store = useStore();
  const t = store.t;
  const [mode, setMode] = useState('simple');

  const defaultInput = () => ({
    name: '', quantity: 1,
    printerId: store.printers[0]?.id, materialId: store.materials[0]?.id,
    inputMode: 'weight', weightG: '', lengthM: '',
    timeHours: '', timeMinutes: '',
    gcodeName: null, gcodeGeo: null,
    laborHours: '', modelingFee: '', packaging: '', shipping: '',
    useOverhead: true,
    consumables: [],
    margin: store.settings.defaultMargin, cardFeePct: store.settings.cardFeePct,
    notes: '', client: '', clientId: '', status: 'draft',
  });

  const [input, setInput] = useState(initial || defaultInput);
  useEffect(() => { if (initial) { setInput(initial); setMode('detailed'); } }, [initial]);

  const set = (patch) => setInput(s => ({ ...s, ...patch }));

  const printer = store.printers.find(p => p.id === input.printerId);
  const material = store.materials.find(m => m.id === input.materialId);

  // overhead via settings, only when enabled
  const effSettings = { ...store.settings, monthlyOverhead: input.useOverhead ? store.settings.monthlyOverhead : 0 };
  const calcInput = {
    ...input,
    quantity: Number(input.quantity) || 1,
    weightG: Number(input.weightG) || 0, lengthM: Number(input.lengthM) || 0,
    timeHours: Number(input.timeHours) || 0, timeMinutes: Number(input.timeMinutes) || 0,
    laborHours: mode === 'detailed' ? (Number(input.laborHours) || 0) : 0,
    modelingFee: mode === 'detailed' ? (Number(input.modelingFee) || 0) : 0,
    packaging: mode === 'detailed' ? (Number(input.packaging) || 0) : 0,
    shipping: mode === 'detailed' ? (Number(input.shipping) || 0) : 0,
    consumables: mode === 'detailed' ? input.consumables : [],
    margin: Number(input.margin) || 0, cardFeePct: Number(input.cardFeePct) || 0,
  };
  const result = CALC.compute(calcInput, printer, material, effSettings);

  // peso estimado quando entra por comprimento
  const estWeight = input.inputMode === 'length' && material
    ? CALC.weightFromLength(Number(input.lengthM) || 0, material) : null;

  // checagem de estoque do filamento
  const neededG = (result.weight || 0) * (Number(input.quantity) || 1);
  const matTotal = material ? (material.spoolWeight || 1000) * (material.spools || 1) : 0;
  const matRemaining = material ? (material.remainingG != null ? material.remainingG : matTotal) : 0;
  const stockShort = material && neededG > 0 && neededG > matRemaining;

  const onGcode = (parsed, name, geo) => {
    const patch = { inputMode: 'weight', gcodeName: name, gcodeGeo: geo || null };
    if (parsed.weightG != null) patch.weightG = +parsed.weightG.toFixed(2);
    else if (parsed.lengthM != null && material) { patch.weightG = +CALC.weightFromLength(parsed.lengthM, material).toFixed(2); }
    if (parsed.timeHours != null) patch.timeHours = parsed.timeHours;
    if (parsed.timeMinutes != null) patch.timeMinutes = parsed.timeMinutes;
    set(patch);
  };

  const save = () => {
    if (!printer || !material) return;
    store.saveQuote({
      input: { ...input, _mode: mode }, result,
      printerName: printer.name, materialName: material.name,
      currency: store.settings.currency,
      name: input.name || t('piece'),
      clientId: input.clientId || null,
      status: input.status || 'draft',
    });
    if (window.FX) FX.cling(store.settings.soundOn);
    onNavigate && onNavigate('history', { flash: true });
  };

  const saveProduct = () => {
    if (!printer || !material) return;
    store.addProduct({
      name: input.name || t('piece'),
      color: material.color || 'var(--accent)',
      input: { ...input, _mode: mode },
      unitCost: result.unitCost, unitPrice: result.unitPrice,
      weight: result.weight, hours: result.hours,
      materialName: material.name, printerName: printer.name,
    });
    if (window.FX) FX.cling(store.settings.soundOn);
    onNavigate && onNavigate('catalog', { flash: true });
  };

  const exportPdf = () => {
    if (!printer || !material) return;
    onNavigate && onNavigate('quote', {
      quote: { input: { ...input, _mode: mode }, result, printerName: printer.name, materialName: material.name, name: input.name || t('piece'), savedAt: Date.now() }
    });
  };

  if (store.printers.length === 0 || store.materials.length === 0) {
    return (
      <div className="page">
        <div className="empty">
          <Icon name={store.printers.length === 0 ? 'printer' : 'layers'} />
          <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{store.printers.length === 0 ? t('no_printer') : t('no_material')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="grid grid-calc">
        <div className="stack" style={{ gap: 18 }}>
          {/* PEÇA */}
          <div className="card card-pad stack">
            <div className="flex between">
              <SectionLabel>{t('piece')}</SectionLabel>
              <Segmented value={mode} onChange={setMode} options={[
                { value: 'simple', label: t('mode_simple') }, { value: 'detailed', label: t('mode_detailed') }]} />
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <Field label={t('piece_name')}>
                <TextInput value={input.name} onChange={v => set({ name: v })} placeholder="Ex: Vaso geométrico" />
              </Field>
              <Field label={t('quantity')}>
                <NumberInput value={input.quantity} min={1} step={1} onChange={v => set({ quantity: v })} affix="un" />
              </Field>
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <Field label={t('printer')}>
                <Select value={input.printerId} onChange={v => set({ printerId: v })}>
                  {store.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label={t('material')}>
                <Select value={input.materialId} onChange={v => set({ materialId: v })}>
                  {store.materials.map(m => <option key={m.id} value={m.id}>{m.name} — {store.money(m.pricePerKg)}/kg</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <Field label={t('client')}>
                <Select value={input.clientId || ''} onChange={v => set({ clientId: v })}>
                  <option value="">{t('no_client')}</option>
                  {(store.clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label={t('quote_status')}>
                <Segmented value={input.status || 'draft'} onChange={v => set({ status: v })} options={[
                  { value: 'draft', label: t('st_quote_draft') }, { value: 'sent', label: t('st_quote_sent') }, { value: 'approved', label: t('st_quote_approved') }]} />
              </Field>
            </div>
          </div>
          <div className="card card-pad stack">
            <SectionLabel>{t('filament')} · {t('print_time')}</SectionLabel>
            <Segmented value={input.inputMode} onChange={v => set({ inputMode: v, gcodeName: null })} options={[
              { value: 'weight', label: t('by_weight') }, { value: 'length', label: t('by_length') }, { value: 'gcode', label: t('by_gcode') }]} />

            {input.inputMode === 'gcode' ? (
              <GcodeDrop store={store} fileName={input.gcodeName} onParsed={onGcode} onClear={() => set({ gcodeName: null, gcodeGeo: null, weightG: '', timeHours: '', timeMinutes: '' })} />
            ) : null}

            <div className="grid grid-2" style={{ gap: 14 }}>
              {input.inputMode === 'length' ? (
                <Field label={t('length')} hint={estWeight ? `≈ ${estWeight.toFixed(1)} g` : null}>
                  <NumberInput value={input.lengthM} step={0.1} onChange={v => set({ lengthM: v })} affix="m" />
                </Field>
              ) : (
                <Field label={t('weight')}>
                  <NumberInput value={input.weightG} step={0.1} onChange={v => set({ weightG: v })} affix="g" />
                </Field>
              )}
              <Field label={t('print_time')}>
                <div className="flex" style={{ gap: 8 }}>
                  <NumberInput value={input.timeHours} min={0} step={1} onChange={v => set({ timeHours: v })} affix={t('hours')} />
                  <NumberInput value={input.timeMinutes} min={0} step={1} onChange={v => set({ timeMinutes: v })} affix={t('minutes')} />
                </div>
              </Field>
            </div>

            {stockShort && (
              <div className="stock-alert">
                <span className="sa-bar"><span className="sa-fill" style={{ width: Math.min(100, matRemaining / neededG * 100) + '%' }} /></span>
                <Icon name="bolt" />
                <span><b>{t('stock_warn')}</b> · {material.name} {t('stock_need')} {neededG.toFixed(0)}g · {t('stock_have')} {matRemaining.toFixed(0)}g</span>
              </div>
            )}
          </div>

          {/* DETALHADO */}
          {mode === 'detailed' && (
            <DetailedSection store={store} input={input} set={set} />
          )}

          {/* PREÇO */}
          <div className="card card-pad stack">
            <SectionLabel>{t('price_block')}</SectionLabel>
            <div className="calc-knob-row">
              <Knob value={Number(input.margin) || 0} min={0} max={300} step={5} unit=""
                onChange={v => set({ margin: v })} format={(x) => x + '%'} size={130} label={t('margin')} />
              <div className="ck-fields">
                <div className="sell-eq">
                  <div className="se-row"><span>{t('cost')}</span><b className="mono">{store.money(result.unitCost)}</b></div>
                  <div className="se-op">+</div>
                  <div className="se-row"><span>{t('profit')} · {result.margin}%</span><b className="mono" style={{ color: 'var(--good)' }}>{store.money(result.unitProfit)}</b></div>
                  <div className="se-rule" />
                  <div className="se-row se-total"><span>{t('unit_price')}</span><b className="mono">{store.money(result.unitPrice)}</b></div>
                </div>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {[50, 80, 100, 150, 200].map(p => (
                    <button key={p} className={'tag' + (Number(input.margin) === p ? ' accent' : '')} style={{ cursor: 'pointer' }} onClick={() => set({ margin: p })}>{p}%</button>
                  ))}
                </div>
                <Field label={t('card_fee')} hint={t('per_piece')}>
                  <NumberInput value={input.cardFeePct} step={1} onChange={v => set({ cardFeePct: v })} affix="%" />
                </Field>
              </div>
            </div>
          </div>

          {/* COMPARADOR inline */}
          <CompareInline store={store} base={{
            weightG: result.weight || 0,
            timeHours: Number(input.timeHours) || 0, timeMinutes: Number(input.timeMinutes) || 0,
            quantity: Number(input.quantity) || 1, margin: Number(input.margin) || 0,
            cardFeePct: Number(input.cardFeePct) || 0,
            printerId: input.printerId, materialId: input.materialId,
          }} />
        </div>

        <ReadoutPanel result={result} store={store} input={input} onSave={save} onExport={exportPdf} onSaveProduct={saveProduct} />
      </div>
    </div>
  );
}

window.CalculatorScreen = CalculatorScreen;
