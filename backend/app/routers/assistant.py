"""
Router para el Asistente Quimiométrico Virtual.
Endpoint de chat con integración LLM y contexto del análisis.
Modo Copilot: sugiere acciones y las ejecuta tras confirmación del usuario.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.services.llm_client import call_llm, get_llm_status, is_llm_available, SUPPORTED_ACTION_TYPES, set_force_demo_mode
from app.services.context_builder import build_analysis_context, get_compact_context, build_copilot_context, get_pipeline_status
from app.services.store import store, SessionData

router = APIRouter()


# =============================================================================
# MODELOS PYDANTIC
# =============================================================================

class AssistantMessage(BaseModel):
    """Mensaje individual del chat"""
    role: str = Field(..., description="Rol del mensaje: 'user' o 'assistant'")
    content: str = Field(..., description="Contenido del mensaje")


class AssistantRequest(BaseModel):
    """Request para el endpoint de chat"""
    messages: List[AssistantMessage] = Field(..., description="Historial de mensajes")
    session_id: Optional[str] = Field(None, description="ID de sesión para contexto del análisis")


class AssistantAction(BaseModel):
    """Acción sugerida por el asistente"""
    id: str = Field(..., description="Identificador único de la acción")
    type: str = Field(..., description="Tipo de acción")
    label: str = Field(..., description="Texto del botón")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parámetros")


class AssistantResponse(BaseModel):
    """Response del endpoint de chat (con acciones)"""
    reply: str = Field(..., description="Respuesta del asistente")
    mode: str = Field(..., description="Modo de operación: 'real' o 'demo'")
    actions: List[AssistantAction] = Field(default_factory=list, description="Acciones sugeridas")


class AssistantStatusResponse(BaseModel):
    """Response del estado del asistente"""
    library_available: bool = Field(..., description="Si la librería de Google AI está disponible")
    api_key_configured: bool = Field(..., description="Si la API key está configurada")
    mode: str = Field(..., description="Modo actual: 'real' o 'demo'")
    model: Optional[str] = Field(None, description="Modelo en uso")
    can_use_real: bool = Field(False, description="Si puede usar modo real (tiene API key)")
    force_demo: bool = Field(False, description="Si se está forzando modo demo")


class SetModeRequest(BaseModel):
    """Request para cambiar el modo del asistente"""
    mode: str = Field(..., description="Modo deseado: 'real' o 'demo'")


class ContextResponse(BaseModel):
    """Response del contexto del análisis"""
    context: str = Field(..., description="Contexto textual del análisis")
    session_active: bool = Field(..., description="Si hay una sesión activa")


class ExecuteActionRequest(BaseModel):
    """Request para ejecutar una acción"""
    session_id: str = Field(..., description="ID de la sesión")
    action_id: str = Field(..., description="ID de la acción")
    action_type: str = Field(..., description="Tipo de acción")
    params: Dict[str, Any] = Field(default_factory=dict, description="Parámetros")


class ExecuteActionResponse(BaseModel):
    """Response de la ejecución de una acción"""
    success: bool = Field(..., description="Si la acción fue exitosa")
    summary: str = Field(..., description="Resumen de lo que se hizo")
    action_type: str = Field(..., description="Tipo de acción ejecutada")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Datos resultantes")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """
    Endpoint principal de chat con el asistente (Modo Copilot).

    Recibe el historial de mensajes y opcionalmente un session_id para
    contexto del análisis actual. Devuelve la respuesta del LLM junto con
    acciones sugeridas que el usuario puede confirmar.

    - Si GEMINI_API_KEY está configurada: usa el LLM real con modo Copilot
    - Si no está configurada: usa modo demo con respuestas heurísticas
    """
    try:
        # Construir contexto del análisis (versión Copilot con estado del pipeline)
        context = build_copilot_context(request.session_id)

        # Transformar mensajes a formato esperado por llm_client
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # Validar que hay al menos un mensaje
        if not messages:
            raise HTTPException(
                status_code=400,
                detail="Se requiere al menos un mensaje"
            )

        # Llamar al LLM (ahora devuelve dict con reply + actions)
        llm_response = call_llm(context, messages)

        # Determinar modo
        mode = "real" if is_llm_available() else "demo"

        # Transformar acciones al formato del modelo
        actions = [
            AssistantAction(
                id=action["id"],
                type=action["type"],
                label=action["label"],
                params=action.get("params", {})
            )
            for action in llm_response.get("actions", [])
        ]

        return AssistantResponse(
            reply=llm_response["assistant_reply"],
            mode=mode,
            actions=actions
        )

    except HTTPException:
        raise
    except Exception as e:
        # Log del error (en producción usar logging apropiado)
        print(f"Error en /assistant/chat: {str(e)}")

        return AssistantResponse(
            reply=(f"⚠️ **Error del Asistente**\n\n"
                   f"Ocurrió un error al procesar tu mensaje: {str(e)}\n\n"
                   "Por favor, intenta de nuevo o reformula tu pregunta."),
            mode="error",
            actions=[]
        )


@router.get("/status", response_model=AssistantStatusResponse)
async def get_assistant_status():
    """
    Obtiene el estado actual del servicio de asistente.

    Útil para que el frontend sepa si el asistente está en modo
    real o demo, y mostrar indicadores apropiados.
    """
    status = get_llm_status()
    return AssistantStatusResponse(**status)


@router.post("/set-mode", response_model=AssistantStatusResponse)
async def set_assistant_mode(request: SetModeRequest):
    """
    Cambia el modo del asistente entre 'real' y 'demo'.

    Solo funciona si hay una API key configurada.
    Si no hay API key, siempre estará en modo demo.
    """
    if request.mode not in ["real", "demo"]:
        raise HTTPException(
            status_code=400,
            detail="Modo inválido. Use 'real' o 'demo'"
        )

    # Verificar si puede usar modo real
    status = get_llm_status()
    if request.mode == "real" and not status["can_use_real"]:
        raise HTTPException(
            status_code=400,
            detail="No se puede activar modo real sin API key configurada"
        )

    # Cambiar el modo
    set_force_demo_mode(request.mode == "demo")

    # Devolver el nuevo estado
    new_status = get_llm_status()
    return AssistantStatusResponse(**new_status)


@router.get("/context/{session_id}", response_model=ContextResponse)
async def get_analysis_context(session_id: str):
    """
    Obtiene el contexto de análisis para una sesión.

    Útil para debugging o para mostrar al usuario qué información
    el asistente tiene disponible sobre su análisis.
    """
    context = build_analysis_context(session_id)
    session_active = "No hay datos" not in context and "no hay análisis" not in context.lower()

    return ContextResponse(context=context, session_active=session_active)


@router.get("/context-structured/{session_id}")
async def get_structured_context(session_id: str):
    """
    Obtiene el contexto de análisis en formato estructurado (JSON).

    Útil para integraciones o visualizaciones del contexto.
    """
    return get_compact_context(session_id)


# =============================================================================
# ENDPOINT DE EJECUCIÓN DE ACCIONES (COPILOT)
# =============================================================================

@router.post("/execute_action", response_model=ExecuteActionResponse)
async def execute_copilot_action(request: ExecuteActionRequest):
    """
    Ejecuta una acción sugerida por el asistente (Modo Copilot).

    Este endpoint solo ejecuta acciones del whitelist definido.
    El usuario debe haber confirmado la acción en el frontend.

    Acciones soportadas:
    - RUN_PCA_AUTO: Ejecutar PCA con optimización automática
    - RUN_PCA_CUSTOM: Ejecutar PCA con n componentes específicos
    - RUN_CLUSTERING_AUTO: Ejecutar clustering con k óptimo
    - RUN_CLUSTERING_CUSTOM: Ejecutar clustering con k específico
    - TRAIN_CLASSIFIER_FEEDSTOCK: Entrenar clasificador de feedstock
    - TRAIN_CLASSIFIER_CONCENTRATION: Entrenar clasificador de concentración
    - GENERATE_REPORT: Generar reporte del análisis
    """
    # Validar que la acción está en el whitelist
    if request.action_type not in SUPPORTED_ACTION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de acción no soportado: {request.action_type}. "
                   f"Acciones válidas: {list(SUPPORTED_ACTION_TYPES.keys())}"
        )

    # Crear sesión automáticamente si no existe (para el flujo del Copilot)
    if not store.sesion_existe(request.session_id):
        store._sessions[request.session_id] = SessionData()

    try:
        # Ejecutar acción según el tipo
        result = await _execute_action(
            request.session_id,
            request.action_type,
            request.params
        )

        return ExecuteActionResponse(
            success=True,
            summary=result["summary"],
            action_type=request.action_type,
            data=result.get("data")
        )

    except Exception as e:
        print(f"Error ejecutando acción {request.action_type}: {str(e)}")
        return ExecuteActionResponse(
            success=False,
            summary=f"Error al ejecutar la acción: {str(e)}",
            action_type=request.action_type,
            data=None
        )


# Mensaje que se agrega al final de cada resumen de acción
UI_SYNC_MESSAGE = "\n\n*Puedes ver los resultados en la interfaz al cerrar el asistente.*"


async def _execute_action(session_id: str, action_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ejecuta una acción específica según su tipo.
    Llama a los servicios existentes del backend.
    """

    # =========================================================================
    # RUN_PCA_AUTO - PCA con optimización automática
    # =========================================================================
    if action_type == "RUN_PCA_AUTO":
        from app.services.pca_service import calcular_pca, calcular_optimizacion_pcs

        # Primero obtener la recomendación de componentes
        try:
            optim = calcular_optimizacion_pcs(session_id)
            n_componentes = optim["componentes_recomendados"]
            varianza_objetivo = optim["varianza_recomendada"]
        except Exception:
            # Si no se puede optimizar, usar 5 componentes por defecto
            n_componentes = 5
            varianza_objetivo = 90.0

        # Calcular PCA
        result = calcular_pca(session_id, n_componentes)

        # varianza_explicada es una lista de dicts con keys: componente, varianza_explicada, varianza_acumulada
        # La varianza_acumulada del último componente es el total
        varianza_total = result["varianza_explicada"][-1]["varianza_acumulada"]
        return {
            "summary": f"Se ejecuto PCA con {n_componentes} componentes principales ({varianza_total:.1f}% de varianza explicada).{UI_SYNC_MESSAGE}",
            "data": {
                "n_componentes": n_componentes,
                "varianza_total": varianza_total,
                "componentes_recomendados": n_componentes
            }
        }

    # =========================================================================
    # RUN_PCA_CUSTOM - PCA con n componentes específicos
    # =========================================================================
    elif action_type == "RUN_PCA_CUSTOM":
        from app.services.pca_service import calcular_pca

        n_componentes = params.get("n_componentes", 5)
        result = calcular_pca(session_id, n_componentes)

        varianza_total = result["varianza_explicada"][-1]["varianza_acumulada"]
        return {
            "summary": f"Se ejecuto PCA con {n_componentes} componentes ({varianza_total:.1f}% de varianza explicada).{UI_SYNC_MESSAGE}",
            "data": {
                "n_componentes": n_componentes,
                "varianza_total": varianza_total
            }
        }

    # =========================================================================
    # RUN_CLUSTERING_AUTO - Clustering con k óptimo
    # =========================================================================
    elif action_type == "RUN_CLUSTERING_AUTO":
        from app.services.clustering_service import calcular_kmeans, calcular_silhouette_por_k

        metodo = params.get("metodo", "kmeans")

        # Encontrar k óptimo por silhouette
        try:
            silhouette_analysis = calcular_silhouette_por_k(session_id, k_min=2, k_max=8, usar_pca=True)
            # Encontrar k con mejor silhouette
            best_k = 2
            best_score = -1
            for item in silhouette_analysis["resultados"]:
                if item["silhouette_score"] > best_score:
                    best_score = item["silhouette_score"]
                    best_k = item["k"]
        except Exception:
            best_k = 3
            best_score = None

        # Ejecutar clustering
        result = calcular_kmeans(session_id, n_clusters=best_k, usar_pca=True)

        silhouette_str = f" (silhouette: {best_score:.3f})" if best_score else ""
        return {
            "summary": f"Se ejecuto K-means con k={best_k} clusters{silhouette_str}.{UI_SYNC_MESSAGE}",
            "data": {
                "metodo": metodo,
                "n_clusters": best_k,
                "silhouette_score": best_score
            }
        }

    # =========================================================================
    # RUN_CLUSTERING_CUSTOM - Clustering con k específico
    # =========================================================================
    elif action_type == "RUN_CLUSTERING_CUSTOM":
        from app.services.clustering_service import calcular_kmeans, calcular_jerarquico

        metodo = params.get("metodo", "kmeans")
        n_clusters = params.get("n_clusters", 3)

        if metodo == "jerarquico":
            result = calcular_jerarquico(session_id, n_clusters=n_clusters, linkage_method="ward", usar_pca=True)
        else:
            result = calcular_kmeans(session_id, n_clusters=n_clusters, usar_pca=True)

        silhouette_str = f" (silhouette: {result.get('silhouette_score', 0):.3f})" if result.get('silhouette_score') else ""
        return {
            "summary": f"Se ejecuto {metodo} con k={n_clusters} clusters{silhouette_str}.{UI_SYNC_MESSAGE}",
            "data": {
                "metodo": metodo,
                "n_clusters": n_clusters,
                "silhouette_score": result.get("silhouette_score")
            }
        }

    # =========================================================================
    # TRAIN_CLASSIFIER_FEEDSTOCK - Entrenar clasificador de feedstock
    # =========================================================================
    elif action_type == "TRAIN_CLASSIFIER_FEEDSTOCK":
        from app.services.classifier_service import entrenar_clasificador

        modelo = params.get("modelo", "random_forest")
        result = entrenar_clasificador(
            session_id=session_id,
            target="feedstock",
            modelo_tipo=modelo,
            usar_pca=True,
            test_size=0.2
        )

        return {
            "summary": f"Se entreno clasificador de feedstock ({modelo}): Accuracy {result['accuracy']*100:.1f}%, F1-Score {result['f1_score']*100:.1f}%.{UI_SYNC_MESSAGE}",
            "data": {
                "target": "feedstock",
                "modelo": modelo,
                "accuracy": result["accuracy"],
                "f1_score": result["f1_score"]
            }
        }

    # =========================================================================
    # TRAIN_CLASSIFIER_CONCENTRATION - Entrenar clasificador de concentración
    # =========================================================================
    elif action_type == "TRAIN_CLASSIFIER_CONCENTRATION":
        from app.services.classifier_service import entrenar_clasificador

        modelo = params.get("modelo", "random_forest")
        result = entrenar_clasificador(
            session_id=session_id,
            target="concentration",
            modelo_tipo=modelo,
            usar_pca=True,
            test_size=0.2
        )

        return {
            "summary": f"Se entreno clasificador de concentracion ({modelo}): Accuracy {result['accuracy']*100:.1f}%, F1-Score {result['f1_score']*100:.1f}%.{UI_SYNC_MESSAGE}",
            "data": {
                "target": "concentration",
                "modelo": modelo,
                "accuracy": result["accuracy"],
                "f1_score": result["f1_score"]
            }
        }

    # =========================================================================
    # GENERATE_REPORT - Generar reporte
    # =========================================================================
    elif action_type == "GENERATE_REPORT":
        from app.services.report_service import generar_resumen

        result = generar_resumen(session_id)

        return {
            "summary": f"Se genero el resumen del reporte. Consulta la pagina de Reportes para ver el informe completo.{UI_SYNC_MESSAGE}",
            "data": {
                "tiene_pca": result.get("pca_resumen") is not None,
                "tiene_clustering": result.get("clustering_resumen") is not None,
                "tiene_clasificador": result.get("classifier_resumen") is not None
            }
        }

    # =========================================================================
    # RUN_SIMILARITY_SEARCH - Búsqueda de similitud
    # =========================================================================
    elif action_type == "RUN_SIMILARITY_SEARCH":
        from app.services.similarity_service import buscar_similares

        sample_index = params.get("sample_index", 0)
        k = params.get("k", 5)

        result = buscar_similares(
            session_id=session_id,
            sample_index=sample_index,
            metric="euclidean",
            space="pca",
            k=k
        )

        return {
            "summary": f"Se encontraron {len(result['vecinos'])} muestras similares a la muestra {sample_index}.{UI_SYNC_MESSAGE}",
            "data": {
                "sample_index": sample_index,
                "k": k,
                "vecinos_encontrados": len(result["vecinos"])
            }
        }

    # =========================================================================
    # LOAD_EXAMPLE_DATA - Cargar el dataset de ejemplo
    # =========================================================================
    elif action_type == "LOAD_EXAMPLE_DATA":
        from app.services.data_service import cargar_ejemplo, procesar_dataframe

        # Cargar el dataset de ejemplo
        df, mensaje = cargar_ejemplo()

        # Procesar el DataFrame y guardarlo en la sesión
        result = procesar_dataframe(df, session_id)

        return {
            "summary": f"Se cargo el dataset de ejemplo: {result['num_filas']} muestras, {result['num_columnas']} columnas ({len(result['columnas_numericas'])} numericas).{UI_SYNC_MESSAGE}",
            "data": {
                "num_filas": result["num_filas"],
                "num_columnas": result["num_columnas"],
                "columnas_numericas": len(result["columnas_numericas"]),
                "columnas_categoricas": len(result["columnas_categoricas"])
            }
        }

    # =========================================================================
    # RUN_PREPROCESSING_AUTO - Preprocesamiento automático
    # =========================================================================
    elif action_type == "RUN_PREPROCESSING_AUTO":
        from app.services.data_service import preprocesar_datos

        session = store.obtener_sesion(session_id)
        if not session or session.df_original is None:
            raise ValueError("No hay datos cargados. Usa LOAD_EXAMPLE_DATA primero.")

        # Usar todas las columnas numéricas disponibles
        columnas = session.columnas_numericas

        # Aplicar preprocesamiento con configuración estándar
        result = preprocesar_datos(
            session_id=session_id,
            columnas_seleccionadas=columnas,
            manejar_nans="eliminar",
            estandarizar=True
        )

        return {
            "summary": f"Preprocesamiento aplicado: {result['num_filas']} muestras, {result['num_columnas']} variables estandarizadas.{UI_SYNC_MESSAGE}",
            "data": {
                "num_filas": result["num_filas"],
                "num_columnas": result["num_columnas"],
                "filas_eliminadas": result["filas_eliminadas"]
            }
        }

    # =========================================================================
    # FULL_PIPELINE_PCA_AUTO - Pipeline completo: datos → preprocesar → PCA
    # =========================================================================
    elif action_type == "FULL_PIPELINE_PCA_AUTO":
        from app.services.data_service import cargar_ejemplo, procesar_dataframe, preprocesar_datos
        from app.services.pca_service import calcular_pca, calcular_optimizacion_pcs

        steps_completed = []
        session = store.obtener_sesion(session_id)

        # Paso 1: Cargar datos si no hay
        if session.df_original is None:
            df, _ = cargar_ejemplo()
            result_load = procesar_dataframe(df, session_id)
            steps_completed.append(f"Datos cargados ({result_load['num_filas']} muestras)")
            session = store.obtener_sesion(session_id)  # Refrescar sesión

        # Paso 2: Preprocesar si no está hecho
        if session.X_procesado is None:
            columnas = session.columnas_numericas
            result_prep = preprocesar_datos(
                session_id=session_id,
                columnas_seleccionadas=columnas,
                manejar_nans="eliminar",
                estandarizar=True
            )
            steps_completed.append(f"Preprocesamiento ({result_prep['num_columnas']} variables)")

        # Paso 3: Calcular PCA óptimo
        try:
            optim = calcular_optimizacion_pcs(session_id)
            n_componentes = optim["componentes_recomendados"]
        except Exception:
            n_componentes = 5

        result_pca = calcular_pca(session_id, n_componentes)
        varianza_total = result_pca["varianza_explicada"][-1]["varianza_acumulada"]
        steps_completed.append(f"PCA con {n_componentes} componentes ({varianza_total:.1f}% varianza)")

        return {
            "summary": f"Pipeline completado: {' -> '.join(steps_completed)}.{UI_SYNC_MESSAGE}",
            "data": {
                "n_componentes": n_componentes,
                "varianza_total": varianza_total,
                "steps": steps_completed
            }
        }

    # =========================================================================
    # FULL_PIPELINE_CLUSTERING_AUTO - Pipeline completo: datos → preprocesar → PCA → clustering
    # =========================================================================
    elif action_type == "FULL_PIPELINE_CLUSTERING_AUTO":
        from app.services.data_service import cargar_ejemplo, procesar_dataframe, preprocesar_datos
        from app.services.pca_service import calcular_pca, calcular_optimizacion_pcs
        from app.services.clustering_service import calcular_kmeans, calcular_silhouette_por_k

        steps_completed = []
        session = store.obtener_sesion(session_id)

        # Paso 1: Cargar datos si no hay
        if session.df_original is None:
            df, _ = cargar_ejemplo()
            result_load = procesar_dataframe(df, session_id)
            steps_completed.append(f"Datos cargados ({result_load['num_filas']} muestras)")
            session = store.obtener_sesion(session_id)

        # Paso 2: Preprocesar si no está hecho
        if session.X_procesado is None:
            columnas = session.columnas_numericas
            result_prep = preprocesar_datos(
                session_id=session_id,
                columnas_seleccionadas=columnas,
                manejar_nans="eliminar",
                estandarizar=True
            )
            steps_completed.append(f"Preprocesamiento ({result_prep['num_columnas']} variables)")
            session = store.obtener_sesion(session_id)

        # Paso 3: Calcular PCA si no está hecho
        if session.pca_scores is None:
            try:
                optim = calcular_optimizacion_pcs(session_id)
                n_componentes = optim["componentes_recomendados"]
            except Exception:
                n_componentes = 5

            result_pca = calcular_pca(session_id, n_componentes)
            varianza_total = result_pca["varianza_explicada"][-1]["varianza_acumulada"]
            steps_completed.append(f"PCA con {n_componentes} componentes ({varianza_total:.1f}% varianza)")

        # Paso 4: Calcular clustering óptimo
        try:
            silhouette_analysis = calcular_silhouette_por_k(session_id, k_min=2, k_max=8, usar_pca=True)
            best_k = 2
            best_score = -1
            for item in silhouette_analysis["resultados"]:
                if item["silhouette_score"] > best_score:
                    best_score = item["silhouette_score"]
                    best_k = item["k"]
        except Exception:
            best_k = 3
            best_score = None

        result_cluster = calcular_kmeans(session_id, n_clusters=best_k, usar_pca=True)
        silhouette_str = f" (silhouette: {best_score:.3f})" if best_score else ""
        steps_completed.append(f"Clustering k={best_k}{silhouette_str}")

        return {
            "summary": f"Pipeline completo: {' -> '.join(steps_completed)}.{UI_SYNC_MESSAGE}",
            "data": {
                "n_clusters": best_k,
                "silhouette_score": best_score,
                "steps": steps_completed
            }
        }

    # =========================================================================
    # Acción no reconocida (no debería llegar aquí por el whitelist)
    # =========================================================================
    else:
        raise ValueError(f"Acción no implementada: {action_type}")
