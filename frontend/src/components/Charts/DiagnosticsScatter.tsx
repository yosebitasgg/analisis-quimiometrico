/**
 * DiagnosticsScatter.tsx
 * Gráfico de dispersión T² vs Q-residuals para diagnóstico de outliers en PCA
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
  ReferenceLine,
  Cell
} from 'recharts';
import { PCADiagnosticsResponse, COLOR_PALETTES, FEEDSTOCK_LABELS, CONCENTRATION_LABELS } from '../../types';

interface Props {
  diagnostics: PCADiagnosticsResponse;
  onSampleSelect?: (sampleIndex: number) => void;
  selectedSample?: number | null;
  colorBy?: 'none' | 'feedstock' | 'concentration' | 'outlier';
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

interface DataPoint {
  id: number;
  t2: number;
  q: number;
  feedstock: number | null;
  concentration: number | null;
  isOutlierT2: boolean;
  isOutlierQ: boolean;
  isOutlierCombined: boolean;
}

export default function DiagnosticsScatter({
  diagnostics,
  onSampleSelect,
  selectedSample,
  colorBy = 'outlier',
  palette = 'default'
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Preparar datos
  const data: DataPoint[] = diagnostics.t2_values.map((t2, i) => ({
    id: i,
    t2,
    q: diagnostics.q_values[i],
    feedstock: diagnostics.feedstock?.[i] ?? null,
    concentration: diagnostics.concentration?.[i] ?? null,
    isOutlierT2: diagnostics.outliers_t2_95.includes(i),
    isOutlierQ: diagnostics.outliers_q_95.includes(i),
    isOutlierCombined: diagnostics.outliers_combinados.includes(i)
  }));

  const colors = COLOR_PALETTES[palette];

  // Función para obtener color del punto
  const getPointColor = (point: DataPoint): string => {
    if (selectedSample === point.id) {
      return '#f97316'; // Naranja para seleccionado
    }

    switch (colorBy) {
      case 'feedstock':
        return point.feedstock !== null ? colors[point.feedstock % colors.length] : colors[0];
      case 'concentration':
        return point.concentration !== null ? colors[point.concentration % colors.length] : colors[0];
      case 'outlier':
        if (point.isOutlierCombined) return '#ef4444'; // Rojo para outliers combinados
        if (point.isOutlierT2 || point.isOutlierQ) return '#f59e0b'; // Naranja para outliers parciales
        return colors[0]; // Color normal
      default:
        return colors[0];
    }
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-semibold text-secondary-800">Muestra #{point.id}</p>
        <p className="text-secondary-600">T²: {point.t2.toFixed(4)}</p>
        <p className="text-secondary-600">Q: {point.q.toFixed(6)}</p>
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
        {point.isOutlierCombined && (
          <p className="text-red-600 font-medium mt-1">⚠️ Outlier (T² y Q elevados)</p>
        )}
        {!point.isOutlierCombined && (point.isOutlierT2 || point.isOutlierQ) && (
          <p className="text-amber-600 font-medium mt-1">
            ⚠️ {point.isOutlierT2 ? 'T² elevado' : 'Q elevado'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="t2"
            name="T²"
            label={{ value: 'Hotelling T²', position: 'bottom', offset: 20, fill: '#64748b', fontSize: 12 }}
            tick={{ fontSize: 11, fill: '#64748b' }}
            domain={[0, 'auto']}
          />
          <YAxis
            type="number"
            dataKey="q"
            name="Q"
            label={{ value: 'Q-residual (SPE)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 12 }}
            tick={{ fontSize: 11, fill: '#64748b' }}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Líneas de umbral al 95% */}
          <ReferenceLine
            x={diagnostics.t2_limit_95}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ value: 'T² 95%', fill: '#ef4444', fontSize: 10, position: 'top' }}
          />
          <ReferenceLine
            y={diagnostics.q_limit_95}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ value: 'Q 95%', fill: '#ef4444', fontSize: 10, position: 'right' }}
          />

          {/* Puntos */}
          <Scatter
            name="Muestras"
            data={data}
            onClick={(e) => onSampleSelect?.(e.id)}
            onMouseEnter={(e) => setHoveredPoint(e.id)}
            onMouseLeave={() => setHoveredPoint(null)}
            cursor="pointer"
          >
            {data.map((point) => (
              <Cell
                key={point.id}
                fill={getPointColor(point)}
                stroke={selectedSample === point.id ? '#000' : hoveredPoint === point.id ? '#333' : 'none'}
                strokeWidth={selectedSample === point.id ? 2 : 1}
                r={point.isOutlierCombined ? 8 : point.isOutlierT2 || point.isOutlierQ ? 6 : 5}
                opacity={0.8}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Leyenda y estadísticas */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-secondary-500">Muestras totales</p>
          <p className="text-lg font-semibold text-secondary-800">{diagnostics.n_muestras}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <p className="text-secondary-500">Outliers T²</p>
          <p className="text-lg font-semibold text-red-600">{diagnostics.estadisticas.n_outliers_t2}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <p className="text-secondary-500">Outliers Q</p>
          <p className="text-lg font-semibold text-amber-600">{diagnostics.estadisticas.n_outliers_q}</p>
        </div>
        <div className="bg-red-100 rounded-lg p-2">
          <p className="text-secondary-500">Outliers combinados</p>
          <p className="text-lg font-semibold text-red-700">{diagnostics.estadisticas.n_outliers_combinados}</p>
        </div>
      </div>
    </div>
  );
}
