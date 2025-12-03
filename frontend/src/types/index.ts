// ============================================================================
// TIPOS GLOBALES DE LA APLICACIÓN
// ============================================================================

export interface AppState {
  sessionId: string | null;
  dataLoaded: boolean;
  preprocessed: boolean;
  pcaCalculated: boolean;
  clusteringCalculated: boolean;
  // Estados para otras páginas
  classifierTrained: boolean;
  similaritySearched: boolean;
}

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

export interface ColumnInfo {
  nombre: string;
  tipo: 'numerico' | 'categorico';
  valores_unicos: number;
  valores_ejemplo: (string | number)[];
}

export interface DataInfo {
  num_filas: number;
  num_columnas: number;
  columnas_numericas: string[];
  columnas_categoricas: string[];
  columnas_info: ColumnInfo[];
  muestra_datos: Record<string, unknown>[];
  feedstock_valores: number[] | null;
  concentration_valores: number[] | null;
}

export interface DataUploadResponse {
  exito: boolean;
  mensaje: string;
  session_id: string;
  num_filas: number;
  num_columnas: number;
  columnas_numericas: string[];
  columnas_categoricas: string[];
  columnas_info: ColumnInfo[];
  muestra_datos: Record<string, unknown>[];
  feedstock_valores: number[] | null;
  concentration_valores: number[] | null;
}

// ============================================================================
// TIPOS DE PREPROCESAMIENTO
// ============================================================================

export interface PreprocessingRequest {
  session_id: string;
  columnas_seleccionadas: string[];
  manejar_nans: 'eliminar' | 'imputar_media';
  estandarizar: boolean;
}

export interface VariableStats {
  nombre: string;
  media: number;
  std: number;
  min: number;
  max: number;
}

export interface PreprocessingResponse {
  exito: boolean;
  mensaje: string;
  num_filas: number;
  num_columnas: number;
  filas_eliminadas: number;
  estadisticas: VariableStats[];
}

// ============================================================================
// TIPOS DE PCA
// ============================================================================

export interface VarianzaComponente {
  componente: string;
  varianza_explicada: number;
  varianza_acumulada: number;
}

export interface ScoreRow {
  [key: string]: number; // PC1, PC2, PC3, etc.
}

export interface LoadingRow {
  variable: string;
  [key: string]: string | number; // PC1, PC2, etc. son números
}

export interface PCARequest {
  session_id: string;
  n_componentes: number | null;
}

export interface PCAResults {
  n_componentes: number;
  varianza_explicada: VarianzaComponente[];
  scores: ScoreRow[];
  loadings: LoadingRow[];
  nombres_muestras: number[];
  nombres_variables: string[];
  feedstock: number[] | null;
  concentration: number[] | null;
}

export interface PCAResponse extends PCAResults {
  exito: boolean;
  mensaje: string;
}

// ============================================================================
// TIPOS DE CLUSTERING
// ============================================================================

export interface ClusterStats {
  cluster_id: number;
  tamano: number;
  porcentaje: number;
  medias: Record<string, number>;
}

export interface DendrogramData {
  icoord: number[][];
  dcoord: number[][];
  ivl: string[];
  leaves: number[];
  color_list: string[];
}

export interface ClusteringRequest {
  session_id: string;
  metodo: 'kmeans' | 'jerarquico';
  n_clusters: number;
  usar_pca: boolean;
  linkage: 'ward' | 'complete' | 'average';
}

export interface ClusteringResults {
  metodo: string;
  n_clusters: number;
  etiquetas: number[];
  silhouette_score: number | null;
  inercia: number | null;
  estadisticas_clusters: ClusterStats[];
  dendrograma_data: DendrogramData | null;
}

export interface ClusteringResponse extends ClusteringResults {
  exito: boolean;
  mensaje: string;
}

// ============================================================================
// TIPOS DE CORRELACIÓN
// ============================================================================

