# Kiến trúc và luồng xử lý

## 1. Kiến trúc tổng thể

Backend đi theo layered/clean architecture thực dụng:

```text
HTTP Handler / DTO
        |
        v
     Usecase  <------ Job Processor
        |                 |
        v                 v
Repository interfaces   External services
        |             (AI, Git, GitHub, Kanban)
        v
PostgreSQL implementations
```

Quy tắc phụ thuộc chủ đạo:

- `entity` không phụ thuộc handler hay database implementation;
- `repository` định nghĩa interface, `repository/postgres` hiện thực bằng GORM;
- `usecase` điều phối quy tắc nghiệp vụ qua interface;
- `handler` chuyển HTTP DTO sang usecase;
- `service` bao các hệ thống bên ngoài;
- `jobs` kết nối các usecase/service cho tác vụ dài;
- `di` nối dependency bằng Google Wire tại compile time.

## 2. Vai trò từng lớp

### Entity

`internal/entity/` chứa model domain, enum và transition rule. Đây là nơi đáng tin cậy nhất để hiểu trạng thái hợp lệ.

### Repository

`internal/repository/*.go` là contract. `internal/repository/postgres/` chứa truy vấn GORM. Mock được generate bên cạnh interface để unit test usecase.

### Usecase

`internal/usecase/` thực hiện validation, transition, notification và enqueue job. Nhiều usecase method nâng cao chưa có HTTP route tương ứng.

### Handler

`internal/handler/` dùng Gin, bind/validate DTO, map lỗi thành HTTP response và phát event sau mutation. Tất cả REST route hiện nằm dưới `/api/v1`.

### Service

- `service/ai`: quản lý command/process/execution;
- `ai-executors`: adapter cụ thể tạo command, prompt và parse output;
- `service/git`: validation, branch và Git command;
- `service/worktree`: lifecycle worktree;
- `service/github`: authentication, PR create/sync/rate limit;
- `service/kanban`: callback tùy chọn sang Hermes Kanban.

### Jobs

Asynq client enqueue job từ API/usecase. Worker đăng ký handler và scheduler. Processor chịu trách nhiệm orchestration dài hạn và ghi lại trạng thái.

## 3. State machine của task

```text
TODO --planning--> PLANNING --success--> PLAN_REVIEWING
 |                     |                     |
 | direct              | failure             | approve
 v                     v                     v
IMPLEMENTING <---------TODO             IMPLEMENTING
     |                                      |
     +-------------- success ---------------+
                         |
                         v
                   CODE_REVIEWING --PR merged--> DONE
```

Các transition được entity cho phép đầy đủ:

| Từ | Có thể tới |
|---|---|
| `TODO` | `PLANNING`, `IMPLEMENTING`, `CANCELLED` |
| `PLANNING` | `PLAN_REVIEWING`, `TODO`, `CANCELLED` |
| `PLAN_REVIEWING` | `TODO`, `IMPLEMENTING`, `PLANNING`, `CANCELLED` |
| `IMPLEMENTING` | `CODE_REVIEWING`, `PLAN_REVIEWING`, `CANCELLED` |
| `CODE_REVIEWING` | `DONE`, `PLAN_REVIEWING`, `CANCELLED` |
| `DONE` | `TODO` |
| `CANCELLED` | `TODO` |

Task còn có Git status độc lập: `none -> creating -> active -> completed -> cleaning`, với nhánh `error` để retry/cleanup. Không nên đồng nhất business status và Git/worktree status.

## 4. Luồng planning chi tiết

1. Handler nhận task id, branch, `ai_type`, `auto_implement`, `use_remote_branch`.
2. Usecase kiểm tra task/project và enqueue planning job vào Redis.
3. Worker chuyển task sang `PLANNING`.
4. Worker tải project, tạo hoặc tái sử dụng worktree/branch và cập nhật Git fields trên task.
5. Executor tạo planning command và prompt từ title/description.
6. Execution service khởi chạy process trong `task.WorktreePath`.
7. Worker tạo bản ghi `executions`, đọc stdout/stderr qua channel.
8. Stdout stream-json được executor parse thành `execution_logs` rồi upsert theo execution/line.
9. Khi process kết thúc thành công, output được parse lấy plan Markdown, ghi vào `plans`, task chuyển `PLAN_REVIEWING`.
10. Nếu `auto_implement=true`, worker gọi approve plan và enqueue implementation.
11. Nếu lỗi, execution chuyển `FAILED`, task thường trở về `TODO`, error được nối vào task.

