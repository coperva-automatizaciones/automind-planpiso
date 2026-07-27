// Automind · Edge Function: delete-user
// Elimina un usuario de la tabla users Y de Supabase Auth.
// Requiere SERVICE_ROLE_KEY — solo ejecutable desde el servidor.

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que el que borra está autenticado
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) throw new Error("No autenticado");

    const { userId } = await req.json();
    if (!userId) throw new Error("userId requerido");

    // Buscar el usuario en la tabla users (con admin para evitar RLS)
    const { data: userRow, error: findErr } = await adminClient
      .from("users")
      .select("id, auth_user_id, workspace_id, agency_id, rol")
      .eq("id", userId)
      .maybeSingle();

    if (findErr) throw new Error("Error buscando usuario: " + findErr.message);
    if (!userRow) throw new Error("Usuario no encontrado");

    // Verificar permisos: solo agency owner, director o gerente pueden borrar
    const { data: agencyMem } = await adminClient
      .from("agency_memberships").select("role")
      .eq("user_id", caller.id).maybeSingle();
    const esAgencyOwner = !!agencyMem;

    if (!esAgencyOwner) {
      const { data: callerRow } = await adminClient
        .from("users").select("rol, workspace_id, agency_id")
        .eq("auth_user_id", caller.id).maybeSingle();
      if (!callerRow) throw new Error("Sin permisos");
      const mismoWs = (callerRow.workspace_id || callerRow.agency_id) === (userRow.workspace_id || userRow.agency_id);
      if (!mismoWs) throw new Error("No puedes eliminar usuarios de otro workspace");
      if (!["director", "gerente"].includes(callerRow.rol)) throw new Error("Sin permisos para eliminar usuarios");
    }

    // 1. Eliminar de workspace_memberships
    if (userRow.auth_user_id) {
      await adminClient
        .from("workspace_memberships")
        .delete()
        .eq("user_id", userRow.auth_user_id);
    }

    // 2. Eliminar de tabla users
    const { error: deleteErr } = await adminClient
      .from("users")
      .delete()
      .eq("id", userId);
    if (deleteErr) throw new Error("Error eliminando de users: " + deleteErr.message);

    // 3. Eliminar de Supabase Auth (si tiene auth_user_id)
    let authDeleted = false;
    if (userRow.auth_user_id) {
      const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(userRow.auth_user_id);
      if (authDeleteErr) {
        console.warn("[delete-user] No se pudo eliminar de Auth:", authDeleteErr.message);
      } else {
        authDeleted = true;
        console.log("[delete-user] Eliminado de Auth:", userRow.auth_user_id);
      }
    }

    console.log("[delete-user] OK: usuario eliminado, id:", userId, "auth:", authDeleted);

    return new Response(
      JSON.stringify({ success: true, authDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
