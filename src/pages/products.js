// === FILE: src/pages/products.js ===
// Project: Mobogram — Phase 14: Products Page
// Purpose: Product listing with filters, search, sort, infinite scroll

// ===== SECTION 0: Imports =====
import { ROUTES, PAGE_SIZE } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, parseQuery, buildQuery, withQuery, toPersianDigits } from '../utils.js';
import { debounce } from '../utils.js';
import { cartStore, appStore, setWishlistCount } from '../state.js';
import { getSession } from '../services/auth.service.js';
import { listProducts, listBrands, getPriceBounds } from '../services/catalog.service.js';
import { getWishlistProductIds, addToWishlist, removeFromWishlist } from '../services/shopping.service.js';
import { renderProductGrid } from '../ui/product.ui.js';
import { renderFilterSheet } from '../ui/shopping.ui.js';
import { renderSkeleton, renderEmptyState, renderErrorState, showToast } from '../ui/primitives.js';
import { observeInfiniteScroll, observeReveal } from '../observers.js';

// ===== SECTION 1: State & URL Parsing =====

/** @type {import('../types.js').ProductFilter} */
let currentFilter = {
  page: 1,
  pageSize: PAGE_SIZE.products,
};

/** @type {Set<string>} */
let wishlistedIds = new Set();

/** @type {boolean} */
let hasMore = true;

/** @type {boolean} */
let isLoading = false;

/** @type {import('../types.js').Brand[]} */
let brands = [];

/** @type {{ min: number, max: number }} */
let priceBounds = { min: 0, max: 0 };

/**
 * Parse URL query parameters into filter object.
 * @returns {import('../types.js').ProductFilter}
 */
function parseFiltersFromURL() {
  const query = parseQuery();
  const filter = { page: 1, pageSize: PAGE_SIZE.products };

  if (query.brand) {
    filter.brandIds = query.brand.split(',');
  }
  if (query.minPrice) {
    filter.minPrice = parseInt(query.minPrice, 10);
  }
  if (query.maxPrice) {
    filter.maxPrice = parseInt(query.maxPrice, 10);
  }
  if (query.sort) {
    filter.sortBy = query.sort;
  }
  if (query.q) {
    filter.searchQuery = query.q;
  }
  if (query.inStock === 'true') {
    filter.inStock = true;
  }
  if (query.page) {
    filter.page = parseInt(query.page, 10);
  }

  return filter;
}

/**
 * Update URL with current filter state.
 */
function updateURL() {
  const params = {};
  if (currentFilter.brandIds?.length) {
    params.brand = currentFilter.brandIds.join(',');
  }
  if (currentFilter.minPrice) {
    params.minPrice = currentFilter.minPrice;
  }
  if (currentFilter.maxPrice) {
    params.maxPrice = currentFilter.maxPrice;
  }
  if (currentFilter.sortBy) {
    params.sort = currentFilter.sortBy;
  }
  if (currentFilter.searchQuery) {
    params.q = currentFilter.searchQuery;
  }
  if (currentFilter.inStock) {
    params.inStock = 'true';
  }
  if (currentFilter.page > 1) {
    params.page = currentFilter.page;
  }

  const newURL = withQuery('products.html', params);
  window.history.replaceState(null, '', newURL);
}

// ===== SECTION 2: Initialization =====

/**
 * Initialize products page.
 * Loads brands, price bounds, wishlist, and initial products.
 */
async function init() {
  try {
    // Apply translations
    applyTranslations();

    // Initialize header (reuse from home.js pattern)
    initHeader();

    // Parse initial filters from URL
    currentFilter = parseFiltersFromURL();

    // Load session for auth state
    try {
      await getSession();
    } catch (err) {
      // Not logged in - continue
    }

    // Load wishlist IDs if logged in
    try {
      wishlistedIds = await getWishlistProductIds();
      setWishlistCount(wishlistedIds.size);
    } catch (err) {
      // Not logged in or error - continue
    }

    // Load brands and price bounds for filters
    const [brandsData, bounds] = await Promise.all([
      listBrands(),
      getPriceBounds(),
    ]);

    brands = brandsData;
    priceBounds = bounds;

    // Build desktop filters
    buildDesktopFilters();

    // Setup sort and search
    setupSortAndSearch();

    // Fetch initial products
    await fetchProducts(true);

    // Setup infinite scroll
    setupInfiniteScroll();
  } catch (err) {
    console.error('Failed to initialize products page:', err);
    $('#error-state').innerHTML = '';
    $('#error-state').appendChild(renderErrorState({
      title: t('errors.loadProducts') || 'خطا در بارگذاری محصولات',
      message: err.message,
      onRetry: () => init(),
    }));
    show($('#error-state'));
    hide($('#products-grid'));
  }
}

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
      show(cartCountEl);
    } else {
      hide(cartCountEl);
    }
  });

  appStore.subscribe((s) => s.wishlistCount, (count) => {
    if (count > 0) {
      wishlistCountEl.textContent = toPersianDigits(count);
      show(wishlistCountEl);
    } else {
      hide(wishlistCountEl);
    }
  });

  $('.site-header__cart-btn').addEventListener('click', () => {
    window.location.href = ROUTES.cart;
  });

  $('.site-header__wishlist-btn').addEventListener('click', () => {
    window.location.href = ROUTES.wishlist;
  });
}

