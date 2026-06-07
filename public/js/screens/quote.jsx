/* Visualização e impressão do orçamento (PDF via window.print) */

function QuoteIsoPiece({ hours }) {
  const U = 26, Uz = 18;
  const C = Math.cos(Math.PI / 6) * U, S = Math.sin(Math.PI / 6) * U;
  const pt = (x, y, z) => `${((x-y)*C).toFixed(1)},${((x+y)*S-z*Uz).toFixed(1)}`;
  const nL = Math.max(2, Math.min(7, Math.round((hours || 1) * 1.4)));
  const faces = [];
  for (let i = 0; i < nL; i++) {
    const t = i / (nL - 1 || 1);
    faces.push(<polygon key={'f'+i} points={`${pt(0,1,i)} ${pt(1,1,i)} ${pt(1,1,i+1)} ${pt(0,1,i+1)}`} fill={`color-mix(in oklab,var(--accent),#fff ${Math.round(18+10*t)}%)`} />);
    faces.push(<polygon key={'r'+i} points={`${pt(1,1,i)} ${pt(1,0,i)} ${pt(1,0,i+1)} ${pt(1,1,i+1)}`} fill={`color-mix(in oklab,var(--accent),#000 ${Math.round(16-5*t)}%)`} />);
  }
  faces.push(<polygon key="top" points={`${pt(0,0,nL)} ${pt(1,0,nL)} ${pt(1,1,nL)} ${pt(0,1,nL)}`} fill="color-mix(in oklab,var(--accent),#fff 42%)" />);
  const h2 = nL * Uz + 14;
  return <svg className="qd-iso-svg" viewBox={`-50 -${h2} 100 ${h2+14}`}>{faces}</svg>;
}

function QuoteScreen({ quote, onNavigate }) {
  const store = useStore();
  const t = store.t;
  const s = store.settings;
  const r = quote.result;
  const money = (v) => I18N.money(v, { currency: quote.currency || store.settings.currency });
  const today = new Date();
  const valid = new Date(today.getTime() + 15 * 86400000);
  const fmt  = (d) => d.toLocaleDateString(store.settings.lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  const fmtS = (d) => d.toLocaleDateString(store.settings.lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const [building, setBuilding] = useState(true);
  useEffect(() => { setBuilding(true); const tm = setTimeout(() => setBuilding(false), 1500); return () => clearTimeout(tm); }, [quote]);

  const client = quote.clientId ? (store.clients || []).find(c => c.id === quote.clientId) : null;
  const quoteNum = quote.id.slice(-6).toUpperCase();

  const qrText = s.contactWhats
    ? `https://wa.me/${s.contactWhats}?text=` + encodeURIComponent(`${t('quote_for')}: ${quote.name} — ${money(r.totalPrice)}`)
    : `${t('quote_for')}: ${quote.name}\n${quote.materialName}\n${money(r.totalPrice)}`;
  const qrSvg = (window.FX && window.FX.qrSvg) ? FX.qrSvg(qrText, '#221d16', '#f7f3ea') : '';

  return (
    <div className="page page-narrow quote-page">
      <div className="flex between no-print quote-toolbar" style={{ marginBottom: 16 }}>
        <Button variant="subtle" icon="chevron" onClick={() => onNavigate('history')} style={{ transform: 'none' }}>{t('back')}</Button>
        <Button variant="primary" icon="download" onClick={() => window.print()}>{t('print_quote')}</Button>
      </div>

      <div className={'card quote-doc' + (building ? ' building' : '')} id="quote-doc">
        <div className="print-progress"><span className="pp-head" /></div>

        {/* 1. cabeçalho */}
        <div className="qd-header">
          <div className="qd-brand">
            <div className="qd-mark"><img src="assets/logo-mark.png" alt="HΦSTO" /></div>
            <div>
              <div className="qd-studio">{s.contactName || 'HΦSTO'}</div>
              <div className="qd-tagline">{store.settings.lang === 'pt' ? 'Impressão 3D sob encomenda' : 'Custom 3D printing'}</div>
            </div>
          </div>
          <div className="qd-num-block">
            <span className="qd-badge">{t('quote_for').toUpperCase()}</span>
            <div className="qd-num mono">N° {quoteNum}</div>
          </div>
        </div>

        {/* 2. tira de metadados */}
        <div className="qd-strip mono">
          <span><b>{t('date')}</b> {fmtS(today)}</span>
          <span className="qd-sep">·</span>
          <span><b>{t('valid')}</b> {fmtS(valid)}</span>
          {client && <><span className="qd-sep">·</span><span><b>Cliente</b> {client.name}</span></>}
        </div>

        <div className="qd-body">
          {/* 3. peça em destaque */}
          <div className="qd-piece">
            <div className="qd-iso-wrap"><QuoteIsoPiece hours={r.hours} /></div>
            <div className="qd-piece-info">
              <div className="qd-piece-label mono">{t('item')}</div>
              <div className="qd-piece-name">{quote.name}{r.qty > 1 ? ` ×${r.qty}` : ''}</div>
              <div className="qd-specs">
                <div><span>{t('material')}</span><b>{quote.materialName}</b></div>
                {r.weight != null && <div><span>{t('weight')}</span><b>{r.weight.toFixed(0)}g</b></div>}
                {r.hours  != null && <div><span>{t('print_time')}</span><b>{r.hours.toFixed(1)}h</b></div>}
                <div><span>{t('qty')}</span><b>{r.qty}</b></div>
              </div>
            </div>
          </div>

          {/* 4. linhas de preço */}
          <div className="qd-lines">
            <div className="qd-line">
              <span>{quote.name}{r.qty > 1 ? ` ×${r.qty}` : ''}</span>
              <span className="mono">{money(r.unitPrice * r.qty)}</span>
            </div>
            {r.shippingTotal > 0 && (
              <div className="qd-line"><span>{t('shipping')}</span><span className="mono">{money(r.shippingTotal)}</span></div>
            )}
          </div>

          {/* 5. total */}
          <div className="qd-grand">
            <span>Total</span>
            <div className="qd-grand-val">
              <span className="qd-grand-price mono">{money(r.totalPrice)}</span>
              <span className="qd-grand-valid mono">{t('valid')} {fmt(valid)}</span>
            </div>
          </div>

          {/* 6. observações */}
          {quote.input?.notes && (
            <div className="qd-notes">
              <div className="qd-notes-lbl mono">{t('notes')}</div>
              <div>{quote.input.notes}</div>
            </div>
          )}

          {/* 7. rodapé: QR + contato */}
          <div className="qd-foot">
            {qrSvg && <div className="qd-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
            <div className="qd-foot-info">
              {s.contactWhats && <div className="qd-foot-contact mono">WhatsApp: {s.contactWhats}</div>}
              {s.contactName  && <div className="qd-foot-contact mono">{s.contactName}</div>}
              <div className="qd-foot-gen mono">{t('scan_quote')}</div>
            </div>
            <div className="qd-foot-logo"><div className="qd-mark sm"><img src="assets/logo-mark.png" alt="" /></div></div>
          </div>

          {/* 8. número final */}
          <div className="qd-barcode">
            <div className="qd-barcode-num mono">N° {quoteNum}</div>
            <div className="qd-thanks">OBRIGADO!</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.QuoteScreen = QuoteScreen;
