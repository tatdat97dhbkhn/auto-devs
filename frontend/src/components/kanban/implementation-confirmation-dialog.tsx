import { useState, useEffect, useMemo } from 'react'
import { getAIs, getValidAIType } from '@/types/task'
import { Bot, Play } from 'lucide-react'
import { useAIModels } from '@/hooks/use-ai-models'
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

interface ImplementationConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle: string
  selectedPlanInfo?: {
    version: number
    status: string
    createdAt: string
    revisionFeedback?: string
  }
  onConfirm: (
    aiType: string,
    model: string,
    reasoningEffort: string,
    autoImplement?: boolean
  ) => void
  mode?: 'implementing' | 'planning'
}

export function ImplementationConfirmationDialog({
  open,
  onOpenChange,
  taskTitle,
  selectedPlanInfo,
  onConfirm,
  mode,
}: ImplementationConfirmationDialogProps) {
  const [selectedAIType, setSelectedAIType] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedReasoningLevel, setSelectedReasoningLevel] = useState('')
  const [autoImplement, setAutoImplement] = useState(false)

  const localStorageKey =
    mode === 'planning'
      ? 'ai_preference_planning'
      : 'ai_preference_implementing'

  // Load AI type preference from localStorage
  useEffect(() => {
    const savedAI =
      localStorage.getItem(localStorageKey) ||
      localStorage.getItem('ai_preference_implementing') ||
      localStorage.getItem('ai_preference_planning')
    setSelectedAIType(getValidAIType(savedAI, mode === 'planning'))
  }, [localStorageKey, mode])

  const handleConfirm = () => {
    const selectedModel = availableModels.find(
      (model) => model.id === selectedModelId
    )
    if (
      selectedAIType &&
      selectedModel &&
      (!selectedModel.reasoning_levels?.length || selectedReasoningLevel)
    ) {
      localStorage.setItem(localStorageKey, selectedAIType)
      onConfirm(
        selectedAIType,
        selectedModelId,
        selectedReasoningLevel,
        mode === 'planning' ? autoImplement : undefined
      )
      onOpenChange(false)
      setAutoImplement(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setAutoImplement(false)
    setSelectedModelId('')
    setSelectedReasoningLevel('')
  }

  const isPlanning = mode === 'planning'
  const ais = useMemo(() => getAIs(isPlanning), [isPlanning])
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
    const savedAI =
      localStorage.getItem(localStorageKey) ||
      localStorage.getItem('ai_preference_implementing') ||
      localStorage.getItem('ai_preference_planning')
    setSelectedAIType(getValidAIType(savedAI, isPlanning))
  }, [isPlanning, localStorageKey])

  const title = isPlanning
    ? 'Bắt đầu lập kế hoạch'
    : 'Duyệt kế hoạch và bắt đầu triển khai'
  const description = isPlanning
    ? `Chọn trợ lý AI để lập kế hoạch cho công việc:`
    : `Duyệt kế hoạch và bắt đầu triển khai cho công việc:`
  const confirmLabel = isPlanning
    ? 'Bắt đầu lập kế hoạch'
    : 'Duyệt và bắt đầu triển khai'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[calc(100vw-2rem)] sm:max-w-[640px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Play className='h-5 w-5' />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description} <strong>{taskTitle}</strong>
          </DialogDescription>
          {!isPlanning && selectedPlanInfo && (
            <div className='rounded-md border border-blue-200 bg-blue-50 p-3 text-sm'>
              <p className='font-medium text-blue-900'>Plan đang được chọn: phiên bản {selectedPlanInfo.version}</p>
              <p className='text-blue-800'>
                Trạng thái: {selectedPlanInfo.status} · Tạo lúc: {new Date(selectedPlanInfo.createdAt).toLocaleString()}
              </p>
              {selectedPlanInfo.revisionFeedback && (
                <p className='mt-1 text-blue-800'>Feedback: {selectedPlanInfo.revisionFeedback}</p>
              )}
            </div>
          )}
        </DialogHeader>

        <div className='space-y-4'>
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

          {selectedAIType && availableModels.length > 0 && (
            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Chọn model và mức suy luận:
              </label>
              <p className='text-muted-foreground text-xs'>
                Model legacy có thể được truy cập qua cấu hình Codex CLI trên
                máy.
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

          {selectedModel?.reasoning_levels?.length ? (
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
                    <SelectItem
                      key={level.value}
                      value={level.value}
                      className='items-start whitespace-normal'
                    >
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

          {isPlanning && (
            <div className='flex items-center space-x-2 pt-2'>
              <Checkbox
                id='auto-implement-confirmation'
                checked={autoImplement}
                onCheckedChange={(checked) =>
                  setAutoImplement(checked === true)
                }
              />
              <label
                htmlFor='auto-implement-confirmation'
                className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Tự động triển khai sau khi lập kế hoạch xong
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleCancel}>
            Huỷ
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedAIType ||
              !selectedModelId ||
              (!!selectedModel?.reasoning_levels?.length &&
                !selectedReasoningLevel)
            }
            className={
              isPlanning
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
