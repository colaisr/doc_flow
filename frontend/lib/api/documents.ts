import apiClient from '../api'
import { getApiUrl } from '../config'

export interface DocumentSignature {
  id: number
  signer_type: string
  signer_name: string
  signer_email: string | null
  signed_at: string
}

export interface SigningLink {
  id: number
  token: string
  signer_type: string
  intended_signer_email: string | null
  expires_at: string | null
  is_used: boolean
  created_at: string
  used_at: string | null
}

export interface Document {
  id: number
  organization_id: number
  lead_id: number
  template_id: number | null  // Nullable for uploaded documents
  title: string
  rendered_content: string | null  // Nullable for uploaded PDFs
  signature_blocks: string | null  // JSON string with signature block metadata
  pdf_file_path: string | null
  signing_url: string | null
  contract_type: 'buyer' | 'seller' | 'lawyer' | null
  document_type: string | null  // Document type ID for uploaded documents
  status: 'draft' | 'ready' | 'sent' | 'signed' | 'uploaded'
  created_by_user_id: number
  created_at: string
  updated_at: string | null
  completed_at: string | null
  created_by_user?: {
    id: number
    email: string
    full_name: string | null
  }
  template?: {
    id: number
    name: string
  }
  lead?: {
    id: number
    full_name: string
  }
  signatures?: DocumentSignature[]
  signing_links?: SigningLink[]
}

export interface DocumentCreateRequest {
  template_id: number
  lead_id: number
  contract_type?: 'buyer' | 'seller' | 'lawyer' | null
  title?: string
}

export interface CreateSigningLinkRequest {
  intended_signer_email?: string | null
  expires_in_days?: number | null
  // signer_type removed - determined by contract_type on document (always 'client' for public links)
}

export interface CreateSigningLinkResponse {
  id: number
  token: string
  signer_type: string
  intended_signer_email: string | null
  expires_at: string | null
  signing_url: string
  created_at: string
}

export interface DocumentListResponse {
  items: Document[]
  total: number
  page: number
  limit: number
  total_pages: number
}

/**
 * Create a new document from a template for a lead
 */
export async function createDocument(data: DocumentCreateRequest): Promise<Document> {
  const url = `${getApiUrl()}/api/documents`
  const response = await apiClient.post<Document>(url, data, {
    withCredentials: true,
  })
  return response.data
}

/**
 * Update document (status, rendered_content, or title can be updated)
 */
export async function updateDocument(
  documentId: number,
  updates: { 
    status?: 'draft' | 'ready' | 'sent' | 'signed'
    rendered_content?: string
    title?: string
    signature_blocks?: string | null
  }
): Promise<Document> {
  const url = `${getApiUrl()}/api/documents/${documentId}`
  const response = await apiClient.put<Document>(url, updates, {
    withCredentials: true,
  })
  return response.data
}

/**
 * Get document details by ID
 */
export async function getDocument(
  documentId: number,
  includeSignatures = false,
  includeSigningLinks = false
): Promise<Document> {
  const params = new URLSearchParams()
  if (includeSignatures) {
    params.append('include_signatures', 'true')
  }
  if (includeSigningLinks) {
    params.append('include_signing_links', 'true')
  }

  const url = `${getApiUrl()}/api/documents/${documentId}${params.toString() ? `?${params.toString()}` : ''}`
  const response = await apiClient.get<Document>(url, {
    withCredentials: true,
  })
  return response.data
}

/**
 * List documents with optional filters
 */
