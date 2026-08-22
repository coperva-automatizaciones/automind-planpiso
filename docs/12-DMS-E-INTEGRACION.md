# 12 · El DMS de la agencia y cómo se conecta con plan piso

> **Propósito.** Averiguar con qué sistemas convive el producto en una agencia real, qué cubren
> y qué no, y cómo llegaría el dato del inventario a Automind sin que nadie lo capture dos veces.
>
> **Fecha:** 12 de agosto de 2026 · **Origen:** Ricardo mencionó **MultiMarca W32** en sesión.

**Límite de este análisis.** Todo sale de **fuentes públicas y material comercial**, no de
documentación técnica ni de acceso a ningún sistema. Que algo no aparezca en una web de marketing
**no prueba que no exista** — sobre todo en materia de APIs, que rara vez se publicitan. Sirve para
orientar la conversación y acotar el trabajo, no para cerrarlo.

---

## TL;DR

**El DMS es la norma en una distribuidora, y no cubre plan piso.** W32 registra la unidad; nadie
vigila el reloj financiero. Eso confirma el diagnóstico del día 6 con un caso concreto.

**El hallazgo que reordena el trabajo de integración:** plan piso necesita **dos fuentes de
datos**, y el DMS solo es una. El vehículo lo tiene el DMS; **las condiciones del financiamiento
—días de gracia, tasa, monto— las tiene la financiera**, y esa es la que no tiene ningún camino de
integración conocido.

**La buena noticia:** la integración que plan piso necesita es de las más baratas que existen —una
dirección, diez campos, frecuencia diaria, sin conflictos de escritura—. La que necesitaría el
asistente de ventas es de las caras.

**Y la precisión que evita detener trabajo:** la apertura de los DMS **es un bloqueante, pero no de
la arquitectura — del modelo de negocio y de la escala** (§8). El diseño ya asumió el peor caso, así
que la construcción puede avanzar. Lo que no se puede saber sin respuesta es cuánto cuesta dar de
alta a la agencia número 900.

---

## 1 · El panorama

El DMS —*Dealer Management System*— es el sistema con el que una distribuidora opera: vehículos
nuevos y seminuevos, refacciones, servicio, facturación, cuentas por cobrar e inteligencia de
negocio, en una sola plataforma. **Es el sistema de registro de la agencia**, y desplazarlo no es
cambiar de herramienta: es cambiar cómo opera la empresa.

Los que aparecen con presencia en México:

| Sistema | Nota |
|---|---|
| **MultiMarca W32** | 25 años, desarrollo 100 % mexicano, **certificado por las principales armadoras**. El que Ricardo mencionó |
| **Global Dealer Solution (GDS)** | Declara ~188 concesionarias y 2 500 licencias de usuario |
| **TotalDealer** | Enfoque en centralizar procesos de agencia |
| **Agilistas** | Especializado en seminuevos; integración con portales de venta y WhatsApp Business |
| **CDK Global** | Internacional, presencia en el mercado |

> **La certificación de armadora es la barrera real.** Un DMS homologado por la marca no se
> sustituye por decisión de la agencia sola. Es el dato que más pesa contra cualquier estrategia
> de reemplazo.

### 1.1 · La armadora estandariza la red — indicio con confianza limitada

⚠️ **Fuente única, no oficial y de 2017.** Lo que sigue procede de **un solo post en un blog de
proyecto escolar** (CBTis 26, abril de 2017), sin cita de documento, circular ni autor. Al
buscarlo, todo lo que parece corroboración devuelve **ese mismo post**. **No sirve para sostener
una decisión** — sí para orientar una pregunta que Ricardo puede confirmar o descartar en un
minuto.

El texto reproduce lo que tiene forma de **comunicación corporativa** de Volkswagen de México y la
Asociación Nacional de Concesionarios del Grupo Volkswagen: tras siete años de evaluación con una
matriz *Business Blue Print*, se acuerda estandarizar la operación de las concesionarias y se
**recomienda adquirir MultiMarca W32, TotalDealer y gDs**. VWM trabajaría con los seleccionados
procurando condiciones de producto y precio, y **desarrollando interfaces automatizadas con sus
sistemas**.

**Por qué no lo descarto del todo:** los tres DMS nombrados son exactamente los tres de mayor
presencia encontrados por separado, la ANCGVW existe, y **W32 declara en su propio sitio** que
cumple *«las funcionalidades e **interfaces solicitadas por las plantas armadoras»***. Eso
corrobora el **mecanismo** —la armadora especifica interfaces, el DMS las implementa— desde una
fuente independiente, aunque no confirme este acuerdo concreto.

