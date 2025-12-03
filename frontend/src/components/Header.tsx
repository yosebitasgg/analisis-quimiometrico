import { NavLink } from 'react-router-dom';
import { BarChart3, Database, HelpCircle, Brain, Fingerprint, FileText, GraduationCap } from 'lucide-react';
import { useTeaching } from '../context/TeachingContext';

export default function Header() {
  const { isTeachingMode, toggleTeachingMode } = useTeaching();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
      isActive
        ? 'bg-primary-100 text-primary-700 font-medium'
        : 'text-secondary-600 hover:bg-gray-100'
    }`;

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <img src="/tec.svg" alt="Tec de Monterrey" className="w-10 h-10" />
            <div className="h-8 w-px bg-gray-300" />
            <div>
              <h1 className="text-lg font-semibold text-secondary-800">
                Chemometrics Helper
              </h1>
              <p className="text-xs text-secondary-500">
                Aplicación de métodos multivariados en ciencia de datos
              </p>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex items-center gap-1">
            <NavLink to="/analisis" className={linkClass}>
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Análisis</span>
            </NavLink>
            <NavLink to="/clasificador" className={linkClass}>
              <Brain className="w-4 h-4" />
              <span className="hidden md:inline">Clasificador</span>
            </NavLink>
            <NavLink to="/similitud" className={linkClass}>
              <Fingerprint className="w-4 h-4" />
              <span className="hidden md:inline">Similitud</span>
            </NavLink>
            <NavLink to="/reporte" className={linkClass}>
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">Reporte</span>
            </NavLink>
            <NavLink to="/datos" className={linkClass}>
              <Database className="w-4 h-4" />
              <span className="hidden md:inline">Datos</span>
            </NavLink>
            <NavLink to="/ayuda" className={linkClass}>
              <HelpCircle className="w-4 h-4" />
              <span className="hidden md:inline">Ayuda</span>
            </NavLink>

            {/* Separador */}
            <div className="h-6 w-px bg-gray-200 mx-2" />

            {/* Botón Modo Enseñanza */}
            <button
              onClick={toggleTeachingMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isTeachingMode
                  ? 'bg-yellow-100 text-yellow-700 font-medium ring-2 ring-yellow-300'
                  : 'text-secondary-600 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
              title={isTeachingMode ? 'Desactivar modo enseñanza' : 'Activar modo enseñanza'}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden lg:inline">
                {isTeachingMode ? 'Modo Enseñanza' : 'Tutorial'}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
