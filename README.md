# Gestión y Programación de Horarios

Aplicación web para preparar, generar, validar, editar y publicar horarios académicos de la Facultad de Ingeniería. El MVP se desarrolla en seis semanas por un equipo de cuatro integrantes.

El producto gestiona asignaturas, docentes, disponibilidad, grupos con conteos agregados y parámetros del semestre. Permite ajustar borradores, identificar conflictos y consultar horarios publicados. El piloto excluye aulas, matrícula y datos individuales de estudiantes, integraciones institucionales en tiempo real y garantía de un horario matemáticamente óptimo.

El mockup de Figma sirve como referencia funcional. La disposición, organización y apariencia visual de la aplicación podrán cambiar. El producto tendrá persistencia y validaciones reales en el servidor.

## Stack

- **Aplicación:** Next.js, React y TypeScript, con frontend y backend en un monolito y un solo despliegue de aplicación.
- **Base de datos y autenticación:** Supabase PostgreSQL y Supabase Auth.
- **Hosting y despliegue:** Vercel.
- **Código y seguimiento:** GitHub y el [Project del equipo](https://github.com/users/dsramireza/projects/2), con los issues existentes.

El acceso utiliza correo institucional y contraseña, con validación del dominio en frontend y backend y permisos por rol.

## Colaboración

Cada issue se trabaja en una rama creada desde `main`. La integración se realiza mediante un PR aprobado; al integrarlo en `main`, Vercel compila y despliega una nueva versión si el build tiene éxito.

Las instrucciones para agentes y el workflow completo están en [AGENTS.md](AGENTS.md). La configuración de hosting, la base única de Supabase y los pasos de ejecución están en [Despliegue y conexión](docs/despliegue.md). El [acceso institucional](docs/acceso-institucional.md) explica sesiones, roles, auditoría y administración de cuentas. El endpoint `/api/health` conserva el diagnóstico del backend; las funciones académicas se desarrollan mediante las HUs del proyecto.

El [roadmap de HU-01 a HU-04](docs/roadmap-hu01-hu04.md) recoge los acuerdos aprobados, la relación con las fuentes, la secuencia de trabajo y las dependencias para su cierre.

El [catálogo de asignaturas](docs/catalogo-asignaturas.md) documenta la carga aprobada del programa de Ingeniería de Sistemas, sus validaciones y la separación entre asignaturas y grupos.

La [configuración de frecuencia y duración](docs/configuracion-asignaturas.md) describe las revisiones por asignatura/semestre y sus contratos para parámetros, grupos y programación.

La [gestión de grupos y conteos](docs/grupos-conteos.md) documenta los estados calculados, auditoría y demanda de sesiones por grupo.

La [continuidad de HU-06 a HU-13](docs/continuidad-hu06-hu13.md) recoge el estado revisado, los permisos aprobados y el orden de las siguientes entregas.

Los [parámetros del semestre](docs/parametros-semestre.md) documentan fechas, franjas institucionales, límites versionados y datos pendientes de revisión al cambiarlos.

La [gestión de docentes](docs/docentes.md) describe los datos de dedicación y escalafón, su historial y el contrato de revisiones para las HUs de programación.
