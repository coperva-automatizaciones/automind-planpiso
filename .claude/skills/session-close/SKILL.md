---
name: session-close
description: Cierra la sesión de trabajo. Revisa el estado del repositorio y del entorno, comprueba los invariantes de seguridad del proyecto, resume lo hecho, registra el estado y el siguiente paso en la bitácora, y actualiza la memoria.
user-invocable: true
---

Cierre limpio de sesión. Sigue los pasos en orden. **Responde en español** — es la
convención del proyecto.

> **Regla de orden:** los pasos 1 y 2 recogen todos los hechos. No escribas nada hasta
> tenerlos, o la bitácora saldrá incompleta.

## 1. Estado del repositorio

```
git branch --show-current
git status --short
git diff --stat
git log --oneline -3
```

Reporta la rama, los cambios sin commitear agrupados por propósito, y el último commit.

Si hay cambios sin commitear, **pregunta si quiere commitear antes de cerrar y espera la
respuesta.** No commitees por iniciativa propia.

## 2. Comprobaciones

Todas específicas de Automind · Plan Piso. Ejecútalas siempre, aunque no haya cambios, y
preséntalas juntas como un bloque de estado.

**a) `config.js` no debe estar modificado.** Es el archivo que se despliega a Vercel con
las credenciales de producción; el entorno local no lo toca — `tools/dev-server.mjs` lo
intercepta en memoria.

```
git diff --quiet -- config.js
```

Si devuelve cambios, **avísalo de forma destacada** y muestra el diff antes de continuar.

**b) Vinculación con producción.**

```
ls supabase/.temp/project-ref
```

Si existe, recuérdalo: `supabase db push` escribiría en la base real. El estado deseado es
desvinculado mientras el scope sea local.

**c) Migraciones pendientes.** Si hay archivos en `supabase/migrations/` sin aplicar a
producción, indícalo y aclara que siguen sin aplicarse.

**d) Archivos sin trackear.** Si `git status` muestra archivos o carpetas sin trackear,
**nómbralos y pregunta qué hacer con cada uno**: versionar, ignorar, o borrar. No los dejes
pasar en silencio — se arrastran de rama en rama y ensucian cada `git status` posterior.

**e) Entorno local.**

```
docker ps --filter "name=supabase_" --format "{{.Names}}"
curl -s -o /dev/null -m 3 -w "%{http_code}" http://localhost:3000/
```

Reporta si el stack y el servidor de desarrollo están arriba o abajo. **Es un hecho que va
en la bitácora**, no solo un dato de paso: saber cómo quedó el entorno ahorra tiempo al
retomar.

## 3. Qué se hizo en la sesión

A partir del historial de la conversación, en viñetas:

- Qué se decidió (arquitectura, enfoque, descartes y por qué)
- Qué se construyó o modificó realmente
- Qué problemas se resolvieron, y **cómo se verificaron** — en este proyecto la evidencia
  importa: `archivo:línea`, resultado de un sondeo, prueba en local

Nada de relleno. Si la sesión fue de lectura y análisis, dilo así.

## 4. Estado actual

Una frase clara sobre dónde está el proyecto ahora mismo.

## 5. Siguiente paso

La tarea concreta que sigue, accionable. Si hay varias, en orden de prioridad. Si algo
quedó bloqueado esperando una decisión, dilo explícitamente y de quién depende.

## 6. Bitácora

Añade una entrada al principio de `.claude/sessions/BITACORA.md` (créalo si no existe, más
reciente arriba):

```markdown
## AAAA-MM-DD · Título de la sesión

**Rama:** nombre · **Estado:** En curso | Cerrado · **Entorno:** arriba | apagado

- Viñetas de lo hecho

**Decisiones:** las que afectan trabajo futuro, con su porqué.
**Siguiente:** la tarea concreta.
```

Es documentación **efímera** y **personal**: `.claude/sessions/` está en el `.gitignore`,
así que cada quien tiene la suya. No va en `docs/`, que guarda el paquete de análisis
duradero, numerado y compartido.

## 7. Memoria

Actualiza el archivo de estado del proyecto en el directorio de memoria de esta sesión
—se te indica al inicio; **no hardcodees la ruta**— siguiendo la convención del entorno:
un hecho por archivo, con frontmatter.

**Actualiza el archivo existente en vez de crear uno nuevo cada sesión.** Si no existe,
créalo con `metadata.type: project` y añade su línea en `MEMORY.md`.

**Mantenlo corto: 25 líneas como máximo.** Es un archivo que se relee en cada sesión, no
un historial.

- **Poda antes de añadir.** Borra las decisiones que ya se ejecutaron o dejaron de aplicar.
- Máximo **seis decisiones vivas**. Si hay más, es que alguna ya no lo está.
- No dupliques lo que está en `docs/` ni en la bitácora: la memoria guarda el estado y los
  punteros, no el contenido.

## 8. Apagar el entorno

Si el paso 2e encontró contenedores corriendo, pregunta si quiere apagarlos con
`npx supabase stop` —consumen memoria entre sesiones— y aclara que **los datos persisten**:
al volver, `npx supabase start` recupera todo.

---

Tono conciso. Sin resumir lo obvio.
