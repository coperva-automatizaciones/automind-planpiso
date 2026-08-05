/* Automind · Módulo de importación de inventario vía CSV */

// Campos destino del inventario con metadatos para UI y auto-detección
const CAMPOS_DESTINO = [
  { key: "vin",           label: "VIN",                    tipo: "text",   req: true,  aliases: ["vin","numero_serie","no_serie","serie","num_serie"] },
  { key: "estatus",       label: "Estatus",                tipo: "select", req: false, aliases: ["estatus","status","tipo_unidad","condicion"] },
  { key: "inv",           label: "INV",                    tipo: "num",    req: false, aliases: ["inv","inventario","no_inventario","num_inventario","numero_inventario"] },
  { key: "descripcion",   label: "Descripción",            tipo: "text",   req: false, aliases: ["descripcion","descripcion_unidad","desc","nombre"] },
  { key: "marca",         label: "Marca",                  tipo: "text",   req: true,  aliases: ["marca","fabricante","brand"] },
  { key: "modelo",        label: "Modelo",                 tipo: "text",   req: true,  aliases: ["modelo","model","version"] },
  { key: "anio",          label: "Año",                    tipo: "num",    req: true,  aliases: ["anio","año","year","modelo_anio","año_modelo"] },
  { key: "tipo",          label: "Tipo",                   tipo: "text",   req: false, aliases: ["tipo","tipo_unidad","clave_tipo"] },
  { key: "colorExterior", label: "Color Exterior",         tipo: "text",   req: false, aliases: ["color_exterior","color_ext","colorexterior","exterior","color"] },
  { key: "colorInterior", label: "Color Interior",         tipo: "text",   req: false, aliases: ["color_interior","color_int","colorinterior","interior"] },
  { key: "fechaFactura",  label: "Fecha Factura",          tipo: "date",   req: false, aliases: ["fecha_factura","fechafactura","fecha_fact","factura_fecha","f_factura"] },
  { key: "fechaLlegada",  label: "Fecha Llegada",          tipo: "date",   req: true,  aliases: ["fecha_llegada","fechallegada","llegada","fecha_entrada","f_llegada","fecha_arribo"] },
  { key: "montoFinanciado",  label: "Monto Financiado",   tipo: "money",  req: true,  aliases: ["monto_financiado","monto","financiado","montofin","capital","importe"] },
  { key: "diasGraciaBase",   label: "Días Gracia Base",   tipo: "num",    req: false, aliases: ["dias_gracia_base","gracia_base","diasgraciabase","gracia"] },
  { key: "diasGraciaExtra",  label: "Días Gracia Extra",  tipo: "num",    req: false, aliases: ["dias_gracia_extra","gracia_extra","diasgraciaextra","gracia_adicional"] },
  { key: "pctInteres",    label: "% Interés Anual",        tipo: "pct",    req: true,  aliases: ["pct_interes","porcentaje_interes","tasa","tasa_anual","interes","pctinteres","tasa_interes"] },
  { key: "observaciones", label: "Observaciones",          tipo: "text",   req: false, aliases: ["observaciones","notas","comentarios","obs","nota"] },
  { key: "danado",        label: "Autodañado",             tipo: "bool",   req: false, aliases: ["autodanado","autodañado","danado","dañado","daño","dano","averia","averiado"] },
];

const CAMPOS_MAP = Object.fromEntries(CAMPOS_DESTINO.map(c => [c.key, c]));

