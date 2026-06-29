# Registro de Deuda Técnica y Mejoras Arquitectónicas (Technical Debt)

Este documento registra las decisiones técnicas temporales, atajos o mejoras pendientes que se han tomado durante el desarrollo del MVP del Sistema Cova. Este documento trabaja en estricta sincronía con el **Product Backlog Maestro**, y cada punto hace referencia directa a las Épicas a resolver para garantizar la escalabilidad y seguridad de la plataforma.

---

## 1. Módulo de Cotizaciones y Llantas (Cotizaciones Fantasma)
- **Relación con Backlog:** [EP-08] Inventario y Refacciones
- **Contexto:** En la Fase 2, integramos la venta de llantas directa desde el Tablero (Kanban). Como el esquema original requiere que los detalles de las llantas estén atados a una "Cotización", implementamos la creación automática de una Cotización "Borrador" en segundo plano.
- **Deuda:** Se eliminó la restricción `NOT NULL` de la columna `vendedor_id` en la tabla `cotizaciones`, ya que el tablero operativo no siempre tiene un vendedor designado al vuelo.
- **Acción a Futuro:** Refactorizar el módulo. Separar la venta rápida (crear tabla `orden_servicio_llantas`) del sistema formal de "Cotizaciones", exigiendo flujos de aprobación y reincorporando la obligatoriedad de `vendedor_id`.

## 2. Permisos y Seguridad (Supabase Auth y RLS)
- **Relación con Backlog:** [EP-01] Arquitectura Base & Multi-Empresa
- **Contexto:** Actualmente, el archivo `17_multitenant_schema.sql` establece `empresa_id` y RLS, pero las políticas RLS de versiones pasadas necesitan ser consolidadas.
- **Deuda:** El sistema necesita una auditoría final para garantizar que los endpoints públicos eliminen cualquier acceso al rol `anon` y estén estrictamente atados al `empresa_id` del JWT del usuario autenticado.
- **Acción a Futuro:** Auditar y blindar las políticas RLS estrictas atadas al JWT del usuario, asegurando que mecánicos y administradores tengan límites de acceso según su empresa y su rol.

## 3. Dualidad en Gestión de Usuarios (Perfiles vs Empleados) *[NUEVO]*
- **Relación con Backlog:** [EP-02] Control de Accesos
- **Contexto:** El esquema de base de datos tiene una tabla `empleados` (heredada de Fase 5) y una tabla `perfiles` (creada en la migración Multi-tenant).
- **Deuda:** Ambas tablas intentan manejar los roles ('Administrador', 'Mecánico', etc.) y ambas se vinculan de alguna forma a la lógica de Auth. Esto genera redundancia, confusión en la asignación de permisos y colisión arquitectónica en el backend.
- **Acción a Futuro:** Unificar la tabla `empleados` y `perfiles` en una sola tabla oficial de usuarios del sistema, vinculada permanentemente a `empresas` y a Supabase Auth, refactorizando las relaciones existentes en órdenes de servicio.

## 4. Arquitectura Multi-Sucursal Inexistente *[NUEVO]*
- **Relación con Backlog:** [EP-02] Control de Accesos & Multi-sucursal
- **Contexto:** El backlog menciona el soporte para múltiples locaciones físicas por cada Empresa.
- **Deuda:** La base de datos actual aísla por `empresa_id`, pero NO existe ninguna tabla o columna para `sucursal_id`. Todos los datos de una empresa caen en la misma cubeta global para esa empresa.
- **Acción a Futuro:** Crear la tabla `sucursales` ligada a `empresas`. Modificar el modelo de datos para que inventarios, órdenes y cajas estén atados a una sucursal específica, y actualizar las funciones RLS en consecuencia.

## 5. Eliminación de Pagos y Auditoría (Soft Deletes)
- **Relación con Backlog:** [EP-05] Módulo Financiero y Auditoría
- **Contexto:** En el Módulo de Caja, se permite eliminar pagos para facilitar la corrección rápida de errores de dedo.
- **Deuda:** Eliminar pagos destruye el historial financiero (Hard Delete), lo que rompe la integridad contable y abre la puerta a fraudes o robos hormiga sin rastro.
- **Acción a Futuro:** Implementar "Soft Deletes" (`deleted_at`) o un sistema formal de "Notas de Crédito / Cancelaciones". Debe existir un rastro de auditoría de quién canceló un pago, la fecha/hora y su justificación obligatoria.

