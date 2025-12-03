"""
Router para Clasificación Supervisada
Endpoints para entrenar y predecir con modelos de ML
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ClassifierTrainRequest,
    ClassifierTrainResponse,
    ClassifierPredictRequest,
    ClassifierPredictResponse
)
from app.services import classifier_service

router = APIRouter()


@router.post("/train", response_model=ClassifierTrainResponse)
async def entrenar_clasificador(request: ClassifierTrainRequest):
    """
    Entrena un clasificador supervisado para predecir feedstock o concentration.

    - **session_id**: ID de la sesión con datos cargados
    - **target**: 'feedstock' o 'concentration'
    - **modelo**: 'random_forest', 'logistic_regression', 'svm'
    - **usar_pca**: Si usar scores de PCA o datos originales
    - **n_estimators**: Número de árboles (Random Forest)
    - **max_depth**: Profundidad máxima (Random Forest)
    - **c_param**: Parámetro C (Logistic Regression, SVM)
    - **test_size**: Proporción del conjunto de prueba
    """
    try:
        resultado = classifier_service.entrenar_clasificador(
            session_id=request.session_id,
            target=request.target,
            modelo_tipo=request.modelo,
            usar_pca=request.usar_pca,
            n_estimators=request.n_estimators,
            max_depth=request.max_depth,
            c_param=request.c_param,
            test_size=request.test_size
        )

        return ClassifierTrainResponse(
            exito=True,
            mensaje=f"Modelo {request.modelo} entrenado exitosamente para {request.target}",
            target=resultado["target"],
            modelo=resultado["modelo"],
            accuracy=resultado["accuracy"],
            f1_score=resultado["f1_score"],
            precision=resultado["precision"],
            recall=resultado["recall"],
            confusion_matrix=resultado["confusion_matrix"],
            class_labels=resultado["class_labels"],
            feature_importances=resultado["feature_importances"],
            n_train=resultado["n_train"],
            n_test=resultado["n_test"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al entrenar: {str(e)}")


@router.post("/predict", response_model=ClassifierPredictResponse)
async def predecir(request: ClassifierPredictRequest):
    """
    Realiza predicciones con un clasificador entrenado.

    - **session_id**: ID de la sesión
    - **target**: 'feedstock' o 'concentration'
    - **sample_indices**: Lista de índices de muestras existentes a predecir
    - **sample_values**: Lista de diccionarios con valores nuevos a predecir

    Debe proporcionar sample_indices O sample_values, no ambos.
    """
    try:
        if request.sample_indices is None and request.sample_values is None:
            raise ValueError("Debe proporcionar sample_indices o sample_values")

        predicciones = classifier_service.predecir(
            session_id=request.session_id,
            target=request.target,
            sample_indices=request.sample_indices,
            sample_values=request.sample_values
        )

        return ClassifierPredictResponse(
            exito=True,
            mensaje=f"Se realizaron {len(predicciones)} predicciones",
            predicciones=predicciones
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al predecir: {str(e)}")


@router.get("/status/{session_id}")
async def estado_clasificadores(session_id: str):
    """
    Obtiene el estado de los clasificadores entrenados para una sesión.
    """
    from app.services.store import store

    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    estado = {
        "feedstock": None,
        "concentration": None
    }

    if session.classifier_feedstock is not None:
        clf = session.classifier_feedstock
        estado["feedstock"] = {
            "entrenado": True,
            "modelo": clf.modelo_tipo,
            "accuracy": clf.accuracy,
            "f1_score": clf.f1_score,
            "usar_pca": clf.usar_pca
        }

    if session.classifier_concentration is not None:
        clf = session.classifier_concentration
        estado["concentration"] = {
            "entrenado": True,
            "modelo": clf.modelo_tipo,
            "accuracy": clf.accuracy,
            "f1_score": clf.f1_score,
            "usar_pca": clf.usar_pca
        }

    return {
        "exito": True,
        "clasificadores": estado
    }
