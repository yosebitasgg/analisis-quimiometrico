"""
Router para Búsqueda de Similitud / Fingerprinting Químico
Endpoints para encontrar muestras similares
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    SimilaritySearchRequest,
    SimilaritySearchResponse
)
from app.services import similarity_service

router = APIRouter()


@router.post("/search", response_model=SimilaritySearchResponse)
async def buscar_similares(request: SimilaritySearchRequest):
    """
    Busca las k muestras más similares a una muestra de referencia.

    - **session_id**: ID de la sesión con datos cargados
    - **sample_index**: Índice de la muestra de referencia (si es existente)
    - **sample_values**: Diccionario con valores de la muestra (si es nueva)
    - **space**: 'pca' para usar espacio de PCA, 'original' para datos preprocesados
    - **metric**: 'euclidean' o 'cosine'
    - **k**: Número de vecinos a retornar (1-20)

    Debe proporcionar sample_index O sample_values, no ambos.
    """
    try:
        if request.sample_index is None and request.sample_values is None:
            raise ValueError("Debe proporcionar sample_index o sample_values")

        resultado = similarity_service.buscar_similares(
            session_id=request.session_id,
            sample_index=request.sample_index,
            sample_values=request.sample_values,
            space=request.space,
            metric=request.metric,
            k=request.k
        )

        return SimilaritySearchResponse(
            exito=True,
            mensaje=f"Se encontraron {len(resultado['vecinos'])} muestras similares",
            muestra_referencia=resultado["muestra_referencia"],
            vecinos=resultado["vecinos"],
            interpretacion=resultado["interpretacion"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en búsqueda: {str(e)}")


@router.get("/distances/{session_id}/{sample_index}")
async def obtener_distancias(
    session_id: str,
    sample_index: int,
    space: str = "pca",
    metric: str = "euclidean"
):
    """
    Obtiene las distancias de una muestra a todas las demás.
    Útil para visualización de proximidad.

    - **session_id**: ID de la sesión
    - **sample_index**: Índice de la muestra de referencia
    - **space**: 'pca' o 'original'
    - **metric**: 'euclidean' o 'cosine'
    """
    try:
        resultado = similarity_service.obtener_todas_distancias(
            session_id=session_id,
            sample_index=sample_index,
            space=space,
            metric=metric
        )

        return {
            "exito": True,
            "mensaje": "Distancias calculadas",
            **resultado
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/samples/{session_id}")
async def listar_muestras(session_id: str):
    """
    Lista todas las muestras disponibles con sus metadatos.
    Útil para seleccionar una muestra de referencia.
    """
    from app.services.store import store

    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.X_procesado is None:
        raise HTTPException(status_code=400, detail="No hay datos preprocesados")

    n_samples = session.X_procesado.shape[0]

    # Mapeos
    FEEDSTOCK_LABELS = {
        1: "Diesel", 2: "Animal Tallow (Texas)", 3: "Animal Tallow (IRE)",
        4: "Canola", 5: "Waste Grease", 6: "Soybean", 7: "Desconocido"
    }
    CONCENTRATION_LABELS = {
        1: "Diesel", 2: "B2", 3: "B5", 4: "B10", 5: "B20", 6: "B100", 7: "Desconocida"
    }

    muestras = []
    for i in range(n_samples):
        muestra = {"indice": i}

        if session.feedstock is not None:
            fs_code = int(session.feedstock[i])
            muestra["feedstock"] = FEEDSTOCK_LABELS.get(fs_code, f"Tipo {fs_code}")
            muestra["feedstock_codigo"] = fs_code

        if session.concentration is not None:
            conc_code = int(session.concentration[i])
            muestra["concentration"] = CONCENTRATION_LABELS.get(conc_code, f"Nivel {conc_code}")
            muestra["concentration_codigo"] = conc_code

        if session.pca_scores is not None:
            muestra["pc1"] = float(session.pca_scores[i, 0])
            if session.pca_scores.shape[1] > 1:
                muestra["pc2"] = float(session.pca_scores[i, 1])

        if session.cluster_labels is not None:
            muestra["cluster"] = int(session.cluster_labels[i])

        muestras.append(muestra)

    return {
        "exito": True,
        "n_muestras": n_samples,
        "muestras": muestras
    }
