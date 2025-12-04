"""
Servicio para Generación de Reportes
Genera resúmenes interpretativos y exportación a PDF
"""

import numpy as np
from typing import Dict, Any, Optional, List
from io import BytesIO
from datetime import datetime

from app.services.store import store
from app.services import pca_service


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


def generar_interpretacion_pca(session) -> Optional[str]:
    """Genera interpretación textual del análisis PCA"""
    if session.pca_varianza is None:
        return None

    varianza = session.pca_varianza * 100
    n_componentes = len(varianza)
    var_acumulada = np.cumsum(varianza)

    # Encontrar cuántos PCs explican el 80% de varianza
    pcs_80 = np.searchsorted(var_acumulada, 80) + 1

    interpretacion = []

    # Varianza explicada
    interpretacion.append(
        f"Se calcularon {n_componentes} componentes principales. "
        f"El PC1 explica {varianza[0]:.1f}% de la varianza total"
    )
    if n_componentes > 1:
        interpretacion.append(f" y el PC2 añade {varianza[1]:.1f}% adicional")
    interpretacion.append(".")

    # Componentes necesarios para 80%
    if pcs_80 <= n_componentes:
        interpretacion.append(
            f" Con {pcs_80} componentes se captura el {var_acumulada[pcs_80-1]:.1f}% de la varianza, "
            f"lo cual es suficiente para representar la estructura principal de los datos."
        )

    # Análisis de loadings
    if session.pca_loadings is not None and len(session.columnas_seleccionadas) > 0:
        loadings = session.pca_loadings
        variables = session.columnas_seleccionadas

        # Top variables en PC1
        pc1_loadings = np.abs(loadings[:, 0])
        top3_pc1 = np.argsort(pc1_loadings)[-3:][::-1]
        vars_pc1 = [variables[i] for i in top3_pc1]

        interpretacion.append(
            f"\n\nLas variables más influyentes en PC1 son: {', '.join(vars_pc1)}. "
            f"Estas variables son las que mejor discriminan entre las muestras."
        )

        if n_componentes > 1:
            pc2_loadings = np.abs(loadings[:, 1])
            top3_pc2 = np.argsort(pc2_loadings)[-3:][::-1]
            vars_pc2 = [variables[i] for i in top3_pc2]
            interpretacion.append(
                f" Para PC2, las más importantes son: {', '.join(vars_pc2)}."
            )

    return "".join(interpretacion)


def generar_interpretacion_clustering(session) -> Optional[str]:
    """Genera interpretación textual del análisis de clustering"""
    if session.cluster_labels is None:
        return None

    labels = session.cluster_labels
    n_clusters = len(np.unique(labels))

    # Contar muestras por cluster
    unique, counts = np.unique(labels, return_counts=True)

    interpretacion = []
    interpretacion.append(
        f"Se identificaron {n_clusters} grupos (clusters) en los datos usando el método "
        f"{session.cluster_metodo or 'K-means'}. "
    )

    # Distribución de clusters
    for i, (cluster_id, count) in enumerate(zip(unique, counts)):
        pct = (count / len(labels)) * 100
        interpretacion.append(f"El grupo {cluster_id + 1} contiene {count} muestras ({pct:.1f}%). ")

    # Análisis con feedstock si está disponible
    if session.feedstock is not None:
        interpretacion.append("\n\nRelación con feedstock: ")
        for cluster_id in unique:
            mask = labels == cluster_id
            feedstocks_en_cluster = session.feedstock[mask]
            unique_fs, counts_fs = np.unique(feedstocks_en_cluster, return_counts=True)
            fs_principal = unique_fs[np.argmax(counts_fs)]
            fs_nombre = FEEDSTOCK_LABELS.get(int(fs_principal), f"Tipo {fs_principal}")
            pct = (np.max(counts_fs) / np.sum(counts_fs)) * 100
            interpretacion.append(
                f"Grupo {cluster_id + 1} está dominado por {fs_nombre} ({pct:.0f}%). "
            )

    return "".join(interpretacion)


