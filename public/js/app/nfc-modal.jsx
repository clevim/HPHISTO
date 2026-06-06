/* Modal de geração de NFC/RFID para um filamento — multi-formato */

function NfcModal({ store, material, onClose }) {
  const t = store.t;
  const [data, setData] = useState(() => NFC.fromMaterial(material, store.settings));
  const set = (p) => setData(s => ({ ...s, ...p }));
  const [fmtId, setFmtId] = useState(store.settings.nfcFormat || 'ace');
  const [writeState, setWriteState] = useState('idle');
  const [writeMsg, setWriteMsg] = useState('');

  const formats = NFC.allFormats(store.settings.nfcFormats);
  const fmt = NFC.findFormat(fmtId, store.settings.nfcFormats);
  const out = NFC.buildOutput(fmt, data, material.name);
  const supported = NFC.nfcSupported();
  const isBinary = out.kind === 'binary';
  const colorHex = '#' + NFC.colorHex(data);

  const dl = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (window.FX) FX.cling(store.settings.soundOn);
  };
  const downloadFile = () => {
    if (isBinary) dl(new Blob([out.bytes], { type: 'application/octet-stream' }), `${data.sku || material.name}.bin`);
    else dl(new Blob([out.text], { type: 'application/json' }), `${material.name}.json`);
  };
  const copyOut = async () => {
    try { await navigator.clipboard.writeText(isBinary ? out.dump : out.text); setWriteMsg(t('copied')); setTimeout(() => setWriteMsg(''), 1500); } catch (e) {}
  };
  const writeNfc = async () => {
    if (!supported) return;
    setWriteState('scanning'); setWriteMsg(t('nfc_approach'));
    try {
      const writer = new NDEFReader();
      if (isBinary) await writer.write({ records: [{ recordType: 'mime', mediaType: 'application/octet-stream', data: out.bytes }] });
      else await writer.write({ records: [{ recordType: 'mime', mediaType: 'application/json', data: new TextEncoder().encode(out.text) }] });
      setWriteState('ok'); setWriteMsg(t('nfc_written'));
      if (window.FX) FX.cling(store.settings.soundOn);
    } catch (e) {
      setWriteState('err'); setWriteMsg((e && e.message) ? e.message : t('nfc_error'));
    }
  };
  const regenSku = () => set({ sku: NFC.generateSKU(data.material, data.colorCode) });
  const tempsFor = (k) => { const td = NFC.TEMP_DEFAULTS[k] || NFC.TEMP_DEFAULTS.PLA; return { extruder: { min: td.ext[0], max: td.ext[1] }, bed: { min: td.bed[0], max: td.bed[1] } }; };

  return (
    <Modal title={t('nfc_title') + ' — ' + material.name} onClose={onClose}
      footer={<>
        <Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="ghost" icon="copy" onClick={copyOut}>{isBinary ? t('copy_hex') : 'JSON'}</Button>
        <Button variant="ghost" icon="download2" onClick={downloadFile}>{isBinary ? '.bin' : '.json'}</Button>
        <Button variant="primary" icon="nfc" onClick={writeNfc} disabled={!supported}>{t('nfc_write')}</Button>
      </>}>

      <Field label={t('nfc_format')} hint={fmt.builtin ? null : t('nfc_custom')}>
        <Select value={fmtId} onChange={setFmtId}>
          {formats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      </Field>

      <div className="nfc-card">
        <div className="nfc-chip"><Icon name="nfc" /></div>
        <div className="nfc-card-main">
          <div className="nfc-sku mono">{data.sku}<button onClick={regenSku} title={t('nfc_regen')}><Icon name="history" /></button></div>
          <div className="nfc-card-meta mono">{data.brand} · {data.material} · ⌀{(data.diameter / 100).toFixed(2)}mm</div>
        </div>
        <span className="nfc-swatch" style={{ background: colorHex }} />
      </div>

      <div className="nfc-fields">
        <Field label={t('brand')} hint={t('nfc_brand_hint')}><TextInput value={data.brand} onChange={v => set({ brand: String(v).toUpperCase().slice(0, 4) })} /></Field>
        <Field label={t('mat_type')}>
          <Select value={data.material} onChange={v => set({ material: v, ...tempsFor(v) })}>
            {Object.keys(NFC.MAT_SKU).map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
        </Field>
        <Field label={t('nfc_ext_temp')}>
          <div className="flex" style={{ gap: 8 }}>
            <NumberInput value={data.extruder.min} step={5} onChange={v => set({ extruder: { ...data.extruder, min: v } })} affix="°C" />
            <NumberInput value={data.extruder.max} step={5} onChange={v => set({ extruder: { ...data.extruder, max: v } })} affix="°C" />
          </div>
        </Field>
        <Field label={t('nfc_bed_temp')}>
          <div className="flex" style={{ gap: 8 }}>
            <NumberInput value={data.bed.min} step={5} onChange={v => set({ bed: { ...data.bed, min: v } })} affix="°C" />
            <NumberInput value={data.bed.max} step={5} onChange={v => set({ bed: { ...data.bed, max: v } })} affix="°C" />
          </div>
        </Field>
        <Field label={t('spool') + ' (g)'}><NumberInput value={data.weight} step={50} onChange={v => set({ weight: v })} affix="g" /></Field>
        <Field label={t('nfc_length')}><NumberInput value={data.totalLength} step={10} onChange={v => set({ totalLength: v, remainingLength: v })} affix="m" /></Field>
      </div>

      {fmt.id === 'ace' && <div className="nfc-note mono"><Icon name="alert" /><span>{t('nfc_note')}</span></div>}

      <details className="nfc-dump">
        <summary>{isBinary ? t('nfc_dump') + ' · NTAG · ACE v2' : t('nfc_payload') + ' · NDEF JSON'}</summary>
        {isBinary ? (
          <div className="nfc-pages">
            {out.rows.map(r => (
              <div className="nfc-pg" key={r.page}>
                <span className="pg-n mono">P{String(r.page).padStart(2, '0')}</span>
                <span className="pg-hex mono">{r.hex}</span>
                <span className="pg-ascii mono">{r.ascii}</span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="nfc-json mono">{out.error ? '⚠ ' + out.error + '\n' + out.text : out.text}</pre>
        )}
      </details>

      <div className={'nfc-status s-' + writeState}>
        {!supported && <span className="muted mono" style={{ fontSize: 11 }}><Icon name="alert" style={{ width: 13, height: 13 }} /> {t('nfc_unsupported')}</span>}
        {supported && writeState === 'idle' && <span className="muted mono" style={{ fontSize: 11 }}>{t('nfc_ready')}</span>}
        {writeMsg && writeState !== 'idle' && <span className="mono" style={{ fontSize: 11 }}>{writeMsg}</span>}
        {writeMsg && writeState === 'idle' && <span className="mono" style={{ fontSize: 11, color: 'var(--good)' }}>{writeMsg}</span>}
      </div>
    </Modal>
  );
}

window.NfcModal = NfcModal;
