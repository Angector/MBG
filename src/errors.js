// === FILE: src/errors.js ===
// Project: Mobogram — Phase 5: JavaScript Substrate
// Purpose: Domain error classes for consistent error handling across services and UI

// ===== SECTION: Base Error =====

/**
 * Base application error class
 * All custom errors extend this class for consistent error handling
 *
 * @example
 *   throw new AppError('Something went wrong', { code: 'CUSTOM_ERROR', status: 500 });
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   * @param {string} [options.code] - Error code
   * @param {Error} [options.cause] - Original error that caused this
   * @param {number} [options.status] - HTTP-like status code
   * @param {Object} [options.meta] - Additional metadata
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? 'APP_ERROR';
    this.status = options.status ?? null;
    this.meta = options.meta ?? {};
    this.cause = options.cause ?? undefined;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON-safe object (excludes cause to prevent circular refs)
   * @returns {{ name: string, message: string, code: string, status: number|null, meta: Object }}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      meta: this.meta,
    };
  }
}

// ===== SECTION: Validation Error =====

/**
 * Validation error for invalid input data
 *
 * @example
 *   throw new ValidationError('Invalid email format', { field: 'email' });
 *
 * @example
 *   const error = new ValidationError('Multiple fields invalid');
 *   error.addField('email', 'Invalid format');
 *   error.addField('password', 'Too short');
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   * @param {string} [options.field] - Field name that failed validation
   * @param {Object} [options.meta] - Additional metadata
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 422,
      ...options,
    });
  }

  /**
   * Add a field-specific validation error
   * @param {string} fieldName - Name of the field
   * @param {string} errorMessage - Validation error message for this field
   * @returns {ValidationError} - Returns this for chaining
   */
  addField(fieldName, errorMessage) {
    if (!this.meta.fields) {
      this.meta.fields = {};
    }
    this.meta.fields[fieldName] = errorMessage;
    return this;
  }
}

// ===== SECTION: Auth Error =====

/**
 * Authentication error for login/credential failures
 *
 * @example
 *   throw new AuthError('Invalid credentials');
 *
 * @example
 *   throw new AuthError('Email not confirmed', { meta: { reason: 'email_not_confirmed' } });
 */
export class AuthError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'AUTH_ERROR',
      status: 401,
      ...options,
    });
  }
}

// ===== SECTION: Permission Error =====

/**
 * Permission error for unauthorized access attempts
 *
 * @example
 *   throw new PermissionError('Admin access required');
 */
export class PermissionError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'PERMISSION_ERROR',
      status: 403,
      ...options,
    });
  }
}

// ===== SECTION: Not Found Error =====

/**
 * Not found error for missing resources
 *
 * @example
 *   throw new NotFoundError('Product', 'abc-123');
 *   // message: "Product not found"
 *   // meta: { resource: 'Product', identifier: 'abc-123' }
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} [resource='resource'] - Type of resource that was not found
   * @param {string|null} [identifier=null] - Identifier of the specific resource
   * @param {Object} [options] - Error options
   */
  constructor(resource = 'resource', identifier = null, options = {}) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;

    super(message, {
      code: 'NOT_FOUND',
      status: 404,
      meta: {
        resource,
        identifier,
        ...options.meta,
      },
      ...options,
    });

    this.resource = resource;
    this.identifier = identifier;
  }
}

// ===== SECTION: Network Error =====

/**
 * Network error for connection/timeout failures
 *
 * @example
 *   throw new NetworkError('Connection timeout', { retryable: true });
 */
export class NetworkError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   * @param {boolean} [options.retryable=true] - Whether the operation can be retried
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'NETWORK_ERROR',
      status: 0,
      meta: {
        retryable: options.retryable ?? true,
        ...options.meta,
      },
      ...options,
    });
  }

  /**
   * Whether this error is retryable
   * @type {boolean}
   */
  get retryable() {
    return this.meta.retryable ?? true;
  }
}

// ===== SECTION: Conflict Error =====

/**
 * Conflict error for unique constraint violations
 *
 * @example
 *   throw new ConflictError('SKU already exists', { meta: { field: 'sku', value: 'ABC-123' } });
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'CONFLICT',
      status: 409,
      ...options,
    });
  }
}

// ===== SECTION: Rate Limit Error =====

/**
 * Rate limit error for too many requests
 *
 * @example
 *   throw new RateLimitError('Too many requests, please try again later');
 */
export class RateLimitError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'RATE_LIMIT',
      status: 429,
      ...options,
    });
  }
}

// ===== SECTION: Internal Error =====

/**
 * Internal error for unexpected failures
 *
 * @example
 *   throw new InternalError('Unexpected database error', { cause: originalError });
 */
export class InternalError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   */
  constructor(message, options = {}) {
    super(message, {
      code: 'INTERNAL_ERROR',
      status: 500,
      ...options,
    });
  }
}

// ===== SECTION: Error Classifier =====

/**
 * Convert a Supabase error to a domain-specific AppError
 * Maps Postgres/Supabase error codes to appropriate error classes
 *
 * @param {Object} error - Raw Supabase error object
 * @param {string} error.message - Error message
 * @param {string} [error.code] - Postgres error code
 * @param {string} [error.details] - Additional details
 * @param {string} [error.hint] - Suggested fix
 * @param {number} [error.status] - HTTP status code
 * @param {Object} [context] - Additional context
 * @param {string} [context.resource] - Resource type (for NotFoundError)
 * @param {string} [context.identifier] - Resource identifier (for NotFoundError)
 * @param {string} [context.field] - Field name (for ValidationError)
 * @returns {AppError} - Domain-specific error
 *
 * @example
 *   try {
 *     const { data, error } = await supabase.from('products').insert(product);
 *     if (error) throw fromSupabaseError(error, { resource: 'Product' });
 *   } catch (err) {
 *     if (isConflictError(err)) {
 *       // Handle duplicate SKU
 *     }
 *   }
 */
