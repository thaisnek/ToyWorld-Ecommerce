import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, formatDate, formatPrice } from '../../services/api';

const ORDER_STATUS = {
  PENDING: { label: 'Cho xac nhan', cls: 'badge-pending' },
  CONFIRMED: { label: 'Da xac nhan', cls: 'badge-confirmed' },
  SHIPPING: { label: 'Dang giao', cls: 'badge-shipping' },
  DELIVERED: { label: 'Da giao', cls: 'badge-delivered' },
  COMPLETED: { label: 'Hoan thanh', cls: 'badge-active' },
  CANCELLED: { label: 'Da huy', cls: 'badge-cancelled' },
};

const PAY_STATUS = {
  PENDING: { label: 'Chua TT', cls: 'badge-unpaid' },
  PAID: { label: 'Da TT', cls: 'badge-paid' },
  FAILED: { label: 'Loi TT', cls: 'badge-cancelled' },
  CANCELLED: { label: 'Da huy TT', cls: 'badge-inactive' },
  REFUNDED: { label: 'Hoan tien', cls: 'badge-inactive' },
};

const SHIPMENT_STATUS = {
  PENDING: { label: 'Cho phan cong', cls: 'badge-pending' },
  ASSIGNED: { label: 'Da phan cong', cls: 'badge-confirmed' },
  SHIPPING: { label: 'Dang giao', cls: 'badge-shipping' },
  DELIVERED: { label: 'Da giao', cls: 'badge-delivered' },
  FAILED: { label: 'Giao that bai', cls: 'badge-cancelled' },
};

const PAY_METHOD = {
  COD: 'COD',
  MOMO: 'MoMo',
  BANKING: 'Chuyen khoan',
  VNPAY: 'VNPAY',
};

const LIMIT = 15;

const getShippingStatusMeta = (order) =>
  SHIPMENT_STATUS[order.shippingStatus || order.shipment?.shipmentStatus] || SHIPMENT_STATUS.PENDING;

export default function OrdersPage({ showToast }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (filterStatus !== 'all') params.status = filterStatus;
    adminApi.getOrders(params)
      .then((data) => {
        const rows = data.orders || [];
        setOrders(rows);
        setTotal(data.total ?? data.totalElements ?? rows.length);
      })
      .catch(() => showToast?.('Loi tai don hang', 'error'))
      .finally(() => setLoading(false));
  }, [filterStatus, page, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, updates) => {
    const payload = { ...updates };
    if (payload.orderStatus === 'CANCELLED' && !payload.cancelReason && !payload.reason) {
      const reason = window.prompt('Nhap ly do huy don');
      if (!reason?.trim()) return;
      payload.cancelReason = reason.trim();
    }

    try {
      await adminApi.updateOrderStatus(orderId, payload);
      showToast?.('Cap nhat trang thai thanh cong');
      fetchOrders();
      if (selected?.id === orderId) setSelected((prev) => ({ ...prev, ...payload }));
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const filtered = orders.filter((order) =>
    !search ||
    order.orderCode?.toLowerCase().includes(search.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    order.shippingPhone?.includes(search)
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div className="filters">
            <input
              className="search-input"
              placeholder="Tim ma don, ten, SDT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="all">Tat ca trang thai</option>
              {Object.entries(ORDER_STATUS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Don hang ({total})</div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">Dang tai...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ma don</th>
                  <th>Khach hang</th>
                  <th>SDT</th>
                  <th>Tong tien</th>
                  <th>Don hang</th>
                  <th>Giao hang</th>
                  <th>Thanh toan</th>
                  <th>PTTT</th>
                  <th>Ngay tao</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const orderStatus = ORDER_STATUS[order.orderStatus] || ORDER_STATUS.PENDING;
                  const payStatus = PAY_STATUS[order.paymentStatus] || PAY_STATUS.PENDING;
                  const shippingStatus = getShippingStatusMeta(order);

                  return (
                    <tr key={order.id}>
                      <td><strong style={{ color: '#2563eb' }}>#{order.orderCode}</strong></td>
                      <td>{order.customerName || '-'}</td>
                      <td>{order.shippingPhone || '-'}</td>
                      <td><strong>{formatPrice(order.totalAmount)}</strong></td>
                      <td><span className={`badge ${orderStatus.cls}`}>{orderStatus.label}</span></td>
                      <td><span className={`badge ${shippingStatus.cls}`}>{shippingStatus.label}</span></td>
                      <td><span className={`badge ${payStatus.cls}`}>{payStatus.label}</span></td>
                      <td>{PAY_METHOD[order.payment?.paymentMethod || order.paymentMethod] || '-'}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(order)}>Xem</button>
                          {order.orderStatus === 'PENDING' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(order.id, { orderStatus: 'CONFIRMED' })}>
                              Xac nhan
                            </button>
                          )}
                          {['PENDING', 'CONFIRMED'].includes(order.orderStatus) && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(order.id, { orderStatus: 'CANCELLED' })}>
                              Huy
                            </button>
                          )}
                          {order.orderStatus === 'CONFIRMED' && (
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/shipments')}>
                              Xu ly giao hang
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{'<'}</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{'>'}</button>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Don hang #{selected.orderCode}</div>
              <button className="modal-close" onClick={() => setSelected(null)}>x</button>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Thong tin giao hang</div>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.8 }}>
                <div><strong>{selected.shippingName}</strong> - {selected.shippingPhone}</div>
                <div>{selected.shippingAddress}</div>
                <div>
                  Giao hang: <span className={`badge ${getShippingStatusMeta(selected).cls}`}>{getShippingStatusMeta(selected).label}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>San pham</div>
              {(selected.items || []).map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.productNameSnapshot}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.colorSnapshot} / {item.sizeSnapshot} x {item.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatPrice(item.lineTotal)}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                <span>Tong cong</span>
                <span style={{ color: '#2563eb' }}>{formatPrice(selected.totalAmount)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selected.orderStatus === 'PENDING' && (
                <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(selected.id, { orderStatus: 'CONFIRMED' })}>
                  Xac nhan
                </button>
              )}
              {['PENDING', 'CONFIRMED'].includes(selected.orderStatus) && (
                <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(selected.id, { orderStatus: 'CANCELLED' })}>
                  Huy don
                </button>
              )}
              {selected.orderStatus === 'CONFIRMED' && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/shipments')}>
                  Xu ly giao hang
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
