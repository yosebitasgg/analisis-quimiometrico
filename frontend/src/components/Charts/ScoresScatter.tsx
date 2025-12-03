import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend
} from 'recharts';
import {
  ScoreRow,
  ChartSettings,
  COLOR_PALETTES,
  FEEDSTOCK_LABELS,
  CONCENTRATION_LABELS
} from '../../types';

interface Props {
  scores: ScoreRow[];
  xAxis: string;
  yAxis: string;
  feedstock: number[] | null;
  concentration: number[] | null;
  clusterLabels: number[] | null;
  settings: ChartSettings;
}

interface DataPoint {
  x: number;
  y: number;
  index: number;
  feedstock?: number;
  concentration?: number;
  cluster?: number;
  feedstockLabel?: string;
  concentrationLabel?: string;
}

export default function ScoresScatter({
  scores,
  xAxis,
  yAxis,
  feedstock,
  concentration,
  clusterLabels,
  settings
}: Props) {
  // Preparar datos agrupados por categoría
  const { groupedData, categories } = useMemo(() => {
    const data: DataPoint[] = scores.map((score, i) => ({
      x: score[xAxis],
      y: score[yAxis],
      index: i,
      feedstock: feedstock?.[i],
      concentration: concentration?.[i],
      cluster: clusterLabels?.[i],
      feedstockLabel: feedstock?.[i] ? FEEDSTOCK_LABELS[feedstock[i]] : undefined,
      concentrationLabel: concentration?.[i] ? CONCENTRATION_LABELS[concentration[i]] : undefined,
    }));

    // Agrupar por categoría seleccionada
    const groups: Record<string, DataPoint[]> = {};

    if (settings.colorBy === 'none') {
      groups['Todas las muestras'] = data;
    } else {
      data.forEach(point => {
        let key: string;
        switch (settings.colorBy) {
          case 'feedstock':
            key = point.feedstockLabel || 'Sin feedstock';
            break;
          case 'concentration':
            key = point.concentrationLabel || 'Sin concentration';
            break;
          case 'cluster':
            key = point.cluster !== undefined ? `Clúster ${point.cluster}` : 'Sin clúster';
            break;
          default:
            key = 'Todas';
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(point);
      });
    }

    return {
      groupedData: groups,
      categories: Object.keys(groups)
    };
  }, [scores, xAxis, yAxis, feedstock, concentration, clusterLabels, settings.colorBy]);

  const colors = COLOR_PALETTES[settings.palette];

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
        <p className="font-medium text-secondary-800">Muestra #{data.index}</p>
        <p className="text-secondary-600">{xAxis}: {data.x.toFixed(3)}</p>
        <p className="text-secondary-600">{yAxis}: {data.y.toFixed(3)}</p>
        {data.feedstockLabel && (
          <p className="text-secondary-600">Feedstock: {data.feedstockLabel}</p>
        )}
        {data.concentrationLabel && (
          <p className="text-secondary-600">Concentración: {data.concentrationLabel}</p>
        )}
        {data.cluster !== undefined && (
          <p className="text-secondary-600">Clúster: {data.cluster}</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={xAxis}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{
              value: xAxis,
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 12, fill: '#64748b' }
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yAxis}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{
              value: yAxis,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#64748b' }
            }}
          />
          <ZAxis range={[settings.pointSize * 20, settings.pointSize * 20]} />
          <Tooltip content={<CustomTooltip />} />
          {categories.length > 1 && (
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          )}
          {categories.map((category, idx) => (
            <Scatter
              key={category}
              name={category}
              data={groupedData[category]}
              fill={colors[idx % colors.length]}
              fillOpacity={settings.opacity}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
