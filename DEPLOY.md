# Automind · Guía de despliegue a producción

**Stack:** Supabase (base de datos + auth) · GitHub Pages (hosting estático)
**Tiempo estimado:** 30–45 minutos la primera vez.

---

## Parte 1 — Configurar Supabase

### 1.1 Crear cuenta y proyecto

1. Ve a [supabase.com](https://supabase.com) → **Start your project** → crea una cuenta gratuita.
2. Haz clic en **New project**.
3. Elige un nombre (ej. `automind-planpiso`), una contraseña fuerte para la DB, y la región **US East** o **South America**.
4. Espera ~2 minutos a que el proyecto arranque.

### 1.2 Crear las tablas

1. En el panel de Supabase, ve a **SQL Editor** → **New query**.
2. Copia y pega todo el contenido del archivo `supabase_schema.sql`.
3. Haz clic en **Run** (▶). Deberías ver "Success. No rows returned".

Esto crea:
- Tabla `agencies` — configuración de cada agencia
- Tabla `users` — vendedores, gerentes y directores
- Tabla `inventario` — los vehículos en piso
- Row Level Security (RLS) — cada usuario sólo ve los datos de su agencia

### 1.3 Obtener las credenciales

1. Ve a **Settings** (rueda dentada, columna izquierda) → **API**.
2. Copia:
   - **Project URL** (algo como `https://abcxyz.supabase.co`)
   - **anon public** key (cadena larga)
3. Abre el archivo `config.js` en tu carpeta Automind y reemplaza los valores:

```js
window.SUPABASE_URL  = "https://TU_PROYECTO.supabase.co";   // ← pega aquí
window.SUPABASE_ANON = "TU_ANON_KEY_AQUI";                  // ← pega aquí
```

---

## Parte 2 — Crear los usuarios en Supabase Auth

Cada persona que va a usar la plataforma necesita una cuenta en Supabase Auth.

### 2.1 Invitar usuarios

1. En Supabase ve a **Authentication** → **Users** → **Invite user**.
2. Ingresa el correo de cada colaborador y haz clic en **Send invite**.
3. El usuario recibirá un correo para establecer su contraseña.

> Repite esto para el director, gerentes y vendedores de cada agencia.

### 2.2 Vincular Auth con la tabla `users`

Después de que cada usuario acepte la invitación, necesitas conectar su cuenta Auth con su registro en la tabla `users`.

1. En **Authentication → Users**, haz clic en el usuario y copia su **UUID** (columna User UID).
2. Ve a **Table Editor → users**.
3. Encuentra la fila del usuario (por email) y edita la columna `auth_user_id`, pegando el UUID.

> Esto le dice al sistema "este email de Auth corresponde a este colaborador de esta agencia".

---

## Parte 3 — Publicar en GitHub Pages

### 3.1 Crear una cuenta GitHub (si no tienes)

1. Ve a [github.com](https://github.com) → **Sign up** → crea una cuenta gratuita.

### 3.2 Crear el repositorio

1. En GitHub, haz clic en el ícono **+** (arriba a la derecha) → **New repository**.
2. Nombre: `automind-planpiso` (o el que prefieras).
3. Visibilidad: **Private** (recomendado para no exponer el código).
4. Haz clic en **Create repository**.

### 3.3 Subir los archivos

La forma más sencilla es usar la interfaz web de GitHub:

1. En la página del repositorio vacío, haz clic en **uploading an existing file**.
2. Arrastra **todos** los archivos de tu carpeta `automind-git`:
   - `index.html`
   - `config.js`
   - `db.js`
   - `login.jsx`
   - `tweaks-panel.jsx`
   - `components.jsx`
   - `charts.jsx`
   - `dashboard.jsx`
   - `database.jsx`
   - `import.jsx`
   - `colaboradores.jsx`
   - `inventario-editor.jsx`
   - `financieras.jsx`
   - `usuarios.jsx`
   - `alertas.jsx`
   - `workspace-selector.jsx`
   - `app.jsx`
3. En la parte inferior escribe un mensaje como `"Primera versión"` y haz clic en **Commit changes**.

> GitHub Pages sirve `index.html` por defecto, así que no hace falta renombrar nada.
> Los archivos `.sql` y `.ts` no son necesarios para el sitio: los `.sql` se ejecutan
> en el SQL Editor de Supabase y los `.ts` se despliegan como Edge Functions.

### 3.5 Activar GitHub Pages

1. En el repositorio, ve a **Settings** → **Pages** (columna izquierda).
2. En **Source**, selecciona **Deploy from a branch**.
3. Branch: **main** · Folder: **/ (root)**.
4. Haz clic en **Save**.
5. Espera 1–2 minutos. Aparecerá una URL del tipo:
   ```
   https://tuusuario.github.io/automind-planpiso/
   ```

### 3.6 Probar

Abre la URL en el navegador. Deberías ver la pantalla de login de Automind. Prueba con uno de los usuarios que creaste en el paso 2.

---

## Parte 4 — Dominio personalizado (opcional)

Si quieres una URL como `planpiso.tuagencia.mx`:

1. Compra el dominio en cualquier registrador (GoDaddy, Namecheap, Hostinger).
2. En **Settings → Pages → Custom domain**, escribe tu dominio.
3. En tu registrador, crea un registro **CNAME** apuntando a `tuusuario.github.io`.
4. GitHub activará HTTPS automáticamente en ~10 minutos.

---

## Referencia rápida: actualizaciones futuras

Cuando hagas cambios en los archivos locales y quieras publicarlos:

1. En tu repositorio de GitHub, haz clic en el archivo modificado.
2. Haz clic en el ícono de lápiz → pega el nuevo contenido → **Commit changes**.
3. GitHub Pages se actualiza automáticamente en ~1 minuto.

> **Importante — cache-busting:** los scripts en `index.html` se cargan con un sufijo de
> versión (`?v=20260618`). Si editas cualquier `.jsx`/`.js`, **sube también el número de
> versión** (p. ej. a la fecha del día: `?v=20260619`) en TODAS las líneas de `index.html`.
> Eso obliga al navegador a descargar la versión nueva en vez de servir la vieja desde caché
> — es la razón #1 por la que "subo cambios y no se ven". Si no lo bumpeas, el cambio igual
> aparece, pero puede tardar hasta 10 min y requerir Ctrl+Shift+R.

> **Tip:** Para cambios frecuentes, considera instalar [GitHub Desktop](https://desktop.github.com/) — es una app visual que simplifica subir cambios sin usar línea de comandos.

---

## Solución de problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla en blanco al cargar | Error en config.js | Verifica que SUPABASE_URL y SUPABASE_ANON estén correctos |
| "Correo o contraseña incorrectos" | Usuario no vinculado | Revisa que `auth_user_id` esté lleno en la tabla `users` |
| Login carga pero no muestra datos | RLS bloqueando | Verifica que el registro en `users` tenga el `auth_user_id` correcto |
| Los cambios no aparecen en producción | Cache del navegador | Abre en ventana de incógnito o fuerza recarga con Ctrl+Shift+R |
