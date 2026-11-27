(() => {
  let activeCita = null;

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

  function showAlert(msg, type = "info") {
    els.banner.className = "mb-6 p-4 rounded-xl border text-sm font-medium " + (
      type === "error" ? "bg-rose-50 border-rose-200 text-rose-800" :
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
      "bg-sky-50 border-sky-200 text-sky-800"
    );
    els.banner.textContent = msg;
    els.banner.classList.remove("hidden");
  }

  function hideAlert() {
    els.banner.classList.add("hidden");
  }

  function applyBadge(el, estado) {
    el.className = "badge";
    const map = {
      Pendiente: "badge--pendiente",
      Confirmada: "badge--confirmada",
      Atendida: "badge--atendida",
      Cancelada: "badge--cancelada"
    };
    el.classList.add(map[estado] || "badge--pendiente");
    el.textContent = estado;
  }

  function switchTab(tab) {
    hideAlert();
    Object.entries(els.vistas).forEach(([k, sec]) => sec.classList.toggle("hidden", k !== tab));
    els.navButtons.forEach((b) => b.classList.toggle("nav-btn--active", b.dataset.tab === tab));
    if (tab === "agendar") renderHorarios();
    if (tab === "admin") renderAdmin();
  }

  function initEspecialidades() {
    els.selEspecialidad.innerHTML = '<option value="">Selecciona una especialidad</option>';
    MEDISYS_CONFIG.ESPECIALIDADES.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = e.nombre;
      els.selEspecialidad.appendChild(opt);
    });
  }

  function initFechas() {
    const hoy = MediSysValidators.getTodayISO();
    const max = MediSysValidators.addDaysISO(hoy, MEDISYS_CONFIG.MAX_DAYS_AHEAD);
    els.inputFecha.min = hoy;
    els.inputFecha.max = max;
    els.inputFecha.value = hoy;
    els.rangoInfo.textContent = `Rango permitido: ${hoy} hasta ${max}.`;
  }

  function renderHorarios() {
    const espId = els.selEspecialidad.value;
    const fecha = els.inputFecha.value;
    els.inputHora.value = "";
    els.gridHorarios.innerHTML = "";

    const ocupados = espId && fecha ? MediSysStore.getOccupiedSlots(espId, fecha) : [];
    const total = MEDISYS_CONFIG.BLOQUES_HORARIOS.length;
    els.resumenCupos.textContent = espId && fecha
      ? `${total - ocupados.length} de ${total} bloques disponibles`
      : "Selecciona especialidad y fecha";

    MEDISYS_CONFIG.BLOQUES_HORARIOS.forEach((hora) => {
      const occ = Boolean(espId && fecha && ocupados.includes(hora));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.disabled = occ;
      btn.className = `slot-btn ${occ ? "slot-btn--occupied" : "slot-btn--available"}`;
      btn.textContent = occ ? `${hora} · Ocupado` : `${hora} · Libre`;

      if (!occ) {
        btn.addEventListener("click", () => {
          els.inputHora.value = hora;
          els.gridHorarios.querySelectorAll(".slot-btn--available").forEach((b) => b.classList.remove("slot-btn--selected"));
          btn.classList.add("slot-btn--selected");
        });
      }
      els.gridHorarios.appendChild(btn);
    });
  }

  function renderConsulta(cita) {
    activeCita = cita;
    els.consultaResultado.classList.remove("hidden");
    applyBadge(els.consResEstado, cita.estado);
    els.consResCodigo.textContent = cita.codigo;
    els.consResTitulo.textContent = `${cita.especialidadNombre} — ${cita.paciente.nombre}`;
    els.consResInfo.textContent = `Doc: ${cita.documento} · Tel: ${cita.paciente.telefono} · ${cita.fecha} ${cita.hora}`;

    if (cita.motivoCancelacion) {
      els.consResMotivo.textContent = `Motivo: ${cita.motivoCancelacion}`;
      els.consResMotivo.classList.remove("hidden");
    } else {
      els.consResMotivo.classList.add("hidden");
    }

    const puedeCancelar = MediSysValidators.canTransition(cita.estado, MEDISYS_CONFIG.ESTADOS.CANCELADA);
    els.cancelarPanel.classList.toggle("hidden", !puedeCancelar);
    els.consMotivo.value = "";

    els.listaTrazabilidad.innerHTML = "";
    cita.historial.forEach((h) => {
      const li = document.createElement("li");
      li.className = "p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between gap-2 text-xs";
      li.textContent = `${h.estadoAnterior ? h.estadoAnterior + " → " : ""}${h.estadoNuevo} · ${h.observacion} (${h.actor})`;
      els.listaTrazabilidad.appendChild(li);
    });
  }

  function renderAdmin() {
    const todas = MediSysStore.listCitas("TODOS");
    els.metricasAdmin.innerHTML = "";
    [
      { label: "Total", val: todas.length },
      { label: "Pendientes", val: todas.filter((c) => c.estado === "Pendiente").length },
      { label: "Confirmadas", val: todas.filter((c) => c.estado === "Confirmada").length },
      { label: "Canceladas", val: todas.filter((c) => c.estado === "Cancelada").length }
    ].forEach((m) => {
      const d = document.createElement("div");
      d.className = "p-4 rounded-xl bg-slate-50 border border-slate-200";
      d.innerHTML = `<p class="text-xs text-slate-500">${m.label}</p><p class="text-2xl font-bold text-slate-900 mt-1">${m.val}</p>`;
      els.metricasAdmin.appendChild(d);
    });

    const filtradas = MediSysStore.listCitas(els.filtroEstado.value);
    els.adminTablaCuerpo.innerHTML = "";
    if (!filtradas.length) {
      els.adminTablaCuerpo.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Sin citas para este filtro.</td></tr>';
      return;
    }

    filtradas.forEach((cita) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-3 font-mono font-bold">${cita.codigo}</td>
        <td class="p-3">${cita.paciente.nombre} <span class="text-xs text-slate-400">(${cita.documento})</span></td>
        <td class="p-3">${cita.especialidadNombre}</td>
        <td class="p-3">${cita.fecha} ${cita.hora}</td>
        <td class="p-3"><span class="badge"></span></td>
        <td class="p-3"></td>
      `;
      applyBadge(tr.querySelector(".badge"), cita.estado);
      const celdaAcc = tr.lastElementChild;
      const nexts = MEDISYS_CONFIG.TRANSICIONES_PERMITIDAS[cita.estado] || [];

      if (!nexts.length) {
        celdaAcc.innerHTML = '<span class="text-xs text-slate-400 italic">Estado final</span>';
      } else {
        const sel = document.createElement("select");
        sel.className = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs";
        sel.innerHTML = '<option value="">Cambiar estado...</option>' + nexts.map((s) => `<option value="${s}">${s}</option>`).join("");
        sel.addEventListener("change", () => {
          if (!sel.value) return;
          const r = MediSysStore.transitionState(cita.id, sel.value, "Administrador", `Estado cambiado a ${sel.value}`);
          showAlert(r.ok ? `Cita ${cita.codigo} actualizada a ${sel.value}.` : r.error, r.ok ? "success" : "error");
          renderAdmin();
        });
        celdaAcc.appendChild(sel);
      }
      els.adminTablaCuerpo.appendChild(tr);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEspecialidades();
    initFechas();
    renderHorarios();

    els.navButtons.forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
    els.selEspecialidad.addEventListener("change", renderHorarios);
    els.inputFecha.addEventListener("change", renderHorarios);
    els.filtroEstado.addEventListener("change", renderAdmin);

    els.formAgendar.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();
      const res = MediSysStore.createCita({
        especialidadId: els.selEspecialidad.value,
        fecha: els.inputFecha.value,
        hora: els.inputHora.value,
        nombrePaciente: els.inputNombre.value,
        documento: els.inputDocumento.value,
        telefono: els.inputTelefono.value
      });
      if (!res.ok) return showAlert(res.error, "error");

      const { cita } = res;
      applyBadge(els.compEstado, cita.estado);
      els.compCodigo.textContent = cita.codigo;
      els.compDetalle.textContent = `${cita.paciente.nombre} (${cita.documento}) · ${cita.especialidadNombre} · ${cita.fecha} ${cita.hora}`;
      els.comprobanteBox.classList.remove("hidden");
      els.inputNombre.value = "";
      els.inputDocumento.value = "";
      els.inputTelefono.value = "";
      showAlert("Cita registrada correctamente.", "success");
      renderHorarios();
    });

    els.formConsultar.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();
      els.consultaResultado.classList.add("hidden");
      const res = MediSysStore.findCita(els.consCodigo.value, els.consDocumento.value);
      if (!res.ok) return showAlert(res.error, "error");
      renderConsulta(res.cita);
    });

    els.btnCancelarCita.addEventListener("click", () => {
      if (!activeCita) return;
      const res = MediSysStore.cancelByPatient(activeCita.codigo, activeCita.documento, els.consMotivo.value);
      if (!res.ok) return showAlert(res.error, "error");
      showAlert("Cita cancelada y bloque horario liberado.", "success");
      renderConsulta(res.cita);
    });
  });
})();
