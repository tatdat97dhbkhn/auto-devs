package github

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/auto-devs/auto-devs/internal/entity"
	"github.com/google/uuid"
)

// GitHubServiceInterface defines the interface for GitHub operations needed by PRCreator and PRMonitor
type GitHubServiceInterface interface {
	CreatePullRequest(ctx context.Context, repo, base, head, title, body string) (*entity.PullRequest, error)
	UpdatePullRequest(ctx context.Context, repo string, prNumber int, updates map[string]interface{}) error
	GetPullRequest(ctx context.Context, repo string, prNumber int) (*entity.PullRequest, error)
}

// OpenPullRequestFinder is implemented by GitHub clients that can look up an
// existing open PR by its head branch. It is optional to keep lightweight test
// and custom clients backward compatible.
type OpenPullRequestFinder interface {
	FindOpenPullRequest(ctx context.Context, repo, base, head string) (*entity.PullRequest, error)
}

// PRCreator handles automatic pull request creation from completed implementations
type PRCreator struct {
	githubService GitHubServiceInterface
	baseURL       string // Base URL for task links (e.g., "https://auto-devs.example.com")
}

// NewPRCreator creates a new PR creator instance
func NewPRCreator(githubService GitHubServiceInterface, baseURL string) *PRCreator {
	return &PRCreator{
		githubService: githubService,
		baseURL:       strings.TrimSuffix(baseURL, "/"),
	}
}

// CreatePRFromImplementation automatically creates a pull request when implementation is complete
func (prc *PRCreator) CreatePRFromImplementation(ctx context.Context, task entity.Task, execution entity.Execution, plan *entity.Plan) (*entity.PullRequest, error) {
	// Validate inputs using comprehensive validation
	if err := prc.ValidateTaskForPRCreation(task, execution); err != nil {
		return nil, err
	}

	// Generate PR title
	title, err := prc.GeneratePRTitleFromPlan(task, plan)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PR title: %w", err)
	}

	// Generate PR description
	description, err := prc.GeneratePRDescription(task, plan, execution)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PR description: %w", err)
	}

	// Extract repository from task's project (this would need to be available via Task.Project)
	// For now, assume repository is stored in project or can be derived
	repository := prc.getRepositoryFromTask(task)
	if repository == "" {
		return nil, fmt.Errorf("unable to determine repository from task")
	}

	// GitHub rejects a second open PR with the same head/base pair. Reusing the
	// existing PR makes retries and duplicate worker deliveries idempotent.
	if finder, ok := prc.githubService.(OpenPullRequestFinder); ok {
		existing, findErr := finder.FindOpenPullRequest(ctx, repository, *task.BaseBranchName, *task.BranchName)
		if findErr != nil {
			return nil, fmt.Errorf("failed to find existing pull request: %w", findErr)
		}
		if existing != nil {
			existing.TaskID = task.ID
			return existing, nil
		}
	}

	// Create the pull request via GitHub API
	githubPR, err := prc.githubService.CreatePullRequest(
		ctx,
		repository,
		*task.BaseBranchName, // base branch - should be get from tas
		*task.BranchName,     // head branch
		title,
		description,
	)
	if err != nil {
		// A duplicate worker can race with the lookup above. Re-check after a
		// failed create so GitHub's 422 "a pull request already exists" is still
		// handled idempotently.
		if finder, ok := prc.githubService.(OpenPullRequestFinder); ok {
			if existing, findErr := finder.FindOpenPullRequest(ctx, repository, *task.BaseBranchName, *task.BranchName); findErr == nil && existing != nil {
				existing.TaskID = task.ID
				return existing, nil
			}
		}
		return nil, fmt.Errorf("failed to create GitHub pull request: %w", err)
	}

	githubPR.TaskID = task.ID
	// Add task links to the created PR
	// if err := prc.AddTaskLinks(ctx, githubPR, task); err != nil {
	// 	// Log the error but don't fail the PR creation
	// 	// This could be handled with a logger in the future
	// 	_ = fmt.Errorf("failed to add task links to PR: %w", err)
	// }

	return githubPR, nil
}

// GeneratePRTitle creates an informative and unique title for the pull request
func (prc *PRCreator) GeneratePRTitle(task entity.Task) (string, error) {
	if task.Title == "" {
		return "", fmt.Errorf("task title cannot be empty")
	}

	// Determine type prefix based on task characteristics
	typePrefix := prc.determineTypePrefix(task)

	// Create title with format: "[TYPE] Task Title (Task-ID)"
	// Truncate title if too long to fit within GitHub's PR title limits
	maxTitleLength := 255 - len(typePrefix) - len(task.ID.String()) - 5 // Account for brackets and spaces

	title := EnglishTaskTitle(task.Title)
	if len(title) > maxTitleLength {
		title = title[:maxTitleLength-3] + "..."
	}

	return fmt.Sprintf("%s %s (%s)", typePrefix, title, task.ID.String()[:8]), nil
}

