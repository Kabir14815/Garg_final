import { useEffect, useRef, useState } from 'react'

const defaultOptions = { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }

export function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  const opts = { ...defaultOptions, ...options }

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true)
    }, opts)
    observer.observe(el)
    return () => observer.disconnect()
  }, [opts.rootMargin, opts.threshold])

  return [ref, inView]
}
