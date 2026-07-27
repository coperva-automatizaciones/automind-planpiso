---
name: Automind · Plan Piso
description: Tablero financiero de inventario en piso para agencias automotrices, gobernado por un semáforo de riesgo.
colors:
  accent: "#3b82f6"
  sidebar: "#0f172a"
  nav-active: "#1e3a8a"
  purple: "#7c3aed"
  ink: "#161b2e"
  ink-2: "#3c4257"
  muted: "#64748b"
  bg: "#f5f7fa"
  card: "#ffffff"
  line: "#e6e9f1"
  line-2: "#eef1f6"
  sem-saludable: "#1f9d57"
  sem-saludable-bg: "#e7f5ed"
  sem-saludable-ink: "#0f7a40"
  sem-rotacion: "#d99613"
  sem-rotacion-bg: "#fbf2da"
  sem-rotacion-ink: "#9a6a06"
  sem-comprometido: "#e07a20"
  sem-comprometido-bg: "#fdf0e6"
  sem-comprometido-ink: "#9a4e06"
  sem-vencer: "#e0492f"
  sem-vencer-bg: "#fcebe7"
  sem-vencer-ink: "#bb3018"
  sem-intereses: "#2d3142"
  sem-intereses-bg: "#eaebef"
  sem-intereses-ink: "#1a1f2e"
typography:
  display:
    fontFamily: "Segoe UI Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Segoe UI Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  metric:
    fontFamily: "Segoe UI Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Segoe UI Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Segoe UI Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Cascadia Code, SF Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "13.5px"
rounded:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  pill: "20px"
  # Valores adicionales realmente usados en la app. La escala es algo floja
  # (6/7/8/9/10/11/12 conviven); candidata a tensar vía /impeccable layout.
  control-xs: "6px"
  control-sm: "7px"
  control-md: "9px"
  control-lg: "11px"
  panel: "12px"
spacing:
  gap: "18px"
  pad: "32px"
  gap-compact: "13px"
  pad-compact: "22px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "12px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "12px"
  button-danger:
    backgroundColor: "{colors.sem-vencer}"
    textColor: "{colors.card}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "22px 24px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "40px"
  pill:
    rounded: "{rounded.pill}"
    padding: "5px 12px"
---

# Design System: Automind · Plan Piso

## 1. Overview

**Creative North Star: "La Mesa de Control"**

Automind es una mesa de control financiera: la superficie de un operador que vigila dinero en movimiento. En reposo es tranquila, ordenada y casi monocromática —fondo azul-gris frío (`#f3f5fb`), tarjetas blancas, tinta azul-marino— para que la atención no se gaste en decoración. El color saturado entra solo cuando *significa* algo: el semáforo de riesgo y el azul de acción. Densidad sí, pero con respiro; cada cifra es legible a la primera y el usuario puede rastrear de dónde sale.

El sistema sirve al estado de riesgo, no al revés. Lo crítico (una unidad "en intereses" o "por vencer") debe saltar; lo saludable se mantiene secundario y silencioso. La sensación de calidad viene de la ejecución —espaciado consistente, radios suaves de 14px, foco azul nítido, elevación que aparece solo al interactuar— no de efectos llamativos.

Rechaza explícitamente el "SaaS genérico AI slop": nada de gradientes morados decorativos, tarjetas idénticas repetidas, plantilla de hero con número gigante, ni eyebrows en mayúsculas sobre cada sección por reflejo. Y rechaza igual el extremo legacy: nada de tablas grises densas con bordes duros estilo ERP de los 2000.

**Key Characteristics:**
- Lienzo frío y neutro; el color es señal, no adorno.
- El semáforo de 5 estados es el órgano central del sistema visual.
- Plano en reposo; la elevación es una respuesta a la interacción.
- Tipografía de sistema (Segoe UI Variable) + mono para fórmulas; premium por precisión.
- Densidad ajustable (cómodo / compacto) sin sacrificar legibilidad.

## 2. Colors

Una base neutra fría con un único azul de acción, y una paleta de semáforo de cinco peldaños que es el verdadero lenguaje cromático del producto.

### Primary
- **Azul Acción** (`#2f6fed`): el único acento de marca. Botones primarios, estado activo de navegación, foco de inputs, íconos de KPI, fila seleccionada. Señala "interactúa aquí" o "esto está seleccionado". Su tinte al 8–16% sobre blanco crea los fondos suaves de estados activos.

### Secondary
- **Marino Sidebar** (`#1b2a57`): exclusivo del chasis de navegación (sidebar con gradiente sutil). Ancla la app y da el aire premium-serio; nunca se usa como acento de contenido.

