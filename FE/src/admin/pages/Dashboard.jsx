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
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesDateFilters, setSalesDateFilters] = useState({
    fromDate: '',
    toDate: '',
  });

  const loadStats = (params = {}, initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setSalesLoading(true);
    }

    return adminApi.getStats(params)
      .then(setStats)
      .catch(() => showToast('Không tải được dữ liệu', 'error'))
      .finally(() => {
        if (initialLoad) {
          setLoading(false);
        } else {
          setSalesLoading(false);
        }
      });
  };

  useEffect(() => {
    loadStats({}, true);
  }, []);

  const handleSalesDateChange = (event) => {
    const { name, value } = event.target;
    setSalesDateFilters((filters) => ({
      ...filters,
      [name]: value,
    }));
  };

  const salesDateParams = () => {
    const params = {};
    if (salesDateFilters.fromDate) params.fromDate = salesDateFilters.fromDate;
    if (salesDateFilters.toDate) params.toDate = salesDateFilters.toDate;
    return params;
  };

  const handleSalesFilterSubmit = (event) => {
    event.preventDefault();

    if (
      salesDateFilters.fromDate &&
      salesDateFilters.toDate &&
      salesDateFilters.fromDate > salesDateFilters.toDate
    ) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc', 'error');
      return;
    }

    loadStats(salesDateParams());
  };

  const handleClearSalesFilter = () => {
    setSalesDateFilters({ fromDate: '', toDate: '' });
    loadStats();
  };

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

      <form className="card dashboard-sales-filter" onSubmit={handleSalesFilterSubmit}>
        <div className="dashboard-sales-filter-title">
          <span>🗓️</span>
          <strong>Lọc sản phẩm theo thời gian</strong>
        </div>
        <div className="dashboard-sales-filter-controls">
          <label className="date-filter-field">
            <span>Từ ngày</span>
            <input
              className="form-input"
              type="date"
              name="fromDate"
              value={salesDateFilters.fromDate}
              onChange={handleSalesDateChange}
            />
          </label>
          <label className="date-filter-field">
            <span>Đến ngày</span>
            <input
              className="form-input"
              type="date"
              name="toDate"
              value={salesDateFilters.toDate}
              onChange={handleSalesDateChange}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={salesLoading}>
            🔎 {salesLoading ? 'Đang lọc' : 'Lọc'}
          </button>
          <button className="btn btn-outline" type="button" onClick={handleClearSalesFilter} disabled={salesLoading}>
            Xóa
          </button>
        </div>
      </form>

      <div className={`dashboard-sales-grid${salesLoading ? ' is-loading' : ''}`}>
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
