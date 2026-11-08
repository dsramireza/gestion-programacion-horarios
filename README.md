# Gestión y Programación de Horarios

Aplicación web para preparar, generar, validar, editar y publicar horarios académicos de la Facultad de Ingeniería. El MVP se desarrolla en seis semanas por un equipo de cuatro integrantes.

El producto gestiona asignaturas, docentes, disponibilidad, grupos con conteos agregados y parámetros del semestre. Permite ajustar borradores, identificar conflictos y consultar horarios publicados. El piloto excluye aulas, matrícula y datos individuales de estudiantes, integraciones institucionales en tiempo real y garantía de un horario matemáticamente óptimo.

El mockup de Figma sirve como referencia funcional. La disposición, organización y apariencia visual de la aplicación podrán cambiar. El producto tendrá persistencia y validaciones reales en el servidor.

## Stack

- **Aplicación:** Next.js, React y TypeScript, con frontend y backend en un monolito y un solo despliegue de aplicación.
- **Base de datos y autenticación:** Supabase PostgreSQL y Supabase Auth.
- **Hosting y despliegue:** Vercel.
- **Código y seguimiento:** GitHub y el Project del equipo, con los issues existentes.

El acceso utiliza correo institucional y contraseña, con validación del dominio en frontend y backend y permisos por rol.

## Colaboración

Cada issue se trabaja en una rama creada desde `main`. La integración se realiza mediante un PR aprobado; al integrarlo en `main`, Vercel compila y despliega una nueva versión si el build tiene éxito.

Las instrucciones para agentes y el workflow completo están en [AGENTS.md](AGENTS.md). Este repositorio se encuentra en preparación; la configuración del hosting y la implementación de la aplicación se realizarán en sus tareas correspondientes.
