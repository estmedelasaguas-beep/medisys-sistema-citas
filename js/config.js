/**
 * Configuración central y reglas de dominio de MediSys.
 */
const MEDISYS_CONFIG = Object.freeze({
  STORAGE_KEY: "medisys_citas_v1",
  CODE_PREFIX: "MED-",
  CODE_LENGTH: 8,
  MAX_DAYS_AHEAD: 60,
  MIN_NAME_LENGTH: 4,
  MAX_NAME_LENGTH: 120,
  MIN_DOC_DIGITS: 6,
  MAX_DOC_DIGITS: 15,
  MIN_PHONE_DIGITS: 7,
  MAX_PHONE_DIGITS: 15,

  ESPECIALIDADES: Object.freeze([
    { id: "ESP-MG", nombre: "Medicina General" },
    { id: "ESP-OD", nombre: "Odontología" },
    { id: "ESP-PD", nombre: "Pediatría" },
    { id: "ESP-OP", nombre: "Optometría" },
    { id: "ESP-PS", nombre: "Psicología" }
  ]),

  BLOQUES_HORARIOS: Object.freeze([
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00"
  ]),

  ESTADOS: Object.freeze({
    PENDIENTE: "Pendiente",
    CONFIRMADA: "Confirmada",
    ATENDIDA: "Atendida",
    CANCELADA: "Cancelada"
  }),

  // Estados que bloquean el horario para otra cita
  ESTADOS_ACTIVOS: Object.freeze(["Pendiente", "Confirmada"]),

  // Máquina de estados permitida
  TRANSICIONES_PERMITIDAS: Object.freeze({
    Pendiente: ["Confirmada", "Cancelada"],
    Confirmada: ["Atendida", "Cancelada"],
    Atendida: [],
    Cancelada: []
  })
});
