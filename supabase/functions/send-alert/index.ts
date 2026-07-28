// Automind · Edge Function: send-alert
// Envía email de alerta cuando un vehículo cambia de estado de semáforo.
// Consulta alert_rules del workspace para saber a quién notificar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Templates predeterminados de email (deben coincidir con alertas.jsx → DEF_EMAIL / DEF_ASUNTO)
const DEF_ASUNTO_EMAIL = "[ESTADO_NUEVO]: [VEHICULO]";
const DEF_EMAIL_BODY: Record<string, string> = {
  director: "Estimado [DESTINATARIO],\n\nLa unidad [VEHICULO] (VIN: [VIN]) cambió al estado «[ESTADO_NUEVO]». Lleva [DIAS_EN_PISO] días en piso con [PCT_PLAN]% del plan consumido.\n\nInterés acumulado: [INTERES_ACUM].",
  gerente:  "Hola [DESTINATARIO],\n\nLa unidad [VEHICULO] (VIN: [VIN]) de tu equipo cambió a «[ESTADO_NUEVO]». Día [DIAS_EN_PISO] en piso · [PCT_PLAN]% consumido · Interés: [INTERES_ACUM].\n\nVendedor asignado: [VENDEDOR].",
  vendedor: "Hola [DESTINATARIO],\n\nTu unidad [VEHICULO] cambió a «[ESTADO_NUEVO]». Lleva [DIAS_EN_PISO] días en piso. Comunícate con tu gerente para coordinar acciones.",
};

// Templates predeterminados de Telegram por rol (HTML mode)
const DEF_TELEGRAM: Record<string, string> = {
  director: "<b>[ESTADO_NUEVO] · [VEHICULO]</b>\n━━━━━━━━━━━━━━━━\n🔖 VIN: <code>[VIN]</code>\n\n📅 Día <b>[DIAS_EN_PISO]</b> en piso\n📊 Plan: <b>[PCT_PLAN]%</b>\n💸 Interés: <b>[INTERES_ACUM]</b>\n\nEstimado [DESTINATARIO], se requiere atención inmediata.",
  gerente:  "<b>[ESTADO_NUEVO] · [VEHICULO]</b>\n━━━━━━━━━━━━━━━━\n🔖 VIN: <code>[VIN]</code>\n\n📅 Día <b>[DIAS_EN_PISO]</b> en piso\n📊 Plan: <b>[PCT_PLAN]%</b>\n💸 Interés: <b>[INTERES_ACUM]</b>\n\nHola [DESTINATARIO], unidad de [VENDEDOR].",
  vendedor: "<b>[ESTADO_NUEVO] · [VEHICULO]</b>\n\nHola [DESTINATARIO], tu unidad cambió de estado.\n📅 Día <b>[DIAS_EN_PISO]</b> en piso. Comunícate con tu gerente.",
};

// Sustitución de variables — aplica a email y Telegram
function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl
    .replace(/\[DESTINATARIO\]/g,    vars.destinatario || "")
    .replace(/\[VEHICULO\]/g,        vars.vehicleDesc  || "")
    .replace(/\[VIN\]/g,             vars.vin          || "—")
    .replace(/\[DIAS_EN_PISO\]/g,    vars.diasEnPiso   || "—")
    .replace(/\[PCT_PLAN\]/g,        vars.pctPlan      || "—")
    .replace(/\[INTERES_ACUM\]/g,    vars.interesAcum  || "$0.00")
    .replace(/\[ESTADO_NUEVO\]/g,    vars.semToLabel   || "")
    .replace(/\[ESTADO_ANTERIOR\]/g, vars.semFromLabel || "")
    .replace(/\[VENDEDOR\]/g,        vars.vendedor     || "")
    .replace(/\[FECHA\]/g,           vars.fecha        || "");
}
// Alias para compatibilidad con la sección de Telegram más abajo
const fillTelegramTemplate = fillTemplate;

