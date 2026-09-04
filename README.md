# Seguimiento de Dieta

App mobile-first, multiusuario, para subir tu dieta mensual (PDF, Excel o
CSV), organizarla en un calendario de comidas y recibir un aviso push antes
de cada una — aunque la app esté cerrada.

## Cómo funciona

- **Cuentas**: cada persona crea su propia cuenta (email y contraseña) desde
  la app y ve únicamente su propia dieta, su calendario y sus propios avisos
  — los datos de cada usuario están completamente separados de los demás.
- **Subir dieta**: cargás un archivo con columnas `Día | Comida | Alimento | Horario`
  (CSV o Excel; también acepta PDF con parseo best-effort). La app arma un
  calendario mensual y te muestra una vista previa editable ("Así interpretamos
  tu dieta") antes de guardar nada.
- **Hoy**: las comidas del día, en orden, con botones Comido / Salteado (o
  deslizando la tarjeta hacia la derecha/izquierda). Después de marcar una,
  aparece un cartel con "Deshacer" por si te equivocaste.
- **Calendario**: vista mes o semana; tocás un día para editar una comida
  puntual sin afectar el resto del mes. También arma una **lista de
  compras** a partir de las comidas del período visible.
- **Estadísticas**: adherencia semanal y mensual.
- **Notificaciones**: un aviso push real (llega aunque la app esté cerrada)
  antes de cada comida, con acciones rápidas Comido / Posponer 15 min /
  Saltear. El tiempo de anticipación es configurable por tipo de comida, y
  se calculan en el huso horario de cada usuario (detectado automáticamente
  del dispositivo).

## Arquitectura

- **Frontend**: React + TypeScript + Vite + Tailwind, PWA (Service Worker vía
  `vite-plugin-pwa`). Sin backend propio: habla directo con Supabase.
- **Backend**: [Supabase](https://supabase.com) (Postgres + Edge Functions +
  `pg_cron`). Una función programada corre cada minuto, busca las comidas
  cuyo aviso corresponde enviar y manda un Web Push (VAPID) a los dispositivos
  suscriptos.
- **Multiusuario con Supabase Auth**: el login es con email y contraseña.
  Cada tabla (`meals`, `notification_settings`, `push_subscriptions`) tiene
  una columna `user_id` y policies de Postgres que solo dejan ver/editar las
  filas propias (`auth.uid() = user_id`) — cualquiera puede crear una cuenta
  y usar la app, pero nadie ve los datos de otra persona.

## Puesta en marcha

### 1. Instalar y correr en local

```bash
bun install
cp .env.example .env.local   # completar después de crear el proyecto Supabase (paso 2)
bun dev
```

Sin las variables de Supabase configuradas, la app levanta igual pero las
pantallas muestran error al cargar datos — es esperable hasta el paso 2.

### 2. Crear el proyecto de Supabase

1. Creá una cuenta gratis en [supabase.com](https://supabase.com) y un
   proyecto nuevo.
2. En **SQL Editor**, pegá y ejecutá en orden el contenido de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   [`supabase/migrations/0003_multiuser.sql`](supabase/migrations/0003_multiuser.sql)
   y [`supabase/migrations/0004_user_timezone.sql`](supabase/migrations/0004_user_timezone.sql).
   Esto crea las tablas `meals`, `notification_settings`,
   `push_subscriptions` y `user_profiles`, con `user_id` y policies por
   usuario.
3. En **Project Settings → API**, copiá `Project URL` y la clave `anon
   public`, y completá `.env.local`:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=ey...
   ```
4. (Opcional) En **Authentication → Sign In / Providers → Email**, podés
   desactivar "Confirm email" para que una cuenta nueva quede activa al
   toque sin tener que confirmar por mail — útil si la app la va a usar
   poca gente de confianza (familia/amigos).

### 3. Generar las claves VAPID (para el push)

```bash
npx web-push generate-vapid-keys
```

Guardá las dos claves que imprime. La pública va también en `.env.local`:

```
VITE_VAPID_PUBLIC_KEY=BN...
```

### 4. Desplegar la función de notificaciones

**Con la Supabase CLI** ([instalación](https://supabase.com/docs/guides/cli)):

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set VAPID_PUBLIC_KEY=BN... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@email.com
supabase functions deploy send-due-notifications --no-verify-jwt
```

**O sin CLI, desde el dashboard**: subí el contenido de
[`supabase/functions/send-due-notifications/index.ts`](supabase/functions/send-due-notifications/index.ts)
como una nueva Edge Function llamada `send-due-notifications` (Edge Functions →
Deploy a new function), con **"Verify JWT" desactivado**, y en
**Edge Functions → Secrets** cargá `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y
`VAPID_SUBJECT`.

(`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles
automáticamente dentro de la función, no hace falta configurarlos. Al
desactivar "Verify JWT" el cron no necesita llevar ninguna credencial —la
función solo procesa datos propios de la base, no recibe nada sensible en la
request.)

### 5. Programar el envío cada minuto

Abrí [`supabase/migrations/0002_cron.sql`](supabase/migrations/0002_cron.sql),
reemplazá `PROJECT_REF` (lo ves en la URL del proyecto o en Project Settings)
por el valor real, y ejecutalo en el **SQL Editor**.

### 6. Desplegar el frontend

Cualquier hosting está bien (Vercel, Netlify, Cloudflare Pages) — solo hace
falta **HTTPS**, que las notificaciones push lo requieren:

- Comando de build: `bun run build` (o `npm run build`)
- Carpeta de salida: `dist`
- Variables de entorno: las tres `VITE_*` de `.env.local`

### 7. Crear tu cuenta y activar los avisos

Abrí la app desplegada desde el celular. La primera vez te va a pedir crear
una cuenta (email y contraseña) — cada persona que la use hace lo mismo y
tiene su propia dieta separada. Ya adentro, andá a **Configuración** y tocá
"Activar avisos antes de cada comida". Después subí tu dieta desde el ícono
de subir (arriba a la derecha) o la pantalla **Subir dieta**.

## Notas sobre el parseo de archivos

Hay dos formatos de dieta que la app entiende:

**Tabla** (CSV, Excel, o una tabla real dentro de un .docx): con columnas
reconocibles como "Día", "Comida", "Alimento" y "Horario", en cualquier
orden.
- La columna "Día" acepta: fecha explícita (`05/09`, `2026-09-05`), nombre de
  día de la semana (se repite en todas las ocurrencias de ese día en el mes
  elegido), número de día del mes, o "todos los días".

**Plan semanal en texto libre** (el formato más común en planes de
nutricionistas, y el que se usa automáticamente si un PDF o .docx no tiene
una tabla real): un encabezado de día ("LUNES:") seguido de líneas
"Comida: descripción" — por ejemplo:

```
LUNES:
Desayuno: café con leche, pan integral con queso
Colación: yogur con cereales
Almuerzo: pollo con ensalada
Merienda: licuado con fruta
Colación: frutos secos
Cena: pescado con verduras
```

En ambos formatos, "Comida" reconoce desayuno/almuerzo/merienda/cena y
variantes de colación ("colación", "snack"); si no aclara mañana/tarde, se
desambigua por el horario cuando está disponible, o por orden de aparición
(la primera colación del día es de mañana, la segunda de tarde). Líneas como
"Observación:" se ignoran.

El PDF es el formato más difícil de interpretar automáticamente — por eso
existe la pantalla de previsualización: siempre revisá el calendario antes
de confirmar.

**Word**: se admite `.docx` (lee la tabla si la tiene, o el texto libre si
no). El formato viejo `.doc` (Word 97-2003) no se puede leer directamente en
el navegador — la forma más simple es abrir el archivo, copiar todo el
texto (Ctrl+A, Ctrl+C) y usar la opción **"Pegar texto"** de la pantalla
"Subir dieta", que interpreta el mismo formato de texto libre.
