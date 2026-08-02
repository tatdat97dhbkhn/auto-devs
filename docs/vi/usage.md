# Hướng dẫn cài đặt và sử dụng

## 1. Điều kiện tiên quyết

Cần có:

- Go 1.24.3 trở lên;
- Node.js 22.12 trở lên và npm;
- PostgreSQL 12 trở lên;
- Redis 6 trở lên;
- Git;
- CLI `migrate` của golang-migrate;
- AI CLI hoặc credential tương ứng nếu chạy agent thật;
- GitHub token nếu muốn tự động tạo/đồng bộ PR.

Các phiên bản Go và Node mong đợi cũng được ghi trong `.tool-versions`.

## 2. Chuẩn bị database và Redis

Ví dụ PostgreSQL local:

```sql
CREATE DATABASE autodevs_dev;
```

Redis dùng hai logical database theo mặc định:

- DB `0`: Asynq job queue;
- DB `2`: Centrifuge broker.

Có thể dùng cùng một Redis server, nhưng nên giữ DB khác nhau như cấu hình mặc định.

## 3. Cấu hình `.env`

```bash
cp .env.example .env
```

Sửa ít nhất các giá trị:

```dotenv
AUTODEVS_DB_HOST=127.0.0.1
AUTODEVS_DB_PORT=5432
AUTODEVS_DB_USERNAME=postgres
AUTODEVS_DB_PASSWORD=postgres
AUTODEVS_DB_NAME=autodevs_dev

AUTODEVS_REDIS_HOST=localhost
AUTODEVS_REDIS_PORT=6379
AUTODEVS_REDIS_DB=0

AUTODEVS_CENTRIFUGE_REDIS_ADDRESS=localhost:6379
AUTODEVS_CENTRIFUGE_REDIS_DB=2

# Thư mục cha để lưu worktree và PID worker; phải tồn tại và ghi được.
AUTODEVS_WORKTREE_BASE_DIR=/absolute/path/to/autodevs-worktrees

# Cần cho thao tác GitHub/PR.
AUTODEVS_GITHUB_TOKEN=github_pat_xxx
```

Lưu ý: loader chấp nhận cả tên có tiền tố `AUTODEVS_` và tên không tiền tố. Biến có tiền tố được ưu tiên. Riêng các dòng Hermes mẫu trong `.env.example` dùng tên không tiền tố và vẫn hợp lệ.

Tạo trước thư mục worktree:

```bash
mkdir -p /absolute/path/to/autodevs-worktrees
```

## 4. Cài dependency và migrate

```bash
go mod download
cd frontend
npm install
cd ..
make migrate-up
```

Migrations không tự chạy khi server khởi động; phải chạy thủ công.

## 5. Chạy môi trường development

Cách nhanh nhất:

```bash
./run-dev.sh
```

Script chạy API, worker và frontend, đồng thời dừng cả ba khi nhận `Ctrl+C`. Script không tự khởi động PostgreSQL hoặc Redis.

Hoặc dùng ba terminal:

```bash
# Terminal 1
make run

# Terminal 2
make run-worker

# Terminal 3
cd frontend && npm run dev
```

Địa chỉ:

- UI: `http://localhost:5173`
- REST API: `http://localhost:8098/api/v1`
- Swagger: `http://localhost:8098/swagger/index.html`
- Health: `http://localhost:8098/health`
- WebSocket: `ws://localhost:8098/ws/connect`

## 6. Tạo project đúng cách

Từ UI hoặc API, project cần có:

- `name`: tên hiển thị;
- `description`: mô tả tùy chọn;
- `worktree_base_path`: **đường dẫn tuyệt đối tới repository Git gốc trên máy chạy worker**;
- `repository_url`: có thể cập nhật sau, dùng cho tích hợp remote/GitHub;
- `init_workspace_script`: script tùy chọn chạy khi chuẩn bị workspace.

Ví dụ:

```bash
curl -X POST http://localhost:8098/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Service",
    "description": "Backend service",
    "worktree_base_path": "/Users/me/src/my-service",
    "init_workspace_script": "go mod download"
  }'
```

Repository gốc phải là Git repository hợp lệ. Worker cần quyền tạo branch/worktree, ghi file, commit và push. Git identity cũng phải được cấu hình:

```bash
git config --global user.name "Auto Devs Worker"
git config --global user.email "worker@example.com"
```

## 7. Tạo và xử lý task

### Tạo task

