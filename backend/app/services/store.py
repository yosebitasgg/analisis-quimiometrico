"""
Store en memoria para almacenar datos de sesión.
En producción, esto podría ser Redis o una base de datos.
"""

from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
from dataclasses import dataclass, field


@dataclass
class ClassifierData:
    """Datos de un clasificador entrenado"""
    modelo: Any = None
    scaler: Any = None
    accuracy: float = 0.0
    f1_score: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    confusion_matrix: Optional[np.ndarray] = None
    feature_importances: Optional[np.ndarray] = None
    class_labels: list = field(default_factory=list)
    feature_names: list = field(default_factory=list)
    modelo_tipo: str = ""
    usar_pca: bool = False


@dataclass
class SessionData:
    """Datos almacenados para una sesión"""
    # Datos originales
    df_original: Optional[pd.DataFrame] = None

    # Datos preprocesados
    df_preprocesado: Optional[pd.DataFrame] = None
    X_procesado: Optional[np.ndarray] = None
    columnas_numericas: list = field(default_factory=list)
    columnas_categoricas: list = field(default_factory=list)
    columnas_seleccionadas: list = field(default_factory=list)

    # Resultados de PCA
    pca_scores: Optional[np.ndarray] = None
    pca_loadings: Optional[np.ndarray] = None
    pca_varianza: Optional[np.ndarray] = None
    pca_componentes_nombres: list = field(default_factory=list)

    # Resultados de Clustering
    cluster_labels: Optional[np.ndarray] = None
    cluster_metodo: Optional[str] = None

    # Variables categóricas
    feedstock: Optional[np.ndarray] = None
    concentration: Optional[np.ndarray] = None

    # Clasificadores entrenados
    classifier_feedstock: Optional[ClassifierData] = None
    classifier_concentration: Optional[ClassifierData] = None


class DataStore:
    """Almacén de datos en memoria para todas las sesiones"""

    def __init__(self):
        self._sessions: Dict[str, SessionData] = {}
        self._counter = 0

    def crear_sesion(self) -> str:
        """Crea una nueva sesión y retorna su ID"""
        self._counter += 1
        session_id = f"session_{self._counter}"
        self._sessions[session_id] = SessionData()
        return session_id

    def obtener_sesion(self, session_id: str) -> Optional[SessionData]:
        """Obtiene los datos de una sesión"""
        return self._sessions.get(session_id)

    def sesion_existe(self, session_id: str) -> bool:
        """Verifica si una sesión existe"""
        return session_id in self._sessions

    def eliminar_sesion(self, session_id: str) -> bool:
        """Elimina una sesión"""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def limpiar_todas(self):
        """Elimina todas las sesiones (útil para testing)"""
        self._sessions.clear()
        self._counter = 0


# Instancia global del store
store = DataStore()
