import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AuthPages.css";

export default function RegisterPage({ navigate }) {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    userName: "",
    email: "",
    phone: "",
    password: "",
    confirm: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const update = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => ({ ...p, [f]: "" }));
  };

  const validate = () => {
    const e = {};

    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên";

    if (!form.userName.trim()) e.userName = "Vui lòng nhập tên đăng nhập";
    else if (/\s/.test(form.userName)) e.userName = "Tên đăng nhập không có khoảng trắng";

    if (!form.email.trim()) e.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email không hợp lệ";

    if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
    else if (!/^0\d{9}$/.test(form.phone)) e.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";

    if (!form.password) e.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự";

    if (!form.confirm) e.confirm = "Vui lòng xác nhận mật khẩu";
    else if (form.confirm !== form.password) e.confirm = "Mật khẩu xác nhận không khớp";

    if (!agreed) e.agreed = "Vui lòng đồng ý với điều khoản sử dụng";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 900));

    const result = await register({
      name: form.name,
      userName: form.userName,
      email: form.email,
      phone: form.phone,
      password: form.password
    });

    if (result.ok) {
      navigate("home");
    } else {
      setErrors({ server: result.error || "Đăng ký thất bại" });
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="auth-brand">🧸 ToyWorld</div>
          <h2>Tham gia ToyWorld!</h2>
          <p>Tạo tài khoản để bắt đầu hành trình mua sắm đồ chơi thú vị cùng chúng tôi.</p>
          <div className="auth-features">
            <div className="af-item">🎁 Nhận ngay voucher 50k khi đăng ký</div>
            <div className="af-item">⭐ Tích điểm mỗi lần mua hàng</div>
            <div className="af-item">🚚 Miễn phí ship đơn đầu tiên</div>
          </div>
        </div>

        <div className="auth-right">
          <h1 className="auth-title">Đăng ký tài khoản</h1>
          <p className="auth-sub">
            Đã có tài khoản?{" "}
            <button className="auth-link" onClick={() => navigate("login")}>
              Đăng nhập
            </button>
          </p>
          {errors.server && <div className="server-error">❌ {errors.server}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Họ và tên *</label>
              <input
                className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={e => update("name", e.target.value)}
              />
              {errors.name && <div className="form-error">⚠️ {errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Tên đăng nhập *</label>
              <input
                className={`form-input ${errors.userName ? "error" : ""}`}
                placeholder="nguyenvana"
                value={form.userName}
                onChange={e => update("userName", e.target.value)}
              />
              {errors.userName && <div className="form-error">⚠️ {errors.userName}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số điện thoại *</label>
              <input
                className={`form-input ${errors.phone ? "error" : ""}`}
                placeholder="0901234567"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
              />
              {errors.phone && <div className="form-error">⚠️ {errors.phone}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className={`form-input ${errors.email ? "error" : ""}`}
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => update("email", e.target.value)}
              />
              {errors.email && <div className="form-error">⚠️ {errors.email}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <input
                className={`form-input ${errors.password ? "error" : ""}`}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => update("password", e.target.value)}
              />
              {errors.password && <div className="form-error">⚠️ {errors.password}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu *</label>
              <input
                className={`form-input ${errors.confirm ? "error" : ""}`}
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => update("confirm", e.target.value)}
              />
              {errors.confirm && <div className="form-error">⚠️ {errors.confirm}</div>}
            </div>
          </div>

          <label className="agree-row">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => {
                setAgreed(e.target.checked);
                setErrors(p => ({ ...p, agreed: "" }));
              }}
            />
            <span>
              Tôi đồng ý với{" "}
              <button className="auth-link">Điều khoản sử dụng</button> và{" "}
              <button className="auth-link">Chính sách bảo mật</button>
            </span>
          </label>

          {errors.agreed && <div className="form-error">⚠️ {errors.agreed}</div>}

          <button
            className="btn btn-primary btn-lg btn-full submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Đang tạo tài khoản...
              </span>
            ) : (
              "🎉 Tạo tài khoản"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
