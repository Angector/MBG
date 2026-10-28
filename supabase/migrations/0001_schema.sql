-- ============================================================
-- FILE: supabase/migrations/0001_schema.sql
-- Project: Mobogram — Phase 8
-- Purpose: Create all tables, constraints, and indexes
-- Order:   This is file 1 of 4; run in numeric order
-- ============================================================

-- ===== TABLE: profiles =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. Auto-created via signup trigger.';
comment on column public.profiles.role is 'Used by RLS to gate admin-only operations.';

-- ===== TABLE: brands =====
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brands is 'Mobile phone brands. logo_url NULL renders checkerboard placeholder.';

-- ===== TABLE: products =====
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  name text not null check (char_length(name) between 2 and 200),
  brand_id uuid not null references public.brands(id) on delete restrict,
  category text not null default 'phone' check (category in ('phone')),
  short_description text not null default '',
  description text not null default '',
  specs jsonb not null default '{}'::jsonb,
  base_price numeric(12,0) not null check (base_price >= 0),
  discount_price numeric(12,0) check (discount_price is null or (discount_price >= 0 and discount_price <= base_price)),
  images jsonb not null default '[]'::jsonb,
  release_year integer check (release_year is null or (release_year between 2000 and 2100)),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Mobile phones. category restricted to phone for MVP.';
comment on column public.products.images is 'JSON array of Storage URLs. Empty array renders placeholder.';
comment on column public.products.specs is 'Flexible key/value object for phone specifications.';

-- ===== TABLE: product_variants =====
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage text not null check (char_length(storage) between 1 and 20),
  color text not null check (char_length(color) between 1 and 40),
  ram text check (ram is null or char_length(ram) between 1 and 20),
  sku text not null unique check (char_length(sku) between 3 and 40),
  price numeric(12,0) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_variants is 'Specific (storage, color, ram) combinations. price overrides product base_price.';
comment on column public.product_variants.stock is 'Zero means out of stock. UI enforces availability display.';

-- ===== TABLE: wishlists =====
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

comment on table public.wishlists is 'Per user-per-product wishlist join table.';

-- ===== TABLE: orders =====
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  total numeric(12,0) not null check (total >= 0),
  address jsonb not null,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_phone text not null check (customer_phone ~ '^09[0-9]{9}$'),
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orders is 'Customer orders. address is JSONB snapshot at order time.';
comment on column public.orders.status is 'Progression: pending → confirmed → shipped → delivered, or cancelled.';

-- ===== TABLE: order_items =====
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  storage text not null,
  color text not null,
  unit_price numeric(12,0) not null check (unit_price >= 0),
  qty integer not null check (qty > 0 and qty <= 99),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.order_items is 'Order line items. product_id/variant_id nullable to preserve history.';
comment on column public.order_items.product_snapshot is 'Snapshot data for display after product deletion.';

-- ===== TABLE: banners =====
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  subtitle text,
  image_url text,
  cta_label text,
  cta_link text,
  position integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

comment on table public.banners is 'Homepage banners. image_url NULL renders placeholder.';
comment on column public.banners.position is 'Ordering key; smaller values appear first.';

-- ===== TABLE: site_settings =====
create table if not exists public.site_settings (
  key text primary key check (char_length(key) between 1 and 100),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is 'Global key/value store for site-wide settings. Admin-managed only.';

-- ===== INDEXES =====
create index if not exists idx_products_brand_id on public.products(brand_id);
create index if not exists idx_products_active_feat on public.products(is_active, is_featured) where is_active = true;
create index if not exists idx_products_created_at on public.products(created_at desc);
create index if not exists idx_variants_product_id on public.product_variants(product_id);
create index if not exists idx_variants_stock on public.product_variants(product_id, is_active, stock) where is_active = true;
create index if not exists idx_wishlists_user_id on public.wishlists(user_id);
create index if not exists idx_orders_user_id_created on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_banners_position on public.banners(position, is_active) where is_active = true;
