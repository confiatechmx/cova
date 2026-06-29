# **Autolisto SaaS \- Product Backlog Maestro**

Este documento contiene el Product Backlog estructurado y detallado para el desarrollo modular de **Autolisto**, el software como servicio (SaaS) concebido para la gestión integral de talleres automotrices de Cova. Este mapa de desarrollo está diseñado específicamente para segmentar el trabajo de forma rigurosa, facilitando la entrega de contexto acotado a herramientas de asistencia de código con inteligencia artificial (como Antigravity), minimizando errores de regresión e inconsistencias entre módulos.

 

## **1\. Matriz Global de Épicas y Prioridades**

---

A continuación se presenta el mapa de ruta crítico. Se recomienda resolver rigurosamente las épicas de infraestructura antes de proceder a las capas de negocio y experiencia de usuario.

| ID Épica | Nombre de la Épica | Descripción Breve | Prioridad Inicial   |
| :---- | :---- | :---- | :---- |
| EP-01 | Arquitectura Base & Multi-Empresa | Aislamiento estricto de datos por taller (Empresa), Supabase Auth y RLS. | **Crítica / Alta** |
| EP-02 | Control de Accesos & Multi-sucursal | Estructura de Roles y Permisos (RBAC) y soporte para múltiples locaciones geográficas. | **Alta** |
| EP-03 | Registro Core (Clientes & Vehículos) | Modelado y gestión de la relación de entidades principales del negocio automotriz. | **Alta** |
| EP-04 | Operación del Taller (Órdenes de Servicio) | Catálogos, flujos dinámicos (Kanban), diagnósticos y checklists de recepción. | **Alta** |
| EP-05 | Módulo Financiero y Auditoría | Flujo de caja, cobros de órdenes, notas de crédito, historial financiero y soft deletes. | **Media** |
| EP-06 | Frontend, UX & Onboarding | Interfaz responsiva optimizada para taller y flujo de autogestión. | **Media** |
| EP-07 | CRM, Ecosistema SaaS & Soporte | Notificaciones (Microservicio WA), marca blanca para reportes y ticketera. | **Baja / Evolutiva** |
| EP-08 | Inventario y Refacciones | Control de stock concurrente (Transacciones seguras) y módulo de cotizaciones formal. | **Media** |
| EP-09 | Calidad, Observabilidad y DevOps | Pruebas (E2E, Unitarias), CI/CD, Monitoreo (Sentry) y Backups (PITR). | **Alta (Deuda Técnica)** |

 

## **2\. Desglose Detallado de Módulos (Especificaciones Técnicas y de Negocio)**

### ---

**EP-01: Arquitectura Base & Multi-Empresa**

**Objetivo técnico:** Garantizar que la información de un taller jamás sea accesible por otro. Toda consulta a la base de datos debe estar interceptada de forma transparente.

* **Feature BD-01: Aislamiento a Nivel de Datos (RLS)**  
  * *Descripción:* Implementar políticas de Row Level Security (RLS) en la base de datos relacional. Cada tabla del sistema (clientes, vehículos, órdenes, etc.) debe incluir una columna obligatoria empresa\_id.  
  * *Criterio de Aceptación:* Cualquier consulta SQL ejecutada bajo el contexto de una sesión de usuario debe filtrar de manera automática los registros que coincidan exclusivamente con el empresa\_id de su organización de origen (usando Row Level Security).
* **Feature BD-02: Migración y Esquema Limpio**  
  * *Descripción:* Creación de scripts secuenciales de migración que permitan levantar la estructura exacta de la base de datos en ambientes locales y de producción sin pérdida de integridad.  
* **Feature SEG-01: Autenticación Segura (Supabase Auth)**  
  * *Descripción:* Implementación robusta de Supabase Auth. Integración estricta del rol de usuario con las políticas RLS de la base de datos para asegurar que los endpoints públicos eliminen el rol `anon` y cada rol tenga vistas limitadas según sus permisos.

 

### **EP-02: Control de Accesos & Multi-sucursal**

