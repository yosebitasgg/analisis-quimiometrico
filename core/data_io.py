"""
Módulo de carga y validación de datos.
Maneja la importación de archivos CSV y Excel, validación y caché.
"""

import pandas as pd
import numpy as np
import streamlit as st
import os
from typing import Tuple, Optional, List, Dict
from config.settings import ALLOWED_FILE_TYPES, EXAMPLE_FILE, MAX_ROWS_DISPLAY, MAX_COLUMNS


@st.cache_data(ttl=3600)
def load_data_from_file(file_path: str) -> pd.DataFrame:
    """
    Carga datos desde un archivo CSV o Excel.

    Args:
        file_path: Ruta al archivo

    Returns:
        DataFrame con los datos cargados

    Raises:
        ValueError: Si el formato de archivo no es soportado
        FileNotFoundError: Si el archivo no existe
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"El archivo {file_path} no existe")

    file_extension = file_path.split('.')[-1].lower()

    if file_extension == 'csv':
        df = pd.read_csv(file_path)
    elif file_extension in ['xlsx', 'xls']:
        df = pd.read_excel(file_path)
    else:
        raise ValueError(f"Formato de archivo no soportado: {file_extension}")

    return df


@st.cache_data(ttl=3600)
def load_data_from_upload(uploaded_file) -> pd.DataFrame:
    """
    Carga datos desde un archivo subido por el usuario.

    Args:
        uploaded_file: Objeto UploadedFile de Streamlit

    Returns:
        DataFrame con los datos cargados
    """
    file_extension = uploaded_file.name.split('.')[-1].lower()

    if file_extension == 'csv':
        df = pd.read_csv(uploaded_file)
    elif file_extension in ['xlsx', 'xls']:
        df = pd.read_excel(uploaded_file)
    else:
        raise ValueError(f"Formato de archivo no soportado: {file_extension}")

    return df


def check_example_file_exists() -> bool:
    """
    Verifica si existe el archivo de ejemplo en la raíz del proyecto.

    Returns:
        True si existe el archivo de ejemplo
    """
    return os.path.exists(EXAMPLE_FILE)


def validate_dataframe(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """
    Valida que el DataFrame sea apropiado para el análisis.

    Args:
        df: DataFrame a validar

    Returns:
        Tupla (es_valido, lista_de_errores)
    """
    errors = []

    if df.empty:
        errors.append("El DataFrame está vacío")
        return False, errors

    if df.shape[0] < 3:
        errors.append("Se necesitan al menos 3 observaciones para el análisis")

    if df.shape[1] > MAX_COLUMNS:
        errors.append(f"Demasiadas columnas ({df.shape[1]}). Máximo permitido: {MAX_COLUMNS}")

    # Verificar que haya al menos una columna numérica
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) < 2:
        errors.append("Se necesitan al menos 2 variables numéricas para el análisis")

    return len(errors) == 0, errors


def get_column_types(df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Clasifica las columnas del DataFrame en numéricas y categóricas.

    Args:
        df: DataFrame a analizar

    Returns:
        Diccionario con listas de nombres de columnas numéricas y categóricas
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    return {
        'numeric': numeric_cols,
        'categorical': categorical_cols
    }


def get_data_summary(df: pd.DataFrame) -> Dict:
    """
    Genera un resumen estadístico del DataFrame.

    Args:
        df: DataFrame a resumir

    Returns:
        Diccionario con información resumida
    """
    column_types = get_column_types(df)
    numeric_cols = column_types['numeric']
    categorical_cols = column_types['categorical']

    summary = {
        'n_rows': df.shape[0],
        'n_cols': df.shape[1],
        'n_numeric': len(numeric_cols),
        'n_categorical': len(categorical_cols),
        'missing_values': df.isnull().sum().sum(),
        'missing_percentage': (df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) * 100),
        'numeric_columns': numeric_cols,
        'categorical_columns': categorical_cols
    }

    # Estadísticas de columnas numéricas
    if numeric_cols:
        summary['numeric_stats'] = df[numeric_cols].describe()

    # Conteo de categorías
    if categorical_cols:
        summary['categorical_stats'] = {
            col: df[col].value_counts().to_dict()
            for col in categorical_cols
        }

    return summary


def export_results_to_csv(df: pd.DataFrame, filename: str = "resultados_quimiometria.csv") -> bytes:
    """
    Exporta el DataFrame a CSV para descarga.

    Args:
        df: DataFrame a exportar
        filename: Nombre del archivo (no usado, solo para referencia)

    Returns:
        Bytes del CSV
    """
    return df.to_csv(index=False).encode('utf-8')


def get_missing_data_info(df: pd.DataFrame) -> pd.DataFrame:
    """
    Genera información detallada sobre valores faltantes.

    Args:
        df: DataFrame a analizar

    Returns:
        DataFrame con información de valores faltantes por columna
    """
    missing_info = pd.DataFrame({
        'Columna': df.columns,
        'Valores_Faltantes': df.isnull().sum().values,
        'Porcentaje': (df.isnull().sum().values / len(df) * 100).round(2)
    })

    missing_info = missing_info[missing_info['Valores_Faltantes'] > 0].sort_values(
        'Valores_Faltantes', ascending=False
    )

    return missing_info


def sample_dataframe_for_display(df: pd.DataFrame, n_rows: int = MAX_ROWS_DISPLAY) -> pd.DataFrame:
    """
    Muestrea el DataFrame para mostrar en pantalla si es muy grande.

    Args:
        df: DataFrame original
        n_rows: Número máximo de filas a mostrar

    Returns:
        DataFrame muestreado o completo si es pequeño
    """
    if len(df) > n_rows:
        return df.head(n_rows)
    return df