export interface CorrelationResponse {
  exito: boolean;
  mensaje: string;
  variables: string[];
  matriz: number[][];
}

// ============================================================================
// TIPOS DE SILHOUETTE
// ============================================================================

export interface SilhouetteResult {
  k: number;
  silhouette: number;
  inercia: number;
}

export interface SilhouetteAnalysisResponse {
  exito: boolean;
  mensaje: string;
  resultados: SilhouetteResult[];
  k_optimo: number | null;
}

export interface SilhouetteSample {
  muestra: number;
  cluster: number;
  silhouette: number;
}

export interface SilhouetteSamplesResponse {
  exito: boolean;
  mensaje: string;
  samples: SilhouetteSample[];
  score_global: number | null;
}

// ============================================================================
// TIPOS DE VISUALIZACIÓN
// ============================================================================

export type ColorByOption = 'none' | 'feedstock' | 'concentration' | 'cluster';

export interface ChartSettings {
  colorBy: ColorByOption;
  pointSize: number;
  opacity: number;
  palette: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

// Mapeos de categorías
export const FEEDSTOCK_LABELS: Record<number, string> = {
  1: 'Diesel',
  2: 'Animal Tallow (Texas)',
  3: 'Animal Tallow (IRE)',
  4: 'Canola',
  5: 'Waste Grease',
  6: 'Soybean',
  7: 'Desconocido'
};

export const CONCENTRATION_LABELS: Record<number, string> = {
  1: 'Diesel',
  2: 'B2',
  3: 'B5',
  4: 'B10',
  5: 'B20',
  6: 'B100',
  7: 'Desconocida'
};

// Paletas de colores
export const COLOR_PALETTES = {
  default: [
    '#0658a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    '#22c55e', '#f97316', '#ec4899', '#6366f1', '#84cc16'
  ],
  // Protanopia (red-green color blindness) - optimized for those who cannot distinguish red
  protanopia: [
    '#0173B2', '#ECE133', '#56B4E9', '#029E73', '#DE8F05',
    '#CC78BC', '#CA9161', '#949494', '#FBAFE4', '#000000'
  ],
  // Deuteranopia (green-red color blindness) - optimized for those who cannot distinguish green
  deuteranopia: [
    '#1170AA', '#FC7D0B', '#A3ACB9', '#57606C', '#5FA2CE',
    '#C85200', '#7B848F', '#A3ACB9', '#FFBC79', '#2F4B7C'
  ],
  // Tritanopia (blue-yellow color blindness) - optimized for those who cannot distinguish blue/yellow
  tritanopia: [
    '#C1272D', '#0000A7', '#EEEEEE', '#00D4FF', '#F15854',
    '#B276B2', '#DECF3F', '#F17CB0', '#B2912F', '#FF9DA7'
  ]
};

// ============================================================================
// TIPOS DE CLASIFICADOR SUPERVISADO
// ============================================================================

export interface FeatureImportance {
  variable: string;
  importancia: number;
}

export interface ClassifierTrainRequest {
  session_id: string;
  target: 'feedstock' | 'concentration';
  modelo: 'random_forest' | 'logistic_regression' | 'svm';
  usar_pca: boolean;
  n_estimators: number;
  max_depth: number | null;
  c_param: number;
  test_size: number;
}

export interface ClassifierTrainResponse {
  exito: boolean;
  mensaje: string;
  target: string;
  modelo: string;
  accuracy: number;
  f1_score: number;
  precision: number;
  recall: number;
  confusion_matrix: number[][];
  class_labels: string[];
  feature_importances: FeatureImportance[];
  n_train: number;
  n_test: number;
}

export interface PredictionResult {
  indice: number;
  clase_predicha: string;
  clase_predicha_codigo: number;
  probabilidades: Record<string, number> | null;
  interpretacion: string;
}

export interface ClassifierPredictRequest {
  session_id: string;
  target: 'feedstock' | 'concentration';
  sample_indices?: number[];
  sample_values?: Record<string, number>[];
}

export interface ClassifierPredictResponse {
  exito: boolean;
  mensaje: string;
  predicciones: PredictionResult[];
}

export interface ClassifierStatusInfo {
  entrenado: boolean;
  modelo: string;
  accuracy: number;
  f1_score: number;
  usar_pca: boolean;
}

export interface ClassifierStatus {
  feedstock: ClassifierStatusInfo | null;
  concentration: ClassifierStatusInfo | null;
}

// ============================================================================
// TIPOS DE SIMILITUD / FINGERPRINTING
// ============================================================================

export interface SimilaritySearchRequest {
  session_id: string;
  sample_index?: number;
  sample_values?: Record<string, number>;
  space: 'pca' | 'original';
  metric: 'euclidean' | 'cosine';
  k: number;
}

export interface SimilarNeighbor {
  indice: number;
  distancia: number;
  similitud: number;
  feedstock: string | null;
  feedstock_codigo: number | null;
  concentration: string | null;
  concentration_codigo: number | null;
  pc1: number | null;
  pc2: number | null;
}

export interface SimilaritySearchResponse {
  exito: boolean;
  mensaje: string;
  muestra_referencia: {
    indice: number;
    feedstock: string | null;
    concentration: string | null;
    pc1: number | null;
    pc2: number | null;
  };
  vecinos: SimilarNeighbor[];
  interpretacion: string;
}

export interface SampleInfo {
  indice: number;
  feedstock?: string;
  feedstock_codigo?: number;
  concentration?: string;
  concentration_codigo?: number;
  pc1?: number;
  pc2?: number;
  cluster?: number;
}

export interface SamplesListResponse {
  exito: boolean;
  n_muestras: number;
  muestras: SampleInfo[];
}

// ============================================================================
// TIPOS DE REPORTE
// ============================================================================

export interface PCAResumen {
  n_componentes: number;
  varianza_total: number;
  componentes_importantes: Array<{
    nombre: string;
    varianza: number;
    acumulada: number;
  }>;
  top_loadings_pc1: Array<{ variable: string; loading: number }>;
  top_loadings_pc2: Array<{ variable: string; loading: number }>;
}

export interface ClusteringResumen {
  metodo: string;
  n_clusters: number;
  silhouette_score: number | null;
  estadisticas: Array<{
    cluster_id: number;
    tamano: number;
    porcentaje: number;
  }>;
}

export interface ClassifierResumen {
  target: string;
  modelo: string;
  accuracy: number;
  f1_score: number;
  mejores_variables: string[];
}

export interface ReportSummaryResponse {
  exito: boolean;
  mensaje: string;
  info_dataset: {
    n_muestras: number;
    n_variables_numericas: number;
    n_variables_categoricas: number;
    variables_seleccionadas: string[];
    tiene_feedstock: boolean;
    tiene_concentration: boolean;
  };
  pca_resumen: PCAResumen | null;
  clustering_resumen: ClusteringResumen | null;
  classifier_resumen: ClassifierResumen[] | null;
  interpretacion_general: string;
  interpretacion_pca: string | null;
  interpretacion_clustering: string | null;
  interpretacion_clasificador: string | null;
}

// ============================================================================
// TIPOS DE MODO ENSEÑANZA
// ============================================================================

export interface TeachingStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  page?: string;
  requiredState?: keyof AppState; // Estado requerido para este paso
  actionHint?: string; // Texto de ayuda para la acción
  allowInteraction?: boolean; // Permitir interacción con el elemento
}

export interface TeachingContextType {
  isTeachingMode: boolean;
  toggleTeachingMode: () => void;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  exitTeaching: () => void;
  currentPageSteps: TeachingStep[];
  setAppState?: (state: AppState) => void;
  syncWithAppState: (state: AppState) => void;
}
