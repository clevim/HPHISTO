/* Command Palette (Cmd/Ctrl+K) + atalhos de teclado */

function CommandPalette({ store, navigate, screen }) {
  const t = store.t;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef();

  const NAV = [
    { id: 'dash', icon: 'grid', label: t('nav_dash'), key: '1' },
    { id: 'calc', icon: 'calc', label: t('nav_calc'), key: '2' },
    { id: 'catalog', icon: 'box', label: t('nav_catalog'), key: '3' },
    { id: 'clients', icon: 'user', label: t('nav_clients'), key: '4' },
    { id: 'schedule', icon: 'calendar', label: t('nav_schedule'), key: '5' },
    { id: 'history', icon: 'history', label: t('nav_history'), key: '6' },
    { id: 'printers', icon: 'printer', label: t('nav_printers'), key: '7' },
    { id: 'materials', icon: 'layers', label: t('nav_materials'), key: '8' },
    { id: 'settings', icon: 'settings', label: t('nav_settings'), key: '9' },
  ];

  // monta a lista de comandos (navegação + ações + busca em materiais/orçamentos)
  const commands = [];
  NAV.forEach(n => commands.push({ type: 'nav', id: n.id, icon: n.icon, label: n.label, hint: t('cmd_go'), key: n.key, run: () => navigate(n.id) }));
  commands.push({ type: 'action', icon: 'plus', label: t('new_quote'), hint: t('nav_calc'), run: () => navigate('calc', { loadInput: null, fresh: Date.now() }) });
  store.materials.forEach(m => commands.push({ type: 'mat', icon: 'spool', label: m.name, hint: t('nav_materials'), color: m.color, run: () => navigate('materials') }));
  (store.clients || []).forEach(c => commands.push({ type: 'cli', icon: 'user', label: c.name, hint: t('nav_clients'), run: () => navigate('clients') }));
  store.catalog.forEach(p => commands.push({ type: 'prod', icon: 'box', label: p.name, hint: t('quote_product'), color: p.color, run: () => navigate('calc', { loadInput: { ...p.input } }) }));
  store.history.slice(0, 20).forEach(h => commands.push({ type: 'quote', icon: 'doc', label: h.name, hint: t('nav_history'), run: () => navigate('quote', { quote: h }) }));

  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = q.trim()
    ? commands.filter(c => norm(c.label + ' ' + c.hint).includes(norm(q))).slice(0, 12)
    : commands.slice(0, 9);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      // abre/fecha
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); setQ(''); setSel(0); return; }
      if (e.key === 'Escape' && open) { setOpen(false); return; }
      // atalhos numéricos de navegação (fora de inputs e fora do palette)
      if (!typing && !open && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const n = NAV.find(x => x.key === e.key);
        if (n) { e.preventDefault(); navigate(n.id); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, navigate]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useEffect(() => { setSel(0); }, [q]);

  if (!open) return null;

  const choose = (c) => { setOpen(false); c.run(); };
  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[sel]) choose(filtered[sel]); }
  };

  return (
    <div className="cmdk-scrim" onMouseDown={() => setOpen(false)}>
      <div className="cmdk" onMouseDown={e => e.stopPropagation()}>
        <div className="cmdk-head">
          <Icon name="search" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onInputKey}
            placeholder={t('cmd_placeholder')} />
          <kbd>ESC</kbd>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty mono">{t('cmd_empty')}</div>}
          {filtered.map((c, i) => (
            <button key={c.type + (c.id || c.label) + i} className={'cmdk-item' + (i === sel ? ' on' : '')}
              onMouseEnter={() => setSel(i)} onClick={() => choose(c)}>
              {c.color
                ? <span className="cmdk-dot" style={{ background: c.color }} />
                : <span className="cmdk-ico"><Icon name={c.icon} /></span>}
              <span className="cmdk-label">{c.label}</span>
              <span className="cmdk-hint mono">{c.hint}</span>
              {c.key && <kbd className="cmdk-key">{c.key}</kbd>}
            </button>
          ))}
        </div>
        <div className="cmdk-foot mono">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t('cmd_nav')}</span>
          <span><kbd>↵</kbd> {t('cmd_open')}</span>
          <span><kbd>1–9</kbd> {t('cmd_jump')}</span>
        </div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
