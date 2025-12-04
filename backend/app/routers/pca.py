"""
Router para análisis PCA
Incluye endpoints para diagnósticos avanzados, auto-optimización y visualizaciones
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.models.schemas import (
    PCARequest, PCAResponse,
    PCADiagnosticsResponse, PCAContributionsRequest, PCAContributionsResponse,
    PCAOptimizationResponse, PCA3DResponse, ChemicalMapRequest, ChemicalMapResponse
)
from app.services.store import store
from app.services.pca_service import (
    calcular_pca,
    calcular_diagnosticos_pca,
    calcular_contribuciones_muestra,
    calcular_optimizacion_pcs,
    obtener_proyeccion_3d,
    obtener_mapa_quimico
)

router = APIRouter()


@router.post("/calcular", response_model=PCAResponse)
async def ejecutar_pca(request: PCARequest):
    """
    Ejecuta análisis de componentes principales (PCA).

    Parámetros:
    - session_id: ID de la sesión con datos preprocesados
    - n_componentes: Número de componentes a calcular (opcional, por defecto todos)

    Retorna:
    - Varianza explicada por componente
    - Scores (proyecciones de las muestras)
    - Loadings (contribución de cada variable)
    """
    if not store.sesion_existe(request.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session = store.obtener_sesion(request.session_id)
    if session.X_procesado is None:
        raise HTTPException(
            status_code=400,
            detail="No hay datos preprocesados. Por favor, aplica preprocesamiento primero."
        )

    try:
        resultado = calcular_pca(
            session_id=request.session_id,
            n_componentes=request.n_componentes
        )

        return PCAResponse(
            exito=True,
            mensaje="PCA calculado exitosamente",
            **resultado
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resultados/{session_id}")
async def obtener_resultados_pca(session_id: str):
    """
    Obtiene los resultados de PCA de una sesión sin recalcular.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.pca_scores is None:
        raise HTTPException(
            status_code=400,
            detail="No hay resultados de PCA. Por favor, ejecuta el análisis PCA primero."
        )

    # Reconstruir respuesta desde datos guardados
    varianza_info = []
    varianza_acum = 0
    for i, var in enumerate(session.pca_varianza):
        varianza_acum += var * 100
        varianza_info.append({
            "componente": session.pca_componentes_nombres[i],
            "varianza_explicada": float(var * 100),
            "varianza_acumulada": float(varianza_acum)
        })

    scores_list = []
    for i in range(session.pca_scores.shape[0]):
        score_dict = {}
        for j, nombre in enumerate(session.pca_componentes_nombres):
            score_dict[nombre] = float(session.pca_scores[i, j])
        scores_list.append(score_dict)

    loadings_list = []
    for i, var in enumerate(session.columnas_seleccionadas):
        loading_dict = {"variable": var}
        for j, nombre in enumerate(session.pca_componentes_nombres):
            loading_dict[nombre] = float(session.pca_loadings[i, j])
        loadings_list.append(loading_dict)

    return {
        "exito": True,
        "mensaje": "Resultados de PCA recuperados",
        "n_componentes": len(session.pca_componentes_nombres),
        "varianza_explicada": varianza_info,
        "scores": scores_list,
        "loadings": loadings_list,
        "nombres_muestras": list(range(len(session.pca_scores))),
        "nombres_variables": session.columnas_seleccionadas,
        "feedstock": session.feedstock.tolist() if session.feedstock is not None else None,
        "concentration": session.concentration.tolist() if session.concentration is not None else None
    }


# =============================================================================
# DIAGNÓSTICOS PCA (T² y Q-residuals)
# =============================================================================

