/**
 * Sidebar del Asistente Quimiométrico Virtual
 * Panel deslizable con chat completo
 * Modo Copilot: muestra acciones sugeridas y permite su ejecución
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Bot, Sparkles, AlertCircle, Lightbulb, ChevronUp, MessageSquare, TrendingUp, GitBranch, Target, Search, Wrench, Brain, Zap, Play, Database, FileText, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import AssistantMessageBubble from './AssistantMessageBubble';
import ActionConfirmationModal from './ActionConfirmationModal';
import { AssistantAction } from '../api/assistantApi';

// Acciones para modo IA (todas las disponibles)
const ACTIONS_IA = [
  { text: 'Carga los datos de ejemplo', icon: Database, category: 'Datos' },
  { text: 'Aplica preprocesamiento automatico', icon: Wrench, category: 'Datos' },
  { text: 'Ejecuta un PCA con configuracion optima', icon: TrendingUp, category: 'PCA' },
  { text: 'Ejecuta PCA con 3 componentes', icon: TrendingUp, category: 'PCA' },
  { text: 'Realiza clustering con k optimo', icon: GitBranch, category: 'Clustering' },
  { text: 'Ejecuta clustering con 4 clusters', icon: GitBranch, category: 'Clustering' },
  { text: 'Entrena un clasificador de feedstock', icon: Target, category: 'Clasificador' },
  { text: 'Entrena un clasificador de concentracion', icon: Target, category: 'Clasificador' },
  { text: 'Genera un reporte del analisis', icon: FileText, category: 'Reporte' },
  { text: 'Busca muestras similares a la muestra 0', icon: Search, category: 'Similitud' },
];

// Acciones para modo Demo (las que el demo maneja bien)
const ACTIONS_DEMO = [
  { text: 'Carga los datos de ejemplo', icon: Database, category: 'Datos' },
  { text: 'Haz un PCA', icon: TrendingUp, category: 'PCA' },
  { text: 'Ejecuta clustering', icon: GitBranch, category: 'Clustering' },
  { text: 'Entrena un clasificador', icon: Target, category: 'Clasificador' },
  { text: 'Genera un reporte', icon: FileText, category: 'Reporte' },
  { text: 'Busca muestras similares', icon: Search, category: 'Similitud' },
];

// Preguntas para modo IA (más complejas y detalladas)
const QUESTIONS_IA = [
  { text: '¿Puedes interpretar los resultados de mi PCA y sugerir cuántos componentes retener?', icon: TrendingUp, category: 'PCA' },
  { text: '¿Qué variables están contribuyendo más a la separación de mis muestras?', icon: TrendingUp, category: 'PCA' },
  { text: 'Analiza la calidad de mis clusters y sugiere mejoras', icon: GitBranch, category: 'Clustering' },
  { text: '¿Cómo puedo mejorar el rendimiento de mi clasificador?', icon: Target, category: 'Clasificador' },
  { text: 'Compara los diferentes métodos de clustering para mis datos', icon: GitBranch, category: 'Clustering' },
  { text: '¿Hay outliers o muestras atípicas en mi dataset?', icon: Search, category: 'Datos' },
  { text: 'Interpreta las importancias de variables del clasificador', icon: Target, category: 'Clasificador' },
  { text: '¿Qué preprocesamiento recomiendas para mis datos?', icon: Wrench, category: 'Datos' },
];

// Preguntas para modo Demo (simples, basadas en keywords que el demo puede responder)
const QUESTIONS_DEMO = [
  { text: '¿Qué es PCA y para qué sirve?', icon: TrendingUp, category: 'PCA' },
  { text: '¿Cómo interpreto los loadings?', icon: TrendingUp, category: 'PCA' },
  { text: '¿Qué significa el silhouette score en clustering?', icon: GitBranch, category: 'Clustering' },
  { text: '¿Qué es la varianza explicada?', icon: TrendingUp, category: 'PCA' },
  { text: '¿Cómo funciona la clasificación supervisada?', icon: Target, category: 'Clasificador' },
  { text: '¿Qué es el análisis de similitud?', icon: Search, category: 'Similitud' },
  { text: '¿Qué puedes hacer como asistente?', icon: Brain, category: 'General' },
  { text: '¿Cómo interpreto un dendrograma?', icon: GitBranch, category: 'Clustering' },
];

// Colores por categoría
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'PCA': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  'Clustering': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  'Clasificador': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'Datos': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'Similitud': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  'General': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  'Reporte': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'Pipeline': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
};

interface AssistantSidebarProps {
  sessionId?: string | null;
  onActionExecuted?: (sessionId: string) => Promise<void>;
}

export default function AssistantSidebar({ sessionId, onActionExecuted }: AssistantSidebarProps) {
  const {
    isOpen,
    closeSidebar,
    messages,
    isLoading,
    error,
    status,
    sendMessage,
    clearMessages,
    // Cambio de modo
    setMode,
    isChangingMode,
    // Copilot
    isExecutingAction,
    executeAction,
    markActionExecuted,
  } = useAssistant();

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showActionSuggestions, setShowActionSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const actionSuggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionsPanelRef = useRef<HTMLDivElement>(null);
  const actionsPanelRef = useRef<HTMLDivElement>(null);

  // Estado para el modal de confirmación de acciones
  const [selectedAction, setSelectedAction] = useState<AssistantAction | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Obtener las preguntas y acciones según el modo
  const currentQuestions = status?.mode === 'real' ? QUESTIONS_IA : QUESTIONS_DEMO;
  const currentActions = status?.mode === 'real' ? ACTIONS_IA : ACTIONS_DEMO;

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus en el input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Para preguntas: verificar si el click está fuera del botón Y fuera del panel
      if (showSuggestions) {
        const isOutsideButton = suggestionsRef.current && !suggestionsRef.current.contains(target);
        const isOutsidePanel = suggestionsPanelRef.current && !suggestionsPanelRef.current.contains(target);
        if (isOutsideButton && isOutsidePanel) {
          setShowSuggestions(false);
        }
      }

      // Para acciones: verificar si el click está fuera del botón Y fuera del panel
      if (showActionSuggestions) {
        const isOutsideButton = actionSuggestionsRef.current && !actionSuggestionsRef.current.contains(target);
        const isOutsidePanel = actionsPanelRef.current && !actionsPanelRef.current.contains(target);
        if (isOutsideButton && isOutsidePanel) {
          setShowActionSuggestions(false);
        }
      }
    };

    if (showSuggestions || showActionSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions, showActionSuggestions]);

  // Manejar envío de mensaje
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue, sessionId);
      setInputValue('');
    }
  };

  // Manejar Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Manejar selección de pregunta sugerida
  const handleSelectSuggestion = (question: string) => {
    setInputValue(question);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Manejar selección de acción sugerida (envía al LLM para que razone)
  const handleSelectActionSuggestion = (actionText: string) => {
    setShowActionSuggestions(false);
    sendMessage(actionText, sessionId);
  };

  // =========================================================================
  // FUNCIONES DEL COPILOT
  // =========================================================================

  // Abrir modal de confirmación para una acción
  const handleActionClick = (action: AssistantAction) => {
    setSelectedAction(action);
    setShowActionModal(true);
  };

  // Confirmar y ejecutar la acción
  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    // Usar sessionId existente o "default_session" para todas las acciones del Copilot
    const effectiveSessionId = sessionId || 'default_session';

    const result = await executeAction(selectedAction, effectiveSessionId);

    if (result?.success) {
      // Marcar la acción como ejecutada en el mensaje que la contenía
      // IMPORTANTE: Buscar el ÚLTIMO mensaje (más reciente) porque los IDs se repiten
      const messageWithAction = [...messages].reverse().find(m =>
        m.actions?.some(a => a.id === selectedAction.id)
      );
      if (messageWithAction) {
        markActionExecuted(messageWithAction.id, selectedAction.id);
      }

      // Sincronizar el estado de la UI con el backend
      if (onActionExecuted) {
        console.log('[AssistantSidebar] Sincronizando UI despues de accion exitosa...');
        await onActionExecuted(effectiveSessionId);
      }
    }

    setShowActionModal(false);
    setSelectedAction(null);
  };

  // Cancelar la acción
  const handleCancelAction = () => {
    setShowActionModal(false);
    setSelectedAction(null);
  };

  // Obtener el último mensaje con acciones pendientes
  const lastMessageWithActions = messages
    .filter(m => m.role === 'assistant' && m.actions && m.actions.length > 0)
    .slice(-1)[0];

  // Filtrar acciones que aún no han sido ejecutadas
  const availableActions = lastMessageWithActions?.actions?.filter(
    action => !lastMessageWithActions.actionsExecuted?.includes(action.id)
  ) || [];

  // Auto-resize del textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Reset height para calcular correctamente
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <>
      {/* Overlay de fondo */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-secondary-800">
                  Asistente Quimiométrico
                </h2>
                {/* Indicador de modo con toggle si está disponible */}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-secondary-500 flex items-center gap-1">
                    {status?.mode === 'real' ? (
                      <>
                        <Sparkles className="w-3 h-3 text-green-500" />
                        <span className="text-green-600">IA Activa</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-600">Modo Demo</span>
                      </>
                    )}
                  </p>
                  {/* Toggle de modo - solo visible si puede usar modo real */}
                  {status?.can_use_real && (
                    <button
                      onClick={() => setMode(status.mode === 'real' ? 'demo' : 'real')}
                      disabled={isChangingMode}
                      className={`relative flex items-center justify-center p-1 rounded-full transition-all duration-200 ${
                        isChangingMode
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-100 cursor-pointer'
                      }`}
                      title={status.mode === 'real' ? 'Cambiar a modo Demo' : 'Cambiar a modo IA'}
                    >
                      {isChangingMode ? (
                        <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                      ) : status.mode === 'real' ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-amber-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botón limpiar chat */}
              <button
                onClick={clearMessages}
                className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Limpiar conversación"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Botón cerrar */}
              <button
                onClick={closeSidebar}
                className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <AssistantMessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              isLoading={message.isLoading}
            />
          ))}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Acciones sugeridas por el Copilot */}
          {availableActions.length > 0 && (
            <div className="bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-200 rounded-xl p-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary-100 rounded-lg">
                  <Zap className="w-4 h-4 text-primary-600" />
                </div>
                <p className="text-sm font-medium text-primary-800">
                  Acciones sugeridas
                </p>
              </div>


              <div className="space-y-2">
                {availableActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={isExecutingAction}
                    className="w-full text-left px-3 py-2.5 bg-white border rounded-lg transition-all duration-150 group hover:bg-primary-50 border-primary-200 hover:border-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-1 text-primary-700 group-hover:text-primary-800">
                        {action.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        Ejecutar
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-primary-600/70 mt-3 text-center">
                Haz clic en una acción para confirmar y ejecutar
              </p>
            </div>
          )}

          {/* Referencia para auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
          {/* Indicador de contexto */}
          {sessionId && (
            <div className="text-xs text-secondary-500 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Contexto del análisis disponible
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta sobre el análisis..."
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`p-3 rounded-xl transition-all ${
                inputValue.trim() && !isLoading
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Enviar mensaje"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Botones de sugerencias */}
          <div className="mt-3 relative">
            {/* Botones */}
            <div className="flex gap-2">
              {/* Botón de preguntas sugeridas */}
              <div ref={suggestionsRef}>
                <button
                  onClick={() => { setShowSuggestions(!showSuggestions); setShowActionSuggestions(false); }}
                  disabled={isLoading}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all duration-200 ${
                    showSuggestions
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-200'
                      : 'bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-secondary-600 hover:text-primary-600'
                  }`}
                >
                  <Lightbulb className={`w-4 h-4 ${showSuggestions ? 'text-yellow-200' : ''}`} />
                  <span className="font-medium">Preguntas sugeridas</span>
                  <ChevronUp className={`w-3 h-3 transition-transform duration-200 ${showSuggestions ? '' : 'rotate-180'}`} />
                </button>
              </div>

              {/* Botón de acciones sugeridas */}
              <div ref={actionSuggestionsRef}>
                <button
                  onClick={() => { setShowActionSuggestions(!showActionSuggestions); setShowSuggestions(false); }}
                  disabled={isLoading}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all duration-200 ${
                    showActionSuggestions
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-200'
                      : 'bg-white border border-gray-200 hover:border-green-300 hover:bg-green-50 text-secondary-600 hover:text-green-600'
                  }`}
                >
                  <Play className={`w-4 h-4 ${showActionSuggestions ? 'text-green-200' : ''}`} />
                  <span className="font-medium">Acciones</span>
                  <ChevronUp className={`w-3 h-3 transition-transform duration-200 ${showActionSuggestions ? '' : 'rotate-180'}`} />
                </button>
              </div>
            </div>

            {/* Panel de preguntas - Ancho completo */}
            {showSuggestions && (
              <div ref={suggestionsPanelRef} className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
                {/* Header del panel */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-white/80" />
                      <p className="text-sm font-medium text-white">
                        {status?.mode === 'real'
                          ? 'Preguntas con IA'
                          : 'Preguntas de ejemplo'}
                      </p>
                    </div>
                    <p className="text-xs text-white/70 mt-0.5">
                      {status?.mode === 'real'
                        ? 'Analisis detallado de tus datos'
                        : 'Informacion general de quimiometria'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Lista de preguntas */}
                <div className="p-2 max-h-64 overflow-y-auto">
                  {currentQuestions.map((question, index) => {
                    const IconComponent = question.icon;
                    const colors = CATEGORY_COLORS[question.category] || CATEGORY_COLORS['General'];

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectSuggestion(question.text)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 mb-1 last:mb-0 group hover:scale-[1.01] ${colors.bg} hover:shadow-sm border border-transparent hover:${colors.border}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-secondary-700 leading-snug">
                              {question.text}
                            </p>
                            <span className={`text-[10px] font-medium ${colors.text} mt-1 inline-block`}>
                              {question.category}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panel de acciones - Ancho completo */}
            {showActionSuggestions && (
              <div ref={actionsPanelRef} className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
                {/* Header del panel */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-white/80" />
                      <p className="text-sm font-medium text-white">
                        {status?.mode === 'real'
                          ? 'Acciones con IA'
                          : 'Acciones de demo'}
                      </p>
                    </div>
                    <p className="text-xs text-white/70 mt-0.5">
                      {status?.mode === 'real'
                        ? 'Ejecutar analisis en tus datos'
                        : 'Comandos basicos disponibles'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowActionSuggestions(false)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Lista de acciones */}
                <div className="p-2 max-h-64 overflow-y-auto">
                  {currentActions.map((action, index) => {
                    const IconComponent = action.icon;
                    const colors = CATEGORY_COLORS[action.category] || CATEGORY_COLORS['General'];

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectActionSuggestion(action.text)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 mb-1 last:mb-0 group hover:scale-[1.01] ${colors.bg} hover:shadow-sm border border-transparent hover:${colors.border}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-secondary-700 leading-snug">
                              {action.text}
                            </p>
                            <span className={`text-[10px] font-medium ${colors.text} mt-1 inline-block`}>
                              {action.category}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación de acciones */}
      {selectedAction && (
        <ActionConfirmationModal
          action={selectedAction}
          isOpen={showActionModal}
          isExecuting={isExecutingAction}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      )}
    </>
  );
}
