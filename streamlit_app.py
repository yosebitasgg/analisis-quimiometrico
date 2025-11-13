"""
Aplicación Principal de Análisis Quimiométrico
Herramienta interactiva para PCA y Clustering de datos químicos
"""

import streamlit as st
import pandas as pd
import numpy as np
import os

# Importar módulos propios
from core.data_io import (
    load_data_from_file, load_data_from_upload, check_example_file_exists,
    validate_dataframe, get_column_types, get_data_summary,
    export_results_to_csv, get_missing_data_info
)
from core.preprocessing import (
    DataPreprocessor, compute_correlation_matrix, get_numeric_summary_stats
)
from core.pca_analysis import PCAAnalyzer, determine_optimal_components
from core.clustering import (
    ClusterAnalyzer, compute_linkage_matrix, compute_elbow_scores,
    compute_silhouette_range, assign_hierarchical_clusters
)
from core.plots import (
    create_scree_plot, create_scores_plot_2d, create_scores_plot_3d,
    create_biplot, create_correlation_heatmap, create_dendrogram_plot,
    create_silhouette_plot, create_elbow_plot, create_box_plot, create_histogram
)
from ui.layout import (
    apply_custom_css, create_header, create_section_header, create_help_expander,
    create_info_box, show_data_summary_cards, show_pca_summary_cards,
    create_download_button, create_sidebar_info
)
from config.settings import (
    SCALING_OPTIONS, IMPUTATION_OPTIONS, LINKAGE_METHODS, COLOR_PALETTES,
    DEFAULT_N_COMPONENTS, DEFAULT_N_CLUSTERS, MAX_CLUSTERS, MAX_COMPONENTS,
    EXAMPLE_FILE
)


