import axios from 'axios'
import { API_CONFIG, API_ENDPOINTS } from '@/config/api'

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
})

export interface AIModelsResponse {
  assistants: Array<{
    value: string
    models: Array<{
      id: string
      name: string
      description: string
      reasoning_levels?: Array<{
        value: string
        name: string
        description: string
      }>
    }>
  }>
}

type RawAIModelsResponse = {
  assistants: Array<{
    value: string
    models: Array<
      | string
      | {
          id: string
          name: string
          description: string
          reasoning_levels?: Array<{
            value: string
            name: string
            description: string
          }>
        }
    >
  }>
}

export const aiExecutorsApi = {
  async getAvailableModels(): Promise<AIModelsResponse> {
    const response = await api.get<RawAIModelsResponse>(
      API_ENDPOINTS.AI_EXECUTOR_MODELS
    )
    return {
      assistants: response.data.assistants.map((assistant) => ({
        value: assistant.value,
        models: assistant.models.map((model) =>
          typeof model === 'string'
            ? { id: model, name: model, description: '' }
            : model
        ),
      })),
    }
  },
}
