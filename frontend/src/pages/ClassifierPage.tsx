import { useState } from 'react';
import { Brain, Target, BarChart2, AlertCircle, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { AppState, ClassifierTrainResponse, PredictionResult } from '../types';
import { trainClassifier, predict } from '../api/classifierApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Tipo para la configuración del clasificador
interface ClassifierConfig {
  target: 'feedstock' | 'concentration';
  modelo: 'random_forest' | 'logistic_regression' | 'svm';
  usarPca: boolean;
  nEstimators: number;
  testSize: number;
}

interface ClassifierPageProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  // Estado global para persistir entre cambios de página
  classifierResults: ClassifierTrainResponse | null;
  setClassifierResults: React.Dispatch<React.SetStateAction<ClassifierTrainResponse | null>>;
  classifierConfig: ClassifierConfig;
  setClassifierConfig: React.Dispatch<React.SetStateAction<ClassifierConfig>>;
  predictions: PredictionResult[];
  setPredictions: React.Dispatch<React.SetStateAction<PredictionResult[]>>;
}

export default function ClassifierPage({
  appState,
  setAppState,
  classifierResults,
  setClassifierResults,
  classifierConfig,
  setClassifierConfig,
  predictions,
  setPredictions
}: ClassifierPageProps) {
  // Desestructurar la configuración global
  const { target, modelo, usarPca, nEstimators, testSize } = classifierConfig;

  // Funciones para actualizar la configuración
  const setTarget = (value: 'feedstock' | 'concentration') =>
    setClassifierConfig(prev => ({ ...prev, target: value }));
  const setModelo = (value: 'random_forest' | 'logistic_regression' | 'svm') =>
    setClassifierConfig(prev => ({ ...prev, modelo: value }));
  const setUsarPca = (value: boolean) =>
    setClassifierConfig(prev => ({ ...prev, usarPca: value }));
  const setNEstimators = (value: number) =>
    setClassifierConfig(prev => ({ ...prev, nEstimators: value }));
  const setTestSize = (value: number) =>
    setClassifierConfig(prev => ({ ...prev, testSize: value }));

  // Estado local solo para UI (loading, error)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de predicción (solo índices es local, las predicciones son globales)
  const [predicting, setPredicting] = useState(false);
  const [sampleIndices, setSampleIndices] = useState('0,1,2');

  // Usar el resultado global en lugar de local
  const trainResult = classifierResults;

  // Verificar requisitos
  const canTrain = appState.sessionId && appState.preprocessed && (usarPca ? appState.pcaCalculated : true);

  const handleTrain = async () => {
    if (!appState.sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await trainClassifier({
        session_id: appState.sessionId,
        target,
        modelo,
        usar_pca: usarPca,
        n_estimators: nEstimators,
        max_depth: null,
        c_param: 1.0,
        test_size: testSize
      });

      // Usar el setter global para que persista entre cambios de página
      setClassifierResults(result);

      // Actualizar estado global para el modo enseñanza
      setAppState(prev => ({ ...prev, classifierTrained: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al entrenar el modelo');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!appState.sessionId || !trainResult) return;

    setPredicting(true);

    try {
      const indices = sampleIndices.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

      const result = await predict({
        session_id: appState.sessionId,
        target,
        sample_indices: indices
      });

      setPredictions(result.predicciones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al predecir');
    } finally {
      setPredicting(false);
    }
  };

  // Colores para gráficos
  const COLORS = ['#0658a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316'];

  if (!appState.dataLoaded) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Datos no cargados
          </h2>
          <p className="text-yellow-700">
            Para usar el clasificador supervisado, primero debes cargar datos en la página de Análisis.
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
            <Brain className="w-6 h-6 text-primary-600" />
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">Clasificador Supervisado</h1>
            <p className="text-secondary-500">Entrena modelos para predecir feedstock y concentración</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Configuración */}
        <div className="lg:col-span-1 space-y-4">
          {/* Card de Configuración */}
          <div className="card" data-teaching-id="classifier-config">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-secondary-800">Configuración del Modelo</h3>
            </div>

            <div className="space-y-4">
              {/* Variable objetivo */}
              <div>
                <label className="label">Variable objetivo</label>
                <select
                  className="select w-full"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as 'feedstock' | 'concentration')}
                >
                  <option value="feedstock">Feedstock (Materia prima)</option>
                  <option value="concentration">Concentración (Biodiesel)</option>
                </select>
              </div>

              {/* Tipo de modelo */}
              <div>
                <label className="label">Tipo de modelo</label>
                <select
                  className="select w-full"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value as 'random_forest' | 'logistic_regression' | 'svm')}
                >
                  <option value="random_forest">Random Forest</option>
                  <option value="logistic_regression">Regresión Logística</option>
                  <option value="svm">SVM (Support Vector Machine)</option>
                </select>
              </div>

              {/* Usar PCA */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usarPca"
                  checked={usarPca}
                  onChange={(e) => setUsarPca(e.target.checked)}
                  className="rounded text-primary-600"
                />
                <label htmlFor="usarPca" className="text-sm text-secondary-700">
                  Usar scores de PCA como features
                </label>
              </div>

              {/* Parámetros según modelo */}
              {modelo === 'random_forest' && (
                <div>
                  <label className="label">Número de árboles: {nEstimators}</label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={nEstimators}
                    onChange={(e) => setNEstimators(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Proporción de prueba */}
              <div>
                <label className="label">Datos de prueba: {(testSize * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.4"
                  step="0.05"
                  value={testSize}
                  onChange={(e) => setTestSize(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Botón entrenar */}
              <button
                onClick={handleTrain}
                disabled={!canTrain || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-4 h-4" />
                    Entrenando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Entrenar Modelo
                  </>
                )}
              </button>

              {!canTrain && (
                <p className="text-xs text-yellow-600">
                  {!appState.preprocessed
                    ? 'Primero aplica preprocesamiento'
                    : usarPca && !appState.pcaCalculated
                    ? 'Primero calcula PCA o desactiva "Usar PCA"'
                    : 'Carga datos primero'}
                </p>
              )}
            </div>
          </div>

          {/* Card de Predicción */}
          {trainResult && (
            <div className="card" data-teaching-id="classifier-predict">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-secondary-800">Predecir Muestras</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Índices de muestras (separados por coma)</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={sampleIndices}
                    onChange={(e) => setSampleIndices(e.target.value)}
                    placeholder="0, 1, 2, 3"
                  />
                </div>

                <button
                  onClick={handlePredict}
                  disabled={predicting}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {predicting ? (
                    <>
                      <div className="loading-spinner w-4 h-4" />
                      Prediciendo...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      Predecir
                    </>
                  )}
                </button>

                {/* Resultados de predicción */}
                {predictions.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-medium text-secondary-700">Resultados:</h4>
                    {predictions.map((pred, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium text-secondary-800">
                          Muestra {pred.indice}: {pred.clase_predicha}
                        </div>
                        <div className="text-xs text-secondary-500 mt-1">
                          {pred.interpretacion}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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

          {trainResult && (
            <>
              {/* Métricas */}
              <div className="card" data-teaching-id="classifier-metrics">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-secondary-800">Desempeño del Modelo</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-primary-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary-700">
                      {(trainResult.accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-primary-600">Accuracy</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {(trainResult.f1_score * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-600">F1-Score</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-700">
                      {(trainResult.precision * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-yellow-600">Precisión</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {(trainResult.recall * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-purple-600">Recall</div>
                  </div>
                </div>

                <div className="text-sm text-secondary-600">
                  Modelo: <span className="font-medium">{trainResult.modelo}</span> |
                  Entrenamiento: {trainResult.n_train} muestras |
                  Prueba: {trainResult.n_test} muestras
                </div>
              </div>

              {/* Matriz de Confusión */}
              <div className="card">
                <h3 className="font-semibold text-secondary-800 mb-4">Matriz de Confusión</h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 bg-gray-50"></th>
                        {trainResult.class_labels.map((label, idx) => (
                          <th key={idx} className="p-2 bg-gray-50 text-center font-medium text-secondary-700">
                            {label.length > 15 ? label.substring(0, 12) + '...' : label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trainResult.confusion_matrix.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td className="p-2 bg-gray-50 font-medium text-secondary-700">
                            {trainResult.class_labels[rowIdx].length > 15
                              ? trainResult.class_labels[rowIdx].substring(0, 12) + '...'
                              : trainResult.class_labels[rowIdx]}
                          </td>
                          {row.map((value, colIdx) => {
                            const isCorrect = rowIdx === colIdx;
                            const intensity = Math.min(value / Math.max(...row.flat()), 1);
                            return (
                              <td
                                key={colIdx}
                                className={`p-2 text-center ${
                                  isCorrect
                                    ? 'bg-green-100 text-green-800 font-bold'
                                    : value > 0
                                    ? 'bg-red-50 text-red-700'
                                    : 'text-secondary-400'
                                }`}
                                style={{
                                  backgroundColor: isCorrect
                                    ? `rgba(34, 197, 94, ${0.2 + intensity * 0.4})`
                                    : value > 0
                                    ? `rgba(239, 68, 68, ${intensity * 0.3})`
                                    : undefined
                                }}
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-secondary-500 mt-4">
                  Filas = Clases reales | Columnas = Clases predichas. Los valores en la diagonal son las predicciones correctas.
                </p>
              </div>

              {/* Importancia de Variables */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-secondary-800">Importancia de Variables</h3>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trainResult.feature_importances.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <YAxis
                        type="category"
                        dataKey="variable"
                        width={90}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Importancia']}
                      />
                      <Bar dataKey="importancia">
                        {trainResult.feature_importances.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-xs text-secondary-500 mt-4">
                  Las variables con mayor importancia son las que más influyen en la predicción del modelo.
                </p>
              </div>
            </>
          )}

          {!trainResult && !loading && (
            <div className="card text-center py-12">
              <Brain className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-600 mb-2">
                Configura y entrena un modelo
              </h3>
              <p className="text-secondary-500">
                Selecciona la variable objetivo y los parámetros del modelo, luego presiona "Entrenar Modelo".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
