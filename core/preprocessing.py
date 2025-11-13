"""
Módulo de preprocesamiento de datos.
Maneja imputación, escalamiento y preparación de datos para análisis.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer
import streamlit as st
from typing import Tuple, Optional, List


class DataPreprocessor:
    """
    Clase para preprocesar datos antes del análisis multivariado.
    """

    def __init__(self):
        self.scaler = None
        self.imputer = None
        self.selected_numeric_columns = []
        self.selected_categorical_columns = []
        self.original_data = None
        self.processed_data = None

    def set_columns(self, numeric_cols: List[str], categorical_cols: List[str] = None):
        """
        Define qué columnas usar para el análisis.

        Args:
            numeric_cols: Lista de columnas numéricas para análisis
            categorical_cols: Lista de columnas categóricas para etiquetado
        """
        self.selected_numeric_columns = numeric_cols
        self.selected_categorical_columns = categorical_cols or []

    def handle_missing_values(self, df: pd.DataFrame, method: str = 'mean') -> pd.DataFrame:
        """
        Maneja valores faltantes en el DataFrame.

        Args:
            df: DataFrame con posibles valores faltantes
            method: 'mean', 'median', o 'drop'

        Returns:
            DataFrame con valores faltantes manejados
        """
        if method == 'drop':
            return df.dropna()

        # Imputar solo columnas numéricas
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if len(numeric_cols) > 0:
            strategy = 'mean' if method == 'mean' else 'median'
            self.imputer = SimpleImputer(strategy=strategy)

            df_imputed = df.copy()
            df_imputed[numeric_cols] = self.imputer.fit_transform(df[numeric_cols])

            return df_imputed

        return df

    def scale_data(self, df: pd.DataFrame, columns: List[str], method: str = 'standard') -> pd.DataFrame:
        """
        Escala las columnas numéricas especificadas.

        Args:
            df: DataFrame a escalar
            columns: Columnas a escalar
            method: 'standard' para estandarización, 'minmax' para normalización, 'none' para sin escalar

        Returns:
            DataFrame con columnas escaladas
        """
        if method == 'none':
            return df

        df_scaled = df.copy()

        if method == 'standard':
            self.scaler = StandardScaler()
        elif method == 'minmax':
            self.scaler = MinMaxScaler()
        else:
            raise ValueError(f"Método de escalamiento no reconocido: {method}")

        df_scaled[columns] = self.scaler.fit_transform(df[columns])

        return df_scaled

    def preprocess(
        self,
        df: pd.DataFrame,
        numeric_cols: List[str],
        categorical_cols: List[str] = None,
        imputation_method: str = 'mean',
        scaling_method: str = 'standard'
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Pipeline completo de preprocesamiento.

        Args:
            df: DataFrame original
            numeric_cols: Columnas numéricas para análisis
            categorical_cols: Columnas categóricas para etiquetado
            imputation_method: Método de imputación
            scaling_method: Método de escalamiento

        Returns:
            Tupla (datos_procesados_numéricos, datos_completos_con_categorías)
        """
        self.original_data = df.copy()
        self.set_columns(numeric_cols, categorical_cols)

        # Seleccionar columnas relevantes
        all_cols = numeric_cols.copy()
        if categorical_cols:
            all_cols.extend(categorical_cols)

        df_subset = df[all_cols].copy()

        # Manejar valores faltantes
        df_clean = self.handle_missing_values(df_subset, method=imputation_method)

        # Separar numéricas para escalar
        df_numeric = df_clean[numeric_cols].copy()

        # Escalar datos numéricos
        df_scaled = self.scale_data(df_numeric, numeric_cols, method=scaling_method)

        # Crear DataFrame completo con categóricas
        df_complete = df_scaled.copy()
        if categorical_cols:
            for cat_col in categorical_cols:
                df_complete[cat_col] = df_clean[cat_col].values

        self.processed_data = df_complete

        return df_scaled, df_complete

    def get_preprocessing_summary(self) -> dict:
        """
        Genera un resumen del preprocesamiento realizado.

        Returns:
            Diccionario con información del preprocesamiento
        """
        summary = {
            'numeric_columns': self.selected_numeric_columns,
            'categorical_columns': self.selected_categorical_columns,
            'n_numeric': len(self.selected_numeric_columns),
            'n_categorical': len(self.selected_categorical_columns),
            'scaler_type': type(self.scaler).__name__ if self.scaler else 'None',
            'imputer_type': type(self.imputer).__name__ if self.imputer else 'None'
        }

        if self.processed_data is not None:
            summary['n_samples'] = len(self.processed_data)

        return summary

    def inverse_transform(self, data: np.ndarray) -> np.ndarray:
        """
        Revierte el escalamiento de los datos.

        Args:
            data: Datos escalados

        Returns:
            Datos en escala original
        """
        if self.scaler is not None:
            return self.scaler.inverse_transform(data)
        return data


@st.cache_data
def compute_correlation_matrix(df: pd.DataFrame, columns: List[str] = None) -> pd.DataFrame:
    """
    Calcula la matriz de correlación para las columnas especificadas.

    Args:
        df: DataFrame
        columns: Columnas a incluir (None para todas las numéricas)

    Returns:
        Matriz de correlación
    """
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns.tolist()

    return df[columns].corr()


def detect_outliers_iqr(df: pd.DataFrame, column: str, threshold: float = 1.5) -> pd.Series:
    """
    Detecta outliers usando el método IQR.

    Args:
        df: DataFrame
        column: Columna a analizar
        threshold: Multiplicador del IQR (típicamente 1.5 o 3)

    Returns:
        Serie booleana indicando outliers
    """
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1

    lower_bound = Q1 - threshold * IQR
    upper_bound = Q3 + threshold * IQR

    return (df[column] < lower_bound) | (df[column] > upper_bound)


def get_numeric_summary_stats(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """
    Genera estadísticas resumidas para columnas numéricas.

    Args:
        df: DataFrame
        columns: Columnas numéricas a resumir

    Returns:
        DataFrame con estadísticas
    """
    return df[columns].describe().T
