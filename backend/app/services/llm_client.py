"""
Cliente LLM para el Asistente Quimiométrico Virtual.
Integración con Google AI Studio (Gemini API) con fallback a modo demo.
"""

import os
from typing import List, Dict, Any, Optional

# Intentar importar la librería de Google AI
try:
    from google import genai
    from google.genai import types
    GOOGLE_AI_AVAILABLE = True
except ImportError:
    GOOGLE_AI_AVAILABLE = False


# System prompt para el asistente
SYSTEM_PROMPT = """Eres un asistente experto en quimiometría y análisis multivariado.
Tu nombre es "Asistente Quimiométrico Virtual" y ayudas a usuarios a interpretar y entender sus análisis.

Especialidades:
- Análisis de Componentes Principales (PCA): interpretación de varianza explicada, scores, loadings y biplots.
- Clustering: K-means, clustering jerárquico, interpretación de dendrogramas y silhouette scores.
- Clasificación supervisada: Random Forest, SVM, Regresión Logística, métricas de evaluación.
- Análisis de similitud: distancias euclidianas, similitud coseno, fingerprinting molecular.
- Preprocesamiento: estandarización, manejo de valores faltantes, selección de variables.

Contexto del análisis actual del usuario:
{context}

Instrucciones:
1. Responde SIEMPRE en español profesional y técnico.
2. Sé conciso pero informativo.
3. Si el usuario pregunta sobre datos que no existen en el contexto, indica que necesita realizar ese análisis primero.
4. Ofrece interpretaciones basadas en los datos cuando sea apropiado.
5. Si detectas patrones interesantes en los datos del contexto, menciónalos proactivamente.
6. Usa terminología técnica de quimiometría pero explica cuando sea necesario.
7. Si el usuario pide algo fuera del ámbito de quimiometría, indica amablemente que tu especialidad es el análisis quimiométrico."""


def get_api_key() -> Optional[str]:
    """
    Obtiene la API key de Gemini desde variables de entorno.

    Returns:
        API key si existe, None si no está configurada
    """
    return os.getenv("GEMINI_API_KEY")


def is_llm_available() -> bool:
    """
    Verifica si el LLM está disponible (librería + API key).

    Returns:
        True si el LLM puede ser usado, False en caso contrario
    """
    return GOOGLE_AI_AVAILABLE and get_api_key() is not None


def call_llm(context: str, messages: List[Dict[str, str]]) -> str:
    """
    Llama al LLM con el contexto y mensajes proporcionados.

    Args:
        context: Contexto del análisis actual (generado por context_builder)
        messages: Lista de mensajes con formato [{"role": "user"|"assistant", "content": "..."}]

    Returns:
        Respuesta del LLM o mensaje de modo demo
    """
    api_key = get_api_key()

    # =========================================================================
    # MODO DEMO (sin API key)
    # =========================================================================
    if not api_key:
        return _get_demo_response(context, messages)

    # =========================================================================
    # VERIFICAR DISPONIBILIDAD DE LIBRERÍA
    # =========================================================================
    if not GOOGLE_AI_AVAILABLE:
        return ("**Modo Demo Activado**\n\n"
                "La librería de Google AI (`google-genai`) no está instalada. "
                "Para usar el asistente con IA real, ejecuta:\n\n"
                "```\npip install google-genai\n```\n\n"
                "Luego reinicia el servidor backend.")

    # =========================================================================
    # LLAMADA REAL A GEMINI API
    # =========================================================================
    try:
        # Crear cliente
        client = genai.Client(api_key=api_key)

        # Construir system prompt con contexto
        full_system_prompt = SYSTEM_PROMPT.format(context=context)

        # Transformar mensajes al formato de Gemini
        gemini_contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            gemini_contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=msg["content"])]
                )
            )

        # Configuración de generación
        config = types.GenerateContentConfig(
            system_instruction=full_system_prompt,
            temperature=0.3,
            max_output_tokens=2048,
            top_p=0.95,
        )

        # Llamar al modelo
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=gemini_contents,
            config=config
        )

        # Extraer texto de respuesta
        if response.text:
            return response.text
        else:
            return "Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta."

    except Exception as e:
        error_msg = str(e)
        print(f"[LLM ERROR] {error_msg}")  # Log para debugging

        # Manejar errores comunes
        if "API_KEY" in error_msg.upper() or "INVALID" in error_msg.upper() or "401" in error_msg:
            return ("**Error de API Key**\n\n"
                    "La API key de Gemini parece ser inválida o no autorizada. "
                    "Por favor, verifica que tu `GEMINI_API_KEY` sea correcta.\n\n"
                    "Puedes obtener una key gratuita en: https://aistudio.google.com/apikey")

        if "QUOTA" in error_msg.upper() or "LIMIT" in error_msg.upper() or "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg.upper():
            return ("**Límite de API Alcanzado**\n\n"
                    "Has excedido el límite de uso de la API de Gemini. "
                    "Espera 1-2 minutos e intenta de nuevo.\n\n"
                    f"Detalles: {error_msg[:200]}")

        if "404" in error_msg or "NOT_FOUND" in error_msg.upper():
            return ("**Modelo no disponible**\n\n"
                    "El modelo de IA no está disponible en tu región o cuenta. "
                    "Intenta con otra API key o espera unos minutos.")

        # Error genérico con detalles
        return (f"**Error de Conexión**\n\n"
                f"No se pudo conectar con el servicio de IA.\n\n"
                f"**Error:** {error_msg[:300]}\n\n"
                "Intenta de nuevo en unos momentos.")


