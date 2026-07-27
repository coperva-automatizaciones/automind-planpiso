/* Automind · Equipo — vista unificada (colaboradores + acceso)
   Organigrama interactivo, directorio con estado activo/pendiente,
   alta/edición con invite-user, reenviar invitación y eliminar. */

/* ── Nodo del organigrama ───────────────────────────────────────────────── */
function OrgNodo({ u, usuarios, rows, activeGerente, onPickGerente, nivel }) {
  const subordinados = usuarios.filter(s => {
    const rIds = Array.isArray(s.reportaIds) ? s.reportaIds : (s.reportaA ? [s.reportaA] : []);
    return rIds.includes(u.id);
  });
  const unidadesCount = rows.filter(r => r.vendedorId === u.id).length;
  const isActive = activeGerente === u.id;
  const dimmed   = activeGerente && u.rol === "gerente" && !isActive;

  return (
    <div className={"org-col nivel-" + nivel}>
      <div
        className={"org-nodo" + (isActive ? " active" : "") + (dimmed ? " dimmed" : "")}
        style={{ "--nd": ROL_CFG[u.rol]?.dot || "#aaa" }}
        onClick={u.rol === "gerente" ? () => onPickGerente(isActive ? null : u.id) : undefined}
        title={u.rol === "gerente" ? (isActive ? "Quitar filtro" : "Filtrar equipo") : undefined}
      >
        <div className="org-av" style={{ background: ROL_CFG[u.rol]?.dot || "#aaa" }}>
          {u.nombre.split(" ").slice(0, 2).map(w => w[0]).join("")}
        </div>
        <div className="org-info">
          <div className="org-nombre">{u.nombre}</div>
          <RolBadge rol={u.rol} />
          {unidadesCount > 0 && (
            <div className="org-unidades">{unidadesCount} unidades</div>
          )}
        </div>
        {u.rol === "gerente" && (
          <span className="org-filter-ico">
            {isActive ? I.close({ width:13, height:13 }) : I.filter({ width:13, height:13 })}
          </span>
        )}
      </div>
      {subordinados.length > 0 && (
        <div className="org-children">
          {subordinados.map(s => (
            <OrgNodo key={s.id} u={s} usuarios={usuarios} rows={rows}
              activeGerente={activeGerente} onPickGerente={onPickGerente} nivel={nivel + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Organigrama ────────────────────────────────────────────────────────── */
function Organigrama({ usuarios, rows, activeGerente, onPickGerente }) {
  const director = usuarios.find(u => u.rol === "director");
  if (!director) {
    return <div className="empty" style={{ padding:"40px 0", textAlign:"center" }}>Sin director registrado.</div>;
  }
  return (
    <div className="org-wrap">
      {activeGerente && (
        <div className="org-hint">
          {I.filter({ width: 14, height: 14 })} Mostrando equipo de <b>{usuarios.find(u => u.id === activeGerente)?.nombre}</b>
          <button className="org-hint-clear" onClick={() => onPickGerente(null)}>
            {I.close({ width: 12, height: 12 })} Quitar filtro
          </button>
        </div>
      )}
      <div className="org-tree">
        <OrgNodo u={director} usuarios={usuarios} rows={rows}
          activeGerente={activeGerente} onPickGerente={onPickGerente} nivel={0} />
      </div>
    </div>
  );
}

/* ── Drawer alta / edición ──────────────────────────────────────────────── */
function ColabDrawer({ u, usuarios, agencyId, usuarioActual, onSave, onClose }) {
  const esEdicion = !!u;
  const [form, setForm] = React.useState(u
    ? { ...u, reportaIds: Array.isArray(u.reportaIds) ? u.reportaIds : (u.reportaA ? [u.reportaA] : []) }
    : { nombre:"", email:"", tel:"", rol:"vendedor", reportaIds:[], fechaIngreso: new Date().toISOString().slice(0,10) }
  );
  const [loading,    setLoading]    = React.useState(false);
  const [error,      setError]      = React.useState("");
  const [success,    setSuccess]    = React.useState(false);
  const [actionLink, setActionLink] = React.useState(null);
  const [copied,     setCopied]     = React.useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (k === "email") setError(""); };

  const superiores = form.rol === "vendedor"
    ? usuarios.filter(x => x.rol === "gerente")
    : form.rol === "gerente"
    ? usuarios.filter(x => x.rol === "director")
    : [];

  // Primer superior seleccionado (para cadena de display)
  const rIdsForm   = Array.isArray(form.reportaIds) ? form.reportaIds : [];
  const superiorObj = rIdsForm.length > 0 ? (usuarios.find(x => x.id === rIdsForm[0]) || null) : null;
  const gerenteObj  = form.rol === "vendedor" ? superiorObj
                    : form.rol === "gerente"  ? { ...form }
                    : null;
  // Director: primer superior del gerente primario
  const gerRIds    = gerenteObj && form.rol === "vendedor"
    ? (Array.isArray(gerenteObj.reportaIds) && gerenteObj.reportaIds.length > 0 ? gerenteObj.reportaIds : (gerenteObj.reportaA ? [gerenteObj.reportaA] : []))
    : [];
  const directorObj = form.rol === "director" ? null
                    : form.rol === "gerente"  ? superiorObj
                    : gerRIds.length > 0 ? (usuarios.find(x => x.id === gerRIds[0]) || null) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre || !form.email || !form.rol) { setError("Nombre, correo y rol son requeridos."); return; }
    const emailNorm = form.email.trim().toLowerCase();
    const dup = usuarios.find(x => x.email.trim().toLowerCase() === emailNorm && x.id !== form.id);
    if (dup) { setError("Ya existe un colaborador con ese correo (" + dup.nombre + ")."); return; }

    setLoading(true); setError("");
    try {
      const { data: { session } } = await window.DB.client.auth.getSession();
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": window.SUPABASE_ANON,
        },
        body: JSON.stringify({
          email:        emailNorm,
          nombre:       form.nombre.trim(),
          tel:          form.tel || null,
          rol:          form.rol,
          reportaA:     (form.reportaIds && form.reportaIds[0]) || null,
          reportaIds:   Array.isArray(form.reportaIds) ? form.reportaIds : [],
          fechaIngreso: form.fechaIngreso || null,
          workspaceId:  agencyId,
          agencyId:     window.AUTOMIND?.agencyParentId || agencyId,
          userId:       u?.id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setSuccess(true);
      onSave && onSave(json.user);
      if (json.action_link) {
        setActionLink(json.action_link);
      } else {
        setTimeout(() => { setSuccess(false); onClose(); }, 1500);
      }
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" style={{ "--sol": ROL_CFG[form.rol]?.dot || "#2f6fed" }}>
        <div className="dr-head">
          <div>
            <div className="dr-eyebrow">{esEdicion ? "Editar colaborador · " + (u?.id || "") : "Nuevo colaborador"}</div>
            <h2>{esEdicion ? form.nombre : "Agregar usuario"}</h2>
          </div>
          <button className="icon-btn ghost" onClick={onClose}>{I.close({ width:20, height:20 })}</button>
        </div>

        <form className="colab-form" id="colab-form" onSubmit={handleSubmit}>
          {!esEdicion && (
            <div className="inv-hint">
              {I.bell({ width:14, height:14, style:{ display:"inline", verticalAlign:"middle", marginRight:6 } })}
              Se enviará un correo de invitación. También recibirás un enlace directo.
            </div>
          )}

          <div className="cf-group">
            <label className="cf-label">Nombre completo *</label>
            <input className="cf-input" value={form.nombre} onChange={e => set("nombre", e.target.value)}
              placeholder="Ej. Carlos Mendoza" required disabled={loading} />
          </div>

          <div className="cf-row">
            <div className="cf-group">
              <label className="cf-label">Correo electrónico *</label>
              <input className="cf-input" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="usuario@agencia.mx" required disabled={loading || esEdicion} />
            </div>
            <div className="cf-group">
              <label className="cf-label">Teléfono</label>
              <input className="cf-input" value={form.tel || ""} onChange={e => set("tel", e.target.value)}
                placeholder="55 1234 5678" disabled={loading} />
            </div>
          </div>

          <div className="cf-row">
            <div className="cf-group">
              <label className="cf-label">Rol *</label>
              <select className="cf-input" value={form.rol}
                onChange={e => { set("rol", e.target.value); set("reportaIds", []); }}
                disabled={loading || (usuarioActual?.rol === "gerente" && !usuarioActual?.isAgencyOwner && !usuarioActual?.isSuperAdmin)}>
                {(usuarioActual?.rol === "director" || usuarioActual?.isAgencyOwner || usuarioActual?.isSuperAdmin) && <option value="director">Director</option>}
                {(usuarioActual?.rol === "director" || usuarioActual?.isAgencyOwner || usuarioActual?.isSuperAdmin) && <option value="gerente">Gerente</option>}
                <option value="vendedor">Vendedor</option>
              </select>
            </div>
            <div className="cf-group">
              <label className="cf-label">Reporta a</label>
              {(function() {
                /* Multi-chip: selección múltiple de superiores */
                var rIds = Array.isArray(form.reportaIds) ? form.reportaIds : [];
                var disabled = form.rol === "director" || loading;
                function toggleSup(id) {
                  if (disabled) return;
                  set("reportaIds", rIds.includes(id) ? rIds.filter(x => x !== id) : [...rIds, id]);
                }
                if (superiores.length === 0) {
                  return <p style={{ fontSize:12, color:"var(--muted)", margin:"4px 0 0" }}>— ningún superior disponible —</p>;
                }
                return (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
                    {superiores.map(function(s) {
                      var sel = rIds.includes(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleSup(s.id)}
                          disabled={disabled}
                          style={{ padding:"5px 13px", borderRadius:20,
                            border: "2px solid " + (sel ? "var(--accent)" : "var(--line)"),
                            background: sel ? "var(--accent)" : "var(--card)",
                            color: sel ? "#fff" : "var(--ink)",
                            fontSize:12, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? .5 : 1, fontFamily:"inherit", transition:"all .12s" }}>
                          {s.nombre}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Relaciones derivadas */}
          {(gerenteObj || directorObj) && (
            <div className="cf-derived">
              {gerenteObj && form.rol === "vendedor" && (
                <div className="cf-derived-row">
                  <span className="cf-derived-lbl">Gerente</span>
                  <div className="cf-derived-val">
                    <span className="cf-derived-name">{gerenteObj.nombre}</span>
                    <span className="cf-derived-email">{gerenteObj.email}</span>
                  </div>
                </div>
              )}
              {directorObj && (
                <div className="cf-derived-row">
                  <span className="cf-derived-lbl">Director</span>
                  <div className="cf-derived-val">
                    <span className="cf-derived-name">{directorObj.nombre}</span>
                    <span className="cf-derived-email">{directorObj.email}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="cf-group">
            <label className="cf-label">Fecha de ingreso</label>
            <input className="cf-input" type="date" value={form.fechaIngreso || ""}
              onChange={e => set("fechaIngreso", e.target.value)} disabled={loading} />
          </div>

          {error && (
            <div className="login-error" style={{ marginBottom:12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
          {success && !actionLink && (
            <div className="fb-ok" style={{ marginBottom:12 }}>
              ✓ {esEdicion ? "Cambios guardados" : "Invitación enviada correctamente"}
            </div>
          )}
          {success && actionLink && (
            <div className="inv-link-box">
              <div className="inv-link-success">✓ {esEdicion ? "Cambios guardados" : "Invitación enviada"}</div>
              <p className="inv-link-msg">
                Se intentó enviar el correo. Comparte este enlace con
                <strong> {form.nombre.split(" ")[0]}</strong> por si no llega:
              </p>
              <div className="inv-link-row">
                <input readOnly className="inv-link-input" value={actionLink} onClick={e => e.target.select()} />
                <button type="button" className="btn primary inv-link-copy"
                  onClick={() => { navigator.clipboard.writeText(actionLink); setCopied(true); setTimeout(() => setCopied(false), 2500); }}>
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
              <p className="inv-link-note">Expira en 24 horas · Un solo uso</p>
            </div>
          )}
        </form>

        <div className="dr-actions">
          {!actionLink && (
            <button className="btn primary" form="colab-form" type="submit" disabled={loading}>
              {loading && <span className="login-spinner" style={{ width:13, height:13, borderWidth:2 }} />}
              {loading ? "Guardando…" : esEdicion ? "Guardar cambios" : "Agregar y enviar invitación"}
            </button>
          )}
          <button className="btn" onClick={onClose} disabled={loading}>
            {actionLink ? "Cerrar" : "Cancelar"}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Vista principal ────────────────────────────────────────────────────── */
function Colaboradores({ usuarios: usuariosInit, rows, usuarioActual, autoOpenForm, onAutoOpenConsumed }) {
  const [tab,           setTab]          = React.useState("organigrama");
  const [usuarios,      setUsuarios]     = React.useState(usuariosInit || []);
  const [activeGerente, setActiveGerente]= React.useState(null);
  const [editando,      setEditando]     = React.useState(null); // null=cerrado, false=nuevo, obj=editar
  const [q,             setQ]            = React.useState("");
  const [filtroRol,     setFiltroRol]    = React.useState("");
  const [confirmDel,    setConfirmDel]   = React.useState(null);
  const [deleting,      setDeleting]     = React.useState(false);
  const [delError,      setDelError]     = React.useState("");
  const [resendStates,  setResendStates] = React.useState({});
  const [resendCopied,  setResendCopied] = React.useState({});

  const agencyId = window.AUTOMIND?.agencyId || null;

  React.useEffect(() => { setUsuarios(usuariosInit || []); }, [usuariosInit]);

  React.useEffect(() => {
    if (autoOpenForm) {
      setEditando(false);
      setTab("directorio");
      onAutoOpenConsumed && onAutoOpenConsumed();
    }
  }, [autoOpenForm]);

  const director   = usuarios.filter(u => u.rol === "director");
  const gerentes   = usuarios.filter(u => u.rol === "gerente");
  const vendedores = usuarios.filter(u => u.rol === "vendedor");

  const puedeInvitar  = ["director", "gerente"].includes(usuarioActual?.rol) || usuarioActual?.isAgencyOwner || usuarioActual?.isSuperAdmin;
  const puedeEliminar = usuarioActual?.rol === "director" || usuarioActual?.isAgencyOwner || usuarioActual?.isSuperAdmin;

  const listaFiltrada = usuarios.filter(u => {
    if (activeGerente && tab === "directorio") {
      const rIds = Array.isArray(u.reportaIds) ? u.reportaIds : (u.reportaA ? [u.reportaA] : []);
      if (!rIds.includes(activeGerente) && u.id !== activeGerente) return false;
    }
    if (filtroRol && u.rol !== filtroRol) return false;
    if (q) {
      const txt = [u.nombre, u.email, u.rol, u.tel].join(" ").toLowerCase();
      if (!txt.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  function handleSave(savedUser) {
    if (!savedUser) return;
    const mapped = {
      id:           savedUser.id,
      nombre:       savedUser.nombre,
      email:        savedUser.email,
      tel:          savedUser.tel || "",
      rol:          savedUser.rol,
      reportaA:     savedUser.reporta_a || savedUser.reportaA || null,
      reportaIds:   (savedUser.reporta_ids && savedUser.reporta_ids.length > 0)
                      ? savedUser.reporta_ids
                      : (savedUser.reporta_a || savedUser.reportaA)
                        ? [savedUser.reporta_a || savedUser.reportaA]
                        : [],
      fechaIngreso: savedUser.fecha_ingreso || savedUser.fechaIngreso || "",
      auth_user_id: savedUser.auth_user_id || null,
    };
    setUsuarios(prev => {
      const rIds    = Array.isArray(mapped.reportaIds) ? mapped.reportaIds : [];
      const sups    = rIds.map(id => prev.find(x => x.id === id)).filter(Boolean);
      const enriquecido = {
        ...mapped,
        reportaNombre: sups.map(s => s.nombre).join(", ") || "—",
        reportaEmail:  sups.map(s => s.email).join(", ")  || "—",
      };
      const idx = prev.findIndex(u => u.id === mapped.id || u.email === mapped.email);
      const next = idx >= 0
        ? prev.map((u, i) => i === idx ? enriquecido : u)
        : [...prev, enriquecido];
      if (window.AUTOMIND) {
        window.AUTOMIND.USUARIOS = next;
        const tablaColab = window.AUTOMIND.TABLAS?.find(t => t.id === "colaboradores");
        if (tablaColab) tablaColab.rows = next;
      }
      return next;
    });
  }

  async function handleReenviar(u) {
    setResendStates(s => ({ ...s, [u.id]: "loading" }));
    try {
      const { data: { session } } = await window.DB.client.auth.getSession();
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": window.SUPABASE_ANON,
        },
        body: JSON.stringify({
          email: u.email, nombre: u.nombre, tel: u.tel || "",
          rol: u.rol,
          reportaA: (u.reportaIds && u.reportaIds[0]) || u.reportaA || null,
          reportaIds: Array.isArray(u.reportaIds) ? u.reportaIds : (u.reportaA ? [u.reportaA] : []),
          workspaceId: agencyId,
          agencyId: window.AUTOMIND?.agencyParentId || agencyId,
          userId: u.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al reenviar");
      setResendStates(s => ({ ...s, [u.id]: { link: json.action_link || "" } }));
      setTimeout(() => setResendStates(s => ({ ...s, [u.id]: null })), 600000);
    } catch(err) {
      setResendStates(s => ({ ...s, [u.id]: "err:" + err.message }));
      setTimeout(() => setResendStates(s => ({ ...s, [u.id]: null })), 5000);
    }
  }

  async function handleDelete(u) {
    setDeleting(true); setDelError("");
    try {
      const { error: fkErr } = await window.DB.client
        .from("inventario").update({ vendedor_id: null }).eq("vendedor_id", u.id);
      if (fkErr) throw new Error("No se pudieron desasignar los vehículos: " + fkErr.message);
      const { data: deleted, error } = await window.DB.client
        .from("users").delete().eq("id", u.id).select("id");
      if (error) throw new Error(error.message);
      if (!deleted || deleted.length === 0)
        throw new Error("No se pudo eliminar. Solo directores pueden eliminar colaboradores.");
      const next = usuarios.filter(x => x.id !== u.id);
      setUsuarios(next);
      if (window.AUTOMIND) window.AUTOMIND.USUARIOS = next;
      setConfirmDel(null);
    } catch(err) {
      setDelError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const unidadesPorVendedor = {};
  rows.forEach(r => { if (r.vendedorId) unidadesPorVendedor[r.vendedorId] = (unidadesPorVendedor[r.vendedorId] || 0) + 1; });
  const totalAsignadas = rows.filter(r => r.vendedorId).length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Equipo</h1>
        <p className="page-sub">Organigrama y directorio del equipo de ventas.</p>
      </div>

      {/* Stats */}
      <div className="mini-grid colab-stats">
        <div className="mini-kpi">
          <span className="mk-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </span>
          <div className="mk-body"><span className="mk-label">Director</span><span className="mk-value">{director.length}</span></div>
        </div>
        <div className="mini-kpi">
          <span className="mk-ico" style={{ color:"#1f9d57" }}>{I.users({ width:20, height:20 })}</span>
          <div className="mk-body"><span className="mk-label">Gerentes</span><span className="mk-value">{gerentes.length}</span></div>
        </div>
        <div className="mini-kpi">
          <span className="mk-ico" style={{ color:"#d99613" }}>{I.users({ width:20, height:20 })}</span>
          <div className="mk-body"><span className="mk-label">Vendedores</span><span className="mk-value">{vendedores.length}</span></div>
        </div>
        <div className="mini-kpi">
          <span className="mk-ico" style={{ color:"#2f6fed" }}>{I.truck({ width:20, height:20 })}</span>
          <div className="mk-body"><span className="mk-label">Unidades asignadas</span><span className="mk-value">{totalAsignadas} / {rows.length}</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar colab-tabs">
        <button className={"tab" + (tab === "organigrama" ? " on" : "")} onClick={() => setTab("organigrama")}>
          Organigrama
        </button>
        <button className={"tab" + (tab === "directorio" ? " on" : "")} onClick={() => setTab("directorio")}>
          Directorio
          {activeGerente && <span className="tab-badge">{listaFiltrada.length}</span>}
        </button>
        <div className="tab-spacer" />
        {puedeInvitar && (
          <button className="btn primary btn-sm" onClick={() => setEditando(false)}>
            + Agregar usuario
          </button>
        )}
      </div>

      {/* Organigrama */}
      {tab === "organigrama" && (
        <div className="card">
          <Organigrama usuarios={usuarios} rows={rows}
            activeGerente={activeGerente} onPickGerente={setActiveGerente} />
        </div>
      )}

      {/* Directorio */}
      {tab === "directorio" && (
        <div className="card">
          <div className="db-toolbar">
            <label className="search">
              {I.search({ width:16, height:16 })}
              <input placeholder="Buscar colaborador…" value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
              <option value="">Todos los roles</option>
              <option value="director">Director</option>
              <option value="gerente">Gerente</option>
              <option value="vendedor">Vendedor</option>
            </select>
            {activeGerente && (
              <button className="chip-clear" onClick={() => setActiveGerente(null)}>
                {I.filter({ width:13, height:13 })} Equipo de {usuarios.find(u => u.id === activeGerente)?.nombre?.split(" ")[0]}
                <span className="cc-x">{I.close({ width:12, height:12 })}</span>
              </button>
            )}
            <span className="db-count">{listaFiltrada.length} colaboradores</span>
          </div>

          <div className="colab-list">
            <div className="cl-head">
              <span>Colaborador</span>
              <span>Rol</span>
              <span>Reporta a</span>
              <span>Acceso</span>
              <span className="r">Unidades</span>
              <span>Ingreso</span>
              <span></span>
            </div>
            {listaFiltrada.map(u => {
              const rIds_   = Array.isArray(u.reportaIds) ? u.reportaIds : (u.reportaA ? [u.reportaA] : []);
              const sups_   = rIds_.map(id => usuarios.find(s => s.id === id)).filter(Boolean);
              const supTxt  = sups_.map(s => s.nombre).join(", ") || "—";
              const uCount  = unidadesPorVendedor[u.id] || 0;
              const esYo     = usuarioActual && u.id === usuarioActual.id;
              const activo   = !!u.auth_user_id;
              const rs       = resendStates[u.id] || null;
              const rsOk     = rs && typeof rs === "object";
              const rsErr    = typeof rs === "string" && rs.startsWith("err:");
              const rsLoading= rs === "loading";
              const rsLink   = rsOk ? rs.link : null;
              return (
                <div key={u.id} className={"cl-row" + (esYo ? " yo" : "")}>
                  <div className="cl-nombre">
                    <div className="cl-av" style={{ background: ROL_CFG[u.rol]?.dot || "#aaa" }}>
                      {u.nombre.split(" ").slice(0, 2).map(w => w[0]).join("")}
                    </div>
                    <div>
                      <div className="cl-name-txt">{u.nombre}{esYo && <span className="yo-tag">Tú</span>}</div>
                      <div className="cl-email">{u.email}</div>
                    </div>
                  </div>
                  <span><RolBadge rol={u.rol} /></span>
                  <span className="cl-sup" title={supTxt}>{supTxt}</span>
                  <span>
                    <span className={"usr-status-badge " + (activo ? "activo" : "pendiente")}>
                      <span className="usr-status-badge dot" />
                      {activo ? "Activo" : "Pendiente"}
                    </span>
                  </span>
                  <span className="r cl-units">{uCount > 0 ? uCount : "—"}</span>
                  <span className="cl-fecha">{u.fechaIngreso || "—"}</span>
                  <span className="cl-actions" style={{ display:"flex", gap:4, justifyContent:"flex-end", flexWrap:"wrap", alignItems:"flex-start" }}>
                    {puedeInvitar && !esYo && (
                      <button className="btn btn-sm" onClick={() => setEditando(u)}>Editar</button>
                    )}
                    {/* Reenviar / Nuevo link — disponible para pendientes Y activos (links pueden expirar) */}
                    {puedeInvitar && !esYo && (
                      <span style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                        <button className="btn btn-sm" disabled={rsLoading}
                          style={rsOk  ? { color:"#1f9d57", borderColor:"#bbf7d0", background:"#f0fdf4" }
                               : rsErr ? { color:"#e0492f", borderColor:"#fdd",    background:"#fff8f7" }
                               : {}}
                          onClick={() => handleReenviar(u)}>
                          {rsLoading
                            ? <><span className="login-spinner" style={{ width:11, height:11, borderWidth:2, display:"inline-block", verticalAlign:"middle", marginRight:4 }} />Enviando…</>
                            : activo ? "Nuevo link" : "Reenviar"}
                        </button>
                        {rsOk && rsLink && (
                          <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end", padding:"5px 7px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, maxWidth:200 }}>
                            <span style={{ fontSize:11, color:"#1f9d57", fontWeight:600 }}>✓ Enviado · Copia el link:</span>
                            <div style={{ display:"flex", gap:4 }}>
                              <input readOnly style={{ fontSize:10, flex:1, border:"1px solid #e2e8f0", borderRadius:4, padding:"2px 5px", minWidth:0, width:100 }}
                                value={rsLink} onClick={e => e.target.select()} />
                              <button className="btn btn-sm" style={{ fontSize:10, padding:"2px 8px" }}
                                onClick={() => {
                                  navigator.clipboard.writeText(rsLink);
                                  setResendCopied(c => ({ ...c, [u.id]: true }));
                                  setTimeout(() => setResendCopied(c => ({ ...c, [u.id]: false })), 2500);
                                }}>
                                {resendCopied[u.id] ? "✓" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        )}
                        {rsErr && (
                          <span style={{ fontSize:11, color:"#e0492f", maxWidth:140, textAlign:"right", lineHeight:1.3 }}>
                            {rs.slice(4).slice(0, 70)}
                          </span>
                        )}
                      </span>
                    )}
                    {puedeEliminar && !esYo && (
                      <button className="btn btn-sm"
                        style={{ color:"#e0492f", borderColor:"#fdd", background:"#fff8f7" }}
                        onClick={() => setConfirmDel(u)}>
                        Eliminar
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
            {!listaFiltrada.length && (
              <div className="empty" style={{ padding:"24px 0", textAlign:"center" }}>Sin resultados.</div>
            )}
          </div>
        </div>
      )}

      {/* Drawer agregar / editar */}
      {editando !== null && (
        <ColabDrawer
          u={editando === false ? null : editando}
          usuarios={usuarios}
          agencyId={agencyId}
          usuarioActual={usuarioActual}
          onSave={handleSave}
          onClose={() => setEditando(null)}
        />
      )}

      {/* Modal confirmación eliminar */}
      {confirmDel && (
        <>
          <div className="scrim" onClick={() => !deleting && setConfirmDel(null)} />
          <div className="del-modal">
            <div className="del-modal-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="#e0492f" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>¿Eliminar a {confirmDel.nombre}?</h3>
            <p>Se eliminará <b>{confirmDel.email}</b> del equipo. Esta acción no se puede deshacer.</p>
            {delError && (
              <div className="login-error" style={{ margin:"0 0 8px", textAlign:"left" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                  strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ flexShrink:0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {delError}
              </div>
            )}
            <div className="del-modal-btns">
              <button className="btn danger" disabled={deleting} onClick={() => handleDelete(confirmDel)}>
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button className="btn" disabled={deleting}
                onClick={() => { setConfirmDel(null); setDelError(""); }}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { Colaboradores });
