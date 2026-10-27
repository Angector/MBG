// === FILE: src/i18n.js ===
// Project: Mobogram — Phase 6: Internationalization
// Purpose: Minimal, dependency-free i18n layer. Persian-first.

// ===== SECTION: Imports & setup =====

import { SITE, LOCALE_STORAGE_KEY } from './config.js';
import { localStorageAdapter } from './utils.js';

/** @type {string} Current active locale */
let currentLocale = 'fa';
try {
  const stored = localStorageAdapter.get(LOCALE_STORAGE_KEY);
  if (stored && SITE.supportedLocales.includes(stored)) {
    currentLocale = stored;
  }
} catch {
  currentLocale = SITE.defaultLocale;
}

/** @type {Array<(locale: string) => void>} */
const localeListeners = [];

// ===== SECTION: Dictionaries =====

/**
 * Flat dictionaries keyed by locale. Keys use dot-notation namespacing.
 * Placeholders use {name} syntax.
 */
const DICTIONARIES = {
  fa: {
    // common.*
    'common.ok': 'تأیید',
    'common.cancel': 'انصراف',
    'common.confirm': 'تأیید می‌کنید؟',
    'common.save': 'ذخیره',
    'common.delete': 'حذف',
    'common.edit': 'ویرایش',
    'common.add': 'افزودن',
    'common.remove': 'حذف',
    'common.close': 'بستن',
    'common.back': 'بازگشت',
    'common.next': 'بعدی',
    'common.previous': 'قبلی',
    'common.search': 'جستجو',
    'common.filter': 'فیلتر',
    'common.sort': 'مرتب‌سازی',
    'common.apply': 'اعمال',
    'common.reset': 'بازنشانی',
    'common.clear': 'پاک کردن',
    'common.loading': 'در حال بارگذاری…',
    'common.retry': 'تلاش مجدد',
    'common.more': 'بیشتر',
    'common.seeAll': 'مشاهده همه',
    'common.noResults': 'نتیجه‌ای یافت نشد',
    'common.error': 'خطا',
    'common.success': 'موفق',
    'common.warning': 'هشدار',
    'common.info': 'اطلاعات',
    'common.optional': 'اختیاری',
    'common.required': 'اجباری',
    'common.yes': 'بله',
    'common.no': 'خیر',
    'common.copy': 'کپی',
    'common.copied': 'کپی شد',
    'common.share': 'اشتراک‌گذاری',

    // errors.*
    'errors.validation': 'لطفاً اطلاعات را بررسی کنید',
    'errors.auth': 'احراز هویت ناموفق بود',
    'errors.permission': 'اجازه دسترسی ندارید',
    'errors.notFound': 'مورد موردنظر یافت نشد',
    'errors.network': 'خطا در اتصال به سرور',
    'errors.conflict': 'تداخل در اطلاعات',
    'errors.rateLimit': 'تعداد درخواست‌ها بیش از حد مجاز است',
    'errors.internal': 'خطای داخلی رخ داد',
    'errors.unknown': 'خطای ناشناخته',
    'errors.emailNotConfirmed': 'لطفاً ابتدا ایمیل خود را تأیید کنید',

    // validation.*
    'validation.required': 'این فیلد الزامی است',
    'validation.email.invalid': 'فرمت ایمیل نامعتبر است',
    'validation.email.required': 'ایمیل الزامی است',
    'validation.password.short': 'رمز عبور باید حداقل ۸ کاراکتر باشد',
    'validation.password.required': 'رمز عبور الزامی است',
    'validation.password.mismatch': 'رمزهای عبور مطابقت ندارند',
    'validation.phone.invalid': 'شماره موبایل نامعتبر است',
    'validation.postalCode.invalid': 'کد پستی نامعتبر است',
    'validation.length.min': 'تعداد کاراکترها کمتر از حد مجاز است',
    'validation.length.max': 'تعداد کاراکترها بیش از حد مجاز است',
    'validation.quantity.min': 'حداقل تعداد مجاز ۱ است',
    'validation.quantity.max': 'حداکثر تعداد مجاز ۹۹ است',
    'validation.price.invalid': 'قیمت نامعتبر است',
    'validation.stock.invalid': 'موجودی نامعتبر است',
    'validation.fullName.short': 'نام باید حداقل ۲ حرف باشد',

    // nav.*
    'nav.home': 'خانه',
    'nav.products': 'محصولات',
    'nav.cart': 'سبد خرید',
    'nav.wishlist': 'علاقه‌مندی‌ها',
    'nav.account': 'حساب کاربری',
    'nav.login': 'ورود',
    'nav.logout': 'خروج',
    'nav.register': 'ثبت‌نام',
    'nav.admin': 'مدیریت',
    'nav.search': 'جستجو',

    // site.*
    'site.brandName': SITE.name,
    'site.tagline': SITE.tagline,
    'site.copyright': '© {year} {brand}. تمامی حقوق محفوظ است.',

    // product.*
    'product.addToCart': 'افزودن به سبد خرید',
    'product.outOfStock': 'ناموجود',
    'product.inStock': 'موجود',
    'product.lowStock': 'فقط {count} عدد باقی مانده',
    'product.price': 'قیمت',
    'product.priceFrom': 'شروع از',
    'product.discount': '{percent} تخفیف',
    'product.storage': 'حافظه',
    'product.color': 'رنگ',
    'product.ram': 'رم',
    'product.quantity': 'تعداد',
    'product.specs': 'مشخصات فنی',
    'product.description': 'توضیحات',
    'product.brand': 'برند',
    'product.selectStorage': 'انتخاب حافظه',
    'product.selectColor': 'انتخاب رنگ',
    'product.selectVariant': 'انتخاب مدل',
    'product.addedToCart': 'به سبد خرید اضافه شد',
    'product.removeFromCart': 'حذف از سبد',
    'product.viewDetails': 'مشاهده جزئیات',
    'product.relatedProducts': 'محصولات مرتبط',

    // cart.*
    'cart.title': 'سبد خرید',
    'cart.empty': 'سبد خرید شما خالی است',
    'cart.emptyHint': 'محصولات مورد علاقه خود را به سبد اضافه کنید',
    'cart.subtotal': 'جمع کل',
    'cart.total': 'مبلغ قابل پرداخت',
    'cart.deliveryNote': 'هزینه ارسال در مرحله بعد محاسبه می‌شود',
    'cart.checkout': 'تکمیل خرید',
    'cart.continueShopping': 'ادامه خرید',
    'cart.removeItem': 'حذف محصول',
    'cart.itemCount': '{count} کالا',
    'cart.qtyDecrease': 'کاهش تعداد',
    'cart.qtyIncrease': 'افزایش تعداد',
    'cart.clearCart': 'پاک کردن سبد',

    // wishlist.*
    'wishlist.title': 'علاقه‌مندی‌ها',
    'wishlist.empty': 'لیست علاقه‌مندی شما خالی است',
    'wishlist.emptyHint': 'محصولات مورد علاقه خود را ذخیره کنید',
    'wishlist.added': 'به علاقه‌مندی‌ها اضافه شد',
    'wishlist.removed': 'از علاقه‌مندی‌ها حذف شد',
    'wishlist.loginToSave': 'برای ذخیره وارد حساب کاربری شوید',

    // auth.*
    'auth.login': 'ورود',
    'auth.register': 'ثبت‌نام',
    'auth.logout': 'خروج',
    'auth.email': 'ایمیل',
    'auth.password': 'رمز عبور',
    'auth.confirmPassword': 'تکرار رمز عبور',
    'auth.fullName': 'نام و نام خانوادگی',
    'auth.forgotPassword': 'فراموشی رمز عبور',
    'auth.noAccount': 'حساب کاربری ندارید؟',
    'auth.haveAccount': 'حساب کاربری دارید؟',
    'auth.loginSuccess': 'با موفقیت وارد شدید',
    'auth.registerSuccess': 'ثبت‌نام با موفقیت انجام شد',
    'auth.logoutSuccess': 'با موفقیت خارج شدید',
    'auth.invalidCredentials': 'ایمیل یا رمز عبور نامعتبر است',
    'auth.emailNotConfirmed': 'لطفاً ابتدا ایمیل خود را تأیید کنید',

    // account.*
    'account.title': 'حساب کاربری',
    'account.profile': 'پروفایل',
    'account.orders': 'سفارش‌ها',
    'account.wishlist': 'علاقه‌مندی‌ها',
    'account.address': 'آدرس‌ها',
    'account.settings': 'تنظیمات',
    'account.updateProfile': 'به‌روزرسانی پروفایل',
    'account.changePassword': 'تغییر رمز عبور',
    'account.noOrders': 'هنوز سفارشی ثبت نکرده‌اید',
    'account.noOrdersHint': 'اولین سفارش خود را ثبت کنید',
    'account.orderStatus.pending': 'در انتظار تأیید',
    'account.orderStatus.confirmed': 'تأیید شده',
    'account.orderStatus.shipped': 'ارسال شده',
    'account.orderStatus.delivered': 'تحویل شده',
    'account.orderStatus.cancelled': 'لغو شده',

    // checkout.*
    'checkout.title': 'تکمیل خرید',
    'checkout.contactInfo': 'اطلاعات تماس',
    'checkout.shippingAddress': 'آدرس ارسال',
    'checkout.shippingMethod': 'روش ارسال',
    'checkout.paymentMethod': 'روش پرداخت',
    'checkout.orderReview': 'بررسی سفارش',
    'checkout.orderSummary': 'خلاصه سفارش',
    'checkout.placeOrder': 'ثبت سفارش',
    'checkout.orderPlaced': 'سفارش شما با موفقیت ثبت شد',
    'checkout.orderPlacedHint': 'کد پیگیری: {orderId}',
    'checkout.province': 'استان',
    'checkout.city': 'شهر',
    'checkout.street': 'آدرس',
    'checkout.postalCode': 'کد پستی',
    'checkout.unit': 'پلاک/واحد',
    'checkout.customerName': 'نام و نام خانوادگی',
    'checkout.customerPhone': 'شماره موبایل',
    'checkout.customerNote': 'توضیحات سفارش',
    'checkout.deliveryEstimate': 'زمان تحویل: {days} روز کاری',
    'checkout.paymentNote': 'پرداخت امن از طریق درگاه بانکی',
    'checkout.confirmOrder': 'تأیید و پرداخت',

    // admin.*
    'admin.dashboard': 'داشبورد',
    'admin.products': 'محصولات',
    'admin.banners': 'بنرها',
    'admin.settings': 'تنظیمات',
    'admin.brands': 'برندها',
    'admin.addProduct': 'افزودن محصول',
    'admin.editProduct': 'ویرایش محصول',
    'admin.deleteProduct': 'حذف محصول',
    'admin.confirmDelete': 'آیا از حذف این مورد مطمئن هستید؟',
    'admin.uploadImage': 'آپلود تصویر',
    'admin.replaceImage': 'جایگزینی تصویر',
    'admin.removeImage': 'حذف تصویر',
    'admin.dragToReorder': 'برای تغییر ترتیب، بکشید',
    'admin.saving': 'در حال ذخیره…',
    'admin.saved': 'ذخیره شد',
    'admin.saveFailed': 'خطا در ذخیره',
    'admin.bulkActions': 'عملیات گروهی',
    'admin.search': 'جستجو',
    'admin.filter': 'فیلتر',
    'admin.status.active': 'فعال',
    'admin.status.inactive': 'غیرفعال',
    'admin.stock': 'موجودی',
    'admin.sku': 'کد محصول',
    'admin.variants': 'مدل‌ها',
    'admin.addVariant': 'افزودن مدل',
    'admin.removeVariant': 'حذف مدل',
    'admin.brand': 'برند',
    'admin.uploadLogo': 'آپلود لوگو',
    'admin.siteLogo': 'لوگوی سایت',
    'admin.brandName': 'نام برند',
    'admin.supportEmail': 'ایمیل پشتیبانی',
    'admin.supportPhone': 'تلفن پشتیبانی',
    'admin.settingsSaved': 'تنظیمات با موفقیت ذخیره شد',
    'admin.settingsSaveFailed': 'خطا در ذخیره تنظیمات',

    // footer.*
    'footer.about': 'درباره ما',
    'footer.contact': 'تماس با ما',
    'footer.faq': 'سؤالات متداول',
    'footer.shipping': 'شرایط ارسال',
    'footer.returns': 'بازگشت کالا',
    'footer.privacy': 'حریم خصوصی',
    'footer.terms': 'قوانین و مقررات',
    'footer.followUs': 'ما را دنبال کنید',
    'footer.newsletter': 'خبرنامه',
    'footer.subscribePlaceholder': 'ایمیل خود را وارد کنید',
    'footer.subscribe': 'عضویت',
    'footer.quickLinks': 'دسترسی سریع',
    'footer.customerService': 'خدمات مشتریان',

    // empty.*
    'empty.products': 'محصولی یافت نشد',
    'empty.productsHint': 'فیلترها را تغییر دهید',
    'empty.cart': 'سبد خرید خالی است',
    'empty.cartHint': 'محصولات را به سبد اضافه کنید',
    'empty.wishlist': 'لیست علاقه‌مندی خالی است',
    'empty.wishlistHint': 'محصولات را به علاقه‌مندی اضافه کنید',
    'empty.orders': 'سفارشی ثبت نشده',
    'empty.ordersHint': 'اولین سفارش خود را ثبت کنید',
    'empty.search': 'نتیجه‌ای یافت نشد',
    'empty.searchHint': 'عبارت دیگری را جستجو کنید',

    // placeholders.*
    'placeholders.searchProducts': 'جستجوی محصول…',
    'placeholders.email': 'ایمیل',
    'placeholders.password': 'رمز عبور',
    'placeholders.fullName': 'نام و نام خانوادگی',
    'placeholders.phone': 'شماره موبایل',
    'placeholders.note': 'توضیحات (اختیاری)',

    // time.*
    'time.justNow': 'همین الان',
    'time.minutesAgo': '{count} دقیقه پیش',
    'time.hoursAgo': '{count} ساعت پیش',
    'time.daysAgo': '{count} روز پیش',
    'time.yesterday': 'دیروز',
    'time.today': 'امروز',

    // formats.*
    'formats.currency': 'تومان',
    'formats.currencyShort': 'ت',
    'formats.thousandsSeparator': '٬',
    'formats.dateSeparator': '/',
  },
};

