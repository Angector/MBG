// === FILE: src/pages/product.js ===
// Project: Mobogram — Phase 15: Product Detail Page
// Purpose: Product detail page logic - gallery, variants, add to cart, related products

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, parseQuery, formatPrice, toPersianDigits } from '../utils.js';
import { cartStore, appStore, setWishlistCount } from '../state.js';
import { getSession } from '../services/auth.service.js';
import { getProductBySlug, getRelatedProducts } from '../services/catalog.service.js';
import { addToWishlist, removeFromWishlist, getWishlistProductIds } from '../services/shopping.service.js';
import { renderImage, renderSkeleton, renderErrorState, showToast } from '../ui/primitives.js';
import { renderGallery, renderVariantSelector, renderQuantityStepper, renderStickyBar, renderProductGrid } from '../ui/product.ui.js';
import { flyToCart } from '../motion.js';
import { observeStickyVisibility } from '../observers.js';

// ===== SECTION 1: State & Init =====

/** @type {import('../types.js').ProductWithVariants|null} */
let product = null;

/** @type {import('../types.js').ProductVariant|null} */
let selectedVariant = null;

/** @type {number} */
let quantity = 1;

/** @type {boolean} */
let isWishlisted = false;

/** @type {Set<string>} */
let wishlistedIds = new Set();

/**
 * Initialize product detail page.
 * Parses slug from URL, fetches product, renders page.
 */
async function init() {
  try {
    applyTranslations();
    initHeader();

    // Load session for auth state
    try {
      await getSession();
      wishlistedIds = await getWishlistProductIds();
      setWishlistCount(wishlistedIds.size);
    } catch (err) {
      // Not logged in - continue
    }

    // Parse slug from URL
    const query = parseQuery();
    const slug = query.slug;

    if (!slug) {
      showError(t('errors.productNotFound') || 'محصول یافت نشد');
      return;
    }

    // Fetch product
    try {
      product = await getProductBySlug(slug);
    } catch (err) {
      showError(err.message, () => init());
      return;
    }

    if (!product) {
      showError(t('errors.productNotFound') || 'محصول یافت نشد');
      return;
    }

    // Check if wishlisted
    isWishlisted = wishlistedIds.has(product.id);

    // Set initial variant (first active variant with stock)
    selectedVariant = product.variants?.find(v => v.isActive && v.stock > 0) || product.variants?.[0] || null;

    // Render page
    renderProduct();
  } catch (err) {
    console.error('Failed to initialize product page:', err);
    showError(err.message);
  }
}

/**
 * Show error state with optional retry.
 * @param {string} message
 * @param {() => void} [onRetry]
 */
function showError(message, onRetry) {
  $('#product-loading').hidden = true;
  $('#product-content').hidden = true;

  const errorContainer = $('#product-error');
  errorContainer.innerHTML = '';
  errorContainer.appendChild(renderErrorState({
    title: t('errors.loadProduct') || 'خطا در بارگذاری محصول',
    message,
    onRetry,
  }));
  errorContainer.hidden = false;
}

/**
 * Render the product page after successful fetch.
 */
function renderProduct() {
  $('#product-loading').hidden = true;
  $('#product-error').hidden = true;
  $('#product-content').hidden = false;

  // Update breadcrumb
  $('#breadcrumb-product').textContent = product.name;

  // Render gallery
  renderGallerySection();

  // Render info block
  renderInfoBlock();

  // Render tabs
  renderTabs();

  // Load related products
  loadRelated();

  // Setup sticky bar
  setupStickyBar();
}

// ===== SECTION 2: Render Info Block =====

/**
 * Render the gallery section.
 */
function renderGallerySection() {
  const container = $('#gallery-container');
  container.innerHTML = '';

  const gallery = renderGallery(product.images || [], { alt: product.name });
  container.appendChild(gallery);
}

/**
 * Render the product info block with title, brand, price, variant selector, quantity, and actions.
 */
