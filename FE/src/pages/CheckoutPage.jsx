import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi, userApi, formatPrice } from '../services/api';
import { isImageSource } from '../utils/imageUtils';
import './CheckoutPage.css';

const STEPS = ['Thông tin giao hàng', 'Thanh toán', 'Xác nhận'];

const getItemKey = (item) => String(item.cartItemId ?? item.id ?? item.variantId);

export default function CheckoutPage({ navigate, routeState }) {
  const { cart, refreshCart, getEmoji } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ note: '' });
  const [payMethod, setPayMethod] = useState('COD');
  const [voucherCode, setVoucherCode] = useState(routeState?.voucherCode || '');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    fullAddress: '',
    city: 'Hà Nội',
  });

  const [selectedItemKeys, setSelectedItemKeys] = useState([]);
  const selectionInitializedRef = useRef(false);

  const routeSelectedKeys = useMemo(
    () => (routeState?.selectedCartItemIds || []).map(String),
    [routeState?.selectedCartItemIds]
  );

  useEffect(() => {
    userApi.getAddresses().then(data => {
      setAddresses(data || []);
      if (data && data.length > 0) {
        const def = data.find(a => a.isDefault);
        setSelectedAddressId(def ? def.id : data[0].id);
      } else {
        setShowNewAddr(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const cartKeys = cart.map(getItemKey);

    if (!cartKeys.length) {
      selectionInitializedRef.current = false;
      setSelectedItemKeys([]);
      return;
    }

    if (routeSelectedKeys.length > 0) {
      const requested = new Set(routeSelectedKeys);
      const matched = cartKeys.filter(key => requested.has(key));
      selectionInitializedRef.current = true;
      setSelectedItemKeys(matched.length ? matched : cartKeys);
      return;
    }

    setSelectedItemKeys(prev => {
      const stillInCart = prev.filter(key => cartKeys.includes(key));
      if (!selectionInitializedRef.current) {
        selectionInitializedRef.current = true;
        return cartKeys;
      }
      return stillInCart;
    });
  }, [cart, routeSelectedKeys]);

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedItemKeys);
    return cart.filter(item => selected.has(getItemKey(item)));
  }, [cart, selectedItemKeys]);

  const selectedSubtotal = selectedItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const shippingFee = 0;
  const totalAmount = selectedSubtotal + shippingFee;
  const allSelected = cart.length > 0 && selectedItems.length === cart.length;
  const renderItemVisual = (item) => {
    const visual = getEmoji?.(item) || item.imageUrl || '🧸';
    return isImageSource(visual)
      ? <img src={visual} alt={item.productName || 'Sản phẩm'} />
      : visual;
  };

  const toggleItem = (item) => {
    const key = getItemKey(item);
    setSelectedItemKeys(prev => (
      prev.includes(key) ? prev.filter(value => value !== key) : [...prev, key]
    ));
  };

  const toggleAllItems = () => {
    setSelectedItemKeys(allSelected ? [] : cart.map(getItemKey));
  };

  const validateAddress = () => {
    if (!selectedItems.length) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.');
      return false;
    }

    if (showNewAddr) {
      if (!newAddrForm.fullName.trim() || !newAddrForm.phone.trim() || !newAddrForm.fullAddress.trim()) {
        alert('Vui lòng điền đủ tên, số điện thoại và địa chỉ nhận hàng.');
        return false;
      }
    } else if (!selectedAddressId) {
      alert('Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!validateAddress()) return;
      if (showNewAddr) {
        try {
          const addr = await userApi.addAddress({
            fullName: newAddrForm.fullName,
            phone: newAddrForm.phone,
            fullAddress: `${newAddrForm.fullAddress}, ${newAddrForm.city}`,
            isDefault: addresses.length === 0,
          });
          setAddresses(prev => [...prev, addr]);
          setSelectedAddressId(addr.id);
          setShowNewAddr(false);
        } catch (e) {
          alert('Lỗi tạo địa chỉ: ' + e.message);
          return;
        }
      }
    }
    setStep(s => s + 1);
  };

  const handlePlaceOrder = async () => {
    if (!selectedItems.length) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.');
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = selectedItems.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const order = await orderApi.create({
        addressId: selectedAddressId,
        paymentMethod: payMethod,
        note: form.note,
        voucherCode: voucherCode.trim().toUpperCase() || undefined,
        items: orderItems,
      });

      await refreshCart();

      if (order.paymentMethod === 'MOMO' && order.momoPayUrl) {
        if (order.momoPayUrl.includes('/mock')) {
          alert('Không thể tạo thanh toán MoMo hợp lệ. Vui lòng thử lại hoặc chọn COD.');
          return;
        }

        window.location.href = order.momoPayUrl;
        return;
      }

      setCreatedOrder(order);
      setOrderSuccess(true);
    } catch (err) {
      alert('Đặt hàng thất bại: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (orderSuccess && createdOrder) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <div className="order-success">
            <div className="success-icon">🎉</div>
            <h2>Đặt hàng thành công!</h2>
            <p>Cảm ơn bạn đã mua hàng tại ToyWorld.</p>
            <div className="order-id">Mã đơn hàng: <strong>{createdOrder.orderCode}</strong></div>
            {createdOrder.discountAmount > 0 && (
              <div className="order-id">Giảm giá: <strong>{formatPrice(createdOrder.discountAmount)}</strong></div>
            )}
            <div className="order-id">Tổng thanh toán: <strong>{formatPrice(createdOrder.totalAmount)}</strong></div>
            <div className="success-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('orders')}>Xem đơn hàng</button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('home')}>Về trang chủ</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) return (
    <div className="checkout-page">
      <div className="checkout-inner">
        <div className="empty-state">
          <div className="emoji">🛒</div>
          <h3>Giỏ hàng trống</h3>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('products')}>Xem sản phẩm</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="checkout-page">
      <div className="checkout-inner">
        <h1 className="checkout-title">💳 Thanh toán</h1>
        <div className="checkout-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-num">{i < step ? '✓' : i + 1}</div>
              <div className="step-label">{s}</div>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-panel">
            {step === 0 && (
              <>
                <div className="checkout-section checkout-products-section">
                  <div className="checkout-section-head">
                    <h3>🧸 Sản phẩm thanh toán</h3>
                    <button type="button" className="btn btn-light btn-sm" onClick={toggleAllItems}>
                      {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="checkout-select-list">
                    {cart.map(item => {
                      const checked = selectedItemKeys.includes(getItemKey(item));
                      return (
                        <label key={getItemKey(item)} className={`checkout-select-item ${checked ? 'selected' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(item)} />
                          <div className="csi-img">{renderItemVisual(item)}</div>
                          <div className="csi-main">
                            <div className="csi-name">{item.productName}</div>
                            <div className="csi-variant">{item.color || 'Mặc định'}{item.size ? ` / ${item.size}` : ''}</div>
                          </div>
                          <div className="csi-meta">
                            <span>x{item.quantity}</span>
                            <strong>{formatPrice((item.unitPrice || 0) * (item.quantity || 0))}</strong>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {!selectedItems.length && <div className="checkout-warning">Chọn ít nhất 1 sản phẩm để tiếp tục thanh toán.</div>}
                </div>

                <div className="checkout-section">
                  <h3>📍 Thông tin giao hàng</h3>

                  {addresses.length > 0 && !showNewAddr && (
                    <div className="address-selector">
                      {addresses.map(a => (
                        <div key={a.id} className={`address-card ${selectedAddressId === a.id ? 'selected' : ''}`} onClick={() => setSelectedAddressId(a.id)}>
                          <div className="address-name">{a.fullName || a.shipName} · {a.phone || a.shipPhone} {a.isDefault && <span className="addr-badge">Mặc định</span>}</div>
                          <div className="address-line">{a.fullAddress || a.shipAddress}</div>
                        </div>
                      ))}
                      <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => setShowNewAddr(true)}>+ Thêm địa chỉ mới</button>
                    </div>
                  )}

                  {showNewAddr && (
                    <div className="new-address-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Họ và tên *</label>
                          <input className="form-input" value={newAddrForm.fullName} onChange={e => setNewAddrForm(p => ({ ...p, fullName: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Số điện thoại *</label>
                          <input className="form-input" value={newAddrForm.phone} onChange={e => setNewAddrForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Địa chỉ *</label>
                        <input className="form-input" value={newAddrForm.fullAddress} onChange={e => setNewAddrForm(p => ({ ...p, fullAddress: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tỉnh / Thành phố</label>
                        <select className="form-select" value={newAddrForm.city} onChange={e => setNewAddrForm(p => ({ ...p, city: e.target.value }))}>
                          {['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Bình Dương', 'Đồng Nai'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      {addresses.length > 0 && (
                        <button className="btn btn-light" style={{ marginTop: 8 }} onClick={() => setShowNewAddr(false)}>Hủy thêm mới</button>
                      )}
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label">Ghi chú đơn hàng</label>
                    <textarea className="form-input" rows={2} placeholder="Ghi chú cho người giao..." value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} style={{ resize: 'none' }} />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <div className="checkout-section">
                <h3>💳 Phương thức thanh toán</h3>
                <div className="pay-methods">
                  {[
                    { key: 'COD', icon: '💵', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Trả tiền mặt khi nhận được hàng' },
                    { key: 'MOMO', icon: '💜', label: 'Ví MoMo', desc: 'Thanh toán qua ứng dụng MoMo' },
                  ].map(m => (
                    <label key={m.key} className={`pay-method ${payMethod === m.key ? 'selected' : ''}`}>
                      <input type="radio" name="pay" value={m.key} checked={payMethod === m.key} onChange={() => setPayMethod(m.key)} />
                      <span className="pm-icon">{m.icon}</span>
                      <div><div className="pm-label">{m.label}</div><div className="pm-desc">{m.desc}</div></div>
                    </label>
                  ))}
                </div>
                <div className="voucher-box">
                  <h4>🏷️ Mã giảm giá</h4>
                  <div className="voucher-input-row">
                    <input
                      className="form-input"
                      placeholder="Nhập mã giảm giá"
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-section">
                <h3>✅ Xác nhận đơn hàng</h3>
                <div className="confirm-info">
                  <div className="confirm-block">
                    <h4>📍 Thông tin giao hàng</h4>
                    <p>Địa chỉ đã chọn</p>
                  </div>
                  <div className="confirm-block">
                    <h4>💳 Thanh toán: {payMethod}</h4>
                    {voucherCode.trim() && <p>Mã giảm giá: {voucherCode.trim().toUpperCase()}</p>}
                  </div>
                  <div className="confirm-block">
                    <h4>🧸 Sản phẩm ({selectedItems.length})</h4>
                    {selectedItems.map(item => (
                      <div key={getItemKey(item)} className="confirm-item">
                        <span className="confirm-item-main">
                          <span className="confirm-item-img">{renderItemVisual(item)}</span>
                          <span>{item.productName} ({item.color || 'Mặc định'}{item.size ? `/${item.size}` : ''}) x{item.quantity}</span>
                        </span>
                        <span>{formatPrice((item.unitPrice || 0) * (item.quantity || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="checkout-nav">
              {step > 0 && <button className="btn btn-light btn-lg" onClick={() => setStep(s => s - 1)}>← Quay lại</button>}
              {step < 2
                ? <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={!selectedItems.length}>Tiếp theo →</button>
                : <button className="btn btn-primary btn-lg" onClick={handlePlaceOrder} disabled={submitting || !selectedItems.length}>{submitting ? 'Đang đặt...' : '🎉 Đặt hàng ngay'}</button>
              }
            </div>
          </div>

          <div className="checkout-summary">
            <h3 className="summary-title">📦 Đơn hàng ({selectedItems.length}/{cart.length})</h3>
            <div className="co-items">
              {selectedItems.length === 0 ? (
                <div className="co-empty">Chưa chọn sản phẩm</div>
              ) : selectedItems.map(item => (
                <div key={getItemKey(item)} className="co-item">
                  <div className="co-img">{renderItemVisual(item)}</div>
                  <div className="co-name">{item.productName}<div>{item.color || 'Mặc định'}{item.size ? ` / ${item.size}` : ''}</div><span className="co-qty">x{item.quantity}</span></div>
                  <div className="co-price">{formatPrice((item.unitPrice || 0) * (item.quantity || 0))}</div>
                </div>
              ))}
            </div>
            <div className="co-totals">
              <div className="co-row"><span>Tạm tính ({selectedQuantity} sản phẩm)</span><span>{formatPrice(selectedSubtotal)}</span></div>
              <div className="co-row"><span>Vận chuyển</span><span className={shippingFee === 0 ? 'free-ship' : ''}>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span></div>
              <div className="co-total"><span>Tổng</span><span className="total-amount">{formatPrice(totalAmount)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
