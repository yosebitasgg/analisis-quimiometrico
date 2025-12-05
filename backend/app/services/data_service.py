"""
Servicio para carga y preprocesamiento de datos
"""

import pandas as pd
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
from sklearn.preprocessing import StandardScaler
from pathlib import Path
import io

from app.services.store import store, SessionData


# Ruta del dataset de ejemplo
EJEMPLO_PATH = Path(r"C:\Users\USER\Documents\ITESM\GarridoExtra\data\chemometrics_example.xls")

# Mapeos para variables categóricas
FEEDSTOCK_MAP = {
    1: "Diesel",
    2: "Animal Tallow (Texas)",
    3: "Animal Tallow (IRE)",
    4: "Canola",
    5: "Waste Grease",
    6: "Soybean",
    7: "Desconocido"
}

CONCENTRATION_MAP = {
    1: "Diesel",
    2: "B2",
    3: "B5",
    4: "B10",
    5: "B20",
    6: "B100",
    7: "Desconocida"
}


def detectar_tipo_columna(series: pd.Series) -> str:
    """Detecta si una columna es numérica o categórica"""
    if pd.api.types.is_numeric_dtype(series):
        # Si tiene pocos valores únicos, podría ser categórica
        if series.nunique() <= 10 and series.nunique() < len(series) * 0.05:
            return "categorico"
        return "numerico"
    return "categorico"


def cargar_archivo(contenido: bytes, nombre_archivo: str) -> Tuple[pd.DataFrame, str]:
    """
    Carga un archivo desde bytes (subido por el usuario).
    Retorna el DataFrame y un mensaje.
    """
    extension = nombre_archivo.lower().split('.')[-1]

    try:
        if extension == 'csv':
            # Intentar diferentes encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(contenido), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("No se pudo decodificar el archivo CSV")

        elif extension in ['xlsx', 'xls']:
            if extension == 'xls':
                df = pd.read_excel(io.BytesIO(contenido), engine='xlrd')
            else:
                df = pd.read_excel(io.BytesIO(contenido), engine='openpyxl')

        else:
            raise ValueError(f"Formato de archivo no soportado: {extension}")

        return df, "Archivo cargado exitosamente"

    except Exception as e:
        raise ValueError(f"Error al cargar archivo: {str(e)}")


def cargar_ejemplo() -> Tuple[pd.DataFrame, str]:
    """
    Carga el dataset de ejemplo desde la ruta fija.
    """
    if not EJEMPLO_PATH.exists():
        raise FileNotFoundError(
            f"No se encontró el archivo de ejemplo en: {EJEMPLO_PATH}"
        )

    try:
        df = pd.read_excel(EJEMPLO_PATH, engine='xlrd')
        return df, "Dataset de ejemplo cargado exitosamente"
    except Exception as e:
        raise ValueError(f"Error al cargar archivo de ejemplo: {str(e)}")


