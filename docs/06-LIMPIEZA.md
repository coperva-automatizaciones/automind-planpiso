# 06 · Limpieza del repositorio — análisis de riesgo

> Qué se puede borrar de `develop` sin consecuencias, qué conviene revisar antes, y qué no se
> toca. Nada de esto se ha ejecutado: es el análisis previo a la decisión.

---

## TL;DR

De los **69 archivos `.sql`** sueltos en la raíz (302 KB) y los **7 `.ts` duplicados**, la gran
mayoría se puede borrar hoy sin ningún efecto: la migración baseline ya captura el esquema real
de producción, y git conserva todo lo demás.

**Pero hay tres excepciones que importan.** La línea base se generó con `db pull`, que solo
extrae el esquema `public`. **No capturó el storage ni el cron.** Verificado:

```
storage.*        0 ocurrencias en la línea base
cron.schedule    0 ocurrencias
buckets          0 ocurrencias
```

Eso significa que `supabase_cron_setup.sql`, `supabase_crm_setup_completo.sql` y
`supabase_e8_expediente.sql` son **la única constancia** de cómo se programó el cron diario y de
cómo se creó el bucket `expedientes` con sus políticas. Borrarlos sin más pierde información que
no está en ningún otro lugar del repositorio.

---

## Cómo se calificó el riesgo

**Todo es recuperable desde git.** La pregunta útil no es «¿puedo deshacerlo?» —siempre— sino
«¿alguien va a necesitar esto en un momento en que rebuscar en el historial salga caro?».

| Nivel | Criterio |
|---|---|
| 🟢 **Sin riesgo** | Nada lo referencia, está superado por la línea base, y su ausencia no cambia el comportamiento de nada |
| 🟡 **Revisar antes** | Contiene conocimiento no capturado en otro sitio, o borrarlo exige una edición acompañante |
| 🔴 **No tocar** | Código vivo o activo real del proyecto |

---

## 🟢 Sin riesgo — se pueden borrar hoy

### Edge Functions duplicadas en la raíz · 7 archivos

**Borrarlas reduce riesgo en vez de añadirlo.** Ninguna se despliega: `supabase functions deploy`
solo lee `supabase/functions/<nombre>/index.ts`.

| Archivo | Estado |
|---|---|
| `send-alert.ts` | **Diverge** de la desplegada |
| `invite-user.ts` | **Diverge** |
| `extract-document.ts` | **Diverge** — usa `gpt-4o-mini`; la real usa `gpt-4o` |
| `send-telegram.ts` | **Diverge** |
| `delete-user.ts` | **Diverge** |
| `telegram-link.ts` | Idéntica — redundante |
| `telegram-webhook.ts` | Idéntica — redundante |

Las cinco divergentes están congeladas desde el 2026-07-27 y **son las que `CLAUDE.md` señala
como fuente de verdad**. Es una trampa activa: quien las edite creerá haber arreglado algo.

### Diagnóstico y pruebas · 4 archivos

No son migraciones, son consultas de depuración que se commitearon.

```
supabase_diagnostico2.sql
supabase_diagnostico_superadmin.sql
supabase_superadmin_diagnostico.sql
supabase_test_superadmin_perms.sql
```

