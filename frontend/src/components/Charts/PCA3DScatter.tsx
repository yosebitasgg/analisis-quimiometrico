/**
 * PCA3DScatter.tsx
 * Gráfico de dispersión 3D para scores de PCA usando Plotly
 */

import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import {
  PCA3DResponse,
  COLOR_PALETTES,
  FEEDSTOCK_LABELS,
  CONCENTRATION_LABELS
} from '../../types';

interface Props {
  data: PCA3DResponse;
  colorBy?: 'none' | 'feedstock' | 'concentration' | 'cluster' | 'T2' | 'Q';
  showLoadings?: boolean;
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  pointSize?: number;
}

export default function PCA3DScatter({
  data,
  colorBy = 'feedstock',
  showLoadings = false,
  palette = 'default',
  pointSize = 6
}: Props) {
  const colors = COLOR_PALETTES[palette];

  // Preparar datos para Plotly
  const plotData = useMemo(() => {
    const traces: Plotly.Data[] = [];

    // Agrupar puntos por categoría si es necesario
    if (colorBy === 'none') {
      // Un solo trace sin agrupación
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        name: 'Muestras',
        x: data.puntos.map(p => p.PC1),
        y: data.puntos.map(p => p.PC2),
        z: data.puntos.map(p => p.PC3),
        text: data.puntos.map(p => {
          let text = `Muestra #${p.id}`;
          if (p.feedstock !== null) text += `<br>Feedstock: ${FEEDSTOCK_LABELS[p.feedstock] || p.feedstock}`;
          if (p.concentration !== null) text += `<br>Concentración: ${CONCENTRATION_LABELS[p.concentration] || p.concentration}`;
          if (p.cluster !== null) text += `<br>Cluster: ${p.cluster}`;
          if (p.T2 !== null) text += `<br>T²: ${p.T2.toFixed(2)}`;
          if (p.Q !== null) text += `<br>Q: ${p.Q.toFixed(4)}`;
          return text;
        }),
        hoverinfo: 'text',
        marker: {
          size: pointSize,
          color: colors[0],
          opacity: 0.8,
          line: { color: 'rgba(0,0,0,0.2)', width: 0.5 }
        }
      } as Plotly.Data);
    } else if (colorBy === 'T2' || colorBy === 'Q') {
      // Colorear por escala continua (T² o Q)
      const values = colorBy === 'T2'
        ? data.puntos.map(p => p.T2 || 0)
        : data.puntos.map(p => p.Q || 0);

      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        name: colorBy === 'T2' ? 'T² (Hotelling)' : 'Q-residual',
        x: data.puntos.map(p => p.PC1),
        y: data.puntos.map(p => p.PC2),
        z: data.puntos.map(p => p.PC3),
        text: data.puntos.map((p, i) => {
          let text = `Muestra #${p.id}`;
          text += `<br>${colorBy}: ${values[i].toFixed(4)}`;
          if (p.feedstock !== null) text += `<br>Feedstock: ${FEEDSTOCK_LABELS[p.feedstock] || p.feedstock}`;
          return text;
        }),
        hoverinfo: 'text',
        marker: {
          size: pointSize,
          color: values,
          colorscale: 'RdYlBu',
          reversescale: true,
          colorbar: {
            title: colorBy === 'T2' ? 'Hotelling T²' : 'Q-residual',
            thickness: 15,
            len: 0.5
          },
          opacity: 0.8
        }
      } as Plotly.Data);
    } else {
      // Agrupar por categoría (feedstock, concentration, cluster)
      const groups = new Map<string, { label: string; points: typeof data.puntos }>();

      data.puntos.forEach(p => {
        let key: string;
        let label: string;

        switch (colorBy) {
          case 'feedstock':
            key = String(p.feedstock ?? 'Sin feedstock');
            label = p.feedstock !== null ? (FEEDSTOCK_LABELS[p.feedstock] || `Feedstock ${p.feedstock}`) : 'Sin feedstock';
            break;
          case 'concentration':
            key = String(p.concentration ?? 'Sin concentración');
            label = p.concentration !== null ? (CONCENTRATION_LABELS[p.concentration] || `Conc. ${p.concentration}`) : 'Sin concentración';
            break;
          case 'cluster':
            key = String(p.cluster ?? 'Sin cluster');
            label = p.cluster !== null ? `Cluster ${p.cluster}` : 'Sin cluster';
            break;
          default:
            key = 'all';
            label = 'Muestras';
        }

        if (!groups.has(key)) {
          groups.set(key, { label, points: [] });
        }
        groups.get(key)!.points.push(p);
      });

      let colorIndex = 0;
      groups.forEach((group) => {
        const { label, points } = group;
        traces.push({
          type: 'scatter3d',
          mode: 'markers',
          name: label,
          x: points.map(p => p.PC1),
          y: points.map(p => p.PC2),
          z: points.map(p => p.PC3),
          text: points.map(p => {
            let text = `Muestra #${p.id}`;
            if (p.feedstock !== null) text += `<br>Feedstock: ${FEEDSTOCK_LABELS[p.feedstock] || p.feedstock}`;
            if (p.concentration !== null) text += `<br>Concentración: ${CONCENTRATION_LABELS[p.concentration] || p.concentration}`;
            if (p.cluster !== null) text += `<br>Cluster: ${p.cluster}`;
            return text;
          }),
          hoverinfo: 'text',
          marker: {
            size: pointSize,
            color: colors[colorIndex % colors.length],
            opacity: 0.8,
            line: { color: 'rgba(0,0,0,0.2)', width: 0.5 }
          }
        } as Plotly.Data);
        colorIndex++;
      });
    }

    // Añadir loadings como vectores si se solicita
    if (showLoadings && data.loadings) {
      // Escalar loadings para que sean visibles
      const maxScore = Math.max(
        ...data.puntos.map(p => Math.abs(p.PC1)),
        ...data.puntos.map(p => Math.abs(p.PC2)),
        ...data.puntos.map(p => Math.abs(p.PC3))
      );
      const maxLoading = Math.max(
        ...data.loadings.map(l => Math.abs(l.PC1)),
        ...data.loadings.map(l => Math.abs(l.PC2)),
        ...data.loadings.map(l => Math.abs(l.PC3))
      );
      const scale = (maxScore * 0.8) / maxLoading;

      // Añadir flechas para cada variable (top 10)
      const topLoadings = [...data.loadings]
        .sort((a, b) => {
          const magA = Math.sqrt(a.PC1 ** 2 + a.PC2 ** 2 + a.PC3 ** 2);
          const magB = Math.sqrt(b.PC1 ** 2 + b.PC2 ** 2 + b.PC3 ** 2);
          return magB - magA;
        })
        .slice(0, 10);

      topLoadings.forEach((loading, i) => {
        traces.push({
          type: 'scatter3d',
          mode: 'lines+text',
          name: loading.variable,
          x: [0, loading.PC1 * scale],
          y: [0, loading.PC2 * scale],
          z: [0, loading.PC3 * scale],
          text: ['', loading.variable],
          textposition: 'top center',
          textfont: { size: 10, color: '#374151' },
          hoverinfo: 'name',
          line: {
            color: '#6b7280',
            width: 2
          },
          showlegend: i === 0,
          legendgroup: 'loadings'
        } as Plotly.Data);
      });
    }

    return traces;
  }, [data, colorBy, showLoadings, colors, pointSize]);

  // Layout del gráfico
  const layout: Partial<Plotly.Layout> = useMemo(() => ({
    autosize: true,
    margin: { l: 0, r: 0, t: 30, b: 0 },
    scene: {
      xaxis: {
        title: `PC1 (${data.varianza?.PC1.toFixed(1) || '?'}%)`,
        titlefont: { size: 12, color: '#64748b' },
        tickfont: { size: 10, color: '#64748b' },
        gridcolor: '#e2e8f0',
        zerolinecolor: '#cbd5e1'
      },
      yaxis: {
        title: `PC2 (${data.varianza?.PC2.toFixed(1) || '?'}%)`,
        titlefont: { size: 12, color: '#64748b' },
        tickfont: { size: 10, color: '#64748b' },
        gridcolor: '#e2e8f0',
        zerolinecolor: '#cbd5e1'
      },
      zaxis: {
        title: `PC3 (${data.varianza?.PC3.toFixed(1) || '?'}%)`,
        titlefont: { size: 12, color: '#64748b' },
        tickfont: { size: 10, color: '#64748b' },
        gridcolor: '#e2e8f0',
        zerolinecolor: '#cbd5e1'
      },
      aspectmode: 'auto',
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 }
      }
    },
    legend: {
      x: 1,
      y: 0.5,
      font: { size: 11 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#e2e8f0',
      borderwidth: 1
    },
    hoverlabel: {
      bgcolor: 'white',
      bordercolor: '#e2e8f0',
      font: { size: 12, color: '#1e293b' }
    }
  }), [data.varianza]);

  return (
    <div className="w-full">
      <Plot
        data={plotData}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          displaylogo: false
        }}
        style={{ width: '100%', height: '500px' }}
      />

      {/* Información de varianza */}
      {data.varianza && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-secondary-600">
            <strong>Varianza explicada por PC1, PC2 y PC3:</strong>{' '}
            {data.varianza.total_3d.toFixed(1)}% del total
          </p>
          <p className="text-xs text-secondary-500 mt-1">
            PC1: {data.varianza.PC1.toFixed(1)}% | PC2: {data.varianza.PC2.toFixed(1)}% | PC3: {data.varianza.PC3.toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}
