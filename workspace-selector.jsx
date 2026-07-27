/* Automind · Selector de Workspace — estilo GHL
   Panel compacto con búsqueda para agency owners.
   Accesible al iniciar sesión y como switcher desde el sidebar. */

/* ── Panel de selección (dropdown) ─────────────────────────── */
function WorkspaceSelectorPanel({ agencyCtx, workspaces, loading, onSelect, onAgencyView, onClose }) {
  const [q, setQ] = React.useState("");
  const [entering, setEntering] = React.useState(null);
  const inputRef = React.useRef();

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const filtered = workspaces.filter(ws =>
    !q || ws.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (ws.ciudad || "").toLowerCase().includes(q.toLowerCase())
  );

  async function handleSelect(ws) {
    setEntering(ws.id);
    try {
      const data = await window.DB.loadAgencyData(ws.id);
      onSelect(ws, data);
    } catch(err) {
      alert("Error cargando agencia: " + err.message);
      setEntering(null);
    }
  }

  return (
    <>
      {onClose && <div className="ws-panel-scrim" onClick={onClose} />}
      <div className="ws-panel">
        {/* Buscador */}
        <div className="ws-panel-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ flexShrink:0, color:"var(--muted)" }}>
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <input
            ref={inputRef}
            placeholder="Buscar una agencia"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button className="ws-search-clear" onClick={() => setQ("")}>✕</button>
          )}
        </div>

        {/* Botón: Cambiar a vista de agencia */}
        {onAgencyView && (
          <button className="ws-panel-agency-btn" onClick={onAgencyView}>
            <span className="ws-agency-btn-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            Cambiar a la vista de agencia
          </button>
        )}

        {/* Lista */}
        <div className="ws-panel-label">TODAS LAS AGENCIAS</div>
        <div className="ws-panel-list">
          {loading && (
            <div style={{ padding:"20px", textAlign:"center" }}>
              <span className="login-spinner" style={{ width:20, height:20, borderWidth:2 }} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:"16px 18px", color:"var(--muted)", fontSize:13 }}>
              {q ? "Sin resultados para \"" + q + "\"" : "No hay agencias aún."}
            </div>
          )}
          {!loading && filtered.map(ws => (
            <button
              key={ws.id}
              className="ws-panel-item"
              onClick={() => handleSelect(ws)}
              disabled={!!entering}
            >
              <div className="ws-item-av" style={{ background: ws.accent || "#2f6fed" }}>
                {(ws.iniciales || ws.nombre.slice(0,1)).toUpperCase()}
              </div>
              <div className="ws-item-info">
                <div className="ws-item-nombre">{ws.nombre}</div>
                {ws.ciudad && <div className="ws-item-ciudad">{ws.ciudad}</div>}
              </div>
              {entering === ws.id
                ? <span className="login-spinner" style={{ width:16, height:16, borderWidth:2, marginLeft:"auto" }} />
                : <span className="ws-item-pin" title="Anclar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                      strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
                    </svg>
                  </span>
              }
            </button>
          ))}
        </div>

        {/* Footer: crear nueva */}
        <div className="ws-panel-footer">
          <button className="ws-panel-new" onClick={() => onSelect && onSelect("__new__", null)}>
            <span style={{ fontSize:18, lineHeight:1 }}>+</span>
            Crear nueva agencia
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Drawer para crear nueva agencia ─────────────────────── */
function NuevoWorkspaceDrawer({ agencyId, onSave, onClose }) {
  const [form, setForm] = React.useState({ nombre:"", ciudad:"", accent:"#2f6fed", sidebar:"#1b2a57" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const set = (k,v) => setForm(f => ({...f, [k]:v}));

  const ACCENTS  = ["#2f6fed","#1f9d57","#7a4ef0","#d9531e","#0f7a8c","#c0392b"];
  const SIDEBARS = ["#1b2a57","#15233f","#1e2530","#23304d","#2a1d52","#1a1a2e"];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre) { setError("El nombre es requerido."); return; }
    setLoading(true); setError("");
    try {
      if (!agencyId) throw new Error("Agency ID no disponible. Recarga e intenta de nuevo.");
      const ws = await window.DB.createWorkspace(agencyId, form);
      onSave(ws);
    } catch(err) {
      // Mostrar el error completo de Supabase para diagnosticar
      const msg = err?.message || err?.error_description || JSON.stringify(err) || "Error desconocido";
      setError(msg);
      console.error("Error createWorkspace:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="inv-drawer-scrim" onClick={onClose} />
      <aside className="inv-drawer">
        <div className="inv-drawer-head">
          <div>
            <h2>Nueva agencia</h2>
            <div style={{ fontSize:13, color:"var(--muted)", marginTop:2 }}>
              Agrega una agencia automotriz a tu plataforma
            </div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}>{I.close({ width:20, height:20 })}</button>
        </div>
        <div className="inv-drawer-body">
          <form id="ws-form" onSubmit={handleSubmit}>
            <div className="inv-field">
              <label>Nombre *</label>
              <input placeholder="Ej: Grupo Automotriz Vallarta"
                value={form.nombre} onChange={e => set("nombre", e.target.value)} disabled={loading} />
            </div>
            <div className="inv-field">
              <label>Ciudad</label>
              <input placeholder="Ej: Puerto Vallarta"
                value={form.ciudad} onChange={e => set("ciudad", e.target.value)} disabled={loading} />
            </div>
            <div className="inv-field">
              <label>Color de acento</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}>
                {ACCENTS.map(c => (
                  <button key={c} type="button"
                    style={{ width:32, height:32, borderRadius:8, background:c,
                      border: form.accent===c ? "3px solid var(--ink)" : "2px solid transparent", cursor:"pointer" }}
                    onClick={() => set("accent", c)} />
                ))}
              </div>
            </div>
            <div className="inv-field">
              <label>Color de barra lateral</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}>
                {SIDEBARS.map(c => (
                  <button key={c} type="button"
                    style={{ width:32, height:32, borderRadius:8, background:c,
                      border: form.sidebar===c ? "3px solid var(--ink)" : "2px solid transparent", cursor:"pointer" }}
                    onClick={() => set("sidebar", c)} />
                ))}
              </div>
            </div>
            {/* Preview */}
            <div style={{ background:"var(--bg)", borderRadius:10, padding:"14px 16px",
              display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:form.accent,
                display:"grid", placeItems:"center", color:"#fff", fontWeight:800, fontSize:14 }}>
                {(form.nombre||"??").slice(0,1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{form.nombre || "Nombre de la agencia"}</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>{form.ciudad || "Ciudad"}</div>
              </div>
            </div>
            {error && (
              <div className="login-error" style={{ marginBottom:12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
          </form>
        </div>
        <div className="inv-drawer-foot">
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn primary" form="ws-form" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
            {loading ? "Creando…" : "Crear agencia"}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Vista de agencia (pantalla completa post-login) ─────────── */
function WorkspaceSelector({ agencyCtx, onSelect }) {
  const [workspaces, setWorkspaces] = React.useState([]);
  const [loading,    setLoading]    = React.useState(true);
  const [showNew,    setShowNew]    = React.useState(false);

  React.useEffect(() => {
    window.DB.loadWorkspaces(agencyCtx.agencyId).then(wsList => {
      setWorkspaces(wsList);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [agencyCtx.agencyId]);

  function handlePanelSelect(ws, data) {
    if (ws === "__new__") { setShowNew(true); return; }
    onSelect(ws, data);
  }

  function handleNewWorkspace(ws) {
    setWorkspaces(prev => [...prev, ws]);
    setShowNew(false);
  }

  return (
    <div className="ws-fullpage">
      {/* Header */}
      <div className="ws-fp-header">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ display:"grid", placeItems:"center", width:36, height:36, borderRadius:10,
            background:"var(--accent)", color:"#fff" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/>
              <circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>
            </svg>
          </span>
          <span style={{ fontWeight:800, fontSize:18, color:"var(--ink)" }}>Automind</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span className="ws-agency-badge" style={{ fontSize:13, fontWeight:700, color:"var(--ink-2)",
            background:"var(--bg)", padding:"4px 12px", borderRadius:20, border:"1px solid var(--line)" }}>
            {agencyCtx.agency?.name || "Agencia"}
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:"#0f7a40", background:"#e7f5ed",
            padding:"3px 9px", borderRadius:20 }}>
            {agencyCtx.role === "agency_owner" ? "Propietario" : "Admin"}
          </span>
        </div>
      </div>

      {/* Panel centrado */}
      <div className="ws-fp-body">
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:800, margin:"0 0 6px", color:"var(--ink)" }}>
            Selecciona una agencia automotriz
          </h1>
          <p style={{ fontSize:15, color:"var(--muted)", margin:0 }}>
            Elige la agencia automotriz que quieres gestionar.
          </p>
        </div>

        <WorkspaceSelectorPanel
          agencyCtx={agencyCtx}
          workspaces={workspaces}
          loading={loading}
          onSelect={handlePanelSelect}
          onAgencyView={null}
        />
      </div>

      {showNew && (
        <NuevoWorkspaceDrawer
          agencyId={agencyCtx.agencyId}
          onSave={handleNewWorkspace}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

Object.assign(window, { WorkspaceSelector });
