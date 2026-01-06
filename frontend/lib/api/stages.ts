/**
 * Stages API client functions
 */
import apiClient from '../api'
import { getApiUrl } from '../config'
import { LeadStage } from './leads'

/**
 * Get all stages
 */
export async function getStages(): Promise<LeadStage[]> {
  const response = await apiClient.get(`${getApiUrl()}/api/stages`, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }
  if (response.status !== 200) {
    throw new Error(`Failed to fetch stages: ${response.statusText}`)
  }

  return response.data
}