Job handler trả về sau khi đã khởi chạy execution và goroutine giám sát. Vì vậy trạng thái Asynq job và trạng thái `Execution` không hoàn toàn đồng nghĩa.

## 5. Luồng implementation chi tiết

1. Implementation có thể bắt đầu từ plan đã duyệt hoặc trực tiếp từ `TODO`.
2. Worker xác định fallback status: `PLAN_REVIEWING` nếu đến từ plan, ngược lại `TODO`.
3. Task chuyển `IMPLEMENTING`.
4. Worker đảm bảo project/worktree/branch tồn tại.
5. Executor tạo prompt implementation; với flow có plan, prompt chứa plan làm chỉ dẫn.
6. AI process sửa file trong worktree và stream log.
7. Khi thành công, worker xử lý Git change, commit/push và tạo hoặc cập nhật PR qua GitHub service.
8. Task chuyển `CODE_REVIEWING`; bản ghi PR được lưu và realtime event được phát.
9. Scheduler định kỳ đồng bộ trạng thái PR. PR merged dẫn tới hoàn tất task và callback Kanban nếu được bật.
10. Khi lỗi, execution/task/error log được cập nhật và task quay về fallback status.

## 6. Git worktree và branch

Repository gốc nằm tại `Project.WorktreeBasePath`. Worktree riêng được tạo dưới vùng do cấu hình worktree quản lý. Mỗi `Worktree` gắn duy nhất theo nghiệp vụ với task/project, branch name và path.

`use_remote_branch=true` dùng khi muốn checkout một branch đã tồn tại ở remote. `false` tạo branch làm việc mới từ base branch. `Task.BaseBranchName` giữ nhánh nền để tạo PR đúng đích.

Worktree status có transition riêng:

- `creating -> active | error`;
- `active -> completed | cleaning | error`;
- `completed -> cleaning | active`;
- `error -> creating | cleaning`.

Các API validate/health/recover giúp phát hiện path mất, repository sai hoặc worktree hỏng.

## 7. Realtime

Backend dùng Centrifuge protocol trên WebSocket và Redis broker. Endpoint upgrade là `/ws/connect`. Frontend subscribe các channel như `project:{projectId}` và tự reconnect/resubscribe.

Mutation từ handler/worker publish event để UI cập nhật task/project/execution mà không polling liên tục. Redis DB cho broker tách khỏi Asynq DB để tránh trộn key/traffic.

## 8. Quan hệ dữ liệu chính

```text
Project 1 --- N Task
Task    1 --- N Execution --- N ExecutionLog
Task    1 --- 0..1 active Plan --- N PlanVersion
Task    1 --- 0..1 Worktree
Task    1 --- 0..1 PullRequest
Task    1 --- N TaskStatusHistory / TaskAuditLog
Project 1 --- N ProjectSettings / AuditLog (theo entity id)
```

Database còn có comment/review/check của PR, process, task template/dependency/comment/attachment. Không phải tất cả đều được API/UI hiện tại sử dụng đầy đủ.

## 9. Frontend

Frontend dùng React 19, TypeScript, Vite, TanStack Router/Query, Zustand, Radix/Shadcn và Tailwind. File routes sinh route tree; `/` redirect tới danh sách project, project detail hiển thị board, task detail hiển thị plan/execution/metadata/code changes.

Các module API nằm tại `frontend/src/lib/api/`, base URL lấy từ `VITE_API_BASE_URL` hoặc mặc định `http://localhost:8098/api/v1`. WebSocket URL lấy từ `VITE_WS_URL` và được hiệu chỉnh theo host hiện tại.

## 10. MCP server

MCP server TypeScript chỉ là client wrapper gọi REST API qua Axios, thêm retry và chuẩn hóa lỗi. Nó giao tiếp với AI host qua stdio; do đó log phải đi `stderr`, còn `stdout` dành cho JSON-RPC protocol.

MCP không truy cập trực tiếp database, Redis hay worker. Muốn tool planning/implementation hoạt động, API và worker vẫn phải chạy.

