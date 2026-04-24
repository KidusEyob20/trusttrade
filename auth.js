/**
 * TrustTrade — Auth System v1.1
 * Handles user registration, login, session management.
 * Stored entirely in localStorage for demo purposes.
 */

const TrustAuth = (() => {

  const USERS_KEY   = 'tt_users';
  const SESSION_KEY = 'tt_session';

  const USER_ROLES = {
    MANUFACTURER: 'Manufacturer',
    BUYER: 'Buyer',
    GUEST: 'Guest'
  };

  // ── Demo seed accounts ────────────────────────────────────────────────────
  const SEED_USERS = [
    {
      id: 'usr_001',
      name: 'Alex Chen',
      email: 'alex@shenzhen-mfg.com',
      company: 'Shenzhen MFG',
      role: USER_ROLES.MANUFACTURER,
      password: 'demo1234',
      avatar: 'AC',
      createdAt: '2026-01-15',
    },
    {
      id: 'usr_002',
      name: 'Sarah Williams',
      email: 'sarah@dubai-dist.com',
      company: 'Dubai Dist.',
      role: USER_ROLES.BUYER,
      password: 'demo1234',
      avatar: 'SW',
      createdAt: '2026-01-20',
    },
    {
      id: 'usr_003',
      name: 'Demo Manufacturer',
      email: 'demo@manufacturer.com',
      company: 'Demo Manufacturing Co.',
      role: USER_ROLES.MANUFACTURER,
      password: 'demo1234',
      avatar: 'DM',
      createdAt: '2026-01-01',
    }
  ];

  // ── Storage helpers ───────────────────────────────────────────────────────
  const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

  const getSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  };
  const saveSession = (u) => localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  const clearSession = () => localStorage.removeItem(SESSION_KEY);

  const safeUser = (user) => {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  };

  // Seed demo users once
  const init = () => {
    if (getUsers().length === 0) saveUsers(SEED_USERS);
  };

  const findUser = (email, password) => {
    const users = getUsers();
    return users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
  };

  const login = (email, password) => {
    const user = findUser(email, password);
    if (!user) return { ok: false, error: 'Invalid email or password.' };
    const safe = safeUser(user);
    saveSession(safe);
    return { ok: true, user: safe };
  };

  const loginUser = (email, password) => new Promise((resolve, reject) => {
    const result = login(email, password);
    if (result.ok) resolve(result.user);
    else reject(new Error(result.error));
  });

  const register = ({ name, email, company, role, password }) => {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const initials = name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const user = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim(),
      role: role || USER_ROLES.BUYER,
      password,
      avatar: initials,
      createdAt: new Date().toISOString().split('T')[0],
    };
    users.push(user);
    saveUsers(users);
    const safe = safeUser(user);
    saveSession(safe);
    return { ok: true, user: safe };
  };

  const registerUser = async ({ name, email, company, role, password }) => {
    const result = register({ name, email, company, role, password });
    if (!result.ok) throw new Error(result.error);
    return result.user;
  };

  const logout = () => {
    clearSession();
    window.location.href = 'login.html';
  };

  const logoutUser = async () => {
    logout();
    return Promise.resolve();
  };

  const currentUser = () => getSession();

  const requireAuth = () => {
    if (!getSession()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  };

  init();

  return {
    USER_ROLES,
    register,
    login,
    logout,
    currentUser,
    requireAuth,
    registerUser,
    loginUser,
    logoutUser,
  };
})();
