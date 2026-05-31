import { useState, useEffect } from 'react';
import { adminApi, formatPrice } from '../../services/api';

function ProductSalesTable({ title, icon, products }) {
  return (
    <div className="card dashboard-sales-card">
      <div className="card-header">
        <div className="card-title">{icon} {title}</div>
      </div>
      <div className="card-body">
        <table className="dashboard-sales-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Đã bán</th>
            </tr>
          </thead>
          <tbody>
            {(products || []).length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-cell">Chưa có dữ liệu</td>
              </tr>
            ) : (
              products.map((product, index) => (
                <tr key={product.productId || index}>
                  <td><span className="rank-badge">{index + 1}</span></td>
                  <td><strong>{product.productName}</strong></td>
                  <td>{product.categoryName || '—'}</td>
                  <td><strong>{Number(product.soldQuantity || 0).toLocaleString()}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard({ showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => showToast('Không tải được dữ liệu', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">⏳ Đang tải dashboard...</div>;
  if (!stats) return null;

  return (
    <div>
      <div className="stat-grid">
        {[
          { icon: '📦', label: 'Tổng đơn hàng', value: stats.totalOrders?.toLocaleString(), sub: 'Tất cả trạng thái' },
          { icon: '🧸', label: 'Sản phẩm', value: stats.totalProducts?.toLocaleString(), sub: 'Đang bán' },
          { icon: '👥', label: 'Khách hàng', value: stats.totalUsers?.toLocaleString(), sub: 'Đã đăng ký' },
          { icon: '💰', label: 'Doanh thu', value: formatPrice(stats.revenue || 0), sub: 'Đơn đã giao' },
        ].map((item, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{item.icon}</div>
            <div>
              <div className="stat-label">{item.label}</div>
              <div className="stat-value">{item.value}</div>
              <div className="stat-sub">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {stats.pendingOrders > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: '#92400e' }}>Có {stats.pendingOrders} đơn hàng chờ xác nhận</div>
            <div style={{ fontSize: 12, color: '#b45309' }}>Vui lòng xử lý sớm để đảm bảo trải nghiệm khách hàng</div>
          </div>
        </div>
      )}

      <div className="dashboard-sales-grid">
        <ProductSalesTable
          title="5 sản phẩm bán chạy nhất"
          icon="🔥"
          products={stats.topSellingProducts}
        />
        <ProductSalesTable
          title="5 sản phẩm bán ít nhất"
          icon="📉"
          products={stats.lowSellingProducts}
        />
      </div>
    </div>
  );
}
