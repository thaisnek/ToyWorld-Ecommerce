import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, formatDate, formatPrice, shipmentApi } from '../../services/api';

const SHIPMENT_STATUS = {
  PENDING: { label: 'Cho phan cong', cls: 'badge-pending' },
  ASSIGNED: { label: 'Da phan cong', cls: 'badge-confirmed' },
  SHIPPING: { label: 'Dang giao', cls: 'badge-shipping' },
  DELIVERED: { label: 'Da giao', cls: 'badge-delivered' },
  FAILED: { label: 'Giao that bai', cls: 'badge-cancelled' },
};

const ORDER_STATUS = {
  PENDING: { label: 'Cho xac nhan', cls: 'badge-pending' },
  CONFIRMED: { label: 'Da xac nhan', cls: 'badge-confirmed' },
  SHIPPING: { label: 'Dang giao', cls: 'badge-shipping' },
  DELIVERED: { label: 'Da giao', cls: 'badge-delivered' },
  COMPLETED: { label: 'Hoan thanh', cls: 'badge-active' },
  CANCELLED: { label: 'Da huy', cls: 'badge-cancelled' },
};

const LIMIT = 12;

export default function ShipmentsPage({ showToast }) {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [assignSelection, setAssignSelection] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStaff, setFilterStaff] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const isDelivery = user?.role === 'DELIVERY_STAFF';
  const canAssign = user?.role === 'ADMIN' || user?.role === 'SALES_STAFF';
  const canUpdateShipment = user?.role === 'ADMIN' || user?.role === 'DELIVERY_STAFF';

  const staffOptions = useMemo(() => deliveryStaff || [], [deliveryStaff]);

  const fetchShipments = useCallback(() => {
    if (!user) return;
    setLoading(true);
    const params = { page, limit: LIMIT, status: filterStatus };
    if (canAssign && filterStaff) params.deliveryStaffId = filterStaff;

    const loader = isDelivery
      ? shipmentApi.getMyAssignments(params)
      : shipmentApi.getAll(params);

    loader
      .then((data) => {
        const rows = data.shipments || data.content || [];
        setShipments(rows);
        setTotal(data.total ?? data.totalElements ?? rows.length);
        setAssignSelection((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            if (!next[row.orderId] && row.deliveryStaffId) next[row.orderId] = String(row.deliveryStaffId);
          });
          return next;
        });
      })
      .catch((err) => showToast?.(err.message || 'Khong the tai danh sach giao hang', 'error'))
      .finally(() => setLoading(false));
  }, [canAssign, filterStaff, filterStatus, isDelivery, page, showToast, user]);

  useEffect(() => {
    if (!canAssign) return;
    adminApi.getDeliveryStaff()
      .then((data) => setDeliveryStaff(Array.isArray(data) ? data : []))
      .catch(() => setDeliveryStaff([]));
  }, [canAssign]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleAssign = async (shipment) => {
    const staffId = assignSelection[shipment.orderId];
    if (!staffId) {
      showToast?.('Chon shipper truoc khi phan cong', 'error');
      return;
    }

    try {
      await adminApi.assignShipment(shipment.orderId, Number(staffId));
      showToast?.('Da phan cong shipper');
      fetchShipments();
    } catch (err) {
      showToast?.(err.message || 'Khong the phan cong shipper', 'error');
    }
  };

  const handleStatus = async (shipment, status) => {
    let failureReason = '';
    if (status === 'FAILED') {
      failureReason = window.prompt('Nhap ly do giao that bai') || '';
      if (!failureReason.trim()) return;
    }

    try {
      await shipmentApi.updateStatus(shipment.id, { status, failureReason });
      showToast?.('Da cap nhat trang thai giao hang');
      fetchShipments();
      if (selected?.id === shipment.id) setSelected(null);
    } catch (err) {
      showToast?.(err.message || 'Khong the cap nhat trang thai', 'error');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div className="filters">
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="all">Tat ca trang thai</option>
              {Object.entries(SHIPMENT_STATUS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>

            {canAssign && (
              <select
                className="filter-select"
                value={filterStaff}
                onChange={(e) => { setFilterStaff(e.target.value); setPage(1); }}
              >
                <option value="">Tat ca shipper</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Giao hang ({total})</div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">Dang tai...</div>
          ) : shipments.length === 0 ? (
            <div className="empty">Khong co don giao hang nao</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ma don</th>
                  <th>Nguoi nhan</th>
                  <th>SDT</th>
                  <th>Tong tien</th>
                  <th>Don hang</th>
                  <th>Giao hang</th>
                  <th>Shipper</th>
                  <th>Ngay tao</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => {
                  const shipmentStatus = SHIPMENT_STATUS[shipment.shipmentStatus] || SHIPMENT_STATUS.PENDING;
                  const orderStatus = ORDER_STATUS[shipment.orderStatus] || ORDER_STATUS.PENDING;
                  const selectedStaffId = assignSelection[shipment.orderId] || '';
                  const canAssignThis = canAssign
                    && shipment.orderStatus === 'CONFIRMED'
                    && shipment.shipmentStatus !== 'DELIVERED';

                  return (
                    <tr key={shipment.id}>
                      <td><strong style={{ color: '#2563eb' }}>#{shipment.orderCode}</strong></td>
                      <td>{shipment.shippingName || '-'}</td>
                      <td>{shipment.shippingPhone || '-'}</td>
                      <td><strong>{formatPrice(shipment.totalAmount)}</strong></td>
                      <td><span className={`badge ${orderStatus.cls}`}>{orderStatus.label}</span></td>
                      <td><span className={`badge ${shipmentStatus.cls}`}>{shipmentStatus.label}</span></td>
                      <td>
                        {canAssignThis ? (
                          <select
                            className="form-select"
                            value={selectedStaffId}
                            onChange={(e) => setAssignSelection((prev) => ({ ...prev, [shipment.orderId]: e.target.value }))}
                            style={{ minWidth: 150 }}
                          >
                            <option value="">Chon shipper</option>
                            {staffOptions.map((staff) => (
                              <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                            ))}
                          </select>
                        ) : (
                          shipment.deliveryStaffName || '-'
                        )}
                      </td>
                      <td>{formatDate(shipment.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(shipment)}>Xem</button>
                          {canAssignThis && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!selectedStaffId}
                              onClick={() => handleAssign(shipment)}
                            >
                              Phan cong
                            </button>
                          )}
                          {canUpdateShipment && shipment.shipmentStatus === 'ASSIGNED' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleStatus(shipment, 'SHIPPING')}>Bat dau giao</button>
                          )}
                          {canUpdateShipment && shipment.shipmentStatus === 'SHIPPING' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleStatus(shipment, 'DELIVERED')}>Da giao</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleStatus(shipment, 'FAILED')}>That bai</button>
                            </>
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
                <div>Shipper: {selected.deliveryStaffName || '-'}</div>
                {selected.failureReason && <div>Ly do that bai: {selected.failureReason}</div>}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
              <span>Tong cong</span>
              <span style={{ color: '#2563eb' }}>{formatPrice(selected.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
