# Parámetros del semestre — HU-07 (#9)

## Comportamiento

`/parametros` permite seleccionar un semestre, consultar sus revisiones y registrar una nueva configuración. Administrador crea semestres y modifica código, fechas, estado, franjas y límites; Director solo consulta. Los demás roles no consultan ni escriben. Cada guardado requiere motivo y deriva responsable y fecha de la identidad autenticada, sin aceptarlos del cliente.

Solo hay un semestre activo por Facultad. Para activar otro, se debe inactivar primero el anterior mediante una revisión; no se cambia silenciosamente su estado. Las fechas son inclusivas y deben estar ordenadas. El estado activo es explícito, no se deduce del día actual. Crear otro semestre requiere que el responsable ingrese sus datos; no se cargan períodos de ejemplo.

Las franjas usan días ISO (1 lunes a 7 domingo) y minutos desde medianoche. Cada día habilitado admite una franja; los días omitidos están deshabilitados. El bloque excluido se aplica a todos los días. Inicio debe ser menor que fin, dentro de 00:00–24:00. Se rechazan días repetidos y franjas que, al descontar la exclusión, no permitan una sesión continua de 120 minutos. Las sesiones no podrán atravesar el bloque excluido. Una franja institucional puede contener la exclusión: no constituye un solapamiento inválido entre sesiones.

Frecuencia máxima y capacidad son enteros positivos; mínimo es entero entre cero y capacidad. La tolerancia es numérica no negativa y el máximo tolerado se calcula como `floor(capacidad × (1 + tolerancia / 100))`, dentro del rango de conteos admitido. La duración se conserva como parámetro persistido y permanece en 120 minutos durante el piloto. Los umbrales numéricos de carga por dedicación no están aprobados; no se inventan en esta entrega y siguen pendientes para HU-11.

## Fuentes y carga inicial aprobada

Se conserva la precedencia `proyecto.md` → `Acta.md` para cifras, con `Avances.md` como apoyo, y las decisiones expresas del responsable registradas en `docs/continuidad-hu06-hu13.md`.

- 2026-2: 01/06/2026–31/12/2026, activo.
- Lunes a viernes 07:00–22:00; sábado 07:00–13:00; domingo deshabilitado.
- Exclusión 12:00–13:00; sesiones de 120 minutos; frecuencia máxima inicial 4.
- Capacidad 40, mínimo 10, tolerancia 10 %.

Las fechas del semestre no representan las seis semanas de desarrollo del proyecto.

## Persistencia y auditoría

La migración `20261111234613_semester_parameters.sql` extiende `semesters` y `semester_parameter_revisions`, conservando RLS y permisos de consulta existentes. No crea una segunda configuración de semestre. No permite INSERT/UPDATE/DELETE de esas tablas desde el cliente.

La extensión inicial incorpora las fechas aprobadas a 2026-2 y agrega las franjas institucionales a la revisión preexistente mediante las columnas nuevas. No cambia sus valores escalares, ID, autor, fecha ni las referencias que ya usan asignaturas y grupos. Esa revisión de HU-03 conserva motivo/snapshot nulos: no se atribuye retrospectivamente la incorporación de fechas y franjas a su autor original. La pantalla identifica explícitamente esa limitación del historial inicial.

Desde HU-07 cada guardado agrega una revisión con enlace a la anterior, snapshot de código/fechas/estado, parámetros completos, responsable, fecha y motivo. Cambiar incluso solo fechas o estado crea una revisión. Los historiales no se sobrescriben. La escritura atómica utiliza una función privada con identidad/rol vigentes y `search_path` fijo, más un wrapper público SECURITY INVOKER con EXECUTE limitado a authenticated. El payload no acepta identidad, versión ni campos adicionales. Se bloquean la Facultad y el semestre para serializar escrituras; la revisión esperada impide perder actualizaciones concurrentes.

## API

- `GET /api/semester-parameters`: catálogo de semestres, Administrador/Director.
- `GET /api/semester-parameters?semester=<uuid>`: semestre, revisión vigente, historial y datos existentes que necesitan revisión.
- `POST /api/semester-parameters`: solo Administrador. Recibe `semester_id` (null al crear), `expected_revision_id` (null al crear), código `name`, `start_date`, `end_date`, `is_active`, parámetros escalares, `weekly_windows`, `excluded_start_minute`, `excluded_end_minute` y `change_reason`.
- Respuesta exitosa 201 `{ revision }`; 422 para valores inválidos; 409 para revisión obsoleta, código duplicado u otro semestre activo; 401/403 para acceso no autorizado; 503 para indisponibilidad. Las respuestas protegidas usan `private, no-store`.