// ===== SECTION: Translation function =====

/** @type {Set<string>} Track missing keys to warn only once */
const warnedKeys = new Set();

/**
 * Translate a key with {placeholder} interpolation.
 * Missing keys return `⟦key⟧` in dev, or last segment in production.
 * @param {string} key - dot-notation key
 * @param {Object<string,string|number>} [vars] - interpolation values
 * @returns {string}
 * @example t('site.tagline')
 * @example t('product.lowStock', { count: '۳' })
 */
export function t(key, vars = {}) {
  const dict = DICTIONARIES[currentLocale];
  let value = dict ? dict[key] : undefined;

  if (value === undefined) {
    if (ENV.isDev) {
      if (!warnedKeys.has(key)) {
        warnedKeys.add(key);
        // Deliberate console.warn — documented exception to avoid coupling with logger
        console.warn(`[i18n] Missing key: ${key}`);
      }
      return `⟦${key}⟧`;
    }
    // Production fallback: last segment
    const parts = key.split('.');
    return parts[parts.length - 1];
  }

  return interpolate(value, vars);
}

// ===== SECTION: Locale management =====

/**
 * Get current locale.
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Check if locale is supported.
 * @param {string} locale
 * @returns {boolean}
 */
export function isSupported(locale) {
  return SITE.supportedLocales.includes(locale);
}

