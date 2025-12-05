/**
 * API client para el Asistente Quimiométrico Virtual
 * Modo Copilot: soporta acciones sugeridas y ejecución con confirmación
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

/**
 * Acción sugerida por el asistente (Modo Copilot)
 */
export interface AssistantAction {
  id: string;
  type: string;
  label: string;
  params: Record<string, unknown>;
}

/**
 * Respuesta del asistente con acciones sugeridas
 */
export interface AssistantResponse {
  reply: string;
  mode: 'real' | 'demo' | 'error';
  actions: AssistantAction[];
}

export interface AssistantStatus {
  library_available: boolean;
  api_key_configured: boolean;
  mode: 'real' | 'demo';
  model: string | null;
  can_use_real: boolean;  // Indica si puede cambiar a modo real
  force_demo: boolean;    // Indica si se está forzando demo
}

export interface ContextResponse {
  context: string;
  session_active: boolean;
}

/**
 * Request para ejecutar una acción del Copilot
 */
export interface ExecuteActionRequest {
  session_id: string;
  action_id: string;
  action_type: string;
  params: Record<string, unknown>;
}

/**
 * Respuesta de la ejecución de una acción
 */
export interface ExecuteActionResponse {
  success: boolean;
  summary: string;
  action_type: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Envía un mensaje al asistente y obtiene una respuesta con acciones sugeridas
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
 * Cambia el modo del asistente entre 'real' y 'demo'
 */
export async function setAssistantMode(mode: 'real' | 'demo'): Promise<AssistantStatus> {
  const response = await apiClient.post<AssistantStatus>('/assistant/set-mode', { mode });
  return response.data;
}

/**
 * Obtiene el contexto de análisis actual
 */
export async function getAnalysisContext(sessionId: string): Promise<ContextResponse> {
  const response = await apiClient.get<ContextResponse>(`/assistant/context/${sessionId}`);
  return response.data;
}

/**
 * Ejecuta una acción del Copilot tras confirmación del usuario
 */
export async function executeAction(
  sessionId: string,
  action: AssistantAction
): Promise<ExecuteActionResponse> {
  const response = await apiClient.post<ExecuteActionResponse>('/assistant/execute_action', {
    session_id: sessionId,
    action_id: action.id,
    action_type: action.type,
    params: action.params,
  });
  return response.data;
}
