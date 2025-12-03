import { useState, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Props {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  isCompleted?: boolean;
  completedText?: string;
  autoCollapseOnComplete?: boolean;
  shouldOpen?: boolean; // Forzar apertura cuando cambia a true
  dataTeachingId?: string; // ID para el modo enseñanza
}

export default function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen = true,
  isCompleted = false,
  completedText,
  autoCollapseOnComplete = true,
  shouldOpen = false,
  dataTeachingId
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Auto-abrir cuando shouldOpen cambia a true
  useEffect(() => {
    if (shouldOpen && !isCompleted) {
      setIsOpen(true);
    }
  }, [shouldOpen, isCompleted]);

  // Auto-colapsar cuando se completa
  useEffect(() => {
    if (isCompleted && autoCollapseOnComplete) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, autoCollapseOnComplete]);

  return (
    <div
      className={`card transition-all ${isCompleted ? 'border-primary-200 bg-primary-50/30' : ''}`}
      data-teaching-id={dataTeachingId}
    >
      {/* Header clickeable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className={isCompleted ? 'text-primary-600' : 'text-primary-600'}>
            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : icon}
          </span>
          <h3 className={`text-lg font-semibold ${isCompleted ? 'text-primary-700' : 'text-secondary-800'}`}>
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && completedText && !isOpen && (
            <span className="text-xs text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
              {completedText}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-secondary-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-secondary-400" />
          )}
        </div>
      </button>

      {/* Contenido colapsable */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