function renderInfoBlock() {
  const container = $('#info-container');
  container.innerHTML = '';

  // Title
  const title = createEl('h1', { className: 'product-info__title', textContent: product.name });
  container.appendChild(title);

  // Brand link
  if (product.brand) {
    const brandLink = createEl('a', {
      className: 'product-info__brand',
      textContent: product.brand.name,
      attrs: { href: `products.html?brand=${encodeURIComponent(product.brand.slug)}` },
    });
    container.appendChild(brandLink);
  }

  // Price display
  const priceDisplay = createEl('div', { className: 'product-info__price' });
  updatePriceDisplay(priceDisplay);
  container.appendChild(priceDisplay);

  // Stock status
  const stockDisplay = createEl('div', { className: 'product-info__stock' });
  updateStockDisplay(stockDisplay);
  container.appendChild(stockDisplay);

  // Variant selector
  if (product.variants && product.variants.length > 0) {
    const variantLabel = createEl('div', { className: 'product-info__label', textContent: t('product.selectVariant') || 'انتخاب مدل' });
    container.appendChild(variantLabel);

    const variantSelector = renderVariantSelector(product.variants, {
      initialVariantId: selectedVariant?.id,
      onChange: (variant) => {
        selectedVariant = variant;
        quantity = 1;
        updatePriceDisplay(priceDisplay);
        updateStockDisplay(stockDisplay);
      },
    });
    container.appendChild(variantSelector);
  }

  // Quantity stepper
  const quantityLabel = createEl('div', { className: 'product-info__label', textContent: t('product.quantity') || 'تعداد' });
  container.appendChild(quantityLabel);

  const maxQty = selectedVariant?.stock || 10;
  const quantityStepper = renderQuantityStepper({
    value: quantity,
    min: 1,
    max: Math.min(maxQty, 10),
    onChange: (value) => {
      quantity = value;
    },
  });
  container.appendChild(quantityStepper);

  // Action buttons
  const actions = createEl('div', { className: 'product-info__actions' });

  // Add to cart button
  const addToCartBtn = createEl('button', {
    className: 'btn btn--primary btn--lg product-info__add-btn',
    textContent: t('product.addToCart') || 'افزودن به سبد خرید',
    attrs: { type: 'button' },
    on: {
      click: (e) => handleAddToCart(e.currentTarget),
    },
  });

  if (!selectedVariant || selectedVariant.stock === 0) {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = t('product.outOfStock') || 'ناموجود';
  }

  actions.appendChild(addToCartBtn);

  // Wishlist button
  const wishlistBtn = createEl('button', {
    className: `btn btn--secondary btn--icon btn--lg product-info__wishlist-btn ${isWishlisted ? 'is-active' : ''}`,
    attrs: {
      type: 'button',
      'aria-label': isWishlisted ? t('wishlist.remove') : t('wishlist.add'),
      'aria-pressed': String(isWishlisted),
    },
    on: {
      click: () => handleToggleWishlist(wishlistBtn),
    },
  });
  wishlistBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  `;
  actions.appendChild(wishlistBtn);

  container.appendChild(actions);
}

/**
 * Update price display based on selected variant.
 * @param {HTMLElement} priceDisplay
 */
function updatePriceDisplay(priceDisplay) {
  priceDisplay.innerHTML = '';

  if (!selectedVariant) {
    priceDisplay.textContent = '—';
    return;
  }

  const price = selectedVariant.price;
  const priceEl = createEl('span', {
    className: 'product-info__price-current',
    textContent: formatPrice(price),
  });
  priceDisplay.appendChild(priceEl);

  if (product.discountPrice && product.discountPrice < product.basePrice) {
    const originalPrice = createEl('span', {
      className: 'product-info__price-original',
      textContent: formatPrice(product.basePrice),
    });
    priceDisplay.appendChild(originalPrice);

    const discount = Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100);
    const discountBadge = createEl('span', {
      className: 'badge badge--danger',
      textContent: `${toPersianDigits(discount)}٪ ${t('product.discount') || 'تخفیف'}`,
    });
    priceDisplay.appendChild(discountBadge);
  }
}

/**
 * Update stock status display.
 * @param {HTMLElement} stockDisplay
 */
function updateStockDisplay(stockDisplay) {
  stockDisplay.innerHTML = '';

  if (!selectedVariant) {
    return;
  }

  const stock = selectedVariant.stock;

  if (stock === 0) {
    const badge = createEl('span', {
      className: 'badge badge--danger',
      textContent: t('product.outOfStock') || 'ناموجود',
    });
    stockDisplay.appendChild(badge);
  } else if (stock <= 5) {
    const badge = createEl('span', {
      className: 'badge badge--warning',
      textContent: t('product.lowStock', { count: toPersianDigits(stock) }) || `فقط ${toPersianDigits(stock)} عدد باقی مانده`,
    });
    stockDisplay.appendChild(badge);
  } else {
    const badge = createEl('span', {
      className: 'badge badge--success',
      textContent: t('product.inStock') || 'موجود',
    });
    stockDisplay.appendChild(badge);
  }
}

// ===== SECTION 3: Add to Cart & Fly Animation =====

/**
 * Handle add to cart with fly animation.
 * @param {HTMLElement} sourceButton
 */
async function handleAddToCart(sourceButton) {
  if (!selectedVariant || selectedVariant.stock === 0) {
    showToast({ message: t('product.outOfStock') || 'این محصول ناموجود است', variant: 'error' });
    return;
  }

  if (quantity > selectedVariant.stock) {
    showToast({ message: t('errors.insufficientStock') || 'موجودی کافی نیست', variant: 'error' });
    return;
  }

  try {
    // Add to cart
    cartStore.add({
      variantId: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      brandName: product.brand?.name || '',
      imageUrl: product.images?.[0] || null,
      storage: selectedVariant.storage,
      color: selectedVariant.color,
      unitPrice: selectedVariant.price,
      qty: quantity,
    });

    // Fly animation
    const cartIcon = $('.site-header__cart-btn');
    if (cartIcon) {
      await flyToCart({
        source: sourceButton,
        target: cartIcon,
        imageUrl: product.images?.[0] || null,
      });
    }

    showToast({ message: t('product.addedToCart') || 'به سبد خرید اضافه شد', variant: 'success' });
  } catch (err) {
    console.error('Failed to add to cart:', err);
    showToast({ message: err.message, variant: 'error' });
  }
}

/**
 * Handle wishlist toggle.
 * @param {HTMLElement} button
 */
async function handleToggleWishlist(button) {
  try {
    if (isWishlisted) {
      await removeFromWishlist(product.id);
      wishlistedIds.delete(product.id);
      isWishlisted = false;
      showToast({ message: t('wishlist.removed') || 'از علاقه‌مندی‌ها حذف شد', variant: 'success' });
    } else {
      await addToWishlist(product.id);
      wishlistedIds.add(product.id);
      isWishlisted = true;
      showToast({ message: t('wishlist.added') || 'به علاقه‌مندی‌ها اضافه شد', variant: 'success' });
    }

    setWishlistCount(wishlistedIds.size);

    // Update button state
    button.classList.toggle('is-active', isWishlisted);
    button.setAttribute('aria-pressed', String(isWishlisted));
    button.setAttribute('aria-label', isWishlisted ? t('wishlist.remove') : t('wishlist.add'));

    // Update icon
    const svg = button.querySelector('svg path');
    if (svg) {
      svg.setAttribute('fill', isWishlisted ? 'currentColor' : 'none');
    }
  } catch (err) {
    console.error('Failed to toggle wishlist:', err);
    showToast({ message: err.message, variant: 'error' });
  }
}

// ===== SECTION 4: Tabs & Related =====

/**
 * Render tabs for description and specs.
 */
function renderTabs() {
  const tabs = $$('.product-tabs__tab');
  const panels = $$('.product-tabs__panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      // Update active panel
      panels.forEach(p => p.classList.remove('is-active'));
      $(`#tab-${tabId}`).classList.add('is-active');
    });
  });

  // Render description
  const descPanel = $('#tab-description');
  descPanel.innerHTML = '';
  if (product.description) {
    descPanel.innerHTML = product.description;
  } else {
    descPanel.textContent = t('product.noDescription') || 'توضیحاتی موجود نیست';
  }

  // Render specs
  const specsPanel = $('#tab-specs');
  specsPanel.innerHTML = '';
  if (product.specs && Object.keys(product.specs).length > 0) {
    const specsList = createEl('dl', { className: 'product-specs' });
    for (const [key, value] of Object.entries(product.specs)) {
      const dt = createEl('dt', { textContent: key });
      const dd = createEl('dd', { textContent: value });
      specsList.appendChild(dt);
      specsList.appendChild(dd);
    }
    specsPanel.appendChild(specsList);
  } else {
    specsPanel.textContent = t('product.noSpecs') || 'مشخصاتی موجود نیست';
  }
}

