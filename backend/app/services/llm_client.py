"""
Cliente LLM para el Asistente Quimiométrico Virtual.
Integración con Google AI Studio (Gemini API) con fallback a modo demo.
Modo Copilot: genera acciones sugeridas para que el usuario confirme.
"""

import os
import json
import uuid
from typing import List, Dict, Any, Optional

# Intentar importar la librería de Google AI
try:
    from google import genai
    from google.genai import types
    GOOGLE_AI_AVAILABLE = True
except ImportError:
    GOOGLE_AI_AVAILABLE = False


# ============================================================================
# OVERRIDE DE MODO (permite forzar demo incluso con API key)
# ============================================================================
_force_demo_mode: bool = False


def set_force_demo_mode(force_demo: bool) -> None:
    """
    Permite forzar el modo demo incluso si hay API key configurada.

    Args:
        force_demo: True para forzar modo demo, False para usar modo real si hay API key
    """
    global _force_demo_mode
    _force_demo_mode = force_demo


def get_force_demo_mode() -> bool:
    """
    Obtiene el estado actual del override de modo demo.

    Returns:
        True si se está forzando modo demo, False en caso contrario
    """
    return _force_demo_mode


# ============================================================================
# TIPOS DE ACCIONES SOPORTADAS (WHITELIST)
# ============================================================================
SUPPORTED_ACTION_TYPES = {
    # Acciones de carga y preprocesamiento
    "LOAD_EXAMPLE_DATA": "Cargar el dataset de ejemplo (chemometrics_example.xls)",
    "RUN_PREPROCESSING_AUTO": "Aplicar preprocesamiento automático (estandarización)",
    # Acciones de PCA
    "RUN_PCA_AUTO": "Ejecutar PCA con configuración optimizada",
    "RUN_PCA_CUSTOM": "Ejecutar PCA con parámetros específicos",
    # Acciones de Clustering
    "RUN_CLUSTERING_AUTO": "Ejecutar clustering con k óptimo",
    "RUN_CLUSTERING_CUSTOM": "Ejecutar clustering con parámetros específicos",
    # Acciones de Clasificación
    "TRAIN_CLASSIFIER_FEEDSTOCK": "Entrenar clasificador para feedstock",
    "TRAIN_CLASSIFIER_CONCENTRATION": "Entrenar clasificador para concentración",
    # Acciones de Utilidad
    "GENERATE_REPORT": "Generar reporte del análisis",
    "RUN_SIMILARITY_SEARCH": "Buscar muestras similares",
    # NOTA: FULL_PIPELINE removidos - siempre usar acciones individuales
}


