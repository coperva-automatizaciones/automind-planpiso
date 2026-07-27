/* Automind · Pantalla de login — Supabase Auth */

/* ── Pantalla: Activar cuenta (flujo de invitación) ────────────────────────── */
function SetPasswordScreen({ onDone }) {
  // Intentar leer el nombre pre-cargado del usuario invitado
  const [nombre,    setNombre]    = React.useState("");
  const [email,     setEmail]     = React.useState("");
  const [password,  setPassword]  = React.useState("");
  const [confirm,   setConfirm]   = React.useState("");
  const [error,     setError]     = React.useState("");
  const [loading,   setLoading]   = React.useState(false);
  const [showPass,  setShowPass]  = React.useState(false);
  const [activated, setActivated] = React.useState(false); // éxito → muestra pantalla de login

  // Cargar nombre/email del usuario autenticado via invite token
  React.useEffect(() => {
    async function cargarPerfil() {
      try {
        const { data } = await window.DB.client.auth.getUser();
        if (data?.user?.email) setEmail(data.user.email);
        // Buscar nombre pre-registrado en tabla users
        const { data: userRow } = await window.DB.client
          .from("users")
          .select("nombre")
          .eq("email", data.user.email)
          .maybeSingle();
        if (userRow?.nombre) setNombre(userRow.nombre);
      } catch(e) {}
    }
    cargarPerfil();
  }, []);

  const rules = [
    { ok: password.length >= 8,   txt: "Mínimo 8 caracteres" },
    { ok: /[A-Z]/.test(password), txt: "Una letra mayúscula" },
    { ok: /[0-9]/.test(password), txt: "Un número" },
  ];
  const allOk = nombre.trim().length >= 2 && rules.every(r => r.ok) && password === confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allOk) { setError("Completa todos los campos correctamente."); return; }
    setLoading(true); setError("");
    try {
      // 1. Actualizar contraseña en Supabase Auth
      const { error: updErr } = await window.DB.client.auth.updateUser({ password });
      if (updErr) throw updErr;

      // 2. Actualizar nombre en tabla users
      await window.DB.client
        .from("users")
        .update({ nombre: nombre.trim() })
        .eq("email", email);

      // 3. Cerrar sesión — el usuario debe hacer login normal con su contraseña nueva
      await window.DB.client.auth.signOut();

      setActivated(true);
    } catch(err) {
      setLoading(false);
      setError(err.message || "Error al activar la cuenta.");
    }
  }

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (activated) {
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
            <h1>¡Todo<br />listo!</h1>
            <p>Tu cuenta está activa. Inicia sesión para entrar a la plataforma.</p>
          </div>
          <div className="login-dots"><span /><span /><span /></div>
        </div>
        <div className="login-main">
          <div className="login-card" style={{ textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"#e7f5ed",
              display:"grid", placeItems:"center", margin:"0 auto 20px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#1f9d57" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ margin:"0 0 8px" }}>Cuenta activada</h2>
            <p style={{ color:"var(--muted)", marginBottom:28, lineHeight:1.6 }}>
              Tu cuenta ha sido activada exitosamente.<br />
              Usa tu correo <b>{email}</b> y tu nueva contraseña para entrar.
            </p>
            <button className="login-btn" onClick={onDone}>
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de activación ───────────────────────────────────────────────
  return (
    <div className="login-shell">
      <div className="login-side">
        <div className="login-brand">
          <span className="login-brand-mark">
            {I.truck({ width:28, height:28 })}
          </span>
          <span className="login-brand-name">Automind</span>
        </div>
        <div className="login-hero">
          <h1>Bienvenido<br />al equipo.</h1>
          <p>Confirma tu nombre y crea tu contraseña para activar tu cuenta.</p>
        </div>
        <div className="login-dots"><span /><span /><span /></div>
      </div>

      <div className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <h2>Activar cuenta</h2>
            <p style={{ wordBreak:"break-all" }}>{email || "Verificando invitación…"}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>

            {/* Nombre */}
            <div className="login-field">
              <label>Tu nombre completo</label>
              <input
                type="text"
                placeholder="Ej: Ana Torres"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError(""); }}
                autoComplete="name"
                disabled={loading}
              />
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label>Crear contraseña</label>
              <div className="login-pass-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" className="login-eye" onClick={() => setShowPass(s => !s)}>
                  {showPass
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {password.length > 0 && (
                <div className="pwd-rules">
                  {rules.map((r, i) => (
                    <span key={i} className={"pwd-rule" + (r.ok ? " ok" : "")}>
                      {r.ok ? "✓" : "○"} {r.txt}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmar */}
            <div className="login-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="Repite tu contraseña"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                autoComplete="new-password"
                disabled={loading}
              />
              {confirm.length > 0 && password !== confirm && (
                <span style={{ fontSize:12, color: SEM.vencer.sol, marginTop:4, display:"block" }}>
                  Las contraseñas no coinciden
                </span>
              )}
            </div>

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading || !allOk}>
              {loading ? <span className="login-spinner" /> : null}
              {loading ? "Activando cuenta…" : "Activar cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail]         = React.useState("");
  const [password, setPassword]   = React.useState("");
  const [error, setError]         = React.useState("");
  const [loading, setLoading]     = React.useState(false);
  const [showPass, setShowPass]   = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);

  async function handleForgot(e) {
    e.preventDefault();
    if (!email) { setError("Escribe tu correo primero para recuperar tu contraseña."); return; }
    setResetLoading(true); setError("");
    try {
      const { error: err } = await window.DB.client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (err) throw err;
      setResetSent(true);
    } catch(err) {
      setError(err.message || "No se pudo enviar el correo de recuperación.");
    } finally {
      setResetLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Ingresa tu correo y contraseña."); return; }
    setLoading(true);
    setError("");
    try {
      // 1. Autenticar con Supabase
      await window.DB.signIn(email.trim(), password);

      // 2. Detectar tipo de usuario (agency owner o workspace member)
      const ctx = await window.DB.getUserContext();

      if (ctx.type === "super_admin") {
        // Super admin → vista global de gestión de agencias
        onLogin({ __superAdminCtx: ctx });
        return;
      }

      if (ctx.type === "agency") {
        // Agency owner → mostrar selector de workspaces
        onLogin({ __agencyCtx: ctx });
        return;
      }

      // 3. Cargar todos los datos del workspace
      const { agency, me, usuarios, rows } = await window.DB.loadAgencyData(ctx.workspaceId);

      // 3. Enriquecer usuarios con jerarquía
      const usuariosEnriquecidos = usuarios.map(u => {
        const uList  = usuarios;
        const sup    = uList.find(s => s.id === u.reportaA) || null;
        const ger    = u.rol === "vendedor" ? sup
                     : u.rol === "gerente"  ? u : null;
        const dir    = u.rol === "director" ? u
                     : u.rol === "gerente"  ? (uList.find(s => s.id === u.reportaA) || null)
                     : u.rol === "vendedor" ? (ger ? (uList.find(s => s.id === ger.reportaA) || null) : null)
                     : null;
        return {
          ...u,
          reportaNombre:  sup?.nombre  || "—",
          reportaEmail:   sup?.email   || "—",
          gerenteName:    ger?.nombre  || "—",
          gerenteEmail:   ger?.email   || "—",
          directorName:   dir?.nombre  || "—",
          directorEmail:  dir?.email   || "—",
        };
      });

      // 4. Enriquecer filas de inventario y computar semáforo
      const MS_DIA = 86400000;
      const rowsEnriquecidas = rows.map(dbRow => {
        const v = window.DB.vehicleFromDbRow(dbRow);

        // Calcular campos derivados
        const HOY  = new Date();
        const fFact = v.fechaFactura instanceof Date ? v.fechaFactura : new Date(v.fechaFactura || HOY);
        const fLleg = v.fechaLlegada instanceof Date ? v.fechaLlegada : new Date(v.fechaLlegada || HOY);
        const fmtF  = d => `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

        const diasEnPiso          = Math.max(0, Math.round((HOY - fFact) / MS_DIA) - 1);
        const diasGraciaTotal     = (v.diasGraciaBase || 0) + (v.diasGraciaExtra || 0);
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

        const row = {
          ...v,
          diasEnPiso, diasGraciaBase: v.diasGraciaBase, diasGraciaExtra: v.diasGraciaExtra,
          diasGraciaTotal, diasLibresRestantes, diasVencidos,
          interesDiario, interesAcum, pctPlanConsumido, semaforo,
          fechaFacturaTxt: fmtF(fFact),
          fechaLlegadaTxt: fmtF(fLleg),
          fechaVencTxt:    fmtF(fechaVenc),
          plazoDias:       v.plazoDias || 0,
        };

        // Enriquecer vendedor/gerente/director (multi-vendedor)
        if (window.DB.enrichRowVendedor) {
          window.DB.enrichRowVendedor(row, usuariosEnriquecidos);
        } else {
          const vids = Array.isArray(row.vendedorIds) && row.vendedorIds.length > 0
            ? row.vendedorIds : (row.vendedorId ? [row.vendedorId] : []);
          const vend = vids.length > 0 ? (usuariosEnriquecidos.find(u => u.id === vids[0]) || null) : null;
          const ger  = vend ? (usuariosEnriquecidos.find(u => u.id === vend.reportaA) || null) : null;
          const dir  = ger  ? (usuariosEnriquecidos.find(u => u.id === ger.reportaA)  || null) : null;
          row.vendedores     = vids.map(id => usuariosEnriquecidos.find(u => u.id === id)).filter(Boolean);
          row.vendedorNombre = vend?.nombre || "";
          row.vendedorEmail  = vend?.email  || "";
          row.gerenteId      = ger?.id      || "";
          row.gerenteNombre  = ger?.nombre  || "";
          row.gerenteEmail   = ger?.email   || "";
          row.directorNombre = dir?.nombre  || "";
          row.directorEmail  = dir?.email   || "";
        }
        return row;
      });

      // 5. Construir AUTOMIND global
      // Excluir vendidos de meses anteriores (solo se muestran los del mes en curso)
      const _hoyLogin = new Date();
      const _mesActualLogin = _hoyLogin.getFullYear() * 100 + _hoyLogin.getMonth();
      const rowsSinVencidos = rowsEnriquecidas.filter(r => {
        if (r.estadoVenta !== "VENDIDO") return true;
        if (!r.fechaVenta) return true;
        const fv = r.fechaVenta instanceof Date ? r.fechaVenta : new Date(r.fechaVenta);
        return fv.getFullYear() * 100 + fv.getMonth() === _mesActualLogin;
      });

      // Vendedor: solo ve sus unidades asignadas + sin asignar (soporta multi-vendedor)
      const usuarioActualLogin = usuariosEnriquecidos.find(u => u.auth_user_id === me.auth_user_id) || me;
      const rowsParaRolLogin   = usuarioActualLogin?.rol === "vendedor"
        ? rowsSinVencidos.filter(r => {
            const ids = r.vendedorIds || (r.vendedorId ? [r.vendedorId] : []);
            return ids.length === 0 || ids.includes(usuarioActualLogin.id);
          })
        : rowsSinVencidos;
      window.AUTOMIND = {
        ROWS:      rowsParaRolLogin,
        USUARIOS:  usuariosEnriquecidos,
        KPIS:      computarKpis(rowsParaRolLogin),
        PIVOTE:    computarPivote(rowsParaRolLogin),
        TABLAS:    buildTablas(rowsParaRolLogin, usuariosEnriquecidos),
        agencyId:      agency.id,
        agencyParentId: agency.agency_id || agency.id, // agencia raíz (Coperva)
        enrichRowVendedor: (row, uList) => {
          const vend = uList.find(u => u.id === row.vendedorId) || null;
          const ger  = vend ? (uList.find(u => u.id === vend.reportaA) || null) : null;
          const dir  = ger  ? (uList.find(u => u.id === ger.reportaA)  || null) : null;
          row.vendedorNombre = vend?.nombre || "";
          row.vendedorEmail  = vend?.email  || "";
          row.gerenteId      = ger?.id      || "";
          row.gerenteNombre  = ger?.nombre  || "";
          row.gerenteEmail   = ger?.email   || "";
          row.directorNombre = dir?.nombre  || "";
          row.directorEmail  = dir?.email   || "";
          return row;
        },
      };

      // 6. Retornar config de tenant para la app
      const usuarioActual = usuarioActualLogin; // ya computado en paso 5
      onLogin({
        id:             agency.id,
        nombre:         agency.nombre,
        ciudad:         agency.ciudad,
        iniciales:      agency.iniciales || agency.nombre.slice(0, 2).toUpperCase(),
        accent:         agency.accent    || "#2f6fed",
        sidebar:        agency.sidebar   || "#1b2a57",
        usuarioActual,
        availableWorkspaces: ctx.allUserWorkspaces || [],
      });
    } catch (err) {
      setLoading(false);
      // Mapear errores de Supabase a mensajes amigables
      const msg = err.message || "";
      if (msg.includes("Invalid login") || msg.includes("invalid_credentials")) {
        setError("Correo o contraseña incorrectos.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Tu correo aún no está confirmado. Contacta a tu administrador para activar tu cuenta.");
      } else if (msg.includes("User not found") || msg.includes("not find user")) {
        setError("Usuario no encontrado. Verifica que el correo esté registrado.");
      } else {
        // No exponer mensajes crudos del backend al usuario final
        console.error("Login error:", err);
        setError("No se pudo iniciar sesión. Verifica tu conexión e intenta de nuevo.");
      }
    }
  };

  return (
    <div className="login-shell">
      {/* Panel izquierdo — branding */}
      <div className="login-side">
        <div className="login-brand">
          <span className="login-brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M3 6.5h11v9H3z" /><path d="M14 9.5h3.5L21 13v2.5h-7" />
              <circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" />
            </svg>
          </span>
          <span className="login-brand-name">Automind</span>
        </div>
        <div className="login-hero">
          <h1>Plan Piso<br />bajo control.</h1>
          <p>Semáforo en tiempo real, intereses calculados al día, y visibilidad completa del inventario para cada agencia.</p>
        </div>
        <div className="login-dots">
          <span /><span /><span />
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <h2>Iniciar sesión</h2>
            <p>Accede con las credenciales de tu agencia.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Correo electrónico</label>
              <input
                type="email"
                placeholder="agencia@ejemplo.mx"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="login-field">
              <label>Contraseña</label>
              <div className="login-pass-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button type="button" className="login-eye" onClick={() => setShowPass(s => !s)}>
                  {showPass
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="login-spinner" /> : null}
              {loading ? "Verificando…" : "Entrar"}
            </button>

            {resetSent ? (
              <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10,
                background:"#e7f5ed", color:"#1f9d57", fontSize:13, lineHeight:1.5 }}>
                ✅ Correo enviado a <b>{email}</b>. Revisa tu bandeja (y spam).
              </div>
            ) : (
              <button type="button"
                onClick={handleForgot}
                disabled={resetLoading}
                style={{ marginTop:12, background:"none", border:"none", color:"var(--muted)",
                  fontSize:13, cursor:"pointer", textDecoration:"underline", padding:0 }}>
                {resetLoading ? "Enviando…" : "¿Olvidaste tu contraseña?"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers para construir AUTOMIND desde datos de DB ───────── */

function computarKpis(rows) {
  const total        = rows.length;
  const interesTotal = rows.reduce((s, r) => s + (r.interesAcum || 0), 0);
  const montoTotal   = rows.reduce((s, r) => s + (r.montoFinanciado || 0), 0);
  // Contar por semáforo (dashboard usa kpis[sk])
  const saludable    = rows.filter(r => r.semaforo === "saludable").length;
  const rotacion     = rows.filter(r => r.semaforo === "rotacion").length;
  const comprometido = rows.filter(r => r.semaforo === "comprometido").length;
  const vencer       = rows.filter(r => r.semaforo === "vencer").length;
  const intereses    = rows.filter(r => r.semaforo === "intereses").length;
  return { total, interesTotal, montoTotal, saludable, rotacion, comprometido, vencer, intereses,
    vencidos: intereses, proximos: vencer }; // aliases para compatibilidad
}

function computarPivote(rows) {
  // Formato esperado por dashboard: { fins: [...], matriz: { [fin]: { saludable, rotacion, ... total, interes } } }
  const SEM_KEYS = ["saludable","rotacion","comprometido","vencer","intereses"];
  const matriz = {};
  rows.forEach(r => {
    const fin = "General";
    if (!matriz[fin]) {
      matriz[fin] = { total:0, interes:0 };
      SEM_KEYS.forEach(k => { matriz[fin][k] = 0; });
    }
    matriz[fin].total++;
    if (r.semaforo) matriz[fin][r.semaforo] = (matriz[fin][r.semaforo] || 0) + 1;
    matriz[fin].interes += r.interesAcum || 0;
  });
  return { fins: Object.keys(matriz), matriz };
}

function buildTablas(rows, usuarios) {
  // Formato que espera database.jsx: { key, titulo, ftype, fmt, w, align, sum, formula }
  const col = (key, titulo, ftype, extra={}) => ({ key, titulo, ftype, ...extra });

  const invCols = [
    col("id",                 "ID",               "text",   { w:90  }),
    col("vin",                "VIN",              "text",   { w:140 }),
    col("marca",              "Marca",            "text",   { w:100 }),
    col("modelo",             "Modelo",           "text",   { w:160 }),
    col("anio",               "Año",              "num",    { w:60  }),
    col("estatus",            "Estatus",          "select", { w:100 }),
    col("semaforo",           "Semáforo",         "select", { w:150 }),
    col("diasEnPiso",         "Días en piso",     "num",    { w:95, tipo:"calc", formula:"=DATEDIF(Fecha_Factura,HOY(),\"D\")-1" }),
    col("diasGraciaTotal",    "Gracia total",     "num",    { w:95 }),
    col("diasLibresRestantes","Días restantes",   "num",    { w:110, tipo:"calc", formula:"=Gracia_Total - Dias_En_Piso" }),
    col("pctPlanConsumido",   "% Plan",           "pct",    { w:80, fmt:"pct", tipo:"calc", formula:"=ROUND(Dias_En_Piso/Gracia_Total*100,0)" }),
    col("montoFinanciado",    "Monto financiado", "money",  { w:140, fmt:"money", sum:true }),
    col("pctInteres",         "Tasa anual",       "pct",    { w:90, fmt:"pct2" }),
    col("interesDiario",      "Interés diario",   "money",  { w:110, fmt:"money2", tipo:"calc", formula:"=Monto × Tasa / 365" }),
    col("interesAcum",        "Interés acum.",    "money",  { w:120, fmt:"money2", sum:true, tipo:"calc", formula:"=Dias_Vencidos × Interes_Diario" }),
    col("vendedorNombre",     "Vendedor",         "text",   { w:130 }),
    col("gerenteNombre",      "Gerente",          "text",   { w:130 }),
    col("directorNombre",     "Director",         "text",   { w:130 }),
  ];

  const colabCols = [
    col("id",           "ID",             "text",   { w:90  }),
    col("nombre",       "Nombre",         "text",   { w:160 }),
    col("email",        "Email",          "text",   { w:200 }),
    col("tel",          "Teléfono",       "text",   { w:130 }),
    col("rol",          "Rol",            "select", { w:100 }),
    col("reportaNombre","Reporta a",      "text",   { w:150 }),
    col("gerenteName",  "Gerente",        "text",   { w:150 }),
    col("gerenteEmail", "Email gerente",  "text",   { w:200 }),
    col("directorName", "Director",       "text",   { w:150 }),
    col("directorEmail","Email director", "text",   { w:200 }),
  ];

  return [
    { id:"inventario",    nombre:"Inventario",    cols: invCols,   rows },
    { id:"colaboradores", nombre:"Colaboradores", cols: colabCols, rows: usuarios },
  ];
}

Object.assign(window, { LoginScreen, computarKpis, computarPivote, buildTablas });
