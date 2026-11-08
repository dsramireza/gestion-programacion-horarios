# Acceso institucional — HU-01

La aplicación autentica con Supabase Auth mediante correo del dominio exacto `unbosque.edu.co` y contraseña. El registro público está deshabilitado. La cuenta necesita además un perfil activo con un único rol administrado: `administrator`, `director`, `teacher` o `student`, presentados como Administrador, Director, Docente y Estudiante-consulta.

La cuenta inicial autorizada es `dsramireza@unbosque.edu.co`, Administrador. No se cargan otras cuentas ni datos de demostración sin aprobación previa del responsable del proyecto.

## Componentes y contratos

- `/login`: formulario con validación de correo y dominio; el servidor repite la validación y verifica contraseña y acceso.
- `/`: inicio protegido con el correo y rol de la propia cuenta, navegación permitida y cierre de sesión.
- `/accesos` y `/api/access-audit`: historial administrativo, exclusivamente para Administrador. Es consulta de auditoría, no un módulo completo de gestión de usuarios.
- `/api/session`: devuelve el rol vigente si la sesión y el perfil autorizan la operación. Sin sesión responde 401; sin permiso, 403; si la consulta de acceso falla, 503.
- `/api/health`: conserva el diagnóstico público del backend y no devuelve información de cuentas.

Las Server Actions de login/logout son POST y utilizan los controles de origen de Next.js. No hay un logout mediante GET. El servidor crea un cliente Supabase por petición y valida al usuario con `getUser()`, sin confiar en un rol aportado por el navegador. `proxy.ts` renueva las cookies y propaga los encabezados de caché del SDK. Las cookies de sesión son HttpOnly, SameSite=Lax y Secure en producción; las respuestas de acceso no se almacenan en caché compartida.

`lib/auth/access.ts` entrega `resolveAccess` para APIs y `requirePageAccess` para páginas. Las HUs siguientes reutilizan estos controles con los roles permitidos para cada operación, además de sus políticas RLS.

## Persistencia y auditoría

La migración `supabase/migrations/20261108180513_institutional_access.sql` crea:

- `public.user_profiles`: rol, estado y fecha desde la que son válidas las nuevas sesiones de la cuenta. La identidad referencia a Supabase Auth; no duplica contraseñas ni contiene matrícula estudiantil.
- `public.access_audit`: responsable institucional, cuenta afectada, valores anteriores/nuevos, motivo y fecha del cambio administrativo.
- `private.current_app_role()`: consulta el rol de la identidad solicitante y verifica perfil activo, correo institucional confirmado y existencia/vigencia de su sesión en Auth. No recibe un ID arbitrario ni confía en `user_metadata`.
- `private.set_user_access(...)`: procedimiento para el operador SQL privilegiado. No está expuesto como RPC pública ni se concede su ejecución al cliente.

Ambas tablas usan RLS. El cliente solo puede consultar su perfil autorizado; el historial solo puede leerlo un Administrador. No tiene permisos para insertar, editar o borrar perfiles ni auditorías. La función de lectura con privilegios se mantiene en el esquema privado y fija un `search_path` vacío.

Cada llamada administrativa identifica responsable y motivo y genera una auditoría. También renueva `access_valid_after`: las sesiones creadas antes del cambio dejan de autorizar operaciones de esta aplicación, incluso si su token o refresh token siguen existiendo. La cuenta debe iniciar sesión de nuevo. Las comprobaciones se hacen tanto en servidor como en las políticas de datos.

La migración fue creada con la CLI de Supabase y aplicada por MCP a la única base del proyecto. Su nombre local se alineó con la versión registrada por el servicio. Los despliegues de Vercel no vuelven a ejecutar ni reinician esta migración.

## Crear y habilitar una cuenta

1. Obtener aprobación del correo institucional y su rol. El responsable administrativo también debe ser una cuenta institucional identificable en Auth.
2. Desde el panel del proyecto Supabase, comprobar que el registro de nuevos usuarios está deshabilitado. Crear la cuenta en Authentication → Users con correo confirmado y contraseña definida fuera del chat, o utilizar el comando administrativo descrito más abajo. Las contraseñas las gestiona Supabase Auth.
3. Con acceso autorizado al SQL Editor, ejecutar el procedimiento siguiente, sustituyendo los marcadores por datos aprobados:

```sql
select private.set_user_access(
  '<correo-institucional-aprobado>',
  '<administrator|director|teacher|student>',
  true,
  '<correo-del-responsable>',
  '<motivo-del-aprovisionamiento>'
);
```

4. Verificar el perfil y la auditoría en el SQL Editor. El usuario debe poder iniciar sesión con sus credenciales. Una cuenta Auth sin perfil autorizado no obtiene acceso.

El primer Administrador se habilita con este mismo procedimiento desde el SQL Editor, como operador autorizado del proyecto; no depende de un usuario administrador anterior dentro de la aplicación.

## Cambiar rol, desactivar y recuperar acceso

Los cambios de rol y estado utilizan `private.set_user_access` con el mismo correo, rol deseado, estado, responsable y motivo. Para desactivar, usar `false`; se preservan el perfil y la auditoría. No editar las tablas directamente ni borrar cuentas para desactivarlas.

Para recuperar una contraseña:

1. Desactivar el perfil mediante el procedimiento SQL y un motivo de recuperación. Esto invalida el acceso de sus sesiones anteriores.
2. El operador actualiza la contraseña en Supabase Auth con el comando administrativo `reset-password`, sin registrar el valor en SQL, Git o el chat.
3. Reactivar el perfil con el rol aprobado y un motivo de recuperación completada. La nueva fecha de acceso mantiene fuera a las sesiones anteriores; el usuario debe volver a iniciar sesión.

## Comandos administrativos locales

Estos comandos los ejecuta únicamente el operador autorizado. No son endpoints del producto y no necesitan una clave administrativa en los despliegues habituales de Vercel.

En `.env.admin.local`, archivo excluido de Git, configurar localmente las variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_NEW_PASSWORD`. La clave secreta se obtiene directamente desde el panel del proyecto; no debe compartirse por el chat ni utilizar un prefijo `NEXT_PUBLIC_`. La contraseña debe cumplir la política de Supabase. Retirar `SUPABASE_NEW_PASSWORD` del archivo al finalizar la operación.

```sh
node scripts/auth-admin.mjs --help
node --env-file=.env.admin.local scripts/auth-admin.mjs create <correo-aprobado>
node --env-file=.env.admin.local scripts/auth-admin.mjs reset-password <correo-aprobado>
```

La creación o recuperación de contraseña utiliza la API administrativa de Supabase Auth. El comando no asigna roles: esa operación se realiza con el procedimiento SQL auditado. No se imprimen contraseñas ni claves; los mensajes de error contienen únicamente el estado de la operación y, cuando existe, un código de error.

## Verificación de aceptación

La issue #3 conserva los nueve criterios y sus evidencias. Antes de cerrarla se comprueban acceso válido, contraseña errónea, dominio no autorizado, cuenta inactiva, rol sin permiso, persistencia de sesión, cierre de sesión, denegación de endpoints y escritura de perfiles, auditoría y procedimiento administrativo.

Las comprobaciones con cuentas usan únicamente identidades aprobadas. La aprobación de una cuenta, un build correcto o la existencia de una migración no sustituyen el registro de esas evidencias. No se incorporan suites unitarias obligatorias, cobertura ni PR Gate.