/**
 * Load and render related products.
 */
async function loadRelated() {
  const container = $('#related-products');

  try {
    const related = await getRelatedProducts(product.id, 4);

    if (!related || related.length === 0) {
      container.closest('.related-section').hidden = true;
      return;
    }

    container.innerHTML = '';
    const grid = renderProductGrid(related, {
      wishlistedIds,
      onToggleWishlist: async (productId) => {
        try {
          if (wishlistedIds.has(productId)) {
            await removeFromWishlist(productId);
            wishlistedIds.delete(productId);
            showToast({ message: t('wishlist.removed'), variant: 'success' });
          } else {
            await addToWishlist(productId);
            wishlistedIds.add(productId);
            showToast({ message: t('wishlist.added'), variant: 'success' });
          }
          setWishlistCount(wishlistedIds.size);
        } catch (err) {
          showToast({ message: err.message, variant: 'error' });
        }
      },
      onAddToCart: (p) => {
        window.location.href = `product.html?slug=${encodeURIComponent(p.slug)}`;
      },
    });
    container.appendChild(grid);
  } catch (err) {
    console.error('Failed to load related products:', err);
    container.innerHTML = '';
  }
}

// ===== SECTION 5: Sticky Bar =====

/**
 * Setup sticky bar for mobile.
 */
