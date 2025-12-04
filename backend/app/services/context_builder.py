"""
Constructor de contexto para el Asistente Quimiométrico Virtual.
Genera un resumen compacto del análisis actual para el LLM.
Incluye diagnósticos PCA (T², Q-residuals) y recomendaciones de optimización.
"""

from typing import Dict, Any, Optional
from app.services.store import store


def _get_diagnostics_context(session_id: str) -> str:
    """
    Obtiene contexto de diagnósticos PCA (T², Q) si están disponibles.
    """
    try:
        from app.services.pca_service import calcular_diagnosticos_pca
        diagnosticos = calcular_diagnosticos_pca(session_id)
        stats = diagnosticos["estadisticas"]

        context = f"""
### Diagnósticos Multivariados (Control de Calidad)
- Hotelling T² (distancia al centro del modelo):
  - Media: {stats['t2_media']:.2f}, Máximo: {stats['t2_max']:.2f}
  - Outliers al 95%: {stats['n_outliers_t2']} muestras
- Q-residuals (error de reconstrucción):
  - Media: {stats['q_media']:.4f}, Máximo: {stats['q_max']:.4f}
  - Outliers al 95%: {stats['n_outliers_q']} muestras
- Muestras con anomalía combinada (T² y Q elevados): {stats['n_outliers_combinados']}
"""
        return context
    except Exception:
        return ""


def _get_optimization_context(session_id: str) -> str:
    """
    Obtiene contexto de optimización de número de PCs si está disponible.
    """
    try:
        from app.services.pca_service import calcular_optimizacion_pcs
        optim = calcular_optimizacion_pcs(session_id)

        context = f"""
### Recomendación de Número de Componentes
- Número de PCs recomendado: {optim['componentes_recomendados']}
- Varianza explicada: {optim['varianza_recomendada']:.1f}%
- Justificación: {optim['motivo_recomendacion']}
"""
        return context
    except Exception:
        return ""


def build_analysis_context(session_id: Optional[str]) -> str:
    """
    Construye un contexto textual del análisis actual.

    Args:
        session_id: ID de la sesión actual

    Returns:
        String con el contexto formateado para el LLM
    """
    if not session_id or not store.sesion_existe(session_id):
        return "No hay datos cargados en la sesión actual."

    session = store.obtener_sesion(session_id)
    context_parts = []

    # =========================================================================
    # 1. INFORMACIÓN DEL DATASET
    # =========================================================================
    if session.df_original is not None:
        n_muestras = len(session.df_original)
        n_cols_total = len(session.df_original.columns)
        context_parts.append(f"""
## Dataset Cargado
- Número de muestras: {n_muestras}
- Número de columnas totales: {n_cols_total}
- Columnas numéricas: {len(session.columnas_numericas)} ({', '.join(session.columnas_numericas[:5])}{'...' if len(session.columnas_numericas) > 5 else ''})
- Columnas categóricas: {len(session.columnas_categoricas)} ({', '.join(session.columnas_categoricas) if session.columnas_categoricas else 'ninguna'})
""")

    # =========================================================================
    # 2. PREPROCESAMIENTO
    # =========================================================================
    if session.X_procesado is not None:
        context_parts.append(f"""
## Preprocesamiento Aplicado
- Variables seleccionadas para análisis: {len(session.columnas_seleccionadas)}
- Dimensiones de datos procesados: {session.X_procesado.shape[0]} muestras × {session.X_procesado.shape[1]} variables
- Variables: {', '.join(session.columnas_seleccionadas[:10])}{'...' if len(session.columnas_seleccionadas) > 10 else ''}
""")

    # =========================================================================
    # 3. RESULTADOS DE PCA
    # =========================================================================
    if session.pca_scores is not None and session.pca_varianza is not None:
        n_componentes = len(session.pca_varianza)
        varianza_total = sum(session.pca_varianza) * 100

        # Top componentes
        top_componentes = []
        var_acum = 0
        for i, var in enumerate(session.pca_varianza[:5]):
            var_acum += var * 100
            top_componentes.append(f"PC{i+1}: {var*100:.1f}% (acum: {var_acum:.1f}%)")

        # Top loadings para PC1 y PC2
        loadings_pc1 = []
        loadings_pc2 = []
        if session.pca_loadings is not None and len(session.columnas_seleccionadas) > 0:
            # Ordenar por valor absoluto
            import numpy as np
            pc1_idx = np.argsort(np.abs(session.pca_loadings[:, 0]))[::-1][:3]
            pc2_idx = np.argsort(np.abs(session.pca_loadings[:, 1]))[::-1][:3] if session.pca_loadings.shape[1] > 1 else []

            for idx in pc1_idx:
                var_name = session.columnas_seleccionadas[idx]
                loading_val = session.pca_loadings[idx, 0]
                loadings_pc1.append(f"{var_name}: {loading_val:.3f}")

            for idx in pc2_idx:
                var_name = session.columnas_seleccionadas[idx]
                loading_val = session.pca_loadings[idx, 1]
                loadings_pc2.append(f"{var_name}: {loading_val:.3f}")

        context_parts.append(f"""
## Análisis de Componentes Principales (PCA)
- Número de componentes calculados: {n_componentes}
- Varianza explicada total: {varianza_total:.1f}%
- Distribución de varianza: {', '.join(top_componentes)}
- Variables más influyentes en PC1: {', '.join(loadings_pc1) if loadings_pc1 else 'N/A'}
- Variables más influyentes en PC2: {', '.join(loadings_pc2) if loadings_pc2 else 'N/A'}
""")

        # Añadir diagnósticos PCA si están disponibles
        diagnostics_ctx = _get_diagnostics_context(session_id)
        if diagnostics_ctx:
            context_parts.append(diagnostics_ctx)

        # Añadir recomendación de optimización
        optimization_ctx = _get_optimization_context(session_id)
        if optimization_ctx:
            context_parts.append(optimization_ctx)

    # =========================================================================
    # 4. RESULTADOS DE CLUSTERING
    # =========================================================================
    if session.cluster_labels is not None:
        import numpy as np
        n_clusters = len(np.unique(session.cluster_labels))
        cluster_sizes = {}
        for label in session.cluster_labels:
            cluster_sizes[label] = cluster_sizes.get(label, 0) + 1

        sizes_str = ', '.join([f"Cluster {k}: {v} muestras ({v/len(session.cluster_labels)*100:.1f}%)"
                               for k, v in sorted(cluster_sizes.items())])

        context_parts.append(f"""
## Análisis de Clustering
- Método utilizado: {session.cluster_metodo or 'No especificado'}
- Número de clusters: {n_clusters}
- Distribución: {sizes_str}
""")

    # =========================================================================
    # 5. CLASIFICADOR SUPERVISADO
    # =========================================================================
    classifiers_info = []

    if session.classifier_feedstock is not None and session.classifier_feedstock.modelo is not None:
        clf = session.classifier_feedstock
        classifiers_info.append(f"""
### Clasificador de Feedstock (Materia Prima)
- Modelo: {clf.modelo_tipo}
- Accuracy: {clf.accuracy*100:.1f}%
- F1-Score: {clf.f1_score*100:.1f}%
- Clases: {', '.join(clf.class_labels)}
- Usa PCA: {'Sí' if clf.usar_pca else 'No'}
""")

    if session.classifier_concentration is not None and session.classifier_concentration.modelo is not None:
        clf = session.classifier_concentration
        classifiers_info.append(f"""
### Clasificador de Concentración
- Modelo: {clf.modelo_tipo}
- Accuracy: {clf.accuracy*100:.1f}%
- F1-Score: {clf.f1_score*100:.1f}%
- Clases: {', '.join(clf.class_labels)}
- Usa PCA: {'Sí' if clf.usar_pca else 'No'}
""")

    if classifiers_info:
        context_parts.append("## Clasificadores Supervisados Entrenados" + "".join(classifiers_info))

    # =========================================================================
    # 6. INFORMACIÓN DE CATEGORÍAS
    # =========================================================================
    categories_info = []

    if session.feedstock is not None:
        import numpy as np
        unique_feedstock = np.unique(session.feedstock)
        feedstock_labels = {
            1: 'Diesel', 2: 'Animal Tallow (Texas)', 3: 'Animal Tallow (IRE)',
            4: 'Canola', 5: 'Waste Grease', 6: 'Soybean', 7: 'Desconocido'
        }
        categories_info.append(f"- Tipos de feedstock presentes: {', '.join([feedstock_labels.get(int(f), str(f)) for f in unique_feedstock])}")

    if session.concentration is not None:
        import numpy as np
        unique_conc = np.unique(session.concentration)
        conc_labels = {
            1: 'Diesel', 2: 'B2', 3: 'B5', 4: 'B10', 5: 'B20', 6: 'B100', 7: 'Desconocida'
        }
        categories_info.append(f"- Concentraciones presentes: {', '.join([conc_labels.get(int(c), str(c)) for c in unique_conc])}")

    if categories_info:
        context_parts.append("## Categorías en el Dataset\n" + "\n".join(categories_info))

    # =========================================================================
    # CONSTRUIR CONTEXTO FINAL
    # =========================================================================
    if not context_parts:
        return "La sesión existe pero no hay análisis realizados aún."

    return "\n".join(context_parts)


