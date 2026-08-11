# Hallazgos observados en la app en ejecución

**Fecha:** 2026-08-09 · **Entorno:** local (`npx supabase start` + `tools/dev-server.mjs`),
seed de seis cuentas · **Método:** recorrido con Playwright de las cinco identidades sobre el
workspace *Sucursal Centro*.

Todo lo de aquí está **reproducido en la app**, no deducido leyendo código. Cada hallazgo trae
la forma de reproducirlo, la evidencia y la línea que lo causa. Los documentos `01`–`07`
describen el sistema; éste registra lo que se rompe al usarlo.

> El informe de estado funcional ([`07-ESTADO-FUNCIONAL.html`](07-ESTADO-FUNCIONAL.html)) es
> descriptivo por decisión: enuncia estos puntos en su §04 sin diagnosticarlos. El diagnóstico
> es esto.

---

## H-1 · La misma unidad cambia de 🟢 a ⚫ al recargar la página

**Severidad: alta.** Afecta al número que la agencia usa para decidir.

### Reproducción

1. Entrar como `director@local.test`.
2. Mirar el KPI **Críticas** y la unidad **INV 9007** (NIVUS HIGHLINE).
3. Pulsar **F5** sin tocar nada más.

| | Tras iniciar sesión | Tras recargar |
|---|---|---|
| INV 9007 · `semaforo` | `saludable` 🟢 | `intereses` ⚫ |
| INV 9007 · `pctPlanConsumido` | `0` | `101` |
| KPI **Críticas** | **3** (33 %) | **4** (44 %) |
| KPI interés | «2 unidades generando interés» | «3 unidades» |

Las dos pantallas son idénticas salvo esos números.

El mismo corte aparece entre identidades, porque cada una entra por un pipeline distinto:
director, gerente y vendedor hacen login directo y ven 🟢; el agency owner y el super admin
entran por el selector de workspaces y ven ⚫.

### Causa

Dos implementaciones del semáforo que no coinciden cuando la unidad **no tiene días de gracia
configurados** (`diasGraciaTotal = 0`):