## Impacto y contrato con otras HUs

Al cambiar la revisión vigente, las configuraciones de asignatura y los grupos conservan sus referencias anteriores. La pantalla los identifica por código y señala frecuencia/conteo que supera límites nuevos. Para revalidarlos hay que guardar su configuración o conteo desde sus módulos. Una configuración con frecuencia ahora inválida se rechaza; un grupo con conteo fuera del máximo nuevo tampoco puede guardarse. No se ajustan frecuencias, conteos ni estados históricos automáticamente.

HU-04 ya excluye de la demanda programable los grupos o configuraciones cuya revisión de parámetros no coincide con la vigente. Así un cambio no permite seguir programando silenciosamente con datos obsoletos. Después de revisar ambos contextos, la demanda utiliza las referencias nuevas.

HU-08 debe guardar en el borrador la revisión de parámetros y validar las sesiones contra sus días/franjas/exclusión. HU-12 debe conservar la revisión de la publicación anterior y exigir validación antes de una publicación nueva. No existen todavía sesiones ni publicaciones persistidas: esta entrega no identifica sesiones afectadas ni afirma haber satisfecho esos escenarios.

## Verificación de esta entrega

- `npm run build`: Next.js/TypeScript compiló correctamente incluyendo página y API nuevas.
- Ejecución local del validador compartido: datos aprobados y franja hasta 24:00 aceptados; doce solicitudes inválidas rechazadas, incluidas fechas inexistentes, fracciones, campos de identidad y ausencia de días. Sin crear una suite ni persistir datos.
- Migración aplicada a la única base compartida antes de publicar código dependiente. El archivo coincide con la versión real del historial remoto; no reaplicarla.
- Comprobación SQL bajo rol `authenticated` y contexto de sesión de la cuenta autorizada: crear dos revisiones enlazadas, conservar historial, responsable/motivo/snapshot, rechazar escritura con revisión obsoleta y rechazar un segundo semestre activo.
- Rechazos comprobados: franja sin espacio continuo, día duplicado, fechas invertidas, motivo vacío, duración distinta de 120 y mínimo mayor que capacidad.
- Integración con HU-03: al reducir transaccionalmente el máximo a 2, la función existente rechazó frecuencia 3 y aceptó 2 con la revisión nueva, sin cambios de código ni pérdida de historial.
- Director pudo consultar con RLS y no guardar; cuenta inactiva no pudo consultar ni guardar; identidad anónima no pudo ejecutar la escritura; no hay permisos directos para sobrescribir revisiones.
- Todos los cambios funcionales de comprobación se ejecutaron con ROLLBACK: cuenta Administrador activa, un semestre, una revisión inicial de parámetros, un grupo EDD2026-002G3 con 38 estudiantes y las configuraciones existentes permanecieron intactos.
- Asesor de seguridad sin hallazgos nuevos de tablas/funciones. Mantiene la advertencia preexistente de protección de contraseñas filtradas desactivada; no se modificó Auth ni el plan.

La compilación y las comprobaciones de base no sustituyen la aceptación desde una sesión de la aplicación. Verificación de pantalla y ciclo completo de cambio → revisión de asignatura/grupo → demanda: pendientes de confirmación del responsable en la preview. HU-03 CA-06 conserva esa aceptación pendiente.

## Criterios y dependencias

La issue #9 conserva **0/5 criterios íntegramente verificados** hasta comprobar el flujo desde la aplicación. CA-01 a CA-03 tienen implementación y comprobaciones de servidor; CA-04 tiene auditoría local verificada, pero su consumo por validaciones de horarios depende de HU-08. CA-05 depende de HU-08/HU-12: detectar grupos/configuraciones obsoletos no equivale a identificar sesiones afectadas ni preservar una publicación.

Esta entrega usa `Refs #9` y `Refs #5`; no cierra ninguna de las dos historias. No se incorporan suites unitarias, cobertura ni gates nuevos.
