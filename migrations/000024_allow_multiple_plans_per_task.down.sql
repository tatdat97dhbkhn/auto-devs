CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_unique_task_id
    ON plans (task_id) WHERE deleted_at IS NULL;
