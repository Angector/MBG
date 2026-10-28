// === FILE: src/state.js ===
// Project: Mobogram — Phase 7: State, Motion, and Observers
// Purpose: Application state management — reactive store, cart store, event bus

// ===== SECTION: Imports =====

import { CART, WISHLIST_CACHE_KEY } from './config.js';
import { localStorageAdapter, deepClone, uuid } from './utils.js';
import { ValidationError } from './errors.js';

/* @typedef {import('./types.js').CartItem} CartItem */
/* @typedef {import('./types.js').Cart} Cart */

// ===== SECTION: Logger =====

/** Internal logger for state module */
const log = (() => {
  const levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
  let level = levels.info;
  return {
    debug: (msg, ...rest) => { if (level <= levels.debug) console.debug('[state]', msg, ...rest); },
    info: (msg, ...rest) => { if (level <= levels.info) console.info('[state]', msg, ...rest); },
    warn: (msg, ...rest) => { if (level <= levels.warn) console.warn('[state]', msg, ...rest); },
    error: (msg, ...rest) => { if (level <= levels.error) console.error('[state]', msg, ...rest); },
  };
})();

// ===== SECTION: Generic reactive store =====

/**
 * @template T
 * @typedef {Object} Store
 * @property {() => T} getState
 * @property {(updater: (prev: T) => T) => void} setState
 * @property {(selector: (state: T) => any, listener: (value: any, prev: any, state: T) => void) => () => void} subscribe
 * @property {() => void} reset
 */

/**
 * Create a store initialized with a state value.
 * setState takes an updater function (prev => next).
 * subscribe takes a selector and listener; listener fires only when selected value changes.
 * @template T
 * @param {T} initialState
 * @param {Object} [options]
 * @param {boolean} [options.freeze=true] deep-freeze state on set
 * @param {(a: any, b: any) => boolean} [options.equality] default: strict equality
 * @returns {Store<T>}
 * @example
 *   const userStore = createStore({ user: null });
 *   userStore.subscribe(s => s.user, user => renderUser(user));
 *   userStore.setState(s => ({ ...s, user: { id: '1' } }));
 */
export function createStore(initialState, options = {}) {
  const { freeze = true, equality = (a, b) => a === b } = options;
  let state = freeze ? deepClone(initialState) : initialState;
  const initialStateClone = deepClone(initialState);
  /** @type {Array<{selector: Function, listener: Function, lastValue: any}>} */
  const subs = [];

  const getState = () => state;

  const setState = (updater) => {
    const next = typeof updater === 'function' ? updater(state) : updater;
    if (freeze) {
      state = deepClone(next);
    } else {
      state = next;
    }
    for (const sub of subs) {
      try {
        const newValue = sub.selector(state);
        if (!equality(newValue, sub.lastValue)) {
          const prev = sub.lastValue;
          sub.lastValue = newValue;
          sub.listener(newValue, prev, state);
        }
      } catch (err) {
        log.error('Subscriber error:', err);
      }
    }
  };

  const subscribe = (selector, listener) => {
    const sub = { selector, listener, lastValue: selector(state) };
    subs.push(sub);
    return () => {
      const idx = subs.indexOf(sub);
      if (idx >= 0) subs.splice(idx, 1);
    };
  };

  const reset = () => {
    state = freeze ? deepClone(initialStateClone) : initialStateClone;
    for (const sub of subs) {
      try {
        const newValue = sub.selector(state);
        if (!equality(newValue, sub.lastValue)) {
          const prev = sub.lastValue;
          sub.lastValue = newValue;
          sub.listener(newValue, prev, state);
        }
      } catch (err) {
        log.error('Subscriber error on reset:', err);
      }
    }
  };

  return { getState, setState, subscribe, reset };
}

// ===== SECTION: Event bus =====

/**
 * @typedef {Object} EventBus
 * @property {(event: string, payload?: any) => void} emit
 * @property {(event: string, handler: (payload: any) => void) => () => void} on
 * @property {(event: string, handler: (payload: any) => void) => void} off
 * @property {(event: string, handler: (payload: any) => void) => () => void} once
 * @property {() => void} clear
 */

/**
 * Create an isolated event bus.
 * @returns {EventBus}
 * @example
 *   const bus = createEventBus();
 *   bus.on('cart:item-added', ({ item }) => console.log(item));
 *   bus.emit('cart:item-added', { item });
 */
export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const handlers = new Map();

  const emit = (event, payload) => {
    const set = handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        log.error(`Event handler error for "${event}":`, err);
      }
    }
  };

  const on = (event, handler) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(handler);
    return () => {
      const set = handlers.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) handlers.delete(event);
      }
    };
  };

  const off = (event, handler) => {
    const set = handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) handlers.delete(event);
    }
  };

  const once = (event, handler) => {
    const wrapped = (payload) => {
      off(event, wrapped);
      handler(payload);
    };
    return on(event, wrapped);
  };

  const clear = () => {
    handlers.clear();
  };

  return { emit, on, off, once, clear };
}

