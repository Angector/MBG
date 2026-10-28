// === FILE: src/ui/primitives.js ===
// Project: Mobogram — Phase 10: UI Primitives
// Purpose: Shared UI toolkit — pure DOM components with lifecycle management

// ===== SECTION 0: Imports & Setup =====
import { MOTION, UPLOAD } from '../config.js';
import { t } from '../i18n.js';
import {
  $, createEl, escapeHtml, show, hide, setClass,
  trapFocus, setBodyLock, createLogger, uuid,
} from '../utils.js';
import { applyStagger } from '../motion.js';
import { observeLazyImages } from '../observers.js';

/* @typedef {import('../types.js').ToastOptions} ToastOptions */
/* @typedef {import('../types.js').ModalOptions} ModalOptions */

const log = createLogger('primitives');

// ===== SECTION 1: Image & Placeholder =====

/**
 * Render an image with lazy-loading, blur-up, and checkerboard fallback.
 * This is the ONLY function in the app that creates image elements for content.
 * Supports local fallback: if url is null/empty, tries to load from /assets/images/products/[slug].webp
 * @param {Object} options
 * @param {string|null} options.url - image URL or null
 * @param {string} options.alt - alt text
 * @param {string} [options.className=''] - additional classes
 * @param {'cover'|'contain'} [options.fit='cover']
 * @param {boolean} [options.lazy=true] - use data-src for lazy loading
 * @param {string} [options.aspectRatio=''] - e.g., '1/1', '4/3'
 * @param {string} [options.slug=''] - product slug for local fallback
 * @returns {HTMLElement} .img-frame wrapper
 * @example
 *   const img = renderImage({ url: product.images[0], alt: product.name, aspectRatio: '1/1', slug: product.slug });
 */
export function renderImage(options) {
  const { url, alt = '', className = '', fit = 'cover', lazy = true, aspectRatio = '', slug = '' } = options;
  const frame = createEl('div', { className: 'img-frame' });
  if (aspectRatio) frame.classList.add(`aspect-${aspectRatio.replace('/', 'x')}`);
  if (className) frame.classList.add(...className.split(' '));

  // Determine image source: URL or local fallback
  let imageSrc = url;
  if (!imageSrc && slug) {
    imageSrc = `/assets/images/products/${slug}.webp`;
  }

  if (!imageSrc) {
    // No URL and no slug - show placeholder immediately
    frame.appendChild(createEl('div', { className: 'placeholder' }));
    return frame;
  }

  frame.classList.add('img-blur');
  const blurBg = createEl('div', { className: 'img-blur__blur' });
  blurBg.style.background = 'var(--color-surface-3)';
  frame.appendChild(blurBg);

  const img = createEl('img', {
    attrs: { alt, loading: 'lazy', style: `object-fit:${fit}` },
  });

  if (lazy) {
    img.setAttribute('data-src', imageSrc);
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  } else {
    img.src = imageSrc;
  }

  // Error handler: replace with placeholder
  const handleError = () => {
    img.remove();
    if (frame.querySelector('.img-blur__blur')) frame.querySelector('.img-blur__blur').remove();
    frame.classList.remove('img-blur');
    frame.appendChild(createEl('div', { className: 'placeholder' }));
  };

  img.addEventListener('error', handleError, { once: true });

  frame.appendChild(img);
  
  // Only observe for lazy loading if using data-src
  if (lazy) {
    observeLazyImages(frame, 'img[data-src]');
  }
  
  return frame;
}

// ===== SECTION 2: Skeletons =====

/**
 * Render a skeleton placeholder matching final layout shape.
 * @param {Object} [options]
 * @param {'text'|'title'|'line'|'circle'|'block'|'card'|'image'} [options.variant='line']
 * @param {string} [options.width='100%']
 * @param {string} [options.height='']
 * @param {number} [options.lines=1] - for 'text' variant
 * @returns {HTMLElement}
 * @example renderSkeleton({ variant: 'card' })
 */
