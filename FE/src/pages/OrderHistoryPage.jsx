import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderApi, reviewApi, formatPrice } from '../services/api';
import { isImageSource } from '../utils/imageUtils';
import './OrderHistoryPage.css';

const renderOrderItemVisual = (item) => {
  const visual = item.imageUrl || '🧸';
  return isImageSource(visual)
    ? <img src={visual} alt={item.productNameSnapshot || 'Sản phẩm'} loading="lazy" />
    : visual;
};

function ReviewItemForm({ item }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) { alert('Vui lòng nhập nội dung đánh giá'); return; }
    setSubmitting(true);
    try {
      await reviewApi.create({ orderItemId: item.id, rating, comment });
      setSubmitted(true);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12, color: 'var(--success)', fontWeight: 600 }}>✅ Đã gửi đánh giá cho sản phẩm này. Cảm ơn bạn!</div>;
  }

  return (
    <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div className="review-product-img">{renderOrderItemVisual(item)}</div>
        <div>
          <div style={{ fontWeight: 600 }}>{item.productNameSnapshot}</div>
          <div style={{ fontSize: 12, color: 'var(--gray)' }}>{item.colorSnapshot} · {item.sizeSnapshot}</div>
        </div>
      </div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Đánh giá:</span>
        <div className="star-input" style={{ display:'flex', gap:4 }}>
          {[1,2,3,4,5].map(i => (
            <button key={i} onClick={() => setRating(i)} style={{ fontSize: 24, background:'none', border:'none', color: i<=rating ? '#facc15' : '#e5e7eb', cursor:'pointer' }}>★</button>
          ))}
        </div>
      </div>
      <textarea className="form-input" rows={2} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..." value={comment} onChange={e => setComment(e.target.value)} style={{ resize: 'none', marginBottom: 12 }} />
      <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting || !comment.trim()}>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
    </div>
  );
}

const ORDER_STATUS = {
  PENDING:   { label: 'Chờ xác nhận', color: 'warn',      icon: '⏳' },
  CONFIRMED: { label: 'Đã xác nhận',  color: 'primary',   icon: '✅' },
  PACKING:   { label: 'Đang đóng gói',color: 'secondary', icon: '📦' },
  SHIPPING:  { label: 'Đang giao',    color: 'secondary', icon: '🚚' },
  DELIVERED: { label: 'Đã giao',      color: 'success',   icon: '🎉' },
  COMPLETED: { label: 'Hoàn thành',   color: 'success',   icon: '🏆' },
  CANCELLED: { label: 'Đã hủy',       color: 'danger',    icon: '❌' },
};

const PAY_LABEL = { COD:'💵 Tiền mặt khi nhận', MOMO:'💜 Ví MoMo' };
const PAY_STATUS = {
  PENDING: { label: '⏳ Chờ thanh toán', color: 'var(--warn)' },
  PAID: { label: '✅ Đã thanh toán', color: 'var(--success)' },
  FAILED: { label: '❌ Thanh toán thất bại', color: 'var(--danger)' },
  CANCELLED: { label: '❌ Đã hủy thanh toán', color: 'var(--gray)' },
  REFUNDED: { label: '↩️ Đã hoàn tiền', color: 'var(--gray)' },
};

const SHIPMENT_STEPS = (order) => [
  { label:'Đặt hàng',  done: true,                                                            icon:'🛒' },
  { label:'Xác nhận',  done: order.orderStatus !== 'PENDING' && order.orderStatus !== 'CANCELLED',            icon:'✅' },
  { label:'Đóng gói',  done: ['PACKING','SHIPPING','DELIVERED','COMPLETED'].includes(order.shipment?.shipmentStatus || order.orderStatus), icon:'📦' },
  { label:'Đang giao', done: ['SHIPPING','DELIVERED','COMPLETED'].includes(order.shipment?.shipmentStatus || order.orderStatus),           icon:'🚚' },
  { label:'Đã giao',   done: ['DELIVERED','COMPLETED'].includes(order.shipment?.shipmentStatus || order.orderStatus),                      icon:'🎉' },
];

