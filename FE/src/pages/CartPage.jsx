import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../services/api";
import { isImageSource } from "../utils/imageUtils";
import "./CartPage.css";

const getItemKey = (item) => String(item.cartItemId ?? item.id ?? item.variantId);

export default function CartPage({ navigate }) {
  const { cart, removeFromCart, updateQuantity, clearCart, getEmoji } = useCart();
  const { user } = useAuth();
  const [selectedItemKeys, setSelectedItemKeys] = useState([]);
  const [voucherCode, setVoucherCode] = useState("");
  const selectionInitializedRef = useRef(false);
  useEffect(() => {
    const cartKeys = cart.map(getItemKey);
    if (!cartKeys.length) {
      selectionInitializedRef.current = false;
      setSelectedItemKeys([]);
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
  }, [cart]);

  const selectedItems = useMemo(() => {
    const selected = new Set(selectedItemKeys);
    return cart.filter(item => selected.has(getItemKey(item)));
  }, [cart, selectedItemKeys]);

  const selectedSubtotal = selectedItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
  const shippingFee = 0;
  const totalAmount = selectedSubtotal + shippingFee;
  const allSelected = cart.length > 0 && selectedItems.length === cart.length;
  const renderItemVisual = (item) => {
    const visual = getEmoji?.(item) || item.imageUrl || "🧸";
    return isImageSource(visual)
      ? <img src={visual} alt={item.productName || "Sản phẩm"} />
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

  const handleCheckout = () => {
    if (!user) {
      navigate("login");
      return;
    }

    if (!selectedItems.length) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return;
    }

    navigate("checkout", {
      selectedCartItemIds: selectedItems.map(getItemKey),
      voucherCode: voucherCode.trim().toUpperCase() || undefined,
    });
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-inner">
          <div className="empty-state">
            <div className="emoji">🛒</div>
            <h3>Giỏ hàng của bạn đang trống</h3>
            <p>Hãy thêm sản phẩm yêu thích vào giỏ hàng để tiếp tục mua sắm</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate("products")}>
              🧸 Khám phá sản phẩm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-inner">
        <div className="cart-header">
          <h1 className="cart-title">🛒 Giỏ hàng của bạn</h1>
          <span className="cart-count">{cart.length} sản phẩm</span>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-items-header">
              <button className="cart-select-all" onClick={toggleAllItems}>
                {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
              <button className="clear-all-btn" onClick={clearCart}>🗑️ Xóa tất cả</button>
            </div>

            {cart.map(item => {
              const checked = selectedItemKeys.includes(getItemKey(item));
              return (
                <div key={getItemKey(item)} className={`cart-item ${checked ? "selected" : ""}`}>
                  <label className="ci-check">
                    <input type="checkbox" checked={checked} onChange={() => toggleItem(item)} />
                  </label>
                  <div className="ci-img">{renderItemVisual(item)}</div>
                  <div className="ci-body">
                    <div className="ci-brand">{item.productName}</div>
                    <h3 className="ci-name" onClick={() => navigate("products")}>
                      {item.productName}
                    </h3>
                    <div className="ci-variant">{item.color || "Mặc định"} · {item.size || ""}</div>
                    <div className="ci-price-mobile">{formatPrice(item.unitPrice)}</div>
                  </div>
                  <div className="ci-qty">
                    <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>+</button>
                  </div>
                  <div className="ci-price">{formatPrice(item.unitPrice * item.quantity)}</div>
                  <button className="ci-remove" onClick={() => removeFromCart(item.variantId)} title="Xóa">✕</button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h3 className="summary-title">📋 Tóm tắt thanh toán</h3>

            <div className="summary-rows">
              <div className="summary-row">
                <span>Đã chọn</span>
                <span>{selectedItems.length}/{cart.length} loại hàng</span>
              </div>
              <div className="summary-row">
                <span>Tạm tính</span>
                <span>{formatPrice(selectedSubtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Phí vận chuyển</span>
                <span className={shippingFee === 0 ? "free-ship" : ""}>
                  {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                </span>
              </div>
              {shippingFee > 0 && (
                <div className="ship-notice">
                  Mua thêm <strong>{formatPrice(300000 - selectedSubtotal)}</strong> để được miễn phí vận chuyển
                </div>
              )}
            </div>

            <div className="voucher-row">
              <input
                className="form-input"
                placeholder="Mã voucher / giảm giá"
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="summary-total">
              <span>Tổng cộng</span>
              <span className="total-amount">{formatPrice(totalAmount)}</span>
            </div>

            <button className="btn btn-primary btn-lg btn-full checkout-btn" onClick={handleCheckout} disabled={!selectedItems.length}>
              {user ? "⚡ Tiến hành thanh toán" : "🔑 Đăng nhập để thanh toán"}
            </button>

            <button className="btn btn-light btn-full continue-btn" onClick={() => navigate("products")}>
              ← Tiếp tục mua sắm
            </button>

            <div className="secure-badges">
              <span>🔒 Thanh toán bảo mật</span>
              <span>💳 Nhiều hình thức thanh toán</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
