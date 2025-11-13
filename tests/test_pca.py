"""
Tests para el módulo de análisis PCA.
"""

import pytest
import pandas as pd
import numpy as np
from core.pca_analysis import PCAAnalyzer, determine_optimal_components


def test_pca_analyzer_initialization():
    """Test de inicialización del analizador PCA."""
    analyzer = PCAAnalyzer(n_components=3)

    assert analyzer.n_components == 3
    assert analyzer.pca is None
    assert analyzer.scores is None


def test_pca_fit():
    """Test de ajuste de PCA."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'var3': [1.5, 3, 4.5, 6, 7.5],
        'var4': [10, 20, 30, 40, 50]
    })

    analyzer = PCAAnalyzer(n_components=2)
    analyzer.fit(df)

    assert analyzer.pca is not None
    assert analyzer.scores is not None
    assert analyzer.scores.shape == (5, 2)
    assert analyzer.loadings is not None
    assert len(analyzer.variance_explained) == 2


def test_pca_variance_explained():
    """Test que la varianza explicada suma <= 100."""
    df = pd.DataFrame({
        'var1': np.random.randn(50),
        'var2': np.random.randn(50),
        'var3': np.random.randn(50)
    })

    analyzer = PCAAnalyzer(n_components=3)
    analyzer.fit(df)

    total_variance = analyzer.variance_explained_cumulative[-1]
    assert total_variance <= 100.0
    assert total_variance > 0.0


def test_get_scores_df():
    """Test de obtención de scores como DataFrame."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'var3': [1.5, 3, 4.5, 6, 7.5]
    })

    analyzer = PCAAnalyzer(n_components=2)
    analyzer.fit(df)

    scores_df = analyzer.get_scores_df()

    assert isinstance(scores_df, pd.DataFrame)
    assert scores_df.shape == (5, 2)
    assert 'PC1' in scores_df.columns
    assert 'PC2' in scores_df.columns


def test_get_loadings_df():
    """Test de obtención de loadings como DataFrame."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'var3': [1.5, 3, 4.5, 6, 7.5]
    })

    analyzer = PCAAnalyzer(n_components=2)
    analyzer.fit(df)

    loadings_df = analyzer.get_loadings_df()

    assert isinstance(loadings_df, pd.DataFrame)
    assert loadings_df.shape == (3, 2)  # 3 variables, 2 PCs
    assert 'var1' in loadings_df.index


def test_get_variance_table():
    """Test de tabla de varianza."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'var3': [1.5, 3, 4.5, 6, 7.5]
    })

    analyzer = PCAAnalyzer(n_components=2)
    analyzer.fit(df)

    variance_table = analyzer.get_variance_table()

    assert 'Componente' in variance_table.columns
    assert 'Varianza Explicada (%)' in variance_table.columns
    assert 'Varianza Acumulada (%)' in variance_table.columns
    assert len(variance_table) == 2


def test_get_top_contributors():
    """Test de obtención de variables que más contribuyen."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'var3': [1.5, 3, 4.5, 6, 7.5],
        'var4': np.random.randn(5)
    })

    analyzer = PCAAnalyzer(n_components=2)
    analyzer.fit(df)

    top_contrib = analyzer.get_top_contributors(pc=1, n=2)

    assert len(top_contrib) == 2
    assert 'Variable' in top_contrib.columns
    assert 'Loading' in top_contrib.columns


def test_determine_optimal_components():
    """Test de determinación de componentes óptimos."""
    variance_cumulative = np.array([50, 75, 85, 92, 95, 97, 98])

    n_optimal = determine_optimal_components(variance_cumulative, threshold=90.0)

    assert n_optimal == 4  # El 4to componente llega al 92%


def test_pca_transform():
    """Test de transformación de nuevos datos."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10]
    })

    analyzer = PCAAnalyzer(n_components=2)
    analyzer.fit(df)

    new_data = pd.DataFrame({
        'var1': [6, 7],
        'var2': [12, 14]
    })

    new_scores = analyzer.transform(new_data)

    assert new_scores.shape == (2, 2)
