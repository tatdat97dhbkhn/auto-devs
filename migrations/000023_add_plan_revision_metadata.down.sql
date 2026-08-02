ALTER TABLE plans DROP CONSTRAINT IF EXISTS fk_plans_revision_of_plan;
DROP INDEX IF EXISTS idx_plans_revision_execution_id;
DROP INDEX IF EXISTS idx_plans_revision_of_plan_id;
ALTER TABLE plans
    DROP COLUMN IF EXISTS revision_execution_id,
    DROP COLUMN IF EXISTS revision_feedback,
    DROP COLUMN IF EXISTS revision_of_plan_id;

DROP INDEX IF EXISTS idx_executions_execution_type;
ALTER TABLE executions DROP COLUMN IF EXISTS execution_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_unique_task_id ON plans (task_id) WHERE deleted_at IS NULL;
