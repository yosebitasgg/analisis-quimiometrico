import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import Header from './components/Header'
import WelcomeTour from './components/WelcomeTour'
import { WelcomeTourProvider, useWelcomeTour } from './context/WelcomeTourContext'
import AuthorsFooter from './components/AuthorsFooter'
import AnalysisPage from './pages/AnalysisPage'
import DataPage from './pages/DataPage'
import HelpPage from './pages/HelpPage'
import ClassifierPage from './pages/ClassifierPage'
import SimilarityPage from './pages/SimilarityPage'
import ReportPage from './pages/ReportPage'
import { TeachingProvider } from './context/TeachingContext'
import { AssistantProvider } from './context/AssistantContext'
import TeachingOverlay from './components/TeachingOverlay'
import AssistantSidebar from './components/AssistantSidebar'
import AppStateSync from './components/AppStateSync'
import { AppState, DataInfo, PCAResults, ClusteringResults, ClassifierTrainResponse, SimilaritySearchResponse, SampleInfo, PredictionResult } from './types'
import { getSessionState } from './api/dataApi'
import { getPCAResults } from './api/pcaApi'
import { getClusteringResults } from './api/clusteringApi'

function App() {
  // Estado global de la aplicación
  const [appState, setAppState] = useState<AppState>({
    sessionId: null,
    dataLoaded: false,
    preprocessed: false,
    pcaCalculated: false,
    clusteringCalculated: false,
    classifierTrained: false,
    similaritySearched: false,
  })

  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null)
  const [pcaResults, setPcaResults] = useState<PCAResults | null>(null)
  const [clusteringResults, setClusteringResults] = useState<ClusteringResults | null>(null)

  // Estado global para Clasificador (persiste entre cambios de página)
  const [classifierResults, setClassifierResults] = useState<ClassifierTrainResponse | null>(null)
  const [classifierConfig, setClassifierConfig] = useState({
    target: 'feedstock' as 'feedstock' | 'concentration',
    modelo: 'random_forest' as 'random_forest' | 'logistic_regression' | 'svm',
    usarPca: true,
    nEstimators: 100,
    testSize: 0.2
  })
  const [classifierPredictions, setClassifierPredictions] = useState<PredictionResult[]>([])

  // Estado global para Similitud (persiste entre cambios de página)
  const [similarityResults, setSimilarityResults] = useState<SimilaritySearchResponse | null>(null)
  const [similarityConfig, setSimilarityConfig] = useState({
    sampleIndex: 0,
    space: 'pca' as 'pca' | 'original',
    metric: 'euclidean' as 'euclidean' | 'cosine',
    k: 5
  })
  const [samplesList, setSamplesList] = useState<SampleInfo[]>([])

  /**
   * Sincroniza el estado de la UI con el backend para una sesion dada.
   * Se llama despues de que el asistente ejecuta una accion.
   */
  const syncFromSession = useCallback(async (sessionId: string) => {
    console.log('[App] Sincronizando estado desde sesion:', sessionId);

    try {
      // 1. Obtener estado completo de la sesion (datos cargados)
      const sessionState = await getSessionState(sessionId);
      console.log('[App] Session state:', sessionState);

      if (sessionState && sessionState.exito) {
        // Actualizar dataInfo
        setDataInfo({
          num_filas: sessionState.num_filas,
          num_columnas: sessionState.num_columnas,
          columnas_numericas: sessionState.columnas_numericas || [],
          columnas_categoricas: sessionState.columnas_categoricas || [],
          columnas_info: sessionState.columnas_info || [],
          feedstock_valores: sessionState.feedstock_valores || [],
          concentration_valores: sessionState.concentration_valores || [],
          muestra_datos: sessionState.muestra_datos || [],
        });

        // Actualizar flags de appState
        setAppState(prev => ({
          ...prev,
          sessionId: sessionId,
          dataLoaded: true,
          preprocessed: sessionState.preprocesado || false,
        }));
      }
    } catch (error) {
      console.log('[App] No hay datos cargados en la sesion');
    }

    try {
      // 2. Obtener resultados de PCA si existen
      const pca = await getPCAResults(sessionId);
      console.log('[App] PCA results:', pca);

      if (pca && pca.varianza_explicada) {
        setPcaResults(pca);
        setAppState(prev => ({
          ...prev,
          pcaCalculated: true,
        }));
      } else {
        // No hay PCA válido - limpiar estado
        setPcaResults(null);
        setAppState(prev => ({
          ...prev,
          pcaCalculated: false,
        }));
      }
    } catch (error) {
      console.log('[App] No hay resultados de PCA - limpiando estado');
      // Error al obtener PCA - limpiar estado
      setPcaResults(null);
      setAppState(prev => ({
        ...prev,
        pcaCalculated: false,
      }));
    }

    try {
      // 3. Obtener resultados de clustering si existen
      const clustering = await getClusteringResults(sessionId);
      console.log('[App] Clustering results:', clustering);

      if (clustering && clustering.etiquetas) {
        setClusteringResults(clustering);
        setAppState(prev => ({
          ...prev,
          clusteringCalculated: true,
        }));
      } else {
        // No hay clustering válido - limpiar estado
        setClusteringResults(null);
        setAppState(prev => ({
          ...prev,
          clusteringCalculated: false,
        }));
      }
    } catch (error) {
      console.log('[App] No hay resultados de clustering - limpiando estado');
      // Error al obtener clustering - limpiar estado
      setClusteringResults(null);
      setAppState(prev => ({
        ...prev,
        clusteringCalculated: false,
      }));
    }
  }, []);

  return (
    <TeachingProvider>
      <AssistantProvider>
        <AppStateSync appState={appState} />
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/analisis" replace />}
              />
              <Route
                path="/analisis"
                element={
                  <AnalysisPage
                    appState={appState}
                    setAppState={setAppState}
                    dataInfo={dataInfo}
                    setDataInfo={setDataInfo}
                    pcaResults={pcaResults}
                    setPcaResults={setPcaResults}
                    clusteringResults={clusteringResults}
                    setClusteringResults={setClusteringResults}
                  />
                }
              />
              <Route
                path="/clasificador"
                element={
                  <ClassifierPage
                    appState={appState}
                    setAppState={setAppState}
                    classifierResults={classifierResults}
                    setClassifierResults={setClassifierResults}
                    classifierConfig={classifierConfig}
                    setClassifierConfig={setClassifierConfig}
                    predictions={classifierPredictions}
                    setPredictions={setClassifierPredictions}
                  />
                }
              />
              <Route
                path="/similitud"
                element={
                  <SimilarityPage
                    appState={appState}
                    setAppState={setAppState}
                    pcaResults={pcaResults}
                    similarityResults={similarityResults}
                    setSimilarityResults={setSimilarityResults}
                    similarityConfig={similarityConfig}
                    setSimilarityConfig={setSimilarityConfig}
                    samplesList={samplesList}
                    setSamplesList={setSamplesList}
                  />
                }
              />
              <Route
                path="/reporte"
                element={
                  <ReportPage
                    appState={appState}
                  />
                }
              />
              <Route
                path="/datos"
                element={
                  <DataPage
                    appState={appState}
                    dataInfo={dataInfo}
                  />
                }
              />
              <Route
                path="/ayuda"
                element={<HelpPage />}
              />
            </Routes>
            <AuthorsFooter />
          </main>
          <TeachingOverlay />
          <AssistantSidebar sessionId={appState.sessionId} onActionExecuted={syncFromSession} />
          <WelcomeTourWrapper />
        </div>
      </AssistantProvider>
    </TeachingProvider>
  )
}

// Componente wrapper para el WelcomeTour que usa el contexto
function WelcomeTourWrapper() {
  const { showTour, closeTour } = useWelcomeTour();
  return <WelcomeTour isOpen={showTour} onClose={closeTour} />;
}

// Componente principal envuelto con el provider
function AppWithProviders() {
  return (
    <WelcomeTourProvider>
      <App />
    </WelcomeTourProvider>
  );
}

export default AppWithProviders
