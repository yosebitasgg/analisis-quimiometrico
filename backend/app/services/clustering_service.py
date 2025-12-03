"""
Servicio para análisis de Clustering (K-means y Jerárquico)
"""

import numpy as np
from typing import Dict, Any, Optional, List
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score, silhouette_samples
from scipy.cluster.hierarchy import linkage, dendrogram
from scipy.spatial.distance import pdist

from app.services.store import store
from app.services.pca_service import obtener_scores_para_cluster


def calcular_kmeans(
    session_id: str,
    n_clusters: int = 3,
    usar_pca: bool = True
) -> Dict[str, Any]:
    """
    Realiza clustering K-means.

    Args:
        session_id: ID de la sesión
        n_clusters: Número de clústeres
        usar_pca: Si True, usa scores de PCA; si False, datos originales

    Returns:
        Diccionario con resultados del clustering
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener datos
    X = obtener_scores_para_cluster(session_id, usar_pca)

    # Aplicar K-means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    # Calcular silhouette
    sil_score = None
    if len(np.unique(labels)) > 1:
        sil_score = float(silhouette_score(X, labels))

    # Guardar etiquetas en sesión
    session.cluster_labels = labels
    session.cluster_metodo = "kmeans"

    # Calcular estadísticas por clúster
    estadisticas = calcular_estadisticas_clusters(session, labels, usar_pca)

    return {
        "metodo": "kmeans",
        "n_clusters": n_clusters,
        "etiquetas": labels.tolist(),
        "silhouette_score": sil_score,
        "inercia": float(kmeans.inertia_),
        "estadisticas_clusters": estadisticas,
        "dendrograma_data": None
    }


def calcular_jerarquico(
    session_id: str,
    n_clusters: int = 3,
    linkage_method: str = "ward",
    usar_pca: bool = True
) -> Dict[str, Any]:
    """
    Realiza clustering jerárquico aglomerativo.

    Args:
        session_id: ID de la sesión
        n_clusters: Número de clústeres
        linkage_method: Método de enlace ('ward', 'complete', 'average')
        usar_pca: Si True, usa scores de PCA; si False, datos originales

    Returns:
        Diccionario con resultados del clustering
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener datos
    X = obtener_scores_para_cluster(session_id, usar_pca)

    # Aplicar clustering jerárquico
    clustering = AgglomerativeClustering(
        n_clusters=n_clusters,
        linkage=linkage_method
    )
    labels = clustering.fit_predict(X)

    # Calcular silhouette
    sil_score = None
    if len(np.unique(labels)) > 1:
        sil_score = float(silhouette_score(X, labels))

    # Guardar etiquetas en sesión
    session.cluster_labels = labels
    session.cluster_metodo = "jerarquico"

    # Calcular dendrograma
    dendro_data = calcular_dendrograma(X, linkage_method)

    # Calcular estadísticas por clúster
    estadisticas = calcular_estadisticas_clusters(session, labels, usar_pca)

    return {
        "metodo": "jerarquico",
        "n_clusters": n_clusters,
        "etiquetas": labels.tolist(),
        "silhouette_score": sil_score,
        "inercia": None,
        "estadisticas_clusters": estadisticas,
        "dendrograma_data": dendro_data
    }


def calcular_dendrograma(X: np.ndarray, method: str = "ward") -> Dict[str, Any]:
    """
    Calcula los datos necesarios para dibujar un dendrograma.
    """
    # Calcular linkage matrix
    Z = linkage(X, method=method)

    # Generar datos del dendrograma
    dendro = dendrogram(Z, no_plot=True)

    return {
        "icoord": dendro["icoord"],
        "dcoord": dendro["dcoord"],
        "ivl": [str(x) for x in dendro["ivl"]],
        "leaves": dendro["leaves"],
        "color_list": dendro["color_list"]
    }


def calcular_estadisticas_clusters(
    session,
    labels: np.ndarray,
    usar_pca: bool
) -> List[Dict[str, Any]]:
    """
    Calcula estadísticas descriptivas por clúster.
    """
    estadisticas = []
    n_total = len(labels)

    # Obtener datos y nombres de columnas
    if usar_pca and session.pca_scores is not None:
        X = session.pca_scores
        columnas = session.pca_componentes_nombres[:X.shape[1]]
    else:
        X = session.X_procesado
        columnas = session.columnas_seleccionadas

    for cluster_id in sorted(np.unique(labels)):
        mask = labels == cluster_id
        X_cluster = X[mask]

        tamano = int(np.sum(mask))
        porcentaje = (tamano / n_total) * 100

        # Calcular medias por variable/componente
        medias = {}
        for i, col in enumerate(columnas):
            medias[col] = float(np.mean(X_cluster[:, i]))

        estadisticas.append({
            "cluster_id": int(cluster_id),
            "tamano": tamano,
            "porcentaje": float(porcentaje),
            "medias": medias
        })

    return estadisticas


def calcular_silhouette_por_k(
    session_id: str,
    k_min: int = 2,
    k_max: int = 10,
    usar_pca: bool = True
) -> Dict[str, Any]:
    """
    Calcula el silhouette score para diferentes valores de k.
    Útil para determinar el número óptimo de clústeres.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    X = obtener_scores_para_cluster(session_id, usar_pca)

    # Limitar k_max al número de muestras - 1
    k_max = min(k_max, len(X) - 1)

    resultados = []
    for k in range(k_min, k_max + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)

        if len(np.unique(labels)) > 1:
            sil = silhouette_score(X, labels)
            resultados.append({
                "k": k,
                "silhouette": float(sil),
                "inercia": float(kmeans.inertia_)
            })

    return {
        "resultados": resultados,
        "k_optimo": max(resultados, key=lambda x: x["silhouette"])["k"] if resultados else None
    }


def calcular_silhouette_samples_info(
    session_id: str,
    usar_pca: bool = True
) -> Dict[str, Any]:
    """
    Calcula silhouette score por muestra para el clustering actual.
    """
    session = store.obtener_sesion(session_id)
    if not session or session.cluster_labels is None:
        raise ValueError("No hay clustering calculado")

    X = obtener_scores_para_cluster(session_id, usar_pca)
    labels = session.cluster_labels

    if len(np.unique(labels)) <= 1:
        return {"samples": [], "score_global": None}

    # Calcular silhouette por muestra
    sample_silhouette = silhouette_samples(X, labels)

    # Organizar por clúster
    samples_info = []
    for i, (sil, label) in enumerate(zip(sample_silhouette, labels)):
        samples_info.append({
            "muestra": i,
            "cluster": int(label),
            "silhouette": float(sil)
        })

    return {
        "samples": samples_info,
        "score_global": float(silhouette_score(X, labels))
    }
