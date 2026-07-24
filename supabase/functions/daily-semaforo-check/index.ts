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

// ── Template de email (idéntico a send-alert/index.ts) ──────────────────────
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
      adminClient.from("users").select("id, email, rol, reporta_a")
        .or(`workspace_id.eq.${wsId},agency_id.eq.${wsId}`),
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
    const vendedorEmails = unique(vendedores.map((u: any) => u.email || ""));
    const gerenteEmails  = unique(vendedores.map((u: any) => {
      const ger = u.reporta_a ? usuarios.find((s: any) => s.id === u.reporta_a) : null;
      return ger ? (ger.email || "") : "";
    }));
    const directorEmails = unique(vendedores.map((u: any) => {
      const ger = u.reporta_a ? usuarios.find((s: any) => s.id === u.reporta_a) : null;
      const dir = ger?.reporta_a  ? usuarios.find((s: any) => s.id === ger.reporta_a) : null;
      return dir ? (dir.email || "") : "";
    }));

    const recipients: string[] = [];
    if (rule.notify_vendedor) recipients.push(...vendedorEmails);
    if (rule.notify_gerente)  recipients.push(...gerenteEmails);
    if (rule.notify_director) recipients.push(...directorEmails);

    // Solo enviar a correos registrados en el workspace
    const permitidos = new Set(
      usuarios.map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean)
    );
    const uniqueRecipients = [...new Set(recipients.filter(Boolean))]
      .filter(e => permitidos.has(String(e).toLowerCase()));

    if (uniqueRecipients.length === 0) {
      console.log(`[daily-semaforo-check] Sin destinatarios para ${v.id}`);
      continue;
    }

    // ── Calcular métricas para el email ──
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
    const semInfo     = SEM_INFO[semaforoActual] ?? { urgencia: "Alerta", emoji: "🔴" };
    const html        = emailHtml({
      vehicleDesc, vin: v.vin || "",
      semFrom: v.semaforo_snapshot, semTo: semaforoActual,
      diasEnPiso, interesAcum, pctPlan: pct, siteUrl,
    });

    // ── Enviar via Brevo ──
    try {
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoKey },
        body: JSON.stringify({
          sender: { name: "Automind Plan Piso", email: "no-reply@coperva.com" },
          to: uniqueRecipients.map(e => ({ email: e })),
          subject: `${semInfo.emoji} ${semInfo.urgencia}: ${vehicleDesc || v.vin || v.id}`,
          htmlContent: html,
        }),
      });

      if (brevoRes.ok) {
        alertas++;
        // Registrar en alert_log
        await adminClient.from("alert_log").insert({
          workspace_id:  wsId,
          vehicle_id:    v.id,
          vehicle_desc:  vehicleDesc,
          semaforo_from: v.semaforo_snapshot,
          semaforo_to:   semaforoActual,
          sent_to:       uniqueRecipients,
        });
        console.log(`[daily-semaforo-check] Alerta enviada: ${v.id} → ${uniqueRecipients.join(", ")}`);
      } else {
        const brevoJson = await brevoRes.json().catch(() => ({}));
        errores.push(`brevo ${v.id}: ${JSON.stringify(brevoJson)}`);
      }
    } catch (e: any) {
      errores.push(`email ${v.id}: ${e.message}`);
    }
  }

  const resumen = { ok: true, revisados: total, inicializados, cambios, alertas, errores };
  console.log("[daily-semaforo-check] Resumen:", JSON.stringify(resumen));

  return new Response(JSON.stringify(resumen),
    { headers: { "Content-Type": "application/json" } });
});