# System prompt para el asistente CON FORMATO DE ACCIONES Y RAZONAMIENTO DE PIPELINE
SYSTEM_PROMPT_COPILOT = """Eres un asistente experto en quimiometría y análisis multivariado.
Tu nombre es "Asistente Quimiométrico Virtual" y ayudas a usuarios a interpretar y realizar análisis de datos.

## TUS ESPECIALIDADES:
- Análisis de Componentes Principales (PCA): interpretación de varianza explicada, scores, loadings y biplots.
- Clustering: K-means, clustering jerárquico, interpretación de dendrogramas y silhouette scores.
- Clasificación supervisada: Random Forest, SVM, Regresión Logística, métricas de evaluación.
- Análisis de similitud: distancias euclidianas, similitud coseno, fingerprinting molecular.
- Preprocesamiento: estandarización, manejo de valores faltantes, selección de variables.

## ESTADO ACTUAL DEL SISTEMA:
{context}

## REGLA FUNDAMENTAL: DISTINGUIR ENTRE PREGUNTAS Y SOLICITUDES DE EJECUCION

### PREGUNTAS INFORMATIVAS (responde con "actions": [])
Si el usuario PREGUNTA sobre resultados, datos o interpretaciones:
- "¿Cómo salió el PCA?" → USA el contexto para responder, NO propongas acciones
- "Dime los resultados del clustering" → LEE el contexto y responde con los datos
- "¿Qué variables son más importantes?" → RESPONDE con los loadings del contexto
- "Explica la varianza explicada" → INTERPRETA los datos del contexto
- "¿Cuántas muestras hay?" → RESPONDE con los datos del contexto

Para estas preguntas, RESPONDE DIRECTAMENTE usando la información del ESTADO ACTUAL DEL SISTEMA.
NO PROPONGAS acciones. El usuario solo quiere información.

### SOLICITUDES DE EJECUCION (propón acciones)
Solo propón acciones cuando el usuario PIDA EJECUTAR algo:
- "Haz un PCA" → Propón las acciones necesarias paso a paso
- "Ejecuta clustering" → Propón las acciones necesarias paso a paso
- "Entrena un clasificador" → Propón las acciones necesarias paso a paso
- "Carga los datos" → Propón SOLO LOAD_EXAMPLE_DATA (nada más)
- "Calcula...", "Realiza...", "Genera..." → Propón acción específica

## MODO COPILOT - REGLAS PARA EJECUCION:

### REGLA #1: SOLO UNA ACCION POR SOLICITUD SIMPLE
Si el usuario pide algo específico como "carga los datos" o "haz preprocesamiento",
propón SOLO ESA ACCION, no el pipeline completo.

### REGLA #2: MULTIPLES ACCIONES SOLO CUANDO SEA NECESARIO
Propón múltiples acciones SOLO cuando el usuario pida algo que REQUIERE pasos previos:
- Si pide PCA y no hay datos → propón: LOAD_EXAMPLE_DATA, RUN_PREPROCESSING_AUTO, RUN_PCA_AUTO
- Si pide PCA y ya hay preprocesamiento → propón SOLO: RUN_PCA_AUTO
- Si pide "Carga los datos" → propón SOLO: LOAD_EXAMPLE_DATA (NUNCA agregues más)

### REGLA #3: NUNCA USES FULL_PIPELINE
NO uses FULL_PIPELINE_PCA_AUTO ni FULL_PIPELINE_CLUSTERING_AUTO.
Siempre propón las acciones INDIVIDUALES para que el usuario las ejecute una por una.

### EJEMPLOS CORRECTOS:

**Ejemplo 1: Usuario PREGUNTA "¿Cómo quedó el PCA?"**
- El contexto dice: PCA Realizado, 4 componentes, 92% varianza, loadings...
- RESPUESTA: Explica los resultados del PCA usando los datos del contexto
- actions: []  (NO propones ninguna acción)

**Ejemplo 2: Usuario PREGUNTA "Dime los resultados del análisis"**
- RESPUESTA: Resume toda la información del contexto (datos, PCA, clustering, etc.)
- actions: []  (NO propones ninguna acción)

**Ejemplo 3: Usuario PIDE "Haz un PCA" pero NO hay datos**
- Detectas: has_data=false
- RESPUESTA: "Voy a cargar datos y ejecutar el pipeline completo"
- actions: [LOAD_EXAMPLE_DATA, RUN_PREPROCESSING_AUTO, RUN_PCA_AUTO]

**Ejemplo 4: Usuario PIDE "Ejecuta clustering"**
- Si ya hay PCA: propón solo RUN_CLUSTERING_AUTO
- Si no hay PCA: propón el pipeline completo necesario

## TIPOS DE ACCIONES DISPONIBLES (usa SOLO estas):
- "LOAD_EXAMPLE_DATA": Carga el dataset de ejemplo. Params: {{}}
- "RUN_PREPROCESSING_AUTO": Aplica estandarización. Params: {{}}
- "RUN_PCA_AUTO": PCA con número óptimo de componentes. Params: {{}}
- "RUN_PCA_CUSTOM": PCA con n componentes específicos. Params: {{"n_componentes": número}}
- "RUN_CLUSTERING_AUTO": K-means con k óptimo. Params: {{}}
- "RUN_CLUSTERING_CUSTOM": Clustering con k específico. Params: {{"metodo": "kmeans", "n_clusters": número}}
- "TRAIN_CLASSIFIER_FEEDSTOCK": Entrenar clasificador de feedstock. Params: {{}}
- "TRAIN_CLASSIFIER_CONCENTRATION": Entrenar clasificador de concentración. Params: {{}}
- "GENERATE_REPORT": Generar reporte. Params: {{}}
- "RUN_SIMILARITY_SEARCH": Buscar similares. Params: {{"sample_index": 0, "k": 5}}

## FORMATO DE RESPUESTA:
SIEMPRE responde con JSON válido con esta estructura EXACTA:

Para PREGUNTAS informativas:
{{
  "assistant_reply": "<respuesta usando datos del contexto>",
  "actions": []
}}

Para SOLICITUDES DE EJECUCION (haz, ejecuta, carga, entrena, etc.):
{{
  "assistant_reply": "<explicación breve de lo que se hará>",
  "actions": [
    {{"id": "action-1", "type": "TIPO_ACCION", "label": "Texto del boton", "params": {{}}}}
  ]
}}

## EJEMPLOS CONCRETOS DE RESPUESTA:

**Usuario dice: "Haz un PCA" (sin datos cargados)**
{{
  "assistant_reply": "Voy a cargar los datos de ejemplo, aplicar preprocesamiento y ejecutar PCA.",
  "actions": [
    {{"id": "action-1", "type": "LOAD_EXAMPLE_DATA", "label": "Cargar datos", "params": {{}}}},
    {{"id": "action-2", "type": "RUN_PREPROCESSING_AUTO", "label": "Preprocesar", "params": {{}}}},
    {{"id": "action-3", "type": "RUN_PCA_AUTO", "label": "Ejecutar PCA", "params": {{}}}}
  ]
}}

**Usuario dice: "Ejecuta clustering" (con PCA ya hecho)**
{{
  "assistant_reply": "Ejecutaré clustering K-means con el número óptimo de clusters.",
  "actions": [
    {{"id": "action-1", "type": "RUN_CLUSTERING_AUTO", "label": "Clustering óptimo", "params": {{}}}}
  ]
}}

**Usuario dice: "¿Cómo salió el PCA?"**
{{
  "assistant_reply": "El PCA se ejecutó con 4 componentes principales capturando 92% de varianza...",
  "actions": []
}}

**Usuario dice: "Carga los datos de ejemplo" (IMPORTANTE: solo una acción)**
{{
  "assistant_reply": "Voy a cargar el dataset de ejemplo.",
  "actions": [
    {{"id": "action-1", "type": "LOAD_EXAMPLE_DATA", "label": "Cargar datos", "params": {{}}}}
  ]
}}

**Usuario dice: "Aplica preprocesamiento" (ya hay datos cargados)**
{{
  "assistant_reply": "Aplicaré preprocesamiento a los datos.",
  "actions": [
    {{"id": "action-1", "type": "RUN_PREPROCESSING_AUTO", "label": "Preprocesar", "params": {{}}}}
  ]
}}

## INSTRUCCIONES FINALES:
1. Responde SIEMPRE en español profesional.
2. Para PREGUNTAS: usa los datos del contexto, actions: []
3. Para EJECUCIONES: SIEMPRE incluye el array actions con las acciones necesarias
4. Los "type" DEBEN ser exactamente los listados arriba (LOAD_EXAMPLE_DATA, RUN_PCA_AUTO, etc.)
5. Genera IDs únicos: action-1, action-2, action-3...
6. Labels cortos (max 25 caracteres)"""


