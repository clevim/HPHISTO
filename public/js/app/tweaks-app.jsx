/* Painel de Tweaks — direções visuais do console + ajustes finos */

const CALC_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "console",
  "accent": "#E8A33B",
  "displayFont": "Bricolage Grotesque",
  "density": "regular",
  "radius": 3
}/*EDITMODE-END*/;

const ACCENTS = {
  console:   ['#E8A33B', '#E8743B', '#5BD16B', '#3BC4C4'],
  blueprint: ['#3BC4D1', '#5B9BE8', '#6BD16B', '#E8A33B'],
  paper:     ['#C4422E', '#2A6FDB', '#1F8A5B', '#B5851F'],
};
const DISPLAY_FONTS = ['Bricolage Grotesque', 'Space Grotesk', 'Archivo', 'Syne'];

function TweaksApp() {
  const [t, setTweak] = useTweaks(CALC_TWEAK_DEFAULTS);
  const store = useStore();

  // fonte/densidade/cantos ficam no painel; cor e tema vêm do store (Ajustes)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--radius', t.radius + 'px');
    root.style.setProperty('--density', t.density === 'compact' ? '0.82' : t.density === 'comfy' ? '1.18' : '1');
    root.style.setProperty('--font-display', `'${t.displayFont}', system-ui, sans-serif`);
    root.style.setProperty('--font-ui', `'${t.displayFont}', system-ui, sans-serif`);
  }, [t.radius, t.density, t.displayFont]);

  const accent = store.settings.accent;
  const theme = store.settings.theme;
  const setTheme = (th) => store.updateSettings({ theme: th, accent: ACCENTS[th] ? ACCENTS[th][0] : accent });

  return (
    <>
      <link href={`https://fonts.googleapis.com/css2?family=${DISPLAY_FONTS.map(f => f.replace(/ /g, '+') + ':wght@400;500;600;700;800').join('&family=')}&display=swap`} rel="stylesheet" />
      <TweaksPanel>
        <TweakSection label="Console / direção visual" />
        <TweakRadio label="Tema" value={theme} options={['console', 'blueprint', 'paper']} onChange={setTheme} />
        <TweakColor label="Cor de sinal" value={accent} options={ACCENTS[theme] || ACCENTS.console} onChange={(v) => store.updateSettings({ accent: v })} />
        <TweakSection label="Tipografia & forma" />
        <TweakSelect label="Fonte" value={t.displayFont} options={DISPLAY_FONTS} onChange={(v) => setTweak('displayFont', v)} />
        <TweakRadio label="Densidade" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
        <TweakSlider label="Cantos" value={t.radius} min={0} max={14} step={1} unit="px" onChange={(v) => setTweak('radius', v)} />
      </TweaksPanel>
    </>
  );
}

window.TweaksApp = TweaksApp;
