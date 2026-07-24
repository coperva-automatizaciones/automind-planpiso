// Edge Function: extract-document
// Extrae campos de un documento (INE o comprobante de domicilio) con OpenAI GPT-4o-mini vision.
//
// Deploy:
//   supabase functions deploy extract-document --no-verify-jwt
//
// Secret ya configurado (clave de OpenAI guardada bajo este nombre):
//   ANTHROPIC_API_KEY   ← contiene la API key de OpenAI

import OpenAI from "npm:openai@^4.56.0";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_ID = `Analiza esta identificación oficial mexicana (INE, pasaporte u otro documento de identidad).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con certeza.
Omite cualquier campo que no sea legible o no aplique. Estructura esperada:
{
  "nombre":          "nombre(s) de pila",
  "apellidoPaterno": "primer apellido",
  "apellidoMaterno": "segundo apellido",
  "curp":            "CURP en mayúsculas, exactamente 18 caracteres — LEE el CURP TAL COMO APARECE IMPRESO en el documento; NO lo derives ni calcules a partir del nombre o fecha de nacimiento. Estructura de referencia: 4 letras (iniciales de apellidos y nombre) + 6 dígitos (fecha nacimiento AAMMDD) + H/M (sexo) + 2 letras (estado) + 3 consonantes internas + 1 dígito/letra (homoclave) + 1 dígito verificador. Si el CURP no está visible con claridad, omite este campo.",
  "rfc":             "RFC si aparece en el documento",
  "fechaNacimiento": "DD/MM/AAAA",
  "sexo":            "H o M",
  "direccion":       "calle y número exterior/interior",
  "colonia":         "colonia o fraccionamiento",
  "ciudad":          "municipio o alcaldía",
  "estado":          "estado de la república (nombre completo)",
  "cp":              "código postal de 5 dígitos"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_DOM = `Analiza este comprobante de domicilio (recibo de luz, agua, teléfono, estado de cuenta, etc.).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos disponibles. Omite los que no puedas leer.
{
  "nombre":          "nombre del titular del servicio",
  "direccion":       "calle y número exterior/interior",
  "colonia":         "colonia o fraccionamiento",
  "ciudad":          "municipio o alcaldía",
  "estado":          "estado de la república (nombre completo)",
  "cp":              "código postal de 5 dígitos",
  "fechaDocumento":  "período o fecha del recibo, ej: mayo 2025"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_LIC = `Analiza esta licencia de conducir mexicana.
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con certeza.
Omite cualquier campo que no sea legible o no aplique. Estructura esperada:
{
  "nombre":          "nombre(s) de pila",
  "apellidoPaterno": "primer apellido",
  "apellidoMaterno": "segundo apellido",
  "curp":            "CURP en mayúsculas, exactamente 18 caracteres — LEE el CURP TAL COMO APARECE IMPRESO en el documento; NO lo derives ni calcules a partir del nombre o fecha de nacimiento. Si el CURP no está visible con claridad, omite este campo.",
  "fechaNacimiento": "DD/MM/AAAA",
  "sexo":            "H o M",
  "numeroLicencia":  "número de folio o licencia",
  "tipoLicencia":    "tipo: A, B, C, D, E, etc.",
  "vigencia":        "fecha de vencimiento DD/MM/AAAA",
  "estado":          "estado emisor de la licencia"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_SOLICITUD = `Analiza esta solicitud de crédito automotriz o documento financiero (puede ser formato del banco, SOFOM o agencia).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos numéricos que puedas leer con certeza.
Omite cualquier campo que no sea claramente legible. Estructura esperada:
{
  "montoFinanciado":   "monto total financiado en pesos, solo dígitos sin comas ni símbolo $ (ej: 299990)",
  "numMensualidades":  "número de mensualidades o plazos (ej: 36)",
  "montoMensualidad":  "monto de la mensualidad en pesos, solo dígitos sin comas ni símbolo $ (ej: 8333)",
  "tasaInteres":       "tasa de interés anual en porcentaje, solo el número (ej: 12.5) — omite si no aparece",
  "institucion":       "nombre del banco, SOFOM o institución financiera — omite si no aparece"
}
IMPORTANTE: devuelve SOLO números para los montos (sin comas, puntos de miles, ni símbolo $).
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_COMPROBANTE = `Analiza este comprobante de pago (puede ser ficha de depósito, transferencia bancaria, recibo de caja, CFDI de pago, voucher de tarjeta, o cualquier documento que acredite un pago).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con certeza.
Omite cualquier campo que no sea claramente legible. Estructura esperada:
{
  "monto":      "monto total del pago en pesos mexicanos, SOLO dígitos sin comas ni símbolo $ (ej: 150000). Es el campo más importante — búscalo en 'TOTAL', 'IMPORTE', 'MONTO PAGADO', 'CANTIDAD'. Si hay múltiples montos, toma el total final.",
  "fecha":      "fecha del pago en formato DD/MM/AAAA",
  "referencia": "número de referencia, folio, número de operación, o número de transacción",
  "banco":      "nombre del banco o institución emisora del comprobante",
  "concepto":   "concepto o descripción del pago si aparece (ej: enganche vehículo, liquidación)"
}
IMPORTANTE: el campo 'monto' es crítico — devuelve SOLO el número, sin comas, puntos de miles ni símbolo $.
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_RFC = `Analiza esta Constancia de Situación Fiscal emitida por el SAT (México).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con certeza.
Omite cualquier campo que no sea legible. Estructura esperada:
{
  "rfc":             "RFC completo con homoclave, exactamente como aparece impreso (ej: LOOA850127L65). LEE verbatim, NO derives ni calcules.",
  "nombre":          "nombre completo del contribuyente o razón social tal como aparece",
  "apellidoPaterno": "primer apellido (solo si es persona física)",
  "apellidoMaterno": "segundo apellido (solo si es persona física)",
  "curp":            "CURP en mayúsculas, 18 caracteres — solo si aparece explícitamente en el documento; NO lo derives del nombre o fecha. Omite si no es visible.",
  "regimenFiscal":   "régimen fiscal (ej: Régimen Simplificado de Confianza)",
  "cp":              "código postal del domicilio fiscal, 5 dígitos",
  "ciudad":          "municipio o alcaldía del domicilio fiscal",
  "estado":          "estado de la república del domicilio fiscal"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { dataUrl, mimeType, docType } = await req.json() as {
      dataUrl: string;
      mimeType: string;
      docType: "id" | "domicilio" | "licencia" | "rfc" | "solicitud_credito" | "comprobante";
    };

    if (!dataUrl || !mimeType || !docType) {
      throw new Error("Parámetros faltantes: dataUrl, mimeType, docType");
    }

    // PDFs no soportados en la API de visión de OpenAI — pedir imagen
    if (mimeType === "application/pdf") {
      return new Response(
        JSON.stringify({ ok: false, error: "Para la extracción IA sube una foto (JPG/PNG) del documento." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // La clave de OpenAI está guardada bajo el nombre ANTHROPIC_API_KEY en Supabase Secrets
    const client = new OpenAI({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "" });
    const prompt  = docType === "id"                ? PROMPT_ID
                  : docType === "licencia"          ? PROMPT_LIC
                  : docType === "rfc"               ? PROMPT_RFC
                  : docType === "solicitud_credito" ? PROMPT_SOLICITUD
                  : docType === "comprobante"       ? PROMPT_COMPROBANTE
                  : PROMPT_DOM;

    const completion = await client.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          { type: "text",      text: prompt },
        ],
      }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Parsear JSON tolerando texto extra que el modelo pueda agregar
    let campos: Record<string, string> = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        for (const [k, v] of Object.entries(parsed)) {
          if (v && String(v).trim()) campos[k] = String(v).trim();
        }
      }
    } catch { /* devuelve objeto vacío si el parse falla */ }

    // Normalizar CURP y RFC a mayúsculas (el modelo a veces devuelve minúsculas)
    if (campos.curp) campos.curp = campos.curp.toUpperCase().replace(/\s/g, "");
    if (campos.rfc)  campos.rfc  = campos.rfc.toUpperCase().replace(/\s/g, "");

    // Validar CURP: patrón oficial mexicano — si no cumple, omitir antes de devolver
    // Esto evita que un CURP derivado/incorrecto se guarde en el expediente
    if (campos.curp) {
      const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
      if (!curpRegex.test(campos.curp)) {
        delete campos.curp; // mejor vacío que incorrecto
      }
    }

    return new Response(
      JSON.stringify({ ok: true, campos }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Error desconocido" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
