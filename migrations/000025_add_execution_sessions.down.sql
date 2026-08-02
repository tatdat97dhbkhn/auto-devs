DROP INDEX IF EXISTS idx_one_active_plan_revision_per_task;
ALTER TABLE plans DROP CONSTRAINT IF EXISTS fk_plans_execution;
DROP INDEX IF EXISTS idx_plans_execution_id;
ALTER TABLE plans DROP COLUMN IF EXISTS execution_id;
DROP INDEX IF EXISTS idx_executions_session_id;
ALTER TABLE executions DROP COLUMN IF EXISTS context_mode;
ALTER TABLE executions DROP COLUMN IF EXISTS session_id;
