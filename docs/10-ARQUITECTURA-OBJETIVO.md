# 10 · Arquitectura objetivo del producto definitivo

> **Propósito.** Reunir todo lo aprendido en F1 y F2 —industria, visión, recorrido funcional y
> diagnóstico técnico—, añadir los frentes que ningún documento previo cubrió, y **cerrar las
> decisiones de arquitectura** que corresponden al Full Stack Lead.
>
> **Fecha:** 12 de agosto de 2026 · **Fase:** insumo de F3 (12–14 ago)
> **Alcance de diseño:** los dos procesos del MVP —plan piso y asistente de ventas— con las
> costuras puestas donde la visión del día 7 las va a necesitar.

**Aviso.** Las secciones regulatorias son **análisis de fuentes públicas, no asesoría jurídica**.
Fijan requisitos de producto y órdenes de magnitud; antes de implementar controles con efecto
legal hay que validarlos con asesor. Las fuentes están al final.

---

## TL;DR ejecutivo

**El hallazgo que reordena el análisis: el cumplimiento dejó de ser una carga y pasó a ser
demanda.** La venta de vehículos es *actividad vulnerable* bajo la Ley Antilavado, y la reforma
del 16 de julio de 2025 añadió a los sujetos obligados —entre ellos, todos nuestros clientes— la
obligación de operar **mecanismos automatizados de monitoreo con perfil transaccional**,
auditoría anual y conservación de expedientes por diez años. El reglamento reformado el 27 de
marzo de 2026 lo confirma. Es decir: **la ley obliga a nuestro cliente a comprar software que hoy
no tiene.** Ningún documento previo del proyecto lo registra.

**El segundo hallazgo es una corrección.** [`docs/04` §1.3](04-REQUISITOS-V2.md) apoya sus
requisitos de datos personales en la LFPDPPP, **abrogada el 20 de marzo de 2025**. Hay ley nueva,
sin INAI, con la Secretaría Anticorrupción y Buen Gobierno como autoridad, amparo como medio de
defensa y multas de hasta 320 000 UMA. La sustancia de aquellos requisitos aguanta; el marco no.

**Lo que estos dos hechos hacen con la arquitectura es converger con la visión.** Bitácora
inmutable, retención, trazabilidad de quién vio qué y de qué ejecutó el sistema: es exactamente
lo que exige el cumplimiento **y** exactamente lo que exige un producto que actúa en vez de
informar. **Un solo mecanismo cubre las dos cosas.** Ese es el eje de este documento.

**Sobre la escala**, el objetivo declarado —900 agencias, el 30 % de las 3 000 distribuidoras del
país— no plantea un problema de volumen: Postgres absorbe ese inventario sin despeinarse. Plantea
un problema de **aislamiento entre clientes y de trabajo diario particionable**. Lo único que
crece de verdad es la foto diaria por unidad, y se resuelve con particionado por fecha.

**Se cierran once decisiones** (§8), incluida la única que `docs/04` dejó explícitamente abierta
—autenticación— y la contradicción de jerarquía que el día 7 destapó. **Quedan abiertas cuatro**
(§11), todas de producto o negocio, ninguna bloquea empezar.

---

# Parte A · Las fuerzas que condicionan la arquitectura

Seis frentes. Los tres primeros no existían en `docs/04`; los otros tres estaban incompletos.

---

## §1 · Cumplimiento — el frente que ningún documento previo cubrió

### 1.1 La venta de vehículos es actividad vulnerable

No es una hipótesis sobre el futuro del producto: es la situación legal de todos nuestros
clientes, hoy. La LFPIORPI —Ley Antilavado— clasifica como **actividad vulnerable** la
comercialización o distribución habitual **o** profesional de vehículos, nuevos o usados. La
reforma del 16 de julio de 2025 cambió la conjunción —antes era «habitual **y** profesional»— y
con ese solo cambio amplió el universo de obligados.

| Obligación | Umbral 2026 | En pesos |
|---|---|---|
| **Identificar** al cliente y abrir expediente | 3 210 UMA | ≈ **$376 565** |
| **Avisar** a la UIF vía portal del SAT | 6 420 UMA | ≈ **$753 130** |
| **Prohibición de liquidar en efectivo** (art. 32) | 3 210 UMA | ≈ **$376 565** |

> UMA diaria vigente desde el 1 de febrero de 2026: **$117.31**.
> 3 210 × 117.31 = $376 565.10 · 6 420 × 117.31 = $753 130.20.
> Ambos umbrales se calculan **sin IVA ni ISAN**.

Dos matices que tienen consecuencia directa en el modelo de datos:

- **El umbral de aviso se alcanza por acumulación en una ventana móvil de seis meses**, no solo
  por operación única. Eso obliga a mantener el acumulado por cliente, no por venta.
- **El aviso se presenta mensualmente, antes del día 17** del mes siguiente. Es un proceso con
  calendario, no un evento.

### 1.2 La reforma de 2025 convierte el cumplimiento en demanda de software

Aquí está el punto que cambia la lectura comercial del producto. La reforma del 16 de julio de
2025 añadió cinco obligaciones al artículo 18 de la LFPIORPI:

1. Enfoque basado en riesgo.
2. Manual de políticas internas.
3. Capacitación anual obligatoria.
4. **Mecanismos automatizados con perfil transaccional.**
5. Auditoría anual, interna o externa.

