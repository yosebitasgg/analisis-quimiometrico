"""
Servicio para Búsqueda de Similitud / Fingerprinting Químico
Encuentra muestras similares basándose en perfiles de FAMEs
"""

import numpy as np
from typing import Dict, Any, Optional, List
from scipy.spatial.distance import cdist
from sklearn.metrics.pairwise import cosine_similarity

from app.services.store import store


# Mapeos de etiquetas
FEEDSTOCK_LABELS = {
    1: "Diesel",
    2: "Animal Tallow (Texas)",
    3: "Animal Tallow (IRE)",
    4: "Canola",
    5: "Waste Grease",
    6: "Soybean",
    7: "Desconocido"
}

CONCENTRATION_LABELS = {
    1: "Diesel",
    2: "B2",
    3: "B5",
    4: "B10",
    5: "B20",
    6: "B100",
    7: "Desconocida"
}


def calcular_distancias(
    X_ref: np.ndarray,
    X_all: np.ndarray,
    metric: str = "euclidean"
) -> np.ndarray:
    """
    Calcula distancias entre una muestra de referencia y todas las demás.

    Args:
        X_ref: Array de forma (1, n_features) con la muestra de referencia
        X_all: Array de forma (n_samples, n_features) con todas las muestras
        metric: 'euclidean' o 'cosine'

    Returns:
        Array de distancias
    """
    if metric == "euclidean":
        distances = cdist(X_ref.reshape(1, -1), X_all, metric='euclidean')[0]
    elif metric == "cosine":
        # Distancia coseno = 1 - similitud coseno
        sim = cosine_similarity(X_ref.reshape(1, -1), X_all)[0]
        distances = 1 - sim
    else:
        raise ValueError(f"Métrica no soportada: {metric}")

    return distances


