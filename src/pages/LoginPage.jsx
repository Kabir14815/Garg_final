import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

// ─── Phone + Password Login ───────────────────────────────────────────────────

function PhoneLoginForm({ onSuccess }) {
  const { loginWithPhonePassword } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await loginWithPhonePassword(phone.trim(), password)
      onSuccess('/dashboard')
    } catch (err) {
      setError(err.body?.detail || err.message || 'Invalid phone number or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="form-group">
        <label htmlFor="phone">Mobile number <span className="required-star">*</span></label>
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
            inputMode="numeric"
            maxLength={10}
            className="phone-input"
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="customer-password">Password <span className="required-star">*</span></label>
        <input
          id="customer-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>
      <button
        type="submit"
        className="login-btn"
        disabled={submitting || phone.length !== 10 || !password}
      >
        {submitting ? 'Logging in…' : 'Login'}
      </button>
    </form>
  )
}

// ─── Email + Password Login (Admin only — no registration) ───────────────────

function EmailLoginForm({ onSuccess }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      onSuccess('/')
    } catch (err) {
      setError(err.body?.detail || err.message || 'Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="form-group">
        <label htmlFor="admin-email">Email <span className="required-star">*</span></label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@garg.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="form-group">
        <label htmlFor="admin-password">Password <span className="required-star">*</span></label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={4}
          autoComplete="current-password"
        />
      </div>
      <button type="submit" className="login-btn" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Login'}
      </button>
      <p className="admin-login-note">
        Admin access only. Contact the store owner for credentials.
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
                Enter your registered mobile number and password to access your savings dashboard.
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
