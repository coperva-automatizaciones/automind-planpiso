/* Automind · Super Admin — Gestión global de agencias y agencias */

/* ── Drawer: nuevo agencia ────────────────────────────────────── */
function NuevaAgenciaDrawer({ onSave, onClose }) {
  const [form, setForm] = React.useState({
    nombre:"", razonSocial:"", rfc:"", marca:"",
    calle:"", colonia:"", municipio:"", cp:"", estado:"",
    repLegalNombre:"", repLegalEmail:"",
    ownerEmail:"", plan:"pro",
    accent:"#2f6fed", sidebar:"#1b2a57",
  });
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const ACCENTS  = ["#2f6fed","#1f9d57","#7a4ef0","#d9531e","#0f7a8c","#c0392b"];
  const SIDEBARS = ["#1b2a57","#15233f","#1e2530","#23304d","#2a1d52","#1a1a2e"];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre comercial es requerido."); return; }
    setLoading(true); setError("");
    try {
      const ag = await window.DB.createAgency(form);
      onSave(ag);
    } catch(err) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const IS = { width:"100%", boxSizing:"border-box", padding:"8px 10px",
    borderRadius:8, border:"1px solid var(--line)", background:"var(--card)",
    color:"var(--ink)", fontSize:13 };

  const SL = { fontSize:11, fontWeight:700, color:"var(--muted)", letterSpacing:".05em",
    textTransform:"uppercase", display:"block", marginBottom:4 };

  const SEC = { fontSize:11, fontWeight:800, color:"var(--muted)", letterSpacing:".08em",
    textTransform:"uppercase", padding:"14px 0 8px",
    borderBottom:"1px solid var(--line)", marginBottom:12 };

  return (
    <>
      <div className="inv-drawer-scrim" onClick={onClose} />
      <aside className="inv-drawer" style={{ width:480 }}>
        <div className="inv-drawer-head">
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Nueva agencia</h2>
            <div style={{ fontSize:13, color:"var(--muted)", marginTop:2 }}>
              Registro de agencia automotriz en la plataforma
            </div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="inv-drawer-body">
          <form id="sa-form" onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* ── Datos legales ── */}
            <div style={SEC}>Datos legales</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={SL}>Razón social</label>
                <input style={IS} value={form.razonSocial}
                  onChange={e => set("razonSocial", e.target.value)}
                  placeholder="Ej: Grupo Automotriz Vallarta S.A. de C.V." disabled={loading} />
              </div>
              <div>
                <label style={SL}>RFC</label>
                <input style={IS} value={form.rfc}
                  onChange={e => set("rfc", e.target.value.toUpperCase())}
                  placeholder="GAV123456ABC" disabled={loading}
                  maxLength={13} style={{ ...IS, textTransform:"uppercase", letterSpacing:".05em" }} />
              </div>
              <div>
                <label style={SL}>Nombre comercial *</label>
                <input style={IS} value={form.nombre}
                  onChange={e => set("nombre", e.target.value)}
                  placeholder="Ej: Agencia Vallarta" disabled={loading} required />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={SL}>Marca</label>
                <input style={IS} value={form.marca}
                  onChange={e => set("marca", e.target.value)}
                  placeholder="Ej: Chevrolet, Toyota, Ford…" disabled={loading} />
              </div>
            </div>

            {/* ── Dirección ── */}
            <div style={SEC}>Dirección</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={SL}>Calle y número</label>
                <input style={IS} value={form.calle}
                  onChange={e => set("calle", e.target.value)}
                  placeholder="Ej: Av. Francisco Villa 1234" disabled={loading} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={SL}>Colonia</label>
                <input style={IS} value={form.colonia}
                  onChange={e => set("colonia", e.target.value)}
                  placeholder="Ej: Col. Centro" disabled={loading} />
              </div>
              <div>
                <label style={SL}>Municipio / Ciudad</label>
                <input style={IS} value={form.municipio}
                  onChange={e => { set("municipio", e.target.value); set("ciudad", e.target.value); }}
                  placeholder="Ej: Puerto Vallarta" disabled={loading} />
              </div>
              <div>
                <label style={SL}>C.P.</label>
                <input style={IS} value={form.cp}
                  onChange={e => set("cp", e.target.value)}
                  placeholder="48300" disabled={loading} maxLength={5} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={SL}>Estado</label>
                <select style={IS} value={form.estado}
                  onChange={e => set("estado", e.target.value)} disabled={loading}>
                  <option value="">— Selecciona estado —</option>
                  {["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
                    "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Guanajuato",
                    "Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit",
                    "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
                    "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"
                  ].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* ── Representante legal ── */}
            <div style={SEC}>Representante legal</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={SL}>Nombre</label>
                <input style={IS} value={form.repLegalNombre}
                  onChange={e => set("repLegalNombre", e.target.value)}
                  placeholder="Nombre completo" disabled={loading} />
              </div>
              <div>
                <label style={SL}>Correo</label>
                <input type="email" style={IS} value={form.repLegalEmail}
                  onChange={e => set("repLegalEmail", e.target.value)}
                  placeholder="rep@agencia.com" disabled={loading} />
              </div>
            </div>

            {/* ── Cuenta / Acceso ── */}
            <div style={SEC}>Cuenta en la plataforma</div>

            <div>
              <label style={SL}>Email del owner (acceso)</label>
              <input type="email" style={IS} value={form.ownerEmail}
                onChange={e => set("ownerEmail", e.target.value)}
                placeholder="owner@agencia.com" disabled={loading} />
            </div>

            <div>
              <label style={{ ...SL, marginBottom:8 }}>Color de acento</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {ACCENTS.map(c => (
                  <button key={c} type="button"
                    style={{ width:30, height:30, borderRadius:7, background:c, cursor:"pointer",
                      border: form.accent === c ? "3px solid var(--ink)" : "2px solid transparent" }}
                    onClick={() => set("accent", c)} />
                ))}
              </div>
            </div>

            <div>
              <label style={{ ...SL, marginBottom:8 }}>Color de barra lateral</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {SIDEBARS.map(c => (
                  <button key={c} type="button"
                    style={{ width:30, height:30, borderRadius:7, background:c, cursor:"pointer",
                      border: form.sidebar === c ? "3px solid var(--ink)" : "2px solid transparent" }}
                    onClick={() => set("sidebar", c)} />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ background:"var(--bg)", borderRadius:10, padding:"12px 14px",
              display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:form.accent,
                display:"grid", placeItems:"center", color:"#fff", fontWeight:800, fontSize:15, flexShrink:0 }}>
                {(form.nombre || "??").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"var(--ink)" }}>
                  {form.nombre || "Nombre comercial"}
                </div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>
                  {[form.marca, form.municipio, form.estado].filter(Boolean).join(" · ") || "Marca · Ciudad · Estado"}
                </div>
                {form.rfc && (
                  <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"monospace", letterSpacing:".03em" }}>
                    RFC: {form.rfc}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,.08)",
                border:"1px solid rgba(239,68,68,.25)", color:"#dc2626", fontSize:13 }}>
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="inv-drawer-foot">
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn primary" form="sa-form" type="submit" disabled={loading}>
            {loading && <span className="login-spinner" style={{ width:13, height:13, borderWidth:2 }} />}
            {loading ? "Creando…" : "Crear agencia"}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Modal: workspaces de una agencia ───────────────────────── */