def generar_interpretacion_diagnosticos(session_id: str) -> Optional[str]:
    """Genera interpretación textual de los diagnósticos PCA"""
    try:
        diagnosticos = pca_service.calcular_diagnosticos_pca(session_id)
    except Exception:
        return None

    n_muestras = diagnosticos["n_muestras"]
    n_outliers_t2 = diagnosticos["estadisticas"]["n_outliers_t2"]
    n_outliers_q = diagnosticos["estadisticas"]["n_outliers_q"]
    n_outliers_comb = diagnosticos["estadisticas"]["n_outliers_combinados"]

    pct_t2 = (n_outliers_t2 / n_muestras) * 100
    pct_q = (n_outliers_q / n_muestras) * 100
    pct_comb = (n_outliers_comb / n_muestras) * 100

    interpretacion = []
    interpretacion.append(
        f"El análisis de diagnósticos identificó {n_outliers_t2} muestras ({pct_t2:.1f}%) "
        f"con valores anómalos de T² (Hotelling) y {n_outliers_q} muestras ({pct_q:.1f}%) "
        f"con altos residuales Q."
    )

    if n_outliers_comb > 0:
        interpretacion.append(
            f" De estas, {n_outliers_comb} muestras ({pct_comb:.1f}%) exceden ambos límites "
            f"simultáneamente, lo que indica posibles muestras problemáticas o especiales "
            f"que merecen revisión manual."
        )
    else:
        interpretacion.append(
            " No se encontraron muestras que excedan ambos límites simultáneamente, "
            "lo cual sugiere buena calidad general del modelo PCA."
        )

    return "".join(interpretacion)


def generar_interpretacion_clasificador(session) -> Optional[str]:
    """Genera interpretación textual de los clasificadores"""
    interpretaciones = []

    if session.classifier_feedstock is not None:
        clf = session.classifier_feedstock
        interpretaciones.append(
            f"Clasificador de Feedstock ({clf.modelo_tipo}): "
            f"Accuracy = {clf.accuracy*100:.1f}%, F1-Score = {clf.f1_score*100:.1f}%. "
        )
        if clf.accuracy > 0.9:
            interpretaciones.append(
                "El modelo tiene excelente capacidad para identificar la materia prima. "
            )
        elif clf.accuracy > 0.7:
            interpretaciones.append(
                "El modelo tiene buena capacidad predictiva, aunque hay cierta confusión entre clases. "
            )
        else:
            interpretaciones.append(
                "El modelo tiene capacidad predictiva limitada. Considere más datos o features. "
            )

    if session.classifier_concentration is not None:
        clf = session.classifier_concentration
        interpretaciones.append(
            f"\n\nClasificador de Concentración ({clf.modelo_tipo}): "
            f"Accuracy = {clf.accuracy*100:.1f}%, F1-Score = {clf.f1_score*100:.1f}%. "
        )
        if clf.accuracy > 0.9:
            interpretaciones.append(
                "El modelo predice muy bien los niveles de biodiesel."
            )
        elif clf.accuracy > 0.7:
            interpretaciones.append(
                "El modelo distingue razonablemente bien las concentraciones."
            )
        else:
            interpretaciones.append(
                "Predecir la concentración exacta es difícil con estos datos."
            )

    return "".join(interpretaciones) if interpretaciones else None


