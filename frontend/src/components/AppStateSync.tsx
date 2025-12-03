import { useEffect } from 'react';
import { useTeaching } from '../context/TeachingContext';
import { AppState } from '../types';

interface Props {
  appState: AppState;
}

/**
 * Componente invisible que sincroniza el estado de la app con el contexto de enseñanza.
 * Esto permite que el tutorial sepa en qué paso está el usuario y auto-avance.
 */
export default function AppStateSync({ appState }: Props) {
  const { syncWithAppState } = useTeaching();

  useEffect(() => {
    syncWithAppState(appState);
  }, [appState, syncWithAppState]);

  return null;
}