**La cláusula que más dice.** A las concesionarias que ya usaban otro DMS, el texto les ofrece
*«el acceso a la información técnica de las interfaces de los sistemas de Volkswagen, misma que
tendrán que evaluar a su propio costo y responsabilidad»*.

> Es un modelo de guardián **distinto del precedente estadounidense** de §5: la armadora no
> bloquea, **documenta y traslada el costo**. Bastante más favorable.

### 1.2 · La armadora como fuente de datos: alcance real

Se desprende de lo anterior que la armadora podría ser una **cuarta fuente**: facturó esas unidades
al concesionario, así que sabe cuáles son y cuándo se facturaron. Si mantiene interfaces
automatizadas con los DMS de su red, una integración serviría a **toda la red de una marca** en vez
de a una agencia.

**Y hay un refuerzo que no es evidente: en las marcas con financiera cautiva, el grupo tiene las
dos mitades.** La armadora conoce el vehículo; la cautiva conoce las condiciones del
financiamiento. Está verificado que hacen plan piso:

| Cautiva | Alcance |
|---|---|
| **NR Finance México** | Creó **NR WHOLESALE México** específicamente para el plan piso de la red Nissan. Lidera el financiamiento automotriz del país con ~23,6 % de participación |
| **VW Financial Services** | Financiamiento a **distribuidores** y clientes finales de VW, SEAT, Cupra, Audi, Ducati, Porsche y VW Comerciales |
| **Ford Credit** | Financiera de marca de Ford |

Es la **única configuración conocida en la que un solo interlocutor podría entregar todo lo que
plan piso necesita** — el vehículo y sus condiciones. Donde el plan piso lo financia un banco
(Scotiabank, BBVA, Banorte, DLL, NAFIN), esto no aplica.

**Pero el alcance es por marca, y eso limita mucho la idea.** México tiene del orden de treinta
marcas repartidas entre las ~3 000 distribuidoras. La vía por armadora **no elimina el problema del
costo de alta: lo cambia de forma**:

| | Vía agencia | Vía armadora |
|---|---|---|
| Número de negociaciones | ~900 | ~30, una por marca |
| Dificultad de cada una | Baja: es nuestro cliente | **Alta: es una corporación que no nos conoce** |
| Quién decide | El propio cliente | Un tercero sin incentivo inmediato |
| Plazo | Días | Meses, con suerte |

> **Cambia muchas negociaciones fáciles por pocas difíciles. No es obviamente mejor, y desde luego
> no es un movimiento de arranque:** una armadora no toma la llamada de un proveedor sin trayectoria.
> Es una palanca para cuando haya tracción, no un atajo para empezar.

**Donde sí es útil desde el principio es en la segmentación.** Si una armadora estandariza la
operación de su red en tres DMS, **una red de marca es un objetivo mucho más homogéneo** que un
conjunto de agencias sueltas: un solo formato de exportación, un solo esquema de financiamiento vía
la cautiva, un solo interlocutor de referencia. Concentrarse en una marca antes que en un número de
agencias puede ser mejor estrategia de entrada que ir por volumen.

---

## 2 · Qué cubre W32 y qué no

**Módulos publicados:** CRM Automotriz · Autos Nuevos y Seminuevos · Refacciones · Servicio ·
Facturación electrónica · Business Intelligence. Multi-marca, multi-almacén, multi-empresa y
multi-moneda — está pensado para grupos con varias concesionarias, incluso de marcas distintas.

Dentro de «Autos Nuevos y Seminuevos» hay **catálogos y registro de inventarios**.

**Lo que no aparece documentado en ninguna parte:**

- Control de piso o plan piso
- Financiamiento de inventario
- Días de gracia
- Costo financiero o cálculo de intereses por unidad
- Antigüedad de inventario como métrica de riesgo

> **Es exactamente el hueco que el día 6 describió**: el costo del plan piso corre entre el ciclo
> administrativo y el comercial *sin que ninguna de las dos áreas lo tenga como responsabilidad
> propia*. El DMS registra que la unidad existe. Nadie mira el reloj.

