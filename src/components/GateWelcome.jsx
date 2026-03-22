import { useState, useEffect, useCallback } from 'react'
import './GateWelcome.css'

const WELCOME_SEEN_KEY = 'garg-welcome-seen'

export default function GateWelcome() {
  const [phase, setPhase] = useState('doors') // 'doors' | 'open' | 'text' | 'exit'
  const [visible, setVisible] = useState(true)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const closeWelcome = useCallback(() => {
    sessionStorage.setItem(WELCOME_SEEN_KEY, '1')
    setVisible(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !visible) return

    const delay = prefersReducedMotion ? 100 : 600
    const t1 = setTimeout(() => setPhase('open'), delay)
    const t2 = setTimeout(() => setPhase('text'), prefersReducedMotion ? 500 : 2000)
    const t3 = setTimeout(() => setPhase('exit'), prefersReducedMotion ? 2800 : 4400)
    const t4 = setTimeout(closeWelcome, prefersReducedMotion ? 3400 : 5000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [visible, prefersReducedMotion, closeWelcome])

  if (!visible) return null

  return (
    <div className={`gate-welcome gate-welcome--${phase}`} aria-live="polite">
      <button
        type="button"
        className="gate-welcome-skip"
        onClick={() => closeWelcome()}
        aria-label="Skip intro"
      >
        SKIP
      </button>

      <h1 className="gate-welcome-heading">WELCOME TO THE GARG JEWELLERS</h1>

      <div className="gate-welcome-illustration">
        <div className="gate-welcome-doors">
          <div
            className={`gate-door gate-door-left ${phase === 'open' || phase === 'text' || phase === 'exit' ? 'gate-door--open' : ''}`}
            style={{ backgroundImage: 'url(/images/gate-welcome.png)' }}
          />
          <div
            className={`gate-door gate-door-right ${phase === 'open' || phase === 'text' || phase === 'exit' ? 'gate-door--open' : ''}`}
            style={{ backgroundImage: 'url(/images/gate-welcome.png)' }}
          />
        </div>
      </div>

      <div className={`gate-welcome-text ${phase === 'text' || phase === 'exit' ? 'gate-welcome-text--visible' : ''}`}>
        <p className="gate-welcome-tagline">The House of Garg</p>
      </div>
    </div>
  )
}