/**
 * Set current locale. Persists, updates <html>, dispatches event.
 * @param {string} locale
 * @throws {Error} if locale is not supported
 */
export function setLocale(locale) {
  if (!isSupported(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  currentLocale = locale;
  try {
    localStorageAdapter.set(LOCALE_STORAGE_KEY, locale);
  } catch {}
  if (typeof document !== 'undefined') {
    applyDocumentLang();
    applyTranslations();
    document.dispatchEvent(
      new CustomEvent('mobogram:localechange', { detail: { locale } })
    );
  }
  for (const handler of localeListeners) {
    try { handler(locale); } catch {}
  }
}

/**
 * Subscribe to locale changes.
 * @param {(locale: string) => void} handler
 * @returns {() => void} unsubscribe function
 */
export function onLocaleChange(handler) {
  localeListeners.push(handler);
  return () => {
    const idx = localeListeners.indexOf(handler);
    if (idx >= 0) localeListeners.splice(idx, 1);
  };
}

/**
 * Get text direction for a locale.
 * @param {string} [locale=getLocale()]
 * @returns {'rtl'|'ltr'}
 */
export function getDirection(locale = getLocale()) {
  const rtlLocales = ['fa', 'ar', 'he', 'ur'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

// ===== SECTION: Bulk DOM translation =====

/**
 * Scan DOM subtree and apply translations. Idempotent.
 * @param {ParentNode} [root=document]
 */
export function applyTranslations(root = document) {
  if (typeof document === 'undefined') return;

  // data-i18n → textContent
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  }

  // data-i18n-html → innerHTML
  for (const el of root.querySelectorAll('[data-i18n-html]')) {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  }

  // data-i18n-attr → setAttribute
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) continue;
    for (const pair of spec.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }

  // data-i18n-title
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  }

  // data-i18n-placeholder
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  }

  // data-i18n-aria-label
  for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  }
}

/**
 * Update <html lang> and <html dir> to current locale.
 */
export function applyDocumentLang() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('lang', currentLocale);
  html.setAttribute('dir', getDirection(currentLocale));
}

// ===== SECTION: Helpers =====

/**
 * Check if a key exists in current dictionary.
 * @param {string} key
 * @returns {boolean}
 */
export function hasKey(key) {
  const dict = DICTIONARIES[currentLocale];
  return dict ? key in dict : false;
}

/**
 * Interpolate {placeholders} in a template string.
 * Missing vars remain as `{name}` literal in dev, empty string in prod.
 * @param {string} template
 * @param {Object<string,string|number>} vars
 * @returns {string}
 */
export function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (name in vars) return String(vars[name]);
    return ENV.isDev ? match : '';
  });
}

/**
 * List all keys under a namespace prefix.
 * @param {string} [prefix='']
 * @returns {string[]}
 */
export function listKeys(prefix = '') {
  const dict = DICTIONARIES[currentLocale];
  if (!dict) return [];
  return Object.keys(dict).filter((k) => k.startsWith(prefix));
}

// ===== Initial DOM application =====

if (typeof document !== 'undefined') {
  applyDocumentLang();
}
