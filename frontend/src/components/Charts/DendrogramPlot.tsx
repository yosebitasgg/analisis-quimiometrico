import { useMemo } from 'react';
import { DendrogramData } from '../../types';

interface Props {
  data: DendrogramData;
  nClusters: number;
}

export default function DendrogramPlot({ data, nClusters }: Props) {
  // Calcular dimensiones y escala
  const { paths, labels, dimensions, cutHeight } = useMemo(() => {
    const { icoord, dcoord, ivl, color_list } = data;

    // Encontrar rangos
    const allX = icoord.flat();
    const allY = dcoord.flat();
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    const width = 600;
    const height = 350;
    const padding = { top: 20, right: 20, bottom: 60, left: 50 };

    // Funciones de escala
    const scaleX = (x: number) =>
      padding.left + ((x - minX) / (maxX - minX)) * (width - padding.left - padding.right);
    const scaleY = (y: number) =>
      height - padding.bottom - ((y - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);

    // Generar paths SVG para cada segmento del dendrograma
    const svgPaths = icoord.map((xcoords, i) => {
      const ycoords = dcoord[i];
      const color = color_list[i] || '#0658a6';

      // El dendrograma tiene forma de U: 4 puntos
      const points = xcoords.map((x, j) => ({
        x: scaleX(x),
        y: scaleY(ycoords[j])
      }));

      // Crear path
      const d = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y}`;

      return { d, color };
    });

    // Posiciones de etiquetas
    const labelPositions = ivl.map((label, i) => {
      const x = scaleX(5 + i * 10);
      return { label, x, y: height - padding.bottom + 15 };
    });

    // Calcular altura de corte aproximada para n clusters
    const sortedHeights = [...new Set(dcoord.flat())].sort((a, b) => b - a);
    const cutHeightValue = sortedHeights[Math.min(nClusters - 1, sortedHeights.length - 1)] || 0;

    return {
      paths: svgPaths,
      labels: labelPositions,
      dimensions: { width, height },
      cutHeight: scaleY(cutHeightValue * 0.95)
    };
  }, [data, nClusters]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="mx-auto"
      >
        {/* Fondo */}
        <rect
          x="0"
          y="0"
          width={dimensions.width}
          height={dimensions.height}
          fill="white"
        />

        {/* Línea de corte */}
        <line
          x1="50"
          y1={cutHeight}
          x2={dimensions.width - 20}
          y2={cutHeight}
          stroke="#ef4444"
          strokeDasharray="5,5"
          strokeWidth="1.5"
        />
        <text
          x={dimensions.width - 25}
          y={cutHeight - 5}
          fontSize="10"
          fill="#ef4444"
          textAnchor="end"
        >
          Corte ({nClusters} clústeres)
        </text>

        {/* Ramas del dendrograma */}
        {paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            stroke={path.color === 'C0' ? '#0658a6' : path.color}
            strokeWidth="2"
            fill="none"
          />
        ))}

        {/* Etiquetas de muestras */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={label.y}
            fontSize="9"
            fill="#64748b"
            textAnchor="middle"
            transform={`rotate(-45, ${label.x}, ${label.y})`}
          >
            {label.label}
          </text>
        ))}

        {/* Eje Y */}
        <text
          x="15"
          y={dimensions.height / 2}
          fontSize="11"
          fill="#64748b"
          textAnchor="middle"
          transform={`rotate(-90, 15, ${dimensions.height / 2})`}
        >
          Distancia
        </text>
      </svg>

      {/* Nota interpretativa */}
      <p className="text-xs text-secondary-500 text-center mt-2">
        Las ramas que se unen a mayor altura indican menor similitud entre grupos.
        La línea roja muestra el corte para {nClusters} clústeres.
      </p>
    </div>
  );
}
