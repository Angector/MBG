// === FILE: src/ui/product.ui.js ===
// Project: Mobogram — Phase 11: Product UI Components
// Purpose: DOM components for product cards, grids, galleries, variant selectors, steppers, sticky bar

// ===== SECTION 0: Imports & Setup =====
import { ROUTES } from '../config.js';
import { t } from '../i18n.js';
import {
  createEl, escapeHtml, toPersianDigits, formatPrice,
  formatDiscount, validateQuantity,
} from '../utils.js';
import { applyStagger } from '../motion.js';
import { renderImage, renderRating, renderEmptyState } from './primitives.js';

/* @typedef {import('../types.js').Product} Product */
/* @typedef {import('../types.js').ProductWithVariants} ProductWithVariants */
/* @typedef {import('../types.js').ProductVariant} ProductVariant */

// ===== SECTION 1: Product Card =====

/**
 * Calculate total stock across all active variants.
 * @param {ProductWithVariants} product
 * @returns {number}
 */
function getTotalStock(product) {
  if (!product.variants || product.variants.length === 0) return 0;
  return product.variants.reduce((sum, v) => sum + (v.isActive ? v.stock : 0), 0);
}

/**
 * Get the effective price (discount or base).
 * @param {ProductWithVariants} product
 * @returns {number}
 */
function getEffectivePrice(product) {
  return product.discountPrice ?? product.basePrice;
}

/**
 * Render a single product card.
 * @param {ProductWithVariants} product
 * @param {Object} [options]
 * @param {boolean} [options.isWishlisted=false]
 * @param {boolean} [options.compact=false]
 * @param {(productId: string) => void} [options.onToggleWishlist]
 * @param {() => void} [options.onAddToCart]
 * @returns {HTMLElement}
 * @example
 *   const card = renderProductCard(product, {
 *     isWishlisted: true,
 *     onToggleWishlist: (id) => toggleWish(id)
 *   });
 */
export function renderProductCard(product, options = {}) {
  const { isWishlisted = false, compact = false, onToggleWishlist, onAddToCart } = options;
  const totalStock = getTotalStock(product);
  const isAvailable = totalStock > 0;
  const price = getEffectivePrice(product);
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.basePrice;

  // Card wrapper
  const card = createEl('article', { className: 'product-card' });
  if (compact) card.classList.add('product-card--compact');

  // Image section
  const imageWrap = createEl('div', { className: 'product-card__image' });
  const img = renderImage({
    url: product.images?.[0] || null,
    alt: product.name,
    aspectRatio: '1/1',
  });
  imageWrap.appendChild(img);

  // Wishlist button
  if (onToggleWishlist) {
    const wishBtn = createEl('button', {
      className: 'product-card__wishlist',
      attrs: {
        'aria-label': isWishlisted ? t('wishlist.removed') : t('wishlist.added'),
        'aria-pressed': String(isWishlisted),
      },
    });
    if (isWishlisted) wishBtn.classList.add('is-active');
    wishBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
    wishBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleWishlist(product.id);
    });
    imageWrap.appendChild(wishBtn);
  }

  // Out of stock badge
  if (!isAvailable) {
    const badge = createEl('span', {
      className: 'product-card__badge product-card__badge--out',
      textContent: t('product.outOfStock'),
    });
    imageWrap.appendChild(badge);
  }

  card.appendChild(imageWrap);

  // Body
  const body = createEl('div', { className: 'product-card__body' });

  // Brand
  if (product.brand?.name) {
    body.appendChild(createEl('span', {
      className: 'product-card__brand text-subtle',
      textContent: product.brand.name,
    }));
  }

  // Title
  body.appendChild(createEl('h3', {
    className: 'product-card__title line-clamp-2',
    textContent: product.name,
  }));

  // Price
  const priceWrap = createEl('div', { className: 'product-card__price' });
  if (hasDiscount) {
    priceWrap.appendChild(createEl('span', {
      className: 'product-card__price--original text-subtle',
      textContent: formatPrice(product.basePrice),
    }));
    const discountBadge = createEl('span', {
      className: 'product-card__discount badge badge--danger',
      textContent: formatDiscount(product.basePrice, product.discountPrice),
    });
    priceWrap.appendChild(discountBadge);
  }
  priceWrap.appendChild(createEl('span', {
    className: 'product-card__price--current',
    textContent: formatPrice(price),
  }));
  body.appendChild(priceWrap);

  card.appendChild(body);

  // Footer with add-to-cart or link
  if (onAddToCart) {
    const footer = createEl('div', { className: 'product-card__footer' });
    const addBtn = createEl('button', {
      className: 'btn btn--primary btn--sm btn--block',
      textContent: t('product.addToCart'),
      on: { click: (e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(); } },
    });
    if (!isAvailable) {
      addBtn.disabled = true;
      addBtn.textContent = t('product.outOfStock');
    }
    footer.appendChild(addBtn);
    card.appendChild(footer);
  } else {
    // Wrap entire card in link
    const link = createEl('a', {
      attrs: {
        href: `${ROUTES.product}?slug=${encodeURIComponent(product.slug)}`,
        'aria-label': product.name,
      },
    });
    link.appendChild(card);
    return link;
  }

  return card;
}

