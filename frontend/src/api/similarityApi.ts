import apiClient from './client';
import {
  SimilaritySearchRequest,
  SimilaritySearchResponse,
  SamplesListResponse
} from '../types';

/**
 * Busca las k muestras más similares a una muestra de referencia
 */
export async function searchSimilar(request: SimilaritySearchRequest): Promise<SimilaritySearchResponse> {
  const response = await apiClient.post<SimilaritySearchResponse>('/similarity/search', request);
  return response.data;
}

/**
 * Obtiene las distancias de una muestra a todas las demás
 */
export async function getDistances(
  sessionId: string,
  sampleIndex: number,
  space: 'pca' | 'original' = 'pca',
  metric: 'euclidean' | 'cosine' = 'euclidean'
): Promise<{
  exito: boolean;
  mensaje: string;
  sample_index: number;
  puntos: Array<{
    indice: number;
    distancia: number;
    es_referencia: boolean;
    pc1?: number;
    pc2?: number;
    feedstock?: number;
    concentration?: number;
  }>;
  metric: string;
  space: string;
}> {
  const response = await apiClient.get(
    `/similarity/distances/${sessionId}/${sampleIndex}`,
    { params: { space, metric } }
  );
  return response.data;
}

/**
 * Lista todas las muestras disponibles con sus metadatos
 */
export async function getSamplesList(sessionId: string): Promise<SamplesListResponse> {
  const response = await apiClient.get<SamplesListResponse>(`/similarity/samples/${sessionId}`);
  return response.data;
}
