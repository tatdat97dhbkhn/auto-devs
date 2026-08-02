import { useState } from 'react'
import type { Task, TaskStatus } from '@/types/task'
import {
  Edit,
  Trash2,
  Copy,
  Play,
  ArrowUpDown,
  FolderOpen,
  Zap,
  GitBranch,
} from 'lucide-react'
import { tasksApi } from '@/lib/api/tasks'
import { Button } from '@/components/ui/button'
import { BranchSelectionDialog } from './branch-selection-dialog'
import { ChangeStatusDialog } from './change-status-dialog'
import { ImplementationConfirmationDialog } from './implementation-confirmation-dialog'
import { useTaskExecutions } from '@/hooks/use-executions'

interface TaskActionsProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  onDuplicate?: (task: Task) => void
  onStartPlanning?: (
    taskId: string,
    branchName: string,
    aiType: string,
    model: string,
    reasoningEffort: string,
    autoImplement: boolean,
    useRemoteBranch: boolean
  ) => void
  onApprovePlanAndStartImplement?: (
    taskId: string,
    planId: string,
    aiType: string,
    model: string,
    reasoningEffort: string
  ) => void
  selectedPlanId?: string
  selectedPlanInfo?: {
    version: number
    status: string
    createdAt: string
    revisionFeedback?: string
  }
  onChangeStatus?: (taskId: string, newStatus: TaskStatus) => Promise<void>
  onImplementDirect?: (
    taskId: string,
    branchName: string,
    aiType: string,
    model: string,
    reasoningEffort: string,
    useRemoteBranch: boolean
  ) => void
  onCreateWorktree?: (
    taskId: string,
    branchName: string,
    useRemoteBranch: boolean
  ) => void
}

