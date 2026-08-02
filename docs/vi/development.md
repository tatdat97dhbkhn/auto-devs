# Phát triển, kiểm thử và vận hành

## 0. Quy ước bản địa hoá giao diện

- Giao diện mặc định dùng locale `vi-VN`; resource nằm tại `frontend/src/i18n/`.
- Mọi text mới hiển thị cho người dùng phải đi qua key i18n hoặc resource tập trung,
  không thêm chuỗi tiếng Anh trực tiếp vào component.
- Dùng formatter locale dùng chung cho ngày giờ, số, phần trăm và thời lượng.
- Không dịch tên dự án, công việc, branch, commit, log AI, nội dung Markdown của người
  dùng/AI, route, JSON key, enum, error code hoặc log vận hành.
- Thuật ngữ lần đầu nên ghi rõ: Công việc (Task), Nhánh (Branch), Cây làm việc
  (Worktree), Yêu cầu kéo (Pull Request), Kế hoạch (Plan).

## 1. Các lệnh thường dùng

```bash
make help
make run                 # API
make run-worker          # worker
make build               # bin/autodevs
make build-worker        # bin/worker
make test                # go test ./... -v
make wire                # generate DI
make mocks               # generate mocks
make swagger             # regenerate Swagger
make migrate-up
make migrate-down
make migrate-version
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run format:check
npm run knip
```

MCP:

```bash
cd mcp-server
npm run build
npm start
```

## 2. Quy trình thay đổi backend

1. Sửa entity/interface nếu domain thay đổi.
2. Tạo migration nếu schema thay đổi: `make migrate-create name=...`.
3. Sửa PostgreSQL repository.
4. Sửa usecase và test business rule.
5. Sửa DTO/handler/route nếu expose HTTP.
6. Cập nhật provider Wire khi thêm dependency, chạy `make wire`.
7. Regenerate mock nếu interface đổi.
8. Regenerate Swagger khi API đổi.
9. Chạy test package liên quan, sau đó toàn bộ test.

Không sửa tay `internal/di/wire_gen.go`; đây là file generate.

## 3. Quy trình thêm AI executor

Executor phải implement contract `AiCodingCli` trong `internal/ai-executors/types.go`/service AI:

- sinh planning command;
- sinh implementation command;
- trả prompt và environment riêng;
- parse stream output thành execution log;
- parse planning output thành Markdown plan.

Sau đó thêm lựa chọn trong `jobs.Processor.getAiExecutor`, cập nhật frontend selection và test cả success/failure. Command được thực thi trong worktree của task, nên không hard-code current working directory của repository Auto-Devs.

Executor `codex` gọi trực tiếp binary Codex CLI local. Môi trường worker cần cài và đăng nhập Codex trước, đồng thời đưa `codex` vào `PATH`. Planning dùng sandbox read-only; implementation có quyền sửa và thực thi trong worktree, nên cần xem worker như một môi trường thực thi code tin cậy.

## 4. Quy trình migration an toàn

```bash
make migrate-version
make migrate-create name=add_example
# sửa cả file .up.sql và .down.sql
make migrate-up
```

Kiểm thử rollback trên database development trước production. `make migrate-reset` rollback toàn bộ và có thể phá dữ liệu; không dùng trên database có dữ liệu cần giữ.

Nếu migration ở trạng thái dirty, xác minh schema thực tế trước khi dùng `make migrate-force VERSION=n`; force chỉ sửa version marker, không tự hoàn tác SQL dở dang.

## 5. Chiến lược test trong repository

- unit test entity cho transition;
- usecase test với mock repository/service;
- repository integration test bằng `pgtestdb` và migrations;
- service test cho Git/GitHub/worktree/AI process;
- job test cho callback/sync;
- fake AI CLI để test stream log và plan mà không tốn API.

Lệnh chọn lọc:

```bash
go test ./internal/entity/... -v
go test ./internal/usecase/... -v
go test ./internal/service/... -v
go test ./internal/jobs/... -v
go test ./internal/repository/postgres/... -v
```

Repository integration test có thể cần PostgreSQL local và quyền tạo database tùy helper. Test Git có thể tạo repository/worktree tạm. Đọc lỗi setup trước khi kết luận code hỏng.

## 6. Build production

Server ở `SERVER_RUN_MODE=production` tìm SPA tại `./public/index.html`, serve `/assets`, `/images`, `/sounds` và fallback về `index.html` cho client routes.

Quy trình khái quát:

```bash
cd frontend
npm ci
npm run build
cd ..
go build -o bin/autodevs ./cmd/server
go build -o bin/worker ./cmd/worker
```

Cần copy nội dung frontend build vào `public/` theo pipeline đóng gói. Kiểm tra `build-package.sh` và `DEPLOYMENT.md` cho quy trình package hiện có; xác minh output vì Makefile hiện không định nghĩa các target `build-frontend`/`build-full` mà log production nhắc tới.

Deploy tối thiểu cần hai service độc lập:

- `autodevs-server`;
- `autodevs-worker` (có thể scale nhiều worker, nhưng phải kiểm tra giới hạn concurrency và Git/worktree contention).

Cả hai dùng chung PostgreSQL/Redis/config và phải nhìn thấy cùng filesystem repository/worktree nếu worker xử lý task. Nếu API và worker ở container/máy khác nhau, đường dẫn project phải tồn tại ở phía worker và volume phải được thiết kế rõ ràng.

## 7. Quan sát và debug

### Task đứng ở PLANNING/IMPLEMENTING

Kiểm tra theo thứ tự:

1. worker có chạy không;
2. Redis host/DB của API và worker có giống nhau không;
3. log worker có nhận job không;
4. worktree base dir có tồn tại/ghi được không;
5. AI command có cài/chạy được và credential hợp lệ không;
6. `executions`/`execution_logs` có bản ghi mới không;
7. task `error_logs` có thông báo gì.

### Không tạo được worktree

- xác minh `worktree_base_path` là repository gốc, không phải thư mục output tùy ý;
- chạy `git status`, `git worktree list`, `git remote -v` tại repository gốc;
- kiểm tra branch trùng, remote branch và quyền filesystem;
- kiểm tra dung lượng trống tối thiểu;
- dùng API validate/health/recover thay vì xóa path thủ công trước.

### Không tạo được PR

- kiểm tra `GITHUB_TOKEN` và scopes;
- kiểm tra `repository_url`/remote `origin` có đúng owner/repo;
- kiểm tra branch đã push;
- dùng scripts rate-limit trong `scripts/` để xem quota;
- kiểm tra base branch được lưu trên task.

### UI không realtime

- mở Network/WebSocket và kiểm tra `/ws/connect`;
- kiểm tra `VITE_WS_URL` và reverse proxy có hỗ trợ Upgrade;
- kiểm tra Centrifuge Redis address/DB;
- REST vẫn có thể đúng dù WebSocket hỏng, nên thử reload để phân biệt realtime với API.

### Server chạy nhưng không có UI

- ở development, UI chạy riêng trên Vite `:5173`;
- ở production, cần `public/index.html` và `SERVER_RUN_MODE=production`;
- API-only là hành vi chủ đích khi không tìm thấy frontend build.

## 8. Các điểm nợ kỹ thuật đáng chú ý

- README/Swagger/MCP mô tả một số enum hoặc số tool đã cũ.
- Một số DTO execution dùng ví dụ/binding chữ thường trong khi entity lưu enum chữ hoa.
- `SERVER_HOST` chưa được dùng khi tạo `http.Server`.
- API chưa có auth đầy đủ trong route setup.
- `run-dev.sh` in “Worker URL” dù worker không có HTTP endpoint riêng.
- Nhiều usecase nâng cao chưa có route/UI.
- Worker ghi PID vào worktree base dir nhưng bỏ qua lỗi `WriteFile`; thư mục thiếu có thể không lộ ngay.
- Planning execution được monitor bằng goroutine sau khi Asynq handler trả về; restart worker có thể làm mất goroutine theo dõi process đang chạy.

Những điểm này không làm mất ý nghĩa kiến trúc, nhưng cần được tính đến khi đưa hệ thống vào production hoặc mở rộng tính năng.

## 9. Checklist trước khi vận hành thật

- PostgreSQL backup và migration policy;
- Redis persistence/availability phù hợp;
- worker filesystem bền vững và đủ dung lượng;
- Git identity, SSH/token và branch protection đã thử;
- GitHub token theo nguyên tắc quyền tối thiểu;
- AI credential chỉ nằm trong secret manager;
- authentication/reverse proxy/TLS;
- WebSocket proxy config;
- log aggregation và cảnh báo task/execution treo;
- giới hạn concurrency để tránh cạn CPU/RAM/API quota;
- thử end-to-end bằng `fake-code`, rồi một task thật nhỏ trước.