**Objetivo de negocio:** Permitir que los dueños de los talleres deleguen responsabilidades de forma segura y administren más de un establecimiento si el negocio escala.

* **Feature PERM-01: Matriz de Roles y Permisos (RBAC)**  
  * *Descripción:* Implementar un sistema de control de acceso basado en roles predefinidos en la plataforma.  
  * *Roles Iniciales Requeridos:*  
    * **SuperAdmin (Cova):** Acceso total a todas las empresas, métricas globales de facturación y logs del SaaS.  
    * **Admin de Empresa/Taller:** Acceso completo a los datos, configuraciones, sucursales y finanzas de su propia empresa.  
    * **Recepcionista / Asesor:** Capacidad para registrar clientes, vehículos, abrir órdenes de servicio y procesar cobros en caja. No puede alterar configuraciones críticas del sistema.  
    * **Técnico / Mecánico:** Interfaz simplificada para visualizar órdenes asignadas, registrar avances en el diagnóstico, checklist e inventario de refacciones usadas. Sin acceso a módulos financieros.
  * *Nota Arquitectónica (Deuda):* Actualmente existe redundancia en BD (tabla `empleados` vs `perfiles`). Se debe unificar en una sola tabla de usuarios vinculada a Supabase Auth.
* **Feature SUC-01: Soporte Multi-Sucursal (Pendiente en DB)**  
  * *Descripción:* Capacidad de una Empresa de registrar múltiples ubicaciones físicas (Sucursales).  
  * *Criterio de Aceptación:* Actualmente todos los datos apuntan a la empresa. Se debe diseñar la tabla `sucursales` en la base de datos y migrar el sistema para permitir ligar usuarios, inventarios, cajas y órdenes a una sucursal específica.

 

### **EP-03: Registro Core (Clientes & Vehículos)**

**Objetivo de negocio:** Centralizar los activos más importantes del negocio con búsquedas rápidas e historiales cruzados.

* **Feature CLI-01: Directorio General de Clientes**  
  * *Descripción:* CRUD completo para la administración de clientes individuales y corporativos (flotillas).  
  * *Campos mínimos requeridos:* Nombre completo/Razón Social, RFC (datos de facturación), teléfono, correo electrónico, dirección, notas especiales y estatus de crédito interno.  
* **Feature VEH-01: Expediente Clínico de Vehículos**  
  * *Descripción:* Registro detallado de unidades asociadas directamente a un cliente (Relación N:1).  
  * *Campos mínimos requeridos:* Marca, Modelo, Año, Placas, Número de Serie (VIN), Kilometraje actual, Color y Tipo de Motor.  
  * *Criterio de Aceptación:* Al visualizar un vehículo, la pantalla debe desplegar una línea de tiempo (historial clínico) con todas las órdenes de servicio previas, diagnósticos, refacciones instaladas y mecánicos asignados en el pasado.

 

### **EP-04: Operación del Taller (Órdenes de Servicio)**

**Objetivo de negocio:** Digitalizar el flujo de trabajo operativo desde que el auto entra al taller hasta que es entregado.

* **Feature SERV-01: Catálogo de Servicios y Precios**  
  * *Descripción:* Panel de administración para que cada taller configure sus servicios estándar (ej. Afinación Mayor, Cambio de Frenos, Cambio de Aceite) definiendo costos base de mano de obra y tiempos estimados de ejecución.  
* **Feature TAL-01: Flujo de Estados de la Orden de Trabajo (Kanban Dinámico)**  
  * *Descripción:* Motor de estados personalizable para el seguimiento de la orden. En lugar de estar estáticos (hardcodeados), el sistema debe permitir a cada taller definir su propio flujo Kanban mediante una tabla dinámica. El MVP comienza con estados sugeridos, pero deben ser configurables:

