/* Automind · componentes compartidos: iconos, sidebar, topbar, formatos, tokens */

const fmtMoney = (v, dec = 0) =>
  "$" + Number(v).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtNum = (v) => Number(v).toLocaleString("es-MX");
const fmtPct = (v, dec = 1) => (v * 100).toFixed(dec) + "%";

const SEM = {
  saludable:    { sol:"#1f9d57", txt:"#0f7a40", bg:"#e7f5ed", brd:"#bfe6cf", label:"Margen saludable",          emoji:"🟢" },
  rotacion:     { sol:"#d99613", txt:"#9a6a06", bg:"#fbf2da", brd:"#f0dca6", label:"Rotación media",            emoji:"🟡" },
  comprometido: { sol:"#e07a20", txt:"#9a4e06", bg:"#fdf0e6", brd:"#f5d0a0", label:"Margen comprometido",       emoji:"🟠" },
  vencer:       { sol:"#e0492f", txt:"#bb3018", bg:"#fcebe7", brd:"#f3c8bd", label:"Próximo a vencer",          emoji:"🔴" },
  intereses:    { sol:"#2d3142", txt:"#1a1f2e", bg:"#eaebef", brd:"#c8cad4", label:"En intereses",              emoji:"⚫" },
};

const ROL_CFG = {
  director: { label:"Director", bg:"#e7eefc", txt:"#1c4fcc", dot:"#2f6fed" },
  gerente:  { label:"Gerente",  bg:"#e7f5ed", txt:"#0f7a40", dot:"#1f9d57" },
  vendedor: { label:"Vendedor", bg:"#fbf2da", txt:"#9a6a06", dot:"#d99613" },
};

function RolBadge({ rol }) {
  const c = ROL_CFG[rol] || { label: rol, bg:"#eef1f6", txt:"#555", dot:"#aaa" };
  return (
    <span className="rol-badge" style={{ background:c.bg, color:c.txt }}>
      <span className="rol-dot" style={{ background:c.dot }} />{c.label}
    </span>
  );
}

/* ---------- Iconos (stroke 1.75, currentColor) ---------- */
const I = {
  truck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5.5 13.5L8 9h8l2.5 4.5" />
      <path d="M2 13.5h20v2.5H2z" />
      <circle cx="7.5" cy="17.8" r="1.7" />
      <circle cx="16.5" cy="17.8" r="1.7" />
    </svg>
  ),
  chart: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  sale: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 12l8.5-8.5a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.1a2 2 0 0 1-.6 1.4L12 21z" /><circle cx="16.5" cy="7.5" r="1.4" />
    </svg>
  ),
  gear: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  ),
  users: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.2 5.2 0 0 0-2.4-3.6" />
    </svg>
  ),
  grid: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="8" height="8" rx="1.2" /><rect x="13" y="3" width="8" height="8" rx="1.2" /><rect x="3" y="13" width="8" height="8" rx="1.2" /><rect x="13" y="13" width="8" height="8" rx="1.2" />
    </svg>
  ),
  table: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M3 14.5h18M9 9v11M15 9v11" />
    </svg>
  ),
  arrowUR: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  dots: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <circle cx="6" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18" cy="12" r="1.7" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </svg>
  ),
  coins: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </svg>
  ),
  fx: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 5s-1-1-2.5-1S9 5.5 8.8 7.5L7.5 19c-.2 1.6-1 2-2 2M6 10h7" />
      <path d="M15.5 11.5l4 5M19.5 11.5l-4 5" />
    </svg>
  ),
  filter: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 5h18l-7 8v6l-4-2v-4z" />
    </svg>
  ),
  back: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M11 6l-6 6 6 6M5 12h14" />
    </svg>
  ),
  person: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="3.8"/><path d="M4 20c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5"/>
    </svg>
  ),
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  contacts: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="12" cy="10" r="2.8"/>
      <path d="M6 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>
    </svg>
  ),
};

