-- ============================================================
-- Glapme — Full Database Schema
-- Run this once in Supabase SQL Editor to set up everything.
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  username     text not null unique,
  role         text not null check (role in ('developer', 'designer', 'nomad', 'student', 'artist', 'explorer')),
  bio          text,
  lat          double precision not null,
  lng          double precision not null,
  avatar_seed  text not null,
  avatar_url   text,
  likes        integer default 0 not null,
  is_online    boolean default true not null,
  timestamp    timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable Row Level Security for easy local/development testing
alter table public.profiles disable row level security;

-- Grant permissions to public (all roles)
grant all privileges on table public.profiles to public;

-- ── Activities ────────────────────────────────────────────────
create table if not exists public.activities (
  id        uuid default gen_random_uuid() primary key,
  user_id   uuid references auth.users on delete set null,
  username  text not null,
  type      text not null check (type in ('signup', 'pin', 'like', 'wave')),
  detail    text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable Row Level Security for easy local/development testing
alter table public.activities disable row level security;

-- Grant permissions to public (all roles)
grant all privileges on table public.activities to public;

-- ── RPC: Increment likes atomically ──────────────────────────
create or replace function public.increment_likes(target_id uuid)
returns void as $$
begin
  update public.profiles set likes = likes + 1 where id = target_id;
end;
$$ language plpgsql security definer;

-- ── Storage: PFP bucket ───────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('PFP', 'PFP', true)
on conflict (id) do update set public = true;

-- Drop existing storage policies
drop policy if exists "Public access to PFP images" on storage.objects;
drop policy if exists "Authenticated users can upload PFP images" on storage.objects;
drop policy if exists "Users can update their own PFP images" on storage.objects;
drop policy if exists "Users can delete their own PFP images" on storage.objects;
drop policy if exists "Anyone can upload PFP images" on storage.objects;
drop policy if exists "Anyone can update PFP images" on storage.objects;
drop policy if exists "Anyone can delete PFP images" on storage.objects;

-- Create highly permissive storage policies for development (allows anonymous uploads too)
create policy "Public access to PFP images"
  on storage.objects for select
  using (bucket_id = 'PFP');

create policy "Anyone can upload PFP images"
  on storage.objects for insert
  with check (bucket_id = 'PFP');

create policy "Anyone can update PFP images"
  on storage.objects for update
  using (bucket_id = 'PFP');

create policy "Anyone can delete PFP images"
  on storage.objects for delete
  using (bucket_id = 'PFP');
