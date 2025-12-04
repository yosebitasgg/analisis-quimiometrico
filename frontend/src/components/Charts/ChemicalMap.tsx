/**
 * ChemicalMap.tsx
 * Mapa químico 2D con proyección PCA/UMAP/t-SNE, clusters y outliers
 */

import { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import {
  ChemicalMapResponse,
  COLOR_PALETTES,
  FEEDSTOCK_LABELS,
  CONCENTRATION_LABELS
} from '../../types';

interface Props {
  data: ChemicalMapResponse;
  colorBy?: 'feedstock' | 'concentration' | 'cluster';
  highlightOutliers?: boolean;
  onSampleSelect?: (sampleIndex: number) => void;
  selectedSample?: number | null;
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  pointSize?: number;
}

interface DataPoint {
  id: number;
  x: number;
  y: number;
  feedstock: number | null;
  concentration: number | null;
  cluster: number | null;
  esOutlier: boolean;
  categoryValue: number | null;
  categoryLabel: string;
}

export default function ChemicalMap({
  data,
  colorBy = 'cluster',
  highlightOutliers = true,
  onSampleSelect,
  selectedSample,
  palette = 'default',
  pointSize = 7
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const colors = COLOR_PALETTES[palette];

  // Preparar datos agrupados por categoría
  const getCategoryInfo = (point: typeof data.puntos[0]): { value: number | null; label: string } => {
    switch (colorBy) {
      case 'feedstock':
        return {
          value: point.feedstock,
          label: point.feedstock !== null
            ? (FEEDSTOCK_LABELS[point.feedstock] || `Feedstock ${point.feedstock}`)
            : 'Sin feedstock'
        };
      case 'concentration':
        return {
          value: point.concentration,
          label: point.concentration !== null
            ? (CONCENTRATION_LABELS[point.concentration] || `Conc. ${point.concentration}`)
            : 'Sin concentración'
        };
      case 'cluster':
      default:
        return {
          value: point.cluster,
          label: point.cluster !== null ? `Cluster ${point.cluster}` : 'Sin cluster'
        };
    }
  };

  // Agrupar puntos por categoría para la leyenda
  const groupedData = new Map<string, DataPoint[]>();

  data.puntos.forEach(point => {
    const { value, label } = getCategoryInfo(point);
    const dataPoint: DataPoint = {
      id: point.id,
      x: point.x,
      y: point.y,
      feedstock: point.feedstock,
      concentration: point.concentration,
      cluster: point.cluster,
      esOutlier: point.es_outlier,
      categoryValue: value,
      categoryLabel: label
    };

    if (!groupedData.has(label)) {
      groupedData.set(label, []);
    }
    groupedData.get(label)!.push(dataPoint);
  });

  // Obtener color del punto
  const getPointColor = (point: DataPoint, groupIndex: number): string => {
    if (selectedSample === point.id) {
      return '#f97316'; // Naranja para seleccionado
    }
    if (highlightOutliers && point.esOutlier) {
      return '#ef4444'; // Rojo para outliers
    }
    return colors[groupIndex % colors.length];
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: DataPoint }>
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-semibold text-secondary-800">Muestra #{point.id}</p>
        <p className="text-secondary-600">{data.ejes.x}: {point.x.toFixed(3)}</p>
        <p className="text-secondary-600">{data.ejes.y}: {point.y.toFixed(3)}</p>
        {point.feedstock !== null && (
          <p className="text-secondary-600">
            Feedstock: {FEEDSTOCK_LABELS[point.feedstock] || point.feedstock}
          </p>
        )}
        {point.concentration !== null && (
          <p className="text-secondary-600">
            Concentración: {CONCENTRATION_LABELS[point.concentration] || point.concentration}
          </p>
        )}
        {point.cluster !== null && (
          <p className="text-secondary-600">Cluster: {point.cluster}</p>
        )}
        {point.esOutlier && (
          <p className="text-red-600 font-medium mt-1">⚠️ Outlier detectado</p>
        )}
      </div>
    );
  };

  // Convertir Map a array para renderizar
  const groupsArray = Array.from(groupedData.entries());

  return (
    <div className="w-full">
      {/* Info del método usado */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
            {data.metodo}
          </span>
          <span className="text-xs text-secondary-500">
            {data.n_muestras} muestras
          </span>
        </div>
        {data.varianza && (
          <span className="text-xs text-secondary-500">
            Varianza: {data.varianza.dim1?.toFixed(1)}% + {data.varianza.dim2?.toFixed(1)}%
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="x"
            name={data.ejes.x}
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{
              value: data.ejes.x,
              position: 'bottom',
              offset: 20,
              fill: '#64748b',
              fontSize: 12
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.ejes.y}
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{
              value: data.ejes.y,
              angle: -90,
              position: 'insideLeft',
              offset: -10,
              fill: '#64748b',
              fontSize: 12
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 10 }}
          />

          {/* Renderizar cada grupo */}
          {groupsArray.map(([label, points], groupIndex) => (
            <Scatter
              key={label}
              name={label}
              data={points}
              onClick={(e) => onSampleSelect?.(e.id)}
              onMouseEnter={(e) => setHoveredPoint(e.id)}
              onMouseLeave={() => setHoveredPoint(null)}
              cursor="pointer"
            >
              {points.map((point) => (
                <Cell
                  key={point.id}
                  fill={getPointColor(point, groupIndex)}
                  stroke={
                    selectedSample === point.id
                      ? '#000'
                      : hoveredPoint === point.id
                      ? '#333'
                      : point.esOutlier && highlightOutliers
                      ? '#b91c1c'
                      : 'none'
                  }
                  strokeWidth={selectedSample === point.id ? 2 : 1}
                  r={point.esOutlier && highlightOutliers ? pointSize + 2 : pointSize}
                  opacity={point.esOutlier ? 0.9 : 0.7}
                />
              ))}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Estadísticas */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-secondary-500">Método</p>
          <p className="font-semibold text-secondary-800">{data.metodo}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-secondary-500">Muestras</p>
          <p className="font-semibold text-secondary-800">{data.n_muestras}</p>
        </div>
        {data.tiene_clusters && (
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-secondary-500">Clusters</p>
            <p className="font-semibold text-blue-700">
              {new Set(data.puntos.map(p => p.cluster).filter(c => c !== null)).size}
            </p>
          </div>
        )}
        {data.outliers.length > 0 && (
          <div className="bg-red-50 rounded-lg p-2">
            <p className="text-secondary-500">Outliers</p>
            <p className="font-semibold text-red-600">{data.outliers.length}</p>
          </div>
        )}
      </div>

      {/* Leyenda de outliers */}
      {highlightOutliers && data.outliers.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Outliers detectados:</strong> Muestras #{data.outliers.join(', #')}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Estas muestras presentan valores anómalos de T² y/o Q-residual.
          </p>
        </div>
      )}
    </div>
  );
}
