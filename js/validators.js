/**
 * Validaciones de integridad, normalización y sanitización para MediSys.
 */
const MediSysValidators = (() => {
  function sanitizeText(value) {
    if (typeof value !== "string") return "";
    // Elimina etiquetas HTML y caracteres de control, colapsa espacios
    return value
      .replace(/<[^>]*>/g, "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeCode(value) {
    return sanitizeText(value).toUpperCase();
  }

  function normalizeDocument(value) {
    return sanitizeText(value).replace(/\D/g, "");
  }

  function normalizePhone(value) {
    return sanitizeText(value).replace(/[^0-9+]/g, "");
  }

  function getTodayISO() {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
  }

  function addDaysISO(baseDateISO, days) {
    const [y, m, d] = baseDateISO.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().split("T")[0];
  }

  function validateDateRange(fechaISO) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
      return { valid: false, error: "La fecha debe tener formato válido (AAAA-MM-DD)." };
    }
    const minDate = getTodayISO();
    const maxDate = addDaysISO(minDate, MEDISYS_CONFIG.MAX_DAYS_AHEAD);

    if (fechaISO < minDate) {
      return { valid: false, error: "No se pueden agendar citas en fechas pasadas." };
    }
    if (fechaISO > maxDate) {
      return {
        valid: false,
        error: `Solo se permiten reservas hasta ${maxDate} (${MEDISYS_CONFIG.MAX_DAYS_AHEAD} días de anticipación).`
      };
    }
    return { valid: true };
  }

  function validateCitaPayload(raw) {
    const especialidadId = sanitizeText(raw.especialidadId || "");
    const fecha = sanitizeText(raw.fecha || "");
    const hora = sanitizeText(raw.hora || "");
    const nombrePaciente = sanitizeText(raw.nombrePaciente || "");
    const documento = normalizeDocument(raw.documento || "");
    const telefono = normalizePhone(raw.telefono || "");

    const especialidad = MEDISYS_CONFIG.ESPECIALIDADES.find((e) => e.id === especialidadId);
    if (!especialidad) {
      return { valid: false, error: "Selecciona una especialidad médica válida." };
    }

    const dateCheck = validateDateRange(fecha);
    if (!dateCheck.valid) return dateCheck;

    if (!MEDISYS_CONFIG.BLOQUES_HORARIOS.includes(hora)) {
      return { valid: false, error: "El bloque horario seleccionado no es válido." };
    }

    if (
      nombrePaciente.length < MEDISYS_CONFIG.MIN_NAME_LENGTH ||
      nombrePaciente.length > MEDISYS_CONFIG.MAX_NAME_LENGTH ||
      !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(nombrePaciente)
    ) {
      return {
        valid: false,
        error: "Ingresa un nombre válido (solo letras y espacios, entre 4 y 120 caracteres)."
      };
    }

    if (
      documento.length < MEDISYS_CONFIG.MIN_DOC_DIGITS ||
      documento.length > MEDISYS_CONFIG.MAX_DOC_DIGITS
    ) {
      return {
        valid: false,
        error: `El documento debe contener entre ${MEDISYS_CONFIG.MIN_DOC_DIGITS} y ${MEDISYS_CONFIG.MAX_DOC_DIGITS} dígitos numéricos.`
      };
    }

    const phoneDigits = documento ? telefono.replace(/\D/g, "") : "";
    if (
      phoneDigits.length < MEDISYS_CONFIG.MIN_PHONE_DIGITS ||
      phoneDigits.length > MEDISYS_CONFIG.MAX_PHONE_DIGITS
    ) {
      return {
        valid: false,
        error: `Ingresa un teléfono válido de ${MEDISYS_CONFIG.MIN_PHONE_DIGITS} a ${MEDISYS_CONFIG.MAX_PHONE_DIGITS} dígitos.`
      };
    }

    return {
      valid: true,
      data: {
        especialidadId: especialidad.id,
        especialidadNombre: especialidad.nombre,
        fecha,
        hora,
        nombrePaciente,
        documento,
        telefono
      }
    };
  }

  function validateConsultaPayload(raw) {
    const codigo = normalizeCode(raw.codigo || "");
    const documento = normalizeDocument(raw.documento || "");
    const codeRegex = new RegExp(`^${MEDISYS_CONFIG.CODE_PREFIX}[A-Z0-9]{${MEDISYS_CONFIG.CODE_LENGTH}}$`);

    if (!codeRegex.test(codigo)) {
      return {
        valid: false,
        error: `El código debe seguir el formato ${MEDISYS_CONFIG.CODE_PREFIX}XXXXXXXX.`
      };
    }
    if (
      documento.length < MEDISYS_CONFIG.MIN_DOC_DIGITS ||
      documento.length > MEDISYS_CONFIG.MAX_DOC_DIGITS
    ) {
      return { valid: false, error: "Ingresa un número de documento válido." };
    }
    return { valid: true, data: { codigo, documento } };
  }

  function canTransition(estadoActual, estadoNuevo) {
    const permitidos = MEDISYS_CONFIG.TRANSICIONES_PERMITIDAS[estadoActual] || [];
    return permitidos.includes(estadoNuevo);
  }

  return {
    sanitizeText,
    normalizeCode,
    normalizeDocument,
    getTodayISO,
    addDaysISO,
    validateDateRange,
    validateCitaPayload,
    validateConsultaPayload,
    canTransition
  };
})();
