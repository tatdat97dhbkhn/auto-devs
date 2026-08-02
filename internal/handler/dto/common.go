package dto

import "strings"

// Common response DTOs
type ErrorResponse struct {
	Error   string            `json:"error" example:"Invalid request"`
	Message string            `json:"message" example:"The provided data is invalid"`
	Code    int               `json:"code" example:"400"`
	Details map[string]string `json:"details,omitempty"`
}

type SuccessResponse struct {
	Message string      `json:"message" example:"Operation completed successfully"`
	Data    interface{} `json:"data,omitempty"`
}

// Pagination DTOs
type PaginationQuery struct {
	Page     int `form:"page,default=1" binding:"min=1" example:"1"`
	PageSize int `form:"page_size,default=10" binding:"min=1,max=100" example:"10"`
}

type PaginationMeta struct {
	Page       int `json:"page" example:"1"`
	PageSize   int `json:"page_size" example:"10"`
	Total      int `json:"total" example:"100"`
	TotalPages int `json:"total_pages" example:"10"`
}

type PaginatedResponse struct {
	Data interface{}    `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

// Filter DTOs for tasks
type TaskFilterQuery struct {
	PaginationQuery
	Status      *string `form:"status" binding:"omitempty,oneof=TODO PLANNING PLAN_REVIEWING IMPLEMENTING CODE_REVIEWING DONE CANCELLED" example:"TODO"`
	ProjectID   *string `form:"project_id" binding:"omitempty,uuid" example:"123e4567-e89b-12d3-a456-426614174000"`
	Search      *string `form:"search" binding:"omitempty,max=255" example:"authentication"`
	IncludeDone *bool   `form:"include_done" example:"false"`
}

// Helper functions
func NewErrorResponse(err error, code int, message string) ErrorResponse {
	if err == nil {
		err = errorString(message)
	}
	return ErrorResponse{
		Error:   localizeMessage(err.Error()),
		Message: localizeMessage(message),
		Code:    code,
	}
}

func NewValidationErrorResponse(details map[string]string) ErrorResponse {
	return ErrorResponse{
		Error:   "Xác thực không thành công",
		Message: "Dữ liệu cung cấp không vượt qua xác thực",
		Code:    400,
		Details: details,
	}
}

func NewSuccessResponse(message string, data interface{}) SuccessResponse {
	return SuccessResponse{
		Message: localizeMessage(message),
		Data:    data,
	}
}

type errorString string

func (e errorString) Error() string { return string(e) }

// localizeMessage translates stable handler phrases while leaving technical
// errors, identifiers, commands, and user-generated content untouched.
func localizeMessage(message string) string {
	translations := map[string]string{
		"Invalid request data":                                  "Dữ liệu yêu cầu không hợp lệ",
		"Invalid project ID":                                    "ID dự án không hợp lệ",
		"Invalid task ID":                                       "ID công việc không hợp lệ",
		"Invalid plan ID":                                       "ID kế hoạch không hợp lệ",
		"Invalid execution ID":                                  "ID lần thực thi không hợp lệ",
		"Invalid worktree ID":                                   "ID Worktree không hợp lệ",
		"Project not found":                                     "Không tìm thấy dự án",
		"Task not found":                                        "Không tìm thấy công việc",
		"Pull request not found":                                "Không tìm thấy Pull Request",
		"Worktree not found":                                    "Không tìm thấy Worktree",
		"Invalid query parameters":                              "Tham số truy vấn không hợp lệ",
		"Internal server error":                                 "Lỗi máy chủ nội bộ",
		"Too many requests, please try again later":             "Quá nhiều yêu cầu, vui lòng thử lại sau",
		"Planning started successfully":                         "Đã bắt đầu lập kế hoạch",
		"Implementation started successfully":                   "Đã bắt đầu triển khai",
		"Plan approved and implementation started successfully": "Đã duyệt kế hoạch và bắt đầu triển khai",
		"Successfully opened workspace with Cursor":             "Đã mở workspace bằng Cursor",
		"Git repository reinitialized successfully":             "Đã khởi tạo lại kho Git",
	}
	if translated, ok := translations[strings.TrimSpace(message)]; ok {
		return translated
	}
	return message
}
