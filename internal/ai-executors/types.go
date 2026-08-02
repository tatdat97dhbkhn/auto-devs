package aiexecutors

import (
	"encoding/json"
	"strings"
)

// PlanMetadata contains delivery names selected by the planning model.
type PlanMetadata struct {
	BranchName    string
	CommitMessage string
	PRTitle       string
}

// ExtractPlanMetadata reads the machine-readable metadata section requested
// by the planning prompt and removes it from the plan shown to reviewers.
// Plans created before this section was introduced simply return empty metadata
// and their original content.
func ExtractPlanMetadata(content string) (PlanMetadata, string) {
	var metadata PlanMetadata
	lines := strings.Split(strings.TrimSpace(content), "\n")
	metadataStart := -1
	metadataEnd := len(lines)
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.EqualFold(trimmed, "## Plan Metadata") || strings.EqualFold(trimmed, "## Delivery Metadata") {
			metadataStart = i
			continue
		}
		if metadataStart >= 0 && i > metadataStart && strings.HasPrefix(trimmed, "## ") {
			metadataEnd = i
			break
		}
		if metadataStart < 0 {
			continue
		}
		parsePlanMetadataLine(trimmed, &metadata)
	}
	if metadataStart < 0 {
		return metadata, strings.TrimSpace(content)
	}
	remaining := append([]string{}, lines[:metadataStart]...)
	remaining = append(remaining, lines[metadataEnd:]...)
	return metadata, strings.TrimSpace(strings.Join(remaining, "\n"))
}

func parsePlanMetadataLine(line string, metadata *PlanMetadata) {
	line = strings.TrimSpace(strings.TrimPrefix(line, "-"))
	line = strings.TrimSpace(strings.TrimPrefix(line, "*"))
	line = strings.TrimSpace(strings.TrimPrefix(line, "`"))
	line = strings.TrimSpace(strings.TrimSuffix(line, "`"))
	for _, field := range []struct {
		label  string
		target *string
	}{
		{"Branch Name:", &metadata.BranchName},
		{"Commit Message:", &metadata.CommitMessage},
		{"Pull Request Title:", &metadata.PRTitle},
		{"PR Title:", &metadata.PRTitle},
	} {
		if len(line) >= len(field.label) && strings.EqualFold(line[:len(field.label)], field.label) {
			value := strings.TrimSpace(line[len(field.label):])
			value = strings.Trim(value, "`\"'")
			*field.target = strings.TrimSpace(value)
			return
		}
	}
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

const NOT_SUPPORT_PLANNING = "NOT_SUPPORT_PLANNING"

type PlanOutput struct {
	Type            string      `json:"type"`
	Message         PlanMessage `json:"message"`
	ParentToolUseID string      `json:"parent_tool_use_id"`
	SessionID       string      `json:"session_id"`
}

// ParseSessionID extracts the last non-empty session_id emitted by a
// stream-json executor. It intentionally accepts any event shape because
// Claude emits the field on different event types across CLI versions.
func ParseSessionID(output string) string {
	var sessionID string
	for _, line := range strings.Split(output, "\n") {
		var event map[string]interface{}
		if json.Unmarshal([]byte(line), &event) != nil {
			continue
		}
		value, ok := event["session_id"].(string)
		if !ok || value == "" {
			// Codex JSONL calls the same identifier thread_id.
			value, ok = event["thread_id"].(string)
		}
		if ok && value != "" {
			sessionID = value
		}
	}
	return sessionID
}

type PlanMessage struct {
	ID      string        `json:"id"`
	Type    string        `json:"type"`
	Role    string        `json:"role"`
	Model   string        `json:"model"`
	Content []PlanContent `json:"content"`
}

type PlanContent struct {
	Type  string           `json:"type"`
	ID    string           `json:"id"`
	Role  string           `json:"role"`
	Model string           `json:"model"`
	Input PlanContentInput `json:"input"`
}

type PlanContentInput struct {
	Plan string `json:"plan"`
}
