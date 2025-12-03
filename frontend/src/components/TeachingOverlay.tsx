import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, GraduationCap, MousePointerClick } from 'lucide-react';
import { useTeaching } from '../context/TeachingContext';

export default function TeachingOverlay() {
  const {
    isTeachingMode,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    exitTeaching,
    currentPageSteps
  } = useTeaching();

  // Verificar si el paso actual permite interacción
  const currentStepData = currentPageSteps[currentStep];
  const allowsInteraction = currentStepData?.allowInteraction ?? false;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Encontrar y resaltar el elemento objetivo
  const updateTargetPosition = useCallback((shouldScroll = false) => {
    if (!currentStepData) return;

    const element = document.querySelector(currentStepData.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Calcular posición del tooltip
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const margin = 16;

      let style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 10002,
        width: tooltipWidth
      };

      switch (currentStepData.position) {
        case 'right':
          style.left = rect.right + margin;
          style.top = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'left':
          style.left = rect.left - tooltipWidth - margin;
          style.top = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'top':
          style.left = rect.left + rect.width / 2 - tooltipWidth / 2;
          style.top = rect.top - tooltipHeight - margin;
          break;
        case 'bottom':
        default:
          style.left = rect.left + rect.width / 2 - tooltipWidth / 2;
          style.top = rect.bottom + margin;
          break;
      }

      // Asegurar que el tooltip no se salga de la pantalla
      style.left = Math.max(margin, Math.min(style.left as number, window.innerWidth - tooltipWidth - margin));
      style.top = Math.max(margin, Math.min(style.top as number, window.innerHeight - tooltipHeight - margin));

      setTooltipStyle(style);

      // Solo scroll al cambiar de paso, no en cada resize/mutation
      if (shouldScroll) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStepData]);

  // Loop continuo para seguir el elemento en cada frame
  useEffect(() => {
    if (!isTeachingMode || !currentStepData) return;

    let rafId: number;
    let lastRect: string = '';

    // Loop que corre cada frame
    const tick = () => {
      const element = document.querySelector(currentStepData.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const rectStr = `${rect.left},${rect.top},${rect.width},${rect.height}`;

        // Solo actualizar si cambió la posición/tamaño
        if (rectStr !== lastRect) {
          lastRect = rectStr;
          updateTargetPosition(false);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    // Actualizar posición inicial CON scroll
    updateTargetPosition(true);

    // Iniciar loop
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isTeachingMode, currentStep, currentStepData, updateTargetPosition]);

  // Manejar teclas
  useEffect(() => {
    if (!isTeachingMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitTeaching();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < totalSteps - 1) {
          nextStep();
        } else {
          exitTeaching();
        }
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTeachingMode, currentStep, totalSteps, nextStep, prevStep, exitTeaching]);

  if (!isTeachingMode || !currentStepData || totalSteps === 0) {
    return null;
  }

  return (
    <>
      {/* Overlay oscuro con agujero para el elemento resaltado */}
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        {/* Área recortada (highlight) - sigue el elemento siempre */}
        {targetRect && (
          <>
            {/* Recorte que crea el "agujero" con sombra exterior */}
            <div
              className={`absolute ${allowsInteraction ? 'pointer-events-none' : 'pointer-events-auto'}`}
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                borderRadius: 12
              }}
            />
            {/* Borde animado */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                borderRadius: 12,
                border: '2px solid #0658a6',
                boxShadow: '0 0 20px rgba(6, 88, 166, 0.6)',
                animation: 'glow 2s ease-in-out infinite'
              }}
            />
          </>
        )}
      </div>

      {/* Tooltip */}
      <div
        className="bg-white rounded-xl shadow-2xl p-5 pointer-events-auto"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-100 rounded-lg">
              <GraduationCap className="w-4 h-4 text-primary-600" />
            </div>
            <span className="text-xs text-secondary-500">
              Paso {currentStep + 1} de {totalSteps}
            </span>
          </div>
          <button
            onClick={exitTeaching}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Cerrar tutorial"
          >
            <X className="w-4 h-4 text-secondary-400" />
          </button>
        </div>

        {/* Contenido */}
        <h4 className="font-semibold text-secondary-800 mb-2">
          {currentStepData.title}
        </h4>
        <p className="text-sm text-secondary-600 leading-relaxed mb-3">
          {currentStepData.description}
        </p>

        {/* Action hint - muestra qué acción realizar */}
        {currentStepData.actionHint && allowsInteraction && (
          <div className="flex items-center gap-2 p-2 bg-primary-50 border border-primary-200 rounded-lg mb-3">
            <MousePointerClick className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <p className="text-xs text-primary-700 font-medium">
              {currentStepData.actionHint}
            </p>
          </div>
        )}

        {/* Navegación */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 text-sm ${
              currentStep === 0
                ? 'text-secondary-300 cursor-not-allowed'
                : 'text-secondary-600 hover:text-secondary-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {/* Indicadores de paso */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentStep < totalSteps - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={exitTeaching}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(6, 88, 166, 0.4), inset 0 0 15px rgba(6, 88, 166, 0.05);
          }
          50% {
            box-shadow: 0 0 30px rgba(6, 88, 166, 0.6), inset 0 0 25px rgba(6, 88, 166, 0.1);
          }
        }
      `}</style>
    </>
  );
}