**Corroboración indirecta.** Existe **Saccsa**, software de tesorería para agencias que gestiona
la línea de crédito de plan piso —compra de inventario, flotillas, traslado de unidades y
monitoreo de unidades en plan piso—, dirigido al distribuidor y no al banco. **Si el DMS lo
cubriera, ese producto no tendría razón de ser.** Es lo más parecido a un competidor directo
encontrado hasta ahora y merece una mirada propia: no está claro si calcula intereses y días de
gracia o si solo administra el crédito.

---

## 3 · El hallazgo: plan piso necesita dos fuentes, el DMS es una

| Dato | Quién lo tiene |
|---|---|
| VIN, modelo, versión, color, **fecha de factura**, estado de la unidad | **El DMS** |
| **Monto financiado, tasa, días de gracia**, fecha de disposición, saldo | **La financiera** — banco o cautiva de marca |
| El cálculo, el semáforo, la alerta, a quién avisar | **Automind** |

**Esto explica el diseño del importador del MVP mejor que ninguna otra hipótesis.** Los 19 campos
con tabla de sinónimos, la tolerancia a encabezados impredecibles, la detección de delimitador:
no está comiendo la exportación limpia de un sistema. **Está comiendo un Excel hecho a mano que ya
fusionó las dos fuentes.** Esa es la operación real que el producto automatiza.

Y tiene dos consecuencias que conviene tener claras:

1. **Aunque la integración con el DMS saliera perfecta, seguiría faltando la mitad financiera** —
   que es justamente la que gobierna el semáforo. Los bancos de plan piso (Scotiabank, BBVA,
   Banorte, DLL, NAFIN y las cautivas de marca) operan **portales de distribuidor**, no APIs
   públicas.
