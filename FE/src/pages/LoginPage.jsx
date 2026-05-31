import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function LoginPage({ navigate }) {
  const { login } = useAuth();
  const [form, setForm]           = useState({ userName:'', password:'' });
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [serverError, setServerError] = useState('');

  const update = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(p=>({...p,[f]:''})); setServerError(''); };
  const validate = () => {
    const e = {};
    if (!form.userName.trim()) e.userName = 'Vui lòng nhập tên đăng nhập';
    if (!form.password)     e.password = 'Vui lòng nhập mật khẩu';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await login(form.userName, form.password);
      if (result.ok) {
        if (result.role === 'DELIVERY_STAFF') {
           window.location.href = '/admin/shipments';
        } else if (result.role === 'ADMIN' || result.role === 'SALES_STAFF') {
           window.location.href = '/admin'; // Force full load for admin to clear state if necessary, or use navigate
        } else {
           navigate('home'); 
        }
      }
      else setServerError(result.error || 'Đăng nhập thất bại');
    } catch { setServerError('Lỗi kết nối máy chủ'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page"><div className="auth-card">
      <div className="auth-left">
        <div className="auth-brand">🧸 ToyWorld</div>
        <h2>Chào mừng trở lại!</h2>
        <p>Đăng nhập để xem đơn hàng, tích điểm thưởng và mua sắm dễ dàng hơn.</p>
        <div className="auth-features">
          <div className="af-item">⭐ Tích điểm với mỗi đơn hàng</div>
          <div className="af-item">📦 Theo dõi đơn hàng real-time</div>
          <div className="af-item">💝 Ưu đãi dành riêng cho thành viên</div>
        </div>
      </div>
      <div className="auth-right">
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-sub">Chưa có tài khoản? <button className="auth-link" onClick={() => navigate('register')}>Đăng ký ngay</button></p>
        {serverError && <div className="server-error">❌ {serverError}</div>}
        <div className="form-group">
          <label className="form-label">Tên đăng nhập (Username)</label>
          <input className={`form-input ${errors.userName?'error':''}`} type="text" placeholder="admin hoặc customer1" value={form.userName} onChange={e=>update('userName',e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
          {errors.userName && <div className="form-error">⚠️ {errors.userName}</div>}
        </div>
        <div className="form-group">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <label className="form-label" style={{ margin:0 }}>Mật khẩu</label>
            <button className="auth-link" style={{ fontSize:12 }}>Quên mật khẩu?</button>
          </div>
          <input className={`form-input ${errors.password?'error':''}`} type="password" placeholder="••••••••" value={form.password} onChange={e=>update('password',e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
          {errors.password && <div className="form-error">⚠️ {errors.password}</div>}
        </div>
        <button className="btn btn-primary btn-lg btn-full submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="btn-loading"><span className="spinner"/>Đang đăng nhập...</span> : '🔑 Đăng nhập'}
        </button>
      </div>
    </div></div>
  );
}

