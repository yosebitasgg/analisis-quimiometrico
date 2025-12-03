import apiClient from './client';
import { PCARequest, PCAResponse } from '../types';

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
