// === FILE: src/services/catalog.service.js ===
// Project: Mobogram — Phase 9: Services Layer (Part 2 - Catalog)
// Purpose: Data access for brands, products, and product variants

// ===== SECTION 1: Imports & Types =====
import { supabase, TABLES, PAGE_SIZE, PAGINATION } from '../config.js';
import { ValidationError, NotFoundError, ConflictError, fromSupabaseError } from '../errors.js';
import { validateRequired, validatePrice, validateStock, slugify, createLogger } from '../utils.js';

/** @typedef {import('../types.js').Brand} Brand */
/** @typedef {import('../types.js').Product} Product */
/** @typedef {import('../types.js').ProductVariant} ProductVariant */
/** @typedef {import('../types.js').ProductWithVariants} ProductWithVariants */
/** @typedef {import('../types.js').ProductFilter} ProductFilter */
/** @typedef {import('../types.js').PaginatedResult} PaginatedResult */

const log = createLogger('catalog.service');

// ===== SECTION 2: Private helpers =====
/** @param {Object} raw @returns {Brand} */
const mapBrand = (raw) => ({
  id: raw.id, name: raw.name, slug: raw.slug, logoUrl: raw.logo_url ?? null,
  createdAt: raw.created_at, updatedAt: raw.updated_at
});

/** @param {Object} raw @returns {Product} */
const mapProduct = (raw) => ({
  id: raw.id, slug: raw.slug, name: raw.name, brandId: raw.brand_id,
  brand: raw.brands ? mapBrand(raw.brands) : null, category: raw.category,
  shortDescription: raw.short_description ?? '', description: raw.description ?? '',
  specs: raw.specs ?? {}, basePrice: Number(raw.base_price),
  discountPrice: raw.discount_price != null ? Number(raw.discount_price) : null,
  images: Array.isArray(raw.images) ? raw.images : [], releaseYear: raw.release_year ?? null,
  isFeatured: raw.is_featured, isActive: raw.is_active,
  createdAt: raw.created_at, updatedAt: raw.updated_at
});

/** @param {Object} raw @returns {ProductVariant} */
const mapVariant = (raw) => ({
  id: raw.id, productId: raw.product_id, storage: raw.storage, color: raw.color,
  ram: raw.ram ?? null, sku: raw.sku, price: Number(raw.price), stock: raw.stock,
  isActive: raw.is_active, createdAt: raw.created_at, updatedAt: raw.updated_at
});

/** @param {Product[]} products @returns {Promise<ProductWithVariants[]>} */
async function attachVariants(products) {
  if (!products.length) return [];
  const { data, error } = await supabase
    .from(TABLES.productVariants).select('*').in('product_id', products.map(p => p.id));
  if (error) throw fromSupabaseError(error, { resource: 'Variants' });
  
  const byProduct = new Map();
  (data || []).forEach(raw => {
    const v = mapVariant(raw);
    const list = byProduct.get(v.productId) || [];
    list.push(v);
    byProduct.set(v.productId, list);
  });
  return products.map(p => ({ ...p, variants: byProduct.get(p.id) || [] }));
}

// ===== SECTION 3: Cache =====
/** @type {Map<string, { value: any, expiresAt: number }>} */
const cache = new Map();
const TTL = { brands: 300000, product: 60000, featured: 30000, list: 20000, priceBounds: 60000 };

/** @param {string} key @returns {any|null} */
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.value;
}

