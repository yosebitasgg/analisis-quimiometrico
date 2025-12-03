import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TeachingStep, TeachingContextType, AppState } from '../types';

// Definición de todos los pasos del tutorial por página
const TEACHING_STEPS: TeachingStep[] = [
  // Página de Análisis
  {
    id: 'data-loader',
    target: '[data-teaching-id="data-loader"]',
    title: '1. Cargar Datos',
    description: 'Aquí puedes cargar tus datos experimentales. Puedes subir un archivo Excel o CSV, o usar el dataset de ejemplo incluido con perfiles de FAMEs.',
    position: 'right',
    page: '/analisis',
    requiredState: undefined, // No requiere estado previo
    actionHint: 'Haz clic en "Usar dataset de ejemplo (FAMEs)" para continuar',
    allowInteraction: true
  },
  {
    id: 'preprocessing',
    target: '[data-teaching-id="preprocessing"]',
    title: '2. Preprocesamiento',
    description: 'Selecciona las variables numéricas a analizar, decide cómo manejar valores faltantes y si deseas estandarizar los datos para que tengan la misma escala.',
    position: 'right',
    page: '/analisis',
    requiredState: 'dataLoaded',
    actionHint: 'Configura las opciones y haz clic en "Aplicar preprocesamiento"',
    allowInteraction: true
  },
  {
    id: 'pca-card',
    target: '[data-teaching-id="pca-card"]',
    title: '3. Análisis PCA',
    description: 'El Análisis de Componentes Principales reduce la dimensionalidad de tus datos. Selecciona cuántos componentes calcular y observa cuánta varianza explican.',
    position: 'right',
    page: '/analisis',
    requiredState: 'preprocessed',
    actionHint: 'Haz clic en "Calcular PCA" para continuar',
    allowInteraction: true
  },
  {
    id: 'clustering-card',
    target: '[data-teaching-id="clustering-card"]',
    title: '4. Clustering',
    description: 'Agrupa tus muestras automáticamente según su similitud química. Puedes usar K-means o clustering jerárquico.',
    position: 'right',
    page: '/analisis',
    requiredState: 'pcaCalculated',
    actionHint: 'Haz clic en "Calcular clustering" para agrupar las muestras',
    allowInteraction: true
  },
  {
    id: 'results-panel',
    target: '[data-teaching-id="results-panel"]',
    title: '5. Panel de Resultados',
    description: 'Aquí se muestran todos los gráficos y resultados: varianza explicada, scores, loadings, biplot, correlaciones y resultados de clustering.',
    position: 'left',
    page: '/analisis',
    requiredState: 'pcaCalculated',
    actionHint: 'Explora las diferentes pestañas de resultados',
    allowInteraction: true
  },

  // Página de Clasificador
  {
    id: 'classifier-config',
    target: '[data-teaching-id="classifier-config"]',
    title: 'Configurar Clasificador',
    description: 'Entrena un modelo de machine learning para predecir la materia prima (feedstock) o la concentración de biodiesel a partir del perfil químico.',
    position: 'right',
    page: '/clasificador',
    requiredState: 'preprocessed',
    actionHint: 'Configura el modelo y haz clic en "Entrenar Modelo"',
    allowInteraction: true
  },
  {
    id: 'classifier-metrics',
    target: '[data-teaching-id="classifier-metrics"]',
    title: 'Métricas del Modelo',
    description: 'Evalúa qué tan bien predice tu modelo: Accuracy es el porcentaje de aciertos, F1-Score balancea precisión y recall.',
    position: 'left',
    page: '/clasificador',
    allowInteraction: true
  },
  {
    id: 'classifier-predict',
    target: '[data-teaching-id="classifier-predict"]',
    title: 'Hacer Predicciones',
    description: 'Una vez entrenado el modelo, puedes predecir la clase de nuevas muestras introduciendo sus índices.',
    position: 'right',
    page: '/clasificador',
    actionHint: 'Ingresa índices de muestras y haz clic en "Predecir"',
    allowInteraction: true
  },

  // Página de Similitud
  {
    id: 'similarity-config',
    target: '[data-teaching-id="similarity-config"]',
    title: 'Búsqueda de Similitud',
    description: 'Selecciona una muestra de referencia y encuentra las más parecidas en tu dataset. Útil para identificar muestras con perfiles químicos similares.',
    position: 'right',
    page: '/similitud',
    requiredState: 'preprocessed',
    actionHint: 'Selecciona una muestra y haz clic en "Buscar Similares"',
    allowInteraction: true
  },
  {
    id: 'similarity-interpretation',
    target: '[data-teaching-id="similarity-interpretation"]',
    title: 'Interpretación',
    description: 'El sistema analiza automáticamente los resultados y te da una interpretación de qué significan las similitudes encontradas.',
    position: 'bottom',
    page: '/similitud',
    allowInteraction: true
  },

  // Página de Reporte
  {
    id: 'report-general',
    target: '[data-teaching-id="report-general"]',
    title: 'Resumen del Análisis',
    description: 'El reporte resume automáticamente todos los análisis realizados con interpretaciones en lenguaje natural.',
    position: 'bottom',
    page: '/reporte',
    requiredState: 'preprocessed',
    allowInteraction: true
  },
  {
    id: 'report-dataset',
    target: '[data-teaching-id="report-dataset"]',
    title: 'Información del Dataset',
    description: 'Estadísticas básicas de tus datos: número de muestras, variables analizadas y variables categóricas disponibles.',
    position: 'bottom',
    page: '/reporte',
    allowInteraction: true
  },

  // Página de Datos
  {
    id: 'data-summary',
    target: '[data-teaching-id="data-summary"]',
    title: 'Resumen del Dataset',
    description: 'Vista general de tus datos: número de filas (muestras), columnas totales, y cuántas son numéricas vs categóricas.',
    position: 'bottom',
    page: '/datos',
    requiredState: 'dataLoaded',
    allowInteraction: true
  },
  {
    id: 'data-columns',
    target: '[data-teaching-id="data-columns"]',
    title: 'Tipos de Variables',
    description: 'Las variables numéricas son las que se usan para el análisis (como áreas de picos). Las categóricas (feedstock, concentration) sirven para colorear y agrupar.',
    position: 'bottom',
    page: '/datos',
    allowInteraction: true
  },
  {
    id: 'data-preview',
    target: '[data-teaching-id="data-preview"]',
    title: 'Vista Previa de Datos',
    description: 'Aquí puedes ver las primeras filas de tu dataset para verificar que los datos se cargaron correctamente.',
    position: 'top',
    page: '/datos',
    allowInteraction: true
  },

  // Página de Ayuda
  {
    id: 'help-sidebar',
    target: '[data-teaching-id="help-sidebar"]',
    title: 'Índice de Contenidos',
    description: 'Navega rápidamente a las diferentes secciones de ayuda haciendo clic en los enlaces del índice.',
    position: 'right',
    page: '/ayuda',
    allowInteraction: true
  },
  {
    id: 'help-pca',
    target: '[data-teaching-id="help-pca"]',
    title: 'Guía de PCA',
    description: 'Aprende qué es el PCA, cómo interpretar varianza explicada, scores, loadings y el biplot.',
    position: 'left',
    page: '/ayuda',
    allowInteraction: true
  },
  {
    id: 'help-clustering',
    target: '[data-teaching-id="help-clustering"]',
    title: 'Guía de Clustering',
    description: 'Entiende las diferencias entre K-means y clustering jerárquico, y cómo usar el silhouette score.',
    position: 'left',
    page: '/ayuda',
    allowInteraction: true
  },
  {
    id: 'help-workflow',
    target: '[data-teaching-id="help-workflow"]',
    title: 'Flujo de Trabajo',
    description: 'Sigue estos pasos recomendados para realizar un análisis completo de tus datos.',
    position: 'left',
    page: '/ayuda',
    allowInteraction: true
  }
];

