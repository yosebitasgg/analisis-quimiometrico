"""
Router para el Asistente Quimiométrico Virtual.
Endpoint de chat con integración LLM y contexto del análisis.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.llm_client import call_llm, get_llm_status, is_llm_available
from app.services.context_builder import build_analysis_context, get_compact_context

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


class AssistantResponse(BaseModel):
    """Response del endpoint de chat"""
    reply: str = Field(..., description="Respuesta del asistente")
    mode: str = Field(..., description="Modo de operación: 'real' o 'demo'")


class AssistantStatusResponse(BaseModel):
    """Response del estado del asistente"""
    library_available: bool = Field(..., description="Si la librería de Google AI está disponible")
    api_key_configured: bool = Field(..., description="Si la API key está configurada")
    mode: str = Field(..., description="Modo actual: 'real' o 'demo'")
    model: Optional[str] = Field(None, description="Modelo en uso")


class ContextResponse(BaseModel):
    """Response del contexto del análisis"""
    context: str = Field(..., description="Contexto textual del análisis")
    session_active: bool = Field(..., description="Si hay una sesión activa")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """
    Endpoint principal de chat con el asistente.

    Recibe el historial de mensajes y opcionalmente un session_id para
    contexto del análisis actual. Devuelve la respuesta del LLM.

    - Si GEMINI_API_KEY está configurada: usa el LLM real
    - Si no está configurada: usa modo demo con respuestas heurísticas
    """
    try:
        # Construir contexto del análisis
        context = build_analysis_context(request.session_id)

        # Transformar mensajes a formato esperado por llm_client
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # Validar que hay al menos un mensaje
        if not messages:
            raise HTTPException(
                status_code=400,
                detail="Se requiere al menos un mensaje"
            )

        # Llamar al LLM
        reply = call_llm(context, messages)

        # Determinar modo
        mode = "real" if is_llm_available() else "demo"

        return AssistantResponse(reply=reply, mode=mode)

    except HTTPException:
        raise
    except Exception as e:
        # Log del error (en producción usar logging apropiado)
        print(f"Error en /assistant/chat: {str(e)}")

        return AssistantResponse(
            reply=(f"⚠️ **Error del Asistente**\n\n"
                   f"Ocurrió un error al procesar tu mensaje: {str(e)}\n\n"
                   "Por favor, intenta de nuevo o reformula tu pregunta."),
            mode="error"
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
