-- ============================================================
-- FILE: supabase/migrations/0005_reviews_notify.sql
-- Project: Mobogram — Phase 19: The Empire
-- Purpose: Reviews and notification requests tables with RLS
-- Order:   This is file 5 of 5; run after 0004
-- ============================================================

-- ===== TABLE: reviews =====
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

comment on table public.reviews is 'Product reviews with ratings 1-5. One review per user per product.';

create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);

-- ===== TABLE: notify_requests =====
create table if not exists public.notify_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  created_at timestamptz not null default now(),
  unique (product_id, email)
);

comment on table public.notify_requests is 'Back-in-stock notification requests. Anyone can request, admin can view all.';

create index if not exists idx_notify_requests_product_id on public.notify_requests(product_id);
create index if not exists idx_notify_requests_email on public.notify_requests(email);

-- ===== RLS: reviews =====
alter table public.reviews enable row level security;

-- Public can read all reviews
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
on public.reviews for select
to anon, authenticated
using (true);

-- Authenticated users can insert their own reviews
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
on public.reviews for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can delete their own reviews
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
on public.reviews for delete
to authenticated
using (auth.uid() = user_id);

-- Admin can manage all reviews
drop policy if exists "reviews_manage_admin" on public.reviews;
create policy "reviews_manage_admin"
on public.reviews for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ===== RLS: notify_requests =====
alter table public.notify_requests enable row level security;

-- Anyone can insert notification requests
drop policy if exists "notify_requests_insert_public" on public.notify_requests;
create policy "notify_requests_insert_public"
on public.notify_requests for insert
to anon, authenticated
with check (true);

-- Users can delete their own requests
drop policy if exists "notify_requests_delete_own" on public.notify_requests;
create policy "notify_requests_delete_own"
on public.notify_requests for delete
to authenticated
using (email = (select email from auth.users where id = auth.uid()));

-- Admin can view all requests
drop policy if exists "notify_requests_select_admin" on public.notify_requests;
create policy "notify_requests_select_admin"
on public.notify_requests for select
to authenticated
using (public.is_admin());

-- Admin can manage all requests
drop policy if exists "notify_requests_manage_admin" on public.notify_requests;
create policy "notify_requests_manage_admin"
on public.notify_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