/** @param {string} key @param {any} value @param {number} ttlMs */
function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** @param {string} [prefix] */
function invalidateCache(prefix) {
  if (!prefix) { cache.clear(); return; }
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

// ===== SECTION 4: Brands =====
/** List all brands (cached). @returns {Promise<Brand[]>} */
export async function listBrands() {
  const cached = cacheGet('brands:all');
  if (cached) return cached;
  const { data, error } = await supabase.from(TABLES.brands).select('*').order('name');
  if (error) throw fromSupabaseError(error, { resource: 'Brands' });
  const brands = (data || []).map(mapBrand);
  cacheSet('brands:all', brands, TTL.brands);
  return brands;
}

/** Get brand by slug. @param {string} slug @returns {Promise<Brand>} */
export async function getBrandBySlug(slug) {
  if (!slug || typeof slug !== 'string') throw new ValidationError('Invalid slug', { meta: { field: 'slug' } });
  const key = `brand:slug:${slug}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const { data, error } = await supabase.from(TABLES.brands).select('*').eq('slug', slug).maybeSingle();
  if (error) throw fromSupabaseError(error, { resource: 'Brand', identifier: slug });
  if (!data) throw new NotFoundError('Brand', slug);
  const brand = mapBrand(data);
  cacheSet(key, brand, TTL.brands);
  return brand;
}

/** Create brand. @param {Object} input @returns {Promise<Brand>} */
export async function createBrand(input) {
  if (!input?.name) throw new ValidationError('Name required', { meta: { field: 'name' } });
  if (input.name.length < 1 || input.name.length > 80) throw new ValidationError('Name 1-80 chars', { meta: { field: 'name' } });
  const slug = input.slug || slugify(input.name);
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) throw new ValidationError('Invalid slug', { meta: { field: 'slug' } });
  
  const { data, error } = await supabase.from(TABLES.brands).insert({
    name: input.name, slug, logo_url: input.logoUrl ?? null
  }).select().single();
  
  if (error) {
    if (error.code === '23505') throw new ConflictError('Slug exists', { meta: { field: 'slug' } });
    throw fromSupabaseError(error, { resource: 'Brand' });
  }
  invalidateCache('brands');
  return mapBrand(data);
}

/** Update brand. @param {string} id @param {Object} patch @returns {Promise<Brand>} */
export async function updateBrand(id, patch) {
  if (!id) throw new ValidationError('Invalid ID', { meta: { field: 'id' } });
  const updates = {};
  if (patch.name !== undefined) {
    if (patch.name.length < 1 || patch.name.length > 80) throw new ValidationError('Name 1-80 chars');
    updates.name = patch.name;
  }
  if (patch.slug !== undefined) {
    if (!/^[a-z0-9-]{2,120}$/.test(patch.slug)) throw new ValidationError('Invalid slug');
    updates.slug = patch.slug;
  }
  if (patch.logoUrl !== undefined) updates.logo_url = patch.logoUrl;
  if (!Object.keys(updates).length) return getBrandById(id);
  
  const { data, error } = await supabase.from(TABLES.brands).update(updates).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') throw new ConflictError('Slug exists');
    if (error.code === 'PGRST116') throw new NotFoundError('Brand', id);
    throw fromSupabaseError(error, { resource: 'Brand', identifier: id });
  }
  invalidateCache('brands');
  return mapBrand(data);
}

/** @param {string} id @returns {Promise<Brand>} */
async function getBrandById(id) {
  const { data, error } = await supabase.from(TABLES.brands).select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error, { resource: 'Brand', identifier: id });
  if (!data) throw new NotFoundError('Brand', id);
  return mapBrand(data);
}

/** Delete brand. @param {string} id @returns {Promise<void>} */
export async function deleteBrand(id) {
  if (!id) throw new ValidationError('Invalid ID', { meta: { field: 'id' } });
  const { error } = await supabase.from(TABLES.brands).delete().eq('id', id);
  if (error) {
    if (error.code === '23503') throw new ConflictError('Brand has products', { meta: { reason: 'foreign_key' } });
    throw fromSupabaseError(error, { resource: 'Brand', identifier: id });
  }
  invalidateCache('brands');
}

// ===== SECTION 5: Products — reads =====
/** List products with filters. @param {ProductFilter} [filter={}] @returns {Promise<PaginatedResult<ProductWithVariants>>} */
export async function listProducts(filter = {}) {
  const page = filter.page >= 1 ? filter.page : PAGINATION.defaultPage;
  const pageSize = Math.min(filter.pageSize || PAGE_SIZE.products, PAGINATION.maxPageSize);
  const cacheKey = `list:${JSON.stringify({ ...filter, page, pageSize })}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let inStockIds = null;
  if (filter.inStock) {
    const { data: vd, error: ve } = await supabase.from(TABLES.productVariants)
      .select('product_id').eq('is_active', true).gt('stock', 0);
    if (ve) throw fromSupabaseError(ve, { resource: 'Variants' });
    inStockIds = [...new Set((vd || []).map(v => v.product_id))];
    if (!inStockIds.length) {
      const empty = { items: [], total: 0, page, pageSize, hasMore: false };
      cacheSet(cacheKey, empty, TTL.list);
      return empty;
    }
  }

  let q = supabase.from(TABLES.products).select('*, brands(*)', { count: 'exact' }).eq('is_active', true);
  if (filter.brandIds?.length) q = q.in('brand_id', filter.brandIds);
  if (filter.minPrice != null) q = q.gte('base_price', filter.minPrice);
  if (filter.maxPrice != null) q = q.lte('base_price', filter.maxPrice);
  if (filter.searchQuery?.trim()) q = q.ilike('name', `%${filter.searchQuery.trim()}%`);
  if (inStockIds) q = q.in('id', inStockIds);

  const sortMap = { 'price-asc': ['base_price', true], 'price-desc': ['base_price', false],
    'name-asc': ['name', true] };
  const [col, asc] = sortMap[filter.sortBy] || ['created_at', false];
  q = q.order(col, { ascending: asc });

  const from = (page - 1) * pageSize;
  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) throw fromSupabaseError(error, { resource: 'Products' });

  const products = (data || []).map(mapProduct);
  const withVariants = await attachVariants(products);
  const total = count || 0;
  const result = { items: withVariants, total, page, pageSize, hasMore: from + pageSize < total };
  cacheSet(cacheKey, result, TTL.list);
  return result;
}

