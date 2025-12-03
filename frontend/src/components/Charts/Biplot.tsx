import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Legend,
  Customized
} from 'recharts';
import { ScoreRow, LoadingRow, ChartSettings, COLOR_PALETTES } from '../../types';

interface Props {
  scores: ScoreRow[];
  loadings: LoadingRow[];
  xAxis: string;
  yAxis: string;
  settings: ChartSettings;
  clusterLabels?: number[] | null;
}

interface ScorePoint {
  x: number;
  y: number;
  index: number;
  type: 'score';
  cluster?: number;
}

interface ScaledLoading {
  x: number;
  y: number;
  variable: string;
  originalX: number;
  originalY: number;
}

export default function Biplot({
  scores,
  loadings,
  xAxis,
  yAxis,
  settings,
  clusterLabels
}: Props) {
  // Preparar datos
  const { scoreData, loadingData, domain } = useMemo(() => {
    // Scores
    const scorePoints: ScorePoint[] = scores.map((score, i) => ({
      x: score[xAxis],
      y: score[yAxis],
      index: i,
      type: 'score' as const,
      cluster: clusterLabels?.[i]
    }));

    // Calcular factor de escala para loadings
    const maxScoreX = Math.max(...scorePoints.map(p => Math.abs(p.x)));
    const maxScoreY = Math.max(...scorePoints.map(p => Math.abs(p.y)));
    const maxScore = Math.max(maxScoreX, maxScoreY);

    const loadingPoints = loadings.map(loading => ({
      x: loading[xAxis] as number,
      y: loading[yAxis] as number,
      variable: loading.variable as string
    }));

    const maxLoadingX = Math.max(...loadingPoints.map(p => Math.abs(p.x)));
    const maxLoadingY = Math.max(...loadingPoints.map(p => Math.abs(p.y)));
    const maxLoading = Math.max(maxLoadingX, maxLoadingY);

    const scale = maxLoading > 0 ? (maxScore / maxLoading) * 0.8 : 1;

    // Escalar loadings
    const scaledLoadings: ScaledLoading[] = loadingPoints.map(p => ({
      x: p.x * scale,
      y: p.y * scale,
      variable: p.variable,
      originalX: p.x,
      originalY: p.y
    }));

    // Calcular dominio para los ejes
    const allX = [...scorePoints.map(p => p.x), ...scaledLoadings.map(p => p.x), 0];
    const allY = [...scorePoints.map(p => p.y), ...scaledLoadings.map(p => p.y), 0];
    const maxDomain = Math.max(
      Math.abs(Math.min(...allX)),
      Math.abs(Math.max(...allX)),
      Math.abs(Math.min(...allY)),
      Math.abs(Math.max(...allY))
    ) * 1.2;

    return {
      scoreData: scorePoints,
      loadingData: scaledLoadings,
      domain: [-maxDomain, maxDomain] as [number, number]
    };
  }, [scores, loadings, xAxis, yAxis, clusterLabels]);

  // Agrupar scores por clúster si aplica
  const groupedScores = useMemo(() => {
    if (settings.colorBy !== 'cluster' || !clusterLabels) {
      return { 'Muestras': scoreData };
    }

    const groups: Record<string, ScorePoint[]> = {};
    scoreData.forEach(point => {
      const key = point.cluster !== undefined ? `Clúster ${point.cluster}` : 'Sin clúster';
      if (!groups[key]) groups[key] = [];
      groups[key].push(point);
    });

    return groups;
  }, [scoreData, settings.colorBy, clusterLabels]);

  const colors = COLOR_PALETTES[settings.palette];

  // Componente para renderizar flechas
  const renderArrows = (props: { xAxisMap?: Record<string, { scale: (val: number) => number }>; yAxisMap?: Record<string, { scale: (val: number) => number }> }) => {
    const { xAxisMap, yAxisMap } = props;
    const xScale = xAxisMap?.['0']?.scale;
    const yScale = yAxisMap?.['0']?.scale;

    if (!xScale || !yScale) return null;

    return (
      <g className="loading-arrows">
        {loadingData.map((loading, i) => {
          const x1 = xScale(0);
          const y1 = yScale(0);
          const x2 = xScale(loading.x);
          const y2 = yScale(loading.y);

          // Calcular ángulo para la punta de flecha
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowLength = 10;

          // Puntos de la punta de flecha
          const arrowX1 = x2 - arrowLength * Math.cos(angle - Math.PI / 7);
          const arrowY1 = y2 - arrowLength * Math.sin(angle - Math.PI / 7);
          const arrowX2 = x2 - arrowLength * Math.cos(angle + Math.PI / 7);
          const arrowY2 = y2 - arrowLength * Math.sin(angle + Math.PI / 7);

          // Posición del texto (un poco alejado de la punta)
          const textOffset = 12;
          const textX = x2 + textOffset * Math.cos(angle);
          const textY = y2 + textOffset * Math.sin(angle);

          return (
            <g key={i}>
              {/* Línea de la flecha */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#dc2626"
                strokeWidth={2.5}
              />
              {/* Punta de flecha */}
              <polygon
                points={`${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
                fill="#dc2626"
              />
              {/* Etiqueta de la variable */}
              <text
                x={textX}
                y={textY}
                fill="#991b1b"
                fontSize={11}
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {loading.variable}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // Tooltip para scores
  const ScoreTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScorePoint }> }) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-xs">
        <p className="font-medium">Muestra #{data.index}</p>
        <p>{xAxis}: {data.x.toFixed(3)}</p>
        <p>{yAxis}: {data.y.toFixed(3)}</p>
        {data.cluster !== undefined && <p>Clúster: {data.cluster}</p>}
      </div>
    );
  };

  const groupKeys = Object.keys(groupedScores);

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            domain={domain}
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
            domain={domain}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{
              value: yAxis,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#64748b' }
            }}
          />
          <ZAxis range={[settings.pointSize * 15, settings.pointSize * 15]} />
          <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <Tooltip content={<ScoreTooltip />} />
          {groupKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}

          {/* Scores */}
          {groupKeys.map((key, idx) => (
            <Scatter
              key={key}
              name={key}
              data={groupedScores[key]}
              fill={colors[idx % colors.length]}
              fillOpacity={settings.opacity}
            />
          ))}

          {/* Flechas de loadings usando Customized */}
          <Customized component={renderArrows} />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Leyenda de variables */}
      <div className="mt-2 flex flex-wrap gap-2 justify-center text-xs">
        <span className="text-secondary-500 font-medium">Flechas rojas = Variables:</span>
        {loadingData.map((l, i) => (
          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200">
            {l.variable}
          </span>
        ))}
      </div>
    </div>
  );
}
