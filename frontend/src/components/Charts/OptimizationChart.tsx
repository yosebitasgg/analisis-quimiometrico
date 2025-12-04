/**
 * OptimizationChart.tsx
 * Gráfico de líneas para varianza explicada y error de reconstrucción vs número de PCs
 */

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { PCAOptimizationResponse, COLOR_PALETTES } from '../../types';
import { Sparkles } from 'lucide-react';

interface Props {
  optimization: PCAOptimizationResponse;
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export default function OptimizationChart({ optimization, palette = 'default' }: Props) {
  const colors = COLOR_PALETTES[palette];

  // Preparar datos para el gráfico
  const data = optimization.resultados.map(r => ({
    k: r.k,
    varianzaIndividual: r.varianza_individual,
    varianzaAcumulada: r.varianza_acumulada,
    errorNormalizado: r.error_normalizado,
    esRecomendado: r.k === optimization.componentes_recomendados
  }));

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const isRecommended = label === optimization.componentes_recomendados;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-semibold text-secondary-800 flex items-center gap-1">
          {label} componentes
          {isRecommended && <Sparkles className="w-4 h-4 text-green-500" />}
        </p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(1)}%
          </p>
        ))}
        {isRecommended && (
          <p className="text-green-600 font-medium mt-1 text-xs">
            ⭐ Recomendado
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Gráfico principal */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="k"
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'Número de componentes (k)', position: 'bottom', offset: 20, fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'Varianza explicada (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
            domain={[0, 100]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'Error normalizado (%)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />

          {/* Línea de referencia para el k recomendado */}
          <ReferenceLine
            x={optimization.componentes_recomendados}
            yAxisId="left"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `k=${optimization.componentes_recomendados}`,
              fill: '#22c55e',
              fontSize: 11,
              position: 'top'
            }}
          />

          {/* Área de varianza individual (barras) */}
          <Bar
            yAxisId="left"
            dataKey="varianzaIndividual"
            name="Varianza individual"
            fill={colors[0]}
            opacity={0.6}
            radius={[4, 4, 0, 0]}
          />

          {/* Línea de varianza acumulada */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="varianzaAcumulada"
            name="Varianza acumulada"
            stroke={colors[1] || '#f59e0b'}
            strokeWidth={3}
            dot={{ fill: colors[1] || '#f59e0b', r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Línea de error de reconstrucción */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="errorNormalizado"
            name="Error de reconstrucción"
            stroke={colors[2] || '#ef4444'}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: colors[2] || '#ef4444', r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Recomendación destacada */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">
              Recomendación: {optimization.componentes_recomendados} componentes principales
            </p>
            <p className="text-sm text-green-700 mt-1">
              {optimization.motivo_recomendacion}
            </p>
            <p className="text-xs text-green-600 mt-2">
              Varianza explicada: {optimization.varianza_recomendada.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Criterios de decisión */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-secondary-500">Por varianza ({(optimization.criterios.umbral_varianza_usado * 100).toFixed(0)}%)</p>
          <p className="text-lg font-semibold text-secondary-800">k = {optimization.criterios.k_por_varianza}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-secondary-500">Por método del codo</p>
          <p className="text-lg font-semibold text-secondary-800">k = {optimization.criterios.k_por_codo}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-secondary-500">Por significancia</p>
          <p className="text-lg font-semibold text-secondary-800">k = {optimization.criterios.k_por_significancia}</p>
        </div>
      </div>
    </div>
  );
}