// ── Descarga de plantilla Excel ──────────────────────────────────────────────
function descargarPlantilla() {
  const headers = CAMPOS_DESTINO.map(c => c.req ? c.label + " *" : c.label);
  const ejemplo = {
    "VIN *":              "3VVJP6RM3TM118651",
    "Estatus":            "NUEVOS",
    "INV":                "8099",
    "Descripción":        "SUBURBAN 4X4 2026",
    "Marca *":            "Chevrolet",
    "Modelo *":           "Suburban",
    "Año *":              2026,
    "Tipo":               "SUV",
    "Color Exterior":     "Blanco",
    "Color Interior":     "Negro",
    "Fecha Factura":      "2026-01-15",
    "Fecha Llegada *":    "2026-01-20",
    "Monto Financiado *": 850000,
    "Días Gracia Base":   90,
    "Días Gracia Extra":  0,
    "% Interés Anual *":  18,
    "Observaciones":      "",
    "Autodañado":         "",
  };
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([ejemplo], { header: headers });
  // Ancho de columnas
  ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  XLSX.writeFile(wb, "plantilla_inventario_automind.xlsx");
}

// ── Utilidades ──────────────────────────────────────────────────────────────

function normalize(s) {
  return String(s || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[\s\-\.]/g, "_")
    .trim();
}

function autoMapear(headers) {
  const map = {};
  headers.forEach(h => {
    const n = normalize(h);
    for (const campo of CAMPOS_DESTINO) {
      if (campo.aliases.some(a => a === n || n.includes(a) || a.includes(n))) {
        if (!map[campo.key]) map[campo.key] = h;
        break;
      }
    }
  });
  return map;
}

function parsearCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  // Detectar delimitador
  const delimiters = [",", ";", "\t", "|"];
  const firstLine = lines[0];
  const delim = delimiters.reduce((best, d) =>
    (firstLine.split(d).length > firstLine.split(best).length ? d : best), ",");

  function splitLine(line) {
    const result = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === delim && !inQ) { result.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => {
      const vals = splitLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
  return { headers, rows };
}

function parsearFecha(s) {
  if (!s) return null;
  // dd/mm/yyyy · yyyy-mm-dd · dd-mm-yyyy (si "mes" > 12 se asume mm/dd/yyyy)
  const s1 = String(s).trim();
  // Construye la fecha a mediodía (estable ante husos horarios) y valida
  // que día/mes sean reales (evita rollover silencioso tipo 06/13 → enero)
  const mk = (y, mo, d) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d, 12);
    return (dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
  };
  let m;
  if ((m = s1.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)))
    return +m[2] > 12 ? mk(+m[3], +m[1], +m[2]) : mk(+m[3], +m[2], +m[1]);
  if ((m = s1.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return mk(+m[1], +m[2], +m[3]);
  if ((m = s1.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)))
    return +m[2] > 12 ? mk(+m[3], +m[1], +m[2]) : mk(+m[3], +m[2], +m[1]);
  const d = new Date(s1);
  return isNaN(d) ? null : d;
}

function parsearNumero(s) {
  if (s === "" || s == null) return 0;
  let t = String(s).replace(/[$\s]/g, "");
  // Formato europeo "1.234,56" → coma decimal; si no, quitar comas de miles
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  return parseFloat(t) || 0;
}

function parsearPct(s) {
  const n = parsearNumero(s);
  return n > 1 ? n / 100 : n; // si viene como "14" → 0.14
}

