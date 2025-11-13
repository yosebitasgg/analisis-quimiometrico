"""
Módulo de visualizaciones para análisis quimiométrico.
Genera todas las gráficas interactivas usando Plotly.
"""

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from scipy.cluster.hierarchy import dendrogram
from typing import Optional, List, Dict
from config.settings import PLOT_CONFIG, COLOR_PALETTES, DASHBOARD_COLORS


def create_scree_plot(
    variance_explained: np.ndarray,
    variance_cumulative: np.ndarray
) -> go.Figure:
    """
    Crea scree plot (gráfica de codo) para PCA.

    Args:
        variance_explained: Varianza explicada por componente
        variance_cumulative: Varianza acumulada

    Returns:
        Figura de Plotly
    """
    n_components = len(variance_explained)
    components = [f'PC{i+1}' for i in range(n_components)]

    fig = go.Figure()

    # Barras de varianza individual
    fig.add_trace(go.Bar(
        x=components,
        y=variance_explained,
        name='Varianza Individual',
        marker_color=DASHBOARD_COLORS['primary'],
        text=np.round(variance_explained, 1),
        textposition='auto',
    ))

    # Línea de varianza acumulada
    fig.add_trace(go.Scatter(
        x=components,
        y=variance_cumulative,
        name='Varianza Acumulada',
        mode='lines+markers',
        line=dict(color=DASHBOARD_COLORS['secondary'], width=3),
        marker=dict(size=8),
        yaxis='y2'
    ))

    fig.update_layout(
        title='Scree Plot - Varianza Explicada por Componente',
        xaxis_title='Componente Principal',
        yaxis_title='Varianza Explicada (%)',
        yaxis2=dict(
            title='Varianza Acumulada (%)',
            overlaying='y',
            side='right'
        ),
        hovermode='x unified',
        template='plotly_white',
        height=PLOT_CONFIG['height'] - 100
    )

    return fig


def create_scores_plot_2d(
    scores: np.ndarray,
    pc_x: int = 0,
    pc_y: int = 1,
    color_by: Optional[np.ndarray] = None,
    color_labels: Optional[List[str]] = None,
    hover_data: Optional[pd.DataFrame] = None,
    title: str = "PCA - Scores Plot",
    marker_size: int = 8,
    opacity: float = 0.7,
    color_palette: str = "Tol Bright"
) -> go.Figure:
    """
    Crea scatter plot 2D de scores de PCA.

    Args:
        scores: Array de scores (n_samples, n_components)
        pc_x: Índice del PC para eje X
        pc_y: Índice del PC para eje Y
        color_by: Array para colorear puntos (clusters o categorías)
        color_labels: Etiquetas correspondientes a color_by
        hover_data: DataFrame con información adicional para hover
        title: Título de la gráfica
        marker_size: Tamaño de marcadores
        opacity: Opacidad de puntos
        color_palette: Nombre de la paleta de colores

    Returns:
        Figura de Plotly
    """
    df_plot = pd.DataFrame({
        f'PC{pc_x+1}': scores[:, pc_x],
        f'PC{pc_y+1}': scores[:, pc_y]
    })

    if color_by is not None:
        df_plot['Color'] = color_by.astype(str)

    if hover_data is not None:
        for col in hover_data.columns:
            df_plot[col] = hover_data[col].values

    # Seleccionar colores
    colors = COLOR_PALETTES.get(color_palette, COLOR_PALETTES["Tol Bright"])

    if color_by is not None:
        fig = px.scatter(
            df_plot,
            x=f'PC{pc_x+1}',
            y=f'PC{pc_y+1}',
            color='Color',
            color_discrete_sequence=colors,
            hover_data=hover_data.columns.tolist() if hover_data is not None else None
        )
    else:
        fig = px.scatter(
            df_plot,
            x=f'PC{pc_x+1}',
            y=f'PC{pc_y+1}',
            hover_data=hover_data.columns.tolist() if hover_data is not None else None
        )
        fig.update_traces(marker=dict(color=DASHBOARD_COLORS['primary']))

    fig.update_traces(
        marker=dict(size=marker_size, opacity=opacity, line=dict(width=0.5, color='white'))
    )

    fig.update_layout(
        title=title,
        template='plotly_white',
        height=PLOT_CONFIG['height'],
        hovermode='closest'
    )

    # Añadir líneas de referencia en 0
    fig.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
    fig.add_vline(x=0, line_dash="dash", line_color="gray", opacity=0.5)

    return fig


