/**
 * Context para el Asistente Quimiométrico Virtual
 * Maneja el estado del chat, mensajes e interacción con la API
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { sendMessageToAssistant, getAssistantStatus, AssistantMessage, AssistantStatus } from '../api/assistantApi';

// =============================================================================
// TIPOS
// =============================================================================

interface ChatMessage extends AssistantMessage {
  id: string;
  timestamp: Date;
  isLoading?: boolean;
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

  // Acciones
  sendMessage: (content: string, sessionId?: string | null) => Promise<void>;
  clearMessages: () => void;
  refreshStatus: () => Promise<void>;
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

      // Reemplazar el mensaje de loading con la respuesta real
      const assistantMessage: ChatMessage = {
        id: loadingMessage.id,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
      };

      setMessages(prev =>
        prev.map(m => m.id === loadingMessage.id ? assistantMessage : m)
      );

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
    isOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    messages,
    isLoading,
    error,
    status,
    sendMessage,
    clearMessages,
    refreshStatus,
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
