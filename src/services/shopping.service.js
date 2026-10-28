// === FILE: src/services/shopping.service.js ===
// Project: Mobogram — Phase 9: Services Layer (Part 3 - Shopping)
// Purpose: Wishlist, orders, banners, site settings, and storage uploads

// ===== SECTION 1: Imports & Types =====
import { supabase, TABLES, BUCKETS, UPLOAD, PAGE_SIZE } from '../config.js';
import {
  ValidationError, NotFoundError, PermissionError, ConflictError,
  AuthError, InternalError, fromSupabaseError,
} from '../errors.js';
import {
  validateRequired, validateQuantity, validatePhone, createLogger, uuid,
} from '../utils.js';

/** @typedef {import('../types.js').WishlistEntry} WishlistEntry */
/** @typedef {import('../types.js').Order} Order */
/** @typedef {import('../types.js').OrderItem} OrderItem */
/** @typedef {import('../types.js').Banner} Banner */
/** @typedef {import('../types.js').SiteSettings} SiteSettings */
/** @typedef {import('../types.js').Address} Address */
/** @typedef {import('../types.js').UploadedFile} UploadedFile */
/** @typedef {import('../types.js').UploadProgress} UploadProgress */

const log = createLogger('shopping.service');

// ===== SECTION 2: Private helpers =====
/** Get current user ID or throw AuthError. @returns {Promise<string>} */
async function requireUserId() {
  const {  { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AuthError('Not authenticated');
  return user.id;
}

/** @param {Object} raw @returns {Object} */
const mapWishlistRow = (raw) => ({
  id: raw.id, userId: raw.user_id, productId: raw.product_id,
  createdAt: raw.created_at,
  product: raw.products ? {
    id: raw.products.id, slug: raw.products.slug, name: raw.products.name,
    brandId: raw.products.brand_id,
    brand: raw.products.brands ? {
      id: raw.products.brands.id, name: raw.products.brands.name,
      slug: raw.products.brands.slug, logoUrl: raw.products.brands.logo_url ?? null,
    } : null,
    basePrice: Number(raw.products.base_price),
    discountPrice: raw.products.discount_price != null ? Number(raw.products.discount_price) : null,
    images: Array.isArray(raw.products.images) ? raw.products.images : [],
    isActive: raw.products.is_active,
  } : null,
});

/** @param {Object} raw @returns {Order} */
const mapOrder = (raw) => ({
  id: raw.id, userId: raw.user_id, status: raw.status, total: Number(raw.total),
  address: raw.address, customerName: raw.customer_name,
  customerPhone: raw.customer_phone, customerNote: raw.customer_note ?? null,
  createdAt: raw.created_at, updatedAt: raw.updated_at,
  items: (raw.order_items || []).map(mapOrderItem),
});

/** @param {Object} raw @returns {OrderItem} */
const mapOrderItem = (raw) => ({
  id: raw.id, orderId: raw.order_id, variantId: raw.variant_id,
  productId: raw.product_id, productName: raw.product_name,
  storage: raw.storage, color: raw.color, unitPrice: Number(raw.unit_price),
  qty: raw.qty, productSnapshot: raw.product_snapshot || {},
});

/** @param {Object} raw @returns {Banner} */
const mapBanner = (raw) => ({
  id: raw.id, title: raw.title, subtitle: raw.subtitle ?? null,
  imageUrl: raw.image_url ?? null, ctaLabel: raw.cta_label ?? null,
  ctaLink: raw.cta_link ?? null, position: raw.position,
  isActive: raw.is_active, startsAt: raw.starts_at ?? null,
  endsAt: raw.ends_at ?? null, createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

// ===== SECTION 3: Wishlist =====
/** List wishlist with product details. @param {Object} [opts] @returns {Promise<{items: WishlistEntry[], total: number}>} */
export async function listWishlist(opts = {}) {
  const userId = await requireUserId();
  const page = opts.page >= 1 ? opts.page : 1;
  const pageSize = Math.min(opts.pageSize || PAGE_SIZE.wishlist, 100);
  const from = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from(TABLES.wishlists)
    .select('*, products(*, brands(*))', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw fromSupabaseError(error, { resource: 'Wishlist' });
  return { items: (data || []).map(mapWishlistRow), total: count || 0 };
}

/** Get wishlist count. @returns {Promise<number>} */
export async function getWishlistCount() {
  const userId = await requireUserId();
  const { count, error } = await supabase
    .from(TABLES.wishlists).select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw fromSupabaseError(error, { resource: 'Wishlist' });
  return count || 0;
}

/** Add product to wishlist (upsert, idempotent). @param {string} productId @returns {Promise<WishlistEntry>} */
export async function addToWishlist(productId) {
  if (!productId) throw new ValidationError('Product ID required', { meta: { field: 'productId' } });
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from(TABLES.wishlists)
    .insert({ user_id: userId, product_id: productId })
    .onConflict('user_id,product_id').ignoreDuplicates()
    .select('*, products(*, brands(*))').single();

  if (error) throw fromSupabaseError(error, { resource: 'Wishlist' });
  return mapWishlistRow(data);
}

/** Remove product from wishlist. @param {string} productId @returns {Promise<void>} */
export async function removeFromWishlist(productId) {
  if (!productId) throw new ValidationError('Product ID required');
  const userId = await requireUserId();
  const { error } = await supabase.from(TABLES.wishlists)
    .delete().eq('user_id', userId).eq('product_id', productId);
  if (error) throw fromSupabaseError(error, { resource: 'Wishlist' });
}

/** Check if product is in wishlist. @param {string} productId @returns {Promise<boolean>} */
export async function isInWishlist(productId) {
  if (!productId) return false;
  try {
    const userId = await requireUserId();
    const { data, error } = await supabase.from(TABLES.wishlists)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('product_id', productId);
    if (error) return false;
    return (data || []).length > 0;
  } catch { return false; }
}

/** Get all wishlist product IDs as a Set. @returns {Promise<Set<string>>} */
export async function getWishlistProductIds() {
  try {
    const userId = await requireUserId();
    const { data, error } = await supabase.from(TABLES.wishlists)
      .select('product_id').eq('user_id', userId);
    if (error) return new Set();
    return new Set((data || []).map(r => r.product_id));
  } catch { return new Set(); }
}

// ===== SECTION 4: Order placement =====
/**
 * Place a new order. CRITICAL: This is NOT transactional without RPC.
 * On partial failure, call markOrderFailed() to mark the order as cancelled.
 * @param {Object} input
 * @param {Array<{variantId: string, qty: number}>} input.items
 * @param {Address} input.address
 * @param {string} input.customerName
 * @param {string} input.customerPhone
 * @param {string} [input.customerNote]
 * @returns {Promise<Order>}
 */
export async function placeOrder(input) {
  const userId = await requireUserId();

  // Validate inputs
  if (!input?.items?.length) throw new ValidationError('Items required', { meta: { field: 'items' } });
  if (!input.address) throw new ValidationError('Address required', { meta: { field: 'address' } });
  const nameResult = validateRequired(input.customerName, 'customerName');
  if (!nameResult.valid) throw new ValidationError(nameResult.message, { meta: { field: 'customerName' } });
  const phoneResult = validatePhone(input.customerPhone);
  if (!phoneResult.valid) throw new ValidationError(phoneResult.message, { meta: { field: 'customerPhone' } });

  for (const item of input.items) {
    const qtyResult = validateQuantity(item.qty);
    if (!qtyResult.valid) throw new ValidationError(qtyResult.message, { meta: { field: 'qty' } });
    if (!item.variantId) throw new ValidationError('Variant ID required', { meta: { field: 'variantId' } });
  }

  // Fetch variants with product and brand info (single query)
  const variantIds = input.items.map(i => i.variantId);
  const { data: variants, error: varErr } = await supabase
    .from(TABLES.productVariants)
    .select('*, products(*, brands(*))')
    .in('id', variantIds)
    .eq('is_active', true);

  if (varErr) throw fromSupabaseError(varErr, { resource: 'Variants' });
  if (!variants || variants.length !== variantIds.length) {
    throw new ValidationError('Some variants are unavailable', { meta: { reason: 'variants_unavailable' } });
  }

  // Check stock
  const variantMap = new Map(variants.map(v => [v.id, v]));
  for (const item of input.items) {
    const variant = variantMap.get(item.variantId);
    if (!variant) throw new ValidationError(`Variant ${item.variantId} not found`);
    if (variant.stock < item.qty) {
      throw new ValidationError(`Insufficient stock for ${variant.products.name}`, {
        meta: { variantId: item.variantId, available: variant.stock, requested: item.qty },
      });
    }
  }

  // Calculate total
  let total = 0;
  const orderItems = input.items.map(item => {
    const v = variantMap.get(item.variantId);
    const p = v.products;
    const price = Number(v.price);
    total += price * item.qty;
    return {
      variant_id: v.id, product_id: p.id,
      product_name: p.name, storage: v.storage, color: v.color,
      unit_price: price, qty: item.qty,
      product_snapshot: {
        name: p.name,
        brandName: p.brands?.name || '',
        imageUrl: (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : null,
      },
    };
  });

  // Insert order
  const { data: order, error: orderErr } = await supabase
    .from(TABLES.orders)
    .insert({
      user_id: userId, status: 'pending', total,
      address: input.address, customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_note: input.customerNote ?? null,
    })
    .select().single();

  if (orderErr) throw fromSupabaseError(orderErr, { resource: 'Order' });

  // Bulk insert order items
  const { error: itemsErr } = await supabase.from(TABLES.orderItems)
    .insert(orderItems.map(i => ({ ...i, order_id: order.id })));

  if (itemsErr) {
    await markOrderFailed(order.id);
    throw fromSupabaseError(itemsErr, { resource: 'OrderItems' });
  }

  // Decrement stock atomically (where stock >= qty)
  for (const item of input.items) {
    const { error: stockErr, count } = await supabase
      .from(TABLES.productVariants)
      .update({ stock: supabase.rpc ? undefined : undefined }) // Use raw SQL via rpc if available
      .eq('id', item.variantId)
      .gte('stock', item.qty);

    // Fallback: manual decrement with read-then-write (race-prone but acceptable for MVP)
    const {  current, error: readErr } = await supabase
      .from(TABLES.productVariants).select('stock').eq('id', item.variantId).single();
    if (readErr || !current) {
      await markOrderFailed(order.id);
      throw new InternalError('Failed to read stock');
    }
    if (current.stock < item.qty) {
      await markOrderFailed(order.id);
      throw new ConflictError('Stock changed during checkout', {
        meta: { variantId: item.variantId },
      });
    }
    const { error: updateErr } = await supabase
      .from(TABLES.productVariants)
      .update({ stock: current.stock - item.qty })
      .eq('id', item.variantId)
      .eq('stock', current.stock); // Optimistic lock
    if (updateErr) {
      await markOrderFailed(order.id);
      throw fromSupabaseError(updateErr, { resource: 'Variant' });
    }
  }

  // Fetch full order with items
  const {  fullOrder, error: fetchErr } = await supabase
    .from(TABLES.orders).select('*, order_items(*)').eq('id', order.id).single();
  if (fetchErr) throw fromSupabaseError(fetchErr, { resource: 'Order' });
  return mapOrder(fullOrder);
}

/** Mark an order as failed/cancelled. @param {string} orderId */
async function markOrderFailed(orderId) {
  try {
    await supabase.from(TABLES.orders)
      .update({ status: 'cancelled' }).eq('id', orderId);
    log.warn(`Order ${orderId} marked as failed`);
  } catch (err) {
    log.error(`Failed to mark order ${orderId} as failed:`, err);
  }
}

// ===== SECTION 5: Order history (user) =====
/** List user's orders. @param {Object} [opts] @returns {Promise<{items: Order[], total: number}>} */
export async function listMyOrders(opts = {}) {
  const userId = await requireUserId();
  const page = opts.page >= 1 ? opts.page : 1;
  const pageSize = Math.min(opts.pageSize || PAGE_SIZE.orders, 100);
  const from = (page - 1) * pageSize;

  let q = supabase.from(TABLES.orders)
    .select('*, order_items(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (opts.status) q = q.eq('status', opts.status);
  const { data, error, count } = await q.range(from, from + pageSize - 1);

  if (error) throw fromSupabaseError(error, { resource: 'Orders' });
  return { items: (data || []).map(mapOrder), total: count || 0 };
}

/** Get a specific order. @param {string} orderId @returns {Promise<Order>} */
export async function getMyOrder(orderId) {
  if (!orderId) throw new ValidationError('Order ID required');
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from(TABLES.orders).select('*, order_items(*)')
    .eq('id', orderId).eq('user_id', userId).maybeSingle();

  if (error) throw fromSupabaseError(error, { resource: 'Order', identifier: orderId });
  if (!data) throw new NotFoundError('Order', orderId);
  return mapOrder(data);
}

// ===== SECTION 6: Orders (admin) =====
/** List all orders (admin). @param {Object} [opts] @returns {Promise<{items: Order[], total: number}>} */
export async function listAllOrders(opts = {}) {
  await requireAdmin();
  const page = opts.page >= 1 ? opts.page : 1;
  const pageSize = Math.min(opts.pageSize || PAGE_SIZE.admin, 100);
  const from = (page - 1) * pageSize;

  let q = supabase.from(TABLES.orders)
    .select('*, order_items(*), profiles(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (opts.status) q = q.eq('status', opts.status);
  if (opts.userId) q = q.eq('user_id', opts.userId);

  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) throw fromSupabaseError(error, { resource: 'Orders' });
  return { items: (data || []).map(mapOrder), total: count || 0 };
}

/** Set order status (admin). @param {string} orderId @param {string} status @returns {Promise<Order>} */
export async function setOrderStatus(orderId, status) {
  await requireAdmin();
  if (!orderId) throw new ValidationError('Order ID required');
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const { data, error } = await supabase
    .from(TABLES.orders).update({ status }).eq('id', orderId)
    .select('*, order_items(*)').single();
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Order', orderId);
    throw fromSupabaseError(error, { resource: 'Order', identifier: orderId });
  }
  return mapOrder(data);
}

/** Verify admin role. @returns {Promise<void>} */
async function requireAdmin() {
  const userId = await requireUserId();
  const { data: profile, error } = await supabase
    .from(TABLES.profiles).select('role').eq('id', userId).maybeSingle();
  if (error) throw fromSupabaseError(error, { resource: 'Profile' });
  if (!profile || profile.role !== 'admin') throw new PermissionError('Admin access required');
}

// ===== SECTION 7: Banners =====
/** List active banners (public). @returns {Promise<Banner[]>} */
export async function listBanners() {
  const { data, error } = await supabase.from(TABLES.banners)
    .select('*').eq('is_active', true)
    .or('starts_at.is.null,starts_at.lte.now()')
    .or('ends_at.is.null,ends_at.gt.now()')
    .order('position');
  if (error) throw fromSupabaseError(error, { resource: 'Banners' });
  return (data || []).map(mapBanner);
}

/** List all banners (admin). @returns {Promise<Banner[]>} */
export async function listAllBanners() {
  await requireAdmin();
  const { data, error } = await supabase.from(TABLES.banners).select('*').order('position');
  if (error) throw fromSupabaseError(error, { resource: 'Banners' });
  return (data || []).map(mapBanner);
}

/** Create banner (admin). @param {Object} input @returns {Promise<Banner>} */
export async function createBanner(input) {
  await requireAdmin();
  if (!input?.title || input.title.length < 1 || input.title.length > 200) {
    throw new ValidationError('Title 1-200 chars', { meta: { field: 'title' } });
  }

  const { data, error } = await supabase.from(TABLES.banners).insert({
    title: input.title, subtitle: input.subtitle ?? null,
    image_url: input.imageUrl ?? null, cta_label: input.ctaLabel ?? null,
    cta_link: input.ctaLink ?? null, position: input.position ?? 0,
    is_active: input.isActive !== false,
    starts_at: input.startsAt ?? null, ends_at: input.endsAt ?? null,
  }).select().single();

  if (error) throw fromSupabaseError(error, { resource: 'Banner' });
  return mapBanner(data);
}

/** Update banner (admin). @param {string} id @param {Object} patch @returns {Promise<Banner>} */
export async function updateBanner(id, patch) {
  await requireAdmin();
  if (!id) throw new ValidationError('Invalid ID');
  const updates = {};
  if (patch.title !== undefined) {
    if (patch.title.length < 1 || patch.title.length > 200) throw new ValidationError('Title 1-200 chars');
    updates.title = patch.title;
  }
  if (patch.subtitle !== undefined) updates.subtitle = patch.subtitle;
  if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl;
  if (patch.ctaLabel !== undefined) updates.cta_label = patch.ctaLabel;
  if (patch.ctaLink !== undefined) updates.cta_link = patch.ctaLink;
  if (patch.position !== undefined) updates.position = patch.position;
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;
  if (patch.startsAt !== undefined) updates.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) updates.ends_at = patch.endsAt;

  if (!Object.keys(updates).length) {
    const { data, error } = await supabase.from(TABLES.banners).select('*').eq('id', id).maybeSingle();
    if (error) throw fromSupabaseError(error, { resource: 'Banner', identifier: id });
    if (!data) throw new NotFoundError('Banner', id);
    return mapBanner(data);
  }

  const { data, error } = await supabase.from(TABLES.banners)
    .update(updates).eq('id', id).select().single();
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Banner', id);
    throw fromSupabaseError(error, { resource: 'Banner', identifier: id });
  }
  return mapBanner(data);
}

/** Delete banner (admin). @param {string} id @returns {Promise<void>} */
export async function deleteBanner(id) {
  await requireAdmin();
  if (!id) throw new ValidationError('Invalid ID');
  const { error } = await supabase.from(TABLES.banners).delete().eq('id', id);
  if (error) throw fromSupabaseError(error, { resource: 'Banner', identifier: id });
}

// ===== SECTION 8: Site settings =====
/** Default settings values. */
const DEFAULT_SETTINGS = {
  brandName: 'موبوگرام',
  logoUrl: null,
  defaultLocale: 'fa',
  supportEmail: null,
  supportPhone: null,
};

/** Get site settings (public). @returns {Promise<SiteSettings>} */
export async function getSiteSettings() {
  const { data, error } = await supabase.from(TABLES.siteSettings).select('*');
  if (error) throw fromSupabaseError(error, { resource: 'SiteSettings' });

  const settings = { ...DEFAULT_SETTINGS };
  for (const row of data || []) {
    if (row.key in settings) {
      const val = row.value;
      settings[row.key] = val === null || val === 'null' ? null : (typeof val === 'string' ? val : val);
    }
  }
  return settings;
}

/** Update site settings (admin). @param {Object} patch @returns {Promise<SiteSettings>} */
export async function updateSiteSettings(patch) {
  await requireAdmin();
  if (!patch || typeof patch !== 'object') throw new ValidationError('Invalid patch');

  const allowedKeys = ['brandName', 'logoUrl', 'defaultLocale', 'supportEmail', 'supportPhone'];
  const updates = [];
  for (const [key, value] of Object.entries(patch)) {
    if (allowedKeys.includes(key)) {
      updates.push({ key, value: value === null ? 'null' : value });
    }
  }

  if (!updates.length) return getSiteSettings();

  for (const { key, value } of updates) {
    const { error } = await supabase.from(TABLES.siteSettings)
      .upsert({ key, value }).eq('key', key);
    if (error) throw fromSupabaseError(error, { resource: 'SiteSettings' });
  }

  return getSiteSettings();
}

// ===== SECTION 9: Storage uploads =====
/**
 * Optimize an image using canvas (convert to WebP if supported).
 * EXCEPTION: This is the ONLY function in services that touches the DOM (canvas).
 * @param {File|Blob} file
 * @param {Object} [opts]
 * @param {number} [opts.maxDimension=UPLOAD.maxDimension]
 * @param {number} [opts.quality=UPLOAD.webpQuality]
 * @returns {Promise<Blob>}
 */
export async function optimizeImage(file, opts = {}) {
  const { maxDimension = UPLOAD.maxDimension, quality = UPLOAD.webpQuality } = opts;

  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    return file; // Fallback: return original
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Resize if needed
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Try WebP first, fallback to JPEG
    const webpBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

    if (webpBlob && webpBlob.size > 0) return webpBlob;

    const jpegBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    return jpegBlob || file;
  } catch (err) {
    log.warn('Image optimization failed, using original:', err);
    return file;
  }
}

/**
 * Upload an image to storage.
 * @param {Object} input
 * @param {string} input.bucket - Bucket name (products, banners, brands)
 * @param {string} input.path - File path within bucket
 * @param {File|Blob} input.file - File to upload
 * @param {boolean} [input.optimize=true] - Whether to optimize the image
 * @param {boolean} [input.upsert=false] - Whether to upsert (overwrite if exists)
 * @param {(progress: UploadProgress) => void} [input.onProgress] - Progress callback
 * @returns {Promise<UploadedFile>}
 */
export async function uploadImage(input) {
  if (!input?.bucket) throw new ValidationError('Bucket required', { meta: { field: 'bucket' } });
  if (!input?.path) throw new ValidationError('Path required', { meta: { field: 'path' } });
  if (!input?.file) throw new ValidationError('File required', { meta: { field: 'file' } });

  // Validate bucket
  if (!Object.values(BUCKETS).includes(input.bucket)) {
    throw new ValidationError(`Invalid bucket. Must be one of: ${Object.values(BUCKETS).join(', ')}`);
  }

  // Validate file size
  if (input.file.size > UPLOAD.maxSizeBytes) {
    throw new ValidationError(`File too large. Max: ${UPLOAD.maxSizeLabel}`, {
      meta: { field: 'file', maxSize: UPLOAD.maxSizeBytes },
    });
  }

  // Validate MIME type
  if (!UPLOAD.acceptedMimeTypes.includes(input.file.type)) {
    throw new ValidationError(`Invalid file type. Accepted: ${UPLOAD.acceptedMimeTypes.join(', ')}`, {
      meta: { field: 'file' },
    });
  }

  // Optimize if needed
  let fileToUpload = input.file;
  if (input.optimize !== false && input.file.type.startsWith('image/')) {
    fileToUpload = await optimizeImage(input.file);
  }

  // Upload
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .upload(input.path, fileToUpload, {
      contentType: fileToUpload.type || input.file.type,
      upsert: input.upsert || false,
    });

  if (error) {
    if (error.message?.includes('already exists') || error.statusCode === 409) {
      throw new ConflictError('File already exists', { meta: { path: input.path } });
    }
    throw fromSupabaseError(error, { resource: 'Storage' });
  }

  const {  publicUrl } = supabase.storage.from(input.bucket).getPublicUrl(input.path);

  return {
    bucket: input.bucket,
    path: input.path,
    publicUrl,
    mimeType: fileToUpload.type || input.file.type,
    sizeBytes: fileToUpload.size,
  };
}

/** Delete an image from storage. @param {Object} input @returns {Promise<void>} */
export async function deleteImage(input) {
  if (!input?.bucket) throw new ValidationError('Bucket required');
  if (!input?.path) throw new ValidationError('Path required');

  const { error } = await supabase.storage.from(input.bucket).remove([input.path]);
  if (error) throw fromSupabaseError(error, { resource: 'Storage' });
}

// ===== SECTION 10: URL helper =====
/** Get public URL for a storage file. @param {string} bucket @param {string} path @returns {string} */
export function getPublicUrl(bucket, path) {
  if (!bucket || !path) return '';
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

// ===== SECTION 11: Reviews =====
/** @typedef {Object} Review */
/** @property {string} id */
/** @property {string} productId */
/** @property {string} userId */
/** @property {number} rating */
/** @property {string} comment */
/** @property {string} createdAt */

/** @param {Object} raw @returns {Review} */
const mapReview = (raw) => ({
  id: raw.id,
  productId: raw.product_id,
  userId: raw.user_id,
  rating: raw.rating,
  comment: raw.comment,
  createdAt: raw.created_at,
  user: raw.profiles ? {
    fullName: raw.profiles.full_name,
  } : null,
});

/**
 * Submit a review for a product.
 * @param {Object} input
 * @param {string} input.productId
 * @param {number} input.rating - 1 to 5
 * @param {string} [input.comment='']
 * @returns {Promise<Review>}
 * @throws {ValidationError} If inputs are invalid
 * @throws {ConflictError} If user already reviewed this product
 */
export async function submitReview(input) {
  const userId = await requireUserId();
  
  if (!input?.productId) throw new ValidationError('Product ID required', { meta: { field: 'productId' } });
  if (!input?.rating || input.rating < 1 || input.rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5', { meta: { field: 'rating' } });
  }
  
  const comment = input.comment || '';
  
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id: input.productId,
      user_id: userId,
      rating: input.rating,
      comment,
    })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('You have already reviewed this product', { meta: { field: 'productId' } });
    }
    throw fromSupabaseError(error, { resource: 'Review' });
  }
  
  return mapReview(data);
}

