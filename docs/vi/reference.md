# Tham chiếu kỹ thuật

## 1. REST API hiện được đăng ký

Base path: `/api/v1`.

### Project

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/projects` | Tạo project |
| GET | `/projects` | Danh sách project |
| GET | `/projects/{id}` | Chi tiết project |
| PUT | `/projects/{id}` | Cập nhật project |
| DELETE | `/projects/{id}` | Soft-delete project |
| GET | `/projects/{id}/statistics` | Thống kê task |
| POST | `/projects/{id}/archive` | Archive project |
| POST | `/projects/{id}/restore` | Restore project |
| POST | `/projects/{id}/git/reinit` | Khởi tạo lại Git metadata/repository |
| GET | `/projects/{id}/branches` | Liệt kê branch |
| GET | `/projects/{id}/tasks` | Task chưa done của project |
| GET | `/projects/{id}/tasks/done` | Task done của project |

### Task, plan và PR

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/tasks` | Tạo task |
| GET | `/tasks` | Danh sách/lọc task |
| GET | `/tasks/{id}` | Chi tiết task |
| PUT | `/tasks/{id}` | Cập nhật task hoặc status |
| DELETE | `/tasks/{id}` | Soft-delete task |
| POST | `/tasks/{id}/start-planning` | Enqueue planning |
| POST | `/tasks/{id}/approve-plan` | Duyệt plan và enqueue implementation |
| POST | `/tasks/{id}/start-implementing-direct` | Bỏ qua planning |
| GET | `/tasks/{id}/executions` | Execution của task |
| GET/POST | `/tasks/{id}/pull-request` | Đọc/tạo PR |
| GET | `/tasks/{id}/plans` | Đọc plan |
| PUT | `/tasks/{id}/plans/{planId}` | Sửa plan |
| POST | `/tasks/{id}/open-with-cursor` | Mở worktree bằng Cursor |
| GET | `/tasks/{id}/diff` | Git diff của task |

### Execution

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/executions` | Tạo bản ghi execution |
| GET | `/executions/stats` | Thống kê execution |
| GET | `/executions/{id}` | Chi tiết execution |
| PUT | `/executions/{id}` | Cập nhật trạng thái/progress |
| DELETE | `/executions/{id}` | Xóa execution |
| GET | `/executions/{id}/logs` | Log có lọc/phân trang |

### Worktree

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/worktrees` | Tạo worktree cho task |
| POST | `/worktrees/cleanup` | Cleanup theo task |
| GET | `/worktrees/task/{taskId}` | Worktree của task |
| GET | `/worktrees/project/{projectId}` | Worktree của project |
| PUT | `/worktrees/{id}/status` | Cập nhật status |
| POST | `/worktrees/{id}/initialize` | Chạy khởi tạo |
| POST | `/worktrees/{id}/recover` | Khôi phục worktree lỗi |
| GET | `/worktrees/{id}/validate` | Validate filesystem/Git |
| GET | `/worktrees/{id}/health` | Health chi tiết |
| GET | `/worktrees/{id}/branch` | Thông tin branch |
| GET | `/worktrees/project/{id}/statistics` | Thống kê |
| GET | `/worktrees/project/{id}/active-count` | Số active worktree |

Ngoài versioned API: `GET /health`, `GET /swagger/*`, `GET /ws/connect`.

## 2. Biến môi trường

Mọi biến backend dưới đây có thể dùng thêm tiền tố `AUTODEVS_`.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `SERVER_PORT` | `8098` | HTTP port |
| `SERVER_HOST` | `localhost` | Được load nhưng hiện chưa dùng để bind |
| `SERVER_RUN_MODE` | `dev` | `production` sẽ serve `./public` |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | User |
| `DB_PASSWORD` | rỗng | Password |
| `DB_NAME` | `autodevs` | Database |
| `DB_SSLMODE` | `disable` | PostgreSQL SSL mode |
| `WORKTREE_BASE_DIR` | `/worktrees` | Vùng worktree/PID worker |
| `WORKTREE_MAX_PATH_LENGTH` | `4096` | Giới hạn path |
| `WORKTREE_MIN_DISK_SPACE` | `104857600` | Dung lượng trống tối thiểu, byte |
| `WORKTREE_CLEANUP_INTERVAL` | `24h` | Khoảng cleanup |
| `WORKTREE_ENABLE_LOGGING` | `true` | Log worktree |
| `REDIS_HOST` | `localhost` | Queue Redis |
| `REDIS_PORT` | `6379` | Queue Redis port |
| `REDIS_PASSWORD` | rỗng | Redis password |
| `REDIS_DB` | `0` | Asynq DB |
| `CENTRIFUGE_REDIS_ADDRESS` | `localhost:6379` | Realtime broker |
| `CENTRIFUGE_REDIS_PASSWORD` | rỗng | Broker password |
| `CENTRIFUGE_REDIS_DB` | `2` | Broker DB |
| `GITHUB_TOKEN` | rỗng | GitHub token |
| `GITHUB_BASE_URL` | GitHub public API | GitHub Enterprise override |
| `GITHUB_USER_AGENT` | `auto-devs/1.0` | HTTP user agent |
| `GITHUB_TIMEOUT` | `30` | Timeout giây |
| `APP_BASE_URL` | `http://localhost:8098` | URL backend dùng trong tích hợp |
| `HERMES_KANBAN_ENABLED` | `false` | Bật callback bridge |
| `HERMES_KANBAN_URL` | rỗng | Dashboard base URL |
| `HERMES_KANBAN_TOKEN` | rỗng | Bearer token |
| `HERMES_KANBAN_BOARD` | rỗng | Board slug cố định |

