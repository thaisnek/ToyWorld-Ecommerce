import { useState, useEffect } from 'react';
import { adminApi, formatDate } from '../../services/api';

const STATUS_BADGE = { ACTIVE: 'badge-active', INACTIVE: 'badge-inactive', BANNED: 'badge-cancelled' };
const STATUS_LABEL = { ACTIVE: '🟢 Hoạt động', INACTIVE: '🟡 Tạm ngưng', BANNED: '🔴 Bị khóa' };
const ROLE_LABEL = { ADMIN: '👑 Admin', CUSTOMER: '👤 Khách hàng', SALES_STAFF: '💼 Nhân viên', DELIVERY_STAFF: '🚚 Giao hàng' };

export default function UsersPage({ showToast }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [detailUser, setDetailUser] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    adminApi.getUsers({ size: 100 })
      .then(data => setUsers(data?.content || data || []))
      .catch(() => showToast('Lỗi tải danh sách', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleStatus = async (id, status) => {
    if (!window.confirm(`Bạn muốn đổi trạng thái thành ${status}?`)) return;
    try {
      await adminApi.updateUserStatus(id, status);
      showToast('Đã cập nhật trạng thái');
      fetchUsers();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleRole = async (id, role) => {
    if (!window.confirm(`Bạn muốn đổi quyền thành ${role}?`)) return;
    try {
      await adminApi.updateUserRole(id, role);
      showToast('Đã cập nhật quyền');
      fetchUsers();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleViewDetail = async (id) => {
    try {
      const data = await adminApi.getUserById(id);
      setDetailUser(data);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const filtered = users.filter(u =>
    !search ||
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.userName?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <input className="search-input" placeholder="🔍 Tìm tên, email, username, SĐT..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Tổng: {filtered.length} người dùng</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">👥 Quản lý người dùng</div></div>
        <div className="card-body">
          {loading ? <div className="loading">⏳</div> : (
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày đăng ký</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.fullName}</strong>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>@{u.userName}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      {u.role === 'ADMIN' ? (
                        <span className="badge badge-confirmed">{ROLE_LABEL[u.role]}</span>
                      ) : (
                        <select className="filter-select" style={{ padding: '4px 8px', fontSize: 12 }}
                          value={u.role} onChange={e => handleRole(u.id, e.target.value)}>
                          <option value="CUSTOMER">👤 Khách hàng</option>
                          <option value="SALES_STAFF">💼 Nhân viên</option>
                          <option value="DELIVERY_STAFF">🚚 Giao hàng</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[u.status] || 'badge-inactive'}`}>
                        {STATUS_LABEL[u.status] || u.status}
                      </span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewDetail(u.id)} title="Xem chi tiết">👁️</button>
                        {u.role !== 'ADMIN' && (
                          <>
                            {u.status === 'ACTIVE' && (
                              <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleStatus(u.id, 'BANNED')} title="Khóa tài khoản">🔒</button>
                            )}
                            {u.status === 'BANNED' && (
                              <button className="btn btn-ghost btn-sm" style={{ color: '#16a34a' }} onClick={() => handleStatus(u.id, 'ACTIVE')} title="Mở khóa">🔓</button>
                            )}
                            {u.status === 'INACTIVE' && (
                              <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb' }} onClick={() => handleStatus(u.id, 'ACTIVE')} title="Kích hoạt">✅</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {detailUser && (
        <div className="modal-overlay" onClick={() => setDetailUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">👤 Chi tiết người dùng</div>
              <button className="modal-close" onClick={() => setDetailUser(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
                <h3 style={{ marginBottom: 4 }}>{detailUser.fullName}</h3>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>@{detailUser.userName}</div>
              </div>
              <table style={{ width: '100%', fontSize: 14 }}>
                <tbody>
                  <tr><td style={{ padding: '8px 0', color: '#6b7280' }}>ID</td><td style={{ fontWeight: 600 }}>{detailUser.id}</td></tr>
                  <tr><td style={{ padding: '8px 0', color: '#6b7280' }}>Email</td><td>{detailUser.email}</td></tr>
                  <tr><td style={{ padding: '8px 0', color: '#6b7280' }}>Điện thoại</td><td>{detailUser.phone || '—'}</td></tr>
                  <tr><td style={{ padding: '8px 0', color: '#6b7280' }}>Vai trò</td><td><span className="badge badge-confirmed">{ROLE_LABEL[detailUser.role] || detailUser.role}</span></td></tr>
                  <tr><td style={{ padding: '8px 0', color: '#6b7280' }}>Trạng thái</td><td><span className={`badge ${STATUS_BADGE[detailUser.status]}`}>{STATUS_LABEL[detailUser.status]}</span></td></tr>
                  <tr><td style={{ padding: '8px 0', color: '#6b7280' }}>Ngày tạo</td><td>{formatDate(detailUser.createdAt)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
