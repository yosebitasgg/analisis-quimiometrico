"""
Módulo de Análisis de Componentes Principales (PCA).
Implementa PCA y cálculo de métricas relacionadas.
"""

import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
import streamlit as st
from typing import Tuple, Dict, List, Optional


class PCAAnalyzer:
    """
    Clase para realizar y almacenar análisis de componentes principales.
    """

    def __init__(self, n_components: int = 3):
        """
        Inicializa el analizador PCA.

        Args:
            n_components: Número de componentes principales a calcular
        """
        self.n_components = n_components
        self.pca = None
        self.scores = None
        self.loadings = None
        self.variance_explained = None
        self.variance_explained_cumulative = None
        self.feature_names = None

    def fit(self, X: pd.DataFrame) -> 'PCAAnalyzer':
        """
        Ajusta el modelo PCA a los datos.

        Args:
            X: DataFrame con variables numéricas

        Returns:
            Self para encadenamiento
        """
        self.feature_names = X.columns.tolist()

        # Ajustar PCA
        self.pca = PCA(n_components=min(self.n_components, X.shape[1], X.shape[0]))
        self.scores = self.pca.fit_transform(X)

        # Calcular loadings (componentes)
        self.loadings = self.pca.components_.T * np.sqrt(self.pca.explained_variance_)

        # Varianza explicada
        self.variance_explained = self.pca.explained_variance_ratio_ * 100
        self.variance_explained_cumulative = np.cumsum(self.variance_explained)

        return self

    def get_scores_df(self, sample_names: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Obtiene los scores como DataFrame.

        Args:
            sample_names: Nombres de las muestras (índice)

        Returns:
            DataFrame con scores
        """
        if self.scores is None:
            raise ValueError("Debe ejecutar fit() primero")

        n_comp = self.scores.shape[1]
        columns = [f'PC{i+1}' for i in range(n_comp)]

        df_scores = pd.DataFrame(self.scores, columns=columns)

        if sample_names is not None:
            df_scores.index = sample_names

        return df_scores

    def get_loadings_df(self) -> pd.DataFrame:
        """
        Obtiene los loadings como DataFrame.

        Returns:
            DataFrame con loadings
        """
        if self.loadings is None:
            raise ValueError("Debe ejecutar fit() primero")

        n_comp = self.loadings.shape[1]
        columns = [f'PC{i+1}' for i in range(n_comp)]

        return pd.DataFrame(
            self.loadings,
            columns=columns,
            index=self.feature_names
        )

    def get_variance_table(self) -> pd.DataFrame:
        """
        Genera tabla de varianza explicada.

        Returns:
            DataFrame con varianza explicada por componente
        """
        if self.variance_explained is None:
            raise ValueError("Debe ejecutar fit() primero")

        n_comp = len(self.variance_explained)
        components = [f'PC{i+1}' for i in range(n_comp)]

        return pd.DataFrame({
            'Componente': components,
            'Varianza Explicada (%)': np.round(self.variance_explained, 2),
            'Varianza Acumulada (%)': np.round(self.variance_explained_cumulative, 2)
        })

    def get_top_contributors(self, pc: int = 1, n: int = 5) -> pd.DataFrame:
        """
        Obtiene las variables que más contribuyen a un componente principal.

        Args:
            pc: Número de componente principal (1-indexed)
            n: Número de top variables a retornar

        Returns:
            DataFrame con variables y sus contribuciones
        """
        if self.loadings is None:
            raise ValueError("Debe ejecutar fit() primero")

        pc_idx = pc - 1
        loadings_pc = self.loadings[:, pc_idx]

        # Obtener índices de los n valores absolutos más grandes
        top_indices = np.argsort(np.abs(loadings_pc))[-n:][::-1]

        return pd.DataFrame({
            'Variable': [self.feature_names[i] for i in top_indices],
            'Loading': loadings_pc[top_indices]
        })

    def get_summary(self) -> Dict:
        """
        Genera un resumen del análisis PCA.

        Returns:
            Diccionario con información resumida
        """
        if self.pca is None:
            raise ValueError("Debe ejecutar fit() primero")

        return {
            'n_components': self.pca.n_components_,
            'n_features': len(self.feature_names),
            'n_samples': self.scores.shape[0],
            'total_variance_explained': np.round(self.variance_explained_cumulative[-1], 2),
            'variance_pc1': np.round(self.variance_explained[0], 2),
            'variance_pc2': np.round(self.variance_explained[1], 2) if len(self.variance_explained) > 1 else 0
        }

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """
        Transforma nuevos datos usando el modelo PCA ajustado.

        Args:
            X: DataFrame con las mismas variables que el entrenamiento

        Returns:
            Scores de las nuevas muestras
        """
        if self.pca is None:
            raise ValueError("Debe ejecutar fit() primero")

        return self.pca.transform(X)

    def inverse_transform(self, scores: np.ndarray) -> np.ndarray:
        """
        Reconstruye los datos originales desde los scores.

        Args:
            scores: Scores de componentes principales

        Returns:
            Datos reconstruidos en espacio original
        """
        if self.pca is None:
            raise ValueError("Debe ejecutar fit() primero")

        return self.pca.inverse_transform(scores)


@st.cache_data
def calculate_pca(_X: pd.DataFrame, n_components: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Función de conveniencia para calcular PCA con caché.

    Args:
        _X: DataFrame con variables (underscore para evitar hash de Streamlit)
        n_components: Número de componentes

    Returns:
        Tupla (scores, loadings, variance_explained, variance_cumulative)
    """
    analyzer = PCAAnalyzer(n_components=n_components)
    analyzer.fit(_X)

    return (
        analyzer.scores,
        analyzer.loadings,
        analyzer.variance_explained,
        analyzer.variance_explained_cumulative
    )


def determine_optimal_components(variance_cumulative: np.ndarray, threshold: float = 90.0) -> int:
    """
    Determina el número óptimo de componentes para retener.

    Args:
        variance_cumulative: Varianza acumulada
        threshold: Umbral de varianza deseado (%)

    Returns:
        Número de componentes que explican al menos el threshold de varianza
    """
    n_components = np.argmax(variance_cumulative >= threshold) + 1
    return max(1, n_components)


def compute_reconstruction_error(X_original: np.ndarray, X_reconstructed: np.ndarray) -> float:
    """
    Calcula el error de reconstrucción del PCA.

    Args:
        X_original: Datos originales
        X_reconstructed: Datos reconstruidos desde PCA

    Returns:
        Error cuadrático medio
    """
    return np.mean((X_original - X_reconstructed) ** 2)
