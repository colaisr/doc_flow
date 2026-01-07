import apiClient from '../api'
import { getApiUrl } from '../config'

export interface Template {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  content: string;
  signature_blocks: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string | null;
  is_active: boolean;
  created_by_user?: {
    id: number;
    email: string;
    full_name: string | null;
  };
}

export interface TemplateCreate {
  name: string;
  description?: string | null;
  content: string;
  signature_blocks?: string | null;
}

export interface TemplateUpdate {
  name?: string;
  description?: string | null;
  content?: string;
  signature_blocks?: string | null;
}

/**
 * Fetch all templates for an organization
 */
export async function fetchTemplates(
  organizationId: number,
  search?: string
): Promise<Template[]> {
  const params = new URLSearchParams();
  if (search) {
    params.append("search", search);
  }

  const url = `${getApiUrl()}/api/organizations/${organizationId}/templates${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await apiClient.get<Template[]>(url, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (response.status !== 200) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Fetch a single template by ID
 */
export async function fetchTemplate(templateId: number): Promise<Template> {
  const response = await apiClient.get<Template>(`${getApiUrl()}/api/templates/${templateId}`, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (response.status === 404) {
    throw new Error("Template not found");
  }
  if (response.status !== 200) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Create a new template
 */
export async function createTemplate(
  organizationId: number,
  data: TemplateCreate
): Promise<Template> {
  const response = await apiClient.post<Template>(
    `${getApiUrl()}/api/organizations/${organizationId}/templates`,
    data,
    {
      withCredentials: true,
      validateStatus: (status) => status < 500,
    }
  );

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (response.status === 422) {
    const errorData = response.data as any;
    const errorMessages = errorData.detail
      ? Array.isArray(errorData.detail)
        ? errorData.detail.map((err: any) => `${err.loc?.join(".")}: ${err.msg}`).join(", ")
        : errorData.detail
      : "Validation error";
    throw new Error(`Failed to create template: ${errorMessages}`);
  }
  if (response.status !== 201) {
    throw new Error(`Failed to create template: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: number,
  data: TemplateUpdate
): Promise<Template> {
  const response = await apiClient.put<Template>(
    `${getApiUrl()}/api/templates/${templateId}`,
    data,
    {
      withCredentials: true,
      validateStatus: (status) => status < 500,
    }
  );

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (response.status === 422) {
    const errorData = response.data as any;
    const errorMessages = errorData.detail
      ? Array.isArray(errorData.detail)
        ? errorData.detail.map((err: any) => `${err.loc?.join(".")}: ${err.msg}`).join(", ")
        : errorData.detail
      : "Validation error";
    throw new Error(`Failed to update template: ${errorMessages}`);
  }
  if (response.status === 404) {
    throw new Error("Template not found");
  }
  if (response.status !== 200) {
    throw new Error(`Failed to update template: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Delete a template (soft delete)
 */
export async function deleteTemplate(templateId: number): Promise<void> {
  const response = await apiClient.delete(`${getApiUrl()}/api/templates/${templateId}`, {
    withCredentials: true,
    validateStatus: (status) => status < 500,
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (response.status === 404) {
    throw new Error("Template not found");
  }
  if (response.status !== 204) {
    throw new Error(`Failed to delete template: ${response.statusText}`);
  }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(templateId: number): Promise<Template> {
  const response = await apiClient.post<Template>(
    `${getApiUrl()}/api/templates/${templateId}/duplicate`,
    {},
    {
      withCredentials: true,
      validateStatus: (status) => status < 500,
    }
  );

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (response.status === 404) {
    throw new Error("Template not found");
  }
  if (response.status !== 201) {
    throw new Error(`Failed to duplicate template: ${response.statusText}`);
  }

  return response.data;
}

