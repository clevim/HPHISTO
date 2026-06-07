/* Painel — HUB CARRETEL: menus orbitam um carretel de filamento que gira,
   informações-chave no núcleo. */

function SpoolHub({ store, onNavigate }) {
  const t = store.t;
  const now = new Date();
  const monthKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth(); };
  const curMonth = now.getFullYear() + '-' + now.getMonth();
  const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  const monthQuotes = store.history.filter(q => monthKey(q.savedAt) === curMonth);
  const revenue = sum(monthQuotes, q => q.result.totalPrice);
  const profit = sum(monthQuotes, q => q.result.totalProfit);
  const activeJobs = store.schedule.filter(j => j.status === 'queued' || j.status === 'printing').length;

  // estoque total restante (%)
  const stockTotal = sum(store.materials, m => (m.spoolWeight || 1000) * (m.spools || 1));
  const stockRem = sum(store.materials, m => m.remainingG != null ? m.remainingG : (m.spoolWeight || 1000) * (m.spools || 1));
  const stockPct = stockTotal > 0 ? Math.round(stockRem / stockTotal * 100) : 0;

  const nodes = [
    { id: 'calc', icon: 'calc', label: t('nav_calc') },
    { id: 'catalog', icon: 'box', label: t('nav_catalog') },
    { id: 'clients', icon: 'user', label: t('nav_clients') },
    { id: 'schedule', icon: 'calendar', label: t('nav_schedule') },
    { id: 'history', icon: 'history', label: t('nav_history') },
    { id: 'printers', icon: 'printer', label: t('nav_printers') },
    { id: 'materials', icon: 'layers', label: t('nav_materials') },
    { id: 'settings', icon: 'settings', label: t('nav_settings') },
  ];
  const N = nodes.length;
  const polar = (r, i) => {
    const a = (-90 + i * (360 / N)) * Math.PI / 180;
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
  };

  // parafusos / furos na flange do carretel
  // espiral de Arquimedes (filamento contínuo) do núcleo até a borda — espessura uniforme
  const spiralD = (() => {
    const turns = 9, rIn = 103, rOut = 137, steps = turns * 64;
    let d = '';
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      const ang = f * turns * 2 * Math.PI;
      const r = rIn + (rOut - rIn) * f;
      const x = 150 + r * Math.cos(ang), y = 150 + r * Math.sin(ang);
      d += (s === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return d;
  })();

  // gera um “fio” curvo (corda) do núcleo até o nó, com curvatura k (oscila p/ ondular)
  const strandD = (a, b, k) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const px = -dy / L, py = dx / L; // perpendicular unit
    const c1x = a.x + dx / 3 + px * k, c1y = a.y + dy / 3 + py * k;
    const c2x = a.x + dx * 2 / 3 - px * k, c2y = a.y + dy * 2 / 3 - py * k;
    return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  return (
    <div className="spool-stage">
      {/* brilho pulsante atrás do carretel */}
      <div className="spool-glow" />

      {/* fios de filamento (cordas) conectando núcleo → nós — ondulam e têm filamento correndo */}
      <svg className="spool-strands" viewBox="0 0 100 100" preserveAspectRatio="none">
        {nodes.map((n, i) => {
          const a = polar(19, i), b = polar(40, i);
          const d1 = strandD(a, b, 1.7), d2 = strandD(a, b, -1.7), d0 = strandD(a, b, 0);
          const dur = (2.7 + (i % 3) * 0.45).toFixed(2) + 's';
          const beg = (i * -0.37).toFixed(2) + 's';
          const sway = { values: `${d1};${d2};${d1}`, dur, begin: beg, repeatCount: 'indefinite',
            calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' };
          return (
            <g key={n.id}>
              <path className="strand-base" d={d0}><animate attributeName="d" {...sway} /></path>
              <path className="strand-flow" d={d0} style={{ animationDelay: (i * -0.42) + 's' }}>
                <animate attributeName="d" {...sway} />
              </path>
            </g>
          );
        })}
      </svg>

      {/* arte do carretel (gira) */}
      <svg className="spool-art" viewBox="0 0 300 300">
        <g className="spool-spin">
          {/* flange externa */}
          <circle cx="150" cy="150" r="145" className="sp-flange" />
          <circle cx="150" cy="150" r="137" className="sp-flange-in" />
          {/* filamento enrolado — espiral contínua de espessura uniforme */}
          <circle cx="150" cy="150" r="137" className="sp-wind-mass" />
          <path d={spiralD} className="sp-spiral" />
          {/* brilho de luz correndo pela espiral, continuamente */}
          <path d={spiralD} className="sp-spiral-glow" pathLength="1000" />
          {/* furos na borda da flange — por cima da espiral (a linha passa por baixo) */}
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 - 90) * Math.PI / 180;
            return <circle key={i} cx={150 + 141 * Math.cos(a)} cy={150 + 141 * Math.sin(a)} r="6" className="sp-hole" />;
          })}
          {/* núcleo (core) — hub escuro onde ficam os dados */}
          <circle cx="150" cy="150" r="104" className="sp-core-shadow" />
          <circle cx="150" cy="150" r="102" className="sp-core-ring" />
        </g>
      </svg>

      {/* núcleo: informações-chave (estático) */}
      <button className="spool-core" onClick={() => onNavigate('calc')} title={t('new_quote')}>
        <span className="sc-label">{t('kpi_revenue')}</span>
        <span className="sc-value">{store.money(revenue)}</span>
        <div className="sc-stats">
          <div><b>{store.money(profit)}</b><span>{store.settings.lang === 'pt' ? 'Lucro' : 'Profit'}</span></div>
          <div><b>{activeJobs}</b><span>{store.settings.lang === 'pt' ? 'Fila' : 'Queue'}</span></div>
          <div><b>{stockPct}%</b><span>{store.settings.lang === 'pt' ? 'Estoque' : 'Stock'}</span></div>
        </div>
      </button>

      {/* nós de menu orbitando */}
      <div className="spool-nodes">
        {nodes.map((n, i) => {
          const p = polar(40, i);
          return (
            <button key={n.id} className={'spool-node' + (n.featured ? ' featured' : '')} style={{ left: p.x + '%', top: p.y + '%' }} onClick={() => onNavigate(n.id)}>
              <span className="sn-disc"><Icon name={n.icon} /></span>
              <span className="sn-label">{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardScreen({ onNavigate }) {
  const store = useStore();
  const t = store.t;

  const now = new Date();
  const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  const mk = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth(); };
  const curMonth = now.getFullYear() + '-' + now.getMonth();
  const monthQuotes = store.history.filter(q => mk(q.savedAt) === curMonth);
  const revenue = sum(monthQuotes, q => q.result.totalPrice);
  const profit = sum(monthQuotes, q => q.result.totalProfit);
  const avgMargin = monthQuotes.length ? Math.round(sum(monthQuotes, q => q.result.margin || 0) / monthQuotes.length) : 0;

  // série de 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + d.getMonth();
    const qs = store.history.filter(q => mk(q.savedAt) === key);
    months.push({
      label: d.toLocaleDateString(store.settings.lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'short' }).replace('.', ''),
      rev: sum(qs, q => q.result.totalPrice), prof: sum(qs, q => q.result.totalProfit),
    });
  }
  const maxRev = Math.max(...months.map(m => m.rev), 1);

  // peças mais lucrativas (todos os tempos)
  const topParts = [...store.history].sort((a, b) => (b.result.totalProfit || 0) - (a.result.totalProfit || 0)).slice(0, 4);

  // material mais usado (por nº de orçamentos)
  const matCount = {};
  store.history.forEach(q => { if (q.materialName) matCount[q.materialName] = (matCount[q.materialName] || 0) + 1; });
  const topMat = Object.entries(matCount).sort((a, b) => b[1] - a[1])[0];

  const lowStock = store.materials.filter(m => {
    const total = (m.spoolWeight || 1000) * (m.spools || 1);
    const rem = m.remainingG != null ? m.remainingG : total;
    return rem <= (m.lowStockG || 0);
  });
  const upcoming = [...store.schedule].filter(j => j.status !== 'done' && j.status !== 'failed')
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const recent = store.history.slice(0, 4);

  return (
    <div className="dash-hub">
      <div className="dash-hero">
        <div className="dash-brand">
          <div className="brand-mark">
            <img src="assets/logo-mark.png" alt="HΦSTO" />
          </div>
          <div className="brand-name">HΦSTO<small>{t('app_sub')}</small></div>
        </div>
        <SpoolHub store={store} onNavigate={onNavigate} />
        <div className="dash-scroll-hint"><Icon name="chevron" /></div>
      </div>

      <div className="dash-details">
      {/* KPIs financeiros do mês */}
      <div className="kpi-row">
        <div className="kpi"><span className="kpi-label">{t('kpi_revenue')}</span><span className="kpi-val">{store.money(revenue)}</span></div>
        <div className="kpi"><span className="kpi-label">{t('kpi_profit')}</span><span className="kpi-val" style={{ color: 'var(--good)' }}>{store.money(profit)}</span></div>
        <div className="kpi"><span className="kpi-label">{t('avg_margin')}</span><span className="kpi-val">{avgMargin}%</span></div>
        <div className="kpi"><span className="kpi-label">{t('kpi_quotes')}</span><span className="kpi-val">{monthQuotes.length}</span></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {/* gráfico 6 meses */}
        <div className="card" style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <div className="card-head"><Icon name="trend" className="ico" /><h3>{t('revenue_6m')}</h3>
            <div className="spacer" />{topMat && <span className="card-title-mono">★ {topMat[0]}</span>}</div>
          <div className="card-pad">
            <div className="chart6">
              {months.map((m, i) => (
                <div className="ch-col" key={i} title={store.money(m.rev)}>
                  <div className="ch-bars">
                    <div className="ch-bar rev" style={{ height: (m.rev / maxRev * 100) + '%' }}><span className="ch-prof" style={{ height: (m.rev > 0 ? (m.prof / m.rev * 100) : 0) + '%' }} /></div>
                  </div>
                  <span className="ch-lbl">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span><i className="lg rev" />{t('kpi_revenue')}</span>
              <span><i className="lg prof" />{t('kpi_profit')}</span>
            </div>
          </div>
        </div>

        {/* peças mais lucrativas */}
        <div className="card">
          <div className="card-head"><Icon name="coins" className="ico" /><h3>{t('recent_quotes')}</h3></div>
          <div className="card-pad stack" style={{ gap: 7 }}>
            {topParts.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>{t('history_empty')}</div>
              : topParts.map((q, i) => (
                <button key={q.id} className="flex between rank-row" onClick={() => onNavigate('quote', { quote: q })}>
                  <span className="flex" style={{ gap: 9, minWidth: 0 }}><span className="rank-n mono">{i + 1}</span><span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</span></span>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--good)', flex: 'none' }}>{store.money(q.result.totalProfit)}</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* lista de reposição */}
      {lowStock.length > 0 && (
        <div className="card" style={{ marginTop: 16, borderColor: 'oklch(from var(--accent) l c h / 0.4)' }}>
          <div className="card-head"><Icon name="cart" className="ico" /><h3>{t('restock_title')}</h3>
            <div className="spacer" /><span className="tag accent">{lowStock.length}</span></div>
          <div className="card-pad restock-grid">
            {lowStock.map(m => {
              const total = (m.spoolWeight || 1000) * (m.spools || 1);
              const rem = m.remainingG != null ? m.remainingG : total;
              return (
                <div className="restock-item" key={m.id}>
                  <span className="cal-dot" style={{ background: m.color, width: 10, height: 10 }} />
                  <span className="ri-name">{m.name}</span>
                  <span className="ri-rem mono">{rem.toFixed(0)}g</span>
                  <button className="ri-buy" onClick={() => { store.updateMaterial(m.id, { spools: (m.spools || 0) + 1, remainingG: rem + (m.spoolWeight || 1000) }); if (window.FX) FX.cling(store.settings.soundOn); }}>
                    <Icon name="plus" />{t('buy_n')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {/* estoque */}
        <div className="card">
          <div className="card-head"><Icon name="alert" className="ico" /><h3>{t('stock_alerts')}</h3>
            <div className="spacer" />{lowStock.length > 0 && <span className="tag accent">{lowStock.length}</span>}</div>
          <div className="card-pad stack" style={{ gap: 8 }}>
            {lowStock.length === 0 ? (
              <div className="flex" style={{ gap: 9, color: 'var(--good)', fontSize: 13 }}><Icon name="check" style={{ width: 16, height: 16 }} />{t('all_ok')}</div>
            ) : lowStock.map(m => {
              const total = (m.spoolWeight || 1000) * (m.spools || 1);
              const rem = m.remainingG != null ? m.remainingG : total;
              return (
                <button key={m.id} className="flex between" onClick={() => onNavigate('materials')} style={{ padding: '6px 8px', borderRadius: 2, width: '100%', textAlign: 'left' }}>
                  <span className="flex" style={{ gap: 9 }}><span className="cal-dot" style={{ background: m.color, width: 9, height: 9 }} /><span style={{ fontSize: 13 }}>{m.name}</span></span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{rem.toFixed(0)}g</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* próximas impressões */}
        <div className="card">
          <div className="card-head"><Icon name="calendar" className="ico" /><h3>{t('upcoming')}</h3></div>
          <div className="card-pad stack" style={{ gap: 6 }}>
            {upcoming.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>{t('no_jobs')}</div>
              : upcoming.map(j => (
                <button key={j.id} className="flex between" onClick={() => onNavigate('schedule')} style={{ padding: '6px 8px', borderRadius: 2, width: '100%', textAlign: 'left', gap: 8 }}>
                  <span className="flex" style={{ gap: 8, minWidth: 0 }}><span className="mono muted" style={{ fontSize: 10, flex: 'none' }}>{store.settings.lang === 'pt' ? j.date.slice(8) + '/' + j.date.slice(5, 7) : j.date.slice(5, 7) + '/' + j.date.slice(8)}</span>
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span></span>
                  <StatusBadge status={j.status} lang={store.settings.lang} />
                </button>
              ))}
          </div>
        </div>

        {/* recentes */}
        <div className="card">
          <div className="card-head"><Icon name="history" className="ico" /><h3>{t('recent_quotes')}</h3>
            <div className="spacer" /><Button variant="subtle" size="sm" onClick={() => onNavigate('history')}>→</Button></div>
          <div className="card-pad stack" style={{ gap: 6 }}>
            {recent.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>{t('history_empty')}</div>
              : recent.map(q => (
                <button key={q.id} className="flex between" onClick={() => onNavigate('quote', { quote: q })} style={{ padding: '6px 8px', borderRadius: 2, width: '100%', textAlign: 'left' }}>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{q.name}</span>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12.5, flex: 'none' }}>{store.money(q.result.totalPrice)}</span>
                </button>
              ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
