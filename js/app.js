(() => {
  let alertTimeout = null;

  const els = {
    banner: document.getElementById("banner-alerta"),
    headerSessionBar: document.getElementById("header-session-bar"),
    sessionUserName: document.getElementById("session-user-name"),
    sessionUserRole: document.getElementById("session-user-role"),
    btnLogout: document.getElementById("btn-logout"),
    navButtons: document.querySelectorAll(".nav-btn"),

    vistaAuth: document.getElementById("vista-auth"),
    authTabLogin: document.getElementById("auth-tab-login"),
    authTabRegister: document.getElementById("auth-tab-register"),
    formLogin: document.getElementById("form-login"),
    loginRol: document.getElementById("login-rol"),
    loginDocumento: document.getElementById("login-documento"),
    loginPassword: document.getElementById("login-password"),
    formRegister: document.getElementById("form-register"),
    regNombre: document.getElementById("reg-nombre"),
    regDocumento: document.getElementById("reg-documento"),
    regTelefono: document.getElementById("reg-telefono"),
    regPassword: document.getElementById("reg-password"),

    vistas: {
      agendar: document.getElementById("vista-agendar"),
      consultar: document.getElementById("vista-consultar"),
      medico: document.getElementById("vista-medico"),
      admin: document.getElementById("vista-admin")
    },

    formAgendar: document.getElementById("form-agendar"),
    selEspecialidad: document.getElementById("ag-especialidad"),
    inputFecha: document.getElementById("ag-fecha"),
    rangoInfo: document.getElementById("ag-rango-info"),
    resumenCupos: document.getElementById("ag-resumen-cupos"),
    gridHorarios: document.getElementById("grid-horarios"),
    inputHora: document.getElementById("ag-hora"),
    agNombreReadonly: document.getElementById("ag-nombre-readonly"),
    agDocReadonly: document.getElementById("ag-doc-readonly"),
    comprobanteBox: document.getElementById("comprobante-box"),
    compCodigo: document.getElementById("comp-codigo"),
    compDetalle: document.getElementById("comp-detalle"),
    compEstado: document.getElementById("comp-estado"),

    misCitasLista: document.getElementById("mis-citas-lista"),
    medicoSubtitulo: document.getElementById("medico-subtitulo"),
    medicoCitasLista: document.getElementById("medico-citas-lista"),

    filtroEstado: document.getElementById("filtro-estado"),
    metricasAdmin: document.getElementById("metricas-admin"),
    adminTablaCuerpo: document.getElementById("admin-tabla-cuerpo")
  };

  function showAlert(message, type = "info") {
    if (!els.banner) return;
    if (alertTimeout) clearTimeout(alertTimeout);

    els.banner.classList.remove("hidden", "vista-salida");
    els.banner.className =
      "mb-6 p-4 rounded-xl border text-sm font-medium vista-animada " +
      (type === "error"
        ? "bg-rose-50 border-rose-200 text-rose-800"
        : type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : "bg-sky-50 border-sky-200 text-sky-800");

    els.banner.textContent = message;

    alertTimeout = setTimeout(() => {
      hideAlert();
    }, 4500);
  }

  function hideAlert() {
    if (!els.banner || els.banner.classList.contains("hidden")) return;
    els.banner.classList.remove("vista-animada");
    els.banner.classList.add("vista-salida");
    setTimeout(() => {
      if (els.banner.classList.contains("vista-salida")) {
        els.banner.classList.add("hidden");
        els.banner.classList.remove("vista-salida");
      }
    }, 220);
  }

  function applyBadge(badgeEl, estado) {
    if (!badgeEl) return;
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

  function toggleAuthMode(mode) {
    hideAlert();
    const isLogin = mode === "login";
    els.formLogin.classList.toggle("hidden", !isLogin);
    els.formRegister.classList.toggle("hidden", isLogin);

    els.authTabLogin.className = isLogin
      ? "py-2 rounded-lg bg-white text-teal-800 shadow-sm cursor-pointer"
      : "py-2 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer";

    els.authTabRegister.className = !isLogin
      ? "py-2 rounded-lg bg-white text-teal-800 shadow-sm cursor-pointer"
      : "py-2 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer";
  }

  function defaultTabForRole(role) {
    if (role === "ADMIN") return "admin";
    if (role === "MEDICO") return "medico";
    return "agendar";
  }

  function syncUIWithSession() {
    const session = MediSysAuth.getSession();
    els.vistaAuth.classList.add("hidden");
    Object.values(els.vistas).forEach((sec) => sec.classList.add("hidden"));

    if (!session) {
      els.headerSessionBar.classList.add("hidden");
      els.vistaAuth.classList.remove("hidden");
      return;
    }

    els.headerSessionBar.classList.remove("hidden");
    els.sessionUserName.textContent = session.nombre;
    const roleLabel =
      session.role === "ADMIN" ? "Administrador" :
      session.role === "MEDICO" ? `Médico · ${session.especialidadNombre || ""}` :
      `Paciente · Doc ${session.documento}`;
    els.sessionUserRole.textContent = roleLabel;

    els.navButtons.forEach((btn) => {
      btn.classList.toggle("hidden", btn.dataset.role !== session.role);
    });

    if (session.role === "PACIENTE") {
      els.agNombreReadonly.value = session.nombre;
      els.agDocReadonly.value = `CC ${session.documento} · Tel: ${session.telefono}`;
    }

    switchTab(defaultTabForRole(session.role));
  }

  function switchTab(tabName) {
    const session = MediSysAuth.getSession();
    if (!session) return syncUIWithSession();

    const allowedTabsByRole = {
      PACIENTE: ["agendar", "consultar"],
      MEDICO: ["medico"],
      ADMIN: ["admin"]
    };
    const allowed = allowedTabsByRole[session.role] || [];
    if (!allowed.includes(tabName)) {
      tabName = defaultTabForRole(session.role);
    }

    Object.entries(els.vistas).forEach(([k, sec]) => {
      const visible = k === tabName;
      sec.classList.toggle("hidden", !visible);
      if (visible) {
        sec.classList.remove("vista-animada");
        void sec.offsetWidth;
        sec.classList.add("vista-animada");
      }
    });

    els.navButtons.forEach((b) => b.classList.toggle("nav-btn--active", b.dataset.tab === tabName));

    if (tabName === "agendar") renderHorarios();
    if (tabName === "consultar") renderMisCitas();
    if (tabName === "medico") renderMedico();
    if (tabName === "admin") renderAdmin();
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
    els.rangoInfo.textContent = `Rango habilitado: ${hoy} hasta ${max}.`;
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
      const ocupado = Boolean(espId && fecha && ocupados.includes(hora));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.disabled = ocupado;
      btn.className = `slot-btn ${ocupado ? "slot-btn--occupied" : "slot-btn--available"}`;
      btn.textContent = ocupado ? `${hora} · Ocupado` : `${hora} · Libre`;

      if (!ocupado) {
        btn.addEventListener("click", () => {
          els.inputHora.value = hora;
          els.gridHorarios.querySelectorAll(".slot-btn--available").forEach((b) => b.classList.remove("slot-btn--selected"));
          btn.classList.add("slot-btn--selected");
        });
      }
      els.gridHorarios.appendChild(btn);
    });
  }

  function renderMisCitas() {
    const session = MediSysAuth.getSession();
    const mias = MediSysStore.listCitas("TODOS").filter((c) => c.documento === session.documento);
    els.misCitasLista.innerHTML = "";

    if (!mias.length) {
      els.misCitasLista.innerHTML = '<p class="text-sm text-slate-400 p-6 bg-slate-50 rounded-xl border text-center">No tienes citas registradas en tu cuenta.</p>';
      return;
    }

    mias.forEach((cita) => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 vista-animada";
      const head = document.createElement("div");
      head.className = "flex flex-wrap items-center justify-between gap-2";

      const info = document.createElement("div");
      info.innerHTML = `<span class="font-mono font-bold text-teal-900">${cita.codigo}</span> · <strong>${cita.especialidadNombre}</strong> (${cita.fecha} · ${cita.hora}) — <span class="font-semibold">${cita.estado}</span>`;
      head.appendChild(info);

      if (MediSysValidators.canTransition(cita.estado, MEDISYS_CONFIG.ESTADOS.CANCELADA)) {
        const btnC = document.createElement("button");
        btnC.type = "button";
        btnC.textContent = "Cancelar cita";
        btnC.className = "bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer";
        btnC.addEventListener("click", () => {
          const res = MediSysStore.cancelByPatient(cita.codigo, cita.documento, "Cancelada por el paciente");
          if (!res.ok) return showAlert(res.error, "error");
          showAlert("Cita cancelada y horario liberado.", "success");
          renderMisCitas();
        });
        head.appendChild(btnC);
      }

      const hist = document.createElement("ul");
      hist.className = "text-xs text-slate-600 space-y-1 border-t border-slate-200 pt-2";
      cita.historial.forEach((h) => {
        const li = document.createElement("li");
        li.textContent = `${h.estadoAnterior ? h.estadoAnterior + " → " : ""}${h.estadoNuevo} · ${h.observacion} (${h.actor})`;
        hist.appendChild(li);
      });

      card.appendChild(head);
      card.appendChild(hist);
      els.misCitasLista.appendChild(card);
    });
  }

  function renderMedico() {
    const session = MediSysAuth.getSession();
    const espNombre = session.especialidadNombre || "Medicina General";
    const espId = session.especialidadId || "ESP-MG";
    els.medicoSubtitulo.textContent = `Especialidad asignada: ${espNombre} · ${session.nombre}`;

    const citas = MediSysStore.listCitas("TODOS").filter((c) => {
      const cEspId = String(c.especialidadId || c.especialidad || "").toLowerCase();
      const cEspNom = String(c.especialidadNombre || "").toLowerCase();
      const matchEsp =
        cEspId === String(espId).toLowerCase() ||
        cEspNom === String(espNombre).toLowerCase();
      return matchEsp && c.estado !== "Cancelada";
    });

    els.medicoCitasLista.innerHTML = "";

    if (!citas.length) {
      els.medicoCitasLista.innerHTML = `<p class="text-sm text-slate-400 p-6 bg-slate-50 rounded-xl border text-center">No hay citas activas en ${espNombre} por ahora.</p>`;
      return;
    }

    citas.forEach((cita) => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4";

      const left = document.createElement("div");
      left.innerHTML = `<span class="font-mono font-bold text-teal-900">${cita.codigo}</span> · <strong>${cita.paciente.nombre}</strong> (Doc: ${cita.documento}) · ${cita.fecha} ${cita.hora} — <span class="font-semibold">${cita.estado}</span>`;
      card.appendChild(left);

      if (cita.estado === "Confirmada" || cita.estado === "Pendiente") {
        const btnAtender = document.createElement("button");
        btnAtender.type = "button";
        btnAtender.textContent = cita.estado === "Pendiente" ? "Confirmar cita" : "Marcar Atendida";
        btnAtender.className = "bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer";
        btnAtender.addEventListener("click", () => {
          const targetState = cita.estado === "Pendiente" ? "Confirmada" : "Atendida";
          const res = MediSysStore.transitionState(
            cita.id,
            targetState,
            `Médico (${session.nombre})`,
            `Actualizada por médico a ${targetState}`
          );
          if (!res.ok) return showAlert(res.error, "error");
          showAlert(`Cita ${cita.codigo} actualizada a ${targetState}.`, "success");
          renderMedico();
        });
        card.appendChild(btnAtender);
      }

      els.medicoCitasLista.appendChild(card);
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
      els.adminTablaCuerpo.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay citas registradas.</td></tr>';
      return;
    }

    filtradas.forEach((cita) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-3 font-mono font-bold">${cita.codigo}</td>
        <td class="p-3">${cita.paciente.nombre} <span class="text-xs text-slate-400">(${cita.documento})</span></td>
        <td class="p-3">${cita.especialidadNombre}</td>
        <td class="p-3">${cita.fecha} · ${cita.hora}</td>
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
        sel.className = "select-anim rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs";
        sel.innerHTML = '<option value="">Cambiar estado...</option>' + nexts.map((s) => `<option value="${s}">${s}</option>`).join("");
        sel.addEventListener("change", () => {
          if (!sel.value) return;
          const r = MediSysStore.transitionState(cita.id, sel.value, "Administrador", `Estado actualizado a ${sel.value}`);
          showAlert(r.ok ? `Cita ${cita.codigo} actualizada a ${sel.value}.` : r.error, r.ok ? "success" : "error");
          renderAdmin();
        });
        celdaAcc.appendChild(sel);
      }
      els.adminTablaCuerpo.appendChild(tr);
    });
  }

  function bindEvents() {
    els.authTabLogin.addEventListener("click", () => toggleAuthMode("login"));
    els.authTabRegister.addEventListener("click", () => toggleAuthMode("register"));

    els.formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const res = await MediSysAuth.login(
        els.loginRol.value,
        els.loginDocumento.value,
        els.loginPassword.value
      );
      if (!res.ok) return showAlert(res.error, "error");
      els.loginPassword.value = "";
      showAlert(`Bienvenido, ${res.session.nombre}.`, "success");
      syncUIWithSession();
    });

    els.formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const res = await MediSysAuth.registerPaciente({
        nombre: els.regNombre.value,
        documento: els.regDocumento.value,
        telefono: els.regTelefono.value,
        password: els.regPassword.value
      });
      if (!res.ok) return showAlert(res.error, "error");
      els.formRegister.reset();
      showAlert("Cuenta de paciente creada. Sesión iniciada.", "success");
      syncUIWithSession();
    });

    els.btnLogout.addEventListener("click", () => {
      MediSysAuth.logout();
      els.comprobanteBox.classList.add("hidden");
      showAlert("Sesión cerrada.", "info");
      syncUIWithSession();
    });

    els.navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        hideAlert();
        switchTab(btn.dataset.tab);
      });
    });

    els.selEspecialidad.addEventListener("change", renderHorarios);
    els.inputFecha.addEventListener("change", renderHorarios);
    els.filtroEstado.addEventListener("change", renderAdmin);

    els.formAgendar.addEventListener("submit", (e) => {
      e.preventDefault();
      hideAlert();
      const session = MediSysAuth.getSession();
      if (!session || session.role !== "PACIENTE") {
        showAlert("Debes iniciar sesión como paciente para agendar una cita.", "error");
        return syncUIWithSession();
      }

      const res = MediSysStore.createCita(
        {
          especialidadId: els.selEspecialidad.value,
          fecha: els.inputFecha.value,
          hora: els.inputHora.value,
          nombrePaciente: session.nombre,
          documento: session.documento,
          telefono: session.telefono
        },
        session
      );

      if (!res.ok) return showAlert(res.error, "error");
      const { cita } = res;
      applyBadge(els.compEstado, cita.estado);
      els.compCodigo.textContent = cita.codigo;
      els.compDetalle.textContent = `${cita.paciente.nombre} (${cita.documento}) · ${cita.especialidadNombre} · ${cita.fecha} ${cita.hora}`;
      els.comprobanteBox.classList.remove("hidden");
      showAlert("Cita registrada correctamente.", "success");
      renderHorarios();
    });
  }

  async function init() {
    await MediSysAuth.ensureSeedUsers();
    initEspecialidades();
    initFechas();
    bindEvents();
    syncUIWithSession();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
