import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MetalRatesProvider } from './context/MetalRatesContext'
import { AuthProvider } from './context/AuthContext'
import GateWelcome from './components/GateWelcome'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminRoute from './components/AdminRoute'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))

function PageLoading() {
  return (
    <div className="page-loading" aria-busy="true">
      <div className="loading-spinner" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MetalRatesProvider>
          <GateWelcome />
          <div className="top-bar" />
          <Header />
          <main>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/book" element={<BookingPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:productId" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <div className="bottom-bar" />
        </MetalRatesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
