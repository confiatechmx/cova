# Registro de Deuda Técnica y Mejoras Arquitectónicas (Technical Debt)

Este documento registra las decisiones técnicas temporales, atajos o mejoras pendientes que se han tomado durante el desarrollo del MVP del Sistema Cova. Este documento trabaja en estricta sincronía con el **Product Backlog Maestro**, y cada punto hace referencia directa a las Épicas a resolver para garantizar la escalabilidad y seguridad de la plataforma.

---

## 1. Módulo de Cotizaciones y Llantas (Cotizaciones Fantasma)
- **Relación con Backlog:** [EP-08] Inventario y Refacciones
- **Contexto:** En la Fase 2, integramos la venta de llantas directa desde el Tablero (Kanban). Como el esquema original requiere que los detalles de las llantas estén atados a una "Cotización", implementamos la creación automática de una Cotización "Borrador" en segundo plano.
- **Deuda:** Se eliminó la restricción `NOT NULL` de la columna `vendedor_id` en la tabla `cotizaciones`, ya que el tablero operativo no siempre tiene un vendedor designado al vuelo.
- **Acción a Futuro:** Refactorizar el módulo. Separar la venta rápida (crear tabla `orden_servicio_llantas`) del sistema formal de "Cotizaciones", exigiendo flujos de aprobación y reincorporando la obligatoriedad de `vendedor_id`.

## 2. Permisos y Seguridad (Supabase Auth y RLS)
- **Relación con Backlog:** [EP-01] Arquitectura Base & Multi-tenancy
- **Contexto:** Durante el prototipado rápido, las tablas tienen políticas RLS (Row Level Security) laxas que permiten lectura/escritura tanto a usuarios `authenticated` como `anon`.
- **Deuda:** El sistema actualmente es vulnerable a accesos indebidos, ya que los endpoints podrían ser explotados públicamente sin validación estricta.
- **Acción a Futuro:** Implementar Supabase Auth. Restringir el rol `anon`. Configurar políticas RLS estrictas atadas al JWT del usuario, asegurando que mecánicos y administradores tengan límites de acceso según su tenant y su rol (RBAC).

## 3. Eliminación de Pagos y Auditoría (Soft Deletes)
- **Relación con Backlog:** [EP-05] Módulo Financiero y Auditoría
- **Contexto:** En el Módulo de Caja, se permite eliminar pagos para facilitar la corrección rápida de errores de dedo.
- **Deuda:** Eliminar pagos destruye el historial financiero (Hard Delete), lo que rompe la integridad contable y abre la puerta a fraudes o robos hormiga sin rastro.
- **Acción a Futuro:** Implementar "Soft Deletes" (`deleted_at`) o un sistema formal de "Notas de Crédito / Cancelaciones". Debe existir un rastro de auditoría de quién canceló un pago, la fecha/hora y su justificación obligatoria.

## 4. Gestión de Concurrencia de Inventario (Race Conditions)
- **Relación con Backlog:** [EP-08] Inventario y Refacciones
- **Contexto:** Al agregar una pieza o llanta a una orden, el stock se descuenta usando una simple ecuación (`stock = stock - X`) calculada de forma directa.
- **Deuda:** Alta probabilidad de "Race Conditions" (condiciones de carrera). Si dos usuarios descuentan stock de la misma llanta en el mismo milisegundo exacto, la base de datos se corromperá guardando un stock irreal.
- **Acción a Futuro:** Mover la lógica de deducción de inventario a un Stored Procedure (RPC) en PostgreSQL que maneje bloqueos transaccionales a nivel de fila (`SELECT ... FOR UPDATE`), garantizando atomicidad.

## 5. Kanban y Flujo Operativo Rígido
- **Relación con Backlog:** [EP-04] Operación del Taller (Órdenes de Servicio)
- **Contexto:** Las columnas del tablero Kanban (En Recepción, En Diagnóstico, etc.) se dejaron estáticas para acelerar el desarrollo del MVP.
- **Deuda:** Los estados siguen "hardcodeados" como restricciones `CHECK` en base de datos y estáticos en el Frontend. Esto impide que los nuevos talleres personalicen sus propios pasos (ej. añadir columna de "Lavado" o "Pintura").
- **Acción a Futuro:** Crear una tabla `kanban_columnas` dependiente del tenant. Migrar la interfaz para renderizar los flujos dinámicamente de forma que cada sucursal/taller defina sus procesos.