def buscar_similares(
    session_id: str,
    sample_index: Optional[int] = None,
    sample_values: Optional[Dict[str, float]] = None,
    space: str = "pca",
    metric: str = "euclidean",
    k: int = 5
) -> Dict[str, Any]:
    """
    Busca las k muestras más similares a una muestra de referencia.

    Args:
        session_id: ID de la sesión
        sample_index: Índice de la muestra de referencia (si es existente)
        sample_values: Valores de la muestra de referencia (si es nueva)
        space: 'pca' para usar scores de PCA, 'original' para datos preprocesados
        metric: 'euclidean' o 'cosine'
        k: Número de vecinos a retornar

    Returns:
        Diccionario con la muestra de referencia, vecinos encontrados e interpretación
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener matriz de datos según el espacio
    if space == "pca":
        if session.pca_scores is None:
            raise ValueError("No hay resultados de PCA. Ejecuta PCA primero.")
        X_all = session.pca_scores
        feature_names = session.pca_componentes_nombres
    else:
        if session.X_procesado is None:
            raise ValueError("No hay datos preprocesados.")
        X_all = session.X_procesado
        feature_names = session.columnas_seleccionadas

    n_samples = X_all.shape[0]

    # Obtener muestra de referencia
    if sample_index is not None:
        if sample_index < 0 or sample_index >= n_samples:
            raise ValueError(f"Índice fuera de rango. Debe estar entre 0 y {n_samples-1}")
        X_ref = X_all[sample_index]
        ref_idx = sample_index
    elif sample_values is not None:
        # Construir vector desde valores proporcionados
        X_ref = np.array([sample_values.get(fn, 0) for fn in feature_names])
        ref_idx = -1  # Indica muestra externa
    else:
        raise ValueError("Debes proporcionar sample_index o sample_values")

    # Calcular distancias
    distances = calcular_distancias(X_ref, X_all, metric)

    # Obtener índices ordenados por distancia (excluyendo la propia muestra si aplica)
    sorted_indices = np.argsort(distances)

    # Filtrar la propia muestra si es de referencia interna
    if sample_index is not None:
        sorted_indices = sorted_indices[sorted_indices != sample_index]

    # Tomar los k más cercanos
    top_k_indices = sorted_indices[:k]

    # Construir información de vecinos
    vecinos = []
    for idx in top_k_indices:
        dist = float(distances[idx])

        # Calcular similitud (inverso de distancia normalizado)
        if metric == "euclidean":
            # Similitud basada en distancia euclidiana
            sim = 1 / (1 + dist)
        else:
            # Para coseno, similitud = 1 - distancia
            sim = 1 - dist

        # Obtener feedstock y concentration si están disponibles
        feedstock_code = None
        feedstock_name = None
        concentration_code = None
        concentration_name = None

        if session.feedstock is not None:
            feedstock_code = int(session.feedstock[idx])
            feedstock_name = FEEDSTOCK_LABELS.get(feedstock_code, f"Tipo {feedstock_code}")

        if session.concentration is not None:
            concentration_code = int(session.concentration[idx])
            concentration_name = CONCENTRATION_LABELS.get(concentration_code, f"Nivel {concentration_code}")

        # Obtener coordenadas PCA para visualización
        pc1, pc2 = None, None
        if session.pca_scores is not None:
            pc1 = float(session.pca_scores[idx, 0])
            if session.pca_scores.shape[1] > 1:
                pc2 = float(session.pca_scores[idx, 1])

        vecinos.append({
            "indice": int(idx),
            "distancia": dist,
            "similitud": float(sim),
            "feedstock": feedstock_name,
            "feedstock_codigo": feedstock_code,
            "concentration": concentration_name,
            "concentration_codigo": concentration_code,
            "pc1": pc1,
            "pc2": pc2
        })

    # Construir información de muestra de referencia
    ref_feedstock = None
    ref_concentration = None
    ref_pc1, ref_pc2 = None, None

    if sample_index is not None:
        if session.feedstock is not None:
            ref_feedstock = FEEDSTOCK_LABELS.get(int(session.feedstock[sample_index]), "Desconocido")
        if session.concentration is not None:
            ref_concentration = CONCENTRATION_LABELS.get(int(session.concentration[sample_index]), "Desconocida")
        if session.pca_scores is not None:
            ref_pc1 = float(session.pca_scores[sample_index, 0])
            if session.pca_scores.shape[1] > 1:
                ref_pc2 = float(session.pca_scores[sample_index, 1])

    muestra_ref = {
        "indice": ref_idx,
        "feedstock": ref_feedstock,
        "concentration": ref_concentration,
        "pc1": ref_pc1,
        "pc2": ref_pc2
    }

    # Generar interpretación
    if len(vecinos) > 0:
        # Analizar feedstocks de los vecinos
        feedstocks_vecinos = [v["feedstock"] for v in vecinos if v["feedstock"]]
        if feedstocks_vecinos:
            from collections import Counter
            feedstock_counts = Counter(feedstocks_vecinos)
            mas_comun = feedstock_counts.most_common(1)[0]
            pct = (mas_comun[1] / len(feedstocks_vecinos)) * 100

            if pct >= 80:
                interpretacion = (
                    f"Las {k} muestras más similares son predominantemente de {mas_comun[0]} "
                    f"({pct:.0f}%). Esto sugiere una fuerte asociación del perfil químico "
                    f"con esta materia prima."
                )
            elif pct >= 50:
                interpretacion = (
                    f"La mayoría de las muestras similares ({pct:.0f}%) corresponden a {mas_comun[0]}, "
                    f"pero hay variabilidad. El perfil químico tiene características mixtas."
                )
            else:
                interpretacion = (
                    f"Las muestras similares provienen de diversas fuentes. "
                    f"El perfil químico no está claramente asociado a una sola materia prima."
                )
        else:
            dist_promedio = np.mean([v["distancia"] for v in vecinos])
            interpretacion = (
                f"Se encontraron {k} muestras similares con distancia promedio de {dist_promedio:.3f}. "
                f"Cuanto menor la distancia, mayor la similitud química."
            )
    else:
        interpretacion = "No se encontraron muestras similares."

    return {
        "muestra_referencia": muestra_ref,
        "vecinos": vecinos,
        "interpretacion": interpretacion
    }


def obtener_todas_distancias(
    session_id: str,
    sample_index: int,
    space: str = "pca",
    metric: str = "euclidean"
) -> Dict[str, Any]:
    """
    Obtiene las distancias de una muestra a todas las demás (útil para visualización).

    Returns:
        Diccionario con índices, distancias y coordenadas PCA
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener matriz de datos
    if space == "pca":
        if session.pca_scores is None:
            raise ValueError("No hay resultados de PCA.")
        X_all = session.pca_scores
    else:
        if session.X_procesado is None:
            raise ValueError("No hay datos preprocesados.")
        X_all = session.X_procesado

    X_ref = X_all[sample_index]
    distances = calcular_distancias(X_ref, X_all, metric)

    # Preparar datos para visualización
    puntos = []
    for i in range(len(distances)):
        punto = {
            "indice": i,
            "distancia": float(distances[i]),
            "es_referencia": i == sample_index
        }

        if session.pca_scores is not None:
            punto["pc1"] = float(session.pca_scores[i, 0])
            if session.pca_scores.shape[1] > 1:
                punto["pc2"] = float(session.pca_scores[i, 1])

        if session.feedstock is not None:
            punto["feedstock"] = int(session.feedstock[i])

        if session.concentration is not None:
            punto["concentration"] = int(session.concentration[i])

        puntos.append(punto)

    return {
        "sample_index": sample_index,
        "puntos": puntos,
        "metric": metric,
        "space": space
    }