/**
 * Global event bus. Reserved event names:
 *   - 'cart:item-added'        payload: { item: CartItem, sourceElement?: HTMLElement }
 *   - 'cart:item-removed'      payload: { itemId: string }
 *   - 'cart:cleared'           payload: {}
 *   - 'cart:qty-changed'       payload: { itemId: string, qty: number }
 *   - 'auth:signed-in'         payload: { user }
 *   - 'auth:signed-out'        payload: {}
 *   - 'wishlist:added'         payload: { productId: string }
 *   - 'wishlist:removed'       payload: { productId: string }
 *   - 'ui:locale-changed'      payload: { locale: string }
 *   - 'ui:route-changing'      payload: { to: string }
 * @type {EventBus}
 */
export const bus = createEventBus();

// ===== SECTION: Cart persistence =====

/**
 * Read the persisted cart from storage and validate its shape.
 * If shape is invalid or version mismatched, return a fresh empty cart.
 * @returns {Cart}
 */
function readCartFromStorage() {
  try {
    const raw = localStorageAdapter.getJSON(CART.storageKey);
    if (!raw || typeof raw !== 'object') return freshCart();
    if (raw.version !== CART.schemaVersion) return freshCart();
    if (!Array.isArray(raw.items)) return freshCart();
    const validItems = raw.items.filter(
      (item) =>
        item &&
        typeof item.variantId === 'string' &&
        typeof item.productId === 'string' &&
        typeof item.productName === 'string' &&
        typeof item.unitPrice === 'number' &&
        typeof item.qty === 'number'
    );
    return {
      version: CART.schemaVersion,
      items: validItems,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    };
  } catch (err) {
    log.warn('Failed to read cart from storage:', err);
    return freshCart();
  }
}

/**
 * Persist the cart to storage. Never throws.
 * @param {Cart} cart
 */
function writeCartToStorage(cart) {
  try {
    localStorageAdapter.setJSON(CART.storageKey, cart);
  } catch (err) {
    log.warn('Failed to write cart to storage:', err);
  }
}

/**
 * Create a fresh empty cart.
 * @returns {Cart}
 */
function freshCart() {
  return {
    version: CART.schemaVersion,
    items: [],
    updatedAt: Date.now(),
  };
}

// ===== SECTION: Cart store =====

/**
 * @typedef {Object} CartStore
 * @property {() => Cart} getState
 * @property {(selector: (c: Cart) => any, listener: (value: any) => void) => () => void} subscribe
 * @property {() => { items: CartItem[], count: number, subtotal: number }} getDerived
 * @property {(item: Object) => CartItem} add
 * @property {(itemId: string) => boolean} remove
 * @property {(itemId: string, qty: number) => CartItem} setQty
 * @property {(itemId: string) => CartItem} increment
 * @property {(itemId: string) => CartItem} decrement
 * @property {() => void} clear
 * @property {(itemId: string) => CartItem|null} find
 * @property {(variantId: string) => CartItem|null} findByVariant
 * @property {(variantId: string) => number} qtyOfVariant
 * @property {() => boolean} isEmpty
 * @property {(newItems: CartItem[]) => void} replaceAll
 */

/**
 * Create the cart store instance.
 * @returns {CartStore}
 */
