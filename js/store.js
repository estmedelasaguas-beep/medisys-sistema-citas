/**
 * Capa de persistencia y reglas de integridad de MediSys.
 * Diseñada para reemplazarse o respaldarse fácilmente por una API conectada a base de datos.
 */
const MediSysStore = (() => {
  function generateCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(MEDISYS_CONFIG.CODE_LENGTH);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let suffix = "";
    for (let i = 0; i < bytes.length; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
    return `${MEDISYS_CONFIG.CODE_PREFIX}${suffix}`;
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(MEDISYS_CONFIG.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
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
    const citas = loadAll();
    return citas
      .filter(
        (c) =>
          c.especialidadId === especialidadId &&
          c.fecha === fecha &&
          MEDISYS_CONFIG.ESTADOS_ACTIVOS.includes(c.estado)
      )
      .map((c) => c.hora);
  }

  function createCita(payload) {
    const check = MediSysValidators.validateCitaPayload(payload);
    if (!check.valid) return { ok: false, error: check.error };

    const datos = check.data;
    const citas = loadAll();

    // Restricción de unicidad: no permitir dos citas activas en especialidad + fecha + hora
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
        error: `Conflicto de agenda: ya existe una cita activa (${conflicto.estado}) para ${datos.especialidadNombre} el ${datos.fecha} a las ${datos.hora}.`
      };
    }

    // Evitar que el mismo documento reserve dos horarios distintos el mismo día en la misma especialidad
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
        error: `El documento ${datos.documento} ya tiene una cita activa en ${datos.especialidadNombre} para el día ${datos.fecha} (${duplicadoPaciente.hora}).`
      };
    }

    const codigosExistentes = new Set(citas.map((c) => c.codigo));
    let codigo = generateCode();
    while (codigosExistentes.has(codigo)) {
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
      "Paciente",
      "Cita registrada en MediSys"
    );

    citas.unshift(nuevaCita);
    saveAll(citas);

    return { ok: true, cita: nuevaCita };
  }

  function findCita(codigoRaw, documentoRaw) {
    const check = MediSysValidators.validateConsultaPayload({
      codigo: codigoRaw,
      documento: documentoRaw
    });
    if (!check.valid) return { ok: false, error: check.error };

    const { codigo, documento } = check.data;
    const citas = loadAll();
    const cita = citas.find((c) => c.codigo === codigo && c.documento === documento);

    if (!cita) {
      return {
        ok: false,
        error: "No se encontró ninguna cita que coincida con ese código y documento."
      };
    }

    return { ok: true, cita };
  }

  function transitionState(citaId, nuevoEstado, actor, observacionRaw) {
    const citas = loadAll();
    const idx = citas.findIndex((c) => c.id === citaId);
    if (idx === -1) return { ok: false, error: "La cita solicitada no existe." };

    const cita = citas[idx];
    const estadoAnterior = cita.estado;

    if (!MediSysValidators.canTransition(estadoAnterior, nuevoEstado)) {
      return {
        ok: false,
        error: `Transición no permitida: una cita en estado "${estadoAnterior}" no puede pasar a "${nuevoEstado}".`
      };
    }

    const observacion = MediSysValidators.sanitizeText(observacionRaw || "");
    if (nuevoEstado === MEDISYS_CONFIG.ESTADOS.CANCELADA && observacion && observacion.length < 4) {
      return {
        ok: false,
        error: "Si indicas un motivo de cancelación, debe tener al menos 4 caracteres."
      };
    }

    cita.estado = nuevoEstado;
    cita.actualizadoEn = new Date().toISOString();
    if (nuevoEstado === MEDISYS_CONFIG.ESTADOS.CANCELADA) {
      cita.motivoCancelacion = observacion || "Cancelada por el usuario";
    }

    appendAudit(
      cita,
      estadoAnterior,
      nuevoEstado,
      actor,
      observacion || `Cambio de estado a ${nuevoEstado}`
    );

    citas[idx] = cita;
    saveAll(citas);
    return { ok: true, cita };
  }

  function cancelByPatient(codigoRaw, documentoRaw, motivoRaw) {
    const found = findCita(codigoRaw, documentoRaw);
    if (!found.ok) return found;
    return transitionState(
      found.cita.id,
      MEDISYS_CONFIG.ESTADOS.CANCELADA,
      "Paciente",
      motivoRaw || "Cancelada desde consulta del paciente"
    );
  }

  function listCitas(estadoFiltro = "TODOS") {
    const citas = loadAll();
    if (!estadoFiltro || estadoFiltro === "TODOS") return citas;
    return citas.filter((c) => c.estado === estadoFiltro);
  }

  return {
    getOccupiedSlots,
    createCita,
    findCita,
    transitionState,
    cancelByPatient,
    listCitas
  };
})();