/* ---------- Sidebar ---------- */
function Sidebar({ view, setView, onMenu, tablaActiva, tenant, onLogout, onSwitchWorkspace, onSwitchToWorkspace, mobileOpen, onMobileClose, usuarioActual }) {
  const [open, setOpen] = React.useState(false);
  const [showAgSwitcher, setShowAgSwitcher] = React.useState(false);
  const act = (a) => { setOpen(false); onMenu && onMenu(a); onMobileClose && onMobileClose(); };
  const Item = ({ id, icon, label }) => {
    const active = view === id;
    return (
      <button className={"nav-item" + (active ? " active" : "")} onClick={() => { setView(id); onMobileClose && onMobileClose(); }}>
        <span className="nav-ico">{icon}</span>
        <span className="nav-lbl">{label}</span>
      </button>
    );
  };
  return (
    <>
      {mobileOpen && <div className="sidebar-scrim visible" onClick={onMobileClose} />}
      <aside className={"sidebar" + (mobileOpen ? " sidebar--open" : "")}>
      {/* Botón cerrar — solo visible en mobile */}
      <button className="sidebar-close-btn" onClick={onMobileClose} title="Cerrar menú">✕</button>
      <div className="brand-wrap">
        <button className={"brand" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
          <span className="brand-mark">{I.truck({ width: 26, height: 26 })}</span>
          <span className="brand-name">Automind</span>
          {I.chevron({ width: 16, height: 16, className: "brand-chev" })}
        </button>
        {open && (
          <>
            <div className="brand-scrim" onClick={() => setOpen(false)} />
            <div className="brand-menu">
              <button className="bm-row" onClick={() => act("editar")}>
                <span className="bm-ico2">{I.grid({ width: 17, height: 17 })}</span>
                <span className="bm-txt">Editar páginas</span>
                <span className="bm-kbd">ALT 1</span>
              </button>
              <button className="bm-row" onClick={() => act("datos")}>
                <span className="bm-ico2">{I.table({ width: 17, height: 17 })}</span>
                <span className="bm-txt">Ver datos</span>
                <span className="bm-kbd">ALT 2</span>
              </button>
              <div className="bm-sep" />
              <button className="bm-row" onClick={() => act("inicio")}>
                <span className="bm-ico2">{I.back({ width: 17, height: 17 })}</span>
                <span className="bm-txt">Volver al inicio</span>
                <span className="bm-kbd">ALT 0</span>
              </button>
            </div>
          </>
        )}
      </div>

      <nav className="nav">

        {/* ── Plan Piso ── */}
        <div className="nav-group" data-s="plan">
          <div className="nav-section">
            {I.grid({ width: 11, height: 11 })} Plan Piso
          </div>
          <button className={"nav-item" + (view === "dashboard" ? " active" : "")} onClick={() => setView("dashboard")}>
            <span className="nav-ico">{I.chart({ width: 17, height: 17 })}</span>
            <span className="nav-lbl">Dashboard</span>
          </button>
          <button className={"nav-item" + (["inventario","database"].includes(view) ? " active" : "")} onClick={() => setView("inventario")}>
            <span className="nav-ico">{I.truck({ width: 17, height: 17 })}</span>
            <span className="nav-lbl">Inventario</span>
          </button>
          <Item id="importar" icon={I.upload({ width: 17, height: 17 })} label="Importar inventario" />
          <Item id="alertas" icon={I.bell({ width: 17, height: 17 })} label="Alertas" />
        </div>

        {/* ── Ventas ── */}
        <div className="nav-group" data-s="ventas">
          <div className="nav-section">
            {I.arrowUR({ width: 11, height: 11 })} Ventas
          </div>
          <Item id="ventas" icon={I.sale({     width: 17, height: 17 })} label="Dashboard" />
          <Item id="crm"    icon={I.contacts({ width: 17, height: 17 })} label="Proceso de ventas" />
        </div>

        {/* ── Configuración ── */}
        <div className="nav-group">
          <div className="nav-section">
            {I.gear({ width: 11, height: 11 })} Configuración
          </div>
          <Item id="colaboradores" icon={I.users({ width: 17, height: 17 })} label="Equipo" />
        </div>

      </nav>

      <div className="side-foot">
        {tenant && tenant.isAgencyOwner && onSwitchWorkspace && (
          <button className="ws-switcher-btn" onClick={onSwitchWorkspace}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <rect x="2" y="3" width="9" height="9" rx="2"/><rect x="13" y="3" width="9" height="9" rx="2"/>
              <rect x="2" y="13" width="9" height="9" rx="2"/><rect x="13" y="13" width="9" height="9" rx="2"/>
            </svg>
            <span>Cambiar agencia</span>
          </button>
        )}
        {tenant && (
          <div style={{ position: "relative" }}>
            {/* Popup switcher de agencias */}
            {showAgSwitcher && (tenant.availableWorkspaces || []).length > 1 && (
              <>
                <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={() => setShowAgSwitcher(false)} />
                <div style={{
                  position:"absolute", bottom:"calc(100% + 8px)", left:0, right:0,
                  background:"var(--card)", borderRadius:12, border:"1px solid var(--line)",
                  boxShadow:"0 8px 32px rgba(0,0,0,.18)", zIndex:201, overflow:"hidden",
                  padding:"6px",
                }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--muted)",
                    textTransform:"uppercase", letterSpacing:".07em", padding:"4px 8px 6px" }}>
                    Mis agencias
                  </div>
                  {(tenant.availableWorkspaces || []).map(w => {
                    const esCurrent = w.id === tenant.id;
                    return (
                      <button key={w.id}
                        onClick={() => { setShowAgSwitcher(false); if (!esCurrent) onSwitchToWorkspace && onSwitchToWorkspace(w.id); }}
                        style={{
                          display:"flex", alignItems:"center", gap:10, width:"100%",
                          padding:"8px 10px", borderRadius:8, border:"none",
                          background: esCurrent ? "var(--bg)" : "transparent",
                          cursor: esCurrent ? "default" : "pointer", textAlign:"left",
                          transition:"background .12s",
                        }}
                        onMouseEnter={e => { if (!esCurrent) e.currentTarget.style.background = "var(--bg)"; }}
                        onMouseLeave={e => { if (!esCurrent) e.currentTarget.style.background = "transparent"; }}>
                        <span style={{
                          width:28, height:28, borderRadius:7, background:w.accent,
                          display:"grid", placeItems:"center", color:"#fff",
                          fontWeight:800, fontSize:11, flexShrink:0,
                          outline: esCurrent ? "2px solid var(--ink)" : "none",
                          outlineOffset:2,
                        }}>{w.iniciales}</span>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {w.nombre}
                          </div>
                          {w.ciudad && <div style={{ fontSize:10, color:"var(--muted)" }}>{w.ciudad}</div>}
                        </div>
                        {esCurrent && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" width="13" height="13"
                            style={{ color:"var(--accent)", flexShrink:0 }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* Badge de agencia actual */}
            <div className="tenant-badge"
              style={(tenant.availableWorkspaces || []).length > 1 ? { cursor:"pointer" } : {}}
              onClick={(tenant.availableWorkspaces || []).length > 1 ? () => setShowAgSwitcher(s => !s) : undefined}>
              <span className="tenant-av" style={{ background: tenant.accent }}>{tenant.iniciales}</span>
              <div className="tenant-meta">
                <div className="tenant-name">{tenant.nombre}</div>
                <div className="tenant-city">{tenant.ciudad || ((tenant.availableWorkspaces||[]).length > 1 ? "↕ Cambiar agencia" : "")}</div>
              </div>
              <button className="logout-btn" title="Cerrar sesión"
                onClick={e => { e.stopPropagation(); onLogout(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                  strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

/* ---------- TopBar ---------- */
function TopBar({ crumb }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <span className="crumb-muted">Plan Piso</span>
        {I.chevron({ width: 14, height: 14, className: "crumb-sep" })}
        <span className="crumb-now">{crumb}</span>
      </div>
      <button className="icon-btn ghost">{I.dots({ width: 20, height: 20 })}</button>
    </header>
  );
}

Object.assign(window, { fmtMoney, fmtNum, fmtPct, SEM, ROL_CFG, RolBadge, I, Sidebar, TopBar });
