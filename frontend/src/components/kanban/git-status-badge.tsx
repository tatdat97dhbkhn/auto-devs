import type { TaskGitStatus } from '@/types/task'
import {
  GitBranch,
  AlertCircle,
  CheckCircle2,
  GitMerge,
  GitCommit,
  Loader2,
  XCircle,
  GitPullRequest,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface GitStatusBadgeProps {
  status: TaskGitStatus
  branchName?: string
  className?: string
  showIcon?: boolean
  variant?: 'default' | 'compact'
}

const GIT_STATUS_CONFIG = {
  NO_GIT: {
    label: 'Chưa có Git',
    description: 'Chưa cấu hình Worktree hoặc nhánh Git',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    variant: 'secondary' as const,
    animate: false,
  },
  WORKTREE_PENDING: {
    label: 'Đang tạo...',
    description: 'Đang tạo Worktree',
    icon: Loader2,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    variant: 'secondary' as const,
    animate: true,
  },
  WORKTREE_CREATED: {
    label: 'Worktree sẵn sàng',
    description: 'Worktree Git đã tạo và sẵn sàng phát triển',
    icon: GitBranch,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    variant: 'secondary' as const,
    animate: false,
  },
  BRANCH_CREATED: {
    label: 'Nhánh sẵn sàng',
    description: 'Nhánh đã tạo trong Worktree, sẵn sàng thay đổi',
    icon: GitBranch,
    color: 'bg-green-100 text-green-700 border-green-200',
    variant: 'secondary' as const,
    animate: false,
  },
  CHANGES_PENDING: {
    label: 'Có thay đổi',
    description: 'Có thay đổi chưa commit trong thư mục làm việc',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    variant: 'secondary' as const,
    animate: false,
  },
  CHANGES_STAGED: {
    label: 'Đã stage',
    description: 'Thay đổi đã stage và sẵn sàng commit',
    icon: GitCommit,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    variant: 'secondary' as const,
    animate: false,
  },
  CHANGES_COMMITTED: {
    label: 'Đã commit',
    description: 'Thay đổi đã commit vào nhánh',
    icon: CheckCircle2,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    variant: 'secondary' as const,
    animate: false,
  },
  PR_CREATED: {
    label: 'Đã tạo PR',
    description: 'Pull Request đã tạo và sẵn sàng duyệt',
    icon: GitPullRequest,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    variant: 'secondary' as const,
    animate: false,
  },
  PR_MERGED: {
    label: 'Đã merge',
    description: 'Pull Request đã merge thành công',
    icon: GitMerge,
    color: 'bg-green-100 text-green-700 border-green-200',
    variant: 'secondary' as const,
    animate: false,
  },
  WORKTREE_ERROR: {
    label: 'Lỗi Git',
    description: 'Lỗi trong thao tác Git',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
    variant: 'destructive' as const,
    animate: false,
  },
} as const

export function GitStatusBadge({
  status,
  branchName,
  className,
  showIcon = true,
  variant = 'default',
}: GitStatusBadgeProps) {
  const config = GIT_STATUS_CONFIG[status]
  const Icon = config.icon

  const badgeContent = (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center gap-1 text-xs',
        config.color,
        variant === 'compact' && 'px-1.5 py-0.5 text-xs',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn('h-3 w-3', config.animate && 'animate-spin')} />
      )}
      <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
        {config.label}
      </span>
    </Badge>
  )

  if (variant === 'compact') {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side='top' className='max-w-xs'>
          <div className='space-y-1'>
            <p className='font-medium'>{config.label}</p>
            <p className='text-muted-foreground text-xs'>
              {config.description}
            </p>
            {branchName && (
              <p className='bg-muted rounded px-1.5 py-0.5 font-mono text-xs'>
                {branchName}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
