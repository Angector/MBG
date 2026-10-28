// === FILE: src/ui/shopping.ui.js ===
// Project: Mobogram — Phase 12: Shopping UI Components
// Purpose: DOM components for cart drawer, filter sheet, and checkout steps

// ===== SECTION 0: Imports & Setup =====
import { PAGE_SIZE } from '../config.js';
import { t } from '../i18n.js';
import { createEl, escapeHtml, toPersianDigits, formatPrice } from '../utils.js';
import { setBodyLock, trapFocus } from '../utils.js';
import { renderImage, renderEmptyState, showConfirmDialog } from './primitives.js';
import { renderQuantityStepper } from './product.ui.js';

/* @typedef {import('../types.js').Cart} Cart */
/* @typedef {import('../types.js').CartItem} CartItem */
/* @typedef {import('../types.js').ProductFilter} ProductFilter */
/* @typedef {import('../types.js').Brand} Brand */

// ===== SECTION 1: Cart Line Item =====

/**
 * Render a single cart line item with image, details, price, and quantity controls.
 * @param {CartItem} item - The cart item to render
 * @param {Object} [options]
 * @param {(id: string, newQty: number) => void} [options.onQtyChange] - Called when quantity changes
 * @param {(id: string) => void} [options.onRemove] - Called when item is removed
 * @returns {HTMLElement} The cart line element
 * @example
 *   const line = renderCartLine(cartItem, {
 *     onQtyChange: (id, qty) => cartStore.setQty(id, qty),
 *     onRemove: (id) => cartStore.remove(id)
 *   });
 */
export function renderCartLine(item, options = {}) {
  const { onQtyChange, onRemove } = options;

  const line = createEl('div', { className: 'cart-line' });

  // Image
  const imageWrap = createEl('div', { className: 'cart-line__image' });
  const img = renderImage({
    url: item.imageUrl || null,
    alt: item.productName,
    aspectRatio: '1/1',
  });
  img.style.width = '64px';
  img.style.height = '64px';
  imageWrap.appendChild(img);
  line.appendChild(imageWrap);

  // Details
  const details = createEl('div', { className: 'cart-line__details' });

  const nameLink = createEl('a', {
    className: 'cart-line__name',
    textContent: item.productName,
    attrs: {
      href: `pages/product.html?slug=${encodeURIComponent(item.productSlug)}`,
    },
  });
  details.appendChild(nameLink);

  const variantInfo = createEl('div', {
    className: 'cart-line__variant text-muted',
    textContent: `${item.storage} - ${item.color}`,
  });
  details.appendChild(variantInfo);

  const unitPrice = createEl('div', {
    className: 'cart-line__unit-price text-subtle',
    textContent: formatPrice(item.unitPrice),
  });
  details.appendChild(unitPrice);

  line.appendChild(details);

  // Actions row
  const actions = createEl('div', { className: 'cart-line__actions' });

  // Quantity stepper
  const stepper = renderQuantityStepper({
    value: item.qty,
    min: 1,
    max: 10,
    onChange: (newQty) => {
      if (onQtyChange) {
        if (newQty === 0 && onRemove) {
          onRemove(item.variantId);
        } else {
          onQtyChange(item.variantId, newQty);
        }
      }
    },
  });
  actions.appendChild(stepper);

  // Remove button
  if (onRemove) {
    const removeBtn = createEl('button', {
      className: 'btn btn--ghost btn--sm cart-line__remove',
      textContent: '×',
      attrs: { 'aria-label': t('cart.removeItem') },
      on: {
        click: () => onRemove(item.variantId),
      },
    });
    actions.appendChild(removeBtn);
  }

  line.appendChild(actions);

  return line;
}

// ===== SECTION 2: Cart Drawer =====

/**
 * Render and manage the cart drawer overlay.
 * @param {Cart} cart - Current cart state
 * @param {Object} [options]
 * @param {(id: string, qty: number) => void} [options.onQtyChange]
 * @param {(id: string) => void} [options.onRemove]
 * @param {() => void} [options.onCheckout]
 * @param {() => void} [options.onClose]
 * @returns {{ open: () => void, close: () => void, element: HTMLElement }}
 * @example
 *   const drawer = renderCartDrawer(cartStore.getState(), {
 *     onQtyChange: (id, qty) => cartStore.setQty(id, qty),
 *     onRemove: (id) => cartStore.remove(id),
 *     onCheckout: () => navigate(ROUTES.checkout)
 *   });
 *   drawer.open();
 */