export function renderSkeleton(options = {}) {
  const { variant = 'line', width = '100%', height = '', lines = 1 } = options;

  if (variant === 'card') {
    const card = createEl('div', { className: 'skeleton-card' });
    card.appendChild(createEl('div', { className: 'skeleton skeleton--image' }));
    card.appendChild(createEl('div', { className: 'skeleton skeleton--title' }));
    card.appendChild(createEl('div', { className: 'skeleton skeleton--line' }));
    card.appendChild(createEl('div', { className: 'skeleton skeleton--line-short' }));
    return card;
  }

  if (variant === 'text' && lines > 1) {
    const wrap = createEl('div', { className: 'stack stack--tight' });
    for (let i = 0; i < lines; i++) {
      const line = createEl('div', { className: 'skeleton skeleton--text' });
      line.style.width = i === lines - 1 ? '60%' : '100%';
      wrap.appendChild(line);
    }
    return wrap;
  }

  const classMap = {
    text: 'skeleton skeleton--text',
    title: 'skeleton skeleton--title',
    line: 'skeleton skeleton--line',
    circle: 'skeleton skeleton--circle',
    block: 'skeleton skeleton--block',
    image: 'skeleton skeleton--image',
  };
  const el = createEl('div', { className: classMap[variant] || classMap.line });
  if (width) el.style.width = width;
  if (height) el.style.height = height;
  if (variant === 'circle') { el.style.width = '40px'; el.style.height = '40px'; }
  return el;
}

// ===== SECTION 3: Empty & Error States =====

const ICONS = {
  box: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  cart: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
};

/**
 * Render an empty state with icon, title, description, and optional CTA.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.description='']
 * @param {string} [options.icon='box']
 * @param {Object} [options.cta]
 * @param {string} options.cta.label
 * @param {() => void} options.cta.onClick
 * @returns {HTMLElement}
 */
export function renderEmptyState(options) {
  const { title, description = '', icon = 'box', cta } = options;
  const wrap = createEl('div', { className: 'stack' });
  wrap.style.textAlign = 'center';
  wrap.style.paddingBlock = 'var(--space-12)';
  wrap.style.color = 'var(--color-text-muted)';

  const iconEl = createEl('div', { className: 'empty-float' });
  iconEl.innerHTML = ICONS[icon] || ICONS.box;
  iconEl.style.marginInline = 'auto';
  wrap.appendChild(iconEl);

  const titleEl = createEl('h3', { textContent: title });
  titleEl.style.color = 'var(--color-text)';
  wrap.appendChild(titleEl);

  if (description) {
    wrap.appendChild(createEl('p', { textContent: description, className: 'text-muted' }));
  }

  if (cta) {
    const btn = createEl('button', {
      className: 'btn btn--primary',
      textContent: cta.label,
      on: { click: cta.onClick },
    });
    btn.style.marginInline = 'auto';
    btn.style.marginBlockStart = 'var(--space-4)';
    wrap.appendChild(btn);
  }

  return wrap;
}

// ===== SECTION 8: Floating Support =====

/**
 * Initialize floating support button and chat box.
 * Creates a fixed button that opens a mock chat box with quick links.
 * @returns {void}
 * @example initFloatingSupport();
 */
