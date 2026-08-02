import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
} from '@/types/project'
import { toast } from 'sonner'
import { projectsApi } from '@/lib/api/projects'

const QUERY_KEYS = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  statistics: (id: string) => ['projects', id, 'statistics'] as const,
}

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: [...QUERY_KEYS.projects, filters],
    queryFn: () => projectsApi.getProjects(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.project(projectId),
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useProjectStatistics(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.statistics(projectId),
    queryFn: () => projectsApi.getProjectStatistics(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (project: CreateProjectRequest) =>
      projectsApi.createProject(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
      toast.success('Đã tạo dự án thành công!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể tạo dự án')
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      updates,
    }: {
      projectId: string
      updates: UpdateProjectRequest
    }) => projectsApi.updateProject(projectId, updates),
    onSuccess: (updatedProject: Project) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
      queryClient.setQueryData(
        QUERY_KEYS.project(updatedProject.id),
        updatedProject
      )
      toast.success('Đã cập nhật dự án thành công!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể cập nhật dự án')
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
      toast.success('Đã xoá dự án thành công!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể xoá dự án')
    },
  })
}

export function useRestoreProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.restoreProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
      toast.success('Đã khôi phục dự án thành công!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Không thể khôi phục dự án')
    },
  })
}

export function useReinitGitRepository() {
  return useMutation({
    mutationFn: (projectId: string) =>
      projectsApi.reinitGitRepository(projectId),
    onSuccess: () => {
      toast.success('Đã khởi tạo lại repository Git thành công!')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Không thể khởi tạo lại repository Git'
      )
    },
  })
}
