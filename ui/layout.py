"""
Componentes de layout y UI para la aplicación Streamlit.
Incluye tarjetas de resumen, sidebar y elementos visuales.
"""

import streamlit as st
from config.settings import DASHBOARD_COLORS, HELP_MESSAGES


def apply_custom_css():
    """
    Aplica estilos CSS personalizados a la aplicación.
    """
    st.markdown("""
    <style>
        /* Estilos generales */
        .main {
            background-color: #FFFFFF;
        }

        /* Tarjetas de métricas */
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1.5rem;
            border-radius: 10px;
            color: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 1rem;
        }

        .metric-card h3 {
            margin: 0;
            font-size: 0.9rem;
            font-weight: 500;
            opacity: 0.9;
        }

        .metric-card .value {
            font-size: 2rem;
            font-weight: 700;
            margin: 0.5rem 0;
        }

        .metric-card .delta {
            font-size: 0.85rem;
            opacity: 0.8;
        }

        /* Botones personalizados */
        .stButton>button {
            background-color: #6366F1;
            color: white;
            border-radius: 8px;
            padding: 0.5rem 2rem;
            border: none;
            font-weight: 500;
            transition: all 0.3s;
        }

        .stButton>button:hover {
            background-color: #4F46E5;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Sidebar */
        .css-1d391kg {
            background-color: #F9FAFB;
        }

        /* Títulos */
        h1 {
            color: #1F2937;
            font-weight: 700;
        }

        h2 {
            color: #374151;
            font-weight: 600;
            margin-top: 2rem;
        }

        h3 {
            color: #4B5563;
            font-weight: 600;
        }

        /* Info boxes */
        .info-box {
            background-color: #EEF2FF;
            border-left: 4px solid #6366F1;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }

        .success-box {
            background-color: #ECFDF5;
            border-left: 4px solid #10B981;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }

        .warning-box {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }

        /* Tablas */
        .dataframe {
            border-radius: 8px;
            overflow: hidden;
        }
    </style>
    """, unsafe_allow_html=True)


def create_metric_card(title: str, value, delta: str = None, color: str = "primary"):
    """
    Crea una tarjeta de métrica estilo dashboard.

    Args:
        title: Título de la métrica
        value: Valor principal
        delta: Texto de cambio/subtítulo
        color: Color del gradiente
    """
    gradient_colors = {
        "primary": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "success": "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        "warning": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "info": "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        "danger": "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
    }

    gradient = gradient_colors.get(color, gradient_colors["primary"])

    delta_html = f'<div class="delta">{delta}</div>' if delta else ''

    st.markdown(f"""
    <div style="background: {gradient}; padding: 1.5rem; border-radius: 10px; color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 1rem;">
        <h3 style="margin: 0; font-size: 0.9rem; font-weight: 500; opacity: 0.9;">{title}</h3>
        <div style="font-size: 2rem; font-weight: 700; margin: 0.5rem 0;">{value}</div>
        {delta_html}
    </div>
    """, unsafe_allow_html=True)


def create_info_box(message: str, box_type: str = "info"):
    """
    Crea caja de información con estilos.

    Args:
        message: Mensaje a mostrar
        box_type: 'info', 'success', 'warning'
    """
    colors = {
        "info": ("#EEF2FF", "#6366F1"),
        "success": ("#ECFDF5", "#10B981"),
        "warning": ("#FEF3C7", "#F59E0B")
    }

    bg_color, border_color = colors.get(box_type, colors["info"])

    st.markdown(f"""
    <div style="background-color: {bg_color}; border-left: 4px solid {border_color}; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        {message}
    </div>
    """, unsafe_allow_html=True)


def create_header(title: str, subtitle: str = None):
    """
    Crea encabezado de página.

    Args:
        title: Título principal
        subtitle: Subtítulo opcional
    """
    st.markdown(f"""
    <div style="margin-bottom: 2rem;">
        <h1 style="color: #1F2937; font-weight: 700; margin-bottom: 0.5rem;">{title}</h1>
        {f'<p style="color: #6B7280; font-size: 1.1rem;">{subtitle}</p>' if subtitle else ''}
    </div>
    """, unsafe_allow_html=True)