# System prompt antiguo (para respuestas sin acciones / fallback)
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
    Verifica si el LLM está disponible (librería + API key + no forzado demo).

    Returns:
        True si el LLM puede ser usado, False en caso contrario
    """
    if _force_demo_mode:
        return False
    return GOOGLE_AI_AVAILABLE and get_api_key() is not None


def _parse_llm_response(raw_response: str) -> Dict[str, Any]:
    """
    Parsea la respuesta del LLM que debe venir en formato JSON.
    Maneja casos donde el LLM no devuelve JSON válido.

    Returns:
        Dict con 'assistant_reply' y 'actions'
    """
    try:
        # Intentar extraer JSON de la respuesta
        # A veces el LLM envuelve el JSON en markdown code blocks
        response_text = raw_response.strip()

        # Remover markdown code blocks si existen
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]

        if response_text.endswith("```"):
            response_text = response_text[:-3]

        response_text = response_text.strip()

        # Parsear JSON
        parsed = json.loads(response_text)

        # Validar estructura
        if "assistant_reply" not in parsed:
            raise ValueError("Falta 'assistant_reply' en la respuesta")

        # Asegurar que actions existe y es una lista
        actions = parsed.get("actions", [])
        if not isinstance(actions, list):
            actions = []

        # Filtrar acciones válidas (solo tipos soportados)
        valid_actions = []
        for action in actions:
            if isinstance(action, dict) and action.get("type") in SUPPORTED_ACTION_TYPES:
                # Asegurar campos requeridos
                valid_actions.append({
                    "id": action.get("id", f"action-{uuid.uuid4().hex[:8]}"),
                    "type": action["type"],
                    "label": action.get("label", SUPPORTED_ACTION_TYPES[action["type"]]),
                    "params": action.get("params", {})
                })

        return {
            "assistant_reply": parsed["assistant_reply"],
            "actions": valid_actions
        }

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        # Si no es JSON válido, devolver la respuesta como texto simple
        print(f"[LLM PARSE WARNING] No se pudo parsear JSON: {e}")
        return {
            "assistant_reply": raw_response,
            "actions": []
        }


def call_llm(context: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Llama al LLM con el contexto y mensajes proporcionados.
    Modo Copilot: devuelve respuesta estructurada con acciones sugeridas.

    Args:
        context: Contexto del análisis actual (generado por context_builder)
        messages: Lista de mensajes con formato [{"role": "user"|"assistant", "content": "..."}]

    Returns:
        Dict con 'assistant_reply' (str) y 'actions' (List[Dict])
    """
    # =========================================================================
    # MODO DEMO (sin API key o forzado por el usuario)
    # =========================================================================
    if not is_llm_available():
        demo_response = _get_demo_response(context, messages)
        return demo_response

    # =========================================================================
    # LLAMADA REAL A GEMINI API (MODO COPILOT)
    # =========================================================================
    api_key = get_api_key()
    try:
        # Crear cliente
        client = genai.Client(api_key=api_key)

        # Construir system prompt COPILOT con contexto
        full_system_prompt = SYSTEM_PROMPT_COPILOT.format(context=context)

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

        # Configuración de generación (JSON mode)
        config = types.GenerateContentConfig(
            system_instruction=full_system_prompt,
            temperature=0.3,
            max_output_tokens=2048,
            top_p=0.95,
            response_mime_type="application/json",  # Forzar respuesta JSON
        )

        # Llamar al modelo
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=gemini_contents,
            config=config
        )

        # Extraer y parsear respuesta
        if response.text:
            return _parse_llm_response(response.text)
        else:
            return {
                "assistant_reply": "Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta.",
                "actions": []
            }

    except Exception as e:
        error_msg = str(e)
        print(f"[LLM ERROR] {error_msg}")  # Log para debugging

        # Manejar errores comunes
        if "API_KEY" in error_msg.upper() or "INVALID" in error_msg.upper() or "401" in error_msg:
            return {
                "assistant_reply": ("**Error de API Key**\n\n"
                    "La API key de Gemini parece ser inválida o no autorizada. "
                    "Por favor, verifica que tu `GEMINI_API_KEY` sea correcta.\n\n"
                    "Puedes obtener una key gratuita en: https://aistudio.google.com/apikey"),
                "actions": []
            }

        if "QUOTA" in error_msg.upper() or "LIMIT" in error_msg.upper() or "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg.upper():
            return {
                "assistant_reply": ("**Límite de API Alcanzado**\n\n"
                    "Has excedido el límite de uso de la API de Gemini. "
                    "Espera 1-2 minutos e intenta de nuevo.\n\n"
                    f"Detalles: {error_msg[:200]}"),
                "actions": []
            }

        if "404" in error_msg or "NOT_FOUND" in error_msg.upper():
            return {
                "assistant_reply": ("**Modelo no disponible**\n\n"
                    "El modelo de IA no está disponible en tu región o cuenta. "
                    "Intenta con otra API key o espera unos minutos."),
                "actions": []
            }

        # Error genérico con detalles
        return {
            "assistant_reply": (f"**Error de Conexión**\n\n"
                f"No se pudo conectar con el servicio de IA.\n\n"
                f"**Error:** {error_msg[:300]}\n\n"
                "Intenta de nuevo en unos momentos."),
            "actions": []
        }