// GeneratePRTitleFromPlan creates an English review title from the AI plan.
func (prc *PRCreator) GeneratePRTitleFromPlan(task entity.Task, plan *entity.Plan) (string, error) {
	if task.ID == uuid.Nil {
		return "", fmt.Errorf("task ID cannot be empty")
	}
	title := ""
	if plan != nil {
		title = strings.TrimSpace(plan.PRTitle)
	}
	if title == "" {
		title = EnglishTaskTitle(task.Title)
	}
	if title == "" {
		title = fmt.Sprintf("Implement task %s", task.ID.String()[:8])
	}
	if len(title) > 250 {
		title = title[:247] + "..."
	}
	return title, nil
}

// EnglishTaskTitle normalizes common task action prefixes for PR and commit
// subjects while preserving the meaningful filename or task subject.
func EnglishTaskTitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return ""
	}
	// Normalize common filler words before translating the action prefix.
	for _, prefix := range []string{"file ", "tệp ", "tep "} {
		if strings.HasPrefix(strings.ToLower(title), prefix) {
			title = strings.TrimSpace(title[len(prefix):])
			break
		}
	}
	// Convert common action words while preserving filenames and the rest of
	// the user's concise task title.
	for _, replacement := range []struct {
		prefixes []string
		value    string
	}{
		{[]string{"xóa ", "xoá ", "bo ", "bỏ ", "loại bỏ ", "loai bo ", "gỡ ", "go "}, "Remove "},
		{[]string{"thêm ", "them "}, "Add "},
		{[]string{"cập nhật ", "cap nhat "}, "Update "},
		{[]string{"sửa ", "sua "}, "Fix "},
		{[]string{"tạo ", "tao "}, "Create "},
		{[]string{"đổi ", "doi "}, "Change "},
		{[]string{"di chuyển ", "di chuyen "}, "Move "},
		{[]string{"tối ưu ", "toi uu "}, "Optimize "},
	} {
		lower := strings.ToLower(title)
		for _, prefix := range replacement.prefixes {
			if strings.HasPrefix(lower, prefix) {
				subject := strings.TrimSpace(title[len(prefix):])
				// Vietnamese task titles often say "Bỏ file X". The
				// English subject should be the natural "Remove X" rather
				// than the literal and awkward "Remove file X".
				for _, filler := range []string{"file ", "files ", "tệp ", "tep ", "document ", "documents "} {
					if strings.HasPrefix(strings.ToLower(subject), filler) {
						subject = strings.TrimSpace(subject[len(filler):])
						break
					}
				}
				return replacement.value + subject
			}
		}
	}
	return title
}

// GeneratePRDescription creates a comprehensive description for the pull request
func (prc *PRCreator) GeneratePRDescription(task entity.Task, plan *entity.Plan, execution entity.Execution) (string, error) {
	title := EnglishTaskTitle(task.Title)
	if plan != nil && strings.TrimSpace(plan.PRTitle) != "" {
		title = strings.TrimSpace(plan.PRTitle)
	}
	if plan == nil || strings.TrimSpace(plan.Content) == "" {
		return fmt.Sprintf("## Task Information\n\n- **Title:** %s\n\n## Implementation Plan\n\nNo implementation plan was attached to this execution.", title), nil
	}
	var description strings.Builder
	description.WriteString("## Task Information\n\n")
	description.WriteString(fmt.Sprintf("- **Title:** %s\n", title))
	if strings.TrimSpace(task.Description) != "" {
		description.WriteString(fmt.Sprintf("- **Description:** %s\n", strings.TrimSpace(task.Description)))
	}
	description.WriteString("\n## Implementation Plan\n\n")
	description.WriteString(stripPlanHeading(plan.Content))
	return prc.SanitizeForGitHub(description.String()), nil
}

