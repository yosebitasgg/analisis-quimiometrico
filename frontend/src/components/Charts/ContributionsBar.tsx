/**
 * ContributionsBar.tsx
 * Gráfico de barras horizontales para contribuciones de variables a T² o Q
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { PCAContributionsResponse, COLOR_PALETTES } from '../../types';

interface Props {
  contributions: PCAContributionsResponse;
  maxVariables?: number;
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export default function ContributionsBar({
  contributions,
  maxVariables = 15,
  palette = 'default'
}: Props) {
  const colors = COLOR_PALETTES[palette];

  // Tomar las primeras N variables (ya vienen ordenadas de mayor a menor)
  const data = contributions.contribuciones
    .slice(0, maxVariables)
    .map((c, i) => ({
      variable: c.variable,
      porcentaje: c.contribucion_porcentaje,
      valor: c.contribucion_valor,
      isTop5: i < 5
    }))
    .reverse(); // Invertir para que las más importantes queden arriba

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: { variable: string; porcentaje: number; valor: number } }>
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const item = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-semibold text-secondary-800">{item.variable}</p>
        <p className="text-secondary-600">
          Contribución: {item.porcentaje.toFixed(1)}%
        </p>
        <p className="text-secondary-500 text-xs">
          Valor absoluto: {item.valor.toFixed(6)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 25 + 60)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
          />
          <YAxis
            type="category"
            dataKey="variable"
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.variable}
                fill={entry.isTop5 ? colors[0] : `${colors[0]}80`}
                opacity={entry.isTop5 ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Interpretación */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Interpretación:</strong> {contributions.interpretacion}
        </p>
      </div>

      {/* Top 5 variables */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-secondary-500 mb-2">Variables más contribuyentes:</p>
        <div className="flex flex-wrap gap-2">
          {contributions.top_5_variables.map((variable, i) => (
            <span
              key={variable}
              className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-secondary-700"
            >
              {i + 1}. {variable}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
