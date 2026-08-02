package aiexecutors

import (
	"context"
	"testing"

	"github.com/auto-devs/auto-devs/internal/entity"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCodexExecutorCommands(t *testing.T) {
	executor := NewCodexExecutor()
	task := &entity.Task{Title: "Add Codex", Description: "Support planning and implementation"}

	command, prompt, env, err := executor.GetPlanningCommand(context.Background(), task)
	require.NoError(t, err)
	assert.Equal(t, "codex exec --sandbox read-only --color never --json -", command)
	assert.Nil(t, env)
	assert.Contains(t, prompt, task.Title)
	assert.Contains(t, prompt, task.Description)
	assert.Contains(t, prompt, "only the final plan as Markdown")

	task.Plans = []entity.Plan{{Content: "# Approved plan\n- Make the change"}}
	command, prompt, env, err = executor.GetImplementationCommand(context.Background(), task)
	require.NoError(t, err)
	assert.Equal(t, "codex exec --dangerously-bypass-approvals-and-sandbox --color never -", command)
	assert.Nil(t, env)
	assert.Contains(t, prompt, task.Title)
	assert.Contains(t, prompt, task.Description)
	assert.Contains(t, prompt, task.Plans[0].Content)
}

func TestCodexExecutorParseOutputToPlan(t *testing.T) {
	executor := NewCodexExecutor()

	plan, err := executor.ParseOutputToPlan("\n# Plan\n\n- First step\n")
	require.NoError(t, err)
	assert.Equal(t, "# Plan\n\n- First step", plan)

	plan, err = executor.ParseOutputToPlan(`{"type":"item.completed","item":{"type":"agent_message","text":"# JSON Plan\n\n- Step"}}`)
	require.NoError(t, err)
	assert.Equal(t, "# JSON Plan\n\n- Step", plan)

	_, err = executor.ParseOutputToPlan(" \n\t")
	require.Error(t, err)
}

func TestExtractPlanMetadata(t *testing.T) {
	metadata, content := ExtractPlanMetadata("## Plan Metadata\n- Branch Name: `feature/remove-agent-md`\n- Commit Message: Remove AGENT.md\n- Pull Request Title: Remove AGENT.md\n\n## Implementation Plan\n\n- Delete the file")
	assert.Equal(t, "feature/remove-agent-md", metadata.BranchName)
	assert.Equal(t, "Remove AGENT.md", metadata.CommitMessage)
	assert.Equal(t, "Remove AGENT.md", metadata.PRTitle)
	assert.Equal(t, "## Implementation Plan\n\n- Delete the file", content)
}

func TestCodexExecutorResumeCommand(t *testing.T) {
	path := "/tmp/worktree"
	task := &entity.Task{RevisionPrompt: "revise this plan", WorktreePath: &path}
	command, prompt, _, err := NewCodexExecutor().GetPlanningCommandWithSession(context.Background(), task, "thread-123")
	require.NoError(t, err)
	assert.Equal(t, "codex exec resume 'thread-123' --json -", command)
	assert.Equal(t, task.RevisionPrompt, prompt)
}

func TestCodexExecutorParseOutputToLogs(t *testing.T) {
	logs := NewCodexExecutor().ParseOutputToLogs("first line\n\nsecond line")
	require.Len(t, logs, 2)
	assert.Equal(t, "first line", logs[0].Message)
	assert.Equal(t, 0, logs[0].Line)
	assert.Equal(t, "second line", logs[1].Message)
	assert.Equal(t, 2, logs[1].Line)
	assert.Equal(t, "stdout", logs[1].Source)
}
