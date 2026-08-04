/* Automind · Configuración de Alertas por Semáforo
   Permite configurar qué cambios de semáforo generan emails
   y a qué roles (vendedor, gerente, director). */

const SEM_CONFIG = [
  { key:"intereses",    emoji:"⚫", label:"En intereses",        desc:"Vehículo ya genera interés — urgente",      color:"#2d3142" },
  { key:"vencer",       emoji:"🔴", label:"Próximo a vencer",    desc:"Vence en los próximos 15 días",             color:"#e0492f" },
  { key:"comprometido", emoji:"🟠", label:"Margen comprometido", desc:"Más del 76% del plan consumido",            color:"#e07a20" },
  { key:"rotacion",     emoji:"🟡", label:"Rotación media",      desc:"Entre 61% y 76% del plan consumido",        color:"#d99613" },
  { key:"saludable",    emoji:"🟢", label:"Margen saludable",    desc:"Menos del 61% del plan consumido",          color:"#1f9d57" },
];

/* ── Variables disponibles para templates ───────────────────────────── */
const VARS_TEMPLATE = [
  { v:"[DESTINATARIO]",    desc:"Nombre del destinatario del mensaje" },
  { v:"[VEHICULO]",        desc:"Descripción del vehículo (marca, modelo, año)" },
  { v:"[VIN]",             desc:"VIN del vehículo" },
  { v:"[DIAS_EN_PISO]",    desc:"Días que lleva el vehículo en piso" },
  { v:"[PCT_PLAN]",        desc:"Porcentaje del plan de gracia consumido" },
  { v:"[INTERES_ACUM]",    desc:"Interés acumulado en pesos (ej: $1,250.00)" },
  { v:"[ESTADO_NUEVO]",    desc:"Nombre del nuevo estado del semáforo" },
  { v:"[ESTADO_ANTERIOR]", desc:"Nombre del estado anterior" },
  { v:"[VENDEDOR]",        desc:"Nombre del vendedor asignado al vehículo" },
  { v:"[FECHA]",           desc:"Fecha del evento (ej: 3 de julio de 2026)" },
];

/* ── Templates predeterminados ──────────────────────────────────────── */
const DEF_ASUNTO = "[ESTADO_NUEVO]: [VEHICULO]";

const DEF_EMAIL = {
  director: "Estimado [DESTINATARIO],\n\nLa unidad [VEHICULO] (VIN: [VIN]) cambió al estado «[ESTADO_NUEVO]». Lleva [DIAS_EN_PISO] días en piso con [PCT_PLAN]% del plan consumido.\n\nInterés acumulado: [INTERES_ACUM].",
  gerente:  "Hola [DESTINATARIO],\n\nLa unidad [VEHICULO] (VIN: [VIN]) de tu equipo cambió a «[ESTADO_NUEVO]». Día [DIAS_EN_PISO] en piso · [PCT_PLAN]% consumido · Interés: [INTERES_ACUM].\n\nVendedor asignado: [VENDEDOR].",
  vendedor: "Hola [DESTINATARIO],\n\nTu unidad [VEHICULO] cambió a «[ESTADO_NUEVO]». Lleva [DIAS_EN_PISO] días en piso. Comunícate con tu gerente para coordinar acciones.",
};

const DEF_TELEGRAM = {
  director: "<b>[ESTADO_NUEVO] · [VEHICULO]</b>\n━━━━━━━━━━━━━━━━\n🔖 VIN: <code>[VIN]</code>\n\n📅 Día <b>[DIAS_EN_PISO]</b> en piso\n📊 Plan: <b>[PCT_PLAN]%</b>\n💸 Interés: <b>[INTERES_ACUM]</b>\n\nEstimado [DESTINATARIO], se requiere atención inmediata.",
  gerente:  "<b>[ESTADO_NUEVO] · [VEHICULO]</b>\n━━━━━━━━━━━━━━━━\n🔖 VIN: <code>[VIN]</code>\n\n📅 Día <b>[DIAS_EN_PISO]</b> en piso\n📊 Plan: <b>[PCT_PLAN]%</b>\n💸 Interés: <b>[INTERES_ACUM]</b>\n\nHola [DESTINATARIO], unidad de [VENDEDOR].",
  vendedor: "<b>[ESTADO_NUEVO] · [VEHICULO]</b>\n\nHola [DESTINATARIO], tu unidad cambió de estado.\n📅 Día <b>[DIAS_EN_PISO]</b> en piso. Comunícate con tu gerente.",
};

const DEF_WHATSAPP = {
  director: "*[ESTADO_NUEVO]* · [VEHICULO]\n─────────────────\n🔖 VIN: `[VIN]`\n\n📅 Día *[DIAS_EN_PISO]* en piso\n📊 Plan consumido: *[PCT_PLAN]%*\n💸 Interés acumulado: *[INTERES_ACUM]*\n\nEstimado [DESTINATARIO], se requiere atención inmediata.",
  gerente:  "*[ESTADO_NUEVO]* · [VEHICULO]\n─────────────────\n🔖 VIN: `[VIN]`\n\n📅 Día *[DIAS_EN_PISO]* en piso\n📊 Plan consumido: *[PCT_PLAN]%*\n💸 Interés acumulado: *[INTERES_ACUM]*\n\nHola [DESTINATARIO], unidad de [VENDEDOR].",
  vendedor: "*[ESTADO_NUEVO]* · [VEHICULO]\n\nHola [DESTINATARIO], tu unidad cambió de estado.\n📅 Día *[DIAS_EN_PISO]* en piso. Comunícate con tu gerente.",
};

/* ── Helper: parsear formato WhatsApp → HTML seguro ─────────── */
function waHtml(text) {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = safe
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g,
      "<code style=\"background:#e9ecef;padding:1px 4px;border-radius:3px;font-size:.9em\">$1</code>")
    .replace(/\n/g, "<br/>");
  return { __html: html };
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width:42, height:24, borderRadius:12, border:"none", cursor: disabled?"default":"pointer",
        background: checked ? "var(--accent)" : "#d1d5e0",
        position:"relative", transition:"background .2s", flexShrink:0, opacity: disabled ? .4 : 1,
      }}>
      <span style={{
        position:"absolute", top:3, left: checked ? 21 : 3,
        width:18, height:18, borderRadius:"50%", background:"#fff",
        transition:"left .2s", display:"block",
        boxShadow:"0 1px 4px rgba(0,0,0,.2)",
      }} />
    </button>
  );
}