# Configuración de página
st.set_page_config(
    page_title="Análisis Quimiométrico",
    page_icon="img/Logo_del_ITESM.svg",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Aplicar estilos personalizados
apply_custom_css()


# Inicializar session state
def init_session_state():
    """Inicializa variables de estado de la sesión."""
    if 'data_loaded' not in st.session_state:
        st.session_state.data_loaded = False
    if 'data' not in st.session_state:
        st.session_state.data = None
    if 'preprocessed_data' not in st.session_state:
        st.session_state.preprocessed_data = None
    if 'preprocessor' not in st.session_state:
        st.session_state.preprocessor = None
    if 'pca_fitted' not in st.session_state:
        st.session_state.pca_fitted = False
    if 'pca_analyzer' not in st.session_state:
        st.session_state.pca_analyzer = None
    if 'cluster_analyzer' not in st.session_state:
        st.session_state.cluster_analyzer = ClusterAnalyzer()
    if 'current_page' not in st.session_state:
        st.session_state.current_page = "Home"


init_session_state()


# Sidebar - Navegación
# Logo
logo_path = "img/images.png"
if os.path.exists(logo_path):
    st.sidebar.image(logo_path, use_container_width=True)

st.sidebar.title("Análisis Quimiométrico")
st.sidebar.markdown("---")

pages = ["Home", "Cargar Datos", "Preprocesamiento", "PCA", "Clustering", "Resultados", "Ayuda"]
page = st.sidebar.radio("Navegación", pages, label_visibility="collapsed")

# Actualizar título de la pestaña según la página
page_titles = {
    "Home": "Análisis Quimiométrico | Inicio",
    "Cargar Datos": "Análisis Quimiométrico | Carga de Datos",
    "Preprocesamiento": "Análisis Quimiométrico | Preprocesamiento",
    "PCA": "Análisis Quimiométrico | PCA",
    "Clustering": "Análisis Quimiométrico | Clustering",
    "Resultados": "Análisis Quimiométrico | Resultados",
    "Ayuda": "Análisis Quimiométrico | Ayuda"
}

# Cambiar el título de la pestaña usando JavaScript
st.markdown(
    f"""
    <script>
        document.title = "{page_titles[page]}";
    </script>
    """,
    unsafe_allow_html=True
)

create_sidebar_info()


# ============================================================================
# PÁGINA: HOME
# ============================================================================
if page == "Home":
    create_header(
        "Análisis Quimiométrico con PCA y Clustering",
        "Herramienta interactiva para análisis multivariado de datos químicos"
    )

    st.markdown("""
    ### Bienvenido

    Esta aplicación te permite analizar datos de laboratorio usando técnicas de quimiometría:

    - **PCA (Análisis de Componentes Principales)**: Reduce la dimensionalidad de tus datos y encuentra patrones ocultos
    - **K-means Clustering**: Agrupa automáticamente muestras similares
    - **Clustering Jerárquico**: Visualiza relaciones entre muestras mediante dendrogramas

    ### Cómo empezar

    1. Ve a **Cargar Datos** y sube tu archivo CSV o Excel
    2. Configura el **Preprocesamiento** de tus datos
    3. Ejecuta el **PCA** para visualizar tus datos en pocas dimensiones
    4. Aplica **Clustering** para encontrar grupos naturales
    5. **Descarga** tus resultados

    ### Estado Actual del Análisis
    """)

    # Mostrar estado actual
    cols = st.columns(4)

    with cols[0]:
        if st.session_state.data_loaded:
            st.success("Datos Cargados")
            st.write(f"{st.session_state.data.shape[0]} filas × {st.session_state.data.shape[1]} columnas")
        else:
            st.info("Sin datos")

    with cols[1]:
        if st.session_state.preprocessed_data is not None:
            st.success("Preprocesado")
        else:
            st.info("Pendiente")

    with cols[2]:
        if st.session_state.pca_fitted:
            st.success("PCA Ejecutado")
        else:
            st.info("Pendiente")

    with cols[3]:
        if st.session_state.cluster_analyzer.kmeans_labels is not None:
            st.success("Clustering Hecho")
        else:
            st.info("Pendiente")

    st.markdown("---")

    # Botón para cargar ejemplo
    if check_example_file_exists():
        create_info_box(
            f"<b>Archivo de ejemplo detectado:</b> {EXAMPLE_FILE}<br>Puedes cargarlo desde la página 'Cargar Datos'",
            "info"
        )

    st.markdown("---")

    # Sección de autores
    st.markdown("### Autores")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**A01638980** Luis Carlos Marrufo Padilla")

    with col2:
        st.markdown("**A01612830** Yoseba Michel Mireles Ahumada")

    st.markdown("""
    <div style='text-align: center; margin-top: 1rem; color: #6B7280; font-size: 0.9rem;'>
        Instituto Tecnológico y de Estudios Superiores de Monterrey, México. 2025.
    </div>
    """, unsafe_allow_html=True)


# ============================================================================
# PÁGINA: CARGAR DATOS
# ============================================================================
elif page == "Cargar Datos":
    create_header("Cargar Datos", "Sube tu archivo CSV o Excel con datos de laboratorio")

    # Opción 1: Cargar archivo de ejemplo
    if check_example_file_exists():
        st.markdown("### Opción 1: Usar Archivo de Ejemplo")

        if st.button("Cargar archivo de ejemplo"):
            try:
                df = load_data_from_file(EXAMPLE_FILE)
                st.session_state.data = df
                st.session_state.data_loaded = True
                st.success(f"Archivo de ejemplo cargado: {EXAMPLE_FILE}")
                st.rerun()
            except Exception as e:
                st.error(f"Error al cargar archivo de ejemplo: {e}")

        st.markdown("---")

    # Opción 2: Subir archivo
    st.markdown("### Opción 2: Subir tu Archivo")

    uploaded_file = st.file_uploader(
        "Selecciona un archivo CSV o Excel",
        type=['csv', 'xlsx', 'xls'],
        help="Formatos soportados: .csv, .xlsx, .xls"
    )

    if uploaded_file is not None:
        try:
            df = load_data_from_upload(uploaded_file)
            st.session_state.data = df
            st.session_state.data_loaded = True
            st.success(f"Archivo cargado exitosamente: {uploaded_file.name}")
        except Exception as e:
            st.error(f"Error al cargar archivo: {e}")

    # Mostrar datos cargados
    if st.session_state.data_loaded:
        st.markdown("---")
        create_section_header("Vista Previa de Datos")

        df = st.session_state.data

        # Validar datos
        is_valid, errors = validate_dataframe(df)

        if not is_valid:
            for error in errors:
                st.error(f"{error}")
        else:
            st.success("Datos válidos para análisis")

        # Resumen de datos
        summary = get_data_summary(df)
        show_data_summary_cards(summary)

        # Mostrar primeras filas
        st.markdown("#### Primeras filas del dataset")
        st.dataframe(df.head(20), use_container_width=True)

        # Tipos de columnas
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("#### Variables Numéricas")
            st.write(summary['numeric_columns'])

        with col2:
            st.markdown("#### Variables Categóricas")
            st.write(summary['categorical_columns'])

        # Información de valores faltantes
        if summary['missing_values'] > 0:
            st.markdown("#### Valores Faltantes Detectados")
            missing_info = get_missing_data_info(df)
            st.dataframe(missing_info, use_container_width=True)

        # Estadísticas descriptivas
        if summary['numeric_columns']:
            with st.expander("Estadísticas Descriptivas (Variables Numéricas)"):
                st.dataframe(summary['numeric_stats'], use_container_width=True)


# ============================================================================
# PÁGINA: PREPROCESAMIENTO
# ============================================================================
elif page == "Preprocesamiento":
    create_header("Preprocesamiento de Datos", "Configura cómo preparar tus datos para el análisis")

    if not st.session_state.data_loaded:
        create_info_box("Primero debes cargar datos en la página 'Cargar Datos'", "warning")
        st.stop()

    df = st.session_state.data
    summary = get_data_summary(df)

    # Configuración de preprocesamiento
    create_section_header("Selección de Variables")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Variables Numéricas (para PCA)")
        numeric_columns = st.multiselect(
            "Selecciona las variables numéricas a incluir en el análisis",
            options=summary['numeric_columns'],
            default=summary['numeric_columns'],
            help="Estas variables se usarán para calcular el PCA y clustering"
        )

    with col2:
        st.markdown("#### Variables Categóricas (para etiquetas)")
        categorical_columns = st.multiselect(
            "Selecciona variables categóricas para colorear gráficas",
            options=summary['categorical_columns'],
            default=summary['categorical_columns'][:2] if len(summary['categorical_columns']) >= 2 else summary['categorical_columns'],
            help="Estas variables se usarán para colorear puntos en las gráficas"
        )

    if len(numeric_columns) < 2:
        st.error("Debes seleccionar al menos 2 variables numéricas")
        st.stop()

    st.markdown("---")

    # Manejo de valores faltantes
    create_section_header("Manejo de Valores Faltantes")

    imputation_method = st.selectbox(
        "¿Cómo tratar los valores faltantes?",
        options=list(IMPUTATION_OPTIONS.keys()),
        help="Media/Mediana: rellena con el promedio. Eliminar: quita filas con datos faltantes"
    )

    # Escalamiento
    create_section_header("Escalamiento de Datos")

    scaling_method = st.selectbox(
        "Método de escalamiento",
        options=list(SCALING_OPTIONS.keys()),
        index=0,
        help="Estandarización (z-score) es recomendada para PCA"
    )

    create_info_box(
        "<b>Recomendación:</b> La estandarización (z-score) es típicamente la mejor opción para PCA, "
        "ya que asegura que todas las variables contribuyan equitativamente sin importar sus escalas originales.",
        "info"
    )

    st.markdown("---")

    # Vista previa de diagnóstico
    create_section_header("Diagnóstico de Variables")

    tab1, tab2 = st.tabs(["Distribuciones", "Correlaciones"])

    with tab1:
        if len(numeric_columns) > 0:
            # Boxplots
            fig_box = create_box_plot(df, numeric_columns[:10])  # Máximo 10 para no saturar
            st.plotly_chart(fig_box, use_container_width=True)

            # Histogramas individuales
            selected_var = st.selectbox("Ver histograma de:", numeric_columns)
            fig_hist = create_histogram(df, selected_var)
            st.plotly_chart(fig_hist, use_container_width=True)

    with tab2:
        if len(numeric_columns) >= 2:
            corr_matrix = compute_correlation_matrix(df, numeric_columns)
            fig_corr = create_correlation_heatmap(corr_matrix)
            st.plotly_chart(fig_corr, use_container_width=True)

            create_help_expander("pca")

    st.markdown("---")

    # Botón para ejecutar preprocesamiento
    if st.button("Ejecutar Preprocesamiento", type="primary"):
        try:
            preprocessor = DataPreprocessor()

            imputation_code = IMPUTATION_OPTIONS[imputation_method]
            scaling_code = SCALING_OPTIONS[scaling_method]

            df_numeric, df_complete = preprocessor.preprocess(
                df=df,
                numeric_cols=numeric_columns,
                categorical_cols=categorical_columns,
                imputation_method=imputation_code,
                scaling_method=scaling_code
            )

            st.session_state.preprocessed_data = df_complete
            st.session_state.preprocessor = preprocessor
            st.session_state.numeric_columns = numeric_columns
            st.session_state.categorical_columns = categorical_columns

            st.success("Preprocesamiento completado exitosamente")

            # Mostrar resumen
            prep_summary = preprocessor.get_preprocessing_summary()
            st.json(prep_summary)

        except Exception as e:
            st.error(f"Error durante el preprocesamiento: {e}")


# ============================================================================
# PÁGINA: PCA
# ============================================================================
elif page == "PCA":
    create_header("Análisis de Componentes Principales (PCA)", "Reduce dimensionalidad y visualiza patrones")

    if st.session_state.preprocessed_data is None:
        create_info_box("Primero debes preprocesar los datos en la página 'Preprocesamiento'", "warning")
        st.stop()

    df_complete = st.session_state.preprocessed_data
    numeric_cols = st.session_state.numeric_columns
    df_numeric = df_complete[numeric_cols]

    # Configuración de PCA
    create_section_header("Configuración de PCA")

    max_comp = min(MAX_COMPONENTS, df_numeric.shape[1], df_numeric.shape[0])

    n_components = st.slider(
        "Número de componentes principales a calcular",
        min_value=2,
        max_value=max_comp,
        value=min(DEFAULT_N_COMPONENTS, max_comp),
        help="Cuantos más componentes, más varianza capturas (pero menos reducción dimensional)"
    )

    if st.button("Calcular PCA", type="primary"):
        try:
            pca_analyzer = PCAAnalyzer(n_components=n_components)
            pca_analyzer.fit(df_numeric)

            st.session_state.pca_analyzer = pca_analyzer
            st.session_state.pca_fitted = True

            st.success("PCA calculado exitosamente")
        except Exception as e:
            st.error(f"Error al calcular PCA: {e}")

    # Mostrar resultados si PCA está calculado
    if st.session_state.pca_fitted:
        pca_analyzer = st.session_state.pca_analyzer

        st.markdown("---")

        # Resumen de PCA
        pca_summary = pca_analyzer.get_summary()
        show_pca_summary_cards(pca_summary)

        # Tabla de varianza explicada
        create_section_header("Varianza Explicada")

        variance_table = pca_analyzer.get_variance_table()
        st.dataframe(variance_table, use_container_width=True)

        # Scree plot
        fig_scree = create_scree_plot(
            pca_analyzer.variance_explained,
            pca_analyzer.variance_explained_cumulative
        )
        st.plotly_chart(fig_scree, use_container_width=True)

        create_help_expander("scree")

        st.markdown("---")

        # Scores plot
        create_section_header("Visualización de Scores")

        # Opciones de visualización
        col1, col2, col3 = st.columns(3)

        with col1:
            color_option = st.selectbox(
                "Colorear puntos por:",
                ["Ninguno"] + st.session_state.categorical_columns,
                help="Selecciona una variable categórica para colorear los puntos"
            )

        with col2:
            marker_size = st.slider("Tamaño de puntos", 3, 15, 8)

        with col3:
            opacity = st.slider("Opacidad", 0.1, 1.0, 0.7)

        color_palette = st.selectbox("Paleta de colores", list(COLOR_PALETTES.keys()))

        # Preparar datos para colorear
        color_by = None
        if color_option != "Ninguno":
            color_by = df_complete[color_option].values

        # Scores 2D
        tab1, tab2, tab3 = st.tabs(["2D (PC1 vs PC2)", "3D", "Biplot"])

        with tab1:
            fig_2d = create_scores_plot_2d(
                scores=pca_analyzer.scores,
                pc_x=0,
                pc_y=1,
                color_by=color_by,
                title="Scores Plot - PC1 vs PC2",
                marker_size=marker_size,
                opacity=opacity,
                color_palette=color_palette
            )
            st.plotly_chart(fig_2d, use_container_width=True)

        with tab2:
            if pca_analyzer.scores.shape[1] >= 3:
                fig_3d = create_scores_plot_3d(
                    scores=pca_analyzer.scores,
                    pc_x=0,
                    pc_y=1,
                    pc_z=2,
                    color_by=color_by,
                    title="Scores Plot 3D",
                    marker_size=marker_size,
                    opacity=opacity,
                    color_palette=color_palette
                )
                st.plotly_chart(fig_3d, use_container_width=True)
            else:
                st.info("Se necesitan al menos 3 componentes para visualización 3D")

        with tab3:
            n_loadings = st.slider("Número de vectores a mostrar", 3, 20, 10)

            fig_biplot = create_biplot(
                scores=pca_analyzer.scores,
                loadings=pca_analyzer.loadings,
                feature_names=numeric_cols,
                pc_x=0,
                pc_y=1,
                color_by=color_by,
                n_loadings=n_loadings,
                color_palette=color_palette,
                marker_size=marker_size,
                opacity=opacity
            )
            st.plotly_chart(fig_biplot, use_container_width=True)

            create_help_expander("biplot")

        st.markdown("---")

        # Loadings (contribución de variables)
        create_section_header("Contribución de Variables (Loadings)")

        loadings_df = pca_analyzer.get_loadings_df()

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("##### Tabla de Loadings")
            st.dataframe(loadings_df, use_container_width=True)

        with col2:
            st.markdown("##### Top Variables por Componente")
            pc_select = st.selectbox("Componente:", range(1, pca_analyzer.pca.n_components_ + 1))
            top_contrib = pca_analyzer.get_top_contributors(pc=pc_select, n=5)
            st.dataframe(top_contrib, use_container_width=True)


# ============================================================================
# PÁGINA: CLUSTERING
# ============================================================================
elif page == "Clustering":
    create_header("Análisis de Clustering", "Agrupa muestras similares")

    if not st.session_state.pca_fitted:
        create_info_box("Primero debes calcular el PCA en la página 'PCA'", "warning")
        st.stop()

    pca_analyzer = st.session_state.pca_analyzer
    df_complete = st.session_state.preprocessed_data

    # Seleccionar datos para clustering
    st.markdown("### ¿Sobre qué datos hacer clustering?")

    data_option = st.radio(
        "Selecciona:",
        ["Scores de PCA (recomendado)", "Datos originales preprocesados"]
    )

    if data_option == "Scores de PCA (recomendado)":
        X_cluster = pca_analyzer.scores
        feature_names_cluster = [f'PC{i+1}' for i in range(X_cluster.shape[1])]
    else:
        X_cluster = df_complete[st.session_state.numeric_columns].values
        feature_names_cluster = st.session_state.numeric_columns

    st.markdown("---")

    # Tabs para K-means y Jerárquico
    tab1, tab2 = st.tabs(["K-means", "Clustering Jerárquico"])

    # ========== K-MEANS ==========
    with tab1:
        create_section_header("K-means Clustering")

        # Selección de k
        st.markdown("#### Selección del Número de Clusters")

        col1, col2 = st.columns([1, 2])

        with col1:
            n_clusters_kmeans = st.slider(
                "Número de clusters (k)",
                min_value=2,
                max_value=min(MAX_CLUSTERS, X_cluster.shape[0] - 1),
                value=DEFAULT_N_CLUSTERS
            )

        with col2:
            # Métodos de evaluación
            if st.checkbox("Mostrar métodos de evaluación (Elbow, Silhouette)", value=True):
                with st.spinner("Calculando métricas..."):
                    k_values_elbow, inertias = compute_elbow_scores(X_cluster, max_k=min(10, X_cluster.shape[0] - 1))
                    k_values_sil, silhouettes = compute_silhouette_range(X_cluster, max_k=min(10, X_cluster.shape[0] - 1))

                    fig_elbow = create_elbow_plot(k_values_elbow, inertias)
                    st.plotly_chart(fig_elbow, use_container_width=True)

        # Ejecutar K-means
        if st.button("Ejecutar K-means", type="primary"):
            try:
                cluster_analyzer = st.session_state.cluster_analyzer
                labels_kmeans = cluster_analyzer.fit_kmeans(X_cluster, n_clusters=n_clusters_kmeans)

                silhouette_avg = cluster_analyzer.compute_silhouette_score()

                st.session_state.cluster_analyzer = cluster_analyzer
                st.session_state.kmeans_labels = labels_kmeans

                st.success(f"K-means completado | Silhouette Score: {silhouette_avg:.3f}")

            except Exception as e:
                st.error(f"Error en K-means: {e}")

        # Mostrar resultados de K-means
        if st.session_state.cluster_analyzer.kmeans_labels is not None:
            labels_kmeans = st.session_state.cluster_analyzer.kmeans_labels

            st.markdown("---")
            create_section_header("Resultados de K-means")

            # Silhouette score
            silhouette_avg = st.session_state.cluster_analyzer.compute_silhouette_score()
            silhouette_samples = st.session_state.cluster_analyzer.compute_silhouette_samples()

            col1, col2 = st.columns(2)

            with col1:
                st.metric("Silhouette Score Promedio", f"{silhouette_avg:.3f}")
                st.markdown("""
                **Interpretación:**
                - > 0.7: Excelente separación
                - 0.5 - 0.7: Buena separación
                - 0.25 - 0.5: Separación moderada
                - < 0.25: Pobre separación
                """)

            with col2:
                # Conteo por cluster
                unique, counts = np.unique(labels_kmeans, return_counts=True)
                cluster_counts = pd.DataFrame({
                    'Cluster': unique,
                    'N_muestras': counts
                })
                st.dataframe(cluster_counts, use_container_width=True)

            # Silhouette plot
            fig_sil = create_silhouette_plot(silhouette_samples, labels_kmeans, silhouette_avg)
            st.plotly_chart(fig_sil, use_container_width=True)

            create_help_expander("kmeans")

            # Visualizar clusters en espacio PCA
            st.markdown("#### Visualización de Clusters en Espacio PCA")

            # Controles de personalización para K-means
            col1, col2, col3 = st.columns(3)

            with col1:
                marker_size_kmeans = st.slider("Tamaño de puntos", 3, 15, 8, key="kmeans_marker_size")

            with col2:
                opacity_kmeans = st.slider("Opacidad", 0.1, 1.0, 0.7, key="kmeans_opacity")

            with col3:
                color_palette_kmeans = st.selectbox("Paleta de colores", list(COLOR_PALETTES.keys()), key="kmeans_palette")

            fig_clusters = create_scores_plot_2d(
                scores=pca_analyzer.scores,
                pc_x=0,
                pc_y=1,
                color_by=labels_kmeans,
                title="Clusters K-means en Espacio PCA",
                marker_size=marker_size_kmeans,
                opacity=opacity_kmeans,
                color_palette=color_palette_kmeans
            )
            st.plotly_chart(fig_clusters, use_container_width=True)

    # ========== JERÁRQUICO ==========
    with tab2:
        create_section_header("Clustering Jerárquico")

        # Selección de método de ligamiento
        linkage_method = st.selectbox(
            "Método de ligamiento",
            options=list(LINKAGE_METHODS.keys()),
            help="Ward minimiza varianza; Completo usa distancia máxima"
        )

        linkage_code = LINKAGE_METHODS[linkage_method]

        # Calcular dendrograma
        if st.button("Calcular Dendrograma", type="primary"):
            try:
                with st.spinner("Calculando clustering jerárquico..."):
                    linkage_matrix = compute_linkage_matrix(X_cluster, method=linkage_code)
                    st.session_state.linkage_matrix = linkage_matrix

                st.success("Dendrograma calculado")
            except Exception as e:
                st.error(f"Error: {e}")

        # Mostrar dendrograma
        if 'linkage_matrix' in st.session_state:
            linkage_matrix = st.session_state.linkage_matrix

            fig_dend = create_dendrogram_plot(linkage_matrix)
            st.plotly_chart(fig_dend, use_container_width=True)

            create_help_expander("hierarchical")

            st.markdown("---")

            # Cortar dendrograma
            st.markdown("#### Asignar Clusters Cortando el Dendrograma")

            n_clusters_hier = st.slider(
                "Número de clusters a formar",
                min_value=2,
                max_value=min(MAX_CLUSTERS, X_cluster.shape[0] - 1),
                value=DEFAULT_N_CLUSTERS
            )

            if st.button("Cortar y Asignar Clusters"):
                try:
                    labels_hier = assign_hierarchical_clusters(linkage_matrix, n_clusters_hier)
                    st.session_state.hierarchical_labels = labels_hier

                    st.success(f"Clusters asignados: {n_clusters_hier} grupos")
                except Exception as e:
                    st.error(f"Error: {e}")

            # Visualizar clusters jerárquicos
            if 'hierarchical_labels' in st.session_state:
                labels_hier = st.session_state.hierarchical_labels

                # Conteo
                unique, counts = np.unique(labels_hier, return_counts=True)
                cluster_counts = pd.DataFrame({
                    'Cluster': unique,
                    'N_muestras': counts
                })
                st.dataframe(cluster_counts, use_container_width=True)

                # Visualización en PCA
                st.markdown("#### Visualización de Clusters en Espacio PCA")

                # Controles de personalización para Clustering Jerárquico
                col1, col2, col3 = st.columns(3)

                with col1:
                    marker_size_hier = st.slider("Tamaño de puntos", 3, 15, 8, key="hier_marker_size")

                with col2:
                    opacity_hier = st.slider("Opacidad", 0.1, 1.0, 0.7, key="hier_opacity")

                with col3:
                    color_palette_hier = st.selectbox("Paleta de colores", list(COLOR_PALETTES.keys()), key="hier_palette")

                fig_hier = create_scores_plot_2d(
                    scores=pca_analyzer.scores,
                    pc_x=0,
                    pc_y=1,
                    color_by=labels_hier,
                    title="Clusters Jerárquicos en Espacio PCA",
                    marker_size=marker_size_hier,
                    opacity=opacity_hier,
                    color_palette=color_palette_hier
                )
                st.plotly_chart(fig_hier, use_container_width=True)


# ============================================================================
# PÁGINA: RESULTADOS Y EXPORTACIÓN
# ============================================================================
elif page == "Resultados":
    create_header("Resultados y Exportación", "Descarga tus análisis")

    if not st.session_state.pca_fitted:
        create_info_box("No hay resultados para exportar. Completa el análisis primero.", "warning")
        st.stop()

    create_section_header("Datos para Exportar")

    # Crear DataFrame de resultados
    pca_analyzer = st.session_state.pca_analyzer
    df_complete = st.session_state.preprocessed_data

    # Scores de PCA
    df_scores = pca_analyzer.get_scores_df()

    # Combinar con categóricas
    df_export = df_scores.copy()

    if st.session_state.categorical_columns:
        for cat_col in st.session_state.categorical_columns:
            df_export[cat_col] = df_complete[cat_col].values

    # Agregar labels de clustering si existen
    if st.session_state.cluster_analyzer.kmeans_labels is not None:
        df_export['Cluster_Kmeans'] = st.session_state.cluster_analyzer.kmeans_labels

    if 'hierarchical_labels' in st.session_state:
        df_export['Cluster_Jerarquico'] = st.session_state.hierarchical_labels

    # Vista previa
    st.markdown("### Vista Previa de Resultados")
    st.dataframe(df_export.head(20), use_container_width=True)

    # Sección de gráficas generadas
    st.markdown("---")
    st.markdown("### Gráficas Generadas")

    # Controles de personalización
    st.markdown("#### Controles de Personalización")
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        marker_size_export = st.slider(
            "Tamaño de marcadores 2D",
            min_value=3,
            max_value=15,
            value=8,
            key="export_marker_size"
        )

    with col2:
        opacity_export = st.slider(
            "Opacidad",
            min_value=0.1,
            max_value=1.0,
            value=0.7,
            step=0.1,
            key="export_opacity"
        )

    with col3:
        marker_size_3d = st.slider(
            "Tamaño de marcadores 3D",
            min_value=2,
            max_value=10,
            value=5,
            key="export_marker_size_3d"
        )

    with col4:
        color_palette_export = st.selectbox(
            "Paleta de colores",
            options=list(COLOR_PALETTES.keys()),
            key="export_palette"
        )

    st.markdown("---")

    # Recopilar todas las gráficas disponibles
    available_graphs = {}

    # Gráficas de PCA
    if st.session_state.pca_fitted:
        # Scree plot
        fig_scree = create_scree_plot(
            pca_analyzer.variance_explained,
            pca_analyzer.variance_explained_cumulative
        )
        available_graphs["Scree Plot (Varianza Explicada)"] = fig_scree

        # Scores plot 2D
        color_data = None
        if st.session_state.categorical_columns:
            color_data = df_complete[st.session_state.categorical_columns[0]].values

        fig_scores_2d = create_scores_plot_2d(
            scores=pca_analyzer.scores,
            pc_x=0,
            pc_y=1,
            color_by=color_data,
            title="Scores Plot 2D (PC1 vs PC2)",
            marker_size=marker_size_export,
            opacity=opacity_export,
            color_palette=color_palette_export
        )
        available_graphs["Scores Plot 2D"] = fig_scores_2d

        # Scores plot 3D si hay al menos 3 componentes
        if pca_analyzer.pca.n_components_ >= 3:
            fig_scores_3d = create_scores_plot_3d(
                scores=pca_analyzer.scores,
                color_by=color_data,
                title="Scores Plot 3D (PC1 vs PC2 vs PC3)",
                marker_size=marker_size_3d,
                opacity=opacity_export,
                color_palette=color_palette_export
            )
            available_graphs["Scores Plot 3D"] = fig_scores_3d

        # Biplot
        fig_biplot = create_biplot(
            scores=pca_analyzer.scores,
            loadings=pca_analyzer.loadings,
            feature_names=st.session_state.numeric_columns,
            color_by=color_data,
            n_loadings=10,
            color_palette=color_palette_export
        )
        available_graphs["Biplot"] = fig_biplot

    # Gráficas de clustering K-means
    if st.session_state.cluster_analyzer.kmeans_labels is not None:
        labels_kmeans = st.session_state.cluster_analyzer.kmeans_labels

        fig_kmeans = create_scores_plot_2d(
            scores=pca_analyzer.scores,
            pc_x=0,
            pc_y=1,
            color_by=labels_kmeans,
            title="Clusters K-means en Espacio PCA",
            marker_size=marker_size_export,
            opacity=opacity_export,
            color_palette=color_palette_export
        )
        available_graphs["Clusters K-means"] = fig_kmeans

    # Gráfica de clustering jerárquico
    if 'hierarchical_labels' in st.session_state:
        labels_hier = st.session_state.hierarchical_labels

        fig_hier = create_scores_plot_2d(
            scores=pca_analyzer.scores,
            pc_x=0,
            pc_y=1,
            color_by=labels_hier,
            title="Clusters Jerárquicos en Espacio PCA",
            marker_size=marker_size_export,
            opacity=opacity_export,
            color_palette=color_palette_export
        )
        available_graphs["Clusters Jerárquicos"] = fig_hier

    # Dendrograma si existe
    if 'linkage_matrix' in st.session_state:
        fig_dendro = create_dendrogram_plot(
            st.session_state.linkage_matrix
        )
        available_graphs["Dendrograma"] = fig_dendro

    # Mostrar y permitir descargar cada gráfica
    if available_graphs:
        for graph_name, fig in available_graphs.items():
            st.markdown(f"#### {graph_name}")
            st.plotly_chart(fig, use_container_width=True)

            # Botón de descarga para cada gráfica
            img_bytes = fig.to_image(format="png", width=1200, height=800, scale=2)
            st.download_button(
                label=f"Descargar {graph_name}",
                data=img_bytes,
                file_name=f"{graph_name.lower().replace(' ', '_')}.png",
                mime="image/png",
                key=f"download_{graph_name}"
            )
            st.markdown("---")
    else:
        create_info_box("No hay gráficas generadas todavía.", "warning")

    # Botones de descarga de datos
    st.markdown("### Descargar Datos")

    col1, col2 = st.columns(2)

    with col1:
        # Exportar resultados completos
        csv_results = export_results_to_csv(df_export)
        st.download_button(
            label="Descargar Resultados Completos (CSV)",
            data=csv_results,
            file_name="resultados_quimiometria.csv",
            mime="text/csv"
        )

    with col2:
        # Exportar tabla de varianza
        variance_table = pca_analyzer.get_variance_table()
        csv_variance = variance_table.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="Descargar Tabla de Varianza (CSV)",
            data=csv_variance,
            file_name="varianza_explicada.csv",
            mime="text/csv"
        )

    # Exportar loadings
    loadings_df = pca_analyzer.get_loadings_df()
    csv_loadings = loadings_df.to_csv().encode('utf-8')
    st.download_button(
        label="Descargar Loadings (CSV)",
        data=csv_loadings,
        file_name="loadings_pca.csv",
        mime="text/csv"
    )

    st.markdown("---")

    # Resumen del análisis
    create_section_header("Resumen del Análisis")

    summary_text = f"""
    ## Resumen del Análisis Quimiométrico

    ### Datos
    - **Observaciones:** {st.session_state.data.shape[0]}
    - **Variables numéricas analizadas:** {len(st.session_state.numeric_columns)}
    - **Variables categóricas:** {len(st.session_state.categorical_columns)}

    ### PCA
    - **Componentes calculados:** {pca_analyzer.pca.n_components_}
    - **Varianza total explicada:** {pca_analyzer.get_summary()['total_variance_explained']:.2f}%
    - **PC1:** {pca_analyzer.variance_explained[0]:.2f}%
    - **PC2:** {pca_analyzer.variance_explained[1]:.2f}%

    ### Clustering
    """

    if st.session_state.cluster_analyzer.kmeans_labels is not None:
        n_clusters_k = len(np.unique(st.session_state.cluster_analyzer.kmeans_labels))
        sil_score = st.session_state.cluster_analyzer.compute_silhouette_score()
        summary_text += f"""
    - **K-means:** {n_clusters_k} clusters
    - **Silhouette Score:** {sil_score:.3f}
        """

    st.markdown(summary_text)


