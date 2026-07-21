-- Phase 2.1B: Profiles, Creators & Categories Database Foundation
-- Extensions and enum types used throughout this and later migrations.

create extension if not exists pgcrypto; -- gen_random_uuid()

do $$ begin
  create type public.user_role as enum ('fan', 'creator', 'moderator', 'admin', 'super_admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.profile_status as enum ('active', 'suspended', 'banned', 'deleted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.creator_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.availability_status as enum ('available', 'busy', 'offline');
exception
  when duplicate_object then null;
end $$;