| Estado | Descripción Operativa   |
| :---- | :---- |
| **En Espera / Recepción** | Vehículo ingresado al taller. Se genera el folio y se asigna un asesor. |
| **En Diagnóstico** | El mecánico revisa la unidad para corroborar fallas detectadas y registrar necesidades adicionales. |
| **Por Autorizar** | La cotización detallada de servicios y refacciones se envía al cliente para su validación digital o telefónica. |
| **En Proceso / Reparación** | Trabajo activo en el vehículo tras la autorización formal del cliente. |
| **Por Validar / Control de Calidad** | Prueba de ruta o inspección final por parte del jefe de taller para certificar la calidad de la reparación. |
| **Terminado / Listo para Entrega** | El vehículo está listo y esperando ser liquidado y retirado por el cliente. |

* **Feature TAL-02: Checklist de Recepción Digital**  
  * *Descripción:* Formulario interactivo multimedia de ingreso. Permite marcar niveles de gasolina, luces funcionales, presencia de accesorios (gato, llanta de refacción) y adjuntar evidencia fotográfica de golpes, rayaduras o abolladuras preexistentes para protección legal del taller.

 

### **EP-05: Módulo Financiero (Caja & Pagos)**

**Objetivo de negocio:** Asegurar la trazabilidad total del dinero de la operación del taller y prevenir pérdidas hormiga.

* **Feature CAJ-01: Control de Turnos de Caja Chica**  
  * *Descripción:* Flujo de apertura de caja con un monto inicial en efectivo, registro de movimientos menores (salidas de efectivo autorizadas para insumos rápidos) y cierre/arqueo de caja al concluir el turno diario.  
* **Feature PAG-01: Procesamiento de Transacciones y Cobros**  
  * *Descripción:* Liquidación total o parcial de Órdenes de Servicio terminadas. Soporte estricto para métodos de pago concurrentes (Efectivo, Terminal Bancaria/Tarjeta, Transferencia Electrónica). Generación de un comprobante de pago en formato ticket o PDF descargable.
* **Feature AUD-01: Auditoría Financiera y Cancelaciones**
  * *Descripción:* Reemplazar el borrado físico (Hard Delete) de pagos erróneos por borrado lógico (Soft Delete mediante `deleted_at`) o Notas de Crédito. Se debe mantener un historial exacto de quién canceló un movimiento, su justificación y el impacto en la caja, asegurando la trazabilidad total.

 

### **EP-06: Frontend, UX & Onboarding**

**Objetivo de negocio:** Ofrecer una curva de aprendizaje mínima para los operarios del taller y facilitar la autogestión comercial del SaaS.

* **Feature FRONT-01: Interfaz de Usuario Híbrida y Dashboard**  
  * *Descripción:* Desarrollo adaptable (Mobile-First para operarios en patio que usan tablets/móviles; Vista de Escritorio optimizada para recepcionistas y administradores). Dashboard ejecutivo interactivo que muestre en tiempo real el conteo de autos en taller por estado, la meta de ventas mensual conseguida y las órdenes críticas retrasadas.  
* **Feature ONB-01: Flujo Auto-Asistido de Configuración SaaS**  
  * *Descripción:* Experiencia de bienvenida para un taller nuevo que contrata Autolisto. Un asistente paso a paso lo guiará para: 1\. Subir el logo de su taller, 2\. Configurar la primera sucursal física, 3\. Invitar a sus primeros colaboradores (mecánicos y asesores), y 4\. Establecer su moneda local e impuestos aplicables.

 

### **EP-07: CRM, Ecosistema SaaS & Soporte**

**Objetivo de negocio:** Incrementar el valor de retención del taller con sus clientes finales y asegurar la resiliencia operativa de la infraestructura.

* **Feature CRM-01: Notificaciones Automatizadas (Microservicio WhatsApp / Email)**  
  * *Descripción:* Integración con pasarelas de comunicación para enviar avisos automáticos. **Crucial:** Extraer el motor de WhatsApp (Baileys) a un microservicio independiente de Node.js fuera del entorno Serverless de Next.js, evitando caídas y cierres de sesión forzosos. Comunicación vía Webhooks.
* **Feature MARCA-01: Branding Consistente (White-labeling básico)**  
  * *Descripción:* Los PDFs de presupuestos, órdenes de servicio y tickets entregados a los automovilistas deben portar la identidad, colores y datos exclusivos de contacto del taller contratante, manteniendo una leyenda discreta de "Tecnología impulsada por Autolisto".  
