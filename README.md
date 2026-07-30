# HipsDance Monorepo

Bienvenido al repositorio principal de HipsDance. Este repositorio utiliza una estructura de monorepo para organizar los diferentes proyectos que componen el sistema.

## Estructura del Proyecto

- **[`hipsApp/`](./hipsApp/)**: Aplicación web progresiva (PWA) principal desarrollada con Next.js, encargada de la gestión de alumnos, membresías y asistencias.
- **[`hipsdance-bot/`](./hipsdance-bot/)**: Bot de WhatsApp desarrollado en Node.js/TypeScript para interactuar con los alumnos y enviar notificaciones.

Cada carpeta contiene su propio `README.md` con las instrucciones específicas para instalar dependencias, configurar variables de entorno y ejecutar los proyectos localmente.

## Instalación General

Para comenzar con cualquiera de los proyectos, asegúrate de navegar al directorio correspondiente e instalar las dependencias, por ejemplo:

```bash
# Para la PWA
cd hipsApp
pnpm install
pnpm dev

# Para el Bot
cd hipsdance-bot
pnpm install
pnpm start
```
