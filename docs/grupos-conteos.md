# Grupos y conteos agregados — HU-04

Administración y Director gestionan grupos de toda la Facultad desde `/grupos`. Cada grupo pertenece a una asignatura y un semestre, conserva UUID estable y solo almacena un conteo agregado. No hay matrícula, expedientes, datos individuales de estudiantes ni reasignación individual.

El responsable aprobó siete asignaturas y diez grupos G1/G2, detallados en [Catálogo de asignaturas](catalogo-asignaturas.md). Los conteos se ingresan desde los formularios: la migración no crea grupos con cantidades inventadas. El código completo se presenta como código base de asignatura más código de grupo, por ejemplo `BDD2026-003G1`; G1/G2 no se convierten en asignaturas duplicadas. La asignación posterior de profesores se relacionará con el UUID del grupo, distinguiendo G1 y G2; este módulo no inventa profesores ni implementa su gestión.

## Límites, estado y conservación

Los límites se leen de la revisión persistida de parámetros del semestre. Para 2026-2, capacidad 40, mínimo 10 y tolerancia 10 % producen máximo entero 44. Cada guardado valida el conteo, calcula estado y motivo y conserva la revisión de parámetros utilizada.

| Conteo entero | Estado | Motivo |
| --- | --- | --- |
| 0–9 | Cerrado | Por debajo del mínimo |
| 10–40 | Abierto | Dentro de la capacidad objetivo |
| 41–44 | En riesgo | Usa la tolerancia |
| Mayor de 44, negativo, nulo o fraccionario | Rechazo | Sin modificar el grupo anterior |

El máximo general se calcula como `floor(capacidad × (1 + tolerancia / 100))`. No hay edición individual de límites ni estado. El servidor rechaza campos adicionales que intenten enviarlos en el payload; tampoco se conceden escrituras directas sobre las tablas.

El código se recorta y normaliza a mayúsculas. Puede enviarse como sufijo o código completo de la asignatura seleccionada. La unicidad se garantiza dentro de asignatura/semestre; G1 puede existir en otra asignatura. El contexto de un grupo existente no se traslada a otra asignatura/semestre. Inactivar una asignatura impide nuevos grupos y conserva los existentes y su historial; los grupos de asignaturas inactivas no se ofrecen para programar.

## Persistencia, concurrencia y auditoría

La migración `20261108204508_academic_groups.sql` ya se aplicó a la única base. Su nombre generado por CLI se alineó con el historial de Supabase MCP. Vercel no la vuelve a aplicar.

- `academic_groups`: contexto, código, conteo, estado/motivo, revisión de parámetros utilizada, número de revisión y fechas.
- `group_revisions`: responsable institucional, fecha, valores anteriores/nuevos y resultado aceptado de la validación de cada cambio guardado. Los rechazos devuelven errores y no modifican el grupo ni generan un cambio aceptado ficticio.
- Ambas tablas tienen RLS; clientes solo leen con los permisos de planificador. Escrituras mediante función privada con identidad/rol comprobados y wrapper público `SECURITY INVOKER`.
- El guardado bloquea semestre, asignatura/programa y grupo en ese orden, valida el estado activo al crear y realiza cambio/auditoría atómicamente. La revisión esperada evita sobrescribir una edición concurrente; un conflicto devuelve 409 y exige recargar.
- Sin borrado físico desde la aplicación. Las referencias usan `ON DELETE RESTRICT`, incluyendo auditorías y revisión de parámetros del mismo semestre.

HU-07 debe coordinar sus nuevas revisiones de parámetros con la revalidación de grupos y configuraciones. Este módulo conserva la revisión usada para cada conteo. Si esa revisión deja de ser la vigente, la demanda excluye el grupo y solicita revisar el conteo; no lo presenta silenciosamente como programable bajo límites antiguos. Al guardar de nuevo se consumen los parámetros vigentes. La comprobación integral del cambio central de parámetros sigue pendiente en CA-06 de HU-03/HU-07.

## Demanda de sesiones — conexión con HU-03

La lista muestra frecuencia, duración y minutos semanales usando la revisión vigente explícita de la asignatura en el mismo semestre. No se infieren desde créditos ni se ubican sesiones. Los grupos cerrados, sin configuración compatible, de asignaturas inactivas o pendientes de revalidación de parámetros se excluyen de la demanda programable y muestran su motivo.

`GET /api/group-demand?semester={uuid}` devuelve `programmable_groups`, `excluded_groups` y el total de sesiones semanales programables. Cada resultado programable identifica grupo, asignatura, semestre y revisiones explícitas de configuración/parámetros, además de sesiones y duración. HU-08 debe consumir solo estos grupos programables y conservar la revisión elegida al crear un borrador. HU-12 mantiene su contrato de publicación; no se implementa generación ni publicación en HU-04.

## Contrato HTTP

| Operación | Uso |
| --- | --- |
| `GET /api/groups?semester={uuid}&subject=&state=all` | Lista con filtros de semestre, asignatura y estado; incluye demanda y límites heredados |
| `GET /api/groups/{id}` | Grupo e historial |
| `POST /api/groups` | Crear grupo, respuesta 201 |
| `PUT /api/groups/{id}` | Actualizar código/conteo, respuesta 200 |

Todas requieren Administración o Director. El cuerpo de escritura contiene únicamente `subject_id`, `semester_id`, `code`, `student_count`, `expected_parameter_revision_id` y `expected_revision_number`. En creación, la revisión esperada es `null`; en edición es el número consultado. La revisión de parámetros es una comprobación de vigencia, no una sobrescritura de límites.

Respuestas de validación 422 con errores por campo; duplicados y ediciones obsoletas, 409; inexistentes, 404; sin sesión/permiso, 401/403. No se publican errores internos. Las respuestas privadas usan `no-store` y no existe endpoint de borrado.

## Evidencia y límites

Build local Next.js/TypeScript correcto. Se verificaron con sesión real bajo `authenticated` y rollback completo: límites 0/9/10/40/41/44 y rechazo de 45/negativo/nulo, transiciones en ambos sentidos, códigos normalizados, duplicados, mismo G1 en otra asignatura, revisión obsoleta, imposibilidad de sobrescribir estado, valores anteriores/nuevos y actor/fecha de auditoría, asignatura inactiva y permisos de Administración/Director/Docente/Estudiante. Las fracciones se rechazan también en la validación de servidor.

La configuración real de Bases de Datos ingresada por el usuario se conservó. No quedaron grupos ni auditorías de la verificación SQL. La aceptación de pantalla y de demanda con grupos ingresados por el usuario se registra en las issues #6 y #5; no se acredita por el build. Sin suites unitarias ni nuevos gates. El asesor conserva únicamente el aviso previo de [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
