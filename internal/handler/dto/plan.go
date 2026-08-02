package dto

import (
	"time"

	"github.com/auto-devs/auto-devs/internal/entity"
	"github.com/google/uuid"
)

type PlanResponse struct {
	ID                  uuid.UUID  `json:"id" example:"123e4567-e89b-12d3-a456-426614174000"`
	TaskID              uuid.UUID  `json:"task_id" example:"123e4567-e89b-12d3-a456-426614174000"`
	Content             string     `json:"content" example:"# Plan\n\nThis is a plan for a task"`
	BranchName          string     `json:"branch_name,omitempty"`
	CommitMessage       string     `json:"commit_message,omitempty"`
	PRTitle             string     `json:"pr_title,omitempty"`
	Status              string     `json:"status" example:"DRAFT"`
	CreatedAt           time.Time  `json:"created_at" example:"2024-01-15T10:30:00Z"`
	UpdatedAt           time.Time  `json:"updated_at" example:"2024-01-15T10:30:00Z"`
	RevisionOfPlanID    *uuid.UUID `json:"revision_of_plan_id,omitempty"`
	RevisionFeedback    string     `json:"revision_feedback,omitempty"`
	RevisionExecutionID *uuid.UUID `json:"revision_execution_id,omitempty"`
}

func (p *PlanResponse) FromEntity(plan *entity.Plan) {
	p.ID = plan.ID
	p.TaskID = plan.TaskID
	p.Content = plan.Content
	p.BranchName = plan.BranchName
	p.CommitMessage = plan.CommitMessage
	p.PRTitle = plan.PRTitle
	p.Status = string(plan.Status)
	p.CreatedAt = plan.CreatedAt
	p.UpdatedAt = plan.UpdatedAt
	p.RevisionOfPlanID = plan.RevisionOfPlanID
	p.RevisionFeedback = plan.RevisionFeedback
	p.RevisionExecutionID = plan.RevisionExecutionID
}

type PlanRevisionRequest struct {
	Feedback string `json:"feedback" binding:"required"`
}
