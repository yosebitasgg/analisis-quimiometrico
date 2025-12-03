import apiClient from './client';
import {
  ClusteringRequest,
  ClusteringResponse,
  SilhouetteAnalysisResponse,
  SilhouetteSamplesResponse
} from '../types';

/**
 * Calcula el análisis de clustering
 */
export async function calculateClustering(request: ClusteringRequest): Promise<ClusteringResponse> {
  const response = await apiClient.post<ClusteringResponse>('/clustering/calcular', request);
  return response.data;
}

/**
 * Obtiene análisis de silhouette para diferentes k
 */
export async function getSilhouetteAnalysis(
  sessionId: string,
  kMin = 2,
  kMax = 10,
  usarPca = true
): Promise<SilhouetteAnalysisResponse> {
  const params = new URLSearchParams({
    k_min: String(kMin),
    k_max: String(kMax),
    usar_pca: String(usarPca),
  });

  const response = await apiClient.get<SilhouetteAnalysisResponse>(
    `/clustering/silhouette-analisis/${sessionId}?${params}`
  );

  return response.data;
}

/**
 * Obtiene silhouette por muestra
 */
export async function getSilhouetteSamples(
  sessionId: string,
  usarPca = true
): Promise<SilhouetteSamplesResponse> {
  const params = new URLSearchParams({
    usar_pca: String(usarPca),
  });

  const response = await apiClient.get<SilhouetteSamplesResponse>(
    `/clustering/silhouette-muestras/${sessionId}?${params}`
  );

  return response.data;
}

/**
 * Obtiene los resultados de clustering sin recalcular
 */
export async function getClusteringResults(sessionId: string): Promise<ClusteringResponse> {
  const response = await apiClient.get<ClusteringResponse>(`/clustering/resultados/${sessionId}`);
  return response.data;
}
