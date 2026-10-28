// === FILE: src/pages/home.js ===
// Project: Mobogram — Phase 14: Home Page
// Purpose: Homepage logic - header, banners, brands, featured products

// ===== SECTION 0: Imports =====
import { ROUTES, BUCKETS } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, show, hide, toPersianDigits } from '../utils.js';
import { appStore, cartStore, setWishlistCount, selectCartCount } from '../state.js';
import { getSession, onAuthStateChange } from '../services/auth.service.js';
import { getFeaturedProducts, listBrands } from '../services/catalog.service.js';
import { listBanners, getSiteSettings } from '../services/shopping.service.js';
import { renderImage, renderSkeleton, renderErrorState, showToast } from '../ui/primitives.js';
import { renderProductGrid } from '../ui/product.ui.js';
import { observeReveal } from '../observers.js';

// ===== SECTION 1: Header & Global State Sync =====

/**
 * Initialize header with cart/wishlist counts and auth state.
 * Subscribes to cart store and auth state for reactive updates.
 */
function initHeader() {
  const cartCountEl = $('.site-header__cart-count');
  const wishlistCountEl = $('.site-header__wishlist-count');
  const authBtn = $('.site-header__auth-btn');

  // Subscribe to cart store for count updates
  cartStore.subscribe(selectCartCount, (count) => {
    if (count > 0) {
      cartCountEl.textContent = toPersianDigits(count);
      show(cartCountEl);
    } else {
      hide(cartCountEl);
    }
  });

  // Subscribe to app store for wishlist count
  appStore.subscribe((s) => s.wishlistCount, (count) => {
    if (count > 0) {
      wishlistCountEl.textContent = toPersianDigits(count);
      show(wishlistCountEl);
    } else {
      hide(wishlistCountEl);
    }
  });

  // Auth state changes
  onAuthStateChange((event, session, user, profile) => {
    if (user) {
      authBtn.textContent = t('nav.account');
      authBtn.href = ROUTES.account;
      authBtn.classList.remove('btn--secondary');
      authBtn.classList.add('btn--primary');
    } else {
      authBtn.textContent = t('nav.login');
      authBtn.href = ROUTES.auth;
      authBtn.classList.remove('btn--primary');
      authBtn.classList.add('btn--secondary');
    }
  });

  // Cart button click
  $('.site-header__cart-btn').addEventListener('click', () => {
    window.location.href = ROUTES.cart;
  });

  // Wishlist button click
  $('.site-header__wishlist-btn').addEventListener('click', () => {
    window.location.href = ROUTES.wishlist;
  });
}

// ===== SECTION 2: Hero Banner =====

/**
 * Load and render hero banner.
 * Shows skeleton while loading, handles errors gracefully.
 */
async function loadBanners() {
  const container = $('#hero-banner');

  try {
    const banners = await listBanners();

    if (!banners || banners.length === 0) {
      // Fallback: solid color placeholder
      container.innerHTML = '';
      const fallback = createEl('div', { className: 'hero-banner__fallback' });
      fallback.style.background = 'var(--color-surface-2)';
      fallback.style.minHeight = '400px';
      fallback.style.display = 'flex';
      fallback.style.alignItems = 'center';
      fallback.style.justifyContent = 'center';
      fallback.style.borderRadius = 'var(--radius-2xl)';
      fallback.textContent = t('home.heroPlaceholder') || 'بنر ویژه';
      container.appendChild(fallback);
      return;
    }

    // Render first banner
    const banner = banners[0];
    container.innerHTML = '';

    const bannerEl = createEl('div', { className: 'hero-banner__content' });

    if (banner.imageUrl) {
      const img = renderImage({
        url: banner.imageUrl,
        alt: banner.title || 'Banner',
        aspectRatio: '21/9',
        lazy: false,
      });
      bannerEl.appendChild(img);
    }

    if (banner.title || banner.subtitle) {
      const overlay = createEl('div', { className: 'hero-banner__overlay' });
      if (banner.title) {
        overlay.appendChild(createEl('h2', { className: 'hero-banner__title', textContent: banner.title }));
      }
      if (banner.subtitle) {
        overlay.appendChild(createEl('p', { className: 'hero-banner__subtitle', textContent: banner.subtitle }));
      }
      if (banner.ctaLabel && banner.ctaLink) {
        const ctaBtn = createEl('a', {
          className: 'btn btn--primary btn--lg',
          textContent: banner.ctaLabel,
          attrs: { href: banner.ctaLink },
        });
        overlay.appendChild(ctaBtn);
      }
      bannerEl.appendChild(overlay);
    }

    container.appendChild(bannerEl);
  } catch (err) {
    console.error('Failed to load banners:', err);
    container.innerHTML = '';
    container.appendChild(renderErrorState({
      title: t('errors.loadBanners') || 'خطا در بارگذاری بنر',
      message: err.message,
    }));
  }
}