// ===== SECTION 2: Product Grid =====

/**
 * Render a grid of product cards.
 * @param {ProductWithVariants[]} products
 * @param {Object} [options]
 * @param {Set<string>} [options.wishlistedIds]
 * @param {(id: string) => void} [options.onToggleWishlist]
 * @param {(product: ProductWithVariants) => void} [options.onAddToCart]
 * @param {boolean} [options.stagger=true]
 * @returns {HTMLElement}
 */
export function renderProductGrid(products, options = {}) {
  const { wishlistedIds = new Set(), onToggleWishlist, onAddToCart, stagger = true } = options;

  if (!products || products.length === 0) {
    return renderEmptyState({
      title: t('empty.products'),
      description: t('empty.productsHint'),
      icon: 'box',
    });
  }

  const grid = createEl('div', { className: 'grid product-grid' });

  products.forEach((product, index) => {
    const card = renderProductCard(product, {
      isWishlisted: wishlistedIds.has(product.id),
      onToggleWishlist: onToggleWishlist ? () => onToggleWishlist(product.id) : undefined,
      onAddToCart: onAddToCart ? () => onAddToCart(product) : undefined,
    });
    if (stagger) card.style.setProperty('--stagger-index', String(index));
    grid.appendChild(card);
  });

  if (stagger) applyStagger(grid.children);

  return grid;
}

// ===== SECTION 3: Gallery =====

/**
 * Render a product image gallery with navigation and swipe.
 * @param {string[]} images - array of URLs (may be empty)
 * @param {Object} [options]
 * @param {string} [options.alt='Product']
 * @returns {HTMLElement}
 * @example
 *   const gallery = renderGallery(product.images, { alt: product.name });
 */
export function renderGallery(images, options = {}) {
  const { alt = 'Product' } = options;
  const gallery = createEl('div', { className: 'gallery' });

  // Empty state
  if (!images || images.length === 0 || images.every(i => !i)) {
    const stage = createEl('div', { className: 'gallery__stage' });
    stage.appendChild(createEl('div', { className: 'placeholder' }));
    gallery.appendChild(stage);
    return gallery;
  }

  const validImages = images.filter(i => i);
  let currentIndex = 0;

  // Stage
  const stage = createEl('div', {
    className: 'gallery__stage',
    attrs: { tabindex: '0', role: 'region', 'aria-label': t('product.gallery') || 'Gallery' },
  });

  // Slides
  const slides = validImages.map((url, i) => {
    const slide = createEl('div', { className: 'gallery__slide' });
    if (i === 0) slide.classList.add('is-active');
    const img = renderImage({ url, alt: `${alt} - ${i + 1}`, lazy: i === 0 });
    slide.appendChild(img);
    return slide;
  });
  slides.forEach(s => stage.appendChild(s));

  // Navigation arrows
  if (validImages.length > 1) {
    const prevBtn = createEl('button', {
      className: 'gallery__nav gallery__nav--prev',
      textContent: '‹',
      attrs: { 'aria-label': t('common.previous') },
    });
    const nextBtn = createEl('button', {
      className: 'gallery__nav gallery__nav--next',
      textContent: '›',
      attrs: { 'aria-label': t('common.next') },
    });

    const goTo = (index) => {
      slides[currentIndex].classList.remove('is-active');
      thumbs[currentIndex].classList.remove('is-active');
      currentIndex = (index + validImages.length) % validImages.length;
      slides[currentIndex].classList.add('is-active');
      thumbs[currentIndex].classList.add('is-active');
      thumbs[currentIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };

    prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
    nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

    stage.appendChild(prevBtn);
    stage.appendChild(nextBtn);

    // Swipe support
    let touchStartX = 0;
    stage.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 50) {
        // RTL: swipe left (negative delta) = next, swipe right = prev
        goTo(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
      }
    }, { passive: true });

    // Keyboard
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex + 1); } // RTL: left = next
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex - 1); } // RTL: right = prev
    });

    // Thumbnails
    const thumbsWrap = createEl('div', { className: 'gallery__thumbs' });
    const thumbs = validImages.map((url, i) => {
      const thumb = createEl('button', {
        className: 'gallery__thumb',
        attrs: { 'aria-label': `${alt} ${i + 1}` },
      });
      if (i === 0) thumb.classList.add('is-active');
      const img = renderImage({ url, alt: '', lazy: true, aspectRatio: '1/1' });
      thumb.appendChild(img);
      thumb.addEventListener('click', () => goTo(i));
      return thumb;
    });
    thumbs.forEach(th => thumbsWrap.appendChild(th));
    gallery.appendChild(stage);
    gallery.appendChild(thumbsWrap);
  } else {
    gallery.appendChild(stage);
  }

  return gallery;
}

