/* Automind · Editor de Inventario
   Panel izquierdo: lista buscable de unidades.
   Panel derecho: formulario editable + campos calculados + jerarquía de asignación.
   Permite agregar, editar y eliminar unidades sin entrar a la base de datos. */

const ESTATUS_OPTS = ["NUEVOS", "DEMO", "SEMINUEVOS", "USADOS"];
const ESTADO_VENTA_OPTS = [
  { val: "DISPONIBLE", label: "Disponible", color: "#1f9d57", bg: "#e7f5ed" },
  { val: "APARTADO",   label: "Apartado",   color: "#c05c00", bg: "#faeeda" },
  { val: "VENDIDO",    label: "Vendido",    color: "#7c3aed", bg: "#f3eeff" },
];
const COLORES_EXT  = ["AZUL ANEMONA","AZUL MONTERREY","NEGRO PROFUNDO","ROJO KINGS","BLANCO PURO","GRIS FRANELA","PLATA REFLEX","OTRO"];
const COLORES_INT  = ["NEGRO","BEIGE","GRIS","CAFÉ","OTRO"];
const MS_DIA       = 86400000;

/* ── Recomputar campos calculados a partir de un formulario ─────────────── */
function recomputar(v) {
  const HOY    = new Date();
  const fFact  = v.fechaFactura instanceof Date ? v.fechaFactura : new Date(v.fechaFactura);
  const fLleg  = v.fechaLlegada instanceof Date ? v.fechaLlegada : new Date(v.fechaLlegada || HOY);
  const fmtF   = d => `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

  const diasEnPiso          = Math.max(0, Math.round((HOY - fFact) / MS_DIA) - 1);
  const diasGraciaBase      = Number(v.diasGraciaBase)  || 0;
  const diasGraciaExtra     = Number(v.diasGraciaExtra) || 0;
  const diasGraciaTotal     = diasGraciaBase + diasGraciaExtra;
  const diasLibresRestantes = diasGraciaTotal - diasEnPiso;
  const diasVencidos        = diasLibresRestantes < 0 ? Math.abs(diasLibresRestantes) : 0;
  const monto               = Number(v.montoFinanciado) || 0;
  const tasa                = Number(v.pctInteres)      || 0;
  const interesDiario       = Math.round((monto * tasa / 365) * 100) / 100;
  const interesAcum         = Math.round(diasVencidos * interesDiario * 100) / 100;
  const pctPlanConsumido    = diasGraciaTotal > 0 ? Math.round((diasEnPiso / diasGraciaTotal) * 100) : 0;

  let semaforo;
  if      (pctPlanConsumido > 100) semaforo = "intereses";
  else if (pctPlanConsumido > 86)  semaforo = "vencer";
  else if (pctPlanConsumido > 76)  semaforo = "comprometido";
  else if (pctPlanConsumido > 61)  semaforo = "rotacion";
  else                              semaforo = "saludable";

  const fechaVenc = new Date(fFact.getTime() + diasGraciaTotal * MS_DIA);

  return {
    ...v,
    fechaFactura: fFact,
    fechaLlegada: fLleg,
    diasEnPiso, diasGraciaBase, diasGraciaExtra, diasGraciaTotal,
    diasLibresRestantes, diasVencidos, interesDiario, interesAcum,
    pctPlanConsumido, semaforo,
    montoFinanciado: monto,
    pctInteres:      tasa,
    fechaFacturaTxt: fmtF(fFact),
    fechaLlegadaTxt: fmtF(fLleg),
    fechaVencTxt:    fmtF(fechaVenc),
  };
}

/* Convierte Date → string yyyy-mm-dd para <input type="date"> */
function toInputDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  return dt.toISOString().slice(0, 10);
}

/* ── Fila del panel izquierdo ───────────────────────────────────────────── */
function VehicleListItem({ row, active, onClick, maskIntereses }) {
  // Vendedores no ven el estado "intereses" — se muestra como "vencer"
  const semKey = (maskIntereses && row.semaforo === "intereses") ? "vencer" : row.semaforo;
  const c = SEM[semKey] || SEM.saludable;
  return (
    <button className={"vie-item" + (active ? " active" : "")} onClick={onClick}>
      <div className="vie-thumb">
        {row.fotoUrl
          ? <img src={row.fotoUrl} alt="" />
          : <span className="vie-thumb-ph">{I.truck({ width:20, height:20 })}</span>
        }
      </div>
      <div className="vie-meta">
        <div className="vie-vin">{row.vin || "—"}</div>
        <div className="vie-desc">{row.descripcion || (row.marca + " " + row.modelo)}</div>
        <div className="vie-sub">{row.anio} · INV {row.inv}</div>
      </div>
      <span className="vie-dot" style={{ background: c.sol }} title={c.label} />
    </button>
  );
}

/* ── Campo de formulario editable ───────────────────────────────────────── */
function FormField({ label, required, children }) {
  return (
    <div className="ef-field">
      <label className="ef-label">{label}{required && <span className="ef-req">*</span>}</label>
      {children}
    </div>
  );
}

/* ── Bloque de campo calculado (solo lectura) ───────────────────────────── */
function CalcField({ label, value, warn, neg }) {
  return (
    <div className="ef-calc-row">
      <span className="ef-calc-lbl">{label}</span>
      <span className={"ef-calc-val" + (neg ? " neg" : warn ? " warn" : "")}>{value}</span>
    </div>
  );
}

/* ── Sección de asignación de jerarquía (multi-vendedor) ───────────────── */
function JerarquiaSection({ vendedorIds, usuarios, onChange }) {
  const vendedorIds_ = Array.isArray(vendedorIds) ? vendedorIds : [];
  const vendedores   = usuarios.filter(u => u.rol === "vendedor");
  const asignados    = vendedorIds_.map(id => usuarios.find(u => u.id === id)).filter(Boolean);
  const todosIds     = vendedores.map(v => v.id);
  const todosActivo  = vendedores.length > 0 && vendedores.every(v => vendedorIds_.includes(v.id));

  function toggle(vid) {
    if (vendedorIds_.includes(vid)) {
      onChange(vendedorIds_.filter(id => id !== vid));
    } else {
      onChange([...vendedorIds_, vid]);
    }
  }

  function toggleTodos() {
    onChange(todosActivo ? [] : todosIds);
  }

  const NivelChip = ({ u, color, lbl }) => u ? (
    <div className="jq-nivel">
      <span className="jq-lbl">{lbl}</span>
      <div className="jq-persona">
        <div className="jq-av" style={{ background: color }}>
          {u.nombre.split(" ").slice(0,2).map(w=>w[0]).join("")}
        </div>
        <div className="jq-info">
          <div className="jq-nombre">{u.nombre}</div>
          <div className="jq-email">{u.email}</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="ef-seccion jq-wrap">
      <div className="ef-sec-head" style={{ display:"flex", alignItems:"center" }}>
        <span style={{ display:"flex", alignItems:"center" }}>{I.users({ width:15, height:15 })}</span>
        <span style={{ marginLeft:6 }}>Asignación de vendedores</span>
        {asignados.length > 0 && (
          <span style={{ marginLeft:"auto", fontSize:11, fontWeight:600,
            color:"var(--accent)", background:"#e8f0fe",
            padding:"2px 8px", borderRadius:10 }}>
            {asignados.length} asignado{asignados.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Chips de selección múltiple */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"6px 0 10px" }}>
        {vendedores.length === 0 && (
          <span style={{ color:"var(--muted)", fontSize:12 }}>Sin vendedores registrados en este workspace.</span>
        )}

        {/* Chip "Todos" — solo si hay más de un vendedor */}
        {vendedores.length > 1 && (
          <button type="button" onClick={toggleTodos}
            title={todosActivo ? "Deseleccionar todos" : "Asignar a todos los vendedores"}
            style={{ padding:"5px 14px", borderRadius:20, border:"2px solid",
              borderColor: todosActivo ? "#7c3aed" : "var(--line)",
              background:  todosActivo ? "#f3eeff" : "var(--card)",
              color:       todosActivo ? "#7c3aed" : "var(--ink-2)",
              fontSize:12, fontWeight: todosActivo ? 700 : 500, cursor:"pointer",
              transition:"all .12s", display:"flex", alignItems:"center", gap:5 }}>
            {todosActivo
              ? <><span style={{ fontSize:10 }}>✓</span> Todos ({vendedores.length})</>
              : <>Todos ({vendedores.length})</>}
          </button>
        )}

        {/* Chips individuales */}
        {vendedores.map(v => {
          const sel = vendedorIds_.includes(v.id);
          return (
            <button key={v.id} type="button"
              onClick={() => toggle(v.id)}
              style={{ padding:"5px 12px", borderRadius:20, border:"2px solid",
                borderColor: sel ? "#2f6fed" : "var(--line)",
                background:  sel ? "#e6f1fb" : "var(--card)",
                color:       sel ? "#185fa5" : "var(--muted)",
                fontSize:12, fontWeight: sel ? 700 : 400, cursor:"pointer",
                transition:"all .12s", display:"flex", alignItems:"center", gap:5 }}>
              {sel && <span style={{ fontSize:10 }}>✓</span>}
              {v.nombre.split(" ").slice(0,2).join(" ")}
            </button>
          );
        })}
      </div>

      {/* Cadena jerárquica por cada vendedor asignado */}
      {asignados.map(vend => {
        const ger = usuarios.find(u => u.id === vend.reportaA && u.rol === "gerente") || null;
        const dir = ger ? (usuarios.find(u => u.id === ger.reportaA && u.rol === "director") || null) : null;
        return (
          <div key={vend.id} className="jq-chain" style={{ marginBottom:8 }}>
            <NivelChip u={vend} color="#d99613" lbl="Vendedor" />
            {ger  && <><div className="jq-arrow">↑</div><NivelChip u={ger}  color="#1f9d57" lbl="Gerente" /></>}
            {dir  && <><div className="jq-arrow">↑</div><NivelChip u={dir}  color="#2f6fed" lbl="Director" /></>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Editor principal ───────────────────────────────────────────────────── */
function InventarioEditor({ rows: rowsInit, usuarios, usuarioActual, onRowsChange, initialSelId }) {
  const esVendedor = usuarioActual?.rol === "vendedor";
  const [rows,      setRows]      = React.useState(rowsInit || []);
  const [selId,     setSelId]     = React.useState(
    initialSelId || (rowsInit && rowsInit[0] ? rowsInit[0].id : null)
  );
  const [form,      setForm]      = React.useState(null);
  const [dirty,     setDirty]     = React.useState(false);
  const [q,         setQ]         = React.useState("");
  const [showDel,   setShowDel]   = React.useState(false);
  const [saved,     setSaved]     = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);
  const [saving,    setSaving]    = React.useState(false);

  // Sync si cambia el tenant
  React.useEffect(() => {
    setRows(rowsInit || []);
    const first = rowsInit && rowsInit[0];
    setSelId(first ? first.id : null);
  }, [rowsInit]);

  // Cargar form cuando cambia la selección
  React.useEffect(() => {
    const row = rows.find(r => r.id === selId);
    setForm(row ? { ...row } : null);
    setDirty(false);
    setSaved(false);
    setSaveError(null);
  }, [selId, rows]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); setSaved(false); setSaveError(null); };

  async function handleSave() {
    if (!form) return;
    const computed = recomputar(form);
    // Re-enriquecer con jerarquía
    if (window.AUTOMIND && window.AUTOMIND.enrichRowVendedor) {
      window.AUTOMIND.enrichRowVendedor(computed, window.AUTOMIND.USUARIOS || []);
    }
    const nextRows = rows.map(r => r.id === computed.id ? computed : r);
    setRows(nextRows);
    // Actualizar AUTOMIND.ROWS en lugar (misma referencia)
    if (window.AUTOMIND) {
      const idx = window.AUTOMIND.ROWS.findIndex(r => r.id === computed.id);
      if (idx >= 0) window.AUTOMIND.ROWS[idx] = computed;
      else window.AUTOMIND.ROWS.push(computed);
      // Sync tabla inventario
      const tab = window.AUTOMIND.TABLAS && window.AUTOMIND.TABLAS.find(t => t.id === "inventario");
      if (tab) tab.rows = window.AUTOMIND.ROWS;
    }
    setForm(computed);
    setDirty(false);
    onRowsChange && onRowsChange(nextRows);

    // Persistir en Supabase
    if (!window.DB || !window.AUTOMIND || !window.AUTOMIND.agencyId) {
      setSaveError("Sin conexión a la base de datos (agencyId no disponible).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await window.DB.saveVehicle(window.AUTOMIND.agencyId, computed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("Error guardando vehículo:", err);
      setSaveError("⚠️ No se pudo guardar: " + (err?.message || JSON.stringify(err)));
      // Revertir estado de dirty para que el usuario sepa que debe reintentar
      setDirty(true);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!form) return;
    const deletedId = form.id;
    const nextRows = rows.filter(r => r.id !== deletedId);
    setRows(nextRows);
    if (window.AUTOMIND) {
      window.AUTOMIND.ROWS = window.AUTOMIND.ROWS.filter(r => r.id !== deletedId);
      const tab = window.AUTOMIND.TABLAS && window.AUTOMIND.TABLAS.find(t => t.id === "inventario");
      if (tab) tab.rows = window.AUTOMIND.ROWS;
    }
    onRowsChange && onRowsChange(nextRows);
    const next = nextRows[0] || null;
    setSelId(next ? next.id : null);
    setShowDel(false);
    // Eliminar en Supabase
    if (window.DB) {
      window.DB.deleteVehicle(deletedId).catch(err => {
        console.error("Error eliminando vehículo:", err);
      });
    }
  }

  function handleAdd() {
    const HOY = new Date();
    const prefix = window.AUTOMIND ? (window.AUTOMIND.ROWS[0]?.id?.[0] || "V") : "V";
    // Auto-asignar todos los vendedores al crear unidad nueva para que lleguen las alertas
    const todosVendedores = (window.AUTOMIND && window.AUTOMIND.USUARIOS)
      ? window.AUTOMIND.USUARIOS.filter(function(u) { return u.rol === "vendedor"; }).map(function(u) { return u.id; })
      : [];
    const newRow = recomputar({
      id: prefix + "NEW" + Date.now().toString().slice(-5),
      vin:"", estatus:"NUEVOS", inv:"", descripcion:"", marca:"", modelo:"",
      anio:2026, tipo:"", colorExterior:"BLANCO PURO", colorInterior:"NEGRO",
      fechaFactura: HOY, fechaLlegada: HOY,
      montoFinanciado:0, diasGraciaBase:30, diasGraciaExtra:0,
      pctInteres:0.14,
      observaciones:"",
      vendedorIds: todosVendedores, vendedorId: todosVendedores[0] || null, fotoUrl:null,
    });
    const nextRows = [newRow, ...rows];
    setRows(nextRows);
    if (window.AUTOMIND) {
      window.AUTOMIND.ROWS.unshift(newRow);
      const tab = window.AUTOMIND.TABLAS && window.AUTOMIND.TABLAS.find(t => t.id === "inventario");
      if (tab) tab.rows = window.AUTOMIND.ROWS;
    }
    onRowsChange && onRowsChange(nextRows);
    setSelId(newRow.id);
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoUrl", ev.target.result);
    reader.readAsDataURL(file);
  }

  const filteredRows = rows.filter(r => {
    if (!q) return true;
    return [r.vin, r.descripcion, r.marca, r.modelo, String(r.inv)]
      .join(" ").toLowerCase().includes(q.toLowerCase());
  });

  // Campos calculados del form actual
  const calc = form ? recomputar(form) : null;

  return (
    <div className="inv-editor-shell">

      {/* ── Panel izquierdo: lista ─────────────────────────────────────── */}
      <div className="inv-list-panel">
        <div className="inv-list-head">
          <label className="search">
            {I.search({ width:15, height:15 })}
            <input placeholder="Buscar unidad…" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          {!esVendedor && (
            <button className="inv-add-btn" onClick={handleAdd} title="Nueva unidad">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
        </div>
        <div className="inv-list-body">
          {filteredRows.map(r => (
            <VehicleListItem key={r.id} row={r} active={r.id === selId}
              maskIntereses={esVendedor}
              onClick={() => {
                if (dirty) {
                  if (!window.confirm("Tienes cambios sin guardar. ¿Descartar?")) return;
                }
                setSelId(r.id);
              }} />
          ))}
          {!filteredRows.length && <div className="empty" style={{ padding:"24px 16px" }}>Sin resultados.</div>}
        </div>
        <div className="inv-list-foot">{rows.length} unidades</div>
      </div>

      {/* ── Panel derecho: formulario ──────────────────────────────────── */}
      {form ? (
        <div className="inv-form-panel">
          {/* Cabecera */}
          <div className="inv-form-head">
            <div>
              <div className="inv-form-vin">{form.vin || "Nueva unidad"}</div>
              <div className="inv-form-sub">{form.descripcion || "Sin descripción"} · {form.anio}</div>
            </div>
            <div className="inv-form-actions">
              {saved && <span className="save-ok">✓ Guardado</span>}
              {saveError && (
                <span className="save-err"
                  style={{ maxWidth:320, whiteSpace:"normal", fontSize:12, lineHeight:1.4, cursor:"pointer" }}
                  onClick={() => alert(saveError)}
                  title="Click para ver detalle">⚠️ Error al guardar (click para detalles)</span>
              )}
              {!esVendedor && (
                <button className="btn primary" onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              )}
              {!esVendedor && (
                <button className="icon-btn ghost del-btn" title="Eliminar unidad" onClick={() => setShowDel(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                    strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="inv-form-scroll">

            {/* Foto */}
            <div className="ef-foto-wrap">
              {form.fotoUrl
                ? <img className="ef-foto-img" src={form.fotoUrl} alt="Foto vehículo" />
                : <div className="ef-foto-ph">{I.truck({ width:36, height:36 })}<span>Sin foto</span></div>
              }
              {!esVendedor && (
                <label className="btn ef-foto-btn">
                  📎 {form.fotoUrl ? "Cambiar foto" : "Adjuntar foto"}
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleFoto} />
                </label>
              )}
              {form.fotoUrl && !esVendedor && (
                <button className="btn ef-foto-rm" onClick={() => set("fotoUrl", null)}>Quitar</button>
              )}
            </div>

            {/* ── Sección: datos básicos ──────────────────────────────── */}
            <div className="ef-seccion">
              <div className="ef-sec-head">{I.table({ width:15, height:15 })} Datos generales</div>
              <div className="ef-grid-2">
                <FormField label="VIN" required>
                  <input className="ef-input" value={form.vin || ""} onChange={e => set("vin", e.target.value.toUpperCase())} placeholder="17 caracteres" readOnly={esVendedor} />
                </FormField>
                {!esVendedor && (
                  <FormField label="Estatus">
                    <select className="ef-input" value={form.estatus || "NUEVOS"} onChange={e => set("estatus", e.target.value)}>
                      {ESTATUS_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </FormField>
                )}

                {/* ── Estado de venta ─── */}
                <FormField label="Estado de venta" style={{ gridColumn: "1 / -1" }}>
                  {esVendedor ? (
                    (() => {
                      const opt = ESTADO_VENTA_OPTS.find(o => o.val === (form.estadoVenta || "DISPONIBLE")) || ESTADO_VENTA_OPTS[0];
                      return (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:6,
                          padding:"5px 12px", borderRadius:20,
                          background:opt.bg, color:opt.color, fontSize:12, fontWeight:700 }}>
                          ● {opt.label}
                        </span>
                      );
                    })()
                  ) : (
                    <div style={{ display:"flex", gap:6 }}>
                      {ESTADO_VENTA_OPTS.map(o => {
                        const active = (form.estadoVenta || "DISPONIBLE") === o.val;
                        return (
                          <button key={o.val} type="button"
                            style={{ flex:1, padding:"7px 4px", borderRadius:8,
                              border:"2px solid " + (active ? o.color : "var(--line)"),
                              background: active ? o.bg : "var(--card)",
                              color: active ? o.color : "var(--muted)",
                              fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .12s" }}
                            onClick={() => {
                              setForm(f => {
                                const next = { ...f, estadoVenta: o.val };
                                if (o.val === "VENDIDO" && !f.fechaVenta) next.fechaVenta = new Date();
                                return next;
                              });
                              setDirty(true);
                            }}>
                            ● {o.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FormField>

                <FormField label="INV">
                  <input className="ef-input" type="number" value={form.inv || ""} onChange={e => set("inv", e.target.value)} readOnly={esVendedor} />
                </FormField>
                <FormField label="Año">
                  <input className="ef-input" type="number" value={form.anio || 2026} onChange={e => set("anio", Number(e.target.value))} min="2000" max="2030" readOnly={esVendedor} />
                </FormField>
                <FormField label="Descripción" required>
                  <input className="ef-input ef-span2" value={form.descripcion || ""} onChange={e => set("descripcion", e.target.value.toUpperCase())} placeholder="Ej. NUEVO GOLF GTI" readOnly={esVendedor} />
                </FormField>
                <FormField label="Tipo">
                  <input className="ef-input" value={form.tipo || ""} onChange={e => set("tipo", e.target.value.toUpperCase())} placeholder="Ej. DA19ZZ" readOnly={esVendedor} />
                </FormField>
                <FormField label="Color Exterior">
                  <select className="ef-input" value={form.colorExterior || ""} onChange={e => set("colorExterior", e.target.value)} disabled={esVendedor}>
                    <option value="">—</option>
                    {COLORES_EXT.map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Color Interior">
                  <select className="ef-input" value={form.colorInterior || ""} onChange={e => set("colorInterior", e.target.value)} disabled={esVendedor}>
                    <option value="">—</option>
                    {COLORES_INT.map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Observaciones">
                  <textarea className="ef-input ef-textarea ef-span2" value={form.observaciones || ""}
                    onChange={e => set("observaciones", e.target.value)} rows={2} readOnly={esVendedor} />
                </FormField>
              </div>
            </div>

            {/* ── Sección: plan piso ─────────────────────────────────── */}
            {!esVendedor && <div className="ef-seccion">
              <div className="ef-sec-head">{I.coins({ width:15, height:15 })} Plan Piso</div>
              <div className="ef-grid-2">
                <FormField label="Monto Financiado ($)" required>
                  <input className="ef-input" type="number" step="0.01"
                    value={form.montoFinanciado || ""}
                    onChange={e => set("montoFinanciado", parseFloat(e.target.value) || 0)} />
                </FormField>
                <FormField label="Tasa anual (%)">
                  <input className="ef-input" type="number" step="0.001"
                    value={form.pctInteres ? (form.pctInteres * 100).toFixed(2) : ""}
                    onChange={e => set("pctInteres", (parseFloat(e.target.value) || 0) / 100)} />
                </FormField>
                <FormField label="Días de gracia base">
                  <input className="ef-input" type="number"
                    value={form.diasGraciaBase || 0}
                    onChange={e => set("diasGraciaBase", parseInt(e.target.value) || 0)} />
                </FormField>
                <FormField label="Días de gracia extra">
                  <input className="ef-input" type="number"
                    value={form.diasGraciaExtra || 0}
                    onChange={e => set("diasGraciaExtra", parseInt(e.target.value) || 0)} />
                </FormField>
                <FormField label="Fecha Factura" required>
                  <input className="ef-input" type="date"
                    value={toInputDate(form.fechaFactura)}
                    onChange={e => set("fechaFactura", e.target.value ? new Date(e.target.value + "T12:00:00") : new Date())} />
                </FormField>
                <FormField label="Fecha Llegada">
                  <input className="ef-input" type="date"
                    value={toInputDate(form.fechaLlegada)}
                    onChange={e => set("fechaLlegada", e.target.value ? new Date(e.target.value + "T12:00:00") : new Date())} />
                </FormField>
              </div>
            </div>}

            {/* ── Campos calculados ─────────────────────────────────────── */}
            {!esVendedor && calc && (
              <div className="ef-seccion ef-calc-sec">
                <div className="ef-sec-head">
                  <span>🤖</span> Campos Calculados
                  <span className="ef-calc-badge">Solo lectura</span>
                </div>
                <div className="ef-calc-grid">
                  <CalcField label="Semáforo"
                    value={
                      <span className="sem-chip" style={{ background:SEM[calc.semaforo].bg, color:SEM[calc.semaforo].txt }}>
                        <span className="sc-dot" style={{ background:SEM[calc.semaforo].sol }} />{SEM[calc.semaforo].label}
                      </span>
                    } />
                  <CalcField label="Días de gracia total"   value={calc.diasGraciaTotal + " días"} />
                  <CalcField label="Fecha vencimiento"       value={calc.fechaVencTxt || "—"} />
                  <CalcField label="Días en piso"            value={calc.diasEnPiso + " días"} />
                  <CalcField label="Días libres restantes"
                    value={calc.diasLibresRestantes + " días"}
                    neg={calc.diasLibresRestantes < 0} warn={calc.diasLibresRestantes >= 0 && calc.diasLibresRestantes <= 15} />
                  <CalcField label="Días vencidos"
                    value={calc.diasVencidos > 0 ? calc.diasVencidos + " días" : "—"}
                    neg={calc.diasVencidos > 0} />
                  <CalcField label="Interés diario"          value={fmtMoney(calc.interesDiario, 2) + " / día"} />
                  <CalcField label="Interés acumulado"
                    value={fmtMoney(calc.interesAcum, 2)}
                    neg={calc.interesAcum > 0} />
                  <CalcField label="% Plan consumido"
                    value={calc.pctPlanConsumido + "%"}
                    neg={calc.pctPlanConsumido > 100} warn={calc.pctPlanConsumido > 76 && calc.pctPlanConsumido <= 100} />
                </div>
              </div>
            )}

            {/* ── Jerarquía (multi-vendedor) — solo gerente/director ──────── */}
            {!esVendedor && <JerarquiaSection
              vendedorIds={form.vendedorIds || (form.vendedorId ? [form.vendedorId] : [])}
              usuarios={usuarios || []}
              onChange={vids => {
                const vid0 = vids[0] || null;
                setForm(f => ({ ...f, vendedorIds: vids, vendedorId: vid0 }));
                setDirty(true);
                if (window.AUTOMIND && window.AUTOMIND.enrichRowVendedor) {
                  const tmp = { ...form, vendedorIds: vids, vendedorId: vid0 };
                  window.AUTOMIND.enrichRowVendedor(tmp, window.AUTOMIND.USUARIOS || []);
                  setForm(f => ({ ...f, vendedorIds: vids, vendedorId: vid0, ...tmp }));
                }
              }}
            />}

            {/* ── Botón eliminar (solo director/gerente) ──────────────── */}
            {!esVendedor && selId && (
              <div style={{ padding:"8px 0 8px", display:"flex", justifyContent:"flex-end" }}>
                <button
                  className="btn danger"
                  style={{ gap:8, display:"flex", alignItems:"center" }}
                  onClick={() => setShowDel(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Eliminar unidad
                </button>
              </div>
            )}

            {/* Espacio inferior */}
            <div style={{ height:40 }} />
          </div>
        </div>
      ) : (
        <div className="inv-empty-state">
          <div className="inv-empty-icon">
            {I.truck({ width:32, height:32 })}
          </div>
          <h3>Sin unidad seleccionada</h3>
          <p>Selecciona una unidad de la lista o agrega una nueva para comenzar.</p>
          <button className="btn primary btn-sm inv-empty-btn" onClick={handleAdd}>+ Nueva unidad</button>
        </div>
      )}

      {/* ── Modal de confirmación de borrado ─────────────────────────── */}
      {showDel && (
        <>
          <div className="scrim" onClick={() => setShowDel(false)} />
          <div className="del-modal">
            <div className="del-modal-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="#e0492f" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>¿Eliminar esta unidad?</h3>
            <p>Se eliminará <b>{form?.vin || "esta unidad"}</b> del inventario. Esta acción no se puede deshacer.</p>
            <div className="del-modal-btns">
              <button className="btn danger" onClick={handleDelete}>Sí, eliminar</button>
              <button className="btn" onClick={() => setShowDel(false)}>Cancelar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { InventarioEditor });
