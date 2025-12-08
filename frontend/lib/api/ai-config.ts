/**
 * AI Configuration API Client
 * API functions for managing AI configurations in the manager panel
 */

import { apiClient } from '@/lib/api-client';

const API_BASE = '/manager/api';

// Types
export interface AIProvider {
  id: string;
  name: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export interface AIConfiguration {
  id: number;
  name: string;
  provider: string;
  provider_display: string;
  model_name: string;
  api_key_masked: string;
  is_primary: boolean;
  is_active: boolean;
  temperature: number;
  max_tokens: number;
  total_requests: number;
  total_tokens_used: number;
  last_used_at: string | null;
  last_error: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAIConfigData {
  name: string;
  provider: string;
  api_key: string;
  model_name: string;
  is_primary?: boolean;
  is_active?: boolean;
  temperature?: number;
  max_tokens?: number;
  description?: string;
}

export interface UpdateAIConfigData {
  name?: string;
  provider?: string;
  api_key?: string;
  model_name?: string;
  is_primary?: boolean;
  is_active?: boolean;
  temperature?: number;
  max_tokens?: number;
  description?: string;
}

export interface AIUsageStats {
  overview: {
    total_configurations: number;
    active_configurations: number;
    primary_configuration: {
      id: number;
      name: string;
      provider: string;
      model: string;
    } | null;
  };
  usage: {
    period_days: number;
    total_requests: number;
    total_tokens: number;
    successful_requests: number;
    failed_requests: number;
    success_rate: number;
  };
  by_provider: Array<{
    configuration__provider: string;
    requests: number;
    tokens: number;
  }>;
  by_type: Array<{
    request_type: string;
    requests: number;
    tokens: number;
  }>;
  daily_usage: Array<{
    day: string;
    requests: number;
    tokens: number;
  }>;
}

export interface AIUsageLog {
  id: number;
  configuration: {
    id: number;
    name: string;
    provider: string;
  };
  user: string | null;
  endpoint: string;
  request_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success: boolean;
  error_message: string | null;
  response_time_ms: number;
  created_at: string;
}

export interface AIUsageLogsResponse {
  logs: AIUsageLog[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface TestConfigResponse {
  success: boolean;
  message: string;
  response?: string;
  error?: string;
  provider: string;
  model: string;
}

// API Functions

/**
 * Get all AI configurations
 */
export async function getAIConfigurations(): Promise<AIConfiguration[]> {
  const response = await apiClient.get<AIConfiguration[]>(`${API_BASE}/ai-config/`);
  return response.data || [];
}

/**
 * Get a single AI configuration
 */
export async function getAIConfiguration(configId: number): Promise<AIConfiguration> {
  const response = await apiClient.get<AIConfiguration>(`${API_BASE}/ai-config/${configId}/`);
  if (!response.data) {
    throw new Error('Failed to fetch AI configuration');
  }
  return response.data;
}

/**
 * Create a new AI configuration
 */
export async function createAIConfiguration(data: CreateAIConfigData): Promise<AIConfiguration> {
  const response = await apiClient.post<AIConfiguration>(`${API_BASE}/ai-config/create/`, data);
  if (!response.data) {
    throw new Error('Failed to create AI configuration');
  }
  return response.data;
}

/**
 * Update an AI configuration
 */
export async function updateAIConfiguration(
  configId: number,
  data: UpdateAIConfigData
): Promise<AIConfiguration> {
  const response = await apiClient.put<AIConfiguration>(
    `${API_BASE}/ai-config/${configId}/update/`,
    data
  );
  if (!response.data) {
    throw new Error('Failed to update AI configuration');
  }
  return response.data;
}

/**
 * Delete an AI configuration
 */
export async function deleteAIConfiguration(configId: number): Promise<void> {
  await apiClient.delete(`${API_BASE}/ai-config/${configId}/delete/`);
}

/**
 * Set a configuration as primary
 */
export async function setPrimaryConfiguration(configId: number): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    `${API_BASE}/ai-config/${configId}/set-primary/`
  );
  if (!response.data) {
    throw new Error('Failed to set primary configuration');
  }
  return response.data;
}

/**
 * Toggle configuration active status
 */
export async function toggleConfigurationStatus(
  configId: number
): Promise<{ message: string; is_active: boolean }> {
  const response = await apiClient.post<{ message: string; is_active: boolean }>(
    `${API_BASE}/ai-config/${configId}/toggle-status/`
  );
  if (!response.data) {
    throw new Error('Failed to toggle configuration status');
  }
  return response.data;
}

/**
 * Test an AI configuration
 */
export async function testAIConfiguration(configId: number): Promise<TestConfigResponse> {
  const response = await apiClient.post<TestConfigResponse>(
    `${API_BASE}/ai-config/${configId}/test/`
  );
  if (!response.data) {
    throw new Error('Failed to test AI configuration');
  }
  return response.data;
}

/**
 * Get available AI providers
 */
export async function getAIProviders(): Promise<AIProvider[]> {
  const response = await apiClient.get<AIProvider[]>(`${API_BASE}/ai-config/providers/`);
  return response.data || [];
}

/**
 * Get available models for a provider
 */
export async function getAIModels(provider?: string): Promise<AIModel[] | Record<string, AIModel[]>> {
  const url = provider
    ? `${API_BASE}/ai-config/models/${provider}/`
    : `${API_BASE}/ai-config/models/`;
  const response = await apiClient.get<AIModel[] | Record<string, AIModel[]>>(url);
  return response.data || [];
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(days?: number): Promise<AIUsageStats> {
  const params = days ? `?days=${days}` : '';
  const response = await apiClient.get<AIUsageStats>(`${API_BASE}/ai-config/stats/${params}`);
  if (!response.data) {
    throw new Error('Failed to fetch AI usage stats');
  }
  return response.data;
}

/**
 * Get AI usage logs with pagination
 */
export async function getAIUsageLogs(options?: {
  page?: number;
  page_size?: number;
  config_id?: number;
  success?: boolean;
}): Promise<AIUsageLogsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.page_size) params.append('page_size', String(options.page_size));
  if (options?.config_id) params.append('config_id', String(options.config_id));
  if (options?.success !== undefined) params.append('success', String(options.success));

  const query = params.toString();
  const url = `${API_BASE}/ai-config/logs/${query ? `?${query}` : ''}`;

  const response = await apiClient.get<AIUsageLogsResponse>(url);
  if (!response.data) {
    throw new Error('Failed to fetch AI usage logs');
  }
  return response.data;
}
