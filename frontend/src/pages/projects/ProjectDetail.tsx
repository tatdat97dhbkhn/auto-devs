import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Settings,
  GitBranch,
  Calendar,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Trash2,
} from 'lucide-react'
import {
  useProject,
  useProjectStatistics,
  useDeleteProject,
} from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  UserPresence,
  UserPresenceCompact,
} from '@/components/collaboration/user-presence'
import { GitStatusCard } from '@/components/kanban/git-status-card'
import { ProjectBoard } from '@/components/kanban/project-board'
import { Main } from '@/components/layout/main'
import { ProjectEditModal } from '@/components/project-edit-modal'
import { SimpleConfirmDialog } from '@/components/simple-confirm-dialog'
import {
  RealTimeProjectStats,
  CompactProjectStats,
} from '@/components/stats/real-time-project-stats'

const statusConfig = {
  TODO: { label: 'Cần làm', icon: Clock, color: 'bg-slate-500' },
  PLANNING: {
    label: 'Đang lập kế hoạch',
    icon: BarChart3,
    color: 'bg-blue-500',
  },
  PLAN_REVIEWING: {
    label: 'Duyệt kế hoạch',
    icon: AlertCircle,
    color: 'bg-yellow-500',
  },
  IMPLEMENTING: {
    label: 'Đang triển khai',
    icon: Clock,
    color: 'bg-orange-500',
  },
  CODE_REVIEWING: {
    label: 'Duyệt mã nguồn',
    icon: AlertCircle,
    color: 'bg-purple-500',
  },
  DONE: { label: 'Hoàn thành', icon: CheckCircle2, color: 'bg-green-500' },
  CANCELLED: { label: 'Đã huỷ', icon: XCircle, color: 'bg-red-500' },
}

export function ProjectDetail() {
  const { projectId } = useParams({
    from: '/_authenticated/projects/$projectId',
  })
  const navigate = useNavigate()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId)
  const { data: statistics } = useProjectStatistics(projectId)
  const { data: tasksResponse } = useTasks(projectId)
  const deleteProjectMutation = useDeleteProject()

  const handleDeleteProject = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId)
      navigate({ to: '/projects' })
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  }

  if (projectError) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold'>Không thể tải dự án</h3>
          <p className='text-muted-foreground mb-4'>
            {projectError instanceof Error
              ? projectError.message
              : 'An unexpected error occurred'}
          </p>
          <Link to='/projects'>
            <Button variant='outline'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Về danh sách dự án
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (projectLoading) {
    return <ProjectDetailSkeleton />
  }

  if (!project) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold'>Không tìm thấy dự án</h3>
          <p className='text-muted-foreground mb-4'>
            Dự án bạn đang tìm kiếm không tồn tại hoặc đã bị xoá.
          </p>
          <Link to='/projects'>
            <Button variant='outline'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Về danh sách dự án
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const tasks = tasksResponse?.tasks || []

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Main>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link to='/projects'>
              <Button variant='ghost' size='icon'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
            </Link>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-3xl font-bold'>{project.name}</h1>
                <UserPresence
                  projectId={projectId}
                  showDetails={false}
                  maxAvatars={3}
                />
              </div>
              <p className='text-muted-foreground'>
                {project.description || 'Chưa có mô tả'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <UserPresenceCompact projectId={projectId} />
            <Button variant='outline' onClick={() => setEditModalOpen(true)}>
              <Settings className='mr-2 h-4 w-4' />
              Cài đặt
            </Button>
            <SimpleConfirmDialog
              title='Xoá dự án'
              description={`Bạn có chắc muốn xoá "${project?.name}"? Thao tác này không thể hoàn tác. Dự án sẽ được chuyển vào thùng rác và có thể khôi phục sau.`}
              onConfirm={handleDeleteProject}
              destructive={true}
              confirmText='Xoá dự án'
              cancelText='Huỷ'
            >
              <Button variant='destructive'>
                <Trash2 className='mr-2 h-4 w-4' />
                Xoá
              </Button>
            </SimpleConfirmDialog>
          </div>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='h-full space-y-6'>
          {/* Header */}

          <Tabs defaultValue='tasks' className='h-full'>
            {/* <TabsList>
              <TabsTrigger value='overview'>Tổng quan</TabsTrigger>
              <TabsTrigger value='tasks'>Công việc</TabsTrigger>
            </TabsList> */}

            <TabsContent value='overview' className='space-y-6'>
              {/* Real-time Project Statistics */}
              <RealTimeProjectStats
                projectId={projectId}
                tasks={tasks}
                className='mb-6'
              />

              {/* Project Info */}
              <div className='grid gap-6 md:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle>Thông tin dự án</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    {project.repository_url && (
                      <div className='flex items-center gap-2 text-sm'>
                        <GitBranch className='text-muted-foreground h-4 w-4' />
                        <span className='text-muted-foreground'>
                          Repository:
                        </span>
                        <span className='truncate font-mono'>
                          {project.repository_url}
                        </span>
                      </div>
                    )}

                    <div className='flex items-center gap-2 text-sm'>
                      <Calendar className='text-muted-foreground h-4 w-4' />
                      <span className='text-muted-foreground'>Đã tạo:</span>
                      <span>
                        {formatDistanceToNow(new Date(project.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className='flex items-center gap-2 text-sm'>
                      <Calendar className='text-muted-foreground h-4 w-4' />
                      <span className='text-muted-foreground'>
                        Đã cập nhật:
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(project.updated_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Git Status Card */}
                <GitStatusCard projectId={projectId} />

                <Card>
                  <CardHeader>
                    <CardTitle>Hoạt động theo thời gian thực</CardTitle>
                    <CardDescription>
                      Hoạt động và cộng tác trực tiếp của dự án
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <CompactProjectStats tasks={tasks} />

                    <div className='border-t pt-2'>
                      <UserPresence
                        projectId={projectId}
                        showDetails={true}
                        maxAvatars={5}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fallback to original statistics if real-time data is not available */}
              {!tasks.length && statistics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Phân bổ công việc</CardTitle>
                    <CardDescription>
                      Tổng quan công việc theo trạng thái
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='grid gap-4 md:grid-cols-4 lg:grid-cols-7'>
                      {Object.entries(statistics.tasks_by_status).map(
                        ([status, count]) => {
                          const config =
                            statusConfig[status as keyof typeof statusConfig]
                          const Icon = config.icon

                          return (
                            <div key={status} className='space-y-2 text-center'>
                              <div
                                className={`mx-auto h-8 w-8 rounded-full ${config.color} flex items-center justify-center`}
                              >
                                <Icon className='h-4 w-4 text-white' />
                              </div>
                              <div className='text-2xl font-bold'>{count}</div>
                              <div className='text-muted-foreground text-xs'>
                                {config.label}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='tasks' className='h-full'>
              <ProjectBoard projectId={projectId} />
            </TabsContent>
          </Tabs>
        </div>
      </Main>

      {/* Project Edit Modal */}
      <ProjectEditModal
        projectId={projectId}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onDelete={() => navigate({ to: '/projects' })}
      />
    </>
  )
}

function ProjectDetailSkeleton() {
  return (
    <div className='h-full space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-10 w-10' />
          <div className='space-y-2'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-4 w-96' />
          </div>
        </div>
        <Skeleton className='h-10 w-24' />
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-40' />
          </CardHeader>
          <CardContent className='space-y-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='flex items-center gap-2'>
                <Skeleton className='h-4 w-4' />
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 flex-1' />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-4 w-48' />
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 w-12' />
              </div>
              <Skeleton className='h-2 w-full' />
            </div>
            <Skeleton className='h-4 w-64' />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