// Mapeo de estado a paso
const STATE_TO_STEP_MAP: Record<string, Record<string, number>> = {
  '/analisis': {
    'none': 0,           // data-loader
    'dataLoaded': 1,     // preprocessing
    'preprocessed': 2,   // pca-card
    'pcaCalculated': 3,  // clustering-card
    'clusteringCalculated': 4  // results-panel
  },
  '/clasificador': {
    'none': 0,           // classifier-config
    'classifierTrained': 1  // classifier-metrics -> luego predict
  },
  '/similitud': {
    'none': 0,           // similarity-config
    'similaritySearched': 1  // similarity-interpretation
  },
  '/reporte': {
    'none': 0,           // report-general
    'preprocessed': 0    // también empieza en 0
  },
  '/datos': {
    'none': 0,           // data-summary (requiere dataLoaded)
    'dataLoaded': 0      // empieza en 0
  },
  '/ayuda': {
    'none': 0            // help-sidebar - no requiere estado
  }
};

const TeachingContext = createContext<TeachingContextType | null>(null);

export function TeachingProvider({ children }: { children: ReactNode }) {
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [appStateRef, setAppStateRef] = useState<AppState | null>(null);
  const location = useLocation();
  const prevAppStateRef = useRef<AppState | null>(null);

  // Obtener pasos para la página actual
  const currentPageSteps = TEACHING_STEPS.filter(
    step => step.page === location.pathname
  );

  const totalSteps = currentPageSteps.length;

  // Determinar el paso inicial basado en el estado de la app
  const getInitialStep = useCallback((state: AppState | null, pathname: string): number => {
    if (!state) return 0;

    const pageMap = STATE_TO_STEP_MAP[pathname];
    if (!pageMap) return 0;

    // Encontrar el paso más avanzado según el estado
    if (pathname === '/analisis') {
      if (state.clusteringCalculated) return 4;
      if (state.pcaCalculated) return 3;
      if (state.preprocessed) return 2;
      if (state.dataLoaded) return 1;
    } else if (pathname === '/clasificador') {
      if (state.classifierTrained) return 1;
    } else if (pathname === '/similitud') {
      if (state.similaritySearched) return 1;
    }

    return 0;
  }, []);

  // Sincronizar con el estado de la app
  const syncWithAppState = useCallback((state: AppState) => {
    setAppStateRef(state);

    // Si está en modo enseñanza, auto-avanzar cuando cambie el estado
    if (isTeachingMode && prevAppStateRef.current) {
      const prev = prevAppStateRef.current;
      let newStep: number | null = null;

      // Detectar cambios de estado según la página actual
      if (location.pathname === '/analisis') {
        if (!prev.dataLoaded && state.dataLoaded) {
          newStep = 1; // preprocesamiento
        } else if (!prev.preprocessed && state.preprocessed) {
          newStep = 2; // PCA
        } else if (!prev.pcaCalculated && state.pcaCalculated) {
          newStep = 3; // clustering
        } else if (!prev.clusteringCalculated && state.clusteringCalculated) {
          newStep = 4; // resultados
        }
      } else if (location.pathname === '/clasificador') {
        if (!prev.classifierTrained && state.classifierTrained) {
          newStep = 1; // métricas del modelo
        }
      } else if (location.pathname === '/similitud') {
        if (!prev.similaritySearched && state.similaritySearched) {
          newStep = 1; // interpretación
        }
      }

      // Si hay cambio de paso, avanzar inmediatamente
      if (newStep !== null) {
        setCurrentStep(newStep);
      }
    }

    prevAppStateRef.current = state;
  }, [isTeachingMode, location.pathname]);

  const toggleTeachingMode = useCallback(() => {
    setIsTeachingMode(prev => {
      if (!prev) {
        // Al activar, ir al paso correspondiente según el estado actual
        const initialStep = getInitialStep(appStateRef, location.pathname);
        setCurrentStep(initialStep);
      }
      return !prev;
    });
  }, [appStateRef, location.pathname, getInitialStep]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
  }, [totalSteps]);

  const exitTeaching = useCallback(() => {
    setIsTeachingMode(false);
  }, []);

  // Resetear paso cuando cambia de página
  useEffect(() => {
    if (isTeachingMode) {
      const initialStep = getInitialStep(appStateRef, location.pathname);
      setCurrentStep(initialStep);
    }
  }, [location.pathname, isTeachingMode, appStateRef, getInitialStep]);

  return (
    <TeachingContext.Provider
      value={{
        isTeachingMode,
        toggleTeachingMode,
        currentStep,
        totalSteps,
        nextStep,
        prevStep,
        goToStep,
        exitTeaching,
        currentPageSteps,
        syncWithAppState
      }}
    >
      {children}
    </TeachingContext.Provider>
  );
}

export function useTeaching() {
  const context = useContext(TeachingContext);
  if (!context) {
    throw new Error('useTeaching debe usarse dentro de TeachingProvider');
  }
  return context;
}

export { TEACHING_STEPS };
