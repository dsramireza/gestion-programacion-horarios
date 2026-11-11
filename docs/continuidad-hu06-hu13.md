# Continuidad de desarrollo — revisión del 11 de noviembre de 2026

Este documento registra decisiones y orden de implementación. No acredita funcionalidad nueva ni modifica el reparto de trabajo del equipo.

## Estado revisado

- HU-01, HU-02 y HU-04 integradas y cerradas. HU-03 conserva cinco criterios verificados y tres integraciones pendientes con HU-07, HU-08 y HU-12.
- PR #24 integra el módulo de docentes de HU-05. La issue #7 sigue abierta: no hay datos docentes cargados ni verificación funcional completa; sus referencias a sesiones/publicaciones requieren HU-08/HU-12. No cerrar por el merge ni por el build.
- La dedicación docente implementada corresponde a las cuatro vinculaciones de proyecto.md: tiempo completo, tres cuartos, medio tiempo y un cuarto de tiempo. La antigua lista TC/MT/HC de la issue no debe reintroducirse. Los topes numéricos de carga por dedicación aún requieren aprobación para HU-11.
- No hay PRs abiertos al iniciar esta revisión. Se conserva la asignación existente de HU-09; no se reasigna una historia ni se duplica el backlog.
- La versión remota de teachers es 20261111001722. El archivo local que tenía 20261110150000 se renombra, sin cambiar ni reaplicar su SQL.

## Decisiones aprobadas en esta revisión

### HU-06: permisos

- Docente: consulta y edita únicamente su disponibilidad y restricciones.
- Administrador y Director: gestionan disponibilidad y restricciones de toda la Facultad.
- Solo Administrador y Director administran habilitaciones por asignatura y semestre.
- Estudiante-consulta no administra estos datos.

Una fila de teachers no constituye una cuenta Auth. Para la edición propia se necesita una vinculación controlada entre docente y usuario; no permitir autoasignación de identidad o privilegios mediante el payload. Las cuentas y datos docentes que se utilicen requieren aprobación previa; no inventar personas para verificar pantallas.

### HU-07: período y permisos

- Período 2026-2: **1 de junio de 2026 a 31 de diciembre de 2026**, confirmado por el responsable. Persistido por la migración HU-07 `20261111234613`; la incorporación inicial conserva las referencias preexistentes. La aceptación del flujo de pantalla se registra en `docs/parametros-semestre.md`.
- Administrador edita los parámetros; Director consulta. Las revisiones conservan responsable, fecha y motivo.
- Los valores iniciales siguen las fuentes y acuerdos: lunes a viernes 07:00–22:00, sábado 07:00–13:00 y exclusión 12:00–13:00; duración 120 minutos, máximo inicial cuatro sesiones, capacidad 40, mínimo 10 y tolerancia 10 %.
- El semestre académico no cambia el cronograma del proyecto: seis semanas de desarrollo. Las doce semanas permanecen solo en la EDT por la excepción aprobada.

## Secuencia y dependencias

| Orden | Historia | Entrega local | Aceptación dependiente |
| --- | --- | --- | --- |
| 1 | HU-07, #9 | Completar semestre, fechas/estado, franjas, exclusión y parámetros versionados sobre las tablas existentes. Validar intervalos y conservar historial. | Uso por generación y efecto sobre sesiones/publicaciones requieren HU-08/HU-12. No dar por comprobados escenarios inexistentes. |
| 2 | HU-06, #8 | Disponibilidad y restricciones estructuradas por docente/semestre, habilitaciones, identidad propia controlada y auditoría con los permisos aprobados. Consumir las franjas de HU-07. | Advertencias sobre sesiones programadas y publicaciones requieren HU-08/HU-12. |
| 3 | HU-08, #10 | Generar borrador con grupos programables, habilitación y disponibilidad, límites y revisiones explícitas de configuración/parámetros/docentes. | No equivale a publicación; coordinar contratos con HU-09/HU-10/HU-11/HU-12. |
| 4 | HU-09 a HU-13 | Advertencias, edición/revalidación, carga, publicación y consulta, respetando responsables. | Resolver los criterios de integración y actualizar los conteos con evidencia. |

HU-03 permanece abierta hasta comprobar CA-06 con HU-07, CA-07 con HU-08 y CA-08 con HU-08/HU-12. Que existan tablas o referencias de versión no acredita esas integraciones.

## Reglas de implementación y cierre

- Reutilizar semesters y semester_parameter_revisions; no crear una segunda configuración incompatible ni bases por ambiente.
- No sobrescribir revisiones existentes ni actualizar automáticamente datos históricos de un horario. Un cambio debe señalar incompatibilidades y exigir revalidación del escenario afectado.
- Definir el alcance verificable de cada criterio y sus dependencias en la issue antes de marcarlo. Mantener un conteo de pendientes; no cerrar una HU parcialmente verificada.
- Cada issue tiene su rama desde main actualizado y PR. Los cierres se producen con Closes del PR integrado; entregas parciales usan Refs. Si la evidencia final solo requiere documentación, se entrega con su PR, conforme a AGENTS.md.
- Mantener la única base compartida y el pipeline básico de Vercel. No añadir pruebas unitarias obligatorias, cobertura, PR Gate ni un pipeline adicional.
