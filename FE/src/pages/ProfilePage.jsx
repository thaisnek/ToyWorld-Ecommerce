import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, loyaltyApi, formatPrice } from '../services/api';
import './ProfilePage.css';

const TABS = [
  { key:'info',     label:'👤 Thông tin cá nhân' },
  { key:'address',  label:'📍 Địa chỉ' },
  { key:'password', label:'🔒 Đổi mật khẩu' },
  { key:'points',   label:'⭐ Điểm thưởng' },
];

export default function ProfilePage({ navigate }) {
  const { user, logout, updateProfile } = useAuth();
  const [tab, setTab]         = useState('info');
  const [addresses, setAddresses] = useState([]);
  const [loyalty, setLoyalty]     = useState(null);
  const [loyaltyTxs, setLoyaltyTxs] = useState([]);
  const [form, setForm]       = useState({ name:'', phone:'', email:'', dob:'' });
  const [pwForm, setPwForm]   = useState({ current:'', newPw:'', confirm:'' });
  const [saved, setSaved]     = useState(false);
  const [pwError, setPwError] = useState('');
  const [addrForm, setAddrForm] = useState({ fullName:'', fullAddress:'', phone:'', isDefault:false });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.fullName || '', phone: user.phone || '', email: user.email || '', dob: '' });
    userApi.getAddresses().then(setAddresses).catch(() => {});
    loyaltyApi.getMyAccount().then(data => setLoyalty(data)).catch(() => {});
    loyaltyApi.getMyTransactions().then(data => setLoyaltyTxs(data?.content || data || [])).catch(() => {});
  }, [user]);

  if (!user) return (
    <div style={{ padding:'60px 20px', textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🔑</div>
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:12 }}>Vui lòng đăng nhập</h3>
      <button className="btn btn-primary btn-lg" onClick={() => navigate('login')}>Đăng nhập ngay</button>
    </div>
  );

  const handleSave = async () => {
    await userApi.updateProfile({ fullName: form.name, phone: form.phone, email: form.email });
    updateProfile({ fullName: form.name, phone: form.phone, email: form.email });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (!pwForm.current)                          { setPwError('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!pwForm.newPw || pwForm.newPw.length < 6) { setPwError('Mật khẩu mới ít nhất 6 ký tự'); return; }
    if (pwForm.newPw !== pwForm.confirm)           { setPwError('Mật khẩu xác nhận không khớp'); return; }
    setPwError(''); 
    
    try {
      await userApi.changePassword({
        oldPassword: pwForm.current,
        newPassword: pwForm.newPw,
        confirmPassword: pwForm.confirm
      });
      setPwForm({ current:'', newPw:'', confirm:'' });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setPwError(err.message || 'Lỗi đổi mật khẩu');
    }
  };

  const handleAddAddress = async () => {
    if (editingAddrId) {
      const updated = await userApi.updateAddress(editingAddrId, addrForm);
      setAddresses(prev => prev.map(a => a.id === editingAddrId ? updated : a));
    } else {
      const addr = await userApi.addAddress(addrForm);
      setAddresses(prev => [...prev, addr]);
    }
    setShowAddrForm(false); setAddrForm({ fullName:'', fullAddress:'', phone:'', isDefault:false }); setEditingAddrId(null);
  };

  const handleDeleteAddress = async (id) => {
    await userApi.deleteAddress(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleSetDefault = async (id) => {
    const updated = await userApi.setDefaultAddress(id);
    setAddresses(prev => prev.map(a => a.id === id ? updated : { ...a, isDefault: false }));
  };

  const openEditAddress = (addr) => {
    setEditingAddrId(addr.id);
    setAddrForm({ fullName: addr.fullName, fullAddress: addr.fullAddress, phone: addr.phone, isDefault: addr.isDefault });
    setShowAddrForm(true);
  };

  const points = loyalty?.currentPoints || 0;

  return (
    <div className="profile-page">
      <div className="profile-inner">
        <aside className="profile-sidebar">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{user.avatar || '👤'}</div>
            <div className="profile-name">{user.fullName}</div>
            <div className="profile-email">{user.email}</div>
            <div className="profile-points-badge">⭐ {points.toLocaleString()} điểm</div>
          </div>
          <nav className="profile-nav">
            {TABS.map(t => (
              <button key={t.key} className={`pnav-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
            <div className="pnav-divider" />
            <button className="pnav-btn" onClick={() => navigate('orders')}>📦 Đơn hàng của tôi</button>
            <button className="pnav-btn logout" onClick={() => { logout(); navigate('home'); }}>🚪 Đăng xuất</button>
          </nav>
        </aside>

        <div className="profile-main">
          {saved && <div className="save-toast">✅ Đã lưu thành công!</div>}

          {tab === 'info' && (
            <div className="profile-section">
              <h2 className="section-title">👤 Thông tin cá nhân</h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày sinh</label>
                  <input className="form-input" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleSave}>💾 Lưu thay đổi</button>
            </div>
          )}

          {tab === 'address' && (
            <div className="profile-section">
              <h2 className="section-title">📍 Địa chỉ giao hàng</h2>
              <div className="address-list">
                {addresses.map(addr => (
                  <div key={addr.id} className={`address-card ${addr.isDefault ? 'default' : ''}`}>
                    {addr.isDefault && <div className="addr-badge">Mặc định</div>}
                    <div className="addr-name">{addr.fullName} · {addr.phone}</div>
                    <div className="addr-detail">{addr.fullAddress}</div>
                    <div className="addr-actions">
                      {!addr.isDefault && <button className="btn btn-outline btn-sm" onClick={() => handleSetDefault(addr.id)}>Đặt mặc định</button>}
                      <button className="btn btn-outline btn-sm" onClick={() => openEditAddress(addr)}>Chỉnh sửa</button>
                      <button className="btn btn-light btn-sm" onClick={() => handleDeleteAddress(addr.id)}>Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
              {showAddrForm ? (
                <div style={{ marginTop:16, padding:20, background:'var(--light)', borderRadius:'var(--radius)', border:'1.5px solid var(--border)' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tên người nhận</label>
                      <input className="form-input" value={addrForm.fullName} onChange={e => setAddrForm(p => ({ ...p, fullName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số điện thoại</label>
                      <input className="form-input" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <input className="form-input" value={addrForm.fullAddress} onChange={e => setAddrForm(p => ({ ...p, fullAddress: e.target.value }))} />
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    <button className="btn btn-primary" onClick={handleAddAddress}>{editingAddrId ? 'Cập nhật' : 'Lưu địa chỉ'}</button>
                    <button className="btn btn-light" onClick={() => { setShowAddrForm(false); setEditingAddrId(null); setAddrForm({ fullName:'', fullAddress:'', phone:'', isDefault:false }); }}>Hủy</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-secondary" style={{ marginTop:16 }} onClick={() => setShowAddrForm(true)}>+ Thêm địa chỉ mới</button>
              )}
            </div>
          )}

          {tab === 'password' && (
            <div className="profile-section">
              <h2 className="section-title">🔒 Đổi mật khẩu</h2>
              {pwError && <div className="server-error" style={{ marginBottom:16 }}>❌ {pwError}</div>}
              {['current','newPw','confirm'].map((f, i) => (
                <div key={f} className="form-group" style={{ maxWidth:420 }}>
                  <label className="form-label">{['Mật khẩu hiện tại','Mật khẩu mới','Xác nhận mật khẩu mới'][i]}</label>
                  <input className="form-input" type="password" placeholder="••••••••"
                    value={pwForm[f]} onChange={e => setPwForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <button className="btn btn-primary" onClick={handleChangePassword}>🔒 Đổi mật khẩu</button>
            </div>
          )}

          {tab === 'points' && (
            <div className="profile-section">
              <h2 className="section-title">⭐ Chương trình tích điểm</h2>
              <div className="points-overview">
                <div className="points-big">
                  <div className="pts-num">{(loyalty?.currentPoints || 0).toLocaleString()}</div>
                  <div className="pts-label">Điểm tích lũy</div>
                </div>
                <div className="points-info">
                  <p>Tổng tích lũy: <strong>{(loyalty?.lifetimeEarnedPoints || 0).toLocaleString()}</strong> · Đã dùng: <strong>{(loyalty?.lifetimeSpentPoints || 0).toLocaleString()}</strong></p>
                  <div className="pts-rule">
                    <div className="rule-item">🛒 10.000đ mua hàng = 1 điểm</div>
                    <div className="rule-item">⭐ 100 điểm = Giảm 10.000đ</div>
                    <div className="rule-item">🎁 Điểm hết hạn sau 12 tháng</div>
                  </div>
                </div>
              </div>
              <div className="points-history">
                <h4>Lịch sử điểm</h4>
                {loyaltyTxs.length === 0 ? (
                  <div style={{ color:'var(--gray)', fontSize:13, padding:'12px 0' }}>Chưa có giao dịch điểm nào</div>
                ) : loyaltyTxs.map(tx => (
                  <div key={tx.id} className="pts-history-row">
                    <div>
                      <div className="pts-desc">{tx.note}</div>
                      <div className="pts-date">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div className={`pts-change ${tx.pointsChange > 0 ? 'plus' : 'minus'}`}>
                      {tx.pointsChange > 0 ? '+' : ''}{tx.pointsChange}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