function createCartStore() {
  const store = createStore(readCartFromStorage(), { freeze: true });

  const persist = () => {
    writeCartToStorage(store.getState());
  };

  const getState = () => store.getState();

  const subscribe = (selector, listener) => store.subscribe(selector, listener);

  const getDerived = () => {
    const state = store.getState();
    const count = state.items.reduce((n, i) => n + i.qty, 0);
    const subtotal = state.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    return { items: state.items, count, subtotal };
  };

  const add = (item) => {
    if (!item || !item.variantId) {
      throw new ValidationError('Invalid cart item', { meta: { reason: 'missing_variantId' } });
    }
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
      throw new ValidationError('Invalid unit price', { meta: { reason: 'invalid_price' } });
    }
    const qty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1;
    if (qty > CART.maxQtyPerItem) {
      throw new ValidationError(`Quantity exceeds max (${CART.maxQtyPerItem})`, {
        meta: { reason: 'qty_exceeded' },
      });
    }

    const state = store.getState();
    const existingIdx = state.items.findIndex((i) => i.variantId === item.variantId);

    if (existingIdx >= 0) {
      const existing = state.items[existingIdx];
      const newQty = Math.min(existing.qty + qty, CART.maxQtyPerItem);
      store.setState((s) => ({
        ...s,
        items: s.items.map((it, idx) =>
          idx === existingIdx ? { ...it, qty: newQty, updatedAt: Date.now() } : it
        ),
        updatedAt: Date.now(),
      }));
      const updated = store.getState().items[existingIdx];
      persist();
      bus.emit('cart:qty-changed', { itemId: updated.variantId, qty: updated.qty });
      return updated;
    }

    if (state.items.length >= CART.maxItems) {
      throw new ValidationError('Cart is full', { meta: { reason: 'cart_full' } });
    }

    const now = Date.now();
    const newItem = {
      variantId: item.variantId,
      productId: item.productId || '',
      productSlug: item.productSlug || '',
      productName: item.productName || '',
      brandName: item.brandName || '',
      imageUrl: item.imageUrl || null,
      storage: item.storage || '',
      color: item.color || '',
      unitPrice: item.unitPrice,
      qty,
      addedAt: now,
      updatedAt: now,
    };

    store.setState((s) => ({
      ...s,
      items: [...s.items, newItem],
      updatedAt: now,
    }));
    persist();
    bus.emit('cart:item-added', { item: newItem });
    return newItem;
  };

  const remove = (variantId) => {
    const state = store.getState();
    const idx = state.items.findIndex((i) => i.variantId === variantId);
    if (idx < 0) return false;
    store.setState((s) => ({
      ...s,
      items: s.items.filter((i) => i.variantId !== variantId),
      updatedAt: Date.now(),
    }));
    persist();
    bus.emit('cart:item-removed', { itemId: variantId });
    return true;
  };

  const setQty = (variantId, qty) => {
    if (qty <= 0) return remove(variantId) ? null : null;
    if (qty > CART.maxQtyPerItem) {
      throw new ValidationError(`Quantity exceeds max (${CART.maxQtyPerItem})`, {
        meta: { reason: 'qty_exceeded' },
      });
    }
    const state = store.getState();
    const idx = state.items.findIndex((i) => i.variantId === variantId);
    if (idx < 0) return null;
    store.setState((s) => ({
      ...s,
      items: s.items.map((it, i) =>
        i === idx ? { ...it, qty, updatedAt: Date.now() } : it
      ),
      updatedAt: Date.now(),
    }));
    persist();
    const updated = store.getState().items[idx];
    bus.emit('cart:qty-changed', { itemId: variantId, qty });
    return updated;
  };

  const increment = (variantId) => {
    const state = store.getState();
    const item = state.items.find((i) => i.variantId === variantId);
    if (!item) return null;
    return setQty(variantId, Math.min(item.qty + 1, CART.maxQtyPerItem));
  };

  const decrement = (variantId) => {
    const state = store.getState();
    const item = state.items.find((i) => i.variantId === variantId);
    if (!item) return null;
    if (item.qty <= 1) {
      remove(variantId);
      return null;
    }
    return setQty(variantId, item.qty - 1);
  };

  const clear = () => {
    store.setState((s) => ({ ...s, items: [], updatedAt: Date.now() }));
    persist();
    bus.emit('cart:cleared', {});
  };

  const find = (variantId) => {
    return store.getState().items.find((i) => i.variantId === variantId) || null;
  };

  const findByVariant = find;

  const qtyOfVariant = (variantId) => {
    const item = find(variantId);
    return item ? item.qty : 0;
  };

  const isEmpty = () => store.getState().items.length === 0;

  const replaceAll = (newItems) => {
    if (!Array.isArray(newItems)) {
      throw new ValidationError('Invalid items array');
    }
    store.setState((s) => ({ ...s, items: newItems, updatedAt: Date.now() }));
    persist();
  };

  return {
    getState,
    subscribe,
    getDerived,
    add,
    remove,
    setQty,
    increment,
    decrement,
    clear,
    find,
    findByVariant,
    qtyOfVariant,
    isEmpty,
    replaceAll,
  };
}

/**
 * Exposed cart store instance.
 * @type {CartStore}
 * @example
 *   import { cartStore } from './state.js';
 *   cartStore.add({ variantId: 'v1', productId: 'p1', productName: 'iPhone',
 *                   unitPrice: 55000000, qty: 1 });
 */
export const cartStore = createCartStore();

// ===== SECTION: App-level state =====

/**
 * @typedef {Object} AppState
 * @property {import('./types.js').User|null} user
 * @property {import('./types.js').Profile|null} profile
 * @property {number} wishlistCount
 */

/**
 * The app store instance.
 * @type {Store<AppState>}
 */
export const appStore = createStore({
  user: null,
  profile: null,
  wishlistCount: 0,
});

/**
 * Set user and profile.
 * @param {import('./types.js').User|null} user
 * @param {import('./types.js').Profile|null} profile
 */
export function setUser(user, profile) {
  appStore.setState((s) => ({ ...s, user, profile }));
  if (user) {
    bus.emit('auth:signed-in', { user });
  } else {
    bus.emit('auth:signed-out', {});
  }
}

/**
 * Update wishlist count.
 * @param {number} count
 */
export function setWishlistCount(count) {
  appStore.setState((s) => ({ ...s, wishlistCount: count }));
}

/**
 * Reset all app state (used on sign out).
 */
export function resetAppState() {
  appStore.reset();
}

// ===== SECTION: Selectors =====

/**
 * @param {AppState} s
 * @returns {boolean}
 */
export const selectIsLoggedIn = (s) => !!s.user;

/**
 * @param {AppState} s
 * @returns {boolean}
 */
export const selectIsAdmin = (s) => s.profile?.role === 'admin';

/**
 * @param {Cart} c
 * @returns {number}
 */
export const selectCartCount = (c) => c.items.reduce((n, i) => n + i.qty, 0);

/**
 * @param {Cart} c
 * @returns {number}
 */
export const selectCartSubtotal = (c) =>
  c.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
