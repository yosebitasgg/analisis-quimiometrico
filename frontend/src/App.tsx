import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Header from './components/Header'
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
import { AppState, DataInfo, PCAResults, ClusteringResults } from './types'

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
          <AssistantSidebar sessionId={appState.sessionId} />
        </div>
      </AssistantProvider>
    </TeachingProvider>
  )
}

export default App
