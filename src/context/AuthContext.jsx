import { createContext, useContext, useState, useEffect } from 'react'
import {
  login as apiLogin,
  loginWithPassword as apiLoginWithPassword,
  register as apiRegister,
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

  /** Phone number + password login for customer accounts. */
  const loginWithPhonePassword = async (phone, password) => {
    const data = await apiLoginWithPassword(phone, password)
    const userData = {
      id: data.id,
      phone: data.phone,
      email: data.email,
      name: data.name || null,
      isAdmin: !!data.is_admin,
      loginType: 'password',
    }
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value = { user, loading, login, register, loginWithPhonePassword, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