function setupStickyBar() {
  const container = $('#sticky-bar-container');
  const galleryContainer = $('#gallery-container');

  const stickyBar = renderStickyBar(product, {
    currentPrice: selectedVariant?.price,
    isAvailable: selectedVariant && selectedVariant.stock > 0,
    onAddToCart: () => {
      const addToCartBtn = $('.product-info__add-btn');
      if (addToCartBtn) {
        handleAddToCart(addToCartBtn);
      }
    },
  });

  container.appendChild(stickyBar);

  // Observe visibility
  observeStickyVisibility(galleryContainer, stickyBar);
}

// ===== SECTION 6: Header =====

/**
 * Initialize header with cart/wishlist counts and auth state.
 */
function initHeader() {
  const cartCountEl = $('.site-header__cart-count');
  const wishlistCountEl = $('.site-header__wishlist-count');
  const authBtn = $('.site-header__auth-btn');

  cartStore.subscribe((s) => s.items.reduce((n, i) => n + i.qty, 0), (count) => {
    if (count > 0) {
      cartCountEl.textContent = toPersianDigits(count);
      cartCountEl.hidden = false;
    } else {
      cartCountEl.hidden = true;
    }
  });

  appStore.subscribe((s) => s.wishlistCount, (count) => {
    if (count > 0) {
      wishlistCountEl.textContent = toPersianDigits(count);
      wishlistCountEl.hidden = false;
    } else {
      wishlistCountEl.hidden = true;
    }
  });

  $('.site-header__cart-btn').addEventListener('click', () => {
    window.location.href = ROUTES.cart;
  });

  $('.site-header__wishlist-btn').addEventListener('click', () => {
    window.location.href = ROUTES.wishlist;
  });
}

// ===== SECTION 7: Start =====

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