def create_scores_plot_3d(
    scores: np.ndarray,
    pc_x: int = 0,
    pc_y: int = 1,
    pc_z: int = 2,
    color_by: Optional[np.ndarray] = None,
    title: str = "PCA - Scores Plot 3D",
    marker_size: int = 5,
    opacity: float = 0.7,
    color_palette: str = "Tol Bright"
) -> go.Figure:
    """
    Crea scatter plot 3D de scores de PCA.

    Args:
        scores: Array de scores
        pc_x, pc_y, pc_z: Índices de PCs para ejes X, Y, Z
        color_by: Array para colorear puntos
        title: Título
        marker_size: Tamaño de marcadores
        opacity: Opacidad
        color_palette: Paleta de colores

    Returns:
        Figura de Plotly
    """
    colors = COLOR_PALETTES.get(color_palette, COLOR_PALETTES["Tol Bright"])

    if color_by is not None:
        unique_labels = np.unique(color_by)
        traces = []

        for i, label in enumerate(unique_labels):
            mask = color_by == label
            trace = go.Scatter3d(
                x=scores[mask, pc_x],
                y=scores[mask, pc_y],
                z=scores[mask, pc_z],
                mode='markers',
                name=str(label),
                marker=dict(
                    size=marker_size,
                    color=colors[i % len(colors)],
                    opacity=opacity,
                    line=dict(width=0.5, color='white')
                )
            )
            traces.append(trace)

        fig = go.Figure(data=traces)
    else:
        fig = go.Figure(data=[go.Scatter3d(
            x=scores[:, pc_x],
            y=scores[:, pc_y],
            z=scores[:, pc_z],
            mode='markers',
            marker=dict(
                size=marker_size,
                color=DASHBOARD_COLORS['primary'],
                opacity=opacity,
                line=dict(width=0.5, color='white')
            )
        )])

    fig.update_layout(
        title=title,
        scene=dict(
            xaxis_title=f'PC{pc_x+1}',
            yaxis_title=f'PC{pc_y+1}',
            zaxis_title=f'PC{pc_z+1}'
        ),
        template='plotly_white',
        height=PLOT_CONFIG['height']
    )

    return fig


def create_biplot(
    scores: np.ndarray,
    loadings: np.ndarray,
    feature_names: List[str],
    pc_x: int = 0,
    pc_y: int = 1,
    color_by: Optional[np.ndarray] = None,
    n_loadings: int = 10,
    color_palette: str = "Tol Bright",
    marker_size: int = 8,
    opacity: float = 0.7
) -> go.Figure:
    """
    Crea biplot combinando scores y loadings.

    Args:
        scores: Scores de PCA
        loadings: Loadings de PCA
        feature_names: Nombres de variables
        pc_x, pc_y: Índices de componentes para ejes
        color_by: Coloreado de puntos
        n_loadings: Número máximo de vectores de loadings a mostrar
        color_palette: Paleta de colores

    Returns:
        Figura de Plotly
    """
    fig = create_scores_plot_2d(
        scores=scores,
        pc_x=pc_x,
        pc_y=pc_y,
        color_by=color_by,
        title=f"Biplot - PC{pc_x+1} vs PC{pc_y+1}",
        marker_size=marker_size,
        opacity=opacity,
        color_palette=color_palette
    )

    # Escalar loadings para visualización
    scale = 0.8 * np.max(np.abs(scores[:, [pc_x, pc_y]]))

    # Seleccionar top n_loadings por magnitud
    loading_magnitudes = np.sqrt(loadings[:, pc_x]**2 + loadings[:, pc_y]**2)
    top_indices = np.argsort(loading_magnitudes)[-n_loadings:]

    # Añadir vectores de loadings
    for idx in top_indices:
        fig.add_annotation(
            ax=0, ay=0,
            axref='x', ayref='y',
            x=loadings[idx, pc_x] * scale,
            y=loadings[idx, pc_y] * scale,
            xref='x', yref='y',
            showarrow=True,
            arrowhead=2,
            arrowsize=1,
            arrowwidth=2,
            arrowcolor=DASHBOARD_COLORS['danger'],
            opacity=0.7
        )

        # Etiquetas de variables
        fig.add_annotation(
            x=loadings[idx, pc_x] * scale * 1.1,
            y=loadings[idx, pc_y] * scale * 1.1,
            text=feature_names[idx],
            showarrow=False,
            font=dict(size=10, color=DASHBOARD_COLORS['dark']),
            bgcolor='rgba(255, 255, 255, 0.7)',
            borderpad=2
        )

    return fig


