import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Task,
  UpdateTaskRequest,
  StartPlanningRequest,
  ApprovePlanRequest,
  StartImplementingDirectRequest,
} from '@/types/task'
import { toast } from 'sonner'
import { tasksApi } from '@/lib/api/tasks'
import { worktreesApi } from '@/lib/api/worktrees'

const TASKS_QUERY_KEY = 'tasks'

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, projectId],
    queryFn: () => tasksApi.getTasks(projectId),
    enabled: !!projectId,
  })
}

export function useDoneTasks(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, projectId, 'done'],
    queryFn: () => tasksApi.getDoneTasks(projectId),
    enabled: !!projectId && enabled,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: (newTask) => {
      // Invalidate tasks list for the project
      queryClient.invalidateQueries({
        queryKey: [TASKS_QUERY_KEY, newTask.project_id],
      })
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể tạo công việc'
      )
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string
      updates: UpdateTaskRequest
    }) => tasksApi.updateTask(taskId, updates),
    onSuccess: (updatedTask) => {
      // Update individual task query
      queryClient.setQueryData([TASKS_QUERY_KEY, updatedTask.id], updatedTask)

      // Invalidate tasks list for the project
      queryClient.invalidateQueries({
        queryKey: [TASKS_QUERY_KEY, updatedTask.project_id],
      })

      toast.success('Đã cập nhật công việc thành công')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Không thể cập nhật công việc'
      )
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: (_, taskId) => {
      // Remove task from cache
      queryClient.removeQueries({ queryKey: [TASKS_QUERY_KEY, taskId] })
      // Cancel and clear detail-panel requests that may still be in flight
      // while the task is being removed from the board.
      queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY, 'diff', taskId] })
      queryClient.removeQueries({ queryKey: [TASKS_QUERY_KEY, 'diff', taskId] })
      queryClient.removeQueries({ queryKey: ['pull-request-by-task', taskId] })

      // Invalidate all tasks queries
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })

      toast.success('Đã xoá công việc thành công')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể xoá công việc')
    },
  })
}

// Optimistic update for drag and drop
export function useOptimisticTaskUpdate() {
  const queryClient = useQueryClient()

  return (projectId: string, taskId: string, newStatus: Task['status']) => {
    queryClient.setQueryData([TASKS_QUERY_KEY, projectId], (old: any) => {
      if (!old) return old

      return {
        ...old,
        tasks: old.tasks.map((task: Task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ),
      }
    })
  }
}

export function useDuplicateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (task: Task) => {
      // Create a new task with similar data but different title
      const duplicatedTask = {
        project_id: task.project_id,
        title: `${task.title} (Copy)`,
        description: task.description,
        status: 'TODO' as Task['status'], // Reset to TODO
        plan: task.plan,
        branch_name: '', // Reset branch name
        pr_url: '', // Reset PR URL
      }
      return tasksApi.createTask(duplicatedTask)
    },
    onSuccess: (newTask) => {
      // Invalidate tasks list for the project
      queryClient.invalidateQueries({
        queryKey: [TASKS_QUERY_KEY, newTask.project_id],
      })
      toast.success('Đã nhân bản công việc thành công')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Không thể nhân bản công việc'
      )
    },
  })
}

export function useStartPlanning() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      request,
    }: {
      taskId: string
      request: StartPlanningRequest
    }) => tasksApi.startPlanning(taskId, request),
    onMutate: async ({ taskId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData([TASKS_QUERY_KEY])

      // Optimistically update task status to PLANNING
      queryClient.setQueryData([TASKS_QUERY_KEY], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task: Task) =>
            task.id === taskId
              ? { ...task, status: 'PLANNING' as Task['status'] }
              : task
          ),
        }
      })

      // Return a context object with the snapshotted value
      return { previousTasks }
    },
    onSuccess: (response) => {
      toast.success(`Đã bắt đầu lập kế hoạch. Job ID: ${response.job_id}`)
    },
    onError: (error: any, context: any) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks)
      }
      toast.error(
        error.response?.data?.message || 'Không thể bắt đầu lập kế hoạch'
      )
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'plans', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['executions', 'task', variables.taskId] })
    },
  })
}

