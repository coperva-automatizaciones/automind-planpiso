/* Automind · Vista Datos — cuadrícula de base de datos con pestañas, campos tipados y fórmulas */

function cellDisplay(col, row) {
  const v = row[col.key];
  if (v == null || v === "") return "";
  if (col.key === "semaforo") return SEM[v]?.label ?? v;
  if (col.fmt === "money") return fmtMoney(v);
  if (col.fmt === "money2") return fmtMoney(v, 2);
  if (col.fmt === "pct") return fmtPct(v, 1);
  if (col.fmt === "pct2") return fmtPct(v, 2);
  return v;
}

const ESTATUS_TONE = {
  NUEVOS: { bg: "#e7eefc", txt: "#1c4fcc" },
  DEMO: { bg: "#fbf2da", txt: "#9a6a06" },
  SEMINUEVOS: { bg: "#eef1f6", txt: "#5b6478" },
  USADOS: { bg: "#eef1f6", txt: "#5b6478" },
};

/* Icono de tipo de campo, estilo cuadrícula de datos */
function FieldType({ t }) {
  const map = {
    text: <span className="ft ft-a">A</span>,
    num: <span className="ft">#</span>,
    money: <span className="ft">$</span>,
    pct: <span className="ft">%</span>,
    date: <span className="ft ft-svg">{I.clock({ width: 12, height: 12 })}</span>,
    select: <span className="ft ft-svg">{I.chevron({ width: 12, height: 12, style: { transform: "rotate(90deg)" } })}</span>,
    calc: <span className="ft ft-fx">{I.fx({ width: 12, height: 12 })}</span>,
  };
  return map[t] || map.text;
}

