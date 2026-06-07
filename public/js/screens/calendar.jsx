/* Tela Agenda / Calendário de impressão */

const STATUS_META = {
  queued:   { color: 'var(--ink-3)',  bg: 'var(--paper-2)',  icon: 'clock' },
  printing: { color: 'var(--accent)', bg: 'var(--accent-wash)', icon: 'play' },
  done:     { color: 'var(--good)',   bg: 'var(--good-wash)', icon: 'check' },
  failed:   { color: '#C43B3B',       bg: 'oklch(0.93 0.05 25)', icon: 'x' },
};
const STATUS_ORDER = ['queued', 'printing', 'done', 'failed'];

function StatusBadge({ status, lang }) {
  const meta = STATUS_META[status] || STATUS_META.queued;
  const label = I18N.t(lang || 'pt', 'st_' + status);
  return (
    <span className={'status-badge ' + status} style={{ background: meta.bg, color: meta.color }}>
      <span className="sb-dot" />{label}
    </span>
  );
}

function localDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function JobModal({ store, editing, preset, onClose }) {
  const t = store.t;
  const presetQuote = preset?.quoteId ? store.history.find(q => q.id === preset.quoteId) : null;
  // pedido vinculado ao orçamento — usado para puxar o prazo de entrega
  const presetOrder = presetQuote ? (store.orders || []).find(o => o.quoteId === presetQuote.id) : null;
  const blank = {
    title: presetQuote?.name || '',
    printerId: (presetQuote?.input?.printerId && store.printers.some(p => p.id === presetQuote.input.printerId) ? presetQuote.input.printerId : null) || preset?.printerId || store.printers[0]?.id,
    materialId: (presetQuote?.input?.materialId && store.materials.some(m => m.id === presetQuote.input.materialId) ? presetQuote.input.materialId : null) || store.materials[0]?.id,
    date: preset?.date || localDate(new Date()),
    dueDate: preset?.dueDate || presetOrder?.deadline || '',
    hours: presetQuote?.result?.hours != null ? +Number(presetQuote.result.hours).toFixed(2) : 4,
    qty: presetQuote?.input?.quantity || 1,
    weightG: presetQuote?.result?.weight != null ? +Number(presetQuote.result.weight).toFixed(1) : '',
    status: 'queued', notes: '', deductStock: true, quoteId: preset?.quoteId || '',
  };
  const [f, setF] = useState(editing || blank);
  const set = (p) => setF(s => ({ ...s, ...p }));

  // vincula um orçamento salvo → preenche campos; puxa prazo do pedido vinculado
  const linkQuote = (qid) => {
    if (!qid) { set({ quoteId: '' }); return; }
    const q = store.history.find(x => x.id === qid);
    if (!q) { set({ quoteId: '' }); return; }
    const inp = q.input || {};
    const patch = { quoteId: qid, title: q.name || f.title };
    if (inp.printerId && store.printers.some(p => p.id === inp.printerId)) patch.printerId = inp.printerId;
    if (inp.materialId && store.materials.some(m => m.id === inp.materialId)) patch.materialId = inp.materialId;
    if (inp.quantity) patch.qty = inp.quantity;
    if (q.result) {
      if (q.result.weight != null) patch.weightG = +Number(q.result.weight).toFixed(1);
      if (q.result.hours != null) patch.hours = +Number(q.result.hours).toFixed(2);
    }
    // puxa prazo do pedido do balcão associado ao orçamento
    const linkedOrder = (store.orders || []).find(o => o.quoteId === qid);
    if (linkedOrder?.deadline) patch.dueDate = linkedOrder.deadline;
    set(patch);
  };

  const save = () => { if (editing) store.updateJob(editing.id, f); else store.addJob(f); onClose(); };
  return (
    <Modal title={editing ? t('edit') : t('add_job')} onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={!f.title}>{t('save')}</Button></>}>

      {/* vincular peça calculada */}
      <Field label={t('link_part')} hint={store.history.length ? null : t('no_quotes_hint')}>
        <Select value={f.quoteId || ''} onChange={linkQuote}>
          <option value="">{t('link_manual')}</option>
          {store.history.map(q => (
            <option key={q.id} value={q.id}>{q.name} · {q.materialName} · {(q.result?.weight || 0).toFixed(0)}g</option>
          ))}
        </Select>
      </Field>
      {f.quoteId && (() => {
        const q = store.history.find(x => x.id === f.quoteId);
        return q ? <div className="quote-link-chip"><Icon name="doc" /><span>{t('from_quote')}: <b>{q.name}</b> · {store.money(q.result?.unitPrice || 0)}/un</span><button onClick={() => linkQuote('')} title={t('link_manual')}><Icon name="x" /></button></div> : null;
      })()}

      <Field label={t('job_title')}><TextInput value={f.title} onChange={v => set({ title: v })} placeholder="Ex: 12 chaveiros — cliente João" /></Field>
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label={t('printer')}>
          <Select value={f.printerId} onChange={v => set({ printerId: v })}>
            {store.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label={t('material')}>
          <Select value={f.materialId} onChange={v => set({ materialId: v })}>
            {store.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label={t('job_date')}>
          <div className="control"><input type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></div>
        </Field>
        <Field label="Entrega (prazo)" hint="Prazo do pedido do cliente">
          <div className="control"><input type="date" value={f.dueDate || ''} onChange={e => set({ dueDate: e.target.value })} /></div>
        </Field>
        <Field label={t('est_hours')}><NumberInput value={f.hours} step={0.5} onChange={v => set({ hours: v })} affix={t('hours')} /></Field>
        <Field label={t('quantity')}><NumberInput value={f.qty} step={1} min={1} onChange={v => set({ qty: v })} affix="un" /></Field>
        <Field label={t('weight') + ' (' + t('stock').toLowerCase() + ')'}><NumberInput value={f.weightG} step={1} onChange={v => set({ weightG: v })} affix="g" /></Field>
      </div>
      <Field label={t('status')}>
        <Segmented value={f.status} onChange={v => set({ status: v })} options={STATUS_ORDER.map(s => ({ value: s, label: t('st_' + s) }))} />
      </Field>
      <Switch on={f.deductStock} onChange={v => set({ deductStock: v })} label={t('deduct_stock')} />
      <Field label={t('notes')}>
        <div className="control"><input value={f.notes} onChange={e => set({ notes: e.target.value })} /></div>
      </Field>
    </Modal>
  );
}

function JobRow({ store, job, onEdit }) {
  const t = store.t;
  const mat = store.materials.find(m => m.id === job.materialId);
  const prn = store.printers.find(p => p.id === job.printerId);
  const meta = STATUS_META[job.status] || STATUS_META.queued;

  const complete = () => {
    store.updateJob(job.id, { status: 'done' });
    if (job.deductStock && job.weightG && mat) store.consumeMaterial(mat.id, Number(job.weightG) * (job.qty || 1));
  };
  return (
    <div className="row-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div className="flex" style={{ gap: 12 }}>
        <div className="swatch" style={{ width: 34, height: 34, background: mat?.color || 'var(--paper-2)' }}><Icon name="cube" style={{ color: '#fff', opacity: .9, width: 17, height: 17 }} /></div>
        <div className="rc-main">
          <div className="rc-title" style={{ fontSize: 14 }}>{job.title}</div>
          <div className="rc-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prn?.name} · {mat?.name} · {job.hours}h{job.qty > 1 ? ` · ×${job.qty}` : ''}{job.weightG ? ` · ${(job.weightG * (job.qty || 1)).toFixed(0)}g` : ''}</div>
        </div>
        <StatusBadge status={job.status} lang={store.settings.lang} />
      </div>
      <div className="flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
        {job.status !== 'done' && <Button variant="ghost" size="sm" icon="check" onClick={complete}>{t('mark_done')}</Button>}
        <Button variant="subtle" className="btn btn-subtle btn-icon" onClick={() => onEdit(job)}><Icon name="edit" /></Button>
        <Button variant="danger" className="btn btn-danger btn-icon" onClick={() => { if (confirm(t('confirm_del'))) store.removeJob(job.id); }}><Icon name="trash" /></Button>
      </div>
    </div>
  );
}

function ScheduleScreen({ newJobQuoteId }) {
  const store = useStore();
  const t = store.t;
  const [start, setStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [modal, setModal] = useState(null);
  const [preset, setPreset] = useState(null);
  const WIN = 7;
  const CAP = 24; // horas/dia por impressora
  const lang = store.settings.lang;
  const todayStr = localDate(new Date());

  // abre o modal de novo trabalho já vinculado a um orçamento (vindo do Histórico)
  useEffect(() => {
    if (newJobQuoteId && store.history.some(q => q.id === newJobQuoteId)) {
      setPreset({ date: todayStr, quoteId: newJobQuoteId });
      setModal('new');
    }
  }, [newJobQuoteId]);

  const days = [];
  for (let i = 0; i < WIN; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(localDate(d)); }

  // index trabalhos por impressora+dia
  const cell = {};
  store.schedule.forEach(j => { const k = j.printerId + '|' + j.date; (cell[k] = cell[k] || []).push(j); });
  const cellJobs = (pid, ds) => cell[pid + '|' + ds] || [];
  const cellHours = (pid, ds) => cellJobs(pid, ds).reduce((a, j) => a + (Number(j.hours) || 0), 0);

  const counts = STATUS_ORDER.map(s => ({ s, n: store.schedule.filter(j => j.status === s).length }));
  const shift = (n) => { const d = new Date(start); d.setDate(start.getDate() + n); setStart(d); };
  const openNew = (date, printerId) => { setPreset({ date, printerId }); setModal('new'); };
  const wd = (ds) => new Date(ds + 'T00:00').toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short' }).replace('.', '');
  const rangeLabel = () => {
    const a = new Date(days[0] + 'T00:00'), b = new Date(days[WIN - 1] + 'T00:00');
    const f = (d) => d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' });
    return f(a) + ' — ' + f(b);
  };

  if (store.printers.length === 0) {
    return <div className="page"><div className="empty"><Icon name="printer" /><p style={{ fontWeight: 600, color: 'var(--ink)' }}>{t('no_printer')}</p></div></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <div className="flex between flex-wrap" style={{ marginBottom: 16, gap: 12 }}>
        <div className="flex" style={{ gap: 10, flexWrap: 'wrap' }}>
          {counts.map(c => (
            <span key={c.s} className="conv-count">
              <span className="cc-dot" style={{ background: (STATUS_META[c.s] || {}).color }} />
              <b>{c.n}</b> {t('st_' + c.s)}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap: 6 }}>
          <span className="farm-range mono">{rangeLabel()}</span>
          <Button variant="ghost" className="btn btn-ghost btn-icon" onClick={() => shift(-7)}><Icon name="chevL" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setStart(d); }}>{t('today')}</Button>
          <Button variant="ghost" className="btn btn-ghost btn-icon" onClick={() => shift(7)}><Icon name="chevR" /></Button>
        </div>
      </div>

      <div className="farm">
        <div className="farm-grid" style={{ '--days': WIN }}>
          {/* canto + cabeçalho de dias */}
          <div className="farm-corner">
            <Icon name="layers" />
            <span>{t('farm_lanes')}</span>
          </div>
          {days.map(ds => {
            const isToday = ds === todayStr;
            return (
              <div className={'farm-dayhead' + (isToday ? ' today' : '')} key={ds}>
                <span className="fd-wd">{wd(ds)}</span>
                <span className="fd-num">{String(parseInt(ds.slice(-2), 10)).padStart(2, '0')}</span>
                {isToday && <span className="fd-now">NOW</span>}
              </div>
            );
          })}

          {/* pistas das impressoras */}
          {store.printers.map(p => {
            const load = days.reduce((s, ds) => s + cellHours(p.id, ds), 0);
            const cap = WIN * CAP;
            const active = store.schedule.some(j => j.printerId === p.id && j.status === 'printing');
            return (
              <React.Fragment key={p.id}>
                <div className={'farm-lane' + (active ? ' on' : '')}>
                  <div className="fl-icon"><Icon name="printer" />{active && <span className="fl-live" />}</div>
                  <div className="fl-main">
                    <div className="fl-name">{p.name}</div>
                    <div className="fl-load">
                      <span className="fl-bar"><span style={{ width: Math.min(100, load / cap * 100) + '%' }} /></span>
                      <span className="fl-h mono">{load.toFixed(0)}h</span>
                    </div>
                  </div>
                </div>
                {days.map(ds => {
                  const jobs = cellJobs(p.id, ds);
                  const used = cellHours(p.id, ds);
                  const over = used > CAP;
                  const isToday = ds === todayStr;
                  return (
                    <div className={'farm-cell' + (isToday ? ' today' : '') + (jobs.length ? '' : ' is-empty')}
                      key={ds} onClick={() => jobs.length === 0 && openNew(ds, p.id)}>
                      {jobs.map(j => {
                        const mat = store.materials.find(m => m.id === j.materialId);
                        const meta = STATUS_META[j.status] || STATUS_META.queued;
                        return (
                          <button key={j.id} className={'farm-job s-' + j.status} style={{ '--pc': meta.color }}
                            onClick={(e) => { e.stopPropagation(); setModal(j); }} title={j.title}>
                            <span className="fj-bar" />
                            <span className="fj-body">
                              <span className="fj-title">{j.title}{j.quoteId && store.history.some(q => q.id === j.quoteId) && <Icon name="doc" className="fj-quote" />}</span>
                              <span className="fj-meta">{j.hours}h{j.qty > 1 ? ' ·×' + j.qty : ''}{mat ? ' · ' + mat.name.split(' ')[0] : ''}</span>
                            </span>
                            <span className="fj-dot" style={{ background: meta.color }} />
                          </button>
                        );
                      })}
                      {jobs.length > 0 ? (
                        <span className={'fc-cap' + (over ? ' over' : '')} title={used.toFixed(1) + 'h / ' + CAP + 'h'}>
                          <span style={{ width: Math.min(100, used / CAP * 100) + '%' }} />
                          {over && <em>{t('overbook')}</em>}
                          <button className="fc-more" onClick={(e) => { e.stopPropagation(); openNew(ds, p.id); }}><Icon name="plus" /></button>
                        </span>
                      ) : (
                        <span className="fc-add"><Icon name="plus" /></span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
        <div className="farm-hint mono">{t('sched_hint')}</div>
      </div>

      {modal && <JobModal store={store} editing={modal === 'new' ? null : modal} preset={modal === 'new' ? preset : null} onClose={() => setModal(null)} />}
    </div>
  );
}

window.ScheduleScreen = ScheduleScreen;
window.STATUS_META = STATUS_META;
window.StatusBadge = StatusBadge;
