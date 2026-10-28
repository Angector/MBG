// === FILE: src/motion.js ===
// Project: Mobogram — Phase 7: State, Motion, and Observers
// Purpose: JS-driven animations consuming keyframes from animations.css

// ===== SECTION: Imports =====

import { MOTION } from './config.js';
import {
  prefersReducedMotion,
  nextFrame,
  waitForTransition,
  sleep,
  toLatinDigits,
  throttle,
} from './utils.js';

// Internal logger (avoids importing utils.createLogger to keep this module light)
const log = {
  debug: (msg, ...rest) => console.debug('[motion]', msg, ...rest),
  warn: (msg, ...rest) => console.warn('[motion]', msg, ...rest),
};

// ===== SECTION: Cleanup registry =====

/** @type {Array<() => void>} */
const cleanups = [];

/**
 * Register a cleanup to run when the page unloads.
 * @param {() => void} fn
 */
export function onCleanup(fn) {
  cleanups.push(fn);
}

/**
 * Run all registered cleanups. Called automatically on beforeunload.
 */
export function cleanupAnimations() {
  while (cleanups.length) {
    try {
      cleanups.pop()();
    } catch (err) {
      log.warn('Cleanup error:', err);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAnimations);
}

// ===== SECTION: Reveal =====

/**
 * Set stagger delays on a group of children.
 * Sets --stagger-index and --reveal-delay on each element.
 * Does not trigger reveal itself — observers.js handles that.
 * @param {HTMLElement[]|NodeList} elements
 * @param {Object} [options]
 * @param {number} [options.step=MOTION.revealStaggerStep] ms between children
 * @param {number} [options.max=600] cap to avoid huge delays
 * @example
 *   applyStagger(document.querySelectorAll('.product-grid > .card'));
 */
export function applyStagger(elements, options = {}) {
  const { step = MOTION.revealStaggerStep, max = 600 } = options;
  const arr = Array.from(elements);
  arr.forEach((el, i) => {
    const delay = Math.min(i * step, max);
    el.style.setProperty('--stagger-index', String(i));
    el.style.setProperty('--reveal-delay', `${delay}ms`);
  });
}

// ===== SECTION: Count-up =====

/**
 * @typedef {Object} CountUpOptions
 * @property {number} [duration=MOTION.countUpDefaultDuration]
 * @property {(n: number) => string} [format] default: Persian number formatting
 * @property {number} [from] starting value
 * @property {string} [easing='easeOutCubic']
 */

/** @type {WeakMap<HTMLElement, number>} */
const countUpRafs = new WeakMap();

/**
 * Easing functions
 */
const easings = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/**
 * Animate the text content of an element from its current value to `target`.
 * Respects reduced motion by jumping to target immediately.
 * @param {HTMLElement} element
 * @param {number} target
 * @param {CountUpOptions} [options]
 * @returns {Promise<void>}
 * @example
 *   await countUp(cartCountElement, 3);
 */
export function countUp(element, target, options = {}) {
  const {
    duration = MOTION.countUpDefaultDuration,
    format = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'),
    from,
    easing = 'easeOutCubic',
  } = options;

  // Cancel any in-flight animation
  const existingRaf = countUpRafs.get(element);
  if (existingRaf) {
    cancelAnimationFrame(existingRaf);
    countUpRafs.delete(element);
  }

  // Respect reduced motion
  if (prefersReducedMotion()) {
    element.textContent = format(target);
    return Promise.resolve();
  }

  // Parse current value
  let startValue = 0;
  if (typeof from === 'number') {
    startValue = from;
  } else {
    const parsed = parseFloat(toLatinDigits(element.textContent || '0').replace(/[^\d.-]/g, ''));
    if (!isNaN(parsed)) startValue = parsed;
  }

  const easeFn = easings[easing] || easings.easeOutCubic;
  const startTime = performance.now();

  return new Promise((resolve) => {
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeFn(progress);
      const current = startValue + (target - startValue) * eased;
      element.textContent = format(current);

      if (progress < 1) {
        countUpRafs.set(element, requestAnimationFrame(tick));
      } else {
        element.textContent = format(target);
        countUpRafs.delete(element);
        resolve();
      }
    };
    countUpRafs.set(element, requestAnimationFrame(tick));
  });
}

// ===== SECTION: Fly-to-cart =====

/**
 * @typedef {Object} FlyOptions
 * @property {HTMLElement} source the button/element the flight starts from
 * @property {HTMLElement} target the cart icon
 * @property {string|null} imageUrl image to show in the flying item
 * @property {string} [alt=''] alt text
 * @property {number} [duration=MOTION.flyToCartDuration]
 */

/**
 * Animate a miniature product image flying from source to target.
 * Respects reduced motion: skips the flight and just pulses the target.
 * @param {FlyOptions} options
 * @returns {Promise<void>}
 * @example
 *   await flyToCart({ source: button, target: cartIcon, imageUrl: product.images[0] });
 */
