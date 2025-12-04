declare module 'react-plotly.js' {
  import { Component } from 'react';

  interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    style?: React.CSSProperties;
    className?: string;
    onInitialized?: (figure: Readonly<{ data: Plotly.Data[]; layout: Partial<Plotly.Layout> }>, graphDiv: HTMLDivElement) => void;
    onUpdate?: (figure: Readonly<{ data: Plotly.Data[]; layout: Partial<Plotly.Layout> }>, graphDiv: HTMLDivElement) => void;
    onPurge?: (figure: Readonly<{ data: Plotly.Data[]; layout: Partial<Plotly.Layout> }>, graphDiv: HTMLDivElement) => void;
    onError?: (error: Error) => void;
    divId?: string;
    useResizeHandler?: boolean;
    revision?: number;
    frames?: Plotly.Frame[];
  }

  class Plot extends Component<PlotParams> {}
  export default Plot;
}

declare namespace Plotly {
  interface Data {
    type?: string;
    mode?: string;
    name?: string;
    x?: (number | string | null)[];
    y?: (number | string | null)[];
    z?: (number | string | null)[];
    text?: string | string[];
    textposition?: string;
    textfont?: {
      size?: number;
      color?: string;
    };
    hoverinfo?: string;
    marker?: {
      size?: number | number[];
      color?: string | string[] | number[];
      colorscale?: string;
      reversescale?: boolean;
      colorbar?: {
        title?: string;
        thickness?: number;
        len?: number;
      };
      opacity?: number;
      line?: {
        color?: string;
        width?: number;
      };
    };
    line?: {
      color?: string;
      width?: number;
    };
    showlegend?: boolean;
    legendgroup?: string;
  }

  interface Layout {
    autosize?: boolean;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    scene?: {
      xaxis?: AxisLayout3D;
      yaxis?: AxisLayout3D;
      zaxis?: AxisLayout3D;
      aspectmode?: string;
      camera?: {
        eye?: { x: number; y: number; z: number };
      };
    };
    legend?: {
      x?: number;
      y?: number;
      font?: { size?: number };
      bgcolor?: string;
      bordercolor?: string;
      borderwidth?: number;
    };
    hoverlabel?: {
      bgcolor?: string;
      bordercolor?: string;
      font?: { size?: number; color?: string };
    };
  }

  interface AxisLayout3D {
    title?: string;
    titlefont?: { size?: number; color?: string };
    tickfont?: { size?: number; color?: string };
    gridcolor?: string;
    zerolinecolor?: string;
  }

  interface Config {
    responsive?: boolean;
    displayModeBar?: boolean;
    modeBarButtonsToRemove?: string[];
    displaylogo?: boolean;
  }

  interface Frame {
    name?: string;
    data?: Data[];
    layout?: Partial<Layout>;
  }
}
