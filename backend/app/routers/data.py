"""
Router para carga y manejo de datos
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import pandas as pd
import io

from app.models.schemas import (
    DataUploadResponse,
    PreprocessingRequest,
    PreprocessingResponse,
    CorrelationResponse
)
from app.services.store import store
from app.services.data_service import (
    cargar_archivo,
    cargar_ejemplo,
    procesar_dataframe,
    preprocesar_datos,
    obtener_matriz_correlacion
)

router = APIRouter()


@router.post("/upload", response_model=DataUploadResponse)
async def subir_archivo(file: UploadFile = File(...)):
    """
    Sube un archivo CSV o Excel para análisis.
    """
    # Validar extensión
    nombre = file.filename or "archivo"
    extension = nombre.lower().split('.')[-1]

    if extension not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no soportado. Use .csv, .xlsx o .xls"
        )

    try:
        # Leer contenido del archivo
        contenido = await file.read()

        # Cargar archivo
        df, mensaje = cargar_archivo(contenido, nombre)

        # Crear sesión
        session_id = store.crear_sesion()

        # Procesar DataFrame
        info = procesar_dataframe(df, session_id)

        return DataUploadResponse(
            exito=True,
            mensaje=mensaje,
            session_id=session_id,
            **info
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cargar-ejemplo", response_model=DataUploadResponse)
async def cargar_dataset_ejemplo():
    """
    Carga el dataset de ejemplo (chemometrics_example.xls).
    """
    try:
        # Cargar archivo de ejemplo
        df, mensaje = cargar_ejemplo()

        # Crear sesión
        session_id = store.crear_sesion()

        # Procesar DataFrame
        info = procesar_dataframe(df, session_id)

        return DataUploadResponse(
            exito=True,
            mensaje=mensaje,
            session_id=session_id,
            **info
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preprocesar", response_model=PreprocessingResponse)
async def preprocesar(request: PreprocessingRequest):
    """
    Preprocesa los datos: selección de columnas, manejo de NaNs, estandarización.
    """
    if not store.sesion_existe(request.session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = preprocesar_datos(
            session_id=request.session_id,
            columnas_seleccionadas=request.columnas_seleccionadas,
            manejar_nans=request.manejar_nans,
            estandarizar=request.estandarizar
        )

        return PreprocessingResponse(
            exito=True,
            mensaje="Preprocesamiento completado exitosamente",
            **resultado
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlacion/{session_id}", response_model=CorrelationResponse)
async def obtener_correlacion(session_id: str):
    """
    Obtiene la matriz de correlación de las variables seleccionadas.
    """
    if not store.sesion_existe(session_id):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        resultado = obtener_matriz_correlacion(session_id)

        return CorrelationResponse(
            exito=True,
            mensaje="Matriz de correlación calculada",
            **resultado
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info/{session_id}")
async def obtener_info_sesion(session_id: str):
    """
    Obtiene información sobre el estado actual de la sesión.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    return {
        "session_id": session_id,
        "tiene_datos": session.df_original is not None,
        "tiene_preprocesamiento": session.X_procesado is not None,
        "tiene_pca": session.pca_scores is not None,
        "tiene_clusters": session.cluster_labels is not None,
        "columnas_seleccionadas": session.columnas_seleccionadas,
        "num_filas": len(session.df_original) if session.df_original is not None else 0,
        "num_columnas_procesadas": len(session.columnas_seleccionadas) if session.columnas_seleccionadas else 0
    }


@router.get("/exportar/{session_id}")
async def exportar_resultados(
    session_id: str,
    incluir_scores: bool = True,
    incluir_clusters: bool = True,
    incluir_categoricas: bool = True
):
    """
    Exporta los resultados a CSV.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        data = {}

        # Índice de muestras
        n_muestras = len(session.pca_scores) if session.pca_scores is not None else (
            len(session.X_procesado) if session.X_procesado is not None else 0
        )

        if n_muestras == 0:
            raise HTTPException(status_code=400, detail="No hay datos para exportar")

        data["Muestra"] = list(range(n_muestras))

        # Agregar scores de PCA
        if incluir_scores and session.pca_scores is not None:
            for i, nombre in enumerate(session.pca_componentes_nombres):
                data[nombre] = session.pca_scores[:, i].tolist()

        # Agregar etiquetas de clúster
        if incluir_clusters and session.cluster_labels is not None:
            data["Cluster"] = session.cluster_labels.tolist()

        # Agregar variables categóricas
        if incluir_categoricas:
            if session.feedstock is not None:
                data["feedstock"] = session.feedstock.tolist()
            if session.concentration is not None:
                data["concentration"] = session.concentration.tolist()

        # Crear DataFrame y exportar
        df_export = pd.DataFrame(data)

        # Convertir a CSV
        output = io.StringIO()
        df_export.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=resultados_chemometrics.csv"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exportar-loadings/{session_id}")
async def exportar_loadings(session_id: str):
    """
    Exporta los loadings de PCA a CSV.
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.pca_loadings is None:
        raise HTTPException(status_code=400, detail="No hay loadings de PCA calculados")

    try:
        data = {"Variable": session.columnas_seleccionadas}

        for i, nombre in enumerate(session.pca_componentes_nombres):
            data[nombre] = session.pca_loadings[:, i].tolist()

        df_export = pd.DataFrame(data)

        output = io.StringIO()
        df_export.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=loadings_pca.csv"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sesion/{session_id}")
async def eliminar_sesion(session_id: str):
    """
    Elimina una sesión y libera memoria.
    """
    if store.eliminar_sesion(session_id):
        return {"mensaje": "Sesión eliminada exitosamente"}
    else:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
