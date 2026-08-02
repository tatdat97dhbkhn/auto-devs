package aiexecutors

import (
	"context"
	"strings"
	"testing"

	"github.com/auto-devs/auto-devs/internal/entity"
)

func TestParseSessionID(t *testing.T) {
	output := `{"type":"system","session_id":"old"}
{"type":"assistant","session_id":"new"}`
	if got := ParseSessionID(output); got != "new" {
		t.Fatalf("ParseSessionID() = %q, want new", got)
	}
}

func TestClaudePlanningCommandWithSession(t *testing.T) {
	path := "/tmp/worktree"
	task := &entity.Task{Title: "title", Description: "description", WorktreePath: &path}
	command, _, _, err := NewClaudeCodeExecutor().GetPlanningCommandWithSession(context.Background(), task, "session-123")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(command, "--resume 'session-123'") {
		t.Fatalf("command %q does not resume session", command)
	}
}