### Tertiary — La Paleta Semáforo
El sistema de significado. Cada estado tiene un color sólido (`sol`), usado en punto/barra/anillo, más un fondo y texto tintados para las píldoras.
- **Saludable** (`#1f9d57`, verde): dentro del plan de gracia. Tranquilo, secundario.
- **Rotación media** (`#d99613`, ámbar): sin urgencia inmediata.
- **Comprometido** (`#e07a20`, naranja): margen en vigilancia.
- **Próximo a vencer** (`#e0492f`, rojo): acción pronto. También es el color de peligro/borrado del sistema.
- **En intereses** (`#2d3142`, negro-azulado): crítico, ya cuesta dinero. El más oscuro y grave a propósito.

### Neutral
- **Tinta** (`#161b2e`): títulos, cifras, texto de máximo énfasis.
- **Tinta-2** (`#3c4257`): cuerpo de texto y etiquetas secundarias.
- **Apagado** (`#6b7488`): metadatos, sublabels, encabezados de tabla.
- **Fondo** (`#f3f5fb`): lienzo de la app, azul-gris frío.
- **Tarjeta** (`#ffffff`): superficies elevadas.
- **Línea** (`#e6e9f1`): bordes y divisores de 1px.

### Named Rules
**La Regla del Color con Significado.** El color saturado solo aparece cuando comunica estado: semáforo (riesgo) o azul (acción/selección). Prohibido el color decorativo. Si un color no significa nada, va en la escala neutra.

**La Regla del Marino Cautivo.** `#1b2a57` vive solo en la navegación. Nunca como fondo de contenido ni como acento de un dato.

## 3. Typography

**Display / UI Font:** Segoe UI Variable (con Segoe UI, system-ui, sans-serif)
**Mono Font:** Cascadia Code (con SF Mono, ui-monospace, Consolas, monospace)

**Character:** Una sola familia de sistema en múltiples pesos, sin segunda fuente decorativa: rápida, nativa, sin coste de carga (encaja con el stack sin build). El mono es funcional, reservado para las fórmulas y VIN/código, donde la alineación de caracteres importa y refuerza la transparencia del cálculo.

### Hierarchy
- **Display** (800, 34px, line-height 1.1, tracking -0.02em): títulos de página (`h1`). Único nivel "grande"; el techo es 34px, sin heroics.
- **Metric** (700, 21px, tracking -0.01em): cifras de KPI; el dato como protagonista.
- **Title** (700, 17px, tracking -0.01em): encabezados de tarjeta y sección.
- **Body** (400, 15px, line-height 1.6): texto descriptivo y subtítulos de página. Usa `text-wrap: pretty`.
- **Label** (700, 12px, tracking 0.06em, MAYÚSCULAS): etiquetas de bloque, encabezados de columna, labels de menú.

### Named Rules
**La Regla del Label Funcional.** El micro-label en mayúsculas con tracking existe para encabezar **columnas de datos, menús y bloques de formulario** — donde rotula contenido real. Prohibido usarlo como "eyebrow" decorativo encima de cada sección por reflejo de SaaS.

**La Regla del Mono para Verdad.** Fórmulas, VIN y valores calculados van en Cascadia Code. El mono es la voz de "esto es exacto y verificable".

## 4. Elevation

El sistema es **plano en reposo**: las superficies se separan con bordes de 1px (`#e6e9f1`) y por contraste de fondo (`#f3f5fb`) vs. tarjeta (`#ffffff`), no con sombra ambiental. La sombra es un evento de interacción, no una decoración permanente.

### Shadow Vocabulary
- **Levantar al hover** (`box-shadow: 0 12px 26px -16px rgba(20,30,60,.45)` + `translateY(-2px)`): tarjetas interactivas (KPI, semáforo) al pasar el cursor.
- **Anillo de selección** (`box-shadow: 0 0 0 2px var(--sol)` o `0 0 0 2px var(--accent)`): estado activo/seleccionado. El color es el del semáforo o el azul de acción.
- **Flotante de popover** (`box-shadow: 0 18px 44px -16px rgba(10,16,40,.55)`): menús, drawers y paneles que escapan del flujo.

### Named Rules
**La Regla del Plano por Defecto.** Las superficies son planas en reposo. La sombra aparece solo como respuesta a un estado (hover, selección, foco). Una tarjeta con sombra permanente está mal.

## 5. Components