Y elevó la conservación de expedientes de cinco a **diez años** (art. 18 fr. IV). El reglamento
reformado, publicado el **27 de marzo de 2026**, lo refuerza: exige **implementación de sistemas
automatizados de monitoreo**, admite medidas simplificadas cuando el riesgo es bajo, acota el
beneficiario controlador a personas físicas, y obliga a presentar aviso **aun cuando la operación
no se haya consumado**.

> **Lectura de producto.** El punto 4 es una obligación legal de tener software. Nuestro cliente
> tiene que operar un mecanismo automatizado de monitoreo, conservar diez años de expedientes y
> pasar una auditoría anual sobre ello. Hoy la mayoría lo lleva en hojas de cálculo y carpetas.
> **Es el argumento comercial más fuerte que ha aparecido en todo el análisis, y no está en
> ningún entregable previo.**

Queda anotado como **hipótesis de producto para validar con Ricardo y Jhonatan**, no como
decisión: es plausible que sea uno de los siete procesos críticos que aún no se detallaron
([día 6](F1-D06-industria-automotriz.html), [día 5](F1-D05-onboarding-corporativo.html)).

### 1.3 Lo que el MVP tiene hoy es un adjunto, no un control

El MVP ya reconoce el frente, y eso es mérito de quien lo construyó — pero se quedó en el primer
escalón:

```
db.js:786-788      docLavadoDineroTipo: row.doc_lavado_dinero_tipo || "fisica"
db.js:927-930      doc_lavado_dinero_key / _nombre
crm.jsx:4416-4453  <Fld label="Prevención de lavado de dinero"> con selector física/moral
```

Es **un archivo que se sube al expediente**. No hay acumulado por cliente, ni comparación contra
umbral, ni ventana de seis meses, ni generación del aviso, ni control de retención, ni bloqueo de
captura de efectivo por encima del límite del artículo 32 — pese a que el CRM sí registra la
forma de pago (`efectivo` / `transferencia` / `cheque` en [`crm.jsx`](../crm.jsx)).

La distancia entre lo que hay y lo que la ley pide es, casi exactamente, el trabajo de un módulo.

### 1.4 Datos personales: la ley que `docs/04` cita ya no existe

**Corrección formal.** [`docs/04` §1.3](04-REQUISITOS-V2.md) titula sus requisitos «(LFPDPPP)».
Esa ley fue **abrogada**. La nueva Ley Federal de Protección de Datos Personales en Posesión de
los Particulares se publicó el **20 de marzo de 2025** y entró en vigor el **21**.

| Qué cambia | Detalle |
|---|---|
| **Autoridad** | Desaparece el INAI. Sus funciones pasan a la **Secretaría Anticorrupción y Buen Gobierno**. |
| **Medio de defensa** | El **juicio de amparo** sustituye al juicio de nulidad ante el TFJA. |
| **Plazos ARCO** | El responsable atiende en **20 días**; el titular puede acudir a la Secretaría en los 15 siguientes. |
| **Sanciones** | Hasta **320 000 UMA** (≈ **$37 539 200** con la UMA 2026), **duplicables** tratándose de datos sensibles. |
| **Reglamento** | Pendiente de publicación al cierre de este documento. Conviene vigilarlo. |

Los conceptos de aviso de privacidad, consentimiento, datos sensibles y derechos ARCO permanecen
en esencia. **Los requisitos P1–P5 de `docs/04` siguen siendo correctos en sustancia**; lo que
cambia es a quién se responde, por qué vía se litiga y cuánto cuesta equivocarse.

Que la propia **AMDA** circulara un análisis de la ley al ramo (circular 23/2025) confirma que la
industria la trata como obligación operativa, no como asunto jurídico de fondo.

### 1.5 Por qué la bitácora de acceso es el requisito de privacidad que más pesa

El expediente que el CRM construye no es un formulario de contacto. Los extractores de
`extract-document` leen **INE, CURP, RFC con homoclave, licencia de conducir, domicilio fiscal y
comprobantes** ([`index.ts:25-126`](../supabase/functions/extract-document/index.ts)). Con
sanciones duplicables por datos sensibles y un plazo de conservación de diez años por la vía
antilavado, la pregunta que hay que poder responder ante una auditoría no es «¿tienes aviso de
privacidad?» sino **«¿quién abrió este expediente, cuándo y desde dónde?»**.

Eso convierte el requisito **P3** de `docs/04` —bitácora de acceso a documentos, **incluido el
super admin**— en el más relevante de los cinco, y no en el último. Hoy queda registrado que un
super admin *entró* a un workspace, no que *vio* un expediente.

### 1.6 Frentes que se nombran y se acotan

No entran en el alcance de diseño, pero condicionan dónde se pone la frontera con el DMS:

| Frente | Qué implica | Postura |
|---|---|---|
| **CFDI · Complemento Venta de Vehículos Nuevos** | Para fabricantes, ensambladores y distribuidores autorizados; incorpora clave vehicular y NIV al comprobante | El producto **no factura**. Consume el dato fiscal del DMS. Ver §5 |
| **CFDI · Complemento Vehículo Usado** | Obligatorio cuando se recibe un usado a cuenta del nuevo (regla 2.7.1.10 RMF) | Idem |
| **REPUVE** | Registro Público Vehicular; el NIV es la llave común con el inventario | Solo como identificador. Sin integración prevista |
| **NOM-151-SCFI-2016** | Conservación de mensajes de datos y digitalización, con constancia de un Prestador de Servicios de Certificación | **Relevante si el expediente digital es el respaldo probatorio a diez años.** A decidir con asesor |
| **Auditoría física de plan piso** | Auditores externos verifican in situ el inventario financiado | El sistema debe producir un **corte conciliable con fecha**. Refuerza la foto diaria (§8) |

