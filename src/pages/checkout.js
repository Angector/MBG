// === FILE: src/pages/checkout.js ===
// Project: Mobogram — Phase 18: Checkout Page
// Purpose: Checkout page logic - multi-step form, address validation, order submission

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, formatPrice, toPersianDigits, initTheme, toggleTheme, initPreloader } from '../utils.js';
import { cartStore, setWishlistCount } from '../state.js';
import { getSession, requireAdmin } from '../services/auth.service.js';
import { placeOrder, getWishlistProductIds } from '../services/shopping.service.js';
import { renderCheckoutSteps } from '../ui/shopping.ui.js';
import { renderImage, renderEmptyState, showToast } from '../ui/primitives.js';

// ===== SECTION 1: State =====

let currentStep = 1;
let addressData = {};

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

    // Check authentication
    const { user } = await getSession();
    if (!user) {
      showToast({ message: t('checkout.loginRequired') || 'لطفاً ابتدا وارد شوید', variant: 'warning' });
      setTimeout(() => {
        window.location.href = `${ROUTES.auth}?redirect=${encodeURIComponent(window.location.pathname)}`;
      }, 1500);
      return;
    }

    // Load wishlist count
    try {
      const wishlistedIds = await getWishlistProductIds();
      setWishlistCount(wishlistedIds.size);
    } catch (err) {
      // Not logged in or error - continue
    }

    // Check if cart is empty
    const cart = cartStore.getState();
    if (!cart.items || cart.items.length === 0) {
      showToast({ message: t('checkout.cartEmpty') || 'سبد خرید شما خالی است', variant: 'warning' });
      setTimeout(() => {
        window.location.href = 'cart.html';
      }, 1500);
      return;
    }

    // Render checkout
    renderCheckout();
  } catch (err) {
    console.error('Failed to initialize checkout page:', err);
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

// ===== SECTION 4: Render Checkout =====

function renderCheckout() {
  const loadingEl = $('#checkout-loading');
  const contentEl = $('#checkout-content');
  const stepsContainer = $('#checkout-steps-container');

  loadingEl.hidden = true;
  contentEl.hidden = false;

  // Render steps
  const steps = renderCheckoutSteps(currentStep);
  stepsContainer.innerHTML = '';
  stepsContainer.appendChild(steps);

  // Render form based on step
  const formContainer = $('#checkout-form-container');
  formContainer.innerHTML = '';

  if (currentStep === 1) {
    renderAddressForm(formContainer);
  } else if (currentStep === 2) {
    renderReviewForm(formContainer);
  }

  // Render order summary
  renderOrderSummary();
}

// ===== SECTION 5: Address Form =====

function renderAddressForm(container) {
  const form = createEl('form', { className: 'checkout-form__form' });

  const section = createEl('div', { className: 'checkout-form__section' });
  section.appendChild(createEl('h2', {
    className: 'checkout-form__title',
    textContent: t('checkout.shippingAddress') || 'آدرس ارسال',
  }));

  // Name
  const nameField = createEl('div', { className: 'form-control' });
  nameField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.customerName') || 'نام و نام خانوادگی' }));
  const nameInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'customer-name', required: '' },
  });
  nameField.appendChild(nameInput);
  section.appendChild(nameField);

  // Phone
  const phoneField = createEl('div', { className: 'form-control' });
  phoneField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.customerPhone') || 'شماره موبایل' }));
  const phoneInput = createEl('input', {
    className: 'input',
    attrs: { type: 'tel', id: 'customer-phone', required: '', pattern: '09[0-9]{9}' },
  });
  phoneField.appendChild(phoneInput);
  section.appendChild(phoneField);

  // Province & City (2 columns)
  const row1 = createEl('div', { className: 'checkout-form__row checkout-form__row--2col' });

  const provinceField = createEl('div', { className: 'form-control' });
  provinceField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.province') || 'استان' }));
  const provinceInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'province', required: '' },
  });
  provinceField.appendChild(provinceInput);
  row1.appendChild(provinceField);

  const cityField = createEl('div', { className: 'form-control' });
  cityField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.city') || 'شهر' }));
  const cityInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'city', required: '' },
  });
  cityField.appendChild(cityInput);
  row1.appendChild(cityField);

  section.appendChild(row1);

  // Street
  const streetField = createEl('div', { className: 'form-control' });
  streetField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.street') || 'آدرس' }));
  const streetInput = createEl('textarea', {
    className: 'input',
    attrs: { id: 'street', required: '', rows: '3' },
  });
  streetField.appendChild(streetInput);
  section.appendChild(streetField);

  // Postal Code
  const postalField = createEl('div', { className: 'form-control' });
  postalField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.postalCode') || 'کد پستی' }));
  const postalInput = createEl('input', {
    className: 'input',
    attrs: { type: 'text', id: 'postal-code', required: '', pattern: '[0-9]{10}' },
  });
  postalField.appendChild(postalInput);
  section.appendChild(postalField);

  // Note (optional)
  const noteField = createEl('div', { className: 'form-control' });
  noteField.appendChild(createEl('label', { className: 'form-label', textContent: t('checkout.customerNote') || 'توضیحات سفارش (اختیاری)' }));
  const noteInput = createEl('textarea', {
    className: 'input',
    attrs: { id: 'customer-note', rows: '2' },
  });
  noteField.appendChild(noteInput);
  section.appendChild(noteField);

  form.appendChild(section);

  // Submit button
  const actions = createEl('div', { className: 'form-actions' });
  actions.appendChild(createEl('button', {
    className: 'btn btn--primary btn--block',
    textContent: t('common.next') || 'مرحله بعد',
    attrs: { type: 'submit' },
  }));
  form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const province = provinceInput.value.trim();
    const city = cityInput.value.trim();
    const street = streetInput.value.trim();
    const postalCode = postalInput.value.trim();
    const note = noteInput.value.trim();

    if (!name || !phone || !province || !city || !street || !postalCode) {
      showToast({ message: t('checkout.fillRequired') || 'لطفاً تمام فیلدهای الزامی را پر کنید', variant: 'error' });
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

    addressData = {
      customerName: name,
      customerPhone: phone,
      address: {
        province,
        city,
        street,
        postalCode,
      },
      customerNote: note || null,
    };

    currentStep = 2;
    renderCheckout();
  });

  container.appendChild(form);
}

