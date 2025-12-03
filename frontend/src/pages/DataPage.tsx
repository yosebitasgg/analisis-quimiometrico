import { Database, Table2 } from 'lucide-react';
import { AppState, DataInfo, FEEDSTOCK_LABELS, CONCENTRATION_LABELS } from '../types';

interface Props {
  appState: AppState;
  dataInfo: DataInfo | null;
}

export default function DataPage({ appState, dataInfo }: Props) {
  if (!appState.dataLoaded || !dataInfo) {
    return (
      <div className="card max-w-2xl mx-auto text-center py-12">
        <Database className="w-16 h-16 mx-auto mb-4 text-secondary-300" />
        <h2 className="text-xl font-semibold text-secondary-700 mb-2">
          No hay datos cargados
        </h2>
        <p className="text-secondary-500">
          Ve a la pestaña "Análisis" para cargar un archivo de datos o usar el dataset de ejemplo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Database className="w-6 h-6 text-primary-600" />
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">Explorador de Datos</h1>
            <p className="text-secondary-500">Visualiza la estructura y contenido del dataset</p>
          </div>
        </div>
      </div>

      {/* Resumen del dataset */}
      <div className="card" data-teaching-id="data-summary">
        <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-600" />
          Resumen del Dataset
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-primary-700">{dataInfo.num_filas}</p>
            <p className="text-sm text-primary-600">Filas (muestras)</p>
          </div>
          <div className="bg-primary-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-primary-700">{dataInfo.num_columnas}</p>
            <p className="text-sm text-primary-600">Columnas totales</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-blue-700">{dataInfo.columnas_numericas.length}</p>
            <p className="text-sm text-blue-600">Variables numéricas</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-3xl font-bold text-amber-700">{dataInfo.columnas_categoricas.length}</p>
            <p className="text-sm text-amber-600">Variables categóricas</p>
          </div>
        </div>
      </div>

      {/* Información de columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-teaching-id="data-columns">
        {/* Columnas numéricas */}
        <div className="card">
          <h3 className="text-base font-semibold text-secondary-800 mb-3">
            Variables Numéricas
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dataInfo.columnas_numericas.map((col, i) => {
              const info = dataInfo.columnas_info.find(c => c.nombre === col);
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-secondary-700">{col}</span>
                  <span className="text-xs text-secondary-500">
                    {info?.valores_unicos} valores únicos
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columnas categóricas */}
        <div className="card">
          <h3 className="text-base font-semibold text-secondary-800 mb-3">
            Variables Categóricas
          </h3>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {dataInfo.columnas_categoricas.map((col, i) => {
              const colLower = col.toLowerCase();
              const info = dataInfo.columnas_info.find(c => c.nombre === col);

              // Mostrar etiquetas especiales para feedstock y concentration
              let labels: Record<number, string> | null = null;
              let values: number[] | null = null;

              if (colLower === 'feedstock') {
                labels = FEEDSTOCK_LABELS;
                values = dataInfo.feedstock_valores;
              } else if (colLower === 'concentration') {
                labels = CONCENTRATION_LABELS;
                values = dataInfo.concentration_valores;
              }

              return (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-secondary-700">{col}</span>
                    <span className="text-xs text-secondary-500">
                      {info?.valores_unicos} categorías
                    </span>
                  </div>

                  {labels && values && (
                    <div className="flex flex-wrap gap-1">
                      {values.map(v => (
                        <span
                          key={v}
                          className="text-xs px-2 py-1 bg-white rounded border border-gray-200"
                        >
                          {v}: {labels[v] || 'Desconocido'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vista previa de datos */}
      <div className="card" data-teaching-id="data-preview">
        <h3 className="text-base font-semibold text-secondary-800 mb-3 flex items-center gap-2">
          <Table2 className="w-5 h-5 text-primary-600" />
          Vista Previa (primeras 10 filas)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 text-secondary-600 font-medium">#</th>
                {Object.keys(dataInfo.muestra_datos[0] || {}).map((col, i) => (
                  <th key={i} className="text-left py-2 px-3 text-secondary-600 font-medium whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataInfo.muestra_datos.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-secondary-400">{i + 1}</td>
                  {Object.values(row).map((value, j) => (
                    <td key={j} className="py-2 px-3 whitespace-nowrap">
                      {typeof value === 'number'
                        ? value.toFixed ? value.toFixed(4) : value
                        : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