Frontend: `VITE_API_BASE_URL`, `VITE_WS_URL`. MCP: `AUTO_DEVS_API_URL`, `AUTO_DEVS_API_KEY`, `MCP_DEBUG`, `ENABLE_CACHING`.

## 3. Database và migration

Migrations tuần tự nằm trong `migrations/`, hiện từ `000001` đến `000021`. Các bảng quan trọng:

- `projects`, `project_settings`;
- `tasks`, `task_status_histories`, `task_audit_logs`;
- `task_templates`, `task_dependencies`, `task_comments`, `task_attachments`;
- `worktrees`;
- `plans`, `plan_versions`;
- `executions`, `processes`, `execution_logs`;
- `pull_requests`, `pull_request_comments`, `pull_request_reviews`, `pull_request_checks`;
- `audit_logs`.

Phần lớn entity dùng UUID PostgreSQL `gen_random_uuid()` và soft delete qua `deleted_at`. Migration đầu tiên enable extension `pgcrypto`. Không dùng GORM AutoMigrate khi boot.

Schema qua migrations mới là nguồn đúng cho database. Entity chứa một số model/future capability và có thể không phản ánh constraint lịch sử hoàn toàn; khi thay schema phải cập nhật cả migration, entity và repository.

## 4. Cấu trúc repository

```text
cmd/server/                 REST/WebSocket entry point
cmd/worker/                 Asynq worker/scheduler entry point
config/                     Load environment
internal/entity/            Domain models và state rules
internal/repository/        Data contracts, mocks
internal/repository/postgres GORM implementations
internal/usecase/           Business logic
internal/handler/           Gin handlers, routes, DTO
internal/jobs/              Queue client/server/scheduler/processor
internal/service/           AI, Git, GitHub, worktree, Kanban
internal/ai-executors/      AI CLI adapters
internal/websocket/         Centrifuge/WebSocket layer
internal/di/                Wire providers/generated graph
pkg/database/               PostgreSQL connection/migration helpers
migrations/                 SQL up/down migrations
frontend/                   React SPA
mcp-server/                 MCP stdio adapter
fake-cli/                   Deterministic AI output fixtures
docs/                       Swagger và tài liệu
scripts/                    Worker/rate-limit/dev utilities
```

## 5. Middleware và bảo mật

Global middleware gồm security headers, CORS, request logging, error handling, rate limiting và validation error mapping. Đây không phải authentication/authorization. GitHub token và AI credentials phải chỉ tồn tại ở môi trường worker/server, không đưa vào frontend hoặc commit vào Git.

Implementation agent có khả năng chạy command và sửa code với permission rộng trong worktree. `init_workspace_script` cũng là shell script lấy từ dữ liệu project. Chỉ người tin cậy mới được quyền tạo/sửa project và task trong deployment hiện tại.

## 6. MCP tools thực tế

- `project:list`, `project:get`;
- `task:list`, `task:create`, `task:update-status`, `task:get`, `task:delete`;
- `task:start-planning`, `task:approve-plan`, `task:start-implementing-direct`;
- `execution:list`, `execution:get`, `execution:create`;
- `worktree:get-status`.

Một số mô tả enum trong MCP source dùng tên status/priority chữ thường kiểu cũ. Backend domain thực tế dùng status/priority chữ hoa; khi tool lỗi validation, kiểm tra payload theo enum trong tài liệu này/Swagger.

## 7. Nguồn sự thật khi tài liệu mâu thuẫn

Ưu tiên theo thứ tự:

1. route đăng ký trong `internal/handler/route.go` và `worktree_routes.go`;
2. enum/transition trong `internal/entity/`;
3. DTO và usecase validation;
4. SQL migrations;
5. Swagger đã generate;
6. README lịch sử.

