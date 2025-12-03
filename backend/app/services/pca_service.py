"""
Servicio para Análisis de Componentes Principales (PCA)
"""

import numpy as np
from typing import Dict, Any, Optional, List
from sklearn.decomposition import PCA

from app.services.store import store


def calcular_pca(session_id: str, n_componentes: Optional[int] = None) -> Dict[str, Any]:
    """
    Realiza análisis PCA sobre los datos preprocesados.

    Args:
        session_id: ID de la sesión
        n_componentes: Número de componentes a calcular (None = todos)

    Returns:
        Diccionario con resultados del PCA
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.X_procesado is None:
        raise ValueError("No hay datos preprocesados. Por favor, aplica preprocesamiento primero.")

    X = session.X_procesado

    # Determinar número de componentes
    max_componentes = min(X.shape[0], X.shape[1])
    if n_componentes is None or n_componentes > max_componentes:
        n_componentes = max_componentes

    # Realizar PCA
    pca = PCA(n_components=n_componentes)
    scores = pca.fit_transform(X)
    loadings = pca.components_.T  # Transponer para tener variables x componentes

    # Varianza explicada
    varianza_explicada = pca.explained_variance_ratio_
    varianza_acumulada = np.cumsum(varianza_explicada)

    # Nombres de componentes
    componentes_nombres = [f"PC{i+1}" for i in range(n_componentes)]

    # Guardar en sesión
    session.pca_scores = scores
    session.pca_loadings = loadings
    session.pca_varianza = varianza_explicada
    session.pca_componentes_nombres = componentes_nombres

    # Preparar respuesta
    varianza_info = []
    for i in range(n_componentes):
        varianza_info.append({
            "componente": componentes_nombres[i],
            "varianza_explicada": float(varianza_explicada[i] * 100),
            "varianza_acumulada": float(varianza_acumulada[i] * 100)
        })

    # Scores como lista de diccionarios
    scores_list = []
    for i in range(scores.shape[0]):
        score_dict = {}
        for j, nombre in enumerate(componentes_nombres):
            score_dict[nombre] = float(scores[i, j])
        scores_list.append(score_dict)

    # Loadings como lista de diccionarios (una entrada por variable)
    loadings_list = []
    variables = session.columnas_seleccionadas
    for i, var in enumerate(variables):
        loading_dict = {"variable": var}
        for j, nombre in enumerate(componentes_nombres):
            loading_dict[nombre] = float(loadings[i, j])
        loadings_list.append(loading_dict)

    return {
        "n_componentes": n_componentes,
        "varianza_explicada": varianza_info,
        "scores": scores_list,
        "loadings": loadings_list,
        "nombres_muestras": list(range(len(scores))),
        "nombres_variables": variables,
        "feedstock": session.feedstock.tolist() if session.feedstock is not None else None,
        "concentration": session.concentration.tolist() if session.concentration is not None else None
    }


def obtener_scores_para_cluster(session_id: str, usar_pca: bool = True) -> np.ndarray:
    """
    Obtiene los datos para clustering (scores de PCA o datos originales).

    Args:
        session_id: ID de la sesión
        usar_pca: Si True, usa scores de PCA; si False, usa datos preprocesados

    Returns:
        Array numpy con los datos
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if usar_pca:
        if session.pca_scores is None:
            raise ValueError("No hay resultados de PCA. Por favor, ejecuta PCA primero.")
        return session.pca_scores
    else:
        if session.X_procesado is None:
            raise ValueError("No hay datos preprocesados.")
        return session.X_procesado
