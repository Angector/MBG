// === FILE: src/config.js ===
// Project: Mobogram — Phase 5: JavaScript Substrate
// Purpose: Single source of truth for Supabase client, constants, and design token mirrors

// ===== SECTION: Imports =====

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===== SECTION: Supabase Credentials =====

/**
 * Supabase project URL
 * @type {string}
 */
export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';

/**
 * Supabase anon (publishable) key
 * ⚠️ WARNING: Replace with your actual anon key from Supabase Dashboard.
 * ⚠️ NEVER use the service_role key here. The anon key is safe to expose
 * because all access is gated by RLS policies.
 * @type {string}
 */
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// ===== SECTION: Supabase Client =====

/**
 * Supabase client instance
 * @type {import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient}
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'mobogram.auth',
  },
});

// ===== SECTION: Site Identity =====

/**
 * Site identity and metadata
 * @type {Readonly<{
 *   name: string,
 *   nameLatin: string,
 *   tagline: string,
 *   defaultLocale: string,
 *   supportedLocales: string[],
 *   currency: string,
 *   currencyLabel: string,
 *   supportEmail: string,
 *   supportPhone: string|null
 * }>}
 */
export const SITE = Object.freeze({
  name: 'موبوگرام',
  nameLatin: 'Mobogram',
  tagline: 'فروشگاه گوشی موبایل',
  defaultLocale: 'fa',
  supportedLocales: Object.freeze(['fa']),
  currency: 'IRT',
  currencyLabel: 'تومان',
  supportEmail: 'support@mobogram.example',
  supportPhone: null,
});

// ===== SECTION: Storage Buckets =====

/**
 * Supabase Storage bucket names
 * @type {Readonly<{
 *   products: string,
 *   banners: string,
 *   brands: string
 * }>}
 */
export const BUCKETS = Object.freeze({
  products: 'products',
  banners: 'banners',
  brands: 'brands',
});

// ===== SECTION: Database Tables =====

/**
 * Database table names
 * @type {Readonly<{
 *   profiles: string,
 *   brands: string,
 *   products: string,
 *   productVariants: string,
 *   wishlists: string,
 *   orders: string,
 *   orderItems: string,
 *   banners: string,
 *   siteSettings: string
 * }>}
 */
export const TABLES = Object.freeze({
  profiles: 'profiles',
  brands: 'brands',
  products: 'products',
  productVariants: 'product_variants',
  wishlists: 'wishlists',
  orders: 'orders',
  orderItems: 'order_items',
  banners: 'banners',
  siteSettings: 'site_settings',
});

// ===== SECTION: Roles =====

/**
 * User roles
 * @type {Readonly<{
 *   admin: string,
 *   customer: string
 * }>}
 */
export const ROLES = Object.freeze({
  admin: 'admin',
  customer: 'customer',
});

// ===== SECTION: Order Statuses =====

/**
 * Order status values
 * @type {Readonly<{
 *   pending: string,
 *   confirmed: string,
 *   shipped: string,
 *   delivered: string,
 *   cancelled: string
 * }>}
 */
export const ORDER_STATUS = Object.freeze({
  pending: 'pending',
  confirmed: 'confirmed',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
});

// ===== SECTION: Pagination =====

/**
 * Default page sizes for different contexts
 * @type {Readonly<{
 *   products: number,
 *   wishlist: number,
 *   orders: number,
 *   admin: number
 * }>}
 */
export const PAGE_SIZE = Object.freeze({
  products: 12,
  wishlist: 20,
  orders: 10,
  admin: 20,
});

/**
 * Pagination configuration
 * @type {Readonly<{
 *   defaultPage: number,
 *   maxPageSize: number
 * }>}
 */
export const PAGINATION = Object.freeze({
  defaultPage: 1,
  maxPageSize: 100,
});

// ===== SECTION: Cart =====

/**
 * Cart configuration
 * @type {Readonly<{
 *   storageKey: string,
 *   maxItems: number,
 *   maxQtyPerItem: number,
 *   schemaVersion: number
 * }>}
 */
export const CART = Object.freeze({
  storageKey: 'mobogram.cart',
  maxItems: 50,
  maxQtyPerItem: 10,
  schemaVersion: 1,
});

// ===== SECTION: Wishlist & Auth Cache =====

/**
 * LocalStorage key for wishlist cache
 * @type {string}
 */
export const WISHLIST_CACHE_KEY = 'mobogram.wishlist';

/**
 * LocalStorage key for auth session
 * @type {string}
 */
export const AUTH_STORAGE_KEY = 'mobogram.auth';

/**
 * LocalStorage key for locale preference
 * @type {string}
 */
export const LOCALE_STORAGE_KEY = 'mobogram.locale';

// ===== SECTION: Validation Rules =====

/**
 * Validation constraints for forms and data
 * @type {Readonly<{
 *   email: Readonly<{ maxLength: number, pattern: RegExp }>,
 *   password: Readonly<{ minLength: number, maxLength: number }>,
 *   fullName: Readonly<{ minLength: number, maxLength: number }>,
 *   phone: Readonly<{ pattern: RegExp }>,
 *   productTitle: Readonly<{ minLength: number, maxLength: number }>,
 *   productSlug: Readonly<{ pattern: RegExp }>,
 *   variantSku: Readonly<{ minLength: number, maxLength: number }>,
 *   storageOptions: string[],
 *   colorName: Readonly<{ minLength: number, maxLength: number }>,
 *   quantity: Readonly<{ min: number, max: number }>,
 *   price: Readonly<{ min: number, max: number }>,
 *   stock: Readonly<{ min: number, max: number }>
 * }>}
 */
