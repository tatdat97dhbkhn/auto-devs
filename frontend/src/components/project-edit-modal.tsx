import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { UpdateProjectRequest } from '@/types/project'
import { Settings, Trash2 } from 'lucide-react'
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleConfirmDialog } from '@/components/simple-confirm-dialog'

const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên dự án là bắt buộc')
    .max(100, 'Tên dự án phải dưới 100 ký tự'),
  description: z.string().max(500, 'Mô tả phải dưới 500 ký tự').optional(),
  worktree_base_path: z.string().optional(),
  init_workspace_script: z
    .string()
    .max(2000, 'Tập lệnh khởi tạo phải dưới 2.000 ký tự')
    .optional(),
})

type UpdateProjectFormData = z.infer<typeof updateProjectSchema>

interface ProjectEditModalProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function ProjectEditModal({
  projectId,
  open,
  onOpenChange,
  onDelete,
}: ProjectEditModalProps) {
  const { data: project } = useProject(projectId)
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const form = useForm<UpdateProjectFormData>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      worktree_base_path: '',
      init_workspace_script: '',
    },
  })

  // Update form when project data loads
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        worktree_base_path: project.worktree_base_path || '',
        init_workspace_script: project.init_workspace_script || '',
      })
    }
  }, [project, form])

  const onSubmit = async (data: UpdateProjectFormData) => {
    const updates: UpdateProjectRequest = {
      name: data.name,
      description: data.description || undefined,
      worktree_base_path: data.worktree_base_path || undefined,
      init_workspace_script: data.init_workspace_script || undefined,
    }

    console.log('updates', updates)

    try {
      await updateProject.mutateAsync({ projectId, updates })
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId)
      onOpenChange(false)
      onDelete?.()
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        worktree_base_path: project.worktree_base_path || '',
        init_workspace_script: project.init_workspace_script || '',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            Chỉnh sửa dự án
          </DialogTitle>
          <DialogDescription>
            Cập nhật cài đặt và cấu hình dự án
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên dự án</FormLabel>
                  <FormControl>
                    <Input placeholder='Tên dự án của tôi' {...field} />
                  </FormControl>
                  <FormDescription>Tên mô tả cho dự án của bạn</FormDescription>
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
                      placeholder='Mô tả ngắn gọn dự án này làm gì...'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mô tả tuỳ chọn giúp nhận diện dự án
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='worktree_base_path'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đường dẫn gốc Worktree</FormLabel>
                  <FormControl>
                    <Input placeholder='/tmp/projects/repo' {...field} />
                  </FormControl>
                  <FormDescription>
                    Đường dẫn gốc cho các thao tác Git Worktree
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='init_workspace_script'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tập lệnh khởi tạo workspace</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='npm install && npm run build'
                      className='resize-none'
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tập lệnh bash tuỳ chọn chạy sau khi tạo Worktree (ví dụ: cài
                    dependency)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex items-center justify-between pt-4'>
              <SimpleConfirmDialog
                title='Xoá dự án'
                description='Bạn có chắc muốn xoá dự án này? Thao tác này không thể hoàn tác.'
                onConfirm={handleDelete}
                destructive={true}
                confirmText='Xoá dự án'
                cancelText='Huỷ'
              >
                <Button
                  type='button'
                  variant='destructive'
                  disabled={deleteProject.isPending}
                >
                  {deleteProject.isPending ? (
                    'Đang xoá...'
                  ) : (
                    <>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Xoá
                    </>
                  )}
                </Button>
              </SimpleConfirmDialog>

              <div className='flex gap-3'>
                <Button type='button' variant='outline' onClick={handleClose}>
                  Huỷ
                </Button>
                <Button type='submit' disabled={updateProject.isPending}>
                  {updateProject.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
