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
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con TOTAL certeza.
Si un campo no es legible o no aparece, omítelo completamente del JSON.

REGLAS ESTRICTAS POR CAMPO:

curp: La CURP mexicana tiene EXACTAMENTE 18 caracteres en mayúsculas, sin espacios ni guiones.
  Formato: 4 letras + 6 dígitos (fecha YYMMDD) + 1 letra (H o M) + 2 letras (clave estado) + 3 letras + 1 carácter + 1 dígito.
  Ejemplo válido: GOMC850101HDFNRR09
  ⚠ Errores OCR frecuentes: confundir O (letra) con 0 (cero), I (letra i mayúscula) con 1 (uno), B con 8.
  Lee carácter por carácter del documento. Si el resultado no tiene exactamente 18 caracteres, omite el campo.
  NO incluyas la CURP si tienes dudas en algún carácter.

rfc: El RFC mexicano tiene 13 caracteres (persona física) o 12 (persona moral), sin espacios.
  Formato PF: 4 letras + 6 dígitos (YYMMDD) + 3 alfanuméricos. Ejemplo: GOMC850101AB3
  Omite si no aparece explícitamente en el documento.

fechaNacimiento: Formato estricto DD/MM/AAAA. Ejemplo: 01/01/1985. No uses otro formato.

sexo: Solo puede ser "H" (hombre/masculino) o "M" (mujer/femenino). Ningún otro valor.

cp: Exactamente 5 dígitos. Si el código postal empieza con 0, inclúyelo (ej: "06600"). Omite si no son exactamente 5 dígitos.

nombre / apellidoPaterno / apellidoMaterno: Escribe en MAYÚSCULAS tal como aparece en el documento. No normalices ni corrijas.