/** Get product by slug (cached). @param {string} slug @param {Object} [opts] @returns {Promise<ProductWithVariants>} */
export async function getProductBySlug(slug, opts = {}) {
  if (!slug) throw new ValidationError('Invalid slug', { meta: { field: 'slug' } });
  const key = `product:slug:${slug}:${opts.includeInactive ? 'all' : 'active'}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let q = supabase.from(TABLES.products).select('*, brands(*)').eq('slug', slug);
  if (!opts.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q.maybeSingle();
  if (error) throw fromSupabaseError(error, { resource: 'Product', identifier: slug });
  if (!data) throw new NotFoundError('Product', slug);

  const product = mapProduct(data);
  const [withVariants] = await attachVariants([product]);
  cacheSet(key, withVariants, TTL.product);
  return withVariants;
}

/** Get featured products (cached). @param {number} [limit=8] @returns {Promise<ProductWithVariants[]>} */
export async function getFeaturedProducts(limit = 8) {
  if (limit < 1 || limit > 50) throw new ValidationError('Limit 1-50', { meta: { field: 'limit' } });
  const key = `featured:${limit}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const { data, error } = await supabase.from(TABLES.products).select('*, brands(*)')
    .eq('is_active', true).eq('is_featured', true).order('created_at', { ascending: false }).limit(limit);
  if (error) throw fromSupabaseError(error, { resource: 'Products' });
  const products = (data || []).map(mapProduct);
  const withVariants = await attachVariants(products);
  cacheSet(key, withVariants, TTL.featured);
  return withVariants;
}

/** Get related products. @param {string} productId @param {number} [limit=4] @returns {Promise<ProductWithVariants[]>} */
export async function getRelatedProducts(productId, limit = 4) {
  if (!productId) throw new ValidationError('Invalid product ID');
  if (limit < 1 || limit > 20) throw new ValidationError('Limit 1-20');

  const { data: current, error: ce } = await supabase.from(TABLES.products)
    .select('brand_id').eq('id', productId).maybeSingle();
  if (ce) throw fromSupabaseError(ce, { resource: 'Product', identifier: productId });
  if (!current) throw new NotFoundError('Product', productId);

  const { data, error } = await supabase.from(TABLES.products).select('*, brands(*)')
    .eq('is_active', true).eq('brand_id', current.brand_id).neq('id', productId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw fromSupabaseError(error, { resource: 'Products' });
  return attachVariants((data || []).map(mapProduct));
}

/** Get price bounds. @returns {Promise<{min: number, max: number}>} */
export async function getPriceBounds() {
  const cached = cacheGet('priceBounds');
  if (cached) return cached;

  const { data: minData, error: minErr } = await supabase.from(TABLES.products)
    .select('base_price').eq('is_active', true).order('base_price').limit(1);
  const { data: maxData, error: maxErr } = await supabase.from(TABLES.products)
    .select('base_price').eq('is_active', true).order('base_price', { ascending: false }).limit(1);
  if (minErr) throw fromSupabaseError(minErr);
  if (maxErr) throw fromSupabaseError(maxErr);

  const result = {
    min: minData?.[0] ? Number(minData[0].base_price) : 0,
    max: maxData?.[0] ? Number(maxData[0].base_price) : 0
  };
  cacheSet('priceBounds', result, TTL.priceBounds);
  return result;
}

// ===== SECTION 6: Products — writes =====
/** Create product with auto-slugify. @param {Object} input @returns {Promise<Product>} */
export async function createProduct(input) {
  if (!input?.name || input.name.length < 2 || input.name.length > 200) {
    throw new ValidationError('Name 2-200 chars', { meta: { field: 'name' } });
  }
  if (!input.brandId) throw new ValidationError('Brand ID required', { meta: { field: 'brandId' } });
  const priceResult = validatePrice(input.basePrice);
  if (!priceResult.valid) throw new ValidationError(priceResult.message || 'Invalid price', { meta: { field: 'basePrice' } });
  if (input.discountPrice != null) {
    if (input.discountPrice > input.basePrice) throw new ValidationError('Discount > base', { meta: { field: 'discountPrice' } });
  }
  if (input.releaseYear != null && (input.releaseYear < 2000 || input.releaseYear > 2100)) {
    throw new ValidationError('Year 2000-2100', { meta: { field: 'releaseYear' } });
  }

  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.from(TABLES.products).insert({
      slug, name: input.name, brand_id: input.brandId, category: 'phone',
      short_description: input.shortDescription || '', description: input.description || '',
      specs: input.specs || {}, base_price: input.basePrice,
      discount_price: input.discountPrice ?? null, images: input.images || [],
      release_year: input.releaseYear ?? null, is_featured: input.isFeatured || false, is_active: true
    }).select().single();

    if (!error) { invalidateCache(); return mapProduct(data); }
    if (error.code === '23505') { slug = `${baseSlug}-${attempt + 2}`; continue; }
    throw fromSupabaseError(error, { resource: 'Product' });
  }
  throw new ConflictError('Cannot generate unique slug', { meta: { baseSlug } });
}

