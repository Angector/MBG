// === FILE: src/pages/cart.js ===
// Project: Mobogram — Phase 18: Cart Page
// Purpose: Cart page logic - render items, handle quantity changes, coupon logic

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, formatPrice, toPersianDigits, initTheme, toggleTheme, initPreloader } from '../utils.js';
import { cartStore, setWishlistCount } from '../state.js';
import { getSession } from '../services/auth.service.js';
import { getWishlistProductIds } from '../services/shopping.service.js';
import { renderCartLine } from '../ui/shopping.ui.js';
import { renderEmptyState, showToast } from '../ui/primitives.js';

// ===== SECTION 1: State =====

let couponApplied = false;
let couponDiscount = 0;

// ===== SECTION 2: Initialization =====

async function init() {
  try {
    // Initialize theme and preloader
    initTheme();
    initPreloader();

    // Bind theme toggle button
    const themeBtn = $('#theme-btn');
    if (themeBtn) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeBtn.textContent = isDark ? '☀️' : '🌙';
      themeBtn.addEventListener('click', toggleTheme);
    }

    // Apply translations
    applyTranslations();

    // Initialize header
    initHeader();

    // Load session for auth state
    try {
      await getSession();
      const wishlistedIds = await getWishlistProductIds();
      setWishlistCount(wishlistedIds.size);
    } catch (err) {
      // Not logged in - continue
    }

    // Render cart
    renderCart();

    // Setup coupon handler
    setupCouponHandler();

    // Subscribe to cart changes
    cartStore.subscribe(() => cartStore.getState(), () => {
      renderCart();
    });
  } catch (err) {
    console.error('Failed to initialize cart page:', err);
    showToast({ message: err.message || t('errors.initFailed') || 'خطا در بارگذاری صفحه', variant: 'error' });
  }
}

// ===== SECTION 3: Header =====

function initHeader() {
  const cartCountEl = $('.site-header__cart-count');
  const wishlistCountEl = $('.site-header__wishlist-count');

  cartStore.subscribe((s) => s.items.reduce((n, i) => n + i.qty, 0), (count) => {
    if (count > 0) {
      cartCountEl.textContent = toPersianDigits(count);
      cartCountEl.hidden = false;
    } else {
      cartCountEl.hidden = true;
    }
  });

  $('.site-header__cart-btn').addEventListener('click', () => {
    window.location.href = ROUTES.cart;
  });

  $('.site-header__wishlist-btn').addEventListener('click', () => {
    window.location.href = ROUTES.wishlist;
  });
}

// ===== SECTION 4: Render Cart =====

function renderCart() {
  const loadingEl = $('#cart-loading');
  const emptyEl = $('#cart-empty');
  const contentEl = $('#cart-content');

  const cart = cartStore.getState();

  loadingEl.hidden = true;

  if (!cart.items || cart.items.length === 0) {
    contentEl.hidden = true;
    emptyEl.hidden = false;

    const emptyState = renderEmptyState({
      title: t('cart.empty') || 'سبد خرید شما خالی است',
      description: t('cart.emptyHint') || 'محصولی به سبد خرید اضافه نکرده‌اید',
      icon: 'cart',
      cta: {
        label: t('cart.continueShopping') || 'ادامه خرید',
        onClick: () => {
          window.location.href = 'products.html';
        },
      },
    });
    emptyEl.innerHTML = '';
    emptyEl.appendChild(emptyState);
    return;
  }

  contentEl.hidden = false;
  emptyEl.hidden = true;

  // Render cart items
  const itemsContainer = $('#cart-items-container');
  itemsContainer.innerHTML = '';

  cart.items.forEach((item) => {
    const line = renderCartLine(item, {
      onQtyChange: (variantId, newQty) => {
        cartStore.setQty(variantId, newQty);
      },
      onRemove: (variantId) => {
        cartStore.remove(variantId);
        showToast({ message: t('cart.itemRemoved') || 'محصول از سبد حذف شد', variant: 'success' });
      },
    });
    itemsContainer.appendChild(line);
  });

  // Update summary
  updateSummary();
}

// ===== SECTION 5: Update Summary =====

function updateSummary() {
  const { items, subtotal } = cartStore.getDerived();

  const subtotalEl = $('#cart-subtotal');
  const totalEl = $('#cart-total');
  const discountRowEl = $('#cart-discount-row');
  const discountEl = $('#cart-discount');

  subtotalEl.textContent = formatPrice(subtotal);

  if (couponApplied && couponDiscount > 0) {
    discountRowEl.hidden = false;
    discountEl.textContent = `- ${formatPrice(couponDiscount)}`;
    totalEl.textContent = formatPrice(subtotal - couponDiscount);
  } else {
    discountRowEl.hidden = true;
    totalEl.textContent = formatPrice(subtotal);
  }
}

// ===== SECTION 6: Coupon Handler =====

function setupCouponHandler() {
  const couponInput = $('#coupon-code');
  const applyBtn = $('#apply-coupon');
  const messageEl = $('#coupon-message');

  applyBtn.addEventListener('click', () => {
    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
      messageEl.hidden = false;
      messageEl.textContent = t('cart.couponEmpty') || 'لطفاً کد تخفیف را وارد کنید';
      messageEl.style.color = 'var(--color-danger)';
      return;
    }

    if (code === 'MOBO10') {
      const { subtotal } = cartStore.getDerived();
      couponApplied = true;
      couponDiscount = Math.round(subtotal * 0.1);

      messageEl.hidden = false;
      messageEl.textContent = t('cart.couponApplied') || 'کد تخفیف با موفقیت اعمال شد';
      messageEl.style.color = 'var(--color-success)';

      couponInput.disabled = true;
      applyBtn.disabled = true;

      updateSummary();
      showToast({ message: t('cart.couponSuccess') || 'تخفیف ۱۰٪ اعمال شد', variant: 'success' });
    } else {
      couponApplied = false;
      couponDiscount = 0;

      messageEl.hidden = false;
      messageEl.textContent = t('cart.couponInvalid') || 'کد تخفیف نامعتبر است';
      messageEl.style.color = 'var(--color-danger)';

      updateSummary();
    }
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
