// === FILE: src/utils.js ===
// Project: Mobogram — Phase 6: Utilities
// Purpose: Pure helper functions used across the entire app

// ===== SECTION: Imports =====

import { LOG_LEVELS, DEFAULT_LOG_LEVEL, ENV } from './config.js';
import { ValidationError } from './errors.js';

// ===== SECTION: DOM helpers =====

/**
 * Query a single element. Throws if not found when required=true.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @param {boolean} [required=false]
 * @returns {HTMLElement|null}
 * @throws {Error} if required and not found
 * @example const btn = $('.btn-primary');
 */
export function $(selector, root = document, required = false) {
  const el = root.querySelector(selector);
  if (required && !el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/**
 * Query all matching elements as a real array.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {HTMLElement[]}
 */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Create an element with attributes, dataset, style, and children.
 * @param {string} tag
 * @param {Object} [options]
 * @param {Object<string,string>} [options.attrs]
 * @param {Object<string,string>} [options.dataset]
 * @param {Object<string,string>} [options.style]
 * @param {string} [options.className]
 * @param {string} [options.textContent]
 * @param {string} [options.html]
 * @param {(Node|string)[]} [options.children]
 * @param {Object<string,EventListener>} [options.on]
 * @returns {HTMLElement}
 * @example createEl('button', { className: 'btn', textContent: 'ذخیره' })
 */
export function createEl(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.textContent) el.textContent = options.textContent;
  if (options.html) el.innerHTML = options.html;
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) el.setAttribute(k, v);
  }
  if (options.dataset) {
    for (const [k, v] of Object.entries(options.dataset)) el.dataset[k] = v;
  }
  if (options.style) {
    for (const [k, v] of Object.entries(options.style)) el.style[k] = v;
  }
  if (options.on) {
    for (const [evt, fn] of Object.entries(options.on)) el.addEventListener(evt, fn);
  }
  if (options.children) {
    for (const child of options.children) {
      el.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  return el;
}

/**
 * Add/remove/toggle a class list on element(s).
 * @param {HTMLElement|HTMLElement[]} target
 * @param {string} className
 * @param {boolean} [on=true]
 */
export function setClass(target, className, on = true) {
  const els = Array.isArray(target) ? target : [target];
  for (const el of els) {
    if (on) el.classList.add(className);
    else el.classList.remove(className);
  }
}

/** @param {HTMLElement|HTMLElement[]} target */
export function show(target) { setClass(target, 'hidden', false); }

/** @param {HTMLElement|HTMLElement[]} target */
export function hide(target) { setClass(target, 'hidden', true); }

/**
 * @param {HTMLElement|HTMLElement[]} target
 * @param {boolean} [force]
 */
export function toggle(target, force) {
  const els = Array.isArray(target) ? target : [target];
  for (const el of els) el.classList.toggle('hidden', force);
}

/**
 * Delegated event listener.
 * @param {HTMLElement} root
 * @param {string} eventType
 * @param {string} selector
 * @param {(event: Event, matchedEl: HTMLElement) => void} handler
 * @returns {() => void} teardown function
 * @example const off = delegate(list, 'click', '.delete-btn', (e, btn) => {});
 */
export function delegate(root, eventType, selector, handler) {
  const listener = (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(eventType, listener);
  return () => root.removeEventListener(eventType, listener);
}

/**
 * Escape a string for safe insertion via innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Focus trap for modals/drawers.
 * @param {HTMLElement} container
 * @param {Object} [options]
 * @param {boolean} [options.autoFocus=true]
 * @param {() => void} [options.onEscape]
 * @returns {() => void} teardown function
 * @example const release = trapFocus(modalDialog, { onEscape: closeModal });
 */
export function trapFocus(container, options = {}) {
  const { autoFocus = true, onEscape } = options;
  const focusable = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const getFocusable = () => Array.from(container.querySelectorAll(focusable));
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && onEscape) { onEscape(); return; }
    if (e.key !== 'Tab') return;
    const items = getFocusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', handleKeydown);
  if (autoFocus) {
    const items = getFocusable();
    if (items.length > 0) items[0].focus();
  }
  return () => container.removeEventListener('keydown', handleKeydown);
}

/**
 * Lock or unlock body scroll.
 * @param {boolean} lock
 */
export function setBodyLock(lock) {
  document.documentElement.classList.toggle('is-locked', lock);
}

/**
 * Check if element is in viewport.
 * @param {HTMLElement} el
 * @param {number} [threshold=0]
 * @returns {boolean}
 */
export function isInViewport(el, threshold = 0) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight - threshold &&
    rect.bottom > threshold &&
    rect.left < window.innerWidth - threshold &&
    rect.right > threshold
  );
}

