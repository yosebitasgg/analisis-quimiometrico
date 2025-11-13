"""
Módulo de análisis de clustering.
Implementa K-means, clustering jerárquico y métricas de evaluación.
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score, silhouette_samples
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist
import streamlit as st
from typing import Tuple, Dict, List, Optional


class ClusterAnalyzer:
    """
    Clase para análisis de clustering.
    """

    def __init__(self):
        self.kmeans_model = None
        self.hierarchical_model = None
        self.kmeans_labels = None
        self.hierarchical_labels = None
        self.data = None

    def fit_kmeans(
        self,
        X: np.ndarray,
        n_clusters: int = 3,
        n_init: int = 10,
        random_state: int = 42
    ) -> np.ndarray:
        """
        Ajusta modelo K-means.

        Args:
            X: Datos (puede ser scores de PCA o datos originales)
            n_clusters: Número de clusters
            n_init: Número de inicializaciones
            random_state: Semilla aleatoria

        Returns:
            Labels de clusters
        """
        self.data = X
        self.kmeans_model = KMeans(
            n_clusters=n_clusters,
            n_init=n_init,
            random_state=random_state
        )
        self.kmeans_labels = self.kmeans_model.fit_predict(X)

        return self.kmeans_labels

    def fit_hierarchical(
        self,
        X: np.ndarray,
        n_clusters: int = 3,
        linkage_method: str = 'ward'
    ) -> np.ndarray:
        """
        Ajusta modelo de clustering jerárquico.

        Args:
            X: Datos
            n_clusters: Número de clusters
            linkage_method: Método de ligamiento ('ward', 'complete', 'average', 'single')

        Returns:
            Labels de clusters
        """
        self.data = X
        self.hierarchical_model = AgglomerativeClustering(
            n_clusters=n_clusters,
            linkage=linkage_method
        )
        self.hierarchical_labels = self.hierarchical_model.fit_predict(X)

        return self.hierarchical_labels

    def compute_silhouette_score(self, labels: np.ndarray = None) -> float:
        """
        Calcula el silhouette score.

        Args:
            labels: Labels de clusters (usa kmeans_labels si no se especifica)

        Returns:
            Silhouette score
        """
        if labels is None:
            labels = self.kmeans_labels

        if labels is None or self.data is None:
            raise ValueError("Debe ajustar un modelo primero")

        return silhouette_score(self.data, labels)

    def compute_silhouette_samples(self, labels: np.ndarray = None) -> np.ndarray:
        """
        Calcula silhouette score por muestra.

        Args:
            labels: Labels de clusters

        Returns:
            Array con silhouette score de cada muestra
        """
        if labels is None:
            labels = self.kmeans_labels

        if labels is None or self.data is None:
            raise ValueError("Debe ajustar un modelo primero")

        return silhouette_samples(self.data, labels)

    def get_cluster_centers(self) -> Optional[np.ndarray]:
        """
        Obtiene los centroides de K-means.

        Returns:
            Array con centroides o None si no se ha ajustado K-means
        """
        if self.kmeans_model is None:
            return None

        return self.kmeans_model.cluster_centers_

    def get_cluster_summary(
        self,
        X_original: pd.DataFrame,
        labels: np.ndarray,
        categorical_data: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """
        Genera resumen estadístico por cluster.

        Args:
            X_original: DataFrame con variables originales (no escaladas)
            labels: Labels de clusters
            categorical_data: DataFrame opcional con variables categóricas

        Returns:
            DataFrame con resumen por cluster
        """
        df_summary = X_original.copy()
        df_summary['Cluster'] = labels

        # Resumen por cluster
        summary = df_summary.groupby('Cluster').agg(['mean', 'std', 'count'])

        # Agregar conteo de muestras
        cluster_sizes = pd.DataFrame(df_summary['Cluster'].value_counts().sort_index())
        cluster_sizes.columns = ['N_muestras']

        return cluster_sizes

    def get_cluster_centers_df(
        self,
        feature_names: List[str]
    ) -> Optional[pd.DataFrame]:
        """
        Obtiene centroides como DataFrame.

        Args:
            feature_names: Nombres de las características

        Returns:
            DataFrame con centroides
        """
        centers = self.get_cluster_centers()

        if centers is None:
            return None

        return pd.DataFrame(
            centers,
            columns=feature_names,
            index=[f'Cluster {i}' for i in range(len(centers))]
        )


@st.cache_data
def compute_linkage_matrix(_X: np.ndarray, method: str = 'ward') -> np.ndarray:
    """
    Calcula la matriz de ligamiento para dendrograma.

    Args:
        _X: Datos (underscore para evitar hash)
        method: Método de ligamiento

    Returns:
        Matriz de ligamiento
    """
    return linkage(_X, method=method)


def compute_elbow_scores(X: np.ndarray, max_k: int = 10) -> Tuple[List[int], List[float]]:
    """
    Calcula inercia para diferentes valores de k (método del codo).

    Args:
        X: Datos
        max_k: Máximo número de clusters a probar

    Returns:
        Tupla (lista_k, lista_inercias)
    """
    k_range = range(2, min(max_k + 1, X.shape[0]))
    inertias = []

    for k in k_range:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        kmeans.fit(X)
        inertias.append(kmeans.inertia_)

    return list(k_range), inertias


def compute_silhouette_range(X: np.ndarray, max_k: int = 10) -> Tuple[List[int], List[float]]:
    """
    Calcula silhouette score para diferentes valores de k.

    Args:
        X: Datos
        max_k: Máximo número de clusters a probar

    Returns:
        Tupla (lista_k, lista_silhouette_scores)
    """
    k_range = range(2, min(max_k + 1, X.shape[0]))
    silhouette_scores = []

    for k in k_range:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        labels = kmeans.fit_predict(X)
        score = silhouette_score(X, labels)
        silhouette_scores.append(score)

    return list(k_range), silhouette_scores


def assign_hierarchical_clusters(linkage_matrix: np.ndarray, n_clusters: int) -> np.ndarray:
    """
    Asigna clusters cortando el dendrograma a cierto nivel.

    Args:
        linkage_matrix: Matriz de ligamiento
        n_clusters: Número de clusters deseado

    Returns:
        Array con labels de clusters
    """
    from scipy.cluster.hierarchy import fcluster

    labels = fcluster(linkage_matrix, n_clusters, criterion='maxclust')

    # Convertir a 0-indexed
    return labels - 1


def compute_cluster_statistics(
    X: pd.DataFrame,
    labels: np.ndarray
) -> pd.DataFrame:
    """
    Calcula estadísticas detalladas por cluster.

    Args:
        X: DataFrame con variables
        labels: Labels de clusters

    Returns:
        DataFrame con estadísticas por cluster y variable
    """
    df = X.copy()
    df['Cluster'] = labels

    stats = df.groupby('Cluster').agg(['mean', 'std', 'min', 'max'])

    return stats
