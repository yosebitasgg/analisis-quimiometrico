/**
 * API client para el Asistente Quimiométrico Virtual
 */

import apiClient from './client';

// =============================================================================
// TIPOS
// =============================================================================

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  messages: AssistantMessage[];
  session_id?: string | null;
}

export interface AssistantResponse {
  reply: string;
  mode: 'real' | 'demo' | 'error';
}

export interface AssistantStatus {
  library_available: boolean;
  api_key_configured: boolean;
  mode: 'real' | 'demo';
  model: string | null;
}

export interface ContextResponse {
  context: string;
  session_active: boolean;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Envía un mensaje al asistente y obtiene una respuesta
 */
export async function sendMessageToAssistant(
  messages: AssistantMessage[],
  sessionId?: string | null
): Promise<AssistantResponse> {
  const response = await apiClient.post<AssistantResponse>('/assistant/chat', {
    messages,
    session_id: sessionId,
  });
  return response.data;
}

/**
 * Obtiene el estado del servicio de asistente
 */
export async function getAssistantStatus(): Promise<AssistantStatus> {
  const response = await apiClient.get<AssistantStatus>('/assistant/status');
  return response.data;
}

/**
 * Obtiene el contexto de análisis actual
 */
export async function getAnalysisContext(sessionId: string): Promise<ContextResponse> {
  const response = await apiClient.get<ContextResponse>(`/assistant/context/${sessionId}`);
  return response.data;
}
