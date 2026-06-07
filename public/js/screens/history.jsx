/* Histórico de orçamentos */

function HistoryScreen({ onNavigate, flash }) {
  const store = useStore();
  const t = store.t;
  const money = (v) => I18N.money(v, { currency: store.settings.currency });
  const fmtDate = (ts) => new Date(ts).toLocaleString(store.settings.lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page" style={{ maxWidth: 1120 }}>
      {flash && <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--good)', background: 'var(--good-wash)', color: 'var(--ink)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Icon name="check" style={{ width: 18, height: 18, color: 'var(--good)' }} /> {t('saved_ok')}
      </div>}
      <SectionLabel>{store.history.length} {t('nav_history').toLowerCase()}</SectionLabel>
      {store.history.length === 0 ? (
        <div className="empty"><Icon name="history" /><p>{t('history_empty')}</p></div>
      ) : (
        <div className="receipts">
          {store.history.map(q => {
            const cur = (v) => I18N.money(v, { currency: q.currency || store.settings.currency });
            const r = q.result;
            const jobs = store.schedule.filter(j => j.quoteId === q.id);
            const scheduled = jobs.length > 0;
            return (
              <div className="receipt" key={q.id}>
                <div className="rcp-actions">
                  <button onClick={() => onNavigate('calc', { loadInput: q.input })} title={t('hist_load')}><Icon name="edit" /></button>
                  <button onClick={() => { if (confirm(t('confirm_del'))) store.removeQuote(q.id); }} title={t('remove')} className="danger"><Icon name="trash" /></button>
                </div>
                <button className="rcp-paper" onClick={() => onNavigate('quote', { quote: q })}>
                  <div className="rcp-head">
                    <span>★ {t('quote_for').toUpperCase()}</span>
                    <span>{fmtDate(q.savedAt)}</span>
                  </div>
                  <div className="rcp-title">{q.name}{q.input?.quantity > 1 ? ` ×${q.input.quantity}` : ''}</div>
                  <div className="rcp-rows">
                    <div><span>{t('material')}</span><b>{q.materialName}</b></div>
                    <div><span>{t('printer')}</span><b>{q.printerName}</b></div>
                    {r.weight != null && <div><span>{t('weight')} / {t('print_time')}</span><b>{(r.weight || 0).toFixed(0)}g · {(r.hours || 0).toFixed(1)}h</b></div>}
                  </div>
                  <div className="rcp-dash" />
                  <div className="rcp-row2"><span>{t('cost')}</span><span>{cur(r.unitCost != null ? r.unitCost * (r.qty || 1) : r.totalPrice - r.totalProfit)}</span></div>
                  <div className="rcp-row2"><span>{t('margin')}</span><span>{r.margin}%</span></div>
                  <div className="rcp-row2"><span>{t('profit')}</span><span>{cur(r.totalProfit)}</span></div>
                  <div className="rcp-dash" />
                  <div className="rcp-total"><span>TOTAL</span><span>{cur(r.totalPrice)}</span></div>
                  <div className="rcp-barcode" />
                  <div className="rcp-id">N° {q.id.slice(-8).toUpperCase()} · OBRIGADO!</div>
                </button>
                {scheduled
                  ? <button className="rcp-stamp linked" onClick={() => onNavigate('schedule')} title={t('go_schedule')}>
                      <Icon name="calendar" />{t('scheduled_tag')}{jobs.length > 1 ? ` ×${jobs.length}` : ''}
                    </button>
                  : <button className="rcp-stamp" onClick={() => onNavigate('schedule', { newJobQuoteId: q.id })} title={t('add_job')}>
                      <Icon name="plus" />{t('schedule_this')}
                    </button>}
                <div className="rcp-tear" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.HistoryScreen = HistoryScreen;
