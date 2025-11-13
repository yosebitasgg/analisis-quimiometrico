# Instrucciones de Inicio Rápido

## Proyecto Completado

Tu proyecto de análisis quimiométrico está completamente construido y listo para usar.

## Contenido del Proyecto

### Estructura Completa

```
Quimiometria/
├── streamlit_app.py              # APLICACIÓN PRINCIPAL
├── requirements.txt              # Dependencias
├── README.md                     # Documentación del proyecto
├── .gitignore                    # Configuración Git
│
├── core/                         # Módulos principales de análisis
│   ├── data_io.py               # Carga y validación de datos
│   ├── preprocessing.py         # Preprocesamiento
│   ├── pca_analysis.py          # Análisis PCA
│   ├── clustering.py            # K-means y jerárquico
│   └── plots.py                 # Visualizaciones Plotly
│
├── ui/                          # Componentes de interfaz
│   └── layout.py                # Elementos UI personalizados
│
├── config/                      # Configuración
│   └── settings.py              # Constantes y configuración
│
├── assets/                      # Recursos estáticos
│   └── styles.css               # Estilos CSS personalizados
│
├── docs/                        # Documentación
│   └── USO_HERRAMIENTA.md      # Guía completa de usuario
│
└── tests/                       # Pruebas unitarias
    ├── test_data_io.py
    ├── test_preprocessing.py
    ├── test_pca.py
    └── test_clustering.py
```

## Instalación y Ejecución

### Paso 1: Instalar Dependencias

Abre una terminal/PowerShell en la carpeta del proyecto y ejecuta:

```bash
pip install -r requirements.txt
```

Esto instalará:
- streamlit (framework web)
- pandas, numpy (procesamiento de datos)
- scikit-learn, scipy (machine learning)
- plotly (visualizaciones interactivas)
- openpyxl (lectura de Excel)

### Paso 2: Ejecutar la Aplicación

```bash
streamlit run streamlit_app.py
```

La aplicación se abrirá automáticamente en tu navegador en `http://localhost:8501`

### Paso 3: Cargar tus Datos

Tienes dos opciones:

**Opción A: Usar archivo de ejemplo**
- Si existe `chemometrics_example.xls` en la raíz del proyecto
- La aplicación lo detectará y ofrecerá cargarlo automáticamente

**Opción B: Subir tu archivo**
- Navega a "Cargar Datos"
- Sube tu archivo CSV o Excel
- Formatos soportados: .csv, .xlsx, .xls

## Flujo de Trabajo

1. **Home**: Revisa el estado del análisis
2. **Cargar Datos**: Sube tu archivo o usa el ejemplo
3. **Preprocesamiento**: Configura variables y escalamiento
4. **PCA**: Visualiza componentes principales
5. **Clustering**: Encuentra grupos con K-means o jerárquico
6. **Resultados**: Descarga resultados y gráficas
7. **Ayuda**: Consulta interpretación y guía

## Documentación

### Para Usuarios

Lee la **Guía Completa de Usuario** en:
```
docs/USO_HERRAMIENTA.md
```

Incluye:
- Paso a paso detallado
- Interpretación de resultados
- Casos de uso reales
- Solución de problemas

### Para Desarrolladores

Lee el **README** en la raíz del proyecto para:
- Arquitectura del sistema
- API de módulos
- Testing
- Contribuciones

## Ejecutar Pruebas (Opcional)

Para verificar que todo funciona correctamente:

```bash
pytest
```

Para ver cobertura de código:

```bash
pytest --cov=core --cov=ui
```

## Desplegar en Streamlit Cloud

### Prerrequisitos

