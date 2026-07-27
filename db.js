/* Automind · Capa de datos — Supabase
   Expone window.DB con todas las funciones de acceso a datos.
   Requiere: config.js (SUPABASE_URL, SUPABASE_ANON) y @supabase/supabase-js CDN
*/

(function () {
  const { createClient } = supabase;
  // flowType: 'implicit' — los links de invitación redirigen con #access_token en el hash
  // (no con ?code= del flujo PKCE), que es lo que la app espera para el flujo de activación.
  const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON, {
    auth: { flowType: 'implicit' },
  });

  /* ── Auth ─────────────────────────────────────────────────── */

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    await client.auth.signOut();
  }

  async function getSession() {
    const { data } = await client.auth.getSession();
    return data.session;
  }

  /* ── Multi-tenant: identificar rol del usuario ─────────────── */

  async function getUserContext() {
    const { data: authData } = await client.auth.getUser();
    if (!authData.user) throw new Error("No autenticado");
    const authUser = authData.user;

    // ¿Es super admin? (acceso total a todas las agencias)
    const { data: superAdmin } = await client
      .from("super_admins")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (superAdmin) {
      return {
        type: "super_admin",
        authUserId: authUser.id,
        email: authUser.email,
      };
    }

    // ¿Es agency owner/admin? (nivel Coperva)
    const { data: agencyMem } = await client
      .from("agency_memberships")
      .select("*, agencies(id, nombre, owner_email, plan)")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (agencyMem) {
      // Usuario de nivel agencia — puede ver todos los workspaces
      return {
        type: "agency",
        authUserId: authUser.id,
        agencyId: agencyMem.agency_id,
        agency: { ...agencyMem.agencies, name: agencyMem.agencies?.nombre },
        role: agencyMem.role,
        me: null,
      };
    }

    // ¿Es miembro de workspace?
    // Usamos select sin .single() para no fallar cuando el usuario
    // tiene registros en más de un workspace.
    const { data: meRows, error: meErr } = await client
      .from("users")
      .select("*, workspaces(id, nombre, ciudad, iniciales, accent, sidebar)")
      .eq("auth_user_id", authUser.id)
      .order("created_at", { ascending: false });
    if (meErr || !meRows || meRows.length === 0) {
      throw new Error("Usuario no encontrado. Verifica que tu correo esté registrado.");
    }

    // Si tiene varios registros, priorizar el workspace_id más reciente
    const me = meRows[0];

    // Lista de todos los workspaces a los que tiene acceso (para el switcher)
    const allUserWorkspaces = meRows
      .filter(r => r.workspace_id || r.agency_id)
      .map(r => ({
        id:        r.workspace_id || r.agency_id,
        nombre:    r.workspaces?.nombre    || "",
        ciudad:    r.workspaces?.ciudad    || "",
        iniciales: r.workspaces?.iniciales || (r.workspaces?.nombre || "WS").slice(0,2).toUpperCase(),
        accent:    r.workspaces?.accent    || "#2f6fed",
        sidebar:   r.workspaces?.sidebar   || "#1b2a57",
        rol:       r.rol,
      }));

    return {
      type: "workspace",
      authUserId: authUser.id,
      workspaceId: me.workspace_id || me.agency_id,
      role: me.rol,
      me,
      allUserWorkspaces,
    };
  }

  /* ── Cargar workspaces para agency owners ──────────────────── */

  async function loadWorkspaces(agencyId) {
    const { data, error } = await client
      .from("workspaces")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("status", "active")
      .order("nombre");
    if (error) throw error;
    return data || [];
  }

  async function createWorkspace(agencyId, wsData) {
    const { data, error } = await client
      .from("workspaces")
      .insert({
        agency_id: agencyId,
        nombre:    wsData.nombre,
        ciudad:    wsData.ciudad || null,
        iniciales: wsData.iniciales || wsData.nombre.slice(0,3).toUpperCase(),
        accent:    wsData.accent   || "#2f6fed",
        sidebar:   wsData.sidebar  || "#1b2a57",
        status:    "active",
      })
      .select()
      .single();
    if (error) throw error;

    // Sembrar reglas de alerta por defecto para el workspace recién creado.
    // Sin esto, send-alert no encuentra reglas y omite los emails silenciosamente.
    const defaultRules = ["saludable","rotacion","comprometido","vencer","intereses"].map(sem => ({
      workspace_id:    data.id,
      semaforo:        sem,
      notify_vendedor: ["comprometido","vencer","intereses"].includes(sem),
      notify_gerente:  ["comprometido","vencer","intereses"].includes(sem),
      notify_director: ["comprometido","vencer","intereses"].includes(sem),
      activa:          ["comprometido","vencer","intereses"].includes(sem),
    }));
    await client.from("alert_rules").upsert(defaultRules, { onConflict: "workspace_id,semaforo" });

    return data;
  }

  /* ── Cargar datos de un workspace ───────────────────────────── */

  async function loadAgencyData(workspaceIdOverride) {
    const { data: authData } = await client.auth.getUser();
    if (!authData.user) throw new Error("No autenticado");

    // Resolver workspace_id: override (desde selector) o detectar automáticamente
    let workspaceId = workspaceIdOverride;
    let me = null;

    if (!workspaceId) {
      // Buscar en users por auth_user_id — puede haber múltiples filas (multi-tenant)
      const { data: userRows } = await client
        .from("users")
        .select("*")
        .eq("auth_user_id", authData.user.id);
      if (!userRows || userRows.length === 0) throw new Error("Usuario no encontrado en la plataforma.");
      // Si está en varios workspaces, tomar el primero (el selector de workspace ya maneja la elección)
      me = userRows[0];
      workspaceId = me.workspace_id || me.agency_id;
    }

    // Obtener config del workspace
    let workspace;
    try {
      const { data: ws, error: wsErr } = await client
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();
      if (!wsErr && ws) {
        workspace = ws;
      }
    } catch(e) {}

    // Fallback: usar tabla agencies original
    if (!workspace) {
      const { data: ag } = await client
        .from("agencies")
        .select("*")
        .eq("id", workspaceId)
        .single();
      if (ag) workspace = ag;
    }

    if (!workspace) throw new Error("Workspace no encontrado.");

    // Si no tenemos me todavía (vino desde selector de workspace)
    if (!me) {
      const { data: userRow } = await client
        .from("users")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      // Para agency owners puede no haber fila en users — usar datos de auth
      const raw = userRow || { auth_user_id: authData.user.id, email: authData.user.email,
        nombre: authData.user.email, rol: "director", workspace_id: workspaceId };
      me = {
        id:           raw.id || "agency-owner",
        nombre:       raw.nombre || raw.email,
        email:        raw.email,
        rol:          raw.rol || "director",
        reportaA:     raw.reporta_a || null,
        reportaIds:   (raw.reporta_ids && raw.reporta_ids.length > 0) ? raw.reporta_ids : (raw.reporta_a ? [raw.reporta_a] : []),
        auth_user_id: raw.auth_user_id,
        workspace_id: raw.workspace_id || workspaceId,
        agency_id:    raw.agency_id,
      };
    }

    // Obtener usuarios del workspace y mapear snake_case → camelCase
    const wsField = workspace.id;
    const { data: usuariosRaw } = await client
      .from("users")
      .select("*")
      .or(`workspace_id.eq.${wsField},agency_id.eq.${wsField}`)
      .order("rol");

    // Mapear a formato camelCase para que la app pueda usar u.reportaA, u.rol, etc.
    const usuarios = (usuariosRaw || []).map(u => ({
      id:           u.id,
      nombre:       u.nombre       || "",
      email:        u.email        || "",
      tel:          u.tel          || "",
      rol:          u.rol          || "vendedor",
      reportaA:     u.reporta_a    || null,   // ← backward compat
      reportaIds:   (u.reporta_ids && u.reporta_ids.length > 0) ? u.reporta_ids : (u.reporta_a ? [u.reporta_a] : []),
      fechaIngreso: u.fecha_ingreso || "",
      auth_user_id: u.auth_user_id || null,
      agency_id:    u.agency_id    || null,
      workspace_id: u.workspace_id || null,
    }));

    // Obtener inventario
    const { data: rows } = await client
      .from("inventario")
      .select("*")
      .or(`workspace_id.eq.${wsField},agency_id.eq.${wsField}`)
      .order("created_at", { ascending: false });

    // Normalizar: workspace sirve como "agency" para el resto de la app
    const agency = {
      id:        workspace.id,
      agency_id: workspace.agency_id || workspace.id, // ← ID de la agencia raíz (Coperva)
      nombre:    workspace.nombre || workspace.name,
      ciudad:    workspace.ciudad,
      iniciales: workspace.iniciales || (workspace.nombre||workspace.name||"WS").slice(0,2).toUpperCase(),
      accent:    workspace.accent   || "#2f6fed",
      sidebar:   workspace.sidebar  || "#1b2a57",
      avisoPrivacidadKey:    workspace.aviso_privacidad_key    || null,
      avisoPrivacidadNombre: workspace.aviso_privacidad_nombre || null,
    };

    return { agency, me, usuarios: usuarios||[], rows: rows||[] };
  }

  /* ── Inventario — CRUD ────────────────────────────────────── */

  // Computa el semáforo desde los campos reales del vehículo (fechaFactura + días gracia).
  // Replica la lógica canónica de enriquecerRows (app.jsx) para que saveVehicle
  // siempre compare el estado ACTUAL, no el valor obsoleto del form state.
  function computarSemaforo(v) {
    var HOY = new Date();
    var MS_DIA = 86400000;
    var ff = v.fechaFactura ? new Date(v.fechaFactura) : new Date(HOY.getTime() - 7 * MS_DIA);
    var diasEnPiso = Math.max(0, Math.round((HOY - ff) / MS_DIA) - 1);
    var graciaBase  = Number(v.diasGraciaBase)  || 0;
    var graciaExtra = Number(v.diasGraciaExtra) || 0;
    var diasGraciaTotal = graciaBase + graciaExtra;
    var pct = diasGraciaTotal > 0
      ? Math.round((diasEnPiso / diasGraciaTotal) * 100)
      : (diasEnPiso > 0 ? 101 : 0);
    if (pct > 100) return "intereses";
    if (pct > 86)  return "vencer";
    if (pct > 76)  return "comprometido";
    if (pct > 61)  return "rotacion";
    return "saludable";
  }

  async function saveVehicle(agencyId, vehicleData) {
    console.log("[saveVehicle] agencyId:", agencyId,
      "| agencyParentId:", window.AUTOMIND?.agencyParentId,
      "| vehicleId:", vehicleData.id);

    // Re-computar semáforo desde los campos reales del vehículo.
    // vehicleData.semaforo puede estar obsoleto si el usuario cambió fechas
    // o días de gracia en el editor (el form state no re-enriquece las filas).
    vehicleData = Object.assign({}, vehicleData, { semaforo: computarSemaforo(vehicleData) });
    console.log("[saveVehicle] semaforo re-computado:", vehicleData.semaforo);

    // Obtener semáforo anterior antes de guardar (para detectar cambios)
    let semaforoFrom = null;
    try {
      const { data: prev } = await client
        .from("inventario").select("semaforo_snapshot").eq("id", vehicleData.id).maybeSingle();
      semaforoFrom = prev?.semaforo_snapshot || null;
    } catch(e) {
      console.warn("[saveVehicle] No se pudo leer semaforo_snapshot (columna puede no existir):", e.message);
    }

    // Extraer solo los campos de la tabla (sin campos calculados)
    const row = dbRowFromVehicle(agencyId, vehicleData);
    console.log("[saveVehicle] row:", { id: row.id, workspace_id: row.workspace_id, agency_id: row.agency_id });

    // Intentar upsert (UPDATE si existe, INSERT si no)
    // Usar maybeSingle() en lugar de single() para que 0 filas no lance PGRST116
    const { data, error } = await client
      .from("inventario")
      .upsert(row, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[saveVehicle] ERROR:", error.code, error.message, error.details);
      throw new Error(error.message || error.code || "Error guardando en Supabase");
    }

    if (!data) {
      // 0 filas: RLS bloqueó el upsert (el row no pasó inv_update/inv_insert)
      console.error("[saveVehicle] RLS bloqueó el guardado — workspace_id:", row.workspace_id, "agency_id:", row.agency_id);
      throw new Error(
        "Sin permisos para guardar este vehículo.\n" +
        "workspace_id del intento: " + row.workspace_id + "\n" +
        "Corre supabase_fix_save_rls.sql en Supabase SQL Editor."
      );
    }

    console.log("[saveVehicle] OK — guardado, id:", data?.id);

    // Detectar cambio de semáforo y disparar alerta
    const semaforoTo = vehicleData.semaforo;
    if (semaforoTo && semaforoTo !== semaforoFrom) {
      triggerSemAlert(agencyId, vehicleData, semaforoFrom, semaforoTo);
    }

    return data;
  }

  // Llama a la Edge Function send-alert en background (no bloquea el save)
  async function triggerSemAlert(workspaceId, v, semaforoFrom, semaforoTo) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      // Resolver emails de TODOS los vendedores asignados + su jerarquía.
      // Se usa window.AUTOMIND.USUARIOS (siempre disponible en runtime) para
      // no depender de campos enriquecidos que pueden no estar en el form state.
      const A = window.AUTOMIND;
      const usuarios = (A && Array.isArray(A.USUARIOS)) ? A.USUARIOS : [];
      const vids = Array.isArray(v.vendedorIds) ? v.vendedorIds.filter(Boolean)
                 : (v.vendedorId ? [v.vendedorId] : []);
      const vendedores = vids.map(function(id) {
        return usuarios.find(function(u) { return u.id === id; });
      }).filter(Boolean);

      // Emails únicos por rol — soporta múltiples gerentes y directores por vendedor
      function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
      function getReportaIds(u) {
        return (Array.isArray(u.reportaIds) && u.reportaIds.length > 0)
          ? u.reportaIds
          : (u.reportaA ? [u.reportaA] : []);
      }
      var vendedorEmails = unique(vendedores.map(function(u) { return u.email || ""; }));
      var gerenteEmails  = unique(vendedores.flatMap(function(u) {
        return getReportaIds(u).map(function(gId) {
          var ger = usuarios.find(function(s) { return s.id === gId; });
          return ger ? (ger.email || "") : "";
        });
      }));
      var directorEmails = unique(vendedores.flatMap(function(u) {
        return getReportaIds(u).flatMap(function(gId) {
          var ger = usuarios.find(function(s) { return s.id === gId; });
          if (!ger) return [];
          return getReportaIds(ger).map(function(dId) {
            var dir = usuarios.find(function(s) { return s.id === dId; });
            return dir ? (dir.email || "") : "";
          });
        });
      }));

      console.log("[triggerSemAlert] vendedores:", vids.length,
        "| vendedorEmails:", vendedorEmails,
        "| gerenteEmails:", gerenteEmails,
        "| directorEmails:", directorEmails);

      const vehicleDesc = [v.marca, v.modelo, v.anio].filter(Boolean).join(" ");
      await fetch(`${window.SUPABASE_URL}/functions/v1/send-alert`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey":         window.SUPABASE_ANON,
        },
        body: JSON.stringify({
          workspaceId,
          vehicleId:        v.id,
          vehicleDesc,
          vin:              v.vin        || null,
          diasEnPiso:       v.diasEnPiso || 0,
          interesAcum:      v.interesAcum || 0,
          pctPlanConsumido: v.pctPlanConsumido || 0,
          semaforoFrom,
          semaforoTo,
          vendedorEmails,
          gerenteEmails,
          directorEmails,
        }),
      });
    } catch(e) {
      console.warn("Alert trigger failed (non-critical):", e.message);
    }
  }

  async function deleteVehicle(id) {
    const { error } = await client.from("inventario").delete().eq("id", id);
    if (error) throw error;
  }

  async function loadInventario(agencyId) {
    const { data, error } = await client
      .from("inventario")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  /* ── Colaboradores — CRUD ─────────────────────────────────── */

  async function saveColaborador(agencyId, userData) {
    const parentId = (window.AUTOMIND && window.AUTOMIND.agencyParentId) || agencyId;
    const email = (userData.email || "").toLowerCase().trim();
    const row = {
      id:           userData.id,
      workspace_id: agencyId,
      agency_id:    parentId,
      nombre:       userData.nombre,
      email,
      tel:          userData.tel || null,
      rol:          userData.rol,
      reporta_ids:  Array.isArray(userData.reportaIds) && userData.reportaIds.length > 0
                      ? userData.reportaIds
                      : (userData.reportaA ? [userData.reportaA] : []),
      reporta_a:    Array.isArray(userData.reportaIds) && userData.reportaIds.length > 0
                      ? userData.reportaIds[0]
                      : (userData.reportaA || null),
      fecha_ingreso: userData.fechaIngreso || null,
    };

    // Multi-tenant: el mismo email puede existir en distintos workspaces.
    // El constraint en BD es UNIQUE(email, workspace_id).
    // Upsert por id: si la fila existe → update; si no → insert.
    const { data: existing } = await client
      .from("users").select("id").eq("id", row.id).maybeSingle();

    let data, error;
    if (existing) {
      ({ data, error } = await client.from("users").update(row).eq("id", row.id).select().single());
    } else {
      ({ data, error } = await client.from("users").insert(row).select().single());
    }

    if (error) {
      // Conflicto por (email, workspace_id): mismo email ya existe en este workspace
      if (error.code === "23505" || (error.message || "").includes("users_email_workspace_key")) {
        throw new Error("Este correo ya está registrado en este workspace. Usa un correo diferente.");
      }
      throw error;
    }
    return data;
  }

  async function deleteColaborador(id) {
    // Llama Edge Function para borrar de users + workspace_memberships + Supabase Auth
    const { data: { session } } = await client.auth.getSession();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/delete-user`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey":        window.SUPABASE_ANON,
      },
      body: JSON.stringify({ userId: id }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al eliminar usuario");
  }

  /* ── Helper: mapear objeto de app → fila de DB ────────────── */

  function dbRowFromVehicle(agencyId, v) {
    const toISO = (d) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      if (typeof d === "string") {
        // soporta "dd/mm/yyyy" y "yyyy-mm-dd"
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
          const [dd, mm, yy] = d.split("/");
          return `${yy}-${mm}-${dd}`;
        }
        return d.slice(0, 10);
      }
      return null;
    };
    return {
      id:               v.id,
      workspace_id:     agencyId,
      agency_id:        (window.AUTOMIND && window.AUTOMIND.agencyParentId) || agencyId,
      vin:              v.vin              || null,
      marca:            v.marca            || null,
      modelo:           v.modelo           || null,
      anio:             Number(v.anio)     || null,
      descripcion:      v.descripcion      || null,
      tipo:             v.tipo             || null,
      color_exterior:   v.colorExterior    || null,
      color_interior:   v.colorInterior    || null,
      estatus:          v.estatus          || "NUEVOS",
      inv:              v.inv              || null,
      observaciones:    v.observaciones    || null,
      monto_financiado: Number(v.montoFinanciado) || 0,
      pct_interes:      Number(v.pctInteres)       || 0,
      dias_gracia_base: Number(v.diasGraciaBase)   || 0,
      dias_gracia_extra:Number(v.diasGraciaExtra)  || 0,
      fecha_factura:    toISO(v.fechaFactura),
      fecha_llegada:    toISO(v.fechaLlegada),
      foto_url:         v.fotoUrl          || v.foto || null,
      // multi-vendedor: guardar array completo + primer elemento en campo legacy
      vendedor_ids:     Array.isArray(v.vendedorIds) ? v.vendedorIds.filter(Boolean) : (v.vendedorId ? [v.vendedorId] : []),
      vendedor_id:      (Array.isArray(v.vendedorIds) && v.vendedorIds.filter(Boolean)[0]) || v.vendedorId || null,
      estado_venta:     v.estadoVenta      || 'DISPONIBLE',
      fecha_venta:      toISO(v.fechaVenta) || null,
      // Persistir el semáforo actual para que la detección de cambios
      // (saveVehicle → triggerSemAlert) funcione y no se re-dispare en cada guardado
      semaforo_snapshot: v.semaforo        || null,
    };
  }

  /* ── Helper: mapear fila de DB → objeto de app ────────────── */

  function vehicleFromDbRow(row) {
    const parseDate = (s) => s ? new Date(s + "T12:00:00") : null;
    return {
      id:              row.id,
      vin:             row.vin              || "",
      marca:           row.marca            || "",
      modelo:          row.modelo           || "",
      anio:            row.anio             || new Date().getFullYear(),
      descripcion:     row.descripcion      || "",
      tipo:            row.tipo             || "",
      colorExterior:   row.color_exterior   || "",
      colorInterior:   row.color_interior   || "",
      estatus:         row.estatus          || "NUEVOS",
      inv:             row.inv              || "",
      observaciones:   row.observaciones    || "",
      montoFinanciado: Number(row.monto_financiado)  || 0,
      pctInteres:      Number(row.pct_interes)        || 0,
      diasGraciaBase:  Number(row.dias_gracia_base)   || 0,
      diasGraciaExtra: Number(row.dias_gracia_extra)  || 0,
      fechaFactura:    parseDate(row.fecha_factura),
      fechaLlegada:    parseDate(row.fecha_llegada),
      foto:            row.foto_url         || null,
      fotoUrl:         row.foto_url         || null,
      // multi-vendedor: leer array; fallback a campo legacy si el array está vacío
      vendedorIds:     Array.isArray(row.vendedor_ids) && row.vendedor_ids.length > 0
                         ? row.vendedor_ids
                         : (row.vendedor_id ? [row.vendedor_id] : []),
      vendedorId:      (Array.isArray(row.vendedor_ids) && row.vendedor_ids[0]) || row.vendedor_id || null,
      estadoVenta:     row.estado_venta     || 'DISPONIBLE',
      fechaVenta:      parseDate(row.fecha_venta),
    };
  }

  function colaboradorFromDbRow(row) {
    return {
      id:           row.id,
      nombre:       row.nombre,
      email:        row.email,
      tel:          row.tel          || "",
      rol:          row.rol,
      reportaA:     row.reporta_a    || null,
      reportaIds:   (row.reporta_ids && row.reporta_ids.length > 0) ? row.reporta_ids : (row.reporta_a ? [row.reporta_a] : []),
      fechaIngreso: row.fecha_ingreso || "",
      auth_user_id: row.auth_user_id || null,
    };
  }

  /* ── Invitaciones via Edge Function ─────────────────────────── */
  async function inviteUser(payload) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error("No autenticado");
    const res = await fetch(
      `${window.SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey":         window.SUPABASE_ANON,
        },
        body: JSON.stringify(payload),
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al invitar usuario");
    return json;
  }

  /* ── Clientes CRM ─────────────────────────────────────────── */

  function clienteFromDbRow(row) {
    return {
      id:          row.id,
      nombre:      row.nombre_completo        || "",
      tel:         row.telefono               || "",
      email:       row.email                  || "",
      tipo:        row.tipo_cliente           || "Persona física",
      canal:       row.canal_origen           || "Digital",
      fuente:      row.fuente_especifica      || "",
      interes:     row.interes_vehiculo       || "",
      presupuesto: Number(row.presupuesto_estimado) || 0,
      formaPago:   row.forma_pago             || "No definido",
      uso:         row.uso_vehiculo           || "Personal",
      etapa:       row.etapa_proceso          || "Prospección",
      asesor:      row.asesor_id              || "",
        uc:          row.ultimo_contacto        || "",
      ciudad:      row.ciudad                 || "",
      estado:      row.estado_rep             || "",
      prox:        row.proxima_accion         || "",
      fprox:       row.fecha_proxima_accion   || "",
      notas:       row.notas                  || "",
      curp:        row.curp                  || "",
      rfc:         row.rfc                   || "",
      fechaNac:    row.fecha_nacimiento       || "",
      sexo:        row.sexo                   || "",
      direccion:   row.direccion              || "",
      colonia:     row.colonia                || "",
      cp:          row.cp                     || "",
      numLicencia: row.numero_licencia        || "",
      tipoLic:     row.tipo_licencia          || "",
      vigenciaLic:   row.vigencia_licencia      || "",
      pruebaManejo:  !!row.prueba_manejo,
      fechaPrueba:   row.fecha_prueba            || "",
      unidadPrueba:  row.unidad_prueba           || "",
      resultadoPrueba: row.resultado_prueba      || "",
      obsPrueba:     row.obs_prueba              || "",
      // E5 — Aprobación de gerente
      e5Estado:      row.e5_estado              || "Pendiente",
      e5AprobadoPor: row.e5_aprobado_por        || "",
      e5Fecha:       row.e5_fecha               || null,
      e5Notas:       row.e5_notas               || "",
      // E8 — Expediente (contrato firmado)
      e8ContratoUrl:    row.e8_contrato_url     || null,
      e8ContratoNombre: row.e8_contrato_nombre  || "",
      e8ContratoFecha:  row.e8_contrato_fecha   || "",
      // E6 — Proceso de crédito
      e6Estado:       row.e6_estado             || "Pendiente",
      e6Institucion:  row.e6_institucion        || "",
      e6MontoAprobado: Number(row.e6_monto_aprobado) || 0,
      e6MensualidadReal: Number(row.e6_mensualidad_real) || 0,
      e6Condiciones:  row.e6_condiciones        || "",
      e6FechaSolicitud: row.e6_fecha_solicitud  || "",
      e6FechaResultado: row.e6_fecha_resultado  || "",
      // E7 — Validación de expediente
      e7ContratoOk:      !!row.e7_contrato_ok,
      e7ExcepcionAuth:   !!row.e7_excepcion_auth,
      e7ExcepcionNota:   row.e7_excepcion_nota  || "",
      e7Obs:             row.e7_obs             || "",
      // E4 — Cotización
      unidadId:      row.unidad_id              || null,
      unidadDesc:    row.unidad_desc            || "",
      precioLista:   Number(row.precio_lista)   || 0,
      descuentoMonto: Number(row.descuento_monto) || 0,
      precioVenta:   Number(row.precio_venta)   || 0,
      formaPagoCot:  row.forma_pago_cot         || "Contado",
      enganche:      Number(row.enganche)       || 0,
      plazoMeses:    Number(row.plazo_meses)    || 0,
      mensualidadEst: Number(row.mensualidad_est) || 0,
      notasCot:      row.notas_cot             || "",
      createdAt:   row.created_at             || null,
      // Documentos del cliente (E2) — rutas en Supabase Storage
      docId:       row.doc_id_key  ? { name: row.doc_id_nombre  || "", storageKey: row.doc_id_key  } : null,
      docLicencia: row.doc_lic_key ? { name: row.doc_lic_nombre || "", storageKey: row.doc_lic_key } : null,
      docDomicilio:row.doc_dom_key ? { name: row.doc_dom_nombre || "", storageKey: row.doc_dom_key } : null,
      docRfc:           row.doc_rfc_key      ? { name: row.doc_rfc_nombre      || "", storageKey: row.doc_rfc_key      } : null,
      docAviso:         row.doc_aviso_key    ? { name: row.doc_aviso_nombre    || "", storageKey: row.doc_aviso_key    } : null,
      docEvidenciaPrueba:  row.doc_ev_prueba_key        ? { name: row.doc_ev_prueba_nombre        || "", storageKey: row.doc_ev_prueba_key        } : null,
      docEncuestaPrueba:   row.doc_encuesta_prueba_key  ? { name: row.doc_encuesta_prueba_nombre  || "", storageKey: row.doc_encuesta_prueba_key  } : null,
      docFactura:     row.doc_factura_key    ? { name: row.doc_factura_nombre    || "", storageKey: row.doc_factura_key    } : null,
      docCotizacion:  row.doc_cotizacion_key ? { name: row.doc_cotizacion_nombre || "", storageKey: row.doc_cotizacion_key } : null,
      docComprobantes: (function() {
        // Nuevo: leer del JSONB array
        if (row.doc_comprobantes) {
          try {
            var arr = typeof row.doc_comprobantes === "string"
              ? JSON.parse(row.doc_comprobantes)
              : row.doc_comprobantes;
            if (Array.isArray(arr)) return arr;
          } catch(e) {}
        }
        // Compat: migrar columnas antiguas
        if (row.doc_comprobante_key) {
          return [{ name: row.doc_comprobante_nombre || "", storageKey: row.doc_comprobante_key, monto: null }];
        }
        return [];
      })(),
      // Documentos de crédito (E6)
      docCredCarta:     row.doc_cred_carta_key      ? { name: row.doc_cred_carta_nombre      || "", storageKey: row.doc_cred_carta_key      } : null,
      docCredSolicitud: row.doc_cred_solicitud_key   ? { name: row.doc_cred_solicitud_nombre  || "", storageKey: row.doc_cred_solicitud_key   } : null,
      docCredEstadoCta: row.doc_cred_estado_cta_key  ? { name: row.doc_cred_estado_cta_nombre || "", storageKey: row.doc_cred_estado_cta_key  } : null,
      docCredContrato:  row.doc_cred_contrato_key    ? { name: row.doc_cred_contrato_nombre   || "", storageKey: row.doc_cred_contrato_key    } : null,
      // Estado general del proceso comercial
      estadoGeneral:  row.estado_general    || "Activo",
      // Pago
      pagoMetodo:     row.pago_metodo       || "",
      pagoFecha:      row.pago_fecha        || "",
      pagoReferencia: row.pago_referencia   || "",
      pagoMonto:      Number(row.pago_monto) || 0,
      pagoNotas:      row.pago_notas        || "",
      // Entrega
      entregaFecha:   row.entrega_fecha     || "",
      entregaKm:      row.entrega_km        || "",
      entregaNotas:   row.entrega_notas     || "",
      // Verificación de contacto (#01)
      telVerificadoAt:     row.tel_verificado_at     || null,
      telVerificadoMetodo: row.tel_verificado_metodo || null,
      emailVerificadoAt:     row.email_verificado_at     || null,
      emailVerificadoMetodo: row.email_verificado_metodo || null,
      // Encuesta de preferencias del cliente (8.1-8.12)
      encuestaProspeccion: (function() {
        if (row.encuesta_prospeccion) {
          try {
            var obj = typeof row.encuesta_prospeccion === "string"
              ? JSON.parse(row.encuesta_prospeccion)
              : row.encuesta_prospeccion;
            if (obj && typeof obj === "object") return obj;
          } catch(e) {}
        }
        return {};
      })(),
    };
  }

  function dbRowFromCliente(agencyId, c) {
    var parentId = (window.AUTOMIND && window.AUTOMIND.agencyParentId) || agencyId;
    return {
      nombre_completo:      c.nombre       || null,
      telefono:             c.tel          || null,
      email:                c.email        || null,
      tipo_cliente:         c.tipo         || "Persona física",
      canal_origen:         c.canal        || "Digital",
      fuente_especifica:    c.fuente       || null,
      interes_vehiculo:     c.interes      || null,
      presupuesto_estimado: Number(c.presupuesto) || null,
      forma_pago:           c.formaPago    || "No definido",
      uso_vehiculo:         c.uso          || "Personal",
      etapa_proceso:        c.etapa        || "Prospección",
      asesor_id:            c.asesor       || null,
        ultimo_contacto:      c.uc           || null,
      ciudad:               c.ciudad       || null,
      estado_rep:           c.estado       || null,
      proxima_accion:       c.prox         || null,
      fecha_proxima_accion: c.fprox        || null,
      notas:                c.notas        || null,
      curp:                 c.curp         || null,
      rfc:                  c.rfc          || null,
      fecha_nacimiento:     c.fechaNac     || null,
      sexo:                 c.sexo         || null,
      direccion:            c.direccion    || null,
      colonia:              c.colonia      || null,
      cp:                   c.cp           || null,
      numero_licencia:      c.numLicencia  || null,
      tipo_licencia:        c.tipoLic      || null,
      vigencia_licencia:    c.vigenciaLic  || null,
      prueba_manejo:        !!c.pruebaManejo,
      fecha_prueba:         c.fechaPrueba   || null,
      unidad_prueba:        c.unidadPrueba  || null,
      resultado_prueba:     c.resultadoPrueba || null,
      obs_prueba:           c.obsPrueba     || null,
      // E5 — Aprobación de gerente
      e5_estado:            c.e5Estado      || "Pendiente",
      e5_aprobado_por:      c.e5AprobadoPor || null,
      e5_fecha:             c.e5Fecha       || null,
      e5_notas:             c.e5Notas       || null,
      // E8 — Expediente (contrato firmado)
      e8_contrato_url:    c.e8ContratoUrl    || null,
      e8_contrato_nombre: c.e8ContratoNombre || null,
      e8_contrato_fecha:  c.e8ContratoFecha  || null,
      // E6 — Proceso de crédito
      e6_estado:            c.e6Estado        || "Pendiente",
      e6_institucion:       c.e6Institucion   || null,
      e6_monto_aprobado:    Number(c.e6MontoAprobado)    || null,
      e6_mensualidad_real:  Number(c.e6MensualidadReal)  || null,
      e6_condiciones:       c.e6Condiciones   || null,
      e6_fecha_solicitud:   c.e6FechaSolicitud || null,
      e6_fecha_resultado:   c.e6FechaResultado || null,
      // E7 — Validación de expediente
      e7_contrato_ok:       !!c.e7ContratoOk,
      e7_excepcion_auth:    !!c.e7ExcepcionAuth,
      e7_excepcion_nota:    c.e7ExcepcionNota  || null,
      e7_obs:               c.e7Obs            || null,
      // E4 — Cotización
      unidad_id:            c.unidadId      || null,
      unidad_desc:          c.unidadDesc    || null,
      precio_lista:         Number(c.precioLista)  || null,
      descuento_monto:      Number(c.descuentoMonto) || 0,
      precio_venta:         Number(c.precioVenta)  || null,
      forma_pago_cot:       c.formaPagoCot  || "Contado",
      enganche:             Number(c.enganche) || null,
      plazo_meses:          Number(c.plazoMeses) || null,
      mensualidad_est:      Number(c.mensualidadEst) || null,
      notas_cot:            c.notasCot      || null,
      // Documentos del cliente (E2) — rutas en Supabase Storage
      doc_id_key:     c.docId       ? (c.docId.storageKey       || null) : null,
      doc_id_nombre:  c.docId       ? (c.docId.name             || null) : null,
      doc_lic_key:    c.docLicencia ? (c.docLicencia.storageKey || null) : null,
      doc_lic_nombre: c.docLicencia ? (c.docLicencia.name       || null) : null,
      doc_dom_key:    c.docDomicilio? (c.docDomicilio.storageKey|| null) : null,
      doc_dom_nombre: c.docDomicilio? (c.docDomicilio.name      || null) : null,
      doc_rfc_key:       c.docRfc           ? (c.docRfc.storageKey           || null) : null,
      doc_rfc_nombre:    c.docRfc           ? (c.docRfc.name                || null) : null,
      doc_aviso_key:     c.docAviso         ? (c.docAviso.storageKey        || null) : null,
      doc_aviso_nombre:  c.docAviso         ? (c.docAviso.name              || null) : null,
      doc_ev_prueba_key:           c.docEvidenciaPrueba ? (c.docEvidenciaPrueba.storageKey  || null) : null,
      doc_ev_prueba_nombre:        c.docEvidenciaPrueba ? (c.docEvidenciaPrueba.name         || null) : null,
      doc_encuesta_prueba_key:     c.docEncuestaPrueba  ? (c.docEncuestaPrueba.storageKey   || null) : null,
      doc_encuesta_prueba_nombre:  c.docEncuestaPrueba  ? (c.docEncuestaPrueba.name          || null) : null,
      doc_factura_key:         c.docFactura    ? (c.docFactura.storageKey    || null) : null,
      doc_factura_nombre:      c.docFactura    ? (c.docFactura.name          || null) : null,
      doc_cotizacion_key:      c.docCotizacion ? (c.docCotizacion.storageKey || null) : null,
      doc_cotizacion_nombre:   c.docCotizacion ? (c.docCotizacion.name       || null) : null,
      doc_comprobantes: (c.docComprobantes && c.docComprobantes.length > 0)
        ? JSON.stringify(c.docComprobantes.map(function(it) {
            return { name: it.name || "", storageKey: it.storageKey || null, monto: it.monto != null ? it.monto : null };
          }))
        : null,
      doc_comprobante_key:     null,
      doc_comprobante_nombre:  null,
      // Documentos de crédito (E6)
      doc_cred_carta_key:         c.docCredCarta    ? (c.docCredCarta.storageKey    || null) : null,
      doc_cred_carta_nombre:      c.docCredCarta    ? (c.docCredCarta.name          || null) : null,
      doc_cred_solicitud_key:     c.docCredSolicitud? (c.docCredSolicitud.storageKey|| null) : null,
      doc_cred_solicitud_nombre:  c.docCredSolicitud? (c.docCredSolicitud.name      || null) : null,
      doc_cred_estado_cta_key:    c.docCredEstadoCta? (c.docCredEstadoCta.storageKey|| null) : null,
      doc_cred_estado_cta_nombre: c.docCredEstadoCta? (c.docCredEstadoCta.name      || null) : null,
      doc_cred_contrato_key:      c.docCredContrato ? (c.docCredContrato.storageKey || null) : null,
      doc_cred_contrato_nombre:   c.docCredContrato ? (c.docCredContrato.name       || null) : null,
      // Estado general
      estado_general:   c.estadoGeneral  || "Activo",
      // Pago
      pago_metodo:      c.pagoMetodo     || null,
      pago_fecha:       c.pagoFecha      || null,
      pago_referencia:  c.pagoReferencia || null,
      pago_monto:       Number(c.pagoMonto) || null,
      pago_notas:       c.pagoNotas      || null,
      // Entrega
      entrega_fecha:    c.entregaFecha   || null,
      entrega_km:       c.entregaKm      || null,
      entrega_notas:    c.entregaNotas   || null,
      // Verificación de contacto (#01)
      tel_verificado_at:      c.telVerificadoAt     || null,
      tel_verificado_metodo:  c.telVerificadoMetodo || null,
      email_verificado_at:    c.emailVerificadoAt   || null,
      email_verificado_metodo: c.emailVerificadoMetodo || null,
      // Encuesta de preferencias del cliente (8.1-8.12)
      encuesta_prospeccion: (c.encuestaProspeccion && Object.keys(c.encuestaProspeccion).length > 0)
        ? c.encuestaProspeccion
        : null,
      workspace_id:         agencyId,
      agency_id:            parentId,
    };
  }

  async function getClientes(agencyId) {
    const { data, error } = await client
      .from("clientes")
      .select("*")
      .or(`workspace_id.eq.${agencyId},agency_id.eq.${agencyId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(clienteFromDbRow);
  }

  async function saveCliente(agencyId, clienteData) {
    const row = dbRowFromCliente(agencyId, clienteData);
    const isNew = !clienteData.id || /^c\d+$/.test(String(clienteData.id));
    if (isNew) {
      const { data, error } = await client.from("clientes").insert(row).select().single();
      if (error) throw new Error(error.message);
      var saved = clienteFromDbRow(data);
      addClienteHistorial(saved.id, agencyId, "nota", "Cliente registrado en el sistema");
      return saved;
    } else {
      // Leer datos anteriores para detectar cambios significativos
      var prevData = clienteData._prev || {};
      const { data, error } = await client.from("clientes").upsert({ id: clienteData.id, ...row }).select().single();
      if (error) throw new Error(error.message);
      var saved = clienteFromDbRow(data);
      // Auto-log cambios relevantes
      if (prevData.etapa && prevData.etapa !== saved.etapa) {
        addClienteHistorial(saved.id, agencyId, "etapa",
          "Etapa actualizada: " + prevData.etapa + " → " + saved.etapa);
      }
      if (prevData.estadoGeneral && prevData.estadoGeneral !== saved.estadoGeneral) {
        addClienteHistorial(saved.id, agencyId, "estado",
          "Estado actualizado: " + prevData.estadoGeneral + " → " + saved.estadoGeneral);
      }
      if (prevData.asesor !== saved.asesor && saved.asesor) {
        addClienteHistorial(saved.id, agencyId, "vendedor",
          "Vendedor asignado: " + saved.asesor);
      }
      return saved;
    }
  }

  async function deleteCliente(id) {
    const { error } = await client.from("clientes").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  /* ── Historial de actividad del cliente ───────────────────── */

  async function getClienteHistorial(clienteId) {
    var { data, error } = await client
      .from("cliente_historial")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { console.warn("[historial]", error.message); return []; }
    return data || [];
  }

  async function addClienteHistorial(clienteId, workspaceId, tipoEvento, descripcion) {
    try {
      var { data: authData } = await client.auth.getUser();
      var nombreUsuario = (authData && authData.user && authData.user.email) ? authData.user.email : "Sistema";
      await client.from("cliente_historial").insert({
        cliente_id:     clienteId,
        workspace_id:   workspaceId,
        tipo_evento:    tipoEvento,
        descripcion:    descripcion,
        usuario_nombre: nombreUsuario,
      });
    } catch(e) {
      console.warn("[historial] No se pudo registrar:", e.message);
    }
  }

  /* ── Super Admin: Audit log ────────────────────────────────── */

  async function logSuperAdminAction(accion, targetId, targetNombre, metadata = {}) {
    try {
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      await client.from("super_admin_audit_log").insert({
        super_admin_user_id: authData.user.id,
        super_admin_email:   authData.user.email,
        accion,
        target_id:     targetId    || null,
        target_nombre: targetNombre || null,
        metadata,
      });
    } catch (e) {
      console.warn("[audit] No se pudo registrar acción:", e.message);
    }
  }

  async function loadAuditLog(limit = 100) {
    const { data, error } = await client
      .from("super_admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }

  /* ── Super Admin: CRUD de agencias ────────────────────────── */

  async function loadAllAgencies() {
    const { data, error } = await client
      .from("agencies")
      .select("*, workspaces(id, nombre, ciudad, status)")
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data || []).map(a => ({
      id:              a.id,
      nombre:          a.nombre,
      ciudad:          a.ciudad           || "",
      iniciales:       a.iniciales        || a.nombre.slice(0,2).toUpperCase(),
      accent:          a.accent           || "#2f6fed",
      sidebar:         a.sidebar          || "#1b2a57",
      ownerEmail:      a.owner_email      || "",
      plan:            a.plan             || "pro",
      razonSocial:     a.razon_social     || "",
      rfc:             a.rfc              || "",
      marca:           a.marca            || "",
      calle:           a.calle            || "",
      colonia:         a.colonia          || "",
      municipio:       a.municipio        || "",
      cp:              a.cp               || "",
      estado:          a.estado           || "",
      repLegalNombre:  a.rep_legal_nombre || "",
      repLegalEmail:   a.rep_legal_email  || "",
      workspaces:      (a.workspaces || []).filter(w => w.status !== "deleted"),
      createdAt:       a.created_at       || null,
    }));
  }

  // Carga TODOS los workspaces (tenants) de todas las agencias en plano
  async function loadAllWorkspaces() {
    const { data, error } = await client
      .from("workspaces")
      .select("*")
      .neq("status", "deleted")
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data || []).map(w => ({
      id:         w.id,
      nombre:     w.nombre || w.name || "",
      ciudad:     w.ciudad || "",
      iniciales:  w.iniciales || (w.nombre || "WS").slice(0, 2).toUpperCase(),
      accent:     w.accent   || "#2f6fed",
      sidebar:    w.sidebar  || "#1b2a57",
      agencyId:   w.agency_id,
      ownerEmail: w.owner_email || "",
      plan:       w.plan || "pro",
    }));
  }

  async function createAgency(agencyData) {
    const nombreComercial = (agencyData.nombre || "").trim();
    const iniciales = agencyData.iniciales ||
      nombreComercial.split(" ").map(w => w[0]).join("").slice(0,3).toUpperCase();
    // 1. Crear registro padre en agencies
    const { data: ag, error: agErr } = await client
      .from("agencies")
      .insert({
        nombre:           nombreComercial,
        ciudad:           agencyData.ciudad          || null,
        iniciales,
        accent:           agencyData.accent          || "#2f6fed",
        sidebar:          agencyData.sidebar         || "#1b2a57",
        owner_email:      agencyData.ownerEmail      || null,
        plan:             agencyData.plan            || "pro",
        razon_social:     agencyData.razonSocial     || null,
        rfc:              agencyData.rfc             || null,
        marca:            agencyData.marca           || null,
        calle:            agencyData.calle           || null,
        colonia:          agencyData.colonia         || null,
        municipio:        agencyData.municipio       || null,
        cp:               agencyData.cp              || null,
        estado:           agencyData.estado          || null,
        rep_legal_nombre: agencyData.repLegalNombre  || null,
        rep_legal_email:  agencyData.repLegalEmail   || null,
      })
      .select()
      .single();
    if (agErr) throw new Error(agErr.message);
    // 2. Crear workspace (tenant) bajo la agencia con los mismos datos
    // NOTA: owner_email y campos legales viven en agencies, NO en workspaces
    const { data: ws, error: wsErr } = await client
      .from("workspaces")
      .insert({
        agency_id:   ag.id,
        nombre:      nombreComercial,
        ciudad:      agencyData.ciudad    || null,
        iniciales,
        accent:      agencyData.accent    || "#2f6fed",
        sidebar:     agencyData.sidebar   || "#1b2a57",
        status:      "active",
      })
      .select()
      .single();
    if (wsErr) throw new Error(wsErr.message);
    const result = {
      id:              ws.id,
      nombre:          ws.nombre,
      ciudad:          ws.ciudad            || "",
      iniciales:       ws.iniciales         || ws.nombre.slice(0, 2).toUpperCase(),
      accent:          ws.accent            || "#2f6fed",
      sidebar:         ws.sidebar           || "#1b2a57",
      agencyId:        ag.id,
      ownerEmail:      agencyData.ownerEmail    || "",
      plan:            agencyData.plan          || "pro",
      razonSocial:     agencyData.razonSocial   || "",
      rfc:             agencyData.rfc           || "",
      marca:           agencyData.marca         || "",
      calle:           agencyData.calle         || "",
      colonia:         agencyData.colonia       || "",
      municipio:       agencyData.municipio     || "",
      cp:              agencyData.cp            || "",
      estado:          agencyData.estado        || "",
      repLegalNombre:  agencyData.repLegalNombre || "",
      repLegalEmail:   agencyData.repLegalEmail  || "",
    };
    // Auditoría — no bloquea si falla
    logSuperAdminAction("crear_agencia", ag.id, ws.nombre, { ciudad: agencyData.ciudad || null });
    return result;
  }

  async function deleteAgency(agencyId) {
    // Capturar nombre antes de borrar para el log
    const { data: ag } = await client.from("agencies").select("nombre").eq("id", agencyId).maybeSingle();
    const { error } = await client.from("agencies").delete().eq("id", agencyId);
    if (error) throw new Error(error.message);
    logSuperAdminAction("eliminar_agencia", agencyId, ag?.nombre || agencyId);
  }

  // Eliminar un workspace (tenant).
  // Los registros dependientes (financieras, inventario, users, clientes, etc.)
  // se borran en cascada por la BD — ver supabase_cascade_workspace_fks.sql.
  async function deleteWorkspace(workspaceId, agencyId) {
    // Capturar nombre antes de borrar para el log
    const { data: ws } = await client.from("workspaces").select("nombre").eq("id", workspaceId).maybeSingle();
    const { error } = await client.from("workspaces").delete().eq("id", workspaceId);
    if (error) throw new Error(error.message);
    logSuperAdminAction("eliminar_workspace", workspaceId, ws?.nombre || workspaceId, { agencyId: agencyId || null });
    // Si era el último workspace de la agencia padre, borrar la agencia también
    if (agencyId) {
      const { data: rest } = await client.from("workspaces").select("id").eq("agency_id", agencyId);
      if (!rest || rest.length === 0) {
        await client.from("agencies").delete().eq("id", agencyId);
      }
    }
  }

  async function loadAgencyWorkspaces(agencyId) {
    const { data, error } = await client
      .from("workspaces")
      .select("*")
      .eq("agency_id", agencyId)
      .order("nombre");
    if (error) throw new Error(error.message);
    return data || [];
  }

  /* ── Diagnóstico de permisos super admin (llamar desde browser console) ── */
  async function testSuperAdminPerms() {
    console.log("═══ TEST PERMISOS SUPER ADMIN ═══");
    const { data: authData } = await client.auth.getUser();
    if (!authData?.user) { console.error("❌ No autenticado"); return; }
    console.log("✅ Auth uid:", authData.user.id, "| email:", authData.user.email);

    // Test SELECT inventario
    const { data: selRows, error: selErr } = await client.from("inventario").select("id").limit(1);
    if (selErr) console.error("❌ SELECT inventario:", selErr.message);
    else console.log("✅ SELECT inventario OK — filas visibles: (use otro query para contar)");

    // Test INSERT inventario
    const wsId = window.AUTOMIND?.agencyId;
    const agId = window.AUTOMIND?.agencyParentId || wsId;
    console.log("   agencyId (workspace_id):", wsId);
    console.log("   agencyParentId (agency_id):", agId);
    if (!wsId || !agId) {
      console.warn("⚠️ AUTOMIND no inicializado — entra a un workspace primero");
      return;
    }
    const testId = "SA_TEST_" + Date.now();
    const { data: insData, error: insErr } = await client
      .from("inventario")
      .upsert({ id: testId, workspace_id: wsId, agency_id: agId, estatus: "NUEVOS", marca: "TEST_SA" }, { onConflict: "id" })
      .select().maybeSingle();
    if (insErr) console.error("❌ INSERT inventario:", insErr.code, insErr.message, insErr.details);
    else if (!insData) console.error("❌ INSERT inventario BLOQUEADO por RLS (data nulo)");
    else { console.log("✅ INSERT inventario OK, id:", insData.id); await client.from("inventario").delete().eq("id", testId); console.log("✅ DELETE inventario OK"); }

    // Test INSERT clientes
    const { data: insC, error: insCErr } = await client
      .from("clientes")
      .insert({ nombre_completo: "TEST_SA", workspace_id: wsId, agency_id: agId, etapa_proceso: "Prospección", estado_general: "Activo" })
      .select().maybeSingle();
    if (insCErr) console.error("❌ INSERT clientes:", insCErr.code, insCErr.message);
    else if (!insC) console.error("❌ INSERT clientes BLOQUEADO por RLS");
    else { console.log("✅ INSERT clientes OK, id:", insC.id); await client.from("clientes").delete().eq("id", insC.id); console.log("✅ DELETE clientes OK"); }

    console.log("═══════════════════════════════");
    console.log("Para más detalle, corre supabase_test_superadmin_perms.sql en Supabase SQL Editor");
  }

  /* ── Aviso de Privacidad ──────────────────────────────────── */

  const AVISO_DEFAULT_KEY = "privacidad/aviso_privacidad_generico.docx";

  async function getAvisoSignedUrl(workspaceId) {
    var key = null;
    try {
      var { data: ws } = await client.from("workspaces").select("aviso_privacidad_key").eq("id", workspaceId).maybeSingle();
      if (ws && ws.aviso_privacidad_key) key = ws.aviso_privacidad_key;
    } catch(e) {}
    if (!key) {
      try {
        var { data: ag } = await client.from("agencies").select("aviso_privacidad_key").eq("id", workspaceId).maybeSingle();
        if (ag && ag.aviso_privacidad_key) key = ag.aviso_privacidad_key;
      } catch(e) {}
    }
    var resolvedKey = key || AVISO_DEFAULT_KEY;
    var { data } = await client.storage.from("expedientes").createSignedUrl(resolvedKey, 3600);
    return { url: data && data.signedUrl ? data.signedUrl : null, isDefault: !key, key: resolvedKey };
  }

  async function saveWorkspaceAviso(workspaceId, file) {
    var ext = (file.name || "aviso").split(".").pop().toLowerCase();
    var key = "privacidad/" + workspaceId + "/" + Date.now() + "-aviso." + ext;
    var { error: upErr } = await client.storage.from("expedientes").upload(key, file, { contentType: file.type, upsert: true });
    if (upErr) throw upErr;
    // Intentar workspaces primero, si no afecta ninguna fila → intentar agencies
    var { data: wsData, error: wsErr } = await client.from("workspaces")
      .update({ aviso_privacidad_key: key, aviso_privacidad_nombre: file.name })
      .eq("id", workspaceId).select("id");
    if (wsErr || !wsData || wsData.length === 0) {
      var { error: agErr } = await client.from("agencies")
        .update({ aviso_privacidad_key: key, aviso_privacidad_nombre: file.name })
        .eq("id", workspaceId);
      if (agErr) throw agErr;
    }
    return { key, nombre: file.name };
  }

  /* ── Exponer en window ─────────────────────────────────────── */
  window.DB = {
    client,
    signIn,
    signOut,
    getSession,
    getUserContext,
    loadWorkspaces,
    createWorkspace,
    loadAgencyData,
    saveVehicle,
    deleteVehicle,
    loadInventario,
    saveColaborador,
    deleteColaborador,
    inviteUser,
    dbRowFromVehicle,
    vehicleFromDbRow,
    colaboradorFromDbRow,
    clienteFromDbRow,
    dbRowFromCliente,
    getClientes,
    saveCliente,
    deleteCliente,
    loadAllAgencies,
    loadAllWorkspaces,
    createAgency,
    deleteAgency,
    deleteWorkspace,
    loadAgencyWorkspaces,
    logSuperAdminAction,
    loadAuditLog,
    getClienteHistorial,
    addClienteHistorial,
    testSuperAdminPerms,
    getAvisoSignedUrl,
    saveWorkspaceAviso,
    storage: client.storage,
  };
})();
