import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { getMetalRates } from '../api/client'
import { DEFAULT_METAL_RATES } from '../data/shopData'

const MetalRatesContext = createContext(null)

export function MetalRatesProvider({ children }) {
  const [rates, setRatesState] = useState(DEFAULT_METAL_RATES)
  const [loading, setLoading] = useState(true)

  const fetchRates = async () => {
    try {
      const data = await getMetalRates()
      setRatesState(data)
    } catch (_) {
      // Keep defaults if API unavailable
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  const setRates = (next) => {
    setRatesState((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  const value = useMemo(() => ({
    rates,
    setRates,
    fetchRates,
    loading,
    tickerItems: [
      { label: 'Gold 24K', value: rates.gold24k, unit: '/g' },
      { label: 'Gold 22K', value: rates.gold22k, unit: '/g' },
      { label: 'Silver', value: rates.silver, unit: '/g' },
      { label: 'Diamond Index', value: rates.diamondIndex, unit: '' },
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
