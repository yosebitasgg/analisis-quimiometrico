# Análisis Quimiométrico con PCA y Clustering

Herramienta interactiva de análisis multivariado diseñada específicamente para aplicaciones de quimiometría. Permite realizar Análisis de Componentes Principales (PCA) y clustering (K-means y jerárquico) sobre datos de laboratorio de manera intuitiva, sin necesidad de conocimientos previos de programación.

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-1.28%2B-red)
![License](https://img.shields.io/badge/License-MIT-green)

## Tabla de Contenidos

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Funcionalidades Detalladas](#funcionalidades-detalladas)
- [Ejemplos](#ejemplos)
- [Testing](#testing)
- [Despliegue en Streamlit Cloud](#despliegue-en-streamlit-cloud)
- [Contribuciones](#contribuciones)
- [Licencia](#licencia)

## Características

### Análisis Multivariado Completo

- **PCA (Análisis de Componentes Principales)**
  - Reducción de dimensionalidad
  - Visualizaciones interactivas 2D y 3D
  - Scree plots y biplots
  - Tabla de varianza explicada
  - Análisis de loadings

- **Clustering**
  - K-means con evaluación de silhouette
  - Clustering jerárquico con dendrogramas interactivos
  - Elbow plots para selección óptima de k
  - Visualización de clusters en espacio PCA

### Interfaz Amigable

- Dashboard moderno y visualmente atractivo
- Navegación intuitiva por páginas
- Visualizaciones interactivas con Plotly
- Ayuda contextual en español
- Tarjetas informativas de resumen

### Preprocesamiento Flexible

- Carga de archivos CSV y Excel
- Manejo de valores faltantes (imputación o eliminación)
- Estandarización y normalización
- Detección de outliers
- Matriz de correlación

### Exportación de Resultados

- Descarga de resultados en CSV
- Exportación de gráficas
- Tablas de varianza y loadings
- Resumen completo del análisis

## Requisitos

- Python 3.8 o superior
- Dependencias listadas en `requirements.txt`

## Instalación

### Instalación Local

1. **Clonar o descargar el repositorio**

```bash
git clone <url-del-repositorio>
cd Quimiometria
```

2. **Crear un entorno virtual (recomendado)**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. **Instalar dependencias**

```bash
pip install -r requirements.txt
```

## Uso

### Ejecución Local

```bash
streamlit run streamlit_app.py
```

La aplicación se abrirá automáticamente en tu navegador en `http://localhost:8501`.

### Flujo de Trabajo Básico

1. **Home**: Revisa el estado del análisis y descripción de la herramienta

2. **Cargar Datos**:
   - Sube tu archivo CSV o Excel
   - O carga el archivo de ejemplo si existe

3. **Preprocesamiento**:
   - Selecciona variables numéricas para análisis
   - Selecciona variables categóricas para etiquetado
   - Configura manejo de valores faltantes
   - Elige método de escalamiento

4. **PCA**:
   - Define número de componentes principales
   - Visualiza scores plots y biplots
   - Analiza varianza explicada
   - Revisa loadings de variables

5. **Clustering**:
   - Ejecuta K-means o clustering jerárquico
   - Evalúa con silhouette score
   - Visualiza dendrogramas
   - Explora clusters en espacio PCA

6. **Resultados**:
   - Descarga resultados completos
   - Exporta gráficas
   - Revisa resumen del análisis

## Estructura del Proyecto

```
quimiometria/
├── streamlit_app.py          # Aplicación principal
├── core/                      # Módulos principales
│   ├── __init__.py
│   ├── data_io.py            # Carga y validación de datos
│   ├── preprocessing.py       # Preprocesamiento
│   ├── pca_analysis.py       # Análisis PCA
│   ├── clustering.py         # Algoritmos de clustering
│   └── plots.py              # Visualizaciones Plotly
├── ui/                       # Componentes de interfaz
│   ├── __init__.py
│   └── layout.py             # Elementos de UI
├── config/                   # Configuración
│   ├── __init__.py
│   └── settings.py           # Constantes y configuración
├── assets/                   # Recursos estáticos
│   └── styles.css            # Estilos CSS personalizados
├── docs/                     # Documentación
│   └── USO_HERRAMIENTA.md   # Guía de usuario
├── tests/                    # Pruebas unitarias
│   ├── __init__.py
│   ├── test_data_io.py
│   ├── test_preprocessing.py
│   ├── test_pca.py
│   └── test_clustering.py
├── requirements.txt          # Dependencias
├── README.md                 # Este archivo
└── .gitignore               # Archivos a ignorar en Git
```

## Funcionalidades Detalladas

### Carga de Datos

- Soporta formatos CSV y Excel (.xlsx, .xls)
- Validación automática de datos
- Detección de tipos de columnas (numéricas vs categóricas)
- Resumen estadístico automático
- Identificación de valores faltantes

### Preprocesamiento

- **Imputación**: Media, mediana o eliminación de NaN
- **Escalamiento**: Estandarización (z-score) o normalización min-max
- **Diagnóstico**: Boxplots, histogramas, matriz de correlación
- Selección flexible de variables

### PCA

- Cálculo automático de componentes principales
- **Visualizaciones**:
  - Scree plot (varianza explicada)
  - Scores plot 2D (PC1 vs PC2)
  - Scores plot 3D (PC1 vs PC2 vs PC3)
  - Biplot (scores + loadings)
- Tabla de varianza explicada y acumulada
- Análisis de loadings por componente
- Identificación de variables más influyentes

### Clustering

- **K-means**:
  - Selección de número de clusters
  - Silhouette score para evaluación
  - Elbow plot
  - Centroides de clusters

- **Jerárquico**:
  - Múltiples métodos de ligamiento (Ward, Complete, Average, Single)
  - Dendrograma interactivo
  - Corte ajustable para formar clusters

- Visualización de clusters en espacio PCA
- Resumen estadístico por cluster

### Personalización

- Paletas de colores (friendly para daltonismo)
- Tamaño y opacidad de puntos ajustables
- Coloreo por variables categóricas
- Número de vectores en biplot configurable

## Ejemplos

### Ejemplo 1: Análisis de Biodiesel (FAME)

Si tienes datos de picos FAME de diferentes muestras de biodiesel:

1. Carga tu archivo con columnas de áreas de picos
2. Selecciona todas las columnas de picos como variables numéricas
3. Selecciona variables como "feedstock" o "concentration" como categóricas
4. Ejecuta PCA y colorea por tipo de materia prima
5. Usa clustering para identificar grupos naturales

### Ejemplo 2: Datos Espectroscópicos

Para datos de espectroscopía:

1. Las longitudes de onda son tus variables numéricas
2. Identifica outliers con el scree plot
3. Usa el biplot para ver qué longitudes de onda discriminan mejor
4. Clustering jerárquico para explorar similitudes

## Testing

Ejecutar las pruebas unitarias:

```bash
# Ejecutar todas las pruebas
pytest

# Con cobertura
pytest --cov=core --cov=ui

# Ejecutar un archivo específico
pytest tests/test_pca.py
```

## Despliegue en Streamlit Cloud

### Pasos para Deployment

1. **Sube tu proyecto a GitHub**

2. **Ve a [Streamlit Cloud](https://streamlit.io/cloud)**

3. **Crea una nueva app**:
   - Selecciona tu repositorio
   - Branch: `main`
   - Main file: `streamlit_app.py`

4. **Configura variables de entorno** (si es necesario)

5. **Deploy**

La aplicación estará disponible en una URL pública como:
`https://tu-usuario-quimiometria.streamlit.app`

### Configuración Adicional

Crea un archivo `.streamlit/config.toml` (opcional):

```toml
[theme]
primaryColor = "#6366F1"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F9FAFB"
textColor = "#1F2937"
font = "sans serif"

[server]
maxUploadSize = 200
```

## Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto y Soporte

Para preguntas, sugerencias o reportar bugs:

- Abre un issue en GitHub
- Contacta al equipo de desarrollo

## Agradecimientos

Esta herramienta fue desarrollada para facilitar el análisis quimiométrico a estudiantes y docentes de química, eliminando barreras técnicas y permitiendo enfocarse en la interpretación científica.

**Tecnologías utilizadas**:
- [Streamlit](https://streamlit.io/) - Framework web
- [Scikit-learn](https://scikit-learn.org/) - Machine Learning
- [Plotly](https://plotly.com/) - Visualizaciones interactivas
- [Pandas](https://pandas.pydata.org/) - Manipulación de datos
- [NumPy](https://numpy.org/) - Cálculo numérico

---

**Disfruta analizando tus datos químicos!**
