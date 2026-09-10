import { useEffect, useRef, useState } from 'react';

/**
 * Mide el ancho real de un elemento con ResizeObserver y lo devuelve como número.
 *
 * Se usa en las gráficas del dashboard en vez de dejar que Recharts mida su
 * contenedor internamente vía `<ResponsiveContainer width="100%">`: en Recharts
 * v3.10.1, dentro de un grid/flex donde el ancho depende de un porcentaje, el
 * <svg> interno a veces se queda fijo en un tamaño degenerado (8x8) desde el
 * primer montaje y nunca se recupera, ni siquiera con resizes reales del
 * contenedor posteriores. Pasarle un número explícito a los componentes de
 * Recharts (en vez de "100%") evita esa ruta de código por completo.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
