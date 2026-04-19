import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { getMetalRates } from '../api/client'
import { DEFAULT_METAL_RATES } from '../data/shopData'

const MetalRatesContext = createContext(null)

export function MetalRatesProvider({ children }) {
  const [rates, setRatesState] = useState(DEFAULT_METAL_RATES)
  const [loading, setLoading] = useState(true)

  const fetchRates = useCallback(async () => {
    try {
      const data = await getMetalRates()
      setRatesState(data)
    } catch (_) {
      // Keep defaults if API unavailable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    // Poll often enough to pick up server refreshes (backend TTL defaults to 1h).
    const id = setInterval(fetchRates, 3 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRates()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchRates])

  const setRates = (next) => {
    setRatesState((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  const value = useMemo(() => ({
    rates,
    setRates,
    fetchRates,
    loading,
    tickerItems: [
      { label: 'Gold 22K', value: rates.gold22k, unit: '/g' },
      { label: 'Silver', value: rates.silver, unit: '/g' },
      { label: 'Diamond Index', value: rates.diamondIndex, unit: '' },
      { label: 'Gold 24K', value: rates.gold24k, unit: '/g' },
      ...(rates.bronze != null && rates.bronze > 0 ? [{ label: 'Bronze', value: rates.bronze, unit: '/g' }] : []),
    ],
  }), [rates, loading])

  return (
    <MetalRatesContext.Provider value={value}>
      {children}
    </MetalRatesContext.Provider>
  )
}

export function useMetalRates() {
  const ctx = useContext(MetalRatesContext)
  if (!ctx) throw new Error('useMetalRates must be used within MetalRatesProvider')
  return ctx
}
