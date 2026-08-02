package jobs

import (
	"fmt"
	"time"

	"github.com/auto-devs/auto-devs/internal/usecase"
)

// ClientInterface defines the interface for job client operations
type ClientInterface interface {
	EnqueueTaskPlanningString(payload *TaskPlanningPayload, delay time.Duration) (string, error)
	EnqueueTaskImplementationString(payload *TaskImplementationPayload, delay time.Duration) (string, error)
	EnqueueWorktreeCreateString(payload *WorktreeCreatePayload, delay time.Duration) (string, error)
	EnqueueKanbanNotifyString(payload *KanbanNotifyPayload) (string, error)
	Close() error
}

// JobClientAdapter adapts the actual job client to the usecase interface
type JobClientAdapter struct {
	client ClientInterface
}

func (a *JobClientAdapter) EnqueueTaskPlanRevision(payload *usecase.TaskPlanRevisionPayload, delay time.Duration) (string, error) {
	client, ok := a.client.(interface {
		EnqueueTaskPlanRevisionString(*TaskPlanRevisionPayload, time.Duration) (string, error)
	})
	if !ok {
		return "", fmt.Errorf("job client does not support plan revisions")
	}
	return client.EnqueueTaskPlanRevisionString(&TaskPlanRevisionPayload{TaskID: payload.TaskID, PlanID: payload.PlanID, AIType: payload.AIType, Model: payload.Model, ReasoningEffort: payload.ReasoningEffort, Feedback: payload.Feedback}, delay)
}

// NewJobClientAdapter creates a new job client adapter
func NewJobClientAdapter(client ClientInterface) usecase.JobClientInterface {
	return &JobClientAdapter{
		client: client,
	}
}

// EnqueueTaskPlanning enqueues a task planning job
func (a *JobClientAdapter) EnqueueTaskPlanning(payload *usecase.TaskPlanningPayload, delay time.Duration) (string, error) {
	// Convert usecase payload to jobs package payload
	jobPayload := &TaskPlanningPayload{
		TaskID:          payload.TaskID,
		BranchName:      payload.BranchName,
		ProjectID:       payload.ProjectID,
		AIType:          payload.AIType,
		Model:           payload.Model,
		ReasoningEffort: payload.ReasoningEffort,
		AutoImplement:   payload.AutoImplement,
		UseRemoteBranch: payload.UseRemoteBranch,
	}

	// Enqueue the job
	jobID, err := a.client.EnqueueTaskPlanningString(jobPayload, delay)
	if err != nil {
		return "", err
	}

	return jobID, nil
}

// EnqueueTaskImplementation enqueues a task implementation job
func (a *JobClientAdapter) EnqueueTaskImplementation(payload *usecase.TaskImplementationPayload, delay time.Duration) (string, error) {
	// Convert usecase payload to jobs package payload
	jobPayload := &TaskImplementationPayload{
		TaskID:          payload.TaskID,
		PlanID:          payload.PlanID,
		ProjectID:       payload.ProjectID,
		AIType:          payload.AIType,
		Model:           payload.Model,
		ReasoningEffort: payload.ReasoningEffort,
		UseRemoteBranch: payload.UseRemoteBranch,
	}

	// Enqueue the job
	jobID, err := a.client.EnqueueTaskImplementationString(jobPayload, delay)
	if err != nil {
		return "", err
	}

	return jobID, nil
}

// EnqueueKanbanNotify enqueues a kanban notify job
func (a *JobClientAdapter) EnqueueKanbanNotify(payload *usecase.KanbanNotifyPayload) (string, error) {
	jobPayload := &KanbanNotifyPayload{
		TaskID:       payload.TaskID,
		KanbanTaskID: payload.KanbanTaskID,
		OldStatus:    payload.OldStatus,
		NewStatus:    payload.NewStatus,
	}

	return a.client.EnqueueKanbanNotifyString(jobPayload)
}

// EnqueueWorktreeCreate enqueues a worktree creation job
func (a *JobClientAdapter) EnqueueWorktreeCreate(payload *usecase.WorktreeCreatePayload, delay time.Duration) (string, error) {
	// Convert usecase payload to jobs package payload
	jobPayload := &WorktreeCreatePayload{
		WorktreeID:      payload.WorktreeID,
		TaskID:          payload.TaskID,
		ProjectID:       payload.ProjectID,
		BaseBranchName:  payload.BaseBranchName,
		UseRemoteBranch: payload.UseRemoteBranch,
	}

	// Enqueue the job
	jobID, err := a.client.EnqueueWorktreeCreateString(jobPayload, delay)
	if err != nil {
		return "", err
	}

	return jobID, nil
}