export function initFloatingSupport() {
  // Check if already initialized
  if (document.getElementById('floating-support')) return;

  // Create floating button
  const button = createEl('button', {
    className: 'floating-support-btn',
    attrs: {
      id: 'floating-support-btn',
      'aria-label': t('common.support') || 'پشتیبانی',
    },
  });
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;

  // Create chat box
  const chatBox = createEl('div', {
    className: 'floating-support-chat',
    attrs: { id: 'floating-support-chat' },
  });
  chatBox.hidden = true;

  chatBox.innerHTML = `
    <div class="floating-support-chat__header">
      <h3>${t('common.support') || 'پشتیبانی'}</h3>
      <button class="floating-support-chat__close" aria-label="${t('common.close') || 'بستن'}">×</button>
    </div>
    <div class="floating-support-chat__body">
      <p class="floating-support-chat__message">
        ${t('support.welcome') || 'سلام! چطور می‌تونیم کمکتون کنیم؟'}
      </p>
      <div class="floating-support-chat__links">
        <a href="https://t.me/mobogram" target="_blank" rel="noopener" class="floating-support-chat__link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.022c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.942z"/>
          </svg>
          <span>${t('support.telegram') || 'تلگرام'}</span>
        </a>
        <a href="https://wa.me/989123456789" target="_blank" rel="noopener" class="floating-support-chat__link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>${t('support.whatsapp') || 'واتساپ'}</span>
        </a>
        <a href="mailto:support@mobogram.ir" class="floating-support-chat__link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>${t('support.email') || 'ایمیل'}</span>
        </a>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .floating-support-btn {
      position: fixed;
      inset-inline-end: 24px;
      inset-block-end: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--color-accent);
      color: var(--color-on-accent);
      border: none;
      cursor: pointer;
      box-shadow: var(--shadow-floating);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-sticky);
      transition: transform var(--duration-fast) var(--ease-out-soft);
    }

    .floating-support-btn:hover {
      transform: scale(1.1);
    }

    .floating-support-btn:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .floating-support-chat {
      position: fixed;
      inset-inline-end: 24px;
      inset-block-end: 96px;
      width: 320px;
      max-width: calc(100vw - 48px);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-floating);
      z-index: var(--z-sticky);
      overflow: hidden;
      animation: slideUp var(--duration-normal) var(--ease-out-soft);
    }

    .floating-support-chat[hidden] {
      display: none;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .floating-support-chat__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    .floating-support-chat__header h3 {
      margin: 0;
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }

    .floating-support-chat__close {
      background: transparent;
      border: none;
      color: var(--color-on-accent);
      font-size: var(--text-2xl);
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full);
      transition: background var(--duration-fast) var(--ease-out-soft);
    }

    .floating-support-chat__close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .floating-support-chat__body {
      padding: var(--space-4);
    }

    .floating-support-chat__message {
      margin: 0 0 var(--space-4);
      color: var(--color-text);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
    }

    .floating-support-chat__links {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .floating-support-chat__link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--color-text);
      transition: background var(--duration-fast) var(--ease-out-soft);
    }

    .floating-support-chat__link:hover {
      background: var(--color-surface-3);
    }

    .floating-support-chat__link svg {
      flex-shrink: 0;
      color: var(--color-accent);
    }

    .floating-support-chat__link span {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    @media (max-width: 767px) {
      .floating-support-btn {
        inset-inline-end: 16px;
        inset-block-end: 16px;
        width: 48px;
        height: 48px;
      }

      .floating-support-chat {
        inset-inline-end: 16px;
        inset-block-end: 80px;
        width: calc(100vw - 32px);
      }
    }
  `;
  document.head.appendChild(style);

  // Add to DOM
  const container = createEl('div', { attrs: { id: 'floating-support' } });
  container.appendChild(button);
  container.appendChild(chatBox);
  document.body.appendChild(container);

  // Toggle chat box
  button.addEventListener('click', () => {
    chatBox.hidden = !chatBox.hidden;
  });

  // Close button
  const closeBtn = chatBox.querySelector('.floating-support-chat__close');
  closeBtn.addEventListener('click', () => {
    chatBox.hidden = true;
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      chatBox.hidden = true;
    }
  });
}

/**
 * Render an error state with icon, message, and retry button.
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.message]
 * @param {() => void} [options.onRetry]
 * @returns {HTMLElement}
 */
export function renderErrorState(options = {}) {
  const { title = t('common.error'), message = '', onRetry } = options;
  const wrap = createEl('div', { className: 'stack' });
  wrap.style.textAlign = 'center';
  wrap.style.paddingBlock = 'var(--space-12)';

  const iconEl = createEl('div', { className: 'error-bob' });
  iconEl.innerHTML = ICONS.alert;
  iconEl.style.marginInline = 'auto';
  iconEl.style.color = 'var(--color-danger)';
  wrap.appendChild(iconEl);

  wrap.appendChild(createEl('h3', { textContent: title }));
  if (message) wrap.appendChild(createEl('p', { textContent: message, className: 'text-muted' }));

  if (onRetry) {
    const btn = createEl('button', {
      className: 'btn btn--secondary',
      textContent: t('common.retry'),
      on: { click: onRetry },
    });
    btn.style.marginInline = 'auto';
    btn.style.marginBlockStart = 'var(--space-4)';
    wrap.appendChild(btn);
  }

  return wrap;
}

