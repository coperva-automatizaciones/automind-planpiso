---
name: session-resume
description: Retoma la sesión de trabajo. Lee la bitácora, la contrasta contra el estado real del repositorio y del entorno local, y presenta un briefing listo para arrancar.
user-invocable: true
---

Briefing de reanudación. Sigue los pasos en orden. **Responde en español** — es la
convención del proyecto.

## 1. Estado guardado

Lee la última entrada de `.claude/sessions/BITACORA.md`. Si no existe, usa el archivo de
estado del proyecto en el directorio de memoria de esta sesión —se te indica al inicio;
**no hardcodees la ruta**.

La bitácora es **personal y no versionada** (`.claude/sessions/` está en el `.gitignore`):
en un clon nuevo no existe, y eso es normal, no un error.

Si no hay ninguna de las dos, dilo y pasa al paso 2: el briefing sale igual, solo que sin
la parte de contraste.

## 2. Realidad del repositorio

```
git branch --show-current
git log --oneline -5
git status --short
```

Contrasta contra lo guardado:

- ¿El historial refleja lo que la bitácora daba por hecho?
- ¿Hay cambios sin commitear que contradigan el cierre anterior?
- ¿Estás en la rama que la bitácora esperaba? Con `develop` y las ramas de trabajo en
  juego, es fácil arrancar en la equivocada.

## 3. Entorno local

```
docker info --format "{{.ServerVersion}}"
docker ps --filter "name=supabase_" --format "{{.Names}}"
```

- Si Docker no responde, avísalo: hay que abrir Docker Desktop antes de nada.
- Si Docker está pero no hay contenedores de Supabase, ofrece levantarlo con
  `npx supabase start`.
- Si el stack está arriba, recuerda que la app se sirve con `node tools\dev-server.mjs`
  en `http://localhost:3000`.

Si `node` no se reconoce, es el `PATH` heredado de una terminal vieja: hay que cerrar
VS Code por completo, no basta con recargar la ventana.

## 4. Pendientes vivos

Menciónalos solo si siguen abiertos — compruébalo, no los des por hechos:

- **Dos migraciones de seguridad sin aplicar a producción**
  (`supabase/migrations/*_fix_*.sql`). Cierran la fuga de RLS en `workspaces` y la
  bitácora de alertas falsificable.
- **Tres `.sql` de la raíz por convertir a migración**: `supabase_cron_setup.sql`,
  `supabase_crm_setup_completo.sql`, `supabase_e8_expediente.sql`. Contienen el storage y
  el cron, que el `db pull` no capturó.
- **Limpieza del repositorio** pendiente según [`docs/06-LIMPIEZA.md`](../../../docs/06-LIMPIEZA.md).

## 5. Briefing

Exactamente estas secciones, en este orden:

**Estado actual:** una frase — cómo está el proyecto ahora, combinando lo guardado con lo
que dice git y el entorno.

**Sesión anterior:** 2-3 viñetas de lo que se hizo.

**Discrepancias:** lo que no cuadre entre lo guardado y la realidad. **Omite esta sección
si todo coincide** — no la incluyas para decir que no hay nada.

**Entorno:** una línea sobre si está listo para trabajar o qué falta levantar.

**Siguiente paso:** la tarea concreta, lista para ejecutar.

---

Breve: el briefing debe leerse en menos de treinta segundos. El objetivo es volver al
trabajo, no repasar la historia del proyecto — para eso está `docs/`.
