/* Automind · CRM de Clientes — Pipeline de ventas */

/* ── Configuración de etapas ─────────────────────────────────────────── */
const ETAPAS_CRM = [
  "Prospección","Perfilamiento","Presentación","Cotización",
  "Expediente","Crédito","Pago","Cierre"
];

const ETAPA_CFG = {
  "Prospección":   { bg:"#dbeafe", txt:"#1d4ed8", dot:"#3b82f6" },
  "Perfilamiento": { bg:"#f3e8ff", txt:"#6d28d9", dot:"#8b5cf6" },
  "Presentación":  { bg:"#ffedd5", txt:"#c2410c", dot:"#f97316" },
  "Cotización":    { bg:"#fef9c3", txt:"#854d0e", dot:"#eab308" },
  "Expediente":    { bg:"#fce7f3", txt:"#9d174d", dot:"#ec4899" },
  "Pago":          { bg:"#dcfce7", txt:"#166534", dot:"#22c55e" },
  "Crédito":       { bg:"#fef3c7", txt:"#92400e", dot:"#f59e0b" },
  "Cierre":        { bg:"#d1fae5", txt:"#065f46", dot:"#059669" },
};


/* ── Utilidades de fecha ─────────────────────────────────────────────── */
function _dsc(iso) {
  if (!iso) return 99;
  return Math.round((new Date() - new Date(iso + "T12:00:00")) / 86400000);
}
function _fmtFechaCRM(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"2-digit" });
}

/* ── Componentes pequeños ─────────────────────────────────────────────── */
function EtapaBadge({ etapa }) {
  const c = ETAPA_CFG[etapa] || { bg:"#f3f4f6", txt:"#4b5563", dot:"#9ca3af" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px",
      borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.txt, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, flexShrink:0 }} />
      {etapa}
    </span>
  );
}

function CanalTag({ canal }) {
  const colores = { "Digital":"#3b82f6","Piso":"#8b5cf6","Referido":"#22c55e","Marketplace":"#f59e0b","Otro":"#94a3b8" };
  const color = colores[canal] || "#94a3b8";
  return (
    <span style={{ display:"inline-flex", padding:"1px 8px", borderRadius:20, fontSize:10,
      fontWeight:700, background:color + "1a", color, whiteSpace:"nowrap" }}>
      {canal}
    </span>
  );
}

function DiasTag({ dias }) {
  const color = dias === 0 ? "#22c55e" : dias <= 3 ? "#d99613" : "#e0492f";
  const bg    = dias === 0 ? "#dcfce7" : dias <= 3 ? "#fef9c3" : "#fee2e2";
  return (
    <span style={{ display:"inline-flex", padding:"1px 8px", borderRadius:20, fontSize:11,
      fontWeight:700, background:bg, color }}>
      {dias === 0 ? "hoy" : dias + "d"}
    </span>
  );
}


function Ini({ nombre, bg }) {
  const iniciales = nombre.split(" ").slice(0,2).map(w => w[0] || "").join("").toUpperCase();
  return (
    <div style={{ width:32, height:32, borderRadius:"50%", background:bg || "var(--accent)",
      color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:12, fontWeight:700, flexShrink:0 }}>
      {iniciales}
    </div>
  );
}

