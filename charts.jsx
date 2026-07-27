/* Automind · gráficos SVG interactivos (sin librerías) */

/* Donut de distribución por semáforo. Segmentos clicables. */
function Donut({ segs, activeKey, onPick, size = 188, thick = 30 }) {
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thick) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let off = 0;
  const arcs = segs.map((s) => {
    const frac = s.value / total;
    const len = frac * C;
    const dim = activeKey && activeKey !== s.key;
    const el = (
      <circle key={s.key} cx={cx} cy={cy} r={r} fill="none"
        stroke={s.color} strokeWidth={activeKey === s.key ? thick + 6 : thick}
        strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
        strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ cursor: "pointer", opacity: dim ? 0.32 : 1, transition: "opacity .2s, stroke-width .2s" }}
        onClick={() => onPick && onPick(activeKey === s.key ? null : s.key)} />
    );
    off += len;
    return el;
  });
  const focus = segs.find((s) => s.key === activeKey);
  const shown = focus ? focus.value : total;
  const shownLbl = focus ? focus.label : "Unidades";
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} className="donut">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f6" strokeWidth={thick} />
        {arcs}
        <text x={cx} y={cy - 4} className="donut-num" textAnchor="middle">{shown}</text>
        <text x={cx} y={cy + 16} className="donut-lbl" textAnchor="middle">{shownLbl}</text>
      </svg>
      <div className="donut-legend">
        {segs.map((s) => (
          <button key={s.key} className={"leg-row" + (activeKey === s.key ? " on" : "")}
            onClick={() => onPick && onPick(activeKey === s.key ? null : s.key)}>
            <span className="leg-dot" style={{ background: s.color }} />
            <span className="leg-name">{s.label}</span>
            <span className="leg-val">{s.value}</span>
            <span className="leg-pct">{Math.round((s.value / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Histograma de antigüedad (días en piso) por tramo, coloreado por urgencia. */
function AgingHistogram({ rows }) {
  const buckets = [
    { lbl: "0–30",   min: 0,   max: 30,   color: SEM.saludable.sol },
    { lbl: "31–60",  min: 31,  max: 60,   color: SEM.rotacion.sol },
    { lbl: "61–90",  min: 61,  max: 90,   color: SEM.comprometido.sol },
    { lbl: "91–120", min: 91,  max: 120,  color: SEM.vencer.sol },
    { lbl: "120+",   min: 121, max: 9999, color: SEM.intereses.sol },
  ];
  const counts = buckets.map((b) => rows.filter((r) => r.diasEnPiso >= b.min && r.diasEnPiso <= b.max).length);
  const max = Math.max(...counts, 1);
  return (
    <div className="hist">
      {buckets.map((b, i) => (
        <div className="hist-col" key={b.lbl}>
          <div className="hist-track">
            <div className="hist-bar" style={{ height: (counts[i] / max) * 100 + "%", background: b.color }}>
              <span className="hist-cnt">{counts[i]}</span>
            </div>
          </div>
          <span className="hist-lbl">{b.lbl}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Donut, AgingHistogram });
