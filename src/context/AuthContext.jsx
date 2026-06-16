import { createContext, useContext, useState, useEffect } from 'react'
import {
  login as apiLogin,
  register as apiRegister,
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
} from '../api/client'

const STORAGE_KEY = 'garg-user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser({ ...parsed, isAdmin: !!parsed.isAdmin })
      }
    } catch (_) {}
    setLoading(false)
  }, [])

  /** Email + password login (admin / registered users) */
  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    const userData = {
      email: data.email,
      name: data.name,
      isAdmin: !!data.is_admin,
      loginType: 'email',
    }
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return userData
  }

  const register = async (email, password, name) => {
    const data = await apiRegister(email, password, name)
    const userData = {
      email: data.email,
      name: data.name,
      isAdmin: !!data.is_admin,
      loginType: 'email',
    }
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return userData
  }

  /** Send OTP to a phone number (step 1 of phone login) */
  const sendOtp = async (phone) => {
    return apiSendOtp(phone)
  }

  /** Verify OTP and sign in as a phone user (step 2 of phone login).
   *  `formName` is the name the customer typed in the login form — it takes
   *  priority over any name returned from the backend (which derives from kitty enrollments). */
  const loginWithPhone = async (phone, otp, formName) => {
    const data = await apiVerifyOtp(phone, otp)
    const userData = {
      phone: data.phone,
      // prefer the name the customer just entered; fall back to kitty-derived name
      name: formName || data.name || null,
      isAdmin: false,
      loginType: 'phone',
    }
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value = { user, loading, login, register, sendOtp, loginWithPhone, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