/**
 * Smooth scroll to element or Y coordinate.
 * @param {HTMLElement|number} target
 * @param {Object} [options]
 * @param {number} [options.offset=0]
 */
export function scrollTo(target, options = {}) {
  const { offset = 0 } = options;
  const y = typeof target === 'number'
    ? target
    : target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

// ===== SECTION: Timing helpers =====

/**
 * Debounce a function.
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number} [wait=300]
 * @param {Object} [options]
 * @param {boolean} [options.leading=false]
 * @param {boolean} [options.trailing=true]
 * @returns {F & { cancel: () => void, flush: () => void }}
 * @example const search = debounce(doSearch, 300);
 */
export function debounce(fn, wait = 300, options = {}) {
  const { leading = false, trailing = true } = options;
  let timer = null;
  let lastArgs = null;
  const debounced = (...args) => {
    lastArgs = args;
    if (leading && !timer) fn(...args);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (trailing && lastArgs) fn(...lastArgs);
      timer = null;
      lastArgs = null;
    }, wait);
  };
  debounced.cancel = () => { clearTimeout(timer); timer = null; lastArgs = null; };
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      if (trailing && lastArgs) fn(...lastArgs);
      timer = null;
      lastArgs = null;
    }
  };
  return debounced;
}

/**
 * Throttle a function.
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number} [wait=100]
 * @param {Object} [options]
 * @param {boolean} [options.leading=true]
 * @param {boolean} [options.trailing=true]
 * @returns {F & { cancel: () => void }}
 */
export function throttle(fn, wait = 100, options = {}) {
  const { leading = true, trailing = true } = options;
  let timer = null;
  let lastArgs = null;
  let lastCall = 0;
  const throttled = (...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    lastArgs = args;
    if (remaining <= 0) {
      if (leading) fn(...args);
      lastCall = now;
    } else if (trailing && !timer) {
      timer = setTimeout(() => {
        if (trailing && lastArgs) fn(...lastArgs);
        lastCall = Date.now();
        timer = null;
      }, remaining);
    }
  };
  throttled.cancel = () => { clearTimeout(timer); timer = null; };
  return throttled;
}

/**
 * Promise-based sleep.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for the next animation frame.
 * @returns {Promise<number>}
 */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Wait for two animation frames.
 * @returns {Promise<void>}
 */
export async function nextFrame2() {
  await nextFrame();
  await nextFrame();
}

/**
 * Check prefers-reduced-motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Wait for element's transition to end or timeout.
 * @param {HTMLElement} el
 * @param {number} [timeoutMs=600]
 * @returns {Promise<void>}
 */
export function waitForTransition(el, timeoutMs = 600) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    el.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

// ===== SECTION: Formatters (Persian) =====

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert Latin digits to Persian.
 * @param {string|number} value
 * @returns {string}
 */
export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[+d]);
}

/**
 * Convert Persian/Arabic digits to Latin.
 * @param {string} value
 * @returns {string}
 */
export function toLatinDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * Format number with Persian separators.
 * @param {number} value
 * @param {Object} [options]
 * @param {boolean} [options.persianDigits=true]
 * @param {boolean} [options.useSeparator=true]
 * @returns {string}
 * @example formatNumber(55000000) → '۵۵٬۰۰۰٬۰۰۰'
 */
export function formatNumber(value, options = {}) {
  const { persianDigits = true, useSeparator = true } = options;
  let str = Number(value).toLocaleString('en-US', { useGrouping: useSeparator });
  if (useSeparator) str = str.replace(/,/g, '٬');
  return persianDigits ? toPersianDigits(str) : str;
}

/**
 * Format price with currency label.
 * @param {number} value - in toman
 * @param {Object} [options]
 * @param {string} [options.currencyLabel='تومان']
 * @param {boolean} [options.persianDigits=true]
 * @returns {string}
 * @example formatPrice(55000000) → '۵۵٬۰۰۰٬۰۰۰ تومان'
 */
export function formatPrice(value, options = {}) {
  const { currencyLabel = 'تومان', persianDigits = true } = options;
  return `${formatNumber(value, { persianDigits })} ${currencyLabel}`;
}

/**
 * Format discount percentage.
 * @param {number} original
 * @param {number} current
 * @param {Object} [options]
 * @returns {string} e.g. '۱۵٪'
 */
