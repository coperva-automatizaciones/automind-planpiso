/* Automind · Dashboard — layout operativo con estilo profesional */

const SEM_ORDEN = ["intereses", "vencer", "comprometido", "rotacion", "saludable"];

/* ── Helpers ────────────────────────────────────────────────── */
function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

/* ── KPI card superior — estilo mini-kpi con icono ─────────── */
function TopKpi({ label, value, sub, icon, icoColor, icoBg }) {
  return (
    <div className="mini-kpi">
      <div className="mk-ico" style={{ background: icoBg, color: icoColor }}>
        {icon}
      </div>
      <div className="mk-body">
        <div className="mk-label">{label}</div>
        <div className="mk-value" style={{ color: icoColor !== "var(--accent)" ? icoColor : "var(--ink)" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Card wrapper ───────────────────────────────────────────── */
function Card({ children, style }) {
  return <div className="dcard" style={style}>{children}</div>;
}

function CardHead({ title, badge }) {
  return (
    <div className="dcard-h">
      <span className="dcard-title">{title}</span>
      {badge !== undefined && <span className="dcard-badge">{badge}</span>}
    </div>
  );
}

/* ── Barra apilada (distribución semáforo) ──────────────────── */
function StackedBar({ rows }) {
  const total = rows.length || 1;
  return (
    <div style={{ padding: "12px 16px 10px" }}>
      <div style={{ height: 14, display: "flex", borderRadius: 7, overflow: "hidden", gap: 1.5 }}>
        {SEM_ORDEN.map(k => {
          const pct = (rows.filter(r => r.semaforo === k).length / total) * 100;
          if (!pct) return null;
          return <div key={k} style={{ width: pct + "%", background: SEM[k].sol, height: "100%" }} />;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", marginTop: 9 }}>
        {SEM_ORDEN.map(k => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEM[k].sol, display: "inline-block", flexShrink: 0 }} />
            {SEM[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Tabla semáforo ─────────────────────────────────────────── */
function TablaSemaforo({ rows, kpis, filters, setFilters, ocultarInteres }) {
  const total  = rows.length || 1;
  const { sem } = filters;
  const setSem = k => setFilters(f => ({ ...f, sem: f.sem === k ? null : k }));

  return (
    <Card>
      <CardHead title="Estado del semáforo" badge={rows.length + " unidades"} />
      <StackedBar rows={rows} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Estado", "Unidades", "% Inventario", "Distribución", ...(ocultarInteres ? [] : ["Interés acum."])].map((h, i) => (
              <th key={h} style={{
                padding: "6px 16px 8px", fontSize: 10, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700,
                textAlign: i === 0 ? "left" : i === 3 ? "left" : "right",
                borderBottom: "1.5px solid var(--line)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEM_ORDEN.map(k => {
            const count    = kpis[k] || 0;
            const pct      = Math.round((count / total) * 100);
            const isAct    = sem === k;
            const interesK = k === "intereses" ? (kpis.interesTotal || 0) : null;
            return (
              <tr key={k} onClick={() => setSem(k)}
                style={{ cursor: "pointer", background: isAct ? SEM[k].bg : "transparent", transition: "background .12s" }}>
                <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: SEM[k].sol, flexShrink: 0,
                      boxShadow: `0 0 0 2.5px color-mix(in srgb, ${SEM[k].sol} 22%, transparent)` }} />
                    {SEM[k].label}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right", borderBottom: "1px solid var(--line-2)" }}>
                  <b style={{ fontSize: 15, fontWeight: 700, color: (k === "intereses" || k === "vencer") ? "#e0492f" : "var(--ink)" }}>{count}</b>
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--muted)", borderBottom: "1px solid var(--line-2)" }}>
                  {pct}%
                </td>
                <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", minWidth: 120 }}>
                  <div style={{ height: 8, background: "var(--line-2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: SEM[k].sol, borderRadius: 4, transition: "width .35s" }} />
                  </div>
                </td>
                {!ocultarInteres && (
                  <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, borderBottom: "1px solid var(--line-2)", color: interesK ? "#e0492f" : "var(--muted)" }}>
                    {interesK ? fmtMoney(interesK, 0) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ── Días promedio por semáforo ─────────────────────────────── */
function DiasPorSemaforo({ rows }) {
  const maxDias = Math.max(...SEM_ORDEN.map(k => avg(rows.filter(r => r.semaforo === k).map(r => r.diasEnPiso || 0))), 1);
  return (
    <Card>
      <CardHead title="Días promedio en piso" badge="por semáforo" />
      <div style={{ padding: "4px 0 6px" }}>
        {SEM_ORDEN.map(k => {
          const group = rows.filter(r => r.semaforo === k);
          const dias  = avg(group.map(r => r.diasEnPiso || 0));
          const pct   = maxDias ? (dias / maxDias) * 100 : 0;
          return (
            <div key={k} className="drow">
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--ink)", width: 124, flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEM[k].sol, flexShrink: 0 }} />
                {SEM[k].label}
              </span>
              <div className="dbar" style={{ height: 7, borderRadius: 4 }}>
                <div className="dbar-fill" style={{ width: pct + "%", background: SEM[k].sol, borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 62 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{dias} días</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{group.length} uds.</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Por modelo ─────────────────────────────────────────────── */
function PorModelo({ rows, filters, setFilters }) {
  const [showAll, setShowAll] = React.useState(false);
  const modelos = {};
  rows.forEach(r => {
    const m = r.modelo || "Sin modelo";
    if (!modelos[m]) modelos[m] = { total: 0, alertas: 0 };
    modelos[m].total++;
    if (r.semaforo === "intereses" || r.semaforo === "vencer") modelos[m].alertas++;
  });
  const sorted   = Object.entries(modelos).sort((a, b) => b[1].total - a[1].total);
  const list     = showAll ? sorted : sorted.slice(0, 7);
  const maxUnits = sorted[0]?.[1]?.total || 1;
  const hayMas   = sorted.length > 7;

  return (
    <Card>
      <CardHead title="Por modelo" />
      {list.map(([modelo, d]) => (
        <div key={modelo}
          onClick={() => setFilters(f => ({ ...f, modelo: f.modelo === modelo ? null : modelo }))}
          className="drow"
          style={{ cursor: "pointer", background: filters.modelo === modelo ? "var(--bg)" : "transparent",
            transition: "background .12s", gap: 10 }}>
          <span style={{ flex: 1, fontWeight: 600, color: "var(--ink)", fontSize: 12,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {modelo}
          </span>
          <div style={{ width: 52, height: 5, background: "var(--line-2)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
            <div style={{ width: ((d.total / maxUnits) * 100) + "%", height: "100%", background: "var(--accent)", borderRadius: 3 }} />
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>
            {d.total} uds.
            {d.alertas > 0 && (
              <span style={{ background: "#fcebe7", color: "#e0492f", fontWeight: 700, fontSize: 10, padding: "1px 7px", borderRadius: 20 }}>
                {d.alertas} ⚠
              </span>
            )}
          </span>
        </div>
      ))}
      {!sorted.length && <div style={{ padding: "20px 16px", color: "var(--muted)", fontSize: 12 }}>Sin datos</div>}
      {hayMas && (
        <div style={{ padding: "8px 16px 10px", borderTop: "1px solid var(--line-2)", marginTop: 2 }}>
          <button onClick={() => setShowAll(s => !s)}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "none", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            {showAll ? "Ver menos" : "Ver todos los modelos (" + sorted.length + ")"} {I.chevron({ width: 13, height: 13 })}
          </button>
        </div>
      )}
    </Card>
  );
}

/* ── Antigüedad ─────────────────────────────────────────────── */
function Antiguedad({ rows }) {
  const tramos = [
    { label: "0 – 30 días",  fn: r => r.diasEnPiso <= 30,                      color: "#1f9d57" },
    { label: "31 – 60 días", fn: r => r.diasEnPiso > 30 && r.diasEnPiso <= 60, color: "#d99613" },
    { label: "61 – 90 días", fn: r => r.diasEnPiso > 60 && r.diasEnPiso <= 90, color: "#e07a20" },
    { label: "+ 90 días",    fn: r => r.diasEnPiso > 90,                        color: "#e0492f" },
  ];
  const max = Math.max(...tramos.map(t => rows.filter(t.fn).length), 1);
  return (
    <Card>
      <CardHead title="Antigüedad del inventario" />
      {tramos.map(t => {
        const count = rows.filter(t.fn).length;
        return (
          <div key={t.label} className="drow" style={{ gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", width: 86, flexShrink: 0 }}>{t.label}</span>
            <div className="dbar" style={{ height: 7, borderRadius: 4 }}>
              <div className="dbar-fill" style={{ width: ((count / max) * 100) + "%", background: t.color, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? t.color : "var(--muted)", minWidth: 22, textAlign: "right" }}>{count}</span>
          </div>
        );
      })}
    </Card>
  );
}

/* ── Carga por vendedor ─────────────────────────────────────── */
function CargaVendedor({ rows, usuarios }) {
  const AVCOLORS = [
    { bg: "#e6f1fb", txt: "#185fa5" },
    { bg: "#eaf3de", txt: "#3b6d11" },
    { bg: "#faeeda", txt: "#854f0b" },
    { bg: "#fbeaf0", txt: "#993556" },
    { bg: "#f1efe8", txt: "#5f5e5a" },
    { bg: "#fcebe7", txt: "#a32d2d" },
  ];
  const vendedores = (usuarios || [])
    .map(v => ({
      ...v,
      total:   rows.filter(r => (r.vendedorIds || (r.vendedorId ? [r.vendedorId] : [])).includes(v.id)).length,
      alertas: rows.filter(r => (r.vendedorIds || (r.vendedorId ? [r.vendedorId] : [])).includes(v.id) && (r.semaforo === "intereses" || r.semaforo === "vencer")).length,
    }))
    .filter(v => v.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const sinAsignar = rows.filter(r => {
    const ids = r.vendedorIds || (r.vendedorId ? [r.vendedorId] : []);
    return ids.length === 0;
  }).length;
  const maxUnits = Math.max(...vendedores.map(v => v.total), sinAsignar, 1);

  return (
    <Card>
      <CardHead title="Carga por vendedor" />
      {vendedores.map((v, i) => {
        const { bg, txt } = AVCOLORS[i] || AVCOLORS[0];
        const initials    = v.nombre.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
        return (
          <div key={v.id} className="drow" style={{ gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: bg, color: txt,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--ink)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {v.nombre.split(" ").slice(0, 2).join(" ")}
            </span>
            <div style={{ width: 70, height: 6, background: "var(--line-2)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ width: ((v.total / maxUnits) * 100) + "%", height: "100%", background: "var(--accent)", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", minWidth: 20, textAlign: "right" }}>{v.total}</span>
            {v.alertas > 0 && (
              <span style={{ fontSize: 10, color: "#e0492f", fontWeight: 700, minWidth: 18 }}>⚠{v.alertas}</span>
            )}
          </div>
        );
      })}
      {sinAsignar > 0 && (
        <div className="drow" style={{ borderBottom: "none", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--line-2)", color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
            {I.person({ width: 15, height: 15 })}
          </div>
          <span style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>Sin asignar</span>
          <div style={{ width: 70, height: 6, background: "var(--line-2)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
            <div style={{ width: ((sinAsignar / maxUnits) * 100) + "%", height: "100%", background: "#e0492f", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e0492f", minWidth: 20, textAlign: "right" }}>{sinAsignar}</span>
        </div>
      )}
      {!vendedores.length && !sinAsignar && (
        <div style={{ padding: "20px 16px", color: "var(--muted)", fontSize: 12 }}>Sin vendedores con unidades</div>
      )}
    </Card>
  );
}

/* ── Lista detallada (al fondo, collapsible) ────────────────── */
function ListaDetallada({ rows, filters, setFilters, openVehicle, usuarioActual }) {
  const [collapsed,  setCollapsed]  = React.useState({});
  const [modoSel,    setModoSel]    = React.useState(false);
  const [selIds,     setSelIds]     = React.useState(new Set());
  const [eliminando, setEliminando] = React.useState(false);
  const [confirmar,  setConfirmar]  = React.useState(false);

  const toggle = k => setCollapsed(c => ({ ...c, [k]: !c[k] }));

  // Solo gerente/director/agencyOwner pueden eliminar
  const puedeEliminar = !usuarioActual || usuarioActual.rol !== "vendedor";

  const { sem, fin, gerente, modelo } = filters;
  const filtered = rows.filter(r => {
    if (sem     && r.semaforo   !== sem)     return false;
    if (fin     && r.financiera !== fin)     return false;
    if (gerente && r.gerenteId  !== gerente) return false;
    if (modelo  && r.modelo     !== modelo)  return false;
    return true;
  });

  const grupos = SEM_ORDEN
    .map(k => ({ k, items: filtered.filter(r => r.semaforo === k) }))
    .filter(g => g.items.length);

  const todosIds   = grupos.flatMap(g => g.items.map(r => r.id));
  const todosSel   = todosIds.length > 0 && selIds.size === todosIds.length;
  const algunosSel = selIds.size > 0 && selIds.size < todosIds.length;

  const activeLabel = sem     ? SEM[sem].emoji + " " + SEM[sem].label
    : fin     ? fin
    : gerente ? "Gerente filtrado"
    : modelo  ? "Modelo · " + modelo
    : null;

  function toggleModoSel() {
    setModoSel(m => !m);
    setSelIds(new Set());
  }

  function toggleSel(id, e) {
    e.stopPropagation();
    setSelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selTodos(e) {
    e.stopPropagation();
    if (todosSel) {
      setSelIds(new Set());
    } else {
      setSelIds(new Set(todosIds));
    }
  }

  async function eliminarSeleccionados() {
    setConfirmar(false);
    setEliminando(true);
    const ids = Array.from(selIds);
    let errores = 0;
    for (const id of ids) {
      try {
        if (window.DB) await window.DB.deleteVehicle(id);
        if (window.AUTOMIND) {
          window.AUTOMIND.ROWS = window.AUTOMIND.ROWS.filter(r => r.id !== id);
          const tab = window.AUTOMIND.TABLAS && window.AUTOMIND.TABLAS.find(t => t.id === "inventario");
          if (tab) tab.rows = window.AUTOMIND.ROWS;
        }
      } catch(e) {
        errores++;
        console.error("Error eliminando:", id, e);
      }
    }
    setEliminando(false);
    setSelIds(new Set());
    setModoSel(false);
    // Forzar re-render del padre para que lea el AUTOMIND.ROWS actualizado
    setFilters(f => ({ ...f }));
    if (errores > 0) alert(errores + " unidad(es) no se pudieron eliminar. Intenta de nuevo.");
  }

  return (
    <Card style={{ marginTop: 10, position: "relative" }}>
      <div className="dcard-h">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="dcard-title">Lista detallada</span>
          {activeLabel && !modoSel && (
            <button className="chip-clear" onClick={() => setFilters({ sem: null, fin: null, gerente: null, modelo: null, urgente: false })}>
              {I.filter({ width: 12, height: 12 })} {activeLabel} · {filtered.length}
              <span className="cc-x">{I.close({ width: 11, height: 11 })}</span>
            </button>
          )}
          {modoSel && selIds.size > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c",
              background: "#fee2e2", padding: "2px 10px", borderRadius: 12 }}>
              {selIds.size} seleccionada{selIds.size !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!modoSel && (
            <>
              <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setCollapsed(grupos.reduce((a, g) => ({ ...a, [g.k]: true }), {}))}>Colapsar</button>
              <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setCollapsed({})}>Expandir</button>
            </>
          )}
          {puedeEliminar && (
            <button className="btn btn-sm" onClick={toggleModoSel}
              style={{ fontSize: 11, background: modoSel ? "#fee2e2" : "var(--card)",
                color: modoSel ? "#b91c1c" : "var(--ink-2)",
                border: modoSel ? "1px solid #fca5a5" : "1px solid var(--line)",
                fontWeight: modoSel ? 700 : 500 }}>
              {modoSel ? "✕ Cancelar" : "☑ Seleccionar"}
            </button>
          )}
        </div>
      </div>
      <div className="vlist">
        <div className="vrow vhead">
          {modoSel && (
            <span style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input type="checkbox" checked={todosSel} ref={el => { if (el) el.indeterminate = algunosSel; }}
                onChange={selTodos}
                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--accent)" }} />
            </span>
          )}
          <span>Vehículo</span>
          <span className="r">Días en piso</span>
          <span className="r">Días vencidos</span>
          {(!usuarioActual || usuarioActual.rol !== "vendedor") && <span className="r">Interés acum.</span>}
          <span className="r">% Plan</span>
          <span className="r">Días libres rest.</span>
          <span>Vendedor</span>
        </div>
        {grupos.map(g => (
          <React.Fragment key={g.k}>
            <button className="vgroup collapsible" style={{ "--sol": SEM[g.k].sol, "--bg": SEM[g.k].bg }} onClick={() => toggle(g.k)}>
              <span className="vg-chevron" style={{ transform: collapsed[g.k] ? "rotate(-90deg)" : "rotate(0deg)" }}>
                {I.chevron({ width: 14, height: 14, style: { transform: "rotate(90deg)" } })}
              </span>
              <span className="vg-dot" />
              <span style={{ fontWeight: 700 }}>{SEM[g.k].label}</span>
              <span className="vg-count">{g.items.length}</span>
            </button>
            {!collapsed[g.k] && g.items.map(r => {
              const uList   = window.AUTOMIND ? window.AUTOMIND.USUARIOS || [] : [];
              const vids    = r.vendedorIds || (r.vendedorId ? [r.vendedorId] : []);
              const vends   = r.vendedores || vids.map(id => uList.find(u => u.id === id)).filter(Boolean);
              const esYo    = usuarioActual && vids.includes(usuarioActual.id);
              const esSel   = selIds.has(r.id);
              function toggleAsignar(e) {
                e.stopPropagation();
                if (!usuarioActual) return;
                const prev = r.vendedorIds || (r.vendedorId ? [r.vendedorId] : []);
                r.vendedorIds = esYo ? prev.filter(id => id !== usuarioActual.id) : [...prev, usuarioActual.id];
                r.vendedorId  = r.vendedorIds[0] || null;
                if (window.AUTOMIND && window.AUTOMIND.enrichRowVendedor) {
                  window.AUTOMIND.enrichRowVendedor(r, window.AUTOMIND.USUARIOS || []);
                }
                if (window.DB && window.AUTOMIND && window.AUTOMIND.agencyId) {
                  window.DB.saveVehicle(window.AUTOMIND.agencyId, r).catch(err => {
                    console.error("Error guardando asignación:", err);
                    alert("No se pudo guardar la asignación.");
                  });
                }
                setFilters(f => ({ ...f }));
              }
              return (
                <button className={"vrow" + (esSel ? " vrow-sel" : "")} key={r.id}
                  onClick={modoSel ? (e) => toggleSel(r.id, e) : () => openVehicle(r)}>
                  {modoSel && (
                    <span style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      onClick={e => toggleSel(r.id, e)}>
                      <input type="checkbox" checked={esSel} onChange={() => {}}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--accent)" }} />
                    </span>
                  )}
                  <span className="v-name">
                    <b>{r.descripcion || [r.marca, r.modelo].filter(Boolean).join(" ") || "Sin descripción"}</b>
                    <small>{[r.tipo, r.anio, r.colorExterior, r.inv ? "INV " + r.inv : null].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="r">{r.diasEnPiso}</span>
                  <span className={"r " + (r.diasVencidos > 0 ? "neg" : "")}>{r.diasVencidos || "—"}</span>
                  {(!usuarioActual || usuarioActual.rol !== "vendedor") && <span className="r">{fmtMoney(r.interesAcum)}</span>}
                  <span className={"r " + (r.pctPlanConsumido > 100 ? "neg" : r.pctPlanConsumido > 76 ? "warn" : "")}>
                    {r.pctPlanConsumido}%
                  </span>
                  <span className={"r " + (r.diasLibresRestantes < 0 ? "neg" : r.diasLibresRestantes <= 15 ? "warn" : "")}>
                    {r.diasLibresRestantes}
                  </span>
                  <span className="v-vendedor" onClick={e => e.stopPropagation()}>
                    {vends.length > 0 ? (
                      <span className={"vend-chip" + (esYo ? " yo" : "")}>
                        <span className="vend-names">
                          <span className="vend-vend">{vends[0].nombre.split(" ")[0]}</span>
                          {vends.length > 1
                            ? <span className="vend-ger">+{vends.length - 1}</span>
                            : r.gerenteNombre ? <span className="vend-ger">{r.gerenteNombre.split(" ")[0]}</span> : null
                          }
                        </span>
                        {esYo && usuarioActual.rol !== "director" && !modoSel && (
                          <button className="vend-remove" onClick={toggleAsignar} title="Desasignarme">×</button>
                        )}
                      </span>
                    ) : (
                      usuarioActual && usuarioActual.rol !== "director" && !modoSel ? (
                        <button className="btn-asignar-sm" onClick={toggleAsignar}>Asignarme</button>
                      ) : <span className="vend-none">—</span>
                    )}
                  </span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
        {!filtered.length && <div className="empty">Sin unidades para este filtro.</div>}
      </div>

      {/* ── Barra flotante de eliminación masiva ── */}
      {modoSel && selIds.size > 0 && (
        <div style={{ position: "sticky", bottom: 16, left: 0, right: 0,
          margin: "12px 16px 0", padding: "12px 16px",
          background: "#1e293b", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,.25)",
          display: "flex", alignItems: "center", gap: 12, zIndex: 10 }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, flex: 1 }}>
            {selIds.size} unidad{selIds.size !== 1 ? "es" : ""} seleccionada{selIds.size !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setSelIds(new Set())}
            style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
              border: "1px solid #475569", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
            Deseleccionar todo
          </button>
          <button onClick={() => setConfirmar(true)} disabled={eliminando}
            style={{ fontSize: 13, fontWeight: 700, padding: "8px 18px", borderRadius: 8,
              border: "none", background: eliminando ? "#7f1d1d" : "#ef4444",
              color: "#fff", cursor: eliminando ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 6 }}>
            {eliminando ? "⏳ Eliminando…" : "🗑 Eliminar " + selIds.size}
          </button>
        </div>
      )}

      {/* ── Modal de confirmación ── */}
      {confirmar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setConfirmar(false)}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: "28px 32px",
            maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🗑</div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 18, color: "var(--ink)" }}>
              Eliminar {selIds.size} unidad{selIds.size !== 1 ? "es" : ""}
            </h3>
            <p style={{ margin: "0 0 24px", textAlign: "center", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Esta acción es permanente y no se puede deshacer.<br/>
              ¿Estás seguro de que quieres eliminar las unidades seleccionadas del inventario?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmar(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid var(--line)",
                  background: "var(--bg)", color: "var(--ink-2)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={eliminarSeleccionados}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none",
                  background: "#ef4444", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Vendidos del mes ───────────────────────────────────────── */
function VendidosMes({ rows }) {
  const HOY = new Date();
  const mesActual = HOY.getFullYear() * 100 + HOY.getMonth();
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const vendidos = rows.filter(r => {
    if (r.estadoVenta !== "VENDIDO") return false;
    if (!r.fechaVenta) return true;
    const fv = r.fechaVenta instanceof Date ? r.fechaVenta : new Date(r.fechaVenta);
    return fv.getFullYear() * 100 + fv.getMonth() === mesActual;
  });

  return (
    <Card>
      <CardHead title={"Vendidos · " + MESES[HOY.getMonth()]} badge={vendidos.length} />
      {vendidos.length === 0 ? (
        <div style={{ padding: "20px 16px", color: "var(--muted)", fontSize: 12 }}>Sin ventas registradas este mes.</div>
      ) : (
        <div style={{ padding: "0 0 4px" }}>
          {vendidos.map(r => {
            const fv = r.fechaVenta ? (r.fechaVenta instanceof Date ? r.fechaVenta : new Date(r.fechaVenta)) : null;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                borderBottom: "1px solid var(--line-2)", fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <b style={{ color: "var(--ink)", fontSize: 13 }}>
                    {r.descripcion || [r.marca, r.modelo].filter(Boolean).join(" ") || "Sin descripción"}
                  </b>
                  <br />
                  <span style={{ color: "var(--muted)" }}>
                    {[r.inv ? "INV " + r.inv : null, r.anio, r.colorExterior].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {fv && (
                  <span style={{ color: "var(--purple)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {fv.getDate()}/{fv.getMonth() + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ── Dashboard principal ────────────────────────────────────── */
function Dashboard({ rows, kpis, pivote, filters, setFilters, openVehicle, usuarioActual }) {
  const HOY        = new Date();
  const MESES      = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const mesActual  = HOY.getFullYear() * 100 + HOY.getMonth();

  const rowsActivos = rows.filter(r => r.estadoVenta !== "VENDIDO");
  const rowsVendidosMes = rows.filter(r => {
    if (r.estadoVenta !== "VENDIDO") return false;
    if (!r.fechaVenta) return true;
    const fv = r.fechaVenta instanceof Date ? r.fechaVenta : new Date(r.fechaVenta);
    return fv.getFullYear() * 100 + fv.getMonth() === mesActual;
  });

  const kpisActivos = {
    ...kpis,
    total:        rowsActivos.length,
    interesTotal: rowsActivos.reduce((s, r) => s + (r.interesAcum || 0), 0),
    intereses:    rowsActivos.filter(r => r.semaforo === "intereses").length,
    vencer:       rowsActivos.filter(r => r.semaforo === "vencer").length,
    comprometido: rowsActivos.filter(r => r.semaforo === "comprometido").length,
    rotacion:     rowsActivos.filter(r => r.semaforo === "rotacion").length,
    saludable:    rowsActivos.filter(r => r.semaforo === "saludable").length,
  };

  const criticas   = (kpisActivos.intereses || 0) + (kpisActivos.vencer || 0);
  const usuarios   = window.AUTOMIND ? window.AUTOMIND.USUARIOS || [] : [];

  return (
    <div className="page">

      {/* ── Encabezado con selector de período ── */}
      <div className="page-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Dashboard</h1>
          <p className="page-sub">Estado general de tus agentes y procesos</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: 9,
            fontSize: 13, fontWeight: 600, color: "var(--ink)", userSelect: "none" }}>
            {I.clock({ width: 14, height: 14 })}
            <span>{MESES[HOY.getMonth()]}</span>
            {I.chevron({ width: 13, height: 13 })}
          </div>
          <button onClick={() => setFilters({ sem: null, fin: null, gerente: null, modelo: null, urgente: false })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "var(--card)", border: "1px solid var(--line)", borderRadius: 9,
              fontSize: 13, fontWeight: 600, color: "var(--ink-2)", cursor: "pointer",
              transition: "background .12s" }}
            onMouseOver={e => e.currentTarget.style.background = "var(--bg)"}
            onMouseOut={e => e.currentTarget.style.background = "var(--card)"}>
            {I.filter({ width: 14, height: 14 })} Filtros
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="mini-grid">
        <TopKpi
          label="Total inventario"
          value={rowsActivos.length}
          sub="unidades en piso"
          icon={I.truck({ width: 20, height: 20 })}
          icoColor="var(--accent)"
          icoBg={`color-mix(in srgb, var(--accent) 12%, #fff)`}
        />
        <TopKpi
          label="Críticas"
          value={criticas}
          sub={rowsActivos.length ? Math.round((criticas / rowsActivos.length) * 100) + "% del inventario" : "—"}
          icon={I.bell({ width: 20, height: 20 })}
          icoColor={criticas > 0 ? "#e0492f" : "var(--accent)"}
          icoBg={criticas > 0 ? "#fcebe7" : `color-mix(in srgb, var(--accent) 12%, #fff)`}
        />
        {(!usuarioActual || usuarioActual.rol !== "vendedor") && (
          <TopKpi
            label="Interés acumulado"
            value={fmtMoney(kpisActivos.interesTotal || 0, 0)}
            sub={(kpisActivos.intereses || 0) + " unidades generando interés"}
            icon={I.coins({ width: 20, height: 20 })}
            icoColor={kpisActivos.interesTotal > 0 ? "#e07a20" : "var(--accent)"}
            icoBg={kpisActivos.interesTotal > 0 ? "#fdf0e6" : `color-mix(in srgb, var(--accent) 12%, #fff)`}
          />
        )}
        <TopKpi
          label="Vendidos este mes"
          value={rowsVendidosMes.length}
          sub="unidades cerradas"
          icon={I.sale({ width: 20, height: 20 })}
          icoColor={rowsVendidosMes.length > 0 ? "#1f9d57" : "var(--accent)"}
          icoBg={rowsVendidosMes.length > 0 ? "#e7f5ed" : `color-mix(in srgb, var(--accent) 12%, #fff)`}
        />
      </div>

      {/* ── Semáforo + Días promedio ── */}
      <div className="d-grid-2-1">
        <TablaSemaforo rows={rowsActivos} kpis={kpisActivos} filters={filters} setFilters={setFilters} ocultarInteres={usuarioActual && usuarioActual.rol === "vendedor"} />
        <DiasPorSemaforo rows={rowsActivos} />
      </div>

      {/* ── Modelo + Antigüedad + Vendedor + Vendidos ── */}
      <div className="d-grid-3">
        <PorModelo rows={rowsActivos} filters={filters} setFilters={setFilters} />
        <Antiguedad rows={rowsActivos} />
        <CargaVendedor rows={rowsActivos} usuarios={usuarios} />
        <VendidosMes rows={rows} />
      </div>

      {/* ── Lista detallada ── */}
      <ListaDetallada
        rows={rowsActivos}
        filters={filters}
        setFilters={setFilters}
        openVehicle={openVehicle}
        usuarioActual={usuarioActual}
      />
    </div>
  );
}

Object.assign(window, { Dashboard });
