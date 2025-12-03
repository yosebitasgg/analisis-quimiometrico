import { BarChart3 } from 'lucide-react';
import DataLoaderCard from '../components/DataLoaderCard';
import PreprocessingCard from '../components/PreprocessingCard';
import PCACard from '../components/PCACard';
import ClusteringCard from '../components/ClusteringCard';
import ResultsPanel from '../components/ResultsPanel';
import { AppState, DataInfo, PCAResults, ClusteringResults } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  dataInfo: DataInfo | null;
  setDataInfo: React.Dispatch<React.SetStateAction<DataInfo | null>>;
  pcaResults: PCAResults | null;
  setPcaResults: React.Dispatch<React.SetStateAction<PCAResults | null>>;
  clusteringResults: ClusteringResults | null;
  setClusteringResults: React.Dispatch<React.SetStateAction<ClusteringResults | null>>;
}

export default function AnalysisPage({
  appState,
  setAppState,
  dataInfo,
  setDataInfo,
  pcaResults,
  setPcaResults,
  clusteringResults,
  setClusteringResults
}: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary-600" />
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">Análisis Multivariado</h1>
            <p className="text-secondary-500">PCA y Clustering para exploración de datos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Columna izquierda: Configuración */}
      <div className="lg:col-span-4 space-y-4">
        <DataLoaderCard
          appState={appState}
          setAppState={setAppState}
          setDataInfo={setDataInfo}
          dataInfo={dataInfo}
        />

        <PreprocessingCard
          appState={appState}
          setAppState={setAppState}
          dataInfo={dataInfo}
        />

        <PCACard
          appState={appState}
          setAppState={setAppState}
          setPcaResults={setPcaResults}
          pcaResults={pcaResults}
        />

        <ClusteringCard
          appState={appState}
          setAppState={setAppState}
          setClusteringResults={setClusteringResults}
          clusteringResults={clusteringResults}
        />
      </div>

      {/* Columna derecha: Resultados */}
      <div className="lg:col-span-8">
        <ResultsPanel
          appState={appState}
          pcaResults={pcaResults}
          clusteringResults={clusteringResults}
        />
      </div>
      </div>
    </div>
  );
}