// ===== SECTION 4: Toast =====

/** @type {HTMLElement|null} */
let toastRegion = null;
const MAX_VISIBLE = 3;
/** @type {Array<{el: HTMLElement, timer: number}>} */
const activeToasts = [];
/** @type {Array<() => void>} */
const pendingQueue = [];

function ensureToastRegion() {
  if (toastRegion && document.body.contains(toastRegion)) return toastRegion;
  toastRegion = createEl('div', { className: 'toast-region', attrs: { 'aria-live': 'polite' } });
  document.body.appendChild(toastRegion);
  return toastRegion;
}

const VARIANT_ICONS = {
  success: '✓', warning: '⚠', error: '✕', info: 'ℹ',
};

/**
 * Show a toast notification. Toasts queue and respect MAX_VISIBLE.
 * @param {ToastOptions} options
 * @returns {() => void} dismiss function
 * @example showToast({ message: 'ذخیره شد', variant: 'success' });
 */
export function showToast(options) {
  const { message, title, variant = 'info', duration = MOTION.toastDefaultDuration, action, dismissible = true } = options;
  const region = ensureToastRegion();

  const dismiss = () => {
    if (!document.body.contains(toastEl)) return;
    toastEl.classList.add('toast--leaving');
    clearTimeout(timer);
    setTimeout(() => {
      toastEl.remove();
      const idx = activeToasts.findIndex(t => t.el === toastEl);
      if (idx >= 0) activeToasts.splice(idx, 1);
      processQueue();
    }, MOTION.duration.fast);
  };

  const toastEl = createEl('div', {
    className: `toast toast--${variant}`,
    attrs: { role: variant === 'error' ? 'alert' : 'status' },
  });

  const icon = createEl('span', { className: 'toast__icon', textContent: VARIANT_ICONS[variant] || 'ℹ' });
  toastEl.appendChild(icon);

  const body = createEl('div', { className: 'toast__body' });
  if (title) body.appendChild(createEl('div', { className: 'toast__title', textContent: title }));
  body.appendChild(createEl('div', { className: 'toast__message', textContent: message }));
  if (action) {
    const actionBtn = createEl('button', {
      className: 'toast__action',
      textContent: action.label,
      on: { click: () => { action.onClick(); dismiss(); } },
    });
    body.appendChild(actionBtn);
  }
  toastEl.appendChild(body);

  if (dismissible) {
    toastEl.appendChild(createEl('button', {
      className: 'toast__close',
      textContent: '×',
      attrs: { 'aria-label': t('common.close') },
      on: { click: dismiss },
    }));
  }

  if (duration > 0) {
    const progress = createEl('div', { className: 'toast__progress' });
    progress.style.animationDuration = `${duration}ms`;
    toastEl.appendChild(progress);
  }

  const timer = duration > 0 ? setTimeout(dismiss, duration) : 0;
  const entry = { el: toastEl, timer };
  activeToasts.push(entry);

  if (activeToasts.length > MAX_VISIBLE) {
    pendingQueue.push(dismiss);
    return dismiss;
  }

  region.appendChild(toastEl);
  return dismiss;
}

function processQueue() {
  while (pendingQueue.length > 0 && activeToasts.length < MAX_VISIBLE) {
    const next = pendingQueue.shift();
    // Queue items are already dismissed references; re-showing requires re-creating.
    // For simplicity, queue just drops excess toasts.
  }
}

/** Dismiss all active toasts immediately. */
export function dismissAllToasts() {
  [...activeToasts].forEach(({ el, timer }) => {
    clearTimeout(timer);
    el.remove();
  });
  activeToasts.length = 0;
  pendingQueue.length = 0;
}

// ===== SECTION 5: Modal & Confirm =====