// ===== SECTION 3: Filters UI (Desktop & Mobile) =====

/**
 * Build desktop filters in sidebar.
 * Includes brand checkboxes, price range inputs, and in-stock toggle.
 */
function buildDesktopFilters() {
  const container = $('#desktop-filters');
  container.innerHTML = '';

  const form = createEl('form', { className: 'filters-form' });

  // Brands
  const brandsSection = createEl('div', { className: 'filter-section' });
  brandsSection.appendChild(createEl('h3', { className: 'filter-section__title', textContent: t('product.brand') }));

  const brandsList = createEl('div', { className: 'filter-section__list' });
  brands.forEach((brand) => {
    const label = createEl('label', { className: 'check' });
    const checkbox = createEl('input', {
      attrs: {
        type: 'checkbox',
        name: 'brand',
        value: brand.id,
      },
    });
    if (currentFilter.brandIds?.includes(brand.id)) {
      checkbox.checked = true;
    }
    checkbox.addEventListener('change', () => {
      const selected = Array.from(brandsList.querySelectorAll('input:checked')).map(i => i.value);
      currentFilter.brandIds = selected.length > 0 ? selected : undefined;
      currentFilter.page = 1;
      updateURL();
      fetchProducts(true);
    });
    label.appendChild(checkbox);
    label.appendChild(createEl('span', { textContent: brand.name }));
    brandsList.appendChild(label);
  });
  brandsSection.appendChild(brandsList);
  form.appendChild(brandsSection);

  // Price Range
  const priceSection = createEl('div', { className: 'filter-section' });
  priceSection.appendChild(createEl('h3', { className: 'filter-section__title', textContent: t('product.price') }));

  const priceInputs = createEl('div', { className: 'filter-section__price-range' });

  const minInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'number',
      placeholder: t('filters.minPrice') || 'حداقل',
      value: currentFilter.minPrice || '',
      min: priceBounds.min,
      max: priceBounds.max,
    },
  });
  minInput.addEventListener('change', () => {
    currentFilter.minPrice = minInput.value ? parseInt(minInput.value, 10) : undefined;
    currentFilter.page = 1;
    updateURL();
    fetchProducts(true);
  });

  const maxInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'number',
      placeholder: t('filters.maxPrice') || 'حداکثر',
      value: currentFilter.maxPrice || '',
      min: priceBounds.min,
      max: priceBounds.max,
    },
  });
  maxInput.addEventListener('change', () => {
    currentFilter.maxPrice = maxInput.value ? parseInt(maxInput.value, 10) : undefined;
    currentFilter.page = 1;
    updateURL();
    fetchProducts(true);
  });

  priceInputs.appendChild(minInput);
  priceInputs.appendChild(maxInput);
  priceSection.appendChild(priceInputs);
  form.appendChild(priceSection);

  // In Stock Toggle
  const stockSection = createEl('div', { className: 'filter-section' });
  const stockLabel = createEl('label', { className: 'check' });
  const stockCheckbox = createEl('input', {
    attrs: { type: 'checkbox' },
  });
  if (currentFilter.inStock) {
    stockCheckbox.checked = true;
  }
  stockCheckbox.addEventListener('change', () => {
    currentFilter.inStock = stockCheckbox.checked || undefined;
    currentFilter.page = 1;
    updateURL();
    fetchProducts(true);
  });
  stockLabel.appendChild(stockCheckbox);
  stockLabel.appendChild(createEl('span', { textContent: t('filters.inStockOnly') || 'فقط کالاهای موجود' }));
  stockSection.appendChild(stockLabel);
  form.appendChild(stockSection);

  container.appendChild(form);

  // Mobile filter button
  $('#mobile-filter-btn').addEventListener('click', openMobileFilters);
}

