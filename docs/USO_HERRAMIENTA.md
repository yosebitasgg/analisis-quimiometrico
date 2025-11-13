# Guía de Uso: Herramienta de Análisis Quimiométrico

Esta guía te llevará paso a paso por el uso completo de la herramienta, desde la carga de datos hasta la exportación de resultados.

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Preparación de Datos](#preparación-de-datos)
3. [Paso 1: Cargar Datos](#paso-1-cargar-datos)
4. [Paso 2: Preprocesamiento](#paso-2-preprocesamiento)
5. [Paso 3: Análisis PCA](#paso-3-análisis-pca)
6. [Paso 4: Clustering](#paso-4-clustering)
7. [Paso 5: Exportar Resultados](#paso-5-exportar-resultados)
8. [Interpretación de Resultados](#interpretación-de-resultados)
9. [Casos de Uso Comunes](#casos-de-uso-comunes)
10. [Solución de Problemas](#solución-de-problemas)

---

## Introducción

### ¿Qué es esta herramienta?

Es una aplicación web interactiva diseñada para realizar análisis multivariado de datos químicos sin necesidad de programar. Puedes:

- Reducir la dimensionalidad de tus datos con **PCA**
- Encontrar grupos naturales con **Clustering**
- Visualizar patrones en datos complejos
- Exportar resultados para reportes

### ¿Para quién es?

- Estudiantes de química que necesitan analizar datos de laboratorio
- Docentes que quieren enseñar quimiometría de forma práctica
- Investigadores que buscan explorar datos rápidamente

### Requisitos previos

- Tus datos en formato **CSV** o **Excel** (.xlsx, .xls)
- Navegador web moderno (Chrome, Firefox, Edge)
- Conexión a internet (si usas la versión online)

---

## Preparación de Datos

### Formato de Archivo Requerido

Tu archivo debe tener:

1. **Primera fila**: Nombres de columnas
2. **Columnas numéricas**: Variables a analizar (ej. áreas de picos, concentraciones)
3. **Columnas categóricas** (opcional): Para etiquetar (ej. tipo de muestra, origen)

### Ejemplo de Estructura

| Muestra | C16:0 | C18:0 | C18:1 | C18:2 | feedstock | concentration |
|---------|-------|-------|-------|-------|-----------|---------------|
| S1      | 12.3  | 5.4   | 45.2  | 20.1  | soja      | B5            |
| S2      | 10.8  | 4.9   | 48.3  | 18.5  | soja      | B5            |
| S3      | 20.5  | 8.2   | 35.1  | 12.3  | palma     | B10           |

- **Numéricas**: C16:0, C18:0, C18:1, C18:2 (se usarán para PCA)
- **Categóricas**: feedstock, concentration (para colorear gráficas)

### Buenas Prácticas

**SÍ**:
- Usa nombres de columnas descriptivos
- Mantén unidades consistentes
- Revisa que no haya errores de tipeo

**NO**:
- Dejes celdas completamente vacías sin razón
- Mezcles texto y números en la misma columna numérica
- Uses caracteres especiales raros en nombres de columnas

---

## Paso 1: Cargar Datos

### 1.1 Abrir la Aplicación

1. Abre tu navegador web
2. Ve a la URL de la aplicación (local o cloud)
3. Verás la página **Home**

### 1.2 Navegar a "Cargar Datos"

1. En el **sidebar** (panel izquierdo), haz clic en **"Cargar Datos"**
2. Verás dos opciones de carga

### 1.3 Opción A: Cargar Archivo de Ejemplo

Si hay un archivo de ejemplo disponible:

1. Haz clic en **"Cargar archivo de ejemplo"**
2. Los datos se cargarán automáticamente
3. Listo para continuar!

### 1.4 Opción B: Subir tu Propio Archivo

1. Haz clic en **"Browse files"** o arrastra tu archivo
2. Selecciona tu archivo CSV o Excel
3. Espera a que aparezca el mensaje: **"Archivo cargado exitosamente"**

### 1.5 Vista Previa de Datos

Una vez cargado, verás:

- **Tarjetas de resumen**:
  - Número de observaciones (filas)
  - Número de variables (columnas)
  - Porcentaje de datos faltantes
  - Variables categóricas

- **Tabla de vista previa**: Primeras 20 filas de tus datos

- **Tipos de columnas**:
  - Variables numéricas (automáticamente detectadas)
  - Variables categóricas (automáticamente detectadas)

- **Estadísticas descriptivas**: Media, desviación estándar, min, max, etc.

### Verificación

Antes de continuar, asegúrate de que:

- [ ] El número de filas y columnas es correcto
- [ ] Las columnas numéricas están bien identificadas
- [ ] Las columnas categóricas están bien identificadas
- [ ] Los valores en la vista previa tienen sentido

---

## Paso 2: Preprocesamiento

### 2.1 Navegar a Preprocesamiento

1. En el sidebar, haz clic en **"Preprocesamiento"**
2. Si no has cargado datos, verás una advertencia

### 2.2 Selección de Variables

#### Variables Numéricas

1. En **"Variables Numéricas (para PCA)"**:
   - Selecciona las variables que quieres incluir en el análisis
   - Por defecto, todas las numéricas están seleccionadas
   - **Mínimo**: Debes seleccionar al menos 2 variables

**Ejemplo**: Si tienes 15 picos FAME y solo quieres analizar 10, deselecciona los 5 que no te interesan.

#### Variables Categóricas

2. En **"Variables Categóricas (para etiquetas)"**:
   - Selecciona variables que usarás para colorear gráficas
   - No son obligatorias
   - Útiles para identificar grupos conocidos

**Ejemplo**: Si tienes una columna "feedstock" (soja, palma, girasol), selecciónala para colorear por origen.

### 2.3 Manejo de Valores Faltantes

Elige cómo tratar los datos faltantes:

- **Media**: Rellena valores faltantes con el promedio de la columna
  - Usa cuando: Hay pocos valores faltantes (<10%)
  - Evita cuando: Muchos datos faltantes o outliers extremos

- **Mediana**: Rellena con la mediana (más robusta a outliers)
  - Usa cuando: Hay outliers o distribución asimétrica
  - Evita cuando: Distribución muy normal y pocas muestras

- **Eliminar filas con NaN**: Quita completamente las filas con datos faltantes
  - Usa cuando: Pocas filas afectadas y tienes muchas muestras
  - Evita cuando: Perderías muchas muestras

**Recomendación General**: Empieza con **Media**.

### 2.4 Escalamiento de Datos

Elige el método de escalamiento:

- **Estandarización (z-score)** [RECOMENDADO]:
  - Centra datos en media=0 y desviación estándar=1
  - **Úsalo para PCA** (casi siempre)
  - Variables con diferentes unidades contribuyen equitativamente

- **Normalización Min-Max**:
  - Escala a rango [0, 1]
  - Útil cuando necesitas valores acotados
  - Sensible a outliers

- **Sin escalamiento**:
  - Mantiene valores originales
  - No recomendado para PCA (variables con valores grandes dominarán)

**Recomendación**: Usa **Estandarización** para PCA.

### 2.5 Diagnóstico de Variables

Antes de ejecutar, revisa las pestañas:

#### Pestaña "Distribuciones"

- **Boxplots**: Muestra la distribución de tus variables
  - Cajas: cuartiles (25%, 50%, 75%)
  - Bigotes: rango de datos
  - Puntos fuera: posibles outliers

- **Histogramas**: Selecciona una variable para ver su distribución
  - Simétrica: forma de campana
  - Asimétrica: sesgada a un lado
  - Multimodal: varios picos (posibles subgrupos)

#### Pestaña "Correlaciones"

- **Heatmap de correlación**:
  - Rojo intenso: correlación positiva fuerte (+1)
  - Azul intenso: correlación negativa fuerte (-1)
  - Blanco: sin correlación (0)

**Interpretación**:
- Variables muy correlacionadas (+0.9 o más) aportan información similar
- PCA será útil si ves muchas correlaciones altas

### 2.6 Ejecutar Preprocesamiento

1. Revisa tus configuraciones
2. Haz clic en **"Ejecutar Preprocesamiento"**
3. Espera el mensaje de éxito
4. Verás un resumen JSON con información del preprocesamiento

### Verificación

Antes de continuar:

- [ ] Preprocesamiento ejecutado exitosamente
- [ ] Revisaste las distribuciones (no hay anomalías raras)
- [ ] Entiendes qué variables seleccionaste

---

## Paso 3: Análisis PCA

### 3.1 Navegar a PCA

1. En el sidebar, haz clic en **"PCA"**
2. Si no has preprocesado, verás una advertencia

### 3.2 Configurar PCA

#### Número de Componentes

1. Usa el **slider** para seleccionar cuántos componentes principales calcular
2. Rango: 2 hasta el mínimo entre:
   - Número de variables seleccionadas
   - Número de muestras
   - 10 (máximo por defecto)

**Recomendación**: Empieza con **3 componentes** para tener visualización 3D.

### 3.3 Calcular PCA

1. Haz clic en **"Calcular PCA"**
2. Espera unos segundos
3. Verás el mensaje: **"PCA calculado exitosamente"**

### 3.4 Interpretar Resultados

#### Tarjetas de Resumen

Verás 3 tarjetas con:

1. **Componentes**: Cuántos PCs calculaste
2. **Varianza Total**: % de información retenida
3. **PC1 + PC2**: Varianza capturada en visualización 2D

**Ejemplo**:
- PC1 + PC2 = 85% → Una gráfica 2D captura bien tus datos
- PC1 + PC2 = 45% → Necesitas más componentes (datos complejos)

#### Tabla de Varianza Explicada

Muestra por cada componente:

- **Varianza Explicada (%)**: Qué % de información captura ese PC
- **Varianza Acumulada (%)**: Total acumulado hasta ese PC

**Ejemplo**:

| Componente | Varianza Explicada (%) | Varianza Acumulada (%) |
|------------|------------------------|------------------------|
| PC1        | 65.2                   | 65.2                   |
| PC2        | 20.8                   | 86.0                   |
| PC3        | 8.5                    | 94.5                   |

**Interpretación**: Con 2 componentes capturas el 86% de la información.

#### Scree Plot

Gráfica de barras + línea:

- **Barras azules**: Varianza individual por componente
- **Línea rosa**: Varianza acumulada

**Cómo usarlo**:
1. Busca el "codo" donde la curva se aplana
2. Ese es típicamente el número óptimo de componentes a retener
3. En el ejemplo anterior, el codo está en PC2 o PC3

### 3.5 Visualización de Scores

#### Opciones de Personalización

Antes de ver las gráficas, configura:

1. **Colorear puntos por**: Selecciona una variable categórica
   - "Ninguno": Todos los puntos del mismo color
   - "feedstock": Colorea por tipo de materia prima
   - "concentration": Colorea por concentración

2. **Tamaño de puntos**: Ajusta con slider (3-15)

3. **Opacidad**: Ajusta transparencia (0.1-1.0)
   - Útil cuando hay muchas muestras superpuestas

4. **Paleta de colores**: Elige una paleta friendly para daltonismo

#### Pestaña "2D (PC1 vs PC2)"

Gráfica de dispersión con tus muestras proyectadas en PC1 y PC2.

**Cómo interpretar**:

- **Puntos cercanos**: Muestras similares
- **Puntos lejanos**: Muestras diferentes
- **Grupos visibles**: Posibles clusters naturales
- **Outliers**: Puntos muy alejados del resto

**Ejes de referencia** (líneas discontinuas en 0):
- Te ayudan a ubicar cuadrantes

**Interactividad**:
- Hover sobre puntos para ver información
- Zoom con scroll
- Pan arrastrando
- Doble clic para resetear zoom

#### Pestaña "3D"

Gráfica 3D con PC1, PC2 y PC3.

**Ventajas**:
- Más información (si PC3 tiene varianza significativa)
- Puedes rotar para ver diferentes ángulos

**Cómo rotar**:
- Arrastra con el mouse
- Prueba diferentes ángulos para encontrar la mejor vista

#### Pestaña "Biplot"

Combina scores (puntos) con loadings (vectores/flechas).

**Elementos**:

1. **Puntos**: Tus muestras (igual que en scores plot)

2. **Flechas rojas**: Representan tus variables originales
   - Dirección: Hacia dónde "apunta" la variable
   - Longitud: Qué tan importante es esa variable

**Cómo interpretar flechas**:

- **Flechas largas**: Variables importantes para esos PCs
- **Flechas cortas**: Variables menos relevantes
- **Flechas paralelas**: Variables correlacionadas positivamente
- **Flechas opuestas**: Variables correlacionadas negativamente
- **Flechas perpendiculares**: Variables no correlacionadas

**Ejemplo práctico**:

Si "C18:1" tiene una flecha larga hacia la derecha:
- Muestras a la derecha tienen alto C18:1
- Muestras a la izquierda tienen bajo C18:1

**Slider**: Ajusta cuántos vectores mostrar (3-20)
- Muchos vectores: más completo pero saturado
- Pocos vectores: más limpio pero menos información

### 3.6 Loadings (Contribución de Variables)

Scroll hacia abajo para ver:

#### Tabla de Loadings

Muestra la contribución de cada variable original a cada PC.

- **Valores altos** (positivos o negativos): Variable importante para ese PC
- **Valores cercanos a 0**: Variable poco importante

#### Top Variables por Componente

Selecciona un componente (PC1, PC2, etc.) para ver las 5 variables que más contribuyen.

**Uso práctico**:
- PC1 captura la variación principal: ¿qué variables la causan?
- PC2 captura la segunda mayor variación: ¿qué variables?

**Ejemplo**:

Si PC1 tiene alto loading en C16:0 y C18:0:
- PC1 probablemente representa "ácidos grasos saturados"
- Muestras con PC1 alto tienen más saturados

### Verificación

Después del PCA:

- [ ] Entiendes cuánta varianza capturaron tus PCs
- [ ] Identificaste posibles grupos en los scores plots
- [ ] Sabes qué variables son más importantes (loadings)
- [ ] Tienes una interpretación química de PC1 y PC2

---

## Paso 4: Clustering

### 4.1 Navegar a Clustering

1. En el sidebar, haz clic en **"Clustering"**
2. Si no has calculado PCA, verás una advertencia

### 4.2 Seleccionar Datos para Clustering

Pregunta: **"¿Sobre qué datos hacer clustering?"**

- **Scores de PCA (recomendado)**: Usa las coordenadas en espacio reducido
  - Ventajas: Reduce ruido, más rápido, mejor separación
  - Usa esto casi siempre

- **Datos originales preprocesados**: Usa todas las variables originales
  - Útil si quieres clustering sin reducción dimensional

**Recomendación**: Usa **Scores de PCA**.

### 4.3 K-means Clustering

Navega a la pestaña **"K-means"**

#### 4.3.1 Selección del Número de Clusters

**Método 1: Intuitivo**

Usa el **slider** "Número de clusters (k)" para elegir cuántos grupos esperas.

**¿Cómo decidir?**
- ¿Tienes idea de cuántos grupos hay? (ej. 3 tipos de feedstock)
- ¿Ves grupos claros en el scores plot? Cuenta cuántos

**Método 2: Elbow Plot**

1. Marca la casilla **"Mostrar métodos de evaluación"**
2. Espera a que se calcule el **Elbow Plot**

**Interpretación**:
- Eje X: Número de clusters (k)
- Eje Y: Inercia (suma de distancias dentro de clusters)
- **Busca el "codo"**: Donde la curva se aplana
- Ese k es típicamente óptimo

**Ejemplo**:
- Inercia cae mucho de k=2 a k=3
- Inercia cae poco de k=3 a k=4
- **Codo en k=3** → Usa 3 clusters

#### 4.3.2 Ejecutar K-means

1. Selecciona tu k óptimo con el slider
2. Haz clic en **"Ejecutar K-means"**
3. Espera el mensaje de éxito con el **Silhouette Score**

#### 4.3.3 Interpretar Resultados

**Silhouette Score**

Métrica de calidad de clustering (-1 a +1):

- **> 0.7**: Excelente separación entre clusters
- **0.5 - 0.7**: Buena separación
- **0.25 - 0.5**: Separación moderada (aceptable)
- **< 0.25**: Pobre separación (considera otro k o que no hay clusters naturales)

**Tabla de Conteo**

Muestra cuántas muestras hay en cada cluster.

**Ejemplo**:

| Cluster | N_muestras |
|---------|------------|
| 0       | 15         |
| 1       | 23         |
| 2       | 12         |

**Verificación**: ¿Los tamaños tienen sentido?
- Clusters muy desbalanceados (ej. 1 muestra vs 100) pueden indicar outliers

**Silhouette Plot**

Gráfica de barras horizontales apiladas por cluster.

**Interpretación**:
- **Ancho de barra**: Silhouette score de cada muestra
- **Color**: Cluster al que pertenece
- **Línea roja vertical**: Promedio global

**Qué buscar**:
- Clusters con todas las barras a la derecha del promedio: Bien definidos
- Barras que cruzan mucho a la izquierda: Muestras mal asignadas
- Tamaños de clusters muy irregulares: Posible problema

**Visualización de Clusters en PCA**

Gráfica de scores coloreada por cluster.

**Interpretación**:
- Clusters bien separados: Puntos del mismo color agrupados
- Clusters superpuestos: Colores mezclados (mala separación)
- Outliers: Puntos aislados de su cluster

### 4.4 Clustering Jerárquico

Navega a la pestaña **"Clustering Jerárquico"**

#### 4.4.1 Método de Ligamiento

Selecciona cómo calcular distancias entre clusters:

- **Ward** [RECOMENDADO]: Minimiza varianza dentro de clusters
  - Mejor para la mayoría de casos
  - Tiende a crear clusters compactos

- **Completo**: Usa distancia máxima entre puntos
  - Útil para detectar outliers

- **Promedio**: Usa distancia promedio
  - Balance entre Ward y Completo

- **Simple**: Usa distancia mínima
  - Puede crear cadenas, menos útil

**Recomendación**: Empieza con **Ward**.

#### 4.4.2 Calcular Dendrograma

1. Haz clic en **"Calcular Dendrograma"**
2. Espera unos segundos
3. Verás el dendrograma

#### 4.4.3 Interpretar Dendrograma

**Elementos**:

- **Eje X**: Muestras (numeradas)
- **Eje Y**: Distancia (altura de unión)
- **Ramas**: Conectan muestras/grupos

**Cómo leer**:

1. **De abajo hacia arriba**: Muestras se unen progresivamente
2. **Altura de unión**: Qué tan similares son los grupos
   - Unión baja: Muy similares
   - Unión alta: Diferentes

3. **Cortes horizontales imaginarios**: Diferentes números de clusters
   - Corte bajo: Muchos clusters
   - Corte alto: Pocos clusters

**Estrategia**:

1. Busca "saltos grandes" en altura
2. Corta antes del salto para maximizar separación

#### 4.4.4 Cortar Dendrograma

1. Usa el slider **"Número de clusters a formar"**
2. Selecciona cuántos grupos quieres
3. Haz clic en **"Cortar y Asignar Clusters"**

El corte se hace automáticamente al nivel apropiado.

#### 4.4.5 Resultados Jerárquicos

**Tabla de Conteo**: Igual que K-means

**Visualización en PCA**: Puntos coloreados por cluster jerárquico

**Comparación con K-means**:
- ¿Los clusters son similares?
- Si sí: Robustez (grupos naturales claros)
- Si no: Explorar por qué difieren

### Verificación

Después del clustering:

- [ ] Probaste diferentes valores de k
- [ ] Evaluaste calidad con Silhouette Score
- [ ] Comparaste K-means vs Jerárquico
- [ ] Los clusters tienen sentido químico/científico

---

## Paso 5: Exportar Resultados

### 5.1 Navegar a Resultados

1. En el sidebar, haz clic en **"Resultados"**
2. Si no has hecho PCA, verás una advertencia

### 5.2 Vista Previa

Verás una tabla con:

- Scores de PCA (PC1, PC2, PC3, ...)
- Variables categóricas (si las seleccionaste)
- Labels de clusters K-means (si ejecutaste)
- Labels de clusters jerárquicos (si ejecutaste)

Revisa que todo esté correcto.

### 5.3 Descargar Archivos

Haz clic en los botones para descargar:

#### Resultados Completos (CSV)

Archivo: `resultados_quimiometria.csv`

Contiene:
- Todas las columnas de la tabla de vista previa
- Scores de PCA
- Labels de clusters
- Variables categóricas

**Uso**: Importar a Excel, otro software, o para reportes.

#### Tabla de Varianza (CSV)

Archivo: `varianza_explicada.csv`

Contiene:
- Componente (PC1, PC2, ...)
- Varianza Explicada (%)
- Varianza Acumulada (%)

**Uso**: Para incluir en reportes o presentaciones.

#### Loadings (CSV)

Archivo: `loadings_pca.csv`

Contiene:
- Filas: Variables originales
- Columnas: PC1, PC2, PC3, ...
- Valores: Loadings

**Uso**: Análisis detallado de contribuciones de variables.

### 5.4 Exportar Gráficas

**Opción 1: Desde Plotly (interactivo)**

1. Hover sobre cualquier gráfica
2. Aparece barra de herramientas en la esquina superior derecha
3. Haz clic en el icono de cámara
4. Descarga como PNG

**Opción 2: Captura de pantalla**

1. Usa herramienta de captura de tu sistema operativo
2. Recorta la gráfica que necesitas

**Formatos disponibles**:
- PNG: Para reportes, presentaciones
- SVG: Para edición vectorial (alta calidad)

### 5.5 Resumen del Análisis

Lee el **"Resumen del Análisis"** al final de la página.

Incluye:
- Número de observaciones y variables
- Componentes calculados
- Varianza explicada
- Información de clustering

**Usa este resumen** para escribir la sección de métodos en tu reporte.

### Verificación Final

Antes de terminar:

- [ ] Descargaste resultados completos (CSV)
- [ ] Exportaste las gráficas principales
- [ ] Guardaste tabla de varianza explicada
- [ ] Tienes todo para tu reporte/presentación

---

## Interpretación de Resultados

### Interpretación de PCA

#### ¿Qué me dice PC1?

PC1 captura la **mayor fuente de variación** en tus datos.

**Pregunta clave**: ¿Qué variables tienen alto loading en PC1?

**Ejemplo**:
- PC1 tiene alto loading en C16:0, C18:0 (saturados)
- **Interpretación**: PC1 representa "contenido de ácidos grasos saturados"
- Muestras con PC1 alto → Más saturados
- Muestras con PC1 bajo → Menos saturados

#### ¿Qué me dice PC2?

PC2 captura la **segunda mayor fuente de variación**, independiente de PC1.

**Ejemplo**:
- PC2 tiene alto loading en C18:2 (linoleico)
- **Interpretación**: PC2 representa "contenido de ácido linoleico"

#### Scores Plot

**Patrones comunes**:

1. **Grupos separados**: Diferentes tipos de muestras (ej. origen)
2. **Gradiente continuo**: Cambio gradual (ej. concentración creciente)
3. **Outliers**: Muestras atípicas (errores, contaminación)

### Interpretación de Clustering

#### ¿Los clusters tienen sentido?

**Pregunta**: ¿Corresponden a algo que conoces?

**Ejemplos**:

- **Cluster 0**: Todas muestras de soja
- **Cluster 1**: Todas muestras de palma
- **Cluster 2**: Todas muestras de girasol

→ **Buen clustering**: Separó por origen

Vs.

- Clusters sin patrón aparente
- Mezcla aleatoria de tipos conocidos

→ **Mal clustering**: O no hay grupos naturales, o k incorrecto

#### Silhouette Score Bajo

**Si el score es <0.25**:

Posibles causas:
1. No hay clusters naturales en tus datos
2. Elegiste k incorrecto (prueba otros valores)
3. Variables elegidas no discriminan bien
4. Necesitas más muestras

**Qué hacer**:
- Prueba diferentes k
- Revisa si tiene sentido científicamente que haya grupos
- Considera que tus muestras sean muy homogéneas

---

## Casos de Uso Comunes

### Caso 1: Análisis de Biodiesel (FAME)

**Objetivo**: Clasificar muestras de biodiesel por origen de materia prima

**Datos**:
- Variables numéricas: Áreas de 11 picos FAME (C16:0, C18:0, C18:1, etc.)
- Variables categóricas: feedstock (soja, palma, girasol), concentration (B5, B10, B20)

**Flujo**:

1. **Cargar datos** con columnas de picos FAME
2. **Preprocesar**:
   - Seleccionar todos los picos como numéricas
   - Seleccionar feedstock y concentration como categóricas
   - Estandarización
3. **PCA**:
   - Calcular 3 componentes
   - Colorear scores por feedstock
   - Ver si se separan por origen
4. **Clustering**:
   - K-means con k=3 (3 feedstocks)
   - Verificar si clusters corresponden a feedstocks
5. **Interpretar**:
   - ¿Qué picos discriminan mejor? (Loadings)
   - ¿Se pueden identificar orígenes automáticamente?

**Resultado esperado**:
- PC1 y PC2 separan los 3 orígenes
- Clustering encuentra 3 grupos que corresponden a soja, palma, girasol

### Caso 2: Control de Calidad de Lotes

**Objetivo**: Detectar lotes atípicos en producción

**Datos**:
- Variables numéricas: Parámetros medidos (pureza, densidad, viscosidad, etc.)
- Variables categóricas: lote, fecha

**Flujo**:

1. **PCA**: Ver distribución general de lotes
2. **Identificar outliers**: Puntos muy alejados en scores plot
3. **Clustering jerárquico**: Ver estructura de similitud
4. **Investigar**: ¿Por qué algunos lotes son diferentes?

**Resultado**:
- Identificación automática de lotes fuera de especificación
- Comprensión de qué parámetros varían más

### Caso 3: Desarrollo de Método Analítico

**Objetivo**: Optimizar método de análisis explorando condiciones

**Datos**:
- Variables numéricas: Respuestas del instrumento bajo diferentes condiciones
- Variables categóricas: temperatura, pH, tiempo

**Flujo**:

1. **Correlaciones**: Ver qué respuestas están relacionadas
2. **PCA**: Reducir respuestas a componentes principales
3. **Colorear** por condiciones experimentales
4. **Identificar** condiciones óptimas

**Resultado**:
- Condiciones que maximizan respuesta deseada
- Variables redundantes (altamente correlacionadas) → Simplificar método

---

## Solución de Problemas

### Problema: "No se carga mi archivo"

**Posibles causas**:

1. **Formato incorrecto**:
   - Solución: Asegúrate de que sea .csv, .xlsx o .xls

2. **Archivo corrupto**:
   - Solución: Abre en Excel, guarda como nuevo archivo

3. **Caracteres especiales en nombres**:
   - Solución: Renombra columnas sin acentos, ñ, etc.

4. **Archivo muy grande** (>200 MB):
   - Solución: Reduce tamaño o usa muestreo

### Problema: "Error al ejecutar PCA"

**Causa común**: Datos con NaN después de preprocesamiento

**Solución**:
1. Vuelve a Preprocesamiento
2. Cambia método de imputación
3. O selecciona "Eliminar filas con NaN"

### Problema: "Silhouette Score muy bajo"

**Causas**:

1. **K incorrecto**:
   - Solución: Prueba diferentes valores de k con Elbow plot

2. **No hay clusters naturales**:
   - Solución: Acepta que tus datos pueden no tener grupos claros

3. **Demasiado ruido**:
   - Solución: Revisa preprocesamiento, elimina variables ruidosas

### Problema: "PCA explica poca varianza"

**Causa**: Datos muy complejos o muchas variables no correlacionadas

**Soluciones**:

1. Aumenta número de componentes
2. Revisa si todas las variables son relevantes
3. Considera que necesitas más PCs para capturar información

### Problema: "Gráficas muy saturadas"

**Solución**:

1. Reduce tamaño de puntos
2. Aumenta opacidad
3. En biplot, reduce número de vectores mostrados

### Problema: "No entiendo los resultados"

**Solución**:

1. Lee la sección **"Ayuda"** en la aplicación
2. Revisa esta guía sección por sección
3. Empieza con datos de ejemplo para practicar
4. Consulta con tu profesor/a o supervisor/a

---

## Consejos Finales

### Para Estudiantes

1. **Practica primero** con datos de ejemplo
2. **No te asustes** si no todo sale perfecto a la primera
3. **Interpreta químicamente**: Los números son solo herramientas
4. **Pregunta**: Si algo no tiene sentido, consulta

### Para Docentes

1. **Usa datos reales** de tu laboratorio cuando sea posible
2. **Guía la interpretación**: Los estudiantes pueden calcular pero necesitan ayuda para entender
3. **Compara métodos**: K-means vs Jerárquico enseña robustez
4. **Discute limitaciones**: PCA no siempre es la respuesta

### Buenas Prácticas Generales

1. **Documenta** lo que haces en cada paso
2. **Exporta resultados** regularmente (por si se pierde sesión)
3. **Prueba diferentes configuraciones** para comparar
4. **No confíes ciegamente**: Valida con conocimiento químico
5. **Reporta métodos**: Incluye preprocesamiento y parámetros usados

---

## ¿Necesitas Más Ayuda?

### Recursos Adicionales

- **Libros de Quimiometría**:
  - "Chemometrics: Statistics and Computer Application in Analytical Chemistry" - Massart et al.
  - "Introduction to Multivariate Statistical Analysis in Chemometrics" - Varmuza & Filzmoser

- **Tutoriales Online**:
  - Khan Academy: Estadística y álgebra lineal
  - YouTube: Tutoriales de PCA y clustering

### Contacto

Si encuentras bugs o tienes sugerencias:
- Reporta en GitHub (si disponible)
- Contacta al desarrollador
- Consulta con tu institución

---

**Mucho éxito con tus análisis!**
