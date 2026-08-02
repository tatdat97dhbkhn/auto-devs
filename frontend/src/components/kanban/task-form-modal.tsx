import { useEffect } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Task } from '@/types/task'
import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const taskFormSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200, 'Tiêu đề quá dài'),
  description: z.string().max(1000, 'Mô tả quá dài').optional(),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

interface TaskFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  task?: Task | null
  mode: 'create' | 'edit'
}

export function TaskFormModal({
  open,
  onOpenChange,
  projectId,
  task,
  mode,
}: TaskFormModalProps) {
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  // Reset form when task changes or modal opens/closes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && task) {
        form.reset({
          title: task.title,
          description: task.description || '',
        })
      } else {
        form.reset({
          title: '',
          description: '',
        })
      }
    }
  }, [open, mode, task, form])

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending

  const onSubmit = async (values: TaskFormValues) => {
    try {
      if (mode === 'create') {
        await createTaskMutation.mutateAsync({
          project_id: projectId,
          title: values.title,
          description: values.description || '',
        })
      } else if (mode === 'edit' && task) {
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          updates: {
            title: values.title,
            description: values.description || '',
          },
        })
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      // Error is handled by the mutation hooks
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tạo công việc mới' : 'Chỉnh sửa công việc'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Thêm công việc mới vào bảng dự án.'
              : 'Cập nhật thông tin công việc.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Nhập tiêu đề công việc...'
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Nhập mô tả công việc...'
                      className='min-h-[100px]'
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Huỷ
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading
                  ? 'Đang lưu...'
                  : mode === 'create'
                    ? 'Tạo công việc'
                    : 'Cập nhật công việc'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
