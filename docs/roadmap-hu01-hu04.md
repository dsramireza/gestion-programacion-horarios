# Roadmap y revisión de HU-01 a HU-04

Acuerdos de la sesión del 8 de noviembre de 2026. Este documento define la entrega de las cuatro primeras historias y los contratos que recibirán los colaboradores de las historias posteriores. No acredita implementación funcional: la base actual solo contiene el arranque de la aplicación y el despliegue.

## Fuentes y precedencia

1. Decisiones expresas y vigentes aprobadas por el responsable del proyecto.
2. `proyecto.md` para las cifras que contiene; si una cifra no aparece allí, se utiliza el Acta.
3. `Acta.md`, en particular anexos A, B y C, para alcance, roles, requisitos y numeración canónica.
4. `Avances.md` para consolidación y priorización, conservando el alcance vigente de seis semanas.
5. `Historias_Usuario_Backend_MVP.md` como consolidación derivada; sus propuestas pendientes no sustituyen decisiones aprobadas.
6. Mockup de Figma como guía funcional. Su diseño, controles, límites y datos de muestra no son reglas adicionales.

En el workspace original, `proyecto.md`, `entregables/` y el directorio del mockup están junto al repositorio. No se supone que existan en todos los clones. Las reglas aprobadas se incluyen en las issues para que puedan implementarse sin depender del chat o de esas rutas locales.

## Resultado de la revisión

| Hallazgo | Evidencia en las fuentes | Resolución |
| --- | --- | --- |
| Avances llama HU-04 a docentes, pero el Acta llama HU-04 a grupos. | Avances, apartado 8; Acta, anexo C.1. | Se conserva la numeración del Acta: issues #3 a #6. Docentes continúa en HU-05; no se reasignan tareas por la numeración del prototipo. |
| HU-01 aún mencionaba un proveedor de identidad genérico. | Issue #3 frente a los acuerdos de acceso y AGENTS.md. | Correo institucional y contraseña con Supabase Auth; provisión y recuperación administrativas. |
| El catálogo no precisaba normalización, créditos válidos ni retiro. | Issue #4; Acta EF-03 y ENF-07. | Código único normalizado, créditos enteros positivos e inactivación con conservación de relaciones. |
| El mockup ofrece hasta 7 sesiones semanales y duraciones de 1–4 horas en pasos de media hora. | `App.tsx`, formulario de asignaturas; proyecto, situación inicial; Acta RST-05. | Frecuencia inicial 1–4 y sesiones de dos horas durante el piloto. Los valores se guardan como configuración. |
| Los créditos del formulario están limitados a 10 sin respaldo documental. | Formulario del mockup frente a Acta EF-03. | No se adopta ese máximo. Los valores concretos de cada materia se acuerdan antes de cargarlos. |
| HU-03 incluía resultados que dependen de parámetros, generación y publicación de otras HUs. | Issues #5, #9, #10 y #14; Acta EF-04, EF-11 y requisitos de publicación. | Se distingue entrega local de aceptación integral; la HU permanece abierta hasta completar las integraciones. |
| La asociación de «en riesgo» con la tolerancia era una interpretación sin confirmar. | Proyecto fija 40, 10 % y cierre bajo 10; Acta exige tres estados sin fijar esa asociación. | El responsable aprobó expresamente la tabla y el recálculo automático de este documento. |
| Los límites de grupo podían interpretarse como editables por grupo o por semestre. | Acta EF-05 y EF-11; issues #6 y #9. | Los grupos heredan los límites del semestre. La edición central pertenece a HU-07. |
| No estaba definido el alcance del Director entre programas. | El Acta identifica el rol, sin delimitar ese acceso. | En el piloto, consulta el catálogo y gestiona grupos de toda la Facultad de Ingeniería. |
| Los datos iniciales del mockup no estaban aprobados. | Mockup y solicitud expresa del responsable. | Toda carga o dato mostrado requiere aprobación. Se entregan estados vacíos hasta disponer de los datos autorizados. |

Las cuatro issues se refinan en GitHub. HU-02 ya contenía un objetivo implementable; las precisiones se incorporan para que otros agentes no elijan reglas distintas. HU-01, HU-03 y HU-04 necesitaban además corregir o cerrar ambigüedades de comportamiento. La referencia del Acta a cobertura automatizada no reintroduce requisitos de pruebas o PR Gate: se mantiene el workflow aprobado en AGENTS.md.

## Acuerdos de acceso y catálogo

