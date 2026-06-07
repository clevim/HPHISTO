/* Mini-CRM — Clientes: MURAL DE CHAVEIROS IMPRESSOS.
   Cada cliente é uma plaqueta impressa em 3D, pendurada por uma argola num pino.
   Integra a FILA DE PEDIDOS (Pedido.html): badge de novos pedidos e
   um dossiê por cliente (pedidos pendentes, concluídos e orçamentos). */

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

/* ---- helpers de pedido ---- */
const FOCUS_LABEL = (o) => o.focus === 'detail' ? 'Detalhe · 0.08mm' : o.focus === 'function' ? 'Função · 0.28mm' : '—';
const COLOR_IS_RAINBOW = (o) => o.color === 'color';
const COLOR_LABEL = (o) => o.color === 'color' ? 'Colorido (a combinar)' : 'Cor única';
const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const fmtDeadline = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'a combinar';
const daysLeft = (d) => d ? Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 864e5) : null;
const isLink = (s) => /^https?:\/\//i.test(s || '');

/* ---- ciclo de vida do pedido ---- */
const statusOf = (o) => (o.status === 'feito' ? 'entregue' : (o.status || 'novo'));
const ORDER_STATUS = {
  novo:     { label: 'Pendente',    cls: 'st-open', icon: 'clock' },
  producao: { label: 'Em produção', cls: 'st-prod', icon: 'flame' },
  entregue: { label: 'Entregue',    cls: 'st-done', icon: 'check' },
};
const isActive = (o) => statusOf(o) !== 'entregue';

/* PROD ▸ BAIXAR STL
   Protótipo: STL embutido em o.model.data (base64) → data-URL.
   EM PRODUÇÃO: troque por o.model.fileUrl (URL assinada do storage) —
   ex.: GET /api/orders/:id/file redireciona para a signed URL.
   Spec completa: Pedidos — Integração.html */
function triggerDownload(href, name) {
  if (!href) return;
  const a = document.createElement('a'); a.href = href; a.download = name || 'modelo.stl';
  document.body.appendChild(a); a.click(); a.remove();
}

function OrderCard({ store, o, onQuote, onOpenQuote }) {
  const st = statusOf(o);
  const meta = ORDER_STATUS[st];
  const dl = daysLeft(o.deadline);
  const urgent = st !== 'entregue' && dl != null && dl <= 2;
  const hasFile = o.model?.mode === 'file' && !!o.model?.data;
  const quote = o.quoteId ? store.history.find(q => q.id === o.quoteId) : null;

  return (
    <div className={'ord-card stt-' + st + (!o.seen && isActive(o) ? ' fresh' : '') + (st === 'entregue' ? ' done' : '')}>
      <div className="ord-top">
        <span className="ord-os mono">{o.os || 'OS'}</span>
        {!o.seen && isActive(o) && <span className="ord-new mono">novo</span>}
        <span className="ord-spacer" />
        <span className={'ord-status ' + meta.cls}><Icon name={meta.icon} />{meta.label}</span>
      </div>

      <div className="ord-model">
        <Icon name={o.model?.mode === 'link' ? 'tag' : 'file'} />
        {isLink(o.model?.value)
          ? <a href={o.model.value} target="_blank" rel="noopener" title={o.model.value}>{o.model.value}</a>
          : <span title={o.model?.value}>{o.model?.value || '—'}</span>}
      </div>

      <div className="ord-meta">
        <span className={'ord-chip' + (urgent ? ' urg' : '')}><Icon name="calendar" />{fmtDeadline(o.deadline)}{dl != null && st !== 'entregue' && <em>{dl <= 0 ? 'venceu' : dl + 'd'}</em>}</span>
        <span className="ord-chip"><Icon name="search" />{FOCUS_LABEL(o)}</span>
        <span className="ord-chip">{COLOR_IS_RAINBOW(o) ? <span className="ord-rainbow" /> : <span className="ord-dot" />}{COLOR_LABEL(o)}</span>
      </div>

      {quote && (
        <button className="ord-quote-link" onClick={() => onOpenQuote(quote)} title="Ver orçamento">
          <Icon name="doc" /><span className="grow">{quote.name}</span>
          <span className="mono">{store.money(quote.result?.totalPrice || 0)}</span>
        </button>
      )}

      <div className="ord-foot">
        <span className="ord-when mono">recebido {fmtDate(o.createdAt)}</span>
        <span className="ord-spacer" />
        {hasFile && <a className="ord-act ico" href={o.model.data} download={o.model.value} title="Baixar STL"><Icon name="download" /></a>}
        {st === 'novo' && <button className="ord-act primary" onClick={() => onQuote(o)}><Icon name="calc" />Orçar</button>}
        {st === 'producao' && <button className="ord-act primary ok" onClick={() => store.setOrderStatus(o.id, 'entregue')}><Icon name="check" />Concluir &amp; enviar</button>}
        {st === 'entregue' && <button className="ord-act ico" onClick={() => store.setOrderStatus(o.id, o.quoteId ? 'producao' : 'novo')} title="Reabrir pedido"><Icon name="history" /></button>}
        <button className="ord-act ico danger" onClick={() => { if (confirm('Excluir este pedido?')) store.removeOrder(o.id); }} title="Excluir"><Icon name="trash" /></button>
      </div>
    </div>
  );
}

