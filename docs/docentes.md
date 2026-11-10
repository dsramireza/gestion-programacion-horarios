# Gestión de docentes — HU-05

Administración crea y edita docentes desde `/docentes`. Director consulta el listado, el detalle y el historial; Docente y Estudiante-consulta no acceden a este módulo. Cada operación comprueba sesión y rol en servidor, y las tablas aplican RLS. La aplicación no usa claves administrativas para escribir.

El listado busca por identificador, nombre o correo, y filtra por programa, dedicación y estado. Los filtros se conservan en la URL. Se distinguen el listado vacío y la búsqueda sin resultados. Los errores de validación se muestran junto al campo, sin guardar una operación parcial.

## Datos

No se carga ningún docente. Los nombres, identificadores, correos, dedicaciones y escalafones reales deben aprobarse por el responsable del proyecto antes de registrarse; mientras tanto la pantalla muestra un estado vacío. Los valores ficticios del mockup, como `maxHours`, no se incorporan.

## Modelo y validaciones

La migración `20261110150000_teachers.sql` crea `teachers`, `teacher_revisions`, la función de escritura `save_teacher` y la búsqueda `search_teachers`.

| Campo | Regla |
| --- | --- |
| `institutional_id` | Obligatorio, sin espacios externos y en mayúsculas. Único, incluidos los docentes inactivos. El formato oficial no está definido, por lo que no se impone un patrón adicional. |
| `full_name` | Obligatorio, sin espacios externos. |
| `email` | En minúsculas, dominio `@unbosque.edu.co` y único entre docentes, incluidos los inactivos. No crea ni vincula una cuenta de acceso. |
| `program_id` | Programa activo de la Facultad de Ingeniería. Un docente conserva su programa si este se inactiva después. |
| `dedication` | `tiempo_completo`, `tres_cuartos`, `medio_tiempo` o `cuarto_tiempo`: las cuatro vinculaciones de `proyecto.md` (situación inicial). Sustituyen la lista TC/MT/HC de la consolidación de historias, por decisión del responsable y la precedencia de fuentes de AGENTS.md. |
| `academic_rank` | `auxiliar`, `asistente`, `asociado` o `titular`. |
| `is_active` | Retirar a un docente consiste en inactivarlo. No existe borrado físico. |

Las validaciones se ejecutan en el formulario, en el servicio del servidor y de nuevo en `save_teacher`, que es `SECURITY DEFINER`, exige el rol Administrador vigente y escribe docente e historial en la misma transacción. Los usuarios autenticados solo tienen `SELECT` sobre las tablas; no se conceden `INSERT`, `UPDATE` ni `DELETE` directos.

### Historial y control de concurrencia

Cada cambio incrementa `revision_number` y registra en `teacher_revisions` el responsable, su correo, la fecha y los valores anteriores y nuevos. El historial no se modifica desde la aplicación. Guardar sin cambios no crea una revisión.

La edición envía la revisión que el usuario tenía abierta. Si otra persona guardó antes, la operación se rechaza con 409 y se pide recargar, sin sobrescribir el cambio ajeno.

## Contrato para HU-06, HU-08, HU-11 y HU-12

- Las relaciones usan `teachers.id`, no copias del nombre o del correo.
- Las nuevas asignaciones deben excluir docentes inactivos y conservar las existentes. La clave foránea con `ON DELETE RESTRICT` impide eliminar un docente referenciado.
- Una sesión o publicación que necesite fijar los datos usados debe guardar `(teacher_id, revision_number)`, que es única en `teacher_revisions`. Así, una edición posterior no altera lo que muestra una versión publicada.
- `dedication` es la entrada para los topes de carga de HU-11; la tabla de topes por dedicación sigue pendiente de aprobación.
- La relación entre docente y cuenta de acceso con rol Docente no se define aquí; corresponde a HU-06 si el docente gestiona su propia disponibilidad.

## Contrato HTTP

| Operación | Permiso | Resultado |
| --- | --- | --- |
| `GET /api/teachers?q=&program=&dedication=&state=all` | Administrador o Director | Lista; estado `all`, `active` o `inactive`; programa por UUID y dedicación opcionales |
| `GET /api/teachers/{id}` | Administrador o Director | Docente e historial, o 404 |
| `POST /api/teachers` | Administrador | Crea y devuelve 201 |
| `PUT /api/teachers/{id}` | Administrador | Guarda y devuelve 200 |

El cuerpo de escritura es `{institutional_id, full_name, email, program_id, dedication, academic_rank, is_active, expected_revision_number}`; `expected_revision_number` es `null` al crear y obligatorio al editar. Los errores incluyen `errors` por campo: 422 para datos inválidos, 409 para identificador o correo duplicado o revisión desactualizada, 404 si no existe y 401/403 para acceso denegado.

## Aplicación de la migración

La migración debe aplicarse a la única base de Supabase antes de integrar en `main` la versión que la usa, en coordinación con el responsable. Depende de las migraciones de acceso (`private.current_app_role`, `user_profiles`) y catálogo (`programs`, `faculties`).

## Alcance de la verificación

CA-01, CA-02 y la inactivación se pueden comprobar con esta entrega. CA-03 y CA-04 mencionan sesiones históricas y versiones publicadas, que todavía no existen: esta HU deja la inactivación sin borrado, el historial inmutable y el contrato de revisión, pero la comprobación integral depende de HU-08 y HU-12. La evidencia y el conteo de criterios se registran en la issue #7.
