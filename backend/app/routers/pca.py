"""
Router para análisis PCA
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.schemas import PCARequest, PCAResponse
from app.services.store import store
from app.services.pca_service import calcular_pca

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