### 1.7 Conclusión de la sección

> **El cumplimiento no es un módulo, es una propiedad transversal.** Lo que exige —bitácora
> inmutable, retención larga, trazabilidad de accesos y de acciones— es la misma propiedad que
> exige un producto que ejecuta acciones por su cuenta (§4). Construir una vez y servir a las
> dos es la decisión de arquitectura más rentable de todo el documento.

---

## §2 · Seguridad — de los defectos observados al perímetro nuevo

Esta sección **no argumenta desde la teoría**: parte de lo que se reprodujo en la aplicación.

### 2.1 Lo verificado

| # | Hecho | Evidencia |
|---|---|---|
| 1 | `workspaces` con RLS **desactivada** en producción; las políticas correctas existen en el repositorio pero están inertes | Security Advisor + [`docs/03`](03-LECCIONES-DEL-MVP.md) |
| 2 | La credencial del proyecto es legible por cualquier visitante desde las herramientas del navegador, y **no caduca hasta 2036** | `config.js`, reporte del día 11 §08 |
| 3 | El recorte por rol es **visual**: un vendedor abre montos financiados, tasas e intereses con **ALT+2** | [H-2](08-HALLAZGOS-OBSERVADOS.md) · guarda en `components.jsx:182`, ausente en `app.jsx:618` |
| 4 | El importador masivo está abierto al vendedor: puede reescribir el inventario de la agencia | [H-4](08-HALLAZGOS-OBSERVADOS.md) · `components.jsx:215` |
| 5 | `alert_log` acepta inserciones de cualquier usuario autenticado — la bitácora es falsificable | `docs/03` §2 |
| 6 | `send-alert` lanza la excepción **antes** de escribir la bitácora: el único caso que importaba registrar es el que no deja rastro | `send-alert/index.ts:372-384` |

Los seis tienen la misma forma: **la autorización se decidió donde se pinta, no donde se sirve**.
Es el requisito S3 de `docs/04` enunciado por la vía de los hechos.

### 2.2 Lo que el perímetro nuevo añade

Los requisitos S1–S5 de `docs/04` §1.2 quedan confirmados sin cambios. Lo que la visión del día 7
introduce y no estaba contemplado:

- **Credenciales de terceros por agencia.** Si el producto se conecta al DMS o al portal de la
  financiera, guardará secretos que no son nuestros, uno por cliente. Eso exige almacén de
  secretos por tenant, rotación y revocación.
- **El radio de daño cambia de naturaleza.** Hoy una fuga significa *ver datos*. En el producto
  que actúa, significa *ejecutar acciones en sistemas ajenos*. Una escalada de privilegios deja
  de ser un incidente de confidencialidad y pasa a ser uno de integridad, sin deshacer.
- **Autorización antes de actuar.** Toda acción que comprometa dinero requiere aprobación humana
  explícita y registro de quién la dio. Es requisito de la visión y, a la vez, la única forma de
  que la automatización sea auditable.

---

## §3 · Escala — qué exige de verdad el objetivo de mercado

### 3.1 La cifra y su traducción

Del [día 5](F1-D05-onboarding-corporativo.html): **3 000 distribuidoras en México**, objetivo
declarado del **30 %** → del orden de **900 agencias**, cada una con sucursales, usuarios e
inventario.

Como referencia de contraste: GDS, uno de los DMS más extendidos del país, opera alrededor de
**188 concesionarias**. El objetivo declarado es cinco veces eso — es una meta comercial
ambiciosa, no un problema técnico.

### 3.2 Órdenes de magnitud

Supuestos explícitos, para poder discutirlos: **150 unidades** en piso por agencia (nuevas y
seminuevas) y **25 usuarios**.

| Magnitud | Cálculo | Resultado |
|---|---|---|
| Unidades activas en la plataforma | 900 × 150 | **135 000 filas** |
| Usuarios | 900 × 25 | **22 500** |
| **Fotos diarias de unidad** (§8) | 135 000 × 365 | **≈ 49 millones de filas al año** |
| Mensajes del trabajo diario, particionado por agencia | 900 / día | **900 mensajes** |

**Lectura:** 135 000 filas es un inventario pequeño para Postgres — cabría en memoria. 22 500
usuarios no es nada. 900 mensajes al día es ruido para una cola. **Lo único que crece de verdad
es la foto diaria**, y es un problema resuelto: tabla particionada por fecha con política de
retención.

### 3.3 La conclusión que importa

> **900 agencias no es un problema de escala, es un problema de aislamiento y de onboarding.**
> El motor aguanta el volumen sin esfuerzo. Lo que no aguanta 900 veces es un aislamiento por
> convención: con cuatro workspaces, un `WHERE` olvidado es un incidente; con novecientos
> clientes que compiten entre sí, es el fin del producto.

La única consecuencia real de dimensionamiento: **el trabajo diario se particiona por agencia**.
Una unidad de trabajo por agencia, no un barrido global del inventario. Con eso, el fallo de una
agencia no arrastra a las demás, el reintento es acotado y el volumen crece linealmente.

---

## §4 · Visión — de informar a actuar

