// === FILE: src/services/auth.service.js ===
// Project: Mobogram — Phase 9: Services Layer (Part 1 - Auth)
// Purpose: Authentication and user profile management service

// ===== SECTION: Imports & Types =====

import { supabase, TABLES, ROLES, VALIDATION } from '../config.js';
import {
  AuthError,
  ValidationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  InternalError,
  fromSupabaseError,
} from '../errors.js';
import {
  validateEmail,
  validatePassword,
  validateFullName,
  assertValid,
  createLogger,
} from '../utils.js';

/**
 * @typedef {import('../types.js').User} User
 * @typedef {import('../types.js').Profile} Profile
 */

const log = createLogger('auth.service');

// ===== SECTION: Private helpers =====

/**
 * Map raw Supabase user object to our User type.
 * @param {Object} rawUser - Raw user from Supabase auth
 * @returns {User} Mapped user object
 */
function mapUser(rawUser) {
  return {
    id: rawUser.id,
    email: rawUser.email,
    emailConfirmedAt: rawUser.email_confirmed_at || null,
    createdAt: rawUser.created_at,
  };
}

/**
 * Fetch profile by user ID.
 * @param {string} userId - User UUID
 * @returns {Promise<Profile|null>} Profile or null if not found
 * @throws {InternalError} On database errors
 */
async function fetchProfileById(userId) {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw fromSupabaseError(error, { resource: 'Profile', identifier: userId });
  }

  return data;
}

// ===== SECTION: Sign up / sign in / sign out =====

/**
 * Sign up a new user.
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.password - User password
 * @param {string} [params.fullName] - User full name
 * @returns {Promise<{ user: User, needsEmailConfirmation: boolean }>}
 * @throws {ValidationError} If inputs are invalid
 * @throws {ConflictError} If email already registered
 * @throws {AuthError} On auth errors
 * @example
 *   const { user, needsEmailConfirmation } = await signUp({
 *     email: 'user@example.com',
 *     password: 'securePass123',
 *     fullName: 'John Doe'
 *   });
 */
export async function signUp({ email, password, fullName = '' }) {
  // Validate inputs
  const results = [
    validateEmail(email),
    validatePassword(password),
  ];

  if (fullName) {
    results.push(validateFullName(fullName));
  }

  assertValid(results, 'Invalid signup data');

  // Call Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    // Check for "already registered" error
    if (error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('registered')) {
      throw new ConflictError('Email already registered', {
        meta: { field: 'email' },
      });
    }
    throw fromSupabaseError(error);
  }

  if (!data.user) {
    throw new InternalError('Signup succeeded but no user returned');
  }

  return {
    user: mapUser(data.user),
    needsEmailConfirmation: !data.user.email_confirmed_at,
  };
}

/**
 * Sign in with email and password.
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.password - User password
 * @returns {Promise<{ user: User, profile: Profile, session: Object }>}
 * @throws {ValidationError} If inputs are invalid
 * @throws {AuthError} If credentials are invalid or email not confirmed
 * @throws {InternalError} If profile is missing after login
 * @example
 *   const { user, profile, session } = await signIn({
 *     email: 'user@example.com',
 *     password: 'securePass123'
 *   });
 */
export async function signIn({ email, password }) {
  // Validate inputs
  const results = [
    validateEmail(email),
    validatePassword(password),
  ];
  assertValid(results, 'Invalid login data');

  // Call Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw fromSupabaseError(error);
  }

  if (!data.user || !data.session) {
    throw new InternalError('Signin succeeded but missing user or session');
  }

  // Fetch profile
  const profile = await fetchProfileById(data.user.id);

  if (!profile) {
    throw new InternalError('Profile missing after login', {
      meta: { userId: data.user.id },
    });
  }

  return {
    user: mapUser(data.user),
    profile,
    session: data.session,
  };
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 * @throws {AuthError} On auth errors
 * @example
 *   await signOut();
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw fromSupabaseError(error);
  }
}

/**
 * Request a password reset email.
 * @param {string} email - User email
 * @returns {Promise<void>} Always resolves (no enumeration)
 * @throws {ValidationError} If email is invalid
 * @example
 *   await requestPasswordReset('user@example.com');
 */
export async function requestPasswordReset(email) {
  // Validate email
  const result = validateEmail(email);
  if (!result.valid) {
    throw new ValidationError(result.message || 'Invalid email', {
      meta: { field: 'email' },
    });
  }

  // Call Supabase (always succeeds to prevent email enumeration)
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    log.warn('Password reset failed:', error.message);
    // Still resolve to prevent enumeration
  }
}

/**
 * Update the current user's password.
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 * @throws {ValidationError} If password is invalid
 * @throws {AuthError} If not authenticated
 * @example
 *   await updatePassword('newSecurePass456');
 */
export async function updatePassword(newPassword) {
  // Validate password
  const result = validatePassword(newPassword);
  if (!result.valid) {
    throw new ValidationError(result.message || 'Invalid password', {
      meta: { field: 'password' },
    });
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw fromSupabaseError(error);
  }
}

// ===== SECTION: Session =====

/**
 * Get the current session and user profile.
 * @returns {Promise<{ user: User|null, profile: Profile|null, session: Object|null }>}
 * @example
 *   const { user, profile, session } = await getSession();
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw fromSupabaseError(error);
  }

  if (!data.session) {
    return { user: null, profile: null, session: null };
  }

  const user = mapUser(data.session.user);
  const profile = await fetchProfileById(user.id);

  return {
    user,
    profile,
    session: data.session,
  };
}

/**
 * Get the current user (network call, not cached).
 * @returns {Promise<{ user: User|null, profile: Profile|null }>}
 * @example
 *   const { user, profile } = await getUser();
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw fromSupabaseError(error);
  }

  if (!data.user) {
    return { user: null, profile: null };
  }

  const user = mapUser(data.user);
  const profile = await fetchProfileById(user.id);

  return { user, profile };
}

/**
 * Subscribe to auth state changes.
 * @param {(event: string, session: Object|null, user: User|null, profile: Profile|null) => void} handler
 * @returns {() => void} Teardown function
 * @example
 *   const unsubscribe = onAuthStateChange((event, session, user, profile) => {
 *     console.log('Auth event:', event);
 *   });
 *   // Later: unsubscribe();
 */
