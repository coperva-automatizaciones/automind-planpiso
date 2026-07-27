// Automind · Edge Function: send-alert
// Envía email de alerta cuando un vehículo cambia de estado de semáforo.
// Consulta alert_rules del workspace para saber a quién notificar.
// Soporta templates por rol/canal configurados en alert_rules.mensajes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEM_INFO: Record<string, { emoji: string; label: string; color: string; urgencia: string }> = {
  saludable:   { emoji: "🟢", label: "Margen saludable",    color: "#1f9d57", urgencia: "Informativo" },
  rotacion:    { emoji: "🟡", label: "Rotación media",      color: "#d99613", urgencia: "Atención" },
  comprometido:{ emoji: "🟠", label: "Margen comprometido", color: "#e07a20", urgencia: "Importante" },
  vencer:      { emoji: "🔴", label: "Próximo a vencer",    color: "#e0492f", urgencia: "Urgente" },
  intereses:   { emoji: "⚫", label: "En intereses",        color: "#2d3142", urgencia: "Crítico" },
};

/** Sustituye variables [CLAVE] en un template con los valores del mapa. */
function applyTemplate(tpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`[${k}]`, v),
    tpl
  );
}

function emailHtml(params: {
  vehicleDesc: string; vin: string; semFrom: string; semTo: string;
  diasEnPiso: number; interesAcum: number; pctPlan: number; siteUrl: string;
  destinatario?: string; mensajePersonalizado?: string | null;
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

          ${params.mensajePersonalizado ? `
          <!-- Mensaje personalizado -->
          <div style="margin-bottom:20px;padding:14px 16px;background:#f0f7ff;border-left:3px solid ${to.color};border-radius:0 8px 8px 0;font-size:14px;color:#1a1a2e;line-height:1.7">
            ${params.mensajePersonalizado.replace(/\n/g, "<br>")}
          </div>` : ""}

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
      vendedorEmail, gerenteEmail, directorEmail,
    } = await req.json();

    if (!workspaceId || !semaforoTo) {
      return new Response(JSON.stringify({ skipped: true, reason: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Autorización: super admin, agency owner o miembro del workspace ──
    // 1. ¿Es super admin? → acceso total
    const { data: superAdminRow } = await adminClient
      .from("super_admins").select("user_id")
      .eq("user_id", user.id).maybeSingle();
    let autorizado = !!superAdminRow;

    // 2. ¿Es miembro directo del workspace?
    if (!autorizado) {
      const { data: memberRow } = await adminClient
        .from("users").select("id")
        .eq("auth_user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      autorizado = !!memberRow;
    }

    // 3. ¿Es agency owner del workspace?
    if (!autorizado) {
      const { data: wsRow } = await adminClient
        .from("workspaces").select("agency_id").eq("id", workspaceId).maybeSingle();
      const agId = wsRow?.agency_id || workspaceId;
      const { data: am } = await adminClient
        .from("agency_memberships").select("user_id")
        .eq("user_id", user.id).eq("agency_id", agId).maybeSingle();
      autorizado = !!am;
    }

    if (!autorizado) {
      return new Response(JSON.stringify({ error: "Sin permisos sobre este workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Consultar regla de alerta (incluye mensajes personalizados) ─
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
    const recipients: string[] = [];
    if (rule.notify_vendedor  && vendedorEmail)  recipients.push(vendedorEmail);
    if (rule.notify_gerente   && gerenteEmail)   recipients.push(gerenteEmail);
    if (rule.notify_director  && directorEmail)  recipients.push(directorEmail);

    // Mapa de email → rol según quién fue pasado como param
    // (evita lookup innecesario: ya sabemos qué rol tiene cada destinatario)
    const emailToRole: Record<string, string> = {};
    if (vendedorEmail) emailToRole[String(vendedorEmail).toLowerCase()] = "vendedor";
    if (gerenteEmail)  emailToRole[String(gerenteEmail).toLowerCase()]  = "gerente";
    if (directorEmail) emailToRole[String(directorEmail).toLowerCase()] = "director";

    // Obtener usuarios del workspace (para nombres y validación)
    const { data: wsUsers } = await adminClient
      .from("users").select("email, nombre, rol")
      .eq("workspace_id", workspaceId);

    const permitidos = new Set(
      (wsUsers || []).map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean)
    );
    if (user.email) permitidos.add(user.email.toLowerCase());

    const uniqueRecipients = [...new Set(recipients.filter(Boolean))]
      .filter(e => permitidos.has(String(e).toLowerCase()));

    if (uniqueRecipients.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No recipients configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const siteUrl   = Deno.env.get("SITE_URL") || "https://automatizacionia-stack.github.io/automind-planpiso";
    const brevoKey  = Deno.env.get("BREVO_API_KEY")!;
    const semToInfo = SEM_INFO[semaforoTo] || { label: semaforoTo, urgencia: "Alerta", emoji: "🔴", color: "#e0492f" };

    // ── Preparar variables base para templates ─────────────────────
    const vendedorNombre = (wsUsers || []).find(
      (u: any) => u.email?.toLowerCase() === String(vendedorEmail || "").toLowerCase()
    )?.nombre || vendedorEmail || "";
    const interesStr = interesAcum != null
      ? `$${Number(interesAcum).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
      : "$0.00";
    const fecha = new Date().toLocaleDateString("es-MX",
      { day: "2-digit", month: "long", year: "numeric" });

    function makeVars(destinatario: string): Record<string, string> {
      return {
        DESTINATARIO:    destinatario,
        VEHICULO:        vehicleDesc || vin || vehicleId || "",
        VIN:             vin || "",
        DIAS_EN_PISO:    String(diasEnPiso || 0),
        PCT_PLAN:        String(pctPlanConsumido || 0),
        INTERES_ACUM:    interesStr,
        ESTADO_NUEVO:    semToInfo.label,
        ESTADO_ANTERIOR: SEM_INFO[semaforoFrom]?.label || semaforoFrom || "",
        VENDEDOR:        vendedorNombre,
        FECHA:           fecha,
      };
    }

    const mensajesEmail    = (rule.mensajes as any)?.email    || {};
    const mensajesTelegram = (rule.mensajes as any)?.telegram || {};

    // ── Enviar un email por destinatario (template personalizado por rol) ──
    let emailsSent = 0;
    const emailErrors: string[] = [];

    for (const recipEmail of uniqueRecipients) {
      const rolKey = emailToRole[recipEmail.toLowerCase()] || "vendedor";
      const userInfo = (wsUsers || []).find(
        (u: any) => u.email?.toLowerCase() === recipEmail.toLowerCase()
      );
      const nombre = userInfo?.nombre || recipEmail;

      const customAsunto = mensajesEmail.asunto as string | undefined;
      const customCuerpo = mensajesEmail[rolKey] as string | undefined;

      const vars = makeVars(nombre);
      const asunto = customAsunto
        ? applyTemplate(customAsunto, vars)
        : `${semToInfo.emoji} ${semToInfo.urgencia}: ${vehicleDesc || vin || vehicleId}`;
      const mensajePersonalizado = customCuerpo
        ? applyTemplate(customCuerpo, vars)
        : null;

      const html = emailHtml({
        vehicleDesc, vin, semFrom: semaforoFrom, semTo: semaforoTo,
        diasEnPiso, interesAcum, pctPlan: pctPlanConsumido, siteUrl,
        destinatario: nombre, mensajePersonalizado,
      });

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoKey },
        body: JSON.stringify({
          sender: { name: "Automind Plan Piso", email: "automatizacion.ia@coperva.com" },
          to: [{ email: recipEmail, name: nombre }],
          subject: asunto,
          htmlContent: html,
        }),
      });

      if (!brevoRes.ok) {
        const err = await brevoRes.json();
        emailErrors.push(`${recipEmail}: ${JSON.stringify(err)}`);
        console.error("Brevo error for", recipEmail, JSON.stringify(err));
      } else {
        emailsSent++;
      }
    }

    if (emailsSent === 0 && emailErrors.length > 0) {
      throw new Error("Todos los emails fallaron: " + emailErrors.join("; "));
    }

    // ── Registrar en alert_log ─────────────────────────────────────
    await adminClient.from("alert_log").insert({
      workspace_id:  workspaceId,
      vehicle_id:    vehicleId,
      vehicle_desc:  vehicleDesc,
      semaforo_from: semaforoFrom,
      semaforo_to:   semaforoTo,
      sent_to:       uniqueRecipients,
    });

    // ── Canal Telegram (si está habilitado en la regla) ────────────
    let telegramResult: any = null;
    if (rule.telegram_enabled) {
      try {
        // Buscar telegram_chat_id de los destinatarios (+ nombre y rol para templates)
        const { data: tgUsers } = await adminClient
          .from("users")
          .select("email, nombre, rol, telegram_chat_id")
          .in("email", uniqueRecipients)
          .not("telegram_chat_id", "is", null);

        if ((tgUsers || []).length > 0) {
          const tgSends = await Promise.allSettled(
            (tgUsers || []).map(async (tgUser: any) => {
              const rolKey = emailToRole[tgUser.email?.toLowerCase()] || tgUser.rol || "vendedor";
              const customTg = mensajesTelegram[rolKey] as string | undefined;

              let tgMsg: string;
              if (customTg) {
                const vars = makeVars(tgUser.nombre || tgUser.email || "");
                tgMsg = applyTemplate(customTg, vars);
              } else {
                tgMsg = buildTelegramMessage({
                  vehicleDesc, vin, semaforoFrom, semaforoTo,
                  diasEnPiso, interesAcum, pctPlanConsumido, siteUrl,
                });
              }
              return sendTelegramMessage(String(tgUser.telegram_chat_id), tgMsg);
            })
          );
          const tgSent   = tgSends.filter(r => r.status === "fulfilled").length;
          const tgFailed = tgSends.filter(r => r.status === "rejected").length;
          telegramResult = { sent: tgSent, failed: tgFailed };
        } else {
          telegramResult = { skipped: true, reason: "No recipients with Telegram linked" };
        }
      } catch (tgErr: any) {
        telegramResult = { error: tgErr.message };
        console.error("Telegram send error:", tgErr.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: uniqueRecipients, emailsSent, telegram: telegramResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* ─── Helpers de Telegram ────────────────────────────────────────────── */

function buildTelegramMessage(params: {
  vehicleDesc: string; vin: string; semaforoFrom: string; semaforoTo: string;
  diasEnPiso: number; interesAcum: number; pctPlanConsumido: number; siteUrl: string;
}): string {
  const sem: Record<string, { emoji: string; label: string; urgencia: string }> = {
    saludable:    { emoji: "🟢", label: "Margen saludable",    urgencia: "Informativo"  },
    rotacion:     { emoji: "🟡", label: "Rotación media",      urgencia: "Atención"     },
    comprometido: { emoji: "🟠", label: "Margen comprometido", urgencia: "Importante"   },
    vencer:       { emoji: "🔴", label: "Próximo a vencer",    urgencia: "Urgente"      },
    intereses:    { emoji: "⚫", label: "En intereses",        urgencia: "Crítico ‼️"  },
  };
  const from = sem[params.semaforoFrom] || { emoji: "—", label: params.semaforoFrom, urgencia: "" };
  const to   = sem[params.semaforoTo]   || { emoji: "🔴", label: params.semaforoTo,   urgencia: "Alerta" };

  const interesStr = params.interesAcum > 0
    ? `\n💸 Interés acumulado: <b>$${params.interesAcum.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</b>`
    : "";

  return (
    `${to.emoji} <b>${to.urgencia.toUpperCase()} · ${to.label}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🚗 <b>${params.vehicleDesc}</b>\n` +
    (params.vin ? `🔖 VIN: <code>${params.vin}</code>\n` : "") +
    `\n` +
    `📅 Día <b>${params.diasEnPiso}</b> en piso\n` +
    `📊 Plan consumido: <b>${params.pctPlanConsumido}%</b> ` +
    `${from.emoji} → ${to.emoji}${interesStr}\n` +
    `\n` +
    `<a href="${params.siteUrl}">Ver en Automind →</a>`
  );
}

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no configurado");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Telegram error (chat ${chatId}): ${JSON.stringify(err)}`);
  }
}
