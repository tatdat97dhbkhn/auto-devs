package aiexecutors

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/auto-devs/auto-devs/internal/entity"
)

// CodexExecutor runs the locally installed Codex CLI.
type CodexExecutor struct {
	model           string
	reasoningEffort string
}

func NewCodexExecutor(settings ...string) *CodexExecutor {
	executor := &CodexExecutor{}
	if len(settings) > 0 {
		executor.model = settings[0]
	}
	if len(settings) > 1 {
		executor.reasoningEffort = settings[1]
	}
	return executor
}

func (e *CodexExecutor) GetPlanningCommand(_ context.Context, task *entity.Task) (string, string, map[string]string, error) {
	if task.RevisionPrompt != "" {
		return e.command("codex exec --sandbox read-only --color never --json -"), task.RevisionPrompt, nil, nil
	}
	prompt := fmt.Sprintf(`Create a detailed implementation plan for the task below.

Inspect the repository as needed, but do not modify any files. Return only the final plan as Markdown, with no preamble or commentary.

Task: %s
Task Description: %s`, task.Title, task.Description)
	prompt += `

At the top of the response, include this exact machine-readable section and choose clear English values based on the task:
## Plan Metadata
- Branch Name: feature/<short-kebab-case-description>
- Commit Message: <one-line imperative English commit message>
- Pull Request Title: <concise English title, preferably the same as the commit message>

Then include the implementation plan under ## Implementation Plan. Do not put any other text in Plan Metadata.`

	return e.command("codex exec --sandbox read-only --color never --json -"), prompt, nil, nil
}

// GetPlanningCommandWithSession uses Codex's native exec resume subcommand.
func (e *CodexExecutor) GetPlanningCommandWithSession(_ context.Context, task *entity.Task, sessionID string) (string, string, map[string]string, error) {
	// `exec resume` has its own, narrower option set. In particular the
	// installed Codex CLI does not accept --sandbox/--color on this
	// subcommand; passing either makes resume fail and causes the worker to
	// fall back to a fresh execution.
	command := e.command("codex exec resume " + shellQuote(sessionID) + " --json -")
	if task.RevisionPrompt == "" {
		return "", "", nil, fmt.Errorf("codex resume requires a revision prompt")
	}
	return command, task.RevisionPrompt, nil, nil
}

func (e *CodexExecutor) GetImplementationCommand(_ context.Context, task *entity.Task) (string, string, map[string]string, error) {
	var prompt strings.Builder
	prompt.WriteString("Implement the task in the current worktree. Verify the changes with relevant tests.\n\n")
	fmt.Fprintf(&prompt, "Task: %s\nTask Description: %s", task.Title, task.Description)
	if len(task.Plans) > 0 && strings.TrimSpace(task.Plans[0].Content) != "" {
		fmt.Fprintf(&prompt, "\n\nApproved Plan:\n%s", task.Plans[0].Content)
	}

	return e.command("codex exec --dangerously-bypass-approvals-and-sandbox --color never -"), prompt.String(), nil, nil
}

func (e *CodexExecutor) command(command string) string {
	stdinMarker := ""
	if strings.HasSuffix(command, " -") {
		command = strings.TrimSuffix(command, " -")
		stdinMarker = " -"
	}
	if e.model != "" {
		command += " -m " + shellQuote(e.model)
	}
	if e.reasoningEffort != "" {
		command += " -c model_reasoning_effort=" + shellQuote(e.reasoningEffort)
	}
	return command + stdinMarker
}

func (e *CodexExecutor) ParseOutputToLogs(output string) []*entity.ExecutionLog {
	lines := strings.Split(output, "\n")
	logs := make([]*entity.ExecutionLog, 0, len(lines))
	for i, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		logs = append(logs, &entity.ExecutionLog{
			Message: line,
			Level:   entity.LogLevelInfo,
			Source:  "stdout",
			Line:    i,
		})
	}
	return logs
}

func (e *CodexExecutor) ParseOutputToPlan(output string) (string, error) {
	var agentMessage string
	for _, line := range strings.Split(output, "\n") {
		var event struct {
			Type string `json:"type"`
			Item struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"item"`
		}
		if json.Unmarshal([]byte(line), &event) == nil && event.Item.Type == "agent_message" && event.Item.Text != "" {
			agentMessage = event.Item.Text
		}
	}
	if agentMessage != "" {
		return strings.TrimSpace(agentMessage), nil
	}
	plan := strings.TrimSpace(output)
	if plan == "" {
		return "", fmt.Errorf("codex did not produce a planning response")
	}
	return plan, nil
}
