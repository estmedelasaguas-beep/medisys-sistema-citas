/**
 * Capa de persistencia, aislamiento por sesión y reglas de integridad de MediSys.
 */
const MediSysStore = (() => {
  function generateCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(MEDISYS_CONFIG.CODE_LENGTH);
    window.crypto.getRandomValues(bytes);
    let suffix = "";
    for (let i = 0; i < bytes.length; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
    return `${MEDISYS_CONFIG.CODE_PREFIX}${suffix}`;
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(MEDISYS_CONFIG.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveAll(citas) {
    localStorage.setItem(MEDISYS_CONFIG.STORAGE_KEY, JSON.stringify(citas));
  }

  function appendAudit(cita, estadoAnterior, estadoNuevo, actor, observacion) {
    cita.historial.push({
      id: `TRZ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      estadoAnterior: estadoAnterior || null,
      estadoNuevo,
      actor,
      observacion,
      timestamp: new Date().toISOString()
    });
  }

  function getOccupiedSlots(especialidadId, fecha) {
    return loadAll()
      .filter(
        (c) =>
          c.especialidadId === especialidadId &&
          c.fecha === fecha &&
          MEDISYS_CONFIG.ESTADOS_ACTIVOS.includes(c.estado)
      )
      .map((c) => c.hora);
  }

  function createCita(payload, sessionUser) {
    const check = MediSysValidators.validateCitaPayload(payload, sessionUser);
    if (!check.valid) return { ok: false, error: check.error };

    const datos = check.data;
    const citas = loadAll();

    // Restricción UNIQUE: especialidad + fecha + hora activa
    const conflicto = citas.find(
      (c) =>
        c.especialidadId === datos.especialidadId &&
        c.fecha === datos.fecha &&
        c.hora === datos.hora &&
        MEDISYS_CONFIG.ESTADOS_ACTIVOS.includes(c.estado)
    );
    if (conflicto) {
      return {
        ok: false,
        error: `Conflicto de agenda: el bloque ${datos.hora} en ${datos.especialidadNombre} ya está ocupado.`
      };
    }

    // Restricción: un paciente no puede tener dos citas activas el mismo día en la misma especialidad
    const duplicadoPaciente = citas.find(
      (c) =>
        c.documento === datos.documento &&
        c.especialidadId === datos.especialidadId &&
        c.fecha === datos.fecha &&
        MEDISYS_CONFIG.ESTADOS_ACTIVOS.includes(c.estado)
    );
    if (duplicadoPaciente) {
      return {
        ok: false,
        error: `Ya tienes una cita activa en ${datos.especialidadNombre} para el ${datos.fecha} (${duplicadoPaciente.hora}).`
      };
    }

    const existingCodes = new Set(citas.map((c) => c.codigo));
    let codigo = generateCode();
    while (existingCodes.has(codigo)) {
      codigo = generateCode();
    }

    const nuevaCita = {
      id: `CIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      codigo,
      especialidadId: datos.especialidadId,
      especialidadNombre: datos.especialidadNombre,
      fecha: datos.fecha,
      hora: datos.hora,
      paciente: {
        nombre: datos.nombrePaciente,
        documento: datos.documento,
        telefono: datos.telefono
      },
      documento: datos.documento,
      estado: MEDISYS_CONFIG.ESTADOS.PENDIENTE,
      motivoCancelacion: "",
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      historial: []
    };

    appendAudit(
      nuevaCita,
      null,
      MEDISYS_CONFIG.ESTADOS.PENDIENTE,
      `Paciente (${datos.documento})`,
      "Solicitud registrada desde sesión autenticada"
    );

    citas.unshift(nuevaCita);
    saveAll(citas);
    return { ok: true, cita: nuevaCita };
  }

  function listMyCitas(sessionUser) {
    if (!sessionUser || sessionUser.role !== MEDISYS_CONFIG.ROLES.PACIENTE) return [];
    return loadAll().filter((c) => c.documento === sessionUser.documento);
  }

  function transitionState(citaId, nuevoEstado, sessionUser, observacionRaw) {
    if (!sessionUser) return { ok: false, error: "Sesión no válida." };

    const citas = loadAll();
    const idx = citas.findIndex((c) => c.id === citaId);
    if (idx === -1) return { ok: false, error: "Cita no encontrada." };

    const cita = citas[idx];

    // Control de autorización por rol y propiedad
    if (sessionUser.role === MEDISYS_CONFIG.ROLES.PACIENTE) {
      if (cita.documento !== sessionUser.documento) {
        return { ok: false, error: "No tienes permisos para modificar citas de otro paciente." };
      }
      if (nuevoEstado !== MEDISYS_CONFIG.ESTADOS.CANCELADA) {
        return { ok: false, error: "Un paciente solo puede cancelar sus propias citas." };
      }
    }

    if (!MediSysValidators.canTransition(cita.estado, nuevoEstado)) {
      return {
        ok: false,
        error: `Transición inválida: "${cita.estado}" no puede pasar a "${nuevoEstado}".`
      };
    }

    const observacion = MediSysValidators.sanitizeText(observacionRaw || "");
    if (nuevoEstado === MEDISYS_CONFIG.ESTADOS.CANCELADA && observacion && observacion.length < 4) {
      return {
        ok: false,
        error: "Si indicas un motivo de cancelación, debe tener al menos 4 caracteres."
      };
    }

    const estadoAnterior = cita.estado;
    const actor =
      sessionUser.role === MEDISYS_CONFIG.ROLES.ADMIN
        ? `Administrador (${sessionUser.nombre})`
        : `Paciente (${sessionUser.documento})`;

    cita.estado = nuevoEstado;
    cita.actualizadoEn = new Date().toISOString();
    if (nuevoEstado === MEDISYS_CONFIG.ESTADOS.CANCELADA) {
      cita.motivoCancelacion = observacion || `Cancelada por ${actor}`;
    }

    appendAudit(cita, estadoAnterior, nuevoEstado, actor, observacion || `Estado actualizado a ${nuevoEstado}`);

    citas[idx] = cita;
    saveAll(citas);
    return { ok: true, cita };
  }

  function listAllForAdmin(sessionUser, estadoFiltro = "TODOS") {
    if (!sessionUser || sessionUser.role !== MEDISYS_CONFIG.ROLES.ADMIN) {
      return { ok: false, error: "Acceso denegado: se requiere rol Administrador.", citas: [] };
    }
    const todas = loadAll();
    const filtradas =
      !estadoFiltro || estadoFiltro === "TODOS"
        ? todas
        : todas.filter((c) => c.estado === estadoFiltro);
    return { ok: true, citas: filtradas, todas };
  }

  return {
    getOccupiedSlots,
    createCita,
    listMyCitas,
    transitionState,
    listAllForAdmin
  };
})();