## 6. Gestión de Concurrencia de Inventario (Race Conditions)
- **Relación con Backlog:** [EP-08] Inventario y Refacciones
- **Contexto:** Al agregar una pieza o llanta a una orden, el stock se descuenta usando una simple ecuación (`stock = stock - X`) calculada de forma directa.
- **Deuda:** Alta probabilidad de "Race Conditions" (condiciones de carrera). Si dos usuarios descuentan stock de la misma llanta en el mismo milisegundo exacto, la base de datos se corromperá guardando un stock irreal.
- **Acción a Futuro:** Mover la lógica de deducción de inventario a un Stored Procedure (RPC) en PostgreSQL que maneje bloqueos transaccionales a nivel de fila (`SELECT ... FOR UPDATE`), garantizando atomicidad.

## 7. Kanban y Flujo Operativo Rígido
- **Relación con Backlog:** [EP-04] Operación del Taller (Órdenes de Servicio)
- **Contexto:** Las columnas del tablero Kanban se dejaron estáticas para acelerar el desarrollo del MVP.
- **Deuda:** Los estados siguen "hardcodeados" en el Frontend y en base de datos. Esto impide que los nuevos talleres personalicen sus propios pasos.
- **Acción a Futuro:** Crear una tabla `kanban_columnas` dependiente de la empresa. Migrar la interfaz para renderizar los flujos dinámicamente.

## 8. Arquitectura del Bot de WhatsApp (Serverless vs Long-lived)
- **Relación con Backlog:** [EP-07] CRM, Ecosistema SaaS & Soporte
- **Contexto:** Se usó la librería `@whiskeysockets/baileys` directamente dentro del entorno de Next.js.
- **Deuda:** Plataformas como Vercel (Serverless) matan los procesos inactivos o de larga duración. Esto provoca que el socket de WhatsApp se caiga constantemente.
- **Acción a Futuro:** Extraer el motor de WhatsApp a un microservicio de Node.js permanente. Next.js solo se comunicará con él vía Webhooks rápidos.

## 9. Gestión de Archivos y Evidencias (Storage)
- **Relación con Backlog:** [EP-04] Checklist de Recepción / [EP-06] Onboarding
- **Contexto:** Se requiere almacenar fotos de daños físicos de los vehículos, logos de los talleres y PDFs generados de las cotizaciones.
- **Deuda:** Si los archivos no se gestionan en una infraestructura especializada, se saturará el servidor o la base de datos.
- **Acción a Futuro:** Integrar Supabase Storage. Establecer políticas de seguridad (Storage RLS) para que los archivos y fotos de una empresa no sean accesibles por otra.

## 10. Pruebas Automatizadas (QA y Testing)
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Actualmente no hay configuración ni scripts de pruebas automatizadas funcionales en el repositorio.
- **Deuda:** El sistema maneja dinero e inventarios. Cualquier refactorización o adición pequeña corre el riesgo de introducir bugs silenciosos.
- **Acción a Futuro:** Configurar Jest/Vitest para pruebas unitarias de la lógica financiera. Implementar Playwright/Cypress para flujos End-to-End críticos.

## 11. Integración y Despliegue Continuo (CI/CD)
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Se despliega código de forma manual.
- **Deuda:** Aplicar scripts SQL en la base de datos de producción directamente puede tirar el sistema si hay un error sintáctico.
- **Acción a Futuro:** Asegurar el pipeline de GitHub Actions para Supabase, manteniendo la carpeta `supabase/migrations` sincronizada con Staging y Producción.

## 12. Monitoreo de Errores y Observabilidad
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Ausencia absoluta de herramientas de rastreo.
- **Deuda:** Las fallas críticas de la aplicación son "invisibles" para el equipo técnico.
- **Acción a Futuro:** Integrar herramientas como Sentry o Datadog para atrapar todas las excepciones lanzadas en el navegador del cliente y los errores del servidor.

## 13. Recuperación Ante Desastres (DRP y Backups PITR)
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Dependencia ciega en la configuración de respaldos por defecto que provee Supabase.
- **Deuda:** Si por error humano o ataque se hace un borrado masivo, no existe un plan claro.
- **Acción a Futuro:** Activar Point-In-Time Recovery (PITR) en Supabase para producción. Redactar y simular periódicamente un manual de "Restauración de Emergencia".
