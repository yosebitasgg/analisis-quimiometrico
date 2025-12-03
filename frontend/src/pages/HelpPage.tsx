import { HelpCircle, BookOpen, BarChart3, Layers, TrendingUp, Lightbulb, Database, Users } from 'lucide-react';

export default function HelpPage() {
  const sections = [
    { id: 'intro', label: 'Introducción', icon: HelpCircle },
    { id: 'pca', label: 'Análisis PCA', icon: TrendingUp },
    { id: 'clustering', label: 'Clustering', icon: Layers },
    { id: 'flujo', label: 'Flujo de Trabajo', icon: BookOpen },
    { id: 'dataset', label: 'Dataset de Ejemplo', icon: Database },
    { id: 'autores', label: 'Autores', icon: Users },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex gap-6">
      {/* Barra lateral - Índice */}
      <aside className="w-56 flex-shrink-0" data-teaching-id="help-sidebar">
        <div className="sticky top-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-secondary-700 mb-3">Contenido</h3>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-600 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors text-left"
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div id="intro" className="card bg-gradient-to-br from-primary-50 to-white border-primary-100 scroll-mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-secondary-800">
                Guía de Ayuda
              </h1>
              <p className="text-sm text-secondary-500">
                Aprende a usar Chemometrics Helper
              </p>
            </div>
          </div>
          <p className="text-secondary-600">
            Esta herramienta te permite realizar análisis multivariado de datos químicos
            de forma sencilla, sin necesidad de programar. A continuación encontrarás
            explicaciones de los conceptos clave y consejos de interpretación.
          </p>
        </div>

        {/* PCA */}
        <div id="pca" className="card scroll-mt-6 !p-0 overflow-hidden" data-teaching-id="help-pca">
          <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2 bg-secondary-50 px-5 py-4 border-b border-secondary-100">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <span className="text-secondary-300">|</span>
            Análisis de Componentes Principales (PCA)
          </h2>
          <div className="p-5">

          <div className="space-y-4 text-secondary-600">
            <div>
              <h3 className="font-medium text-secondary-700 mb-2">¿Qué es PCA?</h3>
              <p>
                El PCA es una técnica que reduce la complejidad de tus datos. Si tienes
                muchas variables (por ejemplo, 11 áreas de picos de FAMEs), el PCA las
                combina en unas pocas <strong>componentes principales</strong> que
                capturan la mayor parte de la información.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                <span className="text-blue-300">|</span>
                Conceptos clave
              </h4>
              <ul className="space-y-2 text-blue-700 text-sm">
                <li>
                  <strong>Varianza explicada:</strong> Indica qué porcentaje de la
                  información total captura cada componente. PC1 siempre captura más
                  que PC2, y así sucesivamente.
                </li>
                <li>
                  <strong>Scores:</strong> Son las coordenadas de cada muestra en el
                  nuevo espacio de componentes principales. Muestras cercanas en el
                  gráfico de scores tienen perfiles similares.
                </li>
                <li>
                  <strong>Loadings:</strong> Indican cuánto contribuye cada variable
                  original a cada componente. Un loading alto (positivo o negativo)
                  significa que esa variable es importante para ese componente.
                </li>
                <li>
                  <strong>Biplot:</strong> Combina scores y loadings en un solo gráfico,
                  permitiendo ver qué variables "empujan" a las muestras en cierta dirección.
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Tips de interpretación</h4>
              <ul className="space-y-1 text-amber-700 text-sm list-disc list-inside">
                <li>
                  Puntos cercanos en el espacio de scores representan muestras con
                  perfiles químicos similares.
                </li>
                <li>
                  Si PC1 y PC2 explican más del 70-80% de la varianza, tienes una
                  buena representación en 2D.
                </li>
                <li>
                  Variables con loadings en la misma dirección están correlacionadas
                  positivamente; en direcciones opuestas, negativamente.
                </li>
              </ul>
            </div>
          </div>
          </div>
        </div>

        {/* Clustering */}
        <div id="clustering" className="card scroll-mt-6 !p-0 overflow-hidden" data-teaching-id="help-clustering">
          <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2 bg-secondary-50 px-5 py-4 border-b border-secondary-100">
            <Layers className="w-5 h-5 text-primary-600" />
            <span className="text-secondary-300">|</span>
            Análisis de Clúster
          </h2>
          <div className="p-5">
          <div className="space-y-4 text-secondary-600">
            <div>
              <h3 className="font-medium text-secondary-700 mb-2">¿Qué es el clustering?</h3>
              <p>
                El clustering agrupa automáticamente las muestras según su similitud.
                Es útil para descubrir patrones ocultos en tus datos, como diferentes
                tipos de biodiesel o niveles de concentración.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-secondary-700 mb-2">K-means</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Divide los datos en K grupos</li>
                  <li>Debes especificar el número de clústeres</li>
                  <li>Rápido y eficiente</li>
                  <li>Funciona bien con clústeres esféricos</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-secondary-700 mb-2">Jerárquico</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Crea una jerarquía de grupos (dendrograma)</li>
                  <li>Puedes elegir el corte después</li>
                  <li>Más interpretable visualmente</li>
                  <li>Diferentes tipos de enlace (Ward, completo, promedio)</li>
                </ul>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
              <h4 className="font-medium text-primary-800 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-primary-300">|</span>
                Silhouette Score
              </h4>
              <p className="text-primary-700 text-sm mb-2">
                El silhouette score mide qué tan bien están separados los clústeres:
              </p>
              <ul className="text-primary-700 text-sm space-y-1">
                <li><strong>Cerca de +1:</strong> Muy buena separación, clústeres bien definidos</li>
                <li><strong>Cerca de 0:</strong> Clústeres superpuestos o ambiguos</li>
                <li><strong>Negativo:</strong> Posibles muestras mal asignadas</li>
              </ul>
              <p className="text-primary-700 text-sm mt-2">
                Usa el gráfico de silhouette vs k para elegir el número óptimo de clústeres.
              </p>
            </div>
          </div>
          </div>
        </div>

        {/* Flujo de trabajo */}
        <div id="flujo" className="card scroll-mt-6 !p-0 overflow-hidden" data-teaching-id="help-workflow">
          <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2 bg-secondary-50 px-5 py-4 border-b border-secondary-100">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <span className="text-secondary-300">|</span>
            Flujo de Trabajo Recomendado
          </h2>
          <div className="p-5">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-semibold">1</span>
              </div>
              <div>
                <h4 className="font-medium text-secondary-700">Cargar datos</h4>
                <p className="text-sm text-secondary-500">
                  Sube tu archivo CSV/Excel o usa el dataset de ejemplo para familiarizarte
                  con la herramienta.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-medium text-secondary-700">Preprocesar</h4>
                <p className="text-sm text-secondary-500">
                  Selecciona las variables numéricas relevantes. Se recomienda estandarizar
                  (autoscaling) para que todas las variables tengan el mismo peso en el análisis.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-semibold">3</span>
              </div>
              <div>
                <h4 className="font-medium text-secondary-700">Realizar PCA</h4>
                <p className="text-sm text-secondary-500">
                  Calcula PCA y revisa el scree plot. ¿Cuántos componentes necesitas para
                  explicar la mayor parte de la varianza? Explora los scores y loadings.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-semibold">4</span>
              </div>
              <div>
                <h4 className="font-medium text-secondary-700">Clustering (opcional)</h4>
                <p className="text-sm text-secondary-500">
                  Si quieres agrupar muestras, usa el análisis de silhouette para elegir
                  el número de clústeres y luego aplica K-means o jerárquico.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-semibold">5</span>
              </div>
              <div>
                <h4 className="font-medium text-secondary-700">Exportar resultados</h4>
                <p className="text-sm text-secondary-500">
                  Descarga los scores, loadings y etiquetas de clúster en formato CSV
                  para incluirlos en tu reporte.
                </p>
              </div>
            </li>
          </ol>
          </div>
        </div>

        {/* Sobre el dataset de ejemplo */}
        <div id="dataset" className="card scroll-mt-6 !p-0 overflow-hidden" data-teaching-id="help-dataset">
          <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2 bg-secondary-50 px-5 py-4 border-b border-secondary-100">
            <Database className="w-5 h-5 text-primary-600" />
            <span className="text-secondary-300">|</span>
            Sobre el Dataset de Ejemplo
          </h2>
          <div className="p-5">
          <div className="text-secondary-600 space-y-3">
            <p>
              El dataset de ejemplo contiene datos de ésteres metílicos de ácidos grasos
              (FAMEs) analizados por cromatografía de gases. Incluye:
            </p>

            <ul className="list-disc list-inside space-y-1">
              <li>11 variables numéricas (áreas de picos cromatográficos)</li>
              <li>
                <strong>feedstock:</strong> Origen del biodiesel
                <ul className="ml-6 text-sm">
                  <li>1 = Diesel, 2 = Animal Tallow (Texas), 3 = Animal Tallow (IRE)</li>
                  <li>4 = Canola, 5 = Waste Grease, 6 = Soybean, 7 = Desconocido</li>
                </ul>
              </li>
              <li>
                <strong>concentration:</strong> Nivel de mezcla
                <ul className="ml-6 text-sm">
                  <li>1 = Diesel puro, 2 = B2, 3 = B5, 4 = B10, 5 = B20, 6 = B100, 7 = Desconocida</li>
                </ul>
              </li>
            </ul>

            <p>
              Este dataset es ideal para practicar PCA y clustering, ya que contiene
              grupos conocidos (feedstock y concentration) que puedes comparar con
              los resultados del análisis.
            </p>
          </div>
          </div>
        </div>

        {/* Autores */}
        <div id="autores" className="card scroll-mt-6 !p-0 overflow-hidden" data-teaching-id="help-authors">
          <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2 bg-secondary-50 px-5 py-4 border-b border-secondary-100">
            <Users className="w-5 h-5 text-primary-600" />
            <span className="text-secondary-300">|</span>
            Autores
          </h2>
          <div className="p-5">
            <div className="text-secondary-600 space-y-4">
              <p>
                Esta aplicación fue desarrollada como proyecto académico para el
                Tecnológico de Monterrey.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
                  <p className="font-semibold text-primary-800">Yoseba Michel Mireles Ahumada</p>
                  <p className="text-sm text-primary-600">A01612830</p>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
                  <p className="font-semibold text-primary-800">Luis Carlos Marrufo Padilla</p>
                  <p className="text-sm text-primary-600">A01638980</p>
                </div>
              </div>

              <p className="text-sm text-secondary-500 mt-4">
                Chemometrics Helper - Herramienta de análisis quimiométrico para biodiesel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
