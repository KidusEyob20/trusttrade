/**
 * TrustTrade — Auth System v1.0
 * Handles user registration, login, session management.
 * Stored entirely in localStorage for demo purposes.
 */

const TrustAuth = (() => {

  const USERS_KEY   = 'tt_users';
  const SESSION_KEY = 'tt_session';

  // ── Demo seed accounts ────────────────────────────────────────────────────
  const SEED_USERS = [
    {
      id: 'usr_001',
      name: 'Alex Chen',
      email: 'alex@shenzhen-mfg.com',
      company: 'Shenzhen MFG',
      role: 'Manufacturer',
      password: 'demo1234',
      avatar: 'AC',
      createdAt: '2026-01-15',
    },
    {
      id: 'usr_002',
      name: 'Sarah Williams',
      email: 'sarah@dubai-dist.com',
      company: 'Dubai Dist.',
      role: 'Buyer',
      password: 'demo1234',
      avatar: 'SW',
      createdAt: '2026-01-20',
    },
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

  // Seed demo users once
  const init = () => {
    if (getUsers().length === 0) saveUsers(SEED_USERS);
  };

  // ── Public API ────────────────────────────────────────────────────────────
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
      role,
      password,
      avatar: initials,
      createdAt: new Date().toISOString().split('T')[0],
    };
    users.push(user);
    saveUsers(users);
    const { password: _, ...safe } = user;
    saveSession(safe);
    return { ok: true, user: safe };
  };

  const login = (email, password) => {
    const users = getUsers();
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) return { ok: false, error: 'Invalid email or password.' };
    const { password: _, ...safe } = user;
    saveSession(safe);
    return { ok: true, user: safe };
  };

  const logout = () => {
    clearSession();
    window.location.href = 'login.html';
  };

  const currentUser = () => getSession();

  // Guard: redirect to login if not authenticated
  const requireAuth = () => {
    if (!getSession()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  };

  init();
  return { register, login, logout, currentUser, requireAuth };
})();
