const MediSysValidators = (() => {
  function sanitizeText(value) {
    return String(value ?? "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeDocument(doc) {
    return String(doc ?? "").replace(/\D+/g, "").trim();
  }

  function getTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDaysISO(isoDate, days) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + Number(days || 0));
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function canTransition(currentState, nextState) {
    const allowed = MEDISYS_CONFIG.TRANSICIONES_PERMITIDAS[currentState] || [];
    return allowed.includes(nextState);
  }

  function validateRegisterPayload(raw) {
    const nombre = sanitizeText(raw?.nombre || "");
    const documento = normalizeDocument(raw?.documento || "");
    const telefono = sanitizeText(raw?.telefono || "");
    const password = typeof raw?.password === "string" ? raw.password : "";

    if (nombre.length < 3 || nombre.length > 120) {
      return { valid: false, error: "El nombre completo debe tener entre 3 y 120 caracteres." };
    }
    if (!/^\d{6,15}$/.test(documento)) {
      return { valid: false, error: "El número de documento debe tener entre 6 y 15 dígitos." };
    }
    if (!/^[0-9+\-\s()]{7,20}$/.test(telefono)) {
      return { valid: false, error: "Ingresa un teléfono de contacto válido (7 a 20 caracteres)." };
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return {
        valid: false,
        error: "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo."
      };
    }

    return {
      valid: true,
      data: { nombre, documento, telefono, password }
    };
  }

  function validateCitaPayload(payload, sessionUser) {
    if (!sessionUser || sessionUser.role !== "PACIENTE" || !sessionUser.documento) {
      return { valid: false, error: "Debes iniciar sesión como paciente para agendar una cita." };
    }

    const espId = sanitizeText(payload?.especialidadId || "");
    const esp = MEDISYS_CONFIG.ESPECIALIDADES.find((e) => e.id === espId);
    if (!esp) {
      return { valid: false, error: "Selecciona una especialidad médica válida." };
    }

    const fecha = sanitizeText(payload?.fecha || "");
    const hoy = getTodayISO();
    const maxFecha = addDaysISO(hoy, MEDISYS_CONFIG.MAX_DAYS_AHEAD);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy || fecha > maxFecha) {
      return {
        valid: false,
        error: `La fecha debe estar entre ${hoy} y ${maxFecha}.`
      };
    }

    const hora = sanitizeText(payload?.hora || "");
    if (!MEDISYS_CONFIG.BLOQUES_HORARIOS.includes(hora)) {
      return { valid: false, error: "Selecciona un bloque horario válido." };
    }

    const documento = normalizeDocument(sessionUser.documento);
    if (!/^\d{6,15}$/.test(documento)) {
      return { valid: false, error: "El documento del paciente debe tener entre 6 y 15 dígitos." };
    }

    const nombre = sanitizeText(payload?.nombrePaciente || sessionUser.nombre || "");
    if (nombre.length < 3 || nombre.length > 120) {
      return { valid: false, error: "El nombre del paciente debe tener entre 3 y 120 caracteres." };
    }

    const telefono = sanitizeText(payload?.telefono || sessionUser.telefono || "");
    if (!/^[0-9+\-\s()]{7,20}$/.test(telefono)) {
      return { valid: false, error: "Ingresa un teléfono de contacto válido (7 a 20 caracteres)." };
    }

    return {
      valid: true,
      data: {
        especialidadId: esp.id,
        especialidadNombre: esp.nombre,
        fecha,
        hora,
        documento,
        paciente: {
          nombre,
          telefono
        }
      }
    };
  }

  return {
    sanitizeText,
    normalizeDocument,
    getTodayISO,
    addDaysISO,
    canTransition,
    validateRegisterPayload,
    validateCitaPayload
  };
})();
