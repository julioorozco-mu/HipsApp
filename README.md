# 🕺 HipsDance - Sistema de Gestión para Academia de Baile

Bienvenido al repositorio oficial de **HipsDance**, un sistema de gestión interna integral diseñado específicamente para las necesidades operativas de una academia de baile.

Este proyecto está estructurado como un **monorepo** y se compone de dos aplicaciones principales que trabajan en conjunto para facilitar la administración de los alumnos en piso y automatizar la comunicación con ellos vía WhatsApp.

---

## 🏗️ Arquitectura del Monorepo

El sistema está dividido en dos partes principales, cada una con su propia responsabilidad y entorno de ejecución.

### 1. `hipsApp/` (Progressive Web App)
Es el frontend y backend principal que utilizan los maestros y administradores. Está diseñado con una filosofía **Mobile-First** obligatoria, optimizado con botones grandes (`min-h-12` o `p-4`) y navegación táctil intuitiva para que los maestros operen el sistema rápidamente desde su celular durante una clase.

**Características principales:**
- **Control de Asistencias en Piso:** Registro ultra-rápido de alumnos mediante un esquema de tarjetas (cards) en lugar de tablas complejas.
- **Rachas (Streaks):** Sistema que cuenta asistencias consecutivas (`current_streak`, `highest_streak`). Se reinicia a 0 en caso de inasistencias.
- **Gestión de Membresías:** Control de tres estados dependientes de la fecha: `activa`, `por_vencer` (3 días previos), y `vencida`.
- **Integración de Playlists:** Envío de enlaces musicales (Spotify/YouTube) despachados al finalizar las clases.

**Stack Tecnológico:**
- **Framework:** Next.js (App Router)
- **Lenguaje:** TypeScript estricto
- **UI:** Tailwind CSS + shadcn/ui
- **Base de Datos / Backend:** Supabase (PostgreSQL) implementando lógica a través de React Server Components y Server Actions.
- **Hosting:** Optimizado para el ecosistema Serverless de Vercel.

---

### 2. `hipsdance-bot/` (Worker de WhatsApp Automatizado)
Es un servicio Node.js / Express extraído y separado de la PWA para evitar cortes en procesos largos por el entorno Serverless de Vercel. Actúa como un *Worker* permanente que procesa colas de mensajes hacia los alumnos.

**Características principales:**
- **Anti-Spam Seguro:** Implementa una cola interna (*Queue*) de mensajes. **Nunca** realiza envíos masivos simultáneos (`Promise.all`), sino que procesa un "throttling" de retraso aleatorio (entre 3 a 8 segundos) por interacción para evitar el baneo de la API por parte de WhatsApp.
- **Notificaciones Automáticas:** Responde a detonadores de la PWA (como recordatorios, alertas de vencimiento de membresías o el envío de playlists grupales).

**Stack Tecnológico:**
- **Framework:** Express.js + `whatsapp-web.js` + `qrcode-terminal`
- **Lenguaje:** TypeScript (ejecutado vía `tsx`)
- **Hosting:** Diseñado para servidores que admiten procesos continuos de larga duración (Render, Railway, Oracle Cloud, VPS).

---

## 🚀 Guía de Instalación y Uso

Dado que el proyecto es un monorepo, cada directorio gestiona sus propias dependencias. Se utiliza `pnpm` como gestor de paquetes (reflejado por los `pnpm-lock.yaml`).

### Requisitos previos
- Node.js (v18 o superior)
- `pnpm` instalado (`npm i -g pnpm`)
- Una cuenta y base de datos activa en Supabase (PostgreSQL).
- Un dispositivo móvil con WhatsApp para vincular el bot (mediante código QR).

### Iniciar la PWA (hipsApp)

```bash
cd hipsApp

# Instalar dependencias
pnpm install

# Configurar variables de entorno en el archivo .env.local
# (Requiere URLs y Claves de API de Supabase)

# Ejecutar el entorno de desarrollo
pnpm dev
```
*Visita [http://localhost:3000](http://localhost:3000) en tu navegador. Para revisar la UI, presiona F12 y activa la vista móvil en tu navegador, ya que el diseño es 100% Mobile-First.*

### Iniciar el Bot de WhatsApp (hipsdance-bot)

```bash
cd hipsdance-bot

# Instalar dependencias
pnpm install

# Ejecutar el bot
pnpm dev
```
*En la terminal se generará y mostrará un código QR. Escanéalo desde WhatsApp (Dispositivos Vinculados) para iniciar sesión e inicializar el bot.*

---

## 📋 Reglas de Arquitectura y Contribución (Vibe Coding)
Cualquier modificación o nueva funcionalidad debe apegarse estrictamente a las reglas de contexto (`CLAUDE.md`):
1. **Prioridad Móvil:** Mantener tarjetas grandes y legibles. Nunca sustituir por tablas inmanejables en un teléfono.
2. **Separación de Responsabilidades:** Aislar la Base de Datos (Supabase clients), Server Actions y UI.
3. **Optimización de React:** Favorecer React Server Components sobre Client Components (`"use client"` debe reservarse solo para partes interactivas muy puntuales).
4. **Seguridad en Bot:** Cualquier bucle de envíos de WhatsApp debe pasar forzosamente por la capa de throttling (3-8 seg de espera).

---
*Desarrollado para automatizar y mejorar significativamente la administración presencial de las clases de HipsDance.*
