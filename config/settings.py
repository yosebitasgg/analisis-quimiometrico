"""
Configuración global de la aplicación de análisis quimiométrico.
Contiene constantes, paletas de colores, y valores por defecto.
"""

# Valores por defecto para análisis
DEFAULT_N_COMPONENTS = 3
DEFAULT_N_CLUSTERS = 3
DEFAULT_SCALER = "estandarización"
DEFAULT_IMPUTATION = "media"
MAX_COMPONENTS = 10
MAX_CLUSTERS = 10

# Paletas de colores (friendly para daltonismo)
COLOR_PALETTES = {
    "Viridis": ["#440154", "#31688e", "#35b779", "#fde724"],
    "Tol Bright": ["#EE6677", "#228833", "#4477AA", "#CCBB44", "#66CCEE", "#AA3377", "#BBBBBB"],
    "Okabe Ito": ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"],
    "Wong": ["#000000", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"],
    "IBM": ["#648FFF", "#785EF0", "#DC267F", "#FE6100", "#FFB000"]
}

# Paleta por defecto
DEFAULT_PALETTE = "Tol Bright"

# Colores del dashboard (basados en el logo del Tec de Monterrey)
DASHBOARD_COLORS = {
    "primary": "#0066CC",      # Azul Tec de Monterrey
    "secondary": "#EC4899",    # Rosa secundario
    "success": "#10B981",      # Verde éxito
    "warning": "#F59E0B",      # Naranja advertencia
    "danger": "#EF4444",       # Rojo peligro
    "info": "#0066CC",         # Azul Tec de Monterrey
    "light": "#F3F4F6",        # Gris claro fondo
    "dark": "#1F2937",         # Gris oscuro texto
    "background": "#FFFFFF",   # Fondo blanco
    "card_bg": "#F9FAFB"       # Fondo de tarjetas
}

# Configuración de gráficas
PLOT_CONFIG = {
    "height": 600,
    "width": 800,
    "default_marker_size": 8,
    "default_opacity": 0.7,
    "font_family": "Inter, sans-serif",
    "font_size": 12,
    "title_font_size": 16
}

# Tipos de archivo permitidos
ALLOWED_FILE_TYPES = ["csv", "xlsx", "xls"]

# Nombre del archivo de ejemplo
EXAMPLE_FILE = "chemometrics_example.xls"

# Opciones de escalamiento
SCALING_OPTIONS = {
    "Estandarización (z-score)": "standard",
    "Normalización Min-Max": "minmax",
    "Sin escalamiento": "none"
}

# Opciones de imputación
IMPUTATION_OPTIONS = {
    "Media": "mean",
    "Mediana": "median",
    "Eliminar filas con NaN": "drop"
}

# Métodos de ligamiento para clustering jerárquico
LINKAGE_METHODS = {
    "Ward": "ward",
    "Completo": "complete",
    "Promedio": "average",
    "Simple": "single"
}

# Mensajes de ayuda
HELP_MESSAGES = {
    "pca": """
    **¿Qué es PCA (Análisis de Componentes Principales)?**

    PCA es una técnica que reduce la dimensionalidad de tus datos, transformando
    muchas variables correlacionadas en unas pocas variables no correlacionadas
    llamadas componentes principales. Es como encontrar los ángulos de visión
    más informativos de tus datos.

    **Varianza explicada**: Indica qué porcentaje de la información original
    captura cada componente. Si PC1 tiene 60%, captura el 60% de la variabilidad.
    """,

    "scree": """
    **Scree Plot (Gráfica de Codo)**

    Muestra la varianza explicada por cada componente. Busca el "codo" donde
    la curva se aplana: ese es típicamente un buen número de componentes a retener.
    """,

    "biplot": """
    **Biplot**

    Combina dos tipos de información:
    - **Puntos**: Tus muestras proyectadas en el espacio de componentes principales
    - **Vectores (flechas)**: Tus variables originales

    Las flechas largas indican variables que contribuyen mucho a esa dirección.
    Variables con flechas en direcciones similares están correlacionadas.
    """,

    "kmeans": """
    **K-means Clustering**

    Agrupa tus muestras en k grupos buscando minimizar la variación dentro
    de cada grupo. Es útil cuando sabes aproximadamente cuántos grupos esperas.

    **Silhouette Score**: Mide qué tan bien agrupadas están las muestras.
    Valores cercanos a 1 son excelentes, cercanos a 0 indican superposición.
    """,

    "hierarchical": """
    **Clustering Jerárquico**

    Construye un árbol (dendrograma) que muestra cómo se agrupan las muestras
    a diferentes niveles de similitud. Puedes "cortar" el árbol a diferentes
    alturas para obtener diferente número de grupos.

    **Métodos de ligamiento**:
    - Ward: minimiza varianza dentro de grupos
    - Completo: usa distancia máxima entre grupos
    - Promedio: usa distancia promedio
    - Simple: usa distancia mínima
    """
}

# Configuración de caché
CACHE_TTL = 3600  # 1 hora en segundos

# Límites de datos
MAX_ROWS_DISPLAY = 1000
MAX_COLUMNS = 100
