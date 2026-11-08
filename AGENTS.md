# Instrucciones para agentes

Estas instrucciones aplican a todo el repositorio. Antes de trabajar, lee `README.md`, este archivo, el issue existente asignado y sus criterios de aceptación.

## Contexto y fuentes

- Es un MVP académico de la Facultad de Ingeniería, desarrollado por cuatro integrantes en seis semanas y seis sprints semanales. Mantén el alcance acotado y la solución sencilla.
- El backlog funcional ya está definido en el [GitHub Project del equipo](https://github.com/users/dsramireza/projects/2). Trabaja con las HUs existentes sin duplicarlas ni reconstruirlas. Puedes crear los issues de configuración y documentación necesarios, comprobando antes que no existan.
- Las decisiones expresas y vigentes del equipo prevalecen sobre propuestas anteriores. Señala las contradicciones que afecten el comportamiento del producto antes de implementar la parte afectada.
- En el workspace original, las fuentes están fuera de este repositorio: `../proyecto.md`, `../entregables/Acta.md`, `../entregables/Avances.md` y `../entregables/Historias_Usuario_Backend_MVP.md`. Las historias consolidadas siguen siendo una propuesta donde haya decisiones pendientes; no conviertas sus interpretaciones en requisitos aprobados.
- Contrasta las cifras con `proyecto.md`; si allí no aparecen, usa las del Acta. Acta y Avances orientan el alcance y la funcionalidad. Los parámetros serán configurables y el piloto conservará los valores acordados: capacidad objetivo de 40, tolerancia del 10 % y cierre de grupos con menos de 10 estudiantes.
- El cronograma vigente es de seis semanas. La EDT es el único documento que conserva la referencia desactualizada a doce semanas; no la traslades a la planificación ni modifiques esa excepción por iniciativa propia.
- El mockup está en `../High-Fidelity Academic Management Mockup`. Es una guía funcional para pantallas e interacciones; los colores, disposición y organización visual pueden cambiar. Sus datos de muestra, estados locales y permisos simulados no son reglas de negocio.
- Estas fuentes externas pueden no estar disponibles en otro clon. Usa el issue y la documentación versionada disponible; si falta una regla necesaria, solicita esa información sin inventarla.

## Arquitectura acordada

- Usa Next.js con React y TypeScript para frontend y backend en una sola aplicación. Conserva módulos claros para acceso, catálogos, docentes, grupos, parámetros y programación, dentro del mismo monolito.
- Vercel aloja y despliega la aplicación. Supabase proporciona PostgreSQL y Auth como servicios administrados separados; no requieren un segundo despliegue del backend de la aplicación.
- Se usa un único proyecto Supabase y una sola base de datos, compartidos por desarrollo, previews y producción, con datos de demostración. No crees bases, proyectos ni ramas de Supabase por ambiente. Consulta `docs/despliegue.md` para los recursos y variables de conexión.
- Prioriza las capacidades del stack existente. Añade dependencias o infraestructura cuando la tarea lo justifique; evita introducir servicios, pipelines o capas sin una necesidad concreta del MVP.
- Mantén las reglas de negocio en el servidor y la persistencia en Supabase. La interfaz presenta formularios, horarios y resultados; sus controles no sustituyen la validación del backend.
- Implementa correo institucional y contraseña con Supabase Auth. Valida el dominio tanto en frontend como en backend. El dominio por sí solo no autentica ni determina el rol.
- Verifica sesión y permisos en cada operación protegida. Protege las tablas expuestas con RLS y permisos mínimos; los roles deben controlarse desde el servidor, no desde datos editables por el usuario.
- Usa variables de entorno para las credenciales. Las claves secretas o de servicio permanecen en el servidor; no las publiques en el frontend, logs, commits ni documentación. Los ejemplos de configuración solo contienen marcadores.
- Versiona los cambios de esquema como migraciones SQL en `supabase/migrations`. Incluye en el PR las instrucciones de aplicación cuando corresponda y evita cambios remotos de esquema fuera del historial versionado.
- El piloto excluye aulas, matrícula, datos individuales de estudiantes, reasignación individual, integraciones institucionales en tiempo real y garantía de óptimo matemático global.

## Ramas e implementación

1. Identifica el issue existente en el Project y lee su alcance, dependencias y criterios de aceptación. Si no tienes acceso, solicita el enlace o ID; no crees un reemplazo.
2. Revisa el estado de Git y conserva el trabajo pendiente del desarrollador. Actualiza las referencias remotas antes de elegir la base; si falla la conexión, informa la limitación y comprueba la base por un acceso disponible.
3. Crea una rama por issue desde `main` actualizado, por ejemplo `feat/issue-<id>-<descripcion>`, `fix/issue-<id>-<descripcion>` o `docs/issue-<id>-<descripcion>`. No implementes sobre `main` ni reutilices ramas de otros issues.
4. Implementa únicamente lo necesario para el issue. Conserva los cambios ajenos y evita refactorizaciones o ampliaciones de alcance no solicitadas.
5. Revisa el diff y documenta las comprobaciones realizadas y las limitaciones reales. Cuando corresponda, comprueba manualmente el flujo afectado frente a los criterios del issue, sin inventar resultados.
6. Publica la rama y abre un PR hacia `main`, vinculando el issue existente. Usa `Closes #<numero>` solo si el PR resuelve por completo un issue de ese repositorio; para elementos del Project utiliza su enlace o identificador real.
7. La aprobación del PR permite su integración. La revisión y el merge corresponden al equipo; un agente solo los realiza si recibe una instrucción expresa para ello.

No se utiliza una rama permanente `developer`, `develop` o `development`. Los cambios llegan a `main` mediante PR.

## Build y despliegue

- El flujo acordado es: **issue → rama desde main → PR → aprobación → merge en main → build en Vercel → despliegue si el build tiene éxito**.
- Cada PR integrado produce una nueva versión de la aplicación mediante ese pipeline. La aprobación por sí sola no modifica producción: el disparador es la integración en `main`.
- Si el build falla, la versión nueva no se publica y se corrige el fallo mediante el mismo flujo de ramas y PR. La compilación correcta no demuestra por sí sola que todos los criterios funcionales estén satisfechos.
- Las previews de ramas o PR, si se habilitan, son auxiliares y no sustituyen el despliegue de `main` ni añaden requisitos de aprobación al MVP.
- Usa la integración de Git de Vercel como pipeline básico. No añadas un segundo pipeline de despliegue en GitHub Actions ni un PR Gate.
- No se exigen pruebas unitarias, umbrales de cobertura ni checks de cobertura para aprobar, integrar o desplegar. No crees ni solicites suites unitarias como paso automático del trabajo. Esta decisión vigente sustituye, para el workflow del piloto, la exigencia de cobertura citada en propuestas o documentos anteriores.
- No añadas gates de lint, tipos u otros controles al PR por iniciativa propia. El pipeline obligatorio se limita al build y al despliegue posterior exitoso.
- La base de datos conserva sus migraciones y permisos independientemente del despliegue de Vercel. Si un cambio requiere una migración remota, indica el orden de aplicación y coordínalo con el responsable antes de publicar una versión que dependa de ella.
- Mantén inicialmente el repositorio privado. La visibilidad, cuentas, planes y servicios de hosting solo se cambian con una decisión expresa del equipo. La colaboración y las previews con commits de otros integrantes deben comprobarse al conectar Vercel.

## Autoría y entrega de los agentes

- Los agentes pueden preparar cambios, crear commits, publicar ramas y abrir PRs dentro de la tarea autorizada. Deben conservar la identidad del desarrollador responsable.
- Antes de crear commits, comprueba `git config user.name` y `git config user.email`, y usa la cuenta académica configurada para este proyecto. No cambies la identidad global ni atribuyas trabajo a otra persona.
- El autor y el committer deben corresponder al desarrollador autorizado. No agregues trailers `Co-authored-by` ni firmas de coautoría de Codex, ChatGPT, bots u otros agentes.
- Si publicas mediante una API, verifica que la identidad autenticada y la autoría resultante correspondan al desarrollador. No publiques commits atribuidos a una cuenta de agente como alternativa a un fallo de conexión.
- El PR debe explicar el comportamiento o documentación resultante, vincular el issue y describir las comprobaciones reales. No declares pruebas, build, despliegues o configuraciones como completados si no se ejecutaron.
- Los cambios solo documentales no requieren instalar dependencias ni ejecutar build. La implementación del hosting, la aplicación o sus configuraciones debe figurar como pendiente mientras no se haya realizado.
- Los agentes pueden crear issues necesarios para configuración y documentación, por autorización del equipo, comprobando antes que no existan. Las HUs funcionales ya están definidas: no las dupliques. No modifiques sus criterios de aceptación ni el estado de otros issues sin que la tarea lo requiera o el equipo lo indique.
