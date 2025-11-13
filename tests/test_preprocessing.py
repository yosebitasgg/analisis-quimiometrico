"""
Tests para el módulo de preprocesamiento.
"""

import pytest
import pandas as pd
import numpy as np
from core.preprocessing import DataPreprocessor, compute_correlation_matrix


def test_preprocessor_initialization():
    """Test de inicialización del preprocesador."""
    preprocessor = DataPreprocessor()

    assert preprocessor.scaler is None
    assert preprocessor.imputer is None
    assert preprocessor.selected_numeric_columns == []


def test_handle_missing_values_mean():
    """Test de imputación con media."""
    df = pd.DataFrame({
        'var1': [1, 2, np.nan, 4, 5],
        'var2': [2, 4, 6, 8, 10]
    })

    preprocessor = DataPreprocessor()
    df_clean = preprocessor.handle_missing_values(df, method='mean')

    assert df_clean['var1'].isnull().sum() == 0
    assert df_clean['var1'].iloc[2] == pytest.approx(3.0, rel=0.1)


def test_handle_missing_values_drop():
    """Test de eliminación de valores faltantes."""
    df = pd.DataFrame({
        'var1': [1, 2, np.nan, 4, 5],
        'var2': [2, 4, 6, 8, 10]
    })

    preprocessor = DataPreprocessor()
    df_clean = preprocessor.handle_missing_values(df, method='drop')

    assert len(df_clean) == 4
    assert df_clean['var1'].isnull().sum() == 0


def test_scale_data_standard():
    """Test de estandarización."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [10, 20, 30, 40, 50]
    })

    preprocessor = DataPreprocessor()
    df_scaled = preprocessor.scale_data(df, ['var1', 'var2'], method='standard')

    # Verificar media cercana a 0 y std cercana a 1
    assert df_scaled['var1'].mean() == pytest.approx(0.0, abs=1e-10)
    assert df_scaled['var1'].std() == pytest.approx(1.0, rel=0.1)


def test_scale_data_minmax():
    """Test de normalización min-max."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5]
    })

    preprocessor = DataPreprocessor()
    df_scaled = preprocessor.scale_data(df, ['var1'], method='minmax')

    assert df_scaled['var1'].min() == 0.0
    assert df_scaled['var1'].max() == 1.0


def test_preprocess_full_pipeline():
    """Test del pipeline completo de preprocesamiento."""
    df = pd.DataFrame({
        'var1': [1, 2, np.nan, 4, 5],
        'var2': [10, 20, 30, 40, 50],
        'cat1': ['a', 'b', 'c', 'a', 'b']
    })

    preprocessor = DataPreprocessor()
    df_numeric, df_complete = preprocessor.preprocess(
        df=df,
        numeric_cols=['var1', 'var2'],
        categorical_cols=['cat1'],
        imputation_method='mean',
        scaling_method='standard'
    )

    assert df_numeric.isnull().sum().sum() == 0
    assert 'cat1' in df_complete.columns
    assert len(df_complete) == 5


def test_compute_correlation_matrix():
    """Test de cálculo de matriz de correlación."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],  # Perfectamente correlacionada con var1
        'var3': [5, 4, 3, 2, 1]    # Perfectamente anticorrelacionada
    })

    corr_matrix = compute_correlation_matrix(df)

    assert corr_matrix.loc['var1', 'var2'] == pytest.approx(1.0, abs=1e-5)
    assert corr_matrix.loc['var1', 'var3'] == pytest.approx(-1.0, abs=1e-5)
    assert corr_matrix.loc['var1', 'var1'] == 1.0