export function renderCartDrawer(cart, options = {}) {
  const { onQtyChange, onRemove, onCheckout, onClose } = options;

  // Create drawer structure
  const drawer = createEl('div', {
    className: 'drawer',
    attrs: { hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('cart.title') },
  });

  const backdrop = createEl('div', { className: 'drawer__backdrop' });
  backdrop.addEventListener('click', () => close());
  drawer.appendChild(backdrop);

  const panel = createEl('div', { className: 'drawer__panel' });

  // Header
  const header = createEl('div', { className: 'drawer__header' });
  header.appendChild(createEl('h2', {
    className: 'drawer__title',
    textContent: t('cart.title'),
  }));

  const closeBtn = createEl('button', {
    className: 'drawer__close',
    textContent: '×',
    attrs: { 'aria-label': t('common.close') },
    on: { click: () => close() },
  });
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Body
  const body = createEl('div', { className: 'drawer__body' });

  const renderBody = () => {
    body.innerHTML = '';

    if (!cart.items || cart.items.length === 0) {
      const empty = renderEmptyState({
        title: t('cart.empty'),
        description: t('cart.emptyHint'),
        icon: 'cart',
        cta: {
          label: t('cart.continueShopping'),
          onClick: () => close(),
        },
      });
      body.appendChild(empty);
      return;
    }

    const list = createEl('div', { className: 'cart-line-list stack' });
    cart.items.forEach((item) => {
      const line = renderCartLine(item, {
        onQtyChange,
        onRemove,
      });
      list.appendChild(line);
    });
    body.appendChild(list);
  };

  renderBody();
  panel.appendChild(body);

  // Footer
  const footer = createEl('div', { className: 'drawer__footer' });

  const renderFooter = () => {
    footer.innerHTML = '';

    if (!cart.items || cart.items.length === 0) {
      const continueBtn = createEl('button', {
        className: 'btn btn--secondary btn--block',
        textContent: t('cart.continueShopping'),
        on: { click: () => close() },
      });
      footer.appendChild(continueBtn);
      return;
    }

    const subtotal = cart.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

    const subtotalRow = createEl('div', { className: 'row row--between' });
    subtotalRow.appendChild(createEl('span', {
      className: 'text-muted',
      textContent: t('cart.subtotal'),
    }));
    subtotalRow.appendChild(createEl('span', {
      className: 'text-bold',
      textContent: formatPrice(subtotal),
    }));
    footer.appendChild(subtotalRow);

    const note = createEl('p', {
      className: 'text-subtle',
      textContent: t('cart.deliveryNote'),
    });
    note.style.fontSize = 'var(--text-xs)';
    note.style.margin = '0';
    footer.appendChild(note);

    const checkoutBtn = createEl('button', {
      className: 'btn btn--primary btn--block',
      textContent: t('cart.checkout'),
      on: { click: () => { close(); if (onCheckout) onCheckout(); } },
    });
    footer.appendChild(checkoutBtn);
  };

  renderFooter();
  panel.appendChild(footer);

  drawer.appendChild(panel);

  // State management
  let isOpen = false;
  let releaseFocus = null;
  let previousFocus = null;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    previousFocus = document.activeElement;

    drawer.removeAttribute('hidden');
    setBodyLock(true);
    releaseFocus = trapFocus(panel, { onEscape: () => close() });
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    if (releaseFocus) {
      releaseFocus();
      releaseFocus = null;
    }
    setBodyLock(false);
    drawer.setAttribute('hidden', '');

    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }

    if (onClose) onClose();
  };

  // Public update method to refresh content
  const update = (newCart) => {
    cart = newCart;
    renderBody();
    renderFooter();
  };

  return { open, close, element: drawer, update };
}

// ===== SECTION 3: Filter Sheet =====

