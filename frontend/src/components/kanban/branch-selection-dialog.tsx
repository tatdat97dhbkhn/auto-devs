import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAIs, getValidAIType } from '@/types/task'
import { Loader2, GitBranch, Bot } from 'lucide-react'
import { projectsApi } from '@/lib/api/projects'
import { useAIModels } from '@/hooks/use-ai-models'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface GitBranch {
  name: string
  is_current: boolean
  is_remote?: boolean
  last_commit: string
  last_updated: string
}

interface BranchSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  taskTitle: string
  onBranchSelected: (
    branchName: string,
    aiType: string,
    model: string,
    reasoningEffort: string,
    autoImplement: boolean,
    useRemoteBranch: boolean
  ) => void
  mode?: 'planning' | 'implementing' | 'worktree'
}

export function BranchSelectionDialog({
  open,
  onOpenChange,
  projectId,
  taskTitle,
  onBranchSelected,
  mode = 'planning',
}: BranchSelectionDialogProps) {
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedAIType, setSelectedAIType] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedReasoningLevel, setSelectedReasoningLevel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [autoImplement, setAutoImplement] = useState(false)
  const [useRemoteBranch, setUseRemoteBranch] = useState(false)

  const localStorageKey =
    mode === 'implementing'
      ? 'ai_preference_implementing'
      : mode === 'worktree'
        ? 'ai_preference_planning'
        : 'ai_preference_planning'

  // Load AI type preference from localStorage
  useEffect(() => {
    const savedAI = localStorage.getItem(localStorageKey)
    setSelectedAIType(getValidAIType(savedAI, mode !== 'implementing'))
  }, [localStorageKey, mode])

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      let data = await projectsApi.getProjectBranches(
        projectId,
        useRemoteBranch
      )

      // A repository can have no local branch after cloning/fetching a remote.
      // Automatically fall back to origin so planning is still possible.
      if (!useRemoteBranch && data.branches.length === 0) {
        const remoteData = await projectsApi.getProjectBranches(projectId, true)
        if (remoteData.branches.length > 0) {
          data = remoteData
          setUseRemoteBranch(true)
        }
      }

      setBranches(data.branches || [])

      // Prefer the current local branch; for remote-only repositories select
      // the first remote branch so the user can continue without an extra step.
      const currentBranch = data.branches?.find(
        (branch: GitBranch) => branch.is_current
      )
      if (currentBranch) {
        setSelectedBranch(currentBranch.name)
      } else if (data.branches?.length) {
        setSelectedBranch(data.branches[0].name)
      } else {
        setSelectedBranch('')
      }
    } catch (err) {
      setError('Failed to load branches. Please try again.')
      console.error('Error fetching branches:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, useRemoteBranch])

  useEffect(() => {
    if (open && projectId) {
      fetchBranches()
    }
  }, [open, projectId, fetchBranches])

  const handleConfirm = () => {
    if (selectedBranch && (mode === 'worktree' || selectedAIType)) {
      if (mode !== 'worktree') {
        localStorage.setItem(localStorageKey, selectedAIType)
      }
      onBranchSelected(
        selectedBranch,
        selectedAIType,
        selectedModelId,
        selectedReasoningLevel,
        autoImplement,
        useRemoteBranch
      )
      onOpenChange(false)
      setSelectedBranch('')
      setSelectedAIType(
        getValidAIType(
          localStorage.getItem(localStorageKey),
          mode !== 'implementing'
        )
      )
      setSelectedModelId('')
      setSelectedReasoningLevel('')
      setAutoImplement(false)
      setUseRemoteBranch(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSelectedBranch('')
    setSelectedAIType(
      getValidAIType(
        localStorage.getItem(localStorageKey),
        mode !== 'implementing'
      )
    )
    setSelectedModelId('')
    setSelectedReasoningLevel('')
    setUseRemoteBranch(false)
    setError('')
  }

  const ais = useMemo(
    () => getAIs(mode === 'planning' || mode === 'worktree'),
    [mode]
  )
  const { data: aiModels } = useAIModels()
  const modelsByAssistant = useMemo(
    () =>
      new Map(
        aiModels?.assistants.map((assistant) => [
          assistant.value,
          assistant.models,
        ])
      ),
    [aiModels]
  )
  const availableModels = useMemo(() => {
    const remoteModels = modelsByAssistant.get(selectedAIType)
    return remoteModels && remoteModels.length > 0
      ? remoteModels
      : ais.find((ai) => ai.value === selectedAIType)?.models || []
  }, [ais, modelsByAssistant, selectedAIType])
  const selectedModel = availableModels.find(
    (model) => model.id === selectedModelId
  )

  useEffect(() => {
    if (mode === 'worktree') return
    const savedAI = localStorage.getItem(localStorageKey)
    setSelectedAIType(getValidAIType(savedAI, mode !== 'implementing'))
  }, [localStorageKey, mode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[calc(100vh-2rem)] min-h-[32rem] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-[640px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <GitBranch className='h-5 w-5' />
            {mode === 'implementing'
              ? 'Bắt đầu triển khai'
              : mode === 'worktree'
                ? 'Tạo Worktree'
                : 'Bắt đầu lập kế hoạch'}
          </DialogTitle>
          <DialogDescription>
            Chọn nhánh để{' '}
            {mode === 'implementing'
              ? 'triển khai trực tiếp công việc:'
              : mode === 'worktree'
                ? 'tạo Worktree cho công việc:'
                : 'lập kế hoạch cho công việc:'}{' '}
            <strong>{taskTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium'>Chọn nhánh:</label>
                <span className='h-4 w-4'>
                  {loading && <Loader2 className='h-4 w-4 animate-spin' />}
                </span>
              </div>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={loading || branches.length === 0}
              >
                <SelectTrigger className='w-full text-left'>
                  <SelectValue placeholder='Chọn một nhánh' />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      <div className='flex items-center gap-2'>
                        <span>{branch.name}</span>
                        {branch.is_current && (
                          <span className='text-muted-foreground text-xs'>
                            (hiện tại)
                          </span>
                        )}
                        {branch.is_remote && (
                          <span className='text-muted-foreground text-xs'>
                            (remote origin)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className='flex items-center space-x-2 pt-2'>
                <Checkbox
                  id='use-remote-branch'
                  checked={useRemoteBranch}
                  disabled={loading}
                  onCheckedChange={(checked) =>
                    setUseRemoteBranch(checked === true)
                  }
                />
                <label
                  htmlFor='use-remote-branch'
                  className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  Từ remote origin
                </label>
              </div>

              {branches.length === 0 && !loading && (
                <p className='text-muted-foreground text-sm'>
                  Không tìm thấy nhánh local hoặc remote trong repository.
                </p>
              )}
            </div>

            {mode !== 'worktree' && (
              <div className='space-y-2'>
                <label className='flex items-center gap-2 text-sm font-medium'>
                  <Bot className='h-4 w-4' />
                  Chọn trợ lý AI:
                </label>
                <Select
                  value={selectedAIType}
                  onValueChange={(value) => {
                    setSelectedAIType(value)
                    setSelectedModelId('')
                    setSelectedReasoningLevel('')
                  }}
                >
                  <SelectTrigger className='w-full text-left'>
                    <SelectValue placeholder='Chọn loại AI' />
                  </SelectTrigger>
                  <SelectContent className='max-w-[calc(100vw-2rem)]'>
                    {ais.map((ai) => (
                      <SelectItem key={ai.value} value={ai.value}>
                        {ai.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode !== 'worktree' &&
              selectedAIType &&
              availableModels.length > 0 && (
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>
                    Chọn model và mức suy luận:
                  </label>
                  <p className='text-muted-foreground text-xs'>
                    Model legacy có thể được truy cập qua cấu hình Codex CLI
                    trên máy.
                  </p>
                  <Select
                    value={selectedModelId}
                    onValueChange={(value) => {
                      setSelectedModelId(value)
                      setSelectedReasoningLevel('')
                    }}
                    disabled={!selectedAIType}
                  >
                    <SelectTrigger className='w-full text-left'>
                      <SelectValue placeholder='Chọn model' />
                    </SelectTrigger>
                    <SelectContent className='max-w-[calc(100vw-2rem)]'>
                      {availableModels.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className='items-start whitespace-normal'
                        >
                          <span className='flex min-w-0 flex-col break-words'>
                            <span>{model.name}</span>
                            {model.description && (
                              <span className='text-muted-foreground text-xs break-all'>
                                {model.description}
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {mode !== 'worktree' && selectedModel?.reasoning_levels?.length ? (
              <div className='space-y-2'>
                <label className='text-sm font-medium'>
                  Chọn mức suy luận cho {selectedModel.name}:
                </label>
                <Select
                  value={selectedReasoningLevel}
                  onValueChange={setSelectedReasoningLevel}
                >
                  <SelectTrigger className='w-full text-left'>
                    <SelectValue placeholder='Chọn mức suy luận' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.reasoning_levels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <span className='flex flex-col'>
                          <span>{level.name}</span>
                          {level.description && (
                            <span className='text-muted-foreground text-xs'>
                              {level.description}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {mode === 'planning' && (
              <div className='flex items-center space-x-2 pt-2'>
                <Checkbox
                  id='auto-implement'
                  checked={autoImplement}
                  onCheckedChange={(checked) =>
                    setAutoImplement(checked === true)
                  }
                />
                <label
                  htmlFor='auto-implement'
                  className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  Tự động triển khai sau khi lập kế hoạch xong
                </label>
              </div>
            )}
          </>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleCancel}>
            Huỷ
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedBranch ||
              (mode !== 'worktree' &&
                (!selectedAIType ||
                  !selectedModelId ||
                  (!!selectedModel?.reasoning_levels?.length &&
                    !selectedReasoningLevel))) ||
              loading
            }
            className={
              mode === 'implementing'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : mode === 'worktree'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : undefined
            }
          >
            {mode === 'implementing'
              ? 'Bắt đầu triển khai'
              : mode === 'worktree'
                ? 'Tạo Worktree'
                : 'Bắt đầu lập kế hoạch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
