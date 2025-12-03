import axios from 'axios';

// Cliente axios configurado para la API
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const mensaje = error.response?.data?.detail || error.message || 'Error desconocido';
    console.error('Error en API:', mensaje);
    return Promise.reject(new Error(mensaje));
  }
);

export default apiClient;
