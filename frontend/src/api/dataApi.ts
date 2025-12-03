import apiClient from './client';
import {
  DataUploadResponse,
  PreprocessingRequest,
  PreprocessingResponse,
  CorrelationResponse
} from '../types';

/**
 * Sube un archivo al servidor
 */
export async function uploadFile(file: File): Promise<DataUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<DataUploadResponse>('/data/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Carga el dataset de ejemplo
 */
export async function loadExampleDataset(): Promise<DataUploadResponse> {
  const response = await apiClient.post<DataUploadResponse>('/data/cargar-ejemplo');
  return response.data;
}

/**
 * Aplica preprocesamiento a los datos
 */
export async function preprocessData(request: PreprocessingRequest): Promise<PreprocessingResponse> {
  const response = await apiClient.post<PreprocessingResponse>('/data/preprocesar', request);
  return response.data;
}

/**
 * Obtiene la matriz de correlación
 */
export async function getCorrelation(sessionId: string): Promise<CorrelationResponse> {
  const response = await apiClient.get<CorrelationResponse>(`/data/correlacion/${sessionId}`);
  return response.data;
}

/**
 * Obtiene información de la sesión
 */
export async function getSessionInfo(sessionId: string) {
  const response = await apiClient.get(`/data/info/${sessionId}`);
  return response.data;
}

/**
 * Descarga los resultados como CSV
 */
export async function downloadResults(
  sessionId: string,
  incluirScores = true,
  incluirClusters = true,
  incluirCategoricas = true
): Promise<Blob> {
  const params = new URLSearchParams({
    incluir_scores: String(incluirScores),
    incluir_clusters: String(incluirClusters),
    incluir_categoricas: String(incluirCategoricas),
  });

  const response = await apiClient.get(`/data/exportar/${sessionId}?${params}`, {
    responseType: 'blob',
  });

  return response.data;
}

/**
 * Descarga los loadings como CSV
 */
export async function downloadLoadings(sessionId: string): Promise<Blob> {
  const response = await apiClient.get(`/data/exportar-loadings/${sessionId}`, {
    responseType: 'blob',
  });

  return response.data;
}