// ===== SECTION 4: Variant Selector =====

/**
 * Render a variant selector with storage/color/RAM chips.
 * @param {ProductVariant[]} variants
 * @param {Object} [options]
 * @param {string} [options.initialVariantId]
 * @param {(variant: ProductVariant) => void} [options.onChange]
 * @returns {HTMLElement}
 */
export function renderVariantSelector(variants, options = {}) {
  const { initialVariantId, onChange } = options;
  const container = createEl('div', { className: 'variant-selector stack' });

  if (!variants || variants.length === 0) return container;

  // Extract unique values
  const storages = [...new Set(variants.map(v => v.storage))];
  const colors = [...new Set(variants.map(v => v.color))];
  const rams = [...new Set(variants.filter(v => v.ram).map(v => v.ram))];

  // Internal state
  const state = { storage: storages[0], color: colors[0], ram: rams[0] || null };

  // Find initial variant
  if (initialVariantId) {
    const init = variants.find(v => v.id === initialVariantId);
    if (init) {
      state.storage = init.storage;
      state.color = init.color;
      state.ram = init.ram;
    }
  }

  /**
   * Find variant matching current state.
   * @returns {ProductVariant|null}
   */
  function findVariant() {
    return variants.find(v =>
      v.storage === state.storage &&
      v.color === state.color &&
      (state.ram === null || v.ram === state.ram)
    ) || null;
  }

  /**
   * Check if a combination exists and is in stock.
   * @param {string} storage
   * @param {string} color
   * @param {string|null} ram
   * @returns {{ exists: boolean, inStock: boolean }}
   */
  function checkCombination(storage, color, ram) {
    const v = variants.find(v =>
      v.storage === storage &&
      v.color === color &&
      (ram === null || v.ram === ram)
    );
    return { exists: !!v, inStock: v ? v.stock > 0 : false };
  }

  /**
   * Render chip group for a dimension.
   * @param {string} label
   * @param {string[]} values
   * @param {string} dimension - 'storage' | 'color' | 'ram'
   */
  function renderGroup(label, values, dimension) {
    if (values.length === 0) return;

    const group = createEl('div', { className: 'form-control' });
    group.appendChild(createEl('label', { className: 'form-label', textContent: label }));

    const chipGroup = createEl('div', { className: 'chip-group' });

    values.forEach(value => {
      const chip = createEl('button', {
        className: 'chip',
        textContent: value,
        attrs: {
          'aria-pressed': String(state[dimension] === value),
        },
      });

      if (state[dimension] === value) chip.classList.add('is-active');

      // Check if this combination is available
      const otherDims = { ...state };
      otherDims[dimension] = value;
      const { exists, inStock } = checkCombination(otherDims.storage, otherDims.color, otherDims.ram);

      if (!exists || !inStock) {
        chip.disabled = true;
        chip.setAttribute('aria-disabled', 'true');
      }

      chip.addEventListener('click', () => {
        if (chip.disabled) return;
        state[dimension] = value;

        // Update UI
        chipGroup.querySelectorAll('.chip').forEach(c => {
          c.classList.remove('is-active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('is-active');
        chip.setAttribute('aria-pressed', 'true');

        // Update other groups' disabled states
        updateAllChips();

        // Notify
        const variant = findVariant();
        if (variant && onChange) onChange(variant);
      });

      chipGroup.appendChild(chip);
    });

    group.appendChild(chipGroup);
    container.appendChild(group);
  }

  /**
   * Update all chips' disabled states based on current selection.
   */
  function updateAllChips() {
    container.querySelectorAll('.chip-group').forEach(group => {
      const dimension = group.closest('.form-control').querySelector('.form-label').textContent;
      const dimKey = dimension === t('product.storage') ? 'storage' :
                     dimension === t('product.color') ? 'color' : 'ram';

      group.querySelectorAll('.chip').forEach(chip => {
        const value = chip.textContent;
        const testState = { ...state, [dimKey]: value };
        const { exists, inStock } = checkCombination(testState.storage, testState.color, testState.ram);

        if (!exists || !inStock) {
          chip.disabled = true;
          chip.setAttribute('aria-disabled', 'true');
          chip.classList.remove('is-active');
        } else {
          chip.disabled = false;
          chip.removeAttribute('aria-disabled');
          if (state[dimKey] === value) chip.classList.add('is-active');
        }
      });
    });
  }

  // Render groups
  renderGroup(t('product.storage'), storages, 'storage');
  renderGroup(t('product.color'), colors, 'color');
  if (rams.length > 0) renderGroup(t('product.ram'), rams, 'ram');

  return container;
}

// ===== SECTION 5: Quantity Stepper =====

/**
 * Render a quantity stepper with minus/input/plus.
 * @param {Object} [options]
 * @param {number} [options.value=1]
 * @param {number} [options.min=1]
 * @param {number} [options.max=10]
 * @param {(value: number) => void} [options.onChange]
 * @returns {HTMLElement}
 */
export function renderQuantityStepper(options = {}) {
  const { value: initialValue = 1, min = 1, max = 10, onChange } = options;
  let currentValue = initialValue;

  const wrap = createEl('div', { className: 'quantity-stepper row' });

  const minusBtn = createEl('button', {
    className: 'btn btn--secondary btn--icon btn--sm',
    textContent: '−',
    attrs: { 'aria-label': t('cart.qtyDecrease') },
  });

  const input = createEl('input', {
    className: 'input input--sm',
    attrs: {
      type: 'text',
      value: toPersianDigits(currentValue),
      'aria-label': t('product.quantity'),
      inputmode: 'numeric',
    },
  });
  input.style.width = '60px';
  input.style.textAlign = 'center';

  const plusBtn = createEl('button', {
    className: 'btn btn--secondary btn--icon btn--sm',
    textContent: '+',
    attrs: { 'aria-label': t('cart.qtyIncrease') },
  });

  const updateUI = () => {
    input.value = toPersianDigits(currentValue);
    minusBtn.disabled = currentValue <= min;
    plusBtn.disabled = currentValue >= max;
  };

  const setValue = (val) => {
    const result = validateQuantity(val, { min, max });
    if (result.valid) {
      currentValue = val;
      updateUI();
      if (onChange) onChange(currentValue);
    }
  };

  minusBtn.addEventListener('click', () => {
    if (currentValue > min) setValue(currentValue - 1);
  });

  plusBtn.addEventListener('click', () => {
    if (currentValue < max) setValue(currentValue + 1);
  });

  input.addEventListener('input', () => {
    const latinVal = Number(input.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    if (!isNaN(latinVal)) {
      const clamped = Math.max(min, Math.min(max, latinVal));
      setValue(clamped);
    }
  });

  input.addEventListener('blur', () => {
    updateUI(); // Ensure display is correct
  });

  updateUI();
  wrap.append(minusBtn, input, plusBtn);
  return wrap;
}

// ===== SECTION 6: Sticky Bar =====

/**
 * Render the mobile sticky purchase bar.
 * @param {ProductWithVariants} product
 * @param {Object} [options]
 * @param {number} [options.currentPrice]
 * @param {boolean} [options.isAvailable=true]
 * @param {() => void} [options.onAddToCart]
 * @returns {HTMLElement}
 */
export function renderStickyBar(product, options = {}) {
  const { currentPrice, isAvailable = true, onAddToCart } = options;
  const price = currentPrice ?? getEffectivePrice(product);

  const bar = createEl('div', { className: 'sticky-bar' });

  const info = createEl('div', { className: 'sticky-bar__info' });
  info.appendChild(createEl('span', {
    className: 'sticky-bar__label',
    textContent: t('product.price'),
  }));
  info.appendChild(createEl('span', {
    className: 'sticky-bar__price',
    textContent: formatPrice(price),
  }));

  const actions = createEl('div', { className: 'sticky-bar__actions' });
  const addBtn = createEl('button', {
    className: 'btn btn--primary',
    textContent: t('product.addToCart'),
    on: { click: () => onAddToCart && onAddToCart() },
  });
  if (!isAvailable) {
    addBtn.disabled = true;
    addBtn.textContent = t('product.outOfStock');
  }
  actions.appendChild(addBtn);

  bar.append(info, actions);
  return bar;
}
