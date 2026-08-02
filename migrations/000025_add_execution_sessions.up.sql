ALTER TABLE executions
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS context_mode VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_executions_session_id ON executions (session_id);

ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS execution_id UUID;

CREATE INDEX IF NOT EXISTS idx_plans_execution_id ON plans (execution_id);

ALTER TABLE plans
    ADD CONSTRAINT fk_plans_execution
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE SET NULL;

-- Only one revision may run for a task at a time. Completed/failed history
-- remains immutable and can contain multiple revisions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_plan_revision_per_task
    ON executions (task_id)
    WHERE execution_type = 'PLAN_REVISION' AND status IN ('PENDING', 'RUNNING');