> `supabase_test_superadmin_perms.sql` se menciona en un mensaje de consola de
> [db.js:1284](../db.js#L1284). Es una cadena de texto: borrar el archivo no rompe nada, solo
> deja el mensaje apuntando al vacío. Igual conviene borrar también la función
> `testSuperAdminPerms()` — **escribe y borra registros reales** para probar permisos.

### Mi propio archivo obsoleto · 1

`supabase_fix_rls_workspaces.sql` — ya reducido a un puntero. Las migraciones lo sustituyen.

### Migraciones históricas · ~55 archivos

El resto de los `supabase_*.sql`: incrementos, `fixes_v2/v3`, los siete `superadmin_*`, los
`e3`–`e8` del pipeline, los `add_*` y `drop_*`. **Todos superados por la línea base**, que refleja
el estado real de producción con más fidelidad que cualquier reconstrucción a partir de ellos.

Su único valor es explicar *por qué* se hicieron las cosas — y ese valor es real: el comentario
de `supabase_fixes_v3.sql` sobre `alert_log` fue lo que permitió el diagnóstico de esta semana.
Pero git lo conserva íntegro.

> **Recomendación:** bórralos en **un commit propio y aislado**, con un mensaje que diga
> explícitamente que la línea base los sustituye. Así recuperar cualquiera es un `git show` de
> un solo commit, no una arqueología.

---

## 🟡 Revisar antes de borrar

### 1. Los tres que contienen lo que la línea base no capturó

| Archivo | Qué contiene y no está en otro sitio |
|---|---|
| `supabase_cron_setup.sql` | El `cron.schedule(...)` del chequeo diario de semáforos. **Es la única receta** de cómo se programa el job que dispara la mayoría de las alertas |
| `supabase_crm_setup_completo.sql` | Creación del bucket de storage y sus políticas |
| `supabase_e8_expediente.sql` | Políticas de `storage.objects` para el expediente |

**Antes de borrarlos**, una de dos: convertir su contenido en una migración versionada, o
documentar el estado real (`SELECT * FROM cron.job;` y la configuración del bucket en el panel).
El storage y el cron son las dos piezas de la infraestructura que el `db pull` no ve.

### 2. `usuarios.jsx` — requiere edición acompañante

4 líneas, devuelve `null`, **pero sigue cargándose** en
[index.html:1123](../index.html#L1123). Borrarlo sin quitar esa línea deja un 404 en consola en
cada carga. Riesgo bajo, pero no es un borrado suelto: son dos cambios que van juntos.

### 3. `financieras.jsx` — decisión de producto, no técnica

392 líneas, excluido de `index.html` desde junio con un comentario explícito. Borrarlo no afecta
a nada en ejecución. Lo que conviene confirmar es si el módulo de financieras va a volver en v2 —
es la única implementación de referencia que existe.

### 4. Los tres `superadmin` con identidades reales

```
supabase_add_superadmin_pmo3.sql
supabase_add_superadmin_ricardo.sql
supabase_add_superadmins_all.sql
```

Contienen correos de personas concretas. **Doble motivo para borrarlos**: son historia superada
y son datos personales en un repositorio. Pero confirma antes que no sean la única constancia
de quién tiene acceso privilegiado a producción — eso debería vivir en la tabla `super_admins`,
no en un `.sql`.

### 5. Documentación que engaña activamente

No es limpieza de archivos, pero es la misma higiene y el riesgo es mayor: alguien las va a leer
y actuar en consecuencia.

| Archivo | Problema |
|---|---|
| `DEPLOY.md` | Describe un despliegue a GitHub Pages que ya no existe; **la URL responde 404**. Inservible de principio a fin |
| `README.md` | Dice que la IA es Anthropic (es OpenAI), y documenta nombres de secretos de WhatsApp que el código no lee |
| `CLAUDE.md` | No menciona el CRM (25 % del código), apunta a las Edge Functions de la raíz que no se despliegan, afirma que `financieras.jsx` sigue cargándose |

Borrarlas es preferible a dejarlas como están. Corregirlas es mejor que borrarlas — sobre todo
`CLAUDE.md`, si vas a trabajar con agentes en este repo antes de reemplazarlo.

---

## 🔴 No tocar

| Qué | Por qué |
|---|---|
| Los 18 `.jsx` / `.js` cargados en `index.html` | Código vivo |
| `index.html` · `config.js` | El shell y las credenciales |
| `supabase/functions/` (las 9) | **Estas sí se despliegan** |
| `supabase/migrations/` | La línea base y los arreglos |
| `supabase/seed.sql` · `supabase/config.toml` · `tools/` | El entorno local |
| `PRODUCT.md` · `DESIGN.md` · `.impeccable/` | Activos reales — documentación de producto de calidad, portable a v2 |
| `docs/` | Este paquete de análisis |

---

## Caso aparte: `supabase/.temp/`

Está en el `.gitignore` nuevo pero **ya venía trackeado**, así que git lo sigue siguiendo. No se
borra del disco —lo usa el CLI—, se destrackea:

```powershell
git rm -r --cached supabase/.temp
```

---

## Orden sugerido

Cuatro commits, del más seguro al que requiere decisión. Aislados para que cada uno se revierta
solo si hace falta.

| # | Commit | Contenido | Riesgo |
|---|---|---|---|
| 1 | `chore: eliminar Edge Functions duplicadas de la raíz` | Los 7 `.ts` | 🟢 Reduce riesgo |
| 2 | `chore: eliminar SQL de diagnóstico y pruebas` | Los 4 de depuración + el puntero obsoleto | 🟢 |
| 3 | `chore: eliminar SQL superados por la migración baseline` | Los ~55 restantes, **excepto los tres de storage/cron** | 🟢 Recuperable en un `git show` |
| 4 | `chore: destrackear supabase/.temp` | `git rm --cached` | 🟢 |

Fuera de esa tanda, y solo cuando decidas: los tres de storage/cron (tras convertirlos en
migración), `usuarios.jsx` con su línea de `index.html`, `financieras.jsx`, los tres de
superadmin con datos personales, y la documentación obsoleta.

**Resultado:** la raíz pasa de 69 `.sql` + 7 `.ts` sueltos a **3 `.sql`** en espera de
conversión, con todo el esquema viviendo donde debe — en `supabase/migrations/`.

---

## Una advertencia sobre el orden

Haz la limpieza **en `develop` y con `main` intacto**, y no la mezcles con los commits del
entorno local ni con los de documentación. Si algo resulta necesario después, quieres poder
señalar un commit y decir «ahí está», en vez de desenredarlo de un cambio que sí querías
conservar.

Y comprueba que el entorno local siga levantando (`npx supabase db reset`) después del commit 3:
es la verificación de que ningún `.sql` borrado era necesario para reconstruir la base. Si el
reset funciona, el borrado fue seguro — por definición.