Estructura esperada:
{
  "nombre":          "nombre(s) de pila en mayúsculas",
  "apellidoPaterno": "primer apellido en mayúsculas",
  "apellidoMaterno": "segundo apellido en mayúsculas",
  "curp":            "18 caracteres exactos, mayúsculas, sin espacios",
  "rfc":             "RFC si aparece explícitamente",
  "fechaNacimiento": "DD/MM/AAAA",
  "sexo":            "H o M",
  "direccion":       "calle y número exterior/interior",
  "colonia":         "colonia o fraccionamiento",
  "ciudad":          "municipio o alcaldía",
  "estado":          "estado de la república (nombre completo)",
  "cp":              "exactamente 5 dígitos"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_DOM = `Analiza este comprobante de domicilio (recibo de luz, agua, teléfono, estado de cuenta bancario, etc.).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con certeza. Omite los que no sean legibles.

REGLAS ESTRICTAS POR CAMPO:

cp: Exactamente 5 dígitos. Si empieza con 0, inclúyelo (ej: "06600"). Omite si no son exactamente 5 dígitos.

direccion: Incluye calle y número. No incluyas colonia ni ciudad aquí.

nombre: Nombre del titular tal como aparece en el recibo, en mayúsculas.

Estructura esperada:
{
  "nombre":          "nombre del titular en mayúsculas",
  "direccion":       "calle y número exterior/interior solamente",
  "colonia":         "colonia o fraccionamiento",
  "ciudad":          "municipio o alcaldía",
  "estado":          "estado de la república (nombre completo)",
  "cp":              "exactamente 5 dígitos",
  "fechaDocumento":  "período o fecha del recibo, ej: mayo 2025"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_LIC = `Analiza esta licencia de conducir mexicana.
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con TOTAL certeza.
Si un campo no es legible o no aparece, omítelo completamente del JSON.

REGLAS ESTRICTAS POR CAMPO:

curp: La CURP mexicana tiene EXACTAMENTE 18 caracteres en mayúsculas, sin espacios ni guiones.
  Formato: 4 letras + 6 dígitos (fecha YYMMDD) + 1 letra (H o M) + 2 letras (clave estado) + 3 letras + 1 carácter + 1 dígito.
  Ejemplo válido: GOMC850101HDFNRR09
  ⚠ Errores OCR frecuentes: confundir O (letra) con 0 (cero), I (letra i mayúscula) con 1 (uno), B con 8.
  Lee carácter por carácter del documento. Si el resultado no tiene exactamente 18 caracteres, omite el campo.
  NO incluyas la CURP si tienes dudas en algún carácter.

fechaNacimiento / vigencia: Formato estricto DD/MM/AAAA. Ejemplo: 01/01/1985. No uses otro formato.

sexo: Solo puede ser "H" (hombre) o "M" (mujer). Ningún otro valor.

nombre / apellidoPaterno / apellidoMaterno: En MAYÚSCULAS tal como aparece en el documento.

Estructura esperada:
{
  "nombre":          "nombre(s) de pila en mayúsculas",
  "apellidoPaterno": "primer apellido en mayúsculas",
  "apellidoMaterno": "segundo apellido en mayúsculas",
  "curp":            "18 caracteres exactos, mayúsculas, sin espacios",
  "fechaNacimiento": "DD/MM/AAAA",
  "sexo":            "H o M",
  "numeroLicencia":  "número de folio o licencia",
  "tipoLicencia":    "tipo: A, B, C, D, E, etc.",
  "vigencia":        "DD/MM/AAAA",
  "estado":          "estado emisor de la licencia (nombre completo)"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_RFC = `Analiza esta Constancia de Situación Fiscal del SAT (México).
Devuelve ÚNICAMENTE un objeto JSON válido con los campos que puedas leer con TOTAL certeza.
Si un campo no es legible o no aparece, omítelo completamente del JSON.

════════════════════════════════════════
CAMPO CRÍTICO: rfc
════════════════════════════════════════
El RFC aparece SIEMPRE etiquetado como "RFC:" en la parte superior de la Constancia.
CÓPIALO EXACTAMENTE carácter por carácter tal como está impreso. NUNCA lo construyas ni derives del nombre o fecha.
Sin espacios, guiones ni caracteres especiales.

ESTRUCTURA POSICIÓN A POSICIÓN (persona física = 13 caracteres):

  Pos 1-4  → SOLO LETRAS (A-Z). Iniciales de apellidos y nombre.
             Si OCR lee un dígito aquí → es una letra confundida: 0→O, 1→I, 8→B, 5→S

  Pos 5-10 → SOLO DÍGITOS (0-9). Fecha de nacimiento YYMMDD.
             Mes válido: 01–12. Día válido: 01–31.
             Si OCR lee una letra aquí → es un dígito confundido: O→0, I→1, B→8

  Pos 11-12 → ALFANUMÉRICOS (pueden ser letra A-Z O dígito 0-9). Código de homonimia.
              ⚠ ZONA MÁS PROPENSA A ERRORES. Verifica cada carácter contra el documento:
              Confusiones frecuentes: O↔0   I↔1   B↔8   S↔5   Z↔2   G↔6   Q↔0

  Pos 13   → DÍGITO VERIFICADOR. Solo puede ser: 0 1 2 3 4 5 6 7 8 9 o la letra A.
              Si el carácter no está en ese conjunto, ajusta por similitud visual.

ESTRUCTURA (persona moral = 12 caracteres):
  Pos 1-3 → LETRAS | Pos 4-9 → DÍGITOS (YYMMDD) | Pos 10-11 → ALFANUM | Pos 12 → VERIFICADOR

VALIDACIÓN FINAL: cuenta los caracteres resultado.
  Si persona física → debe ser exactamente 13. Si no, omite el campo.
  Si persona moral  → debe ser exactamente 12. Si no, omite el campo.

════════════════════════════════════════
CAMPO CRÍTICO: curp
════════════════════════════════════════
Copia VERBATIM los 18 caracteres del documento. NO derives ni construyas la CURP.
  Pos 1-4   → LETRAS | Pos 5-10 → DÍGITOS (YYMMDD) | Pos 11 → H o M
  Pos 12-13 → 2 LETRAS (clave estado) | Pos 14-16 → 3 LETRAS | Pos 17 → 1 carácter | Pos 18 → 1 dígito
  ⚠ Mismas confusiones que RFC: O↔0, I↔1, B↔8
  Si no son exactamente 18 caracteres, omite el campo.

════════════════════════════════════════
OTROS CAMPOS
════════════════════════════════════════
cp: Exactamente 5 dígitos del domicilio fiscal. Inclúye el 0 inicial si lo tiene (ej: "06600").

nombre / apellidoPaterno / apellidoMaterno: Solo persona física, en MAYÚSCULAS tal como aparece.

razonSocial: Solo persona moral, en MAYÚSCULAS tal como aparece.

Estructura esperada:
{
  "rfc":             "12 o 13 caracteres exactos sin espacios",
  "nombre":          "nombre(s) de pila en mayúsculas (persona física)",
  "apellidoPaterno": "primer apellido en mayúsculas (persona física)",
  "apellidoMaterno": "segundo apellido en mayúsculas (persona física)",
  "razonSocial":     "razón social completa (persona moral)",
  "curp":            "18 caracteres exactos, mayúsculas, sin espacios",
  "cp":              "exactamente 5 dígitos del domicilio fiscal",
  "estado":          "estado de la república del domicilio fiscal",
  "ciudad":          "municipio o alcaldía del domicilio fiscal",
  "colonia":         "colonia del domicilio fiscal",
  "direccion":       "calle y número del domicilio fiscal"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

const PROMPT_COMPROBANTE = `Analiza este comprobante de pago (transferencia bancaria, cheque, recibo de pago, estado de cuenta o voucher).
Devuelve ÚNICAMENTE un objeto JSON válido con el campo que puedas leer con certeza. Omite los que no sean legibles.

OBJETIVO PRINCIPAL: Encontrar el monto o importe total del pago.

REGLAS ESTRICTAS:

monto: El importe total pagado, SOLO el número sin símbolo de moneda ni comas.
  Ejemplos válidos: "15000", "250000.50", "8500"
  ⚠ Si hay varios importes, toma el TOTAL o el importe más prominente (el principal del comprobante).
  ⚠ Omite si no puedes leerlo con certeza.

fecha: Fecha del pago en formato DD/MM/AAAA. Omite si no aparece.

referencia: Número de referencia, folio, o número de operación. Omite si no aparece claramente.

Estructura esperada:
{
  "monto":      "importe numérico sin símbolo ni comas, ej: 15000.00",
  "fecha":      "DD/MM/AAAA",
  "referencia": "número de operación o folio"
}
Responde SOLO con el JSON. Sin explicaciones, sin markdown, sin bloques de código.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { dataUrl, mimeType, docType } = await req.json() as {
      dataUrl: string;
      mimeType: string;
      docType: "id" | "domicilio" | "licencia" | "rfc" | "comprobante";
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
    const prompt  = docType === "id"          ? PROMPT_ID
                  : docType === "licencia"    ? PROMPT_LIC
                  : docType === "rfc"         ? PROMPT_RFC
                  : docType === "comprobante" ? PROMPT_COMPROBANTE
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

    // Parsear JSON de la respuesta (tolerante a texto extra)
    let campos: Record<string, string> = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Filtrar campos vacíos y convertir a string
        for (const [k, v] of Object.entries(parsed)) {
          if (v && String(v).trim()) campos[k] = String(v).trim();
        }
      }
    } catch { /* devuelve objeto vacío si el JSON falla */ }

    // ── Sanitización post-extracción ──────────────────────────────────────
    // CURP: exactamente 18 caracteres alfanuméricos en mayúsculas, sin espacios
    if (campos.curp) {
      const c = campos.curp.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
      campos.curp = c.length === 18 ? c : "";
      if (!campos.curp) delete campos.curp;
    }
    // RFC: 12 (moral) o 13 (física) caracteres alfanuméricos, sin espacios
    if (campos.rfc) {
      const r = campos.rfc.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9Ñ&]/g, "");
      campos.rfc = (r.length === 12 || r.length === 13) ? r : "";
      if (!campos.rfc) delete campos.rfc;
    }
    // CP: exactamente 5 dígitos
    if (campos.cp) {
      const cp = campos.cp.replace(/\D/g, "");
      campos.cp = cp.length === 5 ? cp : "";
      if (!campos.cp) delete campos.cp;
    }
    // Sexo: solo H o M
    if (campos.sexo && !["H", "M"].includes(campos.sexo.toUpperCase())) {
      delete campos.sexo;
    } else if (campos.sexo) {
      campos.sexo = campos.sexo.toUpperCase();
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