/**
 * TETRA Backend API Service
 * localStorage yerine backend API'lerini kullanır
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api/tetra';

// Generic fetch wrapper
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// API KEYS
// ============================================
export const apiKeys = {
  get: () => fetchApi<Record<string, string>>('/keys'),
  save: (keys: Record<string, string>) =>
    fetchApi<{ success: boolean }>('/keys', {
      method: 'POST',
      body: JSON.stringify(keys),
    }),
};

// ============================================
// MODEL POOL
// ============================================
export const modelPool = {
  get: () => fetchApi<any[]>('/pool'),
  save: (pool: any[]) =>
    fetchApi<{ success: boolean }>('/pool', {
      method: 'POST',
      body: JSON.stringify(pool),
    }),
};

// ============================================
// HISTORY
// ============================================
export const history = {
  get: () => fetchApi<any[]>('/history'),
  save: (items: any[]) =>
    fetchApi<{ success: boolean }>('/history', {
      method: 'POST',
      body: JSON.stringify(items),
    }),
  add: (item: any) =>
    fetchApi<{ success: boolean }>('/history/add', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  // 🆕 Tek bir kayıt sil
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/history/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================
// ARCHIVES
// ============================================
export const archives = {
  get: () => fetchApi<any[]>('/archives'),
  save: (items: any[]) =>
    fetchApi<{ success: boolean }>('/archives', {
      method: 'POST',
      body: JSON.stringify(items),
    }),
  add: (item: any) =>
    fetchApi<{ success: boolean }>('/archives/add', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  // 🆕 Tek bir kayıt sil
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/archives/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================
// SETUP
// ============================================
export const setup = {
  get: () => fetchApi<any>('/setup'),
  save: (data: any) =>
    fetchApi<{ success: boolean }>('/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================
// PROMPT TEMPLATES
// ============================================
export interface PromptTemplate {
  description: string;
  moderator: string;
  participant: string;
}

export type PromptTemplates = Record<string, PromptTemplate>;

export const templates = {
  get: () => fetchApi<PromptTemplates>('/templates'),
  save: (data: PromptTemplates) =>
    fetchApi<{ success: boolean }>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMode: (mode: string, updates: Partial<PromptTemplate>) =>
    fetchApi<{ success: boolean }>(`/templates/${mode}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  reset: () =>
    fetchApi<{ success: boolean; templates: PromptTemplates }>('/templates/reset', {
      method: 'POST',
    }),
};

// ============================================
// CACHED MODELS
// ============================================
export const cachedModels = {
  get: () => fetchApi<any[]>('/models/cached'),
  save: (models: any[]) =>
    fetchApi<{ success: boolean }>('/models/cached', {
      method: 'POST',
      body: JSON.stringify(models),
    }),
};

// ============================================
// HEALTH CHECK
// ============================================
export const health = {
  check: () => fetchApi<{ status: string; name: string; version: string }>('/health'),
};

// Default export
const api = {
  keys: apiKeys,
  pool: modelPool,
  history,
  archives,
  setup,
  templates,
  cachedModels,
  health,
};

export default api;