* **Feature SOP-01: Módulo de Soporte Técnico Integrado**  
  * *Descripción:* Panel interno donde los usuarios del taller pueden levantar reportes de fallas directamente al equipo técnico de Autolisto. El sistema recopilará automáticamente metadatos de la sesión, del navegador y logs de error para acelerar el diagnóstico de bugs.  

 

### **EP-08: Inventario y Refacciones**

**Objetivo de negocio:** Gestionar el stock de refacciones y llantas evitando errores de venta y pérdida de inventario por concurrencia.

* **Feature INV-01: Módulo de Cotizaciones Formal (Refactorización)**
  * *Descripción:* Eliminar el hack de "Cotizaciones Fantasma". Separar formalmente la lógica para que una Cotización exija la asignación de un vendedor/asesor real y cuente con flujos de aprobación claros antes de convertirse en una venta directa de llantas.
* **Feature INV-02: Control de Concurrencia (Race Conditions)**
  * *Descripción:* Implementar Stored Procedures / RPCs a nivel base de datos en PostgreSQL para realizar los descuentos de `stock_actual` de las piezas, asegurando un bloqueo transaccional que impida vender la misma llanta a dos clientes distintos simultáneamente en el mismo milisegundo.

 

### **EP-09: Calidad, Observabilidad e Infraestructura**

**Objetivo de negocio:** Saldar la deuda técnica, asegurar la estabilidad del sistema a escala y garantizar que los datos estén siempre protegidos, listos para producción.

* **Feature QA-01: Cobertura de Pruebas Automatizadas**
  * *Descripción:* Instaurar Jest/Vitest para pruebas unitarias en cálculos críticos (flujos de caja y finanzas). Configurar Playwright para ejecutar pruebas End-to-End (E2E) comprobando el ciclo clave de creación, edición y cobro de una Orden de Trabajo.
* **Feature DEV-01: CI/CD y Separación de Entornos**
  * *Descripción:* Pipelines con GitHub Actions para correr linters/tests antes de desplegar. Separación estricta de proyectos en Supabase (Entorno de Staging y Entorno de Producción) implementando migraciones controladas, evitando cambios directos en BD.
* **Feature OBS-01: Monitoreo de Errores**
  * *Descripción:* Integración de plataformas de observabilidad (ej. Sentry / Datadog) para el rastreo y reporte centralizado de excepciones y caídas silenciosas tanto en el frontend como en el backend.
* **Feature DRP-01: Recuperación Ante Desastres (PITR)**
  * *Descripción:* Activación de copias de seguridad continuas (Point-in-Time Recovery) en la base de datos de producción y generación de protocolos documentados para recuperar la aplicación en caso de pérdida, corrupción masiva de datos o ejecución accidental de scripts destructivos.

 

## **3\. Metodología de Trabajo Sugerida con Inteligencias Artificiales**

---

Para asegurar que las herramientas de asistencia en el código no omitan las variables cruzadas del sistema (como romper el Multi-tenant al programar el catálogo de servicios), se establece el siguiente protocolo estricto de prompts:

1. **Inyección de Contexto Arquitectónico:** Antes de codificar cualquier módulo, comparta el archivo de esquema de base de datos actual y declare el principio de aislamiento: *"Este sistema es un SaaS llamado Autolisto, de arquitectura Multi-Empresa basada en la columna empresa\_id. Toda tabla e interacción que propongas debe heredar y respetar este aislamiento mediante RLS."*  
2. **Desarrollo en Aislamiento Funcional:** Enfoque los prompts en un único ID de Feature a la vez (ej. Trabajar únicamente en TAL-02: Checklist de Recepción Digital). Solicite explícitamente que no se modifiquen ni se asuman implementaciones de otros componentes no listados en el prompt.  
3. **Validación Preventiva de Regresión:** Exija a la IA la provisión de pruebas unitarias para el feature generado que comprueben tanto el camino exitoso (happy path) como la contención de seguridad (ej. comprobar que un usuario con rol Técnico no pueda consumir un endpoint financiero de Caja).