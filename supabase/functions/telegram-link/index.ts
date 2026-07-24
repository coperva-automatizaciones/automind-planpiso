// Automind · Edge Function: telegram-link
// Genera un deep link de un solo uso para vincular Telegram con la cuenta del usuario.
// Soporta usuarios de workspace (tabla users) Y cualquier admin autenticado (auth metadata).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Autenticación ────────────────────────────────────────────────
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

    const botUsername = Deno.env.get("TELEGRAM_BOT_USERNAME") || "AutomindPlanPisoBot";

    // ── 1. Intentar con tabla users (usuarios de workspace) ──────────
    const { data: userRow } = await adminClient
      .from("users")
      .select("id, nombre, telegram_chat_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (userRow) {
      if (userRow.telegram_chat_id) {
        return new Response(JSON.stringify({
          already_linked: true,
          chat_id: userRow.telegram_chat_id,
          nombre: userRow.nombre,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Invalidar tokens previos y crear nuevo
      await adminClient.from("telegram_link_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userRow.id).is("used_at", null);
      const { data: tokenRow, error: tokenErr } = await adminClient
        .from("telegram_link_tokens")
        .insert({ user_id: userRow.id, auth_user_id: user.id, entity_type: "workspace_user" })
        .select("token").single();
      if (tokenErr || !tokenRow) throw new Error("Token error: " + tokenErr?.message);
      return new Response(
        JSON.stringify({ link: `https://t.me/${botUsername}?start=${tokenRow.token}`, token: tokenRow.token, expires_in_minutes: 30 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Fallback: cualquier usuario autenticado (admin/owner) ─────
    // Guardar telegram_chat_id en app_metadata de Supabase Auth
    const { data: authUserData } = await adminClient.auth.admin.getUserById(user.id);
    const existingChatId = authUserData?.user?.app_metadata?.telegram_chat_id;

    if (existingChatId) {
      return new Response(JSON.stringify({
        already_linked: true,
        chat_id: existingChatId,
        nombre: authUserData?.user?.email || "Admin",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Invalidar tokens previos de este auth user
    await adminClient.from("telegram_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("auth_user_id", user.id).is("used_at", null);

    // Crear token para admin (entity_type = admin)
    const { data: tokenRow, error: tokenErr } = await adminClient
      .from("telegram_link_tokens")
      .insert({ auth_user_id: user.id, entity_type: "admin" })
      .select("token").single();

    if (tokenErr || !tokenRow) throw new Error("Token error (admin): " + tokenErr?.message);

    return new Response(
      JSON.stringify({ link: `https://t.me/${botUsername}?start=${tokenRow.token}`, token: tokenRow.token, expires_in_minutes: 30 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