function aplicarMapeo(rows, mapeo) {
  const HOY = new Date();
  const MS_DIA = 86400000;
  const base = (window.AUTOMIND && Array.isArray(window.AUTOMIND.ROWS)) ? window.AUTOMIND.ROWS.length : 0;

  return rows.map((row, i) => {
    const get = (key) => {
      const col = mapeo[key];
      return col ? row[col] : "";
    };

    const fechaLlegada = parsearFecha(get("fechaLlegada")) || HOY;
    const fechaFactura = parsearFecha(get("fechaFactura")) || new Date(fechaLlegada.getTime() - 7 * MS_DIA);
    const monto = parsearNumero(get("montoFinanciado"));
    const tasa  = parsearPct(get("pctInteres")) || 0.14;
    const graciaBase  = parsearNumero(get("diasGraciaBase")) || 30;
    const graciaExtra = parsearNumero(get("diasGraciaExtra")) || 0;
    // Misma fórmula que el motor canónico (app.jsx → enriquecerRows):
    // días en piso desde fecha FACTURA con −1, interés sobre /365.
    // Antes este módulo usaba fechaLlegada y /360, y los montos cambiaban al recargar.
    const diasEnPiso  = Math.max(0, Math.round((HOY - fechaFactura) / MS_DIA) - 1);
    const diasGraciaTotal = graciaBase + graciaExtra;
    const diasLibresRestantes = diasGraciaTotal - diasEnPiso;
    const diasConInteres  = diasLibresRestantes < 0 ? Math.abs(diasLibresRestantes) : 0;
    const interesDiario   = Math.round(monto * tasa / 365 * 100) / 100;
    const interesAcum     = Math.round(diasConInteres * interesDiario * 100) / 100;
    const interesPctMonto = monto ? interesAcum / monto : 0;
    const pctPlanConsumido = diasGraciaTotal > 0
      ? Math.round((diasEnPiso / diasGraciaTotal) * 100)
      : (diasEnPiso > 0 ? 101 : 0);
    let semaforo;
    if      (pctPlanConsumido > 100) semaforo = "intereses";
    else if (pctPlanConsumido > 86)  semaforo = "vencer";
    else if (pctPlanConsumido > 76)  semaforo = "comprometido";
    else if (pctPlanConsumido > 61)  semaforo = "rotacion";
    else                              semaforo = "saludable";

    const fmtFecha = (d) => { if (!d) return ""; const dt = d instanceof Date ? d : new Date(d); return isNaN(dt) ? "" : `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; };
    const marca  = get("marca") || "";
    const modelo = get("modelo") || "";
    const anio   = parsearNumero(get("anio")) || new Date().getFullYear();

    return {
      id: "V" + Date.now() + "_" + i,
      vin: get("vin") || ("IMP" + String(base + i + 1).padStart(5,"0")),
      estatus: get("estatus") || "NUEVOS",
      inv: parsearNumero(get("inv")) || (9000 + base + i),
      descripcion: get("descripcion") || (modelo.toUpperCase()),
      marca,
      modelo,
      anio,
      tipo: get("tipo") || "",
      colorExterior: get("colorExterior") || "",
      colorInterior: get("colorInterior") || "",
      fechaFactura,
      fechaLlegada,
      montoFinanciado: monto,
      diasGraciaBase: graciaBase,
      diasGraciaExtra: graciaExtra,
      pctInteres: tasa,
      observaciones: get("observaciones") || "",
      danado: /da[nñ]ado/i.test(String(get("danado") || "")),
      // computed
      diasEnPiso, diasGraciaTotal, diasConInteres, diasLibresRestantes,
      diasVencidos: diasConInteres, interesDiario, pctPlanConsumido,
      interesAcum, interesPctMonto, semaforo,
      fechaFacturaTxt: fmtFecha(fechaFactura),
      fechaLlegadaTxt: fmtFecha(fechaLlegada),
    };
  });
}

// ── Iconos propios del módulo ────────────────────────────────────────────────
const ImpI = {
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  warn: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
};

// ── Paso 1: Drop zone ────────────────────────────────────────────────────────
function DropZone({ onFile }) {
  const [over, setOver] = React.useState(false);
  const ref = React.useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) readFile(file);
  };
  const readFile = (file) => {
    const isXlsx = file.name.match(/\.xlsx?$/i);
    if (isXlsx) {
      // Leer como ArrayBuffer para SheetJS
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
          onFile(file.name, csv);
        } catch(err) {
          alert("Error leyendo Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => onFile(file.name, e.target.result);
      reader.readAsText(file, "UTF-8");
    }
  };

  return (
    <div
      className={"imp-drop" + (over ? " over" : "")}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => ref.current.click()}
    >
      <input ref={ref} type="file" accept=".csv,.txt,.xlsx,.xls" style={{ display:"none" }} onChange={handleChange} />
      <span className="imp-drop-ico">{ImpI.upload({ width: 36, height: 36 })}</span>
      <p className="imp-drop-title">Haga clic para subir o arrastre y suelte</p>
      <p className="imp-drop-sub">Excel (.xlsx) · CSV (.csv) · delimitado por coma o punto y coma</p>
    </div>
  );
}

// ── Paso 2: Mapeo de columnas ────────────────────────────────────────────────
function PasoMapeo({ headers, mapeo, setMapeo, onNext, onBack, totalRows }) {
  const camposReq = CAMPOS_DESTINO.filter(c => c.req);
  const faltantes = camposReq.filter(c => !mapeo[c.key]);

  const setField = (key, col) => setMapeo(m => ({ ...m, [key]: col || undefined }));

  // columnas ya usadas (para highlight de conflictos)
  const usadas = Object.values(mapeo).filter(Boolean);
  const duplicadas = usadas.filter((v, i) => usadas.indexOf(v) !== i);

  return (
    <div className="imp-step">
      <div className="imp-step-head">
        <h2>Mapear columnas</h2>
        <p className="imp-step-sub">
          Asocia cada campo del inventario con la columna de tu archivo.
          Se detectaron <b>{headers.length} columnas</b> y <b>{totalRows} filas</b>.
        </p>
      </div>

      <div className="imp-mapeo-grid">
        <div className="imp-mapeo-hdr">Campo Automind</div>
        <div className="imp-mapeo-hdr">Columna en tu CSV</div>
        <div className="imp-mapeo-hdr" />

        {CAMPOS_DESTINO.map(campo => {
          const val = mapeo[campo.key] || "";
          const isDup = val && duplicadas.includes(val);
          return (
            <React.Fragment key={campo.key}>
              <div className="imp-campo-label">
                {campo.label}
                {campo.req && <span className="imp-req">*</span>}
              </div>
              <select
                className={"imp-select" + (isDup ? " dup" : "") + (val ? " mapped" : "")}
                value={val}
                onChange={e => setField(campo.key, e.target.value)}
              >
                <option value="">— Sin mapear —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <div className="imp-estado">
                {val && !isDup && <span className="imp-ok">{ImpI.check({ width:14, height:14 })}</span>}
                {isDup && <span className="imp-dup-ico">{ImpI.warn({ width:14, height:14 })}</span>}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {faltantes.length > 0 && (
        <div className="imp-warning">
          {ImpI.warn({ width:16, height:16 })}
          <span>Campos obligatorios sin mapear: <b>{faltantes.map(c=>c.label).join(", ")}</b></span>
        </div>
      )}

      <div className="imp-actions">
        <button className="btn" onClick={onBack}>← Cambiar archivo</button>
        <button
          className="btn primary"
          disabled={faltantes.length > 0}
          onClick={onNext}
        >
          Ver previsualización →
        </button>
      </div>
    </div>
  );
}

// ── Paso 3: Preview ──────────────────────────────────────────────────────────
function PasoPreview({ filas, mapeo, onImport, onBack, importando }) {
  const camposMapeados = CAMPOS_DESTINO.filter(c => mapeo[c.key]);
  const preview = filas.slice(0, 5);

  return (
    <div className="imp-step">
      <div className="imp-step-head">
        <h2>Previsualización</h2>
        <p className="imp-step-sub">
          Mostrando las primeras <b>{preview.length}</b> de <b>{filas.length}</b> filas.
          Verifica que los datos se vean correctos antes de importar.
        </p>
      </div>

      <div className="imp-preview-wrap">
        <table className="imp-table">
          <thead>
            <tr>
              <th>#</th>
              {camposMapeados.map(c => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td className="imp-rownum">{i + 1}</td>
                {camposMapeados.map(c => {
                  const raw = row[mapeo[c.key]] || "";
                  return <td key={c.key} title={raw}>{raw || <span className="imp-empty">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="imp-actions">
        <button className="btn" onClick={onBack} disabled={importando}>← Ajustar mapeo</button>
        <button className="btn primary" onClick={onImport} disabled={importando}>
          {importando ? "Importando…" : `Importar ${filas.length} unidades`}
        </button>
      </div>
    </div>
  );
}

// ── Paso 4: Éxito ────────────────────────────────────────────────────────────
function PasoExito({ count, onNuevo, onIrInventario }) {
  return (
    <div className="imp-step imp-exito">
      <span className="imp-exito-ico">{ImpI.check({ width:36, height:36 })}</span>
      <h2>{count} unidades importadas</h2>
      <p>Se agregaron correctamente al inventario del plan piso.</p>
      <div className="imp-actions">
        <button className="btn" onClick={onNuevo}>Importar otro archivo</button>
        <button className="btn primary" onClick={onIrInventario}>Ver inventario →</button>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
function ImportarInventario({ onIrInventario, onImportDone }) {
  const [paso, setPaso]       = React.useState(1);  // 1=upload 2=mapeo 3=preview 4=exito
  const [archivo, setArchivo] = React.useState(null);
  const [headers, setHeaders] = React.useState([]);
  const [rows, setRows]       = React.useState([]);
  const [mapeo, setMapeo]     = React.useState({});
  const [importando, setImportando] = React.useState(false);
  const [countImportado, setCount]  = React.useState(0);

  const handleFile = (nombre, texto) => {
    const { headers: hs, rows: rs } = parsearCSV(texto);
    if (!hs.length) return alert("No se pudo leer el archivo. Verifica que sea un CSV válido.");
    setArchivo(nombre);
    setHeaders(hs);
    setRows(rs);
    setMapeo(autoMapear(hs));
    setPaso(2);
  };

  const handleImport = () => {
    setImportando(true);
    setTimeout(async () => {
      try {
        const A = window.AUTOMIND;
        if (!A) throw new Error("La sesión aún no está lista. Recarga la página e intenta de nuevo.");

        let nuevas = aplicarMapeo(rows, mapeo);

        // Detectar VINs que ya existen en el inventario para no duplicar unidades
        const vinsExistentes = new Set(
          (A.ROWS || []).map(r => String(r.vin || "").trim().toUpperCase()).filter(Boolean)
        );
        const esDup = v => v.vin && vinsExistentes.has(String(v.vin).trim().toUpperCase());
        const dups = nuevas.filter(esDup);
        if (dups.length > 0) {
          const seguir = confirm(
            `${dups.length} fila(s) tienen un VIN que ya existe en el inventario y se omitirán.\n` +
            `¿Continuar con las ${nuevas.length - dups.length} restantes?`
          );
          if (!seguir) return;
          nuevas = nuevas.filter(v => !esDup(v));
          if (!nuevas.length) { alert("No hay unidades nuevas que importar."); return; }
        }

        // Auto-asignar todos los vendedores a las unidades importadas para que lleguen las alertas
        const todosVendedores = (A.USUARIOS || [])
          .filter(function(u) { return u.rol === "vendedor"; })
          .map(function(u) { return u.id; });
        if (todosVendedores.length > 0) {
          nuevas.forEach(function(v) {
            if (!v.vendedorIds || !v.vendedorIds.length) {
              v.vendedorIds = todosVendedores;
              v.vendedorId  = todosVendedores[0] || null;
            }
          });
        }

        // Guardar PRIMERO en Supabase; solo agregar al inventario lo que sí se guardó
        let guardadas = nuevas;
        if (window.DB && A.agencyId) {
          const resultados = await Promise.allSettled(
            nuevas.map(v => window.DB.saveVehicle(A.agencyId, v, { skipAlert: true }))
          );
          guardadas = nuevas.filter((_, i) => resultados[i].status === "fulfilled");
          const errores = resultados.filter(r => r.status === "rejected");
          if (errores.length > 0) {
            const msg = errores[0].reason?.message || JSON.stringify(errores[0].reason);
            alert(`⚠️ ${errores.length} registro(s) no se pudieron guardar en Supabase.\n\nError: ${msg}\n\nWorkspace ID: ${A.agencyId}`);
          }
          if (!guardadas.length) return; // nada se guardó — permanecer en preview
        }
        A.ROWS.push(...guardadas);
        // (los KPIs se recalculan automáticamente en App en cada render)
        onImportDone && onImportDone();
        setCount(guardadas.length);
        setPaso(4);
      } catch(e) {
        alert("Error al importar: " + e.message);
      } finally {
        setImportando(false);
      }
    }, 600);
  };

  const reset = () => {
    setPaso(1); setArchivo(null); setHeaders([]); setRows([]); setMapeo({});
  };

  return (
    <div className="page db-page">
      <div className="page-head tight">
        <h1>Importar inventario</h1>
        <p className="page-sub">
          Carga tu archivo CSV, asocia las columnas con los campos del plan piso y confirma.
          Los campos calculados (días en piso, interés, semáforo) se generan automáticamente.
        </p>
      </div>

      {/* Stepper */}
      {paso < 4 && (
        <div className="imp-stepper">
          {["Subir archivo", "Mapear columnas", "Previsualizar"].map((s, i) => {
            const n = i + 1;
            const state = n < paso ? "done" : n === paso ? "active" : "pending";
            return (
              <React.Fragment key={n}>
                <div className={"imp-step-item " + state}>
                  <span className="imp-step-num">{state === "done" ? ImpI.check({ width:14, height:14 }) : n}</span>
                  <span className="imp-step-lbl">{s}</span>
                </div>
                {i < 2 && <div className={"imp-step-line " + (n < paso ? "done" : "")} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="card">
        {paso === 1 && (
          <div className="imp-step">
            <div className="imp-step-head" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16 }}>
              <div>
                <h2>Subir archivo</h2>
                <p className="imp-step-sub">
                  Asegúrate de que el archivo tenga encabezados en la primera fila.
                  Formatos soportados: CSV con delimitador coma, punto y coma o tabulación.
                </p>
              </div>
              <button
                onClick={descargarPlantilla}
                style={{
                  flexShrink: 0,
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "9px 16px", borderRadius: 8, border: "1.5px solid var(--accent)",
                  background: "transparent", color: "var(--accent)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17h14M10 3v10M6 9l4 4 4-4"/>
                </svg>
                Descargar plantilla
              </button>
            </div>
            <DropZone onFile={handleFile} />

            {/* Leyenda de campos */}
            <div style={{ marginTop: 24, padding: "18px 20px", background: "var(--surface, #f4f6fb)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
                Campos reconocidos — <span style={{ color: "var(--accent)" }}>azul = obligatorio</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
                {CAMPOS_DESTINO.map(c => (
                  <span key={c.key} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: c.req ? "var(--accent-light, #e8f0fd)" : "#fff",
                    color: c.req ? "var(--accent)" : "var(--ink)",
                    border: "1px solid " + (c.req ? "var(--accent)" : "var(--border, #e5e7eb)"),
                  }}>
                    {c.req && <span style={{ fontWeight: 800 }}>*</span>}
                    {c.label}
                    <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>
                      {c.tipo === "date" ? "fecha" : c.tipo === "money" ? "$" : c.tipo === "pct" ? "%" : c.tipo === "num" ? "num" : "texto"}
                    </span>
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
                Los encabezados de tu archivo no necesitan coincidir exactamente — el sistema detecta automáticamente columnas similares.
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <PasoMapeo
            headers={headers}
            mapeo={mapeo}
            setMapeo={setMapeo}
            totalRows={rows.length}
            onNext={() => setPaso(3)}
            onBack={reset}
          />
        )}

        {paso === 3 && (
          <PasoPreview
            filas={rows}
            mapeo={mapeo}
            onImport={handleImport}
            onBack={() => setPaso(2)}
            importando={importando}
          />
        )}

        {paso === 4 && (
          <PasoExito
            count={countImportado}
            onNuevo={reset}
            onIrInventario={onIrInventario}
          />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ImportarInventario });