- Carga aprobada posteriormente: únicamente Programa de Ingeniería de Sistemas, siete asignaturas y diez grupos. La tabla exacta y separación entre código de asignatura y sufijo G1/G2 constan en [Catálogo de asignaturas](catalogo-asignaturas.md) y en las issues #4 y #6. Esta decisión sustituye los cuatro programas de demostración del mockup. Los profesores se asignarán por grupo; no se infieren conteos ni frecuencias de esta carga.
- Cuentas creadas por administración, sin registro público, con recuperación administrativa y un único rol vigente: Administrador, Director, Docente o Estudiante-consulta.
- HU-01 entrega identidad, sesión, autorización y procedimiento administrativo; no un módulo completo de gestión de usuarios ni las pantallas de consulta de historias posteriores.
- Administración modifica asignaturas y configuración por asignatura. Director consulta el catálogo y gestiona grupos de toda la Facultad. Docente y Estudiante-consulta no administran estos módulos.
- El código de asignatura es único en el catálogo, normalizado a mayúsculas y sin espacios externos. La unicidad incluye las asignaturas inactivas y se garantiza en persistencia.
- Nombre no vacío, programa/facultad coherentes y créditos enteros positivos, sin el máximo 10 del mockup. El retiro se realiza por inactivación y conserva la identidad y las relaciones históricas.
- Ningún nombre, código, crédito, programa, cuenta o conjunto de demostración se inventa para llenar pantallas. El responsable debe aprobar los datos antes de cargarlos o mostrarlos. Esta política no añade automáticamente un módulo de aprobaciones al producto.

## Acuerdos de configuración y grupos

- Configuración versionada por asignatura y semestre, con responsable, fecha y valores anteriores/nuevos. Los créditos no se convierten automáticamente en frecuencia ni duración.
- Frecuencia inicial entre 1 y 4 sesiones semanales; máximo parametrizable. Durante el piloto cada sesión dura dos horas, conservadas como parámetro.
- La base mínima de semestre y parámetros se comparte con HU-07. La referencia documental del período es 2026-2; el mockup muestra 2025-I. No se inventan fechas ni se cargan períodos de muestra sin aprobación.
- HU-04 hereda capacidad objetivo 40, mínimo 10 y tolerancia 10 % del semestre. No ofrece sobrescritura individual de límites.
- El grupo se identifica dentro de asignatura y semestre. El mismo nombre de grupo puede existir en otro contexto, sin crear un duplicado lógico.
- Solo se manejan conteos agregados. Una cuenta técnica del rol Estudiante-consulta no crea matrícula ni una relación de estudiantes con grupos.

| Conteo entero | Estado o respuesta del piloto |
| --- | --- |
| 0–9 | Cerrado |
| 10–40 | Abierto |
| 41–44 | En riesgo por uso de tolerancia |
| Más de 44, negativo o fraccionario | Rechazo sin modificar los valores previos |

El estado se recalcula en ambos sentidos al cambiar el conteo, sin edición manual para eludir los límites. Un grupo cerrado se conserva para consulta y no se ofrece como programable al motor futuro. La interfaz de grupos y sus conteos deberá implementarse: la lista de letras de grupo del mockup no cubre esta HU.

## Roadmap de esta sesión