/* ── Stats top bar ────────────────────────────────────────────────────── */
/* ── Dashboard de Ventas ──────────────────────────────────────────────── */
function DashboardVentas({ clientes, onOpen }) {
  var hoy   = new Date();
  var total  = clientes.length;

  /* KPIs */
  var urgentes   = clientes.filter(function(c){ return _dsc(c.uc) > 3; });
  var avanzados  = clientes.filter(function(c){ return ["Cotización","Expediente","Pago","Crédito","Cierre"].includes(c.etapa); });
  var nuevos     = clientes.filter(function(c){
    if (!c.uc) return false;
    var d = new Date(c.uc); var diff = (hoy - d) / 864e5; return diff <= 7;
  });

  /* Embudo */
  var porEtapa = ETAPAS_CRM.map(function(e){
    return { etapa: e, count: clientes.filter(function(c){ return c.etapa === e; }).length };
  });
  var maxEtapa = Math.max.apply(null, porEtapa.map(function(e){ return e.count; }).concat([1]));

  /* Canal */
  var CANALES = ["Digital","Piso","Referido","Marketplace","Otro"];
  var CANAL_COLOR = { "Digital":"#3b82f6","Piso":"#8b5cf6","Referido":"#22c55e","Marketplace":"#f59e0b","Otro":"#94a3b8" };
  var porCanal = CANALES.map(function(c){
    return { canal: c, count: clientes.filter(function(x){ return x.canal === c; }).length, color: CANAL_COLOR[c] };
  }).filter(function(c){ return c.count > 0; });
  var totalCanal = porCanal.reduce(function(s,c){ return s + c.count; }, 0) || 1;

  /* Por asesor */
  var asesoresUniq = [];
  clientes.forEach(function(c){ if (c.asesor && !asesoresUniq.includes(c.asesor)) asesoresUniq.push(c.asesor); });
  var porAsesor = asesoresUniq.map(function(a){
    var mis = clientes.filter(function(c){ return c.asesor === a; });
    return {
      asesor:    a,
      total:     mis.length,
      avanzados: mis.filter(function(c){ return ["Cotización","Expediente","Pago","Crédito","Cierre"].includes(c.etapa); }).length,
      urgentes:  mis.filter(function(c){ return _dsc(c.uc) > 3; }).length,
    };
  }).sort(function(a,b){ return b.total - a.total; });

  /* Estilos reutilizables */
  var CARD = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:10, padding:"20px 24px" };
  var LABEL = { fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 };

  function Kpi({ label, value, color, sub }) {
    return (
      <div style={{ ...CARD, minWidth:0 }}>
        <div style={LABEL}>{label}</div>
        <div style={{ fontSize:32, fontWeight:800, lineHeight:1, color: color || "var(--ink)", marginBottom: sub ? 6 : 0 }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding:"24px 32px", maxWidth:1280, margin:"0 auto", display:"flex", flexDirection:"column", gap:18 }}>

      {/* ── Fila 1: KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        <Kpi label="Clientes activos" value={total} />
        <Kpi label="Seguimiento urgente" value={urgentes.length}
          color={urgentes.length > 0 ? "#e0492f" : "#1f9d57"}
          sub={urgentes.length > 0 ? "Sin contacto > 3 días" : "Todos al día"} />
        <Kpi label="En etapa avanzada" value={avanzados.length}
          color={avanzados.length > 0 ? "#1f9d57" : "var(--muted)"}
          sub="Cotización → Cierre" />
        <Kpi label="Actividad reciente" value={nuevos.length}
          color="#2f6fed"
          sub="Contacto últimos 7 días" />
      </div>

      {/* ── Fila 2: Embudo + Canal ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16 }}>

        {/* Embudo por etapa */}
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom:16 }}>Embudo de ventas</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {porEtapa.map(function(item){
              var cfg = ETAPA_CFG[item.etapa] || { bg:"#e5e7eb", txt:"#374151", dot:"#9ca3af" };
              var pct = maxEtapa > 0 ? Math.round((item.count / maxEtapa) * 100) : 0;
              return (
                <div key={item.etapa} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:108, fontSize:12, fontWeight:600, color:cfg.txt, textAlign:"right",
                    flexShrink:0 }}>{item.etapa}</div>
                  <div style={{ flex:1, height:24, background:"var(--bg)", borderRadius:6, overflow:"hidden",
                    border:"1px solid var(--line)" }}>
                    <div style={{ height:"100%", width: pct + "%", background:cfg.bg, borderRadius:6,
                      borderRight: item.count > 0 ? ("3px solid " + cfg.dot) : "none",
                      transition:"width .4s", display:"flex", alignItems:"center", paddingLeft:8,
                      minWidth: item.count > 0 ? 32 : 0 }}>
                      {item.count > 0 && (
                        <span style={{ fontSize:11, fontWeight:700, color:cfg.txt }}>{item.count}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ width:28, fontSize:12, fontWeight:700, color: item.count > 0 ? cfg.txt : "var(--muted)",
                    textAlign:"right", flexShrink:0 }}>{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Por canal */}
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom:16 }}>Canal de origen</div>
          {porCanal.length === 0 ? (
            <div style={{ color:"var(--muted)", fontSize:13 }}>Sin datos</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {porCanal.map(function(item){
                var pct = Math.round((item.count / totalCanal) * 100);
                return (
                  <div key={item.canal}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--ink)" }}>{item.canal}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.count} <span style={{ fontWeight:400, color:"var(--muted)" }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height:6, background:"var(--bg)", borderRadius:3, overflow:"hidden",
                      border:"1px solid var(--line)" }}>
                      <div style={{ height:"100%", width: pct + "%", background:item.color,
                        borderRadius:3, transition:"width .4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Fila 3: Por asesor + Urgentes ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:16 }}>

        {/* Tabla por asesor */}
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom:14 }}>Rendimiento por asesor</div>
          {porAsesor.length === 0 ? (
            <div style={{ color:"var(--muted)", fontSize:13 }}>Sin asesores asignados</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--line)" }}>
                  {["Asesor","Total","Avanzados","Urgentes"].map(function(h){
                    return <th key={h} style={{ padding:"6px 10px", textAlign: h==="Asesor" ? "left" : "center",
                      fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase",
                      letterSpacing:".06em" }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {porAsesor.map(function(row, i){
                  return (
                    <tr key={row.asesor} style={{ borderBottom:"1px solid var(--line)",
                      background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                      <td style={{ padding:"9px 10px", fontWeight:600, color:"var(--ink)" }}>
                        {row.asesor.split(" ").slice(0,2).join(" ")}
                      </td>
                      <td style={{ padding:"9px 10px", textAlign:"center", fontWeight:700 }}>{row.total}</td>
                      <td style={{ padding:"9px 10px", textAlign:"center" }}>
                        <span style={{ color:"#1f9d57", fontWeight:700 }}>{row.avanzados}</span>
                      </td>
                      <td style={{ padding:"9px 10px", textAlign:"center" }}>
                        {row.urgentes > 0
                          ? <span style={{ color:"#e0492f", fontWeight:700 }}>{row.urgentes}</span>
                          : <span style={{ color:"#1f9d57" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Lista urgentes */}
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom:14 }}>
            Seguimiento urgente
            {urgentes.length > 0 && (
              <span style={{ marginLeft:8, background:"#fef2f2", color:"#e0492f",
                border:"1px solid #fecaca", borderRadius:999, padding:"1px 8px",
                fontSize:10, fontWeight:800 }}>{urgentes.length}</span>
            )}
          </div>
          {urgentes.length === 0 ? (
            <div style={{ color:"#1f9d57", fontSize:13, fontWeight:600 }}>✓ Todos los clientes al día</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
              {urgentes.slice(0, 12).map(function(c){
                var dias = _dsc(c.uc);
                return (
                  <div key={c.id} onClick={function(){ onOpen(c); }}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                      borderRadius:7, border:"1px solid var(--line)", cursor:"pointer",
                      background:"var(--bg)", transition:"background .12s" }}
                    onMouseOver={function(e){ e.currentTarget.style.background="rgba(239,68,68,.06)"; }}
                    onMouseOut={function(e){ e.currentTarget.style.background="var(--bg)"; }}>
                    <div style={{ width:32, height:32, borderRadius:"50%",
                      background:"rgba(239,68,68,.12)", color:"#e0492f",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:800, flexShrink:0 }}>
                      {(c.nombre||"?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {c.nombre || "Sin nombre"}
                      </div>
                      <div style={{ fontSize:11, color:"var(--muted)" }}>{c.etapa}</div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#e0492f",
                      background:"#fef2f2", border:"1px solid #fecaca",
                      borderRadius:6, padding:"2px 7px", flexShrink:0 }}>
                      {dias}d
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function StatsBar({ clientes }) {
  const total      = clientes.length;
  const urgentes   = clientes.filter(c => _dsc(c.uc) > 3).length;
  const enCierre   = clientes.filter(c => ["Cierre","Pago","Expediente"].includes(c.etapa)).length;

  const stat = (label, value, color) => (
    <div className="dkpi">
      <div className="dkpi-label">{label}</div>
      <div className="dkpi-value" style={{ color: color || "var(--ink)", fontSize:22 }}>{value}</div>
    </div>
  );

  return (
    <div className="dkpi-grid" style={{ marginBottom:16 }}>
      {stat("Total clientes",     total)}
      {stat("Seguimiento urgente",urgentes,   urgentes > 0 ? "#e0492f" : "#1f9d57")}
      {stat("En etapa avanzada",  enCierre,   enCierre > 0 ? "#1f9d57" : "var(--muted)")}
    </div>
  );
}

/* ── Kanban ───────────────────────────────────────────────────────────── */
function KanbanCard({ c, onClick }) {
  const dias = _dsc(c.uc);
  const avColores = ["#2f6fed","#1f9d57","#d99613","#e0492f","#7c3aed"];
  const av = avColores[["Juan Rodríguez","María García","Carlos López","Ana Martínez"].indexOf(c.asesor) % 5] || "#2f6fed";
  return (
    <div onClick={() => onClick(c)} style={{
      background:"var(--card)", border:"1px solid var(--line)", borderRadius:10,
      padding:"12px 14px", cursor:"pointer", transition:"box-shadow .15s",
      display:"flex", flexDirection:"column", gap:8,
    }}
    onMouseOver={e => e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.08)"}
    onMouseOut={e => e.currentTarget.style.boxShadow="none"}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6 }}>
        <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)", lineHeight:1.3 }}>{c.nombre}</span>
        <DiasTag dias={dias} />
      </div>
      <div style={{ fontSize:11, color:"var(--muted)", display:"flex", gap:5, alignItems:"center" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>
        {c.interes}
      </div>
      <div style={{ fontSize:12, color:"var(--ink-2)", fontWeight:600 }}>
        ${(c.presupuesto / 1000000).toFixed(2)}M · {c.formaPago}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6 }}>
        <CanalTag canal={c.canal} />
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <Ini nombre={c.asesor} bg={av} />
          <span style={{ fontSize:10, color:"var(--muted)" }}>{c.asesor.split(" ")[0]}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanView({ clientes, onOpen }) {
  return (
    <div style={{ overflowX:"auto", paddingBottom:12 }}>
      <div style={{ display:"flex", gap:12, minWidth:"max-content", alignItems:"flex-start" }}>
        {ETAPAS_CRM.map(etapa => {
          const cols = clientes.filter(c => c.etapa === etapa);
          const cfg  = ETAPA_CFG[etapa];
          return (
            <div key={etapa} style={{ width:220, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8,
                padding:"5px 10px", borderRadius:7, background:cfg.bg }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:cfg.dot, flexShrink:0 }} />
                <span style={{ fontSize:11, fontWeight:700, color:cfg.txt, flex:1 }}>{etapa}</span>
                <span style={{ fontSize:11, fontWeight:700, color:cfg.txt, background:"rgba(0,0,0,.08)",
                  borderRadius:20, padding:"1px 7px" }}>{cols.length}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {cols.length === 0 ? (
                  <div style={{ border:"1.5px dashed var(--line)", borderRadius:10, padding:"20px 12px",
                    textAlign:"center", color:"var(--muted)", fontSize:12 }}>
                    Sin clientes
                  </div>
                ) : cols.map(c => <KanbanCard key={c.id} c={c} onClick={onOpen} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Lista (grid estilo inventario) ──────────────────────────────────── */
const COLS_CRM = [
  { key:"nombre",      titulo:"Nombre",             w:210 },
  { key:"etapa",       titulo:"Etapa",              w:130 },
  { key:"interes",     titulo:"Vehículo",           w:175 },
  { key:"presupuesto", titulo:"Presupuesto",        w:110, align:"right" },
  { key:"formaPago",   titulo:"Pago",               w:90  },
  { key:"prob",        titulo:"Prob.",              w:100, align:"center" },
  { key:"asesor",      titulo:"Asesor",             w:115 },
  { key:"uc",          titulo:"Sin contacto",       w:100, align:"center" },
  { key:"ciudad",      titulo:"Ciudad",             w:100 },
  { key:"prox",        titulo:"Próxima acción",     w:260 },
];

function ListaGrid({ clientes, onOpen }) {
  const [filtroEtapa, setFiltroEtapa] = React.useState("");
  const [sort, setSort] = React.useState({ key:"uc", dir:1 });

  const toggleSort = (key) =>
    setSort(prev => prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 });

  const filtered = filtroEtapa ? clientes.filter(c => c.etapa === filtroEtapa) : clientes;

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sort.key], vb = b[sort.key];
    if (sort.key === "uc") { va = _dsc(a.uc); vb = _dsc(b.uc); }
    if (sort.key === "presupuesto" || sort.key === "prob") { va = Number(va); vb = Number(vb); }
    if (typeof va === "string") return sort.dir * va.localeCompare(vb, "es");
    return sort.dir * ((va || 0) - (vb || 0));
  });

  const thStyle = (col) => ({
    width: col.w, padding:"6px 11px", textAlign: col.align || "left",
    fontSize:11, fontWeight:700, color:"var(--muted)", cursor:"pointer",
    userSelect:"none", whiteSpace:"nowrap", position:"sticky", top:0,
    background:"var(--bg)", borderBottom:"1px solid var(--line)",
    borderRight:"1px solid var(--line)",
  });

  const SortIco = ({ ckey }) => {
    if (sort.key !== ckey) return <span style={{ color:"var(--line)", marginLeft:3, fontSize:10 }}>⇅</span>;
    return <span style={{ color:"var(--accent)", marginLeft:3, fontSize:10 }}>{sort.dir > 0 ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
        <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}
          style={{ padding:"5px 10px", border:"1px solid var(--line)", borderRadius:7,
            fontSize:12, background:"var(--card)", color:"var(--ink)", fontFamily:"inherit",
            cursor:"pointer", outline:"none" }}>
          <option value="">Todas las etapas</option>
          {ETAPAS_CRM.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <span style={{ fontSize:12, color:"var(--muted)", marginLeft:4 }}>
          {sorted.length} cliente{sorted.length !== 1 ? "s" : ""}
          {filtroEtapa ? ` en ${filtroEtapa}` : ""}
        </span>
        <span style={{ fontSize:11, color:"var(--muted)", marginLeft:"auto" }}>
          Clic en columna para ordenar
        </span>
      </div>

      {/* Grid */}
      <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid var(--line)",
        background:"var(--card)", maxHeight:"calc(100vh - 320px)", overflowY:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr>
              {/* columna # */}
              <th style={{ width:38, padding:"6px 8px", textAlign:"center", fontSize:11,
                fontWeight:700, color:"var(--muted)", position:"sticky", top:0,
                background:"var(--bg)", borderBottom:"1px solid var(--line)",
                borderRight:"2px solid var(--line)" }}>#</th>
              {COLS_CRM.map(col => (
                <th key={col.key} style={thStyle(col)} onClick={() => toggleSort(col.key)}>
                  {col.titulo}<SortIco ckey={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={COLS_CRM.length + 1}
                style={{ padding:"32px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>
                Sin resultados
              </td></tr>
            ) : sorted.map((c, ri) => {
              const dias = _dsc(c.uc);
              const tdB  = { borderRight:"1px solid var(--line)" };
              return (
                <tr key={c.id}
                  onClick={() => onOpen(c)}
                  style={{ borderBottom:"1px solid var(--line)", cursor:"pointer" }}
                  onMouseOver={e => e.currentTarget.style.background = "#f0f4ff"}
                  onMouseOut={e => e.currentTarget.style.background = ""}>

                  {/* # */}
                  <td style={{ padding:"5px 8px", textAlign:"center", fontSize:11,
                    color:"var(--muted)", borderRight:"2px solid var(--line)",
                    fontVariantNumeric:"tabular-nums", background:"var(--bg)", userSelect:"none" }}>
                    <span style={{ display:"block" }}>{ri + 1}</span>
                    <span style={{ fontSize:9, color:"var(--accent)", letterSpacing:0 }}>↗</span>
                  </td>

                  {/* Nombre */}
                  <td style={{ padding:"5px 11px", fontWeight:700, color:"var(--ink)",
                    whiteSpace:"nowrap", ...tdB }}>
                    <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:9, fontWeight:800, padding:"1px 4px", borderRadius:3, flexShrink:0,
                        background: c.tipo === "Persona moral" ? "#f3e8ff" : "#eff6ff",
                        color:      c.tipo === "Persona moral" ? "#7c3aed"  : "#1d4ed8" }}>
                        {c.tipo === "Persona moral" ? "PM" : "PF"}
                      </span>
                      {c.nombre}
                    </span>
                  </td>

                  {/* Etapa */}
                  <td style={{ padding:"5px 11px", ...tdB }}>
                    <EtapaBadge etapa={c.etapa} />
                  </td>

                  {/* Vehículo */}
                  <td style={{ padding:"5px 11px", color:"var(--ink-2)",
                    maxWidth:175, overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap", ...tdB }}>
                    {c.interes || "—"}
                  </td>

                  {/* Presupuesto */}
                  <td style={{ padding:"5px 11px", textAlign:"right", fontWeight:600,
                    color:"var(--ink)", whiteSpace:"nowrap",
                    fontVariantNumeric:"tabular-nums", ...tdB }}>
                    ${(c.presupuesto / 1000).toFixed(0)}k
                  </td>

                  {/* Pago */}
                  <td style={{ padding:"5px 11px", color:"var(--muted)", whiteSpace:"nowrap", ...tdB }}>
                    {c.formaPago}
                  </td>

                  {/* Prob */}
                  <td style={{ padding:"5px 11px", ...tdB }}>
                  </td>

                  {/* Asesor */}
                  <td style={{ padding:"5px 11px", color:"var(--muted)", whiteSpace:"nowrap", ...tdB }}>
                    {c.asesor.split(" ")[0]}
                  </td>

                  {/* Sin contacto */}
                  <td style={{ padding:"5px 11px", textAlign:"center", ...tdB }}>
                    <DiasTag dias={dias} />
                  </td>

                  {/* Ciudad */}
                  <td style={{ padding:"5px 11px", color:"var(--muted)", whiteSpace:"nowrap", ...tdB }}>
                    {c.ciudad || "—"}
                  </td>

                  {/* Próxima acción */}
                  <td style={{ padding:"5px 11px", color:"var(--muted)", fontSize:11,
                    maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.prox}
                    {c.fprox && (
                      <span style={{ marginLeft:5,
                        color: _dsc(c.fprox) < 0 ? "#e0492f" : "var(--line)" }}>
                        · {_fmtFechaCRM(c.fprox)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Urgentes ─────────────────────────────────────────────────────────── */
function UrgentesView({ clientes, onOpen }) {
  const urgentes = clientes
    .filter(c => _dsc(c.uc) > 3)
    .sort((a, b) => _dsc(b.uc) - _dsc(a.uc));

  if (urgentes.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:15, fontWeight:700 }}>Sin seguimiento pendiente</div>
        <div style={{ fontSize:13, marginTop:6 }}>Todos los clientes tienen contacto reciente (≤ 3 días).</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:12, fontSize:13, color:"#e0492f", fontWeight:600, display:"flex", alignItems:"center", gap:7 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {urgentes.length} cliente{urgentes.length !== 1 ? "s" : ""} sin contacto por más de 3 días
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
        {urgentes.map(c => {
          const dias = _dsc(c.uc);
          const cfg  = ETAPA_CFG[c.etapa] || {};
          return (
            <div key={c.id} onClick={() => onOpen(c)} style={{
              background:"var(--card)", border:"1.5px solid #fecaca", borderRadius:10,
              padding:"14px 16px", cursor:"pointer", transition:"box-shadow .15s",
              display:"flex", flexDirection:"column", gap:10,
            }}
            onMouseOver={e => e.currentTarget.style.boxShadow="0 2px 12px rgba(224,73,47,.12)"}
            onMouseOut={e => e.currentTarget.style.boxShadow="none"}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>{c.nombre}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
                    {c.asesor} · {c.ciudad}
                  </div>
                </div>
                <span style={{ background:"#fee2e2", color:"#991b1b", fontSize:12, fontWeight:700,
                  padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>
                  {dias}d sin contacto
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <EtapaBadge etapa={c.etapa} />
                <span style={{ fontSize:12, color:"var(--ink-2)", fontWeight:600 }}>{c.interes}</span>
              </div>
              <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:7, padding:"8px 10px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#c2410c", textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>
                  Próxima acción
                </div>
                <div style={{ fontSize:12, color:"var(--ink-2)" }}>
                  {c.prox} · <span style={{ color:"#c2410c", fontWeight:600 }}>{_fmtFechaCRM(c.fprox)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Item de cliente en panel lateral ───────────────────────────────────── */
function ClienteListItem({ c, active, onClick }) {
  const cfg = ETAPA_CFG[c.etapa] || { dot:"#94a3b8" };
  const avColores = ["#2f6fed","#8b5cf6","#1f9d57","#d97706","#e0492f"];
  const avColor = avColores[c.nombre.charCodeAt(0) % avColores.length];
  const initials = c.nombre.split(" ").filter(Boolean).slice(0,2).map(w => w[0] || "").join("").toUpperCase();
  return (
    <button className={"vie-item" + (active ? " active" : "")} onClick={onClick}>
      <div className="vie-thumb">
        <div className="vie-thumb-ph" style={{
          background:avColor, color:"#fff", fontSize:13, fontWeight:700,
          display:"flex", alignItems:"center", justifyContent:"center",
          width:"100%", height:"100%", borderRadius:8,
        }}>
          {initials}
        </div>
      </div>
      <div className="vie-meta">
        <div className="vie-vin" style={{ fontFamily:"inherit" }}>{c.tel || c.email || c.canal}</div>
        <div className="vie-desc">{c.nombre}</div>
        <div className="vie-sub">{c.interes || "Sin vehículo de interés"}</div>
      </div>
      <span className="vie-dot" style={{ background:cfg.dot }} title={c.etapa} />
    </button>
  );
}

/* ── Helpers de validación de documentos ─────────────────────────────────── */
function _normNombre(s) {
  if (!s) return "";
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function _nombreCoincide(extraido, referencia) {
  var a = _normNombre(extraido);
  var b = _normNombre(referencia);
  if (!a || !b) return "sin_datos";
  if (a === b) return "exacto";
  var wa = a.split(" ").filter(Boolean);
  var wb = b.split(" ").filter(Boolean);
  var coinciden = wa.filter(function(w) { return wb.includes(w); }).length;
  var umbral = Math.max(2, Math.floor(Math.min(wa.length, wb.length) * 0.6));
  return coinciden >= umbral ? "similar" : "diferente";
}

function _parseVigencia(s) {
  if (!s) return null;
  /* DD/MM/AAAA */
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  /* DD/MM/AA */
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    var yr = Number(m[3]);
    return new Date(yr + (yr < 50 ? 2000 : 1900), Number(m[2]) - 1, Number(m[1]));
  }
  /* AAAA-MM-DD */
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

/* ── Etiquetas legibles de campos extraídos ──────────────────────────────── */
const CAMPO_LABEL = {
  nombre:"Nombre", apellidoPaterno:"Apellido paterno", apellidoMaterno:"Apellido materno",
  curp:"CURP", rfc:"RFC", fechaNacimiento:"Fecha de nacimiento", sexo:"Sexo",
  direccion:"Dirección", colonia:"Colonia", ciudad:"Ciudad", estado:"Estado",
  cp:"C.P.", fechaDocumento:"Período del recibo",
};

/* Renderiza la primera página de un PDF a JPEG usando PDF.js (cargado en index.html) */
function _pdfToImageDataUrl(dataUrl) {
  return new Promise(function(resolve, reject) {
    var pdfjsLib = window["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) { reject(new Error("PDF.js no disponible - recarga la pagina")); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    var base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
    pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
      pdf.getPage(1).then(function(page) {
        var viewport = page.getViewport({ scale: 2.0 });
        var canvas = document.createElement("canvas");
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise
          .then(function() { resolve(canvas.toDataURL("image/jpeg", 0.88)); })
          .catch(reject);
      }).catch(reject);
    }).catch(reject);
  });
}

/* Redimensiona una imagen a máx. 1200px para no saturar la Edge Function */
function _resizeDataUrl(dataUrl, mimeType) {
  return new Promise(function(resolve) {
    if (mimeType === "application/pdf") { resolve(dataUrl); return; }
    var img = new Image();
    img.onload = function() {
      var MAX = 1200;
      var w = img.width, h = img.height;
      if (w <= MAX && h <= MAX) { resolve(dataUrl); return; }
      var ratio = Math.min(MAX / w, MAX / h);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      var canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = function() { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

/* ── Helper: convierte dataUrl a Blob sin fetch() ───────────────────────── */
function _dataUrlToBlob(dataUrl) {
  var arr  = dataUrl.split(",");
  var mime = arr[0].match(/:(.*?);/)[1];
  var raw  = atob(arr[1]);
  var buf  = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/* ── Abrir documento en ventana nueva (dataUrl o storageKey) ────────────── */
async function _abrirDocVentana(doc) {
  if (!doc) return;
  if (doc.dataUrl) {
    var w = window.open("", "_blank");
    if (!w) { alert("Permite ventanas emergentes para ver el documento."); return; }
    if (doc.type === "application/pdf") {
      w.document.write('<html><body style="margin:0"><iframe src="' + doc.dataUrl + '" style="width:100%;height:100vh;border:none;"></iframe></body></html>');
    } else {
      w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="' + doc.dataUrl + '" style="max-width:100%;max-height:100vh;display:block;"></body></html>');
    }
    w.document.close();
    return;
  }
  if (doc.storageKey && window.DB && window.DB.storage) {
    try {
      var res = await window.DB.storage.from("expedientes").createSignedUrl(doc.storageKey, 600);
      if (res.data && res.data.signedUrl) { window.open(res.data.signedUrl, "_blank"); return; }
    } catch(e) {}
  }
  alert("No se puede abrir el documento. Intenta guardarlo primero.");
}

/* ── Carga simple de documento (sin OCR): facturas, comprobantes ─────────── */
function DocSimpleUpload({ label, sublabel, value, onChange }) {
  const [subiendo, setSubiendo] = React.useState(false);
  const inputRef = React.useRef(null);

  async function _upload(file, dataUrl) {
    try {
      if (!window.DB || !window.DB.storage) return null;
      var ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
      var key = "clientes/pago/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var blob = _dataUrlToBlob(dataUrl);
      var { error } = await window.DB.storage.from("expedientes").upload(key, blob, { contentType: file.type, upsert: false });
      if (error) throw error;
      return key;
    } catch(e) { console.warn("DocSimpleUpload:", e.message); return null; }
  }

  function handleFile(file) {
    if (!file) return;
    var ok = ["image/jpeg","image/jpg","image/png","application/pdf"];
    if (!ok.includes(file.type)) { alert("Formato no permitido. Usa JPG, PNG o PDF."); return; }
    var reader = new FileReader();
    reader.onload = async function(ev) {
      var dataUrl = ev.target.result;
      var fd = { name: file.name, type: file.type, dataUrl: dataUrl, cargadoEn: new Date().toISOString() };
      onChange(fd);
      setSubiendo(true);
      var key = await _upload(file, dataUrl);
      setSubiendo(false);
      if (key) onChange(Object.assign({}, fd, { storageKey: key }));
    };
    reader.readAsDataURL(file);
  }

  var isSaved = !!(value && value.storageKey && !value.dataUrl);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)" }}>{label}</span>
        {sublabel && <span style={{ fontSize:10, color:"var(--muted)" }}>{sublabel}</span>}
      </div>
      {value ? (
        <div style={{ border:"1px solid var(--line)", borderRadius:9, background:"var(--bg)" }}>
          <div style={{ padding:"11px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:7, flexShrink:0, fontSize:20,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: isSaved ? "#d1fae5" : "#eff6ff", color: isSaved ? "#059669" : "#2f6fed" }}>
              {value.type === "application/pdf" ? "📄" : "🖼"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value.name}</div>
              <div style={{ fontSize:11, color: isSaved ? "#059669" : "var(--muted)", marginTop:2 }}>
                {subiendo ? "Subiendo…" : isSaved ? "Guardado en expediente" : "Pendiente de guardar"}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button type="button" onClick={() => _abrirDocVentana(value)}
                style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:6,
                  border:"1px solid var(--accent)", background:"var(--accent)", color:"#fff", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:4 }}>
                🖨 Ver / Imprimir
              </button>
              <button type="button" onClick={() => onChange(null)}
                style={{ fontSize:11, fontWeight:600, padding:"5px 8px", borderRadius:6,
                  border:"none", background:"#fee2e2", color:"#b91c1c", cursor:"pointer" }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--line)";
            var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{ border:"2px dashed var(--line)", borderRadius:9, padding:"18px 16px",
            display:"flex", flexDirection:"column", alignItems:"center", gap:8,
            cursor:"pointer", background:"var(--bg)", transition:"border-color .15s" }}>
          <div style={{ fontSize:22 }}>📎</div>
          <div style={{ fontSize:12, color:"var(--muted)", textAlign:"center", lineHeight:1.5 }}>
            Arrastra o <span style={{ color:"var(--accent)", fontWeight:700 }}>selecciona</span> el archivo
            <br/><span style={{ fontSize:10 }}>PDF · JPG · PNG</span>
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }}
            onChange={e => { var f = e.target.files && e.target.files[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
      )}
    </div>
  );
}

/* ── Multi-upload de comprobantes de pago con extracción IA de monto ──────── */
function MultiComprobantesUpload({ value, onChange }) {
  var items = value || [];
  var [cargando,    setCargando]    = React.useState(false);
  var [editIdx,     setEditIdx]     = React.useState(null); // índice editando monto
  var [editValStr,  setEditValStr]  = React.useState("");
  var inputRef = React.useRef(null);

  var total = items.reduce(function(sum, it) {
    return sum + (Number(it.monto) || 0);
  }, 0);

  function handleFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    var ok = ["image/jpeg","image/jpg","image/png","application/pdf"];
    if (!ok.includes(file.type)) { alert("Formato no permitido. Usa JPG, PNG o PDF."); return; }
    setCargando(true);
    var reader = new FileReader();
    reader.onload = async function(ev) {
      var dataUrl = ev.target.result;
      var item = { name: file.name, type: file.type, dataUrl: dataUrl,
                   cargadoEn: new Date().toISOString(), monto: null };
      try {
        var fnUrl = (window.SUPABASE_URL || "").replace(/\/$/, "") + "/functions/v1/extract-document";
        var res = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + (window.SUPABASE_ANON || ""),
          },
          body: JSON.stringify({ dataUrl: dataUrl, mimeType: file.type, docType: "comprobante" }),
        });
        var data = await res.json();
        if (data.ok && data.campos) {
          var m = parseFloat(String(data.campos.monto || "").replace(/[^0-9.]/g, ""));
          if (!isNaN(m) && m > 0) item.monto = m;
          if (data.campos.referencia) item.referencia = data.campos.referencia;
          if (data.campos.fecha)      item.fecha      = data.campos.fecha;
          if (data.campos.banco)      item.banco      = data.campos.banco;
        }
      } catch(eAI) {
        console.warn("[CRM] IA comprobante error:", eAI.message);
      }
      onChange(items.concat([item]));
      setCargando(false);
    };
    reader.readAsDataURL(file);
  }

  function quitar(idx) {
    setEditIdx(null);
    onChange(items.filter(function(_, i) { return i !== idx; }));
  }

  function startEdit(idx) {
    setEditIdx(idx);
    setEditValStr(items[idx].monto != null ? String(items[idx].monto) : "");
  }

  function commitEdit(idx) {
    var parsed = parseFloat(String(editValStr).replace(/[^0-9.]/g, ""));
    var updated = items.map(function(it, i) {
      if (i !== idx) return it;
      return Object.assign({}, it, { monto: (!isNaN(parsed) && parsed > 0) ? parsed : null });
    });
    onChange(updated);
    setEditIdx(null);
    setEditValStr("");
  }

  var fmt = window.fmtMoney || function(n) {
    return "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:2 });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)" }}>Comprobantes de pago</span>
        <span style={{ fontSize:10, color:"var(--muted)" }}>IA extrae monto · haz clic en el monto para corregir</span>
      </div>
      {items.map(function(it, i) {
        var isSaved  = !!(it.storageKey && !it.dataUrl);
        var isEditing = editIdx === i;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
            border:"1px solid " + (it.monto > 0 ? "rgba(34,197,94,.3)" : "var(--line)"),
            borderRadius:9, background: it.monto > 0 ? "#f0fdf4" : "var(--bg)" }}>
            <div style={{ width:32, height:32, borderRadius:6, flexShrink:0, fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: isSaved ? "#d1fae5" : "#eff6ff", color: isSaved ? "#059669" : "#2f6fed" }}>
              {it.type === "application/pdf" ? "📄" : "🖼"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--ink)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.name}</div>
              <div style={{ fontSize:10, color: isSaved ? "#059669" : "var(--muted)", marginTop:1 }}>
                {it.banco ? it.banco + (it.fecha ? " · " + it.fecha : "") : (isSaved ? "Guardado" : "Pendiente de guardar")}
              </div>
            </div>
            {/* Monto: editable */}
            {isEditing ? (
              <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                <input
                  autoFocus
                  style={{ width:110, padding:"3px 8px", borderRadius:7,
                    border:"1.5px solid var(--accent)", fontSize:12, fontWeight:700, textAlign:"right" }}
                  placeholder="0.00"
                  value={editValStr}
                  onChange={function(e){ setEditValStr(e.target.value); }}
                  onKeyDown={function(e){ if (e.key === "Enter") commitEdit(i); if (e.key === "Escape") setEditIdx(null); }}
                  onBlur={function(){ commitEdit(i); }}
                />
              </div>
            ) : (
              <button type="button"
                title={it.monto != null ? "Haz clic para editar el monto" : "Ingresar monto manualmente"}
                onClick={function(){ startEdit(i); }}
                style={{ fontSize:12, fontWeight:700, flexShrink:0, border:"none", cursor:"pointer",
                  borderRadius:12, padding:"3px 10px", transition:"all .12s",
                  background: it.monto != null ? "#d1fae5" : "#fef9c3",
                  color:      it.monto != null ? "#065f46" : "#92400e" }}>
                {it.monto != null ? fmt(it.monto) + " ✎" : "Ingresar monto ✎"}
              </button>
            )}
            <button type="button" onClick={function(){ quitar(i); }}
              style={{ border:"none", background:"#fee2e2", cursor:"pointer", color:"#b91c1c",
                fontSize:13, padding:"3px 7px", borderRadius:6, lineHeight:1, flexShrink:0 }}>✕</button>
          </div>
        );
      })}
      {total > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px",
          background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:9 }}>
          <span style={{ fontSize:12, color:"#1e40af", flex:1, fontWeight:600 }}>
            Total comprobado ({items.filter(function(it){ return it.monto > 0; }).length} comprobante{items.filter(function(it){ return it.monto > 0; }).length !== 1 ? "s" : ""})
          </span>
          <span style={{ fontSize:15, fontWeight:800, color:"#1e40af" }}>{fmt(total)}</span>
        </div>
      )}
      <label style={{ display:"inline-flex", alignItems:"center", gap:6,
        cursor: cargando ? "wait" : "pointer", alignSelf:"flex-start",
        padding:"7px 14px", border:"1px dashed var(--line)", borderRadius:9,
        fontSize:12, color:"var(--ink-2)", background:"var(--bg)",
        opacity: cargando ? 0.6 : 1, transition:"opacity .15s" }}>
        {cargando
          ? <><span>⏳</span> Analizando comprobante…</>
          : <><span>➕</span> Agregar comprobante</>}
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
          style={{ display:"none" }} disabled={cargando} onChange={handleFile} />
      </label>
    </div>
  );
}

/* ── Imprimir expediente completo del cliente ────────────────────────────── */
function imprimirExpediente(form) {
  if (!form) return;
  var fmtDate = function(iso) {
    if (!iso) return "—";
    return new Date(iso + "T12:00:00").toLocaleDateString("es-MX",
      { day:"2-digit", month:"long", year:"numeric" });
  };
  var fmtMon = function(n) {
    if (!n) return "—";
    return Number(n).toLocaleString("es-MX", { style:"currency", currency:"MXN", minimumFractionDigits:0 });
  };
  var row = function(lbl, val) {
    if (!val || val === "—") return "";
    return '<tr><td style="color:#64748b;font-size:12px;padding:5px 10px 5px 0;width:180px;vertical-align:top">' + lbl + '</td>'
         + '<td style="font-size:13px;font-weight:600;padding:5px 0;color:#0f172a">' + val + '</td></tr>';
  };
  var docCheck = function(doc, lbl) {
    var ok = !!(doc && (doc.storageKey || doc.dataUrl));
    return '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;'
      + (ok ? 'background:#d1fae5;color:#065f46' : 'background:#fee2e2;color:#991b1b') + '">'
      + (ok ? "✓" : "✗") + " " + lbl + "</span>";
  };
  var etapa = form.etapa || "Prospección";
  var now   = new Date().toLocaleDateString("es-MX", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">'
    + '<title>Expediente — ' + (form.nombre || "Cliente") + '</title>'
    + '<style>'
    + 'body{font-family:system-ui,sans-serif;margin:0;padding:24px 32px;color:#0f172a;font-size:13px;line-height:1.5}'
    + 'h1{margin:0;font-size:20px;font-weight:800;color:#0f172a}'
    + 'h2{margin:18px 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:4px}'
    + 'table{border-collapse:collapse;width:100%}'
    + '.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}'
    + '.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 32px}'
    + '.docs{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}'
    + '@media print{body{padding:16px 20px}button{display:none!important}'
    + '@page{size:A4;margin:15mm 15mm 15mm 15mm}}'
    + '</style></head><body>'

    /* Header */
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0f172a">'
    +   '<div>'
    +     '<h1>' + (form.nombre || "Cliente") + '</h1>'
    +     '<div style="color:#64748b;font-size:12px;margin-top:4px">'
    +       (form.tipo || "Persona física") + ' &nbsp;·&nbsp; Etapa: <strong>' + etapa + '</strong>'
    +       (form.estadoGeneral ? ' &nbsp;·&nbsp; ' + form.estadoGeneral : '')
    +     '</div>'
    +   '</div>'
    +   '<div style="text-align:right">'
    +     '<div style="font-size:11px;color:#94a3b8">Generado el</div>'
    +     '<div style="font-size:12px;font-weight:600">' + now + '</div>'
    +   '</div>'
    + '</div>'

    /* Datos de contacto */
    + '<h2>Datos de contacto</h2>'
    + '<div class="grid"><table>'
    + row("Teléfono", form.tel)
    + row("Email", form.email)
    + row("Ciudad / Estado", [form.ciudad, form.estado].filter(Boolean).join(", ") || null)
    + row("Canal origen", form.canal)
    + '</table><table>'
    + row("CURP", form.curp)
    + row("RFC", form.rfc)
    + row("Fecha nacimiento", form.fechaNac)
    + row("Licencia", form.numLicencia ? (form.numLicencia + (form.vigenciaLic ? " (vig: " + form.vigenciaLic + ")" : "")) : null)
    + '</table></div>'

    /* Vehículo y cotización */
    + (form.unidadDesc ? ('<h2>Vehículo cotizado</h2>'
    + '<div class="grid"><table>'
    + row("Unidad", form.unidadDesc)
    + row("Precio lista", fmtMon(form.precioLista))
    + row("Precio venta", fmtMon(form.precioVenta))
    + '</table><table>'
    + row("Forma de pago", form.formaPagoCot)
    + row("Enganche", fmtMon(form.enganche))
    + row("Plazo", form.plazoMeses ? (form.plazoMeses + " meses") : null)
    + '</table></div>') : '')

    /* Pago */
    + (form.pagoMetodo ? ('<h2>Pago</h2>'
    + '<div class="grid"><table>'
    + row("Método", form.pagoMetodo)
    + row("Fecha", fmtDate(form.pagoFecha))
    + '</table><table>'
    + row("Monto", fmtMon(form.pagoMonto))
    + row("Referencia / Folio", form.pagoReferencia)
    + '</table></div>'
    + (form.pagoNotas ? '<div style="margin-top:6px;font-size:12px;color:#64748b">Notas: ' + form.pagoNotas + '</div>' : '')) : '')

    /* Documentos */
    + '<h2>Documentos del cliente</h2>'
    + '<div class="docs">'
    + docCheck(form.docId,         "INE / Identificación")
    + docCheck(form.docLicencia,   "Licencia de conducir")
    + docCheck(form.docDomicilio,  "Comprobante domicilio")
    + docCheck(form.docFactura,    "Factura del vehículo sin valor")
    + (form.docComprobantes && form.docComprobantes.length > 0
        ? '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#d1fae5;color:#065f46">✓ Comprobantes (' + form.docComprobantes.length + ')</span>'
        : '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b">✗ Comprobante de pago</span>')
    + (form.e8ContratoUrl ? '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#d1fae5;color:#065f46">✓ Contrato firmado</span>' : '')
    + '</div>'

    /* Crédito */
    + (form.e6Estado && form.e6Estado !== "Pendiente" ? ('<h2>Proceso de crédito</h2>'
    + '<div class="grid"><table>'
    + row("Estado", form.e6Estado)
    + row("Institución", form.e6Institucion)
    + '</table><table>'
    + row("Monto aprobado", fmtMon(form.e6MontoAprobado))
    + row("Mensualidad", fmtMon(form.e6MensualidadReal))
    + '</table></div>') : '')

    /* Notas */
    + (form.notas ? ('<h2>Notas generales</h2>'
    + '<div style="font-size:12px;color:#374151;padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">'
    + form.notas + '</div>') : '')

    /* Print button */
    + '<div style="margin-top:28px;text-align:center">'
    + '<button onclick="window.print()" style="padding:10px 28px;border-radius:8px;border:none;'
    + 'background:#1e3a5f;color:#fff;font-size:13px;font-weight:700;cursor:pointer">🖨 Imprimir</button>'
    + '</div>'
    + '</body></html>';

  var w = window.open("", "_blank");
  if (!w) { alert("Permite ventanas emergentes para imprimir."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.focus(); }, 300);
}

/* ── Zona de carga de documento con extracción IA ────────────────────────── */
function DocUpload({ label, sublabel, docType, value, onChange, onExtract, nombreReferencia }) {
  const [dragging,    setDragging]    = React.useState(false);
  const [extrayendo,  setExtrayendo]  = React.useState(false);
  const [campos,      setCampos]      = React.useState(null);   // null | {} | {k:v}
  const [errExt,      setErrExt]      = React.useState(null);
  const [subiendoDoc, setSubiendoDoc] = React.useState(false);
  const inputRef = React.useRef(null);

  /* Resetear extracción cuando el doc cambia */
  React.useEffect(() => { setCampos(null); setErrExt(null); }, [value && value.name]);

  async function _uploadDocToStorage(file, dataUrl) {
    try {
      if (!window.DB || !window.DB.storage) return null;
      var ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
      var key  = "clientes/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var blob = _dataUrlToBlob(dataUrl);
      var { error } = await window.DB.storage
        .from("expedientes")
        .upload(key, blob, { contentType: file.type, upsert: false });
      if (error) throw error;
      return key;
    } catch(e) {
      console.warn("DocUpload storage upload failed:", e.message);
      return null;
    }
  }

  function handleFile(file) {
    if (!file) return;
    var allowed = ["image/jpeg","image/jpg","image/png","application/pdf"];
    if (!allowed.includes(file.type)) { alert("Formato no permitido. Usa JPG, PNG o PDF."); return; }
    var reader = new FileReader();
    reader.onload = async function(e) {
      var dataUrl = e.target.result;
      var fileData = { name: file.name, type: file.type, dataUrl: dataUrl, cargadoEn: new Date().toISOString() };
      onChange(fileData);           // inmediato — disponible para OCR
      setSubiendoDoc(true);
      var key = await _uploadDocToStorage(file, dataUrl);
      setSubiendoDoc(false);
      if (key) onChange({ ...fileData, storageKey: key });
      // Auto-extraer con IA solo si hay callback de extracción
      if (onExtract) extraer(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  }

  async function extraer(dataUrlIn, typeIn) {
    var srcUrl  = dataUrlIn || (value && value.dataUrl);
    var srcType = typeIn    || (value && value.type);
    if (!srcUrl || extrayendo) return;
    setExtrayendo(true); setCampos(null); setErrExt(null);
    try {
      /* Si es PDF, renderizar pagina 1 a imagen antes de enviar */
      var rawUrl  = srcUrl;
      var rawMime = srcType;
      if (srcType === "application/pdf") {
        rawUrl  = await _pdfToImageDataUrl(srcUrl);
        rawMime = "image/jpeg";
      }
      var dataUrlEnviar = await _resizeDataUrl(rawUrl, rawMime);
      var supaUrl  = window.SUPABASE_URL;
      var supaAnon = window.SUPABASE_ANON;
      var resp = await fetch(supaUrl + "/functions/v1/extract-document", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":"Bearer " + supaAnon },
        body: JSON.stringify({ dataUrl: dataUrlEnviar, mimeType: rawMime, docType: docType }),
      });
      var data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Error en el servidor");
      setCampos(data.campos || {});
    } catch(e) {
      setErrExt(e.message || "Error al extraer");
    } finally {
      setExtrayendo(false);
    }
  }

  function aplicar() {
    if (onExtract && campos) onExtract(campos);
    setCampos(null);
  }

  var isSaved = !!(value && value.storageKey && !value.dataUrl);
  var isImage = value && value.type && value.type.startsWith("image/");
  var tieneCampos = campos && Object.keys(campos).length > 0;

  var btnBase = { fontSize:11, fontWeight:600, border:"none", background:"none",
    cursor:"pointer", padding:"2px 6px", flexShrink:0, borderRadius:4 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>

      {/* Etiqueta */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)" }}>{label}</span>
        {sublabel && <span style={{ fontSize:10, color:"var(--muted)" }}>{sublabel}</span>}
      </div>

      {value ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

          {/* ── Preview ── */}
          <div style={{ border:"1px solid var(--line)", borderRadius:9, overflow:"hidden", background:"var(--bg)" }}>

            {isSaved ? (
              /* Restaurado desde BD — sólo nombre + badge verde */
              <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, background:"#d1fae5", borderRadius:6,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, fontSize:20, color:"#059669" }}>✓</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value.name}</div>
                  <div style={{ fontSize:11, color:"#059669", marginTop:2 }}>Guardado en expediente</div>
                </div>
              </div>
            ) : isImage ? (
              <div style={{ background:"#111", maxHeight:160, overflow:"hidden",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={value.dataUrl} alt={value.name}
                  style={{ width:"100%", maxHeight:160, objectFit:"contain", display:"block" }} />
              </div>
            ) : (
              <div style={{ padding:"16px 14px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:46, background:"#fee2e2", borderRadius:6,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#e0492f" strokeWidth="1.9"
                    strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="15" y2="17"/>
                  </svg>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {value.name}
                  </div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>PDF</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding:"7px 12px", borderTop:"1px solid var(--line)",
              display:"flex", alignItems:"center", gap:4, background:"var(--card)" }}>
              <span style={{ fontSize:11, color:"var(--muted)", overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{value.name}</span>
              {subiendoDoc && (
                <span style={{ fontSize:10, color:"var(--muted)", display:"flex",
                  alignItems:"center", gap:3 }}>
                  <span style={{ width:10, height:10, border:"1.5px solid var(--line)",
                    borderTopColor:"var(--accent)", borderRadius:"50%",
                    display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                  Guardando…
                </span>
              )}
              {!subiendoDoc && value.storageKey && (
                <span style={{ fontSize:10, color:"#059669", fontWeight:700 }}>✓ guardado</span>
              )}
              {(value.dataUrl || value.storageKey) && (
                <button onClick={async function() {
                  if (value.dataUrl) {
                    window.open(value.dataUrl, "_blank");
                  } else if (value.storageKey && window.DB && window.DB.storage) {
                    try {
                      var r = await window.DB.storage
                        .from("expedientes")
                        .createSignedUrl(value.storageKey, 3600);
                      if (r.error) throw r.error;
                      window.open(r.data.signedUrl, "_blank");
                    } catch(e) { alert("No se pudo abrir: " + (e.message || e)); }
                  }
                }} style={{ ...btnBase, color:"var(--accent)", fontWeight:700 }}>Ver</button>
              )}
              <button onClick={() => onChange(null)} style={{ ...btnBase, color:"#e0492f" }}>Quitar</button>
              <button onClick={() => inputRef.current && inputRef.current.click()}
                style={{ ...btnBase, color:"var(--muted)" }}>Reemplazar</button>
            </div>
            <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display:"none" }}
              onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />
          </div>



          {/* ── Cargando ── */}
          {extrayendo && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              background:"#f5f3ff", border:"1.5px solid #c4b5fd", borderRadius:8 }}>
              <div style={{ width:14, height:14, border:"2px solid #c4b5fd",
                borderTopColor:"#7c3aed", borderRadius:"50%",
                animation:"spin 0.7s linear infinite", flexShrink:0 }} />
              <span style={{ fontSize:12, color:"#6d28d9", fontWeight:600 }}>
                Analizando documento…
              </span>
            </div>
          )}

          {/* ── Error de extracción ── */}
          {errExt && (
            <div style={{ padding:"10px 14px", background:"#fff5f5", border:"1.5px solid #fecaca",
              borderRadius:8, fontSize:12, color:"#991b1b",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>Error: {errExt}</span>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={() => extraer()}
                  style={{ border:"none", background:"none", color:"#991b1b",
                    cursor:"pointer", fontSize:11, fontWeight:700 }}>Reintentar</button>
                <button onClick={() => setErrExt(null)}
                  style={{ border:"none", background:"none", color:"#991b1b", cursor:"pointer", fontSize:13 }}>✕</button>
              </div>
            </div>
          )}

          {/* ── Resultado de extracción ── */}
          {campos !== null && !extrayendo && (
            <div style={{ border:"1.5px solid #a7f3d0", borderRadius:9, overflow:"hidden" }}>
              {/* Header */}
              <div style={{ padding:"9px 14px", background:"#ecfdf5",
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.9"
                    strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                  <span style={{ fontSize:12, fontWeight:700, color:"#065f46" }}>
                    {tieneCampos ? "Información extraída" : "Sin datos detectados"}
                  </span>
                </div>
                <button onClick={() => setCampos(null)}
                  style={{ border:"none", background:"none", color:"#6b7280", cursor:"pointer", fontSize:13 }}>✕</button>
              </div>

              {/* Campos */}
              {tieneCampos ? (
                <div style={{ background:"var(--card)" }}>
                  <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:6 }}>
                    {Object.entries(campos).map(function(entry) {
                      var k = entry[0], v = entry[1];
                      var etiqueta = CAMPO_LABEL[k] || k;
                      return (
                        <div key={k} style={{ display:"flex", gap:8, fontSize:12 }}>
                          <span style={{ color:"var(--muted)", minWidth:130, flexShrink:0 }}>{etiqueta}</span>
                          <span style={{ fontWeight:600, color:"var(--ink)" }}>{v}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* ── Validación del documento ── */}
                  {nombreReferencia && (function() {
                    /* Nombre completo extraído (puede venir junto o separado) */
                    var nombreExtraido = campos.nombre || "";
                    if (campos.apellidoPaterno || campos.apellidoMaterno)
                      nombreExtraido = [campos.nombre, campos.apellidoPaterno, campos.apellidoMaterno].filter(Boolean).join(" ");

                    var filas = [];

                    /* ── Nombre ── */
                    if (nombreExtraido) {
                      var st = _nombreCoincide(nombreExtraido, nombreReferencia);
                      var nomColor = st === "exacto" ? "#059669" : st === "similar" ? "#d97706" : "#e0492f";
                      var nomBg    = st === "exacto" ? "#f0fdf4"  : st === "similar" ? "#fffbeb"  : "#fef2f2";
                      var nomTxt   = st === "exacto" ? "coincide"
                                   : st === "similar" ? "coincidencia parcial - verificar"
                                   : "diferente al nombre registrado (" + nombreReferencia + ")";
                      filas.push({ label:"Nombre", valor:nombreExtraido, color:nomColor, bg:nomBg,
                        icon: st === "exacto" ? "✓" : st === "similar" ? "⚠" : "✗", txt:nomTxt });
                    }

                    /* ── Vigencia (licencia) ── */
                    if (campos.vigencia) {
                      var fecha = _parseVigencia(campos.vigencia);
                      if (fecha) {
                        var dias = Math.round((fecha - new Date()) / 86400000);
                        var vigColor = dias < 0 ? "#e0492f" : dias < 30 ? "#d97706" : "#059669";
                        var vigBg    = dias < 0 ? "#fef2f2"  : dias < 30 ? "#fffbeb"  : "#f0fdf4";
                        var vigIcon  = dias < 0 ? "✗" : dias < 30 ? "⚠" : "✓";
                        var vigTxt   = dias < 0
                          ? "vencida hace " + Math.abs(dias) + " días — no válida"
                          : dias === 0 ? "vence hoy"
                          : dias < 30 ? "vence en " + dias + " días — por renovar"
                          : "vigente por " + Math.round(dias / 30.44) + " mes" + (Math.round(dias / 30.44) !== 1 ? "es" : "");
                        filas.push({ label:"Vigencia", valor:campos.vigencia,
                          color:vigColor, bg:vigBg, icon:vigIcon, txt:vigTxt });
                      }
                    }

                    /* ── Comprobante: antigüedad del recibo ── */
                    if (docType === "domicilio" && campos.fechaDocumento) {
                      filas.push({ label:"Período", valor:campos.fechaDocumento,
                        color:"#2f6fed", bg:"#eff6ff", icon:"ℹ", txt:"verificar que sea reciente (≤ 3 meses)" });
                    }

                    if (filas.length === 0) return null;

                    return (
                      <div style={{ margin:"10px 14px", padding:"10px 14px", borderRadius:9,
                        background:"var(--bg)", border:"1px solid var(--line)" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"var(--muted)",
                          textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>
                          Validación del documento
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {filas.map(function(r, i) {
                            return (
                              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
                                padding:"7px 10px", borderRadius:7, background:r.bg,
                                border:"1px solid " + r.color + "33" }}>
                                <span style={{ fontWeight:800, color:r.color, fontSize:13,
                                  lineHeight:"18px", flexShrink:0, minWidth:14 }}>{r.icon}</span>
                                <div style={{ fontSize:12, lineHeight:"18px", minWidth:0 }}>
                                  <span style={{ color:"var(--muted)", fontWeight:600 }}>{r.label}: </span>
                                  <span style={{ fontWeight:700, color:"var(--ink)" }}>{r.valor}</span>
                                  <span style={{ color:r.color, fontWeight:600 }}> — {r.txt}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Aplicar */}
                  <div style={{ padding:"9px 14px", borderTop:"1px solid #a7f3d0", background:"#f0fdf4" }}>
                    <button onClick={aplicar}
                      style={{ width:"100%", padding:"7px", border:"none", borderRadius:7,
                        background:"#059669", color:"#fff", fontSize:12, fontWeight:700,
                        cursor:"pointer" }}>
                      Aplicar al formulario
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding:"14px", background:"var(--card)", fontSize:12, color:"var(--muted)",
                  textAlign:"center" }}>
                  No se pudo leer información del documento. Intenta con una imagen más clara.
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        /* ── Zona de drop vacía ── */
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current && inputRef.current.click()}
          style={{ border:"2px dashed " + (dragging ? "var(--accent)" : "var(--line)"),
            borderRadius:9, padding:"30px 16px", textAlign:"center", cursor:"pointer",
            transition:"all .15s", background: dragging ? "#eff6ff" : "var(--bg)",
            display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={dragging ? "var(--accent)" : "var(--muted)"}
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.4 }}>
            Arrastra aquí o{" "}
            <span style={{ color:"var(--accent)", fontWeight:600 }}>haz clic para seleccionar</span>
          </div>
          <div style={{ fontSize:11, color:"var(--muted)", opacity:.7 }}>JPG · PNG · PDF</div>
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display:"none" }}
            onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />
        </div>
      )}
    </div>
  );
}

/* ── Modal selector de unidad desde inventario Plan Piso ──────────────────── */
function UnitPickerModal({ onSelect, onClose }) {
  var [q, setQ] = React.useState("");
  var rows = (window.AUTOMIND && window.AUTOMIND.ROWS) || [];
  var COLOR_SEM = {
    saludable:"#22c55e", rotacion:"#d99613", comprometido:"#f97316",
    vencer:"#e0492f",    intereses:"#374151",
  };
  var filtradas = rows.filter(function(r) {
    if (!q) return true;
    var txt = [r.marca, r.modelo, r.anio, r.vin, r.colorExterior, r.version].filter(Boolean).join(" ").toLowerCase();
    var palabras = q.toLowerCase().trim().split(/\s+/);
    return palabras.every(function(p){ return txt.includes(p); });
  });
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
      zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onClose}>
      <div style={{
        background:"var(--card)", borderRadius:14, width:640, maxWidth:"92vw",
        maxHeight:"75vh", display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,.35)",
      }} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{
          padding:"16px 20px", borderBottom:"1px solid var(--line)",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <span style={{ fontSize:15, fontWeight:700, color:"var(--ink)", flex:1 }}>
            Seleccionar unidad del inventario
          </span>
          <button onClick={onClose} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:18, color:"var(--muted)", lineHeight:1, padding:0,
          }}>✕</button>
        </div>
        <div style={{ padding:"12px 20px", borderBottom:"1px solid var(--line)" }}>
          <input autoFocus placeholder="Buscar por marca, modelo, color, año o VIN…"
            value={q} onChange={function(e){ setQ(e.target.value); }}
            style={{
              width:"100%", padding:"8px 12px", fontSize:14, boxSizing:"border-box",
              border:"1px solid var(--line)", borderRadius:8,
              background:"var(--bg)", color:"var(--ink)", outline:"none", fontFamily:"inherit",
            }} />
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {rows.length === 0 && (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>
              El inventario Plan Piso no está cargado en esta sesión.<br/>
              <span style={{ fontSize:12, opacity:.7 }}>Entra a Plan Piso primero para cargar los datos.</span>
            </div>
          )}
          {rows.length > 0 && filtradas.length === 0 && (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"var(--muted)", fontSize:13 }}>
              Sin resultados para «{q}»
            </div>
          )}
          {filtradas.map(function(r) {
            var desc = [r.marca, r.modelo, r.anio].filter(Boolean).join(" ");
            if (r.colorExterior) desc += " · " + r.colorExterior;
            if (r.vin) desc += " · " + r.vin;
            var dotColor = COLOR_SEM[r.semaforo] || "#9ca3af";
            return (
              <div key={r.id}
                onClick={function(){ onSelect({ id: r.id, desc: desc, precio: r.montoFinanciado || 0 }); }}
                style={{
                  padding:"11px 20px", display:"flex", alignItems:"center", gap:12,
                  cursor:"pointer", borderBottom:"1px solid var(--line)", transition:"background .12s",
                }}
                onMouseEnter={function(e){ e.currentTarget.style.background="var(--bg)"; }}
                onMouseLeave={function(e){ e.currentTarget.style.background=""; }}
              >
                <span style={{ width:10, height:10, borderRadius:"50%", background:dotColor, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{[r.marca, r.modelo, r.anio].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>
                    {[r.colorExterior, r.vin].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span style={{
                  fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:dotColor,
                }}>{r.semaforo || ""}</span>
              </div>
            );
          })}
        </div>
        {filtradas.length > 0 && (
          <div style={{ padding:"8px 20px", borderTop:"1px solid var(--line)", fontSize:11, color:"var(--muted)" }}>
            {filtradas.length} unidad{filtradas.length !== 1 ? "es" : ""} en inventario
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Modal de recompra: copia datos del cliente + elige vehículo nuevo ──────── */
function RecompraModal({ cliente, onConfirm, onClose }) {
  var [unidad,        setUnidad]        = React.useState(null);   // { id, desc, precio }
  var [showPicker,    setShowPicker]    = React.useState(false);
  var [guardando,     setGuardando]     = React.useState(false);
  // Keys de documentos que el usuario quiere actualizar (no reutilizar)
  var [docsActualizar, setDocsActualizar] = React.useState(new Set());

  // Documentos presentes en el cliente origen
  var DOCS_POSIBLES = [
    { key:"docId",        label:"INE / Identificación oficial" },
    { key:"docLicencia",  label:"Licencia de manejo" },
    { key:"docDomicilio", label:"Comprobante de domicilio" },
    { key:"docRfc",       label:"RFC / Constancia fiscal" },
  ];
  var docsPresentes = DOCS_POSIBLES.filter(function(d) { return !!cliente[d.key]; });

  function toggleDoc(key) {
    setDocsActualizar(function(prev) {
      var next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function confirmar() {
    if (!unidad) return;
    setGuardando(true);
    try {
      // Construir copia del cliente con los documentos marcados como "Actualizar" → null
      var clienteModificado = Object.assign({}, cliente);
      docsActualizar.forEach(function(k) { clienteModificado[k] = null; });
      await onConfirm(clienteModificado, unidad);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1100 }}
        onClick={onClose} />
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"var(--card)", borderRadius:16, padding:"28px 28px 24px",
        width:500, maxWidth:"95vw", maxHeight:"88vh", overflowY:"auto", zIndex:1101,
        boxShadow:"0 8px 40px rgba(0,0,0,.18)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"#ede9fe",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
            🔄
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:16, color:"var(--ink)" }}>Nueva compra</div>
            <div style={{ fontSize:13, color:"var(--muted)", overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {cliente.nombre}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            cursor:"pointer", fontSize:20, color:"var(--muted)", padding:"0 4px" }}>✕</button>
        </div>

        {/* Datos personales que se copian siempre */}
        <div style={{ background:"var(--bg)", borderRadius:10, padding:"12px 14px",
          marginBottom:16, fontSize:12, color:"var(--muted)", lineHeight:1.7 }}>
          <div style={{ fontWeight:700, color:"var(--ink)", marginBottom:4, fontSize:11,
            textTransform:"uppercase", letterSpacing:".06em" }}>Datos que se reutilizarán</div>
          {[
            cliente.tel   && "Tel: " + cliente.tel,
            cliente.email && "Email: " + cliente.email,
            cliente.rfc   && "RFC: " + cliente.rfc,
            cliente.curp  && "CURP: " + cliente.curp,
            (cliente.direccion || cliente.ciudad) && ("Domicilio: " + [cliente.direccion, cliente.ciudad, cliente.estado].filter(Boolean).join(", ")),
          ].filter(Boolean).map(function(txt, i) { return <div key={i}>{txt}</div>; })}
        </div>

        {/* Selección de documentos */}
        {docsPresentes.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:".06em", color:"var(--muted)", marginBottom:10 }}>
              Documentos — ¿usar existente o actualizar?
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {docsPresentes.map(function(d) {
                var actualizar = docsActualizar.has(d.key);
                return (
                  <div key={d.key}
                    style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"9px 12px", borderRadius:10,
                      border:"1.5px solid " + (actualizar ? "#f59e0b" : "#22c55e"),
                      background: actualizar ? "#fffbeb" : "#f0fdf4",
                      transition:"all .15s" }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>{actualizar ? "🔄" : "✅"}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600,
                      color: actualizar ? "#92400e" : "#166534" }}>
                      {d.label}
                    </span>
                    {/* Selector tipo segmentado */}
                    <div style={{ display:"flex", borderRadius:8, overflow:"hidden",
                      border:"1.5px solid " + (actualizar ? "#f59e0b" : "#22c55e"),
                      flexShrink:0, fontSize:11, fontWeight:700 }}>
                      <button
                        onClick={function(){ if (actualizar) toggleDoc(d.key); }}
                        style={{ padding:"5px 11px", border:"none", cursor: actualizar ? "pointer" : "default",
                          background: actualizar ? "transparent" : "#22c55e",
                          color:      actualizar ? "#a16207"     : "#fff",
                          transition:"all .12s" }}>
                        ✓ Usar existente
                      </button>
                      <button
                        onClick={function(){ if (!actualizar) toggleDoc(d.key); }}
                        style={{ padding:"5px 11px", border:"none",
                          borderLeft:"1.5px solid " + (actualizar ? "#f59e0b" : "#22c55e"),
                          cursor: actualizar ? "default" : "pointer",
                          background: actualizar ? "#f59e0b" : "transparent",
                          color:      actualizar ? "#fff"    : "#166534",
                          transition:"all .12s" }}>
                        ↑ Actualizar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {docsActualizar.size > 0 && (
              <div style={{ fontSize:11, color:"#b45309", marginTop:8, padding:"6px 10px",
                background:"#fef3c7", borderRadius:8, lineHeight:1.5 }}>
                Los documentos en <strong>Actualizar</strong> quedarán vacíos para que
                cargues una versión nueva en el expediente.
              </div>
            )}
          </div>
        )}

        {/* Selector de vehículo */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", marginBottom:8 }}>
            Vehículo nuevo *
          </div>
          {unidad ? (
            <div style={{ display:"flex", alignItems:"center", gap:8,
              border:"1px solid var(--accent)", borderRadius:10, padding:"10px 14px",
              background:"#eff6ff" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, color:"var(--ink)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {unidad.desc}
                </div>
              </div>
              <button onClick={function(){ setShowPicker(true); }}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:7, border:"1px solid var(--accent)",
                  background:"none", color:"var(--accent)", cursor:"pointer", fontWeight:600, flexShrink:0 }}>
                Cambiar
              </button>
            </div>
          ) : (
            <button onClick={function(){ setShowPicker(true); }}
              style={{ width:"100%", padding:"14px", borderRadius:10, fontSize:13, fontWeight:600,
                border:"2px dashed var(--line)", background:"var(--bg)", color:"var(--muted)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              🚗 Seleccionar vehículo del inventario
            </button>
          )}
        </div>

        {/* Acciones */}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} disabled={guardando}
            style={{ padding:"9px 18px", borderRadius:9, border:"1px solid var(--line)",
              background:"var(--bg)", color:"var(--ink)", fontSize:13, cursor:"pointer", fontWeight:600 }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={!unidad || guardando}
            style={{ padding:"9px 20px", borderRadius:9, border:"none",
              background: unidad && !guardando ? "var(--accent)" : "var(--line)",
              color: unidad && !guardando ? "#fff" : "var(--muted)",
              fontSize:13, cursor: unidad ? "pointer" : "not-allowed",
              fontWeight:700, display:"flex", alignItems:"center", gap:7 }}>
            {guardando ? "Creando…" : "🔄 Iniciar nueva compra"}
          </button>
        </div>
      </div>

      {/* UnitPickerModal anidado */}
      {showPicker && (
        <UnitPickerModal
          onSelect={function(u){ setUnidad(u); setShowPicker(false); }}
          onClose={function(){ setShowPicker(false); }}
        />
      )}
    </>
  );
}

/* ── Sección colapsable + campo de formulario (nivel módulo para estabilidad de hooks) ── */
function Sec({ ico, titulo, children, defaultOpen }) {
  var [open, setOpen] = React.useState(defaultOpen ? true : false);
  return (
    <div className="ef-seccion" style={{ overflow:"hidden" }}>
      <div className="ef-sec-head"
        onClick={function(){ setOpen(function(o){ return !o; }); }}
        style={{ cursor:"pointer", userSelect:"none", display:"flex",
          alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <span style={{ display:"flex", alignItems:"center", color:"var(--muted)" }}>{ico}</span>
          <span style={{ marginLeft:6 }}>{titulo}</span>
        </div>
        <span style={{
          display:"flex", alignItems:"center", color:"var(--muted)",
          transition:"transform .2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </div>
      {open && <div className="ef-grid">{children}</div>}
    </div>
  );
}

function Fld({ label, full, req, children }) {
  return (
    <div className="ef-field" style={{ gridColumn: full ? "1/-1" : undefined }}>
      <label className="ef-label">{label}{req && <span className="ef-req"> *</span>}</label>
      {children}
    </div>
  );
}

/* ── Resumen de expediente (panel fijo arriba del form) ──────────────────── */
function _buildExpedienteItems(form) {
  var esCredito = form.formaPagoCot === "Crédito";
  var items = [
    { label:"Nombre completo",    ok:!!(form.nombre),                                       req:true  },
    { label:"Teléfono / email",   ok:!!(form.tel || form.email),                            req:true  },
    { label:"CURP (18 car.)",     ok:!!(form.curp && form.curp.length === 18),              req:false },
    { label:"RFC",                ok:!!(form.rfc),                                          req:false },
    { label:"Domicilio",          ok:!!(form.direccion && form.colonia && form.cp),         req:false },
    { label:"INE / Identificación", ok:!!(form.docId && (form.docId.storageKey || form.docId.dataUrl)), req:false },
    { label:"Licencia de manejar",  ok:!!(form.docLicencia && (form.docLicencia.storageKey || form.docLicencia.dataUrl)), req:false },
    { label:"Comprobante domicilio",ok:!!(form.docDomicilio && (form.docDomicilio.storageKey || form.docDomicilio.dataUrl)), req:false },
    { label:"Unidad seleccionada",ok:!!(form.unidadId),                                    req:true  },
    { label:"Cotización / precio", ok:!!(form.precioVenta > 0),                            req:true  },
    { label:"Aprobación gerente", ok: form.e5Estado === "Aprobado",                        req:true  },
  ];
  if (esCredito) {
    items.push({ label:"Resultado crédito E6", ok: form.e6Estado === "Aprobado" || form.e6Estado === "Condicional", req:true });
  }
  items.push({ label:"Contrato revisado", ok:!!form.e7ContratoOk, req:false, manual:true });
  return items;
}

function ExpedienteResumen({ form }) {
  var items = _buildExpedienteItems(form);
  var hayRojo    = items.some(function(x){ return x.req && !x.ok && !form.e7ExcepcionAuth; });
  var hayAmarillo= !hayRojo && items.some(function(x){ return !x.ok; });
  var semColor   = hayRojo ? "#ef4444" : hayAmarillo ? "#eab308" : "#22c55e";
  var semLabel   = hayRojo ? "Incompleto" : hayAmarillo ? "Pendiente" : "Completo";
  var semBg      = hayRojo ? "rgba(239,68,68,.06)" : hayAmarillo ? "rgba(234,179,8,.06)" : "rgba(34,197,94,.06)";
  var pend       = items.filter(function(x){ return !x.ok; }).length;

  return (
    <div style={{
      padding:"10px 20px 12px", borderBottom:"1px solid var(--line)", background:semBg,
    }}>
      {/* ── Cabecera ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:".04em",
          color:"var(--ink-2)", textTransform:"uppercase" }}>
          Expediente
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {pend > 0 && (
            <span style={{ fontSize:10, color:"var(--muted)" }}>
              {pend} {pend === 1 ? "pendiente" : "pendientes"}
            </span>
          )}
          <span style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"3px 10px 3px 7px", borderRadius:999,
            background: semColor + "20", border:"1px solid " + semColor + "55",
            fontSize:11, fontWeight:700, color:semColor,
          }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:semColor,
              boxShadow:"0 0 5px " + semColor }} />
            {semLabel}
          </span>
        </div>
      </div>
      {/* ── Grid de ítems ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",
        gap:"3px 6px",
      }}>
        {items.map(function(it, idx) {
          var dot  = it.ok ? "#22c55e" : (it.req && !form.e7ExcepcionAuth) ? "#ef4444" : "#94a3b8";
          var icon = it.ok ? "✓" : (it.req && !form.e7ExcepcionAuth) ? "✗" : "○";
          return (
            <div key={idx} style={{ display:"flex", alignItems:"center", gap:5, padding:"2px 0" }}>
              <span style={{
                width:15, height:15, borderRadius:3, flexShrink:0,
                background: dot + "20", border:"1px solid " + dot + "80",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:9, fontWeight:900, color:dot,
              }}>{icon}</span>
              <span style={{
                fontSize:11,
                color: it.ok ? "var(--ink)" : (it.req && !form.e7ExcepcionAuth) ? "#991b1b" : "var(--muted)",
                fontWeight: (it.req && !it.ok && !form.e7ExcepcionAuth) ? 600 : 400,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Stepper de etapas ────────────────────────────────────────────────────── */
function EtapaStepper({ etapaActual, onCambiar, formaPagoCot }) {
  var idx = ETAPAS_CRM.indexOf(etapaActual);
  var esNoCredito = formaPagoCot !== "Crédito"; /* No definido + Contado bloquean */
  return (
    <div style={{
      padding:"14px 20px 10px",
      borderBottom:"1px solid var(--line)",
      background:"var(--card)",
    }}>
      <div style={{
        display:"flex", alignItems:"flex-start",
        overflowX:"auto", paddingBottom:2,
      }}>
        {ETAPAS_CRM.map(function(etapa, i) {
          var completada = i < idx;
          var activa     = i === idx;
          var futura     = i > idx;
          var esNA       = esNoCredito && etapa === "Crédito";
          var cfg        = ETAPA_CFG[etapa] || { dot:"#9ca3af", bg:"#f3f4f6", txt:"#6b7280" };
          var dotBorder  = esNA ? "#d1d5db" : activa ? cfg.dot : completada ? "#1f9d57" : "var(--line)";
          var dotBg      = esNA ? "#f3f4f6" : activa ? cfg.dot : completada ? "#1f9d57" : "var(--card)";
          var lblColor   = esNA ? "#9ca3af" : activa ? cfg.txt : completada ? "#065f46" : "var(--muted)";
          var lblBg      = esNA ? "transparent" : activa ? cfg.bg  : "transparent";
          var lineColor  = i < idx ? "#1f9d57" : "var(--line)";

          return (
            <React.Fragment key={etapa}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0 }}>
                {/* Dot / botón */}
                <button
                  type="button"
                  onClick={function(){ onCambiar(etapa); }}
                  title={"Mover a: " + etapa}
                  style={{
                    width:28, height:28, borderRadius:"50%",
                    border:"2px solid " + dotBorder,
                    background: dotBg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", outline:"none", transition:"all .18s",
                    boxShadow: activa ? ("0 0 0 4px " + cfg.dot + "28") : "none",
                    flexShrink:0,
                  }}
                >
                  {esNA ? (
                    <span style={{ fontSize:11, fontWeight:800, color:"#9ca3af", lineHeight:1 }}>—</span>
                  ) : completada ? (
                    /* Checkmark para etapas completadas */
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8"
                      strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <span style={{
                      width: activa ? 9 : 7, height: activa ? 9 : 7,
                      borderRadius:"50%",
                      background: activa ? "#fff" : (futura ? "var(--line)" : dotBg),
                      display:"block", transition:"all .18s",
                    }} />
                  )}
                </button>

                {/* Label */}
                <span style={{
                  fontSize:9.5, fontWeight: activa ? 800 : completada ? 600 : 500,
                  color: lblColor, whiteSpace:"nowrap",
                  padding: activa ? "2px 7px" : "1px 2px",
                  borderRadius:5, background: lblBg,
                  letterSpacing: activa ? ".01em" : "normal",
                  textDecoration: esNA ? "line-through" : "none",
                  transition:"all .18s",
                }}>
                  {esNA ? "N/A" : etapa}
                </span>
              </div>

              {/* Línea conectora */}
              {i < ETAPAS_CRM.length - 1 && (
                <div style={{
                  height:2, flex:1, minWidth:8,
                  background: lineColor,
                  marginTop:13,
                  borderRadius:2,
                  transition:"background .3s",
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ── Editor split‑panel de clientes (espejo de inventario‑editor) ────────── */

/* ── Cabecera del expediente individual ────────────────────────────────── */
function ExpedienteHeader({ form, onChangeEstado }) {
  var items    = _buildExpedienteItems(form);
  var total    = items.length;
  var done     = items.filter(function(x){ return x.ok; }).length;
  var pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  var docsPend = items.filter(function(x){ return !x.ok && !x.manual; }).length;

  var ESTADOS  = ["Activo","En espera","Detenido","Cancelado","Venta completada"];
  var ESTADO_CLR = {
    "Activo":           { bg:"rgba(34,197,94,.12)",  txt:"#16a34a", dot:"#22c55e" },
    "En espera":        { bg:"rgba(234,179,8,.12)",   txt:"#854d0e", dot:"#eab308" },
    "Detenido":         { bg:"rgba(107,114,128,.12)", txt:"#4b5563", dot:"#6b7280" },
    "Cancelado":        { bg:"rgba(239,68,68,.10)",   txt:"#dc2626", dot:"#ef4444" },
    "Venta completada": { bg:"rgba(59,130,246,.10)",  txt:"#1d4ed8", dot:"#3b82f6" },
  };
  var est    = form.estadoGeneral || "Activo";
  var clrEst = ESTADO_CLR[est] || ESTADO_CLR["Activo"];
  var pctColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

  return (
    <div style={{
      padding:"14px 20px 12px", background:"var(--card)",
      borderBottom:"1px solid var(--line)", flexShrink:0,
    }}>
      {/* Fila 1: nombre + estado + pct */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--ink)",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {form.nombre || "Nuevo cliente"}
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
            {form.tipo || "Persona física"}
            {form.tel   ? " · " + form.tel   : ""}
            {form.email ? " · " + form.email : ""}
          </div>
        </div>
        <select value={est}
          onChange={function(e){ onChangeEstado(e.target.value); }}
          style={{
            padding:"4px 10px", borderRadius:7, fontSize:12, fontWeight:700,
            border:"1px solid " + clrEst.dot,
            background:clrEst.bg, color:clrEst.txt,
            cursor:"pointer", outline:"none", flexShrink:0,
          }}>
          {ESTADOS.map(function(s){ return <option key={s} value={s}>{s}</option>; })}
        </select>
      </div>

      {/* Fila 2: pills de info rápida */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
        {form.asesor && (
          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5,
            background:"var(--bg)", border:"1px solid var(--line)", color:"var(--muted)" }}>
            👤 {form.asesor}
          </span>
        )}
        {(form.unidadDesc || form.interes) && (function(){
          var raw    = form.unidadDesc || form.interes || "";
          var partes = raw.split(" · ");
          var nombre = partes[0];
          var detalle= partes.slice(1).join(" · "); // color + VIN
          return (
            <span style={{ fontSize:11, padding:"3px 9px", borderRadius:5,
              background:"var(--bg)", border:"1px solid var(--line)", color:"var(--ink)",
              display:"flex", flexDirection:"column", alignItems:"flex-start", gap:1 }}>
              <span style={{ fontWeight:600 }}>🚗 {nombre}</span>
              {detalle && <span style={{ fontWeight:400, color:"var(--muted)", fontSize:10 }}>{detalle}</span>}
            </span>
          );
        })()}
        {form.formaPagoCot && form.formaPagoCot !== "No definido" ? (
          <span style={{
            fontSize:11, padding:"2px 8px", borderRadius:5, fontWeight:700,
            background: form.formaPagoCot === "Crédito" ? "rgba(59,130,246,.12)" : "rgba(34,197,94,.12)",
            color:      form.formaPagoCot === "Crédito" ? "#1d4ed8"              : "#15803d",
          }}>
            {form.formaPagoCot === "Crédito" ? "💳 Crédito" : "💵 Contado"}
          </span>
        ) : null}
        {form.etapa && (
          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5,
            background:"rgba(37,99,235,.10)", color:"#1d4ed8",
            fontWeight:600 }}>
            {form.etapa}
          </span>
        )}
        {docsPend > 0 && (
          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5,
            background:"rgba(239,68,68,.10)", color:"#dc2626", fontWeight:700 }}>
            ⚠️ {docsPend} doc{docsPend > 1 ? "s" : ""} pendiente{docsPend > 1 ? "s" : ""}
          </span>
        )}
        {form.prox && (
          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5,
            background:"var(--bg)", border:"1px solid var(--line)", color:"var(--muted)" }}>
            📅 {form.prox}
            {form.fprox ? " · " + new Date(form.fprox + "T12:00:00").toLocaleDateString("es-MX",{ day:"numeric", month:"short" }) : ""}
          </span>
        )}
      </div>

      {/* Fila 3: barra de avance */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11, color:"var(--muted)", flexShrink:0 }}>Avance</span>
        <div style={{ flex:1, height:5, background:"var(--line)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:pct+"%", background:pctColor,
            borderRadius:3, transition:"width .4s ease" }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:pctColor, minWidth:32 }}>{pct}%</span>
        <span style={{ fontSize:11, color:"var(--muted)" }}>{done}/{total} ítems</span>
      </div>
    </div>
  );
}

/* ── Sección Aviso de Privacidad (tab Perfilamiento) ─────────────────────── */
function AvisoPrivacidadSection({ form, set }) {
  var [descargando, setDescargando] = React.useState(false);
  var [subiendo,    setSubiendo]    = React.useState(false);
  var inputRef = React.useRef(null);
  var aviso = form.docAviso; // { name, storageKey } | null
  var firmado = !!(aviso && aviso.storageKey);

  async function descargar() {
    setDescargando(true);
    try {
      var wId = window.AUTOMIND && window.AUTOMIND.agencyId;
      var res  = await window.DB.getAvisoSignedUrl(wId);
      if (res && res.url) { window.open(res.url, "_blank"); }
      else { alert("No se encontró el aviso de privacidad. Pide al administrador que lo suba en la sección Equipo."); }
    } catch(e) { alert("Error al descargar el aviso: " + (e.message || e)); }
    finally { setDescargando(false); }
  }

  async function verFirmado() {
    if (!aviso || !aviso.storageKey) return;
    try {
      var res = await window.DB.storage.from("expedientes").createSignedUrl(aviso.storageKey, 600);
      if (res.data && res.data.signedUrl) window.open(res.data.signedUrl, "_blank");
    } catch(e) { alert("No se pudo abrir el archivo."); }
  }

  async function handleFile(file) {
    if (!file) return;
    var ext = (file.name || "").split(".").pop().toLowerCase();
    var permitidos = ["pdf", "docx", "doc", "jpg", "jpeg", "png"];
    if (!permitidos.includes(ext)) { alert("Formato no permitido. Usa PDF, DOCX o imagen."); return; }
    setSubiendo(true);
    try {
      var key = "clientes/avisos/" + Date.now() + "-" + Math.random().toString(36).slice(2,6) + "." + ext;
      var { error } = await window.DB.storage.from("expedientes").upload(key, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      set("docAviso", { name: file.name, storageKey: key });
    } catch(e) { alert("Error al subir el aviso: " + (e.message || e)); }
    finally { setSubiendo(false); }
  }

  var btnBase = {
    fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
    cursor: "pointer", border: "1px solid var(--line)", background: "var(--card)",
    color: "var(--ink)", display: "flex", alignItems: "center", gap: 5,
    transition: "opacity .12s",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Status */}
      <div>
        <span style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:700,
          background: firmado ? "#d1fae5" : "#fff7ed",
          color: firmado ? "#059669" : "#b45309",
        }}>
          {firmado ? "✓ Aviso firmado por el cliente" : "⏳ Pendiente de firma del cliente"}
        </span>
      </div>

      {/* Acciones */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button type="button" onClick={descargar} disabled={descargando}
          style={{ ...btnBase, opacity: descargando ? .5 : 1 }}>
          {descargando
            ? <><span style={{fontSize:13}}>⏳</span> Descargando…</>
            : <><span style={{fontSize:13}}>⬇</span> Descargar aviso plantilla</>}
        </button>

        {firmado && (
          <button type="button" onClick={verFirmado}
            style={{ ...btnBase, borderColor:"#059669", color:"#059669" }}>
            <span style={{fontSize:13}}>📄</span> Ver aviso firmado
          </button>
        )}

        <button type="button" onClick={function(){ inputRef.current && inputRef.current.click(); }}
          disabled={subiendo}
          style={{ ...btnBase, background:"var(--accent)", color:"#fff", border:"none",
            opacity: subiendo ? .5 : 1 }}>
          {subiendo
            ? <><span style={{fontSize:13}}>⏳</span> Subiendo…</>
            : <><span style={{fontSize:13}}>⬆</span> {firmado ? "Reemplazar aviso firmado" : "Cargar aviso firmado"}</>}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
          style={{ display:"none" }}
          onChange={function(e){ var f = e.target.files && e.target.files[0]; e.target.value = ""; handleFile(f); }} />
      </div>

      {firmado && (
        <div style={{ fontSize:11, color:"var(--muted)" }}>
          Archivo: <strong style={{color:"var(--ink)"}}>{aviso.name}</strong>
        </div>
      )}
    </div>
  );
}

/* ── Motor de auto-avance de etapa ──────────────────────────────────────── */
function calcularEtapaSugerida(f) {
  if (!f) return null;
  var etapas = ETAPAS_CRM; // ["Prospección","Perfilamiento","Presentación","Cotización","Expediente","Crédito","Pago","Cierre"]
  var idxActual = etapas.indexOf(f.etapa || "Prospección");
  var maxIdx = idxActual; // nunca retrocede

  /* ── Helpers ── */
  var docOk = function(d) { return !!(d && (d.storageKey || d.dataUrl)); };

  /* Prospección → Perfilamiento: nombre + (tel o email) */
  if (f.nombre && f.nombre.trim() && (f.tel || f.email))
    maxIdx = Math.max(maxIdx, 1);

  /* Perfilamiento → Presentación: canal + interes + presupuesto */
  if (maxIdx >= 1 && f.canal && f.interes && Number(f.presupuesto) > 0)
    maxIdx = Math.max(maxIdx, 2);

  /* Presentación → Cotización: prueba de manejo realizada */
  if (maxIdx >= 2 && f.pruebaManejo && f.fechaPrueba)
    maxIdx = Math.max(maxIdx, 3);

  /* Cotización → Expediente: unidad seleccionada + precio de venta */
  if (maxIdx >= 3 && f.unidadDesc && Number(f.precioVenta) > 0)
    maxIdx = Math.max(maxIdx, 4);

  /* Expediente → Crédito: al menos 1 documento subido */
  var docsOk = [f.docId, f.docLicencia, f.docDomicilio].filter(docOk).length;
  if (maxIdx >= 4 && docsOk >= 1)
    maxIdx = Math.max(maxIdx, 5);

  /* Crédito → Pago: contado (N/A crédito) o crédito aprobado/condicional */
  if (maxIdx >= 5) {
    if (f.formaPagoCot !== "Crédito")
      maxIdx = Math.max(maxIdx, 6); // Contado/No definido → salta Crédito, va a Pago
    else if (f.e6Estado === "Aprobado" || f.e6Estado === "Condicional")
      maxIdx = Math.max(maxIdx, 6); // Crédito aprobado → Pago
  }

  /* Pago → Cierre: pago registrado */
  if (maxIdx >= 6 && f.pagoMetodo)
    maxIdx = Math.max(maxIdx, 7);

  return maxIdx !== idxActual ? etapas[maxIdx] : null; // null = sin cambio
}

function ClienteEditor({ clientes, defaultSelId, onUpdate, onDelete, usuarioActual }) {
  const primer = defaultSelId
    ? (clientes.find(c => c.id === defaultSelId) || clientes[0])
    : clientes[0];

  const [selId, setSelId] = React.useState(primer ? primer.id : null);
  const [form,  setForm]  = React.useState(primer ? { ...primer } : null);
  const [dirty, setDirty] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [q,     setQ]     = React.useState("");
  const [showUnitPicker, setShowUnitPicker] = React.useState(false);
  const [e8Subiendo, setE8Subiendo] = React.useState(false);
  const [e8ErrSub,   setE8ErrSub]   = React.useState('');
  const [tabActivo,       setTabActivo]       = React.useState("datos");
  const [historial,       setHistorial]       = React.useState([]);
  const [cargandoHist,    setCargandoHist]    = React.useState(false);
  const [filtroHistorial, setFiltroHistorial] = React.useState("");
  const [notaHistorial,   setNotaHistorial]   = React.useState("");
  const autoSaveTimerRef = React.useRef(null);
  const [autoGuardando, setAutoGuardando] = React.useState(false);
  const [etapaAvanzada, setEtapaAvanzada] = React.useState(null); /* toast de auto-avance */
  const [verifyStates, setVerifyStates]   = React.useState({ tel: null, email: null }); /* #01 verificación */
  const [delConfirm,   setDelConfirm]     = React.useState(false); /* confirmación eliminar cliente */
  const [delEliminando, setDelEliminando] = React.useState(false);

  /* Solo gerente, director, superadmin y agencyOwner pueden eliminar clientes */
  const puedeEliminar = usuarioActual && (
    usuarioActual.isSuperAdmin ||
    usuarioActual.isAgencyOwner ||
    usuarioActual.rol === "gerente" ||
    usuarioActual.rol === "director"
  );

  /* Auto-seleccionar cuando llega un cliente recién creado */
  React.useEffect(() => {
    if (!defaultSelId) return;
    const c = clientes.find(x => x.id === defaultSelId);
    if (!c) return;
    setSelId(defaultSelId);
    setForm({ ...c });
    setDirty(false); setSaved(false);
  }, [defaultSelId]);

  /* Resincronizar form si el array cambia y no hay edición en vuelo */
  React.useEffect(() => {
    if (!dirty && selId) {
      const c = clientes.find(x => x.id === selId);
      if (c) setForm({ ...c });
    }
  }, [clientes]);

  /* Auto-avance de etapa cuando se cumplen requisitos */
  React.useEffect(() => {
    if (!form) return;
    var siguiente = calcularEtapaSugerida(form);
    if (!siguiente) return;
    /* Avanzar sin disparar el dirty general para no contaminar auto-save */
    setForm(function(prev) { return prev ? Object.assign({}, prev, { etapa: siguiente }) : prev; });
    setEtapaAvanzada(siguiente);
    setDirty(true);
    setTimeout(function() { setEtapaAvanzada(null); }, 3500);
  }, [form && form.nombre, form && form.tel, form && form.email,
      form && form.canal, form && form.interes, form && form.presupuesto,
      form && form.pruebaManejo, form && form.fechaPrueba,
      form && form.unidadDesc, form && form.precioVenta,
      form && form.docId, form && form.docLicencia, form && form.docDomicilio,
      form && form.formaPagoCot, form && form.e6Estado]);

  /* Auto-guardado: 1.5 s después del último cambio */
  React.useEffect(() => {
    if (!dirty || !form) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async function() {
      setAutoGuardando(true);
      await handleSave();
      setAutoGuardando(false);
    }, 1500);
    return function() {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, dirty]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); setSaved(false); };

  async function selectCliente(id) {
    if (dirty && form) {
      // Guardar inmediatamente antes de cambiar de cliente
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      setAutoGuardando(true);
      await handleSave();
      setAutoGuardando(false);
    }
    const c = clientes.find(x => x.id === id);
    setSelId(id);
    setForm(c ? { ...c } : null);
    setDirty(false); setSaved(false);
  }

  /* #01 — Verificar contacto (WhatsApp / email) vía Edge Function */
  async function handleVerificar(tipo) {
    if (!form) return;
    var valor = tipo === "tel" ? form.tel : form.email;
    if (!valor || !valor.trim()) return;
    setVerifyStates(function(s) { return Object.assign({}, s, { [tipo]: "loading" }); });
    try {
      var { data: { session } } = await window.DB.client.auth.getSession();
      var body = tipo === "tel" ? { tel: valor } : { email: valor };
      var res  = await fetch(window.SUPABASE_URL + "/functions/v1/verify-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + session.access_token,
          "apikey": window.SUPABASE_ANON,
        },
        body: JSON.stringify(body),
      });
      var json = await res.json();
      var resultado = tipo === "tel" ? json.tel : json.email;
      if (!resultado) throw new Error("Respuesta inesperada del servidor");
      // Persistir en form si salió bien
      if (resultado.ok) {
        var ahora = new Date().toISOString();
        if (tipo === "tel") {
          set("telVerificadoAt",     ahora);
          set("telVerificadoMetodo", resultado.metodo);
        } else {
          set("emailVerificadoAt",     ahora);
          set("emailVerificadoMetodo", resultado.metodo);
        }
        setDirty(true);
      }
      setVerifyStates(function(s) { return Object.assign({}, s, { [tipo]: resultado }); });
    } catch(err) {
      setVerifyStates(function(s) { return Object.assign({}, s, { [tipo]: { ok:false, detalle: err.message } }); });
    }
  }

  async function handleDelete() {
    if (!form || !puedeEliminar || !onDelete) return;
    setDelEliminando(true);
    try {
      await window.DB.deleteCliente(form.id);
      setDelConfirm(false);
      onDelete(form.id);
    } catch(e) {
      alert("Error al eliminar el cliente: " + (e.message || e));
    } finally {
      setDelEliminando(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    try {
      /* ── Subir documentos pendientes a Storage antes de guardar ── */
      var formToSave = Object.assign({}, form, { _prev: { etapa: form.etapa, estadoGeneral: form.estadoGeneral, asesor: form.asesor } });
      var docCampos = [
        { key:"docFactura",        label:"Factura"       },
        { key:"docCotizacion",     label:"Cotización"    },
        { key:"docId",             label:"INE"           },
        { key:"docLicencia",       label:"Licencia"      },
        { key:"docDomicilio",      label:"Domicilio"     },
        { key:"docRfc",            label:"RFC"           },
        { key:"docEvidenciaPrueba", label:"Ev.Prueba"    },
        { key:"docEncuestaPrueba",  label:"Encuesta"     },
      ];
      for (var i = 0; i < docCampos.length; i++) {
        var dc  = docCampos[i];
        var doc = formToSave[dc.key];
        if (doc && doc.dataUrl && !doc.storageKey && window.DB && window.DB.storage) {
          try {
            var ext  = doc.type === "application/pdf" ? "pdf" : doc.type === "image/png" ? "png" : "jpg";
            var key  = "clientes/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
            var blob = _dataUrlToBlob(doc.dataUrl);
            var upResult = await window.DB.storage
              .from("expedientes")
              .upload(key, blob, { contentType: doc.type, upsert: false });
            if (!upResult.error) {
              /* Guardar sin el dataUrl para no inflar la BD */
              formToSave[dc.key] = { name: doc.name, type: doc.type, storageKey: key, cargadoEn: doc.cargadoEn };
              setForm(function(p) {
                var updated = Object.assign({}, p);
                updated[dc.key] = formToSave[dc.key];
                return updated;
              });
            } else {
              console.warn("[CRM] Upload " + dc.label + " falló:", upResult.error.message);
            }
          } catch(eDoc) {
            console.warn("[CRM] Upload " + dc.label + " error:", eDoc.message);
          }
        }
      }
      /* ── Subir comprobantes de pago pendientes ── */
      if (formToSave.docComprobantes && formToSave.docComprobantes.length > 0 && window.DB && window.DB.storage) {
        var comprobantesActualizados = formToSave.docComprobantes.slice();
        var algoCambio = false;
        for (var ci = 0; ci < comprobantesActualizados.length; ci++) {
          var comp = comprobantesActualizados[ci];
          if (comp.dataUrl && !comp.storageKey) {
            try {
              var cExt = comp.type === "application/pdf" ? "pdf" : comp.type === "image/png" ? "png" : "jpg";
              var cKey = "clientes/pago/" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + "." + cExt;
              var cBlob = _dataUrlToBlob(comp.dataUrl);
              var cUp = await window.DB.storage.from("expedientes").upload(cKey, cBlob, { contentType: comp.type, upsert: false });
              if (!cUp.error) {
                comprobantesActualizados[ci] = { name: comp.name, type: comp.type, storageKey: cKey,
                                                  cargadoEn: comp.cargadoEn, monto: comp.monto };
                algoCambio = true;
              }
            } catch(eCmp) {
              console.warn("[CRM] Upload comprobante error:", eCmp.message);
            }
          }
        }
        if (algoCambio) {
          formToSave.docComprobantes = comprobantesActualizados;
          setForm(function(p) { return Object.assign({}, p, { docComprobantes: comprobantesActualizados }); });
        }
      }
      await (onUpdate && onUpdate(formToSave));
      setDirty(false); setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch(e) {
      /* El error ya se muestra en onClienteUpdate */
    }
  }

  /* Aplica los campos extraídos por IA al formulario del cliente */
  function aplicarCampos(extractedCampos, fuente) {
    setForm(function(prev) {
      var upd = {};
      if (fuente === "id") {
        var partes = [extractedCampos.nombre, extractedCampos.apellidoPaterno, extractedCampos.apellidoMaterno].filter(Boolean);
        if (partes.length && !prev.nombre) upd.nombre   = partes.join(" ");
        if (extractedCampos.curp)          upd.curp     = extractedCampos.curp;
        if (extractedCampos.rfc)           upd.rfc      = extractedCampos.rfc;
        if (extractedCampos.fechaNacimiento) upd.fechaNac = extractedCampos.fechaNacimiento;
        if (extractedCampos.sexo)          upd.sexo     = extractedCampos.sexo;
        if (extractedCampos.direccion)     upd.direccion= extractedCampos.direccion;
        if (extractedCampos.colonia)       upd.colonia  = extractedCampos.colonia;
        if (extractedCampos.ciudad && !prev.ciudad) upd.ciudad = extractedCampos.ciudad;
        if (extractedCampos.estado && !prev.estado) upd.estado = extractedCampos.estado;
        if (extractedCampos.cp)            upd.cp       = extractedCampos.cp;
      }
      if (fuente === "domicilio") {
        if (extractedCampos.ciudad && !prev.ciudad) upd.ciudad   = extractedCampos.ciudad;
        if (extractedCampos.estado && !prev.estado) upd.estado   = extractedCampos.estado;
        if (extractedCampos.cp && !prev.cp)         upd.cp       = extractedCampos.cp;
        if (extractedCampos.direccion && !prev.direccion) upd.direccion = extractedCampos.direccion;
        if (extractedCampos.colonia && !prev.colonia)     upd.colonia   = extractedCampos.colonia;
      }
      if (fuente === "licencia") {
        if (extractedCampos.curp && !prev.curp) upd.curp = extractedCampos.curp;
        if (extractedCampos.nombre && !prev.nombre) {
          var partes = [extractedCampos.nombre, extractedCampos.apellidoPaterno, extractedCampos.apellidoMaterno].filter(Boolean);
          if (partes.length) upd.nombre = partes.join(" ");
        }
        if (extractedCampos.fechaNacimiento && !prev.fechaNac) upd.fechaNac   = extractedCampos.fechaNacimiento;
        if (extractedCampos.numeroLicencia)  upd.numLicencia = extractedCampos.numeroLicencia;
        if (extractedCampos.tipoLicencia)    upd.tipoLic     = extractedCampos.tipoLicencia;
        if (extractedCampos.vigencia)        upd.vigenciaLic = extractedCampos.vigencia;
      }
      if (fuente === "rfc") {
        if (extractedCampos.rfc)               upd.rfc    = extractedCampos.rfc;
        if (extractedCampos.curp && !prev.curp) upd.curp  = extractedCampos.curp;
        if (extractedCampos.nombre && !prev.nombre) {
          var partesRfc = [extractedCampos.nombre, extractedCampos.apellidoPaterno, extractedCampos.apellidoMaterno].filter(Boolean);
          if (partesRfc.length) upd.nombre = partesRfc.join(" ");
          else if (extractedCampos.razonSocial && !prev.nombre) upd.nombre = extractedCampos.razonSocial;
        }
        if (extractedCampos.cp && !prev.cp)         upd.cp     = extractedCampos.cp;
        if (extractedCampos.estado && !prev.estado) upd.estado = extractedCampos.estado;
        if (extractedCampos.ciudad && !prev.ciudad) upd.ciudad = extractedCampos.ciudad;
        if (extractedCampos.colonia && !prev.colonia) upd.colonia = extractedCampos.colonia;
        if (extractedCampos.direccion && !prev.direccion) upd.direccion = extractedCampos.direccion;
      }
      if (fuente === "solicitud_credito") {
        /* Parsear limpiando comas/puntos de miles y símbolo $ */
        function _parseMonto(v) {
          if (!v) return 0;
          var n = Number(String(v).replace(/[$,]/g, "").trim());
          return isNaN(n) ? 0 : Math.round(n);
        }
        var monto     = extractedCampos.montoFinanciado  ? _parseMonto(extractedCampos.montoFinanciado)  : 0;
        var mensual   = extractedCampos.montoMensualidad ? _parseMonto(extractedCampos.montoMensualidad) : 0;
        var meses     = extractedCampos.numMensualidades ? (parseInt(extractedCampos.numMensualidades) || 0) : 0;
        if (monto)   { upd.montoFinanciado = monto;  upd.e6MontoAprobado    = monto; }
        if (mensual) { upd.mensualidadEst  = mensual; upd.e6MensualidadReal = mensual; }
        if (meses)     upd.plazoMeses = meses;
        if (extractedCampos.institucion && !prev.e6Institucion) upd.e6Institucion = extractedCampos.institucion;
      }
      if (fuente === "cotizacion") {
        /* Parsear montos de la cotización — fuente de verdad para la validación de comprobantes */
        function _parseMontoC(v) {
          if (!v) return 0;
          var n = Number(String(v).replace(/[$,]/g, "").trim());
          return isNaN(n) ? 0 : Math.round(n);
        }
        var pv = extractedCampos.precioVenta ? _parseMontoC(extractedCampos.precioVenta) : 0;
        var pl = extractedCampos.precioLista ? _parseMontoC(extractedCampos.precioLista) : 0;
        var dm = extractedCampos.descuento   ? _parseMontoC(extractedCampos.descuento)   : 0;
        // precioVenta de la cotización es el precio definitivo (incluye IVA + accesorios)
        if (pv > 0) upd.precioVenta = pv;
        if (pl > 0) {
          upd.precioLista = pl;
          // Si no hay descuento explícito, derivarlo de la diferencia
          if (dm <= 0 && pv > 0) upd.descuentoMonto = Math.max(0, pl - pv);
        } else if (pv > 0) {
          // Sin precio de lista explícito, igualarlo al precio de venta
          upd.precioLista = pv;
          upd.descuentoMonto = 0;
        }
        if (dm > 0) upd.descuentoMonto = dm;
        // Recalcular mensualidad si hay plazo configurado
        var pvFinal = pv || Number(prev.precioVenta) || 0;
        var plazo   = Number(prev.plazoMeses) || 0;
        var eng     = Number(prev.enganche)   || 0;
        if (plazo > 0 && pvFinal > 0) upd.mensualidadEst = Math.round((pvFinal - eng) / plazo);
      }
      // Guardar todos los datos crudos para referencia
      var clave = fuente === "id"               ? "datosId"
                : fuente === "licencia"         ? "datosLicencia"
                : fuente === "rfc"              ? "datosRfc"
                : fuente === "cotizacion"       ? "datosCotizacion"
                : fuente === "solicitud_credito" ? "datosSolicitudCredito"
                : "datosDomicilio";
      upd[clave] = extractedCampos;
      return Object.assign({}, prev, upd);
    });
    setDirty(true);
  }

  /* Cargar historial cuando se abre el tab o cambia el cliente */
  React.useEffect(function() {
    if (tabActivo !== "historial" || !selId) return;
    if (!window.DB || !window.DB.getClienteHistorial) return;
    setCargandoHist(true);
    window.DB.getClienteHistorial(selId)
      .then(function(d){ setHistorial(d || []); })
      .catch(function(e){ console.warn("[hist]", e.message); })
      .finally(function(){ setCargandoHist(false); });
  }, [tabActivo, selId]);

  /* Reset tab al cambiar de cliente */
  React.useEffect(function() {
    setTabActivo("datos");
    setHistorial([]);
    setNotaHistorial("");
  }, [selId]);

  /* Historial filtrado */
  var historialItems = filtroHistorial
    ? historial.filter(function(h){ return h.tipo_evento === filtroHistorial; })
    : historial;

  /* Guardar referencia previa para auto-log de cambios */
  var _prev = form ? {
    etapa: form.etapa, estadoGeneral: form.estadoGeneral, asesor: form.asesor
  } : {};

  const filtrados = q
    ? clientes.filter(c => [c.nombre, c.tel, c.email, c.interes, c.ciudad, c.asesor]
        .join(" ").toLowerCase().includes(q.toLowerCase()))
    : clientes;

  // Vendedores del workspace para el selector de asesor
  const vendedores = (window.AUTOMIND?.USUARIOS || []).filter(function(u){ return u.rol === "vendedor"; });

  const IS = {
    width:"100%", padding:"7px 10px", border:"1px solid var(--line)",
    borderRadius:7, fontSize:13, background:"var(--bg)", color:"var(--ink)",
    outline:"none", fontFamily:"inherit",
  };

  /* Iconos SVG inline */
  const ICO_PERSONA = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>);
  const ICO_PIN     = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>);
  const ICO_AUTO    = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>);
  const ICO_PROCESO = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>);
  const ICO_LINK    = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);
  const ICO_DOC     = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>);

  return (
    <div className="inv-editor-shell">

      {/* ── Panel izquierdo ────────────────────────────────────────────────── */}
      <div className="inv-list-panel">
        <div className="inv-list-head">
          <label className="search">
            {I.search({ width:15, height:15 })}
            <input placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
          </label>
        </div>
        <div className="inv-list-body">
          {filtrados.length === 0
            ? <div style={{ padding:"24px 16px", color:"var(--muted)", fontSize:13 }}>Sin resultados.</div>
            : filtrados.map(c => (
              <ClienteListItem key={c.id} c={c} active={c.id === selId}
                onClick={() => selectCliente(c.id)} />
            ))
          }
        </div>
        <div className="inv-list-foot">
          {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Panel derecho ─────────────────────────────────────────────────── */}
      {form ? (
        <div className="inv-form-panel">

          {/* Barra fija: título + guardar */}
          <div className="inv-form-head">
            <div style={{ minWidth:0 }}>
              <div className="inv-form-vin">{form.nombre || "Nuevo cliente"}</div>
              <div className="inv-form-sub" style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                <span style={{ color:"var(--muted)", fontSize:12 }}>{form.tipo}</span>
              </div>
            </div>
            <div className="inv-form-actions">
              {etapaAvanzada && (
                <span style={{ fontSize:12, color:"#1f9d57", fontWeight:700,
                  display:"flex", alignItems:"center", gap:5,
                  background:"#f0fdf4", border:"1px solid #bbf7d0",
                  borderRadius:6, padding:"3px 10px", animation:"fadeIn .3s" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Etapa avanzó: {etapaAvanzada}
                </span>
              )}
              {autoGuardando && (
                <span style={{ fontSize:12, color:"var(--muted)", display:"flex", alignItems:"center", gap:5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" style={{ animation:"spin .8s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Guardando…
                </span>
              )}
              {saved && !autoGuardando && <span style={{ fontSize:12, color:"#1f9d57", fontWeight:600 }}>✓ Guardado</span>}
              {puedeEliminar && form && (
                <button type="button" onClick={() => setDelConfirm(true)}
                  title="Eliminar este cliente"
                  style={{ fontSize:12, fontWeight:600, padding:"5px 11px", borderRadius:6,
                    border:"1px solid #fecaca", background:"#fff5f5", color:"#b91c1c",
                    cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                  Eliminar
                </button>
              )}
              <button type="button"
                onClick={() => imprimirExpediente(form)}
                style={{ fontSize:12, fontWeight:600, padding:"5px 11px", borderRadius:6,
                  border:"1px solid var(--line)", background:"var(--bg)", color:"var(--ink)",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                🖨 Expediente
              </button>
              <button className="btn primary" onClick={handleSave} disabled={!dirty || autoGuardando}
                style={{ opacity:(dirty && !autoGuardando) ? 1 : .45,
                  cursor:(dirty && !autoGuardando) ? "pointer" : "not-allowed" }}>
                Guardar
              </button>
            </div>
          </div>

          {/* ── Header del expediente (siempre visible) ── */}
          <ExpedienteHeader form={form} onChangeEstado={function(v){ set("estadoGeneral", v); }} />

          {/* ── Stepper de etapas ── */}
          <EtapaStepper etapaActual={form.etapa || "Prospección"} onCambiar={v => set("etapa", v)} formaPagoCot={form.formaPagoCot} />

          {/* ── Layout: lista de secciones (izq) + contenido (der) ── */}
          <div style={{ display:"flex", flex:1, overflow:"hidden", minHeight:0 }}>

          {/* ── Lista de secciones ── */}
          {(function(){
            var TABS = [
              { id:"datos",    lbl:"Datos",         ico:"👤" },
              { id:"perfil",   lbl:"Perfilamiento",  ico:"🎯" },
              { id:"vehiculo", lbl:"Vehículo",       ico:"🚗" },
              { id:"prueba",   lbl:"Prueba manejo",  ico:"🛣" },
              { id:"cot",      lbl:"Cotización",     ico:"💰" },
              { id:"fpago",    lbl:"Forma de pago",  ico:"💳" },
              { id:"credito",  lbl:"Crédito",        ico:"🏦" },
              { id:"aprob",    lbl:"Aprobaciones",   ico:"✅" },
              { id:"pago",     lbl:"Pago",           ico:"💵" },
              { id:"entrega",  lbl:"Entrega",        ico:"🚚" },
              { id:"historial",lbl:"Historial",      ico:"📋" },
            ];
            return (
              <div style={{
                width:170, flexShrink:0, borderRight:"1px solid var(--line)",
                background:"var(--bg)", overflowY:"auto", display:"flex",
                flexDirection:"column", padding:"8px 6px", gap:2,
              }}>
                {TABS.map(function(t){
                  var isAct = tabActivo === t.id;
                  return (
                    <button key={t.id} type="button"
                      onClick={function(){ setTabActivo(t.id); }}
                      style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"8px 10px", borderRadius:7, border:"none",
                        fontSize:12, fontWeight: isAct ? 700 : 400,
                        cursor:"pointer", textAlign:"left", width:"100%",
                        background: isAct ? "var(--accent)" : "transparent",
                        color:      isAct ? "#fff"           : "var(--ink)",
                        borderLeft: isAct ? "3px solid var(--accent)" : "3px solid transparent",
                      }}>
                      {(function() {
                        var esCredNA = form && t.id === "credito" && form.formaPagoCot !== "Crédito";
                        return (<>
                          <span style={{ fontSize:14, lineHeight:1, flexShrink:0,
                            opacity: esCredNA ? 0.4 : 1 }}>{esCredNA ? "🔒" : t.ico}</span>
                          <span style={{ lineHeight:1.3, flex:1, minWidth:0,
                            color: esCredNA && !isAct ? "var(--muted)" : undefined,
                            opacity: esCredNA ? 0.55 : 1 }}>{t.lbl}</span>
                          {form && t.id === "fpago" && form.formaPagoCot && (
                            <span style={{ fontSize:9, fontWeight:800, lineHeight:1, flexShrink:0,
                              padding:"2px 5px", borderRadius:4,
                              background: form.formaPagoCot === "Contado" ? "#dcfce7" : "#dbeafe",
                              color:      form.formaPagoCot === "Contado" ? "#166534" : "#1d4ed8" }}>
                              {form.formaPagoCot === "Contado" ? "Efe" : "Cred"}
                            </span>
                          )}
                          {esCredNA && !isAct && (
                            <span style={{ fontSize:9, fontWeight:800, lineHeight:1, flexShrink:0,
                              padding:"2px 5px", borderRadius:4,
                              background:"#f3f4f6", color:"#6b7280" }}>N/A</span>
                          )}
                        </>);
                      })()}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Contenido de la sección activa ── */}
          <div className="inv-form-scroll" style={{ flex:1 }}>

            {/* ══ TAB: DATOS DEL CLIENTE ══ */}
            {tabActivo === "datos" && (<>

            {/* § DATOS BÁSICOS */}
            <Sec ico={ICO_PERSONA} titulo="Datos del cliente" defaultOpen>
              <Fld label="Nombre completo" req full>
                <input className="ef-input" style={IS} value={form.nombre || ""} onChange={e => set("nombre", e.target.value)} />
              </Fld>
              <Fld label="Tipo">
                <select className="ef-select" style={IS} value={form.tipo || "Persona física"} onChange={e => set("tipo", e.target.value)}>
                  <option>Persona física</option>
                  <option>Persona moral</option>
                </select>
              </Fld>
              {/* #01 — Teléfono con verificación WhatsApp */}
              <Fld label="Teléfono" full>
                {(function() {
                  var vsTel   = verifyStates.tel;
                  var vsLoad  = vsTel === "loading";
                  var vsOk    = vsTel && typeof vsTel === "object" && vsTel.ok;
                  var vsErr   = vsTel && typeof vsTel === "object" && !vsTel.ok;
                  var yaVerif = !!(form.telVerificadoAt);
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:5, width:"100%" }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input className="ef-input" style={Object.assign({}, IS, { flex:1 })}
                          value={form.tel || ""}
                          onChange={function(e) { set("tel", e.target.value); setVerifyStates(function(s) { return Object.assign({}, s, { tel:null }); }); }}
                          placeholder="555-000-0000" />
                        <button className="btn btn-sm"
                          disabled={vsLoad || !form.tel}
                          style={vsOk ? { color:"#1f9d57", borderColor:"#bbf7d0", background:"#f0fdf4", whiteSpace:"nowrap" }
                               : vsErr ? { color:"#e0492f", borderColor:"#fdd",    background:"#fff8f7", whiteSpace:"nowrap" }
                               : { whiteSpace:"nowrap" }}
                          onClick={function() { handleVerificar("tel"); }}>
                          {vsLoad
                            ? <span className="login-spinner" style={{ width:10, height:10, borderWidth:2, display:"inline-block" }} />
                            : vsOk ? "✓ WA OK" : "Verificar WA"}
                        </button>
                      </div>
                      {/* Estado de verificación */}
                      {vsTel && typeof vsTel === "object" && (
                        <span style={{ fontSize:11, color: vsTel.ok ? "#1f9d57" : "#e0492f", lineHeight:1.4 }}>
                          {vsTel.ok ? "✓ " : "✗ "}{vsTel.detalle}
                        </span>
                      )}
                      {!vsTel && yaVerif && (
                        <span style={{ fontSize:11, color:"#1f9d57", lineHeight:1.4 }}>
                          ✓ Verificado el {new Date(form.telVerificadoAt).toLocaleDateString("es-MX")}
                          {form.telVerificadoMetodo === "formato_mx" ? " (formato)" : " · WhatsApp"}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </Fld>
              {/* #01 — Email con verificación MX */}
              <Fld label="Email" full>
                {(function() {
                  var vsEmail = verifyStates.email;
                  var vsLoad  = vsEmail === "loading";
                  var vsOk    = vsEmail && typeof vsEmail === "object" && vsEmail.ok;
                  var vsErr   = vsEmail && typeof vsEmail === "object" && !vsEmail.ok;
                  var yaVerif = !!(form.emailVerificadoAt);
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:5, width:"100%" }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input className="ef-input" style={Object.assign({}, IS, { flex:1 })}
                          value={form.email || ""}
                          onChange={function(e) { set("email", e.target.value); setVerifyStates(function(s) { return Object.assign({}, s, { email:null }); }); }}
                          placeholder="correo@ejemplo.com" />
                        <button className="btn btn-sm"
                          disabled={vsLoad || !form.email}
                          style={vsOk ? { color:"#1f9d57", borderColor:"#bbf7d0", background:"#f0fdf4", whiteSpace:"nowrap" }
                               : vsErr ? { color:"#e0492f", borderColor:"#fdd",    background:"#fff8f7", whiteSpace:"nowrap" }
                               : { whiteSpace:"nowrap" }}
                          onClick={function() { handleVerificar("email"); }}>
                          {vsLoad
                            ? <span className="login-spinner" style={{ width:10, height:10, borderWidth:2, display:"inline-block" }} />
                            : vsOk ? "✓ Email OK" : "Verificar email"}
                        </button>
                      </div>
                      {vsEmail && typeof vsEmail === "object" && (
                        <span style={{ fontSize:11, color: vsEmail.ok ? "#1f9d57" : "#e0492f", lineHeight:1.4 }}>
                          {vsEmail.ok ? "✓ " : "✗ "}{vsEmail.detalle}
                        </span>
                      )}
                      {!vsEmail && yaVerif && (
                        <span style={{ fontSize:11, color:"#1f9d57", lineHeight:1.4 }}>
                          ✓ Verificado el {new Date(form.emailVerificadoAt).toLocaleDateString("es-MX")}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </Fld>
            </Sec>



            <Sec ico={ICO_DOC} titulo="Documentos del cliente" defaultOpen>
              <div style={{ gridColumn:"1/-1" }}>
                <DocUpload
                  label="Identificación oficial"
                  sublabel="INE · Pasaporte"
                  docType="id"
                  value={form.docId || null}
                  onChange={v => set("docId", v)}
                  onExtract={campos => aplicarCampos(campos, "id")}
                  nombreReferencia={form.nombre || ""}
                />
              </div>
              <div style={{ gridColumn:"1/-1", marginTop:4 }}>
                <DocUpload
                  label="Licencia de conducir"
                  sublabel="Licencia de conducir vigente"
                  docType="licencia"
                  value={form.docLicencia || null}
                  onChange={v => set("docLicencia", v)}
                  onExtract={campos => aplicarCampos(campos, "licencia")}
                  nombreReferencia={form.nombre || ""}
                />
              </div>
              <div style={{ gridColumn:"1/-1", marginTop:4 }}>
                <DocUpload
                  label="Comprobante de domicilio"
                  sublabel="Recibo de agua · luz · teléfono"
                  docType="domicilio"
                  value={form.docDomicilio || null}
                  onChange={v => set("docDomicilio", v)}
                  onExtract={campos => aplicarCampos(campos, "domicilio")}
                  nombreReferencia={form.nombre || ""}
                />
              </div>
              <div style={{ gridColumn:"1/-1", marginTop:4 }}>
                <DocUpload
                  label="Constancia de Situación Fiscal (RFC)"
                  sublabel="Documento del SAT · extrae RFC automáticamente"
                  docType="rfc"
                  value={form.docRfc || null}
                  onChange={v => set("docRfc", v)}
                  onExtract={campos => aplicarCampos(campos, "rfc")}
                  nombreReferencia={form.nombre || ""}
                />
              </div>

              {/* Panel: Datos OCR confirmados */}
              {(form.datosId || form.datosLicencia || form.datosDomicilio || form.datosRfc) && (
                <div style={{ gridColumn:"1/-1", marginTop:8, padding:"12px 14px",
                  background:"var(--bg)", border:"1px solid var(--line)", borderRadius:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
                    textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>
                    Datos OCR confirmados
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 18px" }}>
                    {[
                      { lbl:"CURP",      val: form.curp },
                      { lbl:"RFC",       val: form.rfc },
                      { lbl:"Nac.",      val: form.fechaNac },
                      { lbl:"Sexo",      val: form.sexo },
                      { lbl:"Licencia #",val: form.numLicencia },
                      { lbl:"Tipo lic.", val: form.tipoLic },
                      { lbl:"Vigencia",  val: form.vigenciaLic },
                      { lbl:"C.P.",      val: form.cp },
                    ].filter(x => x.val).map(x => (
                      <div key={x.lbl} style={{ fontSize:12 }}>
                        <span style={{ color:"var(--muted)", marginRight:4 }}>{x.lbl}:</span>
                        <span style={{ fontWeight:600, color:"var(--ink)", fontFamily:"monospace" }}>{x.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Sec>

            {/* § DATOS OCR DEL EXPEDIENTE */}
            <Sec ico="🪪" titulo="Datos del expediente" defaultOpen>
              <Fld label="CURP" full>
                {(function() {
                  var curpVal = form.curp || "";
                  var curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
                  var curpOk = curpVal.length === 0 || curpRegex.test(curpVal);
                  var curpWarning = curpVal.length > 0 && !curpOk;
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%" }}>
                      <input className="ef-input" style={{...IS, fontFamily:"monospace", letterSpacing:1,
                        borderColor: curpWarning ? "#f59e0b" : undefined,
                        background:  curpWarning ? "#fffbeb" : undefined,
                      }}
                        value={curpVal}
                        onChange={e => set("curp", e.target.value.toUpperCase())}
                        placeholder="18 caracteres" maxLength={18} />
                      {curpWarning && (
                        <span style={{ fontSize:11, color:"#92400e", display:"flex", alignItems:"center", gap:4 }}>
                          ⚠️ El formato no coincide con el patrón oficial (18 car.). Verifica o corrige manualmente.
                        </span>
                      )}
                    </div>
                  );
                })()}
              </Fld>
              <Fld label="RFC">
                <input className="ef-input" style={{...IS, fontFamily:"monospace"}} value={form.rfc || ""}
                  onChange={e => set("rfc", e.target.value.toUpperCase())} placeholder="RFC con homoclave" />
              </Fld>
              <Fld label="Fecha de nacimiento">
                <input className="ef-input" style={IS} value={form.fechaNac || ""}
                  onChange={e => set("fechaNac", e.target.value)} placeholder="DD/MM/AAAA" />
              </Fld>
              <Fld label="Sexo">
                <select className="ef-select" style={IS} value={form.sexo || ""}
                  onChange={e => set("sexo", e.target.value)}>
                  <option value="">—</option>
                  <option value="H">Hombre (H)</option>
                  <option value="M">Mujer (M)</option>
                </select>
              </Fld>
              <Fld label="Dirección" full>
                <input className="ef-input" style={IS} value={form.direccion || ""}
                  onChange={e => set("direccion", e.target.value)} placeholder="Calle y número" />
              </Fld>
              <Fld label="Colonia">
                <input className="ef-input" style={IS} value={form.colonia || ""}
                  onChange={e => set("colonia", e.target.value)} placeholder="Colonia o fracc." />
              </Fld>
              <Fld label="C.P.">
                <input className="ef-input" style={IS} value={form.cp || ""}
                  onChange={e => set("cp", e.target.value)} placeholder="00000" maxLength={5} />
              </Fld>
              <Fld label="# Licencia">
                <input className="ef-input" style={{...IS, fontFamily:"monospace"}} value={form.numLicencia || ""}
                  onChange={e => set("numLicencia", e.target.value)} placeholder="Número de folio" />
              </Fld>
              <Fld label="Tipo licencia">
                <input className="ef-input" style={IS} value={form.tipoLic || ""}
                  onChange={e => set("tipoLic", e.target.value)} placeholder="A, B, C…" />
              </Fld>
              <Fld label="Vigencia licencia">
                <input className="ef-input" style={IS} value={form.vigenciaLic || ""}
                  onChange={e => set("vigenciaLic", e.target.value)} placeholder="DD/MM/AAAA" />
              </Fld>
            </Sec>


            </>) /* fin tab datos */}

            {/* ══ TAB: PERFILAMIENTO ══ */}
            {tabActivo === "perfil" && (<>

            <Sec ico={ICO_PIN} titulo="Origen del prospecto" defaultOpen>
              <Fld label="Canal">
                <select className="ef-select" style={IS} value={form.canal || "Digital"} onChange={e => set("canal", e.target.value)}>
                  {["Digital","Piso","Referido","Marketplace","Otro"].map(o => <option key={o}>{o}</option>)}
                </select>
              </Fld>
              <Fld label="Fuente específica">
                <input className="ef-input" style={IS} value={form.fuente || ""} onChange={e => set("fuente", e.target.value)} placeholder="Facebook Ads, visita, etc." />
              </Fld>
              <Fld label="Ciudad">
                <input className="ef-input" style={IS} value={form.ciudad || ""} onChange={e => set("ciudad", e.target.value)} />
              </Fld>
              <Fld label="Estado">
                <input className="ef-input" style={IS} value={form.estado || ""} onChange={e => set("estado", e.target.value)} placeholder="N.L., Jal., CDMX…" />
              </Fld>
            </Sec>

            {/* § PERFIL COMERCIAL — solo preferencias de contacto */}
            <Sec ico={ICO_AUTO} titulo="Preferencias de compra" defaultOpen>
              <Fld label="Canal de origen">
                <div style={{ padding:"8px 10px", borderRadius:7, border:"1px solid var(--line)",
                  background:"var(--bg)", fontSize:13, color:"var(--ink)" }}>
                  {form.canal || "—"}{form.fuente ? " · " + form.fuente : ""}
                </div>
              </Fld>
              <Fld label="Forma de pago preferida" full>
                <div style={{ display:"flex", gap:8 }}>
                  {["No definido","Contado","Crédito"].map(function(op){
                    return (
                      <button key={op} type="button" onClick={function(){ set("formaPago", op); }}
                        style={{
                          padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight:600,
                          border:"1px solid var(--line)", cursor:"pointer",
                          background: form.formaPago === op ? "var(--accent)" : "var(--card)",
                          color:      form.formaPago === op ? "#fff"           : "var(--muted)",
                        }}>{op}</button>
                    );
                  })}
                </div>
              </Fld>
              <Fld label="Presupuesto estimado ($)">
                <input type="number" className="ef-input" style={IS}
                  value={form.presupuesto || ""}
                  onChange={e => set("presupuesto", Number(e.target.value))}
                  placeholder="0" />
              </Fld>
              <Fld label="Uso del vehículo">
                <select className="ef-select" style={IS} value={form.uso || "Personal"}
                  onChange={e => set("uso", e.target.value)}>
                  {["Personal","Trabajo","Familiar"].map(o => <option key={o}>{o}</option>)}
                </select>
              </Fld>
            </Sec>

            {/* ══ AVISO DE PRIVACIDAD ══ */}
            <Sec ico="🔒" titulo="Aviso de Privacidad" defaultOpen>
              <AvisoPrivacidadSection form={form} set={set} />
            </Sec>

            {/* ══ ENCUESTA DE PREFERENCIAS DEL CLIENTE (8.1-8.12) ══ */}
            {(function(){
              var enc = form.encuestaProspeccion || {};
              function setEnc(key, val) {
                set("encuestaProspeccion", Object.assign({}, form.encuestaProspeccion || {}, { [key]: val }));
              }
              function setEncArr(key, idx, val) {
                var base = (form.encuestaProspeccion || {})[key];
                var arr  = Array.isArray(base) ? base.slice() : ["","",""];
                arr[idx] = val;
                setEnc(key, arr);
              }
              function PillGroup(props) {
                return (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {props.opciones.map(function(op){
                      var activo = enc[props.campo] === op;
                      return (
                        <button key={op} type="button" onClick={function(){ setEnc(props.campo, op); }}
                          style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                            border:"1px solid " + (activo ? "var(--accent)" : "var(--line)"),
                            background: activo ? "var(--accent)" : "var(--card)",
                            color: activo ? "#fff" : "var(--muted)", cursor:"pointer", transition:"all .12s",
                            whiteSpace:"nowrap" }}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                );
              }
              var colores         = Array.isArray(enc.colores)         ? enc.colores         : ["","",""];
              var caracteristicas = Array.isArray(enc.caracteristicas) ? enc.caracteristicas : ["","",""];
              var pasatiempos     = Array.isArray(enc.pasatiempos)     ? enc.pasatiempos     : ["","",""];
              return (
                <Sec ico="📋" titulo="Encuesta de preferencias del cliente" defaultOpen={true}>
                  <Fld label="8.1 ¿Qué uso le dará al vehículo?" full>
                    <PillGroup campo="uso" opciones={["Negocio","Uso particular","Ambos"]} />
                  </Fld>
                  <Fld label="8.2 ¿Cuántas personas viajarán regularmente?" full>
                    <PillGroup campo="personas" opciones={["1-2","1-4","5-7","7+"]} />
                  </Fld>
                  <Fld label="8.3 ¿Espacio para maletas?" full>
                    <PillGroup campo="maletas" opciones={["Poco","Regular","Mucho"]} />
                  </Fld>
                  <Fld label="8.4 ¿Número de puertas?" full>
                    <PillGroup campo="puertas" opciones={["3","5","Sin preferencia"]} />
                  </Fld>
                  <Fld label="8.5 ¿Tipo de vehículo?" full>
                    <PillGroup campo="tipoVehiculo" opciones={["Hatchback","Notchback","Sedán","Van","SUV","Coupé","Cabriolet","Sin preferencia"]} />
                  </Fld>
                  <Fld label="8.6 ¿Requiere conducción todoterreno?" full>
                    <PillGroup campo="todoterreno" opciones={["Sí","No"]} />
                  </Fld>
                  {enc.todoterreno === "Sí" && (
                    <Fld label="Especificar:" full>
                      <input className="ef-input" style={IS} value={enc.todoterreno_detalle || ""}
                        onChange={function(e){ setEnc("todoterreno_detalle", e.target.value); }}
                        placeholder="Tipo de terreno, uso habitual…" />
                    </Fld>
                  )}
                  <Fld label="8.7 ¿Tipo de combustible?" full>
                    <PillGroup campo="combustible" opciones={["Gasolina","Diesel","Híbrido","Eléctrico"]} />
                  </Fld>
                  <Fld label="8.8 ¿Transmisión?" full>
                    <PillGroup campo="transmision" opciones={["Manual","Automática"]} />
                  </Fld>
                  <Fld label="8.9 ¿Tipo de carretera habitual?" full>
                    <PillGroup campo="carretera" opciones={["Ciudad","Campo","Autopista","Mezcla de todo"]} />
                  </Fld>
                  <Fld label="8.10 Tres colores preferidos" full>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[0,1,2].map(function(i){
                        return (
                          <input key={i} className="ef-input" style={Object.assign({}, IS, { flex:1, minWidth:100 })}
                            value={colores[i] || ""}
                            onChange={function(e){ setEncArr("colores", i, e.target.value); }}
                            placeholder={"Color " + (i+1)} />
                        );
                      })}
                    </div>
                  </Fld>
                  <Fld label="8.11 Características deseadas" full>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[0,1,2].map(function(i){
                        return (
                          <input key={i} className="ef-input" style={Object.assign({}, IS, { flex:1, minWidth:120 })}
                            value={caracteristicas[i] || ""}
                            onChange={function(e){ setEncArr("caracteristicas", i, e.target.value); }}
                            placeholder={"Característica " + (i+1)} />
                        );
                      })}
                    </div>
                  </Fld>
                  <Fld label="8.12 Pasatiempos" full>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[0,1,2].map(function(i){
                        return (
                          <input key={i} className="ef-input" style={Object.assign({}, IS, { flex:1, minWidth:120 })}
                            value={pasatiempos[i] || ""}
                            onChange={function(e){ setEncArr("pasatiempos", i, e.target.value); }}
                            placeholder={"Pasatiempo " + (i+1)} />
                        );
                      })}
                    </div>
                  </Fld>
                </Sec>
              );
            })()}

            </>) /* fin tab perfil */}

            {/* ══ TAB: VEHÍCULO DE INTERÉS ══ */}
            {tabActivo === "vehiculo" && (<>
            <Sec ico={ICO_AUTO} titulo="Vehículo de interés" defaultOpen>
              <Fld label="Vehículo de interés" full>
                <input className="ef-input" style={IS} value={form.interes || ""}
                  onChange={e => set("interes", e.target.value)}
                  placeholder="Marca, modelo, año, versión…" />
              </Fld>
              <Fld label="Uso previsto">
                <select className="ef-select" style={IS} value={form.uso || "Personal"}
                  onChange={e => set("uso", e.target.value)}>
                  {["Personal","Trabajo","Familiar"].map(o => <option key={o}>{o}</option>)}
                </select>
              </Fld>
              <Fld label="Presupuesto estimado ($)">
                <input type="number" className="ef-input" style={IS}
                  value={form.presupuesto || ""}
                  onChange={e => set("presupuesto", Number(e.target.value))}
                  placeholder="0" />
              </Fld>
              {form.vinVinculado && (
                <Fld label="VIN vinculado (Plan Piso)" full>
                  <div style={{ padding:"8px 12px", borderRadius:7, border:"1px solid var(--line)",
                    background:"var(--bg)", fontSize:13, fontWeight:600, fontFamily:"monospace" }}>
                    {form.vinVinculado}
                  </div>
                </Fld>
              )}
            </Sec>
            </>) /* fin tab vehiculo */}

            {/* ══ TAB: PRUEBA DE MANEJO ══ */}
            {tabActivo === "prueba" && (<>
            <Sec ico="🚗" titulo="Prueba de manejo" defaultOpen>
              <Fld label="¿Se realizó prueba?" full>
                <div style={{ display:"flex", gap:8 }}>
                  {["Sí","No"].map(op => (
                    <button key={op} type="button"
                      onClick={() => set("pruebaManejo", op === "Sí")}
                      style={{
                        padding:"6px 20px", borderRadius:8, fontSize:13, fontWeight:600,
                        border:"1px solid var(--line)", cursor:"pointer", transition:"all .15s",
                        background: (op === "Sí") === !!form.pruebaManejo
                          ? "var(--accent)" : "var(--card)",
                        color: (op === "Sí") === !!form.pruebaManejo ? "#fff" : "var(--muted)",
                      }}>
                      {op}
                    </button>
                  ))}
                </div>
              </Fld>
              {form.pruebaManejo && (<>
                <Fld label="Fecha de prueba">
                  <input type="date" className="ef-input" style={IS}
                    value={form.fechaPrueba || ""}
                    onChange={e => set("fechaPrueba", e.target.value)} />
                </Fld>
                <Fld label="Unidad utilizada">
                  <input className="ef-input" style={IS}
                    value={form.unidadPrueba || ""}
                    onChange={e => set("unidadPrueba", e.target.value)}
                    placeholder="Marca, modelo, año o VIN" />
                </Fld>
                <Fld label="Resultado">
                  <select className="ef-select" style={IS}
                    value={form.resultadoPrueba || ""}
                    onChange={e => set("resultadoPrueba", e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    <option value="Positivo">✅ Positivo — cliente interesado</option>
                    <option value="Neutral">⚪ Neutral — duda sobre la unidad</option>
                    <option value="Negativo">❌ Negativo — no convenció</option>
                  </select>
                </Fld>
                <Fld label="Observaciones del asesor" full>
                  <textarea className="ef-input"
                    style={{ ...IS, minHeight:72, resize:"vertical" }}
                    value={form.obsPrueba || ""}
                    onChange={e => set("obsPrueba", e.target.value)}
                    placeholder="Preferencias detectadas, objeciones, próximo paso…" />
                </Fld>
                <div style={{ gridColumn:"1/-1", marginTop:4 }}>
                  <DocUpload
                    label="Evidencia de prueba de manejo"
                    sublabel="Foto, acuse firmado o PDF · sin extracción IA"
                    docType="id"
                    value={form.docEvidenciaPrueba || null}
                    onChange={v => set("docEvidenciaPrueba", v)}
                    nombreReferencia={form.nombre || ""}
                  />
                </div>
                <div style={{ gridColumn:"1/-1", marginTop:4 }}>
                  <DocUpload
                    label="Encuesta de satisfacción"
                    sublabel="Formato firmado por el cliente · PDF, foto o imagen escaneada"
                    docType="id"
                    value={form.docEncuestaPrueba || null}
                    onChange={v => set("docEncuestaPrueba", v)}
                    nombreReferencia={form.nombre || ""}
                  />
                </div>
              </>)}
            </Sec>


            </>) /* fin tab prueba */}

            {/* ══ TAB: COTIZACIÓN ══ */}
            {tabActivo === "cot" && (<>
            <Sec ico={ICO_AUTO} titulo="Selección de unidad y cotización" defaultOpen>
              <Fld label="Unidad seleccionada" full>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {form.unidadDesc ? (
                    <div style={{
                      flex:1, padding:"7px 10px", borderRadius:7,
                      border:"1px solid var(--line)", background:"var(--bg)",
                    }}>
                      {(function(){
                        var partes  = (form.unidadDesc || "").split(" · ");
                        var nombre  = partes[0];
                        var detalle = partes.slice(1).join(" · ");
                        return (<>
                          <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{nombre}</div>
                          {detalle && <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{detalle}</div>}
                        </>);
                      })()}
                    </div>
                  ) : (
                    <div style={{
                      flex:1, padding:"7px 10px", borderRadius:7,
                      border:"1px dashed var(--line)", background:"transparent",
                      fontSize:13, color:"var(--muted)", fontStyle:"italic",
                    }}>Sin unidad seleccionada</div>
                  )}
                  <button type="button" onClick={() => setShowUnitPicker(true)} style={{
                    padding:"7px 14px", borderRadius:7, border:"1px solid var(--accent)",
                    background:"transparent", color:"var(--accent)",
                    fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0,
                  }}>{form.unidadDesc ? "Cambiar" : "Buscar unidad"}</button>
                  {form.unidadDesc && (
                    <button type="button"
                      onClick={() => { set("unidadId", null); set("unidadDesc", ""); }}
                      style={{
                        padding:"7px 10px", borderRadius:7,
                        border:"1px solid var(--line)", background:"transparent",
                        color:"var(--muted)", fontSize:12, cursor:"pointer", flexShrink:0,
                      }}>✕</button>
                  )}
                </div>
              </Fld>

              {/* ── Cotización oficial: sube el PDF/imagen para actualizar precios vía IA ── */}
              <Fld label="Cotización oficial" full>
                <DocUpload
                  label="Cotización de la agencia"
                  sublabel="IA extrae el precio de venta final (IVA + accesorios)"
                  docType="cotizacion"
                  value={form.docCotizacion || null}
                  onChange={v => set("docCotizacion", v)}
                  onExtract={campos => aplicarCampos(campos, "cotizacion")} />
                {form.docCotizacion && form.precioVenta > 0 && (
                  <div style={{
                    marginTop:6, fontSize:11, fontWeight:600, color:"#16a34a",
                    display:"flex", alignItems:"center", gap:4,
                  }}>
                    ✓ Precio de venta tomado de la cotización:&nbsp;
                    <span>${Number(form.precioVenta).toLocaleString("es-MX")}</span>
                  </div>
                )}
              </Fld>

              <Fld label="Precio de lista ($)">
                <input type="number" className="ef-input" style={IS} min="0" step="1000"
                  value={form.precioLista || ""}
                  placeholder="0"
                  onChange={e => {
                    var pl = Number(e.target.value) || 0;
                    var dm = Number(form.descuentoMonto) || 0;
                    set("precioLista", pl);
                    set("precioVenta", Math.max(0, pl - dm));
                    var pl2 = Number(form.plazoMeses) || 0;
                    var eng = Number(form.enganche) || 0;
                    if (pl2 > 0) set("mensualidadEst", Math.round((Math.max(0, pl - dm) - eng) / pl2));
                  }} />
              </Fld>

              <Fld label="Descuento ($)">
                <input type="number" className="ef-input" style={IS} min="0" step="500"
                  value={form.descuentoMonto || ""}
                  placeholder="0"
                  onChange={e => {
                    var dm = Number(e.target.value) || 0;
                    var pl = Number(form.precioLista) || 0;
                    var pv = Math.max(0, pl - dm);
                    set("descuentoMonto", dm);
                    set("precioVenta", pv);
                    var meses = Number(form.plazoMeses) || 0;
                    var eng = Number(form.enganche) || 0;
                    if (meses > 0) set("mensualidadEst", Math.round((pv - eng) / meses));
                  }} />
              </Fld>

              <Fld label="Precio de venta ($)">
                <input type="number" className="ef-input"
                  style={{ ...IS, fontWeight:700, color:"var(--accent)" }}
                  min="0" step="1000"
                  value={form.precioVenta || ""}
                  placeholder="0"
                  onChange={e => {
                    var pv = Number(e.target.value) || 0;
                    var pl = Number(form.precioLista) || 0;
                    set("precioVenta", pv);
                    set("descuentoMonto", Math.max(0, pl - pv));
                    var meses = Number(form.plazoMeses) || 0;
                    var eng = Number(form.enganche) || 0;
                    if (meses > 0) set("mensualidadEst", Math.round((pv - eng) / meses));
                  }} />
              </Fld>

              <Fld label="Forma de pago" full>
                <div style={{ display:"flex", gap:8 }}>
                  {["Contado","Crédito"].map(op => (
                    <button key={op} type="button"
                      onClick={() => set("formaPagoCot", op)}
                      style={{
                        padding:"6px 20px", borderRadius:8, fontSize:13, fontWeight:600,
                        border:"1px solid var(--line)", cursor:"pointer", transition:"all .15s",
                        background: form.formaPagoCot === op ? "var(--accent)" : "var(--card)",
                        color: form.formaPagoCot === op ? "#fff" : "var(--muted)",
                      }}>{op}</button>
                  ))}
                </div>
              </Fld>

              {form.formaPagoCot === "Crédito" && (<>
                <Fld label="Enganche ($)">
                  <input type="number" className="ef-input" style={IS} min="0" step="1000"
                    value={form.enganche || ""}
                    placeholder="0"
                    onChange={e => {
                      var eng = Number(e.target.value) || 0;
                      set("enganche", eng);
                      var pv = Number(form.precioVenta) || 0;
                      var meses = Number(form.plazoMeses) || 0;
                      if (meses > 0) set("mensualidadEst", Math.round((pv - eng) / meses));
                    }} />
                </Fld>
                <Fld label="Plazo">
                  <select className="ef-select" style={IS}
                    value={form.plazoMeses || ""}
                    onChange={e => {
                      var meses = Number(e.target.value) || 0;
                      set("plazoMeses", meses);
                      var pv = Number(form.precioVenta) || 0;
                      var eng = Number(form.enganche) || 0;
                      if (meses > 0) set("mensualidadEst", Math.round((pv - eng) / meses));
                    }}>
                    <option value="">— Seleccionar —</option>
                    {[12,18,24,36,48,60,72].map(m => (
                      <option key={m} value={m}>{m} meses</option>
                    ))}
                  </select>
                </Fld>
                <Fld label="Mensualidad estimada" full>
                  <div style={{
                    padding:"7px 10px", borderRadius:7, border:"1px solid var(--line)",
                    background:"var(--bg)", fontSize:14, fontWeight:700, color:"var(--accent)",
                  }}>
                    {form.mensualidadEst > 0
                      ? "$" + Number(form.mensualidadEst).toLocaleString("es-MX")
                      : <span style={{ fontWeight:400, fontSize:12, color:"var(--muted)" }}>
                          Se calcula al ingresar enganche y plazo
                        </span>
                    }
                  </div>
                </Fld>
              </>)}

              <Fld label="Notas de cotización" full>
                <textarea className="ef-input"
                  style={{ ...IS, minHeight:64, resize:"vertical" }}
                  value={form.notasCot || ""}
                  onChange={e => set("notasCot", e.target.value)}
                  placeholder="Versión solicitada, accesorios incluidos, condiciones especiales…" />
              </Fld>
            </Sec>

            {/* ── Solicitud de crédito (solo cuando forma = Crédito) ── */}
            {form.formaPagoCot === "Crédito" && (
            <Sec ico="📋" titulo="Solicitud de crédito" defaultOpen>
              {/* Upload del formato con extracción IA */}
              <Fld label="Formato de solicitud" full>
                <DocUpload
                  label="Solicitud de crédito firmada"
                  sublabel="IA extrae monto, mensualidades y plazo"
                  docType="solicitud_credito"
                  value={form.docCredSolicitud || null}
                  onChange={v => set("docCredSolicitud", v)}
                  onExtract={campos => aplicarCampos(campos, "solicitud_credito")} />
              </Fld>

              {/* Resumen financiero extraído del documento */}
              <Fld label="Monto financiado ($)">
                <div style={{
                  padding:"7px 10px", borderRadius:7, border:"1px solid var(--line)",
                  background:"var(--bg)", fontSize:13, fontWeight:700, color:"var(--accent)",
                }}>
                  {form.montoFinanciado > 0
                    ? "$" + Number(form.montoFinanciado).toLocaleString("es-MX")
                    : <span style={{ fontWeight:400, fontSize:12, color:"var(--muted)" }}>
                        Se extrae de la solicitud de crédito
                      </span>}
                </div>
              </Fld>
              <Fld label="Número de mensualidades">
                <div style={{
                  padding:"7px 10px", borderRadius:7, border:"1px solid var(--line)",
                  background:"var(--bg)", fontSize:13, fontWeight:700, color:"var(--ink)",
                }}>
                  {form.plazoMeses
                    ? form.plazoMeses + " meses"
                    : <span style={{ fontWeight:400, fontSize:12, color:"var(--muted)" }}>
                        Se extrae de la solicitud de crédito
                      </span>}
                </div>
              </Fld>
              <Fld label="Monto de mensualidad ($)">
                <div style={{
                  padding:"7px 10px", borderRadius:7, border:"1px solid var(--line)",
                  background:"var(--bg)", fontSize:13, fontWeight:700, color:"var(--accent)",
                }}>
                  {form.mensualidadEst > 0
                    ? "$" + Number(form.mensualidadEst).toLocaleString("es-MX")
                    : <span style={{ fontWeight:400, fontSize:12, color:"var(--muted)" }}>
                        Se extrae de la solicitud de crédito
                      </span>}
                </div>
              </Fld>
            </Sec>
            )}

            </>) /* fin tab cot */}

            {/* ══ TAB: FORMA DE PAGO ══ */}
            {tabActivo === "fpago" && (<>

            {/* Card: método confirmado en cotización */}
            {form.formaPagoCot && (
              <div style={{ margin:"16px 20px 0", padding:"14px 16px", borderRadius:10,
                border:"2px solid " + (form.formaPagoCot === "Contado" ? "#bbf7d0" : "#bfdbfe"),
                background: form.formaPagoCot === "Contado" ? "#f0fdf4" : "#eff6ff",
                display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ fontSize:28, lineHeight:1 }}>
                  {form.formaPagoCot === "Contado" ? "💵" : "🏦"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:".07em",
                    color: form.formaPagoCot === "Contado" ? "#166534" : "#1e40af",
                    marginBottom:3 }}>Método confirmado en cotización</div>
                  <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>
                    {form.formaPagoCot === "Contado" ? "Pago en efectivo" : "Financiamiento / Crédito"}
                  </div>
                  {form.precioVenta > 0 && (
                    <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                      Precio de venta: <strong style={{ color:"var(--ink)" }}>
                        ${Number(form.precioVenta).toLocaleString("es-MX")}
                      </strong>
                    </div>
                  )}
                </div>
                {form.formaPagoCot !== "Crédito" && (
                  <div style={{ fontSize:11, fontWeight:700, color:"#166534",
                    background:"#dcfce7", border:"1px solid #86efac",
                    borderRadius:20, padding:"4px 10px", whiteSpace:"nowrap" }}>
                    Sin crédito
                  </div>
                )}
              </div>
            )}

            <Sec ico="💳" titulo="Forma de pago general" defaultOpen>
              <Fld label="Forma de pago" full>
                <div style={{ display:"flex", gap:8 }}>
                  {["No definido","Contado","Crédito"].map(function(op){
                    return (
                      <button key={op} type="button" onClick={function(){ set("formaPago", op); }}
                        style={{
                          padding:"6px 18px", borderRadius:8, fontSize:13, fontWeight:600,
                          border:"1px solid var(--line)", cursor:"pointer",
                          background: form.formaPago === op ? "var(--accent)" : "var(--card)",
                          color:      form.formaPago === op ? "#fff"           : "var(--muted)",
                        }}>{op}</button>
                    );
                  })}
                </div>
              </Fld>
            </Sec>
            </>) /* fin tab fpago */}

            {/* ══ TAB: SOLICITUD DE CRÉDITO ══ */}
            {tabActivo === "credito" && (
              form.formaPagoCot !== "Crédito" ? (
                /* ── Bloqueo: pago en efectivo — crédito no aplica ── */
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:20, padding:"48px 32px", textAlign:"center",
                  height:"100%" }}>
                  <div style={{ width:72, height:72, borderRadius:20,
                    background:"#f3f4f6", display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:34 }}>🔒</div>
                  <div>
                    <div style={{ fontSize:17, fontWeight:800, color:"var(--ink)",
                      marginBottom:8 }}>Crédito no aplica</div>
                    <div style={{ fontSize:13, color:"var(--muted)", maxWidth:340,
                      lineHeight:1.55 }}>
                      La forma de pago no está configurada como <strong>Crédito</strong>.
                      Esta sección solo aplica cuando el cliente financia con una institución bancaria.
                    </div>
                  </div>
                  <div style={{ padding:"14px 20px", borderRadius:10,
                    background:"#f0fdf4", border:"1px solid #bbf7d0",
                    fontSize:12, color:"#166534", fontWeight:600, lineHeight:1.5 }}>
                    ✓ Pago en efectivo registrado
                    {form.precioVenta ? " · $" + Number(form.precioVenta).toLocaleString("es-MX") : ""}
                  </div>
                  <button type="button"
                    onClick={function(){ setTabActivo("fpago"); }}
                    style={{ padding:"8px 20px", borderRadius:8, border:"1px solid var(--accent)",
                      background:"transparent", color:"var(--accent)",
                      fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    Ver forma de pago
                  </button>
                </div>
              ) : (<>
            {(function() {
              var ICO_BANK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M3 10l9-7 9 7"/><line x1="12" y1="10" x2="12" y2="21"/></svg>);
              var ESTADOS_E6 = ["Pendiente","En revisión","Aprobado","Rechazado","Condicional"];
              var COLOR_E6 = {
                "Pendiente":     { bg:"rgba(156,163,175,.12)", txt:"#6b7280", dot:"#9ca3af" },
                "En revisión":   { bg:"rgba(59,130,246,.10)",  txt:"#3b82f6", dot:"#3b82f6" },
                "Aprobado":      { bg:"rgba(34,197,94,.12)",   txt:"#16a34a", dot:"#22c55e" },
                "Rechazado":     { bg:"rgba(239,68,68,.10)",   txt:"#dc2626", dot:"#ef4444" },
                "Condicional":   { bg:"rgba(234,179,8,.12)",   txt:"#854d0e", dot:"#eab308" },
              };
              var estad = form.e6Estado || "Pendiente";
              var cfg6  = COLOR_E6[estad] || COLOR_E6["Pendiente"];
              return (
                <Sec ico={ICO_BANK} titulo="Proceso de crédito (E6)" defaultOpen>
                  <Fld label="Estado del crédito" full>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {ESTADOS_E6.map(op => (
                        <button key={op} type="button" onClick={() => { set("e6Estado", op); if (op === "Rechazado") set("prob", 10); }}
                          style={{
                            padding:"5px 12px", borderRadius:7, fontSize:12, fontWeight:600,
                            border:"1px solid var(--line)", cursor:"pointer", transition:"all .15s",
                            background: estad === op ? COLOR_E6[op].dot : "var(--card)",
                            color:       estad === op ? "#fff"           : "var(--muted)",
                          }}>{op}</button>
                      ))}
                    </div>
                  </Fld>
                  <Fld label="Institución financiera">
                    <input className="ef-input" style={IS}
                      value={form.e6Institucion || ""}
                      onChange={e => set("e6Institucion", e.target.value)}
                      placeholder="Banco, financiera o SOFOM..." />
                  </Fld>
                  <Fld label="Fecha solicitud">
                    <input type="date" className="ef-input" style={IS}
                      value={form.e6FechaSolicitud || ""}
                      onChange={e => set("e6FechaSolicitud", e.target.value)} />
                  </Fld>
                  <Fld label="Fecha resultado">
                    <input type="date" className="ef-input" style={IS}
                      value={form.e6FechaResultado || ""}
                      onChange={e => set("e6FechaResultado", e.target.value)} />
                  </Fld>
                  <Fld label="Monto aprobado ($)">
                    <input type="number" className="ef-input" style={IS} min="0" step="1000"
                      value={form.e6MontoAprobado || ""}
                      placeholder="0"
                      onChange={e => set("e6MontoAprobado", Number(e.target.value) || 0)} />
                  </Fld>
                  <Fld label="Mensualidad real del banco ($)">
                    <input type="number" className="ef-input"
                      style={{ ...IS, fontWeight:700, color:"var(--accent)" }}
                      min="0" step="100"
                      value={form.e6MensualidadReal || ""}
                      placeholder="0"
                      onChange={e => set("e6MensualidadReal", Number(e.target.value) || 0)} />
                  </Fld>
                  <Fld label="Condiciones / observaciones" full>
                    <textarea className="ef-input"
                      style={{ ...IS, minHeight:64, resize:"vertical" }}
                      value={form.e6Condiciones || ""}
                      onChange={e => set("e6Condiciones", e.target.value)}
                      placeholder="Tasa, seguro de vida, condición de aprobación..." />
                  </Fld>

                  {/* ── Repositorio de documentos de crédito ── */}
                  <Fld label="Documentos de crédito" full>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <DocSimpleUpload
                        label="Carta de aprobación"
                        value={form.docCredCarta || null}
                        onChange={v => set("docCredCarta", v)} />
                      <DocSimpleUpload
                        label="Solicitud de crédito"
                        value={form.docCredSolicitud || null}
                        onChange={v => set("docCredSolicitud", v)} />
                      <DocSimpleUpload
                        label="Estados de cuenta"
                        value={form.docCredEstadoCta || null}
                        onChange={v => set("docCredEstadoCta", v)} />
                      <DocSimpleUpload
                        label="Contrato de crédito"
                        value={form.docCredContrato || null}
                        onChange={v => set("docCredContrato", v)} />
                    </div>
                  </Fld>
                </Sec>
              );
            })()}

            {/* § E7 — VALIDACIÓN DE EXPEDIENTE */}
            {(function() {
              var ICO_CLIP = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>);
              var items = _buildExpedienteItems(form);

              var hayRojo    = items.some(function(x){ return x.req && !x.ok && !form.e7ExcepcionAuth; });
              var hayAmarillo= !hayRojo && items.some(function(x){ return !x.ok; });
              var semColor   = hayRojo ? "#ef4444" : hayAmarillo ? "#eab308" : "#22c55e";
              var semLabel   = hayRojo ? "Expediente incompleto" : hayAmarillo ? "Expediente pendiente" : "Expediente completo";
              var semBg      = hayRojo ? "rgba(239,68,68,.10)" : hayAmarillo ? "rgba(234,179,8,.10)" : "rgba(34,197,94,.10)";
              var semBorder  = hayRojo ? "rgba(239,68,68,.35)" : hayAmarillo ? "rgba(234,179,8,.35)" : "rgba(34,197,94,.35)";
              return (
                <Sec ico={ICO_CLIP} titulo="Validación de expediente (E7)" defaultOpen>
                  <Fld label="Estado del expediente" full>
                    <div style={{
                      padding:"10px 14px", borderRadius:8,
                      border:"1px solid " + semBorder, background:semBg,
                      display:"flex", alignItems:"center", gap:10,
                    }}>
                      <span style={{
                        width:14, height:14, borderRadius:"50%", background:semColor, flexShrink:0,
                        boxShadow:"0 0 6px " + semColor,
                      }} />
                      <span style={{ fontWeight:700, fontSize:13, color:semColor }}>{semLabel}</span>
                    </div>
                  </Fld>
                  <Fld label="Checklist de expediente" full>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {items.map(function(it, idx) {
                        var dot  = it.ok ? "#22c55e" : it.req ? "#ef4444" : "#eab308";
                        var icon = it.ok ? "✓" : it.req ? "✗" : "○";
                        return (
                          <div key={idx}
                            onClick={it.manual ? function(){ set("e7ContratoOk", !form.e7ContratoOk); } : undefined}
                            style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0",
                              cursor: it.manual ? "pointer" : "default" }}>
                            <span style={{
                              width:18, height:18, borderRadius:4, background:dot + "22",
                              border:"1px solid " + dot, display:"flex", alignItems:"center",
                              justifyContent:"center", fontSize:10, fontWeight:800,
                              color:dot, flexShrink:0,
                            }}>{icon}</span>
                            <span style={{ fontSize:12, color: it.ok ? "var(--ink)" : "var(--muted)",
                              fontWeight: it.req && !it.ok ? 600 : 400 }}>
                              {it.label}{it.req && !it.ok ? " *" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Fld>
                  {(hayRojo || hayAmarillo) && (
                    <Fld label="Excepción autorizada por gerente" full>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:form.e7ExcepcionAuth ? 6 : 0 }}>
                        <button type="button"
                          onClick={() => set("e7ExcepcionAuth", !form.e7ExcepcionAuth)}
                          style={{
                            padding:"5px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                            border:"1px solid " + (form.e7ExcepcionAuth ? "#f59e0b" : "var(--line)"),
                            background: form.e7ExcepcionAuth ? "rgba(245,158,11,.12)" : "var(--card)",
                            color: form.e7ExcepcionAuth ? "#92400e" : "var(--muted)", cursor:"pointer",
                          }}>
                          {form.e7ExcepcionAuth ? "✓ Excepción autorizada" : "Autorizar excepción"}
                        </button>
                      </div>
                      {form.e7ExcepcionAuth && (
                        <input className="ef-input" style={IS}
                          value={form.e7ExcepcionNota || ""}
                          onChange={e => set("e7ExcepcionNota", e.target.value)}
                          placeholder="Motivo de la excepción..." />
                      )}
                    </Fld>
                  )}
                  <Fld label="Observaciones del expediente" full>
                    <textarea className="ef-input"
                      style={{ ...IS, minHeight:56, resize:"vertical" }}
                      value={form.e7Obs || ""}
                      onChange={e => set("e7Obs", e.target.value)}
                      placeholder="Notas sobre documentos faltantes, próximos pasos..." />
                  </Fld>
                </Sec>
              );
            })()}


            </>)
            )}

            {/* ══ TAB: APROBACIONES ══ */}
            {tabActivo === "aprob" && (<>

            {/* § E5 — APROBACIÓN DE GERENTE */}
            {(function() {
              var estado   = form.e5Estado || "Pendiente";
              var tipoPago = form.formaPagoCot || "No definido";
              var ICO_CHK  = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>);
              var COLOR_E5 = {
                "Pendiente":            { bg:"rgba(156,163,175,.12)", txt:"#6b7280", dot:"#9ca3af" },
                "Enviado a aprobación": { bg:"rgba(59,130,246,.10)",  txt:"#3b82f6", dot:"#3b82f6" },
                "Aprobado":             { bg:"rgba(34,197,94,.12)",   txt:"#16a34a", dot:"#22c55e" },
                "Rechazado":            { bg:"rgba(239,68,68,.10)",   txt:"#dc2626", dot:"#ef4444" },
              };
              var cfg = COLOR_E5[estado] || COLOR_E5["Pendiente"];
              function accion(nuevoEstado, quien) {
                set("e5Estado",      nuevoEstado);
                set("e5AprobadoPor", quien || "");
                set("e5Fecha",       new Date().toISOString());
              }
              var montoStr = tipoPago === "Crédito" ? "" : "";
              return (
                <Sec ico={ICO_CHK} titulo="Aprobación de gerente (E5)" defaultOpen>
                  <Fld label="Tipo de pago solicitado" full>
                    <div style={{
                      padding:"8px 12px", borderRadius:7, border:"1px solid var(--line)",
                      background:"var(--bg)", fontSize:13, display:"flex", alignItems:"center", gap:8,
                    }}>
                      <span style={{ fontSize:16 }}>{tipoPago === "Crédito" ? "💳" : "💵"}</span>
                      <span style={{ fontWeight:600, color:"var(--ink)" }}>{tipoPago}</span>
                      {tipoPago === "Crédito" && form.plazoMeses > 0 && (
                        <span style={{ fontSize:12, color:"var(--muted)" }}>
                          {" · "}{form.plazoMeses} meses{" · Enganche $"}{Number(form.enganche || 0).toLocaleString("es-MX")}
                        </span>
                      )}
                      {tipoPago !== "Crédito" && form.precioVenta > 0 && (
                        <span style={{ fontSize:12, color:"var(--muted)" }}>
                          {" · $"}{Number(form.precioVenta).toLocaleString("es-MX")}{" de contado"}
                        </span>
                      )}
                    </div>
                  </Fld>
                  <Fld label="Estado de aprobación" full>
                    <div style={{
                      padding:"8px 12px", borderRadius:7, border:"1px solid var(--line)",
                      background:cfg.bg, display:"flex", alignItems:"center", gap:8,
                    }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:cfg.dot, flexShrink:0 }} />
                      <span style={{ fontWeight:700, fontSize:13, color:cfg.txt }}>{estado}</span>
                      {form.e5AprobadoPor && (
                        <span style={{ fontSize:12, color:"var(--muted)", marginLeft:"auto" }}>
                          {form.e5AprobadoPor}
                          {form.e5Fecha && (" · " + new Date(form.e5Fecha).toLocaleDateString("es-MX"))}
                        </span>
                      )}
                    </div>
                  </Fld>
                  {(estado === "Pendiente" || estado === "Rechazado") && (
                    <Fld label="Acción del asesor" full>
                      <button type="button"
                        onClick={() => accion("Enviado a aprobación", "")}
                        style={{
                          padding:"8px 18px", borderRadius:8, border:"1px solid #3b82f6",
                          background:"rgba(59,130,246,.08)", color:"#3b82f6",
                          fontSize:13, fontWeight:600, cursor:"pointer",
                        }}>
                        Enviar a aprobación del gerente
                      </button>
                    </Fld>
                  )}
                  {estado === "Enviado a aprobación" && (
                    <Fld label="Decisión del gerente" full>
                      {(usuarioActual && usuarioActual.rol === "vendedor") ? (
                        <div style={{
                          padding:"10px 14px", borderRadius:8, fontSize:13,
                          background:"#fefce8", border:"1px solid #fde047",
                          color:"#854d0e", display:"flex", alignItems:"center", gap:8,
                        }}>
                          <span style={{ fontSize:16 }}>🔒</span>
                          Solo el gerente o director puede aprobar o rechazar esta solicitud.
                        </div>
                      ) : (
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <button type="button" onClick={() => accion("Aprobado", usuarioActual ? usuarioActual.nombre : "Gerente")}
                            style={{
                              padding:"8px 20px", borderRadius:8, border:"1px solid #22c55e",
                              background:"rgba(34,197,94,.10)", color:"#16a34a",
                              fontSize:13, fontWeight:600, cursor:"pointer",
                            }}>Aprobar</button>
                          <button type="button" onClick={() => accion("Rechazado", usuarioActual ? usuarioActual.nombre : "Gerente")}
                            style={{
                              padding:"8px 20px", borderRadius:8, border:"1px solid #ef4444",
                              background:"rgba(239,68,68,.08)", color:"#dc2626",
                              fontSize:13, fontWeight:600, cursor:"pointer",
                            }}>Rechazar</button>
                        </div>
                      )}
                    </Fld>
                  )}
                  {estado === "Aprobado" && (
                    <Fld label="Siguiente paso" full>
                      <div style={{
                        padding:"8px 12px", borderRadius:7, fontSize:13,
                        background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.3)",
                        color:"#15803d", fontWeight:500,
                      }}>
                        {tipoPago === "Crédito"
                          ? "→ E6: Proceso de crédito (Servicios Financieros)"
                          : "→ E7: Validación de expediente"}
                      </div>
                    </Fld>
                  )}
                  <Fld label="Observaciones" full>
                    <textarea className="ef-input"
                      style={{ ...IS, minHeight:56, resize:"vertical" }}
                      value={form.e5Notas || ""}
                      onChange={e => set("e5Notas", e.target.value)}
                      placeholder="Motivo de rechazo, condiciones especiales, instrucciones al asesor..." />
                  </Fld>
                </Sec>
              );
            })()}

            </>) /* fin tab aprob */}


            {/* ══ TAB: PAGO ══ */}
            {tabActivo === "pago" && (<>

            {/* ── Panel resumen: precio de venta vs. comprobado ── */}
            {(function() {
              var precio    = Number(form.precioVenta)  || 0;
              var lista     = Number(form.precioLista)  || 0;
              var comprobados = (form.docComprobantes || []).reduce(function(s, it){ return s + (Number(it.monto)||0); }, 0);
              var base      = precio || lista;
              var saldo     = base - comprobados;
              var pct       = base > 0 ? Math.min(100, Math.round((comprobados / base) * 100)) : 0;
              var liquidado = base > 0 && saldo <= 0;
              var fmt2 = window.fmtMoney || function(n){ return "$" + Number(n).toLocaleString("es-MX"); };
              if (!base && !comprobados) return null;
              return (
                <div style={{ margin:"16px 20px 0", borderRadius:12,
                  border:"1.5px solid " + (liquidado ? "#86efac" : "#bfdbfe"),
                  background: liquidado ? "#f0fdf4" : "#f8faff", overflow:"hidden" }}>
                  {/* Barra de progreso */}
                  {base > 0 && (
                    <div style={{ height:6, background:"#e2e8f0" }}>
                      <div style={{ height:"100%", width: pct + "%",
                        background: liquidado ? "#22c55e" : saldo < base * 0.3 ? "#3b82f6" : "#60a5fa",
                        transition:"width .4s ease", borderRadius:"4px 0 0 4px" }} />
                    </div>
                  )}
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:".06em", color:"var(--muted)", marginBottom:10 }}>
                      Resumen de pago
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", rowGap:7 }}>
                      {/* Precio de venta */}
                      {base > 0 && (<>
                        <span style={{ fontSize:13, color:"var(--ink-2)" }}>
                          {precio > 0 ? "Precio de venta" : "Precio de lista"}
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)", textAlign:"right" }}>
                          {fmt2(base)}
                        </span>
                      </>)}
                      {/* Total comprobado */}
                      <span style={{ fontSize:13, color:"var(--ink-2)" }}>Total comprobado</span>
                      <span style={{ fontSize:13, fontWeight:700,
                        color: comprobados > 0 ? "#065f46" : "var(--muted)", textAlign:"right" }}>
                        {comprobados > 0 ? fmt2(comprobados) : "—"}
                      </span>
                      {/* Línea separadora */}
                      {base > 0 && comprobados > 0 && (<>
                        <div style={{ gridColumn:"1/-1", height:1, background:"var(--line-2)", margin:"2px 0" }} />
                        {/* Saldo */}
                        <span style={{ fontSize:14, fontWeight:700,
                          color: liquidado ? "#166534" : "#1e3a8a" }}>
                          {liquidado ? "✓ Liquidado" : "Saldo pendiente"}
                        </span>
                        <span style={{ fontSize:15, fontWeight:800, textAlign:"right",
                          color: liquidado ? "#166534" : "#1e3a8a" }}>
                          {liquidado ? fmt2(0) : fmt2(saldo)}
                        </span>
                        {base > 0 && (
                          <span style={{ gridColumn:"1/-1", fontSize:11, color:"var(--muted)", marginTop:1 }}>
                            {pct}% pagado
                            {!liquidado && comprobados === 0 && " · Agrega comprobantes para ver el saldo"}
                          </span>
                        )}
                      </>)}
                    </div>
                  </div>
                </div>
              );
            })()}

            <Sec ico="📂" titulo="Documentos de caja" defaultOpen>
              <div style={{ gridColumn:"1/-1" }}>
                <DocSimpleUpload
                  label="Factura del vehículo sin valor"
                  sublabel="Factura fiscal · PDF o imagen"
                  value={form.docFactura || null}
                  onChange={v => set("docFactura", v)}
                />
              </div>
              <div style={{ gridColumn:"1/-1", marginTop:4 }}>
                <MultiComprobantesUpload
                  value={form.docComprobantes || []}
                  onChange={v => set("docComprobantes", v)}
                />
              </div>
            </Sec>
            <Sec ico="💵" titulo="Confirmación de pago" defaultOpen>
              <Fld label="Método de pago">
                <select className="ef-select" style={IS}
                  value={form.pagoMetodo || ""}
                  onChange={e => set("pagoMetodo", e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {["Efectivo","Transferencia","Cheque","Tarjeta débito","Tarjeta crédito","Otro"].map(function(o){
                    return <option key={o} value={o}>{o}</option>;
                  })}
                </select>
              </Fld>
              <Fld label="Fecha de pago">
                <input type="date" className="ef-input" style={IS}
                  value={form.pagoFecha || ""}
                  onChange={e => set("pagoFecha", e.target.value)} />
              </Fld>
              <Fld label="Referencia / folio">
                <input className="ef-input" style={IS}
                  value={form.pagoReferencia || ""}
                  onChange={e => set("pagoReferencia", e.target.value)}
                  placeholder="Número de transferencia, cheque, etc." />
              </Fld>
              <Fld label="Monto pagado ($)">
                {/* Muestra suma de comprobantes (si existe) o input manual */}
                {(function(){
                  var totalComp = (form.docComprobantes || []).reduce(function(s, it){ return s + (Number(it.monto)||0); }, 0);
                  if (totalComp > 0) {
                    return (
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:16, fontWeight:800, color:"var(--accent)" }}>
                          ${Number(totalComp).toLocaleString("es-MX")}
                        </span>
                        <span style={{ fontSize:11, color:"var(--muted)" }}>
                          suma de comprobantes
                        </span>
                      </div>
                    );
                  }
                  return (
                    <input type="number" className="ef-input"
                      style={{ ...IS, fontWeight:700, color:"var(--accent)" }}
                      min="0" step="100"
                      value={form.pagoMonto || ""}
                      onChange={e => set("pagoMonto", Number(e.target.value) || 0)}
                      placeholder="0" />
                  );
                })()}
              </Fld>
              <Fld label="Notas de pago" full>
                <textarea className="ef-input"
                  style={{ ...IS, minHeight:64, resize:"vertical" }}
                  value={form.pagoNotas || ""}
                  onChange={e => set("pagoNotas", e.target.value)}
                  placeholder="Observaciones del pago, condiciones especiales…" />
              </Fld>
            </Sec>
            </>) /* fin tab pago */}

            {/* ══ TAB: ENTREGA ══ */}
            {tabActivo === "entrega" && (<>
            <Sec ico="🚚" titulo="Entrega de la unidad" defaultOpen>
              <Fld label="Fecha de entrega">
                <input type="date" className="ef-input" style={IS}
                  value={form.entregaFecha || ""}
                  onChange={e => set("entregaFecha", e.target.value)} />
              </Fld>
              <Fld label="Kilometraje al entregar">
                <input className="ef-input" style={IS}
                  value={form.entregaKm || ""}
                  onChange={e => set("entregaKm", e.target.value)}
                  placeholder="0 km" />
              </Fld>
              <Fld label="Notas de entrega" full>
                <textarea className="ef-input"
                  style={{ ...IS, minHeight:72, resize:"vertical" }}
                  value={form.entregaNotas || ""}
                  onChange={e => set("entregaNotas", e.target.value)}
                  placeholder="Condición de la unidad, accesorios entregados, observaciones…" />
              </Fld>
            </Sec>

            {/* Contrato firmado */}
            {/* § E8 — EXPEDIENTE */}
            {(function() {
              var ICO_EXP = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>);
              var subiendo    = e8Subiendo;
              var setSubiendo = setE8Subiendo;
              var errSub      = e8ErrSub;
              var setErrSub   = setE8ErrSub;

              async function handleContrato(file) {
                if (!file) return;
                if (!window.DB || !window.DB.storage) { setErrSub("Storage no disponible"); return; }
                var agencyId = window.AUTOMIND && window.AUTOMIND.agencyId;
                if (!agencyId || !form.id) { setErrSub("Guarda el cliente primero"); return; }
                setSubiendo(true); setErrSub("");
                var ext  = file.name.split(".").pop().toLowerCase();
                var path = agencyId + "/" + form.id + "/contrato_" + Date.now() + "." + ext;
                var { error } = await window.DB.storage.from("expedientes").upload(path, file, { upsert: true });
                if (error) { setErrSub(error.message); setSubiendo(false); return; }
                var { data: urlData } = window.DB.storage.from("expedientes").getPublicUrl(path);
                var url = (urlData && urlData.publicUrl) || path;
                set("e8ContratoUrl",    url);
                set("e8ContratoNombre", file.name);
                set("e8ContratoFecha",  new Date().toISOString().slice(0, 10));
                setSubiendo(false);
              }

              return (
                <Sec ico={ICO_EXP} titulo="Expediente" defaultOpen>
                  {/* Contrato firmado */}
                  <Fld label="Contrato firmado" full>
                    {form.e8ContratoUrl ? (
                      <div style={{
                        padding:"10px 12px", borderRadius:8, border:"1px solid rgba(34,197,94,.4)",
                        background:"rgba(34,197,94,.06)", display:"flex", alignItems:"center", gap:10,
                      }}>
                        <span style={{ fontSize:20 }}>📄</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {form.e8ContratoNombre || "Contrato firmado"}
                          </div>
                          {form.e8ContratoFecha && (
                            <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>
                              Cargado el {new Date(form.e8ContratoFecha + "T12:00:00").toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" })}
                            </div>
                          )}
                        </div>
                        <a href={form.e8ContratoUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            padding:"5px 12px", borderRadius:7, border:"1px solid var(--accent)",
                            background:"transparent", color:"var(--accent)",
                            fontSize:12, fontWeight:600, textDecoration:"none", flexShrink:0,
                          }}>Ver</a>
                        <button type="button"
                          onClick={() => { set("e8ContratoUrl", null); set("e8ContratoNombre", ""); set("e8ContratoFecha", ""); }}
                          style={{
                            background:"none", border:"none", cursor:"pointer",
                            color:"var(--muted)", fontSize:16, flexShrink:0, padding:"0 4px",
                          }}>✕</button>
                      </div>
                    ) : (
                      <label style={{
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                        gap:6, padding:"20px 16px", borderRadius:8, cursor:"pointer",
                        border:"1.5px dashed var(--line)", background:"var(--bg)", transition:"border-color .15s",
                      }}
                        onMouseEnter={function(e){ e.currentTarget.style.borderColor = "var(--accent)"; }}
                        onMouseLeave={function(e){ e.currentTarget.style.borderColor = "var(--line)"; }}>
                        <span style={{ fontSize:28, opacity:.5 }}>📎</span>
                        <span style={{ fontSize:13, color:"var(--muted)", fontWeight:500 }}>
                          {subiendo ? "Subiendo..." : "Cargar contrato firmado"}
                        </span>
                        <span style={{ fontSize:11, color:"var(--muted)", opacity:.7 }}>PDF · JPG · PNG</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }}
                          disabled={subiendo}
                          onChange={function(e){ handleContrato(e.target.files[0]); e.target.value = ""; }} />
                      </label>
                    )}
                    {errSub && (
                      <div style={{ marginTop:6, fontSize:12, color:"#dc2626", padding:"6px 10px",
                        borderRadius:6, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)" }}>
                        {errSub}
                      </div>
                    )}
                  </Fld>
                </Sec>
              );
            })()}


            </>) /* fin tab entrega */}

            {/* ══ TAB: HISTORIAL ══ */}
            {tabActivo === "historial" && (<>
            <div style={{ padding:"16px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>Historial de actividad</div>
                <div style={{ display:"flex", gap:8 }}>
                  <select value={filtroHistorial} onChange={e => setFiltroHistorial(e.target.value)}
                    style={{ padding:"4px 8px", border:"1px solid var(--line)", borderRadius:6,
                      fontSize:12, background:"var(--card)", color:"var(--ink)",
                      outline:"none", cursor:"pointer" }}>
                    <option value="">Todos los eventos</option>
                    {["etapa","estado","documento","cotizacion","credito","aprobacion","pago","entrega","vendedor","nota"].map(function(t){
                      return <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>;
                    })}
                  </select>
                </div>
              </div>
              {cargandoHist ? (
                <div style={{ textAlign:"center", padding:"24px", color:"var(--muted)", fontSize:13 }}>
                  Cargando historial…
                </div>
              ) : historialItems.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px", color:"var(--muted)", fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>📋</div>
                  No hay entradas de historial todavía.<br/>
                  Los cambios futuros aparecerán aquí.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {historialItems.map(function(h, idx){
                    var TIPO_ICO = {
                      etapa:"🔄", estado:"🏷", documento:"📄", cotizacion:"💰",
                      credito:"🏦", aprobacion:"✅", pago:"💵", entrega:"🚚",
                      vendedor:"👤", nota:"💬",
                    };
                    var ico = TIPO_ICO[h.tipo_evento] || "📌";
                    var dt  = new Date(h.created_at);
                    var dtStr = dt.toLocaleDateString("es-MX",{ day:"numeric", month:"short", year:"numeric" })
                      + " · " + dt.toLocaleTimeString("es-MX",{ hour:"2-digit", minute:"2-digit" });
                    return (
                      <div key={h.id || idx} style={{
                        display:"flex", gap:10, padding:"10px 0",
                        borderBottom: idx < historialItems.length - 1 ? "1px solid var(--line)" : "none",
                      }}>
                        <div style={{ flexShrink:0, marginTop:2 }}>
                          <span style={{ fontSize:16 }}>{ico}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, color:"var(--ink)", lineHeight:1.4 }}>
                            {h.descripcion}
                          </div>
                          <div style={{ fontSize:11, color:"var(--muted)", marginTop:3 }}>
                            {dtStr}
                            {h.usuario_nombre ? " · " + h.usuario_nombre : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Agregar nota manual */}
              <div style={{ marginTop:16, padding:"12px", background:"var(--bg)",
                border:"1px solid var(--line)", borderRadius:10 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--muted)",
                  marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>
                  Agregar comentario
                </div>
                <textarea
                  value={notaHistorial}
                  onChange={e => setNotaHistorial(e.target.value)}
                  placeholder="Escribe un comentario o nota sobre este cliente…"
                  style={{
                    width:"100%", padding:"8px 10px", border:"1px solid var(--line)",
                    borderRadius:7, fontSize:13, background:"var(--card)", color:"var(--ink)",
                    outline:"none", fontFamily:"inherit", resize:"vertical", minHeight:60,
                    boxSizing:"border-box",
                  }} />
                <button type="button"
                  disabled={!notaHistorial.trim()}
                  onClick={async function(){
                    if (!notaHistorial.trim() || !selId) return;
                    var aid = window.AUTOMIND && window.AUTOMIND.agencyId;
                    await window.DB.addClienteHistorial(selId, aid, "nota", notaHistorial.trim());
                    setNotaHistorial("");
                    var updated = await window.DB.getClienteHistorial(selId);
                    setHistorial(updated);
                  }}
                  style={{
                    marginTop:8, padding:"6px 16px", borderRadius:7, fontSize:12, fontWeight:700,
                    border:"none", cursor:"pointer",
                    background:"var(--accent)", color:"#fff",
                    opacity: notaHistorial.trim() ? 1 : .4,
                  }}>
                  Guardar comentario
                </button>
              </div>
            </div>
            </>) /* fin tab historial */}

            {/* ══ TAB PERFIL: asesor/prox/notas (duplicado al final como "catch-all") ══ */}
            {tabActivo === "perfil" && (
            <Sec ico={ICO_PROCESO} titulo="Seguimiento comercial" defaultOpen>
              <Fld label="Etapa">
                <select className="ef-select" style={IS} value={form.etapa || "Prospección"} onChange={e => set("etapa", e.target.value)}>
                  {ETAPAS_CRM.map(e => <option key={e}>{e}</option>)}
                </select>
              </Fld>
              <Fld label="Asesor asignado" full>
                <select className="ef-select" style={IS} value={form.asesor || ""} onChange={e => set("asesor", e.target.value)}>
                  <option value="">Sin asignar</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              </Fld>
              <Fld label="Próxima acción" full>
                <input className="ef-input" style={IS} value={form.prox || ""} onChange={e => set("prox", e.target.value)} />
              </Fld>
              <Fld label="Fecha próxima acción">
                <input type="date" className="ef-input" style={IS} value={form.fprox || ""} onChange={e => set("fprox", e.target.value)} />
              </Fld>
              <Fld label="Último contacto">
                <input type="date" className="ef-input" style={IS} value={form.uc || ""} onChange={e => set("uc", e.target.value)} />
              </Fld>
              <Fld label="Notas" full>
                <textarea className="ef-input"
                  style={{ ...IS, minHeight:76, resize:"vertical" }}
                  value={form.notas || ""}
                  onChange={e => set("notas", e.target.value)} />
              </Fld>
            </Sec>

            )} {/* fin tabActivo perfil → seguimiento comercial */}

          </div> {/* fin inv-form-scroll */}

          </div> {/* fin layout lista+contenido */}
        </div>
      ) : (
        <div className="inv-form-panel"
          style={{ display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:12, color:"var(--muted)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" width="52" height="52" style={{ opacity:.25 }}>
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span style={{ fontSize:14, fontWeight:600 }}>Selecciona un cliente</span>
        </div>
      )}

      {/* Modal de selección de unidad (E4) */}
      {showUnitPicker && (
        <UnitPickerModal
          onSelect={function(u) {
            set("unidadId",   u.id);
            set("unidadDesc", u.desc);
            // Auto-rellenar precio de lista si la unidad lo trae
            if (u.precio > 0) {
              set("precioLista",     u.precio);
              set("precioVenta",     u.precio);
              set("descuentoMonto",  0);
              // Recalcular mensualidad si ya hay enganche y plazo
              var eng   = Number(form.enganche)    || 0;
              var meses = Number(form.plazoMeses)  || 0;
              if (meses > 0) set("mensualidadEst", Math.round((u.precio - eng) / meses));
            }
            setShowUnitPicker(false);
          }}
          onClose={() => setShowUnitPicker(false)}
        />
      )}

      {/* ── Modal confirmación eliminar cliente ── */}
      {delConfirm && form && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:3000,
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={() => !delEliminando && setDelConfirm(false)}>
          <div style={{
            background:"var(--card)", borderRadius:14, padding:"28px 32px",
            maxWidth:420, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,.25)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{
                width:40, height:40, borderRadius:10, background:"#fff5f5",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"var(--ink)" }}>
                  Eliminar cliente
                </div>
                <div style={{ fontSize:13, color:"var(--muted)", marginTop:2 }}>
                  Esta acción no se puede deshacer.
                </div>
              </div>
            </div>
            <p style={{ fontSize:13, color:"var(--ink)", margin:"0 0 20px",
              padding:"10px 14px", background:"var(--bg)", borderRadius:8,
              border:"1px solid var(--line)", lineHeight:1.5 }}>
              ¿Eliminar permanentemente a <strong>{form.nombre}</strong>?
              Se perderán todos sus datos, documentos y historial.
            </p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button type="button"
                disabled={delEliminando}
                onClick={() => setDelConfirm(false)}
                style={{ padding:"8px 18px", borderRadius:8, border:"1px solid var(--line)",
                  background:"var(--bg)", color:"var(--ink)", fontWeight:600, fontSize:13,
                  cursor: delEliminando ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
                Cancelar
              </button>
              <button type="button"
                disabled={delEliminando}
                onClick={handleDelete}
                style={{ padding:"8px 18px", borderRadius:8, border:"none",
                  background: delEliminando ? "#fca5a5" : "#dc2626", color:"#fff",
                  fontWeight:700, fontSize:13,
                  cursor: delEliminando ? "not-allowed" : "pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6 }}>
                {delEliminando
                  ? <><span style={{ width:12, height:12, border:"2px solid rgba(255,255,255,.4)",
                      borderTop:"2px solid #fff", borderRadius:"50%",
                      display:"inline-block", animation:"spin 1s linear infinite" }}/> Eliminando…</>
                  : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Drawer de detalle ─────────────────────────────────────────────────── */
function ClienteDrawer({ c, onClose }) {
  if (!c) return null;
  const dias = _dsc(c.uc);
  const cfg  = ETAPA_CFG[c.etapa] || {};

  const Field = ({ label, value }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
      <div style={{ fontSize:10, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em" }}>{label}</div>
      <div style={{ fontSize:13, color:"var(--ink)", fontWeight:500 }}>{value || "—"}</div>
    </div>
  );

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        {/* Cabecera */}
        <div className="dr-head">
          <div>
            <div className="dr-eyebrow">{c.id} · {c.canal} · {c.ciudad}, {c.estado}</div>
            <h2 style={{ margin:"4px 0 2px", fontSize:18 }}>{c.nombre}</h2>
            <div className="dr-meta">{c.tipo} · {c.uso}</div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}>{I.close({ width: 20, height: 20 })}</button>
        </div>

        {/* Etapa + días sin contacto */}
        <div style={{ padding:"12px 20px", display:"flex", gap:10, alignItems:"center",
          borderBottom:"1px solid var(--line)", background: dias > 3 ? "#fff5f5" : "transparent" }}>
          <EtapaBadge etapa={c.etapa} />
          <span style={{ flex:1 }} />
          <DiasTag dias={dias} />
          <span style={{ fontSize:12, color: dias > 3 ? "#e0492f" : "var(--muted)" }}>
            {dias === 0 ? "Contactado hoy" : `Último contacto hace ${dias} día${dias !== 1 ? "s" : ""}`}
          </span>
        </div>



        {/* Datos de contacto */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase",
            letterSpacing:".06em", marginBottom:12 }}>Contacto</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="Teléfono" value={c.tel} />
            <Field label="Email"    value={c.email} />
          </div>
        </div>

        {/* Perfil comercial */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase",
            letterSpacing:".06em", marginBottom:12 }}>Perfil comercial</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="Vehículo de interés" value={c.interes} />
            <Field label="Presupuesto estimado" value={"$" + c.presupuesto.toLocaleString("es-MX")} />
            <Field label="Forma de pago" value={c.formaPago} />
            <Field label="Uso del vehículo" value={c.uso} />
          </div>
        </div>

        {/* Origen */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase",
            letterSpacing:".06em", marginBottom:12 }}>Origen del prospecto</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="Canal" value={c.canal} />
            <Field label="Fuente específica" value={c.fuente} />
          </div>
        </div>

        {/* Seguimiento */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase",
            letterSpacing:".06em", marginBottom:12 }}>Seguimiento</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <Field label="Asesor" value={c.asesor} />
            <Field label="Último contacto" value={_fmtFechaCRM(c.uc)} />
          </div>
          <div style={{ background: dias > 3 ? "#fff5f5" : "var(--bg)", border:"1px solid var(--line)",
            borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:10, fontWeight:700, color: dias > 3 ? "#c2410c" : "var(--muted)",
              textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Próxima acción</div>
            <div style={{ fontSize:13, color:"var(--ink)", fontWeight:600 }}>{c.prox}</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{_fmtFechaCRM(c.fprox)}</div>
          </div>
        </div>

        {/* Notas */}
        {c.notas && (
          <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--line)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase",
              letterSpacing:".06em", marginBottom:8 }}>Notas</div>
            <div style={{ fontSize:13, color:"var(--ink-2)", lineHeight:1.6, background:"var(--bg)",
              borderRadius:8, padding:"10px 12px" }}>{c.notas}</div>
          </div>
        )}

        <div className="dr-actions">
          <button className="btn primary"
            onClick={() => window.open("tel:" + c.tel.replace(/\D/g,""), "_self")}>
            Llamar
          </button>
          <button className="btn"
            onClick={() => window.open("https://wa.me/52" + c.tel.replace(/\D/g,""), "_blank")}>
            WhatsApp
          </button>
        </div>
      </aside>
    </>
  );
}

/* Campo helper — definido FUERA del modal para evitar re-mount en cada render */
function _NuevoCampo({ label, full, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
      {children}
    </div>
  );
}

/* ── Modal "Nuevo cliente" ─────────────────────────────────────────────
   Crea un registro local con los campos del pipeline. Con datos reales
   esto haría un INSERT contra la tabla `clientes` de Supabase.
   initialData: objeto opcional con prefill desde Plan Piso (vin, interes…) */
function NuevoClienteModal({ onClose, onCreate, onRecompra, clientes, asesores, initialData }) {
  // Usar vendedores del workspace en lugar de los extraídos de clientes existentes
  const asesorOpciones = (window.AUTOMIND?.USUARIOS || []).filter(function(u){ return u.rol === "vendedor"; });
  const ini = initialData || {};
  const [f, setF] = React.useState({
    nombre:"", tel:"", email:"", tipo:"Persona física",
    canal:        ini.canal        || "Digital",
    fuente:       "",
    interes:      ini.interes      || "",
    presupuesto:  ini.presupuesto  || "",
    formaPago:"No definido", uso:"Personal", ciudad:"", estado:"",
    asesor: ini.asesor && asesorOpciones.find(function(v){ return v.id === ini.asesor; }) ? ini.asesor : "",
    vinVinculado:  ini.vinVinculado  || "",
    inventarioId:  ini.inventarioId  || null,
  });
  const [buscarRec, setBuscarRec] = React.useState(false);
  const [queryRec,  setQueryRec]  = React.useState("");

  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
  const puedeCrear = f.nombre.trim().length > 0;

  const inputStyle = { width:"100%", padding:"7px 10px", border:"1px solid var(--line)",
    borderRadius:7, fontSize:13, background:"var(--card)", color:"var(--ink)",
    outline:"none", fontFamily:"inherit" };

  // Búsqueda de clientes recurrentes (por nombre, RFC o teléfono)
  const q = queryRec.trim().toLowerCase();
  const resultadosRec = (!buscarRec || q.length < 2 || !clientes)
    ? []
    : clientes.filter(function(c) {
        return (c.nombre  && c.nombre.toLowerCase().includes(q))
            || (c.rfc     && c.rfc.toLowerCase().includes(q))
            || (c.tel     && c.tel.replace(/\D/g,"").includes(q.replace(/\D/g,"")))
            || (c.curp    && c.curp.toLowerCase().includes(q));
      }).slice(0, 6);

  const Campo = _NuevoCampo;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"var(--card)", borderRadius:12, width:"min(560px, 92vw)", maxHeight:"88vh",
        overflowY:"auto", zIndex:1000, boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>

        <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--line)",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ margin:0, fontSize:17 }}>Nuevo cliente</h2>
          <button className="icon-btn ghost" onClick={onClose}>{I.close({ width:18, height:18 })}</button>
        </div>

        {/* ── Sección cliente recurrente ── */}
        <div style={{ margin:"14px 22px 0", borderRadius:10,
          border: buscarRec ? "1px solid #a78bfa" : "1px solid var(--line)",
          background: buscarRec ? "#faf5ff" : "var(--bg)",
          overflow:"hidden", transition:"border-color .15s, background .15s" }}>
          <button onClick={function(){ setBuscarRec(function(v){ return !v; }); setQueryRec(""); }}
            style={{ width:"100%", padding:"10px 14px", background:"none", border:"none",
              cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left" }}>
            <span style={{ fontSize:18 }}>🔄</span>
            <span style={{ flex:1 }}>
              <span style={{ fontWeight:700, fontSize:13, color: buscarRec ? "#7c3aed" : "var(--ink)" }}>
                ¿Es cliente recurrente?
              </span>
              <span style={{ fontSize:11, color:"var(--muted)", display:"block", marginTop:1 }}>
                Busca su expediente para reutilizar datos y documentos existentes
              </span>
            </span>
            <span style={{ fontSize:13, color: buscarRec ? "#7c3aed" : "var(--muted)",
              fontWeight:700, padding:"3px 10px", borderRadius:20,
              background: buscarRec ? "#ede9fe" : "var(--line-2)", transition:"all .15s" }}>
              {buscarRec ? "▲ Cerrar" : "Buscar"}
            </span>
          </button>

          {buscarRec && (
            <div style={{ padding:"0 14px 14px" }}>
              <input
                autoFocus
                value={queryRec}
                onChange={function(e){ setQueryRec(e.target.value); }}
                placeholder="Busca por nombre, RFC, teléfono o CURP…"
                style={{ ...inputStyle, marginBottom: resultadosRec.length ? 10 : 0,
                  borderColor:"#a78bfa", outline:"2px solid #ede9fe" }}
              />
              {q.length >= 2 && resultadosRec.length === 0 && (
                <div style={{ fontSize:12, color:"var(--muted)", padding:"6px 0", textAlign:"center" }}>
                  Sin coincidencias — puedes crear el cliente como nuevo abajo
                </div>
              )}
              {resultadosRec.map(function(c) {
                return (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"9px 12px", borderRadius:9, marginBottom:6,
                    border:"1px solid var(--line)", background:"var(--card)",
                    cursor:"pointer", transition:"border-color .12s, background .12s" }}
                    onMouseOver={function(e){ e.currentTarget.style.borderColor="#7c3aed"; e.currentTarget.style.background="#faf5ff"; }}
                    onMouseOut={function(e){ e.currentTarget.style.borderColor="var(--line)"; e.currentTarget.style.background="var(--card)"; }}
                    onClick={function(){ onRecompra && onRecompra(c); onClose(); }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:"#ede9fe",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16, flexShrink:0, fontWeight:700, color:"#7c3aed" }}>
                      {(c.nombre || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"var(--ink)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {c.nombre}
                      </div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>
                        {[c.tel && "Tel: " + c.tel, c.rfc && "RFC: " + c.rfc].filter(Boolean).join("  ·  ") || "Sin datos de contacto"}
                      </div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"#7c3aed",
                      background:"#ede9fe", padding:"4px 10px", borderRadius:12, flexShrink:0 }}>
                      Usar datos →
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Banner de contexto cuando llega desde Plan Piso */}
        {ini.inventarioId && ini._ctx && (
          <div style={{ margin:"12px 22px 0", padding:"9px 13px", background:"#eff6ff",
            border:"1px solid #bfdbfe", borderRadius:8, fontSize:12, color:"#1d4ed8",
            display:"flex", alignItems:"center", gap:10 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink:0 }}>
              <path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/>
              <circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>
            </svg>
            <span>
              Desde piso · <b>{ini.interes}</b>
              {ini._ctx.colorExterior ? ` · ${ini._ctx.colorExterior}` : ""}
              {ini.vinVinculado ? <span style={{ marginLeft:6, fontFamily:"monospace", fontSize:11,
                background:"#dbeafe", padding:"1px 5px", borderRadius:4 }}>{ini.vinVinculado}</span> : null}
              <span style={{ marginLeft:8, fontWeight:700,
                color: ini._ctx.semaforo === "intereses" ? "#991b1b"
                     : ini._ctx.semaforo === "vencer"    ? "#c2410c"
                     : ini._ctx.semaforo === "comprometido" ? "#d97706" : "#166534" }}>
                · Día {ini._ctx.diasEnPiso} en piso
              </span>
            </span>
          </div>
        )}

        <div style={{ padding:"18px 22px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Campo label="Nombre completo *" full>
            <input style={inputStyle} value={f.nombre} onChange={set("nombre")} placeholder="Nombre y apellidos" autoFocus />
          </Campo>
          <Campo label="Teléfono">
            <input style={inputStyle} value={f.tel} onChange={set("tel")} placeholder="555-000-0000" />
          </Campo>
          <Campo label="Email">
            <input style={inputStyle} value={f.email} onChange={set("email")} placeholder="correo@ejemplo.com" />
          </Campo>
          <Campo label="Tipo de cliente">
            <select style={inputStyle} value={f.tipo} onChange={set("tipo")}>
              <option>Persona física</option><option>Persona moral</option>
            </select>
          </Campo>
          <Campo label="Canal de origen">
            <select style={inputStyle} value={f.canal} onChange={set("canal")}>
              {["Digital","Piso","Referido","Marketplace","Otro"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Campo>
          <Campo label="Fuente específica">
            <input style={inputStyle} value={f.fuente} onChange={set("fuente")} placeholder="Facebook Ads, visita directa…" />
          </Campo>
          <Campo label="Vehículo de interés">
            <input style={inputStyle} value={f.interes} onChange={set("interes")} placeholder="Marca, modelo, año" />
          </Campo>
          <Campo label="Presupuesto estimado">
            <input type="number" style={inputStyle} value={f.presupuesto} onChange={set("presupuesto")} placeholder="0" />
          </Campo>
          <Campo label="Forma de pago">
            <select style={inputStyle} value={f.formaPago} onChange={set("formaPago")}>
              {["No definido","Contado","Crédito"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Campo>
          <Campo label="Uso del vehículo">
            <select style={inputStyle} value={f.uso} onChange={set("uso")}>
              {["Personal","Trabajo","Familiar"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Campo>
          <Campo label="Ciudad">
            <input style={inputStyle} value={f.ciudad} onChange={set("ciudad")} />
          </Campo>
          <Campo label="Estado">
            <input style={inputStyle} value={f.estado} onChange={set("estado")} placeholder="Ej. N.L., Jal." />
          </Campo>
          <Campo label="Asesor asignado" full>
            <select style={inputStyle} value={f.asesor} onChange={set("asesor")}>
              <option value="">Sin asignar</option>
              {asesorOpciones.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
        </div>

        <div style={{ padding:"14px 22px", borderTop:"1px solid var(--line)",
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!puedeCrear}
            style={{ opacity: puedeCrear ? 1 : .5, cursor: puedeCrear ? "pointer" : "not-allowed" }}
            onClick={() => puedeCrear && onCreate(f)}>
            Crear cliente
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Componente principal CRMClientes ────────────────────────────────── */
/* ── Vista General del Proceso de Venta ──────────────────────────────────── */
function ProcesoView({ clientes, onOpen, onRecompra }) {
  var [q,             setQ]           = React.useState("");
  var [filtEtapa,     setFiltEtapa]   = React.useState("");
  var [filtAsesor,    setFiltAsesor]  = React.useState("");
  var [filtPago,      setFiltPago]    = React.useState("");
  var [filtEstatus,   setFiltEstatus] = React.useState("");
  var [filtDocsPend,  setFiltDocsPend]= React.useState(false);
  var [filtDesde,     setFiltDesde]   = React.useState("");
  var [filtHasta,     setFiltHasta]   = React.useState("");
  var [sort, setSort] = React.useState({ key:"uc", dir:1 });

  /* ── Valores derivados ── */
  var asesores = React.useMemo(function() {
    return [...new Set(clientes.map(function(c){ return c.asesor; }).filter(Boolean))].sort();
  }, [clientes]);

  function calcEstatus(c) {
    var items = _buildExpedienteItems(c);
    var rojo = items.some(function(x){ return x.req && !x.ok && !c.e7ExcepcionAuth; });
    return rojo ? "incompleto" : items.some(function(x){ return !x.ok; }) ? "pendiente" : "completo";
  }
  function calcDocsPend(c) {
    return _buildExpedienteItems(c).filter(function(x){ return !x.ok; }).length;
  }
  function tipoPagoCliente(c) {
    if (c.formaPagoCot && c.formaPagoCot !== "No definido") return c.formaPagoCot;
    if (c.formaPago && c.formaPago !== "No definido") return c.formaPago;
    return "";
  }

  /* ── Filtrado ── */
  var filtrados = clientes.filter(function(c) {
    if (q) {
      var qL = q.toLowerCase();
      var ok =
        (c.nombre      || "").toLowerCase().includes(qL) ||
        (c.tel         || "").toLowerCase().includes(qL) ||
        (c.email       || "").toLowerCase().includes(qL) ||
        (c.curp        || "").toLowerCase().includes(qL) ||
        (c.rfc         || "").toLowerCase().includes(qL) ||
        (c.vinVinculado|| "").toLowerCase().includes(qL) ||
        (c.unidadDesc  || "").toLowerCase().includes(qL) ||
        (c.interes     || "").toLowerCase().includes(qL) ||
        (c.ciudad      || "").toLowerCase().includes(qL);
      if (!ok) return false;
    }
    if (filtEtapa   && c.etapa !== filtEtapa) return false;
    if (filtAsesor  && c.asesor !== filtAsesor) return false;
    if (filtPago) {
      var tp = tipoPagoCliente(c);
      if (tp !== filtPago) return false;
    }
    if (filtEstatus && calcEstatus(c) !== filtEstatus) return false;
    if (filtDocsPend && calcDocsPend(c) === 0) return false;
    if (filtDesde && c.createdAt && c.createdAt.slice(0,10) < filtDesde) return false;
    if (filtHasta && c.createdAt && c.createdAt.slice(0,10) > filtHasta) return false;
    return true;
  });

  /* ── Ordenamiento ── */
  var sorted = filtrados.slice().sort(function(a, b) {
    var va, vb;
    if (sort.key === "uc")        { va = _dsc(a.uc);       vb = _dsc(b.uc); }
    else if (sort.key === "docsPend") { va = calcDocsPend(a); vb = calcDocsPend(b); }
    else if (sort.key === "estatus")  { va = calcEstatus(a);  vb = calcEstatus(b); }
    else { va = a[sort.key]; vb = b[sort.key]; }
    if (typeof va === "string") return sort.dir * (va||"").localeCompare(vb||"", "es");
    return sort.dir * ((va||0) - (vb||0));
  });

  var nFiltros = [filtEtapa, filtAsesor, filtPago, filtEstatus].filter(Boolean).length
    + (filtDocsPend ? 1 : 0) + (filtDesde ? 1 : 0) + (filtHasta ? 1 : 0);

  function limpiar() {
    setQ(""); setFiltEtapa(""); setFiltAsesor(""); setFiltPago("");
    setFiltEstatus(""); setFiltDocsPend(false); setFiltDesde(""); setFiltHasta("");
  }
  function toggleSort(key) {
    setSort(function(p){ return p.key === key ? { key, dir: -p.dir } : { key, dir: 1 }; });
  }

  var SEM_COLOR = { completo:"#22c55e", pendiente:"#eab308", incompleto:"#ef4444" };
  var SEM_LABEL = { completo:"Completo",  pendiente:"Pendiente",  incompleto:"Incompleto" };

  var th = { padding:"8px 10px", color:"var(--muted)", fontWeight:600, fontSize:11,
    textAlign:"left", whiteSpace:"nowrap", userSelect:"none" };
  function Hdr({ col, label, center }) {
    var act = sort.key === col;
    return (
      <th onClick={function(){ toggleSort(col); }}
        style={{ ...th, cursor:"pointer", textAlign: center ? "center" : "left" }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
          {label}
          <span style={{ fontSize:10, opacity: act ? 1 : .3, color: act ? "var(--accent)" : "inherit" }}>
            {act ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
          </span>
        </span>
      </th>
    );
  }

  var inputSt = {
    fontSize:12, padding:"5px 8px", borderRadius:6,
    border:"1px solid var(--line)", background:"var(--bg)",
    color:"var(--ink)", outline:"none",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* ── Barra de filtros ─────────────────────────────── */}
      <div style={{ flexShrink:0, padding:"10px 16px 8px", borderBottom:"1px solid var(--line)",
        background:"var(--card)", display:"flex", flexDirection:"column", gap:7 }}>

        {/* Búsqueda */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ position:"relative", flex:1, maxWidth:600 }}>
            <svg style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)",
              opacity:.4, pointerEvents:"none" }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={q} onChange={function(e){ setQ(e.target.value); }}
              placeholder="Buscar por nombre, teléfono, email, CURP, RFC, VIN, vehículo…"
              style={{ ...inputSt, width:"100%", paddingLeft:28, boxSizing:"border-box", height:33 }} />
          </div>
          {(q || nFiltros > 0) && (
            <button onClick={limpiar}
              style={{ ...inputSt, cursor:"pointer", whiteSpace:"nowrap", height:33,
                color:"var(--accent)", borderColor:"var(--accent)" }}>
              Limpiar {nFiltros > 0 ? "(" + nFiltros + " filtros)" : ""}
            </button>
          )}
        </div>

        {/* Filtros rápidos — fila 1 */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {/* Etapa */}
          <select value={filtEtapa} onChange={function(e){ setFiltEtapa(e.target.value); }}
            style={{ ...inputSt }}>
            <option value="">Todas las etapas</option>
            {ETAPAS_CRM.map(function(e){ return <option key={e} value={e}>{e}</option>; })}
          </select>

          {/* Vendedor */}
          <select value={filtAsesor} onChange={function(e){ setFiltAsesor(e.target.value); }}
            style={{ ...inputSt }}>
            <option value="">Todos los vendedores</option>
            {asesores.map(function(a){ return <option key={a} value={a}>{a}</option>; })}
          </select>

          {/* Tipo operación */}
          {[["","Todos"],["Crédito","Crédito"],["Contado","Contado"]].map(function(pair){
            var val = pair[0], lbl = pair[1];
            var act = filtPago === val;
            return (
              <button key={val} onClick={function(){ setFiltPago(val); }}
                style={{ ...inputSt, cursor:"pointer",
                  background: act ? "var(--accent)" : "var(--bg)",
                  color: act ? "#fff" : "var(--muted)",
                  borderColor: act ? "var(--accent)" : "var(--line)",
                  fontWeight: act ? 700 : 400 }}>
                {lbl}
              </button>
            );
          })}

          <span style={{ width:1, height:18, background:"var(--line)", flexShrink:0 }} />

          {/* Estatus expediente */}
          {[["","Todos"],[" completo","✓ Completo"],["pendiente","◐ Pendiente"],["incompleto","✗ Incompleto"]].map(function(pair){
            var val = pair[0].trim(), lbl = pair[1];
            var act = filtEstatus === val;
            var c = val ? SEM_COLOR[val] : null;
            return (
              <button key={val} onClick={function(){ setFiltEstatus(val); }}
                style={{ ...inputSt, cursor:"pointer",
                  background: act && c ? c + "20" : act ? "var(--accent)" : "var(--bg)",
                  color: act && c ? c : act ? "var(--accent)" : "var(--muted)",
                  borderColor: act && c ? c : act ? "var(--accent)" : "var(--line)",
                  fontWeight: act ? 700 : 400 }}>
                {lbl}
              </button>
            );
          })}

          {/* Docs incompletos */}
          <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:12,
            color: filtDocsPend ? "#dc2626" : "var(--muted)", cursor:"pointer" }}>
            <input type="checkbox" checked={filtDocsPend}
              onChange={function(e){ setFiltDocsPend(e.target.checked); }}
              style={{ accentColor:"#dc2626" }} />
            Docs incompletos
          </label>
        </div>

        {/* Filtros — fila 2: fechas + contador */}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:"var(--muted)" }}>Creado desde:</span>
          <input type="date" value={filtDesde} onChange={function(e){ setFiltDesde(e.target.value); }}
            style={{ ...inputSt, fontSize:11 }} />
          <span style={{ fontSize:11, color:"var(--muted)" }}>hasta:</span>
          <input type="date" value={filtHasta} onChange={function(e){ setFiltHasta(e.target.value); }}
            style={{ ...inputSt, fontSize:11 }} />
          <span style={{ fontSize:11, color:"var(--muted)", marginLeft:8 }}>
            {sorted.length === clientes.length
              ? sorted.length + " clientes"
              : sorted.length + " de " + clientes.length + " clientes"}
          </span>
        </div>
      </div>

      {/* ── Tabla ───────────────────────────────────────── */}
      <div style={{ flex:1, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead style={{ position:"sticky", top:0, zIndex:2 }}>
            <tr style={{ background:"var(--card)", borderBottom:"2px solid var(--line)" }}>
              <th style={{ ...th, width:36, textAlign:"center" }}>#</th>
              <Hdr col="nombre"   label="Nombre" />
              <th style={th}>Teléfono / Email</th>
              <Hdr col="asesor"   label="Vendedor" />
              <th style={th}>Vehículo</th>
              <Hdr col="formaPago" label="Operación" center />
              <Hdr col="etapa"    label="Etapa" />
              <Hdr col="uc"       label="Últ. contacto" center />
              <Hdr col="docsPend" label="Docs" center />
              <th style={th}>Próxima actividad</th>
              <Hdr col="estatus"  label="Expediente" />
              <th style={{ ...th, width:36 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign:"center", padding:"60px 20px",
                  color:"var(--muted)", fontSize:13 }}>
                  No hay clientes con los filtros aplicados.
                </td>
              </tr>
            ) : sorted.map(function(c, idx) {
              var estatus  = calcEstatus(c);
              var docsPend = calcDocsPend(c);
              var diasSC   = _dsc(c.uc);
              var eColor   = SEM_COLOR[estatus];
              var tp       = tipoPagoCliente(c);
              var vehiculo = c.unidadDesc || c.interes || "—";

              return (
                <tr key={c.id} onClick={function(){ onOpen(c.id); }}
                  style={{ borderBottom:"1px solid var(--line)", cursor:"pointer" }}
                  onMouseOver={function(e){ e.currentTarget.style.background = "var(--hover,#f9fafb)"; }}
                  onMouseOut={function(e){ e.currentTarget.style.background = ""; }}>

                  {/* # */}
                  <td style={{ padding:"10px 6px", textAlign:"center",
                    color:"var(--muted)", fontSize:11, width:36 }}>{idx + 1}</td>

                  {/* Nombre */}
                  <td style={{ padding:"10px 12px 10px 4px", minWidth:180 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <Ini nombre={c.nombre} />
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:600, color:"var(--ink)",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>
                          {c.nombre}
                        </div>
                        <div style={{ fontSize:10, color:"var(--muted)", marginTop:1 }}>
                          {c.tipo === "Persona moral" ? "PM" : "PF"}
                          {c.vinVinculado ? " · VIN …" + c.vinVinculado.slice(-6) : ""}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tel / Email */}
                  <td style={{ padding:"10px 12px", minWidth:150 }}>
                    {c.tel   && <div style={{ fontWeight:500, color:"var(--ink)" }}>{c.tel}</div>}
                    {c.email && <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>{c.email}</div>}
                    {!c.tel && !c.email && <span style={{ color:"var(--muted)" }}>—</span>}
                  </td>

                  {/* Vendedor */}
                  <td style={{ padding:"10px 12px", whiteSpace:"nowrap", color:"var(--ink)" }}>
                    {c.asesor
                      ? <span>{c.asesor.split(" ").slice(0,2).join(" ")}</span>
                      : <span style={{ color:"var(--muted)" }}>—</span>}
                  </td>

                  {/* Vehículo */}
                  <td style={{ padding:"10px 12px", maxWidth:200 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      fontWeight:500, color:"var(--ink)" }}>{vehiculo}</div>
                    {c.unidadDesc && c.interes && c.unidadDesc !== c.interes && (
                      <div style={{ fontSize:10, color:"var(--muted)", marginTop:1,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {c.interes}
                      </div>
                    )}
                  </td>

                  {/* Tipo operación */}
                  <td style={{ padding:"10px 6px", textAlign:"center" }}>
                    {tp ? (
                      <span style={{
                        fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999,
                        background: tp === "Crédito" ? "#dbeafe" : "#f0fdf4",
                        color:      tp === "Crédito" ? "#1d4ed8" : "#166534",
                        border:"1px solid " + (tp === "Crédito" ? "#93c5fd" : "#86efac"),
                      }}>{tp}</span>
                    ) : <span style={{ color:"var(--muted)" }}>—</span>}
                  </td>

                  {/* Etapa */}
                  <td style={{ padding:"10px 12px" }}>
                    <EtapaBadge etapa={c.etapa} />
                  </td>

                  {/* Último contacto */}
                  <td style={{ padding:"10px 6px", textAlign:"center" }}>
                    <DiasTag dias={diasSC} />
                  </td>

                  {/* Docs pendientes */}
                  <td style={{ padding:"10px 6px", textAlign:"center" }}>
                    {docsPend === 0 ? (
                      <span style={{ fontSize:12, color:"#22c55e", fontWeight:700 }}>✓</span>
                    ) : (
                      <span style={{
                        fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:999,
                        background:"#fee2e2", color:"#991b1b", border:"1px solid #fecaca",
                      }}>{docsPend} pend.</span>
                    )}
                  </td>

                  {/* Próxima actividad */}
                  <td style={{ padding:"10px 12px", maxWidth:220 }}>
                    {c.prox ? (
                      <div>
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis",
                          whiteSpace:"nowrap", color:"var(--ink)" }}>{c.prox}</div>
                        {c.fprox && (
                          <div style={{ fontSize:10, color:"var(--muted)", marginTop:1 }}>
                            {_fmtFechaCRM(c.fprox)}
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color:"var(--muted)" }}>—</span>}
                  </td>

                  {/* Estatus expediente */}
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:999,
                      background: eColor + "20", color: eColor,
                      border:"1px solid " + eColor + "55",
                    }}>
                      {SEM_LABEL[estatus]}
                    </span>
                  </td>

                  {/* Recompra */}
                  <td style={{ padding:"10px 8px", textAlign:"center" }}>
                    {onRecompra && (
                      <button
                        title="Nueva compra para este cliente"
                        onClick={function(e){ e.stopPropagation(); onRecompra(c); }}
                        style={{ background:"#ede9fe", border:"none", borderRadius:7,
                          padding:"4px 8px", cursor:"pointer", fontSize:14,
                          color:"#7c3aed", lineHeight:1, display:"inline-flex",
                          alignItems:"center", justifyContent:"center" }}>
                        🔄
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CRMClientes({ rows, kpis, usuarios, usuarioActual }) {
  const [clientesData, setClientesData] = React.useState([]);
  const [cargando,     setCargando]     = React.useState(false);
  const [errorCrm,     setErrorCrm]     = React.useState(null);
  const [vista, setVista]           = React.useState("editor");
  const [seleccionado, setSeleccionado] = React.useState(null);
  const [busqueda, setBusqueda]     = React.useState("");
  const [filtroAsesor, setFiltroAsesor] = React.useState("Todos");
  const [mostrarNuevo, setMostrarNuevo] = React.useState(false);
  const [pendingData, setPendingData]   = React.useState(null);
  const [editorSelId, setEditorSelId]   = React.useState(null);
  const [recompraCliente, setRecompraCliente] = React.useState(null); // cliente origen para recompra

  /* Detectar prefill desde Plan Piso al montar */
  React.useEffect(() => {
    const pending = window.AUTOMIND && window.AUTOMIND._pendingNuevoCliente;
    if (pending) {
      window.AUTOMIND._pendingNuevoCliente = null;
      setPendingData(pending);
      setMostrarNuevo(true);
    }
  }, []);

  /* Cargar clientes reales desde Supabase */
  React.useEffect(() => {
    var agencyId = window.AUTOMIND && window.AUTOMIND.agencyId;
    if (!agencyId || !window.DB) return;
    setCargando(true);
    setErrorCrm(null);
    window.DB.getClientes(agencyId)
      .then(function(lista) { setClientesData(lista); })
      .catch(function(err)  { console.error("[CRM] Error cargando clientes:", err); setErrorCrm("No se pudieron cargar los clientes."); })
      .finally(function()   { setCargando(false); });
  }, []);

  const asesores = ["Todos", ...Array.from(new Set(clientesData.map(c => c.asesor)))];

  const clientes = clientesData.filter(c => {
    const q = busqueda.toLowerCase();
    const matchBusq = !q ||
      c.nombre.toLowerCase().includes(q) ||
      c.interes.toLowerCase().includes(q) ||
      c.ciudad.toLowerCase().includes(q);
    const matchAsesor = filtroAsesor === "Todos" || c.asesor === filtroAsesor;
    return matchBusq && matchAsesor;
  });

  const urgentesCount = clientesData.filter(c => _dsc(c.uc) > 3).length;

  async function crearCliente(datos) {
    const hoy = new Date().toISOString().slice(0, 10);
    var nuevo = {
      id: "c" + Date.now(),
      nombre: datos.nombre.trim(),
      tel: datos.tel, email: datos.email, tipo: datos.tipo, canal: datos.canal,
      fuente: datos.fuente, interes: datos.interes,
      presupuesto: Number(datos.presupuesto) || 0,
      formaPago: datos.formaPago, uso: datos.uso,
      etapa: "Prospección", asesor: datos.asesor || "Sin asignar",
      prob: 10, uc: hoy, ciudad: datos.ciudad, estado: datos.estado,
      prox: "Primer contacto", fprox: hoy, notas: "",
      vinVinculado: datos.vinVinculado || null,
      inventarioId: datos.inventarioId || null,
    };
    /* Guardar en Supabase — reemplaza ID temporal con UUID real */
    var agencyId = window.AUTOMIND && window.AUTOMIND.agencyId;
    if (agencyId && window.DB) {
      try {
        var guardado = await window.DB.saveCliente(agencyId, nuevo);
        nuevo = Object.assign({}, guardado, {
          vinVinculado: datos.vinVinculado || null,
          inventarioId: datos.inventarioId || null,
        });
      } catch(e) {
        console.error("[CRM] Error guardando cliente:", e);
        window.alert(
          "⚠️ Error al guardar el cliente en la base de datos:\n\n" +
          (e.message || String(e)) +
          "\n\nPosible causa: falta ejecutar las migraciones SQL en Supabase.\n" +
          "Corre el archivo supabase_crm_setup_completo.sql en Supabase → SQL Editor."
        );
        return; /* no agregar a la lista si no se guardó */
      }
    }
    setClientesData(prev => [nuevo, ...prev]);
    setMostrarNuevo(false);
    setPendingData(null);
    setSeleccionado(nuevo);
    setEditorSelId(nuevo.id);
    setVista("editor");
  }

  async function crearRecompra(clienteOrigen, unidad) {
    var hoy = new Date().toISOString().slice(0, 10);
    // Campos personales + documentos reutilizados; proceso limpio con el vehículo nuevo
    var nuevo = {
      id:           "c" + Date.now(),
      nombre:       clienteOrigen.nombre,
      tel:          clienteOrigen.tel          || "",
      email:        clienteOrigen.email        || "",
      tipo:         clienteOrigen.tipo         || "Persona física",
      rfc:          clienteOrigen.rfc          || "",
      curp:         clienteOrigen.curp         || "",
      fechaNac:     clienteOrigen.fechaNac     || "",
      sexo:         clienteOrigen.sexo         || "",
      direccion:    clienteOrigen.direccion    || "",
      colonia:      clienteOrigen.colonia      || "",
      ciudad:       clienteOrigen.ciudad       || "",
      estado:       clienteOrigen.estado       || "",
      cp:           clienteOrigen.cp           || "",
      // Documentos: reutilizar refs de storage existentes
      docId:        clienteOrigen.docId        || null,
      docLicencia:  clienteOrigen.docLicencia  || null,
      docDomicilio: clienteOrigen.docDomicilio || null,
      docRfc:       clienteOrigen.docRfc       || null,
      // Proceso fresco con el vehículo elegido
      etapa:        "Prospección",
      estadoGeneral:"activo",
      asesor:       clienteOrigen.asesor       || "Sin asignar",
      canal:        clienteOrigen.canal        || "",
      unidadId:     unidad.id,
      unidadDesc:   unidad.desc,
      precioLista:  unidad.precio             || 0,
      precioVenta:  unidad.precio             || 0,
      uc:           hoy,
      prox:         "Primer contacto",
      fprox:        hoy,
      notas:        "",
    };
    var agencyId = window.AUTOMIND && window.AUTOMIND.agencyId;
    if (agencyId && window.DB) {
      try {
        var guardado = await window.DB.saveCliente(agencyId, nuevo);
        nuevo = Object.assign({}, nuevo, guardado);
      } catch(e) {
        window.alert("Error al crear la recompra: " + (e.message || e));
        return;
      }
    }
    setClientesData(function(prev){ return [nuevo, ...prev]; });
    setRecompraCliente(null);
    setSeleccionado(nuevo);
    setEditorSelId(nuevo.id);
    setVista("editor");
  }

  async function onClienteUpdate(updated) {
    /* Actualizar estado local optimistamente */
    setClientesData(prev => prev.map(c => c.id === updated.id ? updated : c));
    /* Persistir en Supabase */
    var agencyId = window.AUTOMIND && window.AUTOMIND.agencyId;
    if (!agencyId || !window.DB) return;
    try {
      await window.DB.saveCliente(agencyId, updated);
    } catch(e) {
      console.error("[CRM] Error guardando cliente:", e);
      /* Revertir estado local */
      setClientesData(prev => prev.map(c => c.id === updated.id ? updated : c));
      window.alert("Error al guardar: " + (e.message || e));
    }
  }

  function onClienteDelete(id) {
    setClientesData(prev => prev.filter(c => c.id !== id));
    setEditorSelId(null);
    setVista("proceso");
  }

  const TabBtn = ({ id, label, badge }) => (
    <button onClick={() => setVista(id)} style={{
      padding:"6px 14px", borderRadius:7, fontSize:13, fontWeight:600, border:"none",
      cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all .15s",
      background: vista === id ? "var(--accent)" : "var(--card)",
      color:       vista === id ? "#fff"         : "var(--muted)",
      boxShadow:   vista === id ? "0 2px 8px rgba(47,111,237,.22)" : "none",
    }}>
      {label}
      {badge > 0 && (
        <span style={{ background: vista === id ? "rgba(255,255,255,.25)" : "#fee2e2",
          color: vista === id ? "#fff" : "#991b1b",
          fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20 }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ padding: vista === "editor" ? "24px 28px 0" : "24px 28px", maxWidth:1400, margin:"0 auto" }}>

      {/* Encabezado */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ margin:"0 0 3px", fontSize:22, fontWeight:800 }}>CRM de Clientes</h1>
          <p style={{ margin:0, color:"var(--muted)", fontSize:14 }}>
            Pipeline de ventas · <span style={{ color:"#8b5cf6", fontWeight:600 }}>Datos de ejemplo</span>
          </p>
        </div>
        <button className="btn primary" style={{ display:"flex", alignItems:"center", gap:7 }}
          onClick={() => setMostrarNuevo(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            strokeLinejoin="round" width="15" height="15"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo cliente
        </button>
      </div>

      {/* KPIs — solo en vistas secundarias */}
      {vista !== "editor" && <StatsBar clientes={clientesData} />}

      {/* Controles */}
      <div style={{ display:"flex", gap:10, marginBottom: vista === "editor" ? 12 : 16,
        alignItems:"center", flexWrap:"wrap" }}>
        {/* Tabs de vista */}
        <div style={{ display:"flex", gap:6, background:"var(--bg)", borderRadius:9, padding:4 }}>
          <TabBtn id="editor"   label="Editor" />
          <TabBtn id="kanban"   label="Kanban" />
          <TabBtn id="lista"    label="Lista" />
          <TabBtn id="proceso"  label="Proceso" />
          <TabBtn id="urgentes" label="Urgentes" badge={urgentesCount} />
        </div>

        {/* Búsqueda y filtro asesor — solo para vistas que no tienen buscador propio */}
        {vista !== "editor" && (
          <>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"var(--muted)" }}>
                  {I.search({ width:14, height:14 })}
                </span>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, vehículo, ciudad…"
                  style={{ width:"100%", padding:"7px 10px 7px 32px", border:"1px solid var(--line)",
                    borderRadius:7, fontSize:13, background:"var(--card)", color:"var(--ink)",
                    outline:"none", fontFamily:"inherit" }} />
              </div>
            </div>
            <select value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid var(--line)", borderRadius:7,
                fontSize:13, background:"var(--card)", color:"var(--ink)", fontFamily:"inherit",
                cursor:"pointer", outline:"none" }}>
              {asesores.map(a => <option key={a}>{a}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Contenido de la vista */}
      {vista === "editor"   && (
        <ClienteEditor
          clientes={clientesData}
          defaultSelId={editorSelId}
          onUpdate={onClienteUpdate}
          onDelete={onClienteDelete}
          usuarioActual={usuarioActual}
        />
      )}
      {vista === "kanban"   && <KanbanView   clientes={clientes} onOpen={function(c){ setEditorSelId(c.id); setVista("editor"); }} />}
      {vista === "lista"    && <ListaGrid    clientes={clientes} onOpen={function(c){ setEditorSelId(c.id); setVista("editor"); }} />}
      {vista === "proceso"  && <ProcesoView  clientes={clientes} onOpen={function(c){ setEditorSelId(c.id); setVista("editor"); }} onRecompra={function(c){ setRecompraCliente(c); }} />}
      {vista === "urgentes" && <UrgentesView clientes={clientes} onOpen={function(c){ setEditorSelId(c.id); setVista("editor"); }} />}

      {/* Estado cargando / vacío / error */}
      {cargando && (
        <div style={{ textAlign:"center", padding:"48px 0", color:"var(--muted)", fontSize:14 }}>
          Cargando clientes…
        </div>
      )}
      {!cargando && errorCrm && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"#fff5f5",
          border:"1px solid #fecaca", borderRadius:8, fontSize:13, color:"#991b1b" }}>
          {errorCrm}
        </div>
      )}
      {!cargando && !errorCrm && clientesData.length === 0 && (
        <div style={{ textAlign:"center", padding:"64px 20px", color:"var(--muted)" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>&#128101;</div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Sin clientes aún</div>
          <div style={{ fontSize:13 }}>Crea el primer cliente con el botón "Nuevo cliente".</div>
        </div>
      )}

      {/* Drawer de detalle */}
      <ClienteDrawer c={seleccionado} onClose={() => setSeleccionado(null)} />

      {/* Modal nuevo cliente (con prefill opcional desde Plan Piso) */}
      {mostrarNuevo && (
        <NuevoClienteModal
          asesores={asesores}
          clientes={clientesData}
          onClose={() => { setMostrarNuevo(false); setPendingData(null); }}
          onCreate={crearCliente}
          initialData={pendingData}
          onRecompra={function(c){
            setMostrarNuevo(false);
            setPendingData(null);
            setRecompraCliente(c);
          }}
        />
      )}

      {recompraCliente && (
        <RecompraModal
          cliente={recompraCliente}
          onConfirm={crearRecompra}
          onClose={function(){ setRecompraCliente(null); }}
        />
      )}
    </div>
  );
}

/* ── Vista standalone del dashboard de ventas ────────────────────────────── */
function VentasDashboardView({ onGoToCRM }) {
  var [clientesData, setClientesData] = React.useState([]);
  var [cargando,     setCargando]     = React.useState(false);

  React.useEffect(function() {
    var agencyId = window.AUTOMIND && window.AUTOMIND.agencyId;
    if (!agencyId || !window.DB) return;
    setCargando(true);
    window.DB.getClientes(agencyId)
      .then(function(lista) { setClientesData(lista || []); })
      .catch(function(e)    { console.error("[Dashboard] Error:", e); })
      .finally(function()   { setCargando(false); });
  }, []);

  if (cargando) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:300, color:"var(--muted)", fontSize:14 }}>Cargando dashboard…</div>
  );

  return (
    <DashboardVentas
      clientes={clientesData}
      onOpen={function(c) {
        if (window.AUTOMIND) window.AUTOMIND._pendingOpenCliente = c.id;
        if (onGoToCRM) onGoToCRM();
      }}
    />
  );
}

Object.assign(window, { CRMClientes, VentasDashboardView });


