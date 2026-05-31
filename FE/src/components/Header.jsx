import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export default function Header({ navigate, currentPage }) {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate("products");
  };

  const navLinks = [
    { key: "home",     label: "Trang chủ", icon: "🏠" },
    { key: "products", label: "Sản phẩm",  icon: "🧸" },
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <button className="logo" onClick={() => navigate("home")}>
          <span className="logo-icon">🧸</span>
          <span className="logo-text">Toy<span>World</span></span>
        </button>

        <nav className="header-nav">
          {navLinks.map(link => (
            <button
              key={link.key}
              className={`nav-link ${currentPage === link.key ? "active" : ""}`}
              onClick={() => navigate(link.key)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <form className="header-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm kiếm đồ chơi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">🔍</button>
        </form>

        <div className="header-actions">
          <button className="cart-btn" onClick={() => navigate("cart")}>
            🛒
            {count > 0 && <span className="cart-badge">{count > 99 ? "99+" : count}</span>}
          </button>

          {user ? (
            <div className="user-menu-wrap">
              <button className="user-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <span className="user-avatar">{user.avatar}</span>
                {/* Users.fullName */}
                <span className="user-name">{user.fullName.split(" ").pop()}</span>
                <span>▾</span>
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{user.avatar}</div>
                    <div>
                      {/* Users.fullName + Users.userName */}
                      <div className="dropdown-name">{user.fullName}</div>
                      {/* LoyaltyAccounts.currentPoints */}
                      <div className="dropdown-points">
                        ⭐ {user.loyaltyAccount?.currentPoints?.toLocaleString() || 0} điểm
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <button onClick={() => { navigate("profile"); setUserMenuOpen(false); }}>👤 Hồ sơ cá nhân</button>
                  <button onClick={() => { navigate("orders"); setUserMenuOpen(false); }}>📦 Đơn hàng của tôi</button>
                  <button onClick={() => { navigate("messages"); setUserMenuOpen(false); }}>💬 Tin nhắn</button>
                  <div className="dropdown-divider" />
                  <button className="logout-btn" onClick={() => { logout(); setUserMenuOpen(false); }}>🚪 Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-btns">
              <button className="btn btn-outline btn-sm" onClick={() => navigate("login")}>Đăng nhập</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("register")}>Đăng ký</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