function ClientDetailModal({ store, client, onClose, onNavigate, onEdit }) {
  const t = store.t;
  useEffect(() => { store.markClientOrdersSeen(client.id); }, [client.id]);

  const orders = (store.orders || []).filter(o => o.clientId === client.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const novo = orders.filter(o => statusOf(o) === 'novo');
  const prod = orders.filter(o => statusOf(o) === 'producao');
  const entregue = orders.filter(o => statusOf(o) === 'entregue');
  const active = orders.filter(isActive).sort((a, b) => (statusOf(a) === 'novo' ? 0 : 1) - (statusOf(b) === 'novo' ? 0 : 1));
  const quotes = store.history.filter(q => q.clientId === client.id);
  const billed = quotes.reduce((a, q) => a + (q.result?.totalPrice || 0), 0);
  const color = tagColor(client.id + client.name);
  const initials = (client.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();

  // monta input pré-preenchido a partir do pedido e abre a calculadora
  const quoteInput = (o) => ({
    name: (o.model?.value || o.os || 'Peça').replace(/\.[a-z0-9]+$/i, ''),
    quantity: 1,
    printerId: store.printers[0]?.id, materialId: store.materials[0]?.id,
    inputMode: 'weight', weightG: '', lengthM: '', timeHours: '', timeMinutes: '',
    gcodeName: null, gcodeGeo: null,
    laborHours: '', modelingFee: '', packaging: '', shipping: '',
    useOverhead: true, consumables: [],
    margin: store.settings.defaultMargin, cardFeePct: store.settings.cardFeePct,
    notes: [o.os && ('Pedido ' + o.os), o.deadline && ('prazo ' + o.deadline),
      o.focus === 'detail' ? 'Detalhe 0.08mm' : o.focus === 'function' ? 'Função 0.28mm' : null,
      o.color === 'color' ? 'Colorido (a combinar)' : 'Cor única'].filter(Boolean).join(' · '),
    client: '', clientId: client.id, status: 'draft',
    orderId: o.id,
  });

  /* PROD ▸ BAIXAR STL ao clicar Orçar
     Hoje: data-URL embutida. Em produção: fetch /api/orders/:id/file → signed URL. */
  const onQuote = (o) => {
    if (o.model?.mode === 'file' && o.model?.data) triggerDownload(o.model.data, o.model.value);
    onClose();
    onNavigate('calc', { loadInput: quoteInput(o), fresh: Date.now() });
  };
  const onOpenQuote = (q) => { onClose(); onNavigate('quote', { quote: q }); };

  return (
    <Modal title="Dossiê do cliente" onClose={onClose}
      footer={<><Button variant="subtle" icon="edit" onClick={() => onEdit(client)}>Editar cadastro</Button>
        <span style={{ flex: 1 }} />
        <Button variant="primary" onClick={onClose}>Fechar</Button></>}>
      <div className="cd">
        <div className="cd-head">
          <span className="cd-emblem" style={{ '--mat': color }}>{initials}</span>
          <div className="cd-id">
            <h3>{client.name}</h3>
            {client.contact && <div className="cd-contact mono">{client.contact}</div>}
            {client.fromOrder && <span className="cd-origin mono">▸ cadastrado pelo balcão</span>}
          </div>
        </div>

        <div className="cd-stats">
          <div className="cd-stat"><b>{novo.length}</b><span>pendentes</span></div>
          <div className="cd-stat"><b className={prod.length ? 'hot' : ''}>{prod.length}</b><span>em produção</span></div>
          <div className="cd-stat"><b>{entregue.length}</b><span>entregues</span></div>
          <div className="cd-stat"><b className="mono">{store.money(billed)}</b><span>faturado</span></div>
        </div>

        {client.notes && <div className="cd-notes">{client.notes}</div>}

        <div className="cd-sec">
          <SectionLabel>pedidos no balcão · {active.length}</SectionLabel>
          {active.length === 0
            ? <div className="cd-empty mono">Nenhum pedido ativo no balcão.</div>
            : <div className="ord-grid">{active.map(o => <OrderCard key={o.id} store={store} o={o} onQuote={onQuote} onOpenQuote={onOpenQuote} />)}</div>}
          {entregue.length > 0 && <>
            <div className="cd-subhead mono">Entregues · histórico</div>
            <div className="ord-grid">{entregue.map(o => <OrderCard key={o.id} store={store} o={o} onQuote={onQuote} onOpenQuote={onOpenQuote} />)}</div>
          </>}
        </div>

        <div className="cd-sec">
          <SectionLabel>orçamentos · {quotes.length}</SectionLabel>
          {quotes.length === 0
            ? <div className="cd-empty mono">Nenhum orçamento salvo para este cliente.</div>
            : <div className="cd-quotes">
                {quotes.map(q => (
                  <button key={q.id} className="cd-quote" onClick={() => { onClose(); onNavigate('quote', { quote: q }); }}>
                    <Icon name="doc" /><span className="grow">{q.name}</span>
                    <span className="mono cd-q-date">{fmtDate(q.savedAt)}</span>
                    <span className="mono cd-q-val">{store.money(q.result?.totalPrice || 0)}</span>
                  </button>
                ))}
              </div>}
        </div>
      </div>
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

function KeyTag({ store, c, orders, onOpen, onEdit, maxBilled, delay }) {
  const t = store.t;
  const qs = store.history.filter(q => q.clientId === c.id);
  const total = qs.reduce((a, q) => a + (q.result?.totalPrice || 0), 0);
  const initials = (c.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
  const pct = maxBilled > 0 ? Math.max(total > 0 ? 7 : 0, Math.round(total / maxBilled * 100)) : 0;
  const isTop = total > 0 && total >= maxBilled;
  const color = tagColor(c.id + c.name);

  const myOrders = orders.filter(o => o.clientId === c.id);
  const unseen = myOrders.filter(o => !o.seen && isActive(o)).length;
  const novoCount = myOrders.filter(o => statusOf(o) === 'novo').length;
  const prodCount = myOrders.filter(o => statusOf(o) === 'producao').length;

  return (
    <div className={'keytag' + (isTop ? ' is-top' : '') + (unseen > 0 ? ' has-new' : '')} style={{ '--mat': color, animationDelay: delay + 's' }}>
      <span className="kt-peg" />
      <span className="kt-ring" />
      {unseen > 0 && (
        <span className="kt-badge mono" title={unseen + ' pedido(s) novo(s) no balcão'}>
          <span className="kt-badge-ping" />
          <Icon name="cart" />{unseen}
        </span>
      )}
      <div className="kt-plate" onClick={() => onOpen(c)} title="Abrir dossiê" role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(c); } }}>
        <span className="kt-hole" />
        <div className="kt-actions">
          <button onClick={(e) => { e.stopPropagation(); onEdit(c); }} title={t('edit')}><Icon name="edit" /></button>
          <button className="danger" onClick={(e) => { e.stopPropagation(); if (confirm(t('confirm_del'))) store.removeClient(c.id); }} title={t('remove')}><Icon name="trash" /></button>
        </div>

        <span className="kt-emboss" aria-hidden="true">{initials}</span>
        {isTop && <span className="kt-crown mono"><Icon name="coins" />TOP</span>}

        <div className="kt-id">
          <div className="kt-name">{c.name}</div>
          {c.contact && <div className="kt-contact mono">{c.contact}</div>}
        </div>

        {myOrders.length > 0 && (
          <div className="kt-orders mono">
            <Icon name={prodCount > 0 && novoCount === 0 ? 'flame' : 'cart'} />
            {novoCount > 0
              ? <span className="kt-pending">{novoCount} pendente{novoCount > 1 ? 's' : ''}</span>
              : prodCount > 0
                ? <span className="kt-prod">{prodCount} em produção</span>
                : <span>{myOrders.length} pedido{myOrders.length > 1 ? 's' : ''}</span>}
          </div>
        )}

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
              <div key={q.id} className="kt-quote">
                <Icon name="tag" /><span className="grow">{q.name}</span>
                <span className="mono">{store.money(q.result?.totalPrice || 0)}</span>
              </div>
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
  const [detail, setDetail] = useState(null);
  const clients = store.clients || [];
  const orders = store.orders || [];

  const billedOf = (id) => store.history.filter(q => q.clientId === id).reduce((a, q) => a + (q.result?.totalPrice || 0), 0);
  const maxBilled = Math.max(1, ...clients.map(c => billedOf(c.id)));
  const totalNew = orders.filter(o => !o.seen && isActive(o)).length;

  // clientes com pedidos novos primeiro, depois por mais faturado
  const sorted = clients.slice().sort((a, b) => {
    const na = orders.filter(o => o.clientId === a.id && !o.seen && isActive(o)).length;
    const nb = orders.filter(o => o.clientId === b.id && !o.seen && isActive(o)).length;
    if (!!nb !== !!na) return nb - na;
    return billedOf(b.id) - billedOf(a.id);
  });

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <div className="flex between" style={{ marginBottom: 18, alignItems: 'center', gap: 12 }}>
        <SectionLabel>{clients.length} {t('nav_clients').toLowerCase()}</SectionLabel>
        {totalNew > 0 && (
          <span className="new-orders-pill mono" title="Pedidos recebidos pelo balcão público">
            <span className="nop-radar"><span /><span /><span /></span>
            <Icon name="cart" />
            <span className="nop-txt">{totalNew} pedido{totalNew > 1 ? 's' : ''} novo{totalNew > 1 ? 's' : ''} no balcão</span>
            <span className="nop-feed" />
          </span>
        )}
      </div>

      {clients.length === 0 && (
        <p className="screen-hint" style={{ marginBottom: 16 }}>{t('clients_empty')}</p>
      )}
      <div className="tag-wall">
        {sorted.map((c, i) => (
          <KeyTag key={c.id} store={store} c={c} orders={orders} onOpen={(cl) => setDetail(cl)}
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

      {detail && <ClientDetailModal store={store} client={clients.find(c => c.id === detail.id) || detail}
        onClose={() => setDetail(null)} onNavigate={onNavigate}
        onEdit={(cl) => { setDetail(null); setModal(cl); }} />}
      {modal && <ClientModal store={store} editing={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
    </div>
  );
}

window.ClientModal = ClientModal;
window.ClientsScreen = ClientsScreen;