export const VALIDATION = Object.freeze({
  email: Object.freeze({
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  }),
  password: Object.freeze({
    minLength: 8,
    maxLength: 72,
  }),
  fullName: Object.freeze({
    minLength: 2,
    maxLength: 100,
  }),
  phone: Object.freeze({
    pattern: /^09\d{9}$/,
  }),
  productTitle: Object.freeze({
    minLength: 2,
    maxLength: 200,
  }),
  productSlug: Object.freeze({
    pattern: /^[a-z0-9-]{2,120}$/,
  }),
  variantSku: Object.freeze({
    minLength: 3,
    maxLength: 40,
  }),
  storageOptions: Object.freeze(['64GB', '128GB', '256GB', '512GB', '1TB']),
  colorName: Object.freeze({
    minLength: 2,
    maxLength: 40,
  }),
  quantity: Object.freeze({
    min: 1,
    max: 99,
  }),
  price: Object.freeze({
    min: 0,
    max: 500_000_000,
  }),
  stock: Object.freeze({
    min: 0,
    max: 100_000,
  }),
});

// ===== SECTION: Upload Constraints =====

/**
 * File upload configuration
 * @type {Readonly<{
 *   maxSizeBytes: number,
 *   maxSizeLabel: string,
 *   acceptedMimeTypes: string[],
 *   convertToWebp: boolean,
 *   webpQuality: number,
 *   maxDimension: number,
 *   thumbnailDimension: number
 * }>}
 */
export const UPLOAD = Object.freeze({
  maxSizeBytes: 5 * 1024 * 1024,
  maxSizeLabel: '5MB',
  acceptedMimeTypes: Object.freeze([
    'image/webp',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
  ]),
  convertToWebp: true,
  webpQuality: 0.85,
  maxDimension: 2000,
  thumbnailDimension: 400,
});

// ===== SECTION: Breakpoints =====

/**
 * Responsive breakpoints (mirror of CSS media queries)
 * @type {Readonly<{
 *   xs: number,
 *   sm: number,
 *   md: number,
 *   lg: number,
 *   xl: number,
 *   xxl: number
 * }>}
 */
export const BREAKPOINTS = Object.freeze({
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1200,
  xxl: 1440,
});

// ===== SECTION: Motion Mirrors =====

/**
 * Motion timing values (mirror of tokens.css)
 * @type {Readonly<{
 *   duration: Readonly<{
 *     instant: number,
 *     fast: number,
 *     normal: number,
 *     slow: number,
 *     slower: number
 *   }>,
 *   revealStaggerStep: number,
 *   revealThreshold: number,
 *   toastDefaultDuration: number,
 *   toastMaxVisible: number,
 *   countUpDefaultDuration: number,
 *   flyToCartDuration: number,
 *   debounceSearch: number,
 *   throttleScroll: number
 * }>}
 */
export const MOTION = Object.freeze({
  duration: Object.freeze({
    instant: 80,
    fast: 160,
    normal: 240,
    slow: 360,
    slower: 480,
  }),
  revealStaggerStep: 60,
  revealThreshold: 0.15,
  toastDefaultDuration: 4000,
  toastMaxVisible: 3,
  countUpDefaultDuration: 900,
  flyToCartDuration: 480,
  debounceSearch: 300,
  throttleScroll: 100,
});

// ===== SECTION: Route Paths =====

/**
 * Application route paths
 * @type {Readonly<{
 *   home: string,
 *   products: string,
 *   product: string,
 *   cart: string,
 *   checkout: string,
 *   account: string,
 *   auth: string,
 *   adminLogin: string,
 *   adminDashboard: string,
 *   adminProducts: string,
 *   adminBanners: string,
 *   adminSettings: string
 * }>}
 */
export const ROUTES = Object.freeze({
  home: 'index.html',
  products: 'pages/products.html',
  product: 'pages/product.html',
  cart: 'pages/cart.html',
  checkout: 'pages/checkout.html',
  account: 'pages/account.html',
  auth: 'pages/auth.html',
  adminLogin: 'admin/login.html',
  adminDashboard: 'admin/dashboard.html',
  adminProducts: 'admin/products.html',
  adminBanners: 'admin/banners.html',
  adminSettings: 'admin/settings.html',
});

// ===== SECTION: Logger Levels =====

/**
 * Log level priorities
 * @type {Readonly<{
 *   debug: number,
 *   info: number,
 *   warn: number,
 *   error: number,
 *   silent: number
 * }>}
 */
export const LOG_LEVELS = Object.freeze({
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
});

/**
 * Default log level (can be overridden via window.__MOBOGRAM_LOG_LEVEL__)
 * @type {string}
 */
export const DEFAULT_LOG_LEVEL = 'info';

// ===== SECTION: Env Flags =====

/**
 * Environment detection flags
 * @type {Readonly<{
 *   isDev: boolean,
 *   isTest: boolean
 * }>}
 */
export const ENV = Object.freeze({
  isDev:
    typeof location !== 'undefined' &&
    /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname),
  isTest: false,
});
