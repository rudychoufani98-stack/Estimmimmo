-- ============================================================================
--  EstimImmo - Schema Supabase
--  A coller dans Supabase -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1) Table des projets (chaque bien sauvegarde = 1 ligne, isolee par utilisateur)
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nom         text not null,                 -- nom du projet (ex: "Appart Lyon 3e")
  data        jsonb not null default '{}',   -- toutes les donnees (estimation, rentabilite...)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.projects enable row level security;

-- Chaque utilisateur ne voit/modifie QUE ses propres projets
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- 2) Profil utilisateur (statut premium pour le paywall Stripe)
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  is_premium          boolean default false,
  stripe_customer_id  text,
  created_at          timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Cree automatiquement un profil a chaque inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