def generar_resumen(session_id: str) -> Dict[str, Any]:
    """
    Genera un resumen completo del análisis para el reporte.

    Returns:
        Diccionario con toda la información del reporte
    """
    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    # Información del dataset
    info_dataset = {
        "n_muestras": len(session.df_original) if session.df_original is not None else 0,
        "n_variables_numericas": len(session.columnas_numericas),
        "n_variables_categoricas": len(session.columnas_categoricas),
        "variables_seleccionadas": session.columnas_seleccionadas,
        "tiene_feedstock": session.feedstock is not None,
        "tiene_concentration": session.concentration is not None
    }

    # Resumen de PCA
    pca_resumen = None
    if session.pca_varianza is not None:
        varianza = session.pca_varianza * 100
        var_acumulada = np.cumsum(varianza)

        # Componentes importantes (varianza > 5%)
        componentes_imp = []
        for i, var in enumerate(varianza):
            if var >= 5:
                componentes_imp.append({
                    "nombre": f"PC{i+1}",
                    "varianza": float(var),
                    "acumulada": float(var_acumulada[i])
                })

        # Top loadings
        top_loadings_pc1 = []
        top_loadings_pc2 = []
        if session.pca_loadings is not None and len(session.columnas_seleccionadas) > 0:
            loadings = session.pca_loadings
            variables = session.columnas_seleccionadas

            # PC1
            sorted_idx = np.argsort(np.abs(loadings[:, 0]))[::-1][:3]
            for idx in sorted_idx:
                top_loadings_pc1.append({
                    "variable": variables[idx],
                    "loading": float(loadings[idx, 0])
                })

            # PC2 si existe
            if loadings.shape[1] > 1:
                sorted_idx = np.argsort(np.abs(loadings[:, 1]))[::-1][:3]
                for idx in sorted_idx:
                    top_loadings_pc2.append({
                        "variable": variables[idx],
                        "loading": float(loadings[idx, 1])
                    })

        pca_resumen = {
            "n_componentes": len(varianza),
            "varianza_total": float(var_acumulada[-1]) if len(var_acumulada) > 0 else 0,
            "componentes_importantes": componentes_imp,
            "top_loadings_pc1": top_loadings_pc1,
            "top_loadings_pc2": top_loadings_pc2
        }

    # Resumen de clustering
    clustering_resumen = None
    if session.cluster_labels is not None:
        labels = session.cluster_labels
        unique, counts = np.unique(labels, return_counts=True)

        estadisticas = []
        for cluster_id, count in zip(unique, counts):
            estadisticas.append({
                "cluster_id": int(cluster_id),
                "tamano": int(count),
                "porcentaje": float(count / len(labels) * 100)
            })

        clustering_resumen = {
            "metodo": session.cluster_metodo or "kmeans",
            "n_clusters": int(len(unique)),
            "silhouette_score": None,  # Se podría calcular si se desea
            "estadisticas": estadisticas
        }

    # Resumen de clasificadores
    classifier_resumen = []
    if session.classifier_feedstock is not None:
        clf = session.classifier_feedstock
        classifier_resumen.append({
            "target": "feedstock",
            "modelo": clf.modelo_tipo,
            "accuracy": float(clf.accuracy),
            "f1_score": float(clf.f1_score),
            "mejores_variables": clf.feature_names[:3] if clf.feature_names else []
        })

    if session.classifier_concentration is not None:
        clf = session.classifier_concentration
        classifier_resumen.append({
            "target": "concentration",
            "modelo": clf.modelo_tipo,
            "accuracy": float(clf.accuracy),
            "f1_score": float(clf.f1_score),
            "mejores_variables": clf.feature_names[:3] if clf.feature_names else []
        })

    # Resumen de diagnósticos PCA
    diagnosticos_resumen = None
    if session.pca_scores is not None:
        try:
            diagnosticos = pca_service.calcular_diagnosticos_pca(session_id)
            n_muestras = diagnosticos["n_muestras"]
            diagnosticos_resumen = {
                "n_outliers_t2": diagnosticos["estadisticas"]["n_outliers_t2"],
                "n_outliers_q": diagnosticos["estadisticas"]["n_outliers_q"],
                "n_outliers_combinados": diagnosticos["estadisticas"]["n_outliers_combinados"],
                "t2_limit_95": diagnosticos["t2_limit_95"],
                "q_limit_95": diagnosticos["q_limit_95"],
                "t2_media": diagnosticos["estadisticas"]["t2_media"],
                "q_media": diagnosticos["estadisticas"]["q_media"],
                "porcentaje_outliers": (diagnosticos["estadisticas"]["n_outliers_combinados"] / n_muestras) * 100
            }
        except Exception:
            pass

    # Resumen de auto-optimización
    optimizacion_resumen = None
    if session.X_procesado is not None:
        try:
            optimizacion = pca_service.calcular_optimizacion_pcs(session_id)
            optimizacion_resumen = {
                "componentes_recomendados": optimizacion["componentes_recomendados"],
                "varianza_recomendada": optimizacion["varianza_recomendada"],
                "motivo_recomendacion": optimizacion["motivo_recomendacion"],
                "k_por_varianza": optimizacion["criterios"]["k_por_varianza"],
                "k_por_codo": optimizacion["criterios"]["k_por_codo"],
                "k_por_significancia": optimizacion["criterios"]["k_por_significancia"]
            }
        except Exception:
            pass

    # Resumen de visualización
    visualizacion_resumen = None
    if session.pca_scores is not None:
        n_componentes = session.pca_scores.shape[1]
        tiene_3d = n_componentes >= 3
        varianza_3d = None
        if tiene_3d and session.pca_varianza is not None:
            varianza_3d = float(sum(session.pca_varianza[:3]) * 100)

        metodos_disponibles = ["PCA"]
        try:
            import umap
            metodos_disponibles.append("UMAP")
        except ImportError:
            pass
        metodos_disponibles.append("t-SNE")

        visualizacion_resumen = {
            "tiene_3d": tiene_3d,
            "varianza_3d": varianza_3d,
            "metodos_disponibles": metodos_disponibles
        }

    # Interpretaciones
    interpretacion_general = (
        f"Este análisis quimiométrico procesó {info_dataset['n_muestras']} muestras "
        f"con {len(session.columnas_seleccionadas)} variables químicas (perfiles de FAMEs). "
    )

    if pca_resumen:
        interpretacion_general += (
            f"El análisis de componentes principales (PCA) redujo la dimensionalidad "
            f"a {pca_resumen['n_componentes']} componentes, capturando "
            f"{pca_resumen['varianza_total']:.1f}% de la varianza total. "
        )

    if clustering_resumen:
        interpretacion_general += (
            f"El clustering identificó {clustering_resumen['n_clusters']} grupos naturales en los datos. "
        )

    if classifier_resumen:
        interpretacion_general += (
            f"Se entrenaron {len(classifier_resumen)} clasificadores supervisados para predicción. "
        )

    if diagnosticos_resumen:
        interpretacion_general += (
            f"Los diagnósticos identificaron {diagnosticos_resumen['n_outliers_combinados']} "
            f"posibles outliers ({diagnosticos_resumen['porcentaje_outliers']:.1f}%). "
        )

    if optimizacion_resumen:
        interpretacion_general += (
            f"El análisis recomienda usar {optimizacion_resumen['componentes_recomendados']} "
            f"componentes principales ({optimizacion_resumen['varianza_recomendada']:.1f}% varianza). "
        )

    return {
        "info_dataset": info_dataset,
        "pca_resumen": pca_resumen,
        "diagnosticos_resumen": diagnosticos_resumen,
        "optimizacion_resumen": optimizacion_resumen,
        "visualizacion_resumen": visualizacion_resumen,
        "clustering_resumen": clustering_resumen,
        "classifier_resumen": classifier_resumen if classifier_resumen else None,
        "interpretacion_general": interpretacion_general,
        "interpretacion_pca": generar_interpretacion_pca(session),
        "interpretacion_diagnosticos": generar_interpretacion_diagnosticos(session_id),
        "interpretacion_clustering": generar_interpretacion_clustering(session),
        "interpretacion_clasificador": generar_interpretacion_clasificador(session)
    }


