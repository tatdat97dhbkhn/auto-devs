import type { TaskStatus } from '@/types/task'

export interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  description: string
  maxItems?: number
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'TODO',
    title: 'Cần làm',
    color: 'bg-slate-100 border-slate-200',
    description: 'Công việc sẵn sàng bắt đầu',
  },
  {
    id: 'PLANNING',
    title: 'Đang lập kế hoạch',
    color: 'bg-blue-100 border-blue-200',
    description: 'Công việc đang được AI lập kế hoạch',
  },
  {
    id: 'PLAN_REVIEWING',
    title: 'Duyệt kế hoạch',
    color: 'bg-amber-100 border-amber-200',
    description: 'Kế hoạch chờ duyệt',
  },
  {
    id: 'IMPLEMENTING',
    title: 'Đang triển khai',
    color: 'bg-orange-100 border-orange-200',
    description: 'Công việc đang được triển khai',
  },
  {
    id: 'CODE_REVIEWING',
    title: 'Duyệt mã nguồn',
    color: 'bg-purple-100 border-purple-200',
    description: 'Mã nguồn chờ duyệt',
  },
  {
    id: 'DONE',
    title: 'Hoàn thành',
    color: 'bg-green-100 border-green-200',
    description: 'Công việc đã hoàn thành',
  },
  {
    id: 'CANCELLED',
    title: 'Đã huỷ',
    color: 'bg-red-100 border-red-200',
    description: 'Công việc đã huỷ',
  },
]

const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['PLANNING', 'CANCELLED'],
  PLANNING: ['PLAN_REVIEWING', 'CANCELLED'],
  PLAN_REVIEWING: ['TODO', 'IMPLEMENTING', 'PLANNING', 'CANCELLED'],
  IMPLEMENTING: ['PLAN_REVIEWING', 'CODE_REVIEWING', 'CANCELLED'],
  CODE_REVIEWING: ['PLAN_REVIEWING', 'DONE', 'CANCELLED'],
  DONE: ['TODO'],
  CANCELLED: ['TODO'],
}

export function canTransitionTo(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): boolean {
  return TASK_STATUS_TRANSITIONS[fromStatus].includes(toStatus)
}

export function getStatusColor(status: TaskStatus): string {
  const column = getColumnById(status)
  return column?.color || 'bg-gray-100 border-gray-200'
}

export function getStatusTitle(status: TaskStatus): string {
  const column = getColumnById(status)
  return column?.title || status
}

function getColumnById(columnId: TaskStatus): KanbanColumn | undefined {
  return KANBAN_COLUMNS.find((col) => col.id === columnId)
}
