# Análisis del MVP — Paquete de especificación para v2

Cuatro documentos que capturan el conocimiento del MVP de **Automind · Plan Piso** para
reconstruirlo desde cero. Escritos en agosto de 2026, sobre el estado del repositorio en el
commit `e777aa2` y sobre el proyecto Supabase `wjdntftoyqkkycaozlhn`.

## Por dónde empezar

| Si quieres… | Lee |
|---|---|
| Entender el negocio y poder hablar con la agencia | [01 · Dominio](01-DOMINIO.md) |
| Saber qué hace el producto hoy y qué debe existir en v2 | [02 · Features](02-MVP-FEATURES.md) |
| Entender qué falló y por qué, para no repetirlo | [03 · Lecciones](03-LECCIONES-DEL-MVP.md) |
| Decidir stack, infraestructura y estrategia de datos | [04 · Requisitos v2](04-REQUISITOS-V2.md) |
| **Levantar el MVP en tu máquina y meterle mano** | [05 · Entorno local](05-ENTORNO-LOCAL.md) |
| **Saber qué archivos se pueden borrar y cuáles no** | [06 · Limpieza](06-LIMPIEZA.md) |

Cada documento abre con un **TL;DR ejecutivo** sin jerga (media página) y sigue con el cuerpo
técnico. Dirección puede leer solo los cuatro resúmenes.

## Los documentos

### [01 · Dominio de negocio](01-DOMINIO.md)
Qué es el "plan piso", glosario operativo, y **el semáforo como especificación ejecutable**
con vectores de prueba listos para convertirse en tu primera test suite. Incluye el modelo de
información agnóstico de proveedor y **cuatro ambigüedades del dominio que requieren tu
decisión**.

### [02 · Features del MVP](02-MVP-FEATURES.md)
Inventario módulo por módulo con doble veredicto: estado actual y recomendación para v2.
Matriz de permisos por rol, las dos rutas funcionales completas, código muerto, e integraciones
reales con su estado verificado. Termina en un **checklist de paridad**.

### [03 · Lecciones del MVP](03-LECCIONES-DEL-MVP.md)
Ocho lecciones, cada una con evidencia y el requisito que genera. Incluye una sección explícita
de **lo que se hizo bien** — es el listón que v2 no debería bajar — y lo que no pude verificar.

### [04 · Requisitos para v2](04-REQUISITOS-V2.md)
Requisitos independientes de tecnología, tres decisiones de producto que anteceden al stack,
una **recomendación de arquitectura argumentada y descartable**, estrategia de datos y orden
de construcción.

### [05 · Entorno local](05-ENTORNO-LOCAL.md)
Manual del entorno montado sobre `develop`: puertos, cuentas de los seis roles, comandos del
día a día, qué unidades del seed exponen cada comportamiento, y **qué quedó pendiente**.
El proyecto está desvinculado de producción — nada de lo que hagas ahí puede alcanzarla.

### [06 · Limpieza del repositorio](06-LIMPIEZA.md)
Análisis de riesgo archivo por archivo: qué se borra hoy sin consecuencias, qué exige revisión
previa y qué no se toca. Con el hallazgo que condiciona todo — **la línea base no capturó el
storage ni el cron**, así que tres `.sql` contienen información que no existe en ningún otro sitio.

## Los cinco hallazgos que más pesan

1. **El semáforo está implementado 7 veces y las copias divergieron.** La misma unidad se ve
   🟢 al iniciar sesión y ⚫ al recargar. → [03 §1](03-LECCIONES-DEL-MVP.md#lección-1--la-regla-de-negocio-duplicada)
2. **`workspaces` tiene RLS desactivada en producción** (confirmado por el Security Advisor:
   2 errores, 39 advertencias). Las políticas correctas existen en el repositorio pero están
   inertes. **Descartado lo peor:** `users` y `clientes` sí tienen RLS activa — no hay PII
   expuesta. **Encontrado de paso:** el INSERT de `alert_log` acepta a cualquier usuario
   autenticado, y su arreglo *ya estaba escrito y commiteado* en `supabase_fixes_v3.sql` sin
   haber llegado nunca a producción.
   → [03 §2](03-LECCIONES-DEL-MVP.md#lección-2--el-aislamiento-entre-clientes-no-era-verificable)
   · correcciones en [`supabase_fix_rls_workspaces.sql`](../supabase_fix_rls_workspaces.sql)
3. **~90 archivos SQL sueltos**: el estado de la base de datos no es reproducible. → [03 §3](03-LECCIONES-DEL-MVP.md#lección-3--el-estado-de-la-base-de-datos-no-es-reproducible)
4. **No hay que migrar datos.** Sin clientes activos, eres libre de elegir la arquitectura
   correcta en lugar de la compatible. → [04 §4](04-REQUISITOS-V2.md#4-estrategia-de-datos)
5. **Cinco activos de conocimiento merecen rescate**, y ninguno es código: los prompts de
   extracción (195 líneas, 19 commits de afinado), los sinónimos de columnas de Excel, las
   plantillas de mensajes, el sistema de diseño y la especificación del semáforo. → [04 §4.3](04-REQUISITOS-V2.md#43-lo-que-sí-vale-la-pena-rescatar)

## Advertencia sobre la documentación anterior

`CLAUDE.md`, `README.md` y `DEPLOY.md` de la raíz **están desactualizados y en varios puntos
son incorrectos** — proveedor de IA, nombres de secretos, qué archivos se despliegan, dónde
está el hosting. Donde contradigan a estos documentos, estos tienen razón. El detalle está en
[03 §5](03-LECCIONES-DEL-MVP.md#lección-5--la-documentación-contradice-al-código).

## Cómo se verificó

Lectura completa de `db.js` y `app.jsx`, pasajes verificados de los 18 `.jsx` restantes y las
9 Edge Functions, comparación con `diff` de las copias duplicadas, análisis de 324 commits, y
**sondeo de solo lectura contra producción** (existencia de tablas, estructura de `workspaces`,
exposición del bucket de documentos, y comprobación HTTP de las URLs de respaldo). Ninguna
escritura.

Cada afirmación técnica lleva referencia a `archivo:línea` o al sondeo que la produjo.