## 6. Arquitectura del Bot de WhatsApp (Serverless vs Long-lived)
- **Relación con Backlog:** [EP-07] CRM, Ecosistema SaaS & Soporte
- **Contexto:** Se usó la librería `@whiskeysockets/baileys` directamente dentro del entorno de Next.js.
- **Deuda:** Plataformas como Vercel (Serverless) matan los procesos inactivos o de larga duración. Esto provoca que el socket de WhatsApp se caiga constantemente, obligando al usuario a escanear el código QR cada pocas horas.
- **Acción a Futuro:** Extraer el motor de WhatsApp a un microservicio de Node.js permanente (ej. VPS, Render, Railway). Next.js solo se comunicará con él vía Webhooks rápidos.

## 7. Gestión de Archivos y Evidencias (Storage) *[NUEVO]*
- **Relación con Backlog:** [EP-04] Checklist de Recepción / [EP-06] Onboarding
- **Contexto:** Se requiere almacenar fotos de daños físicos de los vehículos, logos de los talleres y PDFs generados de las cotizaciones.
- **Deuda:** Si los archivos no se gestionan en una infraestructura especializada, se saturará el servidor o la base de datos.
- **Acción a Futuro:** Integrar Supabase Storage. Establecer políticas de seguridad (Storage RLS) para que los archivos y fotos de un tenant no sean accesibles por otro, optimizando la carga de imágenes con CDN.

## 8. Pruebas Automatizadas (QA y Testing)
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Actualmente no hay configuración ni scripts de pruebas automatizadas en el repositorio.
- **Deuda:** El sistema maneja dinero (cobros) e inventarios (bienes físicos). Cualquier refactorización o adición pequeña corre el riesgo de introducir bugs silenciosos que cuesten dinero al cliente.
- **Acción a Futuro:** Configurar Jest/Vitest para pruebas unitarias de la lógica financiera. Implementar Playwright/Cypress para flujos End-to-End críticos (simular el clic de un usuario creando y cobrando una orden).

## 9. Integración y Despliegue Continuo (CI/CD)
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Se despliega código de forma manual, y no hay separación estricta entre una base de datos de pruebas y la de producción.
- **Deuda:** Aplicar scripts SQL en la base de datos de producción directamente puede tirar el sistema si hay un error sintáctico.
- **Acción a Futuro:** Aislar proyectos de Supabase (Staging y Production). Crear pipelines de GitHub Actions que ejecuten linters, pruebas de QA y luego apliquen migraciones seguras a la base de datos antes de hacer deploy en Vercel.

## 10. Monitoreo de Errores y Observabilidad
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Ausencia absoluta de herramientas de rastreo.
- **Deuda:** Las fallas críticas de la aplicación (ej. pantalla en blanco por un error de React) son "invisibles" para el equipo técnico hasta que un cliente enfurecido levanta un ticket.
- **Acción a Futuro:** Integrar herramientas como Sentry o Datadog para atrapar todas las excepciones lanzadas en el navegador del cliente y los errores del servidor, unificándolas en un panel de control con notificaciones a Slack/Discord.

## 11. Recuperación Ante Desastres (DRP y Backups PITR)
- **Relación con Backlog:** [EP-09] Calidad, Observabilidad y DevOps
- **Contexto:** Dependencia ciega en la configuración de respaldos por defecto que provee Supabase.
- **Deuda:** Si por error humano o ataque se hace un borrado masivo (Drop Table, Update sin Where), no existe un plan claro ni garantía de recuperar el estado del sistema en los minutos anteriores al desastre.
- **Acción a Futuro:** Activar Point-In-Time Recovery (PITR) en Supabase para producción. Redactar y simular periódicamente un manual de "Restauración de Emergencia" para que el equipo sepa exactamente cómo actuar bajo presión.
