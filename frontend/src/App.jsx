import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'

// Public pages
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import ProductPage from './pages/ProductPage'
import { WishlistPage, DeliveryPage, ContactsPage, NotFoundPage } from './pages/OtherPages'

// Admin pages
import AdminLoginPage from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminParser from './pages/admin/AdminParser'
import AdminSettings from './pages/admin/AdminSettings'

// Public layout wrapper
function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

// Admin guard
function RequireAuth({ children }) {
  const adminToken = useStore(s => s.adminToken)
  const location = useLocation()
  if (!adminToken) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/catalog" element={<PublicLayout><CatalogPage /></PublicLayout>} />
        <Route path="/category/:slug" element={<PublicLayout><CatalogPage /></PublicLayout>} />
        <Route path="/product/:id" element={<PublicLayout><ProductPage /></PublicLayout>} />
        <Route path="/wishlist" element={<PublicLayout><WishlistPage /></PublicLayout>} />
        <Route path="/delivery" element={<PublicLayout><DeliveryPage /></PublicLayout>} />
        <Route path="/contacts" element={<PublicLayout><ContactsPage /></PublicLayout>} />

        {/* ── Admin routes ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="parser" element={<AdminParser />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