def _get_demo_response(context: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Genera una respuesta de demostración cuando no hay API key.
    Implementa razonamiento de pipeline: si falta algo, propone la secuencia completa.

    Args:
        context: Contexto del análisis (formato del Copilot con estados del pipeline)
        messages: Lista de mensajes

    Returns:
        Dict con 'assistant_reply' y 'actions'
    """
    # Obtener el último mensaje del usuario
    last_user_message = ""
    for msg in reversed(messages):
        if msg["role"] == "user":
            last_user_message = msg["content"].lower()
            break

    actions = []

    # =========================================================================
    # DETECTAR ESTADO DEL PIPELINE DESDE EL CONTEXTO
    # =========================================================================
    has_data = "✅ Datos Cargados" in context
    has_preprocessing = "✅ Preprocesamiento Aplicado" in context
    has_pca = "✅ PCA Realizado" in context
    has_clustering = "✅ Clustering Realizado" in context

    # =========================================================================
    # DETECTAR TIPO DE SOLICITUD: PREGUNTA INFORMATIVA vs SOLICITUD DE EJECUCION
    # =========================================================================
    # Palabras que indican PREGUNTA (solo quiere información)
    is_question = any(word in last_user_message for word in [
        "cómo", "como", "qué", "que", "cuál", "cual", "cuánto", "cuanto",
        "dime", "muestra", "explica", "describe", "resultado", "salió", "salio",
        "quedó", "quedo", "interpreta", "significa", "información", "informacion"
    ])

    # Palabras que indican EJECUCION (quiere ejecutar algo)
    wants_action = any(word in last_user_message for word in [
        "haz", "ejecuta", "corre", "realiza", "calcula", "entrena",
        "hacer", "ejecutar", "correr", "realizar", "calcular", "entrenar",
        "analiza", "analizar", "genera", "generar", "carga", "cargar"
    ])

    # Si es pregunta Y no pide ejecución explícita, responder con información
    is_informative_query = is_question and not wants_action

    # =========================================================================
    # RESPUESTA PARA PCA (CON RAZONAMIENTO DE PIPELINE)
    # =========================================================================
    if any(word in last_user_message for word in ["pca", "componente", "varianza", "loading"]):
        if has_pca:
            # Extraer información del contexto para preguntas informativas
            if is_informative_query:
                # Buscar la información de PCA en el contexto
                import re
                n_comp_match = re.search(r"Componentes: (\d+)", context)
                var_match = re.search(r"Varianza explicada: ([\d.]+)%", context)
                n_comp = n_comp_match.group(1) if n_comp_match else "N/A"
                varianza = var_match.group(1) if var_match else "N/A"

                # Buscar loadings en contexto detallado
                loadings_pc1 = re.search(r"Variables más influyentes en PC1: ([^\n]+)", context)
                loadings_pc2 = re.search(r"Variables más influyentes en PC2: ([^\n]+)", context)

                reply = f"""**Resultados del PCA Realizado**

**Configuracion:**
- Numero de componentes: {n_comp}
- Varianza explicada total: {varianza}%

**Variables mas influyentes:**
- En PC1: {loadings_pc1.group(1) if loadings_pc1 else 'Ver detalle en el contexto'}
- En PC2: {loadings_pc2.group(1) if loadings_pc2 else 'Ver detalle en el contexto'}

**Interpretacion:**
Los componentes principales capturan las principales fuentes de variabilidad en tus datos espectrales.
PC1 generalmente representa la variacion mas importante (diferencias entre tipos de muestras),
mientras que PC2 captura la segunda fuente de variacion.

Puedes ver los graficos de scores y loadings en la interfaz principal."""
                return {"assistant_reply": reply, "actions": []}

            # Si quiere ejecutar algo
            reply = ("**Analisis de PCA ya realizado**\n\n"
                    "Ya tienes un PCA calculado. Si deseas, puedo recalcularlo con otros parametros.")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "RUN_PCA_AUTO",
                    "label": "Recalcular PCA optimo",
                    "params": {"target_variance": 0.9}
                })
        elif has_preprocessing:
            reply = ("**Preprocesamiento listo, falta PCA**\n\n"
                    "Tus datos están preprocesados. Ejecutaré PCA con configuración óptima.")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "RUN_PCA_AUTO",
                    "label": "Ejecutar PCA óptimo",
                    "params": {"target_variance": 0.9}
                })
        elif has_data:
            reply = ("**Datos cargados, falta preprocesamiento**\n\n"
                    "Tienes datos pero necesitan preprocesamiento antes del PCA. "
                    "Te propongo los siguientes pasos en secuencia:")
            if wants_action:
                actions = [
                    {"id": "action-1", "type": "RUN_PREPROCESSING_AUTO",
                     "label": "1. Preprocesar datos", "params": {}},
                    {"id": "action-2", "type": "RUN_PCA_AUTO",
                     "label": "2. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}}
                ]
        else:
            reply = ("**No hay datos cargados**\n\n"
                    "Para realizar un PCA necesito cargar datos primero. "
                    "Te propongo el pipeline completo:")
            if wants_action:
                actions = [
                    {"id": "action-1", "type": "LOAD_EXAMPLE_DATA",
                     "label": "1. Cargar datos ejemplo", "params": {}},
                    {"id": "action-2", "type": "RUN_PREPROCESSING_AUTO",
                     "label": "2. Preprocesar datos", "params": {}},
                    {"id": "action-3", "type": "RUN_PCA_AUTO",
                     "label": "3. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}}
                ]
        return {"assistant_reply": reply, "actions": actions}

    # =========================================================================
    # RESPUESTA PARA CLUSTERING (CON RAZONAMIENTO DE PIPELINE)
    # =========================================================================
    if any(word in last_user_message for word in ["cluster", "agrup", "silhouette", "dendrograma"]):
        if has_clustering:
            reply = ("**Clustering ya realizado**\n\n"
                    "Ya tienes un análisis de clustering. El silhouette score indica "
                    "qué tan bien separados están los clusters (>0.5 es bueno).\n\n"
                    "¿Deseas recalcular con otros parámetros?")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "RUN_CLUSTERING_AUTO",
                    "label": "Recalcular clustering óptimo",
                    "params": {"metodo": "kmeans"}
                })
        elif has_pca:
            reply = ("**PCA listo, falta clustering**\n\n"
                    "Ya tienes PCA calculado. Ejecutaré clustering con k óptimo.")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "RUN_CLUSTERING_AUTO",
                    "label": "Ejecutar clustering óptimo",
                    "params": {"metodo": "kmeans"}
                })
        elif has_preprocessing:
            reply = ("**Preprocesamiento listo, falta PCA y clustering**\n\n"
                    "Clustering funciona mejor sobre componentes PCA. "
                    "Te propongo la secuencia completa:")
            if wants_action:
                actions = [
                    {"id": "action-1", "type": "RUN_PCA_AUTO",
                     "label": "1. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}},
                    {"id": "action-2", "type": "RUN_CLUSTERING_AUTO",
                     "label": "2. Ejecutar clustering óptimo", "params": {"metodo": "kmeans"}}
                ]
        elif has_data:
            reply = ("**Datos cargados, faltan pasos previos**\n\n"
                    "Para clustering necesito preprocesar y hacer PCA primero. "
                    "Te propongo la secuencia completa:")
            if wants_action:
                actions = [
                    {"id": "action-1", "type": "RUN_PREPROCESSING_AUTO",
                     "label": "1. Preprocesar datos", "params": {}},
                    {"id": "action-2", "type": "RUN_PCA_AUTO",
                     "label": "2. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}},
                    {"id": "action-3", "type": "RUN_CLUSTERING_AUTO",
                     "label": "3. Ejecutar clustering óptimo", "params": {"metodo": "kmeans"}}
                ]
        else:
            reply = ("**No hay datos cargados**\n\n"
                    "Para clustering necesito el pipeline completo desde carga de datos:")
            if wants_action:
                actions = [
                    {"id": "action-1", "type": "LOAD_EXAMPLE_DATA",
                     "label": "1. Cargar datos ejemplo", "params": {}},
                    {"id": "action-2", "type": "RUN_PREPROCESSING_AUTO",
                     "label": "2. Preprocesar datos", "params": {}},
                    {"id": "action-3", "type": "RUN_PCA_AUTO",
                     "label": "3. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}},
                    {"id": "action-4", "type": "RUN_CLUSTERING_AUTO",
                     "label": "4. Ejecutar clustering óptimo", "params": {"metodo": "kmeans"}}
                ]
        return {"assistant_reply": reply, "actions": actions}

    # =========================================================================
    # RESPUESTA PARA CLASIFICADOR (CON RAZONAMIENTO DE PIPELINE)
    # =========================================================================
    if any(word in last_user_message for word in ["clasificador", "predicción", "accuracy", "f1", "entrenar"]):
        target_feedstock = "feedstock" in last_user_message
        target_concentration = "concentra" in last_user_message

        if "Clasificador" in context:
            reply = ("**Clasificador ya entrenado**\n\n"
                    "Ya tienes un clasificador entrenado. Puedo entrenarlo nuevamente o con otro target.")
        elif has_pca:
            reply = ("**PCA listo, puedo entrenar clasificador**\n\n"
                    "Los datos están listos para entrenar un clasificador supervisado.")
            if wants_action:
                if target_feedstock:
                    actions.append({
                        "id": "action-1",
                        "type": "TRAIN_CLASSIFIER_FEEDSTOCK",
                        "label": "Entrenar clasificador feedstock",
                        "params": {"modelo": "random_forest"}
                    })
                elif target_concentration:
                    actions.append({
                        "id": "action-1",
                        "type": "TRAIN_CLASSIFIER_CONCENTRATION",
                        "label": "Entrenar clasificador concentración",
                        "params": {"modelo": "random_forest"}
                    })
                else:
                    actions.append({
                        "id": "action-1",
                        "type": "TRAIN_CLASSIFIER_FEEDSTOCK",
                        "label": "Entrenar clasificador feedstock",
                        "params": {"modelo": "random_forest"}
                    })
        elif has_preprocessing:
            reply = ("**Preprocesamiento listo, necesito PCA primero**\n\n"
                    "Para mejor rendimiento del clasificador, primero haré PCA.")
            if wants_action:
                classifier_type = "TRAIN_CLASSIFIER_FEEDSTOCK" if not target_concentration else "TRAIN_CLASSIFIER_CONCENTRATION"
                label = "2. Entrenar feedstock" if not target_concentration else "2. Entrenar concentración"
                actions = [
                    {"id": "action-1", "type": "RUN_PCA_AUTO",
                     "label": "1. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}},
                    {"id": "action-2", "type": classifier_type,
                     "label": label, "params": {"modelo": "random_forest"}}
                ]
        else:
            reply = ("**No hay datos preparados**\n\n"
                    "Para entrenar un clasificador necesito el pipeline completo:")
            if wants_action:
                classifier_type = "TRAIN_CLASSIFIER_FEEDSTOCK" if not target_concentration else "TRAIN_CLASSIFIER_CONCENTRATION"
                label = "4. Entrenar feedstock" if not target_concentration else "4. Entrenar concentración"
                actions = [
                    {"id": "action-1", "type": "LOAD_EXAMPLE_DATA",
                     "label": "1. Cargar datos ejemplo", "params": {}},
                    {"id": "action-2", "type": "RUN_PREPROCESSING_AUTO",
                     "label": "2. Preprocesar datos", "params": {}},
                    {"id": "action-3", "type": "RUN_PCA_AUTO",
                     "label": "3. Ejecutar PCA óptimo", "params": {"target_variance": 0.9}},
                    {"id": "action-4", "type": classifier_type,
                     "label": label, "params": {"modelo": "random_forest"}}
                ]
        return {"assistant_reply": reply, "actions": actions}

    # =========================================================================
    # RESPUESTA PARA SIMILITUD
    # =========================================================================
    if any(word in last_user_message for word in ["similitud", "similar", "vecino", "distancia"]):
        if has_pca:
            reply = ("**Análisis de Similitud**\n\n"
                    "Puedo buscar muestras similares a una referencia usando "
                    "distancia euclidiana en el espacio PCA.")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "RUN_SIMILARITY_SEARCH",
                    "label": "Buscar similares a muestra 0",
                    "params": {"sample_index": 0, "k": 5}
                })
        else:
            reply = ("**Necesito PCA para similitud**\n\n"
                    "La búsqueda de similitud funciona mejor en espacio PCA. "
                    "Te propongo preparar los datos primero.")
        return {"assistant_reply": reply, "actions": actions}

    # =========================================================================
    # RESPUESTA PARA REPORTE
    # =========================================================================
    if any(word in last_user_message for word in ["reporte", "informe", "resumen", "exportar"]):
        if has_pca or has_clustering:
            reply = ("**Generación de Reportes**\n\n"
                    "Puedo generar un reporte completo con todos los análisis realizados.")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "GENERATE_REPORT",
                    "label": "Generar reporte completo",
                    "params": {}
                })
        else:
            reply = ("**Primero necesito análisis**\n\n"
                    "Para generar un reporte útil, primero debo realizar algunos análisis. "
                    "Te propongo los pasos necesarios:")
            if wants_action:
                actions = [
                    {"id": "action-1", "type": "LOAD_EXAMPLE_DATA",
                     "label": "1. Cargar datos", "params": {}},
                    {"id": "action-2", "type": "RUN_PREPROCESSING_AUTO",
                     "label": "2. Preprocesar", "params": {}},
                    {"id": "action-3", "type": "RUN_PCA_AUTO",
                     "label": "3. Ejecutar PCA", "params": {}},
                ]
        return {"assistant_reply": reply, "actions": actions}

    # =========================================================================
    # RESPUESTA PARA SALUDO/AYUDA
    # =========================================================================
    if any(word in last_user_message for word in ["hola", "ayuda", "qué puedes", "cómo funciona"]):
        reply = ("**Hola, soy el Asistente Quimiométrico Virtual**\n\n"
                "Estoy aquí para ayudarte a realizar análisis de datos. "
                "**Modo Copilot Activo** - Puedo ejecutar pipelines completos.\n\n"
                "**Ejemplos de lo que puedo hacer:**\n"
                "- *'Haz un PCA'* → Si no hay datos, propongo cargar → preprocesar → PCA\n"
                "- *'Ejecuta clustering'* → Propongo todo lo necesario automáticamente\n"
                "- *'Entrena un clasificador'* → Pipeline completo si hace falta\n\n"
                "**Estado actual:**\n")
        if has_data:
            reply += f"- ✅ Datos cargados\n"
        else:
            reply += f"- ❌ Sin datos (puedo cargar el ejemplo)\n"
        if has_preprocessing:
            reply += f"- ✅ Preprocesamiento aplicado\n"
        if has_pca:
            reply += f"- ✅ PCA calculado\n"
        if has_clustering:
            reply += f"- ✅ Clustering realizado\n"

        reply += "\n¿En qué puedo ayudarte?"
        return {"assistant_reply": reply, "actions": []}

    # =========================================================================
    # RESPUESTA PARA CARGAR DATOS
    # =========================================================================
    if any(word in last_user_message for word in ["cargar", "datos", "ejemplo", "dataset", "archivo"]):
        if has_data:
            reply = ("**Ya hay datos cargados**\n\n"
                    "La sesión ya tiene un dataset. ¿Qué análisis deseas realizar?")
        else:
            reply = ("**Cargar Dataset de Ejemplo**\n\n"
                    "Puedo cargar el dataset de ejemplo (chemometrics_example.xls) "
                    "que contiene datos espectrales de biodiesel.")
            if wants_action:
                actions.append({
                    "id": "action-1",
                    "type": "LOAD_EXAMPLE_DATA",
                    "label": "Cargar datos de ejemplo",
                    "params": {}
                })
        return {"assistant_reply": reply, "actions": actions}

    # =========================================================================
    # RESPUESTA GENÉRICA CON OPCIONES
    # =========================================================================
    reply = ("**Asistente Quimiométrico Virtual - Modo Copilot**\n\n"
            "Estoy listo para ayudarte con análisis de datos. "
            "Puedo ejecutar pipelines completos automáticamente.\n\n")

    if not has_data:
        reply += ("No hay datos cargados. Puedes pedirme:\n"
                 "- *'Carga los datos de ejemplo'*\n"
                 "- *'Haz un PCA'* (cargaré datos automáticamente)\n"
                 "- *'Ejecuta un análisis completo'*\n")
        if wants_action:
            actions.append({
                "id": "action-1",
                "type": "LOAD_EXAMPLE_DATA",
                "label": "Cargar datos de ejemplo",
                "params": {}
            })
    else:
        reply += ("Tienes datos cargados. Puedes pedirme:\n"
                 "- *'Haz un PCA con la mejor configuración'*\n"
                 "- *'Ejecuta clustering con k óptimo'*\n"
                 "- *'Entrena un clasificador'*\n"
                 "- *'Genera un reporte'*\n")

    return {"assistant_reply": reply, "actions": actions}


def get_llm_status() -> Dict[str, Any]:
    """
    Obtiene el estado actual del servicio LLM.

    Returns:
        Dict con información del estado
    """
    api_key = get_api_key()
    can_use_real = GOOGLE_AI_AVAILABLE and api_key is not None
    current_mode = "real" if (can_use_real and not _force_demo_mode) else "demo"

    return {
        "library_available": GOOGLE_AI_AVAILABLE,
        "api_key_configured": api_key is not None,
        "mode": current_mode,
        "model": "gemini-2.0-flash" if current_mode == "real" else None,
        "can_use_real": can_use_real,  # Indica si puede cambiar a modo real
        "force_demo": _force_demo_mode  # Indica si se está forzando demo
    }