/**
 * Open mobile filter sheet.
 * Uses renderFilterSheet from shopping.ui.js.
 */
function openMobileFilters() {
  const sheet = renderFilterSheet(
    { brands, priceBounds, currentFilters: currentFilter },
    {
      onApply: (filters) => {
        currentFilter = { ...currentFilter, ...filters, page: 1 };
        updateURL();
        fetchProducts(true);
        buildDesktopFilters(); // Sync desktop filters
      },
      onReset: () => {
        currentFilter = { page: 1, pageSize: PAGE_SIZE.products };
        updateURL();
        fetchProducts(true);
        buildDesktopFilters();
      },
    }
  );

  document.body.appendChild(sheet.element);
  sheet.open();
}

// ===== SECTION 4: Sorting & Search =====

/**
 * Setup sort dropdown and search input with debouncing.
 */
function setupSortAndSearch() {
  const sortSelect = $('#sort-select');
  const searchInput = $('#search-input');

  // Set initial values
  if (currentFilter.sortBy) {
    sortSelect.value = currentFilter.sortBy;
  }
  if (currentFilter.searchQuery) {
    searchInput.value = currentFilter.searchQuery;
  }

  // Sort change
  sortSelect.addEventListener('change', () => {
    currentFilter.sortBy = sortSelect.value;
    currentFilter.page = 1;
    updateURL();
    fetchProducts(true);
  });

  // Search with debounce
  const debouncedSearch = debounce(() => {
    currentFilter.searchQuery = searchInput.value || undefined;
    currentFilter.page = 1;
    updateURL();
    fetchProducts(true);
  }, 300);

  searchInput.addEventListener('input', debouncedSearch);
}

// ===== SECTION 5: Fetch & Render Loop =====

/**
 * Fetch products and render to grid.
 * @param {boolean} reset - If true, clear grid and start from page 1
 */
async function fetchProducts(reset = false) {
  if (isLoading) return;
  isLoading = true;

  const grid = $('#products-grid');
  const emptyState = $('#empty-state');
  const errorState = $('#error-state');
  const sentinel = $('#load-more-sentinel');
  const countEl = $('#products-count');

  try {
    if (reset) {
      grid.innerHTML = '';
      // Show skeletons
      for (let i = 0; i < 6; i++) {
        grid.appendChild(createEl('div', { className: 'skeleton skeleton--card' }));
      }
      hide(emptyState);
      hide(errorState);
      currentFilter.page = 1;
    } else {
      // Show loading indicator in sentinel
      sentinel.innerHTML = '';
      sentinel.appendChild(createEl('div', { className: 'skeleton skeleton--text', attrs: { style: 'width: 100px;' } }));
    }

    const result = await listProducts(currentFilter);

    if (reset) {
      grid.innerHTML = '';

      if (result.items.length === 0) {
        hide(grid);
        emptyState.innerHTML = '';
        emptyState.appendChild(renderEmptyState({
          title: t('empty.products'),
          description: t('empty.productsHint'),
          icon: 'box',
        }));
        show(emptyState);
        hide(sentinel);
      } else {
        show(grid);
        hide(emptyState);

        const productGrid = renderProductGrid(result.items, {
          wishlistedIds,
          onToggleWishlist: handleToggleWishlist,
          onAddToCart: handleAddToCart,
          stagger: true,
        });
        grid.appendChild(productGrid);

        // Apply reveal animation
        observeReveal(productGrid, { staggerStep: 60 });
      }
    } else {
      // Append to existing grid
      if (result.items.length > 0) {
        const productGrid = renderProductGrid(result.items, {
          wishlistedIds,
          onToggleWishlist: handleToggleWishlist,
          onAddToCart: handleAddToCart,
          stagger: true,
        });
        grid.appendChild(productGrid);
        observeReveal(productGrid, { staggerStep: 60 });
      }
    }

    // Update count
    countEl.textContent = `${toPersianDigits(result.total)} ${t('products.count') || 'محصول'}`;

    // Update active filters
    updateActiveFilters();

    // Update pagination state
    hasMore = result.hasMore;
    currentFilter.page = result.page;

    // Update sentinel
    if (hasMore) {
      show(sentinel);
      sentinel.innerHTML = '';
      sentinel.appendChild(createEl('div', { className: 'load-more-sentinel__text', textContent: t('common.loading') }));
    } else {
      hide(sentinel);
    }
  } catch (err) {
    console.error('Failed to fetch products:', err);
    if (reset) {
      grid.innerHTML = '';
      hide(grid);
      hide(emptyState);
      errorState.innerHTML = '';
      errorState.appendChild(renderErrorState({
        title: t('errors.loadProducts') || 'خطا در بارگذاری محصولات',
        message: err.message,
        onRetry: () => fetchProducts(true),
      }));
      show(errorState);
    } else {
      showToast({ message: t('errors.loadMoreFailed') || 'خطا در بارگذاری بیشتر', variant: 'error' });
    }
  } finally {
    isLoading = false;
  }
}

