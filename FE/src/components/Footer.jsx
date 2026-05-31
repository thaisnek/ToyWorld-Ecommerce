import "./Footer.css";

export default function Footer({ navigate }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">🧸 Toy<span>World</span></div>
          <p>Thế giới đồ chơi an toàn, chất lượng cho trẻ em Việt Nam. Mang niềm vui đến mọi gia đình.</p>
          <div className="footer-socials">
            <a href="#" className="social-btn">📘 Facebook</a>
            <a href="#" className="social-btn">📸 Instagram</a>
            <a href="#" className="social-btn">▶️ YouTube</a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Khám phá</h4>
          <button onClick={() => navigate("home")}>Trang chủ</button>
          <button onClick={() => navigate("products")}>Tất cả sản phẩm</button>
          <button onClick={() => navigate("products")}>Sản phẩm mới</button>
          <button onClick={() => navigate("products")}>Khuyến mãi</button>
        </div>
        <div className="footer-col">
          <h4>Tài khoản</h4>
          <button onClick={() => navigate("login")}>Đăng nhập</button>
          <button onClick={() => navigate("register")}>Đăng ký</button>
          <button onClick={() => navigate("orders")}>Đơn hàng của tôi</button>
          <button onClick={() => navigate("profile")}>Hồ sơ cá nhân</button>
        </div>
        <div className="footer-col">
          <h4>Hỗ trợ</h4>
          <a href="#">Chính sách đổi trả</a>
          <a href="#">Hướng dẫn mua hàng</a>
          <a href="#">Câu hỏi thường gặp</a>
          <a href="#">Liên hệ chúng tôi</a>
          <div className="footer-contact">
            <div>📞 1800 1234</div>
            <div>✉️ hello@toyworld.vn</div>
            <div>⏰ 8:00 - 22:00 mỗi ngày</div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 ToyWorld — Đồ chơi an toàn cho trẻ em Việt Nam</span>
        <div className="footer-payment">
          <span>💳</span><span>🏦</span><span>📱</span>
        </div>
      </div>
    </footer>
  );
}

