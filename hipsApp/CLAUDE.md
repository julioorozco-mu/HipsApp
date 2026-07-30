# Contexto del Proyecto: PWA Academia de Baile

## Propósito
Sistema de gestión interna (Progressive Web App) para una academia de baile. Permite a los maestros gestionar alumnos, registrar asistencias rápidas en piso, controlar membresías y detonar automatizaciones de mensajes de WhatsApp.

## Stack Tecnológico
- **Frontend / Backend (API Routes):** Next.js (App Router)
- **Lenguaje:** TypeScript estricto
- **Estilos / UI:** Tailwind CSS + shadcn/ui
- **Base de Datos / Autenticación:** Supabase (PostgreSQL)
- **Mensajería Automatizada:** `whatsapp-web.js` (Diseñado como un servicio extraíble para evitar cierres por el entorno Serverless de Vercel).
- **Hosting Proyectado:** Vercel (PWA) + Render/Oracle Cloud (Worker de WhatsApp)

## Reglas Estrictas de Desarrollo (Vibe Coding)

1. **Diseño Mobile-First Obligatorio:** 
   - El usuario final es un maestro operando el sistema desde un celular durante una clase. 
   - Las interfaces deben priorizar botones grandes (`min-h-12` o `p-4`), tipografía legible y navegación táctil sin esfuerzo.
   - Evitar tablas complejas en móvil; preferir tarjetas (Cards) apiladas.

2. **Seguridad y Anti-Spam (WhatsApp):**
   - **NUNCA** ejecutar envíos masivos con `Promise.all()`.
   - Toda función que dispare múltiples mensajes a la API de WhatsApp debe implementar una cola (Queue) con un "throttling" (retraso aleatorio) de entre 3 y 8 segundos por iteración.

3. **Arquitectura y Limpieza de Código:**
   - Separar estrictamente la lógica de la Base de Datos (Supabase clients), los Server Actions (Next.js) y los Componentes de Presentación (UI).
   - Preferir React Server Components (RSC) siempre que sea posible.
   - Usar Server Actions para mutaciones (ej. registrar asistencia).
   - Mantener los componentes cliente (`"use client"`) pequeños y específicos (ej. un botón con estado de carga).

4. **Lógica de Negocio Principal:**
   - **Rachas (Streaks):** La base de datos lleva un conteo de asistencias consecutivas (`current_streak`, `highest_streak`). Se resetean a 0 en caso de inasistencias.
   - **Membresías:** Tienen tres estados dependientes de fechas: `activa`, `por_vencer` (3 días previos), `vencida`.
   - **Playlists:** Las funciones de finalización de clase deben integrar la opción de despachar enlaces a URLs (Spotify/YouTube).