export type TaskStatus =
  | 'TODO'
  | 'PLANNING'
  | 'PLAN_REVIEWING'
  | 'IMPLEMENTING'
  | 'CODE_REVIEWING'
  | 'DONE'
  | 'CANCELLED'
export type TaskGitStatus =
  | 'NO_GIT' // No Git worktree/branch
  | 'WORKTREE_PENDING' // Worktree creation requested but not created
  | 'WORKTREE_CREATED' // Worktree created successfully
  | 'BRANCH_CREATED' // Branch created in worktree
  | 'CHANGES_PENDING' // Has uncommitted changes
  | 'CHANGES_STAGED' // Has staged changes ready for commit
  | 'CHANGES_COMMITTED' // Changes committed to branch
  | 'PR_CREATED' // Pull request created
  | 'PR_MERGED' // Pull request merged
  | 'WORKTREE_ERROR' // Error with worktree operations

interface TaskGitInfo {
  status: TaskGitStatus
  branch_name?: string
  worktree_path?: string
  pr_url?: string
  has_uncommitted_changes?: boolean
  has_staged_changes?: boolean
  commits_ahead?: number
  commits_behind?: number
  last_sync?: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  status: TaskStatus
  plan: string
  base_branch_name?: string
  branch_name: string
  pr_url: string
  created_at: string
  updated_at: string
  completed_at?: string
  worktree_path?: string
  // Git information
  git_info?: TaskGitInfo
  // Error logs
  error_logs?: string[]
}

export interface TaskPlan {
  id: string
  task_id: string
  content: string
  status: string
  created_at: string
  updated_at: string
  revision_of_plan_id?: string
  revision_feedback?: string
  revision_execution_id?: string
}

export interface TaskPlansResponse {
  plans: TaskPlan[]
}

export interface CreateTaskRequest {
  project_id: string
  title: string
  description?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: TaskStatus
  plan?: string
  branch_name?: string
  pr_url?: string
}

export interface TaskFilters {
  status?: TaskStatus[]
  git_status?: TaskGitStatus[]
  search?: string
  branch_search?: string
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'git_status'
  sortOrder?: 'asc' | 'desc'
}

export interface TasksResponse {
  tasks: Task[]
  total: number
  page: number
  limit: number
}

// Start Planning types
export interface StartPlanningRequest {
  branch_name: string
  ai_type: string
  model?: string
  reasoning_effort?: string
  auto_implement?: boolean
  use_remote_branch?: boolean
}

export interface StartPlanningResponse {
  message: string
  job_id: string
}

export interface ApprovePlanRequest {
  plan_id: string
  ai_type: string
  model?: string
  reasoning_effort?: string
}

export interface StartImplementingDirectRequest {
  branch_name: string
  ai_type: string
  model?: string
  reasoning_effort?: string
  use_remote_branch?: boolean
}

export interface AIOption {
  name: string
  value: string
  description: string
  models: AIModel[]
}

export interface AIModel {
  id: string
  name: string
  description: string
  reasoning_levels?: AIReasoningLevel[]
}

export interface AIReasoningLevel {
  value: string
  name: string
  description: string
}

export function getAIs(forPlanning: boolean) {
  const claudeCode: AIOption = {
    name: 'Claude Code',
    value: 'claude-code',
    description: 'Anthropic Claude Code',
    models: [],
  }
  const fakeCode: AIOption = {
    name: 'Fake Code',
    value: 'fake-code',
    description: 'Test/Demo AI',
    models: [
      {
        id: 'fake-code',
        name: 'Mô phỏng',
        description: 'Không dùng model thật',
      },
    ],
  }
  const cursorAgent: AIOption = {
    name: 'Cursor Agent',
    value: 'cursor-agent',
    description: 'Cursor Agent',
    models: [],
  }
  const deepSeek: AIOption = {
    name: 'Deep Seek',
    value: 'deep-seek',
    description: 'Deep Seek',
    models: [],
  }
  const codex: AIOption = {
    name: 'Codex',
    value: 'codex',
    description: 'OpenAI Codex CLI',
    models: [],
  }
  // Cursor Agent does not support planning, so it is not included in the planning AIs
  if (forPlanning) {
    return [claudeCode, codex, deepSeek, fakeCode]
  }
  return [claudeCode, codex, deepSeek, fakeCode, cursorAgent]
}

export function getValidAIType(aiType: string | null, forPlanning: boolean) {
  const ais = getAIs(forPlanning)
  return ais.some((ai) => ai.value === aiType) ? aiType! : ais[0].value
}
