-- ============================================================
-- FILE: supabase/migrations/0002_rls.sql
-- Project: Mobogram — Phase 8
-- Purpose: Enable RLS and define all policies
-- Order:   This is file 2 of 4; run in numeric order
-- ============================================================

-- ===== ENABLE RLS ON ALL TABLES =====
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;

-- ===== ADMIN HELPER FUNCTION =====
-- security definer + search_path locked to public is REQUIRED.
-- Without security definer, the function would inherit the caller's RLS on
-- profiles and could fail to see the user's role if their row were ever hidden.
-- With it, the function runs as the owner (postgres), so the query succeeds
-- regardless of profiles RLS.
-- auth.uid() returns the JWT's user id (UUID) or NULL if anonymous.
-- is_admin() returns false for anonymous users — no profile row exists.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ===== PROFILES POLICIES =====
-- User reads own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- Admin reads any profile
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

-- Customer updates own profile (but NOT role — see with check below)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id and role = 'customer')
with check (auth.uid() = id and role = 'customer');

-- Admin updates any profile (including role)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No insert policy: rows are created only by the signup trigger (security definer).
-- No delete policy: profile rows cascade-delete via auth.users cleanup.

-- ===== BRANDS POLICIES =====
-- Public can read all brands (needed on product listing pages)
drop policy if exists "brands_select_public" on public.brands;
create policy "brands_select_public"
on public.brands for select
to anon, authenticated
using (true);

-- Only admin writes
drop policy if exists "brands_insert_admin" on public.brands;
create policy "brands_insert_admin"
on public.brands for insert
to authenticated
with check (public.is_admin());

drop policy if exists "brands_update_admin" on public.brands;
create policy "brands_update_admin"
on public.brands for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "brands_delete_admin" on public.brands;
create policy "brands_delete_admin"
on public.brands for delete
to authenticated
using (public.is_admin());

-- ===== PRODUCTS POLICIES =====
-- Anyone reads ACTIVE products
drop policy if exists "products_select_active" on public.products;
create policy "products_select_active"
on public.products for select
to anon, authenticated
using (is_active = true);

-- Admin sees ALL products (including inactive)
drop policy if exists "products_select_admin" on public.products;
create policy "products_select_admin"
on public.products for select
to authenticated
using (public.is_admin());

drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin"
on public.products for insert
to authenticated
with check (public.is_admin());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
on public.products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin"
on public.products for delete
to authenticated
using (public.is_admin());

-- ===== PRODUCT_VARIANTS POLICIES =====
-- Anyone reads ACTIVE variants of ACTIVE products
drop policy if exists "product_variants_select_active" on public.product_variants;
create policy "product_variants_select_active"
on public.product_variants for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and p.is_active = true
  )
);

-- Admin sees ALL variants
drop policy if exists "product_variants_select_admin" on public.product_variants;
create policy "product_variants_select_admin"
on public.product_variants for select
to authenticated
using (public.is_admin());

drop policy if exists "product_variants_insert_admin" on public.product_variants;
create policy "product_variants_insert_admin"
on public.product_variants for insert
to authenticated
with check (public.is_admin());

drop policy if exists "product_variants_update_admin" on public.product_variants;
create policy "product_variants_update_admin"
on public.product_variants for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product_variants_delete_admin" on public.product_variants;
create policy "product_variants_delete_admin"
on public.product_variants for delete
to authenticated
using (public.is_admin());

-- ===== WISHLISTS POLICIES =====
drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own"
on public.wishlists for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "wishlists_select_admin" on public.wishlists;
create policy "wishlists_select_admin"
on public.wishlists for select
to authenticated
using (public.is_admin());

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own"
on public.wishlists for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "wishlists_delete_own" on public.wishlists;
create policy "wishlists_delete_own"
on public.wishlists for delete
to authenticated
using (auth.uid() = user_id);

-- No update policy: wishlist rows are (user_id, product_id) pairs and are not editable.

-- ===== ORDERS POLICIES =====
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin"
on public.orders for select
to authenticated
using (public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders for insert
to authenticated
with check (auth.uid() = user_id);

-- Customers cannot update their own orders. Status changes are admin-only.
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No delete policy: orders are permanent business records.

-- ===== ORDER_ITEMS POLICIES =====
-- Customer reads items of own orders
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin"
on public.order_items for select
to authenticated
using (public.is_admin());

-- Customer inserts items into their own order
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

-- No update or delete policies. Order items are immutable once placed.

-- ===== BANNERS POLICIES =====
-- Anyone reads active banners within their visibility window
drop policy if exists "banners_select_active" on public.banners;
create policy "banners_select_active"
on public.banners for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

drop policy if exists "banners_select_admin" on public.banners;
create policy "banners_select_admin"
on public.banners for select
to authenticated
using (public.is_admin());

drop policy if exists "banners_insert_admin" on public.banners;
create policy "banners_insert_admin"
on public.banners for insert
to authenticated
with check (public.is_admin());

drop policy if exists "banners_update_admin" on public.banners;
create policy "banners_update_admin"
on public.banners for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "banners_delete_admin" on public.banners;
create policy "banners_delete_admin"
on public.banners for delete
to authenticated
using (public.is_admin());

-- ===== SITE_SETTINGS POLICIES =====
-- Public read limited to non-sensitive keys
drop policy if exists "site_settings_select_public" on public.site_settings;
create policy "site_settings_select_public"
on public.site_settings for select
to anon, authenticated
using (
  key in (
    'brand_name', 'tagline', 'logo_url',
    'support_email', 'support_phone'
  )
);

drop policy if exists "site_settings_select_admin" on public.site_settings;
create policy "site_settings_select_admin"
on public.site_settings for select
to authenticated
using (public.is_admin());

drop policy if exists "site_settings_insert_admin" on public.site_settings;
create policy "site_settings_insert_admin"
on public.site_settings for insert
to authenticated
with check (public.is_admin());

drop policy if exists "site_settings_update_admin" on public.site_settings;
create policy "site_settings_update_admin"
on public.site_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "site_settings_delete_admin" on public.site_settings;
create policy "site_settings_delete_admin"
on public.site_settings for delete
to authenticated
using (public.is_admin());
