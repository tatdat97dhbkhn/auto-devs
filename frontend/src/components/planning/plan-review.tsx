import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { websocketService } from '@/services/websocketService'
import type { Task } from '@/types/task'
import { ChevronDown, RefreshCcw, FileText, Pencil } from 'lucide-react'
import { useTaskExecutions } from '@/hooks/use-executions'
import {
  useGetTaskPlans,
  useUpdatePlan,
  useRevisePlan,
} from '@/hooks/use-tasks'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { PlanEditor } from './plan-editor'
import { PlanPreview } from './plan-preview'

interface PlanReviewProps {
  task: Task
  selectedPlanId?: string
  onPlanSelect?: (
    planId: string,
    info?: {
      version: number
      status: string
      createdAt: string
      revisionFeedback?: string
    }
  ) => void
  onPlanUpdate?: (updatedTask: Task) => void
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void
}

export function PlanReview({ task, selectedPlanId, onPlanSelect }: PlanReviewProps) {
  const { data, isLoading, error, refetch } = useGetTaskPlans(task.id)
  const updatePlan = useUpdatePlan()
  const revisePlan = useRevisePlan()
  const { data: executionsData } = useTaskExecutions(task.id)
  const [feedback, setFeedback] = useState('')
  const queryClient = useQueryClient()
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [revisionRequested, setRevisionRequested] = useState(false)
  const plans = data?.plans

  const handleEditPlan = (planId: string) => {
    setEditingPlan(planId)
  }

  const handleSavePlan = async (content: string, isAutoSave?: boolean) => {
    if (!editingPlan) return

    await updatePlan.mutateAsync({
      taskId: task.id,
      planId: editingPlan,
      content,
    })
    if (!isAutoSave) {
      setEditingPlan(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingPlan(null)
  }

  const currentEditingPlan = plans?.find((p) => p.id === editingPlan)
  const latestPlan = plans?.[0]
  const planInfo = (index: number) => {
    const plan = plans?.[index]
    if (!plan) return undefined
    return {
      version: plans.length - index,
      status: plan.status,
      createdAt: plan.created_at,
      revisionFeedback: plan.revision_feedback,
    }
  }
  useEffect(() => {
    if (latestPlan && (!selectedPlanId || !plans?.some((plan) => plan.id === selectedPlanId))) {
      onPlanSelect?.(latestPlan.id, planInfo(0))
    }
  }, [latestPlan, onPlanSelect, plans, selectedPlanId])
  const hasPlanningExecution = (executionsData?.data ?? []).some(
    (execution) =>
      execution.execution_type === 'PLANNING' ||
      execution.execution_type === 'PLAN_REVISION' ||
      !execution.execution_type
  )
  const hasActiveRevision = (executionsData?.data ?? []).some(
    (execution) =>
      execution.execution_type === 'PLAN_REVISION' &&
      (execution.status === 'PENDING' || execution.status === 'RUNNING')
  )
  const isRevisionInProgress = revisionRequested || hasActiveRevision
  useEffect(() => {
    const listener = (message: {
      type: string
      data: { task_id?: string }
    }) => {
      if (
        message.data?.task_id === task.id &&
        [
          'plan_revision_completed',
          'plan_revision_failed',
          'plan_revision_execution_created',
        ].includes(message.type)
      ) {
        queryClient.invalidateQueries({ queryKey: ['tasks', 'plans', task.id] })
        queryClient.invalidateQueries({
          queryKey: ['executions', 'task', task.id],
        })
        if (message.type === 'plan_revision_execution_created') {
          setRevisionRequested(true)
        } else if (
          message.type === 'plan_revision_completed' ||
          message.type === 'plan_revision_failed'
        ) {
          setRevisionRequested(false)
        }
      }
    }
    websocketService.subscribe(`project:${task.project_id}`, listener)
    return () =>
      websocketService.unsubscribe(`project:${task.project_id}`, listener)
  }, [queryClient, task.id, task.project_id])
  const submitFeedback = async () => {
    if (!latestPlan || !feedback.trim() || isRevisionInProgress) return
    setRevisionRequested(true)
    try {
      await revisePlan.mutateAsync({
        taskId: task.id,
        planId: latestPlan.id,
        feedback: feedback.trim(),
      })
      setFeedback('')
    } catch {
      setRevisionRequested(false)
    }
  }

  if (isLoading) {
    return (
      <Card className='w-full'>
        <CardContent className='flex flex-col items-center justify-center py-8'>
          <div className='mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600' />
          <p className='text-sm text-gray-500'>Đang tải các kế hoạch...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className='w-full'>
        <CardContent className='flex flex-col items-center justify-center py-8'>
          <FileText className='mb-4 h-12 w-12 text-red-400' />
          <h3 className='mb-2 text-lg font-medium text-red-600'>
            Không thể tải kế hoạch
          </h3>
          <p className='text-sm text-red-500'>{error.message}</p>
          <Button onClick={() => refetch()}>Thử lại</Button>
        </CardContent>
      </Card>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <Card className='w-full'>
        <CardContent className='flex flex-col items-center justify-center py-8'>
          <FileText className='mb-4 h-12 w-12 text-gray-400' />
          <h3 className='mb-2 text-lg font-medium'>Chưa có kế hoạch nào</h3>
          <p className='max-w-md text-center text-sm text-gray-500'>
            Kế hoạch sẽ xuất hiện tại đây sau khi AI hoàn tất quá trình lập kế
            hoạch.
          </p>
          <Button onClick={() => refetch()}>Tải lại</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className='w-full'>
        <CardHeader className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-col'>
            <CardTitle>Duyệt kế hoạch</CardTitle>
            <CardDescription>
              Xem và góp ý cho các phiên bản kế hoạch của công việc. Bản mới
              nhất được hiển thị trước.
            </CardDescription>
          </div>
          <div className='flex justify-end'>
            <Button variant='outline' onClick={() => refetch()}>
              <RefreshCcw className='mr-2 h-4 w-4' />
              Refetch
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {task.status === 'PLAN_REVIEWING' && (
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-5 sm:p-6'>
              <div className='mb-3'>
                <h3 className='font-medium'>Góp ý để AI chỉnh kế hoạch</h3>
                <p className='mt-1 text-sm leading-6 text-gray-600'>
                  Mô tả những phần bạn muốn bổ sung hoặc thay đổi trong bản kế
                  hoạch mới.
                </p>
              </div>
              {isRevisionInProgress && (
                <div className='mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
                  AI đang tạo kế hoạch mới. Vui lòng chờ hoàn tất trước khi
                  duyệt kế hoạch và bắt đầu triển khai.
                </div>
              )}
              <textarea
                className='min-h-28 w-full rounded-md border bg-white p-3 text-sm leading-6 shadow-sm transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder='Ví dụ: Bổ sung migration database và kế hoạch kiểm thử'
                disabled={isRevisionInProgress || revisePlan.isPending}
              />
              <div className='mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center'>
                <Button
                  onClick={submitFeedback}
                  disabled={
                    !feedback.trim() ||
                    isRevisionInProgress ||
                    revisePlan.isPending ||
                    !hasPlanningExecution
                  }
                >
                  {revisePlan.isPending
                    ? 'Đang xử lý...'
                    : 'Yêu cầu AI chỉnh lại'}
                </Button>
                {!hasPlanningExecution && (
                  <span className='text-xs text-gray-500'>
                    Chưa có execution planning hợp lệ.
                  </span>
                )}
              </div>
            </div>
          )}
          {plans.map((plan, index) => (
            <Collapsible key={plan.id} defaultOpen={index === 0}>
              <div className={`flex items-center rounded-lg border hover:bg-gray-50 ${selectedPlanId === plan.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : ''}`} onClick={() => onPlanSelect?.(plan.id, planInfo(index))}>
                <CollapsibleTrigger className='flex min-w-0 flex-1 items-center justify-between gap-3 p-4 text-left'>
                  <div className='min-w-0'>
                    <div className='font-medium'>
                      Plan {plans.length - index}{selectedPlanId === plan.id && <span className='ml-2 text-xs text-blue-700'>Đang chọn</span>}
                    </div>
                    <div className='text-sm text-gray-500'>
                      Created {new Date(plan.created_at).toLocaleDateString()}{' '}
                      at {new Date(plan.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-2'>
                    {plan.status && (
                      <Badge variant='outline'>{plan.status}</Badge>
                    )}
                    <ChevronDown className='h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180' />
                  </div>
                </CollapsibleTrigger>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleEditPlan(plan.id)}
                  aria-label={`Edit plan ${plans.length - index}`}
                  className='mr-3 h-8 w-8 shrink-0 p-0'
                >
                  <Pencil className='h-4 w-4' />
                </Button>
              </div>
              <CollapsibleContent className='px-4 pb-4'>
                <div className='mt-4 rounded-lg border bg-gray-50 p-4'>
                  <PlanPreview content={plan.content} className='w-full' />
                </div>
                {plan.revision_feedback && (
                  <p className='mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800'>
                    Góp ý đã dùng: {plan.revision_feedback}
                  </p>
                )}
                {plan.revision_of_plan_id && <p className='mt-2 text-xs text-gray-600'>Bản này thay đổi từ revision trước.</p>}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Edit Plan Dialog */}
      <Dialog
        open={!!editingPlan}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className='flex h-[96vh] w-[min(98vw,1800px)] max-w-none flex-col gap-0 overflow-hidden p-0'>
          <DialogHeader className='shrink-0 border-b px-6 py-5 pr-14 sm:px-8 sm:py-6'>
            <DialogTitle className='text-xl'>Chỉnh sửa kế hoạch</DialogTitle>
            <p className='text-muted-foreground text-sm leading-6'>
              Cập nhật nội dung Markdown, xem trước thay đổi và lưu phiên bản kế
              hoạch.
            </p>
          </DialogHeader>
          <div className='min-h-0 flex-1 overflow-hidden px-2 sm:px-4'>
            {currentEditingPlan && (
              <PlanEditor
                initialValue={currentEditingPlan.content}
                onSave={handleSavePlan}
                onCancel={handleCancelEdit}
                isLoading={updatePlan.isPending}
                autoSave={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
