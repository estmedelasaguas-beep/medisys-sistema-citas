const MediSysAuth = (() => {
  const KEYS = {
    USERS: "medisys_users_roles_v1",
    SESSION: "medisys_session_roles_v1",
    LOCK: "medisys_lock_roles_v1"
  };
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 5 * 60 * 1000;

  async function hashPassword(plain) {
    const buf = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("MEDISYS_ROLES_2026:" + plain)
    );
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function readJSON(key, fallback) {
    try {
      const val = JSON.parse(localStorage.getItem(key));
      return val ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  async function ensureSeedUsers() {
    const users = readJSON(KEYS.USERS, []);
    let changed = false;

    if (!users.some((u) => u.documento === "10000001" && u.role === "ADMIN")) {
      users.push({
        id: "ADM-001",
        documento: "10000001",
        nombre: "Administrador MediSys",
        telefono: "3000000001",
        role: "ADMIN",
        especialidadId: null,
        passwordHash: await hashPassword("Admin2026*")
      });
      changed = true;
    }

    if (!users.some((u) => u.documento === "20000001" && u.role === "MEDICO")) {
      users.push({
        id: "MED-001",
        documento: "20000001",
        nombre: "Dr. Carlos Mendoza",
        telefono: "3000000002",
        role: "MEDICO",
        especialidadId: "ESP-MG",
        especialidadNombre: "Medicina General",
        passwordHash: await hashPassword("Medico2026*")
      });
      changed = true;
    }

    if (changed) writeJSON(KEYS.USERS, users);
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.SESSION)) || null;
    } catch {
      return null;
    }
  }

  function setSession(user) {
    const session = {
      userId: user.id,
      documento: user.documento,
      nombre: user.nombre,
      telefono: user.telefono,
      role: user.role,
      especialidadId: user.especialidadId || null,
      especialidadNombre: user.especialidadNombre || null
    };
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(KEYS.SESSION);
  }

  async function registerPaciente(raw) {
    await ensureSeedUsers();
    const check = MediSysValidators.validateRegisterPayload(raw);
    if (!check.valid) return { ok: false, error: check.error };

    const { nombre, documento, telefono, password } = check.data;
    const users = readJSON(KEYS.USERS, []);
    if (users.some((u) => u.documento === documento)) {
      return { ok: false, error: `Ya existe un usuario registrado con el documento ${documento}.` };
    }

    const user = {
      id: "PAC-" + Date.now(),
      documento,
      nombre,
      telefono,
      role: "PACIENTE",
      especialidadId: null,
      passwordHash: await hashPassword(password)
    };
    users.push(user);
    writeJSON(KEYS.USERS, users);
    return { ok: true, session: setSession(user) };
  }

  async function login(roleRaw, documentoRaw, passwordRaw) {
    await ensureSeedUsers();
    const lock = readJSON(KEYS.LOCK, { attempts: 0, lockedUntil: 0 });
    const now = Date.now();

    if (lock.lockedUntil && now < lock.lockedUntil) {
      const mins = Math.ceil((lock.lockedUntil - now) / 60000);
      return { ok: false, error: `Acceso bloqueado por seguridad. Intenta en ${mins} min.` };
    }

    const role = MediSysValidators.sanitizeText(roleRaw || "").toUpperCase();
    const doc = MediSysValidators.normalizeDocument(documentoRaw || "");
    const pass = typeof passwordRaw === "string" ? passwordRaw : "";

    if (!["PACIENTE", "MEDICO", "ADMIN"].includes(role)) {
      return { ok: false, error: "Selecciona un rol válido (Paciente, Médico o Administrador)." };
    }
    if (!doc || !pass) {
      return { ok: false, error: "Ingresa tu número de documento y contraseña." };
    }

    const users = readJSON(KEYS.USERS, []);
    const user = users.find((u) => u.documento === doc && u.role === role);
    const hash = await hashPassword(pass);

    if (!user || user.passwordHash !== hash) {
      const attempts = (lock.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        writeJSON(KEYS.LOCK, { attempts: 0, lockedUntil: now + LOCK_MS });
        return { ok: false, error: "Demasiados intentos fallidos. Bloqueado por 5 minutos." };
      }
      writeJSON(KEYS.LOCK, { attempts, lockedUntil: 0 });
      return {
        ok: false,
        error: `Documento, rol o contraseña incorrectos (intento ${attempts} de ${MAX_ATTEMPTS}).`
      };
    }

    writeJSON(KEYS.LOCK, { attempts: 0, lockedUntil: 0 });
    return { ok: true, session: setSession(user) };
  }

  return { ensureSeedUsers, getSession, logout, registerPaciente, login };
})();
