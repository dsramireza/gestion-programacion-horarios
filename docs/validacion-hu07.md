# Guía de validación funcional — HU-07

Esta guía convierte la comprobación solicitada en el chat en una secuencia reproducible. **Los casos de este documento están pendientes de ejecución manual**: escribir los pasos no acredita su resultado. Las verificaciones técnicas ya realizadas se distinguen en la sección 8.

- Historia: [HU-07 — Parámetros de semestre y franjas institucionales, issue #9](https://github.com/dsramireza/gestion-programacion-horarios/issues/9).
- Entrega: [PR #29](https://github.com/dsramireza/gestion-programacion-horarios/pull/29).
- Contratos y reglas: [Parámetros del semestre](parametros-semestre.md).
- Integración relacionada: HU-03, CA-06, [issue #5](https://github.com/dsramireza/gestion-programacion-horarios/issues/5).

## 1. Preparación y datos de referencia

### Acceso a la versión que se debe comprobar

Usa la preview funcional del commit `6a1b3111d051cd2e93b9dad2eca53bba1a8dc12b`:

| Pantalla | Enlace |
| --- | --- |
| Parámetros | [Abrir parámetros](https://gestion-programacion-horarios-6uz1jfid0-daram1025s-projects.vercel.app/parametros) |
| Frecuencia y duración | [Abrir configuración](https://gestion-programacion-horarios-6uz1jfid0-daram1025s-projects.vercel.app/configuracion) |
| Grupos y conteos | [Abrir grupos](https://gestion-programacion-horarios-6uz1jfid0-daram1025s-projects.vercel.app/grupos) |

Los enlaces de esta guía pertenecen a esa misma preview. Después del merge se podrá repetir la comprobación en el dominio de producción, una vez confirmado su despliegue. No mezcles pantallas de distintas versiones durante una ejecución.

Inicia sesión con la cuenta Administrador autorizada `dsramireza@unbosque.edu.co`, usando tu contraseña habitual. Si Vercel solicita acceso a la preview, completa también ese acceso con tu cuenta de Vercel.

### Valores aprobados del piloto

| Campo | Valor esperado |
| --- | --- |
| Semestre | 2026-2 |
| Fecha inicial | 01/06/2026 |
| Fecha final | 31/12/2026 |
| Estado | Activo |
| Lunes a viernes | Habilitados, 07:00–22:00 |
| Sábado | Habilitado, 07:00–13:00 |
| Domingo | Deshabilitado |
| Bloque excluido diario | 12:00–13:00 |
| Duración | 120 minutos |
| Máximo de sesiones semanales | 4 |
| Capacidad objetivo | 40 |
| Mínimo de estudiantes | 10 |
| Tolerancia | 10 %; máximo tolerado 44 estudiantes |

Datos existentes al preparar la entrega: Bases de Datos (`BDD2026-003`) y Estructuras de Datos (`EDD2026-002`) tienen frecuencia 3 y duración 120 minutos en 2026-2. El grupo `EDD2026-002G3` tiene 38 estudiantes, estado Abierto y demanda de 360 minutos semanales cuando sus referencias están vigentes.

La base es compartida por todas las versiones. **Guardar sí modifica datos e historial**, incluso si se conservan los mismos valores. No hay que crear grupos, cuentas, asignaturas ni semestres ficticios. Si otro integrante modificó los datos de referencia, registra la diferencia antes de continuar; no sobrescribas sus cambios para reproducir esta guía.

### Registro de la ejecución

Completa estos campos antes de empezar:

- Responsable: pendiente.
- Fecha y hora, zona America/Bogota: pendiente.
- Host utilizado y commit comprobado: pendiente.
- Revisión vigente de parámetros al inicio, denominada **R0** en esta guía: pendiente.
- Revisiones iniciales de Bases de Datos, Estructuras de Datos y grupo G3: pendiente.

Usa `Pendiente`, `Aprobado`, `Fallido` o `Bloqueado` en los resultados. Registra el paso y el mensaje observado si algo falla. No incluyas contraseñas, cookies, tokens ni cabeceras de autenticación como evidencia.

## 2. Acceso y consulta inicial — V01

1. Sin sesión de la aplicación, abre `/parametros` en una ventana privada.
2. Comprueba que aparece el acceso institucional y no se muestran parámetros académicos.
3. En la ventana habitual, inicia sesión como Administrador y abre `/parametros`.
4. Selecciona **2026-2** y pulsa **Consultar**.
5. Compara todos los campos con la tabla de valores aprobados.
6. Confirma que la duración se presenta como 120 minutos y no como un campo de edición libre.
7. Abre **Historial de parámetros** y anota el número de la revisión vigente R0.
8. Recarga. Deben conservarse valores, semestre y revisión vigente.

**Resultado esperado:** consulta correcta, formulario editable para Administrador y datos persistidos. La revisión inicial de HU-03 puede mostrar la explicación de que aún no registraba fechas/estado en su historial; no debe inventar un motivo ni atribuir retrospectivamente esos datos a un guardado antiguo.

**Evidencia:** valores observados y revisión R0; captura de la pantalla autenticada, si resulta útil.

## 3. Rechazo de valores inválidos — V02

Ejecuta cada fila por separado en `/parametros`. Mantén los demás campos válidos e ingresa un motivo, salvo cuando se compruebe su ausencia. Pulsa **Guardar nueva revisión** y después restaura el campo o recarga antes del siguiente caso.

| Caso | Entrada que se debe intentar | Resultado esperado |
| --- | --- | --- |
| V02.1 | Código vacío | Rechazo; código obligatorio. |
| V02.2 | Fecha final 31/05/2026, anterior al inicio 01/06/2026 | Rechazo por orden de fechas. |
| V02.3 | Máximo de sesiones 0 | Rechazo; entero positivo. |
| V02.4 | Máximo de sesiones 1,5 —o 1.5, según el navegador— | Rechazo; no admite fracciones. |
| V02.5 | Capacidad 0 | Rechazo; capacidad positiva. |
| V02.6 | Mínimo 41, conservando capacidad 40 | Rechazo; mínimo superior a capacidad. |
| V02.7 | Tolerancia −1 | Rechazo; tolerancia no negativa. |
| V02.8 | Motivo vacío o compuesto solo por espacios | Rechazo; motivo obligatorio. |
| V02.9 | Deshabilitar todos los días | Rechazo; debe existir al menos un día habilitado. |
| V02.10 | Lunes 10:00–10:00 o 14:00–10:00 | Rechazo; inicio debe ser menor que fin. |
| V02.11 | Lunes 12:00–13:00, con exclusión 12:00–13:00 | Rechazo; no queda espacio para una sesión. |
| V02.12 | Lunes 11:00–14:00, con exclusión 12:00–13:00 | Rechazo; quedan dos tramos de una hora y ninguno permite 120 minutos continuos. |
| V02.13 | Exclusión 13:00–12:00 o 12:00–12:00 | Rechazo; intervalo excluido incoherente. |

El navegador puede impedir el envío por un campo requerido, rango o formato; en ese caso no habrá petición HTTP. Si la solicitud llega a la API y sus valores son inválidos, debe responder 422. No es necesario forzar el navegador para completar la comprobación funcional de esta tabla.

**Validación común a todas las filas:** tras recargar, R0 y los valores guardados deben seguir iguales. No debe aparecer mensaje de éxito, revisión nueva ni cambio en la demanda. Si un caso inválido se guarda, registra el caso y detén la secuencia antes de generar más cambios.

## 4. Guardado versionado e historial — V03

1. Recarga `/parametros`, selecciona 2026-2 y verifica que todos los valores vuelven a coincidir con los aprobados.
2. Mantén código, fechas, estado, franjas, exclusión y límites sin cambios.
3. En **Motivo del cambio**, escribe `Confirmación de parámetros del piloto`.
4. Pulsa **Guardar nueva revisión** una sola vez y espera la respuesta.
5. Debe aparecer: **«La nueva revisión se guardó correctamente. Consulta los datos pendientes de revisión antes de programar.»**
6. Abre el historial y registra la revisión nueva como **R1**.
7. Verifica que R1 es la única vigente, que su número es R0 + 1 y que R0 continúa como anterior.
8. Abre R1: debe conservar responsable, fecha, motivo, código, fechas, estado y todos los parámetros completos.
9. Recarga y vuelve a consultar: R1 y su historial deben persistir.

**Resultado esperado:** se crea una revisión, incluso al confirmar los mismos valores. No se sobrescribe R0. Los conteos y frecuencias existentes no cambian automáticamente.

**Evidencia:** números R0/R1, motivo y responsable/fecha visibles. Si se inspecciona la pestaña Red del navegador, el POST a `/api/semester-parameters` debe responder 201 y devolver una revisión nueva.

## 5. Escrituras concurrentes — V04

Esta comprobación añade una revisión más con los mismos valores aprobados. Ejecútala antes de revalidar las asignaturas y el grupo, para no tener que repetir ese trabajo.

1. Abre `/parametros` para 2026-2 en dos pestañas, **A** y **B**, con la misma cuenta.
2. Ambas deben cargar R1. No recargues B después de este punto.
3. En A conserva los valores aprobados, escribe `Confirmación concurrente de parámetros del piloto` como motivo y guarda.
4. A debe guardar una revisión nueva, **R2**.
5. En B conserva los valores aprobados, ingresa un motivo y pulsa **Guardar nueva revisión**.
6. B debe rechazar el guardado y mostrar **«Los parámetros cambiaron. Recarga la página antes de guardar.»** Si se inspecciona Red, el POST debe responder 409.
7. Recarga B: debe mostrar R2 vigente y las revisiones previas, sin una revisión adicional creada por el intento rechazado.

**Resultado esperado:** no se pierde el guardado de A ni se sobrescriben parámetros desde una pestaña desactualizada.

Si V04 no se ejecuta, continúa con R1. En los pasos siguientes, **R vigente** significa la última revisión guardada correctamente, R1 o R2 según corresponda.

## 6. Impacto, revalidación y demanda — V05 a V08

### V05. Detectar referencias anteriores antes de revalidarlas

1. En `/parametros`, recarga y consulta **Datos que requieren revisión**.
2. Deben aparecer las configuraciones anteriores de `BDD2026-003` y `EDD2026-002`, y el grupo `EDD2026-002G3`, si aún utilizan R0.
3. Abre `/grupos`, selecciona 2026-2 y consulta con todas las asignaturas y todos los estados.
4. Localiza `EDD2026-002G3`: debe seguir con 38 estudiantes y estado Abierto.
5. Su demanda debe estar bloqueada por revisión pendiente, con el texto **«Revisar conteo: cambiaron los parámetros»** mientras el grupo conserve la referencia anterior.

**Resultado esperado:** las filas siguen existiendo. El grupo puede estar Abierto y tener demanda bloqueada: el estado de capacidad y la vigencia de sus referencias son comprobaciones diferentes. No se ofrecen sesiones programables con parámetros anteriores.

### V06. Revalidar las dos configuraciones de asignatura

1. Abre `/configuracion`, selecciona 2026-2 y **Bases de Datos — BDD2026-003**; pulsa **Consultar**.
2. Conserva frecuencia **3** y duración **120 minutos**. Pulsa **Guardar nueva revisión**.
3. Comprueba el mensaje de éxito, recarga y verifica que ambas revisiones —anterior y nueva— permanecen en el historial.
4. Repite el proceso con **Estructuras de Datos — EDD2026-002**, también con **3 sesiones de 120 minutos**.
5. Vuelve a `/parametros` y recarga: esas dos configuraciones deben dejar de figurar como pendientes.
6. El grupo debe continuar pendiente hasta guardar su conteo. Revalidar una asignatura no debe actualizar el grupo silenciosamente.

**Resultado esperado:** cada configuración crea su revisión con los parámetros vigentes, manteniendo la frecuencia aprobada y su historial. No configures las otras asignaturas para esta comprobación.

### V07. Revalidar el grupo existente

1. En `/grupos`, localiza `EDD2026-002G3` y pulsa **Editar e historial**.
2. Confirma Estructuras de Datos, semestre 2026-2 y código de grupo **G3**. No crees un grupo nuevo ni cambies su contexto.
3. Conserva **38 estudiantes** y pulsa **Guardar grupo**.
4. Debe regresar al listado con **«El grupo se guardó y su estado se recalculó correctamente.»**
5. Recarga el listado. El código debe seguir siendo `EDD2026-002G3`, el conteo 38 y el estado Abierto.
6. La demanda debe mostrar **3 sesiones × 120 min (360 min/semana)**.
7. Abre de nuevo **Editar e historial** y confirma que el guardado agregó una revisión, conservando las anteriores.

**Resultado esperado:** se conserva el mismo grupo y vuelve a ser programable con las referencias actuales. No se ubican sesiones ni se genera un horario en esta HU.

### V08. Comprobar el estado final tras recargar

1. Regresa a `/parametros`, selecciona 2026-2 y recarga.
2. Debe aparecer **«Las configuraciones y los grupos existentes no tienen referencias pendientes de revisión.»**, siempre que no existan otras filas agregadas durante la ejecución.
3. Verifica de nuevo los valores aprobados de la sección 1 y la revisión vigente.
4. Abre `/configuracion` y `/grupos`: deben persistir las frecuencias 3, duración 120, conteo 38 y demanda 360.

**Resultado esperado:** ciclo completo de parámetros → referencias pendientes → revalidación de asignaturas/grupo → demanda recuperada. Esta evidencia contribuye a HU-03 CA-06; los rechazos con un máximo distinto ya tienen comprobación técnica transaccional y no requieren alterar el máximo operativo 4 para esta guía.

## 7. Permisos y creación de semestre — comprobaciones condicionadas

### V09. Director y otros roles

Ejecuta con cuentas aprobadas disponibles. No crees cuentas ficticias ni cambies el rol o estado de la única cuenta Administrador por tu cuenta para completar este apartado.

| Identidad | Pasos | Resultado esperado |
| --- | --- | --- |
| Director | Iniciar sesión, abrir `/parametros`, consultar semestre e historial. | Consulta permitida; controles deshabilitados, sin botón de guardar ni opción de crear semestre. |
| Director, comprobación técnica | Intentar POST válido a `/api/semester-parameters` con esa sesión mediante herramientas de desarrollo autorizadas. | HTTP 403 y ninguna revisión nueva. Los controles visuales no sustituyen esta comprobación. |
| Docente o Estudiante-consulta | Intentar `/parametros` y GET `/api/semester-parameters`. | Pantalla de acceso denegado y API HTTP 403; no se exponen parámetros. |
| Sin sesión | Intentar `/parametros` y GET `/api/semester-parameters`. | Login institucional para la página y API HTTP 401. |
| Cuenta inactiva | Solo si existe una cuenta de comprobación aprobada y coordinada; intentar consulta/escritura. | Denegación de acceso; ninguna modificación. |

Si falta una cuenta, marca el caso manual como **Bloqueado por cuenta no disponible**. No lo marques aprobado por haber comprobado únicamente Administrador. La evidencia técnica previa de Director/inactivo/anónimo se conserva por separado.

### V10. Crear un semestre y comprobar un único activo

La creación positiva necesita código y fechas de otro semestre aprobados por el responsable. Actualmente solo se ha aprobado 2026-2; **este apartado queda bloqueado hasta disponer de esos datos**. No uses un período inventado para poder marcar CA-01.

Cuando exista ese acuerdo:

1. Selecciona **Crear semestre** y pulsa **Consultar**.
2. Ingresa el nuevo código y fechas aprobados, parámetros acordados y motivo; deja inactivo el nuevo semestre y pulsa **Crear semestre**.
3. Confirma su persistencia, revisión inicial completa y que 2026-2 sigue activo.
4. Intenta activar el nuevo semestre mientras 2026-2 permanece activo. Debe rechazarse con **«Ya hay otro semestre activo. Inactívalo primero.»**, HTTP 409 si llega a la API, sin agregar una revisión exitosa.
5. Si el responsable ha decidido cambiar el semestre operativo, inactiva primero 2026-2 mediante un guardado con motivo y después activa el nuevo mediante otro guardado con motivo. Verifica cada historial y que queda un solo activo.
6. Si ese cambio solo formó parte de una comprobación autorizada, restablece el estado operativo acordado mediante nuevas revisiones; no borres el historial ni dejes semestres adicionales activos. Revalida las referencias afectadas siguiendo la sección 6.

Crear un semestre con código duplicado también debe rechazarse sin duplicar la fila. Un rechazo de duplicado o de segundo activo no acredita por sí solo la creación positiva del paso 2.

## 8. Comprobaciones técnicas ya realizadas y pendientes adicionales

La entrega del PR #29 ya registró build local y Vercel correctos, validador compartido con doce solicitudes inválidas y franja hasta 24:00, y pruebas SQL transaccionales de versionado/auditoría, concurrencia, reglas de intervalos/fechas/límites, unicidad de activo y permisos. También se comprobó que cambiar transaccionalmente el máximo a 2 hace rechazar frecuencia 3 y aceptar 2 en HU-03. **Esos cambios se revirtieron y no son guardados operativos desde la pantalla.** El detalle está en [la documentación de HU-07](parametros-semestre.md#verificación-de-esta-entrega).

Para una revisión adicional de API, el equipo puede inspeccionar solicitudes desde una sesión autorizada y comprobar: duración distinta de 120, fechas inexistentes, días duplicados, campos ajenos como identidad/rol y payload incompleto. Deben rechazarse con 422 sin crear revisión. La lectura protegida debe usar `Cache-Control: private, no-store`. No hace falta crear una suite unitaria ni un gate de CI para ejecutar o registrar estas comprobaciones.

## 9. Aceptación que depende de HU-08 y HU-12

Los siguientes escenarios siguen **Bloqueados por implementación**, no aprobados por ausencia de sesiones:

1. **HU-07 CA-04, uso por validación de horarios:** generar un borrador persistido mediante HU-08, comprobar que referencia la revisión explícita de parámetros y que sus sesiones respetan fechas, días, franjas, exclusión y duración vigentes.
2. **HU-07 CA-05, sesiones afectadas:** con sesiones existentes, cambiar un parámetro aprobado que invalide alguna, comprobar que se identifican las sesiones concretas y que el escenario requiere nueva validación. La lista actual de grupos/configuraciones pendientes no sustituye esta evidencia.
3. **HU-07 CA-05, publicación:** publicar un horario mediante HU-12, cambiar parámetros y comprobar que la publicación anterior conserva su revisión, contenido e historial. Un nuevo escenario debe validarse y publicarse explícitamente.

Los datos y cambios de esos escenarios deberán acordarse al implementar las HUs correspondientes. No adelantar fechas, docentes ni sesiones de ejemplo para simular una aceptación completa.

## 10. Matriz de resultados y condición de cierre

Completa la columna de resultado y agrega evidencia; esta tabla no cambia automáticamente los checks de GitHub.

| Caso | Qué acredita | Resultado al crear esta guía | Evidencia de ejecución |
| --- | --- | --- | --- |
| V01 | Acceso, selección y valores iniciales | Pendiente | Por completar |
| V02.1–V02.13 | Validaciones de formulario y ausencia de cambios inválidos | Pendiente | Registrar cada fila |
| V03 | Guardado, revisión, motivo, actor y persistencia | Pendiente | R0, R1, fecha y motivo |
| V04 | Rechazo de escritura obsoleta | Pendiente | R1, R2 y mensaje/409 |
| V05 | Detección de referencias anteriores y demanda bloqueada | Pendiente | Códigos y motivo visible |
| V06 | Revalidación de asignaturas sin cambiar frecuencia | Pendiente | Revisiones de BDD y EDD |
| V07 | Revalidación de grupo y demanda recuperada | Pendiente | Revisión G3, conteo y demanda |
| V08 | Consistencia final y persistencia del ciclo | Pendiente | Revisión vigente y ausencia de pendientes |
| V09 | Permisos por rol desde la aplicación/API | Pendiente según cuentas disponibles | Cuenta/rol, resultado y estado HTTP |
| V10 | Creación positiva y cambio controlado de activo | Bloqueado por datos de otro semestre no aprobados | Acuerdo de datos y revisiones, cuando existan |
| Integraciones de sección 9 | Validación de sesiones y preservación de publicación | Bloqueado por HU-08/HU-12 | Borrador, sesiones, publicación y revisiones |

Relación con los cinco criterios de la issue #9, identificados aquí por su orden:

| Criterio | Evidencia necesaria para marcarlo completo |
| --- | --- |
| CA-01: crear/seleccionar semestre con fechas y estado; activo único | V01, V03 y V10, incluida creación positiva con datos aprobados. |
| CA-02: parámetros versionados | V01, V03 y consulta de valores del historial. No incluye umbrales de carga aún no acordados. |
| CA-03: coherencia de intervalos y duración | V02 y evidencia técnica del rechazo en servidor; conservación de valores iniciales. |
| CA-04: auditoría y versión usada en validación de horarios | V03/V04 y escenario de HU-08 descrito en sección 9. La auditoría local por sí sola es parcial. |
| CA-05: sesiones afectadas y publicación anterior trazable | Escenarios de sesiones/publicación de sección 9, dependientes de HU-08/HU-12. |

Al terminar, comunica casos aprobados/fallidos/bloqueados, revisiones finales y cualquier dato que haya cambiado. Actualiza los criterios y el número de pendientes en GitHub solo con esa evidencia. Un fallo debe incluir paso, resultado esperado y resultado observado. El PR parcial conserva `Refs #9`; cerrar o mover a Done requiere los cinco criterios completos y un PR con `Closes #9`, conforme a AGENTS.md. La integración con demanda puede aportar evidencia a HU-03 CA-06 sin cerrar sus dependencias restantes con HU-08/HU-12.
