ALTER TABLE executions
    ADD COLUMN IF NOT EXISTS execution_type VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_executions_execution_type ON executions (execution_type);

-- A task may now have an immutable history of plans, so the legacy one-plan
-- partial unique index must be removed before inserting revisions.
DROP INDEX IF EXISTS idx_plans_unique_task_id;

ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS revision_of_plan_id UUID,
    ADD COLUMN IF NOT EXISTS revision_feedback TEXT,
    ADD COLUMN IF NOT EXISTS revision_execution_id UUID;

CREATE INDEX IF NOT EXISTS idx_plans_revision_of_plan_id ON plans (revision_of_plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_revision_execution_id ON plans (revision_execution_id);

ALTER TABLE plans
    ADD CONSTRAINT fk_plans_revision_of_plan
    FOREIGN KEY (revision_of_plan_id) REFERENCES plans(id) ON DELETE SET NULL;
