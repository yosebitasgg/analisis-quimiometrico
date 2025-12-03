import { useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { calculatePCA } from '../api/pcaApi';
import { AppState, PCAResults } from '../types';
import CollapsibleCard from './CollapsibleCard';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  setPcaResults: React.Dispatch<React.SetStateAction<PCAResults | null>>;
  pcaResults: PCAResults | null;
}

export default function PCACard({ appState, setAppState, setPcaResults, pcaResults }: Props) {
  const [nComponents, setNComponents] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCalculatePCA = async () => {
    if (!appState.sessionId) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await calculatePCA({
        session_id: appState.sessionId,
        n_componentes: nComponents,
      });

      setPcaResults({
        n_componentes: response.n_componentes,
        varianza_explicada: response.varianza_explicada,
        scores: response.scores,
        loadings: response.loadings,
        nombres_muestras: response.nombres_muestras,
        nombres_variables: response.nombres_variables,
        feedstock: response.feedstock,
        concentration: response.concentration,
      });

      setAppState(prev => ({
        ...prev,
        pcaCalculated: true,
      }));

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular PCA');
    } finally {
      setLoading(false);
    }
  };

  if (!appState.preprocessed) {
    return (
      <div className="card opacity-60">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary-400" />
          Análisis PCA
        </h3>
        <p className="text-sm text-secondary-500">
          Primero aplica preprocesamiento a los datos.
        </p>
      </div>
    );
  }

  // Calcular varianza acumulada para el texto de completado
  const completedText = pcaResults
    ? `${pcaResults.n_componentes} PCs (${pcaResults.varianza_explicada[Math.min(1, pcaResults.varianza_explicada.length - 1)]?.varianza_acumulada.toFixed(0)}%)`
    : undefined;

  return (
    <CollapsibleCard
      title="Análisis PCA"
      icon={<TrendingUp className="w-5 h-5" />}
      isCompleted={appState.pcaCalculated}
      completedText={completedText}
      defaultOpen={appState.preprocessed && !appState.pcaCalculated}
      shouldOpen={appState.preprocessed && !appState.pcaCalculated}
      dataTeachingId="pca-card"
    >
      <div className="space-y-4">
        {/* Número de componentes */}
        <div>
          <label className="label flex items-center gap-1">
            Número de componentes
            <div className="tooltip">
              <Info className="w-4 h-4 text-secondary-400 cursor-help" />
              <span className="tooltip-text">
                Cantidad de componentes principales a calcular (1-10)
              </span>
            </div>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              value={nComponents}
              onChange={(e) => setNComponents(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <span className="w-8 text-center font-medium text-secondary-700">
              {nComponents}
            </span>
          </div>
        </div>

        {/* Botón calcular */}
        <button
          onClick={handleCalculatePCA}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="loading-spinner" />
              Calculando PCA...
            </>
          ) : (
            'Calcular PCA'
          )}
        </button>

        {/* Mensajes */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-primary-500" />
            <span className="text-sm text-primary-700">
              PCA calculado exitosamente. Ver resultados a la derecha.
            </span>
          </div>
        )}

        {/* Info adicional */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> El PCA reduce la dimensionalidad de tus datos,
            permitiendo visualizar las muestras en 2D o 3D. Los primeros componentes
            capturan la mayor variación en los datos.
          </p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
