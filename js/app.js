/**
 * Controlador de interfaz y eventos de MediSys (renderizado seguro sin HTML inyectado).
 */
(() => {
  let activeConsulta = null;

  const els = {
    banner: document.getElementById("banner-alerta"),
    navButtons: document.querySelectorAll(".nav-btn"),
    vistas: {
      agendar: document.getElementById("vista-agendar"),
      consultar: document.getElementById("vista-consultar"),
      admin: document.getElementById("vista-admin")
    },
    formAgendar: document.getElementById("form-agendar"),
    selEspecialidad: document.getElementById("ag-especialidad"),
    inputFecha: document.getElementById("ag-fecha"),
    rangoInfo: document.getElementById("ag-rango-info"),
    resumenCupos: document.getElementById("ag-resumen-cupos"),
    gridHorarios: document.getElementById("grid-horarios"),
    inputHora: document.getElementById("ag-hora"),
    inputNombre: document.getElementById("ag-nombre"),
    inputDocumento: document.getElementById("ag-documento"),
    inputTelefono: document.getElementById("ag-telefono"),
    comprobanteBox: document.getElementById("comprobante-box"),
    compCodigo: document.getElementById("comp-codigo"),
    compDetalle: document.getElementById("comp-detalle"),
    compEstado: document.getElementById("comp-estado"),

    formConsultar: document.getElementById("form-consultar"),
    consCodigo: document.getElementById("cons-codigo"),
    consDocumento: document.getElementById("cons-documento"),
    consultaResultado: document.getElementById("consulta-resultado"),
    consResEstado: document.getElementById("cons-res-estado"),
    consResCodigo: document.getElementById("cons-res-codigo"),
    consResTitulo: document.getElementById("cons-res-titulo"),
    consResInfo: document.getElementById("cons-res-info"),
    consResMotivo: document.getElementById("cons-res-motivo"),
    cancelarPanel: document.getElementById("cancelar-panel"),
    consMotivo: document.getElementById("cons-motivo"),
    btnCancelarCita: document.getElementById("btn-cancelar-cita"),
    listaTrazabilidad: document.getElementById("lista-trazabilidad"),

    filtroEstado: document.getElementById("filtro-estado"),
    metricasAdmin: document.getElementById("metricas-admin"),
    adminTablaCuerpo: document.getElementById("admin-tabla-cuerpo")
  };

  function showAlert(message, type = "info") {
    els.banner.className = "mb-6 p-4 rounded-xl border text-sm font-medium ";
    if (type === "error") {
      els.banner.className += "bg-rose-50 border-rose-200 text-rose-800";
    } else if (type === "success") {
      els.banner.className += "bg-emerald-50 border-emerald-200 text-emerald-800";
    } else {
      els.banner.className += "bg-sky-50 border-sky-200 text-sky-800";
    }
    els.banner.textContent = message;
    els.banner.classList.remove("hidden");
  }

  function hideAlert() {
    els.banner.classList.add("hidden");
  }

  function applyBadgeStyle(badgeEl, estado) {
    badgeEl.className = "badge";
    const map = {
      Pendiente: "badge--pendiente",
      Confirmada: "badge--confirmada",
      Atendida: "badge--atendida",
      Cancelada: "badge--cancelada"
    };
    badgeEl.classList.add(map[estado] || "badge--pendiente");
    badgeEl.textContent = estado;
  }

  function switchTab(tabName) {
    hideAlert();
    Object.entries(els.vistas).forEach(([key, section]) => {
      section.classList.toggle("hidden", key !== tabName);
    });
    els.navButtons.forEach((btn) => {
      btn.classList.toggle("nav-btn--active", btn.dataset.tab === tabName);
    });
    if (tabName === "agendar") renderHorarios();
    if (tabName === "admin") renderAdmin();
  }

  function initEspecialidades() {
    els.selEspecialidad.innerHTML = '<option value="">Selecciona una especialidad</option>';
    MEDISYS_CONFIG.ESPECIALIDADES.forEach((esp) => {
      const opt = document.createElement("option");
      opt.value = esp.id;
      opt.textContent = esp.nombre;
      els.selEspecialidad.appendChild(opt);
    });
  }

  function initFechas() {
    const today = MediSysValidators.getTodayISO();
    const maxDate = MediSysValidators.addDaysISO(today, MEDISYS_CONFIG.MAX_DAYS_AHEAD);
    els.inputFecha.min = today;
    els.inputFecha.max = maxDate;
    els.inputFecha.value = today;
    els.rangoInfo.textContent = `Rango habilitado: ${today} hasta ${maxDate}.`;
  }

  function renderHorarios() {
    const espId = els.selEspecialidad.value;
    const fecha = els.inputFecha.value;
    els.inputHora.value = "";
    els.gridHorarios.innerHTML = "";

    const ocupados = espId && fecha ? MediSysStore.getOccupiedSlots(espId, fecha) : [];
    const total = MEDISYS_CONFIG.BLOQUES_HORARIOS.length;
    const disponiblesCount = espId && fecha ? total - ocupados.length : total;

    els.resumenCupos.textContent =
      espId && fecha
        ? `${disponiblesCount} de ${total} bloques disponibles`
        : "Selecciona especialidad y fecha";

    MEDISYS_CONFIG.BLOQUES_HORARIOS.forEach((hora) => {
      const ocupado = Boolean(espId && fecha && ocupados.includes(hora));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.disabled = ocupado;
      btn.className = `slot-btn ${ocupado ? "slot-btn--occupied" : "slot-btn--available"}`;

      const spanHora = document.createElement("span");
      spanHora.textContent = hora;

      const spanEstado = document.createElement("span");
      spanEstado.className = "text-xs font-normal";
      spanEstado.textContent = ocupado ? "Ocupado" : "Libre";

      btn.appendChild(spanHora);
      btn.appendChild(spanEstado);

      if (!ocupado) {
        btn.addEventListener("click", () => {
          els.inputHora.value = hora;
          els.gridHorarios.querySelectorAll(".slot-btn--available").forEach((b) => {
            b.classList.remove("slot-btn--selected");
          });
          btn.classList.add("slot-btn--selected");
        });
      }

      els.gridHorarios.appendChild(btn);
    });
  }

  function handleAgendarSubmit(e) {
    e.preventDefault();
    hideAlert();

    const result = MediSysStore.createCita({
      especialidadId: els.selEspecialidad.value,
      fecha: els.inputFecha.value,
      hora: els.inputHora.value,
      nombrePaciente: els.inputNombre.value,
      documento: els.inputDocumento.value,
      telefono: els.inputTelefono.value
    });

    if (!result.ok) {
      showAlert(result.error, "error");
      return;
    }

    const { cita } = result;
    showAlert("Cita registrada correctamente y bloque horario reservado.", "success");

    applyBadgeStyle(els.compEstado, cita.estado);
    els.compCodigo.textContent = cita.codigo;
    els.compDetalle.textContent =
      `${cita.paciente.nombre} (Doc: ${cita.documento}) · ${cita.especialidadNombre} · ${cita.fecha} a las ${cita.hora}`;
    els.comprobanteBox.classList.remove("hidden");

    els.inputNombre.value = "";
    els.inputDocumento.value = "";
    els.inputTelefono.value = "";
    renderHorarios();
  }

  function renderConsultaResult(cita) {
    activeConsulta = cita;
    els.consultaResultado.classList.remove("hidden");
    applyBadgeStyle(els.consResEstado, cita.estado);
    els.consResCodigo.textContent = cita.codigo;
    els.consResTitulo.textContent = `${cita.especialidadNombre} — ${cita.paciente.nombre}`;
    els.consResInfo.textContent =
      `Documento: ${cita.documento} · Teléfono: ${cita.paciente.telefono} · Fecha: ${cita.fecha} · Hora: ${cita.hora}`;

    if (cita.motivoCancelacion) {
      els.consResMotivo.textContent = `Observación / Motivo: ${cita.motivoCancelacion}`;
      els.consResMotivo.classList.remove("hidden");
    } else {
      els.consResMotivo.classList.add("hidden");
    }

    const puedeCancelar = MediSysValidators.canTransition(cita.estado, MEDISYS_CONFIG.ESTADOS.CANCELADA);
    els.cancelarPanel.classList.toggle("hidden", !puedeCancelar);
    els.consMotivo.value = "";

    els.listaTrazabilidad.innerHTML = "";
    cita.historial.forEach((item) => {
      const li = document.createElement("li");
      li.className = "p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs";

      const left = document.createElement("div");
      const title = document.createElement("p");
      title.className = "font-semibold text-slate-800";
      title.textContent = item.estadoAnterior
        ? `${item.estadoAnterior} → ${item.estadoNuevo} (${item.actor})`
        : `Estado inicial: ${item.estadoNuevo} (${item.actor})`;

      const desc = document.createElement("p");
      desc.className = "text-slate-500 mt-0.5";
      desc.textContent = item.observacion || "";

      left.appendChild(title);
      left.appendChild(desc);

      const right = document.createElement("span");
      right.className = "text-slate-400 font-mono";
      right.textContent = new Date(item.timestamp).toLocaleString("es-CO");

      li.appendChild(left);
      li.appendChild(right);
      els.listaTrazabilidad.appendChild(li);
    });
  }

  function handleConsultarSubmit(e) {
    e.preventDefault();
    hideAlert();
    els.consultaResultado.classList.add("hidden");

    const res = MediSysStore.findCita(els.consCodigo.value, els.consDocumento.value);
    if (!res.ok) {
      showAlert(res.error, "error");
      return;
    }
    renderConsultaResult(res.cita);
  }

  function handleCancelarCita() {
    if (!activeConsulta) return;
    hideAlert();

    const res = MediSysStore.cancelByPatient(
      activeConsulta.codigo,
      activeConsulta.documento,
      els.consMotivo.value
    );

    if (!res.ok) {
      showAlert(res.error, "error");
      return;
    }

    showAlert("Cita cancelada. El bloque horario quedó disponible nuevamente.", "success");
    renderConsultaResult(res.cita);
  }

  function renderAdmin() {
    const todas = MediSysStore.listCitas("TODOS");
    const conteo = {
      total: todas.length,
      pendientes: todas.filter((c) => c.estado === "Pendiente").length,
      confirmadas: todas.filter((c) => c.estado === "Confirmada").length,
      canceladas: todas.filter((c) => c.estado === "Cancelada").length
    };

    els.metricasAdmin.innerHTML = "";
    [
      { label: "Total citas", val: conteo.total },
      { label: "Pendientes", val: conteo.pendientes },
      { label: "Confirmadas", val: conteo.confirmadas },
      { label: "Canceladas", val: conteo.canceladas }
    ].forEach((m) => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-xl bg-slate-50 border border-slate-200";
      const lbl = document.createElement("p");
      lbl.className = "text-xs text-slate-500 font-medium";
      lbl.textContent = m.label;
      const num = document.createElement("p");
      num.className = "text-2xl font-bold text-slate-900 mt-1";
      num.textContent = String(m.val);
      card.appendChild(lbl);
      card.appendChild(num);
      els.metricasAdmin.appendChild(card);
    });

    const filtradas = MediSysStore.listCitas(els.filtroEstado.value);
    els.adminTablaCuerpo.innerHTML = "";

    if (filtradas.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "p-6 text-center text-slate-400";
      td.textContent = "No hay citas registradas para el filtro seleccionado.";
      tr.appendChild(td);
      els.adminTablaCuerpo.appendChild(tr);
      return;
    }

    filtradas.forEach((cita) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50";

      const tdCod = document.createElement("td");
      tdCod.className = "p-3 font-mono font-bold text-slate-900";
      tdCod.textContent = cita.codigo;

      const tdPac = document.createElement("td");
      tdPac.className = "p-3";
      const pNom = document.createElement("div");
      pNom.className = "font-medium text-slate-800";
      pNom.textContent = cita.paciente.nombre;
      const pDoc = document.createElement("div");
      pDoc.className = "text-xs text-slate-400";
      pDoc.textContent = `Doc: ${cita.documento}`;
      tdPac.appendChild(pNom);
      tdPac.appendChild(pDoc);

      const tdEsp = document.createElement("td");
      tdEsp.className = "p-3 text-slate-700";
      tdEsp.textContent = cita.especialidadNombre;

      const tdFec = document.createElement("td");
      tdFec.className = "p-3 text-slate-700 whitespace-nowrap";
      tdFec.textContent = `${cita.fecha} · ${cita.hora}`;

      const tdEst = document.createElement("td");
      tdEst.className = "p-3";
      const badge = document.createElement("span");
      applyBadgeStyle(badge, cita.estado);
      tdEst.appendChild(badge);

      const tdAcc = document.createElement("td");
      tdAcc.className = "p-3";
      const siguientes = MEDISYS_CONFIG.TRANSICIONES_PERMITIDAS[cita.estado] || [];

      if (siguientes.length === 0) {
        const spanFin = document.createElement("span");
        spanFin.className = "text-xs text-slate-400 italic";
        spanFin.textContent = "Estado final";
        tdAcc.appendChild(spanFin);
      } else {
        const select = document.createElement("select");
        select.className = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium";

        const defOpt = document.createElement("option");
        defOpt.value = "";
        defOpt.textContent = "Cambiar estado...";
        select.appendChild(defOpt);

        siguientes.forEach((nextState) => {
          const opt = document.createElement("option");
          opt.value = nextState;
          opt.textContent = nextState;
          select.appendChild(opt);
        });

        select.addEventListener("change", () => {
          if (!select.value) return;
          const res = MediSysStore.transitionState(
            cita.id,
            select.value,
            "Administrador",
            `Actualizado desde panel a ${select.value}`
          );
          if (!res.ok) {
            showAlert(res.error, "error");
          } else {
            showAlert(`Cita ${cita.codigo} actualizada a ${select.value}.`, "success");
          }
          renderAdmin();
        });

        tdAcc.appendChild(select);
      }

      tr.appendChild(tdCod);
      tr.appendChild(tdPac);
      tr.appendChild(tdEsp);
      tr.appendChild(tdFec);
      tr.appendChild(tdEst);
      tr.appendChild(tdAcc);
      els.adminTablaCuerpo.appendChild(tr);
    });
  }

  function bindEvents() {
    els.navButtons.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    els.selEspecialidad.addEventListener("change", renderHorarios);
    els.inputFecha.addEventListener("change", renderHorarios);
    els.formAgendar.addEventListener("submit", handleAgendarSubmit);
    els.formConsultar.addEventListener("submit", handleConsultarSubmit);
    els.btnCancelarCita.addEventListener("click", handleCancelarCita);
    els.filtroEstado.addEventListener("change", renderAdmin);
  }

  function init() {
    initEspecialidades();
    initFechas();
    renderHorarios();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
