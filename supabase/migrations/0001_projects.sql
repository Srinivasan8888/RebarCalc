-- RebarCalc cloud storage. One row per project per owner; the payload is the same
-- SerializedProject JSON the browser keeps in localStorage, so a project round-trips
-- between local and cloud without any transformation.
--
-- Integrity rules enforced here, not in the app:
--   * optimistic concurrency: the app updates `where version = <known>`; 0 rows = conflict
--   * every insert/update of payload is copied to project_versions (append-only history)
--   * delete is soft (deleted_at); nothing is ever physically removed by the app
--   * row-level security: an owner sees only their own rows

create table public.projects (
  owner      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  id         text        not null,                 -- the app's project id (project_<ts>_<rand>)
  name       text        not null,
  payload    jsonb       not null,                 -- SerializedProject
  version    integer     not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner, id)
);

create table public.project_versions (
  seq        bigserial   primary key,
  owner      uuid        not null,
  project_id text        not null,
  version    integer,                              -- null for copies the app stashed itself (see note)
  payload    jsonb       not null,
  note       text,
  saved_at   timestamptz not null default now()
);
create index project_versions_by_project on public.project_versions (owner, project_id, seq);

create function public.keep_project_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into project_versions (owner, project_id, version, payload, note)
  values (new.owner, new.id, new.version, new.payload, case when tg_op = 'INSERT' then 'created' else 'saved' end);
  return new;
end $$;

create trigger projects_history
  after insert or update of payload on public.projects
  for each row execute function public.keep_project_history();

alter table public.projects enable row level security;
create policy "owner reads own projects"  on public.projects for select using (owner = auth.uid());
create policy "owner writes own projects" on public.projects for insert with check (owner = auth.uid());
create policy "owner updates own projects" on public.projects for update using (owner = auth.uid()) with check (owner = auth.uid());
-- no delete policy on purpose: the app soft-deletes

alter table public.project_versions enable row level security;
create policy "owner reads own history"  on public.project_versions for select using (owner = auth.uid());
create policy "owner stashes a copy"     on public.project_versions for insert with check (owner = auth.uid());

-- Read-only share links. The token is the only secret; anyone holding it can read the payload.
create table public.project_shares (
  token      uuid        primary key default gen_random_uuid(),
  owner      uuid        not null default auth.uid(),
  project_id text        not null,
  created_at timestamptz not null default now(),
  foreign key (owner, project_id) references public.projects (owner, id) on delete cascade
);
alter table public.project_shares enable row level security;
create policy "owner manages own shares" on public.project_shares for all using (owner = auth.uid()) with check (owner = auth.uid());

create function public.shared_project(share_token uuid) returns jsonb
language sql security definer stable set search_path = public as $$
  select p.payload
  from project_shares s
  join projects p on p.owner = s.owner and p.id = s.project_id
  where s.token = share_token and p.deleted_at is null
$$;
grant execute on function public.shared_project(uuid) to anon, authenticated;
