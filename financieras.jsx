/* Automind · Módulo de Financieras
   Gestión completa de financieras por agencia: crear, editar, desactivar.
   Solo accesible para directores. */

/* ── Drawer crear / editar ──────────────────────────────────────────────── */
function FinancieraDrawer({ fin, agencyId, onSave, onClose }) {
  const esEdicion = !!fin && !!fin.id;
  const [form, setForm] = React.useState(fin || {
    nombre: "", tasa: 0.14, plazoDias: 90, diasGraciaExtra: 0, logoUrl: "", activa: true,
  });
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState("");
  const [saved,   setSaved]   = React.useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const diasTotal = Number(form.plazoDias||0) + Number(form.diasGraciaExtra||0);
  const interesEjemplo = fmtMoney(500000 * Number(form.tasa||0) / 365, 2);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre) { setError("El nombre es requerido."); return; }
    if (!form.tasa || form.tasa <= 0) { setError("La tasa debe ser mayor a 0."); return; }
    setLoading(true); setError("");
    try {
      const saved = await window.DB.saveFinanciera(agencyId, form);
      const mapped = window.DB.financieraFromDbRow(saved);
      // Actualizar AUTOMIND
      if (window.AUTOMIND) {
        const idx = window.AUTOMIND.FINANCIERAS.findIndex(f => f.id === mapped.id);
        if (idx >= 0) window.AUTOMIND.FINANCIERAS[idx] = mapped;
        else window.AUTOMIND.FINANCIERAS.push(mapped);
      }
      setSaved(true);
      onSave && onSave(mapped);
      setTimeout(() => { setSaved(false); onClose(); }, 1500);
    } catch(err) {
      setError(err.message || "Error al guardar.");
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
            <h2>{esEdicion ? "Editar financiera" : "Nueva financiera"}</h2>
            <div style={{ fontSize:13, color:"var(--muted)", marginTop:2 }}>
              {esEdicion ? form.nombre : "Agrega una nueva fuente de financiamiento"}
            </div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}>{I.close({ width:20, height:20 })}</button>
        </div>

        <div className="inv-drawer-body">
          <form id="fin-form" onSubmit={handleSubmit}>

            {/* Nombre */}
            <div className="inv-field">
              <label>Nombre de la financiera *</label>
              <input placeholder="Ej: Coperva, BBVA, Banorte…"
                value={form.nombre} onChange={e => set("nombre", e.target.value)}
                disabled={loading} />
            </div>

            {/* Tasa */}
            <div className="inv-field">
              <label>Tasa anual (%) *</label>
              <div style={{ position:"relative" }}>
                <input type="number" step="0.01" min="0" max="100" placeholder="14.00"
                  style={{ paddingRight:30 }}
                  value={(Number(form.tasa||0)*100).toFixed(2)}
                  onChange={e => set("tasa", Number(e.target.value)/100)}
                  disabled={loading} />
                <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  fontSize:14, color:"var(--muted)", pointerEvents:"none" }}>%</span>
              </div>
            </div>

            {/* Plazo */}
            <div className="inv-field">
              <label>Días de gracia base</label>
              <input type="number" min="0" placeholder="90"
                value={form.plazoDias}
                onChange={e => set("plazoDias", Number(e.target.value))}
                disabled={loading} />
            </div>

            {/* Días extra */}
            <div className="inv-field">
              <label>Días de gracia extra</label>
              <input type="number" min="0" placeholder="0"
                value={form.diasGraciaExtra}
                onChange={e => set("diasGraciaExtra", Number(e.target.value))}
                disabled={loading} />
            </div>

            {/* Vista previa de condiciones */}
            <div className="inv-derived" style={{ marginBottom:18 }}>
              <div style={{ fontSize:11.5, fontWeight:800, textTransform:"uppercase", letterSpacing:".05em",
                color:"var(--muted)", marginBottom:8 }}>Vista previa</div>
              <div className="inv-derived-row">
                <span className="inv-derived-lbl">Gracia total</span>
                <span className="inv-derived-val">{diasTotal} días</span>
              </div>
              <div className="inv-derived-row">
                <span className="inv-derived-lbl">Interés diario</span>
                <span className="inv-derived-val" style={{ color:"var(--muted)" }}>
                  {interesEjemplo}/día sobre $500,000
                </span>
              </div>
              <div className="inv-derived-row">
                <span className="inv-derived-lbl">Tasa anual</span>
                <span className="inv-derived-val">{fmtPct(form.tasa||0, 2)}</span>
              </div>
            </div>

            {/* Activa */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <input type="checkbox" id="fin-activa" checked={!!form.activa}
                onChange={e => set("activa", e.target.checked)} disabled={loading}
                style={{ width:16, height:16, accentColor:"var(--accent)" }} />
              <label htmlFor="fin-activa" style={{ fontSize:14, fontWeight:600, cursor:"pointer" }}>
                Financiera activa (visible al capturar inventario)
              </label>
            </div>

            {error && (
              <div className="login-error" style={{ marginBottom:12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
            {saved && (
              <div style={{ background:"#e7f5ed", color:"#0f7a40", borderRadius:9,
                padding:"10px 14px", fontSize:13, fontWeight:700, marginBottom:12 }}>
                ✓ {esEdicion ? "Cambios guardados" : "Financiera creada"}
              </div>
            )}
          </form>
        </div>

        <div className="inv-drawer-foot">
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn primary" form="fin-form" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
            {loading ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear financiera"}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Card de financiera ──────────────────────────────────────────────────── */
function FinancieraCard({ fin, onEdit, onToggle }) {
  const diasTotal = fin.plazoDias + fin.diasGraciaExtra;
  return (
    <div className={"fin-card" + (fin.activa ? "" : " inactiva")}>
      <div className="fin-card-top">
        <div className="fin-logo-wrap">
          {fin.logoUrl
            ? <img src={fin.logoUrl} alt={fin.nombre} className="fin-logo-img" />
            : <div className="fin-logo-ph">{fin.nombre.slice(0,2).toUpperCase()}</div>
          }
        </div>
        <div className="fin-card-info">
          <div className="fin-card-nombre">{fin.nombre}</div>
          <div className="fin-card-tasa">{fmtPct(fin.tasa, 2)} anual</div>
        </div>
        <div className="fin-card-menu">
          {onEdit && <button className="icon-btn ghost" onClick={() => onEdit(fin)} title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>}
        </div>
      </div>
      <div className="fin-card-stats">
        <div className="fin-stat">
          <span className="fin-stat-lbl">Gracia base</span>
          <span className="fin-stat-val">{fin.plazoDias} días</span>
        </div>
        <div className="fin-stat">
          <span className="fin-stat-lbl">Días extra</span>
          <span className="fin-stat-val">{fin.diasGraciaExtra} días</span>
        </div>
        <div className="fin-stat">
          <span className="fin-stat-lbl">Total gracia</span>
          <span className="fin-stat-val" style={{ fontWeight:800, color:"var(--accent)" }}>
            {diasTotal} días
          </span>
        </div>
      </div>
      <div className="fin-card-foot">
        <span className={"fin-badge" + (fin.activa ? " activa" : " inactiva")}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"currentColor",
            display:"inline-block", marginRight:5 }} />
          {fin.activa ? "Activa" : "Inactiva"}
        </span>
        {onToggle && (
          <button className="fin-toggle" onClick={() => onToggle(fin)}>
            {fin.activa ? "Desactivar" : "Activar"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Vista principal ─────────────────────────────────────────────────────── */
function GestionFinancieras({ usuarioActual, isAgencyOwner }) {
  // Financieras pertenecen a la AGENCIA (Coperva), no al workspace
  // Solo agency_owner puede gestionar financieras globales — los directores
  // de workspace las ven en modo lectura (la RLS de financieras_v2 los bloquearía
  // de todos modos y verían errores confusos al intentar guardar)
  const agencyId = window.AUTOMIND
    ? (window.AUTOMIND.agencyParentId || window.AUTOMIND.agencyId)
    : null;
  const puedeGestionar = !!isAgencyOwner
    || usuarioActual?.id === "agency-owner";
  const [financieras, setFinancieras] = React.useState(
    window.AUTOMIND ? (window.AUTOMIND.FINANCIERAS || []) : []
  );
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState(null);
  const [loading,    setLoading]    = React.useState(false);

  // Recargar desde DB para tener también las inactivas
  React.useEffect(() => {
    if (!agencyId || !window.DB) return;
    window.DB.loadFinancieras(agencyId).then(rows => {
      const mapped = rows.map(r => window.DB.financieraFromDbRow(r));
      setFinancieras(mapped);
      if (window.AUTOMIND) window.AUTOMIND.FINANCIERAS = mapped.filter(f => f.activa);
    }).catch(console.error);
  }, [agencyId]);

  const activas   = financieras.filter(f => f.activa);
  const inactivas = financieras.filter(f => !f.activa);

  function handleSave(mapped) {
    setFinancieras(prev => {
      const idx = prev.findIndex(f => f.id === mapped.id);
      return idx >= 0 ? [...prev.slice(0,idx), mapped, ...prev.slice(idx+1)] : [...prev, mapped];
    });
  }

  async function handleToggle(fin) {
    try {
      setLoading(true);
      const updated = await window.DB.saveFinanciera(agencyId, { ...fin, activa: !fin.activa });
      const mapped  = window.DB.financieraFromDbRow(updated);
      handleSave(mapped);
      if (window.AUTOMIND) {
        window.AUTOMIND.FINANCIERAS = [...financieras.map(f => f.id===mapped.id ? mapped : f)]
          .filter(f => f.activa);
      }
    } catch(err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!usuarioActual || (usuarioActual.rol !== "director" && !puedeGestionar)) {
    return (
      <div className="page">
        <div className="ph">
          {I.coins({ width:30, height:30 })}
          <h2>Sin acceso</h2>
          <p>Solo los directores pueden gestionar las financieras.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="usr-shell">
      <div className="usr-header">
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800 }}>Financieras</h1>
          <p className="page-sub" style={{ margin:0 }}>
            {puedeGestionar
              ? "Configura las financieras disponibles para toda la plataforma. Solo tú puedes agregar o modificarlas."
              : "Financieras disponibles para captura de inventario en esta agencia."}
          </p>
          {!puedeGestionar && (
            <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:6,
              fontSize:12, color:"var(--muted)", background:"var(--bg)", padding:"4px 10px",
              borderRadius:20, border:"1px solid var(--line)" }}>
              🔒 Las financieras son administradas por Coperva
            </div>
          )}
        </div>
        {puedeGestionar && (
          <button className="btn primary" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
            + Nueva financiera
          </button>
        )}
      </div>

      {/* Stats rápidas */}
      <div className="mini-grid" style={{ gridTemplateColumns:"repeat(3,1fr)" }}>
        <div className="mini-kpi">
          <span className="mk-ico">{I.coins({ width:20, height:20 })}</span>
          <div className="mk-body">
            <span className="mk-label">Activas</span>
            <span className="mk-value">{activas.length}</span>
          </div>
        </div>
        <div className="mini-kpi">
          <span className="mk-ico">{I.clock({ width:20, height:20 })}</span>
          <div className="mk-body">
            <span className="mk-label">Plazo promedio</span>
            <span className="mk-value">
              {activas.length ? Math.round(activas.reduce((s,f)=>s+f.plazoDias,0)/activas.length) : 0} días
            </span>
          </div>
        </div>
        <div className="mini-kpi">
          <span className="mk-ico">{I.fx({ width:20, height:20 })}</span>
          <div className="mk-body">
            <span className="mk-label">Tasa promedio</span>
            <span className="mk-value">
              {activas.length ? fmtPct(activas.reduce((s,f)=>s+f.tasa,0)/activas.length, 2) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de financieras activas */}
      {activas.length > 0 && (
        <>
          <div style={{ fontSize:12, fontWeight:800, textTransform:"uppercase",
            letterSpacing:".06em", color:"var(--muted)" }}>Activas</div>
          <div className="fin-grid">
            {activas.map(f => (
              <FinancieraCard key={f.id} fin={f}
                onEdit={puedeGestionar ? (fin => { setEditTarget(fin); setDrawerOpen(true); }) : null}
                onToggle={puedeGestionar ? handleToggle : null} />
            ))}
          </div>
        </>
      )}

      {/* Inactivas */}
      {inactivas.length > 0 && (
        <>
          <div style={{ fontSize:12, fontWeight:800, textTransform:"uppercase",
            letterSpacing:".06em", color:"var(--muted)", marginTop:8 }}>Inactivas</div>
          <div className="fin-grid">
            {inactivas.map(f => (
              <FinancieraCard key={f.id} fin={f}
                onEdit={puedeGestionar ? (fin => { setEditTarget(fin); setDrawerOpen(true); }) : null}
                onToggle={puedeGestionar ? handleToggle : null} />
            ))}
          </div>
        </>
      )}

      {financieras.length === 0 && (
        <div className="page">
          <div className="ph">
            {I.coins({ width:30, height:30 })}
            <h2>Sin financieras</h2>
            <p>Crea tu primera financiera para comenzar a capturar inventario.</p>
            <button className="btn primary" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
              + Nueva financiera
            </button>
          </div>
        </div>
      )}

      {drawerOpen && (
        <FinancieraDrawer
          fin={editTarget}
          agencyId={agencyId}
          onSave={handleSave}
          onClose={() => { setDrawerOpen(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

Object.assign(window, { GestionFinancieras });
