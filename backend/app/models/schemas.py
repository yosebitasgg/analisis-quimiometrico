"""
Schemas Pydantic para validación de datos en Chemometrics Helper
"""

from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field


# ============================================================================
# SCHEMAS DE DATOS
# ============================================================================

class ColumnInfo(BaseModel):
    """Información sobre una columna del dataset"""
    nombre: str
    tipo: str  # 'numerico' o 'categorico'
    valores_unicos: Optional[int] = None
    valores_ejemplo: Optional[List[Any]] = None


class DataUploadResponse(BaseModel):
    """Respuesta al cargar datos"""
    exito: bool
    mensaje: str
    session_id: str
    num_filas: int
    num_columnas: int
    columnas_numericas: List[str]
    columnas_categoricas: List[str]
    columnas_info: List[ColumnInfo]
    muestra_datos: List[Dict[str, Any]]
    feedstock_valores: Optional[List[int]] = None
    concentration_valores: Optional[List[int]] = None


class PreprocessingRequest(BaseModel):
    """Request para preprocesamiento de datos"""
    session_id: str
    columnas_seleccionadas: List[str]
    manejar_nans: str = Field(default="eliminar", description="'eliminar' o 'imputar_media'")
    estandarizar: bool = True


class VariableStats(BaseModel):
    """Estadísticas de una variable"""
    nombre: str
    media: float
    std: float
    min: float
    max: float


class PreprocessingResponse(BaseModel):
    """Respuesta del preprocesamiento"""
    exito: bool
    mensaje: str
    num_filas: int
    num_columnas: int
    filas_eliminadas: int
    estadisticas: List[VariableStats]


# ============================================================================
# SCHEMAS DE PCA
# ============================================================================

class PCARequest(BaseModel):
    """Request para análisis PCA"""
    session_id: str
    n_componentes: Optional[int] = None  # None = todos los componentes


class VarianzaComponente(BaseModel):
    """Varianza explicada por componente"""
    componente: str
    varianza_explicada: float
    varianza_acumulada: float


class PCAResponse(BaseModel):
    """Respuesta del análisis PCA"""
    exito: bool
    mensaje: str
    n_componentes: int
    varianza_explicada: List[VarianzaComponente]
    scores: List[Dict[str, float]]  # Lista de {PC1: valor, PC2: valor, ...}
    loadings: List[Dict[str, Union[str, float]]]  # Lista por variable {variable: nombre, PC1: valor, ...}
    nombres_muestras: List[int]
    nombres_variables: List[str]
    feedstock: Optional[List[int]] = None
    concentration: Optional[List[int]] = None


# ============================================================================
# SCHEMAS DE CLUSTERING
# ============================================================================

class ClusteringRequest(BaseModel):
    """Request para análisis de clustering"""
    session_id: str
    metodo: str = Field(default="kmeans", description="'kmeans' o 'jerarquico'")
    n_clusters: int = Field(default=3, ge=2, le=10)
    usar_pca: bool = True  # Si True, usa scores de PCA; si False, usa datos originales
    linkage: str = Field(default="ward", description="Para jerárquico: 'ward', 'complete', 'average'")


class ClusterStats(BaseModel):
    """Estadísticas de un clúster"""
    cluster_id: int
    tamano: int
    porcentaje: float
    medias: Dict[str, float]


class ClusteringResponse(BaseModel):
    """Respuesta del análisis de clustering"""
    exito: bool
    mensaje: str
    metodo: str
    n_clusters: int
    etiquetas: List[int]
    silhouette_score: Optional[float] = None
    inercia: Optional[float] = None  # Solo para K-means
    estadisticas_clusters: List[ClusterStats]
    # Para dendrograma (clustering jerárquico)
    dendrograma_data: Optional[Dict[str, Any]] = None


# ============================================================================
# SCHEMAS DE CORRELACIÓN
# ============================================================================

class CorrelationResponse(BaseModel):
    """Respuesta de la matriz de correlación"""
    exito: bool
    mensaje: str
    variables: List[str]
    matriz: List[List[float]]


# ============================================================================
# SCHEMAS DE EXPORTACIÓN
# ============================================================================

class ExportRequest(BaseModel):
    """Request para exportar resultados"""
    session_id: str
    incluir_scores: bool = True
    incluir_clusters: bool = True
    incluir_categoricas: bool = True


class ExportLoadingsRequest(BaseModel):
    """Request para exportar loadings"""
    session_id: str