export function formatDiscount(original, current, options = {}) {
  if (!original || !current || current >= original) return '';
  const percent = Math.round(((original - current) / original) * 100);
  const { persianDigits = true } = options;
  const str = `${percent}٪`;
  return persianDigits ? toPersianDigits(str) : str;
}

/**
 * Format ISO date as Persian date.
 * @param {string|Date} value
 * @param {Object} [options]
 * @param {'short'|'long'|'datetime'|'relative'} [options.style='short']
 * @returns {string}
 * @example formatDate('2024-11-05T10:00:00Z', { style: 'long' })
 */
export function formatDate(value, options = {}) {
  const { style = 'short' } = options;
  const date = value instanceof Date ? value : new Date(value);
  if (style === 'relative') return formatRelativeTime(date);
  const opts = { calendar: 'persian' };
  if (style === 'long') {
    opts.year = 'numeric';
    opts.month = 'long';
    opts.day = 'numeric';
  } else if (style === 'datetime') {
    opts.year = 'numeric';
    opts.month = '2-digit';
    opts.day = '2-digit';
    opts.hour = '2-digit';
    opts.minute = '2-digit';
  } else {
    opts.year = 'numeric';
    opts.month = '2-digit';
    opts.day = '2-digit';
  }
  return new Intl.DateTimeFormat('fa-IR', opts).format(date);
}

/**
 * Relative time in Persian.
 * @param {string|Date} value
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
export function formatRelativeTime(value, now = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  if (diffDay < 30) return rtf.format(-diffDay, 'day');
  return formatDate(date);
}

/**
 * Truncate string with ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @param {string} [suffix='…']
 * @returns {string}
 */
export function truncate(str, maxLength, suffix = '…') {
  if (str.length <= maxLength) return str;
  const cut = maxLength - suffix.length;
  const lastSpace = str.lastIndexOf(' ', cut);
  return str.slice(0, lastSpace > cut * 0.6 ? lastSpace : cut) + suffix;
}

/**
 * Format file size in bytes.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
  if (bytes < 1024 * 1024 * 1024) return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  return `${toPersianDigits((bytes / (1024 * 1024 * 1024)).toFixed(1))} گیگابایت`;
}

/**
 * Format Iranian phone number.
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  const cleaned = toLatinDigits(phone).replace(/\D/g, '');
  if (!/^09\d{9}$/.test(cleaned)) return phone;
  return toPersianDigits(`${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`);
}

/**
 * Slugify a string.
 * @param {string} str
 * @returns {string}
 * @example slugify('iPhone 15 Pro Max') → 'iphone-15-pro-max'
 */
export function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ===== SECTION: Validators =====

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string} [message]
 * @property {string} [key]
 */

