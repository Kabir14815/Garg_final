import { useMetalRates } from '../context/MetalRatesContext'
import './DigitalMetalMeter.css'

function MeterPane({ label, sublabel, value, unit, variant }) {
  const display = typeof value === 'number' ? value.toLocaleString('en-IN') : '—'
  return (
    <div className={`digital-meter-pane digital-meter-pane--${variant}`}>
      <div className="digital-meter-pane-head">
        <span className="digital-meter-label">{label}</span>
        {sublabel ? <span className="digital-meter-sublabel">{sublabel}</span> : null}
      </div>
      <div
        className="digital-meter-display"
        aria-label={`${label}${sublabel ? ` ${sublabel}` : ''}, ${display} rupees ${unit} per gram`}
      >
        <span className="digital-meter-currency">₹</span>
        <span className="digital-meter-digits">{display}</span>
        <span className="digital-meter-unit">{unit}</span>
      </div>
    </div>
  )
}

export default function DigitalMetalMeter({ className = '' }) {
  const { rates, loading } = useMetalRates()

  return (
    <div
      className={`digital-metal-meter ${className}`.trim()}
      role="region"
      aria-label="Gold and silver spot rates"
      aria-busy={loading}
    >
      <div className="digital-metal-meter-inner">
        <span className="digital-meter-eyebrow">Digital rate board</span>
        <div className={`digital-meter-panes ${loading ? 'is-loading' : ''}`}>
          <MeterPane
            label="Gold"
            sublabel="24K"
            value={rates.gold24k}
            unit="/g"
            variant="gold"
          />
          <MeterPane
            label="Silver"
            sublabel=""
            value={rates.silver}
            unit="/g"
            variant="silver"
          />
        </div>
      </div>
    </div>
  )
}
