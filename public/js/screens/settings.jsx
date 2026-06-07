/* Ajustes do aplicativo — aparência, precificação, backup, NFC */

function DeckPanel({ icon, title, code, children }) {
  return (
    <div className="deck">
      <span className="screw tl" /><span className="screw tr" /><span className="screw bl" /><span className="screw br" />
      <div className="deck-head"><Icon name={icon} className="ico" /><h3>{title}</h3>{code && <span className="code">{code}</span>}</div>
      <div className="deck-body">{children}</div>
    </div>
  );
}

function ReadoutField({ label, hint, children }) {
  return (
    <div className="readout-field">
      <label>{label}{hint && <span className="rf-hint">{hint}</span>}</label>
      <div className="rf-control">{children}</div>
    </div>
  );
}

function OperatorCard({ store }) {
  const s = store.settings;
  const en = s.lang === 'en';
  const name = (s.contactName || '').trim() || (en ? 'Operator' : 'Operador');
  const initials = (name.split(/\s+/).slice(0, 2).map(w => w[0]).join('') || 'OP').toUpperCase();
  const handle = s.contactWhats ? ('@' + String(s.contactWhats).replace(/[^0-9]/g, '').slice(-6)) : '@hosto-forja';
  const since = s.createdYear || new Date().getFullYear();
  const opId = String((initials.charCodeAt(0) || 72) * 137 % 9000 + 1000);

  const logout = async () => {
    if (!confirm(en ? 'End session and return to login?' : 'Encerrar sessão e voltar ao login?')) return;
    if (window.FX) FX.cling(s.soundOn);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    window.location.replace('Login.html');
  };

  return (
    <div className="op-card">
      <span className="op-mag" />
      <div className="op-avatar"><span>{initials}</span></div>
      <div className="op-id">
        <div className="op-name">{name}</div>
        <div className="op-handle mono">{handle}</div>
        <div className="op-tags">
          <span className="op-role">{en ? 'CHIEF OPERATOR' : 'OPERADOR-CHEFE'}</span>
          <span className="op-session"><i />{en ? 'ACTIVE SESSION' : 'SESSÃO ATIVA'}</span>
        </div>
      </div>
      <div className="op-meta mono">
        <span>ID #{opId}</span>
        <span>{en ? 'SINCE' : 'DESDE'} {since}</span>
        <span className="op-barcode" aria-hidden="true" />
      </div>
      <button className="op-logout" onClick={logout} title={en ? 'Log out' : 'Sair'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        <span>{en ? 'Log out' : 'Sair'}</span>
      </button>
    </div>
  );
}

function NfcFormatModal({ store, editing, example, onClose }) {
  const t = store.t;
  const tplDefault = '{\n  "type": "{material}",\n  "color": "#{colorHex}",\n  "brand": "{brand}",\n  "min_temp": {extMin},\n  "max_temp": {extMax},\n  "diameter": {diameter},\n  "weight_g": {weightG}\n}';
  const tplExample = '{\n  "name": "{name}",\n  "sku": "{sku}",\n  "material": "{material}",\n  "color_hex": "{colorHex}",\n  "color_rgb": [{colorR}, {colorG}, {colorB}],\n  "extruder": [{extMin}, {extMax}],\n  "bed": [{bedMin}, {bedMax}],\n  "diameter_mm": {diameter},\n  "weight_g": {weightG},\n  "length_m": {lengthM}\n}';
  const [f, setF] = useState(editing || { name: '', template: tplDefault });
  const set = (p) => setF(s => ({ ...s, ...p }));
  const save = () => { if (editing) store.updateNfcFormat(editing.id, f); else store.addNfcFormat(f); onClose(); };

  if (example) {
    return (
      <Modal title={t('nfc_example')} onClose={onClose}
        footer={<>
          <Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" icon="plus" onClick={() => { store.addNfcFormat({ name: 'OpenSpool custom', template: tplExample }); onClose(); }}>{t('nfc_add_fmt')}</Button>
        </>}>
        <div className="nfc-note mono"><Icon name="alert" /><span>{t('nfc_placeholders')}: {NFC.PLACEHOLDERS.map(p => '{' + p + '}').join('  ')}</span></div>
        <Field label={t('nfc_template') + ' (JSON)'}>
          <pre className="nfc-json mono" style={{ maxHeight: 320 }}>{tplExample}</pre>
        </Field>
      </Modal>
    );
  }

  return (
    <Modal title={editing ? t('edit') : t('nfc_add_fmt')} onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={!f.name || !f.template}>{t('save')}</Button></>}>
      <Field label={t('nfc_fmt_name')}><TextInput value={f.name} onChange={v => set({ name: v })} placeholder="Ex: Bambu / OpenSpool custom" /></Field>
      <Field label={t('nfc_template')} hint="JSON">
        <textarea className="nfc-tpl mono" value={f.template} onChange={e => set({ template: e.target.value })} rows={9} />
      </Field>
      <div className="nfc-ph">
        <span className="card-title-mono">{t('nfc_placeholders')}</span>
        <div className="nfc-ph-list">
          {NFC.PLACEHOLDERS.map(p => (
            <button key={p} className="tag" onClick={() => set({ template: (f.template || '') + '{' + p + '}' })}>{'{' + p + '}'}</button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function SettingsScreen() {
  const store = useStore();
  const t = store.t;
  const s = store.settings;
  const up = store.updateSettings;
  const [fmtModal, setFmtModal] = useState(null);
  const [flash, setFlash] = useState('');
  const [backupFlash, setBackupFlash] = useState('');

  const exportBackup = () => {
    const json = store.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url; a.download = `hfsto-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (window.FX) FX.cling(store.settings.soundOn);
  };

  const importBackup = (mode) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = store.importData(e.target.result, mode);
        setBackupFlash(res.ok ? t('backup_ok') : t('backup_err'));
        setTimeout(() => setBackupFlash(''), 2500);
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  const wipeAll = () => {
    if (!confirm(t('wipe_confirm'))) return;
    try { localStorage.removeItem('calc3d_v1'); } catch (e) {}
    location.reload();
  };

  const importFmt = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result);
          if (obj.template && obj.name) { store.addNfcFormat({ name: obj.name, template: obj.template }); setFlash(t('nfc_imported')); }
          else { store.addNfcFormat({ name: file.name.replace(/\.json$/i, ''), template: JSON.stringify(obj, null, 2) }); setFlash(t('nfc_imported')); }
          setTimeout(() => setFlash(''), 2000);
        } catch (err) { setFlash(t('nfc_import_err')); setTimeout(() => setFlash(''), 2000); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  return (
    <div className="page page-narrow stack" style={{ gap: 18 }}>
      <OperatorCard store={store} />
      <DeckPanel icon="settings" title={t('sec_business')} code="CFG·01">
        <div className="readout-field">
          <label>{t('language')}</label>
          <div className="seg-phys">
            <button className={s.lang === 'pt' ? 'on' : ''} onClick={() => up({ lang: 'pt' })}>PT</button>
            <button className={s.lang === 'en' ? 'on' : ''} onClick={() => up({ lang: 'en' })}>EN</button>
          </div>
        </div>
        <div className="readout-field">
          <label>{t('currency')}</label>
          <div className="seg-phys">
            {Object.keys(I18N.CURRENCIES).map(c => (
              <button key={c} className={s.currency === c ? 'on' : ''} onClick={() => up({ currency: c })}>{I18N.CURRENCIES[c].symbol}</button>
            ))}
          </div>
        </div>
      </DeckPanel>

      <DeckPanel icon="cube" title={t('sec_appearance')} code="CFG·02">
        <div className="readout-field" style={{ alignItems: 'flex-start' }}>
          <label>{t('main_color')}</label>
          <div className="accent-picker">
            {APP_DATA.ACCENT_SWATCHES.map(sw => (
              <button key={sw.hex} className={'accent-sw' + (String(s.accent).toLowerCase() === sw.hex.toLowerCase() ? ' on' : '')}
                style={{ '--sw': sw.hex }} title={sw.name} onClick={() => up({ accent: sw.hex })}>
                {String(s.accent).toLowerCase() === sw.hex.toLowerCase() && <Icon name="check" />}
              </button>
            ))}
            <label className="accent-custom" title={t('custom_color')}>
              <input type="color" value={s.accent} onChange={e => up({ accent: e.target.value })} />
              <Icon name="edit" />
            </label>
          </div>
        </div>
        <div className="readout-field">
          <label>{t('theme')}</label>
          <div className="seg-phys">
            <button className={s.theme === 'console' ? 'on' : ''} onClick={() => up({ theme: 'console' })}>{t('theme_console')}</button>
            <button className={s.theme === 'blueprint' ? 'on' : ''} onClick={() => up({ theme: 'blueprint' })}>{t('theme_blueprint')}</button>
            <button className={s.theme === 'paper' ? 'on' : ''} onClick={() => up({ theme: 'paper' })}>{t('theme_paper')}</button>
          </div>
        </div>
        <div className="accent-preview">
          <span className="ap-chip" style={{ background: 'var(--accent)' }} />
          <span className="ap-chip soft" style={{ background: 'var(--accent-wash)' }} />
          <span className="ap-bar"><span style={{ width: '64%' }} /></span>
          <span className="ap-tag">{t('preview')}</span>
        </div>
      </DeckPanel>

      <DeckPanel icon="coins" title={t('sec_pricing')} code="CFG·03">
        <div className="flex" style={{ gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
          <Knob value={Number(s.defaultMargin) || 0} min={0} max={300} step={5} size={136}
            unit="" label={t('default_margin')} format={(x) => x + '%'} onChange={v => up({ defaultMargin: v })} />
          <div className="grow" style={{ minWidth: 200 }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>{t('pricing_hint')}</div>
            <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 14 }}>
              {[50, 80, 100, 150, 200].map(p => (
                <button key={p} className={'tag' + (Number(s.defaultMargin) === p ? ' accent' : '')} style={{ cursor: 'pointer' }} onClick={() => up({ defaultMargin: p })}>{p}%</button>
              ))}
            </div>
            <ReadoutField label={t('card_fee')}>
              <NumberInput value={s.cardFeePct} step={1} onChange={v => up({ cardFeePct: v })} affix="%" />
            </ReadoutField>
          </div>
        </div>
      </DeckPanel>

      <DeckPanel icon="bolt" title={t('sec_costs')} code="CFG·04">
        <ReadoutField label={t('energy_tariff')}><NumberInput value={s.energyTariff} step={0.05} onChange={v => up({ energyTariff: v })} affixLeft={store.curSymbol()} affix="/kWh" /></ReadoutField>
        <ReadoutField label={t('labor_rate')}><NumberInput value={s.laborRate} step={5} onChange={v => up({ laborRate: v })} affixLeft={store.curSymbol()} affix="/h" /></ReadoutField>
        <ReadoutField label={t('finishing_pct')} hint={t('show_advanced')}><NumberInput value={s.finishingPct} step={1} onChange={v => up({ finishingPct: v })} affix="%" /></ReadoutField>
        <ReadoutField label={t('monthly_overhead')}><NumberInput value={s.monthlyOverhead} step={50} onChange={v => up({ monthlyOverhead: v })} affixLeft={store.curSymbol()} /></ReadoutField>
        {s.monthlyOverhead > 0 && <ReadoutField label={t('overhead_hours')}><NumberInput value={s.overheadHoursMonth} step={10} onChange={v => up({ overheadHoursMonth: v })} affix="h" /></ReadoutField>}
      </DeckPanel>

      <DeckPanel icon="tag" title={t('sec_tiers')} code="CFG·05">
        <ReadoutField label={t('tier_retail')}><NumberInput value={s.tierRetail} step={5} onChange={v => up({ tierRetail: v })} affix="%" /></ReadoutField>
        <ReadoutField label={t('tier_wholesale')}><NumberInput value={s.tierWholesale} step={5} onChange={v => up({ tierWholesale: v })} affix="%" /></ReadoutField>
        <ReadoutField label={t('tier_reseller')}><NumberInput value={s.tierReseller} step={5} onChange={v => up({ tierReseller: v })} affix="%" /></ReadoutField>
      </DeckPanel>

      <DeckPanel icon="doc" title={t('sec_contact')} code="CFG·06">
        <ReadoutField label={t('contact_name')}><TextInput value={s.contactName} onChange={v => up({ contactName: v })} placeholder="Ex: Studio Forja 3D" /></ReadoutField>
        <ReadoutField label={t('contact_whats')}><TextInput value={s.contactWhats} onChange={v => up({ contactWhats: String(v).replace(/[^0-9]/g, '') })} placeholder="5511999999999" /></ReadoutField>
      </DeckPanel>

      <DeckPanel icon="volume" title={t('sec_sound')} code="CFG·07">
        <div className="readout-field">
          <label>{t('sound_on')}</label>
          <div className="seg-phys">
            <button className={s.soundOn ? 'on' : ''} onClick={() => { up({ soundOn: true }); if (window.FX) FX.cling(true); }}>ON</button>
            <button className={!s.soundOn ? 'on' : ''} onClick={() => up({ soundOn: false })}>OFF</button>
          </div>
        </div>
        <div className="readout-field">
          <label>{t('forge_bar_s')}</label>
          <div className="seg-phys">
            <button className={s.forgeBar ? 'on' : ''} onClick={() => up({ forgeBar: true })}>ON</button>
            <button className={!s.forgeBar ? 'on' : ''} onClick={() => up({ forgeBar: false })}>OFF</button>
          </div>
        </div>
      </DeckPanel>

      <DeckPanel icon="nfc" title={t('sec_nfc')} code="CFG·08">
        <div className="readout-field">
          <label>{t('nfc_enabled')}</label>
          <div className="seg-phys">
            <button className={s.nfcEnabled !== false ? 'on' : ''} onClick={() => up({ nfcEnabled: true })}>ON</button>
            <button className={s.nfcEnabled === false ? 'on' : ''} onClick={() => up({ nfcEnabled: false })}>OFF</button>
          </div>
        </div>
        {s.nfcEnabled !== false && <>
          <ReadoutField label={t('nfc_default_fmt')}>
            <Select value={s.nfcFormat || 'ace'} onChange={v => up({ nfcFormat: v })}>
              {NFC.allFormats(s.nfcFormats).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </ReadoutField>
          <div className="nfc-fmt-list">
            {(s.nfcFormats || []).length === 0 && <div className="muted mono" style={{ fontSize: 11 }}>{t('nfc_no_custom')}</div>}
            {(s.nfcFormats || []).map(f => (
              <div className="nfc-fmt-row" key={f.id}>
                <Icon name="nfc" />
                <span className="grow">{f.name}</span>
                <button onClick={() => setFmtModal(f)} title={t('edit')}><Icon name="edit" /></button>
                <button className="danger" onClick={() => { if (confirm(t('confirm_del'))) store.removeNfcFormat(f.id); }} title={t('remove')}><Icon name="trash" /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Button variant="ghost" icon="plus" onClick={() => setFmtModal('new')}>{t('nfc_add_fmt')}</Button>
            <Button variant="ghost" icon="upload" onClick={importFmt}>{t('nfc_import_fmt')}</Button>
            <Button variant="subtle" icon="file" onClick={() => setFmtModal('example')}>{t('nfc_view_example')}</Button>
          </div>
          {flash && <div className="flash-ok" style={{ marginBottom: 0 }}><Icon name="check" /> {flash}</div>}
        </>}
      </DeckPanel>

      <DeckPanel icon="save" title={t('sec_backup')} code="CFG·09">
        <div className="muted mono" style={{ fontSize: 11 }}>{t('backup_hint')}</div>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <Button variant="primary" icon="download2" onClick={exportBackup}>{t('backup_export')}</Button>
          <Button variant="ghost" icon="upload" onClick={() => importBackup('replace')}>{t('backup_import')} · {t('backup_replace')}</Button>
          <Button variant="ghost" icon="plus" onClick={() => importBackup('merge')}>{t('backup_import')} · {t('backup_merge')}</Button>
        </div>
        {backupFlash && <div className="flash-ok" style={{ marginBottom: 0 }}><Icon name="check" /> {backupFlash}</div>}
        <div className="divider" style={{ margin: '4px 0' }} />
        <div className="flex between">
          <span className="card-title-mono" style={{ color: 'var(--danger)' }}>{t('danger_zone')}</span>
          <Button variant="danger" icon="trash" onClick={wipeAll}>{t('wipe_all')}</Button>
        </div>
      </DeckPanel>

      {fmtModal && <NfcFormatModal store={store} editing={fmtModal === 'new' || fmtModal === 'example' ? null : fmtModal} example={fmtModal === 'example'} onClose={() => setFmtModal(null)} />}
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
