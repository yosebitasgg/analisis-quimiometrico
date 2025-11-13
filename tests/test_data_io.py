"""
Tests para el módulo de carga de datos.
"""

import pytest
import pandas as pd
import numpy as np
from core.data_io import (
    validate_dataframe, get_column_types, get_data_summary,
    get_missing_data_info
)


def test_validate_dataframe_valid():
    """Test que un DataFrame válido pasa la validación."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'var3': [1.1, 2.2, 3.3, 4.4, 5.5]
    })

    is_valid, errors = validate_dataframe(df)
    assert is_valid == True
    assert len(errors) == 0


def test_validate_dataframe_empty():
    """Test que un DataFrame vacío falla la validación."""
    df = pd.DataFrame()

    is_valid, errors = validate_dataframe(df)
    assert is_valid == False
    assert len(errors) > 0


def test_validate_dataframe_too_few_rows():
    """Test que un DataFrame con pocas filas falla."""
    df = pd.DataFrame({
        'var1': [1, 2],
        'var2': [3, 4]
    })

    is_valid, errors = validate_dataframe(df)
    assert is_valid == False


def test_validate_dataframe_insufficient_numeric():
    """Test que falla si no hay suficientes columnas numéricas."""
    df = pd.DataFrame({
        'var1': [1, 2, 3, 4],
        'cat1': ['a', 'b', 'c', 'd']
    })

    is_valid, errors = validate_dataframe(df)
    assert is_valid == False


def test_get_column_types():
    """Test de clasificación de columnas."""
    df = pd.DataFrame({
        'num1': [1, 2, 3],
        'num2': [1.1, 2.2, 3.3],
        'cat1': ['a', 'b', 'c'],
        'cat2': pd.Categorical(['x', 'y', 'z'])
    })

    column_types = get_column_types(df)

    assert 'num1' in column_types['numeric']
    assert 'num2' in column_types['numeric']
    assert 'cat1' in column_types['categorical']
    assert 'cat2' in column_types['categorical']


def test_get_data_summary():
    """Test de generación de resumen."""
    df = pd.DataFrame({
        'var1': [1, 2, np.nan, 4, 5],
        'var2': [2, 4, 6, 8, 10],
        'cat1': ['a', 'b', 'c', 'a', 'b']
    })

    summary = get_data_summary(df)

    assert summary['n_rows'] == 5
    assert summary['n_cols'] == 3
    assert summary['n_numeric'] == 2
    assert summary['n_categorical'] == 1
    assert summary['missing_values'] == 1


def test_get_missing_data_info():
    """Test de información de valores faltantes."""
    df = pd.DataFrame({
        'var1': [1, 2, np.nan, 4, 5],
        'var2': [2, np.nan, 6, np.nan, 10],
        'var3': [1, 2, 3, 4, 5]
    })

    missing_info = get_missing_data_info(df)

    assert len(missing_info) == 2  # Solo var1 y var2 tienen NaN
    assert 'var2' in missing_info['Columna'].values
    assert missing_info[missing_info['Columna'] == 'var2']['Valores_Faltantes'].values[0] == 2
