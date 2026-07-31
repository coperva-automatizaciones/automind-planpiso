// Automind · Edge Function: verify-contact
// Verifica si un número de teléfono tiene WhatsApp activo y si un correo
// electrónico tiene registros MX válidos (dominio que acepta emails).
//
// Deploy:
//   supabase functions deploy verify-contact --no-verify-jwt
//
// Secrets opcionales (si están configurados, habilitan verificación Twilio WA):
//   TWILIO_ACCOUNT_SID   — SID de cuenta Twilio
//   TWILIO_AUTH_TOKEN    — token de autenticación Twilio
//
// Sin credenciales Twilio, el teléfono se valida solo por formato E.164 mexicano.

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza un número mexicano a E.164 (+52XXXXXXXXXX).
 *  Acepta: 10 dígitos, con +52 o 52 como prefijo, con o sin guiones/espacios. */
function normalizarTelMx(tel: string): string | null {
  const limpio = tel.replace(/[\s\-\(\)\.]/g, "");
  // Ya tiene prefijo internacional
  if (/^\+52\d{10}$/.test(limpio)) return limpio;
  if (/^52\d{10}$/.test(limpio))   return "+" + limpio;
  // Solo 10 dígitos locales
  if (/^\d{10}$/.test(limpio))     return "+52" + limpio;
  return null;
}

/** Verifica que el dominio del email tiene registros MX mediante DNS-over-HTTPS. */
async function verificarEmailMx(email: string): Promise<{ ok: boolean; detalle: string }> {
  const partes = email.trim().toLowerCase().split("@");
  if (partes.length !== 2 || !partes[1].includes(".")) {
    return { ok: false, detalle: "Formato de correo inválido" };
  }
  const dominio = partes[1];

  // Proveedores conocidos — aceptar directamente sin DNS lookup
  const PROVEEDORES_CONOCIDOS = [
    "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.com",
    "icloud.com", "me.com", "protonmail.com", "msn.com",
  ];
  if (PROVEEDORES_CONOCIDOS.includes(dominio)) {
    return { ok: true, detalle: `Proveedor conocido (${dominio})` };
  }

  // DNS-over-HTTPS (Cloudflare) para verificar registros MX
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(dominio)}&type=MX`;
    const res  = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!res.ok) throw new Error("DNS lookup falló: " + res.status);
    const data = await res.json() as { Status: number; Answer?: { type: number }[] };
    const tieneMx = data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
    return tieneMx
      ? { ok: true,  detalle: `Dominio ${dominio} acepta emails (MX verificado)` }
      : { ok: false, detalle: `El dominio ${dominio} no tiene registros MX — el correo podría no existir` };
  } catch (e: any) {
    // Si el DNS lookup falla (timeout, etc.) asumir formato válido pero no verificado
    return { ok: true, detalle: `Formato válido — DNS lookup no disponible (${e?.message})` };
  }
}

/** Verifica si el número tiene WhatsApp activo vía Twilio Lookup API. */
async function verificarWhatsAppTwilio(
  e164: string,
  accountSid: string,
  authToken: string,
): Promise<{ ok: boolean; detalle: string; metodo: string }> {
  try {
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=whatsapp`;
    const auth = btoa(`${accountSid}:${authToken}`);
    const res  = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Twilio ${res.status}: ${errBody.slice(0, 120)}`);
    }
    const data = await res.json() as {
      whatsapp?: { is_whatsapp?: boolean; is_eligible_whatsapp?: boolean };
    };
    const esWa = data?.whatsapp?.is_whatsapp === true;
    return {
      ok:     esWa,
      detalle: esWa
        ? "Número registrado en WhatsApp ✓"
        : "El número no está registrado en WhatsApp",
      metodo: "twilio_wa",
    };
  } catch (e: any) {
    return { ok: false, detalle: "Error Twilio: " + e?.message, metodo: "twilio_error" };
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { tel, email } = await req.json() as { tel?: string; email?: string };

    const resultado: Record<string, unknown> = { ok: true };

    // ── Verificar teléfono / WhatsApp ──────────────────────────────────────
    if (tel) {
      const e164 = normalizarTelMx(tel);
      if (!e164) {
        resultado.tel = {
          ok:     false,
          metodo: "formato_mx",
          detalle: "El número no tiene formato mexicano válido (se esperan 10 dígitos locales o +52XXXXXXXXXX)",
        };
      } else {
        const twilioSid   = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

        if (twilioSid && twilioToken) {
          // Verificación real con Twilio Lookup
          const waResult = await verificarWhatsAppTwilio(e164, twilioSid, twilioToken);
          resultado.tel = {
            ok:     waResult.ok,
            metodo: waResult.metodo,
            e164,
            detalle: waResult.detalle,
          };
        } else {
          // Sin Twilio: validar formato únicamente
          resultado.tel = {
            ok:     true,
            metodo: "formato_mx",
            e164,
            detalle: `Formato válido (${e164}). Para verificar WhatsApp activo, configura las credenciales Twilio en Supabase Secrets.`,
          };
        }
      }
    }

    // ── Verificar correo electrónico ───────────────────────────────────────
    if (email) {
      const mxResult = await verificarEmailMx(email);
      resultado.email = {
        ok:     mxResult.ok,
        metodo: "mx_lookup",
        detalle: mxResult.detalle,
      };
    }

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Error desconocido" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