/**
 * Update active filters display.
 */
function updateActiveFilters() {
  const container = $('#active-filters');
  container.innerHTML = '';

  const activeFilters = [];

  if (currentFilter.brandIds?.length) {
    currentFilter.brandIds.forEach((id) => {
      const brand = brands.find(b => b.id === id);
      if (brand) {
        activeFilters.push({
          label: brand.name,
          onRemove: () => {
            currentFilter.brandIds = currentFilter.brandIds.filter(bid => bid !== id);
            if (currentFilter.brandIds.length === 0) {
              delete currentFilter.brandIds;
            }
            currentFilter.page = 1;
            updateURL();
            fetchProducts(true);
            buildDesktopFilters();
          },
        });
      }
    });
  }

  if (currentFilter.minPrice || currentFilter.maxPrice) {
    const minStr = currentFilter.minPrice ? toPersianDigits(currentFilter.minPrice) : '۰';
    const maxStr = currentFilter.maxPrice ? toPersianDigits(currentFilter.maxPrice) : '∞';
    activeFilters.push({
      label: `${t('product.price')}: ${minStr} - ${maxStr} ${t('formats.currency')}`,
      onRemove: () => {
        delete currentFilter.minPrice;
        delete currentFilter.maxPrice;
        currentFilter.page = 1;
        updateURL();
        fetchProducts(true);
        buildDesktopFilters();
      },
    });
  }

  if (currentFilter.inStock) {
    activeFilters.push({
      label: t('filters.inStockOnly') || 'فقط موجود',
      onRemove: () => {
        delete currentFilter.inStock;
        currentFilter.page = 1;
        updateURL();
        fetchProducts(true);
        buildDesktopFilters();
      },
    });
  }

  if (activeFilters.length > 0) {
    const chipsWrap = createEl('div', { className: 'chip-group' });
    activeFilters.forEach((filter) => {
      const chip = createEl('button', {
        className: 'chip is-active',
        textContent: filter.label,
      });
      chip.addEventListener('click', filter.onRemove);
      chipsWrap.appendChild(chip);
    });

    const clearAll = createEl('button', {
      className: 'btn btn--link btn--sm',
      textContent: t('common.clearAll') || 'پاک کردن همه',
    });
    clearAll.addEventListener('click', () => {
      currentFilter = { page: 1, pageSize: PAGE_SIZE.products };
      updateURL();
      fetchProducts(true);
      buildDesktopFilters();
    });

    container.appendChild(chipsWrap);
    container.appendChild(clearAll);
  }
}

/**
 * Setup infinite scroll observer.
 */
function setupInfiniteScroll() {
  const sentinel = $('#load-more-sentinel');

  observeInfiniteScroll(sentinel, async () => {
    if (!hasMore || isLoading) return false;
    currentFilter.page++;
    await fetchProducts(false);
    return hasMore;
  });
}

// ===== SECTION 6: Interactions =====

/**
 * Handle wishlist toggle with optimistic UI update.
 * @param {string} productId
 */
async function handleToggleWishlist(productId) {
  const isWishlisted = wishlistedIds.has(productId);

  // Optimistic update
  if (isWishlisted) {
    wishlistedIds.delete(productId);
  } else {
    wishlistedIds.add(productId);
  }
  setWishlistCount(wishlistedIds.size);

  try {
    if (isWishlisted) {
      await removeFromWishlist(productId);
      showToast({ message: t('wishlist.removed'), variant: 'success' });
    } else {
      await addToWishlist(productId);
      showToast({ message: t('wishlist.added'), variant: 'success' });
    }
  } catch (err) {
    // Revert on error
    if (isWishlisted) {
      wishlistedIds.add(productId);
    } else {
      wishlistedIds.delete(productId);
    }
    setWishlistCount(wishlistedIds.size);
    showToast({ message: err.message, variant: 'error' });
  }
}

/**
 * Handle add to cart.
 * Redirects to product page for variant selection.
 * @param {import('../types.js').ProductWithVariants} product
 */
function handleAddToCart(product) {
  window.location.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
}

// ===== SECTION 7: Start =====

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
