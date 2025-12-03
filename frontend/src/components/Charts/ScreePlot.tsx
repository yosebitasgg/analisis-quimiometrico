import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend
} from 'recharts';
import { VarianzaComponente } from '../../types';

interface Props {
  data: VarianzaComponente[];
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export default function ScreePlot({ data, palette = 'default' }: Props) {
  // Color schemes for different palettes
  const colorSchemes = {
    default: { barColor: '#0658a6', lineColor: '#f59e0b' },
    protanopia: { barColor: '#0658a6', lineColor: '#fbbf24' },
    deuteranopia: { barColor: '#0658a6', lineColor: '#d97706' },
    tritanopia: { barColor: '#06b6d4', lineColor: '#d946ef' }
  };

  const colors = colorSchemes[palette];

  // Preparar datos para el gráfico
  const chartData = data.map(d => ({
    name: d.componente,
    varianza: parseFloat(d.varianza_explicada.toFixed(2)),
    acumulada: parseFloat(d.varianza_acumulada.toFixed(2)),
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{
              value: 'Varianza explicada (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#64748b' }
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{
              value: 'Acumulada (%)',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: 12, fill: '#64748b' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2)}%`,
              name === 'varianza' ? 'Varianza individual' : 'Varianza acumulada'
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Bar
            yAxisId="left"
            dataKey="varianza"
            name="Varianza individual"
            fill={colors.barColor}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="acumulada"
            name="Varianza acumulada"
            stroke={colors.lineColor}
            strokeWidth={2}
            dot={{ fill: colors.lineColor, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
