import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MetalRatesProvider } from './context/MetalRatesContext'
import { AuthProvider } from './context/AuthContext'
import GateWelcome from './components/GateWelcome'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminRoute from './components/AdminRoute'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MetalRatesProvider>
          <GateWelcome />
          <div className="top-bar" />
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:productId" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <div className="bottom-bar" />
        </MetalRatesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
