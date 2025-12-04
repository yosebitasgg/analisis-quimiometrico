import { useState, useEffect } from 'react';
import { FileText, Download, BarChart2, ClipboardList, AlertCircle, CheckCircle2, Loader2, AlertTriangle, Sparkles, Eye, Box } from 'lucide-react';
import { AppState, ReportSummaryResponse } from '../types';
import { getReportSummary, downloadPDF } from '../api/reportApi';

interface ReportPageProps {
  appState: AppState;
}

export default function ReportPage({ appState }: ReportPageProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportSummaryResponse | null>(null);

  // Cargar reporte al montar
  useEffect(() => {
    const loadReport = async () => {
      if (appState.sessionId && appState.preprocessed) {
        setLoading(true);
        setError(null);

        try {
          const result = await getReportSummary(appState.sessionId);
          setReport(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
        } finally {
          setLoading(false);
        }
      }
    };

    loadReport();
  }, [appState.sessionId, appState.preprocessed, appState.pcaCalculated, appState.clusteringCalculated]);

  const handleDownloadPDF = async () => {
    if (!appState.sessionId) return;

    setDownloading(true);

    try {
      const blob = await downloadPDF(appState.sessionId);

      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_quimiometrico_${appState.sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (!appState.dataLoaded) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Datos no cargados
          </h2>
          <p className="text-yellow-700">
            Para generar un reporte, primero debes cargar datos y realizar algún análisis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h1 className="text-2xl font-bold text-secondary-800">Reporte de Análisis</h1>
              <p className="text-secondary-500">Resumen e interpretación de los resultados</p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading || !report}
            className="btn-primary flex items-center gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="card text-center py-12">
          <Loader2 className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" />
          <p className="text-secondary-600">Generando reporte...</p>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Interpretación General */}
          <div className="card bg-primary-50 border-primary-100" data-teaching-id="report-general">
            <h3 className="font-semibold text-primary-800 mb-3">Resumen General</h3>
            <p className="text-primary-700 leading-relaxed">{report.interpretacion_general}</p>
          </div>

          {/* Info del Dataset */}
          <div className="card" data-teaching-id="report-dataset">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-secondary-800">Información del Dataset</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-secondary-800">
                  {report.info_dataset.n_muestras}
                </div>
                <div className="text-xs text-secondary-600">Muestras</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-secondary-800">
                  {report.info_dataset.n_variables_numericas}
                </div>
                <div className="text-xs text-secondary-600">Variables numéricas</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-secondary-800">
                  {report.info_dataset.variables_seleccionadas.length}
                </div>
                <div className="text-xs text-secondary-600">Variables analizadas</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-secondary-800">
                  {report.info_dataset.tiene_feedstock && report.info_dataset.tiene_concentration ? 2 :
                   report.info_dataset.tiene_feedstock || report.info_dataset.tiene_concentration ? 1 : 0}
                </div>
                <div className="text-xs text-secondary-600">Variables categóricas</div>
              </div>
            </div>
          </div>

          {/* PCA */}
          {report.pca_resumen && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-secondary-800">Análisis de Componentes Principales</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Varianza */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Varianza Explicada</h4>
                  <div className="space-y-2">
                    {report.pca_resumen.componentes_importantes.map((comp) => (
                      <div key={comp.nombre} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-secondary-600 w-12">{comp.nombre}</span>
                        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500"
                            style={{ width: `${comp.varianza}%` }}
                          />
                        </div>
                        <span className="text-sm text-secondary-600 w-16 text-right">
                          {comp.varianza.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-secondary-500 mt-2">
                    Varianza total: {report.pca_resumen.varianza_total.toFixed(1)}%
                  </p>
                </div>

                {/* Top loadings */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Variables más influyentes</h4>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-secondary-500 mb-1">PC1:</p>
                      <div className="flex flex-wrap gap-1">
                        {report.pca_resumen.top_loadings_pc1.map((item) => (
                          <span
                            key={item.variable}
                            className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs"
                          >
                            {item.variable} ({item.loading > 0 ? '+' : ''}{item.loading.toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </div>
                    {report.pca_resumen.top_loadings_pc2.length > 0 && (
                      <div>
                        <p className="text-xs text-secondary-500 mb-1">PC2:</p>
                        <div className="flex flex-wrap gap-1">
                          {report.pca_resumen.top_loadings_pc2.map((item) => (
                            <span
                              key={item.variable}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                            >
                              {item.variable} ({item.loading > 0 ? '+' : ''}{item.loading.toFixed(2)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {report.interpretacion_pca && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">{report.interpretacion_pca}</p>
                </div>
              )}
            </div>
          )}

          {/* Diagnósticos PCA */}
          {report.diagnosticos_resumen && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-secondary-800">Diagnósticos PCA (T² y Q-residuales)</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Tabla de métricas */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Métricas de Diagnóstico</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-red-800">Métrica</th>
                          <th className="px-3 py-2 text-right text-red-800">Media</th>
                          <th className="px-3 py-2 text-right text-red-800">Límite 95%</th>
                          <th className="px-3 py-2 text-right text-red-800">Outliers</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="px-3 py-2 font-medium">Hotelling T²</td>
                          <td className="px-3 py-2 text-right">{report.diagnosticos_resumen.t2_media.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{report.diagnosticos_resumen.t2_limit_95.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{report.diagnosticos_resumen.n_outliers_t2}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">Q-residuales</td>
                          <td className="px-3 py-2 text-right">{report.diagnosticos_resumen.q_media.toFixed(4)}</td>
                          <td className="px-3 py-2 text-right">{report.diagnosticos_resumen.q_limit_95.toFixed(4)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{report.diagnosticos_resumen.n_outliers_q}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Resumen de outliers */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-3">Outliers Combinados</h4>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{report.diagnosticos_resumen.n_outliers_combinados}</div>
                    <div className="text-sm text-red-700">muestras ({report.diagnosticos_resumen.porcentaje_outliers.toFixed(1)}%)</div>
                  </div>
                  <p className="text-xs text-red-600 mt-3">
                    Muestras que exceden simultáneamente los límites de T² y Q al 95% de confianza.
                  </p>
                </div>
              </div>

              {report.interpretacion_diagnosticos && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">{report.interpretacion_diagnosticos}</p>
                </div>
              )}
            </div>
          )}

          {/* Auto-Optimización */}
          {report.optimizacion_resumen && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-secondary-800">Auto-Optimización de Componentes</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Recomendación */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Recomendación</h4>
                  <div className="text-center mb-3">
                    <div className="text-4xl font-bold text-green-600">{report.optimizacion_resumen.componentes_recomendados}</div>
                    <div className="text-sm text-green-700">componentes principales</div>
                    <div className="text-xs text-green-600 mt-1">
                      ({report.optimizacion_resumen.varianza_recomendada.toFixed(1)}% varianza explicada)
                    </div>
                  </div>
                  <p className="text-xs text-green-700 text-center">{report.optimizacion_resumen.motivo_recomendacion}</p>
                </div>

                {/* Criterios */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Criterios de Decisión</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-secondary-600">Por varianza (90%)</span>
                      <span className="font-semibold">k = {report.optimizacion_resumen.k_por_varianza}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-secondary-600">Método del codo</span>
                      <span className="font-semibold">k = {report.optimizacion_resumen.k_por_codo}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-secondary-600">Por significancia (&gt;5%)</span>
                      <span className="font-semibold">k = {report.optimizacion_resumen.k_por_significancia}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualización Avanzada */}
          {report.visualizacion_resumen && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-secondary-800">Visualización Avanzada</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Visualización 3D */}
                <div className={`p-4 rounded-lg ${report.visualizacion_resumen.tiene_3d ? 'bg-purple-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Box className={`w-5 h-5 ${report.visualizacion_resumen.tiene_3d ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="font-medium">Visualización 3D</span>
                  </div>
                  {report.visualizacion_resumen.tiene_3d ? (
                    <>
                      <p className="text-sm text-purple-700">Disponible con 3 componentes principales</p>
                      {report.visualizacion_resumen.varianza_3d && (
                        <p className="text-xs text-purple-600 mt-1">
                          Varianza explicada (PC1+PC2+PC3): {report.visualizacion_resumen.varianza_3d.toFixed(1)}%
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Requiere al menos 3 componentes</p>
                  )}
                </div>

                {/* Métodos disponibles */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Métodos de Reducción</h4>
                  <div className="flex flex-wrap gap-2">
                    {report.visualizacion_resumen.metodos_disponibles.map((metodo) => (
                      <span key={metodo} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        {metodo}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clustering */}
          {report.clustering_resumen && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full border-2 border-primary-600 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-600" />
                </div>
                <h3 className="font-semibold text-secondary-800">Análisis de Clustering</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-secondary-600 mb-3">
                    Método: <span className="font-medium">{report.clustering_resumen.metodo.toUpperCase()}</span>
                    {report.clustering_resumen.silhouette_score && (
                      <> | Silhouette: <span className="font-medium">{report.clustering_resumen.silhouette_score.toFixed(3)}</span></>
                    )}
                  </p>

                  <div className="space-y-2">
                    {report.clustering_resumen.estadisticas.map((est) => (
                      <div key={est.cluster_id} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-secondary-600 w-20">
                          Grupo {est.cluster_id + 1}
                        </span>
                        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${est.porcentaje}%` }}
                          />
                        </div>
                        <span className="text-sm text-secondary-600 w-24 text-right">
                          {est.tamano} ({est.porcentaje.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {report.interpretacion_clustering && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-800">{report.interpretacion_clustering}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clasificadores */}
          {report.classifier_resumen && report.classifier_resumen.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-secondary-800">Clasificadores Supervisados</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {report.classifier_resumen.map((clf) => (
                  <div key={clf.target} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-secondary-800 capitalize">
                        {clf.target === 'feedstock' ? 'Materia Prima' : 'Concentración'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">
                        {clf.modelo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center mb-3">
                      <div className="bg-white p-2 rounded">
                        <div className="text-lg font-bold text-green-600">
                          {(clf.accuracy * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-secondary-500">Accuracy</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <div className="text-lg font-bold text-blue-600">
                          {(clf.f1_score * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-secondary-500">F1-Score</div>
                      </div>
                    </div>

                    <div className="text-xs text-secondary-600">
                      Variables importantes: {clf.mejores_variables.join(', ')}
                    </div>
                  </div>
                ))}
              </div>

              {report.interpretacion_clasificador && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">{report.interpretacion_clasificador}</p>
                </div>
              )}
            </div>
          )}

          {/* Notas finales */}
          <div className="card bg-gray-50">
            <h4 className="font-medium text-secondary-700 mb-2">Notas del Reporte</h4>
            <ul className="text-sm text-secondary-600 space-y-1">
              <li>• Este reporte fue generado automáticamente por Chemometrics Helper.</li>
              <li>• Los resultados deben ser interpretados en el contexto de tus datos experimentales.</li>
              <li>• Para más detalles sobre los análisis, consulta la página de Ayuda.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
