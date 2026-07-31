// Automind · Edge Function: daily-semaforo-check
// Cron job diario: recalcula el semáforo de todos los vehículos activos y
// dispara alertas de email cuando detecta un cambio vs semaforo_snapshot.
//
// Autenticación: CRON_SECRET (variable de entorno — no usa JWT de usuario)
// Llamada desde pg_cron vía net.http_post (ver supabase_cron_setup.sql)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MS_DIA = 86400000;

const SEM_INFO: Record<string, { emoji: string; label: string; color: string; urgencia: string }> = {
  saludable:    { emoji: "🟢", label: "Margen saludable",    color: "#1f9d57", urgencia: "Informativo" },
  rotacion:     { emoji: "🟡", label: "Rotación media",      color: "#d99613", urgencia: "Atención" },
  comprometido: { emoji: "🟠", label: "Margen comprometido", color: "#e07a20", urgencia: "Importante" },
  vencer:       { emoji: "🔴", label: "Próximo a vencer",    color: "#e0492f", urgencia: "Urgente" },
  intereses:    { emoji: "⚫", label: "En intereses",        color: "#2d3142", urgencia: "Crítico" },
};

// Templates predeterminados — deben coincidir con alertas.jsx DEF_*
const DEF_ASUNTO_EMAIL = "[ESTADO_NUEVO]: [VEHICULO]";
const DEF_EMAIL_BODY: Record<string, string> = {
  director: "Estimado [DESTINATARIO],\n\nLa unidad [VEHICULO] (VIN: [VIN]) cambió al estado «[ESTADO_NUEVO]». Lleva [DIAS_EN_PISO] días en piso con [PCT_PLAN]% del plan consumido.\n\nInterés acumulado: [INTERES_ACUM].",
  gerente:  "Hola [DESTINATARIO],\n\nLa unidad [VEHICULO] (VIN: [VIN]) de tu equipo cambió a «[ESTADO_NUEVO]». Día [DIAS_EN_PISO] en piso · [PCT_PLAN]% consumido · Interés: [INTERES_ACUM].\n\nVendedor asignado: [VENDEDOR].",
  vendedor: "Hola [DESTINATARIO],\n\nTu unidad [VEHICULO] cambió a «[ESTADO_NUEVO]». Lleva [DIAS_EN_PISO] días en piso. Comunícate con tu gerente para coordinar acciones.",
};
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
const fillTelegramTemplate = fillTemplate;

// ── Fórmula canónica del semáforo (idéntica a computarSemaforo en db.js) ───
function computarSemaforo(
  fechaFactura: string | null,
  diasGraciaBase: number,
  diasGraciaExtra: number,
): string {
  const HOY = new Date();
  const ff = fechaFactura
    ? new Date(fechaFactura + "T12:00:00")
    : new Date(HOY.getTime() - 7 * MS_DIA);
  const diasEnPiso = Math.max(0, Math.round((HOY.getTime() - ff.getTime()) / MS_DIA) - 1);
  const graciaTotal = (diasGraciaBase || 0) + (diasGraciaExtra || 0);
  const pct = graciaTotal > 0
    ? Math.round((diasEnPiso / graciaTotal) * 100)
    : diasEnPiso > 0 ? 101 : 0;
  if (pct > 100) return "intereses";
  if (pct > 86)  return "vencer";
  if (pct > 76)  return "comprometido";
  if (pct > 61)  return "rotacion";
  return "saludable";
}

// ── Template de email con cuerpo configurable (igual que send-alert) ─────────
function emailHtmlConTemplate(params: {
  semTo: string; siteUrl: string; bodyText: string;
}): string {
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
          Automind Plan Piso · Revisión automática diaria
        </div>
      </div>
    </div>
  `;
}

// ── Template de email con diseño de métricas (fallback visual) ───────────────
function emailHtml(params: {
  vehicleDesc: string; vin: string; semFrom: string; semTo: string;
  diasEnPiso: number; interesAcum: number; pctPlan: number; siteUrl: string;
}): string {
  const from = SEM_INFO[params.semFrom] ?? { emoji: "—", label: params.semFrom || "—", color: "#666", urgencia: "" };
  const to   = SEM_INFO[params.semTo]   ?? { emoji: "🔴", label: params.semTo,   color: "#e0492f", urgencia: "Alerta" };
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
          Automind Plan Piso · Revisión automática diaria
        </div>
      </div>
    </div>
  `;
}

// ── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // Autenticación via CRON_SECRET (no JWT de usuario)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[daily-semaforo-check] Intento no autorizado");
    return new Response(JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const brevoKey = Deno.env.get("BREVO_API_KEY")!;
  const siteUrl  = Deno.env.get("SITE_URL") || "https://automatizacionia-stack.github.io/automind-planpiso";

  // 1. Cargar todos los vehículos activos con fecha de factura
  const { data: vehiculos, error: vErr } = await adminClient
    .from("inventario")
    .select(
      "id, workspace_id, agency_id, semaforo_snapshot, " +
      "fecha_factura, dias_gracia_base, dias_gracia_extra, " +
      "vendedor_ids, vendedor_id, marca, modelo, anio, vin, " +
      "monto_financiado, pct_interes"
    )
    .neq("estado_venta", "VENDIDO")
    .not("fecha_factura", "is", null);

  if (vErr) {
    console.error("[daily-semaforo-check] Error cargando vehículos:", vErr.message);
    return new Response(JSON.stringify({ error: vErr.message }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const total = (vehiculos || []).length;
  console.log(`[daily-semaforo-check] Vehículos a revisar: ${total}`);

  // 2. Pre-cargar usuarios y alert_rules por workspace (un solo query por workspace)
  const wsIds = [...new Set(
    (vehiculos || []).map((v: any) => v.workspace_id || v.agency_id).filter(Boolean)
  )];

  const usuariosPorWs: Record<string, any[]> = {};
  const reglasPorWs:   Record<string, any[]> = {};

  for (const wsId of wsIds) {
    const [{ data: usrs }, { data: reglas }] = await Promise.all([
      adminClient.from("users").select("id, email, rol, nombre, reporta_a, reporta_ids, telegram_chat_id")
        .or(`workspace_id.eq.${wsId},agency_id.eq.${wsId}`),  // incluye usuarios legacy con agency_id
      adminClient.from("alert_rules").select("*")
        .eq("workspace_id", wsId),
    ]);
    usuariosPorWs[wsId] = usrs  || [];
    reglasPorWs[wsId]   = reglas || [];
  }

  // 3. Procesar cada vehículo
  let inicializados  = 0; // snapshot nulo → solo inicializar, sin alertar
  let cambios        = 0;
  let alertas        = 0;
  const errores: string[] = [];

  for (const v of (vehiculos || [])) {
    const wsId = v.workspace_id || v.agency_id;
    const semaforoActual = computarSemaforo(
      v.fecha_factura,
      Number(v.dias_gracia_base)  || 0,
      Number(v.dias_gracia_extra) || 0,
    );

    // ── Caso A: snapshot nulo — primera inicialización, sin alertar ──
    if (v.semaforo_snapshot === null || v.semaforo_snapshot === undefined) {
      await adminClient.from("inventario")
        .update({ semaforo_snapshot: semaforoActual })
        .eq("id", v.id);
      inicializados++;
      continue;
    }

    // ── Caso B: sin cambio ──
    if (semaforoActual === v.semaforo_snapshot) continue;

    cambios++;
    console.log(`[daily-semaforo-check] Cambio detectado: ${v.id} ${v.semaforo_snapshot} → ${semaforoActual}`);

    // Actualizar snapshot antes de intentar alertar
    // (si el email falla, al menos el snapshot queda actualizado y no se re-alerta)
    const { error: upErr } = await adminClient.from("inventario")
      .update({ semaforo_snapshot: semaforoActual })
      .eq("id", v.id);
    if (upErr) {
      errores.push(`snapshot ${v.id}: ${upErr.message}`);
      continue;
    }

    // ── Verificar regla activa para el estado nuevo ──
    const rule = (reglasPorWs[wsId] || []).find((r: any) => r.semaforo === semaforoActual);
    if (!rule || !rule.activa) continue;

    // ── Resolver destinatarios via jerarquía de vendedores ──
    const usuarios = usuariosPorWs[wsId] || [];
    const vids: string[] = Array.isArray(v.vendedor_ids) && v.vendedor_ids.length > 0
      ? v.vendedor_ids.filter(Boolean)
      : v.vendedor_id ? [v.vendedor_id] : [];

    const vendedores = vids
      .map((id: string) => usuarios.find((u: any) => u.id === id))
      .filter(Boolean);

    function unique(arr: string[]): string[] {
      return [...new Set(arr.filter(Boolean))];
    }
    // Jerarquía con soporte de reporta_ids (array) + reporta_a (legado)
    function getReportaIds(u: any): string[] {
      if (Array.isArray(u.reporta_ids) && u.reporta_ids.length > 0) return u.reporta_ids;
      return u.reporta_a ? [u.reporta_a] : [];
    }
    const vendedorEmails = unique(vendedores.map((u: any) => u.email || ""));
    const gerenteEmails  = unique(vendedores.flatMap((u: any) =>
      getReportaIds(u).map((gId: string) => {
        const ger = usuarios.find((s: any) => s.id === gId);
        return ger ? (ger.email || "") : "";
      })
    ));
    const directorEmails = unique(vendedores.flatMap((u: any) =>
      getReportaIds(u).flatMap((gId: string) => {
        const ger = usuarios.find((s: any) => s.id === gId);
        if (!ger) return [];
        return getReportaIds(ger).map((dId: string) => {
          const dir = usuarios.find((s: any) => s.id === dId);
          return dir ? (dir.email || "") : "";
        });
      })
    ));

    // Solo enviar a correos registrados en el workspace
    const permitidos = new Set(
      usuarios.map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean)
    );

    const anyRecipient = [
      ...(rule.notify_vendedor ? vendedorEmails : []),
      ...(rule.notify_gerente  ? gerenteEmails  : []),
      ...(rule.notify_director ? directorEmails : []),
    ].some(e => permitidos.has(String(e).toLowerCase()));

    if (!anyRecipient) {
      console.log(`[daily-semaforo-check] Sin destinatarios para ${v.id}`);
      continue;
    }

    // ── Calcular métricas ──
    const HOY = new Date();
    const ff  = new Date(v.fecha_factura + "T12:00:00");
    const diasEnPiso   = Math.max(0, Math.round((HOY.getTime() - ff.getTime()) / MS_DIA) - 1);
    const graciaTotal  = (Number(v.dias_gracia_base) || 0) + (Number(v.dias_gracia_extra) || 0);
    const pct          = graciaTotal > 0 ? Math.round((diasEnPiso / graciaTotal) * 100) : 101;
    const diasVencidos = Math.max(0, diasEnPiso - graciaTotal);
    const monto        = Number(v.monto_financiado) || 0;
    const tasa         = Number(v.pct_interes)      || 0;
    const interesDiario = Math.round((monto * tasa / 365) * 100) / 100;
    const interesAcum   = Math.round(diasVencidos * interesDiario * 100) / 100;

    const vehicleDesc = [v.marca, v.modelo, String(v.anio || "")].filter(Boolean).join(" ");
    const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const interesStr = `$${interesAcum.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    const semToInfo   = SEM_INFO[semaforoActual]         ?? { emoji: "🔴", label: semaforoActual,         urgencia: "Alerta" };
    const semFromInfo = SEM_INFO[v.semaforo_snapshot]    ?? { emoji: "—",  label: v.semaforo_snapshot || "—", urgencia: "" };
    const semToLabel   = `${semToInfo.emoji} ${semToInfo.label}`;
    const semFromLabel = `${semFromInfo.emoji} ${semFromInfo.label}`;
    const vendedorName = vendedores.length > 0 ? (vendedores[0].nombre || "") : "";

    // Mapa de lookup: email → { nombre, rol }
    const emailToUser = new Map(
      usuarios.map((u: any) => [
        String(u.email || "").toLowerCase(),
        { nombre: String(u.nombre || ""), rol: String(u.rol || "") }
      ])
    );

    // Templates configurados por el usuario (o vacío → usar defaults)
    const emailMensajes = ((rule.mensajes || {}).email || {}) as Record<string, string>;
    const tplAsunto = emailMensajes.asunto || DEF_ASUNTO_EMAIL;

    // ── Enviar email por rol (un email por rol, personalizado) ──
    const rolesParaEmail: Array<{ rolKey: string; emails: string[]; notificar: boolean }> = [
      { rolKey: "vendedor", emails: vendedorEmails, notificar: !!rule.notify_vendedor },
      { rolKey: "gerente",  emails: gerenteEmails,  notificar: !!rule.notify_gerente  },
      { rolKey: "director", emails: directorEmails, notificar: !!rule.notify_director },
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
          vehicleDesc, vin: v.vin || "",
          diasEnPiso: String(diasEnPiso), pctPlan: String(pct),
          interesAcum: interesStr, semToLabel, semFromLabel,
          vendedor: vendedorName, fecha,
        };
        const bodyFilled    = fillTemplate(tplBody, vars);
        const subjectFilled = fillTemplate(tplAsunto, vars);
        const html = emailHtmlConTemplate({ semTo: semaforoActual, siteUrl, bodyText: bodyFilled });

        try {
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
          if (brevoRes.ok) {
            emailsSent.push(emailAddr);
          } else {
            const j = await brevoRes.json().catch(() => ({}));
            errores.push(`brevo ${v.id} ${emailAddr}: ${JSON.stringify(j)}`);
          }
        } catch(emailErr: any) {
          errores.push(`email ${v.id} ${emailAddr}: ${emailErr.message}`);
        }
      }
    }

    // ── Registrar en alert_log si se envió al menos un email ──
    if (emailsSent.length > 0) {
      alertas++;
      await adminClient.from("alert_log").insert({
        workspace_id:  wsId,
        vehicle_id:    v.id,
        vehicle_desc:  vehicleDesc,
        semaforo_from: v.semaforo_snapshot,
        semaforo_to:   semaforoActual,
        sent_to:       emailsSent,
      });
      console.log(`[daily-semaforo-check] Alerta enviada: ${v.id} → ${emailsSent.join(", ")}`);
    }

    // ── Telegram (si habilitado en la regla) ──
    if (rule.telegram_enabled) {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) {
        console.warn("[daily-semaforo-check] Telegram habilitado pero TELEGRAM_BOT_TOKEN no está configurado en secrets.");
      } else {
        const mensajesTg = (rule.mensajes || {}).telegram || {};
        const tgVars = {
          vehicleDesc,
          vin:          v.vin || "",
          diasEnPiso:   String(diasEnPiso),
          pctPlan:      String(pct),
          interesAcum:  interesStr,
          semToLabel,
          semFromLabel,
          vendedor:     vendedorName,
          fecha,
          destinatario: "",
        };

        const vEmailsLower = vendedorEmails.map((e: string) => e.toLowerCase());
        const gEmailsLower = gerenteEmails.map((e: string) => e.toLowerCase());
        const dEmailsLower = directorEmails.map((e: string) => e.toLowerCase());

        for (const u of usuarios) {
          if (!u.telegram_chat_id) continue;
          const email = String(u.email || "").toLowerCase();
          const esVendedor = rule.notify_vendedor && vEmailsLower.includes(email);
          const esGerente  = rule.notify_gerente  && gEmailsLower.includes(email);
          const esDirector = rule.notify_director && dEmailsLower.includes(email);
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
              console.error(`[daily-semaforo-check] Telegram error → ${u.email} (chat_id ${u.telegram_chat_id}):`, JSON.stringify(tgJson));
            } else {
              console.log(`[daily-semaforo-check] Telegram OK → ${u.email} (rol: ${rolKey})`);
            }
          } catch (tgErr: any) {
            console.error(`[daily-semaforo-check] Telegram excepción → ${u.email}:`, tgErr?.message);
          }
        }
      }
    }
  }

  const resumen = { ok: true, revisados: total, inicializados, cambios, alertas, errores };
  console.log("[daily-semaforo-check] Resumen:", JSON.stringify(resumen));

  return new Response(JSON.stringify(resumen),
    { headers: { "Content-Type": "application/json" } });
});