- [`app.jsx:284-285`](../app.jsx#L284) — canónica, con el caso contemplado a propósito:
  `diasEnPiso > 0 ? 101 : 0` → **⚫ intereses**
- [`login.jsx:307`](../login.jsx#L307) — `diasGraciaTotal > 0 ? … : 0` → **🟢 saludable**

`LoginScreen` construye `window.AUTOMIND` por su cuenta; al recargar, la app rehace el cálculo
por el camino canónico de `app.jsx` y el color cambia.

### Lo que hace grave al caso

INV 9007 lleva **15 días vencidos** y **$2 571.75 de interés acumulado** — y la app lo muestra en
la misma tarjeta de campos calculados donde la clasifica como «Margen saludable», con «% Plan
consumido: 0 %».

Y el dashboard suma ese interés en la fila «En intereses» ($5 482 = 2 767 + 144 + **2 572**)
mientras cuenta solo 2 unidades: el dinero entra en el total, la unidad no.

---

## H-2 · Un vendedor abre las cifras financieras con ALT+2

**Severidad: alta.** Rompe la regla de negocio central del producto.

### Reproducción

1. Entrar como `vendedor1@local.test`.
2. Pulsar **ALT+2**.

Se abre «Ver datos» — la vista que su menú no ofrece — con las columnas **Monto financiado,
Tasa anual, Interés diario e Interés acum.** en pantalla, formateadas y ordenadas.

### Causa

El ocultamiento es solo la entrada del menú, [`components.jsx:182`](../components.jsx#L182):

```jsx
{usuarioActual?.rol !== "vendedor" && ( … <span className="bm-txt">Ver datos</span> … )}
```

El atajo que lleva a la misma vista no comprueba el rol,
[`app.jsx:618`](../app.jsx#L618):

```jsx
else if (e.key === "2") { e.preventDefault(); setView("database"); }
```

Tampoco lo comprueba `handleMenu("datos")` en [`app.jsx:609`](../app.jsx#L609).

### Matiz respecto a lo ya documentado

`CLAUDE.md` dice que el ocultamiento es visual y que los datos «sí llegan a su navegador». Es
más que eso: **existe una vista construida que los muestra formateados y ordenados**, alcanzable
con dos teclas. No hace falta abrir las herramientas de desarrollo.

Fuera de ese atajo, el recorte al vendedor está bien hecho: el editor de inventario le esconde
el bloque *Plan Piso* y los campos calculados enteros, el dashboard le quita el KPI de interés y
la columna «Interés acum.», y solo ve sus 7 unidades de las 10.

---

## H-3 · «% Plan» se muestra multiplicado por 100

**Severidad: media.** Cifra visiblemente absurda, sin consecuencia de cálculo.

En «Ver datos», una unidad al 37 % del plan aparece como **3700.0 %**. Lo mismo con el resto:
70 % se muestra como 7000 %, y 137 % como 13700 %.

### Causa

La columna se declara con formato de porcentaje en
[`login.jsx:564`](../login.jsx#L564) (`fmt:"pct"`), y el formateador
[`components.jsx:6`](../components.jsx#L6) multiplica por 100:

```js
const fmtPct = (v, dec = 1) => (v * 100).toFixed(dec) + "%";
```

Pero `pctPlanConsumido` **ya viene en escala 0–100**. La columna vecina `pctInteres` sí es una
fracción (0.14), y con el mismo formateador sale bien (14.00 %). Un formateador, dos escalas.

---

## H-4 · El importador masivo está abierto al vendedor

**Severidad: media.** Un vendedor puede reescribir el inventario de la agencia.

«Importar inventario» aparece en el menú del vendedor y **funciona**: el asistente de tres pasos
carga, mapea y confirma, con **monto financiado y tasa anual** entre los campos mapeables — los
mismos datos que el resto de la interfaz le oculta.

### Causa

La entrada del menú se pinta sin condición de rol,
[`components.jsx:215`](../components.jsx#L215):

```jsx
<Item id="importar" icon={I.upload({ width: 17, height: 17 })} label="Importar inventario" />
```

Compárese con «Ver datos», que sí lleva su guarda de rol trece líneas más arriba.

---

## H-5 · El estado ⚫ se le oculta al vendedor solo en el drawer

**Severidad: baja.** Inconsistencia de interfaz, no fuga de datos.

La regla documentada dice que el vendedor ve ⚫ como 🔴. Se cumple **únicamente** en el drawer
del vehículo, [`app.jsx:29`](../app.jsx#L29):

```jsx
const semDrawer = (esVend && v.semaforo === "intereses") ? "vencer" : v.semaforo;
```

En el dashboard, la lista detallada agrupa sus unidades bajo el encabezado literal **«En
intereses»**. Con el drawer abierto las dos versiones conviven en la misma pantalla: detrás, la
fila dice «En intereses · 103 % · −1 día»; delante, el drawer dice «Próximo a vencer» y «Días
libres restantes: —».

---

## H-6 · Dos vistas cuentan las unidades por vendedor de forma distinta

**Severidad: baja.**

Para el mismo workspace y el mismo día:

| Vista | Vanesa | Víctor |
|---|---|---|
| Dashboard · «Carga por vendedor» | 6 | 5 |
| Equipo · directorio | 7 | 3 |

Once asignaciones contra diez unidades: hay unidades con dos vendedores asignados (INV 9004 y
9010 muestran «+1»), y cada vista las reparte con un criterio propio. Ninguna de las dos es
obviamente la correcta — hay que decidir qué significa «unidades de un vendedor» cuando la
unidad es compartida.

---

## Cerrado, no es un hallazgo

**La vista «Usuarios» no existe.** [`usuarios.jsx`](../usuarios.jsx) define
`RegistroUsuarios()` devolviendo `null`, y ese símbolo **no se referencia desde ningún otro
archivo** — no hay entrada de menú, ruta ni atajo que lo monte. El archivo se carga en cada
arranque y no puede pintar nada. `CLAUDE.md` y
[`02-MVP-FEATURES.md:254`](02-MVP-FEATURES.md) ya lo describían así; queda confirmado en
ejecución.

---

## Sin diferencia observable entre director y gerente

Recorridos por separado, `director@` y `gerente@` obtienen exactamente lo mismo: las mismas 7
entradas de menú, las mismas 10 unidades, los mismos 4 usuarios y las mismas cifras. La
distinción entre ambos roles existe en el modelo de datos y en la validación de pagos del CRM,
pero **no en lo que el sistema deja ver o hacer** en el resto de la aplicación.