def procesar_dataframe(df: pd.DataFrame, session_id: str) -> Dict[str, Any]:
    """
    Procesa un DataFrame cargado y almacena en la sesión.
    Retorna información sobre los datos.
    IMPORTANTE: Limpia resultados previos de análisis al cargar nuevos datos.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # ==========================================================================
    # LIMPIAR RESULTADOS PREVIOS - Importante para evitar inconsistencias
    # ==========================================================================
    # Limpiar datos preprocesados
    session.df_preprocesado = None
    session.X_procesado = None
    session.columnas_seleccionadas = []

    # Limpiar resultados de PCA
    session.pca_scores = None
    session.pca_loadings = None
    session.pca_varianza = None
    session.pca_componentes_nombres = []

    # Limpiar resultados de clustering
    session.cluster_labels = None
    session.cluster_metodo = None

    # Limpiar clasificadores
    session.classifier_feedstock = None
    session.classifier_concentration = None

    # ==========================================================================
    # PROCESAR NUEVOS DATOS
    # ==========================================================================
    # Limpiar nombres de columnas
    df.columns = [str(col).strip() for col in df.columns]

    # Almacenar DataFrame original
    session.df_original = df.copy()

    # Detectar tipos de columnas
    columnas_numericas = []
    columnas_categoricas = []
    columnas_info = []

    for col in df.columns:
        tipo = detectar_tipo_columna(df[col])

        # feedstock y concentration siempre son categóricas
        col_lower = col.lower()
        if col_lower in ['feedstock', 'concentration']:
            tipo = "categorico"

        if tipo == "numerico":
            columnas_numericas.append(col)
        else:
            columnas_categoricas.append(col)

        columnas_info.append({
            "nombre": col,
            "tipo": tipo,
            "valores_unicos": int(df[col].nunique()),
            "valores_ejemplo": df[col].dropna().head(3).tolist()
        })

    session.columnas_numericas = columnas_numericas
    session.columnas_categoricas = columnas_categoricas

    # Extraer feedstock y concentration si existen
    for col in df.columns:
        col_lower = col.lower()
        if col_lower == 'feedstock':
            session.feedstock = df[col].values.astype(int) if not df[col].isna().all() else None
        elif col_lower == 'concentration':
            session.concentration = df[col].values.astype(int) if not df[col].isna().all() else None

    # Preparar muestra de datos
    muestra = df.head(10).fillna("").to_dict(orient='records')

    return {
        "num_filas": len(df),
        "num_columnas": len(df.columns),
        "columnas_numericas": columnas_numericas,
        "columnas_categoricas": columnas_categoricas,
        "columnas_info": columnas_info,
        "muestra_datos": muestra,
        "feedstock_valores": sorted(df['feedstock'].dropna().unique().tolist()) if 'feedstock' in [c.lower() for c in df.columns] else None,
        "concentration_valores": sorted(df['concentration'].dropna().unique().tolist()) if 'concentration' in [c.lower() for c in df.columns] else None
    }


def preprocesar_datos(
    session_id: str,
    columnas_seleccionadas: List[str],
    manejar_nans: str = "eliminar",
    estandarizar: bool = True
) -> Dict[str, Any]:
    """
    Preprocesa los datos según las opciones seleccionadas.
    """
    session = store.obtener_sesion(session_id)
    if not session or session.df_original is None:
        raise ValueError("No hay datos cargados en esta sesión")

    df = session.df_original.copy()

    # Verificar que las columnas existen
    columnas_validas = [c for c in columnas_seleccionadas if c in df.columns]
    if not columnas_validas:
        raise ValueError("Ninguna de las columnas seleccionadas existe en los datos")

    # Seleccionar solo columnas numéricas válidas
    X = df[columnas_validas].copy()

    # Convertir a numérico (por si acaso)
    for col in X.columns:
        X[col] = pd.to_numeric(X[col], errors='coerce')

    filas_originales = len(X)

    # Manejar NaNs
    if manejar_nans == "eliminar":
        # Eliminar filas con NaN
        mask = ~X.isna().any(axis=1)
        X = X[mask]

        # Actualizar feedstock y concentration
        if session.feedstock is not None:
            session.feedstock = session.feedstock[mask]
        if session.concentration is not None:
            session.concentration = session.concentration[mask]

    elif manejar_nans == "imputar_media":
        # Imputar con la media de cada columna
        for col in X.columns:
            if X[col].isna().any():
                media = X[col].mean()
                X[col] = X[col].fillna(media)

    filas_finales = len(X)
    filas_eliminadas = filas_originales - filas_finales

    # Guardar columnas seleccionadas
    session.columnas_seleccionadas = list(X.columns)

    # Calcular estadísticas antes de estandarizar
    estadisticas = []
    for col in X.columns:
        estadisticas.append({
            "nombre": col,
            "media": float(X[col].mean()),
            "std": float(X[col].std()),
            "min": float(X[col].min()),
            "max": float(X[col].max())
        })

    # Estandarizar si se solicita
    X_array = X.values
    if estandarizar:
        scaler = StandardScaler()
        X_array = scaler.fit_transform(X_array)

    # Guardar datos procesados
    session.X_procesado = X_array
    session.df_preprocesado = pd.DataFrame(X_array, columns=X.columns)

    return {
        "num_filas": filas_finales,
        "num_columnas": len(columnas_validas),
        "filas_eliminadas": filas_eliminadas,
        "estadisticas": estadisticas
    }


def obtener_matriz_correlacion(session_id: str) -> Dict[str, Any]:
    """
    Calcula la matriz de correlación de las variables seleccionadas.
    """
    session = store.obtener_sesion(session_id)
    if not session or session.df_original is None:
        raise ValueError("No hay datos cargados en esta sesión")

    # Usar columnas seleccionadas o todas las numéricas
    columnas = session.columnas_seleccionadas if session.columnas_seleccionadas else session.columnas_numericas

    if not columnas:
        raise ValueError("No hay columnas numéricas disponibles")

    df = session.df_original[columnas].copy()

    # Convertir a numérico y eliminar NaN
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna()

    # Calcular correlación
    corr_matrix = df.corr().values.tolist()

    return {
        "variables": list(df.columns),
        "matriz": corr_matrix
    }
