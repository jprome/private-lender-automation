-- Add branch column to separate demo and main submissions
alter table intake_submissions add column if not exists branch text default 'main';

-- Create index for efficient filtering
create index if not exists intake_submissions_branch_idx on intake_submissions (branch);

-- Update existing submissions to 'main' branch
update intake_submissions set branch = 'main' where branch is null;