const SEM_INFO: Record<string, { emoji: string; label: string; color: string; urgencia: string }> = {
  saludable:   { emoji: "🟢", label: "Margen saludable",    color: "#1f9d57", urgencia: "Informativo" },
  rotacion:    { emoji: "🟡", label: "Rotación media",      color: "#d99613", urgencia: "Atención" },
  comprometido:{ emoji: "🟠", label: "Margen comprometido", color: "#e07a20", urgencia: "Importante" },
  vencer:      { emoji: "🔴", label: "Próximo a vencer",    color: "#e0492f", urgencia: "Urgente" },
  intereses:   { emoji: "⚫", label: "En intereses",        color: "#2d3142", urgencia: "Crítico" },
};

// Email HTML que usa el template de texto configurado por el usuario
function emailHtmlConTemplate(params: {
  semTo: string; siteUrl: string; bodyText: string;
}) {
  const to = SEM_INFO[params.semTo] || { emoji: "🔴", label: params.semTo, color: "#e0492f", urgencia: "Alerta" };
  const bodyHtml = params.bodyText
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8f9fb">
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <div style="background:${to.color};padding:24px 28px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:28px">${to.emoji}</span>
            <div>
              <div style="color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.8">
                Alerta de Plan Piso · ${to.urgencia}
              </div>
              <div style="color:#fff;font-size:18px;font-weight:800;margin-top:2px">${to.label}</div>
            </div>
          </div>
        </div>
        <div style="padding:28px;font-size:14px;line-height:1.7;color:#333">
          ${bodyHtml}
        </div>
        <div style="padding:0 28px 24px;text-align:center">
          <a href="${params.siteUrl}" style="display:inline-block;background:#2f6fed;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
            Ver en Automind →
          </a>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#bbb">
          Automind Plan Piso · Alerta automática
        </div>
      </div>
    </div>
  `;
}

function emailHtml(params: {
  vehicleDesc: string; vin: string; semFrom: string; semTo: string;
  diasEnPiso: number; interesAcum: number; pctPlan: number; siteUrl: string;
}) {
  const from = SEM_INFO[params.semFrom] || { emoji: "—", label: params.semFrom, color: "#666", urgencia: "" };
  const to   = SEM_INFO[params.semTo]   || { emoji: "🔴", label: params.semTo,   color: "#e0492f", urgencia: "Alerta" };
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8f9fb">
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

        <!-- Header -->
        <div style="background:${to.color};padding:24px 28px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:28px">${to.emoji}</span>
            <div>
              <div style="color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.8">
                Alerta de Plan Piso · ${to.urgencia}
              </div>
              <div style="color:#fff;font-size:18px;font-weight:800;margin-top:2px">${to.label}</div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:28px">
          <h2 style="margin:0 0 4px;font-size:17px;color:#1a1a2e">${params.vehicleDesc}</h2>
          <div style="font-size:13px;color:#888;margin-bottom:20px">VIN: ${params.vin || "—"}</div>

          <!-- Cambio de estado -->
          <div style="background:#f4f6fb;border-radius:10px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
            <div style="text-align:center">
              <div style="font-size:20px">${from.emoji}</div>
              <div style="font-size:11px;color:#888;margin-top:2px">${from.label}</div>
            </div>
            <div style="font-size:20px;color:#aaa">→</div>
            <div style="text-align:center">
              <div style="font-size:20px">${to.emoji}</div>
              <div style="font-size:11px;font-weight:700;color:${to.color};margin-top:2px">${to.label}</div>
            </div>
          </div>

          <!-- Métricas -->
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 14px;background:#f4f6fb;border-radius:8px;width:33%">
                <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">Días en piso</div>
                <div style="font-size:20px;font-weight:800;color:#1a1a2e;margin-top:4px">${params.diasEnPiso}</div>
              </td>
              <td style="width:8px"></td>
              <td style="padding:10px 14px;background:#f4f6fb;border-radius:8px;width:33%">
                <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">% Plan consumido</div>
                <div style="font-size:20px;font-weight:800;color:${to.color};margin-top:4px">${params.pctPlan}%</div>
              </td>
              <td style="width:8px"></td>
              <td style="padding:10px 14px;background:#f4f6fb;border-radius:8px;width:33%">
                <div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">Interés acumulado</div>
                <div style="font-size:20px;font-weight:800;color:${params.interesAcum > 0 ? "#e0492f" : "#1a1a2e"};margin-top:4px">
                  $${params.interesAcum.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top:24px;text-align:center">
            <a href="${params.siteUrl}" style="display:inline-block;background:#2f6fed;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
              Ver en Automind →
            </a>
          </div>
        </div>

        <div style="padding:16px 28px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#bbb">
          Automind Plan Piso · Alerta automática
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Autenticación obligatoria ──────────────────────────────────
    // Antes esta función no validaba el JWT: cualquiera con la anon key
    // (pública en config.js) podía usarla como relay de correo abierto.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "No autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const {
      workspaceId, vehicleId, vehicleDesc, vin,
      diasEnPiso, interesAcum, pctPlanConsumido,
      semaforoFrom, semaforoTo,
      // Multi-vendedor: arrays de emails por rol (nuevo formato)
      vendedorEmails, gerenteEmails, directorEmails,
      // Compatibilidad hacia atrás: string único (formato anterior)
      vendedorEmail, gerenteEmail, directorEmail,
    } = await req.json();

    // Normalizar a arrays (soporta tanto el formato nuevo como el antiguo)
    const vEmails = Array.isArray(vendedorEmails) ? vendedorEmails : (vendedorEmail ? [vendedorEmail] : []);
    const gEmails = Array.isArray(gerenteEmails)  ? gerenteEmails  : (gerenteEmail  ? [gerenteEmail]  : []);
    const dEmails = Array.isArray(directorEmails) ? directorEmails : (directorEmail ? [directorEmail] : []);

    if (!workspaceId || !semaforoTo) {
      return new Response(JSON.stringify({ skipped: true, reason: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Autorización: el usuario debe pertenecer al workspace ──────
    const { data: memberRow } = await adminClient
      .from("users").select("id, email")
      .eq("auth_user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    let autorizado = !!memberRow;
    if (!autorizado) {
      // ¿Agency owner de la agencia dueña del workspace?
      const { data: wsRow } = await adminClient
        .from("workspaces").select("agency_id").eq("id", workspaceId).maybeSingle();
      const agId = wsRow?.agency_id || workspaceId;
      const { data: am } = await adminClient
        .from("agency_memberships").select("user_id")
        .eq("user_id", user.id).eq("agency_id", agId).maybeSingle();
      autorizado = !!am;
    }
    if (!autorizado) {
      // ¿Es super admin? — tiene acceso a cualquier workspace
      const { data: sa } = await adminClient
        .from("super_admins").select("user_id")
        .eq("user_id", user.id).maybeSingle();
      autorizado = !!sa;
    }
    if (!autorizado) {
      return new Response(JSON.stringify({ error: "Sin permisos sobre este workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Consultar regla de alerta para este workspace y semáforo ───
    const { data: rule } = await adminClient
      .from("alert_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("semaforo", semaforoTo)
      .maybeSingle();

    if (!rule || !rule.activa) {
      return new Response(JSON.stringify({ skipped: true, reason: `No alert rule for this semáforo (${semaforoTo})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Armar lista de destinatarios ───────────────────────────────
    // Incluye TODOS los vendedores asignados y sus gerentes/directores por jerarquía
    const recipients: string[] = [];
    if (rule.notify_vendedor)  recipients.push(...vEmails);
    if (rule.notify_gerente)   recipients.push(...gEmails);
    if (rule.notify_director)  recipients.push(...dEmails);

    // Solo se permite enviar a correos registrados en el workspace (o al
    // propio usuario autenticado) — evita usar la función para spam/phishing
    const { data: wsUsers } = await adminClient
      .from("users").select("email, nombre, rol")
      .or(`workspace_id.eq.${workspaceId},agency_id.eq.${workspaceId}`);
    const permitidos = new Set(
      (wsUsers || []).map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean)
    );
    if (user.email) permitidos.add(user.email.toLowerCase());

    // Deduplicar y filtrar contra la lista permitida
    const uniqueRecipients = [...new Set(recipients.filter(Boolean))]
      .filter(e => permitidos.has(String(e).toLowerCase()));

    if (uniqueRecipients.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No recipients configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const siteUrl  = Deno.env.get("SITE_URL") || "https://automatizacionia-stack.github.io/automind-planpiso";
    const brevoKey = Deno.env.get("BREVO_API_KEY")!;

    // ── Mapa de lookup: email → { nombre, rol } ────────────────────
    const emailToUser = new Map(
      (wsUsers || []).map((u: any) => [
        String(u.email || "").toLowerCase(),
        { nombre: String(u.nombre || ""), rol: String(u.rol || "") }
      ])
    );

    // Nombre del primer vendedor asignado (para variable [VENDEDOR] en templates de gerente/director)
    const vendedorName = vEmails
      .map((e: string) => emailToUser.get(e.toLowerCase())?.nombre || "")
      .find((n: string) => n) || "";

    const semToInfo   = SEM_INFO[semaforoTo]   || { emoji: "🔴", label: semaforoTo,   urgencia: "Alerta" };
    const semFromInfo = SEM_INFO[semaforoFrom] || { emoji: "—",  label: semaforoFrom, urgencia: "" };
    const semToLabel   = `${semToInfo.emoji} ${semToInfo.label}`;
    const semFromLabel = `${semFromInfo.emoji} ${semFromInfo.label}`;
    const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const interesStr = `$${(interesAcum || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    // Templates configurados por el usuario (o vacío → usar defaults)
    const emailMensajes = ((rule.mensajes || {}).email || {}) as Record<string, string>;
    const tplAsunto = emailMensajes.asunto || DEF_ASUNTO_EMAIL;

    // ── Enviar via Brevo — un email por rol ────────────────────────
    const rolesParaEmail: Array<{ rolKey: string; emails: string[]; notificar: boolean }> = [
      { rolKey: "vendedor", emails: vEmails, notificar: !!rule.notify_vendedor },
      { rolKey: "gerente",  emails: gEmails, notificar: !!rule.notify_gerente  },
      { rolKey: "director", emails: dEmails, notificar: !!rule.notify_director },
    ];

    const emailsSent: string[] = [];

    for (const { rolKey, emails, notificar } of rolesParaEmail) {
      if (!notificar) continue;
      const tplBody = emailMensajes[rolKey] || DEF_EMAIL_BODY[rolKey];
      const filtEmails = [...new Set(emails.filter(Boolean))]
        .filter((e: string) => permitidos.has(String(e).toLowerCase()));
      if (!filtEmails.length) continue;

      for (const emailAddr of filtEmails) {
        const u = emailToUser.get(emailAddr.toLowerCase());
        const vars = {
          destinatario: u?.nombre || "",
          vehicleDesc:  vehicleDesc  || "",
          vin:          vin          || "",
          diasEnPiso:   String(diasEnPiso       || 0),
          pctPlan:      String(pctPlanConsumido || 0),
          interesAcum:  interesStr,
          semToLabel,
          semFromLabel,
          vendedor: vendedorName,
          fecha,
        };
        const bodyFilled    = fillTemplate(tplBody,    vars);
        const subjectFilled = fillTemplate(tplAsunto,  vars);
        const html = emailHtmlConTemplate({ semTo: semaforoTo, siteUrl, bodyText: bodyFilled });

        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": brevoKey },
          body: JSON.stringify({
            sender: { name: "Automind Plan Piso", email: "no-reply@automind.mx" },
            to: [{ email: emailAddr }],
            subject: subjectFilled,
            htmlContent: html,
          }),
        });
        const brevoJson = await brevoRes.json();
        if (!brevoRes.ok) {
          console.error("Brevo error para", emailAddr, JSON.stringify(brevoJson));
        } else {
          emailsSent.push(emailAddr);
        }
      }
    }

    if (emailsSent.length === 0 && uniqueRecipients.length > 0) {
      throw new Error("Todos los envíos de email fallaron");
    }

    // ── Registrar en alert_log ─────────────────────────────────────
    await adminClient.from("alert_log").insert({
      workspace_id:  workspaceId,
      vehicle_id:    vehicleId,
      vehicle_desc:  vehicleDesc,
      semaforo_from: semaforoFrom,
      semaforo_to:   semaforoTo,
      sent_to:       emailsSent,
    });

    // ── Enviar Telegram (si está habilitado en la regla) ───────────
    let tgSent = 0;
    if (rule.telegram_enabled) {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) {
        console.warn("[send-alert] Telegram habilitado en la regla pero TELEGRAM_BOT_TOKEN no está configurado en secrets.");
      } else {
        // Obtener telegram_chat_id de los usuarios del workspace
        const { data: tgUsers } = await adminClient
          .from("users")
          .select("email, rol, nombre, telegram_chat_id")
          .or(`workspace_id.eq.${workspaceId},agency_id.eq.${workspaceId}`)
          .not("telegram_chat_id", "is", null);

        if (!tgUsers || tgUsers.length === 0) {
          console.warn("[send-alert] Telegram habilitado pero ningún usuario del workspace tiene telegram_chat_id configurado.");
        }

        const vEmailsLower  = vEmails.map((e: string) => e.toLowerCase());
        const gEmailsLower  = gEmails.map((e: string) => e.toLowerCase());
        const dEmailsLower  = dEmails.map((e: string) => e.toLowerCase());
        const semToInfo   = SEM_INFO[semaforoTo]   || { label: semaforoTo,   emoji: "🔴" };
        const semFromInfo = SEM_INFO[semaforoFrom] || { label: semaforoFrom, emoji: "—" };
        const mensajesTg  = (rule.mensajes || {}).telegram || {};

        const tgVars = {
          vehicleDesc:  vehicleDesc || "",
          vin:          vin         || "",
          diasEnPiso:   String(diasEnPiso   || 0),
          pctPlan:      String(pctPlanConsumido || 0),
          interesAcum:  `$${(interesAcum || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
          semToLabel:   `${semToInfo.emoji} ${semToInfo.label}`,
          semFromLabel: `${semFromInfo.emoji} ${semFromInfo.label}`,
          vendedor:     vendedorName,
          fecha,
          destinatario: "",
        };

        for (const u of (tgUsers || [])) {
          const email = String(u.email || "").toLowerCase();
          const esVendedor  = rule.notify_vendedor  && vEmailsLower.includes(email);
          const esGerente   = rule.notify_gerente   && gEmailsLower.includes(email);
          const esDirector  = rule.notify_director  && dEmailsLower.includes(email);
          if (!esVendedor && !esGerente && !esDirector) continue;

          const rolKey = esDirector ? "director" : esGerente ? "gerente" : "vendedor";
          const tpl = mensajesTg[rolKey] || DEF_TELEGRAM[rolKey];
          const msg = fillTelegramTemplate(tpl, { ...tgVars, destinatario: u.nombre || "" });

          try {
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: u.telegram_chat_id, text: msg, parse_mode: "HTML" }),
            });
            const tgJson = await tgRes.json();
            if (!tgRes.ok) {
              console.error(`[send-alert] Telegram error → ${u.email} (chat_id ${u.telegram_chat_id}):`, JSON.stringify(tgJson));
            } else {
              console.log(`[send-alert] Telegram OK → ${u.email} (rol: ${rolKey})`);
              tgSent++;
            }
          } catch (tgErr: any) {
            console.error(`[send-alert] Telegram excepción → ${u.email}:`, tgErr?.message);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: emailsSent, tg_sent: tgSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
