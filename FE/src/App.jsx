import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Outlet, Navigate, useOutletContext } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./styles/globals.css";

// --- User Pages ---
import HomePage from "./pages/HomePage";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import MessagePage from "./pages/MessagePage";

// --- Admin Pages ---
import AdminDashboard      from './admin/pages/Dashboard';
import AdminOrdersPage     from './admin/pages/OrdersPage';
import AdminShipmentsPage  from './admin/pages/ShipmentsPage';
import AdminProductsPage   from './admin/pages/ProductsPage';
import AdminCategoriesPage from './admin/pages/CategoriesPage';
import AdminSuppliersPage  from './admin/pages/SuppliersPage';
import AdminUsersPage      from './admin/pages/UsersPage';
import AdminReviewsPage    from './admin/pages/ReviewsPage';
import AdminVouchersPage   from './admin/pages/VouchersPage';
import AdminLoyaltyPage    from './admin/pages/LoyaltyPage';
import './admin/styles.css'; // Will be wrapped to prevent conflicts

// ==========================================
// USER LAYOUT
// ==========================================
function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Create a mock navigate function to pass down to legacy components
  const legacyNavigate = (page, data = null) => {
    const routes = {
      home: '/', products: '/products', cart: '/cart', 
      checkout: '/checkout', login: '/login', register: '/register', 
      profile: '/profile', orders: '/orders', messages: '/messages'
    };
    if (page === 'product-detail' && data) {
      navigate(`/product/${data.id}`, { state: { product: data, ...data } });
    } else {
      navigate(routes[page] || '/', data ? { state: data } : undefined);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Determine currentPage for Header
  const path = location.pathname;
  let currentPage = 'home';
  if (path.includes('/products')) currentPage = 'products';
  else if (path.includes('/cart')) currentPage = 'cart';

  return (
    <div className="app">
      <Header navigate={legacyNavigate} currentPage={currentPage} />
      <main className="main-wrapper">
        <Outlet context={{ navigate: legacyNavigate }} />
      </main>
      <Footer navigate={legacyNavigate} />
    </div>
  );
}

// Wrapper for pages that expect navigate and product from Outlet context or location state
function LegacyPageWrapper({ Component }) {
  const location = useLocation();
  const navigate = useNavigate();
  const legacyNavigate = (page, data = null) => {
    const routes = {
      home: '/', products: '/products', cart: '/cart', 
      checkout: '/checkout', login: '/login', register: '/register', 
      profile: '/profile', orders: '/orders', messages: '/messages'
    };
    if (page === 'product-detail' && data) {
      navigate(`/product/${data.id}`, { state: { product: data, ...data } });
    } else {
      navigate(routes[page] || '/', data ? { state: data } : undefined);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return <Component navigate={legacyNavigate} product={location.state?.product} routeState={location.state} />;
}

// ==========================================
// ADMIN LAYOUT
// ==========================================
const NAV = [
  { key:'dashboard',   path:'/admin',           label:'Dashboard',      icon:'📊' },
  { key:'orders',      path:'/admin/orders',    label:'Đơn hàng',       icon:'📦' },
  { key:'products',    path:'/admin/products',  label:'Sản phẩm',       icon:'🧸' },
  { key:'categories',  path:'/admin/categories',label:'Danh mục',       icon:'📂' },
  { key:'suppliers',   path:'/admin/suppliers', label:'Nhà cung cấp',   icon:'🚚' },
  { key:'users',       path:'/admin/users',     label:'Người dùng',     icon:'👥' },
  { key:'reviews',     path:'/admin/reviews',   label:'Đánh giá',       icon:'⭐' },
  { key:'vouchers',    path:'/admin/vouchers',  label:'Voucher',         icon:'🏷️' },
  { key:'loyalty',     path:'/admin/loyalty',   label:'Điểm thưởng',    icon:'🎁' },
  { key:'messages',    path:'/admin/messages',  label:'Tin nhắn',        icon:'💬' },
];

const EXTRA_NAV = [
  { key:'shipments', path:'/admin/shipments', label:'Giao hang', icon:'GH' },
];

const ROLE_NAV_KEYS = {
  ADMIN: ['dashboard', 'orders', 'shipments', 'products', 'categories', 'suppliers', 'users', 'reviews', 'vouchers', 'loyalty', 'messages'],
  SALES_STAFF: ['dashboard', 'orders', 'shipments', 'messages'],
  DELIVERY_STAFF: ['shipments'],
};

function AdminLayout() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  if (loading) return <div className="loading">⏳ Đang tải...</div>;
  if (!user || !ROLE_NAV_KEYS[user.role]) return <Navigate to="/login" />;

  const allNav = [...NAV, ...EXTRA_NAV];
  const allowedKeys = ROLE_NAV_KEYS[user.role] || [];
  const allowedNav = allowedKeys
    .map((key) => allNav.find((item) => item.key === key))
    .filter(Boolean);
  const defaultPath = allowedNav[0]?.path || '/';
  const canAccessCurrentPath = allowedNav.some((item) =>
    location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
  );

  if (!canAccessCurrentPath) return <Navigate to={defaultPath} replace />;

  const showToast = (msg, type='success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3000); 
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentNav = allowedNav.find(n => location.pathname === n.path || location.pathname.startsWith(n.path) && n.path !== '/admin') || allowedNav[0];

  return (
    <div className="admin-layout-wrapper">
      <div className="admin-layout">
        {toast && (
          <div className="toast-container">
            <div className={`toast-msg ${toast.type}`}>{toast.msg}</div>
          </div>
        )}
        
        <aside className="sidebar">
          <div className="sidebar-logo">🧸 ToyWorld Admin</div>
          <nav className="sidebar-nav">
            {allowedNav.map(n => (
              <button 
                key={n.key} 
                className={`nav-item ${location.pathname === n.path ? 'active' : ''}`} 
                onClick={() => navigate(n.path)}
              >
                <span className="nav-icon">{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}>🚪 Đăng xuất</button>
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <div className="topbar-title">{currentNav.label}</div>
            <div className="topbar-user">👤 {user.fullName} <span style={{ fontSize:11, color:'#9ca3af' }}>({user.role})</span></div>
          </header>
          <main className="page-content">
            <Outlet context={{ showToast }} />
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminPage({ Component }) {
  const context = useOutletContext();
  return <Component showToast={context?.showToast} />;
}


// ==========================================
// APP COMPONENT
// ==========================================
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Public & Customer Routes */}
          <Route element={<UserLayout />}>
            <Route path="/" element={<LegacyPageWrapper Component={HomePage} />} />
            <Route path="/products" element={<LegacyPageWrapper Component={ProductListPage} />} />
            <Route path="/product/:id" element={<LegacyPageWrapper Component={ProductDetailPage} />} />
            <Route path="/cart" element={<LegacyPageWrapper Component={CartPage} />} />
            <Route path="/checkout" element={<LegacyPageWrapper Component={CheckoutPage} />} />
            <Route path="/login" element={<LegacyPageWrapper Component={LoginPage} />} />
            <Route path="/register" element={<LegacyPageWrapper Component={RegisterPage} />} />
            <Route path="/profile" element={<LegacyPageWrapper Component={ProfilePage} />} />
            <Route path="/orders" element={<LegacyPageWrapper Component={OrderHistoryPage} />} />
            <Route path="/messages" element={<LegacyPageWrapper Component={MessagePage} />} />
            <Route path="/payment/result" element={<LegacyPageWrapper Component={PaymentResultPage} />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminPage Component={AdminDashboard} />} />
            <Route path="orders" element={<AdminPage Component={AdminOrdersPage} />} />
            <Route path="shipments" element={<AdminPage Component={AdminShipmentsPage} />} />
            <Route path="products" element={<AdminPage Component={AdminProductsPage} />} />
            <Route path="categories" element={<AdminPage Component={AdminCategoriesPage} />} />
            <Route path="suppliers" element={<AdminPage Component={AdminSuppliersPage} />} />
            <Route path="users" element={<AdminPage Component={AdminUsersPage} />} />
            <Route path="reviews" element={<AdminPage Component={AdminReviewsPage} />} />
            <Route path="vouchers" element={<AdminPage Component={AdminVouchersPage} />} />
            <Route path="loyalty" element={<AdminPage Component={AdminLoyaltyPage} />} />
            <Route path="messages" element={<AdminPage Component={() => <MessagePage />} />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