# ============================================================================
# SCHEMAS DE CLASIFICADOR SUPERVISADO
# ============================================================================

class ClassifierTrainRequest(BaseModel):
    """Request para entrenar un clasificador"""
    session_id: str
    target: str = Field(description="'feedstock' o 'concentration'")
    modelo: str = Field(default="random_forest", description="'random_forest', 'logistic_regression', 'svm'")
    usar_pca: bool = True
    n_estimators: int = Field(default=100, ge=10, le=500)
    max_depth: Optional[int] = Field(default=None, ge=1, le=50)
    c_param: float = Field(default=1.0, ge=0.01, le=100)
    test_size: float = Field(default=0.2, ge=0.1, le=0.5)


class FeatureImportance(BaseModel):
    """Importancia de una característica"""
    variable: str
    importancia: float


class ClassifierTrainResponse(BaseModel):
    """Respuesta del entrenamiento de clasificador"""
    exito: bool
    mensaje: str
    target: str
    modelo: str
    accuracy: float
    f1_score: float
    precision: float
    recall: float
    confusion_matrix: List[List[int]]
    class_labels: List[str]
    feature_importances: List[FeatureImportance]
    n_train: int
    n_test: int


class ClassifierPredictRequest(BaseModel):
    """Request para predecir con clasificador"""
    session_id: str
    target: str = Field(description="'feedstock' o 'concentration'")
    sample_indices: Optional[List[int]] = None
    sample_values: Optional[List[Dict[str, float]]] = None


class PredictionResult(BaseModel):
    """Resultado de una predicción"""
    indice: int
    clase_predicha: str
    clase_predicha_codigo: int
    probabilidades: Optional[Dict[str, float]] = None
    interpretacion: str


class ClassifierPredictResponse(BaseModel):
    """Respuesta de predicciones"""
    exito: bool
    mensaje: str
    predicciones: List[PredictionResult]


# ============================================================================
# SCHEMAS DE SIMILITUD / FINGERPRINTING
# ============================================================================

class SimilaritySearchRequest(BaseModel):
    """Request para búsqueda de similitud"""
    session_id: str
    sample_index: Optional[int] = None
    sample_values: Optional[Dict[str, float]] = None
    space: str = Field(default="pca", description="'pca' o 'original'")
    metric: str = Field(default="euclidean", description="'euclidean' o 'cosine'")
    k: int = Field(default=5, ge=1, le=20)


class SimilarNeighbor(BaseModel):
    """Vecino similar encontrado"""
    indice: int
    distancia: float
    similitud: float
    feedstock: Optional[str] = None
    feedstock_codigo: Optional[int] = None
    concentration: Optional[str] = None
    concentration_codigo: Optional[int] = None
    pc1: Optional[float] = None
    pc2: Optional[float] = None


class SimilaritySearchResponse(BaseModel):
    """Respuesta de búsqueda de similitud"""
    exito: bool
    mensaje: str
    muestra_referencia: Dict[str, Any]
    vecinos: List[SimilarNeighbor]
    interpretacion: str


# ============================================================================
# SCHEMAS DE REPORTE
# ============================================================================

class PCAResumen(BaseModel):
    """Resumen de PCA para reporte"""
    n_componentes: int
    varianza_total: float
    componentes_importantes: List[Dict[str, Any]]
    top_loadings_pc1: List[Dict[str, Any]]  # {"variable": str, "loading": float}
    top_loadings_pc2: List[Dict[str, Any]]  # {"variable": str, "loading": float}


class ClusteringResumen(BaseModel):
    """Resumen de clustering para reporte"""
    metodo: str
    n_clusters: int
    silhouette_score: Optional[float]
    estadisticas: List[Dict[str, Any]]


class ClassifierResumen(BaseModel):
    """Resumen de clasificador para reporte"""
    target: str
    modelo: str
    accuracy: float
    f1_score: float
    mejores_variables: List[str]


class ReportSummaryResponse(BaseModel):
    """Respuesta del resumen de reporte"""
    exito: bool
    mensaje: str
    info_dataset: Dict[str, Any]
    pca_resumen: Optional[PCAResumen] = None
    clustering_resumen: Optional[ClusteringResumen] = None
    classifier_resumen: Optional[List[ClassifierResumen]] = None
    interpretacion_general: str
    interpretacion_pca: Optional[str] = None
    interpretacion_clustering: Optional[str] = None
    interpretacion_clasificador: Optional[str] = None
