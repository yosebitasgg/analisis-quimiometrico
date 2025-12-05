import { useState, useEffect } from 'react';
import { Search, MapPin, Fingerprint, AlertCircle, Info } from 'lucide-react';
import { AppState, PCAResults, SimilaritySearchResponse, SampleInfo } from '../types';
import { searchSimilar, getSamplesList } from '../api/similarityApi';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Tipo para la configuración de similitud
interface SimilarityConfig {
  sampleIndex: number;
  space: 'pca' | 'original';
  metric: 'euclidean' | 'cosine';
  k: number;
}

interface SimilarityPageProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  pcaResults: PCAResults | null;
  // Estado global para persistir entre cambios de página
  similarityResults: SimilaritySearchResponse | null;
  setSimilarityResults: React.Dispatch<React.SetStateAction<SimilaritySearchResponse | null>>;
  similarityConfig: SimilarityConfig;
  setSimilarityConfig: React.Dispatch<React.SetStateAction<SimilarityConfig>>;
  samplesList: SampleInfo[];
  setSamplesList: React.Dispatch<React.SetStateAction<SampleInfo[]>>;
}

export default function SimilarityPage({
  appState,
  setAppState,
  pcaResults,
  similarityResults,
  setSimilarityResults,
  similarityConfig,
  setSimilarityConfig,
  samplesList,
  setSamplesList
}: SimilarityPageProps) {
  // Desestructurar la configuración global
  const { sampleIndex, space, metric, k } = similarityConfig;

  // Funciones para actualizar la configuración
  const setSampleIndex = (value: number) =>
    setSimilarityConfig(prev => ({ ...prev, sampleIndex: value }));
  const setSpace = (value: 'pca' | 'original') =>
    setSimilarityConfig(prev => ({ ...prev, space: value }));
  const setMetric = (value: 'euclidean' | 'cosine') =>
    setSimilarityConfig(prev => ({ ...prev, metric: value }));
  const setK = (value: number) =>
    setSimilarityConfig(prev => ({ ...prev, k: value }));

  // Estado local solo para UI (loading, error)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usar el resultado global en lugar de local
  const searchResult = similarityResults;

  // Cargar lista de muestras
  useEffect(() => {
    const loadSamples = async () => {
      if (appState.sessionId && appState.preprocessed) {
        try {
          const result = await getSamplesList(appState.sessionId);
          setSamplesList(result.muestras);
        } catch (err) {
          console.error('Error cargando muestras:', err);
        }
      }
    };
    loadSamples();
  }, [appState.sessionId, appState.preprocessed]);

  const handleSearch = async () => {
    if (!appState.sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await searchSimilar({
        session_id: appState.sessionId,
        sample_index: sampleIndex,
        space,
        metric,
        k
      });

      // Usar el setter global para que persista entre cambios de página
      setSimilarityResults(result);

      // Actualizar estado global para el modo enseñanza
      setAppState(prev => ({ ...prev, similaritySearched: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para el gráfico
  const prepareChartData = () => {
    if (!searchResult || !pcaResults) return [];

    const data: any[] = [];

    // Agregar todas las muestras
    pcaResults.scores.forEach((score, idx) => {
      const neighbor = searchResult.vecinos.find(v => v.indice === idx);
      const isReference = idx === searchResult.muestra_referencia.indice;

      data.push({
        x: score.PC1,
        y: score.PC2,
        index: idx,
        isReference,
        isNeighbor: !!neighbor,
        distancia: neighbor?.distancia,
        similitud: neighbor?.similitud,
        feedstock: pcaResults.feedstock ? pcaResults.feedstock[idx] : null
      });
    });

    return data;
  };

  const chartData = prepareChartData();

  // Colores
  const COLORS = {
    reference: '#ef4444',
    neighbor: '#22c55e',
    other: '#d1d5db'
  };

  const canSearch = appState.sessionId && appState.preprocessed && (space === 'pca' ? appState.pcaCalculated : true);

  if (!appState.dataLoaded) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Datos no cargados
          </h2>
          <p className="text-yellow-700">
            Para buscar muestras similares, primero debes cargar datos en la página de Análisis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Fingerprint className="w-6 h-6 text-primary-600" />
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">Fingerprinting Químico</h1>
            <p className="text-secondary-500">Encuentra muestras con perfiles similares</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Configuración */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card" data-teaching-id="similarity-config">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-secondary-800">Búsqueda de Similitud</h3>
            </div>

            <div className="space-y-4">
              {/* Selección de muestra */}
              <div>
                <label className="label">Muestra de referencia</label>
                <select
                  className="select w-full"
                  value={sampleIndex}
                  onChange={(e) => setSampleIndex(parseInt(e.target.value))}
                >
                  {samplesList.map((sample) => (
                    <option key={sample.indice} value={sample.indice}>
                      Muestra {sample.indice}
                      {sample.feedstock && ` - ${sample.feedstock}`}
                      {sample.concentration && ` (${sample.concentration})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Espacio de representación */}
              <div>
                <label className="label">Espacio de representación</label>
                <select
                  className="select w-full"
                  value={space}
                  onChange={(e) => setSpace(e.target.value as 'pca' | 'original')}
                >
                  <option value="pca">Scores de PCA</option>
                  <option value="original">Datos originales</option>
                </select>
              </div>

              {/* Métrica */}
              <div>
                <label className="label">Métrica de distancia</label>
                <select
                  className="select w-full"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as 'euclidean' | 'cosine')}
                >
                  <option value="euclidean">Euclidiana</option>
                  <option value="cosine">Coseno</option>
                </select>
              </div>

              {/* Número de vecinos */}
              <div>
                <label className="label">Número de vecinos: {k}</label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={k}
                  onChange={(e) => setK(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Botón buscar */}
              <button
                onClick={handleSearch}
                disabled={!canSearch || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-4 h-4" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar Similares
                  </>
                )}
              </button>

              {!canSearch && (
                <p className="text-xs text-yellow-600">
                  {space === 'pca' && !appState.pcaCalculated
                    ? 'Primero calcula PCA o usa espacio "original"'
                    : 'Aplica preprocesamiento primero'}
                </p>
              )}
            </div>
          </div>

          {/* Info de métrica */}
          <div className="card bg-blue-50 border-blue-100">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sobre las métricas:</p>
                <ul className="space-y-1 text-blue-700">
                  <li><strong>Euclidiana:</strong> Distancia geométrica directa entre puntos.</li>
                  <li><strong>Coseno:</strong> Mide el ángulo entre vectores, útil cuando importa la proporción de componentes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Resultados */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {searchResult && (
            <>
              {/* Interpretación */}
              <div className="card bg-green-50 border-green-100" data-teaching-id="similarity-interpretation">
                <p className="text-green-800">{searchResult.interpretacion}</p>
              </div>

              {/* Tabla de vecinos */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-secondary-800">
                    Muestras más similares a Muestra {searchResult.muestra_referencia.indice}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left font-medium text-secondary-700">Muestra</th>
                        <th className="p-3 text-left font-medium text-secondary-700">Distancia</th>
                        <th className="p-3 text-left font-medium text-secondary-700">Similitud</th>
                        <th className="p-3 text-left font-medium text-secondary-700">Feedstock</th>
                        <th className="p-3 text-left font-medium text-secondary-700">Concentración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.vecinos.map((vecino, idx) => (
                        <tr key={vecino.indice} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-3 font-medium text-secondary-800">
                            #{vecino.indice}
                          </td>
                          <td className="p-3 text-secondary-600">
                            {vecino.distancia.toFixed(4)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${vecino.similitud * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-secondary-600">
                                {(vecino.similitud * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-secondary-600">
                            {vecino.feedstock || '-'}
                          </td>
                          <td className="p-3 text-secondary-600">
                            {vecino.concentration || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico de dispersión */}
              {pcaResults && space === 'pca' && (
                <div className="card">
                  <h3 className="font-semibold text-secondary-800 mb-4">
                    Visualización en Espacio PCA
                  </h3>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="PC1"
                          label={{ value: 'PC1', position: 'bottom', offset: 0 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="PC2"
                          label={{ value: 'PC2', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload || !payload[0]) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 shadow-lg rounded border text-sm">
                                <p className="font-medium">Muestra {data.index}</p>
                                {data.isReference && <p className="text-red-600">Referencia</p>}
                                {data.isNeighbor && (
                                  <p className="text-green-600">
                                    Similitud: {(data.similitud * 100).toFixed(1)}%
                                  </p>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Scatter data={chartData}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.isReference
                                  ? COLORS.reference
                                  : entry.isNeighbor
                                  ? COLORS.neighbor
                                  : COLORS.other
                              }
                              r={entry.isReference ? 10 : entry.isNeighbor ? 8 : 4}
                              strokeWidth={entry.isReference || entry.isNeighbor ? 2 : 0}
                              stroke={entry.isReference ? '#991b1b' : entry.isNeighbor ? '#166534' : undefined}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                      <span className="text-secondary-600">Referencia</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500" />
                      <span className="text-secondary-600">Vecinos similares</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-300" />
                      <span className="text-secondary-600">Otras muestras</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!searchResult && !loading && (
            <div className="card text-center py-12">
              <Fingerprint className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-600 mb-2">
                Busca muestras similares
              </h3>
              <p className="text-secondary-500">
                Selecciona una muestra de referencia y configura los parámetros de búsqueda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