/** @param {string} value @returns {ValidationResult} */
export function validateEmail(value) {
  if (!value || !value.trim()) return { valid: false, key: 'validation.email.required', message: 'Email is required' };
  if (value.length > 254) return { valid: false, key: 'validation.email.invalid', message: 'Email too long' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { valid: false, key: 'validation.email.invalid', message: 'Invalid email format' };
  return { valid: true };
}

/** @param {string} value @returns {ValidationResult} */
export function validatePassword(value) {
  if (!value) return { valid: false, key: 'validation.password.required', message: 'Password is required' };
  if (value.length < 8) return { valid: false, key: 'validation.password.short', message: 'Password too short' };
  if (value.length > 72) return { valid: false, key: 'validation.password.short', message: 'Password too long' };
  return { valid: true };
}

/** @param {string} value @returns {ValidationResult} */
export function validateFullName(value) {
  if (!value || !value.trim()) return { valid: false, key: 'validation.required', message: 'Name is required' };
  if (value.trim().length < 2) return { valid: false, key: 'validation.fullName.short', message: 'Name too short' };
  if (value.length > 100) return { valid: false, key: 'validation.length.max', message: 'Name too long' };
  return { valid: true };
}

/** @param {string} value @returns {ValidationResult} */
export function validatePhone(value) {
  const cleaned = toLatinDigits(value).replace(/\D/g, '');
  if (!/^09\d{9}$/.test(cleaned)) return { valid: false, key: 'validation.phone.invalid', message: 'Invalid phone' };
  return { valid: true };
}

/** @param {string} value @returns {ValidationResult} */
export function validatePostalCode(value) {
  const cleaned = toLatinDigits(value).replace(/\D/g, '');
  if (!/^\d{10}$/.test(cleaned)) return { valid: false, key: 'validation.postalCode.invalid', message: 'Invalid postal code' };
  return { valid: true };
}

/**
 * @param {string} value
 * @param {string} [fieldName='field']
 * @returns {ValidationResult}
 */
export function validateRequired(value, fieldName = 'field') {
  if (!value || !String(value).trim()) return { valid: false, key: 'validation.required', message: `${fieldName} is required` };
  return { valid: true };
}

/**
 * @param {string} value
 * @param {Object} options
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @returns {ValidationResult}
 */
export function validateLength(value, options = {}) {
  const { min, max } = options;
  const len = String(value || '').length;
  if (min !== undefined && len < min) return { valid: false, key: 'validation.length.min', message: `Too short (min ${min})` };
  if (max !== undefined && len > max) return { valid: false, key: 'validation.length.max', message: `Too long (max ${max})` };
  return { valid: true };
}

/**
 * @param {number} value
 * @param {Object} [options]
 * @param {number} [options.min=1]
 * @param {number} [options.max=99]
 * @returns {ValidationResult}
 */
export function validateQuantity(value, options = {}) {
  const { min = 1, max = 99 } = options;
  const n = Number(value);
  if (!Number.isInteger(n)) return { valid: false, key: 'validation.quantity.min', message: 'Quantity must be integer' };
  if (n < min) return { valid: false, key: 'validation.quantity.min', message: `Min quantity is ${min}` };
  if (n > max) return { valid: false, key: 'validation.quantity.max', message: `Max quantity is ${max}` };
  return { valid: true };
}

/** @param {number} value @returns {ValidationResult} */
export function validatePrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { valid: false, key: 'validation.price.invalid', message: 'Invalid price' };
  if (n > 500_000_000) return { valid: false, key: 'validation.price.invalid', message: 'Price too high' };
  return { valid: true };
}

/** @param {number} value @returns {ValidationResult} */
export function validateStock(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return { valid: false, key: 'validation.stock.invalid', message: 'Invalid stock' };
  if (n > 100_000) return { valid: false, key: 'validation.stock.invalid', message: 'Stock too high' };
  return { valid: true };
}

/**
 * Aggregate validation results; throws if any failed.
 * @param {ValidationResult[]} results
 * @param {string} [contextMessage='Invalid input']
 * @throws {ValidationError}
 */
export function assertValid(results, contextMessage = 'Invalid input') {
  const failures = results.filter((r) => !r.valid);
  if (failures.length === 0) return;
  const err = new ValidationError(contextMessage);
  for (const f of failures) {
    if (f.key) err.addField(f.key, f.message || f.key);
  }
  throw err;
}

// ===== SECTION: Storage wrapper =====

/**
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => string|null} get
 * @property {(key: string) => any|null} getJSON
 * @property {(key: string, value: string) => boolean} set
 * @property {(key: string, value: any) => boolean} setJSON
 * @property {(key: string) => void} remove
 * @property {() => void} clear
 * @property {(key: string) => boolean} has
 */

/**
 * Create a safe storage wrapper.
 * @param {'local'|'session'} type
 * @returns {StorageAdapter}
 */
