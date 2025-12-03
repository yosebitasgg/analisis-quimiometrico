import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line
} from 'recharts';
import { SilhouetteResult } from '../../types';

type ColorPalette = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';

// Colorblind-friendly color palettes
const COLOR_PALETTES = {
  default: {
    primary: '#0658a6',
    primaryDark: '#054a8c',
    clusters: ['#0658a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ec4899'],
    reference: '#dc2626'
  },
  protanopia: {
    primary: '#0173B2',
    primaryDark: '#015A8C',
    clusters: ['#0173B2', '#ECE133', '#56B4E9', '#029E73', '#CC78BC', '#CA9161', '#F0E442', '#D55E00'],
    reference: '#D55E00'
  },
  deuteranopia: {
    primary: '#0173B2',
    primaryDark: '#015A8C',
    clusters: ['#0173B2', '#ECE133', '#56B4E9', '#029E73', '#CC78BC', '#CA9161', '#F0E442', '#D55E00'],
    reference: '#D55E00'
  },
  tritanopia: {
    primary: '#C1272D',
    primaryDark: '#9A1F24',
    clusters: ['#C1272D', '#0072B2', '#F0E442', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#D55E00'],
    reference: '#0072B2'
  }
};

interface SilhouetteByKProps {
  data: SilhouetteResult[];
  kOptimo: number | null;
  palette?: ColorPalette;
}

export function SilhouetteByK({ data, kOptimo, palette = 'default' }: SilhouetteByKProps) {
  const colors = COLOR_PALETTES[palette];

  const chartData = data.map(d => ({
    k: d.k,
    silhouette: parseFloat(d.silhouette.toFixed(4)),
    isOptimo: d.k === kOptimo,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="k"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{
              value: 'Número de clústeres (k)',
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 12, fill: '#64748b' }
            }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            domain={[0, 1]}
            label={{
              value: 'Silhouette Score',
              angle: -90,
              position: 'insideLeft',
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
            formatter={(value: number) => [value.toFixed(4), 'Silhouette']}
          />
          <Line
            type="monotone"
            dataKey="silhouette"
            stroke={colors.primary}
            strokeWidth={2}
            dot={(props: { cx: number; cy: number; payload: { isOptimo: boolean } }) => {
              const { cx, cy, payload } = props;
              if (payload.isOptimo) {
                return (
                  <g key={`dot-optimo-${cx}`}>
                    {/* Círculo exterior para destacar */}
                    <circle cx={cx} cy={cy} r={12} fill={colors.primary} fillOpacity={0.2} />
                    {/* Punto principal */}
                    <circle cx={cx} cy={cy} r={7} fill={colors.primary} stroke="#fff" strokeWidth={2} />
                  </g>
                );
              }
              return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={5} fill={colors.primary} />;
            }}
            activeDot={{ r: 7, fill: colors.primaryDark }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-secondary-500 text-center mt-4">
        Un mayor silhouette indica mejor separación entre clústeres.
        El valor óptimo de k maximiza este score.
      </p>
    </div>
  );
}

interface SilhouetteBarsProps {
  samples: Array<{ muestra: number; cluster: number; silhouette: number }>;
  scoreGlobal: number | null;
  palette?: ColorPalette;
}

export function SilhouetteBars({ samples, scoreGlobal, palette = 'default' }: SilhouetteBarsProps) {
  const colors = COLOR_PALETTES[palette];

  // Ordenar por clúster y luego por silhouette
  const sortedSamples = [...samples].sort((a, b) => {
    if (a.cluster !== b.cluster) return a.cluster - b.cluster;
    return b.silhouette - a.silhouette;
  });

  const chartData = sortedSamples.map((s, i) => ({
    index: i,
    muestra: s.muestra,
    cluster: s.cluster,
    silhouette: parseFloat(s.silhouette.toFixed(4)),
    fill: colors.clusters[s.cluster % colors.clusters.length]
  }));

  return (
    <div className="w-full">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              domain={[-0.5, 1]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              type="category"
              dataKey="index"
              tick={false}
              axisLine={{ stroke: '#cbd5e1' }}
              width={20}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '11px'
              }}
              formatter={(value: number, _name: string, props: { payload?: typeof chartData[0] }) => [
                value.toFixed(4),
                props.payload ? `Muestra ${props.payload.muestra} (Clúster ${props.payload.cluster})` : ''
              ]}
            />
            {scoreGlobal !== null && (
              <ReferenceLine
                x={scoreGlobal}
                stroke={colors.reference}
                strokeDasharray="5 5"
                label={{
                  value: `Promedio: ${scoreGlobal.toFixed(3)}`,
                  position: 'top',
                  fill: colors.reference,
                  fontSize: 10
                }}
              />
            )}
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Bar
              dataKey="silhouette"
              barSize={3}
            >
              {chartData.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda de clústeres */}
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {[...new Set(samples.map(s => s.cluster))].sort().map(cluster => (
          <span
            key={cluster}
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: colors.clusters[cluster % colors.clusters.length] + '20',
              color: colors.clusters[cluster % colors.clusters.length]
            }}
          >
            Clúster {cluster}
          </span>
        ))}
      </div>

      <p className="text-xs text-secondary-500 text-center mt-2">
        Valores positivos altos indican buena asignación al clúster.
        Valores negativos sugieren posible asignación incorrecta.
      </p>
    </div>
  );
}