export function TaskActions({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onStartPlanning,
  onApprovePlanAndStartImplement,
  selectedPlanId,
  selectedPlanInfo,
  onChangeStatus,
  onImplementDirect,
  onCreateWorktree,
}: TaskActionsProps) {
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [showDirectImplementDialog, setShowDirectImplementDialog] =
    useState(false)
  const [showImplementationDialog, setShowImplementationDialog] =
    useState(false)
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false)
  const [showCreateWorktreeDialog, setShowCreateWorktreeDialog] =
    useState(false)
  const [showPlanningWithWorktreeDialog, setShowPlanningWithWorktreeDialog] =
    useState(false)
  const [showImplementWithWorktreeDialog, setShowImplementWithWorktreeDialog] =
    useState(false)
  const [isOpeningCursor, setIsOpeningCursor] = useState(false)

  const hasWorktree = !!task.worktree_path
  const { data: executionsData } = useTaskExecutions(task.id)
  const isRevisionInProgress = (executionsData?.data ?? []).some(
    (execution) =>
      execution.execution_type === 'PLAN_REVISION' &&
      (execution.status === 'PENDING' || execution.status === 'RUNNING')
  )

  const handleDelete = () => {
    onDelete?.(task.id)
  }

  const handleStartPlanning = () => {
    if (hasWorktree) {
      setShowPlanningWithWorktreeDialog(true)
    } else {
      setShowBranchDialog(true)
    }
  }

  const handleDirectImplement = () => {
    if (hasWorktree) {
      setShowImplementWithWorktreeDialog(true)
    } else {
      setShowDirectImplementDialog(true)
    }
  }

  const handleBranchSelected = (
    branchName: string,
    aiType: string,
    model: string,
    reasoningEffort: string,
    autoImplement: boolean,
    useRemoteBranch: boolean
  ) => {
    onStartPlanning?.(
      task.id,
      branchName,
      aiType,
      model,
      reasoningEffort,
      autoImplement,
      useRemoteBranch
    )
  }

  const handleDirectImplementBranchSelected = (
    branchName: string,
    aiType: string,
    model: string,
    reasoningEffort: string,
    _autoImplement: boolean,
    useRemoteBranch: boolean
  ) => {
    onImplementDirect?.(
      task.id,
      branchName,
      aiType,
      model,
      reasoningEffort,
      useRemoteBranch
    )
  }

  const handleCreateWorktreeBranchSelected = (
    branchName: string,
    _aiType: string,
    _model: string,
    _reasoningEffort: string,
    _autoImplement: boolean,
    useRemoteBranch: boolean
  ) => {
    onCreateWorktree?.(task.id, branchName, useRemoteBranch)
  }

  const handlePlanningWithWorktreeConfirm = (
    aiType: string,
    model: string,
    reasoningEffort: string,
    autoImplement?: boolean
  ) => {
    // Pass base branch (not worktree branch) so backend does not overwrite BaseBranchName
    onStartPlanning?.(
      task.id,
      task.base_branch_name || '',
      aiType,
      model,
      reasoningEffort,
      autoImplement ?? false,
      false
    )
  }

  const handleImplementWithWorktreeConfirm = (
    aiType: string,
    model: string,
    reasoningEffort: string
  ) => {
    onImplementDirect?.(
      task.id,
      task.base_branch_name || '',
      aiType,
      model,
      reasoningEffort,
      false
    )
  }

  const handleApprovePlanAndStartImplement = () => {
    if (isRevisionInProgress) return
    setShowImplementationDialog(true)
  }

  const handleImplementationConfirm = (
    aiType: string,
    model: string,
    reasoningEffort: string
  ) => {
    if (selectedPlanId) onApprovePlanAndStartImplement?.(task.id, selectedPlanId, aiType, model, reasoningEffort)
  }

  const handleChangeStatus = async (newStatus: TaskStatus) => {
    if (onChangeStatus) {
      await onChangeStatus(task.id, newStatus)
    }
  }

  const handleOpenWithCursor = async () => {
    if (!task?.worktree_path) return

    try {
      setIsOpeningCursor(true)
      await tasksApi.openWithCursor(task.id)
    } catch (error) {
      console.error('Failed to open with Cursor:', error)
    } finally {
      setIsOpeningCursor(false)
    }
  }

  return (
    <>
      <div className='flex flex-wrap items-center gap-2'>
        {/* Create Worktree - Only show for TODO tasks without a worktree */}
        {task.status === 'TODO' && !hasWorktree && onCreateWorktree && (
          <Button
            variant='default'
            size='sm'
            onClick={() => setShowCreateWorktreeDialog(true)}
            title='Tạo Worktree cho công việc này'
            className='bg-purple-600 text-white hover:bg-purple-700'
          >
            <GitBranch className='mr-1 h-4 w-4' />
            Create Worktree
          </Button>
        )}

        {/* Start Planning Action - Only show for TODO tasks */}
        {task.status === 'TODO' && onStartPlanning && (
          <Button
            variant='default'
            size='sm'
            onClick={handleStartPlanning}
            title='Bắt đầu lập kế hoạch cho công việc này'
            className='bg-blue-600 text-white hover:bg-blue-700'
          >
            <Play className='mr-1 h-4 w-4' />
            Start Planning
          </Button>
        )}

        {/* Implement Directly - Only show for TODO tasks */}
        {task.status === 'TODO' && onImplementDirect && (
          <Button
            variant='default'
            size='sm'
            onClick={handleDirectImplement}
            title='Bỏ qua lập kế hoạch và triển khai trực tiếp'
            className='bg-orange-600 text-white hover:bg-orange-700'
          >
            <Zap className='mr-1 h-4 w-4' />
            Implement Directly
          </Button>
        )}

        {/* Approve Plan and Start Implement Action */}
        {task.status === 'PLAN_REVIEWING' && onApprovePlanAndStartImplement && (
          <Button
            variant='default'
            size='sm'
            onClick={handleApprovePlanAndStartImplement}
            disabled={!selectedPlanId || isRevisionInProgress}
            title='Duyệt kế hoạch và bắt đầu triển khai'
            className='bg-green-600 text-white hover:bg-green-700'
          >
            <Play className='mr-1 h-4 w-4' />
            {isRevisionInProgress
              ? 'Đang tạo kế hoạch...'
              : 'Approve Plan and Start Implement'}
          </Button>
        )}

        {/* Open With Cursor button */}
        {task?.worktree_path && (
          <Button
            variant='outline'
            size='sm'
            onClick={handleOpenWithCursor}
            disabled={isOpeningCursor}
            title='Mở workspace công việc bằng Cursor'
          >
            <FolderOpen className='mr-1 h-4 w-4' />
            {isOpeningCursor ? 'Opening...' : 'Open With Cursor'}
          </Button>
        )}

        {onEdit && (
          <Button variant='outline' size='sm' onClick={() => onEdit(task)}>
            <Edit className='h-4 w-4' /> Edit
          </Button>
        )}

        {onChangeStatus && (
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowChangeStatusDialog(true)}
            title='Thay đổi trạng thái công việc'
          >
            <ArrowUpDown className='h-4 w-4' /> Change Status
          </Button>
        )}

        {onDuplicate && (
          <Button variant='outline' size='sm' onClick={() => onDuplicate(task)}>
            <Copy className='h-4 w-4' /> Duplicate
          </Button>
        )}

        {onDelete && (
          <Button variant='destructive' size='sm' onClick={handleDelete}>
            <Trash2 className='h-4 w-4' /> Delete
          </Button>
        )}
      </div>

      {/* Create Worktree Dialog */}
      <BranchSelectionDialog
        open={showCreateWorktreeDialog}
        onOpenChange={setShowCreateWorktreeDialog}
        projectId={task.project_id}
        taskTitle={task.title}
        onBranchSelected={handleCreateWorktreeBranchSelected}
        mode='worktree'
      />

      {/* Branch Selection Dialog for Start Planning (no existing worktree) */}
      <BranchSelectionDialog
        open={showBranchDialog}
        onOpenChange={setShowBranchDialog}
        projectId={task.project_id}
        taskTitle={task.title}
        onBranchSelected={handleBranchSelected}
      />

      {/* Direct Implement Branch Selection Dialog (no existing worktree) */}
      <BranchSelectionDialog
        open={showDirectImplementDialog}
        onOpenChange={setShowDirectImplementDialog}
        projectId={task.project_id}
        taskTitle={task.title}
        onBranchSelected={handleDirectImplementBranchSelected}
        mode='implementing'
      />

      {/* Planning with existing worktree: AI type + auto-implement only */}
      <ImplementationConfirmationDialog
        open={showPlanningWithWorktreeDialog}
        onOpenChange={setShowPlanningWithWorktreeDialog}
        taskTitle={task.title}
        onConfirm={handlePlanningWithWorktreeConfirm}
        mode='planning'
      />

      {/* Implement directly with existing worktree: AI type only */}
      <ImplementationConfirmationDialog
        open={showImplementWithWorktreeDialog}
        onOpenChange={setShowImplementWithWorktreeDialog}
        taskTitle={task.title}
        onConfirm={handleImplementWithWorktreeConfirm}
        mode='implementing'
      />

      {/* Implementation Confirmation Dialog */}
      <ImplementationConfirmationDialog
        open={showImplementationDialog}
        onOpenChange={setShowImplementationDialog}
        taskTitle={task.title}
        selectedPlanInfo={selectedPlanInfo}
        onConfirm={handleImplementationConfirm}
      />

      {/* Change Status Dialog */}
      <ChangeStatusDialog
        open={showChangeStatusDialog}
        onOpenChange={setShowChangeStatusDialog}
        task={task}
        onStatusChange={handleChangeStatus}
      />
    </>
  )
}
