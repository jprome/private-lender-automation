-- Stop storing client IP addresses
-- 1) Wipe any previously stored IPs
-- 2) Drop the column entirely so it cannot be stored going forward

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'intake_submissions'
      and column_name = 'client_ip'
  ) then
    update intake_submissions set client_ip = null;
    alter table intake_submissions drop column client_ip;
  end if;
end $$;
