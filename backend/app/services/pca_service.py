"""
Servicio para Análisis de Componentes Principales (PCA)
Incluye diagnósticos avanzados: Hotelling T², Q-residuals, contribuciones y auto-optimización
"""

import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from sklearn.decomposition import PCA
from scipy import stats

from app.services.store import store


def calcular_pca(session_id: str, n_componentes: Optional[int] = None) -> Dict[str, Any]:
    """
    Realiza análisis PCA sobre los datos preprocesados.

    Args:
        session_id: ID de la sesión
        n_componentes: Número de componentes a calcular (None = todos)

    Returns:
        Diccionario con resultados del PCA
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.X_procesado is None:
        raise ValueError("No hay datos preprocesados. Por favor, aplica preprocesamiento primero.")

    X = session.X_procesado

    # Determinar número de componentes
    max_componentes = min(X.shape[0], X.shape[1])
    if n_componentes is None or n_componentes > max_componentes:
        n_componentes = max_componentes

    # Realizar PCA
    pca = PCA(n_components=n_componentes)
    scores = pca.fit_transform(X)
    loadings = pca.components_.T  # Transponer para tener variables x componentes

    # Varianza explicada
    varianza_explicada = pca.explained_variance_ratio_
    varianza_acumulada = np.cumsum(varianza_explicada)

    # Nombres de componentes
    componentes_nombres = [f"PC{i+1}" for i in range(n_componentes)]

    # Guardar en sesión
    session.pca_scores = scores
    session.pca_loadings = loadings
    session.pca_varianza = varianza_explicada
    session.pca_componentes_nombres = componentes_nombres

    # Preparar respuesta
    varianza_info = []
    for i in range(n_componentes):
        varianza_info.append({
            "componente": componentes_nombres[i],
            "varianza_explicada": float(varianza_explicada[i] * 100),
            "varianza_acumulada": float(varianza_acumulada[i] * 100)
        })

    # Scores como lista de diccionarios
    scores_list = []
    for i in range(scores.shape[0]):
        score_dict = {}
        for j, nombre in enumerate(componentes_nombres):
            score_dict[nombre] = float(scores[i, j])
        scores_list.append(score_dict)

    # Loadings como lista de diccionarios (una entrada por variable)
    loadings_list = []
    variables = session.columnas_seleccionadas
    for i, var in enumerate(variables):
        loading_dict = {"variable": var}
        for j, nombre in enumerate(componentes_nombres):
            loading_dict[nombre] = float(loadings[i, j])
        loadings_list.append(loading_dict)

    return {
        "n_componentes": n_componentes,
        "varianza_explicada": varianza_info,
        "scores": scores_list,
        "loadings": loadings_list,
        "nombres_muestras": list(range(len(scores))),
        "nombres_variables": variables,
        "feedstock": session.feedstock.tolist() if session.feedstock is not None else None,
        "concentration": session.concentration.tolist() if session.concentration is not None else None
    }


def obtener_scores_para_cluster(session_id: str, usar_pca: bool = True) -> np.ndarray:
    """
    Obtiene los datos para clustering (scores de PCA o datos originales).

    Args:
        session_id: ID de la sesión
        usar_pca: Si True, usa scores de PCA; si False, usa datos preprocesados

    Returns:
        Array numpy con los datos
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if usar_pca:
        if session.pca_scores is None:
            raise ValueError("No hay resultados de PCA. Por favor, ejecuta PCA primero.")
        return session.pca_scores
    else:
        if session.X_procesado is None:
            raise ValueError("No hay datos preprocesados.")
        return session.X_procesado


# =============================================================================
# DIAGNÓSTICOS PCA: Hotelling T² y Q-residuals (SPE)
# =============================================================================

