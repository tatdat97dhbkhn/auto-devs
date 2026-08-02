ALTER TABLE plans
    DROP COLUMN IF EXISTS branch_name,
    DROP COLUMN IF EXISTS commit_message,
    DROP COLUMN IF EXISTS pr_title;
