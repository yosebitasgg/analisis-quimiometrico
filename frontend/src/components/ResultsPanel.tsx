import { useState, useEffect } from 'react';
import {
  Download,
  Settings2,
  BarChart3,
  Table2,
  Grid3X3,
  GitBranch,
  BookOpen,
  Lightbulb
} from 'lucide-react';
import {
  ScreePlot,
  ScoresScatter,
  Biplot,
  Heatmap,
  DendrogramPlot,
  SilhouetteByK,
  SilhouetteBars
} from './Charts';
import { downloadResults, downloadLoadings, getCorrelation } from '../api/dataApi';
import { getSilhouetteAnalysis, getSilhouetteSamples } from '../api/clusteringApi';
import {
  AppState,
  PCAResults,
  ClusteringResults,
  ChartSettings,
  ColorByOption,
  SilhouetteResult,
  SilhouetteSample,
  COLOR_PALETTES
} from '../types';

interface Props {
  appState: AppState;
  pcaResults: PCAResults | null;
  clusteringResults: ClusteringResults | null;
}

type Tab = 'varianza' | 'scores' | 'biplot' | 'loadings' | 'correlacion' | 'clustering' | 'silhouette';

export default function ResultsPanel({ appState, pcaResults, clusteringResults }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('correlacion');
  const [settings, setSettings] = useState<ChartSettings>({
    colorBy: 'none',
    pointSize: 5,
    opacity: 0.8,
    palette: 'default'
  });
  const [pcAxes, setPcAxes] = useState({ x: 'PC1', y: 'PC2' });
  const [showSettings, setShowSettings] = useState(false);

  // Estados para datos adicionales
  const [correlationData, setCorrelationData] = useState<{ variables: string[]; matriz: number[][] } | null>(null);
  const [silhouetteByK, setSilhouetteByK] = useState<{ resultados: SilhouetteResult[]; k_optimo: number | null } | null>(null);
  const [silhouetteSamples, setSilhouetteSamples] = useState<{ samples: SilhouetteSample[]; score_global: number | null } | null>(null);

  // Cargar correlación cuando hay preprocesamiento
  useEffect(() => {
    if (appState.preprocessed && appState.sessionId) {
      getCorrelation(appState.sessionId)
        .then(res => setCorrelationData({ variables: res.variables, matriz: res.matriz }))
        .catch(console.error);
    }
  }, [appState.preprocessed, appState.sessionId]);

  // Cambiar tab automáticamente según el estado
  useEffect(() => {
    if (appState.clusteringCalculated) {
      setActiveTab('clustering');
    } else if (appState.pcaCalculated) {
      setActiveTab('varianza');
    } else if (appState.preprocessed) {
      setActiveTab('correlacion');
    }
  }, [appState.preprocessed, appState.pcaCalculated, appState.clusteringCalculated]);

  // Cargar análisis de silhouette cuando hay PCA
  useEffect(() => {
    if (appState.pcaCalculated && appState.sessionId) {
      getSilhouetteAnalysis(appState.sessionId)
        .then(res => setSilhouetteByK({ resultados: res.resultados, k_optimo: res.k_optimo }))
        .catch(console.error);
    }
  }, [appState.pcaCalculated, appState.sessionId]);

  // Cargar silhouette por muestra cuando hay clustering
  useEffect(() => {
    if (appState.clusteringCalculated && appState.sessionId) {
      getSilhouetteSamples(appState.sessionId)
        .then(res => setSilhouetteSamples({ samples: res.samples, score_global: res.score_global }))
        .catch(console.error);
    }
  }, [appState.clusteringCalculated, appState.sessionId]);

  // Manejadores de descarga
  const handleDownloadResults = async () => {
    if (!appState.sessionId) return;
    try {
      const blob = await downloadResults(
        appState.sessionId,
        appState.pcaCalculated,
        appState.clusteringCalculated,
        true
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resultados_chemometrics.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar:', error);
    }
  };

  const handleDownloadLoadings = async () => {
    if (!appState.sessionId) return;
    try {
      const blob = await downloadLoadings(appState.sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loadings_pca.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar:', error);
    }
  };

  // Obtener opciones de PCs disponibles
  const pcOptions = pcaResults?.varianza_explicada.map(v => v.componente) || [];

  // Si no hay resultados, mostrar placeholder
  if (!appState.preprocessed) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-center text-secondary-400">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Panel de Resultados</p>
          <p className="text-sm mt-2">
            Carga datos y aplica preprocesamiento para ver visualizaciones
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; requires?: string }[] = [
    { id: 'varianza', label: 'Varianza', icon: <BarChart3 className="w-4 h-4" />, requires: 'pca' },
    { id: 'scores', label: 'Scores', icon: <Grid3X3 className="w-4 h-4" />, requires: 'pca' },
    { id: 'biplot', label: 'Biplot', icon: <GitBranch className="w-4 h-4" />, requires: 'pca' },
    { id: 'loadings', label: 'Loadings', icon: <Table2 className="w-4 h-4" />, requires: 'pca' },
    { id: 'correlacion', label: 'Correlación', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'clustering', label: 'Clustering', icon: <GitBranch className="w-4 h-4" />, requires: 'clustering' },
    { id: 'silhouette', label: 'Silhouette', icon: <BarChart3 className="w-4 h-4" />, requires: 'pca' },
  ];

  const availableTabs = tabs.filter(tab => {
    if (!tab.requires) return true;
    if (tab.requires === 'pca') return appState.pcaCalculated;
    if (tab.requires === 'clustering') return appState.clusteringCalculated;
    return true;
  });

  // Componente para mostrar interpretaciones
  const InterpretationBox = ({
    howTo,
    auto
  }: {
    howTo: string;
    auto: string;
  }) => (
    <div className="mt-8 pt-4 border-t border-gray-100 space-y-3">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">Cómo interpretar</p>
            <p className="text-xs text-blue-700">{howTo}</p>
          </div>
        </div>
      </div>
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1">Interpretación de tus datos</p>
            <p className="text-xs text-green-700">{auto}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Funciones para generar interpretaciones automáticas
  const getVarianzaInterpretation = () => {
    if (!pcaResults) return '';
    const v = pcaResults.varianza_explicada;
    const pc1 = v[0]?.varianza_explicada || 0;
    const pc2 = v[1]?.varianza_explicada || 0;
    const acum2 = v[1]?.varianza_acumulada || 0;

    // Encontrar cuántos PCs necesitas para 80%
    const pcsFor80 = v.findIndex(x => x.varianza_acumulada >= 80) + 1 || v.length;

    let interpretation = `PC1 captura ${pc1.toFixed(1)}% de la varianza y PC2 ${pc2.toFixed(1)}%, sumando ${acum2.toFixed(1)}% en total. `;

    if (acum2 >= 80) {
      interpretation += `Esto es excelente: solo 2 componentes explican más del 80% de la información, lo que indica que tus datos se pueden representar bien en 2D.`;
    } else if (pcsFor80 <= 3) {
      interpretation += `Necesitas ${pcsFor80} componentes para explicar al menos 80% de la varianza. Esto sugiere que hay ${pcsFor80} direcciones principales de variación en tus datos.`;
    } else {
      interpretation += `Se necesitan ${pcsFor80} componentes para 80% de varianza, lo que indica que tus datos tienen una estructura multidimensional compleja.`;
    }

    return interpretation;
  };

  const getScoresInterpretation = () => {
    if (!pcaResults) return '';
    const feedstockCount = new Set(pcaResults.feedstock?.filter(Boolean) || []).size;
    const hasCluster = clusteringResults?.etiquetas?.length;

    let interpretation = 'Las muestras se distribuyen en el espacio de componentes principales. ';

    if (feedstockCount > 1) {
      interpretation += `Observas ${feedstockCount} tipos de feedstock diferentes. Si las muestras del mismo feedstock se agrupan, significa que el tipo de materia prima influye fuertemente en la composición química. `;
    }

    if (hasCluster) {
      const nClusters = clusteringResults!.n_clusters;
      interpretation += `Los ${nClusters} clústeres identificados muestran grupos naturales en tus datos. Colorea por "Clúster" para ver cómo se separan.`;
    } else {
      interpretation += 'Activa "Colorear por" en configuración para identificar patrones por feedstock o concentración.';
    }

    return interpretation;
  };

  const getBiplotInterpretation = () => {
    if (!pcaResults) return '';

    // Encontrar las variables con mayor loading en PC1 y PC2
    const loadings = pcaResults.loadings;
    let maxPC1Var = { name: '', val: 0 };
    let maxPC2Var = { name: '', val: 0 };

    loadings.forEach(l => {
      const pc1Val = Math.abs(l.PC1 as number || 0);
      const pc2Val = Math.abs(l.PC2 as number || 0);
      if (pc1Val > Math.abs(maxPC1Var.val)) maxPC1Var = { name: l.variable as string, val: l.PC1 as number };
      if (pc2Val > Math.abs(maxPC2Var.val)) maxPC2Var = { name: l.variable as string, val: l.PC2 as number };
    });

    let interpretation = `La variable "${maxPC1Var.name}" tiene mayor influencia en PC1 (${maxPC1Var.val > 0 ? 'positiva' : 'negativa'}), `;
    interpretation += `mientras que "${maxPC2Var.name}" domina en PC2. `;
    interpretation += 'Las muestras cercanas a una flecha tienen valores altos de esa variable. Variables con flechas en direcciones opuestas están negativamente correlacionadas.';

    return interpretation;
  };

  const getLoadingsInterpretation = () => {
    if (!pcaResults) return '';

    const loadings = pcaResults.loadings;
    // Encontrar variables más importantes para PC1
    const sortedByPC1 = [...loadings].sort((a, b) => Math.abs(b.PC1 as number || 0) - Math.abs(a.PC1 as number || 0));
    const top3 = sortedByPC1.slice(0, 3).map(l => l.variable);

    let interpretation = `Las variables más influyentes en PC1 son: ${top3.join(', ')}. `;
    interpretation += 'Estas variables son las principales responsables de la separación de muestras en la primera dimensión. ';
    interpretation += 'Variables con loadings altos (azul) o bajos (rojo) son las más importantes para diferenciar muestras.';

    return interpretation;
  };

  const getCorrelationInterpretation = () => {
    if (!correlationData) return '';

    const { variables, matriz } = correlationData;
    let maxCorr = { v1: '', v2: '', val: 0 };
    let minCorr = { v1: '', v2: '', val: 0 };

    // Buscar correlaciones más fuertes (excluyendo diagonal)
    for (let i = 0; i < matriz.length; i++) {
      for (let j = i + 1; j < matriz[i].length; j++) {
        const val = matriz[i][j];
        if (val > maxCorr.val) maxCorr = { v1: variables[i], v2: variables[j], val };
        if (val < minCorr.val) minCorr = { v1: variables[i], v2: variables[j], val };
      }
    }

    let interpretation = '';
    if (maxCorr.val > 0.7) {
      interpretation += `La correlación positiva más fuerte es entre "${maxCorr.v1}" y "${maxCorr.v2}" (r=${maxCorr.val.toFixed(2)}), indicando que aumentan juntas. `;
    }
    if (minCorr.val < -0.7) {
      interpretation += `La correlación negativa más fuerte es entre "${minCorr.v1}" y "${minCorr.v2}" (r=${minCorr.val.toFixed(2)}), indicando relación inversa. `;
    }
    if (maxCorr.val <= 0.7 && minCorr.val >= -0.7) {
      interpretation += 'No hay correlaciones muy fuertes (|r| > 0.7) entre variables. Las variables son relativamente independientes entre sí.';
    }

    return interpretation;
  };

  const getClusteringInterpretation = () => {
    if (!clusteringResults) return '';

    const { silhouette_score, n_clusters, estadisticas_clusters, metodo } = clusteringResults;
    const sil = silhouette_score || 0;

    let interpretation = `Se identificaron ${n_clusters} grupos usando ${metodo === 'kmeans' ? 'K-means' : 'clustering jerárquico'}. `;

    // Evaluar calidad del clustering
    if (sil >= 0.7) {
      interpretation += `El Silhouette Score de ${sil.toFixed(3)} es excelente (>0.7), indicando clústeres muy bien definidos y separados.`;
    } else if (sil >= 0.5) {
      interpretation += `El Silhouette Score de ${sil.toFixed(3)} es bueno (0.5-0.7), indicando una estructura de grupos razonable.`;
    } else if (sil >= 0.25) {
      interpretation += `El Silhouette Score de ${sil.toFixed(3)} es moderado (0.25-0.5). Los grupos tienen cierto solapamiento. Considera probar con diferente número de clústeres.`;
    } else {
      interpretation += `El Silhouette Score de ${sil.toFixed(3)} es bajo (<0.25). Los datos podrían no tener una estructura de grupos clara, o el número de clústeres no es óptimo.`;
    }

    // Analizar distribución de tamaños
    const sizes = estadisticas_clusters.map(s => s.tamano);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    if (maxSize / minSize > 3) {
      interpretation += ` Nota: los clústeres tienen tamaños muy desiguales (${minSize} a ${maxSize} muestras).`;
    }

    return interpretation;
  };

  const getSilhouetteInterpretation = () => {
    if (!silhouetteByK || !silhouetteByK.resultados || silhouetteByK.resultados.length === 0) {
      return 'No se pudo calcular el análisis de silhouette.';
    }

    const { k_optimo, resultados } = silhouetteByK;
    const scores = resultados.map(r => r.silhouette).filter(s => s !== null && s !== undefined && !isNaN(s));

    if (scores.length === 0) {
      return 'No se pudo calcular el análisis de silhouette.';
    }

    const maxScore = Math.max(...scores);
    const bestK = k_optimo || resultados.find(r => r.silhouette === maxScore)?.k || 2;

    let interpretation = `El análisis sugiere que k=${bestK} es el número óptimo de clústeres (Silhouette=${maxScore.toFixed(3)}). `;

    if (maxScore >= 0.5) {
      interpretation += 'Este valor indica que existe una estructura de grupos clara en los datos.';
    } else if (maxScore >= 0.25) {
      interpretation += 'Este valor moderado sugiere que hay cierta agrupación pero no muy pronunciada.';
    } else {
      interpretation += 'El bajo valor máximo sugiere que los datos podrían no tener grupos naturales bien definidos.';
    }

    return interpretation;
  };

  return (
    <div className="card h-full flex flex-col" data-teaching-id="results-panel">
      {/* Header con tabs */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap gap-1">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-secondary-500 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de configuración */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all ${
              showSettings ? 'bg-primary-100 text-primary-700' : 'text-secondary-500 hover:bg-gray-100'
            }`}
            title="Configuración de gráficos"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Botón de descarga */}
          {(appState.pcaCalculated || appState.clusteringCalculated) && (
            <button
              onClick={handleDownloadResults}
              className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Panel de configuración - personalizado por tab */}
      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Paleta de colores - disponible para TODOS los tabs */}
            <div>
              <label className="label text-xs">Accesibilidad visual</label>
              <select
                value={settings.palette}
                onChange={(e) => setSettings({ ...settings, palette: e.target.value as 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' })}
                className="select text-sm py-1.5"
              >
                <option value="default">Visión normal</option>
                <option value="protanopia">Protanopía (sin rojo)</option>
                <option value="deuteranopia">Deuteranopía (sin verde)</option>
                <option value="tritanopia">Tritanopía (sin azul)</option>
              </select>
            </div>

            {/* Opciones solo para gráficos con puntos (scores, biplot) */}
            {(activeTab === 'scores' || activeTab === 'biplot') && (
              <>
                {/* Color por */}
                <div>
                  <label className="label text-xs">Colorear por</label>
                  <select
                    value={settings.colorBy}
                    onChange={(e) => setSettings({ ...settings, colorBy: e.target.value as ColorByOption })}
                    className="select text-sm py-1.5"
                  >
                    <option value="none">Sin color</option>
                    <option value="feedstock">Feedstock</option>
                    <option value="concentration">Concentración</option>
                    {appState.clusteringCalculated && <option value="cluster">Clúster</option>}
                  </select>
                </div>

                {/* Tamaño de puntos */}
                <div>
                  <label className="label text-xs">Tamaño puntos: {settings.pointSize}</label>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={settings.pointSize}
                    onChange={(e) => setSettings({ ...settings, pointSize: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>

                {/* Opacidad */}
                <div>
                  <label className="label text-xs">Opacidad: {settings.opacity}</label>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.1"
                    value={settings.opacity}
                    onChange={(e) => setSettings({ ...settings, opacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
              </>
            )}

            {/* Selector de ejes PC (solo para scores y biplot) */}
            {(activeTab === 'scores' || activeTab === 'biplot') && pcOptions.length > 1 && (
              <>
                <div>
                  <label className="label text-xs">Eje X</label>
                  <select
                    value={pcAxes.x}
                    onChange={(e) => setPcAxes({ ...pcAxes, x: e.target.value })}
                    className="select text-sm py-1.5"
                  >
                    {pcOptions.map(pc => (
                      <option key={pc} value={pc}>{pc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Eje Y</label>
                  <select
                    value={pcAxes.y}
                    onChange={(e) => setPcAxes({ ...pcAxes, y: e.target.value })}
                    className="select text-sm py-1.5"
                  >
                    {pcOptions.map(pc => (
                      <option key={pc} value={pc}>{pc}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Descripción de la paleta seleccionada */}
          <p className="text-xs text-secondary-500 mt-3">
            {settings.palette === 'default' && 'Paleta estándar con colores vibrantes.'}
            {settings.palette === 'protanopia' && 'Optimizada para personas con dificultad para ver tonos rojos.'}
            {settings.palette === 'deuteranopia' && 'Optimizada para personas con dificultad para ver tonos verdes.'}
            {settings.palette === 'tritanopia' && 'Optimizada para personas con dificultad para ver tonos azules.'}
          </p>
        </div>
      )}

      {/* Contenido del tab activo */}
      <div className="flex-1 overflow-auto">
        {/* Tab: Varianza explicada */}
        {activeTab === 'varianza' && pcaResults && (
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-3">
              Varianza Explicada por Componente
            </h4>
            <ScreePlot data={pcaResults.varianza_explicada} palette={settings.palette} />

            {/* Tabla de varianza */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-secondary-600">Componente</th>
                    <th className="text-right py-2 px-3 text-secondary-600">Varianza (%)</th>
                    <th className="text-right py-2 px-3 text-secondary-600">Acumulada (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {pcaResults.varianza_explicada.map((v, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">{v.componente}</td>
                      <td className="py-2 px-3 text-right">{v.varianza_explicada.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{v.varianza_acumulada.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <InterpretationBox
              howTo="El Scree Plot muestra cuánta información (varianza) captura cada componente principal. Las barras azules muestran la varianza individual y la línea naranja la acumulada. Busca el 'codo' donde la curva se aplana: los componentes antes del codo son los más informativos. Idealmente, 2-3 componentes deberían capturar >80% de la varianza."
              auto={getVarianzaInterpretation()}
            />
          </div>
        )}

        {/* Tab: Scores */}
        {activeTab === 'scores' && pcaResults && (
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-3">
              Gráfico de Scores ({pcAxes.x} vs {pcAxes.y})
            </h4>
            <ScoresScatter
              scores={pcaResults.scores}
              xAxis={pcAxes.x}
              yAxis={pcAxes.y}
              feedstock={pcaResults.feedstock}
              concentration={pcaResults.concentration}
              clusterLabels={clusteringResults?.etiquetas || null}
              settings={settings}
            />

            <InterpretationBox
              howTo="Cada punto representa una muestra proyectada en el espacio de los componentes principales. Muestras cercanas tienen composiciones similares; muestras alejadas son diferentes. Grupos visibles sugieren patrones en los datos. Usa 'Colorear por' para identificar si los grupos corresponden a feedstock, concentración u otra variable."
              auto={getScoresInterpretation()}
            />
          </div>
        )}

        {/* Tab: Biplot */}
        {activeTab === 'biplot' && pcaResults && (
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-3">
              Biplot ({pcAxes.x} vs {pcAxes.y})
            </h4>
            <Biplot
              scores={pcaResults.scores}
              loadings={pcaResults.loadings}
              xAxis={pcAxes.x}
              yAxis={pcAxes.y}
              settings={settings}
              clusterLabels={clusteringResults?.etiquetas}
            />

            <InterpretationBox
              howTo="El biplot combina scores (puntos) y loadings (flechas). Las flechas indican la dirección e importancia de cada variable. Flechas largas = variables más importantes. Flechas en la misma dirección = variables correlacionadas positivamente. Flechas opuestas = correlación negativa. Muestras en dirección de una flecha tienen valores altos de esa variable."
              auto={getBiplotInterpretation()}
            />
          </div>
        )}

        {/* Tab: Loadings */}
        {activeTab === 'loadings' && pcaResults && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-secondary-700">
                Tabla de Loadings
              </h4>
              <button
                onClick={handleDownloadLoadings}
                className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Exportar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-secondary-600">Variable</th>
                    {pcaResults.varianza_explicada.map((v, i) => (
                      <th key={i} className="text-right py-2 px-3 text-secondary-600">
                        {v.componente}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pcaResults.loadings.map((loading, i) => {
                    // Obtener colores de la paleta (primer color para positivo, tercer color para negativo)
                    const palette = COLOR_PALETTES[settings.palette];
                    const positiveColor = palette[0]; // Primer color para valores positivos
                    const negativeColor = palette[2]; // Tercer color para valores negativos

                    // Convertir hex a rgb para usar con opacidad
                    const hexToRgb = (hex: string) => {
                      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                      return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                      } : { r: 0, g: 0, b: 0 };
                    };

                    const posRgb = hexToRgb(positiveColor);
                    const negRgb = hexToRgb(negativeColor);

                    return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{loading.variable}</td>
                        {pcaResults.varianza_explicada.map((v, j) => {
                          const val = loading[v.componente] as number;
                          const absVal = Math.abs(val);
                          const rgb = val > 0 ? posRgb : negRgb;
                          return (
                            <td
                              key={j}
                              className="py-2 px-3 text-right"
                              style={{
                                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${absVal * 0.4})`
                              }}
                            >
                              {val.toFixed(4)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <InterpretationBox
              howTo="Los loadings muestran cuánto contribuye cada variable a cada componente principal. Valores cercanos a +1 o -1 indican alta influencia; cercanos a 0, poca influencia. El color azul indica contribución positiva y el rojo negativa. Variables con loadings altos en el mismo PC varían juntas en esa dirección."
              auto={getLoadingsInterpretation()}
            />
          </div>
        )}

        {/* Tab: Correlación */}
        {activeTab === 'correlacion' && correlationData && (
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-3">
              Matriz de Correlación
            </h4>
            <Heatmap
              variables={correlationData.variables}
              matrix={correlationData.matriz}
              palette={settings.palette}
            />

            <InterpretationBox
              howTo="La matriz de correlación muestra la relación lineal entre cada par de variables. Valores de +1 (azul oscuro) indican correlación positiva perfecta (cuando una sube, la otra también). Valores de -1 (rojo oscuro) indican correlación negativa perfecta (cuando una sube, la otra baja). Valores cercanos a 0 (blanco) indican poca o ninguna relación lineal."
              auto={getCorrelationInterpretation()}
            />
          </div>
        )}

        {/* Tab: Clustering */}
        {activeTab === 'clustering' && clusteringResults && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-secondary-700 mb-3">
                Resultados de Clustering ({clusteringResults.metodo})
              </h4>

              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-secondary-500">Clústeres</p>
                  <p className="text-xl font-semibold text-secondary-800">
                    {clusteringResults.n_clusters}
                  </p>
                </div>
                {clusteringResults.silhouette_score !== null && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-secondary-500">Silhouette Score</p>
                    <p className="text-xl font-semibold text-secondary-800">
                      {clusteringResults.silhouette_score.toFixed(4)}
                    </p>
                  </div>
                )}
                {clusteringResults.inercia !== null && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-secondary-500">Inercia</p>
                    <p className="text-xl font-semibold text-secondary-800">
                      {clusteringResults.inercia.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Tabla de estadísticas por clúster */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-secondary-600">Clúster</th>
                      <th className="text-right py-2 px-3 text-secondary-600">Tamaño</th>
                      <th className="text-right py-2 px-3 text-secondary-600">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusteringResults.estadisticas_clusters.map((stat, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium">Clúster {stat.cluster_id}</td>
                        <td className="py-2 px-3 text-right">{stat.tamano}</td>
                        <td className="py-2 px-3 text-right">{stat.porcentaje.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dendrograma (solo para jerárquico) */}
            {clusteringResults.dendrograma_data && (
              <div>
                <h4 className="text-sm font-medium text-secondary-700 mb-3">
                  Dendrograma
                </h4>
                <DendrogramPlot
                  data={clusteringResults.dendrograma_data}
                  nClusters={clusteringResults.n_clusters}
                />
              </div>
            )}

            {/* Silhouette por muestra */}
            {silhouetteSamples && silhouetteSamples.samples.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-secondary-700 mb-3">
                  Silhouette por Muestra
                </h4>
                <SilhouetteBars
                  samples={silhouetteSamples.samples}
                  scoreGlobal={silhouetteSamples.score_global}
                  palette={settings.palette}
                />
              </div>
            )}

            <InterpretationBox
              howTo="El clustering agrupa muestras similares. El Silhouette Score (-1 a 1) mide qué tan bien separados están los grupos: >0.7 excelente, 0.5-0.7 bueno, 0.25-0.5 moderado, <0.25 débil. La inercia (solo K-means) mide la compacidad interna de los grupos. En el dendrograma, la altura de unión indica cuán diferentes son los grupos que se fusionan."
              auto={getClusteringInterpretation()}
            />
          </div>
        )}

        {/* Tab: Análisis de Silhouette */}
        {activeTab === 'silhouette' && silhouetteByK && (
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-3">
              Silhouette Score vs Número de Clústeres
            </h4>
            <SilhouetteByK
              data={silhouetteByK.resultados}
              kOptimo={silhouetteByK.k_optimo}
              palette={settings.palette}
            />
            <InterpretationBox
              howTo="Este gráfico ayuda a elegir el número óptimo de clústeres (k). El eje Y muestra el Silhouette Score para cada valor de k. El valor de k con mayor Silhouette Score es generalmente el mejor. Un score alto indica que las muestras están bien asignadas a su clúster y lejos de otros clústeres."
              auto={getSilhouetteInterpretation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