function AlertRuleRow({ rule, onUpdate, saving }) {
  const sem = SEM_CONFIG.find(s => s.key === rule.semaforo);
  if (!sem) return null;

  return (
    <div className="alert-rule-row" style={{
      display:"flex", alignItems:"center", gap:0,
      padding:"16px 24px", borderBottom:"1px solid var(--line-2)",
      opacity: rule.activa ? 1 : .55,
    }}>
      {/* Semáforo */}
      <div style={{ flex:"0 0 220px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>{sem.emoji}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--ink)" }}>{sem.label}</div>
            <div style={{ fontSize:12, color:"var(--muted)" }}>{sem.desc}</div>
          </div>
        </div>
      </div>

      {/* Activar alerta */}
      <div className="alert-col" style={{ flex:"0 0 120px" }}>
        <Toggle checked={rule.activa} onChange={v => onUpdate(rule.semaforo, "activa", v)} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>{rule.activa ? "Activa" : "Inactiva"}</span>
      </div>

      {/* Notificar vendedor */}
      <div className="alert-col">
        <Toggle checked={rule.notify_vendedor} onChange={v => onUpdate(rule.semaforo, "notify_vendedor", v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>Vendedor</span>
      </div>

      {/* Notificar gerente */}
      <div className="alert-col">
        <Toggle checked={rule.notify_gerente} onChange={v => onUpdate(rule.semaforo, "notify_gerente", v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>Gerente</span>
      </div>

      {/* Notificar director */}
      <div className="alert-col">
        <Toggle checked={rule.notify_director} onChange={v => onUpdate(rule.semaforo, "notify_director", v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>Director</span>
      </div>

      {/* Estado guardado */}
      <div style={{ flex:"0 0 60px", textAlign:"center" }}>
        {saving === rule.semaforo && (
          <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} />
        )}
      </div>
    </div>
  );
}

function LogRow({ entry }) {
  const semTo = SEM_CONFIG.find(s => s.key === entry.semaforo_to);
  const semFrom = entry.semaforo_from ? SEM_CONFIG.find(s => s.key === entry.semaforo_from) : null;
  const fecha = new Date(entry.created_at);
  const fmtDate = `${fecha.getDate()}/${fecha.getMonth()+1}/${fecha.getFullYear()} ${fecha.getHours()}:${String(fecha.getMinutes()).padStart(2,"0")}`;
  return (
    <tr>
      <td style={{ padding:"10px 16px", fontSize:13, color:"var(--muted)" }}>{fmtDate}</td>
      <td style={{ padding:"10px 16px", fontSize:13 }}>{entry.vehicle_desc || entry.vehicle_id}</td>
      <td style={{ padding:"10px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}>
          {semFrom && <span style={{ color:semFrom.color }}>{semFrom.emoji}</span>}
          {semFrom && <span style={{ color:"var(--muted)" }}>→</span>}
          <span style={{ color:semTo?.color||"#666" }}>{semTo?.emoji} {semTo?.label || entry.semaforo_to}</span>
        </div>
      </td>
      <td style={{ padding:"10px 16px", fontSize:12, color:"var(--muted)" }}>
        {(entry.sent_to||[]).join(", ") || "—"}
      </td>
    </tr>
  );
}

/* ── Fila de alerta con toggles de Telegram y WhatsApp ─────────────── */
function AlertRuleRowWithTg({ rule, onUpdate, onUpdateTg, onUpdateWp, wpEnabled, saving }) {
  const sem = SEM_CONFIG.find(s => s.key === rule.semaforo);
  if (!sem) return null;

  return (
    <div className="alert-rule-row" style={{
      display:"flex", alignItems:"center", gap:0,
      padding:"16px 24px", borderBottom:"1px solid var(--line-2)",
      opacity: rule.activa ? 1 : .55,
    }}>
      <div style={{ flex:"0 0 220px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>{sem.emoji}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--ink)" }}>{sem.label}</div>
            <div style={{ fontSize:12, color:"var(--muted)" }}>{sem.desc}</div>
          </div>
        </div>
      </div>
      <div className="alert-col" style={{ flex:"0 0 120px" }}>
        <Toggle checked={rule.activa} onChange={v => onUpdate(rule.semaforo, "activa", v)} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>{rule.activa ? "Activa" : "Inactiva"}</span>
      </div>
      <div className="alert-col">
        <Toggle checked={rule.notify_vendedor} onChange={v => onUpdate(rule.semaforo, "notify_vendedor", v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>Vendedor</span>
      </div>
      <div className="alert-col">
        <Toggle checked={rule.notify_gerente} onChange={v => onUpdate(rule.semaforo, "notify_gerente", v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>Gerente</span>
      </div>
      <div className="alert-col">
        <Toggle checked={rule.notify_director} onChange={v => onUpdate(rule.semaforo, "notify_director", v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, color:"var(--muted)" }}>Director</span>
      </div>
      {/* Columna Telegram */}
      <div className="alert-col">
        <Toggle checked={!!rule.telegram_enabled} onChange={v => onUpdateTg(rule.semaforo, v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, display:"flex", alignItems:"center", gap:3, color:"var(--muted)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><path d="M21.2 2L2 10.4l7.4 2.3L20 6.4l-8.9 8.1v5.5l3.3-3.3"/></svg>
          Telegram
        </span>
      </div>
      {/* Columna WhatsApp */}
      <div className="alert-col">
        <Toggle checked={!!wpEnabled} onChange={v => onUpdateWp && onUpdateWp(rule.semaforo, v)} disabled={!rule.activa} />
        <span style={{ fontSize:11, display:"flex", alignItems:"center", gap:3, color:"var(--muted)" }}>
          <svg viewBox="0 0 24 24" width="11" height="11">
            <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path fill="#25D366" d="M12 2C6.477 2 2 6.484 2 12.017c0 1.99.518 3.86 1.427 5.48L2 22l4.62-1.4A9.962 9.962 0 0012 22c5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm0 18.333a8.327 8.327 0 01-4.247-1.163l-.305-.18-3.14.953.899-3.173-.2-.32A8.333 8.333 0 1112 20.333z"/>
          </svg>
          WhatsApp
        </span>
      </div>
      <div style={{ flex:"0 0 40px", textAlign:"center" }}>
        {saving === rule.semaforo && (
          <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} />
        )}
      </div>
    </div>
  );
}

/* ── Tab Telegram ────────────────────────────────────────────────────── */
function TabTelegram({ usuarioActual, workspaceId, rules, onUpdateTg, saving }) {
  const [tgStatus,    setTgStatus]    = React.useState(null); // null | 'loading' | { chat_id } | 'not_linked'
  const [linkState,   setLinkState]   = React.useState(null); // null | 'loading' | { link, token } | 'error'
  const [copied,      setCopied]      = React.useState(false);
  const [testChatId,  setTestChatId]  = React.useState("");
  const [testTg,      setTestTg]      = React.useState(null); // null | 'loading' | 'ok' | 'error'

  // Comprobar si el usuario actual tiene Telegram vinculado
  React.useEffect(() => {
    checkMyTelegram();
  }, []);

  const isAgencyOwner = usuarioActual?.id === "agency-owner";

  async function checkMyTelegram() {
    setTgStatus("loading");
    try {
      const { data: { user } } = await window.DB.client.auth.getUser();
      if (!user) { setTgStatus("not_linked"); return; }
      if (isAgencyOwner) {
        // Admin: checar admin_telegram primero
        const { data: adminTg } = await window.DB.client
          .from("admin_telegram")
          .select("telegram_chat_id, telegram_username")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (adminTg?.telegram_chat_id) {
          setTgStatus({ chat_id: adminTg.telegram_chat_id, username: adminTg.telegram_username });
          return;
        }
        // Fallback: tabla users (agency owner también puede ser workspace user)
        const { data: userRow } = await window.DB.client
          .from("users")
          .select("telegram_chat_id, telegram_username")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (userRow?.telegram_chat_id) {
          setTgStatus({ chat_id: userRow.telegram_chat_id, username: userRow.telegram_username });
          return;
        }
        // Fallback: app_metadata
        const { data: { user: freshUser } } = await window.DB.client.auth.getUser();
        const chatId = freshUser?.app_metadata?.telegram_chat_id;
        setTgStatus(chatId ? { chat_id: chatId, username: freshUser.app_metadata?.telegram_username } : "not_linked");
      } else {
        const { data } = await window.DB.client
          .from("users")
          .select("telegram_chat_id, telegram_username")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        setTgStatus(data?.telegram_chat_id ? { chat_id: data.telegram_chat_id, username: data.telegram_username } : "not_linked");
      }
    } catch { setTgStatus("not_linked"); }
  }

  async function generateLink() {
    setLinkState("loading");
    try {
      // Usar RPC (Postgres function) en vez de Edge Function — más confiable
      const { data: json, error } = await window.DB.client.rpc("generate_telegram_token");
      if (error) { setLinkState({ errorMsg: error.message }); return; }
      if (json?.already_linked) {
        await checkMyTelegram();
        setLinkState(null);
      } else if (json?.link) {
        setLinkState({ link: json.link, token: json.token });
        // Refrescar estado cada 5 seg mientras el link está abierto
        const interval = setInterval(async () => {
          const { data: { user } } = await window.DB.client.auth.getUser();
          if (!user) { clearInterval(interval); return; }
          let linked = false;
          if (isAgencyOwner) {
            const { data: at } = await window.DB.client.from("admin_telegram")
              .select("telegram_chat_id").eq("auth_user_id", user.id).maybeSingle();
            if (at?.telegram_chat_id) { setTgStatus({ chat_id: at.telegram_chat_id }); linked = true; }
            if (!linked) {
              const { data: ur } = await window.DB.client.from("users")
                .select("telegram_chat_id").eq("auth_user_id", user.id).maybeSingle();
              if (ur?.telegram_chat_id) { setTgStatus({ chat_id: ur.telegram_chat_id }); linked = true; }
            }
          } else {
            const { data } = await window.DB.client.from("users")
              .select("telegram_chat_id").eq("auth_user_id", user.id).maybeSingle();
            if (data?.telegram_chat_id) { setTgStatus({ chat_id: data.telegram_chat_id }); linked = true; }
          }
          if (linked) { setLinkState(null); clearInterval(interval); }
        }, 5000);
        setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
      } else {
        setLinkState({ errorMsg: JSON.stringify(json) });
      }
    } catch(e) { setLinkState({ errorMsg: "Error: " + e.message }); }
  }

  async function disconnect() {
    if (!confirm("¿Seguro que deseas desvincular tu Telegram?")) return;
    try {
      const { data: { user } } = await window.DB.client.auth.getUser();
      if (isAgencyOwner) {
        // Admin: usar RPC para limpiar admin_telegram
        await window.DB.client.rpc("unlink_telegram");
        setTgStatus("not_linked"); setLinkState(null); return;
      } else {
        await window.DB.client.from("users")
          .update({ telegram_chat_id: null, telegram_username: null })
          .eq("auth_user_id", user.id);
      }
      setTgStatus("not_linked");
      setLinkState(null);
    } catch(e) { alert("Error al desvincular: " + e.message); }
  }

  async function sendTestTg() {
    if (!testChatId) return;
    setTestTg("loading");
    try {
      const { data: { session } } = await window.DB.client.auth.getSession();
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/send-telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": window.SUPABASE_ANON,
        },
        body: JSON.stringify({
          chat_id: testChatId,
          message: "⚫ <b>CRÍTICO · En intereses — PRUEBA</b>\n━━━━━━━━━━━━━━━━━━━━\n🚗 <b>Jetta Trendline 2026 · TEST-001</b>\n\n📅 Día <b>95</b> en piso\n📊 Plan consumido: <b>110%</b> 🔴 → ⚫\n💸 Interés acumulado: <b>$1,250.00</b>\n\nEste es un mensaje de prueba de Automind Plan Piso.",
        }),
      });
      const json = await res.json();
      if (json.ok || json.result?.ok) {
        setTestTg("ok");
      } else {
        const detalle = json.error || json.result?.description || "Respuesta inesperada";
        setTestTg({ error: detalle });
      }
    } catch(e) {
      setTestTg({ error: e.message || "Error de red" });
    }
    setTimeout(() => setTestTg(null), 7000);
  }

  const isLinked = tgStatus && tgStatus !== "loading" && tgStatus !== "not_linked";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── Mi cuenta ──────────────────────────────────────────────── */}
      <div className="dcard" style={{ padding:"24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
          {/* Icono Telegram */}
          <div style={{ width:48, height:48, borderRadius:14, background:"#229ED9",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
              <path d="M21.2 2L2 10.4l7.4 2.3L20 6.4l-8.9 8.1v5.5l3.3-3.3"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)", marginBottom:3 }}>
              Mi cuenta de Telegram
            </div>
            {tgStatus === "loading" ? (
              <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} />
            ) : isLinked ? (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ background:"#dcfce7", color:"#166534", fontSize:12, fontWeight:700,
                    padding:"3px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
                    Vinculado
                  </span>
                  {tgStatus.username && (
                    <span style={{ fontSize:13, color:"var(--muted)" }}>@{tgStatus.username}</span>
                  )}
                  <span style={{ fontSize:12, color:"var(--muted)" }}>
                    · Chat ID: <code style={{ background:"var(--bg)", padding:"1px 5px", borderRadius:4, fontSize:11 }}>
                      {tgStatus.chat_id}
                    </code>
                  </span>
                </div>
                <p style={{ margin:"0 0 12px", fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
                  Recibirás alertas en tu Telegram cuando las reglas de la derecha tengan el canal Telegram activado.
                </p>
                <button className="btn" style={{ fontSize:13, color:"#e0492f" }} onClick={disconnect}>
                  Desvincular mi Telegram
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
                  Vincula tu cuenta para recibir alertas de semáforo directamente en Telegram.
                  El proceso tarda menos de 30 segundos.
                </p>
                {!linkState && (
                  <button className="btn primary" onClick={generateLink}>
                    Conectar mi Telegram
                  </button>
                )}
                {linkState === "loading" && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--muted)" }}>
                    <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} />
                    Generando enlace…
                  </div>
                )}
                {linkState?.link && (
                  <div style={{ background:"#f0f7ff", border:"1px solid #bfdbfe",
                    borderRadius:12, padding:"16px 18px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1d4ed8",
                      textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>
                      Paso a paso
                    </div>
                    <ol style={{ margin:"0 0 14px", paddingLeft:18, fontSize:13,
                      color:"var(--ink-2)", lineHeight:1.8, display:"flex", flexDirection:"column", gap:2 }}>
                      <li>Abre el enlace de abajo en tu dispositivo con Telegram</li>
                      <li>El bot se abrirá — presiona <strong>Iniciar</strong></li>
                      <li>Esta pantalla se actualizará automáticamente ✓</li>
                    </ol>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <a href={linkState.link} target="_blank" rel="noopener noreferrer"
                        className="btn primary" style={{ textDecoration:"none", fontSize:13 }}>
                        Abrir bot de Telegram
                      </a>
                      <button className="btn" style={{ fontSize:13 }} onClick={() => {
                        navigator.clipboard.writeText(linkState.link);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}>
                        {copied ? "✓ Copiado" : "Copiar enlace"}
                      </button>
                    </div>
                    <div style={{ marginTop:10, fontSize:11, color:"var(--muted)" }}>
                      ⏰ El enlace expira en 30 minutos · Esperando confirmación…
                      <span className="login-spinner" style={{ width:10, height:10, borderWidth:2,
                        marginLeft:6, display:"inline-block", verticalAlign:"middle" }} />
                    </div>
                  </div>
                )}
                {linkState?.errorMsg && (
                  <div className="fb-err">Error: {linkState.errorMsg}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reglas con Telegram ────────────────────────────────────── */}
      <div className="dcard">
        <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--line-2)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:3 }}>
            ¿Cuándo enviar alertas por Telegram?
          </div>
          <div style={{ fontSize:12, color:"var(--muted)" }}>
            Los estados con Telegram activado envían el mensaje al canal además del email — solo a usuarios que tengan su Telegram vinculado.
          </div>
        </div>
        <div className="alert-hd" style={{ display:"flex", padding:"10px 24px", gap:0 }}>
          <div style={{ flex:"0 0 220px" }}>Estado</div>
          <div style={{ flex:1, textAlign:"center" }}>Activa en email</div>
          <div style={{ flex:1, textAlign:"center", color:"#229ED9" }}>Telegram</div>
          <div style={{ flex:"0 0 40px" }}></div>
        </div>
        {rules.map(rule => {
          const sem = SEM_CONFIG.find(s => s.key === rule.semaforo);
          if (!sem) return null;
          return (
            <div key={rule.semaforo} style={{
              display:"flex", alignItems:"center", padding:"14px 24px",
              borderBottom:"1px solid var(--line-2)", opacity: rule.activa ? 1 : .55,
            }}>
              <div style={{ flex:"0 0 220px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>{sem.emoji}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{sem.label}</span>
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <span style={{ fontSize:11, color: rule.activa ? "#1f9d57" : "var(--muted)",
                  fontWeight:600 }}>{rule.activa ? "✓ Activa" : "Inactiva"}</span>
              </div>
              <div className="alert-col" style={{ flex:1, justifyContent:"center" }}>
                <Toggle checked={!!rule.telegram_enabled} onChange={v => onUpdateTg(rule.semaforo, v)}
                  disabled={!rule.activa} />
                <span style={{ fontSize:11, color: rule.telegram_enabled ? "#229ED9" : "var(--muted)" }}>
                  {rule.telegram_enabled ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div style={{ flex:"0 0 40px", textAlign:"center" }}>
                {saving === rule.semaforo && (
                  <span className="login-spinner" style={{ width:12, height:12, borderWidth:2 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Prueba directa ─────────────────────────────────────────── */}
      <div className="dcard" style={{ padding:"20px 24px" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>
          📱 Prueba de mensaje Telegram
        </div>
        <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>
          Ingresa un Chat ID para enviar un mensaje de prueba directamente.
          Puedes obtener tu Chat ID enviando <code style={{ background:"var(--bg)", padding:"1px 5px", borderRadius:4 }}>
            /status</code> al bot después de vincularte.
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <input type="text" value={testChatId} onChange={e => setTestChatId(e.target.value)}
            placeholder="Ej: 123456789"
            style={{ flex:1, minWidth:180, height:38, border:"1.5px solid var(--line)", borderRadius:9,
              padding:"0 12px", fontSize:14, fontFamily:"inherit", color:"var(--ink)", background:"var(--bg)" }} />
          <button className="btn primary" onClick={sendTestTg}
            disabled={testTg === "loading" || !testChatId} style={{ flexShrink:0 }}>
            {testTg === "loading"
              ? <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} />
              : null}
            {testTg === "loading" ? " Enviando…" : "Enviar mensaje de prueba"}
          </button>
          {testTg === "ok"    && <span className="fb-ok" style={{ width:"100%" }}>✓ Mensaje enviado correctamente</span>}
          {testTg && testTg.error && (
            <span className="fb-err" style={{ width:"100%" }}>
              ✗ {testTg.error}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

/* ── Tab WhatsApp ─────────────────────────────────────────────────────── */
function TabWhatsApp({ wpRules, setWpRules, onUpdateWp, rules, wpTels, setWpTels, onSaveWpTels, workspaceId }) {
  const WA       = "#25D366";
  const WA_BG    = "#e5ddd5";
  const WA_CHAT_BG = "#075E54";

  /* Números por rol — manejados por props del padre */
  const [savedNums,  setSavedNums]  = React.useState(false);
  const [savingNums, setSavingNums] = React.useState(false);

  /* Plantillas por semáforo + rol — inicializar desde mensajes guardados en BD */
  const [drafts, setDrafts] = React.useState(() =>
    SEM_CONFIG.reduce((acc, s) => {
      const ruleWa = (rules.find(r => r.semaforo === s.key)?.mensajes?.whatsapp) || {};
      return {
        ...acc,
        [s.key]: {
          director: ruleWa.director || DEF_WHATSAPP.director,
          gerente:  ruleWa.gerente  || DEF_WHATSAPP.gerente,
          vendedor: ruleWa.vendedor || DEF_WHATSAPP.vendedor,
        },
      };
    }, {})
  );

  /* Vista previa */
  const [previewSem, setPreviewSem] = React.useState("intereses");
  const [previewRol, setPreviewRol] = React.useState("director");
  const [savedTpl,   setSavedTpl]   = React.useState(false);
  const [savingTpl,  setSavingTpl]  = React.useState(false);

  const currentDraft = ((drafts[previewSem] || {})[previewRol]) || DEF_WHATSAPP[previewRol] || "";

  function setDraft(val) {
    setDrafts(prev => ({
      ...prev,
      [previewSem]: { ...(prev[previewSem] || {}), [previewRol]: val },
    }));
  }

  function restoreTpl() {
    setDraft(DEF_WHATSAPP[previewRol] || "");
  }

  async function saveTpl() {
    if (!workspaceId) return;
    setSavingTpl(true);
    try {
      // Leer mensajes actuales para no pisar email/telegram
      const { data: ruleRow } = await window.DB.client
        .from("alert_rules")
        .select("mensajes")
        .eq("workspace_id", workspaceId)
        .eq("semaforo", previewSem)
        .maybeSingle();
      const existing = ruleRow?.mensajes || {};
      const waTpls = drafts[previewSem] || {};
      const { error } = await window.DB.client
        .from("alert_rules")
        .update({
          mensajes: {
            ...existing,
            whatsapp: {
              director: waTpls.director || DEF_WHATSAPP.director,
              gerente:  waTpls.gerente  || DEF_WHATSAPP.gerente,
              vendedor: waTpls.vendedor || DEF_WHATSAPP.vendedor,
            },
          },
        })
        .eq("workspace_id", workspaceId)
        .eq("semaforo", previewSem);
      if (error) throw error;
      setSavedTpl(true);
      setTimeout(() => setSavedTpl(false), 2000);
    } catch(e) {
      alert("Error al guardar plantilla: " + e.message);
    } finally {
      setSavingTpl(false);
    }
  }

  async function handleSaveNums() {
    setSavingNums(true);
    try {
      await onSaveWpTels();
      setSavedNums(true);
      setTimeout(() => setSavedNums(false), 2000);
    } catch(e) {
      alert("Error al guardar números: " + e.message);
    } finally {
      setSavingNums(false);
    }
  }

  function fillPreview(tpl, rol) {
    const names = { director:"Carlos Martínez", gerente:"Luis Hernández", vendedor:"Ana Torres" };
    return tpl
      .replace(/\[VEHICULO\]/g,        "Jetta Trendline 2026")
      .replace(/\[VIN\]/g,             "3VWCP6BU1TM016475")
      .replace(/\[DIAS_EN_PISO\]/g,    "89")
      .replace(/\[PCT_PLAN\]/g,        "103")
      .replace(/\[INTERES_ACUM\]/g,    "$1,250.00")
      .replace(/\[ESTADO_NUEVO\]/g,    "En intereses ⚫")
      .replace(/\[ESTADO_ANTERIOR\]/g, "Próximo a vencer 🔴")
      .replace(/\[DESTINATARIO\]/g,    names[rol] || "—")
      .replace(/\[VENDEDOR\]/g,        "Ana Torres")
      .replace(/\[FECHA\]/g,           "6 de julio de 2026");
  }

  const previewText = fillPreview(currentDraft, previewRol);
  const now = new Date();
  const previewTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  /* ── Icono WA reutilizable ── */
  function IcoWA({ size=16, fill="#fff" }) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <path fill={fill} d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path fill={fill} d="M12 2C6.477 2 2 6.484 2 12.017c0 1.99.518 3.86 1.427 5.48L2 22l4.62-1.4A9.962 9.962 0 0012 22c5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm0 18.333a8.327 8.327 0 01-4.247-1.163l-.305-.18-3.14.953.899-3.173-.2-.32A8.333 8.333 0 1112 20.333z"/>
      </svg>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── 1. Estado de conexión WhatsApp Business ──────────── */}
      <div className="dcard" style={{ padding:"24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
          {/* Icono */}
          <div style={{ width:48, height:48, borderRadius:14, background:WA,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <IcoWA size={26} fill="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>
                WhatsApp Business
              </div>
              <span style={{ background:"#dcfce7", color:"#166534", fontSize:12, fontWeight:700,
                padding:"3px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
                Configurado
              </span>
              <span style={{ marginLeft:"auto", background:"#fef9c3", color:"#854d0e",
                fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
                Beta
              </span>
            </div>
            <p style={{ margin:"0 0 12px", fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
              Las credenciales de la API de Meta (token de acceso y Phone Number ID) están configuradas
              en el servidor. Para actualizarlas, contacta al administrador del sistema.
            </p>
            <div style={{ fontSize:12, color:"var(--muted)", background:"var(--bg)",
              borderRadius:8, padding:"10px 13px", display:"flex", gap:6, alignItems:"flex-start" }}>
              <span>ℹ️</span>
              <span>
                Las alertas se envían vía <strong>Meta Cloud API</strong>.
                El token se almacena de forma segura como variable de entorno del servidor — nunca en el cliente.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Números de destino por rol ────────────────────── */}
      <div className="dcard" style={{ padding:"24px" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)", marginBottom:3 }}>
          Números de destino por rol
        </div>
        <div style={{ fontSize:12.5, color:"var(--muted)", marginBottom:18, lineHeight:1.6 }}>
          A estos números se enviarán las alertas de WhatsApp según las reglas configuradas abajo.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[["director","Director"],["gerente","Gerente"]].map(([rol, label]) => (
            <div key={rol} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:76, fontSize:13, fontWeight:600,
                color:"var(--ink-2)", flexShrink:0 }}>{label}</div>
              <span style={{ display:"flex", alignItems:"center", padding:"0 11px",
                background:"var(--bg)", border:"1.5px solid var(--line)",
                borderRight:"none", borderRadius:"9px 0 0 9px",
                fontSize:13, color:"var(--muted)", height:38, flexShrink:0, userSelect:"none" }}>
                +52
              </span>
              <input type="tel"
                value={wpTels[rol]}
                onChange={e => setWpTels(p => ({...p, [rol]: e.target.value}))}
                placeholder={`Celular del ${label.toLowerCase()} (10 dígitos)`}
                style={{ flex:1, height:38, border:"1.5px solid var(--line)",
                  borderRadius:"0 9px 9px 0", padding:"0 12px", fontSize:13,
                  fontFamily:"inherit", color:"var(--ink)", background:"var(--bg)" }} />
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, paddingTop:4 }}>
            <div style={{ width:76, fontSize:13, fontWeight:600,
              color:"var(--ink-2)", flexShrink:0, paddingTop:2 }}>Vendedor</div>
            <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
              Se usa el número de celular registrado en el perfil de cada vendedor asignado al vehículo.
            </div>
          </div>
        </div>
        <div style={{ marginTop:18, display:"flex", justifyContent:"flex-end",
          alignItems:"center", gap:10 }}>
          {savedNums && (
            <span style={{ fontSize:12, color:"#1f9d57", fontWeight:700 }}>✓ Guardado</span>
          )}
          <button className="btn primary" style={{ fontSize:13 }}
            onClick={handleSaveNums} disabled={savingNums}>
            {savingNums
              ? <span className="login-spinner" style={{ width:13, height:13, borderWidth:2 }} />
              : null}
            {savingNums ? " Guardando…" : "Guardar números"}
          </button>
        </div>
      </div>

      {/* ── 3. Reglas: cuándo enviar por WhatsApp ────────────── */}
      <div className="dcard">
        <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--line-2)" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:3 }}>
            ¿Cuándo enviar alertas por WhatsApp?
          </div>
          <div style={{ fontSize:12, color:"var(--muted)" }}>
            Los estados activados enviarán un mensaje de WhatsApp además del email —
            solo a los roles con número registrado arriba.
          </div>
        </div>
        <div className="alert-hd" style={{ display:"flex", padding:"10px 24px", gap:0 }}>
          <div style={{ flex:"0 0 220px" }}>Estado</div>
          <div style={{ flex:1, textAlign:"center" }}>Activa en email</div>
          <div style={{ flex:1, textAlign:"center", color:WA }}>WhatsApp</div>
          <div style={{ flex:"0 0 40px" }}></div>
        </div>
        {rules.map(rule => {
          const sem = SEM_CONFIG.find(s => s.key === rule.semaforo);
          if (!sem) return null;
          return (
            <div key={rule.semaforo} style={{
              display:"flex", alignItems:"center", padding:"14px 24px",
              borderBottom:"1px solid var(--line-2)",
              opacity: rule.activa ? 1 : .55,
            }}>
              <div style={{ flex:"0 0 220px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>{sem.emoji}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{sem.label}</span>
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <span style={{ fontSize:11, color: rule.activa ? "#1f9d57" : "var(--muted)",
                  fontWeight:600 }}>{rule.activa ? "✓ Activa" : "Inactiva"}</span>
              </div>
              <div className="alert-col" style={{ flex:1, justifyContent:"center" }}>
                <Toggle
                  checked={!!wpRules[rule.semaforo]}
                  onChange={v => onUpdateWp(rule.semaforo, v)}
                  disabled={!rule.activa}
                />
                <span style={{ fontSize:11, color: wpRules[rule.semaforo] ? WA : "var(--muted)" }}>
                  {wpRules[rule.semaforo] ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div style={{ flex:"0 0 40px" }} />
            </div>
          );
        })}
        <div style={{ padding:"13px 24px", fontSize:12.5, color:"var(--muted)",
          borderTop:"1px solid var(--line-2)" }}>
          💡 Las alertas de WhatsApp requieren conexión activa con la API de Meta y número registrado para cada rol.
        </div>
      </div>

      {/* ── 4. Plantilla + Vista previa ──────────────────────── */}
      <div className="dcard" style={{ padding:"24px" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)", marginBottom:3 }}>
          Plantilla de mensaje
        </div>
        <div style={{ fontSize:12.5, color:"var(--muted)", marginBottom:16, lineHeight:1.6 }}>
          Personaliza el texto por semáforo y rol. Usa{" "}
          <code style={{ background:"var(--bg)", padding:"1px 6px", borderRadius:4, fontSize:11.5 }}>*negrita*</code>,{" "}
          <code style={{ background:"var(--bg)", padding:"1px 6px", borderRadius:4, fontSize:11.5 }}>_cursiva_</code> y{" "}
          <code style={{ background:"var(--bg)", padding:"1px 6px", borderRadius:4, fontSize:11.5 }}>`código`</code> — formato nativo de WhatsApp.
        </div>

        {/* Selector semáforo */}
        <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
          {SEM_CONFIG.map(s => (
            <button key={s.key} onClick={() => setPreviewSem(s.key)}
              style={{ padding:"4px 13px", borderRadius:20, border:"1.5px solid",
                cursor:"pointer", fontSize:12, fontWeight: previewSem === s.key ? 700 : 400,
                borderColor: previewSem === s.key ? s.color : "var(--line)",
                background: previewSem === s.key ? s.color + "1a" : "transparent",
                color: previewSem === s.key ? s.color : "var(--muted)",
                transition:"all .15s" }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* Grid editor + preview */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:22, alignItems:"start" }}>

          {/* ── Editor ── */}
          <div>
            {/* Tabs de rol */}
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              {[["director","Director"],["gerente","Gerente"],["vendedor","Vendedor"]].map(([r,l]) => (
                <button key={r} onClick={() => setPreviewRol(r)}
                  style={{ padding:"5px 16px", borderRadius:20, border:"1.5px solid",
                    cursor:"pointer", fontSize:12,
                    fontWeight: previewRol === r ? 700 : 400,
                    borderColor: previewRol === r ? "var(--accent)" : "var(--line)",
                    background: previewRol === r ? "#e8f0fe" : "transparent",
                    color: previewRol === r ? "var(--accent)" : "var(--muted)" }}>
                  {l}
                </button>
              ))}
            </div>
            <textarea rows={9}
              value={currentDraft}
              onChange={e => setDraft(e.target.value)}
              style={{ width:"100%", border:"1.5px solid var(--line)", borderRadius:9,
                padding:"10px 13px", fontSize:13,
                fontFamily:"'Cascadia Code','Cascadia Mono',monospace",
                resize:"vertical", boxSizing:"border-box", lineHeight:1.7,
                color:"var(--ink)", background:"var(--bg)" }} />
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginTop:10 }}>
              <button onClick={restoreTpl}
                style={{ fontSize:11.5, color:"var(--muted)", background:"none",
                  border:"none", cursor:"pointer", padding:0,
                  textDecoration:"underline" }}>
                Restaurar predeterminado
              </button>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {savedTpl && (
                  <span style={{ fontSize:12, color:"#1f9d57", fontWeight:700 }}>✓ Guardado</span>
                )}
                <button className="btn primary" style={{ fontSize:13 }}
                  onClick={saveTpl} disabled={savingTpl}>
                  {savingTpl
                    ? <><span className="login-spinner" style={{ width:12, height:12, borderWidth:2 }} /> Guardando…</>
                    : "Guardar plantilla"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Vista previa ── */}
          <div>
            <div style={{ fontSize:11.5, fontWeight:700, color:"var(--muted)", marginBottom:8,
              textTransform:"uppercase", letterSpacing:".06em" }}>
              Vista previa
            </div>
            {/* Marco de chat */}
            <div style={{ border:"2px solid var(--line)", borderRadius:16, overflow:"hidden" }}>
              {/* Header estilo WA */}
              <div style={{ background:WA_CHAT_BG, padding:"10px 14px",
                display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:WA,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"#fff", lineHeight:1.2 }}>
                    Automind Alertas
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.65)" }}>en línea</div>
                </div>
              </div>
              {/* Área de chat */}
              <div style={{ background:WA_BG, padding:"14px 12px",
                minHeight:180, display:"flex", flexDirection:"column",
                justifyContent:"flex-end", gap:6 }}>
                {/* Burbuja enviada */}
                <div style={{ alignSelf:"flex-end", background:"#dcf8c6",
                  borderRadius:"12px 12px 3px 12px", padding:"8px 11px",
                  maxWidth:"92%", boxShadow:"0 1px 2px rgba(0,0,0,.13)" }}>
                  <div style={{ fontSize:12.5, lineHeight:1.55, color:"#111",
                    wordBreak:"break-word" }}
                    dangerouslySetInnerHTML={waHtml(previewText)} />
                  <div style={{ fontSize:10, color:"#8fa3b1", textAlign:"right",
                    marginTop:5, display:"flex", alignItems:"center",
                    justifyContent:"flex-end", gap:3 }}>
                    {previewTime}
                    <svg viewBox="0 0 18 10" fill="none" width="18" height="10">
                      <path d="M1 5l3.5 3.5L9.5 2M6 5l3.5 3.5L14.5 2" stroke="#34b7f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize:11, color:"var(--muted)", marginTop:6,
              textAlign:"center", lineHeight:1.5 }}>
              Vista previa con datos de ejemplo
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

/* ── Tab: Editor de plantillas de mensajes ───────────────────────────── */
function TabMensajes({ rules, workspaceId }) {
  const [expandido, setExpandido] = React.useState(null);
  const [canal,     setCanal]     = React.useState("email");
  const [rolTab,    setRolTab]    = React.useState("director");
  const [drafts,    setDrafts]    = React.useState({});
  const [savingMsj, setSavingMsj] = React.useState(null);
  const [savedMsj,  setSavedMsj]  = React.useState(null);
  const [clipMsg,   setClipMsg]   = React.useState(null);

  // Inicializar drafts desde mensajes guardados en cada regla
  React.useEffect(() => {
    const init = {};
    rules.forEach(r => { init[r.semaforo] = r.mensajes || {}; });
    setDrafts(init);
  }, [rules]);

  // Obtener el valor actual del draft (o el predeterminado si no hay customización)
  function getDraft(sem, canalKey, rolKey) {
    const c = (drafts[sem] || {})[canalKey] || {};
    if (rolKey in c) return c[rolKey];
    if (canalKey === "email") return rolKey === "asunto" ? DEF_ASUNTO : (DEF_EMAIL[rolKey] || "");
    return DEF_TELEGRAM[rolKey] || "";
  }

  function setDraft(sem, canalKey, rolKey, val) {
    setDrafts(prev => ({
      ...prev,
      [sem]: {
        ...(prev[sem] || {}),
        [canalKey]: { ...((prev[sem] || {})[canalKey] || {}), [rolKey]: val },
      },
    }));
  }

  async function handleSave(sem) {
    setSavingMsj(sem);
    try {
      // Guardar el objeto COMPLETO tal como aparece en las textareas
      // (incluyendo defaults para campos que el usuario no editó explícitamente).
      // Esto garantiza que la Edge Function siempre encuentre valores explícitos
      // en mensajes.telegram/email en lugar de caer al fallback DEF_TELEGRAM/DEF_EMAIL.
      const mensajesCompleto = {
        email: {
          asunto:   getDraft(sem, "email", "asunto"),
          director: getDraft(sem, "email", "director"),
          gerente:  getDraft(sem, "email", "gerente"),
          vendedor: getDraft(sem, "email", "vendedor"),
        },
        telegram: {
          director: getDraft(sem, "telegram", "director"),
          gerente:  getDraft(sem, "telegram", "gerente"),
          vendedor: getDraft(sem, "telegram", "vendedor"),
        },
      };
      const { error } = await window.DB.client
        .from("alert_rules")
        .update({ mensajes: mensajesCompleto })
        .eq("workspace_id", workspaceId)
        .eq("semaforo", sem);
      if (error) throw error;
      // Sincronizar drafts locales con lo guardado
      setDrafts(prev => ({ ...prev, [sem]: mensajesCompleto }));
      setSavedMsj(sem);
      setTimeout(() => setSavedMsj(s => s === sem ? null : s), 2500);
    } catch(e) {
      alert("Error al guardar mensajes: " + e.message);
    } finally {
      setSavingMsj(null);
    }
  }

  function handleRestaurar(sem, canalKey, rolKey) {
    if (!confirm("¿Restaurar al mensaje predeterminado?")) return;
    setDrafts(prev => {
      const d = { ...(prev[sem] || {}) };
      const c = { ...(d[canalKey] || {}) };
      delete c[rolKey];
      d[canalKey] = c;
      return { ...prev, [sem]: d };
    });
  }

  function copyVar(v) {
    navigator.clipboard.writeText(v).catch(() => {});
    setClipMsg(v);
    setTimeout(() => setClipMsg(c => c === v ? null : c), 1500);
  }

  const ROLES = ["director","gerente","vendedor"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* ── Panel de variables ── */}
      <div className="dcard" style={{ padding:"16px 20px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)", marginBottom:10,
          textTransform:"uppercase", letterSpacing:".06em" }}>
          Variables disponibles — clic para copiar
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {VARS_TEMPLATE.map(({ v, desc }) => (
            <button key={v} onClick={() => copyVar(v)} title={desc}
              style={{
                background: clipMsg === v ? "#dcfce7" : "var(--bg)",
                border:"1.5px solid " + (clipMsg === v ? "#22c55e" : "var(--line)"),
                borderRadius:6, padding:"3px 10px", fontSize:12,
                fontFamily:"'Cascadia Code','Cascadia Mono',monospace",
                cursor:"pointer",
                color: clipMsg === v ? "#166534" : "var(--accent)",
                fontWeight:600, transition:"all .15s",
              }}>
              {clipMsg === v ? "✓ copiado" : v}
            </button>
          ))}
        </div>
        <div style={{ fontSize:11, color:"var(--muted)", marginTop:8 }}>
          Úsalas en tus mensajes exactamente como aparecen, entre corchetes. Se sustituyen automáticamente al enviar.
        </div>
      </div>

      {/* ── Semáforos expandibles ── */}
      {SEM_CONFIG.map(sem => {
        const open = expandido === sem.key;
        return (
          <div key={sem.key} className="dcard" style={{ overflow:"hidden" }}>

            {/* Header del semáforo */}
            <button onClick={() => setExpandido(open ? null : sem.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"16px 20px", background:"none", border:"none",
                cursor:"pointer", textAlign:"left" }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{sem.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:"var(--ink)" }}>{sem.label}</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>{sem.desc}</div>
              </div>
              {savedMsj === sem.key && (
                <span style={{ fontSize:12, color:"#1f9d57", fontWeight:700, flexShrink:0 }}>
                  ✓ Guardado
                </span>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
                style={{ transform: open ? "rotate(90deg)" : "none",
                  transition:"transform .2s", color:"var(--muted)", flexShrink:0 }}>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            {/* Editor (expandido) */}
            {open && (
              <div style={{ borderTop:"1px solid var(--line-2)", padding:"0 20px 20px" }}>

                {/* Canal tabs */}
                <div style={{ display:"flex", gap:0, marginTop:14, marginBottom:14,
                  borderBottom:"2px solid var(--line-2)" }}>
                  {[["email","✉ Email"],["telegram","✈ Telegram"]].map(([k, lbl]) => (
                    <button key={k} onClick={() => setCanal(k)}
                      style={{ padding:"8px 18px", border:"none", background:"none",
                        cursor:"pointer", fontSize:13,
                        fontWeight: canal === k ? 700 : 400,
                        color: canal === k ? "var(--accent)" : "var(--muted)",
                        borderBottom: canal === k
                          ? "2px solid var(--accent)" : "2px solid transparent",
                        marginBottom:"-2px" }}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Rol tabs */}
                <div style={{ display:"flex", gap:6, marginBottom:16 }}>
                  {ROLES.map(r => (
                    <button key={r} onClick={() => setRolTab(r)}
                      style={{ padding:"5px 16px", borderRadius:20, border:"1.5px solid",
                        cursor:"pointer", fontSize:12,
                        fontWeight: rolTab === r ? 700 : 400,
                        borderColor: rolTab === r ? "var(--accent)" : "var(--line)",
                        background: rolTab === r ? "#e8f0fe" : "transparent",
                        color: rolTab === r ? "var(--accent)" : "var(--muted)" }}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>

                {canal === "email" ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {/* Asunto — solo en pestaña Director para no repetirlo */}
                    {rolTab === "director" && (
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:5 }}>
                          <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)" }}>
                            Asunto del correo
                            <span style={{ fontWeight:400, color:"var(--muted)", marginLeft:6 }}>
                              (aplica a todos los roles)
                            </span>
                          </label>
                          <button onClick={() => handleRestaurar(sem.key, "email", "asunto")}
                            style={{ fontSize:11, color:"var(--muted)", background:"none",
                              border:"none", cursor:"pointer", padding:0,
                              textDecoration:"underline" }}>
                            Restaurar
                          </button>
                        </div>
                        <input
                          value={getDraft(sem.key, "email", "asunto")}
                          onChange={e => setDraft(sem.key, "email", "asunto", e.target.value)}
                          style={{ width:"100%", border:"1.5px solid var(--line)", borderRadius:8,
                            padding:"8px 12px", fontSize:13, fontFamily:"inherit",
                            boxSizing:"border-box", color:"var(--ink)", background:"var(--bg)" }}
                        />
                      </div>
                    )}
                    {/* Cuerpo por rol */}
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:5 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)" }}>
                          Mensaje para {rolTab.charAt(0).toUpperCase() + rolTab.slice(1)}
                        </label>
                        <button onClick={() => handleRestaurar(sem.key, "email", rolTab)}
                          style={{ fontSize:11, color:"var(--muted)", background:"none",
                            border:"none", cursor:"pointer", padding:0,
                            textDecoration:"underline" }}>
                          Restaurar
                        </button>
                      </div>
                      <textarea rows={6}
                        value={getDraft(sem.key, "email", rolTab)}
                        onChange={e => setDraft(sem.key, "email", rolTab, e.target.value)}
                        style={{ width:"100%", border:"1.5px solid var(--line)", borderRadius:8,
                          padding:"10px 12px", fontSize:13, fontFamily:"inherit", resize:"vertical",
                          boxSizing:"border-box", lineHeight:1.7,
                          color:"var(--ink)", background:"var(--bg)" }}
                      />
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>
                        Este texto aparece como bloque introductorio en el correo.
                        Las métricas (días en piso, % plan, interés) se agregan automáticamente.
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Telegram */
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:5 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-2)" }}>
                        Mensaje Telegram para {rolTab.charAt(0).toUpperCase() + rolTab.slice(1)}
                        <span style={{ fontWeight:400, color:"var(--muted)", marginLeft:6 }}>
                          · HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;
                        </span>
                      </label>
                      <button onClick={() => handleRestaurar(sem.key, "telegram", rolTab)}
                        style={{ fontSize:11, color:"var(--muted)", background:"none",
                          border:"none", cursor:"pointer", padding:0,
                          textDecoration:"underline" }}>
                        Restaurar
                      </button>
                    </div>
                    <textarea rows={8}
                      value={getDraft(sem.key, "telegram", rolTab)}
                      onChange={e => setDraft(sem.key, "telegram", rolTab, e.target.value)}
                      style={{ width:"100%", border:"1.5px solid var(--line)", borderRadius:8,
                        padding:"10px 12px", fontSize:13,
                        fontFamily:"'Cascadia Code','Cascadia Mono',monospace",
                        resize:"vertical", boxSizing:"border-box", lineHeight:1.7,
                        color:"var(--ink)", background:"var(--bg)" }}
                    />
                    <div style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>
                      Reemplaza completamente el mensaje automático de Telegram para este rol.
                      Soporta etiquetas HTML de Telegram: &lt;b&gt;negrita&lt;/b&gt;,
                      &lt;i&gt;cursiva&lt;/i&gt;, &lt;code&gt;código&lt;/code&gt;.
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"flex-end",
                  marginTop:16, gap:8 }}>
                  <button className="btn" onClick={() => setExpandido(null)}>Cerrar</button>
                  <button className="btn primary"
                    onClick={() => handleSave(sem.key)}
                    disabled={savingMsj === sem.key}>
                    {savingMsj === sem.key && (
                      <span className="login-spinner"
                        style={{ width:12, height:12, borderWidth:2, marginRight:6 }} />
                    )}
                    {savingMsj === sem.key ? "Guardando…" : "Guardar mensajes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfigAlertas({ usuarioActual }) {
  const workspaceId = window.AUTOMIND?.agencyId;
  const esVendedor  = usuarioActual?.rol === "vendedor";
  const [rules,       setRules]       = React.useState([]);
  const [log,         setLog]         = React.useState([]);
  const [loading,     setLoading]     = React.useState(true);
  const [saving,      setSaving]      = React.useState(null);
  const [tab,         setTab]         = React.useState(esVendedor ? "telegram" : "reglas");
  const [testEmail,   setTestEmail]   = React.useState(usuarioActual?.email || "");
  const [testSending, setTestSending] = React.useState(false);
  const [testResult,  setTestResult]  = React.useState(null);
  /* Estado WhatsApp */
  const [wpRules,     setWpRules]     = React.useState(() =>
    SEM_CONFIG.reduce((acc, s) => ({...acc, [s.key]: false}), {})
  );
  const [wpTels,      setWpTels]      = React.useState({ director:"", gerente:"" });

  React.useEffect(() => {
    if (!workspaceId || !window.DB) return;
    loadData();
  }, [workspaceId]);

  async function loadData() {
    setLoading(true);
    try {
      // Reglas
      const { data: rulesData, error: rulesErr } = await window.DB.client
        .from("alert_rules").select("*")
        .eq("workspace_id", workspaceId)
        .order("semaforo");
      // Si la lectura falló (red/RLS), NO asumir "sin reglas": antes esto
      // sobrescribía la configuración del usuario con los defaults
      if (rulesErr) throw rulesErr;
      // Si no hay reglas aún, crear defaults y guardarlos en Supabase
      if (!rulesData || rulesData.length === 0) {
        const defaults = SEM_CONFIG.map(s => ({
          workspace_id:    workspaceId,
          semaforo:        s.key,
          notify_vendedor: ["comprometido","vencer","intereses"].includes(s.key),
          notify_gerente:  ["comprometido","vencer","intereses"].includes(s.key),
          notify_director: ["comprometido","vencer","intereses"].includes(s.key),
          activa:          ["comprometido","vencer","intereses"].includes(s.key),
        }));
        // Guardar en Supabase para que la Edge Function las encuentre
        await window.DB.client
          .from("alert_rules")
          .upsert(defaults, { onConflict: "workspace_id,semaforo" });
        setRules(defaults);
      } else {
        // Ordenar igual que SEM_CONFIG
        const ordered = SEM_CONFIG.map(s => rulesData.find(r => r.semaforo === s.key) || {
          workspace_id: workspaceId, semaforo: s.key,
          notify_vendedor: false, notify_gerente: false, notify_director: false, activa: false,
        });
        setRules(ordered);
        // Inicializar wpRules desde BD
        const wpFromDb = {};
        ordered.forEach(r => { wpFromDb[r.semaforo] = !!r.wa_activa; });
        setWpRules(wpFromDb);
        // Cargar números WA del workspace
        const { data: wsWa } = await window.DB.client
          .from("workspaces")
          .select("wa_director_tel, wa_gerente_tel")
          .eq("id", workspaceId)
          .maybeSingle();
        if (wsWa) setWpTels({ director: wsWa.wa_director_tel || "", gerente: wsWa.wa_gerente_tel || "" });
      }
      // Log reciente
      const { data: logData } = await window.DB.client
        .from("alert_log").select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      setLog(logData || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleUpdate(semaforo, field, value) {
    setRules(prev => prev.map(r => r.semaforo === semaforo ? {...r, [field]: value} : r));
    setSaving(semaforo);
    try {
      // update() en lugar de upsert() para no pisar la columna mensajes
      await window.DB.client
        .from("alert_rules")
        .update({ [field]: value })
        .eq("workspace_id", workspaceId)
        .eq("semaforo", semaforo);
    } catch(e) {
      console.error(e);
      setRules(prev => prev.map(r => r.semaforo === semaforo ? {...r, [field]: !value} : r));
    } finally {
      setTimeout(() => setSaving(null), 600);
    }
  }

  async function handleUpdateWp(semaforo, value) {
    setWpRules(prev => ({...prev, [semaforo]: value}));
    setSaving(semaforo);
    try {
      await window.DB.client
        .from("alert_rules")
        .update({ wa_activa: value })
        .eq("workspace_id", workspaceId)
        .eq("semaforo", semaforo);
    } catch(e) {
      console.error(e);
      setWpRules(prev => ({...prev, [semaforo]: !value}));
    } finally {
      setTimeout(() => setSaving(null), 600);
    }
  }

  async function handleSaveWpTels() {
    const { error } = await window.DB.client
      .from("workspaces")
      .update({
        wa_director_tel: wpTels.director || null,
        wa_gerente_tel:  wpTels.gerente  || null,
      })
      .eq("id", workspaceId);
    if (error) throw error;
  }

  async function handleUpdateTg(semaforo, value) {
    setRules(prev => prev.map(r => r.semaforo === semaforo ? {...r, telegram_enabled: value} : r));
    setSaving(semaforo);
    try {
      await window.DB.client
        .from("alert_rules")
        .update({ telegram_enabled: value })
        .eq("workspace_id", workspaceId)
        .eq("semaforo", semaforo);
    } catch(e) {
      console.error(e);
      setRules(prev => prev.map(r => r.semaforo === semaforo ? {...r, telegram_enabled: !value} : r));
    } finally {
      setTimeout(() => setSaving(null), 600);
    }
  }

  async function sendTestEmail() {
    if (!testEmail) return;
    setTestSending(true); setTestResult(null);
    try {
      const { data: { session } } = await window.DB.client.auth.getSession();
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/send-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": window.SUPABASE_ANON,
        },
        body: JSON.stringify({
          workspaceId,
          vehicleId:    "TEST-001",
          vehicleDesc:  "Nuevo Jetta Trendline 2026",
          vin:          "3VWCP6BU1TM016475",
          diasEnPiso:    45,
          interesAcum:   3200,
          pctPlanConsumido: 110,
          semaforoFrom: "vencer",
          semaforoTo:   "intereses",
          directorEmail: testEmail,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTestResult({ ok: true, msg: "✓ Email enviado a " + testEmail });
      } else if (json.skipped) {
        setTestResult({ ok: false, msg: "Omitido: " + json.reason });
      } else {
        setTestResult({ ok: false, msg: "Error: " + (json.error || JSON.stringify(json)) });
      }
    } catch(e) {
      setTestResult({ ok: false, msg: "Error de conexión: " + e.message });
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="usr-shell">
      <div className="usr-header">
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800 }}>
            {esVendedor ? "Mi Telegram" : "Alertas de Semáforo"}
          </h1>
          <p className="page-sub" style={{ margin:0 }}>
            {esVendedor
              ? "Conecta tu cuenta de Telegram para recibir alertas de tus unidades."
              : "Configura qué cambios de estado generan correos automáticos al equipo."}
          </p>
        </div>
        {!esVendedor && (
          <div style={{ display:"flex", gap:8 }}>
            <button className={"btn" + (tab==="reglas"?"   primary":"")} onClick={() => setTab("reglas")}>
              Reglas
            </button>
            <button className={"btn" + (tab==="mensajes"?"  primary":"")} onClick={() => setTab("mensajes")}>
              Mensajes
            </button>
            <button className={"btn" + (tab==="telegram"?" primary":"")} onClick={() => setTab("telegram")}
              style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M21.2 2L2 10.4l7.4 2.3L20 6.4l-8.9 8.1v5.5l3.3-3.3"/>
              </svg>
              Telegram
            </button>
            <button className={"btn" + (tab==="whatsapp"?" primary":"")} onClick={() => setTab("whatsapp")}
              style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill={tab==="whatsapp" ? "#fff" : "#25D366"}
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path fill={tab==="whatsapp" ? "#fff" : "#25D366"}
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 1.99.518 3.86 1.427 5.48L2 22l4.62-1.4A9.962 9.962 0 0012 22c5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm0 18.333a8.327 8.327 0 01-4.247-1.163l-.305-.18-3.14.953.899-3.173-.2-.32A8.333 8.333 0 1112 20.333z"/>
              </svg>
              WhatsApp
            </button>
            <button className={"btn" + (tab==="historial"?" primary":"")} onClick={() => { setTab("historial"); loadData(); }}>
              Historial
            </button>
          </div>
        )}
      </div>

      {/* Panel de prueba — solo para no-vendedores */}
      {!esVendedor && (
        <div className="dcard" style={{ padding:"20px 24px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", flex:"0 0 auto" }}>
            🧪 Prueba de email
          </div>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={testEmail}
            onChange={e => { setTestEmail(e.target.value); setTestResult(null); }}
            style={{ flex:1, minWidth:220, height:38, border:"1.5px solid var(--line)", borderRadius:9,
              padding:"0 12px", fontSize:14, fontFamily:"inherit", color:"var(--ink)", background:"var(--bg)" }}
          />
          <button className="btn primary" onClick={sendTestEmail} disabled={testSending || !testEmail}
            style={{ flexShrink:0 }}>
            {testSending ? <span className="login-spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
            {testSending ? " Enviando…" : "Enviar email de prueba"}
          </button>
          {testResult && (
            <div className={testResult.ok ? "fb-ok" : "fb-err"} style={{ width:"100%" }}>
              {testResult.msg}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:48 }}>
          <span className="login-spinner" style={{ width:28, height:28, borderWidth:3 }} />
        </div>
      ) : tab === "telegram" ? (
        <TabTelegram
          usuarioActual={usuarioActual}
          workspaceId={workspaceId}
          rules={rules}
          onUpdateTg={handleUpdateTg}
          saving={saving}
        />
      ) : tab === "whatsapp" ? (
        <TabWhatsApp
          wpRules={wpRules}
          setWpRules={setWpRules}
          onUpdateWp={handleUpdateWp}
          rules={rules}
          wpTels={wpTels}
          setWpTels={setWpTels}
          onSaveWpTels={handleSaveWpTels}
          workspaceId={workspaceId}
        />
      ) : tab === "mensajes" ? (
        <TabMensajes rules={rules} workspaceId={workspaceId} />
      ) : tab === "reglas" ? (
        <div className="dcard">
          {/* Header tabla */}
          <div className="alert-hd">
            <div style={{ flex:"0 0 220px" }}>Estado del semáforo</div>
            <div style={{ flex:"0 0 120px", textAlign:"center" }}>Alerta activa</div>
            <div style={{ flex:1, textAlign:"center" }}>Vendedor</div>
            <div style={{ flex:1, textAlign:"center" }}>Gerente</div>
            <div style={{ flex:1, textAlign:"center" }}>Director</div>
            <div style={{ flex:1, textAlign:"center" }}>
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, color:"#229ED9" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M21.2 2L2 10.4l7.4 2.3L20 6.4l-8.9 8.1v5.5l3.3-3.3"/>
                </svg>
                Telegram
              </span>
            </div>
            <div style={{ flex:1, textAlign:"center" }}>
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, color:"#25D366" }}>
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path fill="#25D366" d="M12 2C6.477 2 2 6.484 2 12.017c0 1.99.518 3.86 1.427 5.48L2 22l4.62-1.4A9.962 9.962 0 0012 22c5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm0 18.333a8.327 8.327 0 01-4.247-1.163l-.305-.18-3.14.953.899-3.173-.2-.32A8.333 8.333 0 1112 20.333z"/>
                </svg>
                WhatsApp
              </span>
            </div>
            <div style={{ flex:"0 0 40px" }}></div>
          </div>
          {rules.map(rule => (
            <AlertRuleRowWithTg key={rule.semaforo} rule={rule}
              onUpdate={handleUpdate} onUpdateTg={handleUpdateTg}
              onUpdateWp={handleUpdateWp} wpEnabled={!!wpRules[rule.semaforo]}
              saving={saving} />
          ))}
          <div style={{ padding:"14px 24px", fontSize:12.5, color:"var(--muted)", borderTop:"1px solid var(--line-2)" }}>
            💡 Los emails y mensajes Telegram se envían cuando un vehículo cambia de estado.
            El canal Telegram requiere que el usuario tenga su cuenta vinculada en la pestaña Telegram.
          </div>
        </div>
      ) : (
        <div className="dcard">
          {log.length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--muted)" }}>
              No hay alertas enviadas aún.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"var(--bg)", borderBottom:"1px solid var(--line)" }}>
                    <th style={{ padding:"10px 16px", fontWeight:700, color:"var(--muted)", textAlign:"left", fontSize:11.5 }}>FECHA</th>
                    <th style={{ padding:"10px 16px", fontWeight:700, color:"var(--muted)", textAlign:"left", fontSize:11.5 }}>VEHÍCULO</th>
                    <th style={{ padding:"10px 16px", fontWeight:700, color:"var(--muted)", textAlign:"left", fontSize:11.5 }}>CAMBIO</th>
                    <th style={{ padding:"10px 16px", fontWeight:700, color:"var(--muted)", textAlign:"left", fontSize:11.5 }}>ENVIADO A</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map(entry => <LogRow key={entry.id} entry={entry} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ConfigAlertas });
