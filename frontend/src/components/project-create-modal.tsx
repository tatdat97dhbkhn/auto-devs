import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useCreateProject } from '@/hooks/use-projects'
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

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên dự án là bắt buộc')
    .max(100, 'Tên dự án phải dưới 100 ký tự'),
  description: z.string().max(500, 'Mô tả phải dưới 500 ký tự').optional(),
  worktree_base_path: z
    .string()
    .min(1, 'Đường dẫn gốc Worktree là bắt buộc')
    .max(500, 'Đường dẫn Worktree phải dưới 500 ký tự'),
  init_workspace_script: z
    .string()
    .max(2000, 'Tập lệnh khởi tạo phải dưới 2.000 ký tự')
    .optional(),
})

type CreateProjectFormData = z.infer<typeof createProjectSchema>

interface ProjectCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectCreateModal({
  open,
  onOpenChange,
}: ProjectCreateModalProps) {
  const navigate = useNavigate()
  const createProject = useCreateProject()

  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      worktree_base_path: '',
      init_workspace_script: '',
    },
  })

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const project = await createProject.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        worktree_base_path: data.worktree_base_path,
        init_workspace_script: data.init_workspace_script || undefined,
      })

      // Close modal and reset form
      onOpenChange(false)
      form.reset()

      // Navigate to the new project
      navigate({
        to: '/projects/$projectId',
        params: { projectId: project.id },
      })
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Plus className='h-5 w-5' />
            Tạo dự án mới
          </DialogTitle>
          <DialogDescription>
            Thiết lập dự án phát triển mới để bắt đầu quản lý công việc
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
                    <Input placeholder='/path/to/your/project' {...field} />
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

            <div className='flex justify-end gap-3 pt-4'>
              <Button type='button' variant='outline' onClick={handleClose}>
                Huỷ
              </Button>
              <Button type='submit' disabled={createProject.isPending}>
                {createProject.isPending ? 'Đang tạo...' : 'Tạo dự án'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
