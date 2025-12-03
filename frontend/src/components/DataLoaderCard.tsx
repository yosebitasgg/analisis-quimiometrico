import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadFile, loadExampleDataset } from '../api/dataApi';
import { DataUploadResponse, AppState, DataInfo } from '../types';
import CollapsibleCard from './CollapsibleCard';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  setDataInfo: React.Dispatch<React.SetStateAction<DataInfo | null>>;
  dataInfo: DataInfo | null;
}

export default function DataLoaderCard({ appState, setAppState, setDataInfo, dataInfo }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResponse = (response: DataUploadResponse) => {
    setAppState({
      sessionId: response.session_id,
      dataLoaded: true,
      preprocessed: false,
      pcaCalculated: false,
      clusteringCalculated: false,
      classifierTrained: false,
      similaritySearched: false,
    });

    setDataInfo({
      num_filas: response.num_filas,
      num_columnas: response.num_columnas,
      columnas_numericas: response.columnas_numericas,
      columnas_categoricas: response.columnas_categoricas,
      columnas_info: response.columnas_info,
      muestra_datos: response.muestra_datos,
      feedstock_valores: response.feedstock_valores,
      concentration_valores: response.concentration_valores,
    });

    setSuccess(response.mensaje);
    setError(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await uploadFile(file);
      handleResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar archivo');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadExample = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await loadExampleDataset();
      handleResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar dataset de ejemplo');
    } finally {
      setLoading(false);
    }
  };

  const completedText = dataInfo
    ? `${dataInfo.num_filas} × ${dataInfo.num_columnas}`
    : undefined;

  return (
    <CollapsibleCard
      title="Cargar Datos"
      icon={<FileSpreadsheet className="w-5 h-5" />}
      isCompleted={appState.dataLoaded}
      completedText={completedText}
      defaultOpen={!appState.dataLoaded}
      dataTeachingId="data-loader"
    >
      <div className="space-y-4">
        {/* Botón subir archivo */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-all ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            <Upload className="w-5 h-5 text-secondary-500" />
            <span className="text-secondary-600">
              {loading ? 'Cargando...' : 'Subir archivo (.csv, .xlsx, .xls)'}
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-secondary-400">o</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Botón dataset de ejemplo */}
        <button
          onClick={handleLoadExample}
          disabled={loading}
          className="btn-outline w-full flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Usar dataset de ejemplo (FAMEs)
        </button>

        {/* Mensajes de estado */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <span className="text-sm text-primary-700">{success}</span>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
