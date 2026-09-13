create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  genre text not null check (char_length(genre) between 2 and 40),
  description text not null check (char_length(description) between 20 and 1000),
  creator_name text not null,
  repo_url text,
  storage_path text not null unique,
  stripe_account_id text,
  price_cents integer not null default 299 check (price_cents = 299),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  rights_confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  status text not null check (status in ('paid','refunded','disputed')),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists purchases_buyer_idx on public.purchases(buyer_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.purchases enable row level security;
revoke all on public.profiles, public.listings, public.purchases from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-files', 'seller-files', false, 104857600, array['application/zip','application/x-zip-compressed'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "seller upload own zip" on storage.objects;
create policy "seller upload own zip" on storage.objects for insert to authenticated
with check (bucket_id = 'seller-files' and (storage.foldername(name))[1] = (select auth.uid()::text) and lower(storage.extension(name)) = 'zip');

drop policy if exists "seller read own upload" on storage.objects;
create policy "seller read own upload" on storage.objects for select to authenticated
using (bucket_id = 'seller-files' and owner_id = (select auth.uid()::text));

drop policy if exists "seller delete own upload" on storage.objects;
create policy "seller delete own upload" on storage.objects for delete to authenticated
using (bucket_id = 'seller-files' and owner_id = (select auth.uid()::text));
