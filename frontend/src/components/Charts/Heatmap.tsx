import { useMemo } from 'react';

interface Props {
  variables: string[];
  matrix: number[][];
  palette?: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export default function Heatmap({ variables, matrix, palette = 'default' }: Props) {
  // Función para obtener color basado en correlación (-1 a 1)
  const getColor = (value: number): string => {
    const intensity = Math.abs(value);

    switch (palette) {
      case 'protanopia':
        // Azul (-1) -> Blanco (0) -> Naranja (1)
        // Evita rojo-verde para protanopia
        if (value >= 0) {
          const i = Math.round(intensity * 255);
          return `rgb(${255}, ${255 - Math.round(i * 0.65)}, ${255 - i})`;
        } else {
          const i = Math.round(intensity * 255);
          return `rgb(${255 - i}, ${255 - Math.round(i * 0.65)}, ${255})`;
        }

      case 'deuteranopia':
        // Azul (-1) -> Blanco (0) -> Marrón (1)
        // Evita verde para deuteranopia
        if (value >= 0) {
          const i = Math.round(intensity * 255);
          return `rgb(${255}, ${255 - Math.round(i * 0.5)}, ${255 - i})`;
        } else {
          const i = Math.round(intensity * 255);
          return `rgb(${255 - i}, ${255 - Math.round(i * 0.5)}, ${255})`;
        }

      case 'tritanopia':
        // Cian (-1) -> Blanco (0) -> Magenta (1)
        // Evita confusión azul-amarillo para tritanopia
        if (value >= 0) {
          const i = Math.round(intensity * 255);
          return `rgb(${255}, ${255 - i}, ${255})`;
        } else {
          const i = Math.round(intensity * 255);
          return `rgb(${255 - i}, ${255}, ${255})`;
        }

      case 'default':
      default:
        // Azul (-1) -> Blanco (0) -> Rojo (1)
        if (value >= 0) {
          const i = Math.round(intensity * 255);
          return `rgb(${255}, ${255 - i}, ${255 - i})`;
        } else {
          const i = Math.round(intensity * 255);
          return `rgb(${255 - i}, ${255 - i}, ${255})`;
        }
    }
  };

  // Función para obtener color de texto legible
  const getTextColor = (value: number): string => {
    return Math.abs(value) > 0.6 ? 'white' : '#1e293b';
  };

  // Preparar datos para la visualización
  const cellData = useMemo(() => {
    const cells: Array<{
      row: number;
      col: number;
      value: number;
      rowVar: string;
      colVar: string;
    }> = [];

    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        cells.push({
          row: i,
          col: j,
          value: value,
          rowVar: variables[i],
          colVar: variables[j]
        });
      });
    });

    return cells;
  }, [matrix, variables]);

  const cellSize = Math.min(50, 400 / variables.length);

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-max">
        {/* Leyenda de colores */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="text-xs text-secondary-600">-1</span>
          <div className="flex h-4 w-40 rounded overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => {
              const value = -1 + (i / 19) * 2;
              return (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: getColor(value) }}
                />
              );
            })}
          </div>
          <span className="text-xs text-secondary-600">+1</span>
        </div>

        {/* Headers de columnas */}
        <div className="flex ml-24">
          {variables.map((v, i) => (
            <div
              key={i}
              className="flex items-end justify-center"
              style={{ width: cellSize, height: 80 }}
            >
              <span
                className="text-xs text-secondary-600 whitespace-nowrap transform -rotate-45 origin-bottom-left"
                style={{ maxWidth: 80 }}
              >
                {v.length > 10 ? v.slice(0, 10) + '...' : v}
              </span>
            </div>
          ))}
        </div>

        {/* Matriz */}
        <div className="flex">
          {/* Headers de filas */}
          <div className="flex flex-col justify-center">
            {variables.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-end pr-2"
                style={{ height: cellSize, width: 96 }}
              >
                <span className="text-xs text-secondary-600 truncate">
                  {v.length > 12 ? v.slice(0, 12) + '...' : v}
                </span>
              </div>
            ))}
          </div>

          {/* Celdas */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${variables.length}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${variables.length}, ${cellSize}px)`
            }}
          >
            {cellData.map((cell, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center border border-gray-100 cursor-pointer hover:ring-2 hover:ring-primary-400 hover:z-10 transition-all"
                style={{
                  backgroundColor: getColor(cell.value),
                  color: getTextColor(cell.value)
                }}
                title={`${cell.rowVar} vs ${cell.colVar}: ${cell.value.toFixed(3)}`}
              >
                <span className="text-xs font-medium">
                  {cell.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interpretación */}
        <div className="mt-4 text-xs text-secondary-500 text-center">
          <p>Valores cercanos a +1 indican correlación positiva fuerte</p>
          <p>Valores cercanos a -1 indican correlación negativa fuerte</p>
          <p>Valores cercanos a 0 indican poca o ninguna correlación lineal</p>
        </div>
      </div>
    </div>
  );
}
