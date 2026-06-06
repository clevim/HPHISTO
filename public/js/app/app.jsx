/* App shell — sem menu topo. Navegação via HUB (carretel) + lançador orbital flutuante. */

function OrbitLauncher({ navigate, active, t, onNewQuote }) {
  const [open, setOpen] = useState(false);
  const nav = [
    { id: 'dash', icon: 'grid', label: t('nav_dash') },
    { id: 'calc', icon: 'calc', label: t('nav_calc') },
    { id: 'catalog', icon: 'box', label: t('nav_catalog') },
    { id: 'clients', icon: 'user', label: t('nav_clients') },
    { id: 'schedule', icon: 'calendar', label: t('nav_schedule') },
    { id: 'history', icon: 'history', label: t('nav_history') },
    { id: 'printers', icon: 'printer', label: t('nav_printers') },
    { id: 'materials', icon: 'layers', label: t('nav_materials') },
    { id: 'settings', icon: 'settings', label: t('nav_settings') },
  ];
  // arco dos nós de navegação (esquerda → cima) + nó primário destacado no topo
  const A0 = 180, A1 = 258, Rnav = 214;
  const rad = (d) => d * Math.PI / 180;
  const pos = (deg, r) => ({ dx: Math.cos(rad(deg)) * r, dy: Math.sin(rad(deg)) * r });
  const prim = pos(267, 256);

  const go = (id) => { setOpen(false); if (id === 'newquote') onNewQuote(); else navigate(id); };

  return (
    <>
      {open && <div className="orbit-scrim" onClick={() => setOpen(false)} />}
      <div className={'orbit-launcher' + (open ? ' open' : '')}>
        <div className="orbit-nodes">
          {nav.map((n, i) => {
            const { dx, dy } = pos(A0 + (i / (nav.length - 1)) * (A1 - A0), Rnav);
            return (
              <button key={n.id} className={'orbit-node' + (active === n.id ? ' on' : '')}
                style={{ transform: open ? `translate(${dx}px, ${dy}px)` : 'translate(0,0)', transitionDelay: (open ? i * 26 : 0) + 'ms' }}
                onClick={() => go(n.id)} title={n.label}>
                <Icon name={n.icon} />
                <span className="on-label">{n.label}</span>
              </button>
            );
          })}
          <button className="orbit-node primary"
            style={{ transform: open ? `translate(${prim.dx}px, ${prim.dy}px)` : 'translate(0,0)', transitionDelay: (open ? nav.length * 26 + 30 : 0) + 'ms' }}
            onClick={() => go('newquote')} title={t('new_quote')}>
            <Icon name="plus" />
            <span className="on-label top">{t('new_quote')}</span>
          </button>
        </div>
        <button className="orbit-btn" onClick={() => setOpen(o => !o)} title="Menu">
          <span className="orbit-spool">
            <span className="os-ring" /><span className="os-ring os-ring2" /><span className="os-hub">
              <Icon name={open ? 'x' : 'cube'} />
            </span>
          </span>
        </button>
      </div>
    </>
  );
}

function App() {
  const store = useStore();
  const t = store.t;
  const [screen, setScreen] = useState('dash');

  // aplica cor principal + tema globalmente quando mudam
  useEffect(() => {
    if (window.applyAppTheme) window.applyAppTheme(store.settings);
  }, [store.settings.accent, store.settings.theme]);
  const [params, setParams] = useState({});

  const navigate = (s, p = {}) => { setParams(p); setScreen(s); document.querySelector('.main')?.scrollTo(0, 0); };

  const titles = {
    dash: [t('dash_title'), t('dash_sub')],
    calc: [t('calc_title'), t('calc_sub')],
    catalog: [t('catalog_title'), t('catalog_sub')],
    clients: [t('nav_clients'), 'crm'],
    schedule: [t('schedule_title'), t('schedule_sub')],
    history: [t('history_title'), 'log'],
    printers: [t('nav_printers'), 'hardware'],
    materials: [t('nav_materials'), 'filament'],
    settings: [t('settings_title'), 'config'],
    quote: [t('export_pdf'), 'pdf'],
  };
  const active = screen === 'quote' ? 'history' : screen;

  let content;
  if (screen === 'dash') content = <DashboardScreen onNavigate={navigate} />;
  else if (screen === 'calc') content = <CalculatorScreen key={params.fresh || (params.loadInput ? params.loadInput.name + (params.loadInput.savedAt || '') : 'main')} initial={params.loadInput} onNavigate={navigate} />;
  else if (screen === 'history') content = <HistoryScreen onNavigate={navigate} flash={params.flash} />;
  else if (screen === 'catalog') content = <CatalogScreen onNavigate={navigate} flash={params.flash} />;
  else if (screen === 'clients') content = <ClientsScreen onNavigate={navigate} />;
  else if (screen === 'schedule') content = <ScheduleScreen newJobQuoteId={params.newJobQuoteId} />;
  else if (screen === 'quote') content = <QuoteScreen quote={params.quote} onNavigate={navigate} />;
  else if (screen === 'printers') content = <PrintersScreen />;
  else if (screen === 'materials') content = <MaterialsScreen />;
  else if (screen === 'settings') content = <SettingsScreen />;

  return (
    <div className={'app' + (store.isDemo ? ' has-demo-bar' : '')}>
      <main className={'main' + (screen === 'dash' ? ' dash-mode' : '')}>
        {screen !== 'dash' && (
        <div className="screen-head no-print">
          <button className="screen-home" onClick={() => navigate('dash')} title={t('nav_dash')}>
            <span className="sh-mark"><img src="assets/logo-mark.png" alt="HΦSTO" /></span>
            <Icon name="chevL" style={{ width: 14, height: 14, opacity: .6 }} />
          </button>
          <div>
            <h1>{titles[screen]?.[0]}</h1>
            {titles[screen]?.[1] && <div className="sub">[ {titles[screen][1]} ]</div>}
          </div>
          <div className="topbar-spacer" />
        </div>
        )}
        {content}
      </main>

      {screen !== 'dash' && <OrbitLauncher navigate={navigate} active={active} t={t} onNewQuote={() => navigate('calc', { loadInput: null, fresh: Date.now() })} />}
      <CommandPalette store={store} navigate={navigate} screen={screen} />

      {store.isDemo && (
        <div className="demo-bar no-print">
          <span className="demo-bar-dot" />
          <span className="demo-bar-label">MODO DEMONSTRAÇÃO</span>
          <span className="demo-bar-hint">Nenhuma alteração é salva</span>
          <span className="demo-bar-sep" />
          <a href="Cadastro.html" className="demo-bar-btn accent">Criar conta</a>
          <a href="Login.html" className="demo-bar-btn">Entrar</a>
        </div>
      )}
    </div>
  );
}

window.App = App;