def calcular_diagnosticos_pca(session_id: str) -> Dict[str, Any]:
    """
    Calcula diagnósticos multivariados para PCA:
    - Hotelling T² para cada muestra
    - Q-residuals (SPE - Squared Prediction Error) para cada muestra
    - Umbrales estadísticos (95% y 99%)

    Args:
        session_id: ID de la sesión con PCA calculado

    Returns:
        Diccionario con T², Q, umbrales y estadísticas
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.pca_scores is None or session.pca_loadings is None:
        raise ValueError("No hay resultados de PCA. Por favor, ejecuta PCA primero.")

    if session.X_procesado is None:
        raise ValueError("No hay datos preprocesados.")

    X = session.X_procesado  # Datos originales (n_samples x n_features)
    T = session.pca_scores   # Scores (n_samples x n_components)
    P = session.pca_loadings  # Loadings (n_features x n_components)
    varianzas = session.pca_varianza  # Varianza explicada por componente

    n_samples, n_components = T.shape
    n_features = X.shape[1]

    # =========================================================================
    # Calcular Hotelling T²
    # T²_i = sum_a (t_ia² / lambda_a)
    # donde t_ia es el score de la muestra i en el componente a
    # y lambda_a es la varianza explicada del componente a
    # =========================================================================

    # Calcular varianzas de los scores (usar varianza de cada PC)
    score_variances = np.var(T, axis=0, ddof=1)
    # Evitar división por cero
    score_variances = np.where(score_variances > 1e-10, score_variances, 1e-10)

    # Hotelling T² para cada muestra
    T2 = np.sum((T ** 2) / score_variances, axis=1)

    # Umbral T² usando distribución F
    # T² ~ (n*p*(n-1)) / (n*(n-p)) * F(p, n-p, alpha)
    alpha_95 = 0.05
    alpha_99 = 0.01

    f_95 = stats.f.ppf(1 - alpha_95, n_components, n_samples - n_components)
    f_99 = stats.f.ppf(1 - alpha_99, n_components, n_samples - n_components)

    factor = (n_components * (n_samples - 1) * (n_samples + 1)) / (n_samples * (n_samples - n_components))
    T2_limit_95 = factor * f_95
    T2_limit_99 = factor * f_99

    # =========================================================================
    # Calcular Q-residuals (SPE)
    # Q_i = ||x_i - x̂_i||² = ||e_i||²
    # donde x̂_i = T_i @ P.T es la reconstrucción
    # =========================================================================

    # Reconstrucción de X usando los componentes principales
    X_reconstructed = T @ P.T

    # Residuos
    E = X - X_reconstructed

    # Q-residual para cada muestra
    Q = np.sum(E ** 2, axis=1)

    # Umbral Q usando aproximación de Box (chi-cuadrado)
    # Basado en los eigenvalues no retenidos
    theta1 = np.sum(Q) / n_samples  # Varianza residual promedio
    theta2 = np.sum(Q ** 2) / n_samples
    theta3 = np.sum(Q ** 3) / n_samples

    if theta2 > 1e-10:
        h0 = 1 - (2 * theta1 * theta3) / (3 * theta2 ** 2)
        h0 = max(h0, 0.001)  # Evitar valores negativos

        c_alpha_95 = stats.norm.ppf(1 - alpha_95)
        c_alpha_99 = stats.norm.ppf(1 - alpha_99)

        Q_limit_95 = theta1 * ((c_alpha_95 * np.sqrt(2 * theta2 * h0 ** 2) / theta1 +
                                1 + theta2 * h0 * (h0 - 1) / theta1 ** 2) ** (1 / h0))
        Q_limit_99 = theta1 * ((c_alpha_99 * np.sqrt(2 * theta2 * h0 ** 2) / theta1 +
                                1 + theta2 * h0 * (h0 - 1) / theta1 ** 2) ** (1 / h0))
    else:
        # Fallback: usar percentiles empíricos
        Q_limit_95 = np.percentile(Q, 95)
        Q_limit_99 = np.percentile(Q, 99)

    # =========================================================================
    # Identificar outliers
    # =========================================================================
    outliers_T2_95 = np.where(T2 > T2_limit_95)[0].tolist()
    outliers_T2_99 = np.where(T2 > T2_limit_99)[0].tolist()
    outliers_Q_95 = np.where(Q > Q_limit_95)[0].tolist()
    outliers_Q_99 = np.where(Q > Q_limit_99)[0].tolist()

    # Outliers combinados (exceden ambos límites al 95%)
    outliers_combinados = list(set(outliers_T2_95) & set(outliers_Q_95))

    # =========================================================================
    # Preparar respuesta
    # =========================================================================
    return {
        "t2_values": T2.tolist(),
        "q_values": Q.tolist(),
        "t2_limit_95": float(T2_limit_95),
        "t2_limit_99": float(T2_limit_99),
        "q_limit_95": float(Q_limit_95),
        "q_limit_99": float(Q_limit_99),
        "outliers_t2_95": outliers_T2_95,
        "outliers_t2_99": outliers_T2_99,
        "outliers_q_95": outliers_Q_95,
        "outliers_q_99": outliers_Q_99,
        "outliers_combinados": outliers_combinados,
        "estadisticas": {
            "t2_media": float(np.mean(T2)),
            "t2_mediana": float(np.median(T2)),
            "t2_max": float(np.max(T2)),
            "t2_min": float(np.min(T2)),
            "q_media": float(np.mean(Q)),
            "q_mediana": float(np.median(Q)),
            "q_max": float(np.max(Q)),
            "q_min": float(np.min(Q)),
            "n_outliers_t2": len(outliers_T2_95),
            "n_outliers_q": len(outliers_Q_95),
            "n_outliers_combinados": len(outliers_combinados)
        },
        "n_muestras": n_samples,
        "n_componentes": n_components,
        "nombres_muestras": list(range(n_samples)),
        "feedstock": session.feedstock.tolist() if session.feedstock is not None else None,
        "concentration": session.concentration.tolist() if session.concentration is not None else None
    }


def calcular_contribuciones_muestra(
    session_id: str,
    sample_index: int,
    tipo_metrica: str = "T2"
) -> Dict[str, Any]:
    """
    Calcula las contribuciones de cada variable a T² o Q para una muestra específica.
    Útil para identificar qué variables causan que una muestra sea outlier.

    Args:
        session_id: ID de la sesión
        sample_index: Índice de la muestra a analizar
        tipo_metrica: "T2" o "Q"

    Returns:
        Diccionario con contribuciones por variable ordenadas
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.pca_scores is None or session.pca_loadings is None:
        raise ValueError("No hay resultados de PCA.")

    if session.X_procesado is None:
        raise ValueError("No hay datos preprocesados.")

    X = session.X_procesado
    T = session.pca_scores
    P = session.pca_loadings
    variables = session.columnas_seleccionadas

    n_samples = X.shape[0]

    if sample_index < 0 or sample_index >= n_samples:
        raise ValueError(f"Índice de muestra inválido. Debe estar entre 0 y {n_samples - 1}")

    tipo_metrica = tipo_metrica.upper()

    if tipo_metrica == "Q":
        # =====================================================================
        # Contribución al Q-residual
        # La contribución de cada variable es simplemente E[i,j]²
        # =====================================================================
        X_reconstructed = T @ P.T
        E = X - X_reconstructed

        # Contribuciones para la muestra seleccionada
        contribuciones = E[sample_index, :] ** 2

    elif tipo_metrica == "T2":
        # =====================================================================
        # Contribución al T²
        # Usamos la descomposición: T²_i = sum_a (t_ia² / var_a)
        # La contribución de variable j se calcula proyectando hacia atrás
        # =====================================================================
        score_variances = np.var(T, axis=0, ddof=1)
        score_variances = np.where(score_variances > 1e-10, score_variances, 1e-10)

        # Scores normalizados de la muestra
        t_normalized = T[sample_index, :] / np.sqrt(score_variances)

        # Contribución de cada variable usando loadings
        # contrib_j = sum_a (t_ia * p_ja / sqrt(var_a))²
        contribuciones = np.zeros(len(variables))
        for j in range(len(variables)):
            contrib = np.sum(t_normalized * P[j, :])
            contribuciones[j] = contrib ** 2

    else:
        raise ValueError("tipo_metrica debe ser 'T2' o 'Q'")

    # Normalizar contribuciones como porcentaje del total
    total = np.sum(contribuciones)
    if total > 1e-10:
        contribuciones_pct = (contribuciones / total) * 100
    else:
        contribuciones_pct = contribuciones

    # Ordenar de mayor a menor
    indices_ordenados = np.argsort(contribuciones)[::-1]

    contribuciones_ordenadas = []
    for idx in indices_ordenados:
        contribuciones_ordenadas.append({
            "variable": variables[idx],
            "contribucion_valor": float(contribuciones[idx]),
            "contribucion_porcentaje": float(contribuciones_pct[idx])
        })

    # Información de la muestra
    info_muestra = {
        "indice": sample_index,
        "feedstock": int(session.feedstock[sample_index]) if session.feedstock is not None else None,
        "concentration": int(session.concentration[sample_index]) if session.concentration is not None else None
    }

    return {
        "muestra": info_muestra,
        "tipo_metrica": tipo_metrica,
        "contribuciones": contribuciones_ordenadas,
        "top_5_variables": [c["variable"] for c in contribuciones_ordenadas[:5]],
        "interpretacion": _generar_interpretacion_contribuciones(
            contribuciones_ordenadas[:5], tipo_metrica
        )
    }