@router.get("/diagnosticos/{session_id}", response_model=PCADiagnosticsResponse)
async def obtener_diagnosticos_pca(session_id: str):
    """
    Obtiene diagnósticos multivariados para el análisis PCA:
    - Hotelling T² para cada muestra (distancia al centro del modelo)
    - Q-residuals/SPE para cada muestra (error de reconstrucción)
    - Umbrales estadísticos (95% y 99%)
    - Lista de outliers identificados

    Requiere que el PCA haya sido calculado previamente.
    """
    if not store.sesion_existe(session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session = store.obtener_sesion(session_id)
    if session.pca_scores is None:
        raise HTTPException(
            status_code=400,
            detail="No hay resultados de PCA. Ejecuta el análisis PCA primero."
        )

    try:
        resultado = calcular_diagnosticos_pca(session_id)
        return PCADiagnosticsResponse(
            exito=True,
            mensaje="Diagnósticos PCA calculados exitosamente",
            **resultado
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contribuciones", response_model=PCAContributionsResponse)
async def obtener_contribuciones(request: PCAContributionsRequest):
    """
    Calcula las contribuciones de cada variable a T² o Q para una muestra específica.
    Útil para identificar qué variables causan que una muestra sea outlier.

    Parámetros:
    - session_id: ID de la sesión
    - sample_index: Índice de la muestra a analizar
    - tipo_metrica: "T2" (Hotelling) o "Q" (residual)
    """
    if not store.sesion_existe(request.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = calcular_contribuciones_muestra(
            session_id=request.session_id,
            sample_index=request.sample_index,
            tipo_metrica=request.tipo_metrica
        )
        return PCAContributionsResponse(
            exito=True,
            mensaje="Contribuciones calculadas exitosamente",
            **resultado
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# AUTO-OPTIMIZACIÓN DEL NÚMERO DE COMPONENTES
# =============================================================================

@router.get("/optimizacion/{session_id}", response_model=PCAOptimizationResponse)
async def obtener_optimizacion_pcs(
    session_id: str,
    k_max: Optional[int] = Query(None, description="Máximo número de PCs a evaluar"),
    umbral_varianza: float = Query(0.90, description="Umbral de varianza para recomendación (0-1)")
):
    """
    Analiza diferentes números de componentes principales y recomienda el óptimo.

    Criterios de optimización:
    - Varianza explicada acumulada (umbral configurable)
    - Error de reconstrucción (método del codo)
    - Significancia de componentes individuales

    Retorna datos para visualizar curvas y la recomendación con justificación.
    """
    if not store.sesion_existe(session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session = store.obtener_sesion(session_id)
    if session.X_procesado is None:
        raise HTTPException(
            status_code=400,
            detail="No hay datos preprocesados. Aplica preprocesamiento primero."
        )

    try:
        resultado = calcular_optimizacion_pcs(
            session_id=session_id,
            k_max=k_max,
            umbral_varianza=umbral_varianza
        )
        return PCAOptimizationResponse(
            exito=True,
            mensaje="Análisis de optimización completado",
            **resultado
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# VISUALIZACIÓN 3D
# =============================================================================

@router.get("/proyeccion-3d/{session_id}", response_model=PCA3DResponse)
async def obtener_proyeccion_3d_endpoint(session_id: str):
    """
    Obtiene los datos para visualización 3D de scores PCA (PC1, PC2, PC3).

    Incluye:
    - Coordenadas 3D de cada muestra
    - Metadatos (feedstock, concentration, cluster)
    - Valores de T² y Q para dimensionamiento de puntos
    - Loadings para biplot 3D opcional
    - Varianza explicada por cada PC

    Requiere al menos 3 componentes calculados.
    """
    if not store.sesion_existe(session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = obtener_proyeccion_3d(session_id)
        return PCA3DResponse(
            exito=True,
            mensaje="Proyección 3D obtenida exitosamente",
            **resultado
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MAPA QUÍMICO 2.0
# =============================================================================

@router.post("/mapa-quimico", response_model=ChemicalMapResponse)
async def obtener_mapa_quimico_endpoint(request: ChemicalMapRequest):
    """
    Genera un "mapa químico" 2D combinando reducción dimensional con clustering.

    Métodos disponibles:
    - "pca": Usa componentes principales existentes
    - "umap": Uniform Manifold Approximation and Projection
    - "tsne": t-Distributed Stochastic Neighbor Embedding

    El mapa muestra muestras similares cercanas, con clusters y outliers resaltados.
    """
    if not store.sesion_existe(request.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = obtener_mapa_quimico(
            session_id=request.session_id,
            metodo=request.metodo,
            n_neighbors=request.n_neighbors,
            min_dist=request.min_dist
        )
        return ChemicalMapResponse(
            exito=True,
            mensaje=f"Mapa químico generado con {resultado['metodo']}",
            **resultado
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