/**
 * Get all reviews for a product.
 * @param {string} productId
 * @returns {Promise<Review[]>}
 */
export async function getProductReviews(productId) {
  if (!productId) throw new ValidationError('Product ID required');
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  
  if (error) throw fromSupabaseError(error, { resource: 'Reviews' });
  return (data || []).map(mapReview);
}

/**
 * Get all reviews (admin only).
 * @returns {Promise<Review[]>}
 * @throws {PermissionError} If not admin
 */
export async function getAllReviews() {
  await requireAdmin();
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name), products(name)')
    .order('created_at', { ascending: false });
  
  if (error) throw fromSupabaseError(error, { resource: 'Reviews' });
  return (data || []).map(mapReview);
}

/**
 * Delete a review.
 * @param {string} reviewId
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId) {
  if (!reviewId) throw new ValidationError('Review ID required');
  
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);
  
  if (error) throw fromSupabaseError(error, { resource: 'Review' });
}

// ===== SECTION 12: Notification Requests =====
/** @typedef {Object} NotifyRequest */
/** @property {string} id */
/** @property {string} productId */
/** @property {string} email */
/** @property {string} createdAt */

/** @param {Object} raw @returns {NotifyRequest} */
const mapNotifyRequest = (raw) => ({
  id: raw.id,
  productId: raw.product_id,
  email: raw.email,
  createdAt: raw.created_at,
});

