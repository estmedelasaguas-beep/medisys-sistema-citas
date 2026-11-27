/**
 * Módulo de Autenticación, Cifrado SHA-256, Control de Roles (RBAC)
 * y Protección contra Fuerza Bruta para MediSys.
 */
const MediSysAuth = (() => {
  async function hashPassword(plainText, salt = "MEDISYS_SALT_2026") {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${plainText}`);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(MEDISYS_CONFIG.USERS_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(MEDISYS_CONFIG.USERS_STORAGE_KEY, JSON.stringify(users));
  }

  async function ensureDefaultAdmin() {
    const users = loadUsers();
    const exists = users.some((u) => u.role === MEDISYS_CONFIG.ROLES.ADMIN);
    if (!exists) {
      const passwordHash = await hashPassword("Admin2026*");
      users.push({
        id: "USR-ADMIN-001",
        identificador: "admin@medisys.local",
        documento: "00000000",
        nombre: "Administrador MediSys",
        telefono: "3000000000",
        role: MEDISYS_CONFIG.ROLES.ADMIN,
        passwordHash,
        creadoEn: new Date().toISOString()
      });
      saveUsers(users);
    }
  }

  function getLockoutState() {
    try {
      const raw = localStorage.getItem(MEDISYS_CONFIG.LOCKOUT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
    } catch {
      return { attempts: 0, lockedUntil: 0 };
    }
  }

  function setLockoutState(state) {
    localStorage.setItem(MEDISYS_CONFIG.LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(MEDISYS_CONFIG.SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function createSession(user) {
    const session = {
      userId: user.id,
      identificador: user.identificador,
      documento: user.documento,
      nombre: user.nombre,
      telefono: user.telefono,
      role: user.role,
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem(MEDISYS_CONFIG.SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(MEDISYS_CONFIG.SESSION_STORAGE_KEY);
  }

  async function registerPaciente(rawPayload) {
    await ensureDefaultAdmin();
    const check = MediSysValidators.validateRegisterPayload(rawPayload);
    if (!check.valid) return { ok: false, error: check.error };

    const { nombre, documento, telefono, password } = check.data;
    const users = loadUsers();

    // Restricción UNIQUE sobre documento de identidad
    const duplicate = users.some((u) => u.documento === documento || u.identificador === documento);
    if (duplicate) {
      return {
        ok: false,
        error: `Ya existe una cuenta registrada con el documento ${documento}. Inicia sesión.`
      };
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      identificador: documento,
      documento,
      nombre,
      telefono,
      role: MEDISYS_CONFIG.ROLES.PACIENTE,
      passwordHash,
      creadoEn: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const session = createSession(newUser);
    return { ok: true, session };
  }

  async function login(identificadorRaw, passwordRaw) {
    await ensureDefaultAdmin();

    const lock = getLockoutState();
    const now = Date.now();
    if (lock.lockedUntil && now < lock.lockedUntil) {
      const minsLeft = Math.ceil((lock.lockedUntil - now) / 60000);
      return {
        ok: false,
        error: `Acceso bloqueado temporalmente por seguridad. Intenta nuevamente en ${minsLeft} minuto(s).`
      };
    }

    const identificador = MediSysValidators.sanitizeText(identificadorRaw || "").toLowerCase();
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    if (!identificador || !password) {
      return { ok: false, error: "Ingresa tu identificador y contraseña." };
    }

    const users = loadUsers();
    const user = users.find(
      (u) => u.identificador.toLowerCase() === identificador || u.documento === identificador
    );

    const inputHash = await hashPassword(password);
    if (!user || user.passwordHash !== inputHash) {
      const nextAttempts = (lock.attempts || 0) + 1;
      if (nextAttempts >= MEDISYS_CONFIG.MAX_LOGIN_ATTEMPTS) {
        setLockoutState({
          attempts: 0,
          lockedUntil: now + MEDISYS_CONFIG.LOCKOUT_MINUTES * 60 * 1000
        });
        return {
          ok: false,
          error: `Demasiados intentos fallidos. Cuenta bloqueada por ${MEDISYS_CONFIG.LOCKOUT_MINUTES} minutos.`
        };
      }
      setLockoutState({ attempts: nextAttempts, lockedUntil: 0 });
      return {
        ok: false,
        error: `Credenciales incorrectas (intento ${nextAttempts} de ${MEDISYS_CONFIG.MAX_LOGIN_ATTEMPTS}).`
      };
    }

    setLockoutState({ attempts: 0, lockedUntil: 0 });
    const session = createSession(user);
    return { ok: true, session };
  }

  return {
    ensureDefaultAdmin,
    getSession,
    logout,
    registerPaciente,
    login
  };
})();
