/**
 * Context para el Asistente Quimiométrico Virtual
 * Maneja el estado del chat, mensajes e interacción con la API
 * Modo Copilot: soporta acciones sugeridas y ejecución con confirmación
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  sendMessageToAssistant,
  getAssistantStatus,
  setAssistantMode as setAssistantModeApi,
  executeAction as executeActionApi,
  AssistantMessage,
  AssistantStatus,
  AssistantAction,
  ExecuteActionResponse
} from '../api/assistantApi';

// =============================================================================
// TIPOS
// =============================================================================

interface ChatMessage extends AssistantMessage {
  id: string;
  timestamp: Date;
  isLoading?: boolean;
  actions?: AssistantAction[];  // Acciones sugeridas para este mensaje
  actionsExecuted?: string[];   // IDs de acciones ya ejecutadas
}

interface AssistantContextType {
  // Estado del sidebar
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;

  // Estado del chat
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // Estado del servicio
  status: AssistantStatus | null;

  // Estado de acciones (Copilot)
  pendingActions: AssistantAction[];
  isExecutingAction: boolean;

  // Acciones básicas
  sendMessage: (content: string, sessionId?: string | null) => Promise<void>;
  clearMessages: () => void;
  refreshStatus: () => Promise<void>;

  // Cambio de modo
  setMode: (mode: 'real' | 'demo') => Promise<void>;
  isChangingMode: boolean;

  // Acciones del Copilot
  executeAction: (action: AssistantAction, sessionId: string) => Promise<ExecuteActionResponse | null>;
  markActionExecuted: (messageId: string, actionId: string) => void;
}

// =============================================================================
// CONTEXTO
// =============================================================================

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AssistantProviderProps {
  children: React.ReactNode;
}

export function AssistantProvider({ children }: AssistantProviderProps) {
  // Estado del sidebar
  const [isOpen, setIsOpen] = useState(false);

  // Estado del chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado del servicio
  const [status, setStatus] = useState<AssistantStatus | null>(null);

  // Estado de acciones (Copilot)
  const [pendingActions, setPendingActions] = useState<AssistantAction[]>([]);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  // Estado de cambio de modo
  const [isChangingMode, setIsChangingMode] = useState(false);

  // =========================================================================
  // FUNCIONES DEL SIDEBAR
  // =========================================================================

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  // =========================================================================
  // FUNCIONES DEL CHAT
  // =========================================================================

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = useCallback(async (content: string, sessionId?: string | null) => {
    if (!content.trim() || isLoading) return;

    setError(null);

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Agregar mensaje de loading del asistente
    const loadingMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      // Preparar historial para la API (sin el mensaje de loading)
      const apiMessages: AssistantMessage[] = messages
        .filter(m => !m.isLoading)
        .map(m => ({ role: m.role, content: m.content }));

      // Agregar el nuevo mensaje del usuario
      apiMessages.push({ role: 'user', content: content.trim() });

      // Llamar a la API
      const response = await sendMessageToAssistant(apiMessages, sessionId);

      // Reemplazar el mensaje de loading con la respuesta real (incluyendo acciones)
      const assistantMessage: ChatMessage = {
        id: loadingMessage.id,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        actions: response.actions || [],
        actionsExecuted: [],
      };

      setMessages(prev =>
        prev.map(m => m.id === loadingMessage.id ? assistantMessage : m)
      );

      // Actualizar acciones pendientes
      if (response.actions && response.actions.length > 0) {
        setPendingActions(response.actions);
      } else {
        setPendingActions([]);
      }

    } catch (err) {
      // Remover mensaje de loading y mostrar error
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id));

      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`No se pudo enviar el mensaje: ${errorMsg}`);

    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingActions([]);
  }, []);

  // =========================================================================
  // FUNCIONES DEL COPILOT (ACCIONES)
  // =========================================================================

  /**
   * Ejecuta una acción del copilot y agrega el resultado como mensaje
   */
  const executeAction = useCallback(async (
    action: AssistantAction,
    sessionId: string
  ): Promise<ExecuteActionResponse | null> => {
    if (isExecutingAction) return null;

    setIsExecutingAction(true);
    setError(null);

    try {
      // Llamar a la API para ejecutar la acción
      const result = await executeActionApi(sessionId, action);

      // Agregar mensaje con el resultado de la acción
      const resultMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: result.summary,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, resultMessage]);

      // Remover la acción de las pendientes
      setPendingActions(prev => prev.filter(a => a.id !== action.id));

      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al ejecutar la acción: ${errorMsg}`);

      // Agregar mensaje de error
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ **Error al ejecutar acción**\n\n${errorMsg}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      return null;

    } finally {
      setIsExecutingAction(false);
    }
  }, [isExecutingAction]);

  /**
   * Marca una acción como ejecutada en un mensaje específico
   */
  const markActionExecuted = useCallback((messageId: string, actionId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.actions) {
        return {
          ...msg,
          actionsExecuted: [...(msg.actionsExecuted || []), actionId]
        };
      }
      return msg;
    }));
  }, []);

  // =========================================================================
  // ESTADO DEL SERVICIO
  // =========================================================================

  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getAssistantStatus();
      setStatus(newStatus);
    } catch (err) {
      console.error('Error obteniendo estado del asistente:', err);
    }
  }, []);

  // =========================================================================
  // CAMBIO DE MODO
  // =========================================================================

  const setMode = useCallback(async (mode: 'real' | 'demo') => {
    if (isChangingMode) return;

    setIsChangingMode(true);
    setError(null);

    try {
      const newStatus = await setAssistantModeApi(mode);
      setStatus(newStatus);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`No se pudo cambiar el modo: ${errorMsg}`);
    } finally {
      setIsChangingMode(false);
    }
  }, [isChangingMode]);

  // Cargar estado inicial cuando se abre el sidebar por primera vez
  useEffect(() => {
    if (isOpen && !status) {
      refreshStatus();
    }
  }, [isOpen, status, refreshStatus]);

  // =========================================================================
  // MENSAJE DE BIENVENIDA
  // =========================================================================

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Agregar mensaje de bienvenida
      const welcomeMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `**Hola, soy el Asistente Quimiométrico Virtual**

Estoy aquí para ayudarte a interpretar y entender tus análisis. Puedo asistirte con:

- **PCA**: Interpretación de componentes, varianza y loadings
- **Clustering**: Análisis de grupos y métricas de calidad
- **Clasificación**: Evaluación de modelos predictivos
- **Similitud**: Búsqueda de muestras similares

¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // =========================================================================
  // VALOR DEL CONTEXTO
  // =========================================================================

  const value: AssistantContextType = {
    // Sidebar
    isOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    // Chat
    messages,
    isLoading,
    error,
    // Servicio
    status,
    // Copilot
    pendingActions,
    isExecutingAction,
    // Acciones básicas
    sendMessage,
    clearMessages,
    refreshStatus,
    // Cambio de modo
    setMode,
    isChangingMode,
    // Acciones del Copilot
    executeAction,
    markActionExecuted,
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAssistant() {
  const context = useContext(AssistantContext);

  if (context === undefined) {
    throw new Error('useAssistant debe usarse dentro de un AssistantProvider');
  }

  return context;
}
