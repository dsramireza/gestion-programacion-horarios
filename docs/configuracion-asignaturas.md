# Frecuencia y duración — HU-03

Administración guarda la configuración de cada asignatura activa por semestre en `/configuracion`. Director consulta configuración e historial de toda la Facultad. Docente y Estudiante-consulta no acceden a este módulo. El servidor verifica permisos en cada operación y la base vuelve a comprobar el acceso.

El responsable aprobó el período **2026-2**, sin añadir fechas. Las frecuencias por materia y los conteos por grupo se ingresarán en los formularios; no se cargan configuraciones ni grupos de muestra. Los créditos no determinan frecuencia o duración.

## Base compartida con HU-07 y HU-04

La migración `20261108202614_subject_configuration.sql` ya se aplicó a la única base. El archivo fue generado con la CLI y se alineó con la versión registrada por Supabase MCP. Vercel no lo aplica otra vez.

`semesters` identifica un período dentro de la facultad. Su `current_parameter_revision_id` apunta a una revisión de `semester_parameter_revisions` del mismo semestre. La revisión inicial aprobada conserva máximo de cuatro sesiones semanales, sesiones de 120 minutos, capacidad objetivo 40, mínimo 10 y tolerancia 10 %. No se ofrecen duraciones libres ni edición completa de parámetros en esta HU.

HU-07 debe añadir sus operaciones autorizadas de parámetros sobre estas mismas tablas: crear una revisión con responsable/fecha y actualizar la referencia vigente atómicamente, sin sobrescribir registros anteriores. Debe respetar la pertenencia al semestre y coordinar el cambio con configuraciones, demanda y nuevas versiones de horario. El guardado de configuración bloquea primero la fila del semestre; las integraciones deben mantener ese orden al bloquear recursos compartidos.

## Revisiones y concurrencia

- `subject_configurations` conserva un contexto único de asignatura/semestre y una única referencia de revisión vigente.
- `subject_configuration_revisions` conserva la frecuencia, duración, revisión de parámetros utilizada, revisión anterior, responsable institucional y fecha. El historial no se sobrescribe ni se borra desde el cliente.
- Guardar llama a una función atómica que bloquea el contexto, valida frecuencia y duración contra los parámetros persistidos, añade una revisión y actualiza su referencia vigente.
- El cliente envía la revisión que estaba editando y la revisión de parámetros que consultó. Si cambiaron, recibe 409 y debe recargar. No se pierde silenciosamente una edición concurrente.
- Las claves foráneas impiden apuntar a una revisión de otro contexto. Las relaciones usan UUID generados, nunca códigos copiados como claves.
- El responsable proviene de la identidad autenticada, no del payload. La revisión anterior conserva los valores previos; la nueva conserva los posteriores. La interfaz muestra ambos, responsable, fecha y vigencia.

No se conceden escrituras directas sobre estas tablas a clientes. La escritura controlada permanece en `private.save_subject_configuration`, con verificación explícita de identidad y rol, `search_path` vacío y ejecución restringida. El punto de entrada público es un wrapper `SECURITY INVOKER`. Esta elección permite una transacción completa sin habilitar actualizaciones arbitrarias del historial. Se revisó frente a la [documentación oficial de funciones de Supabase](https://supabase.com/docs/guides/database/functions#secure-a-database-function).

## Contrato de aplicación

`GET /api/subject-configurations?subject={uuid}&semester={uuid}` devuelve contexto, parámetros actuales, configuración vigente e historial para Administración/Director.

`POST /api/subject-configurations` requiere Administración y acepta:

```json
{
  "subject_id": "<uuid-asignatura>",
  "semester_id": "<uuid-semestre>",
  "sessions_per_week": "<entero-dentro-del-limite>",
  "session_duration_minutes": "<duracion-vigente-del-semestre>",
  "parameter_revision_id": "<uuid-parametros-consultados>",
  "expected_revision_id": null
}
```

Para editar se envía el UUID de la revisión vigente en `expected_revision_id`; `null` corresponde a la primera configuración. La respuesta 201 contiene la revisión nueva. Las validaciones devuelven 422 con errores identificables; los conflictos de revisión, 409; sin sesión o permiso, 401/403. Las respuestas privadas usan `no-store`.

La frecuencia se valida como entero en frontend, servidor y función de persistencia. El servidor y la base rechazan una duración distinta a la del semestre, aunque el payload la intente modificar. Una asignatura inactiva conserva historial de consulta y no admite nuevas configuraciones operativas.

## Demanda e integración pendiente

`lib/configuration/demand.ts` prepara el cálculo por grupo: excluye cerrados y grupos sin configuración compatible, exige coincidencia de asignatura/semestre/contexto y devuelve sesiones semanales, duración, minutos semanales y UUIDs de revisión. No ubica sesiones ni genera horarios.

HU-04 lo conecta a grupos persistidos y sus estados calculados mediante el [módulo de grupos y su API de demanda](grupos-conteos.md). La aceptación de CA-05 se registra tras comprobar datos aprobados. HU-08 debe conservar la revisión explícita al crear borradores; HU-12 debe publicar una versión nueva sin alterar la anterior. El helper de demanda trabaja con una configuración vigente seleccionada; una publicación histórica debe conservar y consultar su propia referencia de revisión.

La entrega de esta rama corresponde a CA-01 a CA-04. No acredita CA-05 ni las tres integraciones externas: CA-06/HU-07, CA-07/HU-08 y CA-08/HU-08+HU-12. La issue #5 permanece abierta y el PR utiliza `Refs #5`.

## Verificación

Build local Next.js/TypeScript correcto. Con una sesión real y el rol PostgreSQL `authenticated` se comprobaron revisiones 1/2, vínculo anterior y única vigente, responsable, límites nulo/negativo/cero/cinco, duración distinta al semestre, rechazo de edición obsoleta y ausencia de permisos para sobrescribir historial. Director puede consultar sin guardar; Docente/Estudiante no consultan ni guardan. La verificación fue transaccional con rollback: no dejó frecuencias persistidas ni cambios de rol.

Las comprobaciones de interfaz y el conteo vigente se registran con evidencia en la issue y el PR. No se crean suites unitarias ni gates. El asesor no informó problemas nuevos de esquema; conserva el aviso previo de [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