```bash
curl -X POST http://localhost:8098/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "project_id": "PROJECT_UUID",
    "title": "Thêm endpoint export CSV",
    "description": "Xuất danh sách orders theo bộ lọc hiện tại",
    "priority": "HIGH"
  }'
```

Priority hợp lệ: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

### Luồng có review kế hoạch

1. Gọi **Start planning** và chọn branch cùng executor.
2. Task chuyển `TODO -> PLANNING`; worker tạo worktree và chạy AI ở planning mode.
3. Khi thành công, plan Markdown được lưu và task chuyển `PLAN_REVIEWING`.
4. Người dùng đọc/sửa plan rồi **Approve plan**.
5. Worker chạy implementation; task chuyển `IMPLEMENTING`.
6. Thành công sẽ dẫn tới commit/push/PR và `CODE_REVIEWING`.
7. PR merged được scheduler đồng bộ, task có thể chuyển `DONE`.

Ví dụ bắt đầu planning:

```bash
curl -X POST http://localhost:8098/api/v1/tasks/TASK_UUID/start-planning \
  -H 'Content-Type: application/json' \
  -d '{
    "branch_name": "feat/export-orders",
    "ai_type": "claude-code",
    "auto_implement": false,
    "use_remote_branch": false
  }'
```

Approve:

```bash
curl -X POST http://localhost:8098/api/v1/tasks/TASK_UUID/approve-plan \
  -H 'Content-Type: application/json' \
  -d '{"ai_type":"claude-code"}'
```

### Luồng implementation trực tiếp

Dùng khi task đủ rõ, không cần plan review:

```bash
curl -X POST http://localhost:8098/api/v1/tasks/TASK_UUID/start-implementing-direct \
  -H 'Content-Type: application/json' \
  -d '{
    "branch_name": "fix/null-pointer",
    "ai_type": "claude-code",
    "use_remote_branch": false
  }'
```

### Chọn AI executor

| `ai_type` | Planning | Implementation | Ghi chú |
|---|---:|---:|---|
| `claude-code` | Có | Có | Chạy package Claude Code qua `npx` |
| `codex` | Có | Có | Chạy binary Codex CLI local trong worktree |
| `deep-seek` | Có | Có | Dùng CLI Claude với endpoint/model DeepSeek qua env |
| `cursor-agent` | Chưa hoàn chỉnh | Có | Máy worker phải có `cursor-agent` |
| `fake-code` | Có | Có | Fixture local để test luồng |

DeepSeek cần các biến `DEEPSEEK_API_KEY`, và có thể override `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `DEEPSEEK_DEFAULT_*_MODEL`; tiền tố `AUTODEVS_` cũng được hỗ trợ bởi executor.

Để dùng `codex`, worker phải cài binary `codex`, đăng nhập sẵn và bảo đảm binary nằm trong `PATH`. Cả planning và implementation đều chạy trong worktree của task. Planning dùng sandbox read-only; implementation bỏ qua approval và sandbox để có quyền thực thi tương đương các executor implementation hiện tại, vì vậy chỉ chạy worker trong môi trường tin cậy.

## 8. Theo dõi kết quả

- Kanban hiển thị trạng thái task.
- Task detail hiển thị plan, executions, log và thông tin PR/diff.
- `GET /api/v1/tasks/{id}/executions` lấy các lần chạy.
- `GET /api/v1/executions/{id}/logs` lấy log có phân trang/lọc.
- `GET /api/v1/tasks/{id}/diff` lấy thay đổi Git trong worktree.
- `POST /api/v1/tasks/{id}/open-with-cursor` yêu cầu backend mở workspace bằng Cursor; thao tác này phụ thuộc GUI trên máy chạy server.

Khi job lỗi, worker cố gắng trả task về trạng thái có thể retry và nối thông báo vào `error_logs`. Planning thường về `TODO`; implementation sau plan thường về `PLAN_REVIEWING`, còn implementation trực tiếp về `TODO`.

## 9. Dùng MCP server

MCP server là adapter stdio cho AI client, không thay thế API/worker.

```bash
cd mcp-server
npm install
cp .env.example .env
npm run build
```

Ví dụ cấu hình client:

```json
{
  "mcpServers": {
    "auto-devs": {
      "command": "node",
      "args": ["/absolute/path/auto-devs/mcp-server/dist/index.js"],
      "env": {"AUTO_DEVS_API_URL": "http://localhost:8098"}
    }
  }
}
```

Code hiện đăng ký 14 tool: project (2), task (8), execution (3), worktree (1). README cũ của MCP ghi 11 tool nên đã lỗi thời.