/** Update product. @param {string} id @param {Object} patch @returns {Promise<Product>} */
export async function updateProduct(id, patch) {
  if (!id) throw new ValidationError('Invalid ID');
  const updates = {};
  if (patch.name !== undefined) {
    if (patch.name.length < 2 || patch.name.length > 200) throw new ValidationError('Name 2-200 chars');
    updates.name = patch.name;
  }
  if (patch.slug !== undefined) {
    if (!/^[a-z0-9-]{2,120}$/.test(patch.slug)) throw new ValidationError('Invalid slug');
    updates.slug = patch.slug;
  }
  if (patch.brandId !== undefined) updates.brand_id = patch.brandId;
  if (patch.basePrice !== undefined) {
    const r = validatePrice(patch.basePrice);
    if (!r.valid) throw new ValidationError(r.message || 'Invalid price');
    updates.base_price = patch.basePrice;
  }
  if (patch.discountPrice !== undefined) updates.discount_price = patch.discountPrice;
  if (patch.shortDescription !== undefined) updates.short_description = patch.shortDescription;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.specs !== undefined) updates.specs = patch.specs;
  if (patch.images !== undefined) updates.images = patch.images;
  if (patch.releaseYear !== undefined) updates.release_year = patch.releaseYear;
  if (patch.isFeatured !== undefined) updates.is_featured = patch.isFeatured;
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;

  if (!Object.keys(updates).length) {
    const { data, error } = await supabase.from(TABLES.products).select('*, brands(*)').eq('id', id).maybeSingle();
    if (error) throw fromSupabaseError(error, { resource: 'Product', identifier: id });
    if (!data) throw new NotFoundError('Product', id);
    return mapProduct(data);
  }

  const { data, error } = await supabase.from(TABLES.products).update(updates).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') throw new ConflictError('Slug exists');
    if (error.code === 'PGRST116') throw new NotFoundError('Product', id);
    throw fromSupabaseError(error, { resource: 'Product', identifier: id });
  }
  invalidateCache();
  return mapProduct(data);
}

/** Soft-delete product. @param {string} id @returns {Promise<void>} */
export async function deactivateProduct(id) {
  if (!id) throw new ValidationError('Invalid ID');
  const { error } = await supabase.from(TABLES.products).update({ is_active: false }).eq('id', id);
  if (error) throw fromSupabaseError(error, { resource: 'Product', identifier: id });
  invalidateCache();
}

/** Hard-delete product. @param {string} id @returns {Promise<void>} */
export async function deleteProduct(id) {
  if (!id) throw new ValidationError('Invalid ID');
  const { error } = await supabase.from(TABLES.products).delete().eq('id', id);
  if (error) {
    if (error.code === '23503') throw new ConflictError('Product has orders', { meta: { reason: 'foreign_key' } });
    throw fromSupabaseError(error, { resource: 'Product', identifier: id });
  }
  invalidateCache();
}

