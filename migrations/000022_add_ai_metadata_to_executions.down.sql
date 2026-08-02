DROP INDEX IF EXISTS idx_executions_model;
DROP INDEX IF EXISTS idx_executions_ai_type;

ALTER TABLE executions
    DROP COLUMN IF EXISTS reasoning_effort,
    DROP COLUMN IF EXISTS model,
    DROP COLUMN IF EXISTS ai_type;