def _generar_interpretacion_contribuciones(top_contribuciones: List[Dict], tipo_metrica: str) -> str:
    """Genera texto interpretativo para las contribuciones."""
    if not top_contribuciones:
        return "No se pudieron calcular las contribuciones."

    vars_texto = ", ".join([c["variable"] for c in top_contribuciones[:3]])
    pct_texto = ", ".join([f"{c['contribucion_porcentaje']:.1f}%" for c in top_contribuciones[:3]])

    if tipo_metrica == "T2":
        return (f"Las variables que más contribuyen a la posición anómala de esta muestra "
                f"en el espacio de componentes principales son: {vars_texto} "
                f"(contribuyendo {pct_texto} respectivamente al T²).")
    else:
        return (f"Las variables con mayor error de reconstrucción para esta muestra son: "
                f"{vars_texto} (contribuyendo {pct_texto} respectivamente al residual Q).")


# =============================================================================
# AUTO-OPTIMIZACIÓN DEL NÚMERO DE COMPONENTES PRINCIPALES
# =============================================================================

def calcular_optimizacion_pcs(
    session_id: str,
    k_max: Optional[int] = None,
    umbral_varianza: float = 0.90
) -> Dict[str, Any]:
    """
    Analiza diferentes números de componentes principales para recomendar
    el número óptimo basado en:
    - Varianza explicada acumulada
    - Error de reconstrucción
    - Método del codo

    Args:
        session_id: ID de la sesión
        k_max: Máximo número de componentes a evaluar (None = automático)
        umbral_varianza: Umbral de varianza explicada para recomendar (default 0.90)

    Returns:
        Diccionario con análisis y recomendación
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.X_procesado is None:
        raise ValueError("No hay datos preprocesados.")

    X = session.X_procesado
    n_samples, n_features = X.shape

    # Determinar k_max
    if k_max is None:
        k_max = min(n_samples - 1, n_features, 15)  # Máximo razonable
    else:
        k_max = min(k_max, n_samples - 1, n_features)

    # =========================================================================
    # Calcular PCA con todos los componentes posibles
    # =========================================================================
    pca_full = PCA(n_components=k_max)
    pca_full.fit(X)

    varianza_individual = pca_full.explained_variance_ratio_
    varianza_acumulada = np.cumsum(varianza_individual)

    # =========================================================================
    # Calcular error de reconstrucción para cada k
    # =========================================================================
    errores_reconstruccion = []

    for k in range(1, k_max + 1):
        # Reconstruir usando k componentes
        scores_k = pca_full.transform(X)[:, :k]
        loadings_k = pca_full.components_[:k, :]
        X_reconstructed = scores_k @ loadings_k

        # Error cuadrático medio
        error = np.mean((X - X_reconstructed) ** 2)
        errores_reconstruccion.append(error)

    errores_reconstruccion = np.array(errores_reconstruccion)

    # Normalizar errores para visualización (0-100%)
    error_max = errores_reconstruccion[0] if errores_reconstruccion[0] > 0 else 1
    errores_normalizados = (errores_reconstruccion / error_max) * 100

    # =========================================================================
    # Determinar número óptimo de componentes
    # =========================================================================

    # Criterio 1: Primer k que alcanza el umbral de varianza
    k_por_varianza = None
    for k in range(k_max):
        if varianza_acumulada[k] >= umbral_varianza:
            k_por_varianza = k + 1
            break
    if k_por_varianza is None:
        k_por_varianza = k_max

    # Criterio 2: Método del codo en error de reconstrucción
    k_por_codo = _encontrar_codo(errores_reconstruccion)

    # Criterio 3: Varianza individual > 5% (cada componente debe ser significativo)
    k_por_significancia = 1
    for k in range(k_max):
        if varianza_individual[k] >= 0.05:
            k_por_significancia = k + 1
        else:
            break

    # =========================================================================
    # Decisión final: combinar criterios
    # =========================================================================
    # Priorizar varianza acumulada, pero considerar codo y significancia
    k_recomendado = min(k_por_varianza, max(k_por_codo, k_por_significancia))
    k_recomendado = max(2, k_recomendado)  # Mínimo 2 componentes

    varianza_recomendada = float(varianza_acumulada[k_recomendado - 1] * 100)

    # Generar motivo de recomendación
    if k_recomendado == k_por_varianza:
        motivo = f"Alcanza {varianza_recomendada:.1f}% de varianza explicada (umbral: {umbral_varianza*100:.0f}%)"
    elif k_recomendado == k_por_codo:
        motivo = f"Punto de codo en la curva de error de reconstrucción ({varianza_recomendada:.1f}% varianza)"
    else:
        motivo = f"Componentes significativos (varianza individual > 5%) con {varianza_recomendada:.1f}% total"

    # =========================================================================
    # Preparar datos para gráficos
    # =========================================================================
    resultados_por_k = []
    for k in range(1, k_max + 1):
        resultados_por_k.append({
            "k": k,
            "varianza_individual": float(varianza_individual[k - 1] * 100),
            "varianza_acumulada": float(varianza_acumulada[k - 1] * 100),
            "error_reconstruccion": float(errores_reconstruccion[k - 1]),
            "error_normalizado": float(errores_normalizados[k - 1])
        })

    return {
        "resultados": resultados_por_k,
        "k_max_evaluado": k_max,
        "componentes_recomendados": k_recomendado,
        "varianza_recomendada": varianza_recomendada,
        "motivo_recomendacion": motivo,
        "criterios": {
            "k_por_varianza": k_por_varianza,
            "k_por_codo": k_por_codo,
            "k_por_significancia": k_por_significancia,
            "umbral_varianza_usado": umbral_varianza
        },
        "interpretacion": _generar_interpretacion_optimizacion(
            k_recomendado, varianza_recomendada, k_max, resultados_por_k
        )
    }


def _encontrar_codo(valores: np.ndarray) -> int:
    """
    Encuentra el punto de codo usando el método de la distancia máxima
    desde la línea que conecta el primer y último punto.
    """
    n = len(valores)
    if n < 3:
        return 1

    # Normalizar para cálculo
    x = np.arange(n)
    y = valores

    # Línea desde el primer al último punto
    p1 = np.array([0, y[0]])
    p2 = np.array([n - 1, y[-1]])

    # Calcular distancia de cada punto a la línea
    distancias = []
    for i in range(n):
        p = np.array([i, y[i]])
        # Distancia punto a línea
        d = np.abs(np.cross(p2 - p1, p1 - p)) / np.linalg.norm(p2 - p1)
        distancias.append(d)

    # El codo es el punto con máxima distancia
    codo = np.argmax(distancias) + 1  # +1 porque k empieza en 1
    return max(1, codo)


def _generar_interpretacion_optimizacion(
    k_rec: int,
    var_rec: float,
    k_max: int,
    resultados: List[Dict]
) -> str:
    """Genera texto interpretativo para la optimización."""
    # Encontrar cuántos PCs para 80% y 95%
    k_80 = next((r["k"] for r in resultados if r["varianza_acumulada"] >= 80), k_max)
    k_95 = next((r["k"] for r in resultados if r["varianza_acumulada"] >= 95), k_max)

    texto = f"Se recomienda usar {k_rec} componentes principales, explicando {var_rec:.1f}% de la varianza total. "

    if k_rec <= 3:
        texto += "Este es un número bajo de componentes, lo que indica que los datos tienen una estructura relativamente simple. "
    elif k_rec <= 5:
        texto += "Este es un número moderado de componentes, balanceando reducción de dimensionalidad con retención de información. "
    else:
        texto += "Se requieren varios componentes, lo que sugiere que los datos tienen una estructura compleja con múltiples fuentes de variación. "

    texto += f"Para referencia: {k_80} componentes capturan ~80% y {k_95} componentes capturan ~95% de la varianza."

    return texto


# =============================================================================
# PROYECCIONES DIMENSIONALES (2D/3D) Y MAPA QUÍMICO
# =============================================================================

def obtener_proyeccion_3d(session_id: str) -> Dict[str, Any]:
    """
    Obtiene los scores de PCA para visualización 3D (PC1, PC2, PC3).

    Args:
        session_id: ID de la sesión con PCA calculado

    Returns:
        Diccionario con coordenadas 3D y metadatos
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.pca_scores is None:
        raise ValueError("No hay resultados de PCA.")

    T = session.pca_scores
    n_components = T.shape[1]

    if n_components < 3:
        raise ValueError(f"Se necesitan al menos 3 componentes para visualización 3D. "
                        f"Actualmente hay {n_components}.")

    # Calcular T² y Q para tamaño de puntos
    try:
        diagnosticos = calcular_diagnosticos_pca(session_id)
        t2_values = diagnosticos["t2_values"]
        q_values = diagnosticos["q_values"]
    except Exception:
        t2_values = None
        q_values = None

    # Preparar datos para scatter 3D
    puntos = []
    for i in range(T.shape[0]):
        punto = {
            "id": i,
            "PC1": float(T[i, 0]),
            "PC2": float(T[i, 1]),
            "PC3": float(T[i, 2]),
            "feedstock": int(session.feedstock[i]) if session.feedstock is not None else None,
            "concentration": int(session.concentration[i]) if session.concentration is not None else None,
            "cluster": int(session.cluster_labels[i]) if session.cluster_labels is not None else None,
            "T2": float(t2_values[i]) if t2_values else None,
            "Q": float(q_values[i]) if q_values else None
        }
        puntos.append(punto)

    # Loadings para biplot 3D (opcional)
    loadings_3d = None
    if session.pca_loadings is not None:
        loadings_3d = []
        for i, var in enumerate(session.columnas_seleccionadas):
            loadings_3d.append({
                "variable": var,
                "PC1": float(session.pca_loadings[i, 0]),
                "PC2": float(session.pca_loadings[i, 1]),
                "PC3": float(session.pca_loadings[i, 2])
            })

    # Varianza explicada
    varianza = None
    if session.pca_varianza is not None:
        varianza = {
            "PC1": float(session.pca_varianza[0] * 100),
            "PC2": float(session.pca_varianza[1] * 100),
            "PC3": float(session.pca_varianza[2] * 100),
            "total_3d": float(sum(session.pca_varianza[:3]) * 100)
        }

    return {
        "puntos": puntos,
        "loadings": loadings_3d,
        "varianza": varianza,
        "n_muestras": len(puntos),
        "tiene_clusters": session.cluster_labels is not None,
        "tiene_diagnosticos": t2_values is not None
    }


