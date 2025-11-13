"""
Tests para el módulo de clustering.
"""

import pytest
import pandas as pd
import numpy as np
from core.clustering import (
    ClusterAnalyzer, compute_elbow_scores, compute_silhouette_range
)


def test_cluster_analyzer_initialization():
    """Test de inicialización del analizador de clustering."""
    analyzer = ClusterAnalyzer()

    assert analyzer.kmeans_model is None
    assert analyzer.hierarchical_model is None
    assert analyzer.kmeans_labels is None


def test_fit_kmeans():
    """Test de ajuste de K-means."""
    X = np.array([
        [1, 2],
        [1.5, 1.8],
        [5, 8],
        [8, 8],
        [1, 0.6],
        [9, 11]
    ])

    analyzer = ClusterAnalyzer()
    labels = analyzer.fit_kmeans(X, n_clusters=2)

    assert len(labels) == 6
    assert len(np.unique(labels)) == 2
    assert analyzer.kmeans_model is not None


def test_fit_hierarchical():
    """Test de ajuste de clustering jerárquico."""
    X = np.array([
        [1, 2],
        [1.5, 1.8],
        [5, 8],
        [8, 8],
        [1, 0.6],
        [9, 11]
    ])

    analyzer = ClusterAnalyzer()
    labels = analyzer.fit_hierarchical(X, n_clusters=2, linkage_method='ward')

    assert len(labels) == 6
    assert len(np.unique(labels)) == 2
    assert analyzer.hierarchical_model is not None


def test_compute_silhouette_score():
    """Test de cálculo de silhouette score."""
    X = np.array([
        [1, 2],
        [1.5, 1.8],
        [5, 8],
        [8, 8],
        [1, 0.6],
        [9, 11]
    ])

    analyzer = ClusterAnalyzer()
    analyzer.fit_kmeans(X, n_clusters=2)

    silhouette = analyzer.compute_silhouette_score()

    assert -1 <= silhouette <= 1
    assert isinstance(silhouette, float)


def test_get_cluster_centers():
    """Test de obtención de centroides."""
    X = np.array([
        [1, 2],
        [1.5, 1.8],
        [5, 8],
        [8, 8],
        [1, 0.6],
        [9, 11]
    ])

    analyzer = ClusterAnalyzer()
    analyzer.fit_kmeans(X, n_clusters=2)

    centers = analyzer.get_cluster_centers()

    assert centers is not None
    assert centers.shape == (2, 2)  # 2 clusters, 2 features


def test_get_cluster_summary():
    """Test de resumen de clusters."""
    X = pd.DataFrame({
        'var1': [1, 1.5, 5, 8, 1, 9],
        'var2': [2, 1.8, 8, 8, 0.6, 11]
    })

    analyzer = ClusterAnalyzer()
    labels = analyzer.fit_kmeans(X.values, n_clusters=2)

    summary = analyzer.get_cluster_summary(X, labels)

    assert 'N_muestras' in summary.columns
    assert len(summary) == 2  # 2 clusters


def test_compute_elbow_scores():
    """Test de cálculo de scores para elbow plot."""
    X = np.random.randn(50, 5)

    k_values, inertias = compute_elbow_scores(X, max_k=5)

    assert len(k_values) == len(inertias)
    assert len(k_values) == 4  # k=2 to k=5
    assert all(inertias[i] >= inertias[i+1] for i in range(len(inertias)-1))  # Inertia decreases


def test_compute_silhouette_range():
    """Test de cálculo de silhouette para rango de k."""
    X = np.random.randn(30, 3)

    k_values, silhouettes = compute_silhouette_range(X, max_k=5)

    assert len(k_values) == len(silhouettes)
    assert all(-1 <= s <= 1 for s in silhouettes)


def test_kmeans_reproducibility():
    """Test que K-means con misma semilla da mismos resultados."""
    X = np.random.randn(20, 3)

    analyzer1 = ClusterAnalyzer()
    labels1 = analyzer1.fit_kmeans(X, n_clusters=3, random_state=42)

    analyzer2 = ClusterAnalyzer()
    labels2 = analyzer2.fit_kmeans(X, n_clusters=3, random_state=42)

    assert np.array_equal(labels1, labels2)
