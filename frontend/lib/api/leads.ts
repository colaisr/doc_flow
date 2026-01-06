/**
 * Leads API client functions
 */
import apiClient from '../api'
import { getApiUrl } from '../config'

export interface Lead {
  id: number
  organization_id: number
  stage_id: number
  assigned_user_id?: number | null
  created_by_user_id: number
  source: string
  deleted_at?: string | null
  created_at: string
  updated_at?: string | null
  full_name: string
  client_id?: string | null
  phone?: string | null
  address?: string | null
  email?: string | null
  birth_date?: string | null
  stage?: LeadStage | null
  assigned_user?: User | null
  created_by_user?: User | null
  [key: string]: any // Allow additional fields
}

export interface LeadStage {
  id: number
  name: string
  order: number
  color?: string | null
  is_default: boolean
  is_archived: boolean
}

export interface User {
  id: number
  email: string
  full_name?: string | null
}

export interface LeadCreate {
  full_name: string
  client_id?: string
  phone?: string
  address?: string
  email?: string
  birth_date?: string
  stage_id?: number
  assigned_user_id?: number
  source?: string
  [key: string]: any
}

export interface LeadUpdate {
  full_name?: string
  client_id?: string
  phone?: string
  address?: string
  email?: string
  birth_date?: string
  stage_id?: number
  assigned_user_id?: number
  [key: string]: any
}

export interface LeadListResponse {
  leads: Lead[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface StageHistory {
  id: number
  stage_id: number
  changed_by_user_id: number
  changed_at: string
  stage?: LeadStage
  changed_by_user?: User
}

export interface LeadDetail extends Lead {
  stage_history: StageHistory[]
}

export interface ListLeadsParams {
  page?: number
  limit?: number
  stage_id?: number[]
  assigned_user_id?: number[]
  search?: string
}

/**
 * Get authentication cookie
 */
function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  const sessionCookie = cookies.find(c => c.trim().startsWith('researchflow_session='))
  if (!sessionCookie) return null
  return sessionCookie.split('=')[1]
}

/**
 * List leads with filters and pagination
 */
export async function getLeads(params: ListLeadsParams = {}): Promise<LeadListResponse> {
  const queryParams = new URLSearchParams()
  
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.stage_id && params.stage_id.length > 0) {
    params.stage_id.forEach(id => queryParams.append('stage_id', id.toString()))
  }
  if (params.assigned_user_id && params.assigned_user_id.length > 0) {
    params.assigned_user_id.forEach(id => queryParams.append('assigned_user_id', id.toString()))
  }
  if (params.search) queryParams.append('search', params.search)

  const response = await apiClient.get(`${getApiUrl()}/api/leads?${queryParams.toString()}`, {
    withCredentials: true,
    validateStatus: (status) => status < 500, // Don't throw on 4xx
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }
  if (response.status !== 200) {
    throw new Error(`Failed to fetch leads: ${response.statusText}`)
  }

  return response.data
}

/**
 * Get lead by ID
 */
export async function getLead(id: number): Promise<LeadDetail> {
  const response = await apiClient.get(`${getApiUrl()}/api/leads/${id}`, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }
  if (response.status === 404) {
    throw new Error('Lead not found')
  }
  if (response.status !== 200) {
    throw new Error(`Failed to fetch lead: ${response.statusText}`)
  }

  return response.data
}

/**
 * Create a new lead
 */
export async function createLead(data: LeadCreate): Promise<Lead> {
  const response = await apiClient.post(`${getApiUrl()}/api/leads`, data, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  })

  if (response.status === 401) {
    const error: any = new Error('Unauthorized')
    error.response = { data: response.data, status: 401 }
    throw error
  }
  if (response.status === 400 || response.status === 422) {
    // 422 is Unprocessable Entity (validation error from FastAPI/Pydantic)
    const error: any = new Error('Validation error')
    error.response = { data: response.data, status: response.status }
    throw error
  }
  if (response.status !== 201) {
    const error: any = new Error(`Failed to create lead: ${response.statusText}`)
    error.response = { data: response.data, status: response.status }
    throw error
  }

  return response.data
}

/**
 * Update a lead
 */
export async function updateLead(id: number, data: LeadUpdate): Promise<Lead> {
  const response = await apiClient.put(`${getApiUrl()}/api/leads/${id}`, data, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }
  if (response.status === 404) {
    throw new Error('Lead not found')
  }
  if (response.status === 400) {
    throw new Error(response.data?.detail || 'Validation error')
  }
  if (response.status !== 200) {
    throw new Error(`Failed to update lead: ${response.statusText}`)
  }

  return response.data
}

/**
 * Delete a lead (soft delete)
 */
export async function deleteLead(id: number): Promise<void> {
  const response = await apiClient.delete(`${getApiUrl()}/api/leads/${id}`, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }
  if (response.status === 404) {
    throw new Error('Lead not found')
  }
  if (response.status !== 204) {
    throw new Error(`Failed to delete lead: ${response.statusText}`)
  }
}

