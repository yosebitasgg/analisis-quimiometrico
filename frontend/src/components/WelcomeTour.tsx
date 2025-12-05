import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Navigation, GraduationCap, MessageCircle, Rocket } from 'lucide-react';

interface WelcomeTourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ReactNode;
}

interface WelcomeTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_STEPS: WelcomeTourStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a Chemometrics Helper',
    description: 'Esta herramienta te ayuda a aplicar métodos multivariados en ciencia de datos química: PCA, clustering, clasificadores y más.\n\nIdeal para estudiantes y profesionales que buscan analizar datos químicos sin necesidad de programar.',
    position: 'center',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'navigation',
    title: 'Navegación Principal',
    description: '• Análisis: PCA y clustering de tus datos\n• Clasificador: modelos supervisados para predecir categorías\n• Similitud: busca muestras con perfiles químicos parecidos\n• Reporte: genera PDFs profesionales\n• Datos: explora tu dataset cargado\n• Ayuda: documentación y conceptos',
    targetSelector: 'nav',
    position: 'bottom',
    icon: <Navigation className="w-5 h-5" />,
  },
  {
    id: 'teaching-mode',
    title: 'Modo Enseñanza',
    description: 'Activa el Modo Enseñanza para ver un tutorial guiado paso a paso dentro de cada sección.\n\nIdeal para aprender a usar la herramienta o para clases. Te guiará por cada funcionalidad de forma interactiva.',
    targetSelector: 'button:has(.lucide-graduation-cap)',
    position: 'bottom',
    icon: <GraduationCap className="w-5 h-5" />,
  },
  {
    id: 'assistant',
    title: 'Asistente Quimiométrico',
    description: 'Aquí puedes activar el Asistente Quimiométrico Virtual.\n\nHazle preguntas sobre tu análisis, pídele que te proponga acciones o que te explique resultados. Tiene acceso al contexto de tus datos.',
    targetSelector: 'button:has(.lucide-message-circle)',
    position: 'bottom',
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    id: 'finish',
    title: '¡Listo para comenzar!',
    description: 'Ya conoces las zonas clave de Chemometrics Helper.\n\nEmpieza cargando datos en la página de Análisis, o activa el Modo Enseñanza para un tutorial más detallado.\n\n¡Explora y aprende quimiometría de forma interactiva!',
    position: 'center',
    icon: <Rocket className="w-5 h-5" />,
  },
];

export default function WelcomeTour({ isOpen, onClose }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const currentStepData = WELCOME_STEPS[currentStep];
  const totalSteps = WELCOME_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Actualizar posición del elemento objetivo
  const updateTargetPosition = useCallback(() => {
    if (!currentStepData.targetSelector) {
      // Paso centrado (sin target)
      setTargetRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10002,
        width: 400,
        maxWidth: '90vw',
      });
      return;
    }

    const element = document.querySelector(currentStepData.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Calcular posición del tooltip
      const tooltipWidth = 360;
      const tooltipHeight = 220;
      const margin = 16;

      let style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 10002,
        width: tooltipWidth,
        maxWidth: '90vw',
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
    }
  }, [currentStepData]);

  // Loop continuo para seguir el elemento
  useEffect(() => {
    if (!isOpen) return;

    let rafId: number;
    let lastRect: string = '';

    const tick = () => {
      if (currentStepData.targetSelector) {
        const element = document.querySelector(currentStepData.targetSelector);
        if (element) {
          const rect = element.getBoundingClientRect();
          const rectStr = `${rect.left},${rect.top},${rect.width},${rect.height}`;
          if (rectStr !== lastRect) {
            lastRect = rectStr;
            updateTargetPosition();
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    // Actualizar posición inicial
    updateTargetPosition();
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isOpen, currentStep, currentStepData, updateTargetPosition]);

  // Manejar teclas
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!isLastStep) {
          setCurrentStep(prev => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        setCurrentStep(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirstStep, isLastStep, onClose]);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <>
      {/* Overlay oscuro */}
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        {targetRect ? (
          <>
            {/* Recorte que crea el "agujero" con sombra exterior */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                borderRadius: 12,
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
                animation: 'welcome-glow 2s ease-in-out infinite',
              }}
            />
          </>
        ) : (
          /* Sin target: solo overlay oscuro completo */
          <div
            className="absolute inset-0 pointer-events-auto"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
        )}
      </div>

      {/* Tooltip/Card */}
      <div
        className="bg-white rounded-xl shadow-2xl p-6 pointer-events-auto"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              {currentStepData.icon}
            </div>
            <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
              {currentStep + 1} de {totalSteps}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Cerrar tour"
          >
            <X className="w-4 h-4 text-secondary-400" />
          </button>
        </div>

        {/* Contenido */}
        <h3 className="text-lg font-semibold text-secondary-800 mb-3">
          {currentStepData.title}
        </h3>
        <p className="text-sm text-secondary-600 leading-relaxed mb-4 whitespace-pre-line">
          {currentStepData.description}
        </p>

        {/* Navegación */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={isFirstStep}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              isFirstStep
                ? 'text-secondary-300 cursor-not-allowed'
                : 'text-secondary-600 hover:bg-gray-100 hover:text-secondary-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {/* Indicadores de paso */}
          <div className="flex gap-1.5">
            {WELCOME_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-primary-600 w-4'
                    : idx < currentStep
                    ? 'bg-primary-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
          >
            {isLastStep ? (
              'Finalizar'
            ) : isFirstStep ? (
              'Comenzar'
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes welcome-glow {
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