export function useApprovePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      request,
    }: {
      taskId: string
      request: ApprovePlanRequest
    }) => tasksApi.approvePlan(taskId, request),
    onMutate: async (mutatedTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData([TASKS_QUERY_KEY])

      // Optimistically update task status to IMPLEMENTING
      queryClient.setQueryData([TASKS_QUERY_KEY], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task: Task) =>
            task.id === mutatedTask.taskId
              ? { ...task, status: 'IMPLEMENTING' as Task['status'] }
              : task
          ),
        }
      })

      // Return a context object with the snapshotted value
      return { previousTasks }
    },
    onSuccess: (response) => {
      toast.success(
        `Đã duyệt kế hoạch và xếp hàng triển khai. Job ID: ${response.job_id}`
      )
    },
    onError: (error: any, context: any) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks)
      }
      toast.error(error.response?.data?.message || 'Không thể duyệt kế hoạch')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

export function useStartImplementingDirect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      request,
    }: {
      taskId: string
      request: StartImplementingDirectRequest
    }) => tasksApi.startImplementingDirect(taskId, request),
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] })
      const previousTasks = queryClient.getQueryData([TASKS_QUERY_KEY])

      queryClient.setQueryData([TASKS_QUERY_KEY], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task: Task) =>
            task.id === taskId
              ? { ...task, status: 'IMPLEMENTING' as Task['status'] }
              : task
          ),
        }
      })

      return { previousTasks }
    },
    onSuccess: (response) => {
      toast.success(`Đã bắt đầu triển khai. Job ID: ${response.job_id}`)
    },
    onError: (error: any, _variables, context: any) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks)
      }
      toast.error(
        error.response?.data?.message ||
          'Không thể bắt đầu triển khai trực tiếp'
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

export function useChangeTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string
      status: Task['status']
    }) => tasksApi.changeTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData([TASKS_QUERY_KEY])

      // Optimistically update task status
      queryClient.setQueryData([TASKS_QUERY_KEY], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task: Task) =>
            task.id === taskId ? { ...task, status } : task
          ),
        }
      })

      // Return a context object with the snapshotted value
      return { previousTasks }
    },
    onSuccess: (updatedTask) => {
      // Update individual task query
      queryClient.setQueryData([TASKS_QUERY_KEY, updatedTask.id], updatedTask)

      // Invalidate tasks list for the project
      queryClient.invalidateQueries({
        queryKey: [TASKS_QUERY_KEY, updatedTask.project_id],
      })

      toast.success('Đã cập nhật trạng thái công việc thành công')
    },
    onError: (error: any, _variables, context: any) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        queryClient.setQueryData([TASKS_QUERY_KEY], context.previousTasks)
      }
      toast.error(
        error.response?.data?.message ||
          'Không thể cập nhật trạng thái công việc'
      )
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

export function useGetTaskPlans(taskId: string) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, 'plans', taskId],
    queryFn: () => tasksApi.getTaskPlans(taskId),
    enabled: !!taskId,
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      planId,
      content,
    }: {
      taskId: string
      planId: string
      content: string
    }) => tasksApi.updatePlan(taskId, planId, content),
    onSuccess: (_, { taskId }) => {
      // Invalidate plans query to refetch updated data
      queryClient.invalidateQueries({
        queryKey: [TASKS_QUERY_KEY, 'plans', taskId],
      })
      toast.success('Đã cập nhật kế hoạch thành công')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Không thể cập nhật kế hoạch'
      )
    },
  })
}

export function useRevisePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      planId,
      feedback,
    }: {
      taskId: string
      planId: string
      feedback: string
    }) => tasksApi.revisePlan(taskId, planId, feedback),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: [TASKS_QUERY_KEY, 'plans', taskId],
      })
      toast.success('Đã gửi yêu cầu AI chỉnh kế hoạch')
    },
    onError: (error: any) =>
      toast.error(
        error.response?.data?.message || 'Không thể yêu cầu AI chỉnh kế hoạch'
      ),
  })
}

export function useCreateWorktree(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: worktreesApi.createWorktree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, projectId] })
      toast.success('Đã bắt đầu tạo Worktree')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể tạo Worktree')
    },
  })
}

export function useTaskDiff(taskId: string) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, 'diff', taskId],
    queryFn: () => tasksApi.getTaskDiff(taskId),
    enabled: !!taskId,
    staleTime: 30000, // 30 seconds
    retry: 1, // Only retry once on failure
  })
}
