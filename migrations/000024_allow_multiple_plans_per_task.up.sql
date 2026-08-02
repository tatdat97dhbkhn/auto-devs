-- Migration 000023 added revision metadata but older installations may still
-- have the original one-plan-per-task index.
DROP INDEX IF EXISTS idx_plans_unique_task_id;