De la [visión de negocio del día 7](F1-D07-vision-de-negocio.html): ante un evento, el sistema
**ejecuta las acciones que resuelven la situación** en vez de limitarse a notificar; opera sobre
**varias agencias** bajo un mismo director; las **integraciones** dejan de ser accesorio; y la IA
pasa de leer documentos a **producir trabajo y apoyar decisiones**.

### 4.1 La contradicción de jerarquía

La visión sitúa al **director** como el rol de mayor alcance, sobre varias agencias. El MVP lo
sitúa **dentro** de una sucursal, con un propietario de agencia por encima. No son dos diseños
distintos del mismo modelo: son dos modelos incompatibles. Se resuelve en §8, decisión 4.

### 4.2 Lo que la visión exige ahora, aunque no se construya ahora

Una sola cosa, y es barata:

> **El cambio de estado del semáforo tiene que ser un evento con identidad y bitácora, no un
> cálculo que alguien consulta al abrir una pantalla.**

Hoy el semáforo se calcula en lectura, seis veces, en seis sitios que divergieron — y la única
huella de un cambio es `semaforo_snapshot`, que existe para disparar alertas y nada más. Un
evento con identificador, agencia, unidad, estado anterior, estado nuevo y momento es **la misma
pieza** que necesitan: las alertas idempotentes (N2), la trazabilidad de acciones automáticas
(§1), el histórico contable (§8) y, más adelante, cualquier agente que reaccione.

Lo que **no** se construye ahora, y se dice para que no se cuele: motor de reglas configurable,
catálogo de acciones, orquestación de agentes. Se nombran, se aplazan, y §10 dice qué cuesta
aplazarlos.

---

## §5 · Conectividad — el frente menos explorado

El [día 6](F1-D06-industria-automotriz.html) dejó dos preguntas sin responder: si el producto
convive con los sistemas de la agencia o los sustituye, y de dónde sale realmente el dato de
inventario. Son las que más trabajo técnico determinan.

### 5.1 Las cuatro familias

| Familia | Qué se sabe | Consecuencia para la arquitectura |
|---|---|---|
| **DMS de la agencia** — GDS, MultiMarca W32, TotalDealer, Agilistas, CDK | Es el sistema de registro del inventario, la facturación y la posventa. Es donde vive la duplicidad que el día 6 identificó como problema recurrente | **Convivencia, no sustitución.** El producto vigila el inventario; no aspira a ser su sistema de registro |
| **Financieras de plan piso** — Scotiabank, BBVA, Banorte, DLL, NAFIN y las cautivas de marca | Fuente de verdad de días de gracia, tasa y saldo — **hoy se capturan a mano**. Operan portales de distribuidor; no hay evidencia pública de API | Diseñar para **ingesta de archivo con posibilidad de API**, nunca al revés |
| **Auditoría de inventario** | Auditores externos verifican físicamente el piso financiado y concilian contra el saldo | El sistema debe emitir un **corte con fecha**, reproducible |
| **Canales y terceros** | Correo, Telegram y WhatsApp ya en el MVP; SAT/PAC y REPUVE solo si se cruza la frontera fiscal | Adaptadores tras un contrato propio |

### 5.2 El requisito estructural

**Capa de integración con contrato propio y adaptadores por proveedor.** El dominio no conoce al
proveedor: conoce «fuente de inventario» y «canal de notificación». Cada adaptador aporta
reintentos, idempotencia y **una bitácora por llamada** — la misma que §1 y §4 ya pedían.

El MVP tiene el contraejemplo perfecto: la lógica de envío vive dentro de la Edge Function, con
el proveedor incrustado, y por eso la bitácora se escribe donde no debe
(`send-alert/index.ts:372-384`).

### 5.3 La advertencia honesta

No hay evidencia de APIs públicas ni para DMS ni para financieras de plan piso. Elegir tecnología
de integración antes de saber qué se puede leer sería decidir en el vacío.

> **El primer paso real no es técnico: es conseguir el contrato de datos de una agencia piloto** —
> un archivo de ejemplo del DMS y uno del portal de la financiera. Con eso, la capa de integración
> se diseña en una tarde. Sin eso, cualquier diseño es especulación.

---

## §6 · Integración de IA — dónde rinde y dónde no

### 6.1 Lo que hay, y la corrección que arrastra

`extract-document` llama a **`gpt-4o`** — es OpenAI, no Anthropic, pese a que el secreto se llama
`ANTHROPIC_API_KEY` y a que el `README.md` afirma lo contrario. Son **195 líneas y 7 extractores
afinados en 19 commits**, y `docs/04` §4.3 tiene razón en clasificarlo como activo a rescatar
textualmente: contiene aprendizaje real sobre documentos mexicanos.

### 6.2 El patrón que ya está bien hecho y hay que conservar

> **El modelo propone, el código valida.**

