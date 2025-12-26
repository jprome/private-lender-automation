-- Supabase schema for storing submissions and tracking client metadata
create table if not exists intake_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  email text not null,
  data jsonb not null,
  status text not null default 'received',
  user_agent text
);

create index if not exists intake_submissions_created_at_idx on intake_submissions (created_at);
create index if not exists intake_submissions_status_idx on intake_submissions (status);
