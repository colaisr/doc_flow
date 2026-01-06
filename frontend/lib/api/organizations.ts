/**
 * Organizations API client functions
 */
import apiClient from '../api'
import { getApiUrl } from '../config'

export interface OrganizationMember {
  id: number
  user_id: number
  email: string
  full_name?: string | null
  role: string
  joined_at: string
}

/**
 * Get organization members
 */
export async function getOrganizationMembers(organizationId: number): Promise<OrganizationMember[]> {
  const response = await apiClient.get(`${getApiUrl()}/api/organizations/${organizationId}/members`, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }
  if (response.status === 403) {
    throw new Error('Forbidden')
  }
  if (response.status === 404) {
    throw new Error('Organization not found')
  }
  if (response.status !== 200) {
    throw new Error(`Failed to fetch organization members: ${response.statusText}`)
  }

  return response.data
}

