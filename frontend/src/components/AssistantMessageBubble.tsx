/**
 * Componente de burbuja de mensaje para el chat del asistente
 */

import { User, Bot, Loader2 } from 'lucide-react';

interface AssistantMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  isLoading?: boolean;
}

export default function AssistantMessageBubble({
  role,
  content,
  timestamp,
  isLoading = false,
}: AssistantMessageBubbleProps) {
  const isUser = role === 'user';

  // Formatear timestamp
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizar contenido con soporte básico de markdown
  const renderContent = (text: string) => {
    // Procesar markdown básico
    let processed = text
      // Bold **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code `text`
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      // Code blocks ```text```
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto my-2">$1</pre>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br />');

    return processed;
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-100 text-primary-600'
            : 'bg-secondary-100 text-secondary-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Burbuja */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-secondary-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-secondary-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">El asistente está analizando...</span>
          </div>
        ) : (
          <>
            {/* Contenido */}
            <div
              className={`text-sm leading-relaxed prose-sm ${
                isUser ? 'prose-invert' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: renderContent(content) }}
            />

            {/* Timestamp */}
            {timestamp && (
              <div
                className={`text-xs mt-2 ${
                  isUser ? 'text-primary-200' : 'text-secondary-400'
                }`}
              >
                {formatTime(timestamp)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
