"""
Router para análisis de Clustering
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.schemas import ClusteringRequest, ClusteringResponse
from app.services.store import store
from app.services.clustering_service import (
    calcular_kmeans,
    calcular_jerarquico,
    calcular_silhouette_por_k,
    calcular_silhouette_samples_info
)

router = APIRouter()


@router.post("/calcular", response_model=ClusteringResponse)
async def ejecutar_clustering(request: ClusteringRequest):
    """
    Ejecuta análisis de clustering (K-means o Jerárquico).

    Parámetros:
    - session_id: ID de la sesión
    - metodo: 'kmeans' o 'jerarquico'
    - n_clusters: Número de clústeres (2-10)
    - usar_pca: Si True, usa scores de PCA; si False, usa datos originales
    - linkage: Para jerárquico: 'ward', 'complete', 'average'

    Retorna:
    - Etiquetas de clúster por muestra
    - Silhouette score
    - Estadísticas por clúster
    - Datos del dendrograma (solo para jerárquico)
    """
    if not store.sesion_existe(request.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session = store.obtener_sesion(request.session_id)

    # Verificar que hay datos disponibles
    if request.usar_pca:
        if session.pca_scores is None:
            raise HTTPException(
                status_code=400,
                detail="No hay resultados de PCA. Por favor, ejecuta PCA primero o desactiva 'usar_pca'."
            )
    else:
        if session.X_procesado is None:
            raise HTTPException(
                status_code=400,
                detail="No hay datos preprocesados. Por favor, aplica preprocesamiento primero."
            )

    try:
        if request.metodo == "kmeans":
            resultado = calcular_kmeans(
                session_id=request.session_id,
                n_clusters=request.n_clusters,
                usar_pca=request.usar_pca
            )
        elif request.metodo == "jerarquico":
            resultado = calcular_jerarquico(
                session_id=request.session_id,
                n_clusters=request.n_clusters,
                linkage_method=request.linkage,
                usar_pca=request.usar_pca
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Método de clustering no válido: {request.metodo}. Use 'kmeans' o 'jerarquico'."
            )

        return ClusteringResponse(
            exito=True,
            mensaje=f"Clustering {request.metodo} calculado exitosamente",
            **resultado
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/silhouette-analisis/{session_id}")
async def analisis_silhouette(
    session_id: str,
    k_min: int = 2,
    k_max: int = 10,
    usar_pca: bool = True
):
    """
    Calcula el silhouette score para diferentes valores de k.
    Útil para determinar el número óptimo de clústeres.
    """
    if not store.sesion_existe(session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = calcular_silhouette_por_k(
            session_id=session_id,
            k_min=k_min,
            k_max=k_max,
            usar_pca=usar_pca
        )

        return {
            "exito": True,
            "mensaje": "Análisis de silhouette completado",
            **resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/silhouette-muestras/{session_id}")
async def silhouette_por_muestra(session_id: str, usar_pca: bool = True):
    """
    Obtiene el silhouette score por muestra para el clustering actual.
    Útil para visualizar qué muestras están bien asignadas a sus clústeres.
    """
    if not store.sesion_existe(session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = calcular_silhouette_samples_info(
            session_id=session_id,
            usar_pca=usar_pca
        )

        return {
            "exito": True,
            "mensaje": "Silhouette por muestra calculado",
            **resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resultados/{session_id}")
async def obtener_resultados_clustering(session_id: str):
    """
    Obtiene los resultados de clustering de una sesión sin recalcular.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.cluster_labels is None:
        raise HTTPException(
            status_code=400,
            detail="No hay resultados de clustering. Por favor, ejecuta el análisis primero."
        )

    return {
        "exito": True,
        "mensaje": "Resultados de clustering recuperados",
        "metodo": session.cluster_metodo,
        "etiquetas": session.cluster_labels.tolist(),
        "n_clusters": len(set(session.cluster_labels))
    }
