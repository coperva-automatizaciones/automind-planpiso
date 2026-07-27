// Automind · Edge Function: invite-user
// Invita usuarios vía Supabase Auth (email nativo) para nuevos usuarios.
// Para usuarios existentes genera un recovery link enviado por Brevo o devuelto en la respuesta.

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que el invitador está autenticado
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: invitador }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !invitador) throw new Error("No autenticado");

    const {
      email, nombre, tel, rol, reportaA, fechaIngreso,
      workspaceId, agencyId, userId,
    } = await req.json();

    if (!email || !nombre || !rol || !workspaceId) {
      throw new Error("Faltan campos: email, nombre, rol, workspaceId");
    }
    if (!["director", "gerente", "vendedor"].includes(rol)) {
      throw new Error("Rol inválido");
    }

    // ── Autorización: validar rol y tenant del invitador ─────────────
    const { data: wsRow } = await adminClient
      .from("workspaces").select("agency_id, nombre").eq("id", workspaceId).maybeSingle();
    const targetAgencyId = wsRow?.agency_id || agencyId || workspaceId;
    const workspaceName  = wsRow?.nombre || null;

    // ¿Es super admin? → usar userClient (JWT del invitador) para respetar RLS auth.uid()=user_id
    // No depende de que adminClient tenga service_role_key configurada
    const { data: saViaJwt } = await userClient
      .from("super_admins").select("user_id")
      .eq("user_id", invitador.id).maybeSingle();
    // Fallback: adminClient + búsqueda por email
    let esSuperAdmin = !!saViaJwt;
    if (!esSuperAdmin) {
      const { data: saAdmin } = await adminClient
        .from("super_admins").select("user_id")
        .or(`user_id.eq.${invitador.id},email.eq.${invitador.email ?? ""}`).limit(1);
      esSuperAdmin = !!(saAdmin && saAdmin.length > 0);
    }
    console.log("[invite-user] uid:", invitador.id, "email:", invitador.email, "esSuperAdmin:", esSuperAdmin, "ws:", workspaceId);

    const { data: agencyMem } = await adminClient
      .from("agency_memberships").select("role")
      .eq("user_id", invitador.id).eq("agency_id", targetAgencyId)
      .maybeSingle();
    const esAgencyOwner = !!agencyMem;

    if (!esSuperAdmin && !esAgencyOwner) {
      // Filtrar por workspace específico para evitar fallo con usuarios en múltiples workspaces
      const { data: inviterRow } = await adminClient
        .from("users").select("rol, workspace_id, agency_id")
        .eq("auth_user_id", invitador.id)
        .or(`workspace_id.eq.${workspaceId},agency_id.eq.${workspaceId}`)
        .maybeSingle();
      if (!inviterRow) throw new Error("Sin permisos para invitar usuarios (workspace no coincide o rol insuficiente)");
      // La query .or() ya garantiza que el usuario pertenece al workspace (por workspace_id o agency_id).
      // No hacemos check redundante de wsInviter para evitar falsos positivos con datos legacy.
      if (!["director", "gerente"].includes(inviterRow.rol)) {
        throw new Error("Solo directores o gerentes pueden invitar usuarios");
      }
      if (inviterRow.rol === "gerente" && rol !== "vendedor") {
        throw new Error("Un gerente solo puede invitar vendedores");
      }
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://automind-planpiso.vercel.app";

    // ── 1. Crear/invitar usuario en Supabase Auth ──────────────────
    console.log("[invite-user] STEP 1: invitando a", email, "workspace:", workspaceId);
    let authUserId: string | null = null;
    let actionLink: string | null = null;
    let emailVia = "none";

    // inviteUserByEmail: crea el usuario Y envía el email automáticamente.
    // Solo funciona para usuarios nuevos (sin cuenta Auth previa).
    const { data: invData, error: invErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: siteUrl,
      data: { nombre, rol, workspace_id: workspaceId, workspace_nombre: workspaceName || "" },
    });

    if (!invErr && invData?.user) {
      authUserId = invData.user.id;
      emailVia   = "supabase";
      console.log("[invite-user] STEP 1 OK: invitación enviada por Supabase, id:", authUserId);
    } else {
      // Usuario ya existe en Auth → generar magic link (acceso directo sin cambio de contraseña)
      console.log("[invite-user] STEP 1: usuario ya existe en auth:", invErr?.message);

      // generateLink devuelve user.id en su respuesta — no necesitamos lookup adicional.
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: siteUrl },
      });

      if (linkErr || !linkData) {
        throw new Error(
          "No se pudo generar el link de acceso para " + email +
          (linkErr ? ": " + linkErr.message : "")
        );
      }

      actionLink  = linkData.properties?.action_link || null;
      authUserId  = (linkData as any).user?.id || null;
      console.log("[invite-user] STEP 1: magic link generado:", !!actionLink, "authUserId:", authUserId);

      // Enviar vía Brevo si está configurado
      const brevoKey = Deno.env.get("BREVO_API_KEY");
      if (brevoKey) {
        try {
          const rolLabel    = rol === "director" ? "Director" : rol === "gerente" ? "Gerente" : "Vendedor";
          const rolColor    = rol === "director" ? "#2f6fed" : rol === "gerente" ? "#1f9d57" : "#d99613";
          const agencyDisplay = workspaceName || "tu agencia";

          const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "Content-Type": "application/json", "api-key": brevoKey },
            body: JSON.stringify({
              sender: { name: "Automind Plan Piso", email: "no-reply@coperva.com" },
              to: [{ email, name: nombre }],
              subject: `Acceso a ${agencyDisplay} en Automind Plan Piso`,
              htmlContent: `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  max-width:500px;margin:0 auto;padding:32px 20px;background:#f4f6fb">
                  <div style="background:#fff;border-radius:16px;overflow:hidden;
                    box-shadow:0 2px 16px rgba(0,0,0,.08)">
                    <div style="background:#1b2a57;padding:28px 32px;text-align:center">
                      <div style="font-size:28px;margin-bottom:8px">🚗</div>
                      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.3px">Automind</div>
                      <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:2px">Plan Piso</div>
                    </div>
                    <div style="padding:32px">
                      <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e">Hola, ${nombre} 👋</h2>
                      <p style="color:#555;line-height:1.7;margin:0 0 20px;font-size:15px">
                        Has sido agregado a <strong>${agencyDisplay}</strong>
                        en Automind Plan Piso como
                        <span style="background:${rolColor};color:#fff;font-size:12px;font-weight:700;
                          padding:3px 10px;border-radius:20px;white-space:nowrap">${rolLabel}</span>.
                        Haz clic para entrar directamente — no necesitas cambiar tu contraseña.
                      </p>
                      <div style="text-align:center;margin-bottom:28px">
                        <a href="${actionLink}"
                          style="display:inline-block;background:#2f6fed;color:#fff;
                          text-decoration:none;padding:15px 36px;border-radius:12px;
                          font-weight:700;font-size:15px;letter-spacing:-.2px">
                          Entrar a la plataforma →
                        </a>
                      </div>
                      <p style="color:#aaa;font-size:12px;text-align:center;margin:0;line-height:1.6">
                        Este enlace expira en 24 horas y es de un solo uso.<br>
                        Si no esperabas este correo, ignóralo.
                      </p>
                    </div>
                    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;
                      text-align:center;font-size:12px;color:#bbb">
                      Automind · Plataforma de Plan Piso · Coperva
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
      }

      if (emailVia === "none") {
        console.warn("[invite-user] Email no enviado — devolviendo action_link para compartir manualmente.");
      }
    }

    // ── 2. Guardar en tabla users ──────────────────────────────────
    const rowId = userId ||
      (rol[0].toUpperCase() + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase());
    const userRow: any = {
      id:            rowId,
      nombre,
      email,
      tel:           tel || null,
      rol,
      reporta_a:     reportaA || null,
      fecha_ingreso: fechaIngreso || null,
      workspace_id:  workspaceId,
      agency_id:     targetAgencyId,
    };
    if (authUserId) userRow.auth_user_id = authUserId;

    const { data: existingById } = await adminClient
      .from("users").select("id").eq("id", userRow.id).maybeSingle();

    let savedUser, saveErr;
    if (existingById) {
      ({ data: savedUser, error: saveErr } = await adminClient
        .from("users").update(userRow).eq("id", userRow.id).select().single());
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

    // ── 3. Crear workspace_memberships para que RLS funcione ──────
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
        user:              savedUser,
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