2. **Puede ser la causa raíz de la ambigüedad de los días de gracia.** El MVP guarda ese dato
   *por unidad*. Si en la realidad las condiciones cuelgan de la **línea de crédito** y aplican a
   todo lo que se disponga bajo ella, el modelo está en el nivel equivocado — y eso explicaría por
   qué tantas unidades lo tienen vacío, que es el origen de que la misma unidad se vea 🟢 y ⚫.
   → Ver [`01-DOMINIO.md` §7.1](01-DOMINIO.md#71-️-unidad-sin-días-de-gracia-configurados--🟢-o-)

---

## 4 · Cómo se conectaría, por orden de realismo

### 4.1 · Exportación programada del DMS ← **el camino recomendado**

W32 documenta **exportación de datos a múltiples formatos** y un **desarrollador de consultas**
para generar reportes y estadísticas a medida. Ese es el enganche: la agencia programa una
consulta, el archivo cae en un sitio acordado, nosotros lo ingerimos.

**Su virtud principal no es técnica, es política: no requiere permiso de nadie más que del
cliente.** Son sus datos y su propio reporte. No hay que negociar con el proveedor del DMS, no
hay que esperar su calendario y no hay que explicarle a un competidor potencial qué estamos
haciendo.

### 4.2 · Lectura directa de la base de datos, en solo lectura

El linaje del producto es Windows de escritorio —*W32* es literalmente Win32—. Si la instalación
es en sitio con un motor SQL detrás, una vista de solo lectura es técnicamente trivial.

Depende de dos cosas que no sabemos: si es instalación local u hospedada, y de quién administra
la infraestructura en la agencia.

### 4.3 · Integración formal con el proveedor del DMS

W32 declara **capacidad de integrarse con otros sistemas y software de gestión ya en uso**, pero
**no publica API, webservices ni especificación de integración**. Lo único documentado en esa
línea es integración XML para comprobación de gastos e integración nativa del módulo de
facturación.

Es una conversación comercial con un tercero, con su propio calendario y su propio interés — nos
puede ver como complemento o como amenaza. **No la pondría en la ruta crítica.**

### 4.4 · Captura manual

Es lo que ocurre hoy.

---

## 5 · La flexibilidad de integración — la variable que más pesa

**Cuál DMS usan importa menos que cuánto dejan leer.** Y esta no es una pregunta técnica: es
comercial y contractual, y hay un precedente que conviene conocer antes de apostar el producto a
ella.

### 5.1 · El precedente de Estados Unidos

CDK Global y Reynolds & Reynolds son los DMS de prácticamente todas las distribuidoras
estadounidenses. Los dos ofrecían históricamente sistemas **abiertos**: la agencia podía dar
acceso a sus datos a un tercero.

Según la demanda, **en 2013 acordaron restringir ese acceso para destruir a los integradores
independientes**, y en 2015 lo formalizaron por escrito comprometiéndose a no ayudar a ningún
integrador a acceder a sus sistemas. El resultado: los proveedores de software de terceros se
quedaron sin más opción que pagar la integración certificada del propio DMS, a un precio muy
superior.

Terminó en:

| | |
|---|---|
| **630 M USD** | Acuerdo con proveedores de software, aprobado en febrero de 2025. Cubre 243 empresas |
| **100 M USD** | Acuerdo con las propias distribuidoras, por bloquear a integradores rivales |

Hoy CDK opera **Fortellis**, un mercado de APIs con certificación obligatoria: cuota mensual de
listado, cargo único de desarrollo y **un cargo de alta por cada distribuidora**. La puerta existe,
pero es de peaje.

### 5.2 · Por qué esto nos importa aquí

México no es ese mercado y no hay litigio conocido. Pero la estructura es la misma: **W32 está
certificado por las armadoras**, que es una posición de guardián equivalente aunque se haya llegado
a ella por otro camino. Y de ahí salen tres consecuencias:

1. **El camino que no depende del proveedor es el único robusto.** La exportación programada
   (§4.1) no es solo el más barato: es el que **no puede cerrarse por decisión comercial de un
   tercero**. Esa propiedad vale más que la comodidad de un API.
2. **Si la integración se paga por distribuidora, es costo variable por cliente.** Eso entra
   directamente en el modelo de ingresos, que sigue pendiente desde el día 5. Un cargo de alta por
   agencia × 900 agencias no es un detalle de implementación: es una línea del margen.
3. **El contrato de la agencia con su DMS puede prohibirle dar acceso a un tercero**, aunque los
   datos sean suyos. Es exactamente lo que se litigó allá. Conviene mirar un contrato real antes de
   dar por hecho que basta con el permiso del cliente.

### 5.3 · Cómo medir la apertura de un DMS

Seis preguntas que sitúan a cualquiera de ellos en el espectro. Sirven tanto para elegir con quién
integrarse primero como para saber qué esperar:

| # | Pregunta | Por qué discrimina |
|---|---|---|
| 1 | ¿Instalación **en sitio** o en la nube del proveedor? | En sitio, el acceso a la base es negociable con la agencia. En la nube, el proveedor es el único portero |
| 2 | ¿La agencia puede **programar exportaciones** por su cuenta? | Es la vía que no depende de nadie más. W32 documenta exportador y desarrollador de consultas |
| 3 | ¿Hay **API publicada**, y con qué modelo de cobro? | Distingue «abierto» de «abierto de pago». W32 no publica; CDK cobra |
| 4 | ¿Existe **programa de certificación** de terceros, con qué costo y plazo? | Determina si integrarse es un proyecto o un trámite |
| 5 | ¿El **contrato** de la agencia le permite dar acceso a un tercero? | El punto ciego. Puede bloquear todo lo demás |
| 6 | ¿El proveedor ha **bloqueado integraciones** antes? | Predice cómo se comportará cuando seamos relevantes |

> **Conclusión operativa:** diseñar para el camino 4.1 —exportación que la agencia controla— y
> tratar cualquier API como un adaptador adicional, nunca como el supuesto de partida. Es la misma
> decisión que ya tomaba [`10` §5](10-ARQUITECTURA-OBJETIVO.md), ahora con una razón de peso que no
> es técnica.

---

## 6 · Sincronización: por qué plan piso es la integración fácil

La forma de la integración importa más que el volumen, y aquí la forma es favorable:

| Propiedad | Plan piso | Asistente de ventas |
|---|---|---|
| **Dirección** | Una sola: DMS → Automind. No hace falta escribir de vuelta — el DMS ya sabe cuándo se vendió | **Bidireccional**: la cartera de clientes vive en los dos lados |
| **Campos** | Ocho o diez. No es sincronizar el sistema, es leer una lista | Expediente completo, decenas de campos, con documentos |
| **Frecuencia** | **Diaria basta.** El semáforo cambia con el calendario, no con el minuto | Cuasi tiempo real: un vendedor no puede trabajar con datos de ayer |
| **Conflictos** | **Ninguno**: solo un lado escribe | Resolución de conflictos obligatoria |
| **Si falla un día** | Se reintenta. Nadie se entera | Se pierde trabajo comercial |

> **Es un argumento directo sobre el alcance:** plan piso es el módulo con la integración más
> barata del producto, y el asistente el más caro. Empezar por plan piso no es solo empezar por lo
> diferenciado — es empezar por lo que técnicamente se puede conectar.

### Qué se sigue duplicando y qué no

- **Lado del DMS:** con la exportación programada, la duplicación desaparece. El dato del vehículo
  entra solo.
- **Lado de la financiera:** mientras no haya salida de datos del portal, la captura se queda. Pero
  pasa de ser *todo* el trabajo a ser *la mitad* — y sobre campos que **se fijan al disponer la
  unidad y no vuelven a moverse**. Es captura una vez por unidad, no mantenimiento continuo.
- **Hoy:** se duplica todo y a mano. El MVP no tiene **ninguna** vía de entrada de datos: las ocho
  integraciones existentes son de salida (correo, Telegram, WhatsApp, IA, verificación de
  teléfono). El único camino de entrada es que una persona suba un Excel.

---

## 7 · Consecuencias para la arquitectura

Refuerza y precisa lo que [`10-ARQUITECTURA-OBJETIVO.md` §5](10-ARQUITECTURA-OBJETIVO.md) ya
decidía:

| # | Consecuencia |
|---|---|
| **I3** | **La ingesta por archivo es el camino de primera clase**, no el respaldo del API que quizá no exista. Queda verificado contra un DMS real |
| **I4** | **Convivencia confirmada**: el DMS es el sistema de registro del inventario; Automind es la capa que vigila el reloj |
| Nuevo | **Dos fuentes, no una.** El modelo debe admitir que el vehículo y sus condiciones de financiamiento lleguen por caminos distintos, en momentos distintos, y que una unidad exista sin condiciones todavía |
| Nuevo | **Las condiciones de financiamiento probablemente cuelgan del contrato, no de la unidad.** A confirmar — pero si es así, `contrato de financiamiento` es una entidad del modelo |

---

## 8 · Qué bloquea de verdad la apertura del DMS

La apertura de los DMS es un bloqueante. Pero **no bloquea la arquitectura: bloquea el modelo de
negocio y la escala** — y eso es más serio, no menos. Conviene tenerlo separado para no detener
trabajo que sí puede avanzar.

### 8.1 · Lo que no bloquea

El stack · el paquete de dominio con el semáforo y sus 23 vectores · el aislamiento entre clientes
· las migraciones y la CI · la autenticación · el trabajo diario particionado · la cadena de
alertas · la interfaz de plan piso.

**Nada de eso cambia según lo abierto que sea W32**, y la razón es que
[`10` §5](10-ARQUITECTURA-OBJETIVO.md) ya asumió el peor caso: **ingesta por archivo como camino de
primera clase**, con adaptadores detrás de un contrato propio. Esa decisión dejó la arquitectura
aislada del problema antes de conocerlo.

### 8.2 · Lo que sí bloquea, y no tiene sustituto

| Qué | Por qué no hay forma de rodearlo |
|---|---|
| **El costo de dar de alta a cada agencia** | Si cada instalación exige un proyecto de integración a medida, **900 agencias no es un objetivo de producto: es una empresa de servicios**. Aquí se decide si el negocio escala como supone la meta |
| **El modelo de ingresos** | Si el acceso se cobra por distribuidora, es **costo variable por cliente**. No se puede fijar precio sin saberlo |
| **La promesa comercial** | «No captures dos veces» solo se puede prometer si se puede leer el dato |
| **Con qué DMS empezar** | Es decisión de mercado, no técnica: se integra primero con el que más aparezca y más deje leer |

### 8.3 · La segunda mitad es peor que la primera

Ordenado por gravedad real:

| # | Bloqueante | Estado |
|---|---|---|
| **1** | **Acceso al dato de la financiera** — días de gracia, tasa, monto financiado | **Gobierna el semáforo y no tiene ninguna ruta conocida.** Portales de distribuidor y nada más. Lo más probable es que se quede en captura manual — tolerable, porque el dato **se fija al disponer la unidad y no vuelve a moverse** |
| **2** | **Acceso al dato del DMS** — vehículo, fecha de factura, estado | Hay tres rutas posibles (§4), pero con un **guardián comercial** en medio (§5) |
| **3** | Todo lo demás | Resuelto, o aislado por diseño |

> **Por eso los dos archivos de ejemplo que pide [`11` P2](11-CUESTIONARIO-PRODUCTO.md) valen más
> que cualquier respuesta conceptual: convierten los dos bloqueantes en algo verificable en una
> tarde.**

---

## 9 · Lo que falta por verificar

| Pregunta | A quién | Por qué importa |
|---|---|---|
| ¿Podemos ver un **reporte de inventario exportado** de una agencia que use W32? | Ricardo / una agencia piloto | Sin un archivo real, el diseño de la ingesta es especulación |
| ¿Y el **documento de la financiera** con las condiciones del plan piso? | Idem | Es la mitad que el DMS no tiene |
| ¿Días de gracia y tasa son **por unidad o por línea de crédito**? | Ricardo | Cambia el modelo de datos y puede explicar la ambigüedad 7.1 |
| ¿Qué DMS aparecen de verdad en las agencias con las que se ha hablado? | Ricardo / Jhonatan | Ordena la cola de adaptadores |
| **¿La armadora o su financiera cautiva pueden ser fuente de datos?** | Ricardo | En marcas con cautiva, un solo interlocutor tendría **las dos mitades** (§1.2). Palanca a futuro, no atajo de arranque |
| **¿Conviene entrar por una marca en vez de por número de agencias?** | Ricardo / Alan | Una red de marca es un objetivo homogéneo: mismo DMS, misma cautiva, mismo formato (§1.2) |
| ¿Sigue vigente el esquema de estandarización de DMS por armadora que describe §1.1? | Ricardo | La fuente es de 2017 y no es oficial. Él lo confirma o lo descarta en un minuto |
| ¿W32 tiene API o especificación de integración no publicada? | Al proveedor, si procede | Podría simplificar 4.1 — pero no está en la ruta crítica |
| ¿Qué hace **Saccsa** exactamente? | Investigación propia | Es lo más cercano a un competidor directo encontrado |

---

## Fuentes

Consultadas el 12 de agosto de 2026. Material comercial, no documentación técnica.

- [MultiMarcaW32 — sitio](https://w32.mx/sitio/) · [Módulos](https://w32.mx/sitio/modulos) ·
  [DMS integral](https://w32.mx/sitio/multimarcaw32es-el-dms-integral-para-tu-concesionaria) ·
  [Ventajas](https://w32.mx/sitio/ventajas-unicas-de-multimarca-w32-tecnologia-que-potencia-tu-concesionaria)
- [Global Dealer Solution](https://www.gdsdms.com/) · [TotalDealer](https://www.totaldealer.com.mx/) ·
  [Agilistas DMS](https://agilistas.mx/dms-agencias-autos-seminuevos/)
- [Saccsa — software de tesorería para agencia de autos](https://saccsa.com.mx/blog/software-tesoreria-agencia-autos/)
- ⚠️ [«Sistema (DMS)» — blog de proyecto escolar, abril 2017](https://equipodinamitaadministracion.blogspot.com/2017/04/sistema-dms.html) —
  **fuente única y no oficial** de §1.1. Ver las salvedades allí antes de usarla
- Precedente de acceso a datos en EE. UU.: [acuerdo de 630 M USD con proveedores](https://www.autonews.com/retail/an-cdk-class-action-settlement-agreement/) ·
  [acuerdo de 100 M USD con distribuidoras](https://www.repairerdrivennews.com/2024/08/21/cdk-agrees-to-100m-settlement-in-dealership-class-action-anti-trust-suit/) ·
  [Fortellis — mercado de APIs de CDK](https://www.cdkglobal.com/cdk-global-api-solutions)
- Financieras de plan piso: [Scotiabank](https://www.scotiabank.com.mx/empresas-y-gobierno/creditos/plan-piso.aspx) ·
  [BBVA](https://www.bbva.mx/empresas/productos/financiamiento/servicios-especializados/plan-piso.html) ·
  [Banorte](https://www.banorte.com/Empresas/Financiamiento/Plan-Piso-Auto.html) ·
  [DLL](https://www.dllgroup.com/mx/es-mx/solutions/financiamiento-para-plan-piso) ·
  [NAFIN](https://www.gob.mx/nafin/acciones-y-programas/financiamiento-para-distribuidores-automotrices-plan-piso)

**Internas:** [10 · Arquitectura objetivo](10-ARQUITECTURA-OBJETIVO.md) §5 ·
[11 · Cuestionario](11-CUESTIONARIO-PRODUCTO.md) · reporte del día 6 · [01 · Dominio](01-DOMINIO.md) §7.1

---

*Documento de elaboración propia. Jose Santiago · Full Stack Lead · 12 de agosto de 2026.*
