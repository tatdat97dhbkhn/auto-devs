-- Store the assistant configuration used by each AI execution.
ALTER TABLE executions
    ADD COLUMN IF NOT EXISTS ai_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS model VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reasoning_effort VARCHAR(30);

COMMENT ON COLUMN executions.ai_type IS 'AI assistant used for the execution';
COMMENT ON COLUMN executions.model IS 'Model selected for the execution';
COMMENT ON COLUMN executions.reasoning_effort IS 'Reasoning effort selected for the execution';

CREATE INDEX IF NOT EXISTS idx_executions_ai_type ON executions (ai_type);
CREATE INDEX IF NOT EXISTS idx_executions_model ON executions (model);
