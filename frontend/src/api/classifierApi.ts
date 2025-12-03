import apiClient from './client';
import {
  ClassifierTrainRequest,
  ClassifierTrainResponse,
  ClassifierPredictRequest,
  ClassifierPredictResponse,
  ClassifierStatus
} from '../types';

/**
 * Entrena un clasificador supervisado
 */
export async function trainClassifier(request: ClassifierTrainRequest): Promise<ClassifierTrainResponse> {
  const response = await apiClient.post<ClassifierTrainResponse>('/classifier/train', request);
  return response.data;
}

/**
 * Realiza predicciones con un clasificador entrenado
 */
export async function predict(request: ClassifierPredictRequest): Promise<ClassifierPredictResponse> {
  const response = await apiClient.post<ClassifierPredictResponse>('/classifier/predict', request);
  return response.data;
}

/**
 * Obtiene el estado de los clasificadores entrenados
 */
export async function getClassifierStatus(sessionId: string): Promise<{ exito: boolean; clasificadores: ClassifierStatus }> {
  const response = await apiClient.get<{ exito: boolean; clasificadores: ClassifierStatus }>(
    `/classifier/status/${sessionId}`
  );
  return response.data;
}
