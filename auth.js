/**
 * TrustTrade — Advanced Auth & Role System v2.0
 * Handles user registration, login, session management, roles, and profiles.
 * Supports Buyer/Manufacturer roles with guest access and mock accounts.
 */

const TrustAuth = (() => {

  // ── Constants ─────────────────────────────────────────────────────────────
  const USERS_KEY = 'tt_users';
  const SESSION_KEY = 'tt_session';
  const GUEST_SESSION_KEY = 'tt_guest_session';

  const USER_ROLES = {
    BUYER: 'buyer',
    MANUFACTURER: 'manufacturer',
    GUEST: 'guest'
  };

  const PERMISSIONS = {
    [USER_ROLES.BUYER]: {
      canCreateTrades: true,
      canViewAllTrades: true,
      canDepositEscrow: true,
      canFlagTrades: false,
      canResolveFlags: false,
      canAccessAgents: false,
      canAccessExplorer: true
    },
    [USER_ROLES.MANUFACTURER]: {
      canCreateTrades: true,
      canViewAllTrades: true,
      canDepositEscrow: true,
      canFlagTrades: true,
      canResolveFlags: true,
      canAccessAgents: true,
      canAccessExplorer: true
    },
    [USER_ROLES.GUEST]: {
      canCreateTrades: true,
      canViewAllTrades: true,
      canDepositEscrow: true,
      canFlagTrades: false,
      canResolveFlags: false,
      canAccessAgents: false,
      canAccessExplorer: true
    }
  };

  // ── Mock Accounts ─────────────────────────────────────────────────────────
  const MOCK_MANUFACTURER = {
    id: 'mock_manufacturer',
    name: 'Demo Manufacturer',
    email: 'demo@manufacturer.com',
    role: USER_ROLES.MANUFACTURER,
    company: 'Demo Manufacturing Co.',
    avatar: 'DM',
    isMock: true,
    password: 'demo1234',
    createdAt: '2026-01-01T00:00:00Z',
    lastLogin: new Date().toISOString()
  };

  // ── Seed Users ────────────────────────────────────────────────────────────
  const SEED_USERS = [
    {
      id: 'usr_001',
      name: 'Alex Chen',
      email: 'alex@shenzhen-mfg.com',
      company: 'Shenzhen MFG',
      role: USER_ROLES.MANUFACTURER,
      password: 'demo1234',
      avatar: 'AC',
      createdAt: '2026-01-15T00:00:00Z',
      lastLogin: '2026-04-24T10:30:00Z',
      phone: '+86-123-456-7890',
      location: 'Shenzhen, China',
      bio: 'Leading manufacturer of electronics components',
      manufacturer: {
        certifications: ['ISO 9001', 'RoHS'],
        productCategories: ['Electronics', 'Components'],
        annualRevenue: '50M USD'
      }
    },
    {
      id: 'usr_002',
      name: 'Sarah Williams',
      email: 'sarah@dubai-dist.com',
      company: 'Dubai Dist.',
      role: USER_ROLES.BUYER,
      password: 'demo1234',
      avatar: 'SW',
      createdAt: '2026-01-20T00:00:00Z',
      lastLogin: '2026-04-24T09:15:00Z',
      phone: '+971-50-123-4567',
      location: 'Dubai, UAE',
      bio: 'International trade specialist',
      buyer: {
        preferredCategories: ['Electronics', 'Machinery'],
        tradeVolume: '10M USD',
        riskTolerance: 'medium'
      }
    },
  ];

  // ── Storage Helpers ───────────────────────────────────────────────────────
  const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const getSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  };
  const saveSession = (user) => localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  const clearSession = () => localStorage.removeItem(SESSION_KEY);

  const getGuestSession = () => {
    try { return JSON.parse(localStorage.getItem(GUEST_SESSION_KEY)); }
    catch { return null; }
  };
  const saveGuestSession = (session) => localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  const clearGuestSession = () => localStorage.removeItem(GUEST_SESSION_KEY);

  // ── Utility Functions ─────────────────────────────────────────────────────
  const generateUserId = () => 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const generateAvatar = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Initialization ────────────────────────────────────────────────────────
  const init = () => {
    if (getUsers().length === 0) saveUsers(SEED_USERS);
  };

  // ── Guest Mode ────────────────────────────────────────────────────────────
  const createGuestSession = () => {
    const guestUser = {
      id: 'guest_' + Date.now(),
      name: 'Guest Buyer',
      email: 'guest@demo.com',
      role: USER_ROLES.GUEST,
      company: 'Demo Account',
      avatar: 'GB',
      isGuest: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString()  // 1 hour
    };

    saveGuestSession(guestUser);
    return guestUser;
  };

  const getGuestUser = () => {
    const guest = getGuestSession();
    if (!guest) return null;

    // Check if expired
    if (new Date() > new Date(guest.expiresAt)) {
      clearGuestSession();
      return null;
    }

    return guest;
  };

  const convertGuestToRegistered = (guestUser, registrationData) => {
    clearGuestSession();

    const registeredUser = {
      ...guestUser,
      ...registrationData,
      id: generateUserId(),
      isGuest: false,
      role: registrationData.role,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    const users = getUsers();
    users.push(registeredUser);
    saveUsers(users);

    saveSession(registeredUser);
    return registeredUser;
  };

  // ── Legacy functions (deprecated) ────────────────────────────────────────
  const register = registerUser;
  const login = loginUser;
  const logout = logoutUser;

  // ── Role-Based Access ─────────────────────────────────────────────────────
  const getAppVersion = (user) => {
    if (!user) return 'public';

    switch(user.role) {
      case USER_ROLES.MANUFACTURER:
        return 'manufacturer';
      case USER_ROLES.BUYER:
      case USER_ROLES.GUEST:
        return 'buyer';
      default:
        return 'buyer';
    }
  };

  const checkPermission = (permission, user) => {
    if (!user) return false;
    const perms = PERMISSIONS[user.role] || PERMISSIONS[USER_ROLES.GUEST];
    return perms[permission] || false;
  };

  const shouldShowComponent = (componentId, user) => {
    const componentRules = {
      'nav-agents': checkPermission('canAccessAgents', user),
      'nav-flagged': checkPermission('canResolveFlags', user),
      'create-trade-btn': checkPermission('canCreateTrades', user),
      'escrow-deposit-btn': checkPermission('canDepositEscrow', user),
      'flag-trade-btn': checkPermission('canFlagTrades', user),
      'resolve-flag-btn': checkPermission('canResolveFlags', user),
      'explorer-link': checkPermission('canAccessExplorer', user),
      'profile-link': true  // Profile accessible to all authenticated users
    };

    return componentRules[componentId] !== false;
  };

  // ── Profile Management ────────────────────────────────────────────────────
  const updateUserProfile = async (userId, updates) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) throw new Error('User not found');

    const user = users[userIndex];

    // Prevent updates for guest/mock accounts
    if (user.isGuest || user.isMock) {
      throw new Error('Cannot update demo accounts');
    }

    const allowedFields = ['name', 'phone', 'location', 'bio', 'website'];
    const roleSpecificFields = user.role === USER_ROLES.MANUFACTURER
      ? ['certifications', 'productCategories', 'annualRevenue']
      : ['preferredCategories', 'tradeVolume', 'riskTolerance'];

    allowedFields.push(...roleSpecificFields);

    const validUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (roleSpecificFields.includes(key)) {
          // Nested update
          const roleKey = user.role === USER_ROLES.MANUFACTURER ? 'manufacturer' : 'buyer';
          if (!validUpdates[roleKey]) validUpdates[roleKey] = {};
          validUpdates[roleKey][key] = value;
        } else {
          validUpdates[key] = value;
        }
      }
    }

    // Apply updates
    Object.assign(user, validUpdates);
    user.updatedAt = new Date().toISOString();

    users[userIndex] = user;
    saveUsers(users);

    // Update session if current user
    const currentUser = getSession();
    if (currentUser && currentUser.id === userId) {
      saveSession(user);
    }

    return user;
  };

  const getUserProfile = (userId) => {
    const users = getUsers();
    return users.find(u => u.id === userId) || null;
  };

  // ── Public API ────────────────────────────────────────────────────────────
  init();

  return {
    // Constants
    USER_ROLES,
    PERMISSIONS,

    // Auth methods
    registerUser,
    loginUser,
    logoutUser,
    currentUser,
    requireAuth,

    // Guest methods
    createGuestSession,
    getGuestUser,
    convertGuestToRegistered,

    // Role methods
    getAppVersion,
    checkPermission,
    shouldShowComponent,

    // Profile methods
    updateUserProfile,
    getUserProfile,

    // Mock accounts
    MOCK_MANUFACTURER,

    // Legacy aliases (deprecated)
    register: registerUser,
    login: loginUser,
    logout: logoutUser
  };
})();
