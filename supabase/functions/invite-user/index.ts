// Automind · Edge Function: invite-user
// Genera link de acceso (invite o recovery) y envía SIEMPRE vía Brevo.
// Nunca usa inviteUserByEmail para que Supabase no mande email por su cuenta.

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

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");

    // adminClient usa service role (bypasa RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // userClient usa JWT del invitador (para checks RLS con auth.uid())
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: invitador }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !invitador) throw new Error("No autenticado");

    const {
      email, nombre, tel, rol, reportaA, reportaIds, fechaIngreso,
      workspaceId, agencyId, userId,
    } = await req.json();

    if (!email || !nombre || !rol || !workspaceId) {
      throw new Error("Faltan campos: email, nombre, rol, workspaceId");
    }
    if (!["director", "gerente", "vendedor"].includes(rol)) {
      throw new Error("Rol inválido");
    }

    // ── Autorización ─────────────────────────────────────────────────
    const { data: wsRow } = await adminClient
      .from("workspaces").select("agency_id, nombre").eq("id", workspaceId).maybeSingle();
    const targetAgencyId = wsRow?.agency_id || agencyId || workspaceId;
    const workspaceName  = wsRow?.nombre || null;

    // Check 1: super admin via userClient JWT
    const { data: saViaJwt } = await userClient
      .from("super_admins").select("user_id").eq("user_id", invitador.id).maybeSingle();
    let esSuperAdmin = !!saViaJwt;
    if (!esSuperAdmin && invitador.email) {
      const { data: saRows } = await adminClient
        .from("super_admins").select("user_id")
        .or(`user_id.eq.${invitador.id},email.eq.${invitador.email}`);
      esSuperAdmin = !!(saRows && saRows.length > 0);
    }

    // Check 2: agency owner/admin
    const { data: agencyMem } = await adminClient
      .from("agency_memberships").select("role")
      .eq("user_id", invitador.id).eq("agency_id", targetAgencyId).maybeSingle();
    const esAgencyOwner = !!agencyMem;

    console.log("[invite-user] uid:", invitador.id, "esSuperAdmin:", esSuperAdmin,
      "esAgencyOwner:", esAgencyOwner, "ws:", workspaceId);

    if (!esSuperAdmin && !esAgencyOwner) {
      const { data: inviterRow } = await adminClient
        .from("users").select("rol, workspace_id, agency_id")
        .eq("auth_user_id", invitador.id)
        .or(`workspace_id.eq.${workspaceId},agency_id.eq.${workspaceId}`)
        .maybeSingle();
      if (!inviterRow) throw new Error("Sin permisos para invitar usuarios");
      if (!["director", "gerente"].includes(inviterRow.rol)) {
        throw new Error("Solo directores o gerentes pueden invitar usuarios");
      }
      if (inviterRow.rol === "gerente" && rol !== "vendedor") {
        throw new Error("Un gerente solo puede invitar vendedores");
      }
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://automind-planpiso.vercel.app";

    // ── 1. Generar link de acceso (SIEMPRE via generateLink, nunca inviteUserByEmail) ──
    // generateLink NO envía email — nosotros lo mandamos por Brevo.
    console.log("[invite-user] STEP 1: generando link para", email);
    let authUserId: string | null = null;
    let actionLink: string | null = null;
    let emailVia = "none";

    // Intentar "invite" (crea al usuario si no existe)
    const { data: invLinkData, error: invLinkErr } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: siteUrl,
        data: { nombre, rol, workspace_id: workspaceId, workspace_nombre: workspaceName || "" },
      },
    });

    if (!invLinkErr && invLinkData) {
      actionLink = invLinkData.properties?.action_link || null;
      authUserId = (invLinkData as any).user?.id || null;
      console.log("[invite-user] STEP 1: invite link generado, authUserId:", authUserId);
    } else {
      // Usuario ya existe en Auth → recovery link
      console.log("[invite-user] STEP 1: usuario ya existe:", invLinkErr?.message, "→ recovery link");
      const { data: recData, error: recErr } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: siteUrl },
      });
      if (recErr || !recData) {
        throw new Error("No se pudo generar link para " + email + (recErr ? ": " + recErr.message : ""));
      }
      actionLink = recData.properties?.action_link || null;
      authUserId = (recData as any).user?.id || null;
      console.log("[invite-user] STEP 1: recovery link generado, authUserId:", authUserId);
    }

    // ── Enviar SIEMPRE vía Brevo ──────────────────────────────────────
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (brevoKey && actionLink) {
      try {
        const rolLabel    = rol === "director" ? "Director" : rol === "gerente" ? "Gerente" : "Vendedor";
        const rolColor    = rol === "director" ? "#2f6fed" : rol === "gerente" ? "#1f9d57" : "#d99613";
        const agencyDisplay = workspaceName || "tu agencia";

        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": brevoKey },
          body: JSON.stringify({
            sender: { name: "Automind", email: "no-reply@automind.mx" },
            to: [{ email, name: nombre }],
            subject: `Acceso a ${agencyDisplay} en Automind`,
            htmlContent: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                max-width:500px;margin:0 auto;padding:32px 20px;background:#f4f6fb">
                <div style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 2px 16px rgba(0,0,0,.08)">
                  <div style="background:#1b2a57;padding:28px 32px;text-align:center">
                    <div style="font-size:28px;margin-bottom:8px">🚗</div>
                    <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.3px">Automind</div>
                  </div>
                  <div style="padding:32px">
                    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e">Hola, ${nombre} 👋</h2>
                    <p style="color:#555;line-height:1.7;margin:0 0 20px;font-size:15px">
                      Has sido agregado a <strong>${agencyDisplay}</strong>
                      en Automind como
                      <span style="background:${rolColor};color:#fff;font-size:12px;font-weight:700;
                        padding:3px 10px;border-radius:20px;white-space:nowrap">${rolLabel}</span>.
                      Haz clic para crear tu contraseña y activar tu acceso.
                    </p>
                    <div style="text-align:center;margin-bottom:28px">
                      <a href="${actionLink}"
                        style="display:inline-block;background:#2f6fed;color:#fff;
                        text-decoration:none;padding:15px 36px;border-radius:12px;
                        font-weight:700;font-size:15px;letter-spacing:-.2px">
                        Crear contraseña →
                      </a>
                    </div>
                    <p style="color:#aaa;font-size:12px;text-align:center;margin:0;line-height:1.6">
                      Este enlace expira en 24 horas y es de un solo uso.<br>
                      Si no esperabas este correo, ignóralo.
                    </p>
                  </div>
                  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;
                    text-align:center;font-size:12px;color:#bbb">
                    Automind · Coperva
                  </div>
                </div>
              </div>`,
          }),
        });
        const brevoJson = await brevoRes.json();
        console.log("[invite-user] Brevo status:", brevoRes.status, JSON.stringify(brevoJson));
        if (brevoRes.ok) emailVia = "brevo";
        else console.warn("[invite-user] Brevo falló:", brevoJson?.message);
      } catch (brevoErr: any) {
        console.warn("[invite-user] Brevo excepción:", brevoErr.message);
      }
    } else if (!brevoKey) {
      console.warn("[invite-user] BREVO_API_KEY no configurada");
    }

    if (emailVia === "none") {
      console.warn("[invite-user] Email no enviado — action_link disponible para compartir manualmente");
    }

    // ── 2. Guardar en tabla users ──────────────────────────────────────
    // rowId: si viene un userId válido (UUID) lo usamos; si no, generamos uno nuevo.
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeUserId = (userId && isValidUUID.test(userId)) ? userId : null;
    const rowId = safeUserId || crypto.randomUUID();

    const userRow: any = {
      id:            rowId,
      nombre,
      email,
      tel:           tel || null,
      rol,
      reporta_a:     reportaA || null,
      reporta_ids:   Array.isArray(reportaIds) && reportaIds.length > 0 ? reportaIds : null,
      fecha_ingreso: fechaIngreso || null,
      workspace_id:  workspaceId,
      agency_id:     targetAgencyId,
    };
    if (authUserId) userRow.auth_user_id = authUserId;

    // Buscar registro existente por el ID seguro
    let existingById: any = null;
    if (safeUserId) {
      const { data } = await adminClient
        .from("users").select("id, workspace_id, agency_id").eq("id", safeUserId).maybeSingle();
      existingById = data;
    }

    let savedUser, saveErr;
    if (existingById) {
      // Preservar workspace_id/agency_id originales para no violar FK
      const safeRow = {
        ...userRow,
        workspace_id: existingById.workspace_id || userRow.workspace_id,
        agency_id:    existingById.agency_id    || userRow.agency_id,
      };
      ({ data: savedUser, error: saveErr } = await adminClient
        .from("users").update(safeRow).eq("id", safeUserId).select().single());
    } else {
      const { data: existingByEmail } = await adminClient
        .from("users").select("id")
        .eq("email", email).eq("workspace_id", workspaceId).maybeSingle();
      if (existingByEmail) {
        ({ data: savedUser, error: saveErr } = await adminClient
          .from("users").update({ ...userRow, id: existingByEmail.id })
          .eq("id", existingByEmail.id).select().single());
      } else {
        ({ data: savedUser, error: saveErr } = await adminClient
          .from("users").insert(userRow).select().single());
        if (saveErr?.code === "23505") {
          const { data: staleRow } = await adminClient
            .from("users").select("id")
            .eq("email", email).eq("workspace_id", workspaceId).maybeSingle();
          if (staleRow) {
            ({ data: savedUser, error: saveErr } = await adminClient
              .from("users").update({ ...userRow, id: staleRow.id })
              .eq("id", staleRow.id).select().single());
          }
        }
      }
    }

    if (saveErr) throw new Error("Error DB: " + saveErr.message);
    console.log("[invite-user] STEP 2 OK: usuario guardado, id:", savedUser?.id, "email_via:", emailVia);

    // ── 3. Crear workspace_memberships para que RLS funcione ───────────
    if (authUserId) {
      const { error: wmErr } = await adminClient
        .from("workspace_memberships")
        .upsert({ workspace_id: workspaceId, user_id: authUserId }, { onConflict: "workspace_id,user_id" });
      if (wmErr) console.warn("[invite-user] workspace_memberships error (no crítico):", wmErr.message);
      else console.log("[invite-user] STEP 3 OK: workspace_memberships actualizado");
    }

    return new Response(
      JSON.stringify({
        success:     true,
        user:        savedUser,
        email_via:   emailVia,
        action_link: actionLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
