/* Automind · drawer de detalle + vistas placeholder + raíz de la app */

function Pill({ sk }) {
  const c = SEM[sk];
  return <span className="pill" style={{ background: c.bg, color: c.txt }}><span className="pill-dot" style={{ background: c.sol }} />{c.label}</span>;
}

function FormulaRow({ label, formula, result, neg }) {
  return (
    <div className="fml">
      <div className="fml-top"><span className="fml-label">{label}</span><span className={"fml-res" + (neg ? " neg" : "")}>{result}</span></div>
      <code className="fml-code">{formula}</code>
    </div>
  );
}

function VehicleDrawer({ v, onClose, onEdit, onNuevoCliente, usuarioActual }) {
  // ── Todos los hooks ANTES de cualquier return condicional ──────────────────
  const [vendedorId, setVendedorId] = React.useState(v ? v.vendedorId : null);

  React.useEffect(() => {
    if (v) setVendedorId(v.vendedorId);
  }, [v && v.id]);

  if (!v) return null;

  const c         = SEM[v.semaforo];
  const restColor = v.diasLibresRestantes <= 0 ? SEM.intereses.sol
                  : v.diasLibresRestantes <= 15 ? SEM.vencer.sol
                  : SEM.saludable.sol;
  const usuarios  = window.AUTOMIND ? window.AUTOMIND.USUARIOS || [] : [];
  const vendedor  = usuarios.find(u => u.id === vendedorId);
  const esAsignado = usuarioActual && vendedorId === usuarioActual.id;

  function asignarme() {
    if (!usuarioActual) return;
    const nid = esAsignado ? null : usuarioActual.id;
    setVendedorId(nid);
    if (window.AUTOMIND) {
      const row = window.AUTOMIND.ROWS.find(r => r.id === v.id);
      if (row) {
        row.vendedorId = nid;
        if (window.AUTOMIND.enrichRowVendedor) {
          window.AUTOMIND.enrichRowVendedor(row, window.AUTOMIND.USUARIOS || []);
          Object.assign(v, row);
        }
        // Persistir la asignación en Supabase (antes solo vivía en memoria)
        if (window.DB && window.AUTOMIND.agencyId) {
          window.DB.saveVehicle(window.AUTOMIND.agencyId, row).catch(err => {
            console.error("Error guardando asignación:", err);
            alert("No se pudo guardar la asignación. Intenta de nuevo.");
          });
        }
      }
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" style={{ "--sol": c.sol }}>
        <div className="dr-head">
          <div>
            <div className="dr-eyebrow">{v.id} · {v.vin}</div>
            <h2>{v.marca} {v.modelo}</h2>
            <div className="dr-meta">{v.anio} · {v.colorExterior} · INV {v.inv}</div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}>{I.close({ width: 20, height: 20 })}</button>
        </div>

        <div className="dr-status">
          <Pill sk={v.semaforo} />
          <span className="dr-status-txt">
            {v.semaforo === "intereses"    ? "Ya genera interés — acción inmediata requerida."
              : v.semaforo === "vencer"      ? "Próximo a vencer el plan de gracia."
              : v.semaforo === "comprometido"? "Margen comprometido — vigilar de cerca."
              : v.semaforo === "rotacion"    ? "Rotación media — sin urgencia inmediata."
              : "Saludable — dentro del plan de gracia."}
          </span>
        </div>

        {/* Métricas clave */}
        <div className="dr-grid">
          <div className="dr-stat"><span>Días en piso</span><b>{v.diasEnPiso}</b></div>
          <div className="dr-stat"><span>Días libres restantes</span>
            <b style={{ color: v.diasLibresRestantes <= 0 ? SEM.intereses.sol : v.diasLibresRestantes <= 15 ? SEM.vencer.sol : "inherit" }}>
              {v.diasLibresRestantes <= 0 ? "Vencido" : v.diasLibresRestantes + " días"}
            </b>
          </div>
          {(!usuarioActual || usuarioActual.rol !== "vendedor") && (
            <div className="dr-stat"><span>Interés acumulado</span>
              <b style={{ color: v.interesAcum > 0 ? SEM.intereses.sol : "inherit" }}>{fmtMoney(v.interesAcum, 2)}</b>
            </div>
          )}
          {(!usuarioActual || usuarioActual.rol !== "vendedor") && (
            <div className="dr-stat"><span>% Plan consumido</span>
              <b style={{ color: v.pctPlanConsumido > 100 ? SEM.intereses.sol : v.pctPlanConsumido > 86 ? SEM.vencer.sol : "inherit" }}>
                {v.pctPlanConsumido}%
              </b>
            </div>
          )}
        </div>

        {/* Ficha completa del vehículo */}
        <div className="dr-section">Ficha del vehículo</div>
        <div className="dr-grid">
          <div className="dr-stat"><span>VIN</span><b style={{fontSize:11,letterSpacing:".03em"}}>{v.vin || "—"}</b></div>
          <div className="dr-stat"><span>INV</span><b>{v.inv || "—"}</b></div>
          <div className="dr-stat"><span>Estatus</span><b>{v.estatus || "—"}</b></div>
          <div className="dr-stat"><span>Tipo</span><b>{v.tipo || "—"}</b></div>
          <div className="dr-stat"><span>Color exterior</span><b>{v.colorExterior || "—"}</b></div>
          <div className="dr-stat"><span>Color interior</span><b>{v.colorInterior || "—"}</b></div>
          <div className="dr-stat"><span>Fecha factura</span><b>{v.fechaFacturaTxt || "—"}</b></div>
          <div className="dr-stat"><span>Fecha llegada</span><b>{v.fechaLlegadaTxt || "—"}</b></div>
          {(!usuarioActual || usuarioActual.rol !== "vendedor") && (<>
            <div className="dr-stat"><span>Monto financiado</span><b>{fmtMoney(v.montoFinanciado, 2)}</b></div>
            <div className="dr-stat"><span>Tasa anual</span><b>{fmtPct(v.pctInteres, 2)}</b></div>
            <div className="dr-stat"><span>Días de gracia</span><b>{v.diasGraciaTotal} días</b></div>
          </>)}
          {v.observaciones && (
            <div className="dr-stat" style={{gridColumn:"1/-1"}}><span>Observaciones</span><b>{v.observaciones}</b></div>
          )}
        </div>

        <div className="dr-section">Asignación de jerarquía</div>
        {vendedor ? (
          <div className="dr-jerarquia">
            {/* Vendedor */}
            <div className="dj-nivel">
              <div className="dj-lbl">Vendedor</div>
              <div className="dj-persona">
                <div className="dj-av" style={{ background:"#d99613" }}>
                  {vendedor.nombre.split(" ").slice(0,2).map(w=>w[0]).join("")}
                </div>
                <div className="dj-info">
                  <div className="dj-nombre">{vendedor.nombre}</div>
                  <div className="dj-email">{vendedor.email}</div>
                </div>
              </div>
            </div>
            {/* Gerente */}
            {v.gerenteNombre && (
              <>
                <div className="dj-arrow">↑</div>
                <div className="dj-nivel">
                  <div className="dj-lbl">Gerente</div>
                  <div className="dj-persona">
                    <div className="dj-av" style={{ background:"#1f9d57" }}>
                      {v.gerenteNombre.split(" ").slice(0,2).map(w=>w[0]).join("")}
                    </div>
                    <div className="dj-info">
                      <div className="dj-nombre">{v.gerenteNombre}</div>
                      <div className="dj-email">{v.gerenteEmail}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Director */}
            {v.directorNombre && (
              <>
                <div className="dj-arrow">↑</div>
                <div className="dj-nivel">
                  <div className="dj-lbl">Director</div>
                  <div className="dj-persona">
                    <div className="dj-av" style={{ background:"#2f6fed" }}>
                      {v.directorNombre.split(" ").slice(0,2).map(w=>w[0]).join("")}
                    </div>
                    <div className="dj-info">
                      <div className="dj-nombre">{v.directorNombre}</div>
                      <div className="dj-email">{v.directorEmail}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="dr-vendedor empty-vend">Sin vendedor asignado</div>
        )}
        {usuarioActual && usuarioActual.rol !== "director" && (
          <button className={"btn btn-asignar" + (esAsignado ? " active" : "")} onClick={asignarme}>
            {esAsignado ? "✓ Asignado a mí · Desasignar" : "Asignarme esta unidad"}
          </button>
        )}

        <div className="dr-actions">
          {onEdit && (
            <button className="btn primary" onClick={() => { onClose(); onEdit(v.id); }}>
              Editar unidad
            </button>
          )}
          <button
            className="btn"
            disabled={v.estadoVenta !== 'DISPONIBLE'}
            title={v.estadoVenta !== 'DISPONIBLE' ? `Unidad ${v.estadoVenta} — no disponible` : "Iniciar proceso de venta"}
            style={{ opacity: v.estadoVenta !== 'DISPONIBLE' ? 0.45 : 1,
                     cursor:  v.estadoVenta !== 'DISPONIBLE' ? 'not-allowed' : 'pointer' }}
            onClick={() => {
              if (v.estadoVenta !== 'DISPONIBLE') return;
              const usuarios  = window.AUTOMIND ? window.AUTOMIND.USUARIOS || [] : [];
              const asesorId  = (Array.isArray(v.vendedorIds) && v.vendedorIds[0]) || v.vendedorId || null;
              const asesorObj = usuarios.find(u => u.id === asesorId);
              if (!window.AUTOMIND) window.AUTOMIND = {};
              window.AUTOMIND._pendingNuevoCliente = {
                interes:      [v.marca, v.modelo, v.anio].filter(Boolean).join(" "),
                canal:        "Piso",
                asesor:       asesorObj ? asesorObj.nombre : "",
                presupuesto:  v.montoFinanciado || "",
                vinVinculado: v.vin  || "",
                inventarioId: v.id   || null,
                _ctx: { semaforo: v.semaforo, diasEnPiso: v.diasEnPiso, colorExterior: v.colorExterior },
              };
              onClose();
              if (onNuevoCliente) onNuevoCliente();
            }}>
            Nuevo cliente
          </button>
        </div>
      </aside>
    </>
  );
}

function Placeholder({ title, icon, desc }) {
  return (
    <div className="page">
      <div className="ph">
        <span className="ph-ico">{icon}</span>
        <h2>{title}</h2>
        <p>{desc}</p>
        <span className="ph-tag">Módulo en construcción</span>
      </div>
    </div>
  );
}

/* ── Helpers de enriquecimiento compartidos (App + SetPasswordScreen) ─────── */
function enriquecerUsuarios(usuarios) {
  function getSupIds(u) {
    return (Array.isArray(u.reportaIds) && u.reportaIds.length > 0)
      ? u.reportaIds
      : (u.reportaA ? [u.reportaA] : []);
  }
  return usuarios.map(u => {
    // Primer superior para display (display usa el primero de la lista)
    const supIds = getSupIds(u);
    const sup    = supIds.length > 0 ? (usuarios.find(s => s.id === supIds[0]) || null) : null;
    const ger    = u.rol==="vendedor" ? sup : u.rol==="gerente" ? u : null;
    // Director: primer director del gerente primario
    const gerSupIds = ger && u.rol==="vendedor" ? getSupIds(ger) : [];
    const dir = u.rol==="director" ? u
              : u.rol==="gerente"  ? sup
              : gerSupIds.length > 0 ? (usuarios.find(s=>s.id===gerSupIds[0])||null) : null;
    return { ...u,
      reportaNombre: sup?.nombre||"—", reportaEmail: sup?.email||"—",
      gerenteName:   ger?.nombre||"—", gerenteEmail: ger?.email||"—",
      directorName:  dir?.nombre||"—", directorEmail: dir?.email||"—" };
  });
}

function enriquecerRows(rows, usuariosEnriquecidos) {
  const MS_DIA = 86400000;
  return rows.map(dbRow => {
    const v    = window.DB.vehicleFromDbRow ? window.DB.vehicleFromDbRow(dbRow) : dbRow;
    const HOY  = new Date();
    const fFact = v.fechaFactura instanceof Date ? v.fechaFactura : new Date(v.fechaFactura||HOY);
    const fLleg = v.fechaLlegada instanceof Date ? v.fechaLlegada : new Date(v.fechaLlegada||HOY);
    const fmtF  = d => `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    const diasEnPiso = Math.max(0, Math.round((HOY-fFact)/MS_DIA)-1);
    const diasGraciaTotal = (v.diasGraciaBase||0)+(v.diasGraciaExtra||0);
    const diasLibresRestantes = diasGraciaTotal - diasEnPiso;
    const diasVencidos = diasLibresRestantes < 0 ? Math.abs(diasLibresRestantes) : 0;
    const monto = Number(v.montoFinanciado)||0, tasa = Number(v.pctInteres)||0;
    const interesDiario = Math.round(monto*tasa/365*100)/100;
    const interesAcum   = Math.round(diasVencidos*interesDiario*100)/100;
    // Sin días de gracia configurados, la unidad genera interés desde el día 1:
    // marcarla como plan consumido (>100) en vez de "saludable" (0)
    const pctPlanConsumido = diasGraciaTotal>0 ? Math.round(diasEnPiso/diasGraciaTotal*100)
                           : (diasEnPiso>0 ? 101 : 0);
    const semaforo = pctPlanConsumido>100?"intereses":pctPlanConsumido>86?"vencer":pctPlanConsumido>76?"comprometido":pctPlanConsumido>61?"rotacion":"saludable";
    const fechaVenc = new Date(fFact.getTime()+diasGraciaTotal*MS_DIA);
    const row = { ...v, diasEnPiso, diasGraciaBase:v.diasGraciaBase, diasGraciaExtra:v.diasGraciaExtra,
      diasGraciaTotal, diasLibresRestantes, diasVencidos, interesDiario, interesAcum,
      pctPlanConsumido, semaforo,
      fechaFacturaTxt:fmtF(fFact), fechaLlegadaTxt:fmtF(fLleg), fechaVencTxt:fmtF(fechaVenc) };
    const vids=Array.isArray(row.vendedorIds)&&row.vendedorIds.length>0?row.vendedorIds:(row.vendedorId?[row.vendedorId]:[]);
    const vd=vids.length>0?(usuariosEnriquecidos.find(u=>u.id===vids[0])||null):null;
    const _rids1=(u)=>(Array.isArray(u.reportaIds)&&u.reportaIds.length>0)?u.reportaIds:(u.reportaA?[u.reportaA]:[]);
    const gr=vd?(_rids1(vd).length>0?(usuariosEnriquecidos.find(u=>u.id===_rids1(vd)[0])||null):null):null;
    const dr=gr?(_rids1(gr).length>0?(usuariosEnriquecidos.find(u=>u.id===_rids1(gr)[0])||null):null):null;
    row.vendedores=vids.map(id=>usuariosEnriquecidos.find(u=>u.id===id)).filter(Boolean);
    row.vendedorNombre=vd?.nombre||""; row.vendedorEmail=vd?.email||"";
    row.gerenteId=gr?.id||""; row.gerenteNombre=gr?.nombre||""; row.gerenteEmail=gr?.email||"";
    row.directorNombre=dr?.nombre||""; row.directorEmail=dr?.email||"";
    return row;
  });
}

function buildAUTOMIND(agency, rowsEnriquecidas, usuariosEnriquecidos, parentAgencyId) {
  // Funciones definidas en login.jsx — acceder via window
  const _kpis   = window.computarKpis   || ((r) => ({ total:r.length, vencidos:0, proximos:0, interesTotal:0, montoTotal:0 }));
  const _pivote = window.computarPivote || ((r) => []);
  const _tablas = window.buildTablas    || ((r,u) => [{ id:"inventario", nombre:"Inventario", cols:[], rows:r }, { id:"colaboradores", nombre:"Colaboradores", cols:[], rows:u }]);
  return {
    ROWS: rowsEnriquecidas, USUARIOS: usuariosEnriquecidos,
    KPIS:   _kpis(rowsEnriquecidas),
    PIVOTE: _pivote(rowsEnriquecidas),
    TABLAS: _tablas(rowsEnriquecidas, usuariosEnriquecidos),
    agencyId:       agency.id,           // workspace ID (para inventario, usuarios)
    agencyParentId: parentAgencyId || agency.agency_id || agency.id, // agencia raíz (Coperva)
    enrichRowVendedor: (row, uList) => {
      const vids=Array.isArray(row.vendedorIds)&&row.vendedorIds.length>0?row.vendedorIds:(row.vendedorId?[row.vendedorId]:[]);
      const vd=vids.length>0?(uList.find(u=>u.id===vids[0])||null):null;
      const _rids2=(u)=>(Array.isArray(u.reportaIds)&&u.reportaIds.length>0)?u.reportaIds:(u.reportaA?[u.reportaA]:[]);
      const gr=vd?(_rids2(vd).length>0?(uList.find(u=>u.id===_rids2(vd)[0])||null):null):null;
      const dr=gr?(_rids2(gr).length>0?(uList.find(u=>u.id===_rids2(gr)[0])||null):null):null;
      row.vendedores=vids.map(id=>uList.find(u=>u.id===id)).filter(Boolean);
      row.vendedorNombre=vd?.nombre||""; row.vendedorEmail=vd?.email||"";
      row.gerenteId=gr?.id||""; row.gerenteNombre=gr?.nombre||""; row.gerenteEmail=gr?.email||"";
      row.directorNombre=dr?.nombre||""; row.directorEmail=dr?.email||""; return row;
    },
  };
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2f6fed",
  "density": "cómodo",
  "sidebar": "#1b2a57"
}/*EDITMODE-END*/;

function App() {
  const [tenant, setTenant]         = React.useState(null);
  const [view, setView]             = React.useState("dashboard");
  const [tablaId, setTablaId]       = React.useState("inventario");
  const [filters, setFilters]       = React.useState({ sem: null, fin: null, gerente: null, urgente: false });
  const [vehicle, setVehicle]       = React.useState(null);
  const [editVehicleId, setEditVehicleId] = React.useState(null);
  const [colabAutoOpen, setColabAutoOpen] = React.useState(false);
  const [rowsVersion,   setRowsVersion]   = React.useState(0);
  const [authLoading, setAuthLoading]     = React.useState(true);
  const [inviteMode,  setInviteMode]      = React.useState(false);
  const [linkError,   setLinkError]       = React.useState(null);
  const [agencyCtx,      setAgencyCtx]      = React.useState(null); // agency owner mode
  const [superAdminCtx,  setSuperAdminCtx]  = React.useState(null); // super admin mode
  const [t, setTweak]               = useTweaks(TWEAK_DEFAULTS);
  const [sidebarMobileOpen, setSidebarMobileOpen] = React.useState(false);

  // ── Hooks siempre primero, sin condiciones ─────────────────────────────────

  const handleLogin = React.useCallback((cfg) => {
    // Detectar si es super admin
    if (cfg.__superAdminCtx) {
      setSuperAdminCtx(cfg.__superAdminCtx);
      setAuthLoading(false);
      return;
    }
    // Detectar si es agency owner (mostrar workspace selector)
    if (cfg.__agencyCtx) {
      setAgencyCtx(cfg.__agencyCtx);
      setAuthLoading(false);
      return;
    }
    // Persistir workspace seleccionado para sobrevivir recargas
    if (cfg.id) sessionStorage.setItem("automind_workspace_id", cfg.id);
    // Crear entrada en historial para que el botón atrás no salga de la app
    history.pushState({ automind: true }, "", window.location.pathname);
    document.documentElement.style.setProperty("--accent",  cfg.accent  || TWEAK_DEFAULTS.accent);
    document.documentElement.style.setProperty("--sidebar", cfg.sidebar || TWEAK_DEFAULTS.sidebar);
    setAgencyCtx(null);
    setTenant(cfg);
  }, []);

  // ── Detectar sesión activa al cargar (links de invitación / reload) ─────────
  React.useEffect(() => {
    if (!window.DB) { setAuthLoading(false); return; }

    async function checkSession() {
      try {
        // Supabase procesa y limpia window.location.hash al inicializar,
        // por eso guardamos el hash original en index.html antes de cargar Supabase.
        const hash = window.__initialHash || window.location.hash;
        window.__initialHash = ""; // limpiar para no reusar en recargas

        // Detectar error en el hash (ej: link expirado)
        if (hash.includes("error=")) {
          history.replaceState(null, "", window.location.pathname);
          const params = new URLSearchParams(hash.slice(1));
          const code = params.get("error_code") || "";
          const msg  = params.get("error_description") || "El link no es válido.";
          setLinkError(code.includes("expired") || msg.includes("expired")
            ? "El link de invitación expiró. Pide a tu administrador que te reenvíe la invitación."
            : "Link inválido: " + decodeURIComponent(msg.replace(/\+/g, " ")));
          setAuthLoading(false);
          return;
        }

        // Detectar flujo de invitación (type=invite en el hash de la URL)
        if (hash.includes("type=invite") || hash.includes("type=recovery")) {
          history.replaceState(null, "", window.location.pathname);
          setInviteMode(true);
          setAuthLoading(false);
          return;
        }

        const session = await window.DB.getSession();
        if (session) {
          // Detectar rol del usuario para saber si necesita workspace selector
          const ctx = await window.DB.getUserContext();
          if (ctx.type === "super_admin") {
            // Intentar restaurar el workspace que tenía seleccionado
            const savedWsId = sessionStorage.getItem("automind_workspace_id");
            const wasSAMode = sessionStorage.getItem("automind_super_admin") === "1";
            if (savedWsId && wasSAMode) {
              try {
                const data = await window.DB.loadAgencyData(savedWsId);
                const { agency, usuarios, rows } = data;
                const usuariosEnriquecidos = enriquecerUsuarios(usuarios);
                const rowsEnriquecidas     = enriquecerRows(rows, usuariosEnriquecidos);
                window.AUTOMIND = buildAUTOMIND(agency, rowsEnriquecidas, usuariosEnriquecidos, agency.agency_id || agency.id);
                const usuarioActual = { nombre:"Super Admin", rol:"director", email: ctx.email, id:"super-admin", isSuperAdmin: true };
                handleLogin({
                  id: agency.id, nombre: agency.nombre, ciudad: agency.ciudad,
                  iniciales: agency.iniciales || agency.nombre.slice(0,2).toUpperCase(),
                  accent:  agency.accent  || "#2f6fed",
                  sidebar: agency.sidebar || "#1b2a57",
                  usuarioActual, isAgencyOwner: true, agencyCtx: null, isSuperAdmin: true,
                  _superAdminCtxRef: ctx,
                });
                return;
              } catch(e) {
                sessionStorage.removeItem("automind_workspace_id");
                sessionStorage.removeItem("automind_super_admin");
              }
            }
            handleLogin({ __superAdminCtx: ctx });
            return;
          }
          if (ctx.type === "agency") {
            // Agency owner: intentar restaurar el workspace que tenía seleccionado
            const savedWsId = sessionStorage.getItem("automind_workspace_id");
            if (savedWsId) {
              try {
                const data = await window.DB.loadAgencyData(savedWsId);
                const { agency, me, usuarios, rows } = data;
                const usuariosEnriquecidos = enriquecerUsuarios(usuarios);
                const rowsEnriquecidas     = enriquecerRows(rows, usuariosEnriquecidos);
                window.AUTOMIND = buildAUTOMIND(agency, rowsEnriquecidas, usuariosEnriquecidos, ctx.agencyId);
                const usuarioActual = { nombre: ctx.agency?.name || "Admin", rol: "director", email: "", id: "agency-owner", isAgencyOwner: true };
                handleLogin({
                  id:agency.id, nombre:agency.nombre, ciudad:agency.ciudad,
                  iniciales:agency.iniciales||agency.nombre.slice(0,2).toUpperCase(),
                  accent:agency.accent||"#2f6fed", sidebar:agency.sidebar||"#1b2a57",
                  usuarioActual, isAgencyOwner: true, agencyCtx: ctx,
                });
                return;
              } catch(e) {
                sessionStorage.removeItem("automind_workspace_id");
              }
            }
            // Sin workspace guardado → mostrar selector
            handleLogin({ __agencyCtx: ctx });
          } else {
            // Usuario de workspace normal — cargar directamente
            const { agency, me, usuarios, rows } = await window.DB.loadAgencyData();
            const usuariosEnriquecidos = enriquecerUsuarios(usuarios);
            const rowsEnriquecidas     = enriquecerRows(rows, usuariosEnriquecidos);
            // Excluir vendidos de meses anteriores
            const _hoyApp = new Date();
            const _mesActualApp = _hoyApp.getFullYear() * 100 + _hoyApp.getMonth();
            const rowsSinVendidosViejos = rowsEnriquecidas.filter(r => {
              if (r.estadoVenta !== "VENDIDO") return true;
              if (!r.fechaVenta) return true;
              const fv = r.fechaVenta instanceof Date ? r.fechaVenta : new Date(r.fechaVenta);
              return fv.getFullYear() * 100 + fv.getMonth() === _mesActualApp;
            });
            // Vendedor: solo sus unidades asignadas + sin asignar
            const usuarioActual = usuariosEnriquecidos.find(u=>u.auth_user_id===me.auth_user_id)||me;
            const rowsParaRol   = usuarioActual?.rol === "vendedor"
              ? rowsSinVendidosViejos.filter(r => {
                  const ids = r.vendedorIds || (r.vendedorId ? [r.vendedorId] : []);
                  return ids.length === 0 || ids.includes(usuarioActual.id);
                })
              : rowsSinVendidosViejos;
            window.AUTOMIND = buildAUTOMIND(agency, rowsParaRol, usuariosEnriquecidos);
            handleLogin({
              id:agency.id, nombre:agency.nombre, ciudad:agency.ciudad,
              iniciales:agency.iniciales||agency.nombre.slice(0,2).toUpperCase(),
              accent:agency.accent||"#2f6fed", sidebar:agency.sidebar||"#1b2a57", usuarioActual,
              availableWorkspaces: ctx.allUserWorkspaces || [],
            });
          }
        }
      } catch(e) {
        console.warn("Sin sesión activa:", e.message);
      } finally {
        setAuthLoading(false);
      }
    }
    checkSession();
  }, []);

  // Interceptar botón atrás del navegador para no salir de la app
  React.useEffect(() => {
    const onPopState = (e) => {
      if (e.state && e.state.automind) {
        // Volver a empujar el estado para que el back no salga
        history.pushState({ automind: true }, "", window.location.pathname);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Cambiar a otro workspace del mismo usuario
  const handleSwitchToWorkspace = React.useCallback(async (wsId) => {
    try {
      const data = await window.DB.loadAgencyData(wsId);
      const { agency, me, usuarios, rows } = data;
      const usuariosEnriquecidos = enriquecerUsuarios(usuarios);
      const rowsEnriquecidas     = enriquecerRows(rows, usuariosEnriquecidos);
      const hoy = new Date();
      const mesActual = hoy.getFullYear() * 100 + hoy.getMonth();
      const rowsSinVendidosViejos = rowsEnriquecidas.filter(r => {
        if (r.estadoVenta !== "VENDIDO") return true;
        if (!r.fechaVenta) return true;
        const fv = r.fechaVenta instanceof Date ? r.fechaVenta : new Date(r.fechaVenta);
        return fv.getFullYear() * 100 + fv.getMonth() === mesActual;
      });
      const usuarioActual = usuariosEnriquecidos.find(u => u.auth_user_id === me.auth_user_id) || me;
      const rowsParaRol = usuarioActual?.rol === "vendedor"
        ? rowsSinVendidosViejos.filter(r => {
            const ids = r.vendedorIds || (r.vendedorId ? [r.vendedorId] : []);
            return ids.length === 0 || ids.includes(usuarioActual.id);
          })
        : rowsSinVendidosViejos;
      window.AUTOMIND = buildAUTOMIND(agency, rowsParaRol, usuariosEnriquecidos);
      sessionStorage.setItem("automind_workspace_id", wsId);
      setTenant(prev => ({
        ...prev,
        id:        agency.id,
        nombre:    agency.nombre,
        ciudad:    agency.ciudad,
        iniciales: agency.iniciales || agency.nombre.slice(0,2).toUpperCase(),
        accent:    agency.accent    || "#2f6fed",
        sidebar:   agency.sidebar   || "#1b2a57",
        usuarioActual,
      }));
      setView("dashboard");
      setVehicle(null);
      setFilters({ sem: null, fin: null, gerente: null, urgente: false });
    } catch(e) {
      alert("Error al cambiar de agencia: " + e.message);
    }
  }, []);

  const handleLogout = React.useCallback(() => {
    sessionStorage.removeItem("automind_workspace_id");
    if (window.DB) window.DB.signOut();
    window.AUTOMIND = null;
    setAgencyCtx(null);
    setTenant(null);
    setView("dashboard");
    setVehicle(null);
    setFilters({ sem: null, fin: null, gerente: null, urgente: false });
    document.documentElement.style.setProperty("--accent",  TWEAK_DEFAULTS.accent);
    document.documentElement.style.setProperty("--sidebar", TWEAK_DEFAULTS.sidebar);
  }, []);

  const handleMenu = React.useCallback((a) => {
    if (a === "datos") setView("database");
    else if (a === "editar") setView("dashboard");
    else if (a === "inicio") { setView("dashboard"); setVehicle(null); }
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey) return;
      if (e.key === "1") { e.preventDefault(); setView("dashboard"); }
      else if (e.key === "2") { e.preventDefault(); setView("database"); }
      else if (e.key === "0") { e.preventDefault(); setView("dashboard"); setVehicle(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    root.style.setProperty("--accent",  t.accent);
    root.style.setProperty("--sidebar", t.sidebar);
    root.dataset.density = t.density === "compacto" ? "compacto" : "comodo";
  }, [tenant, t.accent, t.sidebar, t.density]);

  // ── Render condicional (después de todos los hooks) ────────────────────────

  if (authLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:14 }}>
        <span className="login-spinner" style={{ width:28, height:28, borderWidth:3 }} />
        <span style={{ color:"var(--muted)", fontSize:14 }}>Cargando…</span>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="login-shell">
        <div className="login-side">
          <div className="login-brand">
            <span className="login-brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/>
                <circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>
              </svg>
            </span>
            <span className="login-brand-name">Automind</span>
          </div>
          <div className="login-hero">
            <h1>Link<br />inválido.</h1>
            <p>El enlace de invitación ya no es válido.</p>
          </div>
          <div className="login-dots"><span /><span /><span /></div>
        </div>
        <div className="login-main">
          <div className="login-card" style={{ textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"#fcebe7",
              display:"grid", placeItems:"center", margin:"0 auto 20px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#e0492f" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ margin:"0 0 10px" }}>Link expirado</h2>
            <p style={{ color:"var(--muted)", marginBottom:28, lineHeight:1.7, fontSize:14 }}>
              {linkError}
            </p>
            <button className="login-btn" onClick={() => setLinkError(null)}>
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (inviteMode) {
    return <SetPasswordScreen onDone={() => setInviteMode(false)} />;
  }

  // ── Super Admin: vista global de agencias ────────────────────────────────
  if (superAdminCtx && !tenant) {
    return (
      <SuperAdminView
        userCtx={superAdminCtx}
        onLogout={async () => { await window.DB.signOut(); setSuperAdminCtx(null); }}
        onEntrarWorkspace={(ws, data, agencia) => {
          const { agency, me, usuarios, rows } = data;
          const usuariosEnriquecidos = enriquecerUsuarios(usuarios);
          const rowsEnriquecidas     = enriquecerRows(rows, usuariosEnriquecidos);
          window.AUTOMIND = buildAUTOMIND(agency, rowsEnriquecidas, usuariosEnriquecidos, agencia.id);
          const usuarioActual = { nombre:"Super Admin", rol:"director", email: superAdminCtx.email, id:"super-admin", isSuperAdmin: true };
          sessionStorage.setItem("automind_workspace_id", ws.id);
          sessionStorage.setItem("automind_super_admin", "1");
          setSuperAdminCtx(null);
          handleLogin({
            id: agency.id, nombre: agency.nombre, ciudad: agency.ciudad,
            iniciales: agency.iniciales || agency.nombre.slice(0,2).toUpperCase(),
            accent:  agency.accent  || "#2f6fed",
            sidebar: agency.sidebar || "#1b2a57",
            usuarioActual, isAgencyOwner: true, agencyCtx: null, isSuperAdmin: true,
            _superAdminCtxRef: superAdminCtx,
          });
        }}
      />
    );
  }

  // ── Agency owner: mostrar selector de workspaces ──────────────────────────
  if (agencyCtx && !tenant) {
    return (
      <WorkspaceSelector
        agencyCtx={agencyCtx}
        onSelect={(ws, data) => {
          const { agency, me, usuarios, rows } = data;
          const usuariosEnriquecidos = enriquecerUsuarios(usuarios);
          const rowsEnriquecidas     = enriquecerRows(rows, usuariosEnriquecidos);
          window.AUTOMIND = buildAUTOMIND(agency, rowsEnriquecidas, usuariosEnriquecidos, agencyCtx.agencyId);
          // Para agency owner, el usuarioActual es un objeto sintético con isAgencyOwner: true
          const _foundUser = usuariosEnriquecidos.find(u => u.auth_user_id === agencyCtx.authUserId);
          const usuarioActual = _foundUser
            ? { ..._foundUser, isAgencyOwner: true }
            : { nombre: agencyCtx.agency?.name || "Admin", rol: "director",
                email: agencyCtx.email || "", id: "agency-owner", isAgencyOwner: true };
          handleLogin({
            id:        agency.id,
            nombre:    agency.nombre,
            ciudad:    agency.ciudad,
            iniciales: agency.iniciales || agency.nombre.slice(0,2).toUpperCase(),
            accent:    agency.accent    || "#2f6fed",
            sidebar:   agency.sidebar   || "#1b2a57",
            usuarioActual,
            isAgencyOwner: true,
            agencyCtx,
          });
        }}
      />
    );
  }

  if (!tenant) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const A = window.AUTOMIND;

  // Guardia: si AUTOMIND no está listo mostrar error visible
  if (!A || !A.TABLAS) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"100vh", flexDirection:"column", gap:16, padding:32, textAlign:"center" }}>
        <div style={{ fontSize:40 }}>⚠️</div>
        <h2 style={{ margin:0 }}>Error al cargar los datos</h2>
        <p style={{ color:"var(--muted)", maxWidth:420, lineHeight:1.6 }}>
          No se pudieron cargar los datos de la plataforma. Esto puede deberse a que
          falta alguna tabla en la base de datos o hay un problema de conexión.
        </p>
        <button className="btn primary" onClick={handleLogout}>
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  // Recalcular KPIs/pivote/tablas en cada render: ROWS muta tras editar/importar
  // y antes las tarjetas del dashboard quedaban con cifras viejas hasta recargar.
  if (A.ROWS && window.computarKpis)   A.KPIS   = window.computarKpis(A.ROWS);
  if (A.ROWS && window.computarPivote) A.PIVOTE = window.computarPivote(A.ROWS);
  if (A.ROWS && window.buildTablas)    A.TABLAS = window.buildTablas(A.ROWS, A.USUARIOS || []);

  const tablaNombre = (A.TABLAS.find((b) => b.id === tablaId) || A.TABLAS[0]).nombre;
  const crumb = view === "database"     ? "Datos · " + tablaNombre
    : view === "inventario"    ? "Plan Piso · Registro de Inventario"
    : view === "colaboradores" ? "Configuración · Equipo"
    : view === "alertas"       ? "Plan Piso · Alertas"
    : view === "importar"      ? "Plan Piso · Importar inventario"
    : view === "config"        ? "Admin · Configuración"
    : view === "ventas"        ? "Dashboard de Ventas"
    : view === "crm"           ? "Ventas · CRM de Clientes"
    : "Plan Piso · Dashboard — Semáforo";

  // Cerrar sidebar mobile al cambiar de vista
  const handleSetView = (id) => { setView(id); setSidebarMobileOpen(false); };

  return (
    <div className="shell">
      <Sidebar view={view} setView={handleSetView} onMenu={handleMenu} tablaActiva={tablaId} tenant={tenant}
        onLogout={handleLogout}
        onSwitchToWorkspace={handleSwitchToWorkspace}
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
        onSwitchWorkspace={tenant?.isAgencyOwner ? () => {
          sessionStorage.removeItem("automind_workspace_id");
          setSidebarMobileOpen(false);
          if (tenant.isSuperAdmin && tenant._superAdminCtxRef) {
            // Super admin: volver a la vista global de gestión de agencias
            setSuperAdminCtx(tenant._superAdminCtxRef);
          } else {
            // Agency owner: volver al selector de workspaces
            setAgencyCtx(tenant.agencyCtx || agencyCtx);
          }
          setTenant(null);
        } : null} />
      <main className="main">
        {/* Header mobile: hamburguesa + título de vista — visible solo en móvil via CSS */}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarMobileOpen(true)} title="Menú">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="mobile-title">
            {view === "dashboard" ? "Dashboard" : view === "inventario" ? "Inventario"
              : view === "alertas" ? "Alertas" : view === "importar" ? "Importar"
              : view === "colaboradores" ? "Equipo" : view === "crm" ? "CRM"
              : view === "ventas" ? "Dashboard Ventas" : "Automind"}
          </span>
          {/* Logo marca derecha */}
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/>
            <circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>
          </svg>
        </div>
        <TopBar crumb={crumb} />
        <div className="scroll">
          {view === "dashboard" && (
            <Dashboard rows={A.ROWS} kpis={A.KPIS} pivote={A.PIVOTE}
              filters={filters} setFilters={setFilters} openVehicle={setVehicle}
              usuarioActual={tenant.usuarioActual} />
          )}
          {view === "database" && <Database tablas={A.TABLAS} tablaId={tablaId} setTablaId={setTablaId} openVehicle={setVehicle}
            onAddColab={() => { setView("colaboradores"); setColabAutoOpen(true); }}
            usuarioActual={tenant.usuarioActual} />}
          {view === "alertas" && <ConfigAlertas usuarioActual={tenant.usuarioActual} />}
          {view === "importar" && <ImportarInventario onIrInventario={() => { setView("database"); setTablaId("inventario"); }} onImportDone={() => setRowsVersion(v => v + 1)} />}
          {view === "colaboradores" && <Colaboradores usuarios={A.USUARIOS || []} rows={A.ROWS} usuarioActual={tenant.usuarioActual}
            autoOpenForm={colabAutoOpen} onAutoOpenConsumed={() => setColabAutoOpen(false)} />}
          {view === "inventario" && <InventarioEditor
            rows={A.ROWS} usuarios={A.USUARIOS || []}
            usuarioActual={tenant.usuarioActual}
            initialSelId={editVehicleId}
            onRowsChange={() => setRowsVersion(v => v + 1)} />}
          {view === "ventas" && <VentasDashboardView onGoToCRM={() => setView("crm")} />}
          {view === "crm"    && <CRMClientes  rows={A.ROWS} kpis={A.KPIS} usuarios={A.USUARIOS || []} usuarioActual={tenant.usuarioActual} />}
          {view === "config" && (
            <div className="page">
              <div className="page-head">
                <h1>Configuración</h1>
                <p className="page-sub">Ajustes generales del workspace — semáforo, notificaciones y preferencias.</p>
              </div>
              {!tenant.isAgencyOwner && (
                <div className="ph" style={{ textAlign:"center", padding:"48px 0" }}>
                  {I.gear({ width: 28, height: 28 })}
                  <h2 style={{ margin:"14px 0 6px" }}>Configuración del workspace</h2>
                  <p style={{ color:"var(--muted)" }}>
                    Próximamente: umbrales del semáforo, notificaciones y ajustes del plan piso.
                  </p>
                  <span className="ph-tag">En construcción</span>
                </div>
              )}
            </div>
          )}
          {view === "usuarios" && <Colaboradores usuarios={A.USUARIOS || []} rows={A.ROWS} usuarioActual={tenant.usuarioActual} />}
        </div>
      </main>
      <VehicleDrawer v={vehicle} onClose={() => setVehicle(null)} usuarioActual={tenant.usuarioActual}
        onEdit={(id) => { setEditVehicleId(id); setView("inventario"); }}
        onNuevoCliente={() => { setVehicle(null); setView("crm"); }} />

      <TweaksPanel>
        <TweakSection label="Marca" />
        <TweakColor label="Color de acento" value={t.accent}
          options={["#2f6fed", "#1f9d57", "#7a4ef0", "#d9531e", "#0f7a8c"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakColor label="Barra lateral" value={t.sidebar}
          options={["#1b2a57", "#15233f", "#1e2530", "#23304d", "#2a1d52"]}
          onChange={(v) => setTweak("sidebar", v)} />
        <TweakSection label="Diseño" />
        <TweakRadio label="Densidad" value={t.density} options={["cómodo", "compacto"]}
          onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

Object.assign(window, { App });