El prompt del CURP insiste en leerlo *verbatim* y prohíbe derivarlo del nombre y la fecha; después
el código lo verifica con expresión regular
([`index.ts:195`](../supabase/functions/extract-document/index.ts#L195)). Esa disciplina —salida
del modelo sometida a validación determinista— es la que hace que una extracción sea utilizable en
un expediente con consecuencia legal.

### 6.3 Tres usos, tres regímenes distintos

| Uso | Estado | Qué exige |
|---|---|---|
| **Extracción de documentos** | Existe y funciona | Validación determinista posterior. Campo dudoso se omite, no se inventa |
| **Producción de trabajo** — redactar seguimientos, resumir | Visión | Riesgo bajo: el humano revisa antes de enviar |
| **Apoyo a la decisión y acción automática** | Visión | Cambia de naturaleza: autorización explícita, reversibilidad y bitácora |

### 6.4 Dos reglas de arquitectura

1. **La IA nunca calcula el semáforo ni ninguna cifra financiera.** Lo financiero es determinista
   y se verifica contra los 23 vectores de [`docs/01`](01-DOMINIO.md). Un modelo probabilístico no
   tiene sitio en un número que la agencia usa para decidir — que es justo el número que ya se
   rompió por otra vía ([H-1](08-HALLAZGOS-OBSERVADOS.md)).
2. **Proveedor tras interfaz propia**, igual que la autenticación, y **prompts versionados en el
   repositorio**. Con eso el coste de cambiar de modelo o de proveedor es bajo y medible.

### 6.5 El punto que conecta con §1 y no está en ningún documento previo

**Enviar un INE a un tercero para extraer datos es una transferencia de datos personales.** Tiene
que estar declarada en el aviso de privacidad, y la elección de proveedor, región y política de
retención del proveedor deja de ser una decisión técnica para ser una decisión de cumplimiento.
Con sanciones duplicables por datos sensibles (§1.4), conviene resolverlo antes de la primera
llamada, no después.

---

## §7 · Stack, experiencia y autoridad

**Experiencia del lead:** TypeScript, NestJS, Prisma, AWS (EC2, Amplify, Aurora, CloudWatch, SES).
Es el dato que ya hizo revisar la recomendación original de `docs/04` §3.2, y sigue siendo
decisivo: en una reconstrucción, el riesgo dominante no es elegir el framework subóptimo, es que
el equipo vaya lento en tecnología desconocida.

**Autoridad:** declarada en el reporte del día 11 §14 — *infra, stack, herramientas y proveedores
son decisión y responsabilidad del Full Stack Lead*. Este documento la ejerce.

### Qué decisión es de quién

| Ámbito | Decide | Ejemplos |
|---|---|---|
| **Stack, infraestructura, herramientas, proveedores** | Full Stack Lead | Lenguaje, API, base de datos, nube, autenticación, CI, modelo de aislamiento |
| **Alcance funcional y prioridad** | CTO / CEO | Los siete procesos críticos restantes, qué entra en cada fase |
| **Modelo de negocio** | CEO / CFO | Precio, paquetes, límites por plan, medición de consumo |
| **Dominio y procesos de la agencia** | CTO / Operaciones | Reglas de negocio, contrato de datos con la agencia piloto |
| **Validación legal** | Asesor jurídico externo | Todo lo de §1 |

Por eso §8 **cierra** y §11 **expone**: no es cautela, es respetar de quién es cada decisión.

---

# Parte B · Decisiones

---

## §8 · Las once decisiones que se cierran

| # | Decisión | Elección | Qué la revertiría |
|---|---|---|---|
| 1 | Lenguaje y estructura | **Monorepo TypeScript con paquete `domain` puro**, sin E/S, importado por API, worker y web | Nada previsible. Es el requisito F1 convertido en estructura |
| 2 | API y frontend | **NestJS** + **React con Vite**, SPA | Un giro a renderizado en servidor por SEO — improcedente en un producto tras login |
| 3 | Base de datos y nube | **PostgreSQL en RDS**, no Aurora todavía. AWS | Que el coste de operación de AWS resulte desproporcionado antes de tener ingresos |
| 4 | **Jerarquía de tenant** | **Un solo nivel: la agencia.** «Director sobre varias agencias» se modela como **alcance de permiso**, no como nivel jerárquico | Que el grupo resulte tener **operación propia** — traslados de unidades entre agencias, financiamiento contratado por el grupo, personal del grupo — y no solo visibilidad consolidada |
| 5 | Aislamiento entre clientes | **Prisma Client Extension** que inyecta el filtro de tenant y **lanza si el contexto falta** + pruebas de aislamiento obligatorias en CI | Nada. Es la lección 2 en forma ejecutable |
| 6 | Migraciones | **Prisma Migrate aplicado por CI.** Cambios manuales prohibidos y detectados | Nada |
| 7 | **Autenticación** | **Cognito solo como proveedor de identidad**; toda la autorización en la aplicación. Detrás de interfaz propia desde el día uno | Que la DX de Cognito frene la fase 0: el reemplazo es un adaptador |
| 8 | Trabajos programados | **EventBridge → SQS → worker**, **particionado por agencia**, idempotente, con DLQ y alarma si un día no corre | Nada. Es la pieza que el MVP nunca tuvo bien |
| 9 | Interés e historia | **Cálculo en lectura + foto diaria inmutable por unidad**, en tabla particionada por fecha | Nada |
| 10 | Frontera del CRM | **Módulo separado desde el día uno**, desplegado junto | Nada. Separarlo después es caro; la frontera es barata hoy |
| 11 | **Bitácoras** | **Append-only** para acceso a documentos, envíos, acciones automáticas y llamadas a terceros. Una sola pieza | Nada |

Y tres reglas transversales, sin tabla porque no admiten alternativa razonable: **dinero en
`Decimal`/`numeric`**, nunca punto flotante; **secretos fuera del código**, por entorno; **IA tras
interfaz, con prompts versionados**.

### Las cuatro que llevan argumento

**Decisión 3 · AWS y RDS, y qué pasa con Supabase.**
El desempate de `docs/04` §3.6 sigue vigente y ahora tiene dos refuerzos. El original: las Edge
Functions corren en Deno y no comparten módulos con un paquete de dominio de Node con
naturalidad — fricción directa contra F1, el requisito que manda. Los nuevos: la **capa de
integración** de §5 y el **trabajo particionado por agencia** de §3 encajan con EventBridge, SQS y
DLQ sin construir nada, y son exactamente donde `pg_cron` no llega.

Conviene decirlo sin ambigüedad para que no haya confusión entre las dos pistas:

> **El port del MVP se queda en Supabase. El producto definitivo va a AWS.** No es incoherencia:
> son dos productos con vidas distintas. El port es la demostración, se archiva al alcanzar
> paridad, y cambiarle el backend sería trabajo tirado. La frontera ya está decidida en
> [`PROP-estabilizacion-mvp`](PROP-estabilizacion-mvp.html).

Y una precisión honesta: **el problema del MVP no fue Supabase**, fue la ausencia de proceso. Ese
fallo se reproduce igual en AWS si no hay migraciones versionadas y CI — que es justo lo que
cubren las decisiones 5 y 6.

**Decisión 4 · Un solo nivel de tenant.**
Resuelve la contradicción de §4.1 por la vía más barata: separar **jerarquía** de **alcance**. La
jerarquía es agencia → usuarios. Que un director vea varias agencias es un permiso, no un nivel.

Tres razones:
1. **Elimina de raíz la ambigüedad `workspace_id || agency_id`**, esparcida hoy por toda la capa
   de datos con respaldos por todos lados, y que produjo una clase entera de defectos.
2. **La jerarquía de dos niveles nunca se ejercitó**: en producción hay cuatro agencias con
   exactamente un workspace cada una.
3. **Modelar el multiagencia como permiso es más general que como nivel**: cubre al director de
   grupo, al auditor externo y al consultor, sin inventar un nivel por cada caso.

**Y absorbe el caso mixto sin esfuerzo.** El mercado va a traer las dos cosas —agencias sueltas y
grupos—, así que la pregunta correcta no es cuál de las dos, sino qué es un grupo por dentro. Con
el permiso, la agencia suelta es el caso de una y **no hay que inventarle un padre vacío**, que es
exactamente lo que hace el MVP hoy: cuatro agencias sosteniendo un nivel superior que no contiene
nada. Un nivel obligatorio penaliza al caso simple para servir al complejo; el permiso sirve a los
dos con el mismo modelo.

**Lo que sí la revertiría** no es que existan grupos, sino que el grupo **opere**: que se trasladen
unidades entre sus agencias, que el financiamiento lo contrate el grupo y se reparta, o que haya
personal contratado por el grupo. En ese caso el grupo tiene datos propios colgando y necesita ser
un nivel de verdad. Es la pregunta R3 del [cuestionario](11-CUESTIONARIO-PRODUCTO.md), y por eso
está en la ronda 1.

Si esa respuesta llega más adelante, añadir un nivel de agrupación sobre un modelo limpio es una
migración acotada. Arrastrar la ambigüedad desde el principio no tiene vuelta atrás.

**Decisión 7 · Cognito, pero solo para lo que Cognito hace bien.**
`docs/04` §3.5 dejó esta decisión abierta y planteó la disyuntiva como «Cognito vs. propio vs.
gestionado». La disyuntiva estaba mal planteada: mezclaba **autenticación** con **autorización**.

- **Autenticación** —invitación por correo, contraseña, recuperación, sesión— es superficie de
  seguridad estándar, aburrida y peligrosa de escribir a mano. Cognito la resuelve, encaja con el
  resto de la infraestructura y no cuesta nada relevante a esta escala.
- **Autorización** —rol, jerarquía, alcance sobre agencias, qué campos ve un vendedor— es dominio
  puro, cambia con el producto y tiene que ser **verificable en pruebas**. No puede vivir en un
  proveedor externo. Vive en nuestra base y se aplica en los DTO de la API.

Partida así, la mala DX de Cognito se paga una sola vez y sobre la parte pequeña. Y la lección de
[H-2](08-HALLAZGOS-OBSERVADOS.md) queda estructuralmente cubierta: lo que un rol no debe ver, **no
se le envía**, porque el filtro está en la serialización, no en el render.

**Decisión 9 · La foto diaria, que ahora tiene tres justificaciones.**
`docs/04` §2.3 la recomendaba por una: sin historia no se puede responder «¿cuánto interés
teníamos el 30 de junio?». Este análisis le añade dos más — el **corte conciliable** que pide el
auditor de plan piso (§1.6) y el **rastro de diez años** que pide la vía antilavado (§1.2). Tres
requisitos independientes que se satisfacen con la misma tabla, escrita por un trabajo que ya
recorre el inventario cada día.

---

## §9 · Requisitos nuevos que este análisis añade a `docs/04`

Numerados en continuidad con su esquema (F·, S·, P·, N·, O·) para que sean citables.

### Cumplimiento

| # | Requisito |
|---|---|
| **C1** | Expediente de identificación del cliente con los campos y documentos que exige la vía antilavado, **completo antes de cerrar** una operación sobre el umbral |
| **C2** | **Acumulado por cliente en ventana móvil de seis meses**, comparado contra el umbral de aviso, con la operación que lo cruza señalada |
| **C3** | **Generación del aviso mensual** en el formato del portal del SAT, con calendario y constancia de presentación |
| **C4** | **Bloqueo de captura** de pago en efectivo por encima del límite del artículo 32, con la operación registrada aunque no se consume |
| **C5** | **Retención de diez años** de expediente y documentación soporte, con política de borrado que no la contradiga |
| **C6** | **Bitácora de acceso a documentos** —quién, qué expediente, cuándo, desde dónde—, sin excepción para el super admin (eleva P3) |
| **C7** | **Declaración de transferencias a terceros** —proveedor de IA incluido— en el aviso de privacidad, con región y retención del proveedor documentadas |

> C1–C4 son el módulo de cumplimiento; **son alcance de producto, no de esta fase**, y se
> construyen si Ricardo confirma la hipótesis de §1.2. C5–C7 son estructurales y entran desde el
> día uno, porque retrofitear una bitácora es rehacer la capa de datos.

### Integraciones

| # | Requisito |
|---|---|
| **I1** | El dominio no conoce proveedores: **contrato propio + adaptadores**, uno por sistema externo |
| **I2** | Toda llamada a un sistema externo deja **bitácora**: destino, momento, resultado, error |
| **I3** | **Ingesta por archivo como camino de primera clase**, no como respaldo del API que quizá no exista |
| **I4** | El producto **convive** con el DMS: no es el sistema de registro del inventario, y el modelo debe admitir que el dato llegue de fuera y se reconcilie |
| **I5** | **Corte de inventario con fecha**, reproducible, para la auditoría del financiamiento |

### Inteligencia artificial

| # | Requisito |
|---|---|
| **A1** | La IA **no participa en ningún cálculo financiero**. El semáforo y los importes son deterministas y verificados por los 23 vectores de `docs/01` |
| **A2** | Toda salida de un modelo pasa por **validación determinista** antes de persistirse. Campo dudoso se omite |
| **A3** | Proveedor **tras interfaz propia**; prompts **versionados en el repositorio** |
| **A4** | Toda acción sugerida por IA que comprometa dinero requiere **autorización humana explícita**, registrada |

### Escala

| # | Requisito |
|---|---|
| **E1** | El trabajo diario se **particiona por agencia**: el fallo de una no arrastra a las demás |
| **E2** | La foto diaria vive en **tabla particionada por fecha**, con política de retención alineada a C5 |
| **E3** | El aislamiento entre clientes se verifica en CI **en cada despliegue**, no en cada revisión de código (refuerza S1) |

---

## §10 · Las puertas que se dejan abiertas

El alcance ejecutable son los dos procesos del MVP. Estas cuatro costuras se ponen igual, porque
cuestan poco ahora y mucho después.

| Costura | Qué habilita | Coste hoy | Coste si se pospone |
|---|---|---|---|
| **Evento de cambio de estado con identidad y bitácora** | Alertas idempotentes, trazabilidad, histórico, y cualquier agente futuro | Bajo: una tabla y un punto de emisión | Alto: hay que reescribir el disparo de alertas y no hay historia que reconstruir |
| **Capa de integración con contrato propio** | DMS, financieras, canales nuevos | Bajo con un solo adaptador | Alto: el proveedor se filtra al dominio, como pasó en `send-alert` |
| **Bitácora de acciones append-only** | Cumplimiento (C6) y confianza en la automatización | Bajo si se pone con el esquema | Muy alto: retrofitear auditoría es rehacer la capa de datos |
| **Alcance por permiso, no por nivel** | Director multiagencia, auditor externo, consultor | Bajo si se decide ahora (decisión 4) | Muy alto: es una migración de identidad y permisos con usuarios reales dentro |

### Lo que **no** se deja abierto, y por qué

| Descartado | Razón |
|---|---|
| **Motor de reglas configurable** | No hay requisitos escritos que lo justifiquen. Sin los siete procesos críticos, sería diseñar contra una suposición |
| **Orquestación de agentes** | La visión la pide; el backlog no existe. Se construye cuando exista |
| **Microservicios** | Un producto, un equipo pequeño, sin problemas de escala (§3). Los módulos de Nest ya dan la separación |
| **Multi-región** | 900 agencias en un solo país. No hay requisito de residencia que lo exija hoy |
| **Aurora desde el día uno** | Piso de coste sin contrapartida en un producto pre-ingresos. Migrar después es un cambio de endpoint |

> El riesgo que estas cinco líneas vigilan tiene nombre en `docs/04` §6: **el segundo sistema** —
> reconstruir sobreingenierizando por reacción al MVP. Dejar puertas es prudente; cruzarlas antes
> de tiempo es el error clásico.

---

## §11 · Lo que queda abierto y de quién depende

Ninguna de las cuatro bloquea empezar. Todas bloquean algo más adelante, y conviene decir qué.

| Pregunta | Depende de | Qué bloquea | Cuándo hace falta |
|---|---|---|---|
| **Los siete procesos críticos restantes** | CTO / Operaciones | El **roadmap**, no la arquitectura. Y determina si el módulo de cumplimiento de §1.2 es prioridad | Antes de planificar más allá de la fase 2 |
| **Modelo de ingresos, precio y paquetes** | CEO / CFO | Medición de consumo, límites por plan y qué se factura. Pendiente desde el día 5 | Antes de construir el módulo de suscripción |
| **Prioridad de integraciones y contrato de datos de una agencia piloto** | CTO / Operaciones | El diseño concreto de la capa de integración. **Es lo más urgente de los cuatro** (§5.3) | Antes de escribir el primer adaptador |
| **¿El producto factura o consume factura?** | CEO / CTO | La frontera con el DMS y todo el frente fiscal de §1.6 | Antes de tocar cualquier cosa con el SAT |

Y una quinta, de otra naturaleza: **validación jurídica del análisis de §1**. Es de fuentes
públicas y está fechado; los umbrales cambian con la UMA cada año y el reglamento de la ley de
datos sigue pendiente. Un asesor debe confirmarlo antes de que ningún control con efecto legal
llegue a un cliente.

---

## §12 · Correcciones a la documentación previa

| Documento | Dice | Debe decir |
|---|---|---|
| [`04-REQUISITOS-V2.md`](04-REQUISITOS-V2.md) §1.3 | «Datos personales (LFPDPPP)» | La LFPDPPP fue **abrogada** el 20-mar-2025. Los requisitos P1–P5 siguen siendo válidos en sustancia; el marco es el de §1.4 de este documento |
| [`README.md`](README.md) | Enlaza `supabase_fix_rls_workspaces.sql` en la raíz | Ese archivo **se borró en la limpieza**. La corrección vive en `supabase/migrations/20260808204401_fix_rls_workspaces.sql`. Enlace muerto |
| `CLAUDE.md` | «21 vectores de prueba» y «el semáforo está implementado 7 veces» | Son **23** vectores y quedan **6** copias vivas: la séptima murió en la limpieza. Ya detectado en el reporte del día 11 |

`docs/04` **no se reescribe**: es una instantánea fechada del 7 de agosto, y la convención del
proyecto es corregir en el documento nuevo. Solo se le añade una nota que apunte aquí.

---

## Fuentes

**Regulatorias.** Consultadas el 12 de agosto de 2026.

- [Enajenación de vehículos: la UIF redefine la actividad vulnerable](https://www.cuatrecasas.com/es/latam/litigacion/art/enajenacion-vehiculos-uif-redefine-actividad-vulnerable) — Cuatrecasas
- [Actividades Vulnerables](https://www.sat.gob.mx/minisitio/ActividadesVulnerables/index.html) — SAT
- [Umbrales LFPIORPI 2026](https://kyc-systems.com/blog/umbrales-lfpiorpi-2026) y [Comercialización de vehículos](https://kyc-systems.com/blog/comercializacion-de-vehiculos-lfpiorpi) — KYC Systems
- [Reforma a la Ley Antilavado en México](https://www.hoganlovells.com/es/publications/reform-of-mexicos-antimoney-laundering-law) — Hogan Lovells
- [Reformas al Reglamento de la Ley Antilavado](https://www.hklaw.com/en/insights/publications/2026/04/reformas-al-reglamento-de-la-ley-antilavado-en-mexico) — Holland & Knight, 27-mar-2026
- [Nueva LFPDPPP: elimina el INAI](https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce) — Garrigues
- [México tiene nueva ley de protección de datos](https://www.littler.com/es/news-analysis/asap/mexico-tiene-nueva-ley-en-materia-de-proteccion-de-datos-personales) — Littler
- [Análisis de la nueva LFPDPPP, circular 23/2025](https://www.amda.mx/wp-content/uploads/2025/04/anexo%201%20de%20circular%2023%20de%202025.pdf) — **AMDA**
- [Complemento para venta de vehículos nuevos](https://www.sat.gob.mx/consulta/54642/complemento-para-facturas-electronicas-de-venta-de-vehiculos-nuevos) — SAT
- [NOM-151-SCFI-2016](https://dof.gob.mx/nota_detalle.php?codigo=5478024&fecha=30/03/2017) — DOF

**De mercado.**

- [Global Dealer Solution](https://www.gdsdms.com/), [MultiMarca W32](https://w32.mx/sitio/), [TotalDealer](https://www.totaldealer.com.mx/), [Agilistas DMS](https://agilistas.mx/dms-agencias-autos-seminuevos/) — DMS en México
- [Plan Piso](https://www.scotiabank.com.mx/empresas-y-gobierno/creditos/plan-piso.aspx) (Scotiabank) · [BBVA](https://www.bbva.mx/empresas/productos/financiamiento/servicios-especializados/plan-piso.html) · [Banorte](https://www.banorte.com/Empresas/Financiamiento/Plan-Piso-Auto.html) · [DLL](https://www.dllgroup.com/mx/es-mx/solutions/financiamiento-para-plan-piso) · [NAFIN](https://www.gob.mx/nafin/acciones-y-programas/financiamiento-para-distribuidores-automotrices-plan-piso)
- [Auditoría de plan piso](https://www.bureauveritas.com.mx/magazine/auditoria-plan-piso) — Bureau Veritas

**Internas.** [01 · Dominio](01-DOMINIO.md) · [02 · Features](02-MVP-FEATURES.md) ·
[03 · Lecciones](03-LECCIONES-DEL-MVP.md) · [04 · Requisitos v2](04-REQUISITOS-V2.md) ·
[08 · Hallazgos](08-HALLAZGOS-OBSERVADOS.md) · reportes de los días 5, 6, 7, 10 y 11 ·
[Propuesta de estabilización](PROP-estabilizacion-mvp.html).

---

*Documento de elaboración propia. Jose Santiago · Full Stack Lead · 12 de agosto de 2026.*
