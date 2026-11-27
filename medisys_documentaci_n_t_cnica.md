# MediSys — Sistema de Gestión, Disponibilidad y Trazabilidad de Citas Médicas

**MediSys** es una aplicación web modular desarrollada con HTML5, CSS3, Tailwind CSS y JavaScript vainilla para la programación de citas médicas, el control de disponibilidad por bloques horarios, la gestión de agendas por especialidad y el seguimiento auditable del ciclo de vida de cada consulta.

---

## Autor y Contexto Académico

* **Autor:** Michael Sleyder De Las Aguas Vega
* **Programa académico:** Ingeniería de Software
* **Institución:** Fundación de Estudios Superiores Comfanorte — **FESC**
* **Enfoque del proyecto:** Diseño de arquitectura frontend modular, control de acceso basado en roles (RBAC), validación de reglas de negocio y trazabilidad de estados.

---

## Características Principales

1. **Autenticación y Control de Acceso por Roles (RBAC):**
   * Pantalla inicial de acceso con soporte para los roles **Paciente**, **Médico** y **Administrador**.
   * Registro dinámico de cuentas de **Paciente** con validación de formato de documento, teléfono y política de contraseñas.
   * Hash de contraseñas mediante **Web Crypto API (`SHA-256`)** con prefijo de dominio y protección contra fuerza bruta (bloqueo temporal tras intentos fallidos consecutivos).
2. **Programación de Citas y Disponibilidad:**
   * Selección de especialidad médica, fecha dentro de un rango habilitado y bloques horarios en tiempo real.
   * Prevención de doble agendamiento sobre la misma combinación de especialidad, fecha y bloque horario en estados activos.
   * Generación de comprobante con código único de cita y estado inicial.
3. **Flujos Diferenciados por Rol:**
   * **Paciente:** Agenda citas, consulta su historial y trazabilidad, y cancela citas activas liberando el bloque horario.
   * **Médico:** Visualiza su agenda filtrada por la especialidad asignada (por ejemplo, *Medicina General* para el `Dr. Carlos Mendoza`) y actualiza el estado de las citas activas.
   * **Administrador:** Supervisa métricas generales, filtra citas por estado y gestiona transiciones permitidas en la tabla administrativa.
4. **Trazabilidad y Auditoría de Estados:**
   * Cada cita registra su historial de cambios (`estadoAnterior`, `estadoNuevo`, `observacion`, `actor` y marca de tiempo) conforme a las transiciones configuradas.

---

## Arquitectura del Proyecto

```text
medisys/
├── index.html          # Estructura de vistas (Auth, Agendar, Mis Citas, Médico, Admin)
├── style.css           # Estilos personalizados, estados visuales y animaciones de transición
├── README.md           # Documentación general del sistema
└── js/
    ├── config.js       # Catálogos de especialidades, bloques horarios, estados y transiciones
    ├── validators.js   # Sanitización, normalización, fechas y reglas de validación
    ├── auth.js         # Gestión de usuarios semilla, registro, login, bloqueo y sesión
    ├── store.js        # Persistencia local, consulta de cupos, creación y transiciones
    └── app.js          # Controlador de interfaz, eventos, renderizado por rol y alertas
```

---

## Roles y Credenciales de Prueba

| Rol | Documento | Contraseña | Alcance en el Sistema |
| :--- | :--- | :--- | :--- |
| **Administrador** | `10000001` | `Admin2026*` | Métricas globales, consulta y cambio de estado de citas. |
| **Médico** | `20000001` | `Medico2026*` | Agenda de *Medicina General* (`Dr. Carlos Mendoza`) y atención/confirmación. |
| **Paciente** | *Registrado en app* | *Definida al crear cuenta* | Agendamiento, consulta de historial y cancelación de citas propias. |

---

## Persistencia Actual y Evolución Futura hacia Bases de Datos

En su etapa actual, **MediSys** utiliza `localStorage` y `sessionStorage` del navegador para almacenar usuarios, sesiones, bloqueos de seguridad y registros de citas con fines de prototipado y validación funcional en el cliente.

### Hoja de Ruta con Bases de Datos

En futuras iteraciones del proyecto se integrará una capa de backend y persistencia relacional / gestionada en base de datos para:

* Migrar el almacenamiento de citas, pacientes, médicos y especialidades desde `localStorage` hacia un modelo relacional normalizado (con claves primarias, foráneas e índices únicos compuestos para evitar colisiones de horario a nivel de base de datos).
* Centralizar la autenticación, el manejo de sesiones y el control de permisos en el servidor, evitando exponer hashes o lógica de autorización únicamente en el cliente.
* Persistir de forma permanente y multiusuario el historial de auditoría y trazabilidad de cada cita.
* Exponer una API REST o servicio de datos que permita conectar múltiples clientes y dispositivos de manera concurrente.

---

## Ejecución Local y Despliegue

1. Clona o descarga el repositorio en tu equipo.
2. Sirve los archivos mediante un servidor local (por ejemplo, *Live Server* en VS Code) o publícalos en **GitHub Pages**, ya que funciones como `crypto.subtle` requieren un contexto seguro (`http://localhost` o `https://`).
3. Abre la aplicación en el navegador, inicia sesión o registra un paciente y prueba los flujos correspondientes a cada rol.

---

## Nota Académica

Los datos de prueba, credenciales iniciales y registros generados durante el uso de esta versión tienen fines estrictamente académicos y de demostración.