### Buttons
- **Shape:** esquinas suaves de 10px (`--rounded-md`); danger y small bajan a 9px.
- **Primary:** fondo Azul Acción (`#2f6fed`), texto blanco, sin borde, padding 12px. Hover: `color-mix(accent 88%, #000)` (oscurece, no cambia de tono).
- **Secondary:** fondo blanco, texto Tinta-2 (`#3c4257`), borde 1px Línea. Hover: fondo `#f3f5fb`.
- **Danger:** fondo `#e0492f`, texto blanco, peso 700. Hover `#c73a22`.
- **Tinted action** (`btn-asignar`): fondo y borde tintados de azul (`color-mix(accent 10–25%, #fff)`), texto azul. Para acciones suaves y contextuales.

### Pills (semáforo badge — componente firma)
- **Style:** inline-flex, totalmente redondeada (20px), padding 5px 12px, peso 700, con un punto de color de 9px. Fondo y texto tintados del estado (p. ej. saludable: fondo `#e7f5ed`, texto `#0f7a40`).
- **Rol:** comunicar el estado del semáforo en cualquier fila, drawer o tarjeta. Siempre lleva etiqueta de texto junto al color: nunca depende solo del color.

### Cards / Containers
- **Corner:** 14px (`--rounded-lg`, `--radius`).
- **Background:** blanco (`#ffffff`) sobre lienzo `#f3f5fb`.
- **Shadow:** ninguna en reposo (ver Elevation); levantan al hover si son interactivas.
- **Border:** 1px `#e6e9f1`.
- **Padding interno:** 22–24px (cómodo) / reducido en densidad compacta.
- **Regla:** prohibido anidar tarjetas. Una superficie, un nivel.

### Inputs / Fields
- **Style:** altura 40–44px, borde 1.5px Línea, radio 9–10px, fondo blanco.
- **Focus:** sin `outline`; el borde cambia a Azul Acción (`#2f6fed`). Único y consistente en toda la app.
- **Disabled:** fondo `#f8f9fc`/`--line-2`, texto apagado.
- **Estado semántico** (mapeo de import): borde verde tintado para "mapeado", ámbar para "duplicado".

### Navigation (sidebar)
- **Style:** chasis marino (`#1b2a57`) con gradiente vertical sutil, ancho 252px.
- **Items:** texto `#c4cce0`, peso 600, radio 9px. Hijos en `#9fa9c6`.
- **Active:** fondo azul de acción, texto blanco, con sombra azul tenue.
- **Mobile:** colapsable (drawer).

### Signature: Semáforo Hero & Drawer de Vehículo
La tarjeta `sem-hero` y el drawer de detalle son el corazón del producto: barra de progreso del plan (`--sol`), anillo de selección de color del estado, y el desglose de fórmulas en mono que hace auditable cada número. Preservar esta transparencia es un principio de producto, no solo estético.

## 6. Do's and Don'ts

### Do:
- **Do** usar el color saturado solo para significar: semáforo (riesgo) o Azul Acción (`#2f6fed`, interacción/selección).
- **Do** mantener las superficies planas en reposo; la sombra es respuesta a hover/selección/foco.
- **Do** acompañar SIEMPRE el color del semáforo con etiqueta de texto y/o ícono (no depender solo del color).
- **Do** poner fórmulas, VIN y valores calculados en mono (Cascadia Code); es la voz de "exacto y verificable".
- **Do** respetar el toggle de densidad (cómodo/compacto) variando padding/gap, nunca achicando tipografía ilegiblemente.
- **Do** usar foco azul en el borde (sin outline) en todos los inputs, de forma consistente.

### Don't:
- **Don't** caer en el "SaaS genérico AI slop": sin gradientes morados decorativos, sin tarjetas idénticas repetidas en grid, sin plantilla de hero-número-gigante.
- **Don't** poner labels en MAYÚSCULAS con tracking como "eyebrow" sobre cada sección por reflejo; el micro-label es para rotular columnas/menús/bloques reales.
- **Don't** volver al look de Excel/ERP legacy: tablas grises densas con bordes duros por todos lados.
- **Don't** anidar tarjetas, ni añadir sombra ambiental permanente a una superficie en reposo.
- **Don't** usar `#1b2a57` (marino) fuera de la navegación, ni introducir un segundo acento de marca que compita con el azul.
- **Don't** dejar texto de cuerpo en gris claro de bajo contraste sobre el fondo tintado; mantener legibilidad financiera (apuntar a AA).
- **Don't** superar 34px en títulos ni usar tracking más cerrado de -0.02em.
