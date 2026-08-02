import { useQuery } from '@tanstack/react-query'
import { aiExecutorsApi } from '@/lib/api/ai-executors'

export function useAIModels() {
  return useQuery({
    queryKey: ['ai-executor-models'],
    queryFn: aiExecutorsApi.getAvailableModels,
    staleTime: 60 * 1000,
  })
}
