<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Flujo Maestro de Trabajo (Master Workflow)

Este documento define las reglas de oro y el flujo de trabajo estándar que la IA debe seguir al interactuar con el ecosistema del proyecto (Asana, GitHub, y Obsidian). 

**Nota importante para sesiones de múltiples tareas:** 
Si el usuario solicita trabajar en varias tareas durante una misma sesión, *no* compliques el flujo creando múltiples ramas o PRs por cada pequeña cosa. Agrupa todas esas tareas lógicamente bajo una misma rama "Feature" o "Fix" y condénsalas en un solo Pull Request al finalizar la sesión, a menos que el usuario especifique lo contrario.

## 1. Fuente de la Verdad (Source of Truth)
- **Obsidian (`BACKLOG.md`)** es la fuente de la verdad para el alcance de los proyectos.
- Cada tarea en `BACKLOG.md` debe tener una breve descripción debajo del título de la tarea (usando Markdown).
- **Asana** es el espejo operativo. Cuando el usuario pida sincronizar, asegúrate de que las tareas granulares y sus descripciones en `BACKLOG.md` se reflejen en Asana.

## 2. Granularidad y Gestión de Tareas
- Las tareas se mantienen de forma **granular** (muy específicas y pequeñas) en Asana y en Obsidian para facilitar el seguimiento del progreso.
- Tu primer paso al abordar un requerimiento es **siempre** consultar Asana (o el BACKLOG.md) para leer la descripción detallada antes de programar.

## 3. Estrategia de Ramas en Git (Branching Strategy)
- **NO** crees una rama (`branch`) por cada tarea granular. Esto ensucia el historial.
- **Agrupa** tareas granulares que estén lógicamente relacionadas (o que se aborden en la misma sesión de trabajo) en una sola "Feature" (Característica).
- Crea **1 rama por Feature**, con el formato: `feature/nombre-de-la-caracteristica` o `fix/nombre-del-bug`.
- Desarrolla el código para todas las tareas granulares asignadas a esa Feature en la misma rama.
- Al crear el Pull Request (PR), menciona y cierra simultáneamente todas las tareas de Asana involucradas.

## 4. Pasos de Ejecución para Nuevas Features
1. **Planificación:** Lee el contexto en Obsidian/Asana. Agrupa las tareas lógicamente.
2. **Setup:** Crea la rama de la Feature en Git.
3. **Desarrollo:** Escribe el código. Usa herramientas precisas.
4. **Base de Datos (Tipado Estricto):** Si modificas cualquier tabla, esquema o función en Supabase, es **obligatorio** ejecutar el comando para generar los tipos de TypeScript (`supabase gen types typescript...`) y actualizar el frontend en el mismo commit.
5. **Verificación:** Ejecuta pruebas o pide validación.
6. **Cierre:** Sube el PR, actualiza Asana (pegando los enlaces en el PR) y marca con `[x]` en el `BACKLOG.md`.
