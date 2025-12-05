import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export const WELCOME_TOUR_STORAGE_KEY = 'chemometrics_welcome_tour_seen';

interface WelcomeTourContextType {
  showTour: boolean;
  openTour: () => void;
  closeTour: () => void;
  resetTour: () => void;
}

const WelcomeTourContext = createContext<WelcomeTourContextType | null>(null);

export function WelcomeTourProvider({ children }: { children: ReactNode }) {
  const [showTour, setShowTour] = useState(false);

  // Mostrar tour solo la primera vez
  useEffect(() => {
    const hasSeen = localStorage.getItem(WELCOME_TOUR_STORAGE_KEY);
    if (!hasSeen) {
      // Pequeño delay para que la app monte completamente
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Abrir el tour
  const openTour = useCallback(() => {
    setShowTour(true);
  }, []);

  // Cerrar tour y guardar en localStorage
  const closeTour = useCallback(() => {
    localStorage.setItem(WELCOME_TOUR_STORAGE_KEY, 'true');
    setShowTour(false);
  }, []);

  // Reset: quitar de localStorage y abrir el tour de nuevo
  const resetTour = useCallback(() => {
    localStorage.removeItem(WELCOME_TOUR_STORAGE_KEY);
    setShowTour(true);
  }, []);

  return (
    <WelcomeTourContext.Provider value={{ showTour, openTour, closeTour, resetTour }}>
      {children}
    </WelcomeTourContext.Provider>
  );
}

export function useWelcomeTour() {
  const context = useContext(WelcomeTourContext);
  if (!context) {
    throw new Error('useWelcomeTour debe ser usado dentro de WelcomeTourProvider');
  }
  return context;
}
