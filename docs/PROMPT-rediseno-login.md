# Prompt — rediseño del flujo de acceso (Automind Plan Piso)

Rediseña el flujo de acceso de **Automind Plan Piso**, una aplicación web de gestión de
inventario financiado para agencias automotrices en México. Entrégame las pantallas en alta
fidelidad, en español, listas para implementar en React + TypeScript.

## Qué hace el producto (para que el tono sea el correcto)

Una agencia automotriz no compra los autos de su piso de exhibición: los **financia** con un
banco. El banco da unos días de gracia sin intereses y, pasados esos días, **cada unidad parada
cuesta dinero todos los días**. La aplicación traduce eso en un **semáforo de cinco estados** y
avisa al vendedor, a su gerente y a su director cuando una unidad cambia de estado.

Quien entra a esta pantalla es un director, un gerente o un vendedor de piso, muchas veces desde
el celular, de pie junto a un auto. No es una herramienta de consumo: es una herramienta de
trabajo con dinero real detrás.

## Personalidad de marca

El producto debe sentirse como **Apple + Linear + Palantir + Stripe**: muy limpio, enterprise,
premium, con mucho espacio negativo, información jerarquizada, pocas gráficas y prioridad a
insights y decisiones.

Regla rectora del sistema de diseño: **el color saturado solo aparece cuando significa algo.**
Superficies planas y en reposo; elevación mínima; nada de gradientes decorativos, glassmorphism,
blobs, ni ilustraciones genéricas. La anti-referencia explícita es el "SaaS genérico AI slop".

## Paleta

| Token | Hex | Uso |
|---|---|---|
| Automind Navy | `#071326` | Fondo del panel de marca, texto de máximo peso |
| Deep Blue | `#123A72` | Azul estructural, estados hover profundos |
| Automind Cyan | `#00D4D8` | **Color de acción** — el botón primario, el foco |
| Electric Cyan | `#4EF3F7` | Acento sobre fondo oscuro, brillo del logotipo |
| Light Gray | `#F5F7FA` | Fondo de superficie clara |
| Text Gray | `#667085` | Texto secundario, etiquetas, ayuda |

Adjunto el logotipo: una marca geométrica en cian, un grafo de nodos conectados del que emergen
dos siluetas de techo superpuestas. Úsalo tal cual; no lo redibujes.

**Atención al contraste:** el cian `#00D4D8` sobre blanco no alcanza AA para texto. Si lo usas
como fondo de botón, el texto encima va en Navy, no en blanco. Verifica cada par.

**No inventes colores de alerta.** El semáforo del producto (verde saludable, amarillo rotación,
naranja comprometido, rojo por vencer, negro intereses) mide riesgo financiero de una unidad y
**no debe aparecer en estas pantallas**. Los errores de formulario necesitan su propio rojo, uno
que no se confunda con el rojo "por vencer".

## La estructura ya está decidida

Layout partido. **Panel izquierdo oscuro (Navy) con el logotipo y su bajada, centrados vertical y
horizontalmente. Nada más.** Sin titular, sin lista de módulos, sin puntos decorativos, sin pie
de página. Es una firma, no un argumento.

Esto no está a discusión: **este producto es de nicho y de uso interno.** Quien ve esta pantalla
ya trabaja en la agencia, entró por invitación de su director y la va a ver dos veces al día
durante años. No hay nadie a quién convencer. Todo copy de venta — titulares de propuesta de
valor, listas de capacidades, promesas de producto — está **prohibido** en estas pantallas.

El copy que sí importa es el de interfaz, y son cuatro cadenas: el título del formulario, el
mensaje de error, el enlace de recuperación, y qué hacer cuando no puedes entrar. Cada una vale
más que cualquier titular. Trabájalas con ese peso.

Dos reglas que se derivan:

- **No prometas módulos.** Hoy el producto es plan piso. Los demás dominios existen en el plan,
  no en el software, y algunos son de 2027. Esta pantalla se ve en demostraciones ante
  distribuidoras: lo que prometa aquí hay que desmentirlo cinco minutos después.
- **Las explicaciones van junto al fallo, no junto al éxito.** "El acceso es por invitación" no
  le sirve a quien ya tiene cuenta; le sirve a quien no puede entrar. Ponla ahí, y redáctala para
  que también sea cierta para un director o para el dueño de la agencia, no solo para un vendedor.

## Pantallas a diseñar

