/* BuildChamber — peça impressa em ISOMÉTRICO, anotada como um desenho de engenharia.
   A altura da peça É o preço. Cada estrato = um componente de custo.
   Quando um G-code é importado, mostra um MODELO de exemplo na cama. */

// ---- modelos de exemplo (footprints no plano da mesa) ----
function nGon(n, r, cx, cy, rot) {
  const p = []; rot = rot || 0;
  for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
function gearPts(teeth, r1, r2, cx, cy) {
  const p = [], n = teeth * 2;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const r = i % 2 ? r2 : r1; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
const MODEL_KINDS = ['vase', 'cylinder', 'gear', 'cube', 'prism'];
function pickModel(name) {
  if (!name) return 'cube';
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return MODEL_KINDS[h % MODEL_KINDS.length];
}

// ---- gerador de FORMA DIVERTIDA: pilha de N camadas que muda sozinha ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// retorna {layers:[{ring:[[x,y]...], zp}], maxR}  no espaço de unidades centrado em (cx,cy)
function genFunShape(nLayers, seed, time, cx, cy, hPx, projZmax) {
  const rnd = mulberry32(seed);
  const N = Math.max(3, Math.min(48, nLayers));
  // "personalidade" da forma
  const lobes = 2 + Math.floor(rnd() * 6);            // nº de gomos
  const lobeAmp = 0.10 + rnd() * 0.35;                // o quão ondulada
  const twist = (rnd() - 0.5) * 4.2;                  // torção ao subir
  const spin = (rnd() - 0.5) * 1.4 + 0.5;             // giro automático
  const wob = 0.5 + rnd() * 1.6;                      // velocidade da ondinha
  const baseR = 0.34 + rnd() * 0.12;
  // perfil de raio ao longo da altura (bojos aleatórios → vaso/boneco/pião)
  const nb = 2 + Math.floor(rnd() * 3);
  const bumps = [];
  for (let k = 0; k < nb; k++) bumps.push({ h: rnd(), w: 0.06 + rnd() * 0.16, a: (rnd() - 0.5) * 1.3 });
  const profile = (u) => {
    let r = 1;
    for (const b of bumps) r += b.a * Math.exp(-((u - b.h) * (u - b.h)) / (2 * b.w * b.w));
    // afunila um pouco no topo, base cheia
    r *= 0.7 + 0.5 * Math.sin(Math.PI * (0.15 + u * 0.7));
    return Math.max(0.16, r);
  };
  const SEG = 26;
  const layers = [];
  let maxR = 0;
  for (let i = 0; i < N; i++) {
    const u = N === 1 ? 0 : i / (N - 1);
    const zp = u * hPx;
    const rBase = baseR * profile(u);
    const phase = u * twist + time * wob;
    const rot = time * spin + u * twist * 0.4;
    const ring = [];
    for (let s = 0; s <= SEG; s++) {
      const a = s / SEG * Math.PI * 2;
      const wobble = 1 + lobeAmp * Math.sin(lobes * a + phase) + 0.06 * Math.sin(3 * a - time * 1.3);
      const r = rBase * wobble;
      if (r > maxR) maxR = r;
      ring.push([cx + r * Math.cos(a + rot), cy + r * Math.sin(a + rot)]);
    }
    layers.push({ ring, zp });
  }
  return { layers, maxR, N };
}


function BuildChamber({ result, store, input, material }) {
  const t = store.t;
  const lines = result.lines;
  const hasData = lines.length > 0 && result.unitCost > 0;
  const lineLabel = (key) => key === 'material_cost' ? t('material_cost') : t(key);
  const isModel = !!(input && input.gcodeName && material);

  // animação da forma divertida + troca automática de "personalidade"
  const [tick, setTick] = useState(0);
  const [shapeSeed, setShapeSeed] = useState(() => Math.floor(Math.random() * 99999));
  useEffect(() => {
    if (!isModel) return;
    const iv = setInterval(() => setTick(x => x + 1), 90);          // morph contínuo
    const sv = setInterval(() => setShapeSeed(Math.floor(Math.random() * 99999)), 4200); // nova forma sozinho
    return () => { clearInterval(iv); clearInterval(sv); };
  }, [isModel]);
  // nova personalidade quando troca o arquivo
  useEffect(() => { if (input && input.gcodeName) setShapeSeed(Math.floor(Math.random() * 99999)); }, [input && input.gcodeName]);

  // ----- projeção isométrica -----
  const U = 60, C = Math.cos(Math.PI / 6) * U, S = Math.sin(Math.PI / 6) * U; // unidade XY
  const W = 1.7, D = 1.7;                       // base da peça (unidades)
  const proj = (x, y, z) => ({ x: (x - y) * C, y: (x + y) * S - z });
  const pt = (x, y, z) => { const p = proj(x, y, z); return p.x.toFixed(1) + ',' + p.y.toFixed(1); };

  // altura total (px) — escala log pra não estourar
  const topZ = hasData ? Math.min(232, 34 + Math.log10(1 + result.unitCost) * 78) : 0;

  // estratos acumulados
  let acc = 0;
  const strata = lines.map(l => {
    const h = (l.value / result.unitCost) * topZ;
    const s = { ...l, z0: acc, z1: acc + h, h };
    acc += h; return s;
  });

  const darker = (c, p) => `color-mix(in oklab, ${c}, #000 ${p}%)`;
  const lighter = (c, p) => `color-mix(in oklab, ${c}, #fff ${p}%)`;

  // ----- MODELO de exemplo (quando G-code importado) -----
  const mColor = (material && material.color) || 'var(--accent)';
  const mKind = isModel ? pickModel(input.gcodeName) : null;
  const mcx = W / 2, mcy = D / 2;
  let mFoot = null, mH = Math.max(50, topZ);
  if (isModel) {
    if (mKind === 'cube') mFoot = nGon(4, 0.58, mcx, mcy, Math.PI / 4);
    else if (mKind === 'cylinder') mFoot = nGon(16, 0.58, mcx, mcy, 0);
    else if (mKind === 'vase') { mFoot = nGon(8, 0.5, mcx, mcy, Math.PI / 8); mH = Math.max(78, topZ * 1.3); }
    else if (mKind === 'gear') { mFoot = gearPts(9, 0.68, 0.5, mcx, mcy); mH = Math.max(38, topZ * 0.55); }
    else mFoot = nGon(3, 0.7, mcx, mcy, -Math.PI / 2); // prism
  }
  const mFaces = [];
  if (mFoot) {
    for (let i = 0; i < mFoot.length; i++) {
      const a = mFoot[i], b = mFoot[(i + 1) % mFoot.length];
      const cxF = (a[0] + b[0]) / 2, cyF = (a[1] + b[1]) / 2;
      const nx = b[1] - a[1], ny = -(b[0] - a[0]);
      let fill;
      if (nx >= 0 && nx >= ny) fill = darker(mColor, 24);
      else if (ny >= 0) fill = mColor;
      else fill = darker(mColor, 44);
      mFaces.push({ d: cxF + cyF, pts: `${pt(a[0], a[1], 0)} ${pt(b[0], b[1], 0)} ${pt(b[0], b[1], mH)} ${pt(a[0], a[1], mH)}` , fill });
    }
    mFaces.sort((p, q) => p.d - q.d);
  }
  const mTop = mFoot ? mFoot.map(p => pt(p[0], p[1], mH)).join(' ') : '';
  // linhas de camada do modelo (na face frontal)
  const mLayers = [];
  if (mFoot) for (let z = 0; z <= mH; z += 5.5) mLayers.push(z);

  // ----- FORMA DIVERTIDA generativa (usa nº de camadas do G-code) -----
  const funLayers0 = isModel && input.gcodeGeo && input.gcodeGeo.nLayers ? input.gcodeGeo.nLayers : (isModel ? 14 : 0);
  const funHpx = isModel ? Math.min(212, Math.max(54, (funLayers0 - 1) * 8.2)) : 0;
  const mcx2 = W / 2, mcy2 = D / 2;
  const fun = isModel ? genFunShape(funLayers0, shapeSeed, tick * 0.09, mcx2, mcy2, funHpx) : null;
  const funPaths = fun ? fun.layers.map((L, i) => {
    let d = '';
    for (let k = 0; k < L.ring.length; k++) {
      const p = proj(L.ring[k][0], L.ring[k][1], L.zp);
      d += (k === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' ';
    }
    return { d: d + 'Z', zp: L.zp, i };
  }) : null;
  const useFun = isModel && funPaths && funPaths.length > 1;

  // G-code caminhos reais — renderiza as layers do parseGcodeGeo
  const geoData = isModel && input.gcodeGeo && input.gcodeGeo.layers && input.gcodeGeo.layers.length > 0 ? input.gcodeGeo : null;
  const useGco = !!geoData;
  let gcoPaths = null, gcoH = 0;
  if (useGco) {
    const b = geoData.bounds;
    // Recomputa bounds XY a partir das layers escolhidas — evita que linhas de purga
    // do slicer (prime line na borda da mesa) inflacionem a escala e deixem o modelo minúsculo
    let bx0=1e9, bx1=-1e9, by0=1e9, by1=-1e9;
    geoData.layers.forEach(l => l.pts.forEach(p => {
      if(p[0]<bx0) bx0=p[0]; if(p[0]>bx1) bx1=p[0];
      if(p[1]<by0) by0=p[1]; if(p[1]>by1) by1=p[1];
    }));
    const gW  = Math.max(bx1 - bx0, 0.001);
    const gD  = Math.max(by1 - by0, 0.001);
    const gZr = Math.max(b.maxz - b.minz, 0.001);
    const cxB = (bx0 + bx1) / 2, cyB = (by0 + by1) / 2;
    const xyScale = Math.min((W * 0.82) / gW, (D * 0.82) / gD);
    // Z: cap em ~108px (~1.5× o footprint visual de 72px) para não parecer esticado
    const zScale = Math.max(48 / gZr, Math.min(108 / gZr, 2.2));
    gcoH = gZr * zScale;
    const rot = tick * 0.09;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    const cx = W / 2, cy = D / 2;
    gcoPaths = geoData.layers.map((layer) => {
      const hz = Math.max(0, (layer.z - b.minz) * zScale);
      let d = '';
      for (let k = 0; k < layer.pts.length; k++) {
        const ux = (layer.pts[k][0] - cxB) * xyScale + cx;
        const uy = (layer.pts[k][1] - cyB) * xyScale + cy;
        const rx = (ux - cx) * cosR - (uy - cy) * sinR + cx;
        const ry = (ux - cx) * sinR + (uy - cy) * cosR + cy;
        const p = proj(rx, ry, hz);
        d += (k === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' ';
      }
      return { d: d + 'Z', hz };
    });
  }

  const visH = useGco ? gcoH : (useFun ? funHpx : topZ);

  // faces visíveis: FRENTE (y=D) e DIREITA (x=W)
  const frontFace = (z0, z1) => `${pt(0, D, z0)} ${pt(W, D, z0)} ${pt(W, D, z1)} ${pt(0, D, z1)}`;
  const rightFace = (z0, z1) => `${pt(W, 0, z0)} ${pt(W, D, z0)} ${pt(W, D, z1)} ${pt(W, 0, z1)}`;
  const topFace = (z) => `${pt(0, 0, z)} ${pt(W, 0, z)} ${pt(W, D, z)} ${pt(0, D, z)}`;

  // linhas de camada (a cada ~5.5px de z)
  const layerLines = [];
  if (hasData) for (let z = 0; z <= topZ; z += 5.5) {
    layerLines.push(['F', `M ${pt(0, D, z)} L ${pt(W, D, z)}`]);
    layerLines.push(['R', `M ${pt(W, 0, z)} L ${pt(W, D, z)}`]);
  }

  // mesa (com sobra) em z=0
  const be = 0.5;
  const bedTop = `${pt(-be, -be, 0)} ${pt(W + be, -be, 0)} ${pt(W + be, D + be, 0)} ${pt(-be, D + be, 0)}`;
  const bedFrontR = `${pt(W + be, -be, 0)} ${pt(W + be, D + be, 0)} ${pt(W + be, D + be, -8)} ${pt(W + be, -be, -8)}`;
  const bedFrontL = `${pt(-be, D + be, 0)} ${pt(W + be, D + be, 0)} ${pt(W + be, D + be, -8)} ${pt(-be, D + be, -8)}`;

  // postes traseiros + viga (frame da impressora)
  const frameTop = 268;
  const postBL = `M ${pt(-be, -be, 0)} L ${pt(-be, -be, frameTop)}`;
  const postBR = `M ${pt(W + be, -be, 0)} L ${pt(W + be, -be, frameTop)}`;
  const beam = `M ${pt(-be, -be, frameTop)} L ${pt(W + be, -be, frameTop)}`;

  // cabeçote: centro da peça no topo
  const head = proj(W / 2, D / 2, Math.max(visH, 6) + 10);
  const railL = proj(-be, D / 2, frameTop), railR = proj(W + be, D / 2, frameTop);

  // cota vertical (dimensão) à direita = preço
  const dimX = (W + be) * C + 24;
  const dimBase = proj(W + be, -be, 0);
  const dimTopP = proj(W + be, -be, Math.max(topZ, 6));

  return (
    <div className={'chamber' + (hasData || useGco ? '' : ' idle')}>
      {/* título do desenho / readout */}
      <div className="chamber-head">
        <div className="chamber-status">
          <span className="led" />{hasData ? (t('printing_cost') || 'IMPRIMINDO') : (useGco ? (t('gcode_loaded') || 'G-CODE') : (t('standby') || 'EM ESPERA'))}
          <span style={{ opacity: .5, marginLeft: 4 }}>· {useGco ? geoData.nLayers + ' ' + (t('layers_n') || 'CAMADAS') : useFun ? funPaths.length + ' ' + (t('layers_n') || 'CAMADAS') : result.lines.length + ' ' + (t('cost_items') || 'CUSTOS')}</span>
        </div>
        <div className="lcd">
          <span className="lcd-cur">{store.curSymbol()}</span>
          <span className="lcd-num">{I18N.num(result.unitPrice, store.settings, 2)}</span>
        </div>
      </div>

      <div className="build-bay">
        <span className="viewport-tag">▸ Chamber Cam · Live</span>
        <svg className="iso" viewBox="-170 -258 340 408" preserveAspectRatio="xMidYMax meet">
          <defs>
            <marker id="arr" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
              <path d="M1,1 L8,4.5 L1,8" fill="none" stroke="var(--accent)" strokeWidth="1.1" />
            </marker>
          </defs>

          {/* frame traseiro */}
          <g className="iso-frame">
            <path d={postBL} /><path d={postBR} /><path d={beam} />
          </g>

          {/* mesa */}
          <g className="iso-bed">
            <polygon points={bedFrontL} className="bed-side bed-side-l" />
            <polygon points={bedFrontR} className="bed-side bed-side-r" />
            <polygon points={bedTop} className="bed-top" />
            {/* grade da mesa */}
            {[0.34, 0.68, 1.02, 1.36].map((g, i) => (
              <g key={i}>
                <line x1={proj(g, -be, 0).x} y1={proj(g, -be, 0).y} x2={proj(g, D + be, 0).x} y2={proj(g, D + be, 0).y} className="bed-grid" />
                <line x1={proj(-be, g, 0).x} y1={proj(-be, g, 0).y} x2={proj(W + be, g, 0).x} y2={proj(W + be, g, 0).y} className="bed-grid" />
              </g>
            ))}
          </g>

          {/* PEÇA — estratos de custo (modo manual) */}
          {hasData && !isModel && (
            <g className="iso-part">
              {strata.map(s => (
                <g key={s.key}>
                  <polygon points={rightFace(s.z0, s.z1)} fill={darker(s.color, 26)} />
                  <polygon points={frontFace(s.z0, s.z1)} fill={s.color}>
                    <title>{lineLabel(s.key)} · {store.money(s.value)}</title>
                  </polygon>
                </g>
              ))}
              <polygon points={topFace(topZ)} fill={lighter(strata[strata.length - 1].color, 16)} />
              {/* linhas de camada */}
              <g className="iso-layerlines">
                {layerLines.map((l, i) => <path key={i} d={l[1]} />)}
              </g>
              {/* silhueta */}
              <g className="iso-outline">
                <path d={`M ${pt(0, D, 0)} L ${pt(W, D, 0)} L ${pt(W, 0, 0)}`} />
                <path d={`M ${pt(0, D, 0)} L ${pt(0, D, topZ)} L ${pt(W, D, topZ)} L ${pt(W, D, 0)}`} />
                <path d={`M ${pt(W, D, topZ)} L ${pt(W, 0, topZ)} L ${pt(W, 0, 0)}`} />
                <path d={`M ${pt(0, 0, topZ)} L ${pt(W, 0, topZ)} M ${pt(0, 0, topZ)} L ${pt(0, D, topZ)}`} />
              </g>
            </g>
          )}

          {/* G-CODE modelo real — layers do parseGcodeGeo */}
          {isModel && useGco && gcoPaths && gcoPaths.length > 0 && (
            <g className="iso-gco">
              {gcoPaths.map((L, i) => {
                const tt = i / (gcoPaths.length - 1 || 1);
                return (
                  <path key={i} d={L.d}
                    fill={mColor} fillOpacity={0.04 + 0.1 * tt}
                    stroke={mColor} strokeWidth={i === gcoPaths.length - 1 ? 1.5 : 0.7}
                    strokeOpacity={0.28 + 0.68 * tt} strokeLinejoin="round" />
                );
              })}
              <path d={gcoPaths[gcoPaths.length - 1].d} fill={mColor} fillOpacity="0.55"
                stroke={lighter(mColor, 28)} strokeWidth="1.5" strokeLinejoin="round" />
            </g>
          )}

          {/* FORMA DIVERTIDA generativa (muda sozinha) */}
          {hasData && isModel && !useGco && useFun && (
            <g className="iso-fun">
              {funPaths.map((L, i) => {
                const tt = i / (funPaths.length - 1 || 1);
                return (
                  <path key={i} d={L.d} fill={mColor} fillOpacity={0.07 + 0.06 * tt}
                    stroke={mColor} strokeWidth={i === funPaths.length - 1 ? 1.4 : 0.9}
                    strokeOpacity={0.4 + 0.5 * tt} />
                );
              })}
              {/* tampa do topo destacada */}
              <path d={funPaths[funPaths.length - 1].d} fill={lighter(mColor, 16)} fillOpacity="0.55" stroke={lighter(mColor, 32)} strokeWidth="1.2" />
            </g>
          )}

          {/* cota vertical = preço */}
          {hasData && !isModel && topZ > 14 && (
            <g className="iso-dim">
              <line x1={dimBase.x} y1={dimBase.y} x2={dimX} y2={dimBase.y} className="dim-ext" />
              <line x1={dimTopP.x} y1={dimTopP.y} x2={dimX} y2={dimTopP.y} className="dim-ext" />
              <line x1={dimX} y1={dimBase.y} x2={dimX} y2={dimTopP.y} className="dim-line" markerStart="url(#arr)" markerEnd="url(#arr)" />
              <text x={dimX + 13} y={(dimBase.y + dimTopP.y) / 2} className="dim-text" transform={`rotate(-90 ${dimX + 13} ${(dimBase.y + dimTopP.y) / 2})`}>{store.money(result.unitCost)}<tspan className="dim-sub" dx="8">CUSTO/UN</tspan></text>
            </g>
          )}

          {/* cabeçote de impressão */}
          <g className="iso-head" style={{ transform: `translate(${head.x}px, ${head.y}px)` }}>
            <line x1={railL.x - head.x} y1={railL.y - head.y} x2={railR.x - head.x} y2={railR.y - head.y} className="head-rail" />
            <g className="head-bob">
              <rect x="-16" y="-26" width="32" height="15" rx="1" className="head-carriage" />
              <circle className="head-fan" cx="0" cy="-18.5" r="4.5" />
              <polygon points="-6,-11 6,-11 0,0" className="head-nozzle" />
              <circle cx="0" cy="1" r="2.2" className="head-tip" />
            </g>
          </g>
        </svg>

        {/* bobina girando */}
        <div className="chamber-spool" />
        <div className="bed-temp">{useGco ? '▸ ' + geoData.nLayers + ' CAM · ' : isModel && useFun ? '▸ ' + funPaths.length + ' CAMADAS · ' : ''}BED {hasData ? '60°' : '—'} · {result.weight ? result.weight.toFixed(0) + 'G' : '0G'} · {result.hours ? result.hours.toFixed(1) + 'H' : '0H'}</div>

        {!hasData && !useGco && <div className="bay-empty">{t('empty_calc')}</div>}
      </div>
    </div>
  );
}

window.BuildChamber = BuildChamber;
