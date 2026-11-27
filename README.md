# MediSys — Sistema de Gestión y Agendamiento de Citas Médicas

Aplicación web modular para la gestión, consulta, cancelación y administración de citas médicas, construida bajo principios de ingeniería de software, validación estricta de datos, control de estados y arquitectura desacoplada lista para integrarse con base de datos relacional y servicios backend.

## Arquitectura del Proyecto

```text
MediSys/
├── index.html          # Estructura semántica de vistas (Agendar, Consultar/Cancelar, Admin)
├── css/
│   └── styles.css      # Estilos personalizados, estados visuales y diseño adaptable
├── js/
│   ├── config.js       # Reglas de negocio, bloques horarios, especialidades y máquina de estados
│   ├── validators.js   # Validaciones estrictas, sanitización anti-XSS y reglas de integridad
│   ├── store.js        # Capa de persistencia/servicio (actualmente en memoria/local; lista para API/BD)
│   └── app.js          # Controlador de interfaz, sincronización de disponibilidad y renderizado seguro
└── README.md