def obtener_mapa_quimico(
    session_id: str,
    metodo: str = "pca",
    n_neighbors: int = 15,
    min_dist: float = 0.1
) -> Dict[str, Any]:
    """
    Genera un "mapa químico" 2D combinando reducción dimensional con clustering.
    Soporta PCA, UMAP y t-SNE.

    Args:
        session_id: ID de la sesión
        metodo: "pca", "umap" o "tsne"
        n_neighbors: Número de vecinos para UMAP (ignorado para otros)
        min_dist: Distancia mínima para UMAP

    Returns:
        Diccionario con coordenadas 2D y metadatos
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    if session.X_procesado is None:
        raise ValueError("No hay datos preprocesados.")

    X = session.X_procesado
    n_samples = X.shape[0]

    metodo = metodo.lower()

    if metodo == "pca":
        # Usar scores de PCA existentes o calcular
        if session.pca_scores is not None and session.pca_scores.shape[1] >= 2:
            coords = session.pca_scores[:, :2]
            varianza_info = {
                "dim1": float(session.pca_varianza[0] * 100) if session.pca_varianza is not None else None,
                "dim2": float(session.pca_varianza[1] * 100) if session.pca_varianza is not None else None
            }
        else:
            pca = PCA(n_components=2)
            coords = pca.fit_transform(X)
            varianza_info = {
                "dim1": float(pca.explained_variance_ratio_[0] * 100),
                "dim2": float(pca.explained_variance_ratio_[1] * 100)
            }
        metodo_usado = "PCA"

    elif metodo == "umap":
        try:
            import umap
            reducer = umap.UMAP(
                n_neighbors=min(n_neighbors, n_samples - 1),
                min_dist=min_dist,
                n_components=2,
                random_state=42
            )
            coords = reducer.fit_transform(X)
            varianza_info = None  # UMAP no tiene varianza explicada
            metodo_usado = "UMAP"
        except ImportError:
            # Fallback a PCA si UMAP no está instalado
            pca = PCA(n_components=2)
            coords = pca.fit_transform(X)
            varianza_info = {
                "dim1": float(pca.explained_variance_ratio_[0] * 100),
                "dim2": float(pca.explained_variance_ratio_[1] * 100)
            }
            metodo_usado = "PCA (UMAP no disponible)"

    elif metodo == "tsne":
        from sklearn.manifold import TSNE
        perplexity = min(30, n_samples - 1)
        tsne = TSNE(
            n_components=2,
            perplexity=perplexity,
            random_state=42,
            n_iter=1000
        )
        coords = tsne.fit_transform(X)
        varianza_info = None  # t-SNE no tiene varianza explicada
        metodo_usado = "t-SNE"

    else:
        raise ValueError(f"Método '{metodo}' no soportado. Use 'pca', 'umap' o 'tsne'.")

    # Obtener diagnósticos si están disponibles
    try:
        diagnosticos = calcular_diagnosticos_pca(session_id)
        t2_values = diagnosticos["t2_values"]
        q_values = diagnosticos["q_values"]
        outliers = diagnosticos["outliers_combinados"]
    except Exception:
        t2_values = None
        q_values = None
        outliers = []

    # Preparar puntos
    puntos = []
    for i in range(n_samples):
        punto = {
            "id": i,
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "feedstock": int(session.feedstock[i]) if session.feedstock is not None else None,
            "concentration": int(session.concentration[i]) if session.concentration is not None else None,
            "cluster": int(session.cluster_labels[i]) if session.cluster_labels is not None else None,
            "T2": float(t2_values[i]) if t2_values else None,
            "Q": float(q_values[i]) if q_values else None,
            "es_outlier": i in outliers
        }
        puntos.append(punto)

    return {
        "metodo": metodo_usado,
        "puntos": puntos,
        "varianza": varianza_info,
        "n_muestras": n_samples,
        "tiene_clusters": session.cluster_labels is not None,
        "tiene_diagnosticos": t2_values is not None,
        "outliers": outliers,
        "ejes": {
            "x": "Dim1" if metodo != "pca" else "PC1",
            "y": "Dim2" if metodo != "pca" else "PC2"
        }
    }