/**
 * Render and manage the mobile filter bottom sheet.
 * @param {Object} config
 * @param {Brand[]} config.brands - Available brands
 * @param {{ minPrice: number, maxPrice: number }} config.priceBounds - Price range
 * @param {ProductFilter} [config.currentFilters] - Current filter state
 * @param {Object} [options]
 * @param {(filters: ProductFilter) => void} [options.onApply] - Called with new filters
 * @param {() => void} [options.onReset] - Called to reset filters
 * @param {() => void} [options.onClose] - Called when sheet closes
 * @returns {{ open: () => void, close: () => void, element: HTMLElement }}
 */
export function renderFilterSheet(config, options = {}) {
  const { brands, priceBounds, currentFilters = {} } = config;
  const { onApply, onReset, onClose } = options;

  // Create sheet structure
  const sheet = createEl('div', {
    className: 'sheet',
    attrs: { hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('common.filter') },
  });

  const backdrop = createEl('div', { className: 'sheet__backdrop' });
  backdrop.addEventListener('click', () => close());
  sheet.appendChild(backdrop);

  const panel = createEl('div', { className: 'sheet__panel' });

  // Handle
  panel.appendChild(createEl('div', { className: 'sheet__handle' }));

  // Header
  const header = createEl('div', { className: 'sheet__header' });
  header.appendChild(createEl('h2', {
    className: 'sheet__title',
    textContent: t('common.filter'),
  }));
  const closeBtn = createEl('button', {
    className: 'btn btn--ghost btn--sm',
    textContent: '×',
    attrs: { 'aria-label': t('common.close') },
    on: { click: () => close() },
  });
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Body
  const body = createEl('div', { className: 'sheet__body' });

  // State
  let selectedBrands = new Set(currentFilters.brandIds || []);
  let minPrice = currentFilters.minPrice ?? priceBounds.min;
  let maxPrice = currentFilters.maxPrice ?? priceBounds.max;
  let inStock = currentFilters.inStock ?? false;

  // Brands section
  const brandsSection = createEl('div', { className: 'form-control' });
  brandsSection.appendChild(createEl('label', {
    className: 'form-label',
    textContent: t('product.brand'),
  }));

  const brandList = createEl('div', { className: 'stack stack--tight' });
  brands.forEach((brand) => {
    const checkLabel = createEl('label', { className: 'check' });
    const checkbox = createEl('input', {
      attrs: {
        type: 'checkbox',
        value: brand.id,
        ...(selectedBrands.has(brand.id) ? { checked: '' } : {}),
      },
    });
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedBrands.add(brand.id);
      } else {
        selectedBrands.delete(brand.id);
      }
    });
    checkLabel.appendChild(checkbox);
    checkLabel.appendChild(createEl('span', { textContent: brand.name }));
    brandList.appendChild(checkLabel);
  });
  brandsSection.appendChild(brandList);
  body.appendChild(brandsSection);

  // Price section
  const priceSection = createEl('div', { className: 'form-control' });
  priceSection.appendChild(createEl('label', {
    className: 'form-label',
    textContent: t('product.price'),
  }));

  const priceRow = createEl('div', { className: 'row' });

  const minInput = createEl('input', {
    className: 'input input--sm',
    attrs: {
      type: 'number',
      placeholder: t('checkout.minPrice') || 'حداقل',
      value: String(minPrice),
      min: String(priceBounds.min),
      max: String(priceBounds.max),
    },
  });
  minInput.addEventListener('input', () => {
    minPrice = Number(minInput.value) || priceBounds.min;
  });
  priceRow.appendChild(minInput);

  const maxInput = createEl('input', {
    className: 'input input--sm',
    attrs: {
      type: 'number',
      placeholder: t('checkout.maxPrice') || 'حداکثر',
      value: String(maxPrice),
      min: String(priceBounds.min),
      max: String(priceBounds.max),
    },
  });
  maxInput.addEventListener('input', () => {
    maxPrice = Number(maxInput.value) || priceBounds.max;
  });
  priceRow.appendChild(maxInput);

  priceSection.appendChild(priceRow);
  body.appendChild(priceSection);

  // Availability section
  const availSection = createEl('div', { className: 'form-control' });
  const availLabel = createEl('label', { className: 'check' });
  const availCheckbox = createEl('input', {
    attrs: {
      type: 'checkbox',
      ...(inStock ? { checked: '' } : {}),
    },
  });
  availCheckbox.addEventListener('change', () => {
    inStock = availCheckbox.checked;
  });
  availLabel.appendChild(availCheckbox);
  availLabel.appendChild(createEl('span', { textContent: t('product.inStock') }));
  availSection.appendChild(availLabel);
  body.appendChild(availSection);

  panel.appendChild(body);

  // Footer
  const footer = createEl('div', { className: 'sheet__footer' });

  const resetBtn = createEl('button', {
    className: 'btn btn--ghost',
    textContent: t('common.reset'),
    on: {
      click: () => {
        selectedBrands.clear();
        minPrice = priceBounds.min;
        maxPrice = priceBounds.max;
        inStock = false;

        // Update UI
        brandList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        minInput.value = String(priceBounds.min);
        maxInput.value = String(priceBounds.max);
        availCheckbox.checked = false;

        if (onReset) onReset();
        close();
      },
    },
  });
  footer.appendChild(resetBtn);

  const applyBtn = createEl('button', {
    className: 'btn btn--primary',
    textContent: t('common.apply'),
    on: {
      click: () => {
        const filters = {
          brandIds: selectedBrands.size > 0 ? [...selectedBrands] : undefined,
          minPrice: minPrice > priceBounds.min ? minPrice : undefined,
          maxPrice: maxPrice < priceBounds.max ? maxPrice : undefined,
          inStock: inStock || undefined,
        };
        if (onApply) onApply(filters);
        close();
      },
    },
  });
  footer.appendChild(applyBtn);

  panel.appendChild(footer);
  sheet.appendChild(panel);

  // State management
  let isOpen = false;
  let releaseFocus = null;
  let previousFocus = null;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    previousFocus = document.activeElement;

    sheet.removeAttribute('hidden');
    setBodyLock(true);
    releaseFocus = trapFocus(panel, { onEscape: () => close() });
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    if (releaseFocus) {
      releaseFocus();
      releaseFocus = null;
    }
    setBodyLock(false);
    sheet.setAttribute('hidden', '');

    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }

    if (onClose) onClose();
  };

  return { open, close, element: sheet };
}