export async function flyToCart(options) {
  const { source, target, imageUrl, alt = '', duration = MOTION.flyToCartDuration } = options;

  if (!source || !target) {
    log.debug('flyToCart: missing source or target');
    return;
  }

  // Reduced motion: just pulse the target
  if (prefersReducedMotion()) {
    target.classList.add('cart-pulse');
    await sleep(MOTION.duration.normal);
    target.classList.remove('cart-pulse');
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  // Create flying element
  const flyEl = document.createElement('div');
  flyEl.className = 'fly-item';
  flyEl.style.position = 'fixed';
  flyEl.style.top = `${sourceRect.top}px`;
  flyEl.style.left = `${sourceRect.left}px`;
  flyEl.style.width = `${sourceRect.width}px`;
  flyEl.style.height = `${sourceRect.height}px`;
  flyEl.style.zIndex = 'var(--z-toast)';
  flyEl.style.pointerEvents = 'none';

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = alt;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    flyEl.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    flyEl.appendChild(placeholder);
  }

  document.body.appendChild(flyEl);

  // Compute destination
  const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

  // Animate via transform
  flyEl.style.transition = `transform ${duration}ms cubic-bezier(0.65, 0, 0.35, 1), opacity ${duration}ms ease`;

  // Force reflow
  void flyEl.offsetWidth;

  flyEl.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
  flyEl.style.opacity = '0.3';

  // Wait for animation
  await new Promise((resolve) => {
    const onEnd = () => {
      flyEl.removeEventListener('transitionend', onEnd);
      clearTimeout(timeout);
      resolve();
    };
    flyEl.addEventListener('transitionend', onEnd);
    const timeout = setTimeout(onEnd, duration + 100);
  });

  // Remove flying element
  flyEl.remove();

  // Pulse the target
  target.classList.add('cart-pulse');
  await sleep(MOTION.duration.normal);
  target.classList.remove('cart-pulse');
}

// ===== SECTION: Stagger =====

/**
 * Apply stagger delays AND trigger reveal in sequence on a group of elements.
 * @param {HTMLElement[]|NodeList} elements
 * @param {Object} [options]
 * @param {number} [options.step=MOTION.revealStaggerStep]
 * @param {string} [options.revealClass='is-revealed']
 * @returns {Promise<void>}
 */
export async function staggerReveal(elements, options = {}) {
  const { step = MOTION.revealStaggerStep, revealClass = 'is-revealed' } = options;
  const arr = Array.from(elements);

  applyStagger(arr, { step });

  if (prefersReducedMotion()) {
    arr.forEach((el) => el.classList.add(revealClass));
    return;
  }

  // Trigger all at once; CSS transition-delay handles staggering
  arr.forEach((el) => el.classList.add(revealClass));

  // Wait for longest transition
  const maxDelay = Math.min((arr.length - 1) * step, 600);
  await sleep(maxDelay + MOTION.duration.slow);
}

// ===== SECTION: Page transitions =====

/**
 * Fade out the given element, then call onComplete.
 * Respects reduced motion (calls onComplete immediately).
 * @param {HTMLElement} element
 * @param {() => void} onComplete
 * @param {Object} [options]
 * @param {number} [options.timeout=400]
 * @returns {Promise<void>}
 */
export async function fadeOutThen(element, onComplete, options = {}) {
  const { timeout = 400 } = options;

  if (prefersReducedMotion()) {
    onComplete();
    return;
  }

  element.classList.add('page-exit');
  await waitForTransition(element, timeout);
  onComplete();
}

// ===== SECTION: Shake and heart-pop =====

/**
 * Play a shake animation on an element. Respects reduced motion (does nothing).
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
export async function shake(element) {
  if (prefersReducedMotion()) return;
  element.classList.add('shake');
  await waitForTransition(element, MOTION.duration.slow + 100);
  element.classList.remove('shake');
}

/**
 * Play a heart-pop animation. Respects reduced motion (no-op).
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
export async function heartPop(element) {
  if (prefersReducedMotion()) return;
  element.classList.add('heart-pop');
  await waitForTransition(element, MOTION.duration.normal + 100);
  element.classList.remove('heart-pop');
}

// ===== SECTION: Scroll helpers =====

/**
 * Smoothly scroll to a Y coordinate or element, respecting reduced motion.
 * @param {HTMLElement|number} target
 * @param {Object} [options]
 * @param {number} [options.offset=72] header height
 * @param {'start'|'center'|'end'} [options.align='start']
 */
export function scrollToSmooth(target, options = {}) {
  const { offset = 72, align = 'start' } = options;
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';

  let top = 0;
  if (typeof target === 'number') {
    top = target;
  } else if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (align === 'center') {
      top = window.scrollY + rect.top - viewportHeight / 2 + rect.height / 2;
    } else if (align === 'end') {
      top = window.scrollY + rect.bottom - viewportHeight;
    } else {
      top = window.scrollY + rect.top - offset;
    }
  }

  window.scrollTo({ top, behavior });
}

/**
 * Toggle the "scrolled" state on the site header based on scroll position.
 * @param {HTMLElement} headerEl
 * @param {Object} [options]
 * @param {number} [options.threshold=8] px scrolled before activating
 * @returns {() => void} teardown
 * @example
 *   const teardown = attachHeaderScrollState(document.querySelector('.site-header'));
 */
export function attachHeaderScrollState(headerEl, options = {}) {
  const { threshold = 8 } = options;

  const update = throttle(() => {
    if (window.scrollY > threshold) {
      headerEl.classList.add('is-scrolled');
    } else {
      headerEl.classList.remove('is-scrolled');
    }
  }, MOTION.throttleScroll);

  window.addEventListener('scroll', update, { passive: true });
  update();

  return () => window.removeEventListener('scroll', update);
}

/**
 * Show/hide a back-to-top button based on scroll position.
 * @param {HTMLElement} buttonEl
 * @param {Object} [options]
 * @param {number} [options.showAfter=400] px
 * @returns {() => void} teardown
 */
export function attachBackToTopButton(buttonEl, options = {}) {
  const { showAfter = 400 } = options;

  const update = throttle(() => {
    if (window.scrollY > showAfter) {
      buttonEl.classList.add('is-visible');
    } else {
      buttonEl.classList.remove('is-visible');
    }
  }, MOTION.throttleScroll);

  window.addEventListener('scroll', update, { passive: true });
  update();

  return () => window.removeEventListener('scroll', update);
}
