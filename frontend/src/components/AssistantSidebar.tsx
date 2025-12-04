/**
 * Sidebar del Asistente Quimiométrico Virtual
 * Panel deslizable con chat completo
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Bot, Sparkles, AlertCircle, Lightbulb, ChevronUp, MessageSquare, TrendingUp, GitBranch, Target, Search, Wrench, Brain } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import AssistantMessageBubble from './AssistantMessageBubble';

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
};

interface AssistantSidebarProps {
  sessionId?: string | null;
}

export default function AssistantSidebar({ sessionId }: AssistantSidebarProps) {
  const {
    isOpen,
    closeSidebar,
    messages,
    isLoading,
    error,
    status,
    sendMessage,
    clearMessages,
  } = useAssistant();

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Obtener las preguntas según el modo
  const currentQuestions = status?.mode === 'real' ? QUESTIONS_IA : QUESTIONS_DEMO;

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
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

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

          {/* Botón de preguntas sugeridas */}
          <div className="mt-3 relative" ref={suggestionsRef}>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
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

            {/* Lista de preguntas - Panel mejorado */}
            {showSuggestions && (
              <div className="absolute bottom-full left-0 mb-2 w-full sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                {/* Header del panel */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3">
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

                {/* Lista de preguntas */}
                <div className="p-2 max-h-72 overflow-y-auto">
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

                {/* Footer con tip */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-[10px] text-secondary-400 text-center">
                    Haz clic en una pregunta para usarla
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