func stripPlanHeading(content string) string {
	lines := strings.Split(strings.TrimSpace(content), "\n")
	for i, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		if strings.HasPrefix(strings.TrimSpace(line), "#") {
			lines = append(lines[:i], lines[i+1:]...)
		}
		break
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

// AddTaskLinks creates bidirectional links between the PR and the task
func (prc *PRCreator) AddTaskLinks(ctx context.Context, pr *entity.PullRequest, task entity.Task) error {
	if pr == nil {
		return fmt.Errorf("pull request cannot be nil")
	}

	// Update PR description to include task reference if not already present
	taskRef := fmt.Sprintf("Task-%s", task.ID.String()[:8])
	if !strings.Contains(pr.Body, taskRef) {
		updatedBody := pr.Body + fmt.Sprintf("\n\n**Related Task:** %s", taskRef)

		// Update the PR via GitHub API
		updates := map[string]interface{}{
			"body": updatedBody,
		}

		err := prc.githubService.UpdatePullRequest(ctx, pr.Repository, pr.GitHubPRNumber, updates)
		if err != nil {
			return fmt.Errorf("failed to update PR with task link: %w", err)
		}

		// Update local entity
		pr.Body = updatedBody
	}

	return nil
}

// determineTypePrefix determines the appropriate type prefix for the PR title
func (prc *PRCreator) determineTypePrefix(task entity.Task) string {
	title := strings.ToLower(task.Title)
	description := strings.ToLower(task.Description)
	combined := title + " " + description

	// Check for common patterns
	if strings.Contains(combined, "fix") || strings.Contains(combined, "bug") || strings.Contains(combined, "error") {
		return "[fix]"
	}
	if strings.Contains(combined, "feature") || strings.Contains(combined, "add") || strings.Contains(combined, "implement") {
		return "[feat]"
	}
	if strings.Contains(combined, "refactor") || strings.Contains(combined, "improve") || strings.Contains(combined, "optimize") {
		return "[refactor]"
	}
	if strings.Contains(combined, "docs") || strings.Contains(combined, "documentation") {
		return "[docs]"
	}
	if strings.Contains(combined, "test") {
		return "[test]"
	}
	if strings.Contains(combined, "style") || strings.Contains(combined, "format") {
		return "[style]"
	}
	if strings.Contains(combined, "chore") || strings.Contains(combined, "maintenance") {
		return "[chore]"
	}

	// Default to feature for new functionality
	return "[feat]"
}

// getRepositoryFromTask extracts the repository information from a task
// Expected format: "https://github.com/owner/repo" -> "owner/repo"
func (prc *PRCreator) getRepositoryFromTask(task entity.Task) string {
	if task.Project.RepositoryURL == "" {
		return ""
	}

	// Parse GitHub URL to extract owner/repo format
	repoURL := task.Project.RepositoryURL
	log.Println("repoURL", repoURL)

	// Remove common prefixes
	prefixes := []string{
		"https://github.com/",
		"http://github.com/",
		"git@github.com:",
	}

	for _, prefix := range prefixes {
		if strings.HasPrefix(repoURL, prefix) {
			repoURL = strings.TrimPrefix(repoURL, prefix)
			break
		}
	}

	// Also accept SSH aliases such as git@github.com-work:owner/repo.git.
	// Git's SSH host alias is not part of the GitHub repository path.
	if strings.HasPrefix(repoURL, "git@") {
		if separator := strings.Index(repoURL, ":"); separator >= 0 {
			repoURL = repoURL[separator+1:]
		}
	}

	// Remove .git suffix if present
	repoURL = strings.TrimSuffix(repoURL, ".git")

	// Validate format (should be owner/repo)
	parts := strings.Split(repoURL, "/")
	if len(parts) >= 2 && parts[0] != "" && parts[1] != "" {
		return fmt.Sprintf("%s/%s", parts[0], parts[1])
	}

	return ""
}

// PRCreationError represents errors that occur during PR creation
type PRCreationError struct {
	TaskID     string
	Step       string
	Underlying error
}

func (e *PRCreationError) Error() string {
	return fmt.Sprintf("PR creation failed at step '%s' for task %s: %v", e.Step, e.TaskID, e.Underlying)
}

func (e *PRCreationError) Unwrap() error {
	return e.Underlying
}

// CreatePRCreationError creates a new PR creation error
func CreatePRCreationError(taskID, step string, err error) *PRCreationError {
	return &PRCreationError{
		TaskID:     taskID,
		Step:       step,
		Underlying: err,
	}
}

// ValidateTaskForPRCreation validates that a task is ready for PR creation
func (prc *PRCreator) ValidateTaskForPRCreation(task entity.Task, execution entity.Execution) error {
	// Check task has required fields
	if task.ID == (uuid.UUID{}) {
		return CreatePRCreationError(task.ID.String(), "validation", fmt.Errorf("task ID cannot be nil"))
	}

	if task.Title == "" {
		return CreatePRCreationError(task.ID.String(), "validation", fmt.Errorf("task title cannot be empty"))
	}

	if task.BranchName == nil || *task.BranchName == "" {
		return CreatePRCreationError(task.ID.String(), "validation", fmt.Errorf("task must have a branch name"))
	}

	// TODO: Need to handle this case, the execution status need to be completed before the PR is created
	// Check execution is complete
	// if execution.Status != entity.ExecutionStatusCompleted {
	// 	return CreatePRCreationError(task.ID.String(), "validation",
	// 		fmt.Errorf("execution must be completed, current status: %s", execution.Status))
	// }

	// Check repository is available
	repository := prc.getRepositoryFromTask(task)
	if repository == "" {
		return CreatePRCreationError(task.ID.String(), "validation",
			fmt.Errorf("unable to determine repository from task project"))
	}

	return nil
}

// SanitizeForGitHub sanitizes text for safe use in GitHub API calls
func (prc *PRCreator) SanitizeForGitHub(text string) string {
	// Remove null bytes and other problematic characters
	text = strings.ReplaceAll(text, string(rune(0)), "")
	text = strings.TrimSpace(text)

	// Limit length to prevent API errors
	if len(text) > 65535 { // GitHub's limit for PR descriptions
		text = text[:65535-3] + "..."
	}

	return text
}
