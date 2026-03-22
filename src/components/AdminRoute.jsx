import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protects /admin: only logged-in admin users can access. Others redirect to login or home.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="admin-route-loading">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Checking access…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!user.isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
