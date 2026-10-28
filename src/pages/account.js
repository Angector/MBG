// === FILE: src/pages/account.js ===
// Project: Mobogram — Phase 15: Account Page
// Purpose: Account page logic - profile, orders, wishlist, logout

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, formatDate, formatPrice, toPersianDigits } from '../utils.js';
import { appStore, cartStore, resetAppState } from '../state.js';
import { getSession, signOut } from '../services/auth.service.js';
import { listMyOrders, listWishlist } from '../services/shopping.service.js';
import { renderEmptyState, renderSkeleton, showToast } from '../ui/primitives.js';
import { renderProductGrid } from '../ui/product.ui.js';

// ===== SECTION 1: Init & Tab Switching =====

/** @type {'profile'|'orders'|'wishlist'} */
let activeTab = 'profile';

/**
 * Initialize account page.
 * Checks authentication, loads profile, sets up tab switching.
 */
async function init() {
  try {
    applyTranslations();
    initHeader();

    // Check authentication
    const { user, profile } = await getSession();

    if (!user) {
      // Not logged in - redirect to auth
      window.location.href = `${ROUTES.auth}?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    // Show content
    $('#account-loading').hidden = true;
    $('#account-content').hidden = false;

    // Setup tab switching
    const tabs = $$('.account-tabs__tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        if (tabName === 'logout') {
          handleLogout();
          return;
        }

        activeTab = tabName;

        // Update active tab
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        // Render tab content
        renderTabContent();
      });
    });

    // Render initial tab
    renderTabContent();
  } catch (err) {
    console.error('Failed to initialize account page:', err);
    showToast({ message: err.message || t('errors.loadAccount') || 'خطا در بارگذاری حساب کاربری', variant: 'error' });
  }
}

/**
 * Handle logout.
 */
async function handleLogout() {
  try {
    await signOut();
    resetAppState();
    showToast({ message: t('auth.logoutSuccess') || 'با موفقیت خارج شدید', variant: 'success' });
    setTimeout(() => {
      window.location.href = ROUTES.home;
    }, 1000);
  } catch (err) {
    console.error('Failed to logout:', err);
    showToast({ message: err.message || t('errors.logoutFailed') || 'خطا در خروج', variant: 'error' });
  }
}

// ===== SECTION 2: Render Tabs =====

/**
 * Render content for the active tab.
 */
function renderTabContent() {
  const container = $('#account-tab-content');
  container.innerHTML = '';

  switch (activeTab) {
    case 'profile':
      renderProfileTab(container);
      break;
    case 'orders':
      renderOrdersTab(container);
      break;
    case 'wishlist':
      renderWishlistTab(container);
      break;
  }
}

/**
 * Render profile tab.
 * @param {HTMLElement} container
 */
async function renderProfileTab(container) {
  // Show skeleton
  container.appendChild(renderSkeleton({ variant: 'block', height: '200px' }));

  try {
    const { user, profile } = await getSession();

    container.innerHTML = '';

    const profileCard = createEl('div', { className: 'profile-card' });

    // Avatar
    const avatar = createEl('div', { className: 'profile-card__avatar' });
    avatar.textContent = (profile?.full_name || user.email || '?').charAt(0).toUpperCase();
    profileCard.appendChild(avatar);

    // Info
    const info = createEl('div', { className: 'profile-card__info' });

    const name = createEl('h2', {
      className: 'profile-card__name',
      textContent: profile?.full_name || t('account.noName') || 'بدون نام',
    });
    info.appendChild(name);

    const email = createEl('p', {
      className: 'profile-card__email',
      textContent: user.email,
    });
    info.appendChild(email);

    if (profile?.created_at) {
      const memberSince = createEl('p', {
        className: 'profile-card__member-since',
        textContent: `${t('account.memberSince') || 'عضو از'} ${formatDate(profile.created_at)}`,
      });
      info.appendChild(memberSince);
    }

    profileCard.appendChild(info);
    container.appendChild(profileCard);

    // Edit button (placeholder for future implementation)
    const editBtn = createEl('button', {
      className: 'btn btn--secondary',
      textContent: t('account.editProfile') || 'ویرایش پروفایل',
      attrs: { type: 'button' },
      on: {
        click: () => {
          showToast({ message: t('account.editComingSoon') || 'این قابلیت به زودی اضافه می‌شود', variant: 'info' });
        },
      },
    });
    container.appendChild(editBtn);
  } catch (err) {
    console.error('Failed to load profile:', err);
    container.innerHTML = '';
    container.appendChild(renderEmptyState({
      title: t('errors.loadProfile') || 'خطا در بارگذاری پروفایل',
      description: err.message,
      icon: 'alert',
    }));
  }
}

/**
 * Render orders tab.
 * @param {HTMLElement} container
 */
async function renderOrdersTab(container) {
  // Show skeleton
  container.appendChild(renderSkeleton({ variant: 'block', height: '300px' }));

  try {
    const { items: orders } = await listMyOrders({ page: 1, pageSize: 20 });

    container.innerHTML = '';

    if (!orders || orders.length === 0) {
      container.appendChild(renderEmptyState({
        title: t('empty.orders') || 'سفارشی ثبت نشده',
        description: t('empty.ordersHint') || 'هنوز سفارشی ثبت نکرده‌اید',
        icon: 'box',
        cta: {
          label: t('common.startShopping') || 'شروع خرید',
          onClick: () => {
            window.location.href = ROUTES.products;
          },
        },
      }));
      return;
    }

    const ordersList = createEl('div', { className: 'orders-list' });

    orders.forEach((order) => {
      const orderCard = createEl('div', { className: 'order-card' });

      // Header
      const header = createEl('div', { className: 'order-card__header' });

      const orderNumber = createEl('div', { className: 'order-card__number' });
      orderNumber.appendChild(createEl('span', {
        className: 'order-card__label',
        textContent: t('order.number') || 'شماره سفارش',
      }));
      orderNumber.appendChild(createEl('span', {
        className: 'order-card__value',
        textContent: `#${order.id.slice(0, 8)}`,
      }));
      header.appendChild(orderNumber);

      const statusBadge = createEl('span', {
        className: `badge badge--${getOrderStatusVariant(order.status)}`,
        textContent: getOrderStatusText(order.status),
      });
      header.appendChild(statusBadge);

      orderCard.appendChild(header);

      // Date
      const date = createEl('div', { className: 'order-card__date' });
      date.appendChild(createEl('span', {
        className: 'order-card__label',
        textContent: t('order.date') || 'تاریخ',
      }));
      date.appendChild(createEl('span', {
        className: 'order-card__value',
        textContent: formatDate(order.created_at),
      }));
      orderCard.appendChild(date);

      // Items count
      const itemsCount = order.items?.length || 0;
      const items = createEl('div', { className: 'order-card__items' });
      items.appendChild(createEl('span', {
        className: 'order-card__label',
        textContent: t('order.items') || 'تعداد اقلام',
      }));
      items.appendChild(createEl('span', {
        className: 'order-card__value',
        textContent: toPersianDigits(itemsCount),
      }));
      orderCard.appendChild(items);

      // Total
      const total = createEl('div', { className: 'order-card__total' });
      total.appendChild(createEl('span', {
        className: 'order-card__label',
        textContent: t('order.total') || 'مبلغ کل',
      }));
      total.appendChild(createEl('span', {
        className: 'order-card__value',
        textContent: formatPrice(order.total),
      }));
      orderCard.appendChild(total);

      ordersList.appendChild(orderCard);
    });

    container.appendChild(ordersList);
  } catch (err) {
    console.error('Failed to load orders:', err);
    container.innerHTML = '';
    container.appendChild(renderEmptyState({
      title: t('errors.loadOrders') || 'خطا در بارگذاری سفارش‌ها',
      description: err.message,
      icon: 'alert',
    }));
  }
}