function AgenciaWorkspacesModal({ agencia, onEntrar, onClose }) {
  const [workspaces, setWorkspaces] = React.useState(agencia.workspaces || []);
  const [loading,    setLoading]    = React.useState(false);
  const [entrando,   setEntrando]   = React.useState(null);

  async function entrar(ws) {
    setEntrando(ws.id);
    try {
      const data = await window.DB.loadAgencyData(ws.id);
      onEntrar(ws, data);
    } catch(err) {
      alert("Error al entrar: " + err.message);
      setEntrando(null);
    }
  }

  return (
    <>
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1200,
        display:"flex", alignItems:"center", justifyContent:"center",
      }} onClick={onClose}>
        <div style={{
          background:"var(--card)", borderRadius:16, padding:"28px 28px 24px",
          width:440, maxWidth:"92vw", boxShadow:"0 20px 60px rgba(0,0,0,.25)",
          zIndex:1201,
        }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:agencia.accent,
              display:"grid", placeItems:"center", color:"#fff", fontWeight:800, fontSize:15, flexShrink:0 }}>
              {agencia.iniciales}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:"var(--ink)" }}>{agencia.nombre}</div>
              {agencia.ciudad && <div style={{ fontSize:12, color:"var(--muted)" }}>{agencia.ciudad}</div>}
            </div>
            <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none",
              cursor:"pointer", color:"var(--muted)", fontSize:20, lineHeight:1 }}>✕</button>
          </div>

          {/* Lista de workspaces */}
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
            textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>
            Agencias ({workspaces.length})
          </div>

          {workspaces.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"var(--muted)", fontSize:14 }}>
              Sin agencias configuradas
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" }}>
              {workspaces.map(ws => (
                <button key={ws.id}
                  onClick={() => entrar(ws)}
                  disabled={!!entrando}
                  style={{
                    display:"flex", alignItems:"center", gap:12, padding:"11px 14px",
                    borderRadius:10, border:"1px solid var(--line)", background:"var(--bg)",
                    cursor:"pointer", textAlign:"left", transition:"all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = agencia.accent; e.currentTarget.style.background = agencia.accent + "0d"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--bg)"; }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:agencia.accent,
                    display:"grid", placeItems:"center", color:"#fff", fontWeight:800, fontSize:12, flexShrink:0 }}>
                    {(ws.iniciales || ws.nombre.slice(0,2)).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"var(--ink)" }}>{ws.nombre}</div>
                    {ws.ciudad && <div style={{ fontSize:11, color:"var(--muted)" }}>{ws.ciudad}</div>}
                  </div>
                  {entrando === ws.id
                    ? <span className="login-spinner" style={{ width:16, height:16, borderWidth:2 }} />
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
                        style={{ color:"var(--muted)", flexShrink:0 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Panel: Historial de auditoría ───────────────────────────── */
function HistorialPanel({ onClose }) {
  const [logs,     setLogs]     = React.useState([]);
  const [cargando, setCargando] = React.useState(true);

  React.useEffect(() => {
    window.DB.loadAuditLog(200)
      .then(setLogs)
      .catch(e => console.warn("Error cargando historial:", e.message))
      .finally(() => setCargando(false));
  }, []);

  const ETIQUETA = {
    login:               { label: "Login",             color: "#6b7280" },
    entrar_workspace:    { label: "Entró a workspace", color: "#2f6fed" },
    crear_agencia:       { label: "Creó agencia",      color: "#1f9d57" },
    eliminar_workspace:  { label: "Eliminó workspace", color: "#d9531e" },
    eliminar_agencia:    { label: "Eliminó agencia",   color: "#c0392b" },
  };

  function fmtFecha(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:200 }}
      />
      <aside style={{
        position:"fixed", top:0, right:0, bottom:0, width:560,
        background:"var(--card)", zIndex:201, display:"flex", flexDirection:"column",
        boxShadow:"-4px 0 24px rgba(0,0,0,.18)",
      }}>
        {/* Cabecera */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"20px 24px", borderBottom:"1px solid var(--line)",
        }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>Historial de auditoría</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
              Últimas 200 acciones de super admins
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", padding:4 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {cargando ? (
            <div style={{ textAlign:"center", color:"var(--muted)", paddingTop:40 }}>Cargando…</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign:"center", color:"var(--muted)", paddingTop:40 }}>
              Sin registros aún
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ color:"var(--muted)", textAlign:"left" }}>
                  <th style={{ padding:"6px 8px", fontWeight:600 }}>Fecha</th>
                  <th style={{ padding:"6px 8px", fontWeight:600 }}>Admin</th>
                  <th style={{ padding:"6px 8px", fontWeight:600 }}>Acción</th>
                  <th style={{ padding:"6px 8px", fontWeight:600 }}>Objetivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const et = ETIQUETA[log.accion] || { label: log.accion, color:"#6b7280" };
                  return (
                    <tr key={log.id} style={{ borderTop:"1px solid var(--line)" }}>
                      <td style={{ padding:"8px", color:"var(--muted)", whiteSpace:"nowrap" }}>
                        {fmtFecha(log.created_at)}
                      </td>
                      <td style={{ padding:"8px", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {log.super_admin_email}
                      </td>
                      <td style={{ padding:"8px", whiteSpace:"nowrap" }}>
                        <span style={{
                          background: et.color + "18", color: et.color,
                          fontSize:11, fontWeight:700, padding:"2px 8px",
                          borderRadius:20, whiteSpace:"nowrap",
                        }}>
                          {et.label}
                        </span>
                      </td>
                      <td style={{ padding:"8px", color:"var(--muted)", maxWidth:160,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {log.target_nombre || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── Vista principal del Super Admin ────────────────────────── */
function SuperAdminView({ userCtx, onEntrarWorkspace, onLogout }) {
  const [agencias,     setAgencias]     = React.useState([]);
  const [cargando,     setCargando]     = React.useState(true);
  const [showNueva,    setShowNueva]    = React.useState(false);
  const [showHistorial,setShowHistorial]= React.useState(false);
  const [confirmDel,   setConfirmDel]   = React.useState(null);
  const [borrando,     setBorrando]     = React.useState(null);
  const [entrando,     setEntrando]     = React.useState(null);
  const [busqueda,     setBusqueda]     = React.useState("");
  const [confirmText,  setConfirmText]  = React.useState("");

  React.useEffect(() => {
    // Cargar todos los workspaces (tenants) de todas las agencias en plano
    window.DB.loadAllWorkspaces()
      .then(setAgencias)
      .catch(e => alert("Error cargando agencias: " + e.message))
      .finally(() => setCargando(false));
    // Log de sesión iniciada
    window.DB.logSuperAdminAction("login", null, null);
  }, []);

  async function eliminarAgencia(ag) {
    setBorrando(ag.id);
    try {
      // Eliminar el workspace; si era el único de su agencia padre, la elimina también
      await window.DB.deleteWorkspace(ag.id, ag.agencyId);
      setAgencias(prev => prev.filter(a => a.id !== ag.id));
    } catch(err) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setBorrando(null);
      setConfirmDel(null);
      setConfirmText("");
    }
  }

  async function entrar(ag) {
    setEntrando(ag.id);
    try {
      const data = await window.DB.loadAgencyData(ag.id);
      // Auditoría: registrar qué workspace entró
      window.DB.logSuperAdminAction("entrar_workspace", ag.id, ag.nombre);
      onEntrarWorkspace(ag, data, { id: ag.agencyId });
    } catch(err) {
      alert("Error al entrar: " + err.message);
      setEntrando(null);
    }
  }

  const filtradas = agencias.filter(a => {
    const q = busqueda.toLowerCase();
    return !q || a.nombre.toLowerCase().includes(q) || (a.ciudad || "").toLowerCase().includes(q);
  });

  return (
    <div style={{
      minHeight:"100vh", background:"var(--bg)",
      fontFamily:"Segoe UI Variable, Segoe UI, system-ui, sans-serif",
    }}>

      {/* Barra superior */}
      <div style={{
        height:56, background:"var(--card)", borderBottom:"1px solid var(--line)",
        display:"flex", alignItems:"center", padding:"0 28px", gap:16,
        position:"sticky", top:0, zIndex:100,
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#2f6fed",
            display:"grid", placeItems:"center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/>
              <circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>
            </svg>
          </div>
          <span style={{ fontWeight:800, fontSize:16, color:"var(--ink)" }}>Automind</span>
        </div>

        {/* Badge Super Admin */}
        <span style={{
          padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
          background:"rgba(239,68,68,.12)", color:"#dc2626", border:"1px solid rgba(239,68,68,.25)",
        }}>
          ⚡ Super Admin
        </span>

        <div style={{ flex:1 }} />

        {/* Email */}
        <span style={{ fontSize:13, color:"var(--muted)" }}>{userCtx.email}</span>

        {/* Historial */}
        <button onClick={() => setShowHistorial(true)} style={{
          padding:"6px 14px", borderRadius:8, border:"1px solid var(--line)",
          background:"var(--bg)", color:"var(--muted)", fontSize:13, fontWeight:600,
          cursor:"pointer", display:"flex", alignItems:"center", gap:6,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--ink)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--muted)"; }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Historial
        </button>

        {/* Cerrar sesión */}
        <button onClick={onLogout} style={{
          padding:"6px 14px", borderRadius:8, border:"1px solid var(--line)",
          background:"var(--bg)", color:"var(--muted)", fontSize:13, fontWeight:600,
          cursor:"pointer", transition:"all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fca5a5"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
          Cerrar sesión
        </button>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 28px" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
          <div>
            <h1 style={{ margin:"0 0 4px", fontSize:24, fontWeight:800, color:"var(--ink)" }}>
              Gestión de agencias
            </h1>
            <p style={{ margin:0, fontSize:14, color:"var(--muted)" }}>
              {agencias.length} agencia{agencias.length !== 1 ? "s" : ""} registrada{agencias.length !== 1 ? "s" : ""} en la plataforma
            </p>
          </div>
          <button onClick={() => setShowNueva(true)} style={{
            display:"flex", alignItems:"center", gap:8, padding:"9px 18px",
            borderRadius:10, background:"#2f6fed", color:"#fff", border:"none",
            fontWeight:700, fontSize:14, cursor:"pointer",
            boxShadow:"0 2px 8px rgba(47,111,237,.3)", transition:"opacity .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = ".88"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
            <span style={{ fontSize:18, lineHeight:1 }}>+</span>
            Nueva agencia
          </button>
        </div>

        {/* Buscador */}
        <div style={{ position:"relative", marginBottom:24, maxWidth:360 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" width="15" height="15"
            style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }}>
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar agencia..."
            style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px 9px 34px",
              borderRadius:10, border:"1px solid var(--line)", background:"var(--card)",
              color:"var(--ink)", fontSize:13 }}
          />
        </div>

        {/* Estado cargando */}
        {cargando && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <span className="login-spinner" style={{ width:28, height:28, borderWidth:3 }} />
          </div>
        )}

        {/* Grid de agencias */}
        {!cargando && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
            {filtradas.length === 0 ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 0",
                color:"var(--muted)", fontSize:15 }}>
                {busqueda ? `Sin resultados para "${busqueda}"` : "No hay agencias registradas."}
              </div>
            ) : filtradas.map(ag => (
              <div key={ag.id} style={{
                background:"var(--card)", borderRadius:14, border:"1px solid var(--line)",
                overflow:"hidden", display:"flex", flexDirection:"column",
                transition:"box-shadow .15s, transform .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>

                {/* Franja de color */}
                <div style={{ height:5, background:ag.accent }} />

                {/* Cuerpo */}
                <div style={{ padding:"18px 20px", flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:ag.accent,
                      display:"grid", placeItems:"center", color:"#fff", fontWeight:800, fontSize:16, flexShrink:0 }}>
                      {ag.iniciales}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:"var(--ink)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {ag.nombre}
                      </div>
                      {ag.ciudad && (
                        <div style={{ fontSize:12, color:"var(--muted)" }}>{ag.ciudad}</div>
                      )}
                    </div>
                  </div>

                  {/* Datos legales / contacto */}
                  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:12, fontSize:12 }}>
                    {ag.razonSocial && (
                      <div style={{ color:"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <span style={{ fontWeight:600, color:"var(--ink)" }}>RS: </span>{ag.razonSocial}
                      </div>
                    )}
                    {ag.rfc && (
                      <div style={{ color:"var(--muted)", fontFamily:"monospace", fontSize:11, letterSpacing:".03em" }}>
                        RFC: {ag.rfc}
                      </div>
                    )}
                    {ag.marca && (
                      <div style={{ color:"var(--muted)" }}>
                        <span style={{ fontWeight:600, color:"var(--ink)" }}>Marca: </span>{ag.marca}
                      </div>
                    )}
                    {(ag.municipio || ag.estado) && (
                      <div style={{ color:"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        📍 {[ag.municipio, ag.estado].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {ag.repLegalNombre && (
                      <div style={{ color:"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <span style={{ fontWeight:600, color:"var(--ink)" }}>Rep. legal: </span>{ag.repLegalNombre}
                      </div>
                    )}
                    {ag.ownerEmail && (
                      <div style={{ color:"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <span style={{ fontWeight:600, color:"var(--ink)" }}>Owner: </span>{ag.ownerEmail}
                      </div>
                    )}
                  </div>

                  {/* Plan badge */}
                  <span style={{
                    display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:11,
                    fontWeight:700, background:"rgba(47,111,237,.10)", color:"#2f6fed",
                  }}>
                    {(ag.plan || "pro").toUpperCase()}
                  </span>
                </div>

                {/* Acciones */}
                <div style={{ borderTop:"1px solid var(--line)", padding:"12px 20px",
                  display:"flex", gap:8 }}>
                  <button
                    onClick={() => entrar(ag)}
                    disabled={!!entrando}
                    style={{
                      flex:1, padding:"8px 0", borderRadius:8, border:"1px solid var(--line)",
                      background:"var(--bg)", color:"var(--ink)", fontSize:13, fontWeight:600,
                      cursor:"pointer", transition:"all .15s",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ag.accent; e.currentTarget.style.color = ag.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}>
                    {entrando === ag.id
                      ? <span className="login-spinner" style={{ width:13, height:13, borderWidth:2 }} />
                      : "Entrar"}
                  </button>
                  <button
                    onClick={() => setConfirmDel(ag)}
                    disabled={borrando === ag.id}
                    style={{
                      padding:"8px 14px", borderRadius:8, border:"1px solid var(--line)",
                      background:"var(--bg)", color:"var(--muted)", fontSize:13,
                      cursor:"pointer", transition:"all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
                    {borrando === ag.id
                      ? <span className="login-spinner" style={{ width:13, height:13, borderWidth:2 }} />
                      : "Eliminar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer: nueva agencia */}
      {showNueva && (
        <NuevaAgenciaDrawer
          onSave={ag => {
            setAgencias(prev => [...prev, { ...ag, iniciales: ag.iniciales || ag.nombre.slice(0,2).toUpperCase(), accent: ag.accent || "#2f6fed" }]);
            setShowNueva(false);
          }}
          onClose={() => setShowNueva(false)}
        />
      )}

      {/* Confirmación de borrado */}
      {confirmDel && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1400,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:"var(--card)", borderRadius:16, padding:"28px 32px",
            width:400, maxWidth:"90vw", boxShadow:"0 20px 60px rgba(0,0,0,.3)",
          }}>
            <div style={{ fontSize:28, textAlign:"center", marginBottom:12 }}>⚠️</div>
            <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800,
              textAlign:"center", color:"var(--ink)" }}>
              ¿Eliminar agencia?
            </h3>
            <p style={{ margin:"0 0 16px", fontSize:14, color:"var(--muted)",
              textAlign:"center", lineHeight:1.5 }}>
              Se eliminará <strong style={{ color:"var(--ink)" }}>{confirmDel.nombre}</strong>{" "}
              junto con todo su inventario, usuarios y configuración.
              Esta acción <strong style={{ color:"#dc2626" }}>no se puede deshacer</strong>.
            </p>

            {/* Campo de confirmación */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700,
                color:"var(--muted)", marginBottom:6, textAlign:"center" }}>
                Escribe <span style={{ color:"#dc2626", fontFamily:"monospace", fontWeight:800 }}>BORRAR</span> para confirmar
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="BORRAR"
                autoFocus
                style={{
                  width:"100%", boxSizing:"border-box", padding:"9px 12px",
                  borderRadius:9, fontSize:14, fontWeight:700, textAlign:"center",
                  border: confirmText === "BORRAR"
                    ? "2px solid #dc2626"
                    : "1px solid var(--line)",
                  background:"var(--bg)", color:"var(--ink)", letterSpacing:".05em",
                  outline:"none",
                }}
              />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setConfirmDel(null); setConfirmText(""); }} style={{
                flex:1, padding:"10px 0", borderRadius:9, border:"1px solid var(--line)",
                background:"var(--bg)", color:"var(--ink)", fontWeight:600,
                fontSize:14, cursor:"pointer",
              }}>
                Cancelar
              </button>
              <button
                onClick={() => eliminarAgencia(confirmDel)}
                disabled={!!borrando || confirmText !== "BORRAR"}
                style={{
                  flex:1, padding:"10px 0", borderRadius:9, border:"none",
                  background: confirmText === "BORRAR" ? "#dc2626" : "var(--line)",
                  color: confirmText === "BORRAR" ? "#fff" : "var(--muted)",
                  fontWeight:700, fontSize:14,
                  cursor: confirmText === "BORRAR" ? "pointer" : "not-allowed",
                  transition:"all .2s",
                }}>
                {borrando ? "Eliminando…" : "Eliminar agencia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Historial de auditoría */}
      {showHistorial && (
        <HistorialPanel onClose={() => setShowHistorial(false)} />
      )}
    </div>
  );
}

Object.assign(window, { SuperAdminView });