// ===== SECTION 7: Variants — writes =====
/** Create variant. @param {Object} input @returns {Promise<ProductVariant>} */
export async function createVariant(input) {
  if (!input?.productId) throw new ValidationError('Product ID required', { meta: { field: 'productId' } });
  if (!input.storage || input.storage.length > 20) throw new ValidationError('Storage 1-20 chars', { meta: { field: 'storage' } });
  if (!input.color || input.color.length > 40) throw new ValidationError('Color 1-40 chars', { meta: { field: 'color' } });
  if (!input.sku || input.sku.length < 3 || input.sku.length > 40) throw new ValidationError('SKU 3-40 chars', { meta: { field: 'sku' } });
  const priceResult = validatePrice(input.price);
  if (!priceResult.valid) throw new ValidationError(priceResult.message || 'Invalid price', { meta: { field: 'price' } });
  const stock = input.stock ?? 0;
  const stockResult = validateStock(stock);
  if (!stockResult.valid) throw new ValidationError(stockResult.message || 'Invalid stock', { meta: { field: 'stock' } });
  if (input.ram != null && input.ram.length > 20) throw new ValidationError('RAM 1-20 chars', { meta: { field: 'ram' } });

  const { data, error } = await supabase.from(TABLES.productVariants).insert({
    product_id: input.productId, storage: input.storage, color: input.color,
    ram: input.ram ?? null, sku: input.sku, price: input.price, stock,
    is_active: input.isActive !== false
  }).select().single();

  if (error) {
    if (error.code === '23505') throw new ConflictError('SKU exists', { meta: { field: 'sku' } });
    throw fromSupabaseError(error, { resource: 'Variant' });
  }
  invalidateCache();
  return mapVariant(data);
}

/** Update variant. @param {string} id @param {Object} patch @returns {Promise<ProductVariant>} */
export async function updateVariant(id, patch) {
  if (!id) throw new ValidationError('Invalid ID');
  const updates = {};
  if (patch.storage !== undefined) {
    if (patch.storage.length > 20) throw new ValidationError('Storage 1-20 chars');
    updates.storage = patch.storage;
  }
  if (patch.color !== undefined) {
    if (patch.color.length > 40) throw new ValidationError('Color 1-40 chars');
    updates.color = patch.color;
  }
  if (patch.ram !== undefined) {
    if (patch.ram !== null && patch.ram.length > 20) throw new ValidationError('RAM 1-20 chars');
    updates.ram = patch.ram;
  }
  if (patch.sku !== undefined) {
    if (patch.sku.length < 3 || patch.sku.length > 40) throw new ValidationError('SKU 3-40 chars');
    updates.sku = patch.sku;
  }
  if (patch.price !== undefined) {
    const r = validatePrice(patch.price);
    if (!r.valid) throw new ValidationError(r.message || 'Invalid price');
    updates.price = patch.price;
  }
  if (patch.stock !== undefined) {
    const r = validateStock(patch.stock);
    if (!r.valid) throw new ValidationError(r.message || 'Invalid stock');
    updates.stock = patch.stock;
  }
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;

  if (!Object.keys(updates).length) {
    const { data, error } = await supabase.from(TABLES.productVariants).select('*').eq('id', id).maybeSingle();
    if (error) throw fromSupabaseError(error, { resource: 'Variant', identifier: id });
    if (!data) throw new NotFoundError('Variant', id);
    return mapVariant(data);
  }

  const { data, error } = await supabase.from(TABLES.productVariants).update(updates).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') throw new ConflictError('SKU exists');
    if (error.code === 'PGRST116') throw new NotFoundError('Variant', id);
    throw fromSupabaseError(error, { resource: 'Variant', identifier: id });
  }
  invalidateCache();
  return mapVariant(data);
}

/** Delete variant. @param {string} id @returns {Promise<void>} */
export async function deleteVariant(id) {
  if (!id) throw new ValidationError('Invalid ID');
  const { error } = await supabase.from(TABLES.productVariants).delete().eq('id', id);
  if (error) throw fromSupabaseError(error, { resource: 'Variant', identifier: id });
  invalidateCache();
}

/** Set variant stock. @param {string} id @param {number} stock @returns {Promise<ProductVariant>} */
export async function setVariantStock(id, stock) {
  if (!id) throw new ValidationError('Invalid ID');
  const r = validateStock(stock);
  if (!r.valid) throw new ValidationError(r.message || 'Invalid stock', { meta: { field: 'stock' } });

  const { data, error } = await supabase.from(TABLES.productVariants)
    .update({ stock }).eq('id', id).select().single();
  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Variant', id);
    throw fromSupabaseError(error, { resource: 'Variant', identifier: id });
  }
  invalidateCache();
  return mapVariant(data);
}