def create_correlation_heatmap(corr_matrix: pd.DataFrame) -> go.Figure:
    """
    Crea heatmap de matriz de correlación.

    Args:
        corr_matrix: Matriz de correlación

    Returns:
        Figura de Plotly
    """
    fig = go.Figure(data=go.Heatmap(
        z=corr_matrix.values,
        x=corr_matrix.columns,
        y=corr_matrix.index,
        colorscale='RdBu_r',
        zmid=0,
        text=np.round(corr_matrix.values, 2),
        texttemplate='%{text}',
        textfont={"size": 9},
        colorbar=dict(title='Correlación')
    ))

    fig.update_layout(
        title='Matriz de Correlación',
        template='plotly_white',
        height=min(800, max(400, len(corr_matrix) * 30)),
        xaxis=dict(tickangle=-45)
    )

    return fig


def create_dendrogram_plot(
    linkage_matrix: np.ndarray,
    labels: Optional[List[str]] = None,
    n_clusters: Optional[int] = None
) -> go.Figure:
    """
    Crea dendrograma para clustering jerárquico.

    Args:
        linkage_matrix: Matriz de ligamiento
        labels: Etiquetas de muestras
        n_clusters: Número de clusters para colorear (opcional)

    Returns:
        Figura de Plotly
    """
    # Crear dendrograma usando scipy
    dend = dendrogram(
        linkage_matrix,
        labels=labels,
        no_plot=True,
        color_threshold=0 if n_clusters is None else None
    )

    # Crear figura de Plotly
    fig = go.Figure()

    # Dibujar líneas del dendrograma
    icoord = np.array(dend['icoord'])
    dcoord = np.array(dend['dcoord'])
    colors = dend['color_list']

    # Mapear colores de matplotlib a colores válidos de Plotly
    color_map = {
        'C0': '#1f77b4',
        'C1': '#ff7f0e',
        'C2': '#2ca02c',
        'C3': '#d62728',
        'C4': '#9467bd',
        'C5': '#8c564b',
        'C6': '#e377c2',
        'C7': '#7f7f7f',
        'C8': '#bcbd22',
        'C9': '#17becf',
        'b': '#0000ff',
        'g': '#00ff00',
        'r': '#ff0000',
        'c': '#00ffff',
        'm': '#ff00ff',
        'y': '#ffff00',
        'k': '#000000'
    }

    for i in range(len(icoord)):
        # Convertir color matplotlib a Plotly
        mpl_color = colors[i]
        plotly_color = color_map.get(mpl_color, DASHBOARD_COLORS['primary'])

        fig.add_trace(go.Scatter(
            x=icoord[i],
            y=dcoord[i],
            mode='lines',
            line=dict(color=plotly_color, width=2),
            hoverinfo='y',
            showlegend=False
        ))

    fig.update_layout(
        title='Dendrograma - Clustering Jerárquico',
        xaxis_title='Muestras',
        yaxis_title='Distancia',
        template='plotly_white',
        height=PLOT_CONFIG['height'],
        showlegend=False
    )

    return fig