// ===== SECTION 4: Checkout Steps =====

/**
 * Render the checkout progress steps indicator.
 * @param {number} currentStep - 1-based index (1 to 4)
 * @param {Object} [options]
 * @param {string[]} [options.steps] - Step labels (defaults to standard checkout steps)
 * @returns {HTMLElement} The steps container
 * @example
 *   const steps = renderCheckoutSteps(2);
 *   container.appendChild(steps);
 */
export function renderCheckoutSteps(currentStep, options = {}) {
  const {
    steps = [
      t('checkout.contactInfo'),
      t('checkout.shippingAddress'),
      t('checkout.paymentMethod'),
      t('checkout.orderReview'),
    ],
  } = options;

  const container = createEl('div', {
    className: 'checkout-steps',
    attrs: { role: 'navigation', 'aria-label': t('checkout.title') || 'Checkout progress' },
  });

  steps.forEach((label, index) => {
    const stepNum = index + 1;
    const isCompleted = stepNum < currentStep;
    const isActive = stepNum === currentStep;
    const isPending = stepNum > currentStep;

    const step = createEl('div', {
      className: `checkout-step ${isCompleted ? 'checkout-step--completed' : ''} ${isActive ? 'checkout-step--active' : ''} ${isPending ? 'checkout-step--pending' : ''}`,
    });

    // Circle
    const circle = createEl('div', { className: 'checkout-step__circle' });
    if (isCompleted) {
      circle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      circle.setAttribute('aria-label', `${t('common.completed') || 'Completed'}`);
    } else {
      circle.textContent = toPersianDigits(String(stepNum));
    }
    step.appendChild(circle);

    // Label
    const stepLabel = createEl('span', {
      className: 'checkout-step__label',
      textContent: label,
    });
    step.appendChild(stepLabel);

    // Connector line (except last)
    if (index < steps.length - 1) {
      const connector = createEl('div', {
        className: `checkout-step__connector ${isCompleted ? 'checkout-step__connector--completed' : ''}`,
      });
      step.appendChild(connector);
    }

    container.appendChild(step);
  });

  return container;
}