def _preparar_texto_pdf(texto: str) -> str:
    """Prepara texto para ReportLab: escapa caracteres y convierte saltos de línea"""
    if texto is None:
        return ""
    # Convertir saltos de línea a tags HTML para ReportLab
    texto = str(texto).replace("\n\n", "<br/><br/>").replace("\n", "<br/>")
    # Escapar ampersands que no sean parte de entidades HTML
    texto = texto.replace("&", "&amp;")
    return texto


def generar_pdf(session_id: str) -> bytes:
    """
    Genera un PDF con el reporte completo.

    Returns:
        Bytes del archivo PDF
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.platypus import PageBreak
    except ImportError:
        raise ImportError(
            "ReportLab no está instalado. Ejecuta: pip install reportlab"
        )

    session = store.obtener_sesion(session_id)
    if not session:
        raise ValueError("Sesión no encontrada")

    resumen = generar_resumen(session_id)

    # Crear PDF en memoria
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    # Estilos
    styles = getSampleStyleSheet()
    titulo_style = ParagraphStyle(
        'Titulo',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        alignment=1  # Centrado
    )
    subtitulo_style = ParagraphStyle(
        'Subtitulo',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=10
    )
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        leading=14
    )

    # Contenido del documento
    elementos = []

    # Título
    elementos.append(Paragraph("Reporte de Análisis Quimiométrico", titulo_style))
    elementos.append(Paragraph(
        f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        ParagraphStyle('Fecha', parent=styles['Normal'], fontSize=10, alignment=1)
    ))
    elementos.append(Spacer(1, 20))

    # Información del dataset
    elementos.append(Paragraph("1. Información del Dataset", subtitulo_style))
    info = resumen["info_dataset"]
    tabla_info = [
        ["Número de muestras", str(info["n_muestras"])],
        ["Variables numéricas", str(info["n_variables_numericas"])],
        ["Variables categóricas", str(info["n_variables_categoricas"])],
        ["Variables analizadas", str(len(info["variables_seleccionadas"]))],
    ]
    t = Table(tabla_info, colWidths=[8*cm, 6*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elementos.append(t)
    elementos.append(Spacer(1, 10))

    # PCA
    if resumen["pca_resumen"]:
        elementos.append(Paragraph("2. Análisis de Componentes Principales (PCA)", subtitulo_style))
        pca = resumen["pca_resumen"]
        elementos.append(Paragraph(
            f"Se calcularon {pca['n_componentes']} componentes principales, "
            f"capturando {pca['varianza_total']:.1f}% de la varianza total.",
            normal_style
        ))

        if pca["componentes_importantes"]:
            tabla_pca = [["Componente", "Varianza (%)", "Acumulada (%)"]]
            for comp in pca["componentes_importantes"]:
                tabla_pca.append([
                    comp["nombre"],
                    f"{comp['varianza']:.1f}",
                    f"{comp['acumulada']:.1f}"
                ])
            t = Table(tabla_pca, colWidths=[5*cm, 4*cm, 4*cm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0658a6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            elementos.append(t)

        if resumen.get("interpretacion_pca"):
            elementos.append(Spacer(1, 10))
            elementos.append(Paragraph(_preparar_texto_pdf(resumen["interpretacion_pca"]), normal_style))

    # Diagnósticos PCA
    section_num = 3
    if resumen.get("diagnosticos_resumen"):
        elementos.append(Paragraph(f"{section_num}. Diagnósticos PCA (Hotelling T² y Q-residuales)", subtitulo_style))
        diag = resumen["diagnosticos_resumen"]

        tabla_diag = [
            ["Métrica", "Media", "Límite 95%", "Outliers"],
            ["Hotelling T²", f"{diag['t2_media']:.2f}", f"{diag['t2_limit_95']:.2f}", str(diag['n_outliers_t2'])],
            ["Q-residuales", f"{diag['q_media']:.4f}", f"{diag['q_limit_95']:.4f}", str(diag['n_outliers_q'])],
        ]
        t = Table(tabla_diag, colWidths=[4*cm, 3*cm, 3*cm, 3*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elementos.append(t)

        elementos.append(Spacer(1, 5))
        elementos.append(Paragraph(
            f"Outliers combinados (T² y Q): {diag['n_outliers_combinados']} muestras ({diag['porcentaje_outliers']:.1f}%)",
            normal_style
        ))

        if resumen.get("interpretacion_diagnosticos"):
            elementos.append(Spacer(1, 5))
            elementos.append(Paragraph(_preparar_texto_pdf(resumen["interpretacion_diagnosticos"]), normal_style))

        section_num += 1

    # Auto-Optimización
    if resumen.get("optimizacion_resumen"):
        elementos.append(Paragraph(f"{section_num}. Auto-Optimización de Componentes", subtitulo_style))
        opt = resumen["optimizacion_resumen"]

        elementos.append(Paragraph(
            f"Recomendación: <b>{opt['componentes_recomendados']} componentes principales</b> "
            f"({opt['varianza_recomendada']:.1f}% varianza explicada)",
            normal_style
        ))
        elementos.append(Paragraph(f"Motivo: {opt['motivo_recomendacion']}", normal_style))

        tabla_opt = [
            ["Criterio", "k Recomendado"],
            ["Por varianza (90%)", str(opt['k_por_varianza'])],
            ["Método del codo", str(opt['k_por_codo'])],
            ["Por significancia", str(opt['k_por_significancia'])],
        ]
        t = Table(tabla_opt, colWidths=[7*cm, 4*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elementos.append(t)
        section_num += 1

    # Visualización Avanzada
    if resumen.get("visualizacion_resumen"):
        elementos.append(Paragraph(f"{section_num}. Visualización Avanzada", subtitulo_style))
        vis = resumen["visualizacion_resumen"]

        vis_texto = f"Métodos de reducción disponibles: {', '.join(vis['metodos_disponibles'])}. "
        if vis['tiene_3d']:
            vis_texto += f"Visualización 3D disponible con {vis['varianza_3d']:.1f}% de varianza explicada (PC1+PC2+PC3)."
        else:
            vis_texto += "Visualización 3D no disponible (se requieren al menos 3 componentes)."

        elementos.append(Paragraph(vis_texto, normal_style))
        section_num += 1

    # Clustering
    if resumen["clustering_resumen"]:
        elementos.append(Paragraph(f"{section_num}. Análisis de Clustering", subtitulo_style))
        clust = resumen["clustering_resumen"]
        section_num += 1
        elementos.append(Paragraph(
            f"Método: {clust['metodo'].upper()} | Clusters: {clust['n_clusters']}",
            normal_style
        ))

        if clust["estadisticas"]:
            tabla_clust = [["Grupo", "Muestras", "Porcentaje"]]
            for est in clust["estadisticas"]:
                tabla_clust.append([
                    f"Grupo {est['cluster_id'] + 1}",
                    str(est["tamano"]),
                    f"{est['porcentaje']:.1f}%"
                ])
            t = Table(tabla_clust, colWidths=[5*cm, 4*cm, 4*cm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0658a6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            elementos.append(t)

        if resumen.get("interpretacion_clustering"):
            elementos.append(Spacer(1, 10))
            elementos.append(Paragraph(_preparar_texto_pdf(resumen["interpretacion_clustering"]), normal_style))

    # Clasificadores
    if resumen["classifier_resumen"]:
        elementos.append(Paragraph(f"{section_num}. Clasificadores Supervisados", subtitulo_style))
        section_num += 1

        tabla_clf = [["Target", "Modelo", "Accuracy", "F1-Score"]]
        for clf in resumen["classifier_resumen"]:
            tabla_clf.append([
                clf["target"].capitalize(),
                clf["modelo"],
                f"{clf['accuracy']*100:.1f}%",
                f"{clf['f1_score']*100:.1f}%"
            ])
        t = Table(tabla_clf, colWidths=[4*cm, 4*cm, 3*cm, 3*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0658a6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elementos.append(t)

        if resumen.get("interpretacion_clasificador"):
            elementos.append(Spacer(1, 10))
            elementos.append(Paragraph(_preparar_texto_pdf(resumen["interpretacion_clasificador"]), normal_style))

    # Conclusiones
    elementos.append(Paragraph(f"{section_num}. Resumen e Interpretacion General", subtitulo_style))
    elementos.append(Paragraph(_preparar_texto_pdf(resumen["interpretacion_general"]), normal_style))

    # Pie de página
    elementos.append(Spacer(1, 30))
    elementos.append(Paragraph(
        "Reporte generado por Chemometrics Helper - Tec de Monterrey",
        ParagraphStyle('Pie', parent=styles['Normal'], fontSize=9, textColor=colors.grey, alignment=1)
    ))

    # Construir PDF
    doc.build(elementos)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
