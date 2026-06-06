/* Mini-CRM — Clientes: MURAL DE CHAVEIROS IMPRESSOS.
   Cada cliente é uma plaqueta impressa em 3D, pendurada por uma argola num pino.
   Textura de camadas (layer lines), iniciais em relevo na cor do cliente,
   faturado como herói + medidor de fita (ranking). Balança ao passar o mouse. */

function ClientModal({ store, editing, onClose, onSaved }) {
  const t = store.t;
  const [f, setF] = useState(editing || { name: '', contact: '', notes: '' });
  const set = (p) => setF(s => ({ ...s, ...p }));
  const save = () => {
    if (editing) { store.updateClient(editing.id, f); onSaved && onSaved(editing.id); }
    else { const id = store.addClient(f); onSaved && onSaved(id); }
    onClose();
  };
  return (
    <Modal title={editing ? t('edit') : t('add_client')} onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={!f.name}>{t('save')}</Button></>}>
      <Field label={t('client_name')}><TextInput value={f.name} onChange={v => set({ name: v })} placeholder="Ex: João Silva / Loja XYZ" /></Field>
      <Field label={t('client_contact')}><TextInput value={f.contact} onChange={v => set({ contact: v })} placeholder="WhatsApp, e-mail, @..." /></Field>
      <Field label={t('notes')}>
        <div className="control"><input value={f.notes} onChange={e => set({ notes: e.target.value })} placeholder="Preferências, observações..." /></div>
      </Field>
    </Modal>
  );
}

/* cor de "material" determinística por cliente (hue do hash do nome) */
function tagColor(seed) {
  let h = 0; const s = seed || '?';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `oklch(0.74 0.145 ${hue})`;
}

function KeyTag({ store, c, onNavigate, onEdit, maxBilled, delay }) {
  const t = store.t;
  const qs = store.history.filter(q => q.clientId === c.id);
  const total = qs.reduce((a, q) => a + (q.result?.totalPrice || 0), 0);
  const initials = (c.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
  const pct = maxBilled > 0 ? Math.max(total > 0 ? 7 : 0, Math.round(total / maxBilled * 100)) : 0;
  const isTop = total > 0 && total >= maxBilled;
  const color = tagColor(c.id + c.name);

  return (
    <div className={'keytag' + (isTop ? ' is-top' : '')} style={{ '--mat': color, animationDelay: delay + 's' }}>
      <span className="kt-peg" />
      <span className="kt-ring" />
      <div className="kt-plate">
        <span className="kt-hole" />
        <div className="kt-actions">
          <button onClick={() => onEdit(c)} title={t('edit')}><Icon name="edit" /></button>
          <button className="danger" onClick={() => { if (confirm(t('confirm_del'))) store.removeClient(c.id); }} title={t('remove')}><Icon name="trash" /></button>
        </div>

        <span className="kt-emboss" aria-hidden="true">{initials}</span>
        {isTop && <span className="kt-crown mono"><Icon name="coins" />TOP</span>}

        <div className="kt-id">
          <div className="kt-name">{c.name}</div>
          {c.contact && <div className="kt-contact mono">{c.contact}</div>}
        </div>

        <div className="kt-billed">
          <div className="kt-billed-row">
            <span className="kt-billed-val mono">{store.money(total)}</span>
            <span className="kt-count mono"><Icon name="doc" />{qs.length}</span>
          </div>
          <span className="kt-billed-lbl">{t('total_billed')}</span>
          <span className="kt-gauge"><span style={{ width: pct + '%' }} /></span>
        </div>

        {c.notes && <div className="kt-notes">{c.notes}</div>}

        {qs.length > 0 && (
          <div className="kt-quotes">
            {qs.slice(0, 3).map(q => (
              <button key={q.id} className="kt-quote" onClick={() => onNavigate('quote', { quote: q })}>
                <Icon name="tag" /><span className="grow">{q.name}</span>
                <span className="mono">{store.money(q.result?.totalPrice || 0)}</span>
              </button>
            ))}
            {qs.length > 3 && <span className="kt-more mono">+{qs.length - 3}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsScreen({ onNavigate }) {
  const store = useStore();
  const t = store.t;
  const [modal, setModal] = useState(null);
  const clients = store.clients || [];

  const billedOf = (id) => store.history.filter(q => q.clientId === id).reduce((a, q) => a + (q.result?.totalPrice || 0), 0);
  const maxBilled = Math.max(1, ...clients.map(c => billedOf(c.id)));

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <div className="flex between" style={{ marginBottom: 18 }}>
        <SectionLabel>{clients.length} {t('nav_clients').toLowerCase()}</SectionLabel>
      </div>

      {clients.length === 0 && (
        <p className="screen-hint" style={{ marginBottom: 16 }}>{t('clients_empty')}</p>
      )}
      <div className="tag-wall">
        {clients.map((c, i) => (
          <KeyTag key={c.id} store={store} c={c} onNavigate={onNavigate}
            onEdit={(cl) => setModal(cl)} maxBilled={maxBilled} delay={-(i % 5) * 0.7} />
        ))}
        <button className="keytag kt-add" onClick={() => setModal('new')}>
          <span className="kt-peg" />
          <span className="kt-ring" />
          <div className="kt-plate">
            <span className="kt-hole" />
            <span className="kt-add-plus"><Icon name="plus" /></span>
            <div className="kt-add-lbl">{t('add_client')}</div>
            <div className="kt-add-sub mono">{t('crm')}</div>
          </div>
        </button>
      </div>
      {modal && <ClientModal store={store} editing={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
    </div>
  );
}

window.ClientModal = ClientModal;
window.ClientsScreen = ClientsScreen;
