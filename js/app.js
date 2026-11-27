/**
 * Controlador principal de MediSys con enrutamiento protegido por rol (RBAC).
 */
(() => {
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
    loginIdentificador: document.getElementById("login-identificador"),
    loginPassword: document.getElementById("login-password"),
    formRegister: document.getElementById("form-register"),
    regNombre: document.getElementById("reg-nombre"),
    regDocumento: document.getElementById("reg-documento"),
    regTelefono: document.getElementById("reg-telefono"),
    regPassword: document.getElementById("reg-password"),

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
    agNombreReadonly: document.getElementById("ag-nombre-readonly"),
    agDocReadonly: document.getElementById("ag-doc-readonly"),
    comprobanteBox: document.getElementById("comprobante-box"),
    compCodigo: document.getElementById("comp-codigo"),
    compDetalle: document.getElementById("comp-detalle"),
    compEstado: document.getElementById("comp-estado"),

    misCitasLista: document.getElementById("mis-citas-lista"),

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

  function toggleAuthMode(mode) {
    hideAlert();
    const isLogin = mode === "login";
    els.formLogin.classList.toggle("hidden", !isLogin);
    els.formRegister.classList.toggle("hidden", isLogin);

    els.authTabLogin.className = isLogin
      ? "py-2 rounded-lg bg-white text-teal-800 shadow-sm transition cursor-pointer"
      : "py-2 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer";

    els.authTabRegister.className = !isLogin
      ? "py-2 rounded-lg bg-white text-teal-800 shadow-sm transition cursor-pointer"
      : "py-2 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer";
  }

  function syncUIWithSession() {
    const session = MediSysAuth.getSession();

    // Ocultar todas las vistas primero
    els.vistaAuth.classList.add("hidden");
    Object.values(els.vistas).forEach((sec) => sec.classList.add("hidden"));

    if (!session) {
      els.headerSessionBar.classList.add("hidden");
      els.vistaAuth.classList.remove("hidden");
      return;
    }

    // Mostrar barra de sesión y filtrar botones por rol
    els.headerSessionBar.classList.remove("hidden");
    els.sessionUserName.textContent = session.nombre;
    els.sessionUserRole.textContent =
      session.role === MEDISYS_CONFIG.ROLES.ADMIN ? "Rol: Administrador" : `Doc: ${session.documento}`;

    els.navButtons.forEach((btn) => {
      const allowed = btn.dataset.role === session.role;
      btn.classList.toggle("hidden", !allowed);
    });

    if (session.role === MEDISYS_CONFIG.ROLES.ADMIN) {
      switchTab("admin");
    } else {
      els.agNombreReadonly.value = session.nombre;
      els.agDocReadonly.value = `CC ${session.documento} · Tel: ${session.telefono}`;
      switchTab("agendar");
    }
  }

  function switchTab(tabName) {
    const session = MediSysAuth.getSession();
    if (!session) {
      syncUIWithSession();
      return;
    }

    // Guardián RBAC: impide cambiar a una vista que no pertenece al rol
    if (session.role === MEDISYS_CONFIG.ROLES.ADMIN && tabName !== "admin") {
      tabName = "admin";
    }
    if (session.role === MEDISYS_CONFIG.ROLES.PACIENTE && tabName === "admin") {
      showAlert("Acceso denegado: el panel administrativo es exclusivo para administradores.", "error");
      tabName = "agendar";
    }

    Object.entries(els.vistas).forEach(([key, section]) => {
      section.classList.toggle("hidden", key !== tabName);
    });
    els.navButtons.forEach((btn) => {
      btn.classList.toggle("nav-btn--active", btn.dataset.tab === tabName);
    });

    if (tabName === "agendar") renderHorarios();
    if (tabName === "consultar") renderMisCitas();
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
      espId && fecha ? `${disponiblesCount} de ${total} bloques disponibles` : "Selecciona especialidad y fecha";

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
    const session = MediSysAuth.getSession();

    const result = MediSysStore.createCita(
      {
        especialidadId: els.selEspecialidad.value,
        fecha: els.inputFecha.value,
        hora: els.inputHora.value
      },
      session
    );

    if (!result.ok) {
      showAlert(result.error, "error");
      return;
    }

    const { cita } = result;
    showAlert("Cita registrada correctamente.", "success");

    applyBadgeStyle(els.compEstado, cita.estado);
    els.compCodigo.textContent = cita.codigo;
    els.compDetalle.textContent = `${cita.especialidadNombre} · ${cita.fecha} a las ${cita.hora} · Paciente: ${cita.paciente.nombre}`;
    els.comprobanteBox.classList.remove("hidden");
    renderHorarios();
  }

  function renderMisCitas() {
    const session = MediSysAuth.getSession();
    const citas = MediSysStore.listMyCitas(session);
    els.misCitasLista.innerHTML = "";

    if (citas.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-400 text-center py-8 bg-slate-50 rounded-xl border border-slate-200";
      empty.textContent = "Aún no tienes citas registradas en tu cuenta.";
      els.misCitasLista.appendChild(empty);
      return;
    }

    citas.forEach((cita) => {
      const card = document.createElement("article");
      card.className = "p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4";

      const top = document.createElement("div");
      top.className = "flex flex-wrap items-start justify-between gap-4";

      const info = document.createElement("div");
      const headerRow = document.createElement("div");
      headerRow.className = "flex items-center gap-2.5";

      const badge = document.createElement("span");
      applyBadgeStyle(badge, cita.estado);

      const codeSpan = document.createElement("span");
      codeSpan.className = "font-mono font-bold text-slate-900 text-sm";
      codeSpan.textContent = cita.codigo;

      headerRow.appendChild(badge);
      headerRow.appendChild(codeSpan);

      const title = document.createElement("h3");
      title.className = "text-base font-bold text-slate-900 mt-1.5";
      title.textContent = `${cita.especialidadNombre} · ${cita.fecha} a las ${cita.hora}`;

      info.appendChild(headerRow);
      info.appendChild(title);

      if (cita.motivoCancelacion) {
        const mot = document.createElement("p");
        mot.className = "text-xs text-rose-700 mt-1";
        mot.textContent = `Observación: ${cita.motivoCancelacion}`;
        info.appendChild(mot);
      }

      top.appendChild(info);

      if (MediSysValidators.canTransition(cita.estado, MEDISYS_CONFIG.ESTADOS.CANCELADA)) {
        const cancelBox = document.createElement("div");
        cancelBox.className = "flex flex-wrap items-center gap-2";

        const motivoInput = document.createElement("input");
        motivoInput.type = "text";
        motivoInput.maxLength = 150;
        motivoInput.placeholder = "Motivo (opcional)";
        motivoInput.className = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs";

        const btnCancel = document.createElement("button");
        btnCancel.type = "button";
        btnCancel.className = "bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer";
        btnCancel.textContent = "Cancelar cita";
        btnCancel.addEventListener("click", () => {
          const res = MediSysStore.transitionState(
            cita.id,
            MEDISYS_CONFIG.ESTADOS.CANCELADA,
            session,
            motivoInput.value
          );
          if (!res.ok) {
            showAlert(res.error, "error");
          } else {
            showAlert(`Cita ${cita.codigo} cancelada y horario liberado.`, "success");
            renderMisCitas();
          }
        });

        cancelBox.appendChild(motivoInput);
        cancelBox.appendChild(btnCancel);
        top.appendChild(cancelBox);
      }

      // Historial de trazabilidad
      const traceList = document.createElement("ol");
      traceList.className = "space-y-1.5 border-t border-slate-200 pt-3";
      cita.historial.forEach((h) => {
        const li = document.createElement("li");
        li.className = "text-xs text-slate-600 flex flex-wrap justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200";
        const left = document.createElement("span");
        left.textContent = `${h.estadoAnterior ? h.estadoAnterior + " → " : ""}${h.estadoNuevo} · ${h.observacion} (${h.actor})`;
        const right = document.createElement("span");
        right.className = "font-mono text-slate-400";
        right.textContent = new Date(h.timestamp).toLocaleString("es-CO");
        li.appendChild(left);
        li.appendChild(right);
        traceList.appendChild(li);
      });

      card.appendChild(top);
      card.appendChild(traceList);
      els.misCitasLista.appendChild(card);
    });
  }

  function renderAdmin() {
    const session = MediSysAuth.getSession();
    const res = MediSysStore.listAllForAdmin(session, els.filtroEstado.value);
    if (!res.ok) {
      showAlert(res.error, "error");
      return;
    }

    const { citas, todas } = res;
    els.metricasAdmin.innerHTML = "";
    [
      { label: "Total citas", val: todas.length },
      { label: "Pendientes", val: todas.filter((c) => c.estado === "Pendiente").length },
      { label: "Confirmadas", val: todas.filter((c) => c.estado === "Confirmada").length },
      { label: "Canceladas", val: todas.filter((c) => c.estado === "Cancelada").length }
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

    els.adminTablaCuerpo.innerHTML = "";
    if (citas.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "p-6 text-center text-slate-400";
      td.textContent = "No hay citas registradas para el filtro seleccionado.";
      tr.appendChild(td);
      els.adminTablaCuerpo.appendChild(tr);
      return;
    }

    citas.forEach((cita) => {
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
          const upd = MediSysStore.transitionState(
            cita.id,
            select.value,
            session,
            `Actualizado por administrador a ${select.value}`
          );
          if (!upd.ok) {
            showAlert(upd.error, "error");
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
    els.authTabLogin.addEventListener("click", () => toggleAuthMode("login"));
    els.authTabRegister.addEventListener("click", () => toggleAuthMode("register"));

    els.formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const res = await MediSysAuth.login(els.loginIdentificador.value, els.loginPassword.value);
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
      showAlert("Cuenta creada e inicio de sesión exitoso.", "success");
      syncUIWithSession();
    });

    els.btnLogout.addEventListener("click", () => {
      MediSysAuth.logout();
      els.comprobanteBox.classList.add("hidden");
      showAlert("Sesión cerrada correctamente.", "info");
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
    els.formAgendar.addEventListener("submit", handleAgendarSubmit);
    els.filtroEstado.addEventListener("change", renderAdmin);
  }

  async function init() {
    await MediSysAuth.ensureDefaultAdmin();
    initEspecialidades();
    initFechas();
    bindEvents();
    syncUIWithSession();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
