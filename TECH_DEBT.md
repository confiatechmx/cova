# Deuda Técnica (Technical Debt)

Este documento registra las decisiones técnicas temporales, atajos o mejoras pendientes que se han tomado durante el desarrollo del MVP del Sistema Cova, con el objetivo de revisarlas y refactorizarlas en el futuro para garantizar la escalabilidad.

## 1. Módulo de Cotizaciones y Llantas (Cotizaciones Fantasma)
- **Contexto:** En la Fase 2, integramos la venta de llantas directa desde el Tablero (Kanban). Como el esquema original (`01_initial_schema.sql`) requiere que los detalles de las llantas estén atados a una "Cotización", implementamos la creación automática de una Cotización "Borrador" de fondo para poder agregar llantas a una orden operativa sin fricción.
- **Deuda:** Se tuvo que eliminar la restricción `NOT NULL` de la columna `vendedor_id` en la tabla `cotizaciones`, ya que el tablero operativo no siempre tiene un vendedor designado al vuelo.
- **Acción a Futuro:** Evaluar si es conveniente crear una tabla intermedia dedicada `orden_servicio_llantas` o mantener el sistema de "Cotizaciones Fantasma" y reincorporar `vendedor_id` asignándolo por defecto al usuario autenticado (cuando se integre Auth).

## 2. Permisos y Seguridad (RLS)
- **Contexto:** Durante el prototipado, todas las tablas (`clientes`, `vehiculos`, `ordenes_servicio`, `pagos_orden`, etc.) tienen políticas RLS (Row Level Security) que permiten lectura/escritura tanto a usuarios `authenticated` como `anon`.
- **Deuda:** El sistema actualmente es inseguro para un entorno expuesto públicamente.
- **Acción a Futuro:** Implementar Supabase Auth. Restringir el rol `anon` y asegurar que los mecánicos solo vean ciertas cosas, mientras que los administradores puedan ver reportes y cancelar pagos.

## 3. Eliminación de Pagos y Auditoría
- **Contexto:** En el Módulo de Caja (Fase 3), se permite eliminar pagos para facilitar la corrección de errores de dedo.
- **Deuda:** Eliminar pagos destruye el historial financiero (Hard Delete).
- **Acción a Futuro:** Implementar "Soft Deletes" (una columna `deleted_at`) o un sistema de "Notas de Crédito / Cancelaciones" para que exista un rastro de auditoría de quién borró un pago y por qué.

## 4. Gestión de Concurrencia de Inventario
- **Contexto:** Cuando se agrega una llanta a una orden, el stock se descuenta usando una actualización directa (`stock_actual = stock_actual - X`) en el cliente.
- **Deuda:** Si dos usuarios hacen esto en el mismo milisegundo exacto, podría haber una condición de carrera (Race Condition) que sobreescriba el stock incorrectamente.
- **Acción a Futuro:** Mover la lógica de deducción de inventario a un Stored Procedure o Función RPC en PostgreSQL (Supabase) que maneje el bloqueo de filas de manera atómica de la base de datos.

## 5. Kanban y Flujo Operativo Rígido (Opción B Pendiente)
- **Contexto:** Al hacer el sistema autogestionable (Fase 3.5), se optó por flexibilizar primero la configuración de empresa y comisiones de pago (Opción A).
- **Deuda:** Las columnas del tablero Kanban ('Citas del Día', 'En Inspección', 'En Rampa', 'Listo para Entrega') siguen hardcodeadas como `CHECK constraint` en la tabla `ordenes_servicio` y en el UI.
- **Acción a Futuro:** (Full SaaS) Crear una tabla `kanban_columnas` y migrar la interfaz para que lea y modifique las columnas de forma dinámica, permitiendo a cada taller definir su propio flujo de trabajo (ej. agregar columna de "Lavado").
