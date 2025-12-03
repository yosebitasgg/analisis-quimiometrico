"""
Servicio para Clasificación Supervisada
Permite entrenar y usar modelos para predecir feedstock y concentration
"""

import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
)
from sklearn.preprocessing import StandardScaler

from app.services.store import store, ClassifierData


# Mapeos de etiquetas
FEEDSTOCK_LABELS = {
    1: "Diesel",
    2: "Animal Tallow (Texas)",
    3: "Animal Tallow (IRE)",
    4: "Canola",
    5: "Waste Grease",
    6: "Soybean",
    7: "Desconocido"
}

CONCENTRATION_LABELS = {
    1: "Diesel",
    2: "B2",
    3: "B5",
    4: "B10",
    5: "B20",
    6: "B100",
    7: "Desconocida"
}


def obtener_labels_map(target: str) -> Dict[int, str]:
    """Obtiene el mapeo de etiquetas según el target"""
    if target == "feedstock":
        return FEEDSTOCK_LABELS
    elif target == "concentration":
        return CONCENTRATION_LABELS
    else:
        raise ValueError(f"Target no válido: {target}")


def obtener_datos_para_clasificacion(
    session_id: str,
    target: str,
    usar_pca: bool = True
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Obtiene los datos X e y para clasificación.

    Returns:
        Tuple de (X, y, feature_names)
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener X
    if usar_pca:
        if session.pca_scores is None:
            raise ValueError("No hay resultados de PCA. Ejecuta PCA primero.")
        X = session.pca_scores
        feature_names = session.pca_componentes_nombres
    else:
        if session.X_procesado is None:
            raise ValueError("No hay datos preprocesados.")
        X = session.X_procesado
        feature_names = session.columnas_seleccionadas

    # Obtener y
    if target == "feedstock":
        if session.feedstock is None:
            raise ValueError("No hay variable feedstock en los datos.")
        y = session.feedstock
    elif target == "concentration":
        if session.concentration is None:
            raise ValueError("No hay variable concentration en los datos.")
        y = session.concentration
    else:
        raise ValueError(f"Target no válido: {target}. Usa 'feedstock' o 'concentration'.")

    return X, y, feature_names


def crear_modelo(
    tipo: str,
    n_estimators: int = 100,
    max_depth: Optional[int] = None,
    c_param: float = 1.0
) -> Any:
    """Crea un modelo según el tipo especificado"""
    if tipo == "random_forest":
        return RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            n_jobs=-1
        )
    elif tipo == "logistic_regression":
        return LogisticRegression(
            C=c_param,
            max_iter=1000,
            random_state=42,
            multi_class='multinomial'
        )
    elif tipo == "svm":
        return SVC(
            C=c_param,
            kernel='rbf',
            probability=True,
            random_state=42
        )
    else:
        raise ValueError(f"Tipo de modelo no soportado: {tipo}")


def obtener_feature_importances(modelo: Any, tipo: str, feature_names: List[str]) -> List[Dict[str, Any]]:
    """Extrae la importancia de características del modelo"""
    importances = []

    if tipo == "random_forest":
        imp = modelo.feature_importances_
    elif tipo == "logistic_regression":
        # Usar la media absoluta de coeficientes para multiclase
        imp = np.mean(np.abs(modelo.coef_), axis=0)
    elif tipo == "svm":
        # SVM con kernel RBF no tiene importancias directas, usamos permutation importance simplificado
        # Por simplicidad, retornamos valores uniformes
        imp = np.ones(len(feature_names)) / len(feature_names)
    else:
        imp = np.ones(len(feature_names)) / len(feature_names)

    # Normalizar
    if np.sum(imp) > 0:
        imp = imp / np.sum(imp)

    for i, name in enumerate(feature_names):
        importances.append({
            "variable": name,
            "importancia": float(imp[i])
        })

    # Ordenar por importancia descendente
    importances.sort(key=lambda x: x["importancia"], reverse=True)

    return importances