# ============================================================================
# PÁGINA: AYUDA
# ============================================================================
elif page == "Ayuda":
    create_header("Ayuda e Interpretación", "Guía para entender tus resultados")

    st.markdown("""
    ## Guía de Uso

    Esta herramienta está diseñada para estudiantes y docentes de química que necesitan
    analizar datos de laboratorio sin experiencia previa en programación.

    ### Flujo de Trabajo Recomendado

    1. **Cargar Datos**: Sube tu archivo CSV o Excel con datos de laboratorio
    2. **Preprocesar**: Configura cómo limpiar y escalar tus datos
    3. **PCA**: Reduce dimensionalidad y visualiza patrones principales
    4. **Clustering**: Encuentra grupos naturales en tus muestras
    5. **Exportar**: Descarga resultados y gráficas

    ---
    """)

    # PCA
    with st.expander("¿Qué es PCA?"):
        st.markdown("""
        ### Análisis de Componentes Principales (PCA)

        PCA es como encontrar los "mejores ángulos de visión" para tus datos.

        **¿Por qué usar PCA?**
        - Tienes muchas variables correlacionadas
        - Quieres visualizar datos en 2D o 3D
        - Necesitas reducir ruido en los datos

        **¿Cómo interpretar?**
        - **Varianza explicada**: Qué % de información captura cada componente
        - **Scree plot**: Gráfica de "codo" para decidir cuántos PCs retener
        - **Scores**: Posición de tus muestras en el nuevo espacio
        - **Loadings**: Qué variables contribuyen a cada componente

        **Ejemplo en Quimiometría:**
        Si tienes 20 picos de FAME (ácidos grasos), PCA te ayuda a ver
        qué mezclas de biodiesel se parecen entre sí, basándose en todos
        los picos simultáneamente.
        """)

    # Clustering
    with st.expander("¿Qué es Clustering?"):
        st.markdown("""
        ### Clustering (Agrupamiento)

        Clustering agrupa automáticamente muestras similares.

        **K-means:**
        - Necesitas especificar cuántos grupos esperas
        - Rápido y simple
        - Usa Silhouette Score para evaluar calidad

        **Clustering Jerárquico:**
        - No necesitas especificar número de grupos por adelantado
        - Crea un "árbol" (dendrograma) mostrando relaciones
        - Puedes "cortar" a diferentes alturas para obtener diferentes agrupamientos

        **¿Cuándo usar cada uno?**
        - K-means: Cuando tienes idea de cuántos grupos esperar
        - Jerárquico: Cuando quieres explorar relaciones y jerarquías

        **Ejemplo:**
        Si mezclas biodiesel de diferentes materias primas (soja, palma, etc.),
        clustering puede separar automáticamente las muestras por origen.
        """)

    # Métricas
    with st.expander("Métricas de Evaluación"):
        st.markdown("""
        ### Silhouette Score

        Mide qué tan bien agrupadas están las muestras.

        - **1.0**: Perfecto (clusters muy separados y compactos)
        - **0.7 - 1.0**: Excelente
        - **0.5 - 0.7**: Bueno
        - **0.25 - 0.5**: Moderado
        - **< 0.25**: Pobre (clusters se superponen)

        ### Varianza Explicada

        Indica qué % de la información original captura cada componente principal.

        - Si PC1 + PC2 > 80%, un gráfico 2D captura bien tus datos
        - Si necesitas 5+ PCs para 80%, tus datos son muy complejos

        ### Elbow Plot

        Ayuda a elegir el número óptimo de clusters.
        Busca el "codo" donde la curva se aplana.
        """)

    # Preprocesamiento
    with st.expander("Opciones de Preprocesamiento"):
        st.markdown("""
        ### Escalamiento

        **Estandarización (Z-score):**
        - Centra cada variable en media 0 y desviación estándar 1
        - **Recomendado para PCA**
        - Útil cuando variables tienen diferentes unidades

        **Normalización Min-Max:**
        - Escala a rango [0, 1]
        - Útil cuando necesitas valores acotados

        ### Valores Faltantes

        **Media/Mediana:**
        - Rellena con el promedio
        - Conserva todas las muestras

        **Eliminar:**
        - Quita filas con datos faltantes
        - Reduce tamaño del dataset
        """)

    st.markdown("---")

    st.markdown("""
    ## Consejos Prácticos

    1. **Siempre visualiza tus datos originales** (histogramas, boxplots) antes de PCA
    2. **Usa estandarización** para PCA en casi todos los casos
    3. **Colorea por variables categóricas** para encontrar patrones (ej. materia prima, concentración)
    4. **El Silhouette Score** es tu amigo para evaluar clustering
    5. **Exporta tus resultados** regularmente para no perder trabajo

    ## Problemas Comunes

    **"Mi PCA no muestra patrones claros"**
    - Puede que tus variables no estén correlacionadas
    - Intenta diferentes escalamientos
    - Revisa si hay outliers

    **"El Silhouette Score es muy bajo"**
    - Tus datos pueden no tener grupos naturales
    - Prueba diferente número de clusters
    - Considera que no todos los datos se agrupan bien

    **"El dendrograma es muy complejo"**
    - Normal con muchas muestras
    - Enfócate en los cortes principales
    - Usa diferentes métodos de ligamiento
    """)

    st.markdown("---")

    st.markdown("""
    ## Soporte

    Esta herramienta fue creada para facilitar el análisis quimiométrico.
    Para más información sobre los métodos, consulta libros de quimiometría
    o tutoriales de análisis multivariado.

    **Herramientas usadas:**
    - Streamlit (interfaz)
    - Scikit-learn (PCA y clustering)
    - Plotly (visualizaciones interactivas)
    """)
