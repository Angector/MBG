// === FILE: src/observers.js ===
// Project: Mobogram — Phase 7: State, Motion, and Observers
// Purpose: IntersectionObserver wrappers for viewport-critical work

// ===== SECTION: Imports =====

import { MOTION } from './config.js';
import { prefersReducedMotion, throttle } from './utils.js';

// Internal logger
const log = {
  debug: (msg, ...rest) => console.debug('[observers]', msg, ...rest),
  warn: (msg, ...rest) => console.warn('[observers]', msg, ...rest),
};

// ===== SECTION: Observer registry =====

/** @type {Set<IntersectionObserver>} */
const observerRegistry = new Set();

/**
 * Disconnect all tracked observers. Called on beforeunload and exposed for
 * pages that navigate programmatically.
 */
export function disconnectAllObservers() {
  for (const obs of observerRegistry) {
    try {
      obs.disconnect();
    } catch (err) {
      log.warn('Observer disconnect error:', err);
    }
  }
  observerRegistry.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', disconnectAllObservers);
}

// ===== SECTION: Reveal observer =====

/**
 * @typedef {Object} RevealObserverOptions
 * @property {number} [threshold=MOTION.revealThreshold]
 * @property {string} [rootMargin='0px 0px -10% 0px']
 * @property {boolean} [once=true] disconnect after reveal
 * @property {string} [activeClass='is-revealed']
 */

/**
 * Observe all elements matching `selector` under `root` and reveal them as they
 * enter the viewport. Apply stagger delays inline (reimplemented here to avoid
 * circular import with motion.js).
 * @param {ParentNode} [root=document]
 * @param {string} [selector='.reveal']
 * @param {RevealObserverOptions & { staggerStep?: number }} [options]
 * @returns {() => void} teardown
 * @example
 *   const stop = observeReveal(document, '.reveal', { staggerStep: 60 });
 */
export function observeReveal(root = document, selector = '.reveal', options = {}) {
  const {
    threshold = MOTION.revealThreshold,
    rootMargin = '0px 0px -10% 0px',
    once = true,
    activeClass = 'is-revealed',
    staggerStep,
  } = options;

  const elements = Array.from(root.querySelectorAll(selector));
  if (elements.length === 0) return () => {};

  // Inline stagger implementation (avoids circular import with motion.js)
  if (typeof staggerStep === 'number') {
    elements.forEach((el, i) => {
      const delay = Math.min(i * staggerStep, 600);
      el.style.setProperty('--stagger-index', String(i));
      el.style.setProperty('--reveal-delay', `${delay}ms`);
    });
  }

  // Reduced motion: reveal all immediately
  if (prefersReducedMotion()) {
    elements.forEach((el) => el.classList.add(activeClass));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          try {
            entry.target.classList.add(activeClass);
            if (once) observer.unobserve(entry.target);
          } catch (err) {
            log.warn('Reveal error:', err);
          }
        }
      }
    },
    { threshold, rootMargin }
  );

  elements.forEach((el) => observer.observe(el));
  observerRegistry.add(observer);

  return () => {
    observer.disconnect();
    observerRegistry.delete(observer);
  };
}

// ===== SECTION: Lazy image observer =====

/**
 * @typedef {Object} LazyImageOptions
 * @property {string} [rootMargin='200px 0px']
 * @property {number} [threshold=0]
 * @property {string} [loadedClass='is-loaded']
 * @property {string} [dataAttr='data-src']
 * @property {string} [dataSrcsetAttr='data-srcset']
 */

/**
 * Observe images with `data-src` and swap them into real `src` when they enter
 * the viewport. Marks parent .img-blur as .is-loaded when the image loads.
 * On error, dispatches a 'lazy:error' CustomEvent on the img.
 * @param {ParentNode} [root=document]
 * @param {string} [selector='img[data-src]']
 * @param {LazyImageOptions} [options]
 * @returns {() => void}
 */
export function observeLazyImages(root = document, selector = 'img[data-src]', options = {}) {
  const {
    rootMargin = '200px 0px',
    threshold = 0,
    loadedClass = 'is-loaded',
    dataAttr = 'data-src',
    dataSrcsetAttr = 'data-srcset',
  } = options;

  const images = Array.from(root.querySelectorAll(selector));
  if (images.length === 0) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        try {
          const src = img.getAttribute(dataAttr);
          const srcset = img.getAttribute(dataSrcsetAttr);

          if (src) {
            img.src = src;
            img.removeAttribute(dataAttr);
          }
          if (srcset) {
            img.srcset = srcset;
            img.removeAttribute(dataSrcsetAttr);
          }

          const onLoad = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
            const parent = img.parentElement;
            if (parent && parent.classList.contains('img-blur')) {
              parent.classList.add(loadedClass);
            }
          };

          const onError = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
            img.dispatchEvent(
              new CustomEvent('lazy:error', {
                bubbles: true,
                detail: { src, element: img },
              })
            );
          };

          img.addEventListener('load', onLoad, { once: true });
          img.addEventListener('error', onError, { once: true });
        } catch (err) {
          log.warn('Lazy image error:', err);
        }
        observer.unobserve(img);
      }
    },
    { rootMargin, threshold }
  );

  images.forEach((img) => observer.observe(img));
  observerRegistry.add(observer);

  return () => {
    observer.disconnect();
    observerRegistry.delete(observer);
  };
}