def entrenar_clasificador(
    session_id: str,
    target: str,
    modelo_tipo: str = "random_forest",
    usar_pca: bool = True,
    n_estimators: int = 100,
    max_depth: Optional[int] = None,
    c_param: float = 1.0,
    test_size: float = 0.2
) -> Dict[str, Any]:
    """
    Entrena un clasificador supervisado.

    Args:
        session_id: ID de la sesión
        target: 'feedstock' o 'concentration'
        modelo_tipo: 'random_forest', 'logistic_regression', 'svm'
        usar_pca: Si usar scores de PCA o datos originales
        n_estimators: Número de árboles para Random Forest
        max_depth: Profundidad máxima para Random Forest
        c_param: Parámetro C para Logistic Regression y SVM
        test_size: Proporción del conjunto de prueba

    Returns:
        Diccionario con métricas y resultados
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener datos
    X, y, feature_names = obtener_datos_para_clasificacion(session_id, target, usar_pca)

    # Filtrar clases con muy pocas muestras
    unique, counts = np.unique(y, return_counts=True)
    min_samples = 2
    valid_classes = unique[counts >= min_samples]
    mask = np.isin(y, valid_classes)
    X_filtered = X[mask]
    y_filtered = y[mask]

    if len(np.unique(y_filtered)) < 2:
        raise ValueError("No hay suficientes clases con muestras para entrenar.")

    # Dividir datos
    X_train, X_test, y_train, y_test = train_test_split(
        X_filtered, y_filtered,
        test_size=test_size,
        random_state=42,
        stratify=y_filtered
    )

    # Crear y entrenar modelo
    modelo = crear_modelo(modelo_tipo, n_estimators, max_depth, c_param)
    modelo.fit(X_train, y_train)

    # Predecir
    y_pred = modelo.predict(X_test)

    # Calcular métricas
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='macro', zero_division=0)
    precision = precision_score(y_test, y_pred, average='macro', zero_division=0)
    recall = recall_score(y_test, y_pred, average='macro', zero_division=0)
    conf_matrix = confusion_matrix(y_test, y_pred)

    # Obtener importancias
    feature_importances = obtener_feature_importances(modelo, modelo_tipo, feature_names)

    # Obtener etiquetas de clases
    labels_map = obtener_labels_map(target)
    class_labels = [labels_map.get(int(c), f"Clase {c}") for c in modelo.classes_]

    # Guardar en sesión
    classifier_data = ClassifierData(
        modelo=modelo,
        accuracy=accuracy,
        f1_score=f1,
        precision=precision,
        recall=recall,
        confusion_matrix=conf_matrix,
        feature_importances=np.array([fi["importancia"] for fi in feature_importances]),
        class_labels=class_labels,
        feature_names=feature_names,
        modelo_tipo=modelo_tipo,
        usar_pca=usar_pca
    )

    if target == "feedstock":
        session.classifier_feedstock = classifier_data
    else:
        session.classifier_concentration = classifier_data

    return {
        "target": target,
        "modelo": modelo_tipo,
        "accuracy": float(accuracy),
        "f1_score": float(f1),
        "precision": float(precision),
        "recall": float(recall),
        "confusion_matrix": conf_matrix.tolist(),
        "class_labels": class_labels,
        "feature_importances": feature_importances,
        "n_train": len(X_train),
        "n_test": len(X_test)
    }


def predecir(
    session_id: str,
    target: str,
    sample_indices: Optional[List[int]] = None,
    sample_values: Optional[List[Dict[str, float]]] = None
) -> List[Dict[str, Any]]:
    """
    Realiza predicciones con un clasificador entrenado.

    Args:
        session_id: ID de la sesión
        target: 'feedstock' o 'concentration'
        sample_indices: Índices de muestras existentes a predecir
        sample_values: Valores nuevos para predecir

    Returns:
        Lista de predicciones
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Obtener clasificador
    if target == "feedstock":
        classifier = session.classifier_feedstock
    else:
        classifier = session.classifier_concentration

    if classifier is None or classifier.modelo is None:
        raise ValueError(f"No hay clasificador entrenado para {target}. Entrena primero.")

    labels_map = obtener_labels_map(target)
    modelo = classifier.modelo
    usar_pca = classifier.usar_pca

    # Preparar datos para predicción
    if sample_indices is not None:
        # Usar muestras existentes
        if usar_pca:
            if session.pca_scores is None:
                raise ValueError("No hay scores de PCA disponibles.")
            X_pred = session.pca_scores[sample_indices]
        else:
            if session.X_procesado is None:
                raise ValueError("No hay datos preprocesados.")
            X_pred = session.X_procesado[sample_indices]
        indices = sample_indices
    elif sample_values is not None:
        # Usar valores proporcionados
        feature_names = classifier.feature_names
        X_pred = np.array([[sv.get(fn, 0) for fn in feature_names] for sv in sample_values])
        indices = list(range(len(sample_values)))
    else:
        raise ValueError("Debes proporcionar sample_indices o sample_values")

    # Predecir
    y_pred = modelo.predict(X_pred)

    # Obtener probabilidades si es posible
    try:
        y_proba = modelo.predict_proba(X_pred)
        has_proba = True
    except AttributeError:
        has_proba = False

    # Construir resultados
    resultados = []
    for i, idx in enumerate(indices):
        clase_codigo = int(y_pred[i])
        clase_nombre = labels_map.get(clase_codigo, f"Clase {clase_codigo}")

        probs = None
        if has_proba:
            probs = {}
            for j, c in enumerate(modelo.classes_):
                probs[labels_map.get(int(c), f"Clase {c}")] = float(y_proba[i, j])

        # Generar interpretación
        prob_max = max(probs.values()) if probs else 0.5
        if prob_max > 0.8:
            confianza = "alta"
        elif prob_max > 0.5:
            confianza = "moderada"
        else:
            confianza = "baja"

        if target == "feedstock":
            interpretacion = f"La muestra {idx} probablemente proviene de {clase_nombre} (confianza {confianza}, p={prob_max:.2f})"
        else:
            interpretacion = f"La muestra {idx} tiene concentración estimada de {clase_nombre} (confianza {confianza}, p={prob_max:.2f})"

        resultados.append({
            "indice": idx,
            "clase_predicha": clase_nombre,
            "clase_predicha_codigo": clase_codigo,
            "probabilidades": probs,
            "interpretacion": interpretacion
        })

    return resultados