export default function OrderHistoryPage({ navigate }) {
  const { user } = useAuth();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    orderApi.getMy({ status: filter })
      .then(data => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, filter]);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
      await orderApi.cancel(orderId, 'Khách hàng hủy');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: 'CANCELLED' } : o));
    } catch (err) { alert(err.message); }
  };

  const handleComplete = async (orderId) => {
    if (!window.confirm('Bạn xác nhận đã nhận được hàng và hài lòng với sản phẩm?')) return;
    try {
      const updated = await orderApi.complete(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      alert('Cảm ơn bạn đã xác nhận! Bạn sẽ nhận được điểm thưởng (nếu có).');
    } catch (err) { alert(err.message); }
  };

  const handleReviewProduct = (item) => {
    if (!item?.productId) {
      alert('Không tìm thấy sản phẩm để đánh giá. Vui lòng tải lại đơn hàng.');
      return;
    }

    navigate('product-detail', {
      id: item.productId,
      reviewOrderItemId: item.id,
      productName: item.productNameSnapshot,
    });
  };

  const handleContactSupport = (order) => {
    navigate('messages', {
      receiverUsername: 'admin',
      draftMessage: order?.orderCode ? `Tôi cần hỗ trợ về đơn hàng #${order.orderCode}: ` : '',
    });
  };

  useEffect(() => {
    if (!reviewingOrder) return;
    const firstItem = reviewingOrder.items?.[0];
    setReviewingOrder(null);
    handleReviewProduct(firstItem);
  }, [reviewingOrder]);

  if (!user) return (
    <div style={{ padding:'60px 20px', textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:16 }}>📦</div>
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:12 }}>Đăng nhập để xem đơn hàng</h3>
      <button className="btn btn-primary btn-lg" onClick={() => navigate('login')}>Đăng nhập ngay</button>
    </div>
  );

  return (
    <div className="orders-page">
      <div className="orders-inner">
        <div className="orders-header">
          <h1 className="orders-title">📦 Đơn hàng của tôi</h1>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('profile')}>← Hồ sơ</button>
        </div>

        <div className="order-filter-tabs">
          {[
            { key:'all', label:'Tất cả' },
            { key:'PENDING',   label:'⏳ Chờ xác nhận' },
            { key:'CONFIRMED', label:'✅ Đã xác nhận' },
            { key:'SHIPPING',  label:'🚚 Đang giao' },
            { key:'DELIVERED', label:'🎉 Đã giao' },
            { key:'COMPLETED', label:'🏆 Hoàn thành' },
            { key:'CANCELLED', label:'❌ Đã hủy' },
          ].map(f => (
            <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><div className="emoji">⏳</div><h3>Đang tải...</h3></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">📭</div><h3>Không có đơn hàng nào</h3>
            <button className="btn btn-primary" onClick={() => navigate('products')}>🧸 Tiếp tục mua sắm</button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => {
              const status     = ORDER_STATUS[order.orderStatus] || ORDER_STATUS.PENDING;
              const isExpanded = expandedId === order.id;
              const steps      = SHIPMENT_STEPS(order);
              return (
                <div key={order.id} className="order-card">
                  <div className="order-header" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div className="order-id-wrap">
                      <span className="order-icon">📦</span>
                      <div>
                        <div className="order-id">#{order.orderCode}</div>
                        <div className="order-date">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>
                    <div className="order-status-wrap">
                      <span className={`order-status status-${status.color}`}>{status.icon} {status.label}</span>
                    </div>
                    <div className="order-total-wrap">
                      <div className="order-total-label">Tổng tiền</div>
                      <div className="order-total">{formatPrice(order.totalAmount)}</div>
                    </div>
                    <div className="order-expand">{isExpanded ? '▲' : '▼'}</div>
                  </div>

                  {isExpanded && (
                    <div className="order-detail">
                      <div className="order-timeline">
                        {steps.map((s, i, arr) => (
                          <div key={i} className={`tl-step ${s.done ? 'done' : ''}`}>
                            <div className="tl-icon">{s.icon}</div>
                            <div className="tl-label">{s.label}</div>
                            {i < arr.length - 1 && <div className={`tl-line ${s.done ? 'done' : ''}`} />}
                          </div>
                        ))}
                      </div>

                      <div className="order-items">
                        {order.items?.map((item, i) => (
                          <div key={i} className="oi-row">
                            <div className="oi-img">{renderOrderItemVisual(item)}</div>
                            <div className="oi-info">
                              <div className="oi-name">{item.productNameSnapshot}</div>
                              <div style={{ fontSize:11, color:'var(--secondary-dark)', fontWeight:700 }}>{item.colorSnapshot} · {item.sizeSnapshot}</div>
                              <div className="oi-qty">× {item.quantity}</div>
                            </div>
                            <div className="oi-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                              <span>{formatPrice(item.lineTotal)}</span>
                              {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
                                <button className="btn btn-outline btn-sm" onClick={() => handleReviewProduct(item)}>⭐ Đánh giá</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding:'10px 20px', fontSize:13, color:'var(--dark2)', background:'var(--light)', borderTop:'1px solid var(--border)' }}>
                        <strong>Thanh toán:</strong> {PAY_LABEL[order.payment?.paymentMethod || order.paymentMethod] || order.payment?.paymentMethod || order.paymentMethod}
                        {' · '}
                        <span style={{ color: (PAY_STATUS[order.payment?.paymentStatus || order.paymentStatus] || PAY_STATUS.PENDING).color }}>
                          {(PAY_STATUS[order.payment?.paymentStatus || order.paymentStatus] || PAY_STATUS.PENDING).label}
                        </span>
                      </div>

                      <div style={{ padding:'10px 20px 14px', fontSize:12, color:'var(--gray)', display:'flex', gap:16, flexWrap:'wrap' }}>
                        <span>Tạm tính: {formatPrice(order.subtotal)}</span>
                        <span>Ship: {order.shippingFee === 0 ? 'Miễn phí' : formatPrice(order.shippingFee)}</span>
                        <strong>Tổng: {formatPrice(order.totalAmount)}</strong>
                      </div>

                      <div className="order-actions">
                        {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
                          <button className="btn btn-outline btn-sm" onClick={() => setReviewingOrder(order)}>⭐ Đánh giá sản phẩm</button>
                        )}
                        {order.orderStatus === 'DELIVERED' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleComplete(order.id)}>🎉 Đã nhận được hàng</button>
                        )}
                        {['PENDING', 'CONFIRMED'].includes(order.orderStatus) && (
                          <button className="btn btn-light btn-sm" style={{ color:'var(--danger)' }} onClick={() => handleCancel(order.id)}>❌ Hủy đơn</button>
                        )}
                        <button className="btn btn-light btn-sm" onClick={() => handleContactSupport(order)}>📞 Liên hệ hỗ trợ</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewingOrder && (
        <div className="modal-overlay" onClick={() => setReviewingOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">⭐ Đánh giá đơn hàng #{reviewingOrder.orderCode}</div>
              <button className="modal-close" onClick={() => setReviewingOrder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>
              {reviewingOrder.items?.map(item => (
                <ReviewItemForm key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

