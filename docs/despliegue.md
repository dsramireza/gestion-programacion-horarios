# Despliegue y conexión

## Proyectos

- Repositorio privado: `dsramireza/gestion-programacion-horarios`.
- Vercel: `gestion-programacion-horarios`, dentro de `daram1025s-projects`.
- Supabase: `gestion-programacion-horarios`, referencia `xjwjcayjdyjrwtsxiefk`, dentro de «daram1025's projects», región `us-east-1`, plan gratuito.

Se utiliza una sola base de datos Supabase. La aplicación local, las previews y producción comparten ese proyecto. Las categorías Production, Preview y Development de Vercel solo asignan configuración a sus tipos de ejecución; no implican bases ni proyectos adicionales.

## Configuración de Vercel

| Opción | Valor |
| --- | --- |
| Framework | Next.js |
| Root Directory | Raíz del repositorio |
| Node.js | 24.x |
| Install Command | Automático de Vercel para npm |
| Build Command | `npm run build` |
| Output Directory | Automático de Next.js |
| Production Branch | `main` |
| Despliegues Git | Habilitados para todas las ramas |

Un push a una rama de trabajo genera una preview. Un PR aprobado e integrado en `main` genera un build de producción y publica la versión si tiene éxito. Los despliegues los realiza Vercel mediante su integración de GitHub; no hay un workflow de GitHub Actions, PR Gate ni umbral de pruebas o cobertura.

La configuración necesaria en GitHub es que la aplicación de Vercel tenga acceso al repositorio y que este esté vinculado al proyecto Vercel. La revisión y el merge de PR continúan a cargo del equipo, conforme a `AGENTS.md`.

## Variables

Estas dos variables apuntan al mismo proyecto en Production, Preview y Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

La clave publicable es la destinada al cliente y requiere que las tablas futuras tengan sus permisos y RLS. Las claves administrativas no se necesitan para esta base inicial y no deben añadirse como variables públicas.

En un clon nuevo, copia `.env.example` a `.env.local` y completa los dos valores desde el proyecto Supabase. Si utilizas la CLI de Vercel, puedes vincular este proyecto y obtener su configuración con `vercel link` y `vercel env pull .env.local`. `.env.local` y `.vercel/` están excluidos de Git.

## Ejecución local

Requiere Node.js 24 y npm:

```sh
npm install
npm run dev
```

La aplicación queda en `http://localhost:3000`. Para compilar localmente, usa `npm run build`; para servir ese build, `npm start`. Conserva en Git el `package-lock.json` generado al instalar las dependencias.

## Comprobación del despliegue

La página `/` muestra el inicio del proyecto y `/api/health` devuelve un JSON con `status: "ok"`. Este endpoint comprueba la respuesta del backend de la aplicación; no ejecuta consultas a la base de datos.

Revisa en Vercel que el despliegue esté `Ready`, que corresponda al commit esperado y que sus logs de build no muestren errores. Comprueba el endpoint y la página para la preview, y repite la comprobación de producción después del merge del PR.

La primera comprobación SQL de Supabase se realiza por separado. El esquema académico y la autenticación se implementan en las HUs correspondientes. Las migraciones SQL se versionan y se aplican de forma controlada; el build no reinicia, puebla ni migra automáticamente la base.
