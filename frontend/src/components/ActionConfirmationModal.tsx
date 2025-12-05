/**
 * Modal de confirmación para acciones del Copilot
 * Se muestra cuando el usuario hace clic en una acción sugerida
 */

import { X, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { AssistantAction } from '../api/assistantApi';

// Iconos y colores por tipo de acción
const ACTION_CONFIG: Record<string, { icon: string; color: string; description: string }> = {
  // Acciones de carga y preprocesamiento
  'LOAD_EXAMPLE_DATA': {
    icon: '📁',
    color: 'cyan',
    description: 'Cargará el dataset de ejemplo (chemometrics_example.xls) con datos de biodiesel.'
  },
  'RUN_PREPROCESSING_AUTO': {
    icon: '⚙️',
    color: 'gray',
    description: 'Aplicará estandarización automática a todas las variables numéricas.'
  },
  // Acciones de PCA
  'RUN_PCA_AUTO': {
    icon: '📊',
    color: 'blue',
    description: 'Ejecutará un análisis PCA con el número óptimo de componentes.'
  },
  'RUN_PCA_CUSTOM': {
    icon: '📊',
    color: 'blue',
    description: 'Ejecutará un análisis PCA con los componentes especificados.'
  },
  // Acciones de Clustering
  'RUN_CLUSTERING_AUTO': {
    icon: '🎯',
    color: 'purple',
    description: 'Ejecutará clustering con el k óptimo según análisis silhouette.'
  },
  'RUN_CLUSTERING_CUSTOM': {
    icon: '🎯',
    color: 'purple',
    description: 'Ejecutará clustering con el número de clusters especificado.'
  },
  // Acciones de Clasificación
  'TRAIN_CLASSIFIER_FEEDSTOCK': {
    icon: '🧪',
    color: 'green',
    description: 'Entrenará un clasificador para predecir el tipo de feedstock.'
  },
  'TRAIN_CLASSIFIER_CONCENTRATION': {
    icon: '🧪',
    color: 'green',
    description: 'Entrenará un clasificador para predecir la concentración.'
  },
  // Acciones de utilidad
  'GENERATE_REPORT': {
    icon: '📄',
    color: 'orange',
    description: 'Generará un reporte completo del análisis actual.'
  },
  'RUN_SIMILARITY_SEARCH': {
    icon: '🔍',
    color: 'cyan',
    description: 'Buscará muestras similares en el dataset.'
  },
  // Pipelines completos
  'FULL_PIPELINE_PCA_AUTO': {
    icon: '🚀',
    color: 'blue',
    description: 'Ejecutará el pipeline completo: cargar datos → preprocesar → PCA óptimo.'
  },
  'FULL_PIPELINE_CLUSTERING_AUTO': {
    icon: '🚀',
    color: 'purple',
    description: 'Ejecutará el pipeline completo: cargar datos → preprocesar → PCA → clustering óptimo.'
  },
};

interface ActionConfirmationModalProps {
  action: AssistantAction;
  isOpen: boolean;
  isExecuting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ActionConfirmationModal({
  action,
  isOpen,
  isExecuting,
  onConfirm,
  onCancel,
}: ActionConfirmationModalProps) {
  if (!isOpen) return null;

  const config = ACTION_CONFIG[action.type] || {
    icon: '⚡',
    color: 'gray',
    description: 'Ejecutará la acción solicitada.'
  };

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }[config.color];

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700',
    gray: 'bg-gray-600 hover:bg-gray-700',
  }[config.color];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-secondary-800">
              Confirmar acción
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isExecuting}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className={`p-4 rounded-xl border ${colorClasses} mb-4`}>
            <p className="font-medium text-sm mb-1">
              {action.label}
            </p>
            <p className="text-xs opacity-80">
              {config.description}
            </p>
          </div>

          {/* Parámetros si existen */}
          {Object.keys(action.params).length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-secondary-500 mb-2 font-medium">
                Parámetros:
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                {Object.entries(action.params).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-secondary-500">{key}:</span>
                    <span className="text-secondary-700 font-mono">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-secondary-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              Esta acción modificará los resultados del análisis actual.
              Puedes volver a ejecutar análisis anteriores si lo necesitas.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all flex items-center gap-2 ${buttonColorClasses} disabled:opacity-50`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Ejecutar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