// ===== SECTION 6: Review Form =====

function renderReviewForm(container) {
  const form = createEl('div', { className: 'checkout-form__review' });

  // Address summary
  const addressSection = createEl('div', { className: 'checkout-form__section' });
  addressSection.appendChild(createEl('h2', {
    className: 'checkout-form__title',
    textContent: t('checkout.shippingAddress') || 'آدرس ارسال',
  }));

  const addressInfo = createEl('div', { className: 'checkout-review__address' });
  addressInfo.appendChild(createEl('p', { textContent: addressData.customerName }));
  addressInfo.appendChild(createEl('p', { textContent: addressData.customerPhone }));
  addressInfo.appendChild(createEl('p', {
    textContent: `${addressData.address.province}، ${addressData.address.city}، ${addressData.address.street}`,
  }));
  addressInfo.appendChild(createEl('p', { textContent: `کد پستی: ${toPersianDigits(addressData.address.postalCode)}` }));
  if (addressData.customerNote) {
    addressInfo.appendChild(createEl('p', { textContent: `توضیحات: ${addressData.customerNote}` }));
  }
  addressSection.appendChild(addressInfo);

  const editBtn = createEl('button', {
    className: 'btn btn--link',
    textContent: t('common.edit') || 'ویرایش',
    attrs: { type: 'button' },
    on: { click: () => { currentStep = 1; renderCheckout(); } },
  });
  addressSection.appendChild(editBtn);

  form.appendChild(addressSection);

  // Submit button
  const actions = createEl('div', { className: 'form-actions' });
  const submitBtn = createEl('button', {
    className: 'btn btn--primary btn--block',
    textContent: t('checkout.placeOrder') || 'ثبت سفارش',
    attrs: { type: 'button' },
    on: { click: () => handleSubmit(submitBtn) },
  });
  actions.appendChild(submitBtn);
  form.appendChild(actions);

  container.appendChild(form);
}

// ===== SECTION 7: Order Summary =====

function renderOrderSummary() {
  const itemsContainer = $('#order-summary-items');
  const subtotalEl = $('#order-subtotal');
  const totalEl = $('#order-total');
  const discountRowEl = $('#order-discount-row');
  const discountEl = $('#order-discount');

  const { items, subtotal } = cartStore.getDerived();

  itemsContainer.innerHTML = '';
  items.forEach((item) => {
    const itemEl = createEl('div', { className: 'order-summary__item' });

    const imageWrap = createEl('div', { className: 'order-summary__item-image' });
    const img = renderImage({
      url: item.imageUrl || null,
      alt: item.productName,
      aspectRatio: '1/1',
    });
    img.style.width = '100%';
    img.style.height = '100%';
    imageWrap.appendChild(img);
    itemEl.appendChild(imageWrap);

    const details = createEl('div', { className: 'order-summary__item-details' });
    details.appendChild(createEl('div', {
      className: 'order-summary__item-name',
      textContent: item.productName,
    }));
    details.appendChild(createEl('div', {
      className: 'order-summary__item-variant',
      textContent: `${item.storage} - ${item.color} × ${toPersianDigits(item.qty)}`,
    }));
    itemEl.appendChild(details);

    const price = createEl('div', {
      className: 'order-summary__item-price',
      textContent: formatPrice(item.unitPrice * item.qty),
    });
    itemEl.appendChild(price);

    itemsContainer.appendChild(itemEl);
  });

  subtotalEl.textContent = formatPrice(subtotal);

  // Check for coupon discount (from localStorage or session)
  const couponDiscount = 0; // TODO: Implement coupon persistence
  if (couponDiscount > 0) {
    discountRowEl.hidden = false;
    discountEl.textContent = `- ${formatPrice(couponDiscount)}`;
    totalEl.textContent = formatPrice(subtotal - couponDiscount);
  } else {
    discountRowEl.hidden = true;
    totalEl.textContent = formatPrice(subtotal);
  }
}

// ===== SECTION 8: Submit Order =====

async function handleSubmit(submitBtn) {
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.textContent = t('common.loading') || 'در حال پردازش...';

  try {
    const cart = cartStore.getState();

    const orderData = {
      items: cart.items.map((item) => ({
        variantId: item.variantId,
        qty: item.qty,
      })),
      ...addressData,
    };

    const order = await placeOrder(orderData);

    // Clear cart
    cartStore.clear();

    showToast({
      message: t('checkout.orderPlaced') || 'سفارش شما با موفقیت ثبت شد',
      variant: 'success',
    });

    // Redirect to account orders
    setTimeout(() => {
      window.location.href = 'account.html?tab=orders';
    }, 1500);
  } catch (err) {
    console.error('Failed to place order:', err);
    showToast({ message: err.message || t('errors.orderFailed') || 'خطا در ثبت سفارش', variant: 'error' });

    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    submitBtn.textContent = t('checkout.placeOrder') || 'ثبت سفارش';
  }
}

// ===== SECTION 9: Start =====

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
