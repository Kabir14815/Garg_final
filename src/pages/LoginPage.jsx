import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

// ─── OTP Countdown ───────────────────────────────────────────────────────────

function OTPCountdown({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
    if (seconds <= 0) return
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(id); onExpire?.(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [seconds])

  if (remaining <= 0) return null
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return (
    <span className="otp-countdown">
      OTP expires in {m}:{String(s).padStart(2, '0')}
    </span>
  )
}

// ─── Phone + OTP Login ────────────────────────────────────────────────────────

function PhoneLoginForm({ onSuccess }) {
  const { sendOtp, loginWithPhone } = useAuth()
  const [step, setStep] = useState('phone')  // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState(null)
  const [ttl, setTtl] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const otpRef = useRef(null)

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!phone.trim()) return
    setError('')
    setSubmitting(true)
    try {
      const res = await sendOtp(phone.trim())
      setTtl(res.expires_in || 300)
      setDevOtp(res.dev_otp || null)
      setOtp('')
      setStep('otp')
      setTimeout(() => otpRef.current?.focus(), 100)
    } catch (err) {
      setError(err.body?.detail || err.message || 'Failed to send OTP')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await loginWithPhone(phone.trim(), otp.trim())
      onSuccess('/dashboard')
    } catch (err) {
      setError(err.body?.detail || err.message || 'Invalid OTP')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(val)
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.form
            key="phone-step"
            onSubmit={handleSendOtp}
            className="login-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="form-group">
              <label htmlFor="phone">Mobile number</label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">+91</span>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  required
                  autoComplete="tel"
                  maxLength={10}
                  className="phone-input"
                />
              </div>
              <span className="form-hint">We'll send a 6-digit OTP to verify your number.</span>
            </div>
            <button type="submit" className="login-btn" disabled={submitting || phone.length < 10}>
              {submitting ? 'Sending OTP…' : 'Get OTP'}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="otp-step"
            onSubmit={handleVerifyOtp}
            className="login-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="otp-sent-notice">
              <span>OTP sent to <strong>+91 {phone}</strong></span>
              <button type="button" className="otp-change-btn" onClick={() => { setStep('phone'); setError('') }}>
                Change
              </button>
            </div>

            {devOtp && (
              <div className="dev-otp-badge">
                <span className="dev-badge-label">DEV MODE</span>
                <span>OTP: <strong>{devOtp}</strong></span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="otp">6-digit OTP</label>
              <input
                ref={otpRef}
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={handleOtpChange}
                placeholder="• • • • • •"
                required
                className="otp-input"
                autoComplete="one-time-code"
              />
              <div className="otp-meta">
                <OTPCountdown seconds={ttl} onExpire={() => setStep('phone')} />
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={() => { setStep('phone'); setError('') }}
                >
                  Resend OTP
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={submitting || otp.length !== 6}>
              {submitting ? 'Verifying…' : 'Verify & Continue'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Email + Password Login (Admin) ──────────────────────────────────────────

function EmailLoginForm({ onSuccess }) {
  const { login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) {
        await register(email, password, name || undefined)
      } else {
        await login(email, password)
      }
      onSuccess('/')
    } catch (err) {
      setError(err.body?.detail || err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <p className="login-error" role="alert">{error}</p>}
      {isRegister && (
        <div className="form-group">
          <label htmlFor="name-em">Name</label>
          <input
            id="name-em"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={4}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
      </div>
      <button type="submit" className="login-btn" disabled={submitting}>
        {submitting ? 'Please wait…' : (isRegister ? 'Register' : 'Login')}
      </button>
      <p className="login-toggle">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          className="login-toggle-btn"
          onClick={() => { setIsRegister(!isRegister); setError('') }}
        >
          {isRegister ? 'Login' : 'Register'}
        </button>
      </p>
    </form>
  )
}

// ─── Main Login Page ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const [tab, setTab] = useState('phone')  // 'phone' | 'email'
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const reduceMotion = useReducedMotion()

  const handleSuccess = (defaultPath) => {
    const target = from !== '/' ? from : defaultPath
    navigate(target, { replace: true })
  }

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
      >
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-mark">G</div>
          <div>
            <h1 className="login-title">The House of Garg</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="login-tabs">
          <button
            type="button"
            className={tab === 'phone' ? 'active' : ''}
            onClick={() => setTab('phone')}
          >
            🪙 Customer Login
          </button>
          <button
            type="button"
            className={tab === 'email' ? 'active' : ''}
            onClick={() => setTab('email')}
          >
            🔒 Admin Login
          </button>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'phone' ? (
            <motion.div
              key="phone-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <p className="login-tab-desc">
                Enter your registered mobile number to access your savings dashboard.
              </p>
              <PhoneLoginForm onSuccess={handleSuccess} />
            </motion.div>
          ) : (
            <motion.div
              key="email-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <p className="login-tab-desc">
                Admin access only. Use your registered email and password.
              </p>
              <EmailLoginForm onSuccess={handleSuccess} />
            </motion.div>
          )}
        </AnimatePresence>

        <Link to="/" className="login-back">← Back to home</Link>
      </motion.div>
    </div>
  )
}
