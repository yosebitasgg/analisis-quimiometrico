import apiClient from './client';
import { ReportSummaryResponse } from '../types';

/**
 * Obtiene un resumen completo del análisis realizado
 */
export async function getReportSummary(sessionId: string): Promise<ReportSummaryResponse> {
  const response = await apiClient.get<ReportSummaryResponse>(`/report/summary/${sessionId}`);
  return response.data;
}

/**
 * Descarga el reporte en formato PDF
 */
export async function downloadPDF(sessionId: string): Promise<Blob> {
  const response = await apiClient.get(`/report/pdf/${sessionId}`, {
    responseType: 'blob'
  });
  return response.data;
}

/**
 * Obtiene solo las interpretaciones textuales del análisis
 */
export async function getInterpretations(sessionId: string): Promise<{
  exito: boolean;
  interpretaciones: {
    pca: string | null;
    clustering: string | null;
    clasificador: string | null;
  };
}> {
  const response = await apiClient.get(`/report/interpretations/${sessionId}`);
  return response.data;
}