/**
 * Show a modal dialog with backdrop blur, focus trap, and body scroll lock.
 * @param {ModalOptions} options
 * @returns {{ close: () => void, element: HTMLElement }}
 * @example
 *   const { close } = showModal({ title: 'عنوان', body: 'محتوا' });
 */
export function showModal(options) {
  const { title, body, footer, size = 'md', onClose } = options;
  const titleId = `modal-title-${uuid()}`;
  const previousFocus = document.activeElement;

  const modal = createEl('div', {
    className: `modal modal--${size}`,
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
  });

  const backdrop = createEl('div', { className: 'modal__backdrop' });
  backdrop.addEventListener('click', () => close());

  const dialog = createEl('div', { className: 'modal__dialog' });

  const header = createEl('div', { className: 'modal__header' });
  header.appendChild(createEl('h3', { className: 'modal__title', textContent: title, attrs: { id: titleId } }));
  const closeBtn = createEl('button', {
    className: 'modal__close',
    textContent: '×',
    attrs: { 'aria-label': t('common.close') },
    on: { click: () => close() },
  });
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  const bodyEl = createEl('div', { className: 'modal__body' });
  if (typeof body === 'string') {
    bodyEl.innerHTML = body; // Caller responsible for sanitization
  } else if (body instanceof HTMLElement) {
    bodyEl.appendChild(body);
  }
  dialog.appendChild(bodyEl);

  if (footer) {
    const footerEl = createEl('div', { className: 'modal__footer' });
    footerEl.appendChild(footer instanceof HTMLElement ? footer : createEl('div'));
    dialog.appendChild(footerEl);
  }

  modal.appendChild(backdrop);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  setBodyLock(true);

  const handleEscape = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', handleEscape);
  const releaseFocus = trapFocus(dialog, { onEscape: () => close() });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleEscape);
    releaseFocus();
    setBodyLock(false);
    modal.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    if (onClose) onClose();
  };

  return { close, element: modal };
}

/**
 * Show a confirmation dialog. Resolves true if confirmed.
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} options.message
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {'primary'|'danger'} [options.confirmVariant='primary']
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog(options) {
  const {
    title = t('common.confirm'),
    message,
    confirmLabel = t('common.yes'),
    cancelLabel = t('common.cancel'),
    confirmVariant = 'primary',
  } = options;

  return new Promise((resolve) => {
    const footer = createEl('div', { className: 'row row--end', attrs: { style: 'width:100%;gap:var(--space-3)' } });
    const cancelBtn = createEl('button', { className: 'btn btn--ghost', textContent: cancelLabel });
    const confirmBtn = createEl('button', {
      className: `btn btn--${confirmVariant === 'danger' ? 'danger' : 'primary'}`,
      textContent: confirmLabel,
    });
    footer.append(cancelBtn, confirmBtn);

    const { close } = showModal({
      title,
      body: createEl('p', { textContent: message }),
      footer,
      size: 'sm',
      onClose: () => resolve(false),
    });

    cancelBtn.addEventListener('click', () => { close(); resolve(false); });
    confirmBtn.addEventListener('click', () => { close(); resolve(true); });
  });
}

// ===== SECTION 6: Dropdown & Tooltip =====

/**
 * Initialize a dropdown from existing markup.
 * @param {HTMLElement} root - the .dropdown element
 * @param {Object} [options]
 * @param {'click'|'hover'} [options.trigger='click']
 * @param {() => void} [options.onOpen]
 * @param {() => void} [options.onClose]
 * @returns {{ open: () => void, close: () => void, toggle: () => void, destroy: () => void }}
 */
