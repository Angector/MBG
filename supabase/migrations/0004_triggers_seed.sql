-- ============================================================
-- FILE: supabase/migrations/0004_triggers_seed.sql
-- Project: Mobogram — Phase 8
-- Purpose: Create triggers and seed reference data
-- Order:   This is file 4 of 4; run in numeric order
-- ============================================================

-- ===== SIGNUP TRIGGER =====
-- security definer ensures the insert into public.profiles succeeds
-- even though RLS blocks direct inserts from anon/authenticated.
-- set search_path = public prevents search-path injection attacks.
-- on conflict do nothing protects against rare race conditions when the
-- trigger fires twice or the profile row already exists.
-- raw_user_meta_data->>'full_name' reads the optional full_name supplied
-- by the client during signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== UPDATED_AT TRIGGERS =====
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- brands
drop trigger if exists brands_touch_updated_at on public.brands;
create trigger brands_touch_updated_at
before update on public.brands
for each row execute function public.touch_updated_at();

-- products
drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

-- product_variants
drop trigger if exists product_variants_touch_updated_at on public.product_variants;
create trigger product_variants_touch_updated_at
before update on public.product_variants
for each row execute function public.touch_updated_at();

-- orders
drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

-- banners
drop trigger if exists banners_touch_updated_at on public.banners;
create trigger banners_touch_updated_at
before update on public.banners
for each row execute function public.touch_updated_at();

-- site_settings (primary key is `key`, not `id`, but trigger works identically)
drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

-- ===== SEED BRANDS =====
-- No products are seeded. All product data must be entered by an admin
-- through the admin panel. Fake or sample products are strictly forbidden.
insert into public.brands (name, slug) values
  ('Apple',   'apple'),
  ('Samsung', 'samsung'),
  ('Xiaomi',  'xiaomi'),
  ('Google',  'google')
on conflict (slug) do nothing;

-- ===== SEED SITE_SETTINGS =====
-- logo_url is JSON null until an admin uploads a logo via the admin
-- settings page. The UI must treat JSON null the same as SQL NULL and
-- render the checkerboard placeholder.
-- support_email and support_phone similarly start as JSON null.
insert into public.site_settings (key, value) values
  ('brand_name',    to_jsonb('موبوگرام'::text)),
  ('tagline',       to_jsonb('فروشگاه گوشی موبایل'::text)),
  ('logo_url',      'null'::jsonb),
  ('support_email', 'null'::jsonb),
  ('support_phone', 'null'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- FIRST ADMIN PROMOTION (manual step)
-- ============================================================
-- The store owner must promote their own account to admin after
-- signing up. This is a deliberate manual step to avoid accidentally
-- auto-promoting any email address in a shared repository.
--
-- Steps:
--   1. Sign up in the storefront with your admin email.
--   2. Open the Supabase SQL Editor and run:
--
--        update public.profiles
--        set role = 'admin'
--        where id = (
--          select id from auth.users where email = 'YOUR_EMAIL_HERE'
--        );
--
--   3. Verify:
--
--        select id, full_name, role from public.profiles;
--
--   4. From this point, the admin can promote other users by updating
--      their role column directly from the admin panel.
--
-- To auto-promote on signup in future, extend public.handle_new_user
-- in this file with a check against new.email against a whitelist. This
-- is intentionally not implemented here.
-- ============================================================