export async function listDocuments(params?: {
  page?: number
  limit?: number
  lead_id?: number
  template_id?: number
  status?: string
}): Promise<DocumentListResponse> {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.lead_id) queryParams.append('lead_id', params.lead_id.toString())
  if (params?.template_id) queryParams.append('template_id', params.template_id.toString())
  if (params?.status) queryParams.append('status_filter', params.status)

  const url = `${getApiUrl()}/api/documents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await apiClient.get<DocumentListResponse>(url, {
    withCredentials: true,
  })
  return response.data
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: number): Promise<void> {
  const url = `${getApiUrl()}/api/documents/${documentId}`
  await apiClient.delete(url, {
    withCredentials: true,
  })
}

/**
 * Create a signing link for a document
 */
export async function createSigningLink(
  documentId: number,
  data: CreateSigningLinkRequest
): Promise<CreateSigningLinkResponse> {
  const url = `${getApiUrl()}/api/documents/${documentId}/signing-links`
  const response = await apiClient.post<CreateSigningLinkResponse>(url, data, {
    withCredentials: true,
  })
  return response.data
}

/**
 * List signing links for a document
 */
export async function listSigningLinks(
  documentId: number,
  signerType?: string
): Promise<SigningLink[]> {
  const params = new URLSearchParams()
  if (signerType) {
    params.append('signer_type', signerType)
  }

  const url = `${getApiUrl()}/api/documents/${documentId}/signing-links${params.toString() ? `?${params.toString()}` : ''}`
  const response = await apiClient.get<SigningLink[]>(url, {
    withCredentials: true,
  })
  return response.data
}

/**
 * Submit signature for a document (internal - authenticated)
 */
export interface SubmitSignatureRequest {
  signer_name: string
  signer_email?: string | null
  signature_data: string // Base64 PNG image
  // signer_type removed - determined by contract_type on document
}

export interface SubmitSignatureResponse {
  success: boolean
  message: string
  document_id: number
  new_status: string
  is_completed: boolean
}

export async function submitSignature(
  documentId: number,
  data: SubmitSignatureRequest
): Promise<SubmitSignatureResponse> {
  const url = `${getApiUrl()}/api/documents/${documentId}/sign`
  const response = await apiClient.post<SubmitSignatureResponse>(url, data, {
    withCredentials: true,
  })
  return response.data
}

/**
 * Get public signing page data (no auth required)
 */
export interface SignatureBlockStatus {
  block_id: string
  is_signed: boolean
  signature_data?: string | null // Base64 signature image if signed
  signer_name?: string | null
  signed_at?: string | null
}

export interface PublicSigningPageData {
  document_id: number
  document_title: string
  rendered_content: string
  signature_blocks: string | null
  signature_statuses: SignatureBlockStatus[]
  signer_type: string
  signer_email: string | null
  token_valid: boolean
  all_blocks_signed: boolean
}

export async function getPublicSigningPage(token: string): Promise<PublicSigningPageData> {
  const url = `${getApiUrl()}/api/public/sign/${token}`
  const response = await apiClient.get<PublicSigningPageData>(url)
  return response.data
}

/**
 * Submit signature via public link (no auth required)
 */
export interface SubmitPublicSignatureRequest {
  signature_block_id: string // ID of the signature block to sign
  signer_name: string
  signer_email?: string | null
  signature_data: string // Base64 PNG image
}

export interface SubmitPublicSignatureResponse {
  success: boolean
  message: string
  document_id: number
  signature_block_id: string
  all_blocks_signed: boolean
  remaining_blocks: number
}

export async function submitPublicSignature(
  token: string,
  data: SubmitPublicSignatureRequest
): Promise<SubmitPublicSignatureResponse> {
  const url = `${getApiUrl()}/api/public/sign/${token}/sign`
  const response = await apiClient.post<SubmitPublicSignatureResponse>(url, data)
  return response.data
}

/**
 * Finish signing process - marks document as signed and advances lead stage
 */
export async function finishPublicSigning(token: string): Promise<SubmitPublicSignatureResponse> {
  const url = `${getApiUrl()}/api/public/sign/${token}/finish`
  const response = await apiClient.post<SubmitPublicSignatureResponse>(url)
  return response.data
}

export interface UploadDocumentRequest {
  lead_id: number
  document_type: string  // Document type ID (e.g., 'lawyer_approved_buyer_contract')
  file: File
}

export async function uploadDocument(data: UploadDocumentRequest): Promise<Document> {
  const formData = new FormData()
  formData.append('lead_id', data.lead_id.toString())
  formData.append('document_type', data.document_type)
  formData.append('file', data.file)
  
  const url = `${getApiUrl()}/api/documents/upload`
  console.log('Uploading document to:', url)
  console.log('File size:', data.file.size, 'bytes')
  console.log('File type:', data.file.type)
  
  try {
    // Don't set Content-Type header - axios will set it automatically with boundary for FormData
    const response = await apiClient.post<Document>(url, formData, {
      withCredentials: true,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors, let us handle them
      timeout: 60000, // 60 second timeout for file uploads
    })
  
  if (response.status === 401) {
    const error: any = new Error('Unauthorized')
    error.response = { data: response.data, status: 401 }
    throw error
  }
  if (response.status === 400 || response.status === 422) {
    const error: any = new Error(response.data?.detail || 'Validation error')
    error.response = { data: response.data, status: response.status }
    throw error
  }
  if (response.status !== 201) {
    const error: any = new Error(`Failed to upload document: ${response.statusText}`)
    error.response = { data: response.data, status: response.status }
    throw error
  }
  
  return response.data
  } catch (err: any) {
    console.error('Upload error details:', {
      message: err.message,
      code: err.code,
      response: err.response,
      request: err.request,
      config: err.config,
    })
    throw err
  }
}
