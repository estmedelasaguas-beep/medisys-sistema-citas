const MediSysStore = (() => {
  const STORAGE_KEY = "medisys_citas_v1";

  function loadAll() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveAll(citas) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
  }

  function getOccupiedSlots(especialidadId, fecha) {
    if (!especialidadId || !fecha) return [];
    const citas = loadAll();
    return citas
      .filter(
        (c) =>
          String(c.especialidadId || "").toLowerCase() === String(especialidadId).toLowerCase() &&
          c.fecha === fecha &&
          MEDISYS_CONFIG.ESTADOS_ACTIVOS.includes(c.estado)
      )
      .map((c) => c.hora);
  }

  function generateCodigo(citas) {
    const year = new Date().getFullYear();
    const num = String((citas?.length || 0) + 1).padStart(4, "0");
    return `MS-${year}-${num}`;
  }

  function createCita(payload, sessionUser) {
    const check = MediSysValidators.validateCitaPayload(payload, sessionUser);
    if (!check.valid) return { ok: false, error: check.error };

    const datos = check.data;
    const citas = loadAll();

    const conflicto = citas.find(
      (c) =>
        String(c.especialidadId || "").toLowerCase() === String(datos.especialidadId).toLowerCase() &&
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

    const nowISO = new Date().toISOString();
    const estadoInicial = MEDISYS_CONFIG.ESTADOS.PENDIENTE || "Pendiente";

    const cita = {
      id: "CITA-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      codigo: generateCodigo(citas),
      especialidadId: datos.especialidadId,
      especialidadNombre: datos.especialidadNombre,
      fecha: datos.fecha,
      hora: datos.hora,
      documento: datos.documento,
      paciente: {
        nombre: datos.paciente.nombre,
        telefono: datos.paciente.telefono
      },
      estado: estadoInicial,
      creadaEn: nowISO,
      actualizadaEn: nowISO,
      historial: [
        {
          estadoAnterior: null,
          estadoNuevo: estadoInicial,
          observacion: "Cita programada por el paciente",
          actor: `Paciente (${datos.paciente.nombre})`,
          fecha: nowISO
        }
      ]
    };

    citas.push(cita);
    saveAll(citas);
    return { ok: true, cita };
  }

  function listCitas(filtroEstado = "TODOS") {
    const citas = loadAll();
    if (!filtroEstado || filtroEstado === "TODOS") return citas;
    return citas.filter((c) => c.estado === filtroEstado);
  }

  function transitionState(citaId, nextState, actor = "Sistema", observacion = "") {
    const citas = loadAll();
    const idx = citas.findIndex((c) => c.id === citaId || c.codigo === citaId);
    if (idx === -1) return { ok: false, error: "Cita no encontrada." };

    const cita = citas[idx];
    if (!MediSysValidators.canTransition(cita.estado, nextState)) {
      return {
        ok: false,
        error: `Transición no permitida de ${cita.estado} a ${nextState}.`
      };
    }

    const nowISO = new Date().toISOString();
    const prev = cita.estado;
    cita.estado = nextState;
    cita.actualizadaEn = nowISO;
    cita.historial = Array.isArray(cita.historial) ? cita.historial : [];
    cita.historial.push({
      estadoAnterior: prev,
      estadoNuevo: nextState,
      observacion: observacion || `Cambio de estado a ${nextState}`,
      actor,
      fecha: nowISO
    });

    citas[idx] = cita;
    saveAll(citas);
    return { ok: true, cita };
  }

  function cancelByPatient(codigo, documento, motivo = "Cancelada por el paciente") {
    const docNorm = MediSysValidators.normalizeDocument(documento);
    const citas = loadAll();
    const cita = citas.find(
      (c) => c.codigo === codigo && MediSysValidators.normalizeDocument(c.documento) === docNorm
    );
    if (!cita) return { ok: false, error: "No se encontró la cita para tu documento." };

    const estadoCancelada = MEDISYS_CONFIG.ESTADOS.CANCELADA || "Cancelada";
    return transitionState(cita.id, estadoCancelada, `Paciente (${cita.paciente?.nombre || docNorm})`, motivo);
  }

  return {
    loadAll,
    getOccupiedSlots,
    createCita,
    listCitas,
    transitionState,
    cancelByPatient
  };
})();