/**
 * Get order status badge variant.
 * @param {string} status
 * @returns {string}
 */
function getOrderStatusVariant(status) {
  const variants = {
    pending: 'warning',
    confirmed: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
  };
  return variants[status] || 'neutral';
}

/**
 * Get order status text.
 * @param {string} status
 * @returns {string}
 */
function getOrderStatusText(status) {
  const texts = {
    pending: t('account.orderStatus.pending') || 'در انتظار تأیید',
    confirmed: t('account.orderStatus.confirmed') || 'تأیید شده',
    shipped: t('account.orderStatus.shipped') || 'ارسال شده',
    delivered: t('account.orderStatus.delivered') || 'تحویل شده',
    cancelled: t('account.orderStatus.cancelled') || 'لغو شده',
  };
  return texts[status] || status;
}

/**
 * Render wishlist tab.
 * @param {HTMLElement} container
 */
async function renderWishlistTab(container) {
  // Show skeleton
  for (let i = 0; i < 4; i++) {
    container.appendChild(renderSkeleton({ variant: 'card' }));
  }

  try {
    const { items: wishlistItems } = await listWishlist({ page: 1, pageSize: 50 });

    container.innerHTML = '';

    if (!wishlistItems || wishlistItems.length === 0) {
      container.appendChild(renderEmptyState({
        title: t('empty.wishlist') || 'لیست علاقه‌مندی خالی است',
        description: t('empty.wishlistHint') || 'محصولات مورد علاقه خود را ذخیره کنید',
        icon: 'heart',
        cta: {
          label: t('common.browseProducts') || 'مشاهده محصولات',
          onClick: () => {
            window.location.href = ROUTES.products;
          },
        },
      }));
      return;
    }

    // Extract products from wishlist items
    const products = wishlistItems
      .map(item => item.product)
      .filter(p => p !== null);

    if (products.length === 0) {
      container.appendChild(renderEmptyState({
        title: t('empty.wishlist') || 'لیست علاقه‌مندی خالی است',
        description: t('empty.wishlistHint') || 'محصولات مورد علاقه خود را ذخیره کنید',
        icon: 'heart',
      }));
      return;
    }

    const grid = renderProductGrid(products, {
      wishlistedIds: new Set(products.map(p => p.id)),
      onToggleWishlist: async (productId) => {
        try {
          const { removeFromWishlist } = await import('../services/shopping.service.js');
          await removeFromWishlist(productId);
          showToast({ message: t('wishlist.removed') || 'از علاقه‌مندی‌ها حذف شد', variant: 'success' });
          // Re-render wishlist
          renderWishlistTab(container);
        } catch (err) {
          showToast({ message: err.message, variant: 'error' });
        }
      },
      onAddToCart: (product) => {
        window.location.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
      },
    });

    container.appendChild(grid);
  } catch (err) {
    console.error('Failed to load wishlist:', err);
    container.innerHTML = '';
    container.appendChild(renderEmptyState({
      title: t('errors.loadWishlist') || 'خطا در بارگذاری علاقه‌مندی‌ها',
      description: err.message,
      icon: 'alert',
    }));
  }
}

// ===== SECTION 3: Header =====

/**
 * Initialize header with cart/wishlist counts.
 */
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

// ===== SECTION 4: Start =====

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
