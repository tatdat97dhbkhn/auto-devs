# Auto-Devs application

Auto-Devs hiển thị giao diện tiếng Việt (`vi-VN`) theo mặc định. Tài liệu vận hành và
phát triển tiếng Việt nằm trong [docs/vi/](docs/vi/README.md). API path, JSON field,
enum và log kỹ thuật vẫn giữ nguyên để bảo đảm tương thích tích hợp.

> Tài liệu tiếng Việt đầy đủ: **[Bắt đầu đọc tại docs/vi/README.md](docs/vi/README.md)**. Bộ tài liệu giải thích mục đích, cách dùng, kiến trúc, luồng AI–Git–PR, API, cơ sở dữ liệu và cách phát triển/vận hành dự án.

Auto your development workflow with coding AI agents & CLI.

[Demo video](https://youtu.be/meg2uBtbJ0A)

## 🚀 Quick Start

### Prerequisites

- **Go** 1.24.3+
- **Node.js** 22.12.0+
- **PostgreSQL** 12+
- **Redis** 6+
- **Git**

### Quick Installation

1. **Clone repository:**

```bash
git clone https://github.com/auto-devs/auto-devs.git
cd auto-devs
```

2. **Setup environment:**

```bash
cp .env.example .env
# Edit .env with your PostgreSQL, Redis credentials and GitHub Personal Access Token
```

3. **Setup database:**

```bash
make migrate-up
```

4. **Install frontend dependencies:**

```bash
cd frontend && npm install && cd ..
```

5. **Run development environment:**

```bash
./run-dev.sh
```

The application will be available at:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8098
- **Swagger UI:** http://localhost:8098/swagger/index.html

## 🎯 What is Auto-Devs?

Auto-Devs is an AI-powered software development workflow automation platform. The system enables developers to automate coding tasks through AI agents and CLI tools, helping to accelerate development and minimize manual work.

## ✨ Core Features

### 🤖 AI-Powered Task Automation

- **AI Code Generation:** Automatically generate code based on task descriptions
- **Smart Planning:** AI-assisted planning and requirement analysis
- **Execution Tracking:** Monitor and manage AI execution processes
- **AI Executor:** Execution type is configurable, you can choose any cli tool to execute the task

### 📋 Project & Task Management

- **Kanban Board:** Task management with drag & drop interface
- **Task Lifecycle:** Complete task workflow from planning to completion
- **Priority Management:** Task priority system with 4 levels
- **Status Tracking:** Real-time task status monitoring

### 🔄 Git Integration

- **Worktree Management:** Manage multiple git worktrees
- **Branch Automation:** Automatically create and manage git branches
- **Pull Request Sync:** Synchronize PR status with GitHub
- **Repository Management:** Integrate with GitHub repositories

### 📊 Real-time Monitoring

- **WebSocket Support:** Real-time updates for all changes
- **Execution Logs:** Detailed execution process tracking
- **Progress Tracking:** Display task execution progress

### 🎨 Modern Web Interface

- **Responsive Design:** Interface compatible with all devices
- **Dark/Light Theme:** Support for light/dark modes
- **Real-time Updates:** Real-time data updates via WebSocket
- **Accessibility:** User-friendly interface design

## 🏗️ Architecture

### Backend (Go)

- **Framework:** Gin web framework
- **Database:** PostgreSQL with GORM ORM
- **Cache:** Redis for session and job queue
- **Job Queue:** Asynq for background task processing
- **WebSocket:** Gorilla WebSocket for real-time communication
- **Dependency Injection:** Wire framework
- **Testing:** Testify with mock generation

### Frontend (React)

- **Framework:** React 19 with TypeScript
- **UI Components:** ShadcnUI (TailwindCSS + RadixUI)
- **State Management:** TanStack Query + Zustand
- **Routing:** TanStack Router
- **Build Tool:** Vite
- **Styling:** TailwindCSS

### Key Components

- **AI Executors:** Claude, Fake AI for development/testing
- **Git Services:** Branch management, worktree operations
- **GitHub Integration:** Repository sync, PR management
- **WebSocket Hub:** Real-time communication layer
- **Job Scheduler:** Background task processing

## 🚀 Getting Started

### Development Setup

1. **Install Go dependencies:**

```bash
go mod download
go mod tidy
```

2. **Generate mocks:**

```bash
make mocks
```

3. **Generate Wire DI code:**

```bash
make wire
```

4. **Generate Swagger docs:**

```bash
make swagger
```

### Database Setup

1. **Create PostgreSQL database:**

```sql
CREATE DATABASE autodevs_dev;
```

2. **Run migrations:**

```bash
make migrate-up
```

3. **Check migration status:**

```bash
make migrate-version
```

### Running Services

- **Start all services:** `./run-dev.sh`
- **Start backend only:** `make run`
- **Start worker only:** `make run-worker`
- **Start frontend only:** `cd frontend && npm run dev`

## 📚 API Documentation

- **Swagger UI:** http://localhost:8098/swagger/index.html
- **API Base URL:** http://localhost:8098/api/v1
- **WebSocket:** ws://localhost:8098/ws

## 🧪 Testing

```bash
# Run all tests
make test

# Run specific test package
go test ./internal/service/... -v

# Generate test coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## 🛠️ Available Commands

```bash
# Database operations
make db-setup          # Setup database with migrations
make migrate-up        # Run pending migrations
make migrate-down      # Rollback last migration
make migrate-reset     # Rollback all migrations

# Build operations
make build             # Build main application
make build-worker      # Build worker binary
make clean             # Clean build artifacts

# Development tools
make mocks             # Generate mocks for testing
make wire              # Generate Wire DI code
make swagger           # Generate Swagger documentation

# Worker management
make run-worker        # Start job worker
make run-worker-verbose # Start worker with verbose logging
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=autodevs_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Server
SERVER_PORT=8098
SERVER_HOST=0.0.0.0

# AI Configuration
GITHUB_PAT=<your_github_personal_access_token>
```

## 📁 Project Structure

```
auto-devs/
├── cmd/                    # Application entry points
│   ├── server/            # Main server binary
│   └── worker/            # Background job worker
├── internal/              # Private application code
│   ├── entity/            # Domain entities
│   ├── repository/        # Data access layer
│   ├── service/           # Business logic
│   ├── usecase/           # Application use cases
│   ├── handler/           # HTTP handlers
│   └── websocket/         # WebSocket handling
├── frontend/              # React frontend application
├── migrations/            # Database migrations
├── pkg/                   # Public packages
└── scripts/               # Utility scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/auto-devs/auto-devs/issues)
- **Documentation:** [Project Wiki](https://github.com/auto-devs/auto-devs/wiki)
- **Discussions:** [GitHub Discussions](https://github.com/auto-devs/auto-devs/discussions)

---

**Auto-Devs** - Automating your development workflow with AI 🚀