def create_section_header(title: str, icon: str = None):
    """
    Crea encabezado de sección.

    Args:
        title: Título de la sección
        icon: Parámetro ignorado (mantenido por compatibilidad)
    """
    st.markdown(f"""
    <h2 style="color: #374151; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem;">
        {title}
    </h2>
    """, unsafe_allow_html=True)


def create_help_expander(help_key: str):
    """
    Crea expander con mensaje de ayuda.

    Args:
        help_key: Clave del mensaje en HELP_MESSAGES
    """
    if help_key in HELP_MESSAGES:
        with st.expander("Ayuda: ¿Cómo interpretar esto?"):
            st.markdown(HELP_MESSAGES[help_key])


def create_sidebar_info():
    """
    Crea información en el sidebar.
    """
    st.sidebar.markdown("---")
    st.sidebar.markdown("""
    ### Análisis Quimiométrico

    Esta herramienta permite realizar análisis multivariado de datos químicos usando:

    - **PCA**: Reducción de dimensionalidad
    - **K-means**: Agrupamiento automático
    - **Clustering Jerárquico**: Dendrogramas

    Desarrollado para estudiantes y docentes de química.
    """)


def create_download_button(data, filename: str, label: str, mime_type: str = "text/csv"):
    """
    Crea botón de descarga estilizado.

    Args:
        data: Datos a descargar
        filename: Nombre del archivo
        label: Etiqueta del botón
        mime_type: Tipo MIME
    """
    st.download_button(
        label=f"{label}",
        data=data,
        file_name=filename,
        mime=mime_type
    )


def show_data_summary_cards(summary: dict):
    """
    Muestra tarjetas de resumen de datos.

    Args:
        summary: Diccionario con información del resumen
    """
    cols = st.columns(4)

    with cols[0]:
        create_metric_card(
            "Observaciones",
            summary.get('n_rows', 0),
            "Muestras totales",
            color="primary"
        )

    with cols[1]:
        create_metric_card(
            "Variables",
            summary.get('n_cols', 0),
            f"{summary.get('n_numeric', 0)} numéricas",
            color="info"
        )

    with cols[2]:
        create_metric_card(
            "Datos Faltantes",
            f"{summary.get('missing_percentage', 0):.1f}%",
            f"{summary.get('missing_values', 0)} valores",
            color="warning" if summary.get('missing_percentage', 0) > 5 else "success"
        )

    with cols[3]:
        create_metric_card(
            "Categorías",
            summary.get('n_categorical', 0),
            "Variables categóricas",
            color="success"
        )


def show_pca_summary_cards(pca_summary: dict):
    """
    Muestra tarjetas de resumen de PCA.

    Args:
        pca_summary: Diccionario con información del PCA
    """
    cols = st.columns(3)

    with cols[0]:
        create_metric_card(
            "Componentes",
            pca_summary.get('n_components', 0),
            f"De {pca_summary.get('n_features', 0)} variables",
            color="primary"
        )

    with cols[1]:
        create_metric_card(
            "Varianza Total",
            f"{pca_summary.get('total_variance_explained', 0):.1f}%",
            "Explicada por los PCs",
            color="success"
        )

    with cols[2]:
        create_metric_card(
            "PC1 + PC2",
            f"{pca_summary.get('variance_pc1', 0) + pca_summary.get('variance_pc2', 0):.1f}%",
            "Varianza en 2D",
            color="info"
        )


def create_step_indicator(current_step: int, total_steps: int = 5):
    """
    Crea indicador de progreso por pasos.

    Args:
        current_step: Paso actual (1-indexed)
        total_steps: Total de pasos
    """
    steps = ["Cargar Datos", "Preprocesar", "PCA", "Clustering", "Resultados"]

    st.markdown("### Progreso del Análisis")

    progress_html = '<div style="display: flex; justify-content: space-between; margin: 1rem 0;">'

    for i, step in enumerate(steps[:total_steps], 1):
        if i < current_step:
            color = "#10B981"  # Verde (completado)
            icon = "OK"
        elif i == current_step:
            color = "#6366F1"  # Azul (actual)
            icon = str(i)
        else:
            color = "#D1D5DB"  # Gris (pendiente)
            icon = str(i)

        progress_html += f'''
        <div style="text-align: center; flex: 1;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background-color: {color}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-weight: bold;">
                {icon}
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #6B7280;">
                {step}
            </div>
        </div>
        '''

    progress_html += '</div>'

    st.markdown(progress_html, unsafe_allow_html=True)