// ===== SECTION: Infinite scroll observer =====

/**
 * @typedef {Object} InfiniteScrollOptions
 * @property {string} [rootMargin='400px 0px']
 * @property {number} [threshold=0]
 * @property {boolean} [disabled=false]
 */

/**
 * Observe a sentinel element and call `loadMore` when it enters the viewport.
 * `loadMore` must return a Promise; while pending, the observer does not fire.
 * If the promise resolves to false, the observer disconnects.
 * @param {HTMLElement} sentinel
 * @param {() => Promise<boolean>} loadMore resolves true if more pages remain
 * @param {InfiniteScrollOptions} [options]
 * @returns {{ teardown: () => void, enable: () => void, disable: () => void }}
 * @example
 *   const inf = observeInfiniteScroll(sentinelEl, async () => {
 *     const res = await productsService.list({ page: nextPage });
 *     appendProducts(res.items);
 *     return res.hasMore;
 *   });
 */
export function observeInfiniteScroll(sentinel, loadMore, options = {}) {
  const { rootMargin = '400px 0px', threshold = 0, disabled = false } = options;

  let loading = false;
  let enabled = !disabled;

  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || loading || !enabled) continue;
        loading = true;
        try {
          const hasMore = await loadMore();
          if (!hasMore) {
            observer.disconnect();
            observerRegistry.delete(observer);
          }
        } catch (err) {
          log.warn('Infinite scroll error:', err);
        } finally {
          loading = false;
        }
      }
    },
    { rootMargin, threshold }
  );

  observer.observe(sentinel);
  observerRegistry.add(observer);

  const teardown = () => {
    observer.disconnect();
    observerRegistry.delete(observer);
  };

  const enable = () => {
    enabled = true;
    observer.observe(sentinel);
  };

  const disable = () => {
    enabled = false;
    observer.unobserve(sentinel);
  };

  return { teardown, enable, disable };
}

// ===== SECTION: Sticky observer =====

/**
 * @typedef {Object} StickyObserverOptions
 * @property {string} [rootMargin='-72px 0px 0px 0px']
 * @property {string} [activeClass='is-visible']
 */

/**
 * Add `.is-visible` to `stickyEl` when `triggerEl` is out of view above the
 * viewport. Remove the class when the trigger is back in view.
 * @param {HTMLElement} triggerEl
 * @param {HTMLElement} stickyEl
 * @param {StickyObserverOptions} [options]
 * @returns {() => void}
 * @example
 *   observeStickyVisibility(document.querySelector('.product-hero'), document.querySelector('.sticky-bar'));
 */
export function observeStickyVisibility(triggerEl, stickyEl, options = {}) {
  const { rootMargin = '-72px 0px 0px 0px', activeClass = 'is-visible' } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        try {
          // When trigger is NOT intersecting AND it's above the viewport, show sticky
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            stickyEl.classList.add(activeClass);
          } else {
            stickyEl.classList.remove(activeClass);
          }
        } catch (err) {
          log.warn('Sticky observer error:', err);
        }
      }
    },
    { rootMargin, threshold: 0 }
  );

  observer.observe(triggerEl);
  observerRegistry.add(observer);

  return () => {
    observer.disconnect();
    observerRegistry.delete(observer);
    stickyEl.classList.remove(activeClass);
  };
}

// ===== SECTION: Visibility observer (generic) =====

/**
 * @param {HTMLElement} element
 * @param {(visible: boolean, entry: IntersectionObserverEntry) => void} callback
 * @param {Object} [options]
 * @param {number} [options.threshold=0.1]
 * @param {string} [options.rootMargin='0px']
 * @param {boolean} [options.once=false]
 * @returns {() => void}
 */
export function observeVisibility(element, callback, options = {}) {
  const { threshold = 0.1, rootMargin = '0px', once = false } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        try {
          callback(entry.isIntersecting, entry);
          if (once && entry.isIntersecting) {
            observer.disconnect();
            observerRegistry.delete(observer);
          }
        } catch (err) {
          log.warn('Visibility observer error:', err);
        }
      }
    },
    { threshold, rootMargin }
  );

  observer.observe(element);
  observerRegistry.add(observer);

  return () => {
    observer.disconnect();
    observerRegistry.delete(observer);
  };
}