export function fromSupabaseError(error, context = {}) {
  const { message, code, details, hint, status } = error;

  // Unique constraint violation (23505)
  if (code === '23505') {
    return new ConflictError(
      details || message || 'Resource already exists',
      { cause: error, meta: { original: { code, message } } }
    );
  }

  // Foreign key violation (23503)
  if (code === '23503') {
    return new ConflictError(
      details || message || 'Referenced resource not found',
      { cause: error, meta: { original: { code, message } } }
    );
  }

  // Check constraint violation (23514)
  if (code === '23514') {
    return new ValidationError(
      details || message || 'Invalid data',
      { cause: error, meta: { field: context.field, original: { code, message } } }
    );
  }

  // Insufficient privilege (42501)
  if (code === '42501') {
    return new PermissionError(
      message || 'Insufficient permissions',
      { cause: error, meta: { original: { code, message } } }
    );
  }

  // JWT expired/invalid (PGRST301)
  if (code === 'PGRST301') {
    return new AuthError(
      message || 'Authentication required',
      { cause: error, meta: { original: { code, message } } }
    );
  }

  // Not found - single() with 0 rows (PGRST116)
  if (code === 'PGRST116') {
    return new NotFoundError(
      context.resource,
      context.identifier,
      { cause: error, meta: { original: { code, message } } }
    );
  }

  // Connection errors (08xxx)
  if (code && code.startsWith('08')) {
    return new NetworkError(
      message || 'Connection failed',
      { cause: error, retryable: true, meta: { original: { code, message } } }
    );
  }

  // Auth-specific messages
  if (message) {
    if (message.includes('Invalid login credentials')) {
      return new AuthError(
        'Invalid email or password',
        { cause: error, meta: { original: { code, message } } }
      );
    }

    if (message.includes('Email not confirmed')) {
      return new AuthError(
        'Please confirm your email address',
        { cause: error, meta: { reason: 'email_not_confirmed', original: { code, message } } }
      );
    }
  }

  // Default: Internal error
  return new InternalError(
    message || 'An unexpected error occurred',
    { cause: error, status, meta: { original: { code, message, details, hint } } }
  );
}

// ===== SECTION: Type Guards =====

/**
 * Check if a value is an AppError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is an AppError
 *
 * @example
 *   if (isAppError(error)) {
 *     // Handle domain error
 *   }
 */
export function isAppError(value) {
  return value instanceof AppError;
}

/**
 * Check if a value is a ValidationError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is a ValidationError
 */
export function isValidationError(value) {
  return value instanceof ValidationError;
}

/**
 * Check if a value is an AuthError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is an AuthError
 */
export function isAuthError(value) {
  return value instanceof AuthError;
}

/**
 * Check if a value is a PermissionError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is a PermissionError
 */
export function isPermissionError(value) {
  return value instanceof PermissionError;
}

/**
 * Check if a value is a NotFoundError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is a NotFoundError
 */
export function isNotFoundError(value) {
  return value instanceof NotFoundError;
}

/**
 * Check if a value is a NetworkError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is a NetworkError
 */
export function isNetworkError(value) {
  return value instanceof NetworkError;
}

/**
 * Check if a value is a ConflictError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is a ConflictError
 */
export function isConflictError(value) {
  return value instanceof ConflictError;
}

/**
 * Check if a value is a RateLimitError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is a RateLimitError
 */
export function isRateLimitError(value) {
  return value instanceof RateLimitError;
}

/**
 * Check if a value is an InternalError instance
 * @param {unknown} value - Value to check
 * @returns {boolean} - True if value is an InternalError
 */
export function isInternalError(value) {
  return value instanceof InternalError;
}

// ===== SECTION: User-Facing Message Resolver =====

/**
 * Get a user-facing message for an error using i18n
 * Maps error types to i18n keys and returns the translated message
 *
 * @param {AppError|Error|unknown} error - Error to get message for
 * @param {function} [t] - i18n translation function (defaults to identity function)
 * @returns {string} - Translated error message
 *
 * @example
 *   const message = messageForError(error, t);
 *   // Returns: "ایمیل یا رمز عبور نامعتبر است"
 *
 * @example
 *   // Without i18n (uses keys as fallback)
 *   const message = messageForError(error);
 *   // Returns: "errors.auth"
 */
export function messageForError(error, t = (key) => key) {
  // Handle AuthError with special case for email not confirmed
  if (isAuthError(error)) {
    if (error.meta?.reason === 'email_not_confirmed') {
      return t('errors.emailNotConfirmed');
    }
    return t('errors.auth');
  }

  // Handle other error types
  if (isValidationError(error)) {
    return t('errors.validation');
  }

  if (isPermissionError(error)) {
    return t('errors.permission');
  }

  if (isNotFoundError(error)) {
    return t('errors.notFound');
  }

  if (isNetworkError(error)) {
    return t('errors.network');
  }

  if (isConflictError(error)) {
    return t('errors.conflict');
  }

  if (isRateLimitError(error)) {
    return t('errors.rateLimit');
  }

  if (isInternalError(error)) {
    return t('errors.internal');
  }

  // Unknown error
  return t('errors.unknown');
}