function Grid({ tabla, openVehicle, usuarioActual }) {
  const cols = tabla.cols;
  const [sel,         setSel]         = React.useState({ r: 0, c: 0 });
  const [editing,     setEditing]     = React.useState(null);
  const [saving,      setSaving]      = React.useState(null);
  const [q,           setQ]           = React.useState("");
  const [sem,         setSem]         = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [bulkConfirm, setBulkConfirm] = React.useState(false);
  const [bulkWord,    setBulkWord]    = React.useState("");
  const [renderKey,   setRenderKey]   = React.useState(0);
  const inputRef = React.useRef();

  React.useEffect(() => {
    setSel({ r: 0, c: 0 }); setQ(""); setSem(""); setEditing(null);
    setSelectedIds(new Set()); setBulkConfirm(false); setBulkWord("");
  }, [tabla.id]);

  // Focus input when edit starts
  React.useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  // Solo el inventario soporta edición/eliminación inline: commitEdit y deleteRow
  // operan sobre AUTOMIND.ROWS y la tabla `inventario` de Supabase.
  const esInventario = tabla.id === "inventario";

  // Solo superadmin, gerente y director pueden hacer borrado masivo
  const puedeEliminarMasivo = esInventario && (
    usuarioActual?.isSuperAdmin ||
    usuarioActual?.isAgencyOwner ||
    usuarioActual?.rol === "gerente" ||
    usuarioActual?.rol === "director"
  );

  const allSelected  = puedeEliminarMasivo && tabla.rows.length > 0 && tabla.rows.every(r => selectedIds.has(r.id));
  const someSelected = puedeEliminarMasivo && selectedIds.size > 0;

  function toggleSelect(id, e) {
    e && e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(tabla.rows.map(r => r.id)));
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    const A   = window.AUTOMIND;
    if (!A) return;
    setBulkConfirm(false);
    setBulkWord("");
    let errores = 0;
    for (const id of ids) {
      try { await window.DB.deleteVehicle(id); }
      catch(e) { console.error("Error eliminando", id, e); errores++; }
    }
    const idsSet = new Set(ids);
    A.ROWS = A.ROWS.filter(r => !idsSet.has(r.id));
    const tab = A.TABLAS && A.TABLAS.find(t => t.id === tabla.id);
    if (tab) tab.rows = A.ROWS;
    setSelectedIds(new Set());
    setSel({ r: 0, c: 0 });
    setRenderKey(k => k + 1);
    if (errores) alert(`${errores} registro(s) no pudieron eliminarse. Intenta de nuevo.`);
  }

  // Campos NO editables (calculados o protegidos)
  const esEditable = (col) => esInventario && col.tipo !== "calc" && col.key !== "id" && col.key !== "semaforo";

  function startEdit(ri, ci, row, col) {
    if (!esEditable(col)) return;
    const raw = row[col.key];
    setEditing({ r: ri, c: ci, rowId: row.id, key: col.key, col,
      value: raw == null ? "" : String(raw) });
  }

  async function commitEdit() {
    if (!editing) return;
    const { rowId, key, col, value } = editing;
    setEditing(null);

    // Encontrar la fila en AUTOMIND.ROWS
    const A = window.AUTOMIND;
    if (!A || !window.DB) return;
    const rowIdx = A.ROWS.findIndex(r => r.id === rowId);
    if (rowIdx < 0) return;

    // Parsear el valor según el tipo
    let parsed = value;
    if (col.ftype === "num" || col.fmt === "money" || col.fmt === "money2") {
      parsed = Number(String(value).replace(/[$,\s]/g, "")) || 0;
    } else if (col.fmt === "pct" || col.fmt === "pct2") {
      // Si entra "14" lo interpretamos como 14% → 0.14
      const n = parseFloat(value);
      parsed = n > 1 ? n / 100 : n;
    }

    // Actualizar en memoria
    A.ROWS[rowIdx] = { ...A.ROWS[rowIdx], [key]: parsed };
    // Sync tabla
    const tab = A.TABLAS && A.TABLAS.find(t => t.id === "inventario");
    if (tab) tab.rows = A.ROWS;

    // Guardar en Supabase
    setSaving(rowId);
    try {
      await window.DB.saveVehicle(A.agencyId, A.ROWS[rowIdx]);
    } catch(e) {
      console.error("Error guardando:", e.message);
    } finally {
      setSaving(null);
    }
  }

  function cancelEdit() { setEditing(null); }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") cancelEdit();
  }

  // ── Todos los hooks ANTES del return condicional (regla de hooks de React) ──
  // Antes estos hooks estaban después del early-return de tabla vacía, lo que
  // rompía la vista al cambiar entre pestañas con y sin columnas.

  // Menú contextual de fila
  const [ctxMenu, setCtxMenu] = React.useState(null); // { x, y, row }
  const [delConfirm, setDelConfirm] = React.useState(null); // row a eliminar

  const hasSem = cols.some((c) => c.key === "semaforo");
  const data = tabla.rows.filter((r) => {
    if (hasSem && sem && r.semaforo !== sem) return false;
    if (q) {
      const t = cols.map((c) => r[c.key]).join(" ").toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Cerrar menú al hacer clic fuera
  React.useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [ctxMenu]);

  // Tecla Delete para eliminar fila seleccionada (solo inventario)
  React.useEffect(() => {
    function onKey(e) {
      // No interceptar cuando el usuario escribe en un campo (buscador, selects…)
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!esInventario) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel && !editing) {
        const r = data[sel.r];
        if (r) setDelConfirm(r);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sel, editing, data, esInventario]);

  async function deleteRow(r) {
    setDelConfirm(null);
    if (!esInventario) return; // deleteVehicle opera sobre `inventario`
    const A = window.AUTOMIND;
    if (!A) return;
    // Eliminar primero en Supabase; solo quitar de memoria si tuvo éxito
    if (window.DB) {
      try {
        await window.DB.deleteVehicle(r.id);
      } catch(e) {
        console.error(e);
        alert("No se pudo eliminar el registro. Intenta de nuevo.");
        return;
      }
    }
    A.ROWS = A.ROWS.filter(x => x.id !== r.id);
    const tab = A.TABLAS && A.TABLAS.find(t => t.id === tabla.id);
    if (tab) tab.rows = A.ROWS;
    // Forzar re-render actualizando sel
    setSel({ r: 0, c: 0 });
  }

  if (!cols.length) {
    return (
      <div className="grid-empty">
        <span className="ge-ico">{I.table({ width: 30, height: 30 })}</span>
        <h3>{tabla.nombre}</h3>
        <p>Esta tabla existe en tu base pero aún no tiene datos de ejemplo cargados aquí.<br />Conéctala para ver y editar sus registros con fórmulas.</p>
        <span className="ph-tag">Sin datos de ejemplo</span>
      </div>
    );
  }

  const col = cols[sel.c];
  const row = data[sel.r] || data[0];
  const isCalc = col && col.tipo === "calc";
  const formulaTxt = col ? (isCalc ? col.formula : (row ? String(cellDisplay(col, row)) : "")) : "";
  const resultTxt = row && col ? String(cellDisplay(col, row)) : "";

  // sumas de pie
  const sums = cols.map((c) => (c.sum ? data.reduce((a, r) => a + (Number(r[c.key]) || 0), 0) : null));

  return (
    <div className="grid-shell">
      {/* Barra de fórmulas */}
      <div className="fbar">
        <span className="fbar-ref">{col ? col.titulo : ""}{row ? " · reg. " + (sel.r + 2) : ""}</span>
        <span className="fbar-fx">{I.fx({ width: 16, height: 16 })}</span>
        <span className={"fbar-input" + (isCalc ? " calc" : "")}>
          {isCalc ? <code>{formulaTxt}</code> : <span className="fbar-val">{formulaTxt}</span>}
        </span>
        {isCalc && <span className="fbar-result">= <b>{resultTxt}</b></span>}
      </div>

      {/* Toolbar */}
      <div className="db-toolbar">
        <label className="search">
          {I.search({ width: 16, height: 16 })}
          <input placeholder={"Buscar en " + tabla.nombre + "…"} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {hasSem && (
          <select value={sem} onChange={(e) => setSem(e.target.value)}>
            <option value="">Todo semáforo</option>
            <option value="saludable">🟢 Saludable</option>
            <option value="rotacion">🟡 Rotación media</option>
            <option value="comprometido">🟠 Comprometido</option>
            <option value="vencer">🔴 Próx. vencer</option>
            <option value="intereses">⚫ En intereses</option>
          </select>
        )}
        <span className="db-count">{data.length} registros</span>
        <span className="db-legend">
          <span className="dl in">Datos</span>
          <span className="dl calc">{I.fx({ width: 12, height: 12 })} Fórmula</span>
        </span>
      </div>

      {/* ── Barra de selección masiva ── */}
      {someSelected && (
        <div className="bulk-action-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          <span className="bulk-count">
            {selectedIds.size} unidad{selectedIds.size !== 1 ? "es" : ""} seleccionada{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <button className="btn btn-sm bulk-cancel" onClick={() => setSelectedIds(new Set())}>Cancelar</button>
          <button className="btn btn-sm danger" onClick={() => { setBulkWord(""); setBulkConfirm(true); }}>
            Eliminar selección
          </button>
        </div>
      )}

      {/* Cuadrícula */}
      <div className="sheet-scroll">
        <table className="sheet grid">
          <thead>
            <tr>
              <th className="rownum corner"></th>
              {puedeEliminarMasivo && (
                <th className="chk-col" title="Seleccionar todo">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              {cols.map((c, ci) => (
                <th key={c.key} style={{ width: c.w }}
                  className={(c.tipo === "calc" ? "calc " : "") + (sel.c === ci ? "hl " : "") + (c.align === "right" ? "r" : "")}>
                  <span className="th-inner"><FieldType t={c.ftype} /> {c.titulo}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, ri) => (
              <tr key={r.id} className={"" + (sel.r === ri ? "rsel " : "") + (selectedIds.has(r.id) ? "row-selected " : "")}>
                <td className={"rownum" + (sel.r === ri ? " hl" : "")}
                  onClick={() => { setSel({r:ri, c:sel.c}); tabla.fichas && openVehicle(r); }}
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x:e.clientX, y:e.clientY, row:r, ri }); }}>
                  <span className="rn-n">{ri + 1}</span>
                  {tabla.fichas && <span className="rn-exp">{I.arrowUR({ width: 12, height: 12 })}</span>}
                </td>
                {puedeEliminarMasivo && (
                  <td className="chk-col" onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}>
                    <input type="checkbox" checked={selectedIds.has(r.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); toggleSelect(r.id); }} />
                  </td>
                )}
                {cols.map((c, ci) => {
                  const calc   = c.tipo === "calc";
                  const seld   = sel.r === ri && sel.c === ci;
                  const isEdit = editing && editing.r === ri && editing.c === ci;
                  const isSav  = saving === r.id;
                  let cls = "cell " + (calc ? "calc " : "") + (c.align === "right" ? "r " : "") + (seld ? "sel " : "");
                  if (c.key === "interesPctMonto" && r.interesPctMonto >= 0.035) cls += "neg ";
                  if (c.key === "diasRestantes" && r.diasRestantes <= 0) cls += "neg ";
                  if (c.key === "diasRestantes" && r.diasRestantes > 0 && r.proximoVencer) cls += "warn ";
                  if (esEditable(c) && !calc) cls += "editable-cell ";
                  return (
                    <td key={c.key} className={cls} style={{ width: c.w, position:"relative" }}
                      onClick={() => setSel({ r: ri, c: ci })}
                      onDoubleClick={() => {
                        if (esEditable(c)) startEdit(ri, ci, r, c);
                        else if (tabla.fichas) openVehicle(r);
                      }}>
                      {isEdit ? (
                        <input
                          ref={inputRef}
                          className="cell-edit-input"
                          value={editing.value}
                          onChange={e => setEditing(ed => ({...ed, value: e.target.value}))}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                        />
                      ) : isSav ? (
                        <span style={{ opacity:.5 }}>{cellDisplay(c, r)}</span>
                      ) : c.key === "semaforo" && SEM[r.semaforo] ? (
                        <span className="sem-chip" style={{ background: SEM[r.semaforo].bg, color: SEM[r.semaforo].txt }}>
                          <span className="sc-dot" style={{ background: SEM[r.semaforo].sol }} />{SEM[r.semaforo].label}
                        </span>
                      ) : c.key === "estatus" ? (
                        <span className="estatus-badge" style={{ background: (ESTATUS_TONE[r.estatus] || ESTATUS_TONE.USADOS).bg, color: (ESTATUS_TONE[r.estatus] || ESTATUS_TONE.USADOS).txt }}>{r.estatus}</span>
                      ) : c.key === "rol" && r.rol ? (
                        <RolBadge rol={r.rol} />
                      ) : (c.key === "email" || c.key.toLowerCase().includes("email")) && r[c.key] && r[c.key] !== "—" ? (
                        <span style={{ color:"var(--accent)", fontSize:"12.5px" }}>{r[c.key]}</span>
                      ) : cellDisplay(c, r)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="rownum corner foot"></td>
              {puedeEliminarMasivo && <td className="chk-col foot"></td>}
              {cols.map((c, ci) => (
                <td key={c.key} className={"foot " + (c.align === "right" ? "r" : "")} style={{ width: c.w }}>
                  {sums[ci] != null ? <><span className="foot-lbl">Suma</span> {(c.fmt === "money" || c.fmt === "money2") ? fmtMoney(sums[ci]) : fmtNum(Math.round(sums[ci]))}</> : ci === 0 ? <span className="foot-lbl">{data.length} reg.</span> : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Menú contextual de fila ── */}
      {ctxMenu && (
        <div className="row-ctx-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}>
          {tabla.fichas && (
            <button className="ctx-item" onClick={() => { openVehicle(ctxMenu.row); setCtxMenu(null); }}>
              <span>{I.arrowUR({ width:14, height:14 })}</span> Abrir ficha
            </button>
          )}
          {esInventario && <div className="ctx-sep" />}
          {esInventario && <button className="ctx-item danger" onClick={() => { setDelConfirm(ctxMenu.row); setCtxMenu(null); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
            Eliminar fila
          </button>}
        </div>
      )}

      {/* ── Modal confirmación de eliminación individual ── */}
      {delConfirm && (
        <>
          <div className="del-modal-scrim" onClick={() => setDelConfirm(null)} />
          <div className="del-modal" style={{ zIndex:1001 }}>
            <div className="del-modal-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="#e0492f" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </div>
            <h3>Eliminar registro</h3>
            <p>
              ¿Eliminar <b>{delConfirm.vin || delConfirm.id || delConfirm.nombre}</b>?
              Esta acción no se puede deshacer.
            </p>
            <div className="del-modal-btns">
              <button className="btn" onClick={() => setDelConfirm(null)}>Cancelar</button>
              <button className="btn danger" onClick={() => deleteRow(delConfirm)}>Eliminar</button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal confirmación borrado masivo — requiere escribir "Borrar" ── */}
      {bulkConfirm && (
        <>
          <div className="del-modal-scrim" onClick={() => setBulkConfirm(false)} />
          <div className="del-modal" style={{ zIndex:1002 }}>
            <div className="del-modal-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="#e0492f" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </div>
            <h3>Eliminar {selectedIds.size} unidades</h3>
            <p>
              Vas a eliminar permanentemente{" "}
              <b>{selectedIds.size} vehículo{selectedIds.size !== 1 ? "s" : ""}</b> del inventario.
              Esta acción <b>no se puede deshacer</b>.
            </p>
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:6 }}>
              Escribe <b style={{ color:"var(--ink)" }}>Borrar</b> para confirmar:
            </p>
            <input
              className="bulk-word-input"
              placeholder="Borrar"
              value={bulkWord}
              onChange={e => setBulkWord(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter" && bulkWord === "Borrar") bulkDelete(); }}
            />
            <div className="del-modal-btns">
              <button className="btn" onClick={() => { setBulkConfirm(false); setBulkWord(""); }}>
                Cancelar
              </button>
              <button className="btn danger" disabled={bulkWord !== "Borrar"} onClick={bulkDelete}>
                Eliminar {selectedIds.size} unidades
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Database({ tablas, tablaId, setTablaId, openVehicle, onAddColab, usuarioActual }) {
  const tabla = tablas.find((t) => t.id === tablaId) || tablas[0];
  return (
    <div className="page db-page">
      <div className="page-head tight" style={{ marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>Datos · Inventario</h1>
          <span style={{ fontSize:12, color:"var(--muted)", fontWeight:500 }}>
            Columnas <span className="fx-inline" style={{ display:"inline-flex", alignItems:"center", gap:3 }}>{I.fx({ width:12, height:12 })}<i>fx</i></span> = calculadas
          </span>
        </div>
      </div>

      {/* Pestañas de tablas */}
      <div className="tab-bar" style={{ alignItems:"center" }}>
        {tablas.map((t) => (
          <button key={t.id} className={"tab" + (t.id === tabla.id ? " on" : "")} onClick={() => setTablaId(t.id)}>
            {t.nombre}
            {!t.cols.length && <span className="tab-empty" title="Sin datos de ejemplo">○</span>}
          </button>
        ))}
        <button className="tab add" title="Agregar tabla">+</button>
        {tabla.id === "colaboradores" && onAddColab && (
          <button className="btn primary btn-sm" style={{ marginLeft:"auto", marginRight:"4px" }}
            onClick={onAddColab}>
            + Agregar colaborador
          </button>
        )}
      </div>

      <Grid tabla={tabla} openVehicle={openVehicle} usuarioActual={usuarioActual} />
    </div>
  );
}

Object.assign(window, { Database });
