import { useState, useEffect } from 'react';
import { Settings, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { preprocessData } from '../api/dataApi';
import { AppState, DataInfo, PreprocessingResponse } from '../types';
import CollapsibleCard from './CollapsibleCard';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  dataInfo: DataInfo | null;
}

export default function PreprocessingCard({ appState, setAppState, dataInfo }: Props) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [handleNans, setHandleNans] = useState<'eliminar' | 'imputar_media'>('eliminar');
  const [standardize, setStandardize] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreprocessingResponse | null>(null);

  // Seleccionar todas las columnas numéricas por defecto
  useEffect(() => {
    if (dataInfo?.columnas_numericas) {
      setSelectedColumns(dataInfo.columnas_numericas);
    }
  }, [dataInfo]);

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const selectAll = () => {
    if (dataInfo) {
      setSelectedColumns(dataInfo.columnas_numericas);
    }
  };

  const selectNone = () => {
    setSelectedColumns([]);
  };

  const handlePreprocess = async () => {
    if (!appState.sessionId || selectedColumns.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await preprocessData({
        session_id: appState.sessionId,
        columnas_seleccionadas: selectedColumns,
        manejar_nans: handleNans,
        estandarizar: standardize,
      });

      setResult(response);
      setAppState(prev => ({
        ...prev,
        preprocessed: true,
        pcaCalculated: false,
        clusteringCalculated: false,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en preprocesamiento');
    } finally {
      setLoading(false);
    }
  };

  if (!appState.dataLoaded || !dataInfo) {
    return (
      <div className="card opacity-60">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-secondary-400" />
          Preprocesamiento
        </h3>
        <p className="text-sm text-secondary-500">
          Primero carga un archivo de datos para continuar.
        </p>
      </div>
    );
  }

  const completedText = result
    ? `${result.num_filas} × ${result.num_columnas}`
    : undefined;

  return (
    <CollapsibleCard
      title="Preprocesamiento"
      icon={<Settings className="w-5 h-5" />}
      isCompleted={appState.preprocessed}
      completedText={completedText}
      defaultOpen={appState.dataLoaded && !appState.preprocessed}
      shouldOpen={appState.dataLoaded && !appState.preprocessed}
      dataTeachingId="preprocessing"
    >
      <div className="space-y-4">
        {/* Selector de columnas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label">Variables numéricas a incluir</label>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Todas
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={selectNone}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Ninguna
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
            {dataInfo.columnas_numericas.map(col => (
              <label
                key={col}
                className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={() => handleColumnToggle(col)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">{col}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-secondary-500 mt-1">
            {selectedColumns.length} de {dataInfo.columnas_numericas.length} seleccionadas
          </p>
        </div>

        {/* Manejo de valores faltantes */}
        <div>
          <label className="label flex items-center gap-1">
            Valores faltantes (NaN)
            <div className="tooltip">
              <Info className="w-4 h-4 text-secondary-400 cursor-help" />
              <span className="tooltip-text">
                Cómo manejar celdas vacías o con errores
              </span>
            </div>
          </label>
          <select
            value={handleNans}
            onChange={(e) => setHandleNans(e.target.value as 'eliminar' | 'imputar_media')}
            className="select"
          >
            <option value="eliminar">Eliminar filas con valores faltantes</option>
            <option value="imputar_media">Imputar con la media de cada columna</option>
          </select>
        </div>

        {/* Estandarización */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={standardize}
              onChange={(e) => setStandardize(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-700">
              Estandarizar (media 0, varianza 1)
            </span>
            <div className="tooltip">
              <Info className="w-4 h-4 text-secondary-400 cursor-help" />
              <span className="tooltip-text">
                Recomendado para PCA cuando las variables tienen diferentes escalas
              </span>
            </div>
          </label>
        </div>

        {/* Botón aplicar */}
        <button
          onClick={handlePreprocess}
          disabled={loading || selectedColumns.length === 0}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="loading-spinner" />
              Procesando...
            </>
          ) : (
            'Aplicar preprocesamiento'
          )}
        </button>

        {/* Mensajes */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {result && (
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-primary-500" />
              <span className="text-sm font-medium text-primary-700">
                Preprocesamiento completado
              </span>
            </div>
            <div className="text-xs text-primary-600 space-y-1">
              <p>• {result.num_filas} filas × {result.num_columnas} columnas</p>
              {result.filas_eliminadas > 0 && (
                <p>• {result.filas_eliminadas} filas eliminadas (NaN)</p>
              )}
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
