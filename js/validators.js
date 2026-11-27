/**
 * Validaciones de integridad, credenciales y sanitización anti-XSS para MediSys.
 */
const MediSysValidators = (() => {
  function sanitizeText(value) {
    if (typeof value !== "string") return "";
    return value
      .replace(/<[^>]*>/g, "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
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

  function validatePasswordStrength(password) {
    if (typeof password !== "string" || password.length < 8 || password.length > 64) {
      return { valid: false, error: "La contraseña debe tener entre 8 y 64 caracteres." };
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return {
        valid: false,
        error: "La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo."
      };
    }
    return { valid: true };
  }

  function validateRegisterPayload(raw) {
    const nombre = sanitizeText(raw.nombre || "");
    const documento = normalizeDocument(raw.documento || "");
    const telefono = normalizePhone(raw.telefono || "");
    const password = typeof raw.password === "string" ? raw.password : "";

    if (
      nombre.length < MEDISYS_CONFIG.MIN_NAME_LENGTH ||
      nombre.length > MEDISYS_CONFIG.MAX_NAME_LENGTH ||
      !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(nombre)
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
        error: `El documento debe tener entre ${MEDISYS_CONFIG.MIN_DOC_DIGITS} y ${MEDISYS_CONFIG.MAX_DOC_DIGITS} dígitos.`
      };
    }

    const phoneDigits = telefono.replace(/\D/g, "");
    if (
      phoneDigits.length < MEDISYS_CONFIG.MIN_PHONE_DIGITS ||
      phoneDigits.length > MEDISYS_CONFIG.MAX_PHONE_DIGITS
    ) {
      return {
        valid: false,
        error: `Ingresa un teléfono válido de ${MEDISYS_CONFIG.MIN_PHONE_DIGITS} a ${MEDISYS_CONFIG.MAX_PHONE_DIGITS} dígitos.`
      };
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) return passCheck;

    return {
      valid: true,
      data: { nombre, documento, telefono, password }
    };
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

  function validateCitaPayload(raw, sessionUser) {
    if (!sessionUser || sessionUser.role !== MEDISYS_CONFIG.ROLES.PACIENTE) {
      return { valid: false, error: "Debes iniciar sesión como paciente para agendar una cita." };
    }

    const especialidadId = sanitizeText(raw.especialidadId || "");
    const fecha = sanitizeText(raw.fecha || "");
    const hora = sanitizeText(raw.hora || "");

    const especialidad = MEDISYS_CONFIG.ESPECIALIDADES.find((e) => e.id === especialidadId);
    if (!especialidad) {
      return { valid: false, error: "Selecciona una especialidad médica válida." };
    }

    const dateCheck = validateDateRange(fecha);
    if (!dateCheck.valid) return dateCheck;

    if (!MEDISYS_CONFIG.BLOQUES_HORARIOS.includes(hora)) {
      return { valid: false, error: "Selecciona un bloque horario disponible." };
    }

    return {
      valid: true,
      data: {
        especialidadId: especialidad.id,
        especialidadNombre: especialidad.nombre,
        fecha,
        hora,
        nombrePaciente: sessionUser.nombre,
        documento: sessionUser.documento,
        telefono: sessionUser.telefono
      }
    };
  }

  function canTransition(estadoActual, estadoNuevo) {
    const permitidos = MEDISYS_CONFIG.TRANSICIONES_PERMITIDAS[estadoActual] || [];
    return permitidos.includes(estadoNuevo);
  }

  return {
    sanitizeText,
    normalizeDocument,
    getTodayISO,
    addDaysISO,
    validateRegisterPayload,
    validateCitaPayload,
    canTransition
  };
})();
