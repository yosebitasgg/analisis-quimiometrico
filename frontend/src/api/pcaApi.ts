import apiClient from './client';
import {
  PCARequest,
  PCAResponse,
  PCADiagnosticsResponse,
  PCAContributionsRequest,
  PCAContributionsResponse,
  PCAOptimizationResponse,
  PCA3DResponse,
  ChemicalMapRequest,
  ChemicalMapResponse
} from '../types';

/**
 * Calcula el análisis PCA
 */
export async function calculatePCA(request: PCARequest): Promise<PCAResponse> {
  const response = await apiClient.post<PCAResponse>('/pca/calcular', request);
  return response.data;
}

/**
 * Obtiene los resultados de PCA sin recalcular
 */
export async function getPCAResults(sessionId: string): Promise<PCAResponse> {
  const response = await apiClient.get<PCAResponse>(`/pca/resultados/${sessionId}`);
  return response.data;
}

/**
 * Obtiene diagnósticos PCA (Hotelling T², Q-residuals)
 */
export async function getPCADiagnostics(sessionId: string): Promise<PCADiagnosticsResponse> {
  const response = await apiClient.get<PCADiagnosticsResponse>(`/pca/diagnosticos/${sessionId}`);
  return response.data;
}

/**
 * Obtiene contribuciones de variables para una muestra específica
 */
export async function getPCAContributions(request: PCAContributionsRequest): Promise<PCAContributionsResponse> {
  const response = await apiClient.post<PCAContributionsResponse>('/pca/contribuciones', request);
  return response.data;
}

/**
 * Obtiene análisis de optimización del número de PCs
 */
export async function getPCAOptimization(
  sessionId: string,
  kMax?: number,
  umbralVarianza?: number
): Promise<PCAOptimizationResponse> {
  const params = new URLSearchParams();
  if (kMax) params.append('k_max', kMax.toString());
  if (umbralVarianza) params.append('umbral_varianza', umbralVarianza.toString());

  const url = `/pca/optimizacion/${sessionId}${params.toString() ? '?' + params.toString() : ''}`;
  const response = await apiClient.get<PCAOptimizationResponse>(url);
  return response.data;
}

/**
 * Obtiene datos para visualización 3D de PCA
 */
export async function getPCA3D(sessionId: string): Promise<PCA3DResponse> {
  const response = await apiClient.get<PCA3DResponse>(`/pca/proyeccion-3d/${sessionId}`);
  return response.data;
}

/**
 * Obtiene mapa químico 2D (PCA, UMAP o t-SNE)
 */
export async function getChemicalMap(request: ChemicalMapRequest): Promise<ChemicalMapResponse> {
  const response = await apiClient.post<ChemicalMapResponse>('/pca/mapa-quimico', request);
  return response.data;
}