def create_silhouette_plot(
    silhouette_values: np.ndarray,
    cluster_labels: np.ndarray,
    silhouette_avg: float
) -> go.Figure:
    """
    Crea silhouette plot para evaluación de clusters.

    Args:
        silhouette_values: Valores de silhouette por muestra
        cluster_labels: Labels de clusters
        silhouette_avg: Silhouette score promedio

    Returns:
        Figura de Plotly
    """
    fig = go.Figure()

    y_lower = 10
    n_clusters = len(np.unique(cluster_labels))
    colors = COLOR_PALETTES["Tol Bright"]

    for i in range(n_clusters):
        # Valores de silhouette para cluster i
        cluster_silhouette_values = silhouette_values[cluster_labels == i]
        cluster_silhouette_values.sort()

        size_cluster_i = cluster_silhouette_values.shape[0]
        y_upper = y_lower + size_cluster_i

        fig.add_trace(go.Bar(
            x=cluster_silhouette_values,
            y=list(range(y_lower, y_upper)),
            orientation='h',
            name=f'Cluster {i}',
            marker_color=colors[i % len(colors)],
            showlegend=True
        ))

        y_lower = y_upper + 10

    # Línea de promedio
    fig.add_vline(
        x=silhouette_avg,
        line_dash="dash",
        line_color="red",
        annotation_text=f"Promedio: {silhouette_avg:.3f}",
        annotation_position="top"
    )

    fig.update_layout(
        title='Silhouette Plot',
        xaxis_title='Coeficiente de Silhouette',
        yaxis_title='Muestras por Cluster',
        template='plotly_white',
        height=PLOT_CONFIG['height'],
        showlegend=True
    )

    return fig


def create_elbow_plot(k_values: List[int], inertias: List[float]) -> go.Figure:
    """
    Crea elbow plot para selección de k en K-means.

    Args:
        k_values: Lista de valores de k
        inertias: Lista de inercias correspondientes

    Returns:
        Figura de Plotly
    """
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=k_values,
        y=inertias,
        mode='lines+markers',
        line=dict(color=DASHBOARD_COLORS['primary'], width=3),
        marker=dict(size=10)
    ))

    fig.update_layout(
        title='Elbow Plot - Selección de Número de Clusters',
        xaxis_title='Número de Clusters (k)',
        yaxis_title='Inercia (Within-Cluster Sum of Squares)',
        template='plotly_white',
        height=PLOT_CONFIG['height'] - 100
    )

    return fig


def create_box_plot(df: pd.DataFrame, columns: List[str]) -> go.Figure:
    """
    Crea box plots para múltiples variables.

    Args:
        df: DataFrame con datos
        columns: Columnas a graficar

    Returns:
        Figura de Plotly
    """
    fig = go.Figure()

    colors = COLOR_PALETTES["Tol Bright"]

    for i, col in enumerate(columns):
        fig.add_trace(go.Box(
            y=df[col],
            name=col,
            marker_color=colors[i % len(colors)],
            boxmean='sd'
        ))

    fig.update_layout(
        title='Distribución de Variables',
        yaxis_title='Valor',
        template='plotly_white',
        height=PLOT_CONFIG['height']
    )

    return fig


def create_histogram(df: pd.DataFrame, column: str, bins: int = 30) -> go.Figure:
    """
    Crea histograma para una variable.

    Args:
        df: DataFrame
        column: Columna a graficar
        bins: Número de bins

    Returns:
        Figura de Plotly
    """
    fig = go.Figure()

    fig.add_trace(go.Histogram(
        x=df[column],
        nbinsx=bins,
        marker_color=DASHBOARD_COLORS['primary'],
        opacity=0.7
    ))

    fig.update_layout(
        title=f'Distribución de {column}',
        xaxis_title=column,
        yaxis_title='Frecuencia',
        template='plotly_white',
        height=PLOT_CONFIG['height'] - 200
    )

    return fig
