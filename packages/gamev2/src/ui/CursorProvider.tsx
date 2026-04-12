import { createContext, useCallback, useContext, useEffect, useState, useRef, type PropsWithChildren } from 'react';

export interface CursorState {
  x: number;
  y: number;
}

const CursorContext = createContext<CursorState>({ x: 0, y: 0 });

export const useCursor = () => useContext(CursorContext);

export const CursorProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<CursorState>({ x: 0, y: 0 });
  const stateRef = useRef(state);

  const updateCursor = useCallback((event: MouseEvent) => {
    const updated = { x: event.clientX, y: event.clientY };
    stateRef.current = updated;
    setState(updated);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', updateCursor);
    return () => window.removeEventListener('mousemove', updateCursor);
  }, [updateCursor]);

  return <CursorContext.Provider value={state}>{children}</CursorContext.Provider>;
};