def _get_demo_response(context: str, messages: List[Dict[str, str]]) -> str:
    """
    Genera una respuesta de demostración cuando no hay API key.
    Proporciona respuestas útiles basadas en el contexto y la pregunta.

    Args:
        context: Contexto del análisis
        messages: Lista de mensajes

    Returns:
        Respuesta de demostración
    """
    # Obtener el último mensaje del usuario
    last_user_message = ""
    for msg in reversed(messages):
        if msg["role"] == "user":
            last_user_message = msg["content"].lower()
            break

    # Respuestas heurísticas basadas en palabras clave
    if any(word in last_user_message for word in ["pca", "componente", "varianza", "loading"]):
        if "PCA" in context or "Componentes Principales" in context:
            return ("**Análisis de PCA Detectado**\n\n"
                    "Veo que has realizado un análisis PCA. En modo demo puedo indicarte que:\n\n"
                    "- Los **componentes principales** resumen la variabilidad de tus datos\n"
                    "- La **varianza explicada** indica cuánta información retiene cada PC\n"
                    "- Los **loadings** muestran qué variables contribuyen más a cada componente\n"
                    "- El **biplot** combina scores y loadings para visualizar patrones\n\n"
                    "*Para interpretaciones personalizadas de tus datos, configura tu GEMINI_API_KEY.*")
        else:
            return ("**Sobre PCA**\n\n"
                    "No he detectado resultados de PCA en tu sesión actual. "
                    "Para realizar un análisis PCA:\n\n"
                    "1. Carga tus datos en la página de Análisis\n"
                    "2. Aplica preprocesamiento\n"
                    "3. Calcula el PCA con el número de componentes deseado\n\n"
                    "*Configura GEMINI_API_KEY para obtener ayuda personalizada.*")

    if any(word in last_user_message for word in ["cluster", "agrup", "silhouette", "dendrograma"]):
        if "Clustering" in context:
            return ("**Análisis de Clustering Detectado**\n\n"
                    "Veo que has realizado clustering. En modo demo puedo indicarte que:\n\n"
                    "- El **número de clusters** define cuántos grupos se forman\n"
                    "- El **silhouette score** indica qué tan bien separados están los clusters\n"
                    "- Valores de silhouette > 0.5 indican buena separación\n"
                    "- El **dendrograma** muestra la jerarquía de agrupamiento\n\n"
                    "*Para interpretaciones específicas, configura tu GEMINI_API_KEY.*")
        else:
            return ("**Sobre Clustering**\n\n"
                    "No he detectado resultados de clustering. Para realizar clustering:\n\n"
                    "1. Asegúrate de tener datos cargados y preprocesados\n"
                    "2. Selecciona el método (K-means o Jerárquico)\n"
                    "3. Define el número de clusters\n\n"
                    "*Configura GEMINI_API_KEY para ayuda detallada.*")

    if any(word in last_user_message for word in ["clasificador", "predicción", "accuracy", "f1", "entrenar"]):
        if "Clasificador" in context:
            return ("**Clasificador Detectado**\n\n"
                    "Veo que has entrenado un clasificador. En modo demo:\n\n"
                    "- **Accuracy** mide el porcentaje de predicciones correctas\n"
                    "- **F1-Score** balancea precisión y recall\n"
                    "- La **matriz de confusión** muestra errores por clase\n"
                    "- Las **importancias de variables** indican qué features son más predictivas\n\n"
                    "*Configura GEMINI_API_KEY para análisis detallado.*")
        else:
            return ("**Sobre Clasificación**\n\n"
                    "No hay clasificador entrenado. Para entrenar uno:\n\n"
                    "1. Ve a la página Clasificador\n"
                    "2. Selecciona el target (Feedstock o Concentración)\n"
                    "3. Elige el modelo y parámetros\n"
                    "4. Entrena y evalúa\n\n"
                    "*Configura GEMINI_API_KEY para recomendaciones.*")

    if any(word in last_user_message for word in ["similitud", "similar", "vecino", "distancia"]):
        return ("**Análisis de Similitud**\n\n"
                "El módulo de similitud permite:\n\n"
                "- Encontrar muestras similares a una referencia\n"
                "- Usar distancia **euclidiana** o **coseno**\n"
                "- Buscar en espacio PCA u original\n"
                "- Identificar 'fingerprints' de muestras\n\n"
                "*Configura GEMINI_API_KEY para interpretaciones avanzadas.*")

    if any(word in last_user_message for word in ["hola", "ayuda", "qué puedes", "cómo funciona"]):
        return ("**Hola, soy el Asistente Quimiométrico Virtual**\n\n"
                "Estoy aquí para ayudarte a interpretar tus análisis. Puedo asistirte con:\n\n"
                "- **PCA**: Interpretación de componentes, varianza y loadings\n"
                "- **Clustering**: Análisis de grupos y métricas de calidad\n"
                "- **Clasificación**: Evaluación de modelos predictivos\n"
                "- **Similitud**: Búsqueda de muestras similares\n\n"
                "**Modo Demo Activo**\n\n"
                "Para respuestas personalizadas basadas en tus datos, necesitas configurar "
                "la variable de entorno `GEMINI_API_KEY` con tu clave de Google AI Studio.\n\n"
                "Obtén una gratis en: https://aistudio.google.com/apikey")

    # Respuesta genérica
    return ("**Asistente en Modo Demo**\n\n"
            "Gracias por tu pregunta. Actualmente estoy funcionando en modo demostración "
            "porque no se ha configurado una API key de Gemini.\n\n"
            "**Para activar el asistente completo:**\n\n"
            "1. Obtén una API key gratuita en https://aistudio.google.com/apikey\n"
            "2. Configura la variable de entorno `GEMINI_API_KEY`\n"
            "3. Reinicia el servidor backend\n\n"
            "Mientras tanto, puedo darte información general sobre:\n"
            "- PCA y análisis de componentes principales\n"
            "- Clustering y segmentación de datos\n"
            "- Clasificación supervisada\n"
            "- Análisis de similitud\n\n"
            "¿Sobre qué tema te gustaría saber más?")


def get_llm_status() -> Dict[str, Any]:
    """
    Obtiene el estado actual del servicio LLM.

    Returns:
        Dict con información del estado
    """
    api_key = get_api_key()

    return {
        "library_available": GOOGLE_AI_AVAILABLE,
        "api_key_configured": api_key is not None,
        "mode": "real" if (GOOGLE_AI_AVAILABLE and api_key) else "demo",
        "model": "gemini-2.0-flash" if (GOOGLE_AI_AVAILABLE and api_key) else None
    }