export function createStorage(type = 'local') {
  const noop = {
    get: () => null,
    getJSON: () => null,
    set: () => false,
    setJSON: () => false,
    remove: () => {},
    clear: () => {},
    has: () => false,
  };
  if (typeof window === 'undefined') return noop;
  const storage = type === 'session' ? window.sessionStorage : window.localStorage;
  try {
    storage.getItem('__test__');
  } catch {
    return noop;
  }
  return {
    get: (key) => { try { return storage.getItem(key); } catch { return null; } },
    getJSON: (key) => {
      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    },
    set: (key, value) => {
      try { storage.setItem(key, value); return true; } catch { return false; }
    },
    setJSON: (key, value) => {
      try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    remove: (key) => { try { storage.removeItem(key); } catch {} },
    clear: () => { try { storage.clear(); } catch {} },
    has: (key) => { try { return storage.getItem(key) !== null; } catch { return false; } },
  };
}

/** Default localStorage adapter */
export const localStorageAdapter = createStorage('local');

/** Default sessionStorage adapter */
export const sessionStorageAdapter = createStorage('session');

// ===== SECTION: Logger =====

/**
 * @typedef {'debug'|'info'|'warn'|'error'|'silent'} LogLevel
 */

/**
 * @typedef {Object} Logger
 * @property {(msg: string, ...rest: any[]) => void} debug
 * @property {(msg: string, ...rest: any[]) => void} info
 * @property {(msg: string, ...rest: any[]) => void} warn
 * @property {(msg: string, ...rest: any[]) => void} error
 * @property {(msg: string, ...rest: any[]) => void} group
 * @property {() => void} groupEnd
 * @property {(level: LogLevel) => void} setLevel
 * @property {() => LogLevel} getLevel
 */

/**
 * Create a scoped logger.
 * @param {string} scope
 * @returns {Logger}
 * @example const log = createLogger('auth'); log.info('login');
 */
export function createLogger(scope) {
  let currentLevel = LOG_LEVELS[DEFAULT_LOG_LEVEL] ?? LOG_LEVELS.info;
  const getLevel = () => {
    if (typeof window !== 'undefined' && window.__MOBOGRAM_LOG_LEVEL__) {
      return LOG_LEVELS[window.__MOBOGRAM_LOG_LEVEL__] ?? currentLevel;
    }
    return currentLevel;
  };
  const prefix = `[${scope}]`;
  return {
    debug: (msg, ...rest) => { if (getLevel() <= LOG_LEVELS.debug) console.debug(prefix, msg, ...rest); },
    info: (msg, ...rest) => { if (getLevel() <= LOG_LEVELS.info) console.info(prefix, msg, ...rest); },
    warn: (msg, ...rest) => { if (getLevel() <= LOG_LEVELS.warn) console.warn(prefix, msg, ...rest); },
    error: (msg, ...rest) => { if (getLevel() <= LOG_LEVELS.error) console.error(prefix, msg, ...rest); },
    group: (msg, ...rest) => { if (getLevel() <= LOG_LEVELS.info) console.group(prefix, msg, ...rest); },
    groupEnd: () => console.groupEnd(),
    setLevel: (level) => { currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info; },
    getLevel: () => Object.keys(LOG_LEVELS).find((k) => LOG_LEVELS[k] === getLevel()) || 'info',
  };
}

/** Default app logger */
export const log = createLogger('app');

// ===== SECTION: Misc helpers =====

/**
 * Generate UUID v4.
 * @returns {string}
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Run function only once.
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {F}
 */
export function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (called) return result;
    called = true;
    result = fn.apply(this, args);
    return result;
  };
}

/**
 * Group array by key function.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} keyFn
 * @returns {Object<string, T[]>}
 */
export function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

/**
 * Chunk array into fixed-size arrays.
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/**
 * Unique values by optional key.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => any} [keyFn]
 * @returns {T[]}
 */
export function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn ? keyFn(item) : item;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sort array by key.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => any} keyFn
 * @param {'asc'|'desc'} [direction='asc']
 * @returns {T[]}
 */
export function sortBy(items, keyFn, direction = 'asc') {
  const mult = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = keyFn(a);
    const vb = keyFn(b);
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  });
}

/**
 * Deep clone JSON-safe structures.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Deep freeze an object.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return value;
}

/**
 * Parse query string from URL.
 * @param {string} [url=location.href]
 * @returns {Object<string,string>}
 */
export function parseQuery(url = location.href) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const params = new URLSearchParams(url.slice(idx + 1));
  const result = {};
  for (const [k, v] of params) result[k] = v;
  return result;
}

/**
 * Build query string from object.
 * @param {Object<string,string|number|boolean>} params
 * @returns {string}
 */
export function buildQuery(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Build URL with query params.
 * @param {string} basePath
 * @param {Object} params
 * @returns {string}
 */
export function withQuery(basePath, params) {
  return basePath + buildQuery(params);
}

/**
 * Navigate programmatically.
 * @param {string} url
 */
export function navigate(url) {
  try { sessionStorage.setItem('mobogram.lastPage', location.href); } catch {}
  location.href = url;
}

/**
 * Copy text to clipboard.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Retry async operation with exponential backoff.
 * @template T
 * @param {() => Promise<T>} operation
 * @param {Object} [options]
 * @param {number} [options.retries=2]
 * @param {number} [options.baseDelay=300]
 * @param {number} [options.maxDelay=3000]
 * @param {(err: any) => boolean} [options.shouldRetry]
 * @returns {Promise<T>}
 */
export async function retry(operation, options = {}) {
  const { retries = 2, baseDelay = 300, maxDelay = 3000, shouldRetry = () => true } = options;
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (i === retries || !shouldRetry(err)) throw err;
      const delay = Math.min(baseDelay * 2 ** i, maxDelay);
      await sleep(delay);
    }
  }
  throw lastError;
}
