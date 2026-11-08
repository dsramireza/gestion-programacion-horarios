# Catálogo de asignaturas — HU-02

Administración crea y edita asignaturas desde `/asignaturas`. Director consulta el catálogo de toda la Facultad; Docente y Estudiante-consulta no acceden a este módulo. Cada operación comprueba sesión y permisos en servidor y las tablas aplican RLS. No se usan claves administrativas para escribir desde la aplicación.

El listado busca por código o nombre y filtra por programa y estado. Los filtros se conservan en la URL y las consultas leen datos persistidos. Se distinguen catálogo vacío y búsqueda sin resultados. Los errores de validación se muestran junto al campo sin guardar una operación parcial.

## Datos aprobados

El responsable aprobó un único programa, **Programa de Ingeniería de Sistemas**, de la Facultad de Ingeniería. Este acuerdo sustituye los cuatro programas del mockup.

| Código base de asignatura | Nombre | Créditos | Grupos aprobados para HU-04 |
| --- | --- | --- | --- |
| ISW2026-001 | Ingeniería de Software 1 | 3 | G1 |
| EDD2026-002 | Estructuras de Datos | 4 | G1, G2 |
| BDD2026-003 | Bases de Datos | 3 | G1, G2 |
| RED2026-004 | Redes de Computadores | 3 | G1 |
| SIS2026-005 | Sistemas Operativos | 4 | G1 |
| ARC2026-006 | Arquitectura de Computadores | 3 | G1 |
| IAR2026-007 | Inteligencia Artificial | 3 | G1, G2 |

Son siete asignaturas y diez grupos. Por ejemplo, `EDD2026-002G1` y `EDD2026-002G2` identifican grupos de la misma asignatura `EDD2026-002`; no generan materias duplicadas. Se conserva el texto «Ingeniería de Software 1» aprobado por el responsable.

La carga de esta HU crea el programa y las siete asignaturas activas. No crea grupos sin semestre/conteos definidos, profesores, frecuencias ni datos estudiantiles. El año del código no determina el semestre. La asignación posterior de docentes corresponde a cada grupo, permitiendo distinguir al responsable de G1 y al de G2; no se asigna automáticamente un profesor a toda la asignatura.

## Modelo y validaciones

La migración `20261108191407_academic_catalog.sql` ya está aplicada a la única base del proyecto. Fue generada con la CLI; el nombre local se alineó con la versión de aplicación de Supabase MCP. Vercel no la ejecuta de nuevo.

- `faculties` y `programs` son referencias de solo lectura para la aplicación. Sus UUID se generan en la base y la carga se relaciona por las denominaciones aprobadas, sin IDs fijos.
- `subjects` tiene UUID estable y programa referenciado con `ON DELETE RESTRICT`. Código y nombre se recortan en servidor y también antes de escribir en la base; el código se normaliza a mayúsculas.
- El índice único de código incluye asignaturas inactivas y protege solicitudes simultáneas. Inactivar no libera el código ni elimina registros.
- Nombre no vacío, créditos enteros positivos y programa activo perteneciente a la Facultad de Ingeniería. No existe el máximo de diez créditos del mockup. La columna usa el rango de un entero PostgreSQL.
- Retirar una asignatura consiste en desmarcar «Asignatura activa» al editar. No se concede `DELETE`, ni se actualizan UUID o fecha de creación desde el cliente.
- Las HUs consumidoras deben excluir asignaturas inactivas al crear nuevas relaciones operativas y conservar las existentes. HU-04 implementa esa comprobación para nuevos grupos.

La búsqueda usa `search_subjects`, función `SECURITY INVOKER` con argumentos enlazados y RLS. El término se busca literalmente, sin construir expresiones de consulta a partir del texto del usuario.

## Contrato HTTP

| Operación | Permiso | Resultado |
| --- | --- | --- |
| `GET /api/subjects?q=&program=&state=all` | Administrador o Director | Lista; estado `all`, `active` o `inactive`, programa por UUID opcional |
| `GET /api/subjects/{id}` | Administrador o Director | Asignatura o 404 |
| `POST /api/subjects` | Administrador | Crea y devuelve 201 |
| `PUT /api/subjects/{id}` | Administrador | Guarda los cinco campos y devuelve 200 |

El cuerpo de escritura es `{code, name, program_id, credits, is_active}`. Los errores incluyen `errors` por campo: 422 para datos inválidos, 409 para código duplicado, 404 si no existe y 401/403 para acceso denegado. Los errores inesperados devuelven un mensaje seguro. Las respuestas privadas no se almacenan en caché compartida. No existe una operación de borrado físico.

## Verificación y entrega

El build de Next.js y TypeScript pasó localmente fuera del sandbox. La carga persistida se contrastó con los siete códigos, nombres y créditos aprobados. Se comprobaron RLS habilitado, ausencia de permisos de borrado de asignaturas y ausencia de escritura de referencias por el cliente.

La evidencia funcional, el conteo de criterios y las comprobaciones restantes se registran en la issue #4 y el PR de la entrega; este documento no los da por verificados automáticamente. No se incorporan suites unitarias, cobertura ni gates nuevos.

El asesor de Supabase no informó hallazgos de esquema; conserva el aviso previo de [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), ajeno a los cambios del catálogo.