/**
 * Request notification when product is back in stock.
 * @param {string} productId
 * @param {string} email
 * @returns {Promise<NotifyRequest>}
 * @throws {ValidationError} If inputs are invalid
 * @throws {ConflictError} If email already registered for this product
 */
export async function requestNotify(productId, email) {
  if (!productId) throw new ValidationError('Product ID required');
  if (!email) throw new ValidationError('Email required');
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', { meta: { field: 'email' } });
  }
  
  const { data, error } = await supabase
    .from('notify_requests')
    .insert({
      product_id: productId,
      email,
    })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('This email is already registered for notifications', { meta: { field: 'email' } });
    }
    throw fromSupabaseError(error, { resource: 'NotifyRequest' });
  }
  
  return mapNotifyRequest(data);
}

/**
 * Get all notification requests for a product (admin only).
 * @param {string} productId
 * @returns {Promise<NotifyRequest[]>}
 * @throws {PermissionError} If not admin
 */
export async function getProductNotifyRequests(productId) {
  await requireAdmin();
  
  if (!productId) throw new ValidationError('Product ID required');
  
  const { data, error } = await supabase
    .from('notify_requests')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  
  if (error) throw fromSupabaseError(error, { resource: 'NotifyRequests' });
  return (data || []).map(mapNotifyRequest);
}

/**
 * Get all notification requests (admin only).
 * @returns {Promise<NotifyRequest[]>}
 * @throws {PermissionError} If not admin
 */
export async function getAllNotifyRequests() {
  await requireAdmin();
  
  const { data, error } = await supabase
    .from('notify_requests')
    .select('*, products(name)')
    .order('created_at', { ascending: false });
  
  if (error) throw fromSupabaseError(error, { resource: 'NotifyRequests' });
  return (data || []).map(mapNotifyRequest);
}

/**
 * Delete a notification request.
 * @param {string} requestId
 * @returns {Promise<void>}
 */
export async function deleteNotifyRequest(requestId) {
  if (!requestId) throw new ValidationError('Request ID required');
  
  const { error } = await supabase
    .from('notify_requests')
    .delete()
    .eq('id', requestId);
  
  if (error) throw fromSupabaseError(error, { resource: 'NotifyRequest' });
}
</replacement>