| Orden | Issue y entrega | Condición de avance |
| --- | --- | --- |
| 0 | Preparación compartida | Partir de `main` integrado, resolver la instalación de dependencias y versionar el lockfile. Acordar los contratos de identidad, catálogos, semestre/configuración y grupos. Inventariar los datos que necesitan aprobación. |
| 1 | [HU-01, #3](https://github.com/dsramireza/gestion-programacion-horarios/issues/3): acceso institucional | Entregar sesión, denegación por dominio/credencial/estado/rol, permisos persistentes, auditoría y procedimiento administrativo. Verificar sus 9 criterios con las cuentas aprobadas. |
| 2 | [HU-02, #4](https://github.com/dsramireza/gestion-programacion-horarios/issues/4): asignaturas | Entregar catálogo persistente, validación, unicidad, filtros e inactivación. Incorporar referencias de programa/facultad y datos únicamente aprobados. Verificar sus 9 criterios. |
| 3 | [HU-03, #5](https://github.com/dsramireza/gestion-programacion-horarios/issues/5): configuración local | Implementar CA-01 a CA-04: frecuencia, duración, revisiones por asignatura/semestre, autorización e historial. Preparar el cálculo de demanda; CA-05 se verifica al integrar los grupos de HU-04. No cerrar la HU. |
| 4 | [HU-04, #6](https://github.com/dsramireza/gestion-programacion-horarios/issues/6): grupos | Entregar grupos, herencia de parámetros, validación de conteos, estados calculados, persistencia y auditoría. Verificar sus 9 criterios y completar CA-05 de HU-03 con los grupos aprobados. |
| 5 | Cierre de la entrega local y traspaso | Registrar la evidencia manual y los builds, el conteo de criterios pendientes y los contratos para los colaboradores. HU-03 seguirá abierta si faltan sus integraciones externas. |

Cada trabajo usa una rama desde `main` y un PR asociado al issue. Tras un merge se actualiza la base para la siguiente rama. Si una HU requiere una entrega posterior, se abre una rama nueva para ese trabajo conservando el mismo issue; no se crea una HU duplicada.

## Dependencias y cierre de issues

Estado de refinamiento, no de implementación:

| Issue | Criterios verificados | Pendientes ahora | Dependencias para aceptar |
| --- | --- | --- | --- |
| HU-01 #3 | 0/9 | 9 | Datos de cuentas aprobados para los escenarios de acceso. No depende de los módulos académicos para entregar su base de autorización. |
| HU-02 #4 | 0/9 | 9 | HU-01 y referencias/carga de catálogo aprobadas. Las HUs consumidoras no bloquean su cierre. |
| HU-03 #5 | 0/8 | 8 | HU-01/02, grupos de HU-04 para CA-05 y las tres integraciones detalladas abajo. |
| HU-04 #6 | 0/9 | 9 | HU-01/02 y base de semestre con límites aprobados. La pantalla completa de HU-07 no bloquea el cierre si los parámetros iniciales ya están persistidos y funcionan. |

En HU-03, al verificar CA-01 a CA-04 todavía quedan **4 criterios**: demanda con grupos, integración de parámetros, generación y publicación. Después de verificar también CA-05 con HU-04 quedan **3 criterios de integración**:

| Criterio pendiente de HU-03 | Dependencia | Evidencia requerida |
| --- | --- | --- |
| CA-06 | HU-07, issue #9 | Cambio aprobado/versionado de parámetros consumido por la validación y el cálculo de demanda, sin cambiar código ni perder historial. |
| CA-07 | HU-08, issue #10 | Borrador persistido con cantidad y duración correctas de sesiones por grupo, usando una revisión explícita. |
| CA-08 | HU-08 y HU-12, issues #10 y #14 | Cambiar configuración conduce a un escenario nuevo/borrador y publicación explícita sin alterar la versión publicada anterior. |

Una issue puede pasar a En progreso y recibir PRs parciales mientras conserve criterios pendientes. El paso a Done o el cierre exige todos sus criterios verificados. Usar `Refs #5` para la entrega parcial de HU-03; no usar `Closes #5` hasta completar los ocho criterios. Actualizar los checkboxes y el conteo con evidencia real, sin interpretar la aprobación de una regla como trabajo implementado.

## Contratos que deben recibir los colaboradores

- Identidad y permisos: usuario, rol vigente, estado y responsable de operaciones; HU-01 aporta el mecanismo común de autorización.
- Catálogo: identificador estable de asignatura, código normalizado, programa/facultad y estado; las relaciones usan identificadores y no copias de nombres.
- Semestre/configuración: contexto compartido y revisión identificable. HU-07 extiende esa base para editar parámetros; no crea otra estructura incompatible.
- Demanda y grupos: identificador de grupo, asignatura, semestre, conteo, límites heredados, estado y configuración que determina frecuencia/duración. HU-08 consume la demanda y aplica las restricciones de ubicación.
- Historia/publicación: las revisiones conservadas permiten que HU-08 y HU-12 fijen los valores de una versión. El CRUD del catálogo no modifica una publicación mediante referencias mutables sin control.

No se implementan en esta sesión los módulos HU-05 a HU-13 ni se cambian sus responsables. Las dependencias quedan explícitas para que quienes los desarrollen puedan integrarlas.

## Verificación y datos pendientes

Se mantiene la verificación funcional manual y el build/despliegue de Vercel. No se añaden suites unitarias obligatorias, cobertura mínima ni PR Gate. La evidencia por historia está en sus criterios de aceptación.

Antes de poblar o ejecutar escenarios con datos, el responsable debe aprobar las cuentas y roles de demostración, el catálogo de programas y materias con sus códigos y créditos, los datos del semestre y los grupos del escenario. Los parámetros y reglas ya aprobados en esta revisión conservan sus valores. La falta de un conjunto de datos no impide construir formularios y estados vacíos, pero impide dar por verificados los criterios que requieran esas entradas.