export function createDropdown(root, options = {}) {
  const { trigger = 'click', onOpen, onClose } = options;
  const triggerEl = root.querySelector('.dropdown__trigger');
  const menu = root.querySelector('.dropdown__menu');
  if (!triggerEl || !menu) return { open() {}, close() {}, toggle() {}, destroy() {} };

  triggerEl.setAttribute('aria-haspopup', 'menu');
  menu.setAttribute('role', 'menu');
  menu.querySelectorAll('.dropdown__item').forEach(item => item.setAttribute('role', 'menuitem'));

  let isOpen = false;
  const items = () => Array.from(menu.querySelectorAll('.dropdown__item:not(:disabled)'));

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    menu.setAttribute('data-open', 'true');
    triggerEl.setAttribute('aria-expanded', 'true');
    if (onOpen) onOpen();
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    menu.setAttribute('data-open', 'false');
    triggerEl.setAttribute('aria-expanded', 'false');
    triggerEl.focus();
    if (onClose) onClose();
  };

  const toggle = () => isOpen ? close() : open();

  const handleOutside = (e) => { if (!root.contains(e.target)) close(); };
  const handleEscape = (e) => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(); } };
  const handleKeydown = (e) => {
    if (!isOpen) return;
    const list = items();
    const idx = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(idx + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(idx - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === 'Escape') { close(); }
  };

  if (trigger === 'click') {
    triggerEl.addEventListener('click', toggle);
  } else {
    root.addEventListener('mouseenter', open);
    root.addEventListener('mouseleave', close);
  }

  document.addEventListener('click', handleOutside);
  document.addEventListener('keydown', handleEscape);
  menu.addEventListener('keydown', handleKeydown);

  const destroy = () => {
    triggerEl.removeEventListener('click', toggle);
    root.removeEventListener('mouseenter', open);
    root.removeEventListener('mouseleave', close);
    document.removeEventListener('click', handleOutside);
    document.removeEventListener('keydown', handleEscape);
    menu.removeEventListener('keydown', handleKeydown);
    close();
  };

  return { open, close, toggle, destroy };
}

/**
 * Initialize a tooltip from existing markup.
 * @param {HTMLElement} root - the .tooltip element
 * @returns {{ destroy: () => void }}
 */
export function createTooltip(root) {
  const bubble = root.querySelector('.tooltip__bubble');
  if (!bubble) return { destroy() {} };

  const showTip = () => bubble.setAttribute('data-open', 'true');
  const hideTip = () => bubble.removeAttribute('data-open');

  root.addEventListener('mouseenter', showTip);
  root.addEventListener('mouseleave', hideTip);
  root.addEventListener('focusin', showTip);
  root.addEventListener('focusout', hideTip);

  let touchOpen = false;
  root.addEventListener('touchstart', () => {
    touchOpen = !touchOpen;
    touchOpen ? showTip() : hideTip();
  }, { passive: true });

  const destroy = () => {
    root.removeEventListener('mouseenter', showTip);
    root.removeEventListener('mouseleave', hideTip);
    root.removeEventListener('focusin', showTip);
    root.removeEventListener('focusout', hideTip);
  };

  return { destroy };
}

// ===== SECTION 7: Rating =====

/**
 * Render a star rating display (read-only). Returns empty fragment if value is 0.
 * @param {Object} options
 * @param {number} options.value - rating value (e.g., 4.5)
 * @param {number} [options.max=5]
 * @param {boolean} [options.showValue=true]
 * @param {boolean} [options.showCount=false]
 * @param {number} [options.count=0]
 * @param {'sm'|'md'|'lg'} [options.size='md']
 * @returns {HTMLElement}
 * @example renderRating({ value: 4.5, showCount: true, count: 128 })
 */
export function renderRating(options) {
  const { value = 0, max = 5, showValue = true, showCount = false, count = 0, size = 'md' } = options;

  if (!value || value <= 0) {
    return createEl('span'); // empty fragment
  }

  const wrap = createEl('div', { className: `rating rating--${size}` });
  const stars = createEl('div', { className: 'rating__stars' });

  for (let i = 1; i <= max; i++) {
    let cls = 'rating__star';
    if (i <= Math.floor(value)) {
      // filled
    } else if (i - 0.5 <= value) {
      cls += ' rating__star--half';
    } else {
      cls += ' rating__star--empty';
    }
    stars.appendChild(createEl('span', { className: cls }));
  }

  wrap.appendChild(stars);

  if (showValue) {
    wrap.appendChild(createEl('span', { className: 'rating__value', textContent: String(value) }));
  }

  if (showCount && count > 0) {
    wrap.appendChild(createEl('span', { className: 'rating__count', textContent: `(${count})` }));
  }

  return wrap;
}
