alter table if exists intake_submissions
  add column if not exists relay_status_code integer,
  add column if not exists relay_last_error text;
