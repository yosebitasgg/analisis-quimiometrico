import { useState, useEffect } from 'react';
import { Layers, AlertCircle, CheckCircle, Info, Sparkles } from 'lucide-react';
import { calculateClustering, getSilhouetteAnalysis } from '../api/clusteringApi';
import { AppState, ClusteringResults } from '../types';
import CollapsibleCard from './CollapsibleCard';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  setClusteringResults: React.Dispatch<React.SetStateAction<ClusteringResults | null>>;
  clusteringResults: ClusteringResults | null;
}

export default function ClusteringCard({ appState, setAppState, setClusteringResults, clusteringResults }: Props) {
  const [method, setMethod] = useState<'kmeans' | 'jerarquico'>('kmeans');
  const [nClusters, setNClusters] = useState(2);
  const [usePCA, setUsePCA] = useState(true);
  const [linkage, setLinkage] = useState<'ward' | 'complete' | 'average'>('ward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [kOptimo, setKOptimo] = useState<number | null>(null);

  // Obtener k óptimo del análisis de Silhouette cuando PCA esté calculado
  useEffect(() => {
    if (appState.pcaCalculated && appState.sessionId && !appState.clusteringCalculated) {
      getSilhouetteAnalysis(appState.sessionId)
        .then(res => {
          if (res.k_optimo) {
            setKOptimo(res.k_optimo);
            setNClusters(res.k_optimo);
          }
        })
        .catch(console.error);
    }
  }, [appState.pcaCalculated, appState.sessionId, appState.clusteringCalculated]);

  const handleCalculateClustering = async () => {
    if (!appState.sessionId) return;

    // Verificar requisitos
    if (usePCA && !appState.pcaCalculated) {
      setError('Debes calcular PCA primero, o desactiva "Usar PCs como entrada"');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await calculateClustering({
        session_id: appState.sessionId,
        metodo: method,
        n_clusters: nClusters,
        usar_pca: usePCA,
        linkage: linkage,
      });

      setClusteringResults({
        metodo: response.metodo,
        n_clusters: response.n_clusters,
        etiquetas: response.etiquetas,
        silhouette_score: response.silhouette_score,
        inercia: response.inercia,
        estadisticas_clusters: response.estadisticas_clusters,
        dendrograma_data: response.dendrograma_data,
      });

      setAppState(prev => ({
        ...prev,
        clusteringCalculated: true,
      }));

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular clustering');
    } finally {
      setLoading(false);
    }
  };

  if (!appState.preprocessed) {
    return (
      <div className="card opacity-60">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-secondary-400" />
          Clustering
        </h3>
        <p className="text-sm text-secondary-500">
          Primero aplica preprocesamiento a los datos.
        </p>
      </div>
    );
  }

  const completedText = clusteringResults
    ? `${clusteringResults.n_clusters} clústeres (Sil: ${clusteringResults.silhouette_score?.toFixed(2) || 'N/A'})`
    : undefined;

  return (
    <CollapsibleCard
      title="Clustering"
      icon={<Layers className="w-5 h-5" />}
      isCompleted={appState.clusteringCalculated}
      completedText={completedText}
      defaultOpen={appState.pcaCalculated && !appState.clusteringCalculated}
      shouldOpen={appState.pcaCalculated && !appState.clusteringCalculated}
      dataTeachingId="clustering-card"
      autoCollapseOnComplete={false} // No auto-colapsar para que el usuario vea los resultados
    >
      <div className="space-y-4">
        {/* Método */}
        <div>
          <label className="label">Método de clustering</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'kmeans' | 'jerarquico')}
            className="select"
          >
            <option value="kmeans">K-means</option>
            <option value="jerarquico">Clúster jerárquico</option>
          </select>
        </div>

        {/* Número de clústeres */}
        <div>
          <label className="label flex items-center gap-1">
            Número de clústeres (k)
            <div className="tooltip">
              <Info className="w-4 h-4 text-secondary-400 cursor-help" />
              <span className="tooltip-text">
                Cantidad de grupos a identificar (2-10)
              </span>
            </div>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="2"
              max="10"
              value={nClusters}
              onChange={(e) => setNClusters(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <span className="w-8 text-center font-medium text-secondary-700">
              {nClusters}
            </span>
          </div>
          {kOptimo !== null && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                k={kOptimo} recomendado por análisis Silhouette
                {nClusters === kOptimo && ' (seleccionado)'}
              </span>
            </div>
          )}
        </div>

        {/* Linkage (solo para jerárquico) */}
        {method === 'jerarquico' && (
          <div>
            <label className="label flex items-center gap-1">
              Tipo de enlace
              <div className="tooltip">
                <Info className="w-4 h-4 text-secondary-400 cursor-help" />
                <span className="tooltip-text">
                  Cómo se calcula la distancia entre clústeres
                </span>
              </div>
            </label>
            <select
              value={linkage}
              onChange={(e) => setLinkage(e.target.value as 'ward' | 'complete' | 'average')}
              className="select"
            >
              <option value="ward">Ward (minimiza varianza)</option>
              <option value="complete">Completo (máxima distancia)</option>
              <option value="average">Promedio</option>
            </select>
          </div>
        )}

        {/* Usar PCA */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usePCA}
              onChange={(e) => setUsePCA(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-700">
              Usar componentes principales (PCs) como entrada
            </span>
          </label>
          {usePCA && !appState.pcaCalculated && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Debes calcular PCA primero
            </p>
          )}
        </div>

        {/* Botón calcular */}
        <button
          onClick={handleCalculateClustering}
          disabled={loading || (usePCA && !appState.pcaCalculated)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="loading-spinner" />
              Calculando...
            </>
          ) : (
            'Calcular clustering'
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
              Clustering completado. Ver resultados a la derecha.
            </span>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