def get_compact_context(session_id: Optional[str]) -> Dict[str, Any]:
    """
    Obtiene un contexto estructurado (dict) del análisis actual.
    Útil para debugging o respuestas más estructuradas.

    Args:
        session_id: ID de la sesión actual

    Returns:
        Dict con información estructurada del análisis
    """
    if not session_id or not store.sesion_existe(session_id):
        return {"status": "no_session", "message": "No hay sesión activa"}

    session = store.obtener_sesion(session_id)

    context = {
        "status": "active",
        "dataset": None,
        "preprocessing": None,
        "pca": None,
        "clustering": None,
        "classifiers": {}
    }

    # Dataset
    if session.df_original is not None:
        context["dataset"] = {
            "n_samples": len(session.df_original),
            "n_columns": len(session.df_original.columns),
            "numeric_cols": len(session.columnas_numericas),
            "categorical_cols": len(session.columnas_categoricas)
        }

    # Preprocessing
    if session.X_procesado is not None:
        context["preprocessing"] = {
            "n_samples": session.X_procesado.shape[0],
            "n_features": session.X_procesado.shape[1],
            "selected_columns": session.columnas_seleccionadas
        }

    # PCA
    if session.pca_scores is not None:
        context["pca"] = {
            "n_components": len(session.pca_varianza) if session.pca_varianza is not None else 0,
            "total_variance": float(sum(session.pca_varianza) * 100) if session.pca_varianza is not None else 0
        }

    # Clustering
    if session.cluster_labels is not None:
        import numpy as np
        context["clustering"] = {
            "method": session.cluster_metodo,
            "n_clusters": len(np.unique(session.cluster_labels))
        }

    # Classifiers
    if session.classifier_feedstock is not None and session.classifier_feedstock.modelo is not None:
        context["classifiers"]["feedstock"] = {
            "model": session.classifier_feedstock.modelo_tipo,
            "accuracy": session.classifier_feedstock.accuracy
        }

    if session.classifier_concentration is not None and session.classifier_concentration.modelo is not None:
        context["classifiers"]["concentration"] = {
            "model": session.classifier_concentration.modelo_tipo,
            "accuracy": session.classifier_concentration.accuracy
        }

    return context