// ===== SECTION 3: Brand Strip =====

/**
 * Load and render brand logos in horizontal scrollable strip.
 * Each brand links to products page filtered by brand.
 */
async function loadBrands() {
  const container = $('#brands-strip');

  try {
    const brands = await listBrands();

    if (!brands || brands.length === 0) {
      hide(container.parentElement);
      return;
    }

    container.innerHTML = '';
    container.classList.add('brands-strip--loaded');

    brands.forEach((brand) => {
      const brandLink = createEl('a', {
        className: 'brand-item',
        attrs: {
          href: `pages/products.html?brand=${encodeURIComponent(brand.slug)}`,
          'aria-label': brand.name,
        },
      });

      if (brand.logoUrl) {
        const img = renderImage({
          url: brand.logoUrl,
          alt: brand.name,
          aspectRatio: '1/1',
          fit: 'contain',
        });
        brandLink.appendChild(img);
      } else {
        const placeholder = createEl('div', { className: 'brand-item__placeholder' });
        placeholder.textContent = brand.name.charAt(0);
        brandLink.appendChild(placeholder);
      }

      container.appendChild(brandLink);
    });
  } catch (err) {
    console.error('Failed to load brands:', err);
    container.innerHTML = '';
    container.appendChild(renderErrorState({
      title: t('errors.loadBrands') || 'خطا در بارگذاری برندها',
      message: err.message,
    }));
  }
}

// ===== SECTION 4: Featured Products =====

/**
 * Load and render featured products grid.
 * Shows skeleton cards while loading, hides section if empty.
 */
async function loadFeatured() {
  const container = $('#featured-grid');
  const section = container.closest('.featured-section');

  try {
    const products = await getFeaturedProducts(8);

    if (!products || products.length === 0) {
      hide(section);
      return;
    }

    // Get wishlist IDs if user is logged in
    let wishlistedIds = new Set();
    try {
      const { getWishlistProductIds } = await import('../services/shopping.service.js');
      wishlistedIds = await getWishlistProductIds();
    } catch (err) {
      // User not logged in or error - continue without wishlist
    }

    container.innerHTML = '';
    container.classList.add('featured-grid--loaded');

    const grid = renderProductGrid(products, {
      wishlistedIds,
      onToggleWishlist: async (productId) => {
        try {
          const { addToWishlist, removeFromWishlist } = await import('../services/shopping.service.js');
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
      onAddToCart: (product) => {
        // Redirect to product page for variant selection
        window.location.href = `pages/product.html?slug=${encodeURIComponent(product.slug)}`;
      },
    });

    container.appendChild(grid);

    // Apply reveal animation
    observeReveal(grid, { staggerStep: 60 });
  } catch (err) {
    console.error('Failed to load featured products:', err);
    container.innerHTML = '';
    container.appendChild(renderErrorState({
      title: t('errors.loadFeatured') || 'خطا در بارگذاری محصولات ویژه',
      message: err.message,
    }));
  }
}

// ===== SECTION 5: Initialization =====

/**
 * Initialize homepage on DOMContentLoaded.
 * Loads all sections sequentially with proper error handling.
 */
async function init() {
  try {
    // Initialize header first
    initHeader();

    // Apply translations
    applyTranslations();

    // Load session for auth state
    try {
      await getSession();
    } catch (err) {
      // Not logged in - continue
    }

    // Load all sections
    await Promise.all([
      loadBanners(),
      loadBrands(),
      loadFeatured(),
    ]);
  } catch (err) {
    console.error('Failed to initialize homepage:', err);
    showToast({ message: t('errors.initFailed') || 'خطا در بارگذاری صفحه', variant: 'error' });
  }
}

// Start when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