export function onAuthStateChange(handler) {
  const { data: subscription } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      let user = null;
      let profile = null;

      if (session?.user) {
        user = mapUser(session.user);
        try {
          profile = await fetchProfileById(user.id);
        } catch (err) {
          log.error('Failed to fetch profile on auth change:', err);
        }
      }

      try {
        handler(event, session, user, profile);
      } catch (err) {
        log.error('Auth state handler error:', err);
      }
    }
  );

  return () => {
    subscription?.unsubscribe();
  };
}

// ===== SECTION: Profile =====

/**
 * Get the current user's profile.
 * @returns {Promise<Profile>}
 * @throws {AuthError} If not signed in
 * @throws {NotFoundError} If profile doesn't exist
 * @example
 *   const profile = await getMyProfile();
 */
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError('Not authenticated');
  }

  const profile = await fetchProfileById(user.id);

  if (!profile) {
    throw new NotFoundError('Profile', user.id);
  }

  return profile;
}

/**
 * Update the current user's profile.
 * @param {Object} updates
 * @param {string} [updates.fullName] - New full name
 * @returns {Promise<Profile>} Updated profile
 * @throws {AuthError} If not authenticated
 * @throws {ValidationError} If inputs are invalid
 * @example
 *   const profile = await updateMyProfile({ fullName: 'Jane Doe' });
 */
export async function updateMyProfile({ fullName }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError('Not authenticated');
  }

  // Validate inputs
  if (fullName !== undefined) {
    const result = validateFullName(fullName);
    if (!result.valid) {
      throw new ValidationError(result.message || 'Invalid full name', {
        meta: { field: 'fullName' },
      });
    }
  }

  // Build update object (explicitly strip role to prevent self-promotion)
  const updates = {};
  if (fullName !== undefined) {
    updates.full_name = fullName;
  }

  if (Object.keys(updates).length === 0) {
    // No updates to make
    return await getMyProfile();
  }

  // Update profile
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    throw fromSupabaseError(error, { resource: 'Profile', identifier: user.id });
  }

  return data;
}

// ===== SECTION: Admin =====

/**
 * Check if current user is admin. Optionally redirect if not.
 * @param {Object} [options]
 * @param {boolean} [options.redirectIfNot=true] - Redirect to login if not admin
 * @param {string} [options.redirectTo='/pages/auth.html'] - Redirect URL
 * @returns {Promise<Profile>} Admin profile
 * @throws {AuthError} If not authenticated
 * @throws {PermissionError} If not admin (and redirectIfNot is false)
 * @example
 *   const adminProfile = await requireAdmin();
 *   // or
 *   await requireAdmin({ redirectIfNot: true, redirectTo: '/admin/login.html' });
 */
export async function requireAdmin({
  redirectIfNot = true,
  redirectTo = '/pages/auth.html',
} = {}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (redirectIfNot && typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null; // Will not reach here due to redirect
    }
    throw new AuthError('Not authenticated');
  }

  const profile = await fetchProfileById(user.id);

  if (!profile) {
    throw new NotFoundError('Profile', user.id);
  }

  if (profile.role !== ROLES.admin) {
    if (redirectIfNot && typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null; // Will not reach here due to redirect
    }
    throw new PermissionError('Admin access required');
  }

  return profile;
}

/**
 * List all user profiles (admin only).
 * @param {Object} [options]
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.pageSize=20] - Items per page
 * @param {string} [options.search] - Search term for full_name or email
 * @returns {Promise<{ profiles: Profile[], total: number, page: number, pageSize: number }>}
 * @throws {PermissionError} If not admin
 * @example
 *   const { profiles, total } = await listProfiles({ page: 1, pageSize: 20 });
 */
export async function listProfiles({
  page = 1,
  pageSize = 20,
  search = '',
} = {}) {
  // Verify admin
  await requireAdmin({ redirectIfNot: false });

  // Validate pagination
  if (page < 1) {
    throw new ValidationError('Page must be >= 1', { meta: { field: 'page' } });
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new ValidationError('Page size must be between 1 and 100', {
      meta: { field: 'pageSize' },
    });
  }

  // Build query
  let query = supabase
    .from(TABLES.profiles)
    .select('*', { count: 'exact' });

  // Apply search filter
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,id.eq.${search}`);
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw fromSupabaseError(error, { resource: 'Profiles' });
  }

  return {
    profiles: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Set a user's role (admin only).
 * @param {string} userId - User UUID
 * @param {'customer'|'admin'} role - New role
 * @returns {Promise<Profile>} Updated profile
 * @throws {PermissionError} If not admin
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If user not found
 * @example
 *   const profile = await setUserRole('user-uuid-here', 'admin');
 */
export async function setUserRole(userId, role) {
  // Verify admin
  await requireAdmin({ redirectIfNot: false });

  // Validate inputs
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError('Invalid user ID', { meta: { field: 'userId' } });
  }

  if (role !== ROLES.admin && role !== ROLES.customer) {
    throw new ValidationError('Role must be "admin" or "customer"', {
      meta: { field: 'role' },
    });
  }

  // Update role
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw fromSupabaseError(error, { resource: 'Profile', identifier: userId });
  }

  if (!data) {
    throw new NotFoundError('Profile', userId);
  }

  return data;
}
