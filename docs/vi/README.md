# Tài liệu toàn diện về Auto-Devs

Tài liệu này là điểm bắt đầu để hiểu Auto-Devs từ góc nhìn người dùng, người vận hành và lập trình viên. Nội dung được đối chiếu với mã nguồn hiện tại, không chỉ dựa trên README cũ.

## 1. Auto-Devs là gì?

Auto-Devs là một nền tảng điều phối quy trình phát triển phần mềm bằng AI. Người dùng tạo project trỏ tới một Git repository, tạo task trên bảng Kanban, sau đó yêu cầu một AI coding CLI:

1. phân tích task và viết kế hoạch;
2. chờ người dùng duyệt kế hoạch hoặc tự động duyệt;
3. sửa code trong một Git worktree riêng;
4. ghi lại log và tiến độ;
5. commit, push và tạo Pull Request;
6. đồng bộ trạng thái về giao diện theo thời gian thực.

Điểm quan trọng: Auto-Devs không phải bản thân mô hình AI. Nó là lớp **orchestration** bao quanh các AI CLI như Claude Code, Cursor Agent hoặc DeepSeek, kết hợp task management, queue, Git worktree, GitHub và theo dõi execution.

## 2. Dự án giải quyết vấn đề gì?

Khi chạy nhiều coding agent trực tiếp trong cùng một repository, các tiến trình có thể ghi đè file, dùng nhầm branch hoặc khó truy vết kết quả. Auto-Devs giải quyết bằng cách gắn mỗi công việc với:

- một `Task` có vòng đời rõ ràng;
- một branch và Git worktree cô lập;
- một hoặc nhiều `Execution` cùng log có cấu trúc;
- một `Plan` để review trước khi code;
- một `PullRequest` để đưa thay đổi trở lại quy trình GitHub.

Redis tách thao tác HTTP nhanh khỏi công việc AI chạy lâu. PostgreSQL giữ trạng thái bền vững. WebSocket/Centrifuge cập nhật giao diện mà không cần tải lại trang.

## 3. Bản đồ tài liệu

Đọc theo nhu cầu:

- [Hướng dẫn sử dụng](usage.md): cài đặt, cấu hình, chạy và thao tác một task từ đầu đến cuối.
- [Kiến trúc và luồng xử lý](architecture.md): các thành phần, quan hệ dữ liệu, state machine và luồng planning/implementation.
- [Tham chiếu kỹ thuật](reference.md): API, biến môi trường, database, WebSocket, MCP và cấu trúc thư mục.
- [Phát triển và vận hành](development.md): build, test, migration, sinh code, debug, deploy và troubleshooting.

Lộ trình đọc đề xuất:

1. Đọc tài liệu này và `usage.md` để hiểu sản phẩm.
2. Đọc `architecture.md` để hiểu tại sao hệ thống được chia thành API và worker.
3. Dùng `reference.md` khi tích hợp hoặc lần theo code.
4. Dùng `development.md` khi sửa hoặc triển khai dự án.

## 4. Các tiến trình phải chạy

| Thành phần | Vai trò | Mặc định |
|---|---|---|
| Go API server | REST API, health, Swagger, WebSocket và phục vụ frontend khi production | `:8098` |
| Go worker | Nhận job từ Redis, tạo worktree, chạy AI, commit/push/PR | không mở HTTP port |
| React frontend | Kanban và màn hình theo dõi | `:5173` khi dev |
| PostgreSQL | Dữ liệu project/task/plan/execution/PR | `:5432` |
| Redis | Asynq queue và Centrifuge broker | `:6379` |
| MCP server (tùy chọn) | Cho AI client gọi Auto-Devs dưới dạng MCP tools | stdio |

API server và worker đều khởi tạo gần như cùng một dependency graph qua Google Wire. Tuy vậy, API chỉ enqueue; worker mới thực thi AI job. Chạy API mà không chạy worker khiến task có thể đứng ở trạng thái chờ hoặc đang xử lý.

## 5. Mô hình tinh thần ngắn gọn

```text
Người dùng / MCP client
        |
        v
React UI -> Go REST API -> PostgreSQL
                  |
                  v
             Redis/Asynq
                  |
                  v
              Go worker
        +---------+----------+
        |         |          |
        v         v          v
   Git worktree  AI CLI    GitHub API
        |         |          |
        +---- log/state ------+
                  |
                  v
        PostgreSQL + WebSocket
                  |
                  v
              React UI
```

## 6. Các khái niệm domain chính

- **Project**: một workspace/repository mà Auto-Devs quản lý. `worktree_base_path` là đường dẫn repository gốc trên máy chạy worker; `repository_url` chủ yếu phục vụ GitHub/PR.
- **Task**: yêu cầu phát triển. Task chứa mô tả, độ ưu tiên, trạng thái nghiệp vụ và thông tin branch/worktree.
- **Plan**: nội dung Markdown do AI tạo ở bước planning. Hiện database áp dụng một plan chưa bị xóa cho mỗi task.
- **Worktree**: checkout Git độc lập dành cho một task. Agent sửa code tại đây, không sửa trực tiếp repository gốc.
- **Execution**: một lần chạy AI, dùng cho planning hoặc implementation. Log stdout được parse thành `ExecutionLog` có thể chứa tool name, tool-use id và nội dung đã parse.
- **PullRequest**: bản ghi mirror thông tin PR trên GitHub, gồm trạng thái, nhánh nguồn/đích và metadata.

## 7. Phạm vi hiện tại và điểm cần lưu ý

- Hệ thống hiện không có lớp xác thực người dùng hoàn chỉnh ở route REST. Chỉ nên expose sau reverse proxy/VPN hoặc bổ sung authentication.
- AI executor `claude-code` chạy bằng `npx` với phiên bản được pin trong code; implementation dùng chế độ bỏ qua permission prompt. Worker phải chạy trong môi trường tin cậy.
- AI executor `codex` yêu cầu Codex CLI local đã được cài, đăng nhập và có trong `PATH` của worker. Command chạy trong task worktree; planning là read-only, còn implementation bỏ qua approval và sandbox nên worker phải chạy trong môi trường tin cậy.
- `fake-code` dành cho phát triển/test, không gọi mô hình thật.
- `cursor-agent` có implementation nhưng planning trả về chưa được hỗ trợ đầy đủ; không nên chọn nó cho luồng planning nếu chưa kiểm tra lại executor.
- Domain/repository có nhiều chức năng nâng cao (template, comment, dependency, bulk operation), nhưng route HTTP hiện tại chỉ expose tập nhỏ hơn. “Có model/usecase” không đồng nghĩa “đã dùng được từ UI/API”.
- Swagger được generate từ annotation và có thể lệch code nếu chưa chạy lại `make swagger`.
- `AUTODEVS_SERVER_HOST` được load nhưng HTTP server hiện bind theo `":" + port`; giá trị host chưa quyết định địa chỉ bind.

## 8. Nơi bắt đầu trong code

- API entry point: `cmd/server/main.go`
- Worker entry point: `cmd/worker/main.go`
- Dependency injection: `internal/di/wire.go`, code generate ở `wire_gen.go`
- HTTP routes: `internal/handler/route.go`
- Business logic: `internal/usecase/`
- Job orchestration: `internal/jobs/processor.go`
- AI adapters: `internal/ai-executors/`
- Git/worktree/GitHub: `internal/service/`
- Database implementations: `internal/repository/postgres/`
- React application: `frontend/src/`
- MCP adapter: `mcp-server/src/`