**1 · Iniciar sesión.** Campos: correo electrónico y contraseña con mostrar/ocultar. Botón
primario "Entrar". Enlace secundario "¿Olvidaste tu contraseña?". Estados: reposo, foco, cargando
("Verificando…" con spinner), error de credenciales (mensaje en línea con icono).

**2 · Activar cuenta.** *No hay registro público: al producto se entra por invitación.* Un
director invita por correo y el invitado llega aquí desde el enlace. Muestra el correo de la
invitación (no editable) y pide nombre completo, contraseña
(mínimo 8 caracteres, con mostrar/ocultar) y confirmación. El botón queda deshabilitado hasta que
todo valida. Diseña la **retroalimentación de fuerza y requisitos de contraseña** — hoy no
existe y hace falta.

**3 · Cuenta activada.** Confirmación de éxito y un botón para ir al inicio de sesión.

**4 · Recuperar contraseña.** Hoy es solo un banner verde debajo del formulario que dice "correo
enviado". Necesita tratamiento propio: (a) el estado de "revisa tu correo", con qué hacer si no
llega, y (b) la pantalla de **definir contraseña nueva** a la que se llega desde ese correo.

**5 · Estados de borde que hoy no existen y quiero ver diseñados:**
- Enlace de invitación caducado o ya usado.
- Enlace de recuperación caducado.
- Cuenta sin acceso asignado todavía — hay un caso real donde el usuario se autentica pero aún no
  tiene espacio de trabajo asignado, y hoy eso deja una pantalla en blanco.
- Fallo de red o de servidor al enviar el formulario.

**6 · Selección de espacio de trabajo.** Un dueño de agencia con varias sucursales elige a cuál
entra justo después de autenticarse. Es parte del flujo de acceso aunque venga después del login.

## Correcciones al borrador anterior

Un borrador previo resolvió bien la composición y el logotipo respira. Estos seis puntos hay que
corregirlos:

1. **El botón cian llevaba texto blanco** — contraste ~1.9:1, falla AA de calle. El texto sobre
   `#00D4D8` va en Navy.
2. **El formulario medía ~620 px de ancho.** Un campo de correo así de ancho se lee flácido.
   Tópalo entre 360 y 400 px.
3. **El "Mostrar" de la contraseña era un chip gris relleno** dentro del campo y parecía un
   segundo control. Texto plano, sin fondo. (Texto en vez de icono de ojo está bien: se lee mejor
   y es más accesible.)
4. **Había una regla horizontal bajo "¿Olvidaste tu contraseña?"** que parecía un subrayado
   suelto. O es un divisor y va arriba del enlace, o sobra.
5. **El pie iba en monoespaciada.** En este sistema la mono es para cifras y datos; usarla de
   adorno le quita significado. (Con el panel izquierdo reducido a logotipo y bajada, el pie
   desaparece de todos modos.)
6. **La bajada del logotipo decía "Gestión Automotriz con IA".** "Con IA" es exactamente la señal
   que la anti-referencia descarta. Propón dos o tres alternativas que digan qué hace el sistema,
   no con qué está hecho.

## Requisitos

- **Español de México** en toda la interfaz. "Correo electrónico", no "email". Sin tuteo
  informal excesivo: es una herramienta de trabajo, pero tampoco acartonada.
- **Móvil primero en el formulario.** El vendedor entra desde el teléfono en el piso de
  exhibición. El panel de marca puede colapsar; el formulario no puede perder respiración.
- **Accesibilidad real:** contraste AA verificado, foco visible en teclado, etiquetas asociadas a
  sus campos, mensajes de error anunciables por lector de pantalla, área táctil ≥ 44 px.
- **Tema claro y oscuro.** Define los tokens de ambos.
- Tipografía: propón una. La versión actual usa Segoe UI Variable por herencia de Windows, y no
  es un compromiso — si algo encaja mejor con Apple/Linear/Stripe, propónlo con su razón.
- Entrega **tokens de diseño** (color, espaciado, radio, tipografía, sombra) además de las
  pantallas. Se van a implementar como variables CSS.

## Qué quiero de vuelta

1. Las pantallas y estados de arriba, en alta fidelidad, claro y oscuro.
2. La retícula y el sistema de espaciado que las sostiene.
3. Los componentes reutilizables que salen de aquí: campo de texto, campo de contraseña, botón
   primario y secundario, mensaje de error, mensaje de éxito, indicador de carga.
4. Los tokens, en formato que pueda pegar en código.
5. Dónde te apartaste del diseño actual y por qué.