1. Cuenta en GitHub
2. Cuenta en [Streamlit Cloud](https://streamlit.io/cloud)

### Pasos

1. **Sube tu proyecto a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Chemometrics app"
   git remote add origin <tu-repo-url>
   git push -u origin main
   ```

2. **Ve a Streamlit Cloud**:
   - Inicia sesión
   - "New app"
   - Selecciona tu repositorio
   - Main file: `streamlit_app.py`
   - Deploy!

3. **Tu app estará disponible** en:
   ```
   https://tu-usuario-quimiometria.streamlit.app
   ```

## Personalización

### Cambiar Colores del Dashboard

Edita `config/settings.py`:

```python
DASHBOARD_COLORS = {
    "primary": "#6366F1",      # Color principal
    "secondary": "#EC4899",    # Color secundario
    # ... etc
}
```

### Añadir Nuevas Paletas de Colores

Edita `config/settings.py`:

```python
COLOR_PALETTES = {
    "Tu Paleta": ["#color1", "#color2", "#color3"],
    # ... etc
}
```

### Modificar Mensajes de Ayuda

Edita `config/settings.py`, sección `HELP_MESSAGES`.

## Solución de Problemas Comunes

### Error: "ModuleNotFoundError"

**Causa**: Dependencias no instaladas

**Solución**:
```bash
pip install -r requirements.txt
```

### Error al cargar archivo

**Causa**: Formato no soportado o archivo corrupto

**Solución**:
1. Verifica que sea .csv, .xlsx o .xls
2. Abre en Excel y guarda de nuevo
3. Elimina caracteres especiales de nombres de columnas

### La app no se abre en el navegador

**Solución**:
1. Copia la URL que aparece en la terminal
2. Pégala manualmente en tu navegador
3. Típicamente: `http://localhost:8501`

### Gráficas no se muestran

**Causa**: Problema con Plotly

**Solución**:
```bash
pip install --upgrade plotly
```

## Soporte

### Documentación

1. **Guía de Usuario**: `docs/USO_HERRAMIENTA.md`
2. **README**: `README.md`
3. **Ayuda en la app**: Sección "Ayuda"

### Recursos Externos

- [Documentación de Streamlit](https://docs.streamlit.io/)
- [Scikit-learn PCA](https://scikit-learn.org/stable/modules/decomposition.html#pca)
- [Plotly Python](https://plotly.com/python/)

## Características Principales

### Análisis PCA
- Cálculo automático de componentes principales
- Scree plot interactivo
- Scores plot 2D y 3D
- Biplot con loadings
- Tabla de varianza explicada

### Clustering
- K-means con evaluación de silhouette
- Clustering jerárquico con dendrograma
- Elbow plot para selección de k
- Visualización en espacio PCA

### Preprocesamiento
- Carga CSV y Excel
- Imputación de valores faltantes
- Estandarización y normalización
- Matriz de correlación
- Detección de outliers

### Interfaz
- Dashboard moderno y atractivo
- Navegación intuitiva
- Visualizaciones interactivas
- Ayuda contextual en español
- Exportación de resultados

## Próximos Pasos

1. **Ejecuta la aplicación** por primera vez
2. **Prueba con datos de ejemplo** (si disponible)
3. **Sube tus propios datos**
4. **Explora todas las funcionalidades**
5. **Lee la guía completa** en `docs/USO_HERRAMIENTA.md`
6. **Despliega en Streamlit Cloud** para compartir

## Notas Importantes

### Datos de Ejemplo

Si tienes el archivo `chemometrics_example.xls` en la raíz:
- La app lo detectará automáticamente
- Podrás cargarlo con un solo clic
- Es ideal para aprender a usar la herramienta

### Privacidad de Datos

- Los datos se procesan **localmente** en tu navegador
- No se envía información a servidores externos
- Al cerrar la app, los datos se borran de memoria

### Formato de Datos Recomendado

**Estructura ideal**:
```
| ID    | var1 | var2 | var3 | ... | categoria1 | categoria2 |
|-------|------|------|------|-----|------------|------------|
| S1    | 12.3 | 4.5  | 8.9  | ... | tipo_A     | grupo_1    |
| S2    | 10.8 | 5.2  | 7.3  | ... | tipo_B     | grupo_1    |
```

- Primera fila: nombres de columnas
- Columnas numéricas: variables para PCA
- Columnas categóricas: para etiquetas/colores

## Para Estudiantes

Esta herramienta está diseñada para ti:

1. **No necesitas programar**: Todo es visual e interactivo
2. **Aprende haciendo**: Experimenta con diferentes configuraciones
3. **Enfócate en la química**: Deja los cálculos a la herramienta
4. **Exporta para reportes**: Descarga resultados y gráficas

## Para Docentes

Usa esta herramienta en clase para:

1. **Enseñar PCA y clustering** de forma práctica
2. **Analizar datos reales** de laboratorio
3. **Comparar métodos** (K-means vs jerárquico)
4. **Fomentar interpretación** química de resultados

---

## Listo para Empezar!

Tu herramienta de análisis quimiométrico está completamente funcional.

**Ejecuta ahora**:
```bash
streamlit run streamlit_app.py
```

**Disfruta analizando tus datos químicos!**

---

Desarrollado con dedicación para la comunidad de química
