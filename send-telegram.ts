// Automind · Edge Function: send-telegram
// Envía un mensaje de alerta a un chat de Telegram via Bot API.
// Puede llamarse directamente (prueba) o desde send-alert.ts.
//
// Secrets requeridos en Supabase:
//   TELEGRAM_BOT_TOKEN — token del bot obtenido con @BotFather

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEM_INFO: Record<string, { emoji: string; label: string; urgencia: string }> = {
  saludable:    { emoji: "🟢", label: "Margen saludable",    urgencia: "Informativo"  },
  rotacion:     { emoji: "🟡", label: "Rotación media",      urgencia: "Atención"     },
  comprometido: { emoji: "🟠", label: "Margen comprometido", urgencia: "Importante"   },
  vencer:       { emoji: "🔴", label: "Próximo a vencer",    urgencia: "Urgente"      },
  intereses:    { emoji: "⚫", label: "En intereses",        urgencia: "Crítico ‼️"  },
};

/** Arma el texto HTML del mensaje Telegram */
function buildMessage(params: {
  vehicleDesc: string;
  vin: string;
  semaforoFrom: string;
  semaforoTo: string;
  diasEnPiso: number;
  interesAcum: number;
  pctPlanConsumido: number;
  siteUrl: string;
}): string {
  const from = SEM_INFO[params.semaforoFrom] || { emoji: "—", label: params.semaforoFrom, urgencia: "" };
  const to   = SEM_INFO[params.semaforoTo]   || { emoji: "🔴", label: params.semaforoTo,   urgencia: "Alerta" };

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
    `📊 Plan consumido: <b>${params.pctPlanConsumido}%</b>` +
    ` ${from.emoji} → ${to.emoji}${interesStr}\n` +
    `\n` +
    `<a href="${params.siteUrl}">Ver en Automind →</a>`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Autenticación (cuando se llama desde el panel de prueba) ──────
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

    const body = await req.json();

    // ── Modo "envío directo" (chat_id + message explícito) ────────────
    if (body.chat_id && body.message) {
      const result = await sendToTelegram(String(body.chat_id), body.message);
      return new Response(JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Modo "alerta de vehículo" (mismo payload que send-alert) ─────
    const {
      workspaceId, vehicleId, vehicleDesc, vin,
      diasEnPiso, interesAcum, pctPlanConsumido,
      semaforoFrom, semaforoTo,
      vendedorEmail, gerenteEmail, directorEmail,
    } = body;

    if (!workspaceId || !semaforoTo) {
      return new Response(JSON.stringify({ skipped: true, reason: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Consultar chat_ids de los destinatarios
    const emails = [vendedorEmail, gerenteEmail, directorEmail].filter(Boolean);
    const { data: usersData } = await adminClient
      .from("users")
      .select("email, telegram_chat_id")
      .eq("workspace_id", workspaceId)
      .in("email", emails);

    const chatIds = (usersData || [])
      .filter((u: any) => u.telegram_chat_id)
      .map((u: any) => String(u.telegram_chat_id));

    if (chatIds.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No recipients with Telegram linked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://automatizacionia-stack.github.io/automind-planpiso";
    const message = buildMessage({ vehicleDesc, vin, semaforoFrom, semaforoTo,
      diasEnPiso, interesAcum, pctPlanConsumido, siteUrl });

    const results = await Promise.allSettled(
      chatIds.map(chatId => sendToTelegram(chatId, message))
    );

    const sent    = results.filter(r => r.status === "fulfilled").length;
    const failed  = results.filter(r => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: chatIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Envía un mensaje HTML a un chat_id via Telegram Bot API */
async function sendToTelegram(chatId: string, text: string): Promise<any> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no configurado en los secrets de Supabase");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API error para chat ${chatId}: ${JSON.stringify(data)}`);
  }
  return data;
}
