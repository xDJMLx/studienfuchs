'use client'

import { useMemo, useRef, useEffect } from 'react'

/**
 * Hook für virtualisierte Listen: Renderiert nur sichtbare Items,
 * um Performance bei 1000+ Elementen zu halten.
 */
export function useVirtualizedList<T>(
  items: T[],
  options: {
    itemHeight: number
    containerHeight: number
    buffer?: number
  },
) {
  const { itemHeight, containerHeight, buffer = 5 } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useRef(0).current

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollY(container.scrollTop)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollY / itemHeight) - buffer)
    const end = Math.min(items.length, Math.ceil((scrollY + containerHeight) / itemHeight) + buffer)
    return { start, end }
  }, [scrollY, itemHeight, containerHeight, items.length, buffer])

  const visibleItems = useMemo(() => items.slice(visibleRange.start, visibleRange.end), [items, visibleRange])

  return {
    containerRef,
    visibleItems,
    offsetY: visibleRange.start * itemHeight,
    totalHeight: items.length * itemHeight,
  }
}
