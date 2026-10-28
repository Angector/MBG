// === FILE: src/pages/account.js ===
// Project: Mobogram — Phase 18: Account Page (Part 2)
// Purpose: Account page logic - profile, orders with tracking, addresses, wishlist, logout

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, $$, createEl, formatDate, formatPrice, toPersianDigits, initTheme, toggleTheme, initPreloader, localStorageAdapter } from '../utils.js';
import { appStore, cartStore, setWishlistCount, resetAppState } from '../state.js';
import { getSession, signOut } from '../services/auth.service.js';
import { listMyOrders, listWishlist } from '../services/shopping.service.js';
import { renderEmptyState, renderSkeleton, showToast } from '../ui/primitives.js';
import { renderProductGrid } from '../ui/product.ui.js';

// ===== SECTION 1: Constants =====

const ADDRESSES_KEY = 'mobogram.addresses';

// ===== SECTION 2: Init & Tab Switching =====

/** @type {'profile'|'orders'|'addresses'|'wishlist'} */
let activeTab = 'profile';

/**
 * Initialize account page.
 * Checks authentication, loads profile, sets up tab switching.
 */
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

// ===== SECTION 3: Render Tabs =====

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
    case 'addresses':
      renderAddressesTab(container);
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
 * Render orders tab with tracking stepper.
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

      // Order Tracking Stepper
      const stepper = createOrderTrackingStepper(order.status);
      orderCard.appendChild(stepper);

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
 * Create order tracking stepper.
 * @param {string} status - Current order status
 * @returns {HTMLElement}
 */
