"""
Router para Generación de Reportes
Endpoints para resúmenes y exportación a PDF
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models.schemas import ReportSummaryResponse
from app.services import report_service

router = APIRouter()


@router.get("/summary/{session_id}", response_model=ReportSummaryResponse)
async def obtener_resumen(session_id: str):
    """
    Obtiene un resumen completo del análisis realizado.

    Incluye:
    - Información del dataset
    - Resumen de PCA (si se calculó)
    - Resumen de clustering (si se calculó)
    - Resumen de clasificadores (si se entrenaron)
    - Interpretaciones automáticas en español
    """
    try:
        resumen = report_service.generar_resumen(session_id)

        return ReportSummaryResponse(
            exito=True,
            mensaje="Resumen generado exitosamente",
            info_dataset=resumen["info_dataset"],
            pca_resumen=resumen["pca_resumen"],
            diagnosticos_resumen=resumen["diagnosticos_resumen"],
            optimizacion_resumen=resumen["optimizacion_resumen"],
            visualizacion_resumen=resumen["visualizacion_resumen"],
            clustering_resumen=resumen["clustering_resumen"],
            classifier_resumen=resumen["classifier_resumen"],
            interpretacion_general=resumen["interpretacion_general"],
            interpretacion_pca=resumen["interpretacion_pca"],
            interpretacion_diagnosticos=resumen["interpretacion_diagnosticos"],
            interpretacion_clustering=resumen["interpretacion_clustering"],
            interpretacion_clasificador=resumen["interpretacion_clasificador"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")


@router.get("/pdf/{session_id}")
async def descargar_pdf(session_id: str):
    """
    Genera y descarga un reporte PDF completo del análisis.

    El PDF incluye:
    - Información del dataset
    - Resultados de PCA con tablas
    - Resultados de clustering
    - Resultados de clasificadores
    - Interpretaciones y conclusiones
    """
    try:
        pdf_bytes = report_service.generar_pdf(session_id)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=reporte_quimiometrico_{session_id}.pdf"
            }
        )

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail="ReportLab no está instalado. Ejecuta: pip install reportlab"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")


@router.get("/interpretations/{session_id}")
async def obtener_interpretaciones(session_id: str):
    """
    Obtiene solo las interpretaciones textuales del análisis.
    Útil para mostrar en la UI sin toda la información del resumen.
    """
    try:
        from app.services.store import store

        session = store.obtener_sesion(session_id)
        if not session:
            raise ValueError("Sesión no encontrada")

        interpretaciones = {
            "pca": report_service.generar_interpretacion_pca(session),
            "clustering": report_service.generar_interpretacion_clustering(session),
            "clasificador": report_service.generar_interpretacion_clasificador(session)
        }

        return {
            "exito": True,
            "interpretaciones": interpretaciones
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
