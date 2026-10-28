-- ============================================================
-- FILE: supabase/migrations/0003_storage.sql
-- Project: Mobogram — Phase 8
-- Purpose: Create storage buckets and storage RLS policies
-- Order:   This is file 3 of 4; run in numeric order
-- ============================================================

-- ===== STORAGE BUCKETS =====
-- Products and banners: 5MB limit. Brands (logos): 2MB limit.
-- SVG is allowed only in brands (for logos). Products and banners accept
-- SVG too for flexibility but admin should prefer WebP.
-- public = true means Supabase serves these files without auth. The
-- storefront depends on this for fast image loading.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('products', 'products', true, 5242880,
   array['image/webp','image/jpeg','image/png','image/svg+xml']),
  ('banners',  'banners',  true, 5242880,
   array['image/webp','image/jpeg','image/png','image/svg+xml']),
  ('brands',   'brands',   true, 2097152,
   array['image/webp','image/jpeg','image/png','image/svg+xml'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ===== STORAGE POLICIES =====
-- storage.objects already has RLS enabled by Supabase. We only add policies.
-- The admin check calls public.is_admin(), which is defined in 0002. This
-- file MUST run after 0002.

-- Public read
drop policy if exists "storage_mobogram_public_read" on storage.objects;
create policy "storage_mobogram_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('products','banners','brands'));

-- Admin write (insert)
drop policy if exists "storage_mobogram_admin_insert" on storage.objects;
create policy "storage_mobogram_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('products','banners','brands')
  and public.is_admin()
);

-- Admin write (update — overwrite existing file)
drop policy if exists "storage_mobogram_admin_update" on storage.objects;
create policy "storage_mobogram_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id in ('products','banners','brands')
  and public.is_admin()
)
with check (
  bucket_id in ('products','banners','brands')
  and public.is_admin()
);

-- Admin write (delete)
drop policy if exists "storage_mobogram_admin_delete" on storage.objects;
create policy "storage_mobogram_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('products','banners','brands')
  and public.is_admin()
);