function createOrderTrackingStepper(status) {
  const steps = [
    { key: 'pending', label: t('account.orderStatus.pending') || 'در انتظار تأیید' },
    { key: 'confirmed', label: t('account.orderStatus.confirmed') || 'تأیید شده' },
    { key: 'shipped', label: t('account.orderStatus.shipped') || 'ارسال شده' },
    { key: 'delivered', label: t('account.orderStatus.delivered') || 'تحویل شده' },
  ];

  const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'];
  const currentStepIndex = statusOrder.indexOf(status);

  const stepper = createEl('div', { className: 'order-tracking-stepper' });

  steps.forEach((step, index) => {
    const stepEl = createEl('div', { className: 'order-tracking-step' });

    // Circle
    const circle = createEl('div', { className: 'order-tracking-step__circle' });
    if (index <= currentStepIndex) {
      circle.classList.add('is-completed');
      if (index === currentStepIndex) {
        circle.classList.add('is-current');
      }
      circle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else {
      circle.textContent = toPersianDigits(String(index + 1));
    }
    stepEl.appendChild(circle);

    // Label
    const label = createEl('div', {
      className: 'order-tracking-step__label',
      textContent: step.label,
    });
    stepEl.appendChild(label);

    // Connector (except last)
    if (index < steps.length - 1) {
      const connector = createEl('div', { className: 'order-tracking-step__connector' });
      if (index < currentStepIndex) {
        connector.classList.add('is-completed');
      }
      stepEl.appendChild(connector);
    }

    stepper.appendChild(stepEl);
  });

  return stepper;
}

/**
 * Render addresses tab.
 * @param {HTMLElement} container
 */
function renderAddressesTab(container) {
  container.innerHTML = '';

  const title = createEl('h2', {
    className: 'addresses-title',
    textContent: t('account.addresses') || 'آدرس‌ها',
  });
  container.appendChild(title);

  // Add address button
  const addBtn = createEl('button', {
    className: 'btn btn--primary',
    textContent: '+ ' + (t('account.addAddress') || 'افزودن آدرس'),
    attrs: { type: 'button' },
    on: { click: () => showAddAddressForm(container) },
  });
  container.appendChild(addBtn);

  // Load addresses
  const addresses = loadAddresses();

  if (addresses.length === 0) {
    const empty = renderEmptyState({
      title: t('empty.addresses') || 'آدرسی ثبت نشده',
      description: t('empty.addressesHint') || 'هنوز آدرسی ثبت نکرده‌اید',
      icon: 'box',
    });
    container.appendChild(empty);
    return;
  }

  const addressesList = createEl('div', { className: 'addresses-list' });

  addresses.forEach((address, index) => {
    const addressCard = createEl('div', { className: 'address-card' });

    const info = createEl('div', { className: 'address-card__info' });
    info.appendChild(createEl('p', {
      className: 'address-card__name',
      textContent: address.name,
    }));
    info.appendChild(createEl('p', {
      className: 'address-card__phone',
      textContent: address.phone,
    }));
    info.appendChild(createEl('p', {
      className: 'address-card__address',
      textContent: `${address.province}، ${address.city}، ${address.street}`,
    }));
    info.appendChild(createEl('p', {
      className: 'address-card__postal',
      textContent: `کد پستی: ${toPersianDigits(address.postalCode)}`,
    }));
    addressCard.appendChild(info);

    const actions = createEl('div', { className: 'address-card__actions' });
    const deleteBtn = createEl('button', {
      className: 'btn btn--danger btn--sm',
      textContent: t('common.delete') || 'حذف',
      attrs: { type: 'button' },
      on: {
        click: () => {
          deleteAddress(index);
          renderAddressesTab(container);
          showToast({ message: t('address.deleted') || 'آدرس حذف شد', variant: 'success' });
        },
      },
    });
    actions.appendChild(deleteBtn);
    addressCard.appendChild(actions);

    addressesList.appendChild(addressCard);
  });

  container.appendChild(addressesList);
}

/**
 * Show add address form.
 * @param {HTMLElement} container
 */
function showAddAddressForm(container) {
  container.innerHTML = '';

  const title = createEl('h2', {
    className: 'addresses-title',
    textContent: t('account.addAddress') || 'افزودن آدرس',
  });
  container.appendChild(title);

  const form = createEl('form', { className: 'address-form' });

  // Name
  const nameField = createEl('div', { className: 'form-control' });
  nameField.appendChild(createEl('label', { className: 'form-label', textContent: t('address.name') || 'نام گیرنده' }));
  const nameInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'address-name', required: '' },
  });
  nameField.appendChild(nameInput);
  form.appendChild(nameField);

  // Phone
  const phoneField = createEl('div', { className: 'form-control' });
  phoneField.appendChild(createEl('label', { className: 'form-label', textContent: t('address.phone') || 'شماره تماس' }));
  const phoneInput = createEl('input', {
    className: 'input',
    attrs: { type: 'tel', id: 'address-phone', required: '', pattern: '09[0-9]{9}' },
  });
  phoneField.appendChild(phoneInput);
  form.appendChild(phoneField);

  // Province
  const provinceField = createEl('div', { className: 'form-control' });
  provinceField.appendChild(createEl('label', { className: 'form-label', textContent: t('address.province') || 'استان' }));
  const provinceInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'address-province', required: '' },
  });
  provinceField.appendChild(provinceInput);
  form.appendChild(provinceField);

  // City
  const cityField = createEl('div', { className: 'form-control' });
  cityField.appendChild(createEl('label', { className: 'form-label', textContent: t('address.city') || 'شهر' }));
  const cityInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'address-city', required: '' },
  });
  cityField.appendChild(cityInput);
  form.appendChild(cityField);

  // Street
  const streetField = createEl('div', { className: 'form-control' });
  streetField.appendChild(createEl('label', { className: 'form-label', textContent: t('address.street') || 'آدرس' }));
  const streetInput = createEl('textarea', {
    className: 'input',
    attrs: { id: 'address-street', required: '', rows: '3' },
  });
  streetField.appendChild(streetInput);
  form.appendChild(streetField);

  // Postal Code
  const postalField = createEl('div', { className: 'form-control' });
  postalField.appendChild(createEl('label', { className: 'form-label', textContent: t('address.postalCode') || 'کد پستی' }));
  const postalInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'address-postal-code', required: '', pattern: '[0-9]{10}' },
  });
  postalField.appendChild(postalInput);
  form.appendChild(postalField);

  // Buttons
  const actions = createEl('div', { className: 'form-actions' });
  actions.appendChild(createEl('button', {
    className: 'btn btn--ghost',
    textContent: t('common.cancel') || 'انصراف',
    attrs: { type: 'button' },
    on: { click: () => renderAddressesTab(container) },
  }));
  actions.appendChild(createEl('button', {
    className: 'btn btn--primary',
    textContent: t('common.save') || 'ذخیره',
    attrs: { type: 'submit' },
  }));
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const province = provinceInput.value.trim();
    const city = cityInput.value.trim();
    const street = streetInput.value.trim();
    const postalCode = postalInput.value.trim();

    if (!name || !phone || !province || !city || !street || !postalCode) {
      showToast({ message: t('address.fillRequired') || 'لطفاً تمام فیلدها را پر کنید', variant: 'error' });
      return;
    }

    if (!/^09[0-9]{9}$/.test(phone)) {
      showToast({ message: t('validation.phone.invalid') || 'شماره موبایل نامعتبر است', variant: 'error' });
      return;
    }

    if (!/^[0-9]{10}$/.test(postalCode)) {
      showToast({ message: t('validation.postalCode.invalid') || 'کد پستی نامعتبر است', variant: 'error' });
      return;
    }

    saveAddress({ name, phone, province, city, street, postalCode });
    showToast({ message: t('address.added') || 'آدرس با موفقیت اضافه شد', variant: 'success' });
    renderAddressesTab(container);
  });

  container.appendChild(form);
}

/**
 * Load addresses from localStorage.
 * @returns {Array}
 */
function loadAddresses() {
  try {
    const data = localStorageAdapter.getJSON(ADDRESSES_KEY);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Save address to localStorage.
 * @param {Object} address
 */
function saveAddress(address) {
  try {
    const addresses = loadAddresses();
    addresses.push(address);
    localStorageAdapter.setJSON(ADDRESSES_KEY, addresses);
  } catch (err) {
    console.error('Failed to save address:', err);
  }
}

/**
 * Delete address from localStorage.
 * @param {number} index
 */
function deleteAddress(index) {
  try {
    const addresses = loadAddresses();
    addresses.splice(index, 1);
    localStorageAdapter.setJSON(ADDRESSES_KEY, addresses);
  } catch (err) {
    console.error('Failed to delete address:', err);
  }
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

// ===== SECTION 4: Header =====

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

// ===== SECTION 5: Helpers =====

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

// ===== SECTION 6: Start =====

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